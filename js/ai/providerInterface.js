/* ============================================================
   AI Provider Interface (V5.3, Objective #1 + #9: Provider
   Abstraction / Extensibility).

   CONTRACT every provider module must implement, registered onto
   App.AI.Providers[id]:

     id            string   — stable key, e.g. "ollama"
     label         string   — human-readable name for Settings UI
     requiresApiKey boolean — whether an API key field should show
     isLocal       boolean  — true = runs on the user's machine, no
                               data leaves it (drives the privacy
                               labeling in Objective #7)
     defaultEndpoint string — placeholder shown in Settings, NOT a
                               hardcoded assumption the endpoint exists
     defaultModel  string   — placeholder model name, user-editable
     docsUrl       string   — where to learn more / get an API key

     buildRequest(messages, config) -> { url, headers, body }
       PURE. No fetch(), no side effects. `messages` is the
       provider-agnostic array [{role, content}] the AI service
       builds from a prompt template. `config` is this provider's
       slice of AI settings (endpoint, apiKey, model, temperature,
       maxTokens). Returns exactly what aiService.js needs to call
       fetch(url, { headers, body: JSON.stringify(body) }).

     parseResponse(rawJson) -> string
       PURE. Extracts the generated text from a successful response.
       Throws a descriptive Error if the shape is unexpected — the
       service layer catches this and normalizes it, so throwing
       here is the correct/expected way to signal "malformed
       response", not a bug.

     parseError(status, rawJson) -> string
       PURE. Turns a non-2xx response into a human-readable message
       (e.g. "Invalid API key", "Model not found").

   WHY THIS SHAPE: keeping buildRequest/parseResponse pure and
   fetch-free means every provider can be fully unit tested against
   real documented request/response shapes with zero network access
   (see tests/unit/aiProviders.test.mjs) — which is exactly what lets
   this V5.3 layer be "real code, verified" rather than "code that
   looks plausible and has never actually been exercised."
   ============================================================ */
(function (App) {
  "use strict";

  App.AI = App.AI || {};
  App.AI.Providers = {};

  function registerProvider(provider) {
    const required = [
      "id",
      "label",
      "requiresApiKey",
      "isLocal",
      "defaultEndpoint",
      "defaultModel",
      "buildRequest",
      "parseResponse",
      "parseError",
    ];
    const missing = required.filter((k) => provider[k] === undefined);
    if (missing.length) {
      throw new Error(`AI provider "${provider.id || "?"}" is missing: ${missing.join(", ")}`);
    }
    App.AI.Providers[provider.id] = provider;
  }

  function listProviders() {
    return Object.values(App.AI.Providers);
  }

  function getProvider(id) {
    return App.AI.Providers[id] || null;
  }

  App.AI.registerProvider = registerProvider;
  App.AI.listProviders = listProviders;
  App.AI.getProvider = getProvider;
})((window.App = window.App || {}));
