/* ============================================================
   Claude (Anthropic) provider (V5.3). Cloud — requires an API
   key. Messages API shape, verified against current Anthropic
   docs: x-api-key + anthropic-version headers, max_tokens is
   REQUIRED (not optional, unlike OpenAI's max_tokens), response
   text lives at content[0].text, not choices[0].message.content.
   ============================================================ */
(function (App) {
  "use strict";

  const ANTHROPIC_VERSION = "2023-06-01";

  function buildRequest(messages, config) {
    const endpoint = (config.endpoint || "https://api.anthropic.com").replace(/\/$/, "");
    // Anthropic keeps system prompts as a separate top-level field, not a
    // "system" role message like OpenAI/Ollama — split it out here so
    // aiService.js can build messages the same provider-agnostic way for
    // every provider and let each adapter handle its own quirks.
    const systemMsg = messages.find((m) => m.role === "system");
    const turnMessages = messages.filter((m) => m.role !== "system");
    return {
      url: `${endpoint}/v1/messages`,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey || "",
        "anthropic-version": ANTHROPIC_VERSION,
      },
      body: {
        model: config.model || "claude-sonnet-4-6",
        max_tokens: config.maxTokens || 1024,
        messages: turnMessages,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        temperature: config.temperature ?? 0.7,
      },
    };
  }

  function parseResponse(raw) {
    const text = raw?.content?.[0]?.text;
    if (typeof text !== "string") {
      throw new Error("Unexpected Claude response shape (missing content[0].text)");
    }
    return text;
  }

  function parseError(status, raw) {
    if (raw?.error?.message) return String(raw.error.message);
    if (status === 401) return "Invalid API key";
    if (status === 429) return "Rate limited — try again in a moment";
    return `Claude API returned HTTP ${status}`;
  }

  App.AI.registerProvider({
    id: "claude",
    label: "Claude (Anthropic)",
    requiresApiKey: true,
    isLocal: false,
    defaultEndpoint: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-4-6",
    docsUrl: "https://docs.anthropic.com/en/api/messages",
    buildRequest,
    parseResponse,
    parseError,
  });
})((window.App = window.App || {}));
