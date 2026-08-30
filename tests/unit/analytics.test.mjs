// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.Analytics — Overall completion & subject/university progress", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    window.App.Search.build();
  });

  it("getOverallCompletion matches real totals with zero progress", () => {
    const c = window.App.Analytics.getOverallCompletion();
    expect(c.total).toBe(window.App.Data.getAll().length);
    expect(c.completed).toBe(0);
    expect(c.pct).toBe(0);
  });

  it("getOverallCompletion updates correctly as resources are completed", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    window.App.Storage.setProgress("ETV-0002", "In Progress");
    const c = window.App.Analytics.getOverallCompletion();
    expect(c.completed).toBe(1);
    expect(c.inProgress).toBe(1);
    expect(c.notStarted).toBe(c.total - 2);
  });

  it("getSubjectProgress covers every real subject in the data, not a hardcoded list", () => {
    const subjects = window.App.Analytics.getSubjectProgress();
    const realSubjects = window.App.Data.getSubjects();
    expect(subjects.map((s) => s.subject).sort()).toEqual(realSubjects.sort());
  });

  it("getSubjectProgress percentages are internally consistent (completed <= total)", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    const subjects = window.App.Analytics.getSubjectProgress();
    subjects.forEach((s) => {
      expect(s.completed).toBeLessThanOrEqual(s.total);
      expect(s.remaining).toBe(s.total - s.completed);
    });
  });

  it("getUniversityProgress does not divide by zero for a university with 0 resources", () => {
    const unis = window.App.Analytics.getUniversityProgress();
    unis.forEach((u) => {
      expect(Number.isNaN(u.pct)).toBe(false);
    });
  });
});

describe("App.Analytics — Remaining study time (real estTime data)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
  });

  it("never reports NaN and always accounts for every non-completed resource", () => {
    const r = window.App.Analytics.getRemainingStudyTime();
    expect(Number.isNaN(r.approxHours)).toBe(false);
    const nonCompleted = window.App.Data.getAll().length;
    expect(r.resourcesCounted + r.resourcesUnknownTime).toBe(nonCompleted);
  });

  it("marking everything Completed drops remaining time toward 0", () => {
    window.App.Data.getAll().forEach((r) => window.App.Storage.setProgress(r.id, "Completed"));
    const r = window.App.Analytics.getRemainingStudyTime();
    expect(r.approxHours).toBe(0);
    expect(r.resourcesCounted).toBe(0);
  });
});

describe("App.Analytics — Recommendations", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
  });

  it("recommends 'continue' for a resource that's actually In Progress and recently viewed", () => {
    window.App.Storage.setProgress("ETV-0001", "In Progress");
    window.App.Storage.pushRecentlyViewed("ETV-0001");
    const recs = window.App.Analytics.getRecommendations();
    expect(
      recs.recommendations.some((r) => r.type === "continue" && r.resource.id === "ETV-0001")
    ).toBe(true);
  });

  it("reports real prerequisite data coverage, not a fabricated number", () => {
    const recs = window.App.Analytics.getRecommendations();
    const all = window.App.Data.getAll();
    const expectedPct = Math.round(
      (all.filter((r) => r.prerequisites && r.prerequisites.length).length / all.length) * 100
    );
    expect(recs.prerequisiteDataCoverage).toBe(expectedPct);
  });

  it("missing-prerequisite recommendations only reference resources that genuinely have unmet prerequisites", () => {
    const recs = window.App.Analytics.getRecommendations();
    recs.missingPrerequisites.forEach((m) => {
      expect(m.for.prerequisites).toContain(m.resource.id);
    });
  });
});

