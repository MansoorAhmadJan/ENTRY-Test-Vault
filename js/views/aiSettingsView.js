/* ============================================================
   AI Settings view (V5.3, Objective #6 + #7). All config lives in
   App.Storage's aiSettings/aiApiKeys — this view is presentation +
   a "Test Connection" action, no business logic of its own.
   ============================================================ */
(function (App) {
  "use strict";

  function providerCard(provider, settings, isActive) {
    const privacyBadge = provider.isLocal
      ? `<span class="badge csp-7c37e8">Local — nothing leaves your device</span>`
      : `<span class="badge badge-outline">Cloud — sends data to ${App.Utils.escapeHtml(provider.label)}'s servers</span>`;
    return `
      <label class="card provider-card ${isActive ? "provider-active" : ""}">
        <div class="csp-8966bf">
          <input type="radio" name="ai-provider" value="${provider.id}" ${isActive ? "checked" : ""} data-provider-radio />
          <div class="csp-7623f0">
            <div class="csp-70220d">${App.Utils.escapeHtml(provider.label)}</div>
            <div class="csp-a3a556">${privacyBadge}</div>
          </div>
          <a href="${App.Utils.escapeHtml(provider.docsUrl)}" target="_blank" rel="noopener noreferrer" class="csp-2e1ecf" title="Provider documentation">${App.Icons.get("external")}</a>
        </div>
      </label>`;
  }

  function statusBanner(status) {
    if (!status.enabled) {
      return `<div class="card csp-f8e350"><strong>AI is currently disabled.</strong> The rest of the app works exactly the same without it — nothing here is required.</div>`;
    }
    return `<div class="card">
      <strong class="${status.configured ? "status-ok" : "status-bad"}">${status.configured ? "✓ Configured" : "⚠ Not fully configured"}</strong>
      — ${App.Utils.escapeHtml(status.providerLabel || "no provider")}
      ${status.isLocal ? "(local)" : "(cloud)"}
    </div>`;
  }

  function render(container) {
    container.innerHTML = `<div class="section"><p class="csp-923776">Loading AI Settings…</p></div>`;
    App.AI.ensureLoaded()
      .then(() => renderLoaded(container))
      .catch((err) => {
        container.innerHTML = `<div class="section"><div class="card">Could not load AI Settings: ${App.Utils.escapeHtml(err.message)}</div></div>`;
      });
  }

  function renderLoaded(container) {
    const settings = App.Storage.getAiSettings();
    const providers = App.AI.listProviders();
    const activeProvider = App.AI.getProvider(settings.activeProvider);
    const status = App.AI.Service.getStatus();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>AI Settings</h1>
          <p class="subtitle">Optional. Disabled by default. The app is fully usable without this.</p>
        </div>
      </div>

      <div class="section">
        <label class="filter-bar csp-63d058">
          <input type="checkbox" id="ai-enabled-toggle" ${settings.enabled ? "checked" : ""} />
          <span class="csp-0b87e9">Enable AI features</span>
        </label>
      </div>

      <div class="section">${statusBanner(status)}</div>

      <div class="section ${settings.enabled ? "" : "is-disabled"}" id="ai-provider-config">
        <div class="section-title csp-7f5713"><strong>Provider</strong></div>
        ${providers.map((p) => providerCard(p, settings, p.id === settings.activeProvider)).join("")}

        <div class="card csp-f5388c">
          <div class="section-title csp-7f5713"><strong>${App.Utils.escapeHtml(activeProvider.label)} configuration</strong></div>

          <label class="csp-3ec140">
            Endpoint
            <input type="text" id="ai-endpoint" value="${App.Utils.escapeHtml(settings.endpoint || activeProvider.defaultEndpoint)}" placeholder="${App.Utils.escapeHtml(activeProvider.defaultEndpoint)}" class="csp-e2fd78" />
          </label>

          <label class="csp-3ec140">
            Model
            <input type="text" id="ai-model" value="${App.Utils.escapeHtml(settings.model || activeProvider.defaultModel)}" placeholder="${App.Utils.escapeHtml(activeProvider.defaultModel)}" class="csp-e2fd78" />
          </label>

          ${
            activeProvider.requiresApiKey
              ? `<label class="csp-3ec140">
                  API key <span class="csp-6a11e8">— stored only in this browser, never included in exports</span>
                  <input type="password" id="ai-api-key" value="${App.Utils.escapeHtml(App.Storage.getAiApiKey(activeProvider.id))}" placeholder="sk-..." autocomplete="off" class="csp-e2fd78" />
                </label>`
              : ""
          }

          <label class="csp-3ec140">
            Temperature (0 = focused, 1 = creative): <span id="ai-temp-value">${settings.temperature}</span>
            <input type="range" id="ai-temperature" min="0" max="1" step="0.1" value="${settings.temperature}" class="csp-cad980" />
          </label>

          <label class="csp-3ec140">
            Max response length (tokens)
            <input type="number" id="ai-max-tokens" min="128" max="4096" step="128" value="${settings.maxTokens}" class="csp-e2fd78" />
          </label>

          <label class="csp-3e33b4">
            <input type="checkbox" id="ai-cache-toggle" ${settings.cacheEnabled ? "checked" : ""} />
            Cache repeated questions for 10 minutes (avoids re-asking identical questions)
          </label>

          <div class="csp-e9bfb8">
            <button class="btn btn-secondary" id="ai-test-btn">Test Connection</button>
            <span id="ai-test-result" class="csp-f55bde"></span>
          </div>
        </div>
      </div>

      <div class="section csp-73f9c4">
        <p class="csp-3c3cba">
          When AI is enabled, using a feature sends the resource's catalog metadata (title, subject, description) to the selected provider.
          Local providers (Ollama, LM Studio) never send anything off this device. Cloud providers (OpenAI, Claude, Gemini) send it to that
          provider's servers, subject to their own terms. Your personal notes are never sent unless a feature explicitly says so and you opt in.
        </p>
      </div>
    `;

    container.querySelector("#ai-enabled-toggle").addEventListener("change", (e) => {
      App.Storage.setAiSettings({ enabled: e.target.checked });
      renderLoaded(container);
    });

    App.Dom.qsa("[data-provider-radio]", container).forEach((radio) => {
      radio.addEventListener("change", (e) => {
        App.Storage.setAiSettings({ activeProvider: e.target.value, endpoint: "", model: "" });
        renderLoaded(container);
      });
    });

    const endpointEl = container.querySelector("#ai-endpoint");
    if (endpointEl)
      endpointEl.addEventListener("blur", () =>
        App.Storage.setAiSettings({ endpoint: endpointEl.value.trim() })
      );

    const modelEl = container.querySelector("#ai-model");
    if (modelEl)
      modelEl.addEventListener("blur", () =>
        App.Storage.setAiSettings({ model: modelEl.value.trim() })
      );

    const keyEl = container.querySelector("#ai-api-key");
    if (keyEl)
      keyEl.addEventListener("blur", () =>
        App.Storage.setAiApiKey(activeProvider.id, keyEl.value.trim())
      );

    const tempEl = container.querySelector("#ai-temperature");
    if (tempEl) {
      tempEl.addEventListener("input", () => {
        container.querySelector("#ai-temp-value").textContent = tempEl.value;
      });
      tempEl.addEventListener("change", () =>
        App.Storage.setAiSettings({ temperature: parseFloat(tempEl.value) })
      );
    }

    const maxTokensEl = container.querySelector("#ai-max-tokens");
    if (maxTokensEl) {
      maxTokensEl.addEventListener("blur", () => {
        const v = parseInt(maxTokensEl.value, 10);
        if (Number.isFinite(v) && v > 0) App.Storage.setAiSettings({ maxTokens: v });
      });
    }

    const cacheEl = container.querySelector("#ai-cache-toggle");
    if (cacheEl)
      cacheEl.addEventListener("change", () =>
        App.Storage.setAiSettings({ cacheEnabled: cacheEl.checked })
      );

    const testBtn = container.querySelector("#ai-test-btn");
    if (testBtn) {
      testBtn.addEventListener("click", async () => {
        const resultEl = container.querySelector("#ai-test-result");
        testBtn.disabled = true;
        resultEl.textContent = "Testing…";
        const currentSettings = App.Storage.getAiSettings();
        const result = await App.AI.Service.testConnection(activeProvider.id, {
          endpoint: currentSettings.endpoint || activeProvider.defaultEndpoint,
          model: currentSettings.model || activeProvider.defaultModel,
          apiKey: App.Storage.getAiApiKey(activeProvider.id),
        });
        testBtn.disabled = false;
        resultEl.textContent = result.ok ? "✓ Connected" : `✗ ${result.error}`;
        resultEl.style.color = result.ok ? "var(--c-green,#1e7e34)" : "var(--c-red,#c62828)";
      });
    }
  }

  App.Views = App.Views || {};
  App.Views["ai-settings"] = (c) => App.ErrorHandler.guard(c, "AI Settings", () => render(c));
})((window.App = window.App || {}));
