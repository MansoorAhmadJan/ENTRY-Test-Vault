/* ============================================================
   Analytics Engine (V5.1, Objective #10: kept modular/separate).
   Pure functions: reads App.Data + App.Storage, writes nothing,
   computes nothing App.Storage doesn't already have the raw data
   for. No new persistent state lives here — this module is safe
   to delete without losing any user data.

   Performance note (Objective #11): every function below is a
   single O(n) pass (or O(n log n) for the sorts), the same pattern
   searchEngine.js's index build already uses. That's what scales;
   it does NOT solve localStorage's ~5-10MB practical size ceiling,
   which is a storage-backend concern, not an aggregation-algorithm
   one — see docs/V5_DEFERRED_SCOPE.md item 10 for that distinction.
   ============================================================ */
(function (App) {
  "use strict";

  const DONE = "Completed";
  const IN_PROGRESS = "In Progress";
  const REVISION = "Revision Needed";

  function pct(part, whole) {
    return whole ? Math.round((part / whole) * 100) : 0;
  }

  // ---------------- Objective #1: Learning Dashboard ----------------
  function getOverallCompletion() {
    const all = App.Data.getAll();
    const map = App.Storage.getProgressMap();
    let completed = 0,
      inProgress = 0,
      revision = 0;
    all.forEach((r) => {
      const s = map[r.id];
      if (s === DONE) completed++;
      else if (s === IN_PROGRESS) inProgress++;
      else if (s === REVISION) revision++;
    });
    return {
      total: all.length,
      completed,
      inProgress,
      revision,
      notStarted: all.length - completed - inProgress - revision,
      pct: pct(completed, all.length),
    };
  }

  function getWeeklyActivity(days) {
    days = days || 7;
    return App.Storage.getGoalHistory(days).map((d) => ({ date: d.date, completed: d.completed }));
  }

  /** Sum of parsed estTime.avg for resources NOT yet completed. Resources
   * with an unparseable estTime are excluded and counted separately —
   * never silently treated as 0 hours (see formatters.js parseEstTime). */
  function getRemainingStudyTime() {
    const map = App.Storage.getProgressMap();
    const remaining = App.Data.getAll().filter((r) => map[r.id] !== DONE);
    let hours = 0,
      unknownCount = 0;
    remaining.forEach((r) => {
      const parsed = App.Formatters.parseEstTime(r.estTime);
      if (parsed) hours += parsed.avg;
      else unknownCount++;
    });
    return {
      approxHours: Math.round(hours * 10) / 10,
      resourcesCounted: remaining.length - unknownCount,
      resourcesUnknownTime: unknownCount,
    };
  }

  function getLearningDashboard() {
    return {
      overall: getOverallCompletion(),
      subjects: getSubjectProgress(),
      universities: getUniversityProgress(),
      weeklyActivity: getWeeklyActivity(7),
      streak: App.Storage.getStudyStreak(),
      remainingStudyTime: getRemainingStudyTime(),
    };
  }

  // ---------------- Objective #2: Progress Analytics (per subject) ----------------
  function getSubjectProgress() {
    const map = App.Storage.getProgressMap();
    const subjects = App.Data.getSubjects();
    return subjects.map((subject) => {
      const resources = App.Data.getAll().filter((r) => r.subject === subject);
      const completed = resources.filter((r) => map[r.id] === DONE).length;
      let hours = 0,
        unknownCount = 0;
      resources
        .filter((r) => map[r.id] !== DONE)
        .forEach((r) => {
          const parsed = App.Formatters.parseEstTime(r.estTime);
          if (parsed) hours += parsed.avg;
          else unknownCount++;
        });
      return {
        subject,
        total: resources.length,
        completed,
        remaining: resources.length - completed,
        pct: pct(completed, resources.length),
        approxRemainingHours: Math.round(hours * 10) / 10,
        resourcesUnknownTime: unknownCount,
      };
    });
  }

  function getUniversityProgress() {
    const map = App.Storage.getProgressMap();
    return App.Data.getUniversities().map((u) => {
      const resources = App.Data.getByUniversity(u.key);
      const completed = resources.filter((r) => map[r.id] === DONE).length;
      return {
        key: u.key,
        label: u.label,
        total: resources.length,
        completed,
        pct: pct(completed, resources.length),
      };
    });
  }

  // ---------------- Objective #3: Learning Recommendations ----------------
  // Deliberately rule-based, not ML — see docs/V5_DEFERRED_SCOPE.md item 3
  // for why a learned recommender isn't warranted at this resource count.
  function getRecommendations() {
    const map = App.Storage.getProgressMap();
    const all = App.Data.getAll();
    const recs = [];

    const recentIds = App.Storage.getRecentlyViewed();
    const continuing = recentIds.find((id) => map[id] === IN_PROGRESS);
    if (continuing) {
      recs.push({ type: "continue", resource: App.Data.getById(continuing) });
    }

    const activeSubjects = new Set(
      all.filter((r) => map[r.id] === DONE || map[r.id] === IN_PROGRESS).map((r) => r.subject)
    );
    const nextTopic = all
      .filter((r) => activeSubjects.has(r.subject) && !map[r.id])
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
    if (nextTopic) recs.push({ type: "next-topic", resource: nextTopic });

    const revisionNeeded = all
      .filter((r) => map[r.id] === REVISION)
      .slice(0, 3)
      .map((r) => ({ type: "revision", resource: r }));
    recs.push(...revisionNeeded);

    const inProgressOrQueued = new Set([
      ...all.filter((r) => map[r.id] === IN_PROGRESS).map((r) => r.id),
      ...App.Storage.getReadingQueue(),
    ]);
    const missingPrereqs = [];
    inProgressOrQueued.forEach((id) => {
      const r = App.Data.getById(id);
      if (!r || !r.prerequisites || !r.prerequisites.length) return;
      r.prerequisites.forEach((prereqId) => {
        if (map[prereqId] !== DONE) {
          const prereq = App.Data.getById(prereqId);
          if (prereq)
            missingPrereqs.push({ type: "missing-prerequisite", resource: prereq, for: r });
        }
      });
    });

    return {
      recommendations: recs,
      missingPrerequisites: missingPrereqs,
      prerequisiteDataCoverage: pct(
        all.filter((r) => r.prerequisites && r.prerequisites.length).length,
        all.length
      ),
    };
  }

  // ---------------- Objective #4: Resource Insights ----------------
  function getResourceInsights(limit) {
    limit = limit || 5;
    const viewCounts = App.Storage.getViewCounts();
    const mostViewed = Object.entries(viewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => ({ resource: App.Data.getById(id), count }))
      .filter((x) => x.resource);

    const completionEvents = App.Storage.getCompletionEvents();
    const completionCounts = {};
    completionEvents.forEach((e) => {
      completionCounts[e.id] = (completionCounts[e.id] || 0) + 1;
    });
    const mostCompleted = Object.entries(completionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id, count]) => ({ resource: App.Data.getById(id), count }))
      .filter((x) => x.resource);

    const frequentlyRevisited = mostCompleted.filter((x) => x.count > 1);
    const favorites = App.Data.getByIds(App.Storage.getFavorites());

    let totalHours = 0,
      countedResources = 0;
    Object.keys(completionCounts).forEach((id) => {
      const r = App.Data.getById(id);
      const parsed = r && App.Formatters.parseEstTime(r.estTime);
      if (parsed) {
        totalHours += parsed.avg;
        countedResources++;
      }
    });

    return {
      mostViewed,
      mostCompleted,
      frequentlyRevisited,
      favorites,
      avgCompletionTimeHours: countedResources
        ? Math.round((totalHours / countedResources) * 10) / 10
        : null,
    };
  }

  // ---------------- Objective #5: Goal Analytics ----------------
  function getGoalAnalytics() {
    return {
      goals: App.Storage.getGoals(),
      daily: App.Storage.getDailyGoalProgress(),
      weekly: App.Storage.getWeeklyGoalProgress(),
      dailyConsistency: App.Storage.getGoalConsistency(30),
      weeklyConsistency: App.Storage.getWeeklyConsistency(4),
      history: App.Storage.getGoalHistory(14),
    };
  }

  // ---------------- Objective #6: Revision Tracking ----------------
  const REVIEW_INTERVAL_DAYS = 14;
  function getRevisionTracking() {
    const map = App.Storage.getProgressMap();
    const completionEvents = App.Storage.getCompletionEvents();
    const activityLog = App.Storage.getActivityLog();
    const todayStr = new Date().toISOString().slice(0, 10);

    const completedIds = Object.keys(map).filter((id) => map[id] === DONE);
    const tracking = completedIds
      .map((id) => {
        const resource = App.Data.getById(id);
        if (!resource) return null;
        const events = completionEvents
          .filter((e) => e.id === id)
          .map((e) => e.date)
          .sort();
        const noteEvents = activityLog
          .filter((e) => e.id === id && e.type === "note")
          .map((e) => e.date)
          .sort();
        const lastStudied = [events, noteEvents].flat().sort().slice(-1)[0] || null;
        if (!lastStudied) return null;

        const reviewDate = new Date(lastStudied);
        reviewDate.setDate(reviewDate.getDate() + REVIEW_INTERVAL_DAYS);
        const recommendedReviewDate = reviewDate.toISOString().slice(0, 10);
        const overdue = recommendedReviewDate < todayStr;

        return {
          id,
          resource,
          lastStudiedDate: lastStudied,
          recommendedReviewDate,
          overdue,
          revisionHistory: events,
        };
      })
      .filter(Boolean);

    return {
      tracked: tracking,
      overdue: tracking.filter((t) => t.overdue),
      reviewIntervalDays: REVIEW_INTERVAL_DAYS,
    };
  }

  // ---------------- Objective #7: Timeline ----------------
  function getTimeline(limit) {
    limit = limit || 50;
    const events = [];
    App.Storage.getCompletionEvents().forEach((e) => {
      const r = App.Data.getById(e.id);
      if (r) events.push({ type: "completed", date: e.date, resource: r });
    });
    App.Storage.getActivityLog().forEach((e) => {
      const r = App.Data.getById(e.id);
      if (r) events.push({ type: e.type, date: e.date, resource: r });
    });
    App.Storage.getGoalHistory(30)
      .filter((d) => d.met)
      .forEach((d) => events.push({ type: "goal-met", date: d.date, resource: null }));

    events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return events.slice(0, limit);
  }

  // ---------------- Objective #8: Personal Statistics ----------------
  function getPersonalStats() {
    const notesCount = Object.keys(App.Storage.getNotesMap()).length;
    const favoritesCount = App.Storage.getFavorites().length;
    const queueSize = App.Storage.getReadingQueue().length;

    const activityDates = new Set([
      ...App.Storage.getCompletionEvents().map((e) => e.date),
      ...App.Storage.getActivityLog().map((e) => e.date),
    ]);

    const map = App.Storage.getProgressMap();
    let totalHours = 0,
      unknownCount = 0;
    Object.keys(map)
      .filter((id) => map[id] === DONE)
      .forEach((id) => {
        const r = App.Data.getById(id);
        const parsed = r && App.Formatters.parseEstTime(r.estTime);
        if (parsed) totalHours += parsed.avg;
        else unknownCount++;
      });

    return {
      totalNotes: notesCount,
      totalFavorites: favoritesCount,
      queueSize,
      studySessions: activityDates.size,
      estimatedTotalStudyHours: Math.round(totalHours * 10) / 10,
      resourcesWithUnknownTime: unknownCount,
    };
  }

  // ---------------- Objective #9: Data Export ----------------
  /** A read-only JSON summary for export — distinct from App.Storage.exportAll(),
   * which is a raw backup/restore payload. This is the human-readable report. */
  function exportAnalyticsSummary() {
    return {
      generatedAt: new Date().toISOString(),
      dashboard: getLearningDashboard(),
      recommendations: getRecommendations(),
      resourceInsights: getResourceInsights(10),
      goalAnalytics: getGoalAnalytics(),
      revisionTracking: getRevisionTracking(),
      personalStats: getPersonalStats(),
    };
  }

  App.Analytics = {
    getOverallCompletion,
    getSubjectProgress,
    getUniversityProgress,
    getWeeklyActivity,
    getRemainingStudyTime,
    getLearningDashboard,
    getRecommendations,
    getResourceInsights,
    getGoalAnalytics,
    getRevisionTracking,
    getTimeline,
    getPersonalStats,
    exportAnalyticsSummary,
  };
})((window.App = window.App || {}));