describe("App.Analytics — Revision tracking", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    vi.useRealTimers();
  });

  it("a resource with no completion history is not tracked", () => {
    const rev = window.App.Analytics.getRevisionTracking();
    expect(rev.tracked.find((t) => t.id === "ETV-0001")).toBeUndefined();
  });

  it("recommended review date is exactly reviewIntervalDays after last studied", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed");
    const rev = window.App.Analytics.getRevisionTracking();
    const tracked = rev.tracked.find((t) => t.id === "ETV-0001");
    expect(tracked.lastStudiedDate).toBe("2026-01-01");
    expect(tracked.recommendedReviewDate).toBe("2026-01-15"); // +14 days
    vi.useRealTimers();
  });

  it("a resource is correctly flagged overdue once the review date has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed");

    vi.setSystemTime(new Date("2026-01-20T10:00:00Z")); // well past +14 days
    const rev = window.App.Analytics.getRevisionTracking();
    const tracked = rev.tracked.find((t) => t.id === "ETV-0001");
    expect(tracked.overdue).toBe(true);
    expect(rev.overdue.some((t) => t.id === "ETV-0001")).toBe(true);
    vi.useRealTimers();
  });

  it("a resource is NOT overdue before the review date arrives", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed");

    vi.setSystemTime(new Date("2026-01-05T10:00:00Z")); // only 4 days later
    const rev = window.App.Analytics.getRevisionTracking();
    const tracked = rev.tracked.find((t) => t.id === "ETV-0001");
    expect(tracked.overdue).toBe(false);
    vi.useRealTimers();
  });

  it("revisionHistory lists every real completion date, including repeat completions", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed");
    vi.setSystemTime(new Date("2026-01-10T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Revision Needed");
    window.App.Storage.setProgress("ETV-0001", "Completed"); // re-completed

    const rev = window.App.Analytics.getRevisionTracking();
    const tracked = rev.tracked.find((t) => t.id === "ETV-0001");
    expect(tracked.revisionHistory).toEqual(["2026-01-01", "2026-01-10"]);
    vi.useRealTimers();
  });
});

describe("App.Analytics — Timeline & Personal Stats", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
  });

  it("timeline merges completions, notes, and queue events in real reverse-chronological order", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed");
    vi.setSystemTime(new Date("2026-01-02T10:00:00Z"));
    window.App.Storage.setNote("ETV-0002", "a real note");
    vi.setSystemTime(new Date("2026-01-03T10:00:00Z"));
    window.App.Storage.addToQueue("ETV-0003");
    vi.useRealTimers();

    const timeline = window.App.Analytics.getTimeline(10);
    expect(timeline[0].type).toBe("queue-add"); // most recent first
    expect(timeline[0].date).toBe("2026-01-03");
    expect(timeline.some((e) => e.type === "completed" && e.date === "2026-01-01")).toBe(true);
    expect(timeline.some((e) => e.type === "note" && e.date === "2026-01-02")).toBe(true);
  });

  it("getPersonalStats reflects real counts across notes/favorites/queue", () => {
    window.App.Storage.setNote("ETV-0001", "note 1");
    window.App.Storage.toggleFavorite("ETV-0002");
    window.App.Storage.addToQueue("ETV-0003");
    const stats = window.App.Analytics.getPersonalStats();
    expect(stats.totalNotes).toBe(1);
    expect(stats.totalFavorites).toBe(1);
    expect(stats.queueSize).toBe(1);
  });

  it("studySessions counts distinct days, not total events", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed");
    window.App.Storage.setNote("ETV-0001", "same day, second event");
    vi.setSystemTime(new Date("2026-01-02T10:00:00Z"));
    window.App.Storage.addToQueue("ETV-0002");
    vi.useRealTimers();

    const stats = window.App.Analytics.getPersonalStats();
    expect(stats.studySessions).toBe(2); // 2 distinct days, despite 3 total events
  });
});

describe("App.Analytics — exportAnalyticsSummary", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
  });

  it("produces a fully JSON-serializable summary with no circular references or undefined leaks", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    const summary = window.App.Analytics.exportAnalyticsSummary();
    expect(() => JSON.stringify(summary)).not.toThrow();
    const parsed = JSON.parse(JSON.stringify(summary));
    expect(parsed.dashboard.overall.completed).toBe(1);
  });
});
