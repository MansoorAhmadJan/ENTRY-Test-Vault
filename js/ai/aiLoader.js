/* ============================================================
   AI Loader (V5.3, Objective #8: lazy-load AI modules).

   This is the ONLY AI file in the main bundle — everything else
   under js/ai/ is loaded on demand via ensureLoaded(), the first
   time the person actually opens AI Settings or clicks an AI
   action. Until then, the ~15-20KB of provider/service/prompt code
   is never fetched, parsed, or executed — real cost avoided for the
   majority of users who never turn AI on, not just deferred.

   Uses plain dynamic <script> injection rather than ES module
   dynamic import() — consistent with the rest of the app's
   non-module architecture (see docs/ARCHITECTURE.md), and it works
   identically in dev (raw files) and production (scripts/build.mjs
   copies js/ai/ into dist/js/ai/ WITHOUT concatenating it, so these
   paths resolve the same way in both).
   ============================================================ */
(function (App) {
  "use strict";

  App.AI = App.AI || {};

  const MODULE_FILES = [
    "js/ai/providerInterface.js",
    "js/ai/providers/ollamaProvider.js",
    "js/ai/providers/lmstudioProvider.js",
    "js/ai/providers/openaiProvider.js",
    "js/ai/providers/claudeProvider.js",
    "js/ai/providers/geminiProvider.js",
    "js/ai/promptLibrary.js",
    "js/ai/aiService.js",
    "js/ai/aiFeatures.js",
  ];

  let loadPromise = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-ai-module="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      const el = document.createElement("script");
      el.src = src;
      el.dataset.aiModule = src;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error(`Failed to load AI module: ${src}`));
      document.head.appendChild(el);
    });
  }

  /**
   * Loads every real AI module, in order, exactly once (subsequent calls
   * return the same in-flight/resolved promise). Everything that touches
   * App.AI.Service, App.AI.Features, or App.AI.Providers must await this
   * first — that's the entire lazy-loading contract.
   */
  function ensureLoaded() {
    if (App.AI.Service) return Promise.resolve(); // already loaded
    if (loadPromise) return loadPromise;
    loadPromise = MODULE_FILES.reduce(
      (chain, src) => chain.then(() => loadScript(src)),
      Promise.resolve()
    );
    return loadPromise;
  }

  function isLoaded() {
    return !!App.AI.Service;
  }

  App.AI.ensureLoaded = ensureLoaded;
  App.AI.isLoaded = isLoaded;
})((window.App = window.App || {}));
