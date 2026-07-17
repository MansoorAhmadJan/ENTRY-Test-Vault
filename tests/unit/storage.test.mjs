// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.Storage (real localStorage-backed persistence)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
  });

  it("theme defaults to a value and round-trips through set/get", () => {
    window.App.Storage.setTheme("dark");
    expect(window.App.Storage.getTheme()).toBe("dark");
  });

  it("toggleFavorite adds then removes a resource id", () => {
    expect(window.App.Storage.isFavorite("ETV-0001")).toBe(false);
    window.App.Storage.toggleFavorite("ETV-0001");
    expect(window.App.Storage.isFavorite("ETV-0001")).toBe(true);
    expect(window.App.Storage.getFavorites()).toContain("ETV-0001");
    window.App.Storage.toggleFavorite("ETV-0001");
    expect(window.App.Storage.isFavorite("ETV-0001")).toBe(false);
  });

  it("toggleBookmark and toggleQueue behave independently of favorites", () => {
    window.App.Storage.toggleFavorite("ETV-0001");
    window.App.Storage.toggleBookmark("ETV-0002");
    window.App.Storage.toggleQueue("ETV-0003");
    expect(window.App.Storage.isFavorite("ETV-0001")).toBe(true);
    expect(window.App.Storage.isFavorite("ETV-0002")).toBe(false);
    expect(window.App.Storage.isBookmarked("ETV-0002")).toBe(true);
    expect(window.App.Storage.isQueued("ETV-0003")).toBe(true);
  });

  it("setProgress/getProgress round-trip per resource id", () => {
    window.App.Storage.setProgress("ETV-0001", "In Progress");
    expect(window.App.Storage.getProgress("ETV-0001", "Not Started")).toBe("In Progress");
    expect(window.App.Storage.getProgress("ETV-9999", "Not Started")).toBe("Not Started");
  });

  it("setNote/getNote round-trip text per resource id", () => {
    window.App.Storage.setNote("ETV-0001", "Redo chapter 3");
    expect(window.App.Storage.getNote("ETV-0001")).toBe("Redo chapter 3");
    expect(window.App.Storage.getNote("ETV-9999")).toBeFalsy();
  });

  it("pushRecentlyViewed tracks most-recent-first without unbounded duplicates", () => {
    window.App.Storage.pushRecentlyViewed("ETV-0001");
    window.App.Storage.pushRecentlyViewed("ETV-0002");
    window.App.Storage.pushRecentlyViewed("ETV-0001"); // re-view should move to front, not duplicate at end
    const recent = window.App.Storage.getRecentlyViewed();
    expect(recent[0]).toBe("ETV-0001");
    expect(recent.filter((id) => id === "ETV-0001").length).toBe(1);
  });

  it("incrementViewCount accumulates per resource id", () => {
    window.App.Storage.incrementViewCount("ETV-0001");
    window.App.Storage.incrementViewCount("ETV-0001");
    window.App.Storage.incrementViewCount("ETV-0002");
    const counts = window.App.Storage.getViewCounts();
    expect(counts["ETV-0001"]).toBe(2);
    expect(counts["ETV-0002"]).toBe(1);
  });

  it("saveSearch/deleteSavedSearch round-trip", () => {
    const saved = window.App.Storage.saveSearch("My GIKI search", "giki", { university: ["GIKI"] });
    expect(window.App.Storage.getSavedSearches().some((s) => s.id === saved.id)).toBe(true);
    window.App.Storage.deleteSavedSearch(saved.id);
    expect(window.App.Storage.getSavedSearches().some((s) => s.id === saved.id)).toBe(false);
  });

  it("exportAll produces a payload that importAll can restore after clearAll", () => {
    window.App.Storage.toggleFavorite("ETV-0001");
    window.App.Storage.setNote("ETV-0002", "hello");
    window.App.Storage.setTheme("dark");

    const exported = window.App.Storage.exportAll();
    window.App.Storage.clearAll();
    expect(window.App.Storage.isFavorite("ETV-0001")).toBe(false); // confirms clearAll really cleared

    window.App.Storage.importAll(exported);
    expect(window.App.Storage.isFavorite("ETV-0001")).toBe(true);
    expect(window.App.Storage.getNote("ETV-0002")).toBe("hello");
    expect(window.App.Storage.getTheme()).toBe("dark");
  });

  it("importAll does not throw on a garbage/malformed payload", () => {
    expect(() => window.App.Storage.importAll({ notARealKey: 123 })).not.toThrow();
    expect(() => window.App.Storage.importAll(null)).not.toThrow();
  });

  it("survives localStorage being unavailable (e.g. private-mode) without throwing", () => {
    const original = window.localStorage.setItem;
    window.localStorage.setItem = () => {
      throw new Error("simulated quota/private-mode failure");
    };
    expect(() => window.App.Storage.setTheme("dark")).not.toThrow();
    window.localStorage.setItem = original;
  });
});

