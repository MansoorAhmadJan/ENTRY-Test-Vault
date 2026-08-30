/* ============================================================
   Learning Analytics view (V5.1). All data comes from
   App.Analytics (js/analytics/analyticsEngine.js) — this file is
   presentation only, no aggregation logic lives here. Deliberately
   complements statsView.js (vault-wide counts, most-used,
   favorites) rather than duplicating it: this page is about
   PROGRESS — completion, goals, revision, recommendations, timeline.
   ============================================================ */
(function (App) {
  "use strict";

  function barChart(rows, maxOverride) {
    const max = maxOverride || Math.max(1, ...rows.map((r) => r.value));
    return rows
      .map(
        (r) => `
      <div class="bar-chart-row">
        <div class="bar-chart-label" title="${App.Utils.escapeHtml(r.label)}">${App.Utils.escapeHtml(r.label)}</div>
        <div class="bar-chart-track"><div class="bar-chart-fill" data-fill="${Math.round((r.value / max) * 100)}"></div></div>
        <div class="bar-chart-value">${r.value}</div>
      </div>`
      )
      .join("");
  }

  function resourceRow(resource, meta) {
    return `
      <div class="filter-bar csp-663510">
        <span class="csp-bfdc35" data-open="${resource.id}">${App.Utils.escapeHtml(resource.title)}</span>
        ${meta || ""}
      </div>`;
  }

  const REC_LABELS = {
    continue: "Continue learning",
    "next-topic": "Suggested next topic",
    revision: "Suggested revision",
    "missing-prerequisite": "Missing prerequisite",
  };

  const TIMELINE_LABELS = {
    completed: "Completed",
    note: "Note saved",
    "queue-add": "Added to queue",
    "queue-remove": "Removed from queue",
    "goal-met": "Daily goal met",
  };

  function render(container) {
    const dash = App.Analytics.getLearningDashboard();
    const recs = App.Analytics.getRecommendations();
    const insights = App.Analytics.getResourceInsights(5);
    const goalAnalytics = App.Analytics.getGoalAnalytics();
    const revision = App.Analytics.getRevisionTracking();
    const timeline = App.Analytics.getTimeline(15);
    const personal = App.Analytics.getPersonalStats();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Learning Analytics</h1>
          <p class="subtitle">Your progress through the vault — completion, goals, revision, and what to study next.</p>
        </div>
        <button class="btn btn-secondary" id="analytics-export-btn">${App.Icons.get("download")} Export Report</button>
      </div>

      <div class="section">
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value">${dash.overall.pct}%</div><div class="stat-label">Overall Completion</div></div>
          <div class="stat-card"><div class="stat-value">${dash.overall.completed}</div><div class="stat-label">Resources Completed</div></div>
          <div class="stat-card"><div class="stat-value">${dash.overall.inProgress}</div><div class="stat-label">In Progress</div></div>
          <div class="stat-card"><div class="stat-value">${dash.streak}</div><div class="stat-label">Day Streak</div></div>
          <div class="stat-card"><div class="stat-value">~${dash.remainingStudyTime.approxHours}h</div><div class="stat-label">Remaining Study Time*</div></div>
        </div>
        <p class="csp-38cabe">
          *Approximate — based on ${dash.remainingStudyTime.resourcesCounted} resources with a parseable time estimate${dash.remainingStudyTime.resourcesUnknownTime ? `; ${dash.remainingStudyTime.resourcesUnknownTime} more have no structured estimate and aren't counted` : ""}.
        </p>
      </div>

      <div class="section csp-5d37f2">
        <div class="card">
          <div class="section-title csp-52c54a">
            <strong>Progress by Subject</strong>
            <button class="btn btn-secondary" id="ai-summarize-btn" class="csp-9f8eb2">${App.Icons.get("sparkle")} AI: Summarize</button>
          </div>
          ${barChart(
            dash.subjects.map((s) => ({ label: `${s.subject} (${s.pct}%)`, value: s.completed })),
            Math.max(1, ...dash.subjects.map((s) => s.total))
          )}
          <div id="ai-summarize-result" class="csp-36d563"></div>
        </div>
        <div class="card">
          <div class="section-title csp-7f5713"><strong>Progress by University</strong></div>
          ${barChart(
            dash.universities.map((u) => ({ label: `${u.label} (${u.pct}%)`, value: u.completed })),
            Math.max(1, ...dash.universities.map((u) => u.total))
          )}
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="section-title csp-7f5713"><strong>Last 7 Days</strong></div>
          ${barChart(dash.weeklyActivity.map((d) => ({ label: d.date.slice(5), value: d.completed })))}
        </div>
      </div>

      <div class="section csp-5d37f2">
        <div class="card">
          <div class="section-title csp-52c54a">
            <strong>Recommendations</strong>
            <button class="btn btn-secondary" id="ai-study-order-btn" class="csp-9f8eb2">${App.Icons.get("sparkle")} AI: Suggest study order</button>
          </div>
          <div id="analytics-recs"></div>
          <div id="ai-study-order-result"></div>
        </div>
        <div class="card">
          <div class="section-title csp-7f5713"><strong>Resource Insights</strong></div>
          <div id="analytics-insights"></div>
        </div>
      </div>

      <div class="section csp-5d37f2">
        <div class="card">
          <div class="section-title csp-7f5713"><strong>Goal Consistency</strong></div>
          <p class="csp-c64771">Last 30 days: <strong>${goalAnalytics.dailyConsistency.metDays}/${goalAnalytics.dailyConsistency.totalDays}</strong> days hit your daily goal (${goalAnalytics.dailyConsistency.pct}%).</p>
          <div class="progress-bar csp-7f5713"><div class="progress-bar-fill" data-fill="${goalAnalytics.dailyConsistency.pct}"></div></div>
          <p class="rm-muted-hint">Weekly: ${goalAnalytics.weeklyConsistency.filter((w) => w.met).length}/${goalAnalytics.weeklyConsistency.length} of the last ${goalAnalytics.weeklyConsistency.length} weeks met the weekly target.</p>
          ${goalAnalytics.dailyConsistency.missedDays.length ? `<p class="csp-38cabe">Missed: ${goalAnalytics.dailyConsistency.missedDays.slice(-5).join(", ")}${goalAnalytics.dailyConsistency.missedDays.length > 5 ? "…" : ""}</p>` : ""}
        </div>
        <div class="card">
          <div class="section-title csp-7f5713"><strong>Revision Tracking</strong> <span class="csp-cf77c8">(review suggested ${revision.reviewIntervalDays} days after completion)</span></div>
          <div id="analytics-revision"></div>
        </div>
      </div>

      <div class="section csp-5d37f2">
        <div class="card">
          <div class="section-title csp-7f5713"><strong>Timeline</strong></div>
          <div id="analytics-timeline"></div>
        </div>
        <div class="card">
          <div class="section-title csp-7f5713"><strong>Your Numbers</strong></div>
          <div class="stat-grid csp-6140c5">
            <div class="stat-card"><div class="stat-value">${personal.totalNotes}</div><div class="stat-label">Notes</div></div>
            <div class="stat-card"><div class="stat-value">${personal.totalFavorites}</div><div class="stat-label">Favorites</div></div>
            <div class="stat-card"><div class="stat-value">${personal.queueSize}</div><div class="stat-label">In Queue</div></div>
            <div class="stat-card"><div class="stat-value">${personal.studySessions}</div><div class="stat-label">Study Sessions</div></div>
          </div>
          <p class="csp-a4a2c5">~${personal.estimatedTotalStudyHours}h estimated study time so far${personal.resourcesWithUnknownTime ? ` (${personal.resourcesWithUnknownTime} completed resources have no structured time estimate)` : ""}.</p>
        </div>
      </div>
    `;

    App.Dom.paintFills(container);

    const recsHost = container.querySelector("#analytics-recs");
    if (!recs.recommendations.length) {
      recsHost.innerHTML = `<p class="csp-923776">Nothing to recommend yet — mark a few resources In Progress to get suggestions.</p>`;
    } else {
      recsHost.innerHTML = recs.recommendations
        .map((r) =>
          resourceRow(
            r.resource,
            `<span class="badge badge-outline">${REC_LABELS[r.type] || r.type}</span>`
          )
        )
        .join("");
    }
    if (recs.missingPrerequisites.length) {
      recsHost.innerHTML +=
        `<div class="section-title csp-0c9c2f">Missing prerequisites</div>` +
        recs.missingPrerequisites
          .slice(0, 5)
          .map((m) =>
            resourceRow(
              m.resource,
              `<span class="badge badge-outline">for "${App.Utils.escapeHtml(m.for.title)}"</span>`
            )
          )
          .join("");
    } else {
      recsHost.innerHTML += `<p class="csp-4d1997">Prerequisite data covers ${recs.prerequisiteDataCoverage}% of the vault, so this list will often be empty.</p>`;
    }

    const insightsHost = container.querySelector("#analytics-insights");
    let insightsHtml = "";
    if (insights.frequentlyRevisited.length) {
      insightsHtml += `<div class="section-title csp-80a031">Frequently Revisited</div>`;
      insightsHtml += insights.frequentlyRevisited
        .map((x) =>
          resourceRow(x.resource, `<span class="badge badge-outline">${x.count}× completed</span>`)
        )
        .join("");
    }
    insightsHtml += `<p class="csp-fa45c8">Average time to complete a resource: ${insights.avgCompletionTimeHours !== null ? `~${insights.avgCompletionTimeHours}h` : "not enough data yet"}.</p>`;
    insightsHost.innerHTML =
      insightsHtml ||
      `<p class="csp-923776">Complete the same resource more than once to see revisit patterns here.</p>`;

    const revisionHost = container.querySelector("#analytics-revision");
    if (!revision.tracked.length) {
      revisionHost.innerHTML = `<p class="csp-923776">Nothing to review yet — complete a resource to start tracking revision dates.</p>`;
    } else {
      const list = revision.overdue.length ? revision.overdue : revision.tracked.slice(0, 5);
      revisionHost.innerHTML =
        (revision.overdue.length
          ? `<p class="csp-47a2a1">${revision.overdue.length} resource(s) overdue for review:</p>`
          : `<p class="csp-47a2a1">Nothing overdue. Next few reviews:</p>`) +
        list
          .map((t) =>
            resourceRow(
              t.resource,
              `<span class="badge badge-outline">${t.overdue ? "Overdue since " : "Review by "}${t.recommendedReviewDate}</span>`
            )
          )
          .join("");
    }

    const timelineHost = container.querySelector("#analytics-timeline");
    if (!timeline.length) {
      timelineHost.innerHTML = `<p class="csp-923776">No activity yet. Complete a resource, save a note, or add something to your queue to start building a timeline.</p>`;
    } else {
      timelineHost.innerHTML = timeline
        .map(
          (e) => `
        <div class="filter-bar csp-663510">
          <span class="csp-38f631">${e.date.slice(5)}</span>
          <span class="analytics-timeline-label ${e.resource ? "is-clickable" : ""}" ${e.resource ? `data-open="${e.resource.id}"` : ""}>${TIMELINE_LABELS[e.type] || e.type}${e.resource ? `: ${App.Utils.escapeHtml(e.resource.title)}` : ""}</span>
        </div>`
        )
        .join("");
    }

    App.Dom.qsa("[data-open]", container).forEach((el) => {
      el.addEventListener("click", () =>
        App.Components.openResourceModal(el.getAttribute("data-open"))
      );
    });

    container.querySelector("#analytics-export-btn").addEventListener("click", () => {
      const summary = App.Analytics.exportAnalyticsSummary();
      const blob = new Blob([JSON.stringify(summary, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vault-analytics-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      App.Toast.show("Analytics report exported", "success");
    });

    async function runAiAction(resultEl, btn, fn) {
      resultEl.innerHTML = `<p class="rm-muted-hint">Thinking…</p>`;
      btn.disabled = true;
      try {
        await App.AI.ensureLoaded();
        if (!App.AI.Service.isConfigured()) {
          resultEl.innerHTML = `<p class="rm-muted-hint">AI isn't enabled/configured — see AI Settings.</p>`;
          return;
        }
        const result = await fn();
        resultEl.innerHTML = result.ok
          ? `<div class="card csp-8f4b6b">${App.Utils.escapeHtml(result.text)}</div>`
          : `<p class="rm-error-hint">${App.Utils.escapeHtml(result.error)}</p>`;
      } catch (err) {
        resultEl.innerHTML = `<p class="rm-error-hint">${App.Utils.escapeHtml(err.message)}</p>`;
      } finally {
        btn.disabled = false;
      }
    }

    const summarizeBtn = container.querySelector("#ai-summarize-btn");
    summarizeBtn.addEventListener("click", () => {
      const resultEl = container.querySelector("#ai-summarize-result");
      const incomplete = App.Data.getAll().filter(
        (r) => App.Storage.getProgress(r.id) !== "Completed"
      );
      if (!incomplete.length) {
        resultEl.innerHTML = `<p class="rm-muted-hint">Everything's completed — nothing left to summarize.</p>`;
        return;
      }
      runAiAction(resultEl, summarizeBtn, () =>
        App.AI.Features.summarizeChapter(incomplete.slice(0, 15))
      );
    });

    const studyOrderBtn = container.querySelector("#ai-study-order-btn");
    studyOrderBtn.addEventListener("click", () => {
      const resultEl = container.querySelector("#ai-study-order-result");
      const pending = App.Data.getAll().filter(
        (r) => App.Storage.getProgress(r.id) !== "Completed"
      );
      if (!pending.length) {
        resultEl.innerHTML = `<p class="rm-muted-hint">Nothing pending — everything's completed.</p>`;
        return;
      }
      runAiAction(resultEl, studyOrderBtn, () =>
        App.AI.Features.recommendStudySequence(pending.slice(0, 15))
      );
    });
  }

  App.Views = App.Views || {};
  App.Views.analytics = (c) => App.ErrorHandler.guard(c, "Learning Analytics", () => render(c));
})((window.App = window.App || {}));
