// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.Filter (real data, documented facet semantics)", () => {
  let resources;

  beforeAll(async () => {
    await bootApp(window);
    window.App.Data.init();
    resources = window.App.Data.getAll();
  });

  it("emptyState() has no active filters", () => {
    const state = window.App.Filter.emptyState();
    expect(window.App.Filter.isEmpty(state)).toBe(true);
    expect(window.App.Filter.activeCount(state)).toBe(0);
  });

  it("apply() with an empty state returns every resource unchanged", () => {
    const state = window.App.Filter.emptyState();
    const filtered = window.App.Filter.apply(resources, state);
    expect(filtered.length).toBe(resources.length);
  });

  it("toggle() adds a value, and toggling it again removes it", () => {
    let state = window.App.Filter.emptyState();
    state = window.App.Filter.toggle(state, "university", "GIKI");
    expect(state.university.has("GIKI")).toBe(true);
    expect(window.App.Filter.isEmpty(state)).toBe(false);

    state = window.App.Filter.toggle(state, "university", "GIKI");
    expect(state.university.has("GIKI")).toBe(false);
    expect(window.App.Filter.isEmpty(state)).toBe(true);
  });

  it("single-facet filter (university=GIKI) returns only GIKI resources, and at least one", () => {
    let state = window.App.Filter.emptyState();
    state = window.App.Filter.toggle(state, "university", "GIKI");
    const filtered = window.App.Filter.apply(resources, state);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((r) => r.university === "GIKI")).toBe(true);
  });

  it("OR within a facet: university=GIKI OR NUST returns the union, not the intersection", () => {
    let state = window.App.Filter.emptyState();
    state = window.App.Filter.toggle(state, "university", "GIKI");
    state = window.App.Filter.toggle(state, "university", "NUST");
    const filtered = window.App.Filter.apply(resources, state);

    const gikiOnly = window.App.Filter.apply(
      resources,
      window.App.Filter.toggle(window.App.Filter.emptyState(), "university", "GIKI")
    );
    const nustOnly = window.App.Filter.apply(
      resources,
      window.App.Filter.toggle(window.App.Filter.emptyState(), "university", "NUST")
    );

    expect(filtered.length).toBe(gikiOnly.length + nustOnly.length);
    expect(filtered.every((r) => r.university === "GIKI" || r.university === "NUST")).toBe(true);
  });

  it("AND across facets: university=GIKI AND difficulty=Intermediate narrows results (subset of GIKI-only)", () => {
    let state = window.App.Filter.emptyState();
    state = window.App.Filter.toggle(state, "university", "GIKI");
    state = window.App.Filter.toggle(state, "difficulty", "Intermediate");
    const filtered = window.App.Filter.apply(resources, state);

    const gikiOnly = window.App.Filter.apply(
      resources,
      window.App.Filter.toggle(window.App.Filter.emptyState(), "university", "GIKI")
    );

    expect(filtered.length).toBeLessThanOrEqual(gikiOnly.length);
    expect(filtered.every((r) => r.university === "GIKI" && r.difficulty === "Intermediate")).toBe(
      true
    );
  });

  it("clear() empties exactly one facet, leaving others intact", () => {
    let state = window.App.Filter.emptyState();
    state = window.App.Filter.toggle(state, "university", "GIKI");
    state = window.App.Filter.toggle(state, "difficulty", "Intermediate");
    state = window.App.Filter.clear(state, "university");
    expect(state.university.size).toBe(0);
    expect(state.difficulty.has("Intermediate")).toBe(true);
  });

  it("serialize() then deserialize() round-trips to an equivalent state", () => {
    let state = window.App.Filter.emptyState();
    state = window.App.Filter.toggle(state, "university", "GIKI");
    state = window.App.Filter.toggle(state, "difficulty", "Intermediate");

    const serialized = window.App.Filter.serialize(state);
    const restored = window.App.Filter.deserialize(JSON.parse(JSON.stringify(serialized)));

    expect(restored.university.has("GIKI")).toBe(true);
    expect(restored.difficulty.has("Intermediate")).toBe(true);
    expect(window.App.Filter.activeCount(restored)).toBe(window.App.Filter.activeCount(state));
  });

  it("a filter combination matching nothing returns an empty array, not an error", () => {
    let state = window.App.Filter.emptyState();
    state = window.App.Filter.toggle(state, "university", "GIKI");
    state = window.App.Filter.toggle(state, "language", "NoSuchLanguage");
    expect(() => window.App.Filter.apply(resources, state)).not.toThrow();
    expect(window.App.Filter.apply(resources, state)).toEqual([]);
  });
});
