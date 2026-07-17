// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.Search (real index, real vault data)", () => {
  beforeAll(async () => {
    await bootApp(window);
    window.App.Data.init();
    window.App.Search.build();
  });

  it("indexes every resource in vault-data.js", () => {
    const health = window.App.Search.getIndexHealth();
    expect(health.resourceCount).toBe(window.VAULT_DATA.resources.length);
    expect(health.uniqueTokens).toBeGreaterThan(0);
  });

  it("finds a known resource by an exact title token", () => {
    const results = window.App.Search.search("GIKI", 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === "ETV-0001")).toBe(true);
  });

  it("is case-insensitive", () => {
    const lower = window.App.Search.search("giki", 10).map((r) => r.id);
    const upper = window.App.Search.search("GIKI", 10).map((r) => r.id);
    expect(lower.sort()).toEqual(upper.sort());
  });

  it("returns no results for a query matching nothing in the vault", () => {
    const results = window.App.Search.search("zzzznonexistentqueryxyz123", 10);
    expect(results).toEqual([]);
  });

  it("respects the result limit", () => {
    // "past" appears across many resources (Past Papers is a common category)
    const limited = window.App.Search.search("past", 3);
    expect(limited.length).toBeLessThanOrEqual(3);
  });

  it("empty query does not throw and returns an array", () => {
    expect(() => window.App.Search.search("", 10)).not.toThrow();
    expect(Array.isArray(window.App.Search.search("", 10))).toBe(true);
  });

  it("highlight() wraps the matched term without altering unmatched text", () => {
    const html = window.App.Search.highlight("GIKI Past Papers", "giki");
    expect(html).toContain("Past Papers");
    expect(html.toLowerCase()).toContain("giki");
    expect(html).not.toBe("GIKI Past Papers"); // something was added (a highlight wrapper)
  });

  it("getSuggestions returns tokens that actually start with the prefix", () => {
    const suggestions = window.App.Search.getSuggestions("gi", 5);
    suggestions.forEach((s) => {
      const text = typeof s === "string" ? s : s.term || s.value || "";
      expect(text.toLowerCase().startsWith("gi")).toBe(true);
    });
  });
});

describe("App.Search — Search 2.0: multi-token alias resolution", () => {
  beforeAll(async () => {
    await bootApp(window);
    window.App.Data.init();
    window.App.Search.build();
  });

  it("resolves a known alias embedded in a longer query, not just as the whole query", () => {
    // "mechanics" is a real curated alias -> "physics" (data/vault-data.json).
    // V4.4 behavior only resolved aliases when they were the ENTIRE query;
    // this checks the V5.0 fix: the alias should also resolve when it's
    // just one word inside a longer search.
    const wholeQuery = window.App.Search.search("mechanics", 20);
    const embedded = window.App.Search.search("mechanics past papers", 20);
    expect(wholeQuery.length).toBeGreaterThan(0);
    expect(embedded.length).toBeGreaterThan(0);
    // Both should surface Physics-subject resources via the alias.
    expect(embedded.some((r) => r.subject === "Physics")).toBe(true);
  });

  it("resolves a two-word alias phrase (bigram) embedded in a query", () => {
    // "full length paper" -> "mock test" is a real curated alias.
    const results = window.App.Search.search("full length paper 2024", 20);
    expect(results.length).toBeGreaterThan(0);
  });
});

describe("App.Search — Search 2.0: topic-aware boosting", () => {
  beforeAll(async () => {
    await bootApp(window);
    window.App.Data.init();
    window.App.Search.build();
  });

  it("getTopicMatch identifies a real subject name", () => {
    const topic = window.App.Search.getTopicMatch("physics");
    expect(topic).toEqual({ type: "subject", value: "Physics", label: "Physics" });
  });

  it("getTopicMatch identifies a university by key or label", () => {
    expect(window.App.Search.getTopicMatch("giki")).toMatchObject({
      type: "university",
      value: "GIKI",
    });
  });

  it("getTopicMatch resolves through an alias (mechanics -> physics subject)", () => {
    const topic = window.App.Search.getTopicMatch("mechanics");
    expect(topic).toMatchObject({ type: "subject", value: "Physics" });
  });

  it("getTopicMatch returns null for a query naming no real facet", () => {
    expect(window.App.Search.getTopicMatch("zzzznonexistentxyz")).toBeNull();
  });

  it("a topic-matched query returns every resource on that subject, including ones with no literal text overlap", () => {
    const physicsResources = window.App.Data.getAll().filter((r) => r.subject === "Physics");
    const results = window.App.Search.search("mechanics", 100);
    const resultIds = new Set(results.map((r) => r.id));
    // Every real Physics resource should be present via the topic boost,
    // even ones whose title/description never says "physics" or "mechanics".
    physicsResources.forEach((r) => {
      expect(resultIds.has(r.id)).toBe(true);
    });
  });
});
