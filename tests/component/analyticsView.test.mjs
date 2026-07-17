// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("View: Learning Analytics (App.Views.analytics)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    window.App.Search.build();
    document.body.innerHTML = '<div id="view-root"></div>';
  });

  it("renders without throwing for a fresh user with zero data", () => {
    const container = document.getElementById("view-root");
    expect(() => window.App.Views.analytics(container)).not.toThrow();
    expect(container.textContent).toContain("Learning Analytics");
    expect(container.innerHTML).not.toContain("NaN");
  });

  it("renders without throwing once real progress/notes/queue data exists", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    window.App.Storage.setNote("ETV-0002", "a note");
    window.App.Storage.addToQueue("ETV-0003");
    const container = document.getElementById("view-root");
    expect(() => window.App.Views.analytics(container)).not.toThrow();
    expect(container.innerHTML).not.toContain("NaN");
    expect(container.innerHTML).not.toContain("undefined");
  });

  it("the export button produces a valid, non-throwing summary via App.Analytics directly", () => {
    // (Blob/URL download itself isn't meaningfully testable in jsdom —
    // this checks the data behind the button, which IS the real risk.)
    expect(() => window.App.Analytics.exportAnalyticsSummary()).not.toThrow();
  });

  it("clicking a resource row opens the resource modal", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    const container = document.getElementById("view-root");
    document.body.appendChild(container);
    window.App.Views.analytics(container);
    const row = container.querySelector("[data-open]");
    expect(row).not.toBeNull();
    row.click();
    expect(document.querySelector(".resource-modal, [role='dialog']")).not.toBeNull();
  });
});

describe("Performance: App.Analytics at scale (Objective #11)", () => {
  it("stays fast (<500ms) for a synthetic 50,000-resource dataset, not just the real 102", () => {
    // Build a synthetic VAULT_DATA 500x larger than reality to verify the
    // O(n) design claim in analyticsEngine.js's header comment actually
    // holds, rather than asserting it untested.
    const real = window.VAULT_DATA;
    const synthResources = [];
    for (let i = 0; i < 50000; i++) {
      const base = real.resources[i % real.resources.length];
      synthResources.push({ ...base, id: `SYN-${i}` });
    }
    const original = window.VAULT_DATA;
    window.VAULT_DATA = { ...real, resources: synthResources };
    window.App.Data.reload(window.VAULT_DATA);

    // Simulate a realistic amount of user progress at that scale.
    for (let i = 0; i < 2000; i++) {
      window.App.Storage.setProgress(`SYN-${i}`, i % 3 === 0 ? "Completed" : "In Progress");
    }

    const t0 = performance.now();
    const dashboard = window.App.Analytics.getLearningDashboard();
    const insights = window.App.Analytics.getResourceInsights(10);
    const revision = window.App.Analytics.getRevisionTracking();
    const t1 = performance.now();

    expect(dashboard.overall.total).toBe(50000);
    expect(insights).toBeTruthy();
    expect(revision).toBeTruthy();
    expect(t1 - t0).toBeLessThan(500);

    window.VAULT_DATA = original;
    window.App.Data.reload(original);
  });
});
