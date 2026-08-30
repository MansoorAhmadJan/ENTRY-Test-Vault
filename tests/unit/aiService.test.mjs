// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.AI.Service — orchestration (mocked fetch, no real network)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    window.App.AI.Service.clearCache();
    vi.useRealTimers();
  });

  it("isConfigured() is false when AI is disabled (the default)", () => {
    expect(window.App.AI.Service.isConfigured()).toBe(false);
  });

  it("isConfigured() is false when enabled but a required API key is missing", () => {
    window.App.Storage.setAiSettings({ enabled: true, activeProvider: "openai" });
    expect(window.App.AI.Service.isConfigured()).toBe(false);
  });

  it("isConfigured() is true for a local provider with no key needed, once enabled", () => {
    window.App.Storage.setAiSettings({ enabled: true, activeProvider: "ollama" });
    expect(window.App.AI.Service.isConfigured()).toBe(true);
  });

  it("isConfigured() is true for a cloud provider once its key is set", () => {
    window.App.Storage.setAiSettings({ enabled: true, activeProvider: "openai" });
    window.App.Storage.setAiApiKey("openai", "sk-test");
    expect(window.App.AI.Service.isConfigured()).toBe(true);
  });

  it("ask() refuses cleanly when AI is disabled, without attempting a network call", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");
    const result = await window.App.AI.Service.ask(
      "explain-resource",
      window.App.Data.getById("ETV-0001")
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/disabled|not.*configured/i);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("ask() makes a real-shaped request and normalizes a successful response", async () => {
    window.App.Storage.setAiSettings({
      enabled: true,
      activeProvider: "ollama",
      cacheEnabled: false,
    });
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: { content: "This resource covers past papers." } }),
    });

    const result = await window.App.AI.Service.ask(
      "explain-resource",
      window.App.Data.getById("ETV-0001")
    );
    expect(result.ok).toBe(true);
    expect(result.text).toBe("This resource covers past papers.");
    expect(window.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = window.fetch.mock.calls[0];
    expect(url).toContain("/api/chat");
    const body = JSON.parse(options.body);
    expect(body.messages.some((m) => m.role === "user")).toBe(true);
  });

  it("ask() normalizes a real connection-refused failure into a clear, provider-specific message", async () => {
    window.App.Storage.setAiSettings({
      enabled: true,
      activeProvider: "ollama",
      cacheEnabled: false,
    });
    // This is exactly what a real fetch() throws when nothing is
    // listening on the target port — the single most common real-world
    // case for local providers (Objective #8: graceful degradation).
    window.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await window.App.AI.Service.ask(
      "explain-resource",
      window.App.Data.getById("ETV-0001")
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ollama/i);
    expect(result.error).toMatch(/running/i);
  });

  it("ask() normalizes a non-2xx response via the provider's own parseError", async () => {
    window.App.Storage.setAiSettings({
      enabled: true,
      activeProvider: "openai",
      cacheEnabled: false,
    });
    window.App.Storage.setAiApiKey("openai", "sk-bad-key");
    window.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: "Incorrect API key provided" } }),
    });

    const result = await window.App.AI.Service.ask(
      "explain-resource",
      window.App.Data.getById("ETV-0001")
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("Incorrect API key provided");
  });

  it("ask() surfaces a malformed response as an error, not a crash or silent garbage", async () => {
    window.App.Storage.setAiSettings({
      enabled: true,
      activeProvider: "ollama",
      cacheEnabled: false,
    });
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ totally: "wrong shape" }),
    });

    const result = await window.App.AI.Service.ask(
      "explain-resource",
      window.App.Data.getById("ETV-0001")
    );
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/unexpected response/i);
  });

  it("rate-limit guard blocks a second call made too soon after the first", async () => {
    window.App.Storage.setAiSettings({
      enabled: true,
      activeProvider: "ollama",
      cacheEnabled: false,
    });
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: { content: "ok" } }),
    });

    const first = await window.App.AI.Service.ask(
      "explain-resource",
      window.App.Data.getById("ETV-0001")
    );
    const second = await window.App.AI.Service.ask(
      "explain-resource",
      window.App.Data.getById("ETV-0002")
    );
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.error).toMatch(/wait/i);
    expect(window.fetch).toHaveBeenCalledTimes(1); // the second call never even reached the network
  });

  it("cache returns a cached answer for the same question without calling fetch again", async () => {
    window.App.Storage.setAiSettings({
      enabled: true,
      activeProvider: "ollama",
      cacheEnabled: true,
    });
    window.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: { content: "cached answer" } }),
    });

    const resource = window.App.Data.getById("ETV-0001");
    const first = await window.App.AI.Service.ask("explain-resource", resource);
    expect(first.ok).toBe(true);
    expect(window.fetch).toHaveBeenCalledTimes(1);

    // Second identical call should hit the cache, not fetch again — even
    // though the rate-limit guard would otherwise block it, proving the
    // cache check happens BEFORE the rate-limit check, not after.
    const second = await window.App.AI.Service.ask("explain-resource", resource);
    expect(second.ok).toBe(true);
    expect(second.text).toBe("cached answer");
    expect(second.meta.cached).toBe(true);
    expect(window.fetch).toHaveBeenCalledTimes(1); // still 1 — cache hit, no new network call
  });

  it("getStatus() reflects real configured/enabled/provider state", () => {
    window.App.Storage.setAiSettings({ enabled: true, activeProvider: "claude" });
    window.App.Storage.setAiApiKey("claude", "sk-ant-test");
    const status = window.App.AI.Service.getStatus();
    expect(status).toEqual({
      enabled: true,
      providerId: "claude",
      providerLabel: "Claude (Anthropic)",
      isLocal: false,
      configured: true,
    });
  });
});