describe("App.Storage — Goals & study streaks (V5.0)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    vi.useRealTimers();
  });

  it("getGoals returns sane defaults before any goal is set", () => {
    const goals = window.App.Storage.getGoals();
    expect(goals.dailyTarget).toBeGreaterThan(0);
    expect(goals.weeklyTarget).toBeGreaterThan(0);
  });

  it("setGoals merges partial updates without clobbering the other target", () => {
    window.App.Storage.setGoals({ dailyTarget: 5 });
    const goals = window.App.Storage.getGoals();
    expect(goals.dailyTarget).toBe(5);
    expect(goals.weeklyTarget).toBe(window.App.Storage.getGoals().weeklyTarget); // unchanged default
  });

  it("marking a resource Completed records a completion event for today", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    const todayStr = new Date().toISOString().slice(0, 10);
    expect(window.App.Storage.getCompletionsOnDate(todayStr)).toBe(1);
  });

  it("re-marking an already-Completed resource does NOT double-count", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    window.App.Storage.setProgress("ETV-0001", "Completed"); // redundant call
    const todayStr = new Date().toISOString().slice(0, 10);
    expect(window.App.Storage.getCompletionsOnDate(todayStr)).toBe(1);
  });

  it("reverting then re-completing DOES count again (a real second completion)", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    window.App.Storage.setProgress("ETV-0001", "Revision Needed");
    window.App.Storage.setProgress("ETV-0001", "Completed");
    const todayStr = new Date().toISOString().slice(0, 10);
    expect(window.App.Storage.getCompletionsOnDate(todayStr)).toBe(2);
  });

  it("getDailyGoalProgress reflects today's completions against the target", () => {
    window.App.Storage.setGoals({ dailyTarget: 2 });
    window.App.Storage.setProgress("ETV-0001", "Completed");
    let p = window.App.Storage.getDailyGoalProgress();
    expect(p).toEqual({ target: 2, completed: 1, pct: 50 });
    window.App.Storage.setProgress("ETV-0002", "Completed");
    p = window.App.Storage.getDailyGoalProgress();
    expect(p).toEqual({ target: 2, completed: 2, pct: 100 });
  });

  it("getDailyGoalProgress caps pct at 100 when target is exceeded", () => {
    window.App.Storage.setGoals({ dailyTarget: 1 });
    window.App.Storage.setProgress("ETV-0001", "Completed");
    window.App.Storage.setProgress("ETV-0002", "Completed");
    expect(window.App.Storage.getDailyGoalProgress().pct).toBe(100);
  });

  it("streak is 0 with no completions ever", () => {
    expect(window.App.Storage.getStudyStreak()).toBe(0);
  });

  it("streak is 1 after completing something today only", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    expect(window.App.Storage.getStudyStreak()).toBe(1);
  });

  it("streak counts consecutive backdated days correctly (fake-timer controlled)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed"); // Jan 1

    vi.setSystemTime(new Date("2026-01-02T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0002", "Completed"); // Jan 2

    vi.setSystemTime(new Date("2026-01-03T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0003", "Completed"); // Jan 3 (today)

    expect(window.App.Storage.getStudyStreak()).toBe(3);
    vi.useRealTimers();
  });

  it("a gap day breaks the streak (yesterday empty, today has one -> streak resets to 1)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed"); // Jan 1

    // Jan 2: nothing completed (gap day)

    vi.setSystemTime(new Date("2026-01-03T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0002", "Completed"); // Jan 3 (today)

    expect(window.App.Storage.getStudyStreak()).toBe(1); // Jan 1's streak doesn't reach across the Jan 2 gap
    vi.useRealTimers();
  });

  it("streak stays alive (not yet broken) if yesterday had a completion but today doesn't yet", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed"); // yesterday, relative to below

    vi.setSystemTime(new Date("2026-01-02T09:00:00Z")); // today, nothing completed YET
    expect(window.App.Storage.getStudyStreak()).toBe(1); // still counts yesterday's day
    vi.useRealTimers();
  });

  it("getWeeklyGoalProgress sums completions across the last 7 days (rolling window)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0001", "Completed");

    vi.setSystemTime(new Date("2026-01-05T10:00:00Z"));
    window.App.Storage.setProgress("ETV-0002", "Completed");

    vi.setSystemTime(new Date("2026-01-20T10:00:00Z")); // 15+ days later — Jan 1 event now outside the 7-day window
    window.App.Storage.setProgress("ETV-0003", "Completed");

    const p = window.App.Storage.getWeeklyGoalProgress();
    expect(p.completed).toBe(1); // only the Jan 20 event is within the last 7 days from "now"
    vi.useRealTimers();
  });
});

