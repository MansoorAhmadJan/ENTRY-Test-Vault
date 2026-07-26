/* ============================================================
   AI Service Layer (V5.3, Objective #2). Centralizes everything
   that ISN'T provider-specific: which provider is active, actually
   calling fetch(), timeouts, a simple client-side rate-limit guard,
   an optional in-memory response cache, and turning every possible
   failure mode into one normalized shape: { ok, text, error, meta }.

   Deliberately the ONLY module that calls fetch() for AI requests —
   see js/ai/providerInterface.js's header comment for why keeping
   providers fetch-free (pure buildRequest/parseResponse) is the
   actual design decision that makes this swappable/testable.
   ============================================================ */
(function (App) {
  "use strict";

  const DEFAULT_TIMEOUT_MS = 30000;
  const MIN_INTERVAL_MS = 2000; // simple client-side rate-limit guard, not a token bucket — see docs/AI_INTEGRATION.md for why this is intentionally minimal
  const CACHE_TTL_MS = 10 * 60 * 1000;

  let lastCallAt = 0;
  const cache = new Map(); // key -> { text, expiresAt }

  function cacheKey(templateId, templateVersion, provider, model, promptText) {
    // Cheap, good-enough hash — this is a client-side response cache with
    // a 10-minute TTL, not a security boundary, so collision resistance
    // requirements are low. A real hash function would be overkill here.
    let h = 0;
    const s = `${templateId}:${templateVersion}:${provider}:${model}:${promptText}`;
    for (let i = 0; i < s.length; i++) {
      h = (h * 31 + s.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  function getConfig() {
    return App.Storage.getAiSettings();
  }

  function getActiveProvider() {
    const settings = getConfig();
    return App.AI.getProvider(settings.activeProvider);
  }

  function isConfigured() {
    const settings = getConfig();
    if (!settings.enabled) return false;
    const provider = App.AI.getProvider(settings.activeProvider);
    if (!provider) return false;
    if (provider.requiresApiKey && !App.Storage.getAiApiKey(provider.id)) return false;
    return true;
  }

  function getStatus() {
    const settings = getConfig();
    const provider = App.AI.getProvider(settings.activeProvider);
    return {
      enabled: settings.enabled,
      providerId: settings.activeProvider,
      providerLabel: provider ? provider.label : null,
      isLocal: provider ? provider.isLocal : null,
      configured: isConfigured(),
    };
  }

  async function callProvider(provider, messages, providerConfig, timeoutMs) {
    const { url, headers, body } = provider.buildRequest(messages, providerConfig);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      let json = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok) {
        return { ok: false, error: provider.parseError(res.status, json) };
      }
      try {
        const text = provider.parseResponse(json);
        return { ok: true, text };
      } catch (parseErr) {
        return {
          ok: false,
          error: `Received an unexpected response from ${provider.label}: ${parseErr.message}`,
        };
      }
    } catch (err) {
      if (err.name === "AbortError") {
        return {
          ok: false,
          error: `Request to ${provider.label} timed out after ${timeoutMs / 1000}s`,
        };
      }
      // A real network failure (connection refused, DNS, CORS) surfaces as
      // a generic TypeError in fetch — this is THE common case for local
      // providers when Ollama/LM Studio simply isn't running, so the
      // message is written for that reader, not a generic "network error".
      return {
        ok: false,
        error: provider.isLocal
          ? `Could not reach ${provider.label} — is it running at the configured endpoint?`
          : `Could not reach ${provider.label} — check your connection and endpoint.`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * The main entry point every AI feature calls. templateId + args go
   * straight to App.AI.PromptLibrary; this function handles everything
   * about actually getting an answer (or a clear reason it couldn't).
   */
  async function ask(templateId, ...args) {
    if (!isConfigured()) {
      return { ok: false, error: "AI is disabled or not fully configured — check AI Settings." };
    }
    const settings = getConfig();
    const provider = getActiveProvider();
    const providerConfig = {
      endpoint: settings.endpoint || provider.defaultEndpoint,
      model: settings.model || provider.defaultModel,
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      apiKey: App.Storage.getAiApiKey(provider.id),
    };

    const prompt = App.AI.PromptLibrary.build(templateId, ...args);
    const messages = [
      { role: "system", content: prompt.systemPrompt },
      { role: "user", content: prompt.userPrompt },
    ];

    if (settings.cacheEnabled) {
      const key = cacheKey(
        prompt.templateId,
        prompt.templateVersion,
        provider.id,
        providerConfig.model,
        prompt.userPrompt
      );
      const hit = cache.get(key);
      if (hit && hit.expiresAt > Date.now()) {
        return { ok: true, text: hit.text, meta: { cached: true } };
      }
    }

    const now = Date.now();
    if (now - lastCallAt < MIN_INTERVAL_MS) {
      return {
        ok: false,
        error: `Please wait a moment before making another AI request (${Math.ceil((MIN_INTERVAL_MS - (now - lastCallAt)) / 1000)}s).`,
      };
    }
    lastCallAt = now;

    const result = await callProvider(provider, messages, providerConfig, DEFAULT_TIMEOUT_MS);

    if (result.ok && settings.cacheEnabled) {
      const key = cacheKey(
        prompt.templateId,
        prompt.templateVersion,
        provider.id,
        providerConfig.model,
        prompt.userPrompt
      );
      cache.set(key, { text: result.text, expiresAt: Date.now() + CACHE_TTL_MS });
    }

    return { ...result, meta: { ...(result.meta || {}), cached: false, provider: provider.id } };
  }

  function clearCache() {
    cache.clear();
  }

  function getCacheInfo() {
    const now = Date.now();
    let active = 0;
    let expired = 0;
    cache.forEach((entry) => {
      if (entry.expiresAt > now) active++;
      else expired++;
    });
    return { totalEntries: cache.size, activeEntries: active, expiredEntries: expired };
  }

  async function testConnection(providerId, testConfig) {
    const provider = App.AI.getProvider(providerId);
    if (!provider) return { ok: false, error: "Unknown provider" };
    const messages = [{ role: "user", content: 'Reply with exactly one word: "ok".' }];
    return callProvider(provider, messages, testConfig, 8000); // short timeout for a connection check
  }

  App.AI.Service = { ask, isConfigured, getStatus, clearCache, getCacheInfo, testConnection };
})((window.App = window.App || {}));
