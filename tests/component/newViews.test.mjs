// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("View: Study Goals (App.Views.goals)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    document.body.innerHTML = '<div id="view-root"></div>';
  });

  it("renders without throwing and shows the streak/daily/weekly stat cards", () => {
    const container = document.getElementById("view-root");
    expect(() => window.App.Views.goals(container)).not.toThrow();
    expect(container.textContent).toContain("Day Streak");
    expect(container.textContent).toContain("Completed Today");
    expect(container.textContent).toContain("Completed This Week");
  });

  it("editing the daily target input persists via App.Storage.setGoals", () => {
    const container = document.getElementById("view-root");
    window.App.Views.goals(container);
    const input = container.querySelector('[data-goal-target="dailyTarget"]');
    input.value = "7";
    input.dispatchEvent(new window.Event("blur"));
    expect(window.App.Storage.getGoals().dailyTarget).toBe(7);
  });

  it("an invalid target value (0, negative, non-numeric) is rejected and reverts", () => {
    const container = document.getElementById("view-root");
    window.App.Views.goals(container);
    const before = window.App.Storage.getGoals().dailyTarget;
    const input = container.querySelector('[data-goal-target="dailyTarget"]');
    input.value = "-5";
    input.dispatchEvent(new window.Event("blur"));
    expect(window.App.Storage.getGoals().dailyTarget).toBe(before);
  });

  it("reflects real completions from App.Storage.setProgress", () => {
    window.App.Storage.setProgress("ETV-0001", "Completed");
    const container = document.getElementById("view-root");
    window.App.Views.goals(container);
    expect(container.textContent).toMatch(/1 of \d+ resources/);
  });
});

describe("View: My Notes (App.Views.notes)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    document.body.innerHTML = '<div id="view-root"></div>';
  });

  it("shows an empty state when there are no notes", () => {
    const container = document.getElementById("view-root");
    window.App.Views.notes(container);
    expect(container.textContent).toContain("No notes yet");
  });

  it("lists a resource that has a real saved note", () => {
    window.App.Storage.setNote("ETV-0001", "Redo this before the mock test");
    const container = document.getElementById("view-root");
    window.App.Views.notes(container);
    const resource = window.App.Data.getById("ETV-0001");
    expect(container.textContent).toContain(resource.title);
    expect(container.textContent).toContain("Redo this before the mock test");
  });

  it("does not list a resource whose note was cleared", () => {
    window.App.Storage.setNote("ETV-0001", "temp note");
    window.App.Storage.setNote("ETV-0001", ""); // storageService deletes empty notes
    const container = document.getElementById("view-root");
    window.App.Views.notes(container);
    expect(container.textContent).toContain("No notes yet");
  });

  it("escapes note text (XSS defense) since notes are free-form user input", () => {
    window.App.Storage.setNote("ETV-0001", '<img src=x onerror="window.__xss=true">');
    const container = document.getElementById("view-root");
    window.App.Views.notes(container);
    expect(container.querySelector("img")).toBeNull();
    expect(window.__xss).toBeUndefined();
  });
});
