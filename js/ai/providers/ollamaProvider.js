/* ============================================================
   Ollama provider (V5.3). Local-only — matches the real
   /api/chat request/response shape (verified against Ollama's
   current docs, not guessed): POST {endpoint}/api/chat with
   {model, messages, stream:false} -> { message: { content } }.
   ============================================================ */
(function (App) {
  "use strict";

  function buildRequest(messages, config) {
    const endpoint = (config.endpoint || "http://localhost:11434").replace(/\/$/, "");
    return {
      url: `${endpoint}/api/chat`,
      headers: { "Content-Type": "application/json" },
      body: {
        model: config.model || "llama3.1",
        messages,
        stream: false,
        options: {
          temperature: config.temperature ?? 0.7,
        },
      },
    };
  }

  function parseResponse(raw) {
    if (!raw || !raw.message || typeof raw.message.content !== "string") {
      throw new Error("Unexpected Ollama response shape (missing message.content)");
    }
    return raw.message.content;
  }

  function parseError(status, raw) {
    if (raw && raw.error) return String(raw.error);
    if (status === 404) return "Model not found — pull it first with: ollama pull <model>";
    return `Ollama returned HTTP ${status}`;
  }

  App.AI.registerProvider({
    id: "ollama",
    label: "Ollama (local)",
    requiresApiKey: false,
    isLocal: true,
    defaultEndpoint: "http://localhost:11434",
    defaultModel: "llama3.1",
    docsUrl: "https://docs.ollama.com/api",
    buildRequest,
    parseResponse,
    parseError,
  });
})((window.App = window.App || {}));
