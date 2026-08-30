/* ============================================================
   LM Studio provider (V5.3). Local-only — LM Studio deliberately
   exposes an OpenAI-compatible /v1/chat/completions endpoint, so
   this shares the same request/response shape as the OpenAI
   provider by design (that's LM Studio's own compatibility
   contract, not a coincidence this file relies on informally).
   ============================================================ */
(function (App) {
  "use strict";

  function buildRequest(messages, config) {
    const endpoint = (config.endpoint || "http://localhost:1234").replace(/\/$/, "");
    return {
      url: `${endpoint}/v1/chat/completions`,
      headers: { "Content-Type": "application/json" },
      body: {
        model: config.model || "local-model",
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens || 1024,
      },
    };
  }

  function parseResponse(raw) {
    const text = raw?.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new Error("Unexpected LM Studio response shape (missing choices[0].message.content)");
    }
    return text;
  }

  function parseError(status, raw) {
    if (raw?.error?.message) return String(raw.error.message);
    if (status === 0) return "Could not reach LM Studio — is the local server running?";
    return `LM Studio returned HTTP ${status}`;
  }

  App.AI.registerProvider({
    id: "lmstudio",
    label: "LM Studio (local)",
    requiresApiKey: false,
    isLocal: true,
    defaultEndpoint: "http://localhost:1234",
    defaultModel: "local-model",
    docsUrl: "https://lmstudio.ai/docs/app/api",
    buildRequest,
    parseResponse,
    parseError,
  });
})((window.App = window.App || {}));
