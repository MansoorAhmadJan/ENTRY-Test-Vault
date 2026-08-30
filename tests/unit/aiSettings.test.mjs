// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.Storage — AI settings & API keys (V5.3)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
  });

  it("getAiSettings returns safe defaults: disabled, local provider", () => {
    const s = window.App.Storage.getAiSettings();
    expect(s.enabled).toBe(false);
    expect(s.activeProvider).toBe("ollama");
  });

  it("setAiSettings merges partial updates without clobbering other fields", () => {
    window.App.Storage.setAiSettings({ enabled: true });
    window.App.Storage.setAiSettings({ activeProvider: "openai" });
    const s = window.App.Storage.getAiSettings();
    expect(s.enabled).toBe(true);
    expect(s.activeProvider).toBe("openai");
  });

  it("API key round-trips via setAiApiKey/getAiApiKey, per provider", () => {
    window.App.Storage.setAiApiKey("openai", "sk-abc");
    window.App.Storage.setAiApiKey("claude", "sk-ant-xyz");
    expect(window.App.Storage.getAiApiKey("openai")).toBe("sk-abc");
    expect(window.App.Storage.getAiApiKey("claude")).toBe("sk-ant-xyz");
    expect(window.App.Storage.getAiApiKey("gemini")).toBe(""); // never set
  });

  it("setAiApiKey with an empty value clears that provider's key", () => {
    window.App.Storage.setAiApiKey("openai", "sk-abc");
    window.App.Storage.setAiApiKey("openai", "");
    expect(window.App.Storage.getAiApiKey("openai")).toBe("");
  });

  it("clearAiApiKeys wipes every stored key at once", () => {
    window.App.Storage.setAiApiKey("openai", "sk-abc");
    window.App.Storage.setAiApiKey("claude", "sk-xyz");
    window.App.Storage.clearAiApiKeys();
    expect(window.App.Storage.getAiApiKey("openai")).toBe("");
    expect(window.App.Storage.getAiApiKey("claude")).toBe("");
  });

  describe("CRITICAL: exportAll() must never leak API keys", () => {
    it("a real API key set in storage does not appear anywhere in the export payload", () => {
      const secretKey = "sk-live-THIS-MUST-NEVER-BE-EXPORTED-abc123xyz";
      window.App.Storage.setAiApiKey("openai", secretKey);
      window.App.Storage.setAiSettings({ enabled: true });

      const exported = window.App.Storage.exportAll();
      const serialized = JSON.stringify(exported);

      expect(serialized).not.toContain(secretKey);
      expect(exported.aiApiKeys).toBeUndefined();
    });

    it("the export payload documents the exclusion explicitly, not silently", () => {
      const exported = window.App.Storage.exportAll();
      expect(exported._excludedForPrivacy).toContain("aiApiKeys");
    });

    it("non-sensitive AI settings (enabled/provider/model) DO still export normally", () => {
      window.App.Storage.setAiSettings({
        enabled: true,
        activeProvider: "claude",
        model: "claude-sonnet-4-6",
      });
      const exported = window.App.Storage.exportAll();
      expect(exported.aiSettings.enabled).toBe(true);
      expect(exported.aiSettings.activeProvider).toBe("claude");
    });

    it("importAll() does not throw when a payload has no aiApiKeys field (the normal case)", () => {
      const exported = window.App.Storage.exportAll();
      window.App.Storage.clearAll();
      expect(() => window.App.Storage.importAll(exported)).not.toThrow();
      expect(window.App.Storage.getAiApiKey("openai")).toBe(""); // correctly not restored — it was never exported
    });
  });
});
