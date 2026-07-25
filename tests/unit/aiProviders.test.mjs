// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("AI provider conformance (real documented shapes, no network needed)", () => {
  beforeAll(async () => {
    await bootApp(window);
  });

  it("all 5 providers are registered and implement the full interface", () => {
    const ids = window.App.AI.listProviders().map((p) => p.id);
    expect(ids.sort()).toEqual(["claude", "gemini", "lmstudio", "ollama", "openai"]);
    window.App.AI.listProviders().forEach((p) => {
      expect(typeof p.buildRequest).toBe("function");
      expect(typeof p.parseResponse).toBe("function");
      expect(typeof p.parseError).toBe("function");
      expect(typeof p.label).toBe("string");
    });
  });

  it("registerProvider() rejects an incomplete provider (fail loudly, not silently)", () => {
    expect(() => window.App.AI.registerProvider({ id: "broken" })).toThrow(/missing/);
  });

  describe("Ollama — /api/chat", () => {
    const messages = [{ role: "user", content: "Explain photosynthesis" }];
    it("buildRequest matches Ollama's real /api/chat shape", () => {
      const p = window.App.AI.getProvider("ollama");
      const req = p.buildRequest(messages, {
        endpoint: "http://localhost:11434",
        model: "llama3.1",
      });
      expect(req.url).toBe("http://localhost:11434/api/chat");
      expect(req.body.model).toBe("llama3.1");
      expect(req.body.messages).toEqual(messages);
      expect(req.body.stream).toBe(false); // must be false — this app makes single-shot requests, not streaming
    });
    it("parseResponse extracts text from Ollama's real response shape", () => {
      const p = window.App.AI.getProvider("ollama");
      const real = {
        model: "llama3.1",
        message: { role: "assistant", content: "Photosynthesis is..." },
        done: true,
      };
      expect(p.parseResponse(real)).toBe("Photosynthesis is...");
    });
    it("parseResponse throws on a malformed response instead of returning garbage", () => {
      const p = window.App.AI.getProvider("ollama");
      expect(() => p.parseResponse({ unexpected: "shape" })).toThrow();
    });
  });

  describe("Claude — /v1/messages", () => {
    it("buildRequest matches Anthropic's real Messages API shape (x-api-key, anthropic-version, required max_tokens)", () => {
      const p = window.App.AI.getProvider("claude");
      const req = p.buildRequest(
        [
          { role: "system", content: "Be concise." },
          { role: "user", content: "Hello" },
        ],
        { apiKey: "sk-ant-test", model: "claude-sonnet-4-6" }
      );
      expect(req.headers["x-api-key"]).toBe("sk-ant-test");
      expect(req.headers["anthropic-version"]).toBe("2023-06-01");
      expect(req.body.max_tokens).toBeGreaterThan(0); // Anthropic REQUIRES this field
      expect(req.body.system).toBe("Be concise."); // system is a top-level field, not a message
      expect(req.body.messages).toEqual([{ role: "user", content: "Hello" }]); // system message extracted out
    });
    it("parseResponse extracts text from Claude's real response shape (content[0].text)", () => {
      const p = window.App.AI.getProvider("claude");
      const real = {
        id: "msg_01XFDUDYJgAACzvnptvVoYEL",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: "Hello there!" }],
        model: "claude-sonnet-4-6",
      };
      expect(p.parseResponse(real)).toBe("Hello there!");
    });
  });

  describe("Gemini — generateContent", () => {
    it("buildRequest matches Gemini's real shape (x-goog-api-key header, contents/parts, not messages)", () => {
      const p = window.App.AI.getProvider("gemini");
      const req = p.buildRequest([{ role: "user", content: "Hello" }], {
        apiKey: "AIzaTest",
        model: "gemini-2.5-flash",
      });
      expect(req.url).toContain(":generateContent");
      expect(req.url).toContain("gemini-2.5-flash");
      expect(req.headers["x-goog-api-key"]).toBe("AIzaTest"); // header form, NOT ?key= query param (current guidance)
      expect(req.url).not.toContain("key=AIzaTest");
      expect(req.body.contents[0].parts[0].text).toBe("Hello");
    });
    it("parseResponse extracts text from Gemini's real response shape (candidates[0].content.parts[0].text)", () => {
      const p = window.App.AI.getProvider("gemini");
      const real = {
        candidates: [
          {
            content: { parts: [{ text: "Hi, how can I help?" }], role: "model" },
            finishReason: "STOP",
          },
        ],
      };
      expect(p.parseResponse(real)).toBe("Hi, how can I help?");
    });
  });

  describe("OpenAI / LM Studio — chat/completions (LM Studio is OpenAI-compatible by design)", () => {
    it("OpenAI buildRequest uses Bearer auth and the real chat/completions shape", () => {
      const p = window.App.AI.getProvider("openai");
      const req = p.buildRequest([{ role: "user", content: "Hi" }], { apiKey: "sk-test" });
      expect(req.headers.Authorization).toBe("Bearer sk-test");
      expect(req.url).toContain("/v1/chat/completions");
    });
    it("both parse the same real choices[0].message.content response shape", () => {
      const real = { choices: [{ message: { role: "assistant", content: "Hi there" } }] };
      expect(window.App.AI.getProvider("openai").parseResponse(real)).toBe("Hi there");
      expect(window.App.AI.getProvider("lmstudio").parseResponse(real)).toBe("Hi there");
    });
    it("LM Studio requires no API key by default (local server)", () => {
      const p = window.App.AI.getProvider("lmstudio");
      expect(p.requiresApiKey).toBe(false);
      expect(p.isLocal).toBe(true);
    });
  });

  describe("Error parsing — every provider returns a human-readable message, not raw JSON", () => {
    it("each provider handles a 401/403-style auth failure", () => {
      window.App.AI.listProviders().forEach((p) => {
        if (!p.requiresApiKey) return;
        const msg = p.parseError(401, { error: {} });
        expect(typeof msg).toBe("string");
        expect(msg.length).toBeGreaterThan(0);
      });
    });
    it("each provider handles a completely empty error body without throwing", () => {
      window.App.AI.listProviders().forEach((p) => {
        expect(() => p.parseError(500, null)).not.toThrow();
        expect(() => p.parseError(500, {})).not.toThrow();
      });
    });
  });

  describe("Privacy labeling (Objective #7)", () => {
    it("exactly the 2 local providers are marked isLocal, the 3 cloud providers are not", () => {
      const local = window.App.AI.listProviders()
        .filter((p) => p.isLocal)
        .map((p) => p.id)
        .sort();
      const cloud = window.App.AI.listProviders()
        .filter((p) => !p.isLocal)
        .map((p) => p.id)
        .sort();
      expect(local).toEqual(["lmstudio", "ollama"]);
      expect(cloud).toEqual(["claude", "gemini", "openai"]);
    });
  });
});