describe("App.Storage — Activity log & Timeline (V5.1)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    vi.useRealTimers();
  });

  it("saving a real note records a 'note' activity event", () => {
    window.App.Storage.setNote("ETV-0001", "hello world");
    const log = window.App.Storage.getActivityLog();
    expect(log.some((e) => e.type === "note" && e.id === "ETV-0001")).toBe(true);
  });

  it("clearing a note does NOT record an activity event", () => {
    window.App.Storage.setNote("ETV-0001", "hello");
    window.App.Storage.setNote("ETV-0001", ""); // clear
    const log = window.App.Storage.getActivityLog();
    expect(log.filter((e) => e.id === "ETV-0001").length).toBe(1); // only the original save
  });

  it("adding to the queue records a 'queue-add' event; removing records 'queue-remove'", () => {
    window.App.Storage.addToQueue("ETV-0001");
    window.App.Storage.removeFromQueue("ETV-0001");
    const log = window.App.Storage.getActivityLog();
    expect(log.some((e) => e.type === "queue-add" && e.id === "ETV-0001")).toBe(true);
    expect(log.some((e) => e.type === "queue-remove" && e.id === "ETV-0001")).toBe(true);
  });

  it("adding an already-queued resource again does not double-log", () => {
    window.App.Storage.addToQueue("ETV-0001");
    window.App.Storage.addToQueue("ETV-0001"); // already queued, addToQueue is a no-op per existing V4.4 logic
    const log = window.App.Storage.getActivityLog();
    expect(log.filter((e) => e.type === "queue-add" && e.id === "ETV-0001").length).toBe(1);
  });

  it("removing something never queued does not log a spurious removal", () => {
    window.App.Storage.removeFromQueue("ETV-9999");
    const log = window.App.Storage.getActivityLog();
    expect(log.some((e) => e.id === "ETV-9999")).toBe(false);
  });
});

describe("App.Storage — Goal history & consistency (V5.1)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
  });

  it("getGoalHistory returns exactly N days, most recent last, each with met/target/completed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10T10:00:00Z"));
    window.App.Storage.setGoals({ dailyTarget: 1 });
    window.App.Storage.setProgress("ETV-0001", "Completed");

    const history = window.App.Storage.getGoalHistory(5);
    expect(history.length).toBe(5);
    expect(history[history.length - 1].date).toBe("2026-01-10");
    expect(history[history.length - 1].met).toBe(true);
    expect(history[history.length - 1].completed).toBe(1);
    vi.useRealTimers();
  });

  it("getGoalConsistency correctly counts met vs missed days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setGoals({ dailyTarget: 1 });
    window.App.Storage.setProgress("ETV-0001", "Completed"); // Jan 1: met

    vi.setSystemTime(new Date("2026-01-02T10:00:00Z")); // Jan 2: nothing -> missed

    vi.setSystemTime(new Date("2026-01-02T23:00:00Z"));
    const consistency = window.App.Storage.getGoalConsistency(2);
    expect(consistency.totalDays).toBe(2);
    expect(consistency.metDays).toBe(1);
    expect(consistency.pct).toBe(50);
    expect(consistency.missedDays).toContain("2026-01-02");
    vi.useRealTimers();
  });

  it("getWeeklyConsistency buckets completions into 7-day windows against the weekly target", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00Z"));
    window.App.Storage.setGoals({ weeklyTarget: 2 });
    window.App.Storage.setProgress("ETV-0001", "Completed");
    window.App.Storage.setProgress("ETV-0002", "Completed"); // 2 completions this week -> meets target of 2

    const weeks = window.App.Storage.getWeeklyConsistency(1);
    expect(weeks.length).toBe(1);
    expect(weeks[0].completed).toBe(2);
    expect(weeks[0].met).toBe(true);
    vi.useRealTimers();
  });
});
