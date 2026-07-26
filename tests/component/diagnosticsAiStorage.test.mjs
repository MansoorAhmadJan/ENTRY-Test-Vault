// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.Perf — storage breakdown (V5.4)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
  });

  it("getStorageBreakdown reflects real stored data, sorted largest first", () => {
    window.App.Storage.setNote("ETV-0001", "a".repeat(500));
    window.App.Storage.toggleFavorite("ETV-0002");
    const breakdown = window.App.Perf.getStorageBreakdown();
    expect(breakdown.length).toBeGreaterThan(0);
    expect(breakdown[0].bytes).toBeGreaterThanOrEqual(breakdown[breakdown.length - 1].bytes);
    expect(breakdown.some((r) => r.key === "notes")).toBe(true);
  });

  it("getStorageQuotaEstimate never exceeds 100%", () => {
    const q = window.App.Perf.getStorageQuotaEstimate();
    expect(q.pct).toBeLessThanOrEqual(100);
    expect(q.pct).toBeGreaterThanOrEqual(0);
  });

  it("breakdown total roughly matches the existing total estimate (consistency between the two functions)", () => {
    window.App.Storage.setNote("ETV-0001", "consistency check note");
    const breakdown = window.App.Perf.getStorageBreakdown();
    const breakdownTotalKb = +(breakdown.reduce((sum, r) => sum + r.bytes, 0) / 1024).toFixed(2);
    const totalKb = window.App.Perf.estimateLocalStorageUsageKb();
    expect(breakdownTotalKb).toBe(totalKb);
  });
});

describe("App.AI.Service — cache info (V5.4)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
  });

  it("getCacheInfo reports 0 entries before any AI call is made", () => {
    expect(window.App.AI.Service.getCacheInfo()).toEqual({
      totalEntries: 0,
      activeEntries: 0,
      expiredEntries: 0,
    });
  });

  it("getCacheInfo reflects a real cached entry after a successful call", async () => {
    window.App.Storage.setAiSettings({
      enabled: true,
      activeProvider: "ollama",
      cacheEnabled: true,
    });
    window.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ message: { content: "cached" } }),
    });
    await window.App.AI.Service.ask("explain-resource", window.App.Data.getById("ETV-0001"));
    expect(window.App.AI.Service.getCacheInfo().activeEntries).toBe(1);
  });
});

describe("View: Diagnostics — AI & Storage tab (V5.4)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    document.body.innerHTML = '<div id="view-root"></div>';
  });

  it("renders the new tab without throwing, no NaN/undefined leaks", () => {
    const container = document.getElementById("view-root");
    window.App.Views.diagnostics(container);
    const tabBtn = container.querySelector('[data-tab="ai-storage"]');
    expect(tabBtn).not.toBeNull();
    tabBtn.click();
    expect(container.textContent).toContain("AI Provider Status");
    expect(container.textContent).toContain("Storage Usage");
    expect(container.textContent).toContain("Build Information");
    expect(container.innerHTML).not.toMatch(/NaN|undefined/);
  });

  it("AI Modules Loaded status correctly reflects App.AI.isLoaded() (real not-loaded-until-first-use behavior is covered by tests/integration/aiLazyLoad.test.mjs's real-server harness — bootApp.mjs always preloads AI for test convenience, so it can't represent that state here)", () => {
    const container = document.getElementById("view-root");
    window.App.Views.diagnostics(container);
    container.querySelector('[data-tab="ai-storage"]').click();
    expect(window.App.AI.isLoaded()).toBe(true); // true in THIS harness, by bootApp's design
    expect(container.textContent).toContain("AI Modules Loaded");
    expect(container.textContent).toContain("Yes (lazy-loaded on first use)");
  });

  it("shows the dev-mode build placeholder honestly when unbuilt", () => {
    const container = document.getElementById("view-root");
    window.App.Views.diagnostics(container);
    container.querySelector('[data-tab="ai-storage"]').click();
    expect(container.textContent).toContain("development");
  });
});
