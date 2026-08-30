/* ============================================================
   OpenAI provider (V5.3). Cloud — requires an API key. Standard
   /v1/chat/completions shape.
   ============================================================ */
(function (App) {
  "use strict";

  function buildRequest(messages, config) {
    const endpoint = (config.endpoint || "https://api.openai.com").replace(/\/$/, "");
    return {
      url: `${endpoint}/v1/chat/completions`,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey || ""}`,
      },
      body: {
        model: config.model || "gpt-4o-mini",
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens || 1024,
      },
    };
  }

  function parseResponse(raw) {
    const text = raw?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new Error("Unexpected OpenAI response shape (missing choices[0].message.content)");
    }
    return text;
  }

  function parseError(status, raw) {
    if (raw?.error?.message) return String(raw.error.message);
    if (status === 401) return "Invalid API key";
    if (status === 429) return "Rate limited — try again in a moment";
    return `OpenAI returned HTTP ${status}`;
  }

  App.AI.registerProvider({
    id: "openai",
    label: "OpenAI",
    requiresApiKey: true,
    isLocal: false,
    defaultEndpoint: "https://api.openai.com",
    defaultModel: "gpt-4o-mini",
    docsUrl: "https://platform.openai.com/docs/api-reference/chat",
    buildRequest,
    parseResponse,
    parseError,
  });
})((window.App = window.App || {}));
