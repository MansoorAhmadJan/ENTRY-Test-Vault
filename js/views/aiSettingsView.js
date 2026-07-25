/* ============================================================
   AI Settings view (V5.3, Objective #6 + #7). All config lives in
   App.Storage's aiSettings/aiApiKeys — this view is presentation +
   a "Test Connection" action, no business logic of its own.
   ============================================================ */
(function (App) {
  "use strict";

  function providerCard(provider, settings, isActive) {
    const privacyBadge = provider.isLocal
      ? `<span class="badge" style="background:var(--c-green-bg,#e6f4ea);color:var(--c-green,#1e7e34);">Local — nothing leaves your device</span>`
      : `<span class="badge badge-outline">Cloud — sends data to ${App.Utils.escapeHtml(provider.label)}'s servers</span>`;
    return `
      <label class="card" style="display:block;cursor:pointer;margin-bottom:var(--sp-3);${isActive ? "border-color:var(--accent);" : ""}">
        <div style="display:flex;align-items:center;gap:var(--sp-3);">
          <input type="radio" name="ai-provider" value="${provider.id}" ${isActive ? "checked" : ""} data-provider-radio />
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13.5px;">${App.Utils.escapeHtml(provider.label)}</div>
            <div style="margin-top:4px;">${privacyBadge}</div>
          </div>
          <a href="${App.Utils.escapeHtml(provider.docsUrl)}" target="_blank" rel="noopener noreferrer" style="font-size:11.5px;" title="Provider documentation">${App.Icons.get("external")}</a>
        </div>
      </label>`;
  }

  function statusBanner(status) {
    if (!status.enabled) {
      return `<div class="card" style="background:var(--bg-elevated);"><strong>AI is currently disabled.</strong> The rest of the app works exactly the same without it — nothing here is required.</div>`;
    }
    const color = status.configured ? "var(--c-green,#1e7e34)" : "var(--c-red,#c62828)";
    return `<div class="card">
      <strong style="color:${color};">${status.configured ? "✓ Configured" : "⚠ Not fully configured"}</strong>
      — ${App.Utils.escapeHtml(status.providerLabel || "no provider")}
      ${status.isLocal ? "(local)" : "(cloud)"}
    </div>`;
  }

  function render(container) {
    container.innerHTML = `<div class="section"><p style="font-size:13px;color:var(--text-muted);">Loading AI Settings…</p></div>`;
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
        <label class="filter-bar" style="cursor:pointer;">
          <input type="checkbox" id="ai-enabled-toggle" ${settings.enabled ? "checked" : ""} />
          <span style="font-weight:600;">Enable AI features</span>
        </label>
      </div>

      <div class="section">${statusBanner(status)}</div>

      <div class="section" id="ai-provider-config" style="${settings.enabled ? "" : "opacity:0.5;pointer-events:none;"}">
        <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Provider</strong></div>
        ${providers.map((p) => providerCard(p, settings, p.id === settings.activeProvider)).join("")}

        <div class="card" style="margin-top:var(--sp-4);max-width:520px;">
          <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>${App.Utils.escapeHtml(activeProvider.label)} configuration</strong></div>

          <label style="display:block;margin-bottom:var(--sp-3);font-size:12.5px;">
            Endpoint
            <input type="text" id="ai-endpoint" value="${App.Utils.escapeHtml(settings.endpoint || activeProvider.defaultEndpoint)}" placeholder="${App.Utils.escapeHtml(activeProvider.defaultEndpoint)}" style="width:100%;margin-top:4px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);" />
          </label>

          <label style="display:block;margin-bottom:var(--sp-3);font-size:12.5px;">
            Model
            <input type="text" id="ai-model" value="${App.Utils.escapeHtml(settings.model || activeProvider.defaultModel)}" placeholder="${App.Utils.escapeHtml(activeProvider.defaultModel)}" style="width:100%;margin-top:4px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);" />
          </label>

          ${
            activeProvider.requiresApiKey
              ? `<label style="display:block;margin-bottom:var(--sp-3);font-size:12.5px;">
                  API key <span style="color:var(--text-muted);font-weight:400;">— stored only in this browser, never included in exports</span>
                  <input type="password" id="ai-api-key" value="${App.Utils.escapeHtml(App.Storage.getAiApiKey(activeProvider.id))}" placeholder="sk-..." autocomplete="off" style="width:100%;margin-top:4px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);" />
                </label>`
              : ""
          }

          <label style="display:block;margin-bottom:var(--sp-3);font-size:12.5px;">
            Temperature (0 = focused, 1 = creative): <span id="ai-temp-value">${settings.temperature}</span>
            <input type="range" id="ai-temperature" min="0" max="1" step="0.1" value="${settings.temperature}" style="width:100%;" />
          </label>

          <label style="display:block;margin-bottom:var(--sp-3);font-size:12.5px;">
            Max response length (tokens)
            <input type="number" id="ai-max-tokens" min="128" max="4096" step="128" value="${settings.maxTokens}" style="width:100%;margin-top:4px;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);" />
          </label>

          <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:var(--sp-3);">
            <input type="checkbox" id="ai-cache-toggle" ${settings.cacheEnabled ? "checked" : ""} />
            Cache repeated questions for 10 minutes (avoids re-asking identical questions)
          </label>

          <div style="display:flex;gap:var(--sp-3);align-items:center;">
            <button class="btn btn-secondary" id="ai-test-btn">Test Connection</button>
            <span id="ai-test-result" style="font-size:12.5px;"></span>
          </div>
        </div>
      </div>

      <div class="section" style="max-width:520px;">
        <p style="font-size:11.5px;color:var(--text-muted);">
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
