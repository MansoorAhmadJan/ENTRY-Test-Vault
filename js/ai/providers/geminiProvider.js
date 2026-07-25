/* ============================================================
   Gemini provider (V5.3). Cloud — requires an API key. Verified
   against current Google AI docs: x-goog-api-key header (the
   currently-recommended form over the legacy ?key= query param),
   request shape is { contents: [{ parts: [{ text }] }] } — NOT
   the {role, content} shape every other provider here uses, and
   there's no separate "messages" array with roles the same way.
   ============================================================ */
(function (App) {
  "use strict";

  function buildRequest(messages, config) {
    const endpoint = (config.endpoint || "https://generativelanguage.googleapis.com").replace(
      /\/$/,
      ""
    );
    const model = config.model || "gemini-2.5-flash";
    // Gemini has no "system" role in the same sense — fold a system
    // message into the first user turn instead of dropping it silently.
    const systemMsg = messages.find((m) => m.role === "system");
    const turns = messages.filter((m) => m.role !== "system");
    const contents = turns.map((m, i) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [
        {
          text: i === 0 && systemMsg ? `${systemMsg.content}\n\n${m.content}` : m.content,
        },
      ],
    }));

    return {
      url: `${endpoint}/v1beta/models/${model}:generateContent`,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey || "",
      },
      body: {
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens || 1024,
        },
      },
    };
  }

  function parseResponse(raw) {
    const text = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      throw new Error(
        "Unexpected Gemini response shape (missing candidates[0].content.parts[0].text)"
      );
    }
    return text;
  }

  function parseError(status, raw) {
    if (raw?.error?.message) return String(raw.error.message);
    if (status === 401 || status === 403) return "Invalid API key";
    if (status === 429) return "Rate limited — try again in a moment";
    return `Gemini API returned HTTP ${status}`;
  }

  App.AI.registerProvider({
    id: "gemini",
    label: "Gemini (Google)",
    requiresApiKey: true,
    isLocal: false,
    defaultEndpoint: "https://generativelanguage.googleapis.com",
    defaultModel: "gemini-2.5-flash",
    docsUrl: "https://ai.google.dev/api/generate-content",
    buildRequest,
    parseResponse,
    parseError,
  });
})((window.App = window.App || {}));
