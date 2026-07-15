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
