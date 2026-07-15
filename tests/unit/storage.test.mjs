// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
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
