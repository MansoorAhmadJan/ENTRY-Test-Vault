/* ============================================================
   Resource Viewer (modal). Single instance, reused for every
   resource — opened via App.Components.openResourceModal(id).
   ============================================================ */
(function (App) {
  "use strict";

  let overlayEl = null;

  function ensureOverlay() {
    if (overlayEl) return overlayEl;
    overlayEl = App.Dom.el("div", {
      class: "modal-overlay",
      id: "resource-modal-overlay",
      role: "dialog",
      "aria-modal": "true",
    });
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) close();
    });
    App.Dom.delegate(overlayEl, "click", "[data-close-modal]", close);
    return overlayEl;
  }

  function metaItem(label, value) {
    return `<div class="meta-item"><div class="meta-label">${label}</div><div class="meta-value">${App.Utils.escapeHtml(value)}</div></div>`;
  }

  function render(resource) {
    const isFav = App.Storage.isFavorite(resource.id);
    const isBookmarked = App.Storage.isBookmarked(resource.id);
    const status = App.Storage.getProgress(resource.id);
    const note = App.Storage.getNote(resource.id);
    const related = App.Data.getByIds(resource.relatedResources || []);

    overlayEl.innerHTML = `
      <div class="modal" role="document">
        <div class="modal-header">
          <div>
            <div class="rc-id">${resource.id}${resource.isCrossRef ? " · Cross-reference" : ""}</div>
            <h2 class="rm-title">${App.Utils.escapeHtml(resource.title)}</h2>
          </div>
          <button class="modal-close" data-close-modal aria-label="Close">${App.Icons.get("close")}</button>
        </div>
        <div class="modal-body">
          <p class="rm-description">${App.Utils.escapeHtml(resource.description)}</p>

          <div class="rc-meta rm-meta-row">
            <span class="badge ${App.Formatters.badgeClass(resource.difficulty)}">${App.Utils.escapeHtml(resource.difficulty)}</span>
            <span class="badge ${App.Formatters.badgeClass(resource.quality)}">${App.Utils.escapeHtml(resource.quality)} quality</span>
            <span class="badge ${App.Formatters.badgeClass(resource.verificationStatus)}">${App.Utils.escapeHtml(resource.verificationStatus)}</span>
            <span class="stars" role="img" aria-label="Priority ${resource.priority} of 5">${App.Formatters.starRating(resource.priority)}</span>
          </div>

          <div class="meta-table">
            ${metaItem("University", resource.university)}
            ${metaItem("Subject", resource.subject)}
            ${metaItem("Chapter", resource.chapter)}
            ${metaItem("Platform", resource.platform)}
            ${metaItem("Resource Type", resource.resourceType)}
            ${metaItem("Language", resource.language)}
            ${metaItem("Est. Study Time", resource.estTime)}
            ${metaItem("Date Added", App.Formatters.formatDate(resource.dateAdded))}
            ${metaItem("Last Updated", App.Formatters.formatDate(resource.lastUpdated))}
          </div>

          ${
            resource.isCrossRef
              ? `
            <div class="empty-state rm-xref-empty">
              ${App.Icons.get("link")} This resource is a cross-reference. Full details live in <strong>${App.Utils.escapeHtml(resource.crossRefTarget || "another library")}</strong>.
            </div>`
              : ""
          }

          ${
            (resource.prerequisites || []).length
              ? `
            <div class="section section--mb4">
              <div class="meta-label meta-label--mb6">Prerequisites</div>
              <ul class="rm-prereq-list">
                ${resource.prerequisites.map((p) => `<li>${App.Utils.escapeHtml(p)}</li>`).join("")}
              </ul>
            </div>`
              : ""
          }

          ${
            related.length
              ? `
            <div class="section section--mb4">
              <div class="meta-label meta-label--mb6">Related Resources</div>
              <div class="related-list">
                ${related.map((r) => `<button class="related-pill" data-open-related="${r.id}">${App.Utils.escapeHtml(r.title)}</button>`).join("")}
              </div>
            </div>`
              : ""
          }

          <div class="section section--mb0">
            <div class="meta-label meta-label--mb6">Tags</div>
            <div class="related-list">
              ${(resource.tags || []).map((t) => `<span class="badge badge-outline">${App.Utils.escapeHtml(t)}</span>`).join("")}
            </div>
          </div>

          <div class="section section--mt4-mb0">
            <div class="rm-ai-header-row">
              <span class="meta-label">${App.Icons.get("sparkle")} AI Tools</span>
              <span class="badge badge-outline rm-optional-badge">Optional</span>
            </div>
            <div id="ai-tools-panel"></div>
          </div>

          <div class="section section--mt4-mb0">
            <label class="meta-label rm-note-label" for="resource-note">Your Notes</label>
            <textarea id="resource-note" class="notes-textarea" placeholder="Private notes, stored only on this device…">${App.Utils.escapeHtml(note)}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <div class="rm-footer-left">
            <select class="status-select" id="resource-status-select" aria-label="Progress status">
              ${App.Constants.PROGRESS_STATUSES.map((s) => `<option value="${s}" ${s === status ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <button class="icon-toggle ${isFav ? "active" : ""}" id="modal-fav-btn" aria-pressed="${isFav}" aria-label="Toggle favorite" title="Toggle favorite">${App.Icons.get("heart")}</button>
            <button class="icon-toggle ${isBookmarked ? "active bookmark" : ""}" id="modal-bookmark-btn" aria-pressed="${isBookmarked}" aria-label="Toggle bookmark" title="Toggle bookmark">${App.Icons.get("bookmark")}</button>
          </div>
          ${
            App.Validators.isValidUrl(resource.link)
              ? `<a class="btn btn-primary" href="${App.Utils.escapeHtml(resource.link)}" target="_blank" rel="noopener noreferrer">
                  ${App.Icons.get("external")} Open Resource
                </a>`
              : `<span class="btn btn-secondary" title="This resource's link failed validation (not a well-formed http/https URL) and has been disabled for safety." aria-disabled="true">
                  ${App.Icons.get("external")} Link unavailable
                </span>`
          }
        </div>
      </div>
    `;

    App.Dom.qs("#resource-status-select", overlayEl).addEventListener("change", (e) => {
      App.ErrorHandler.safeCall("save progress", () =>
        App.Storage.setProgress(resource.id, e.target.value)
      );
      App.Toast.show(
        `Marked "${App.Formatters.truncate(resource.title, 40)}" as ${e.target.value}`,
        "success"
      );
      document.dispatchEvent(new CustomEvent("app:data-changed"));
    });
    App.Dom.qs("#modal-fav-btn", overlayEl).addEventListener("click", (e) => {
      const active = App.ErrorHandler.safeCall("toggle favorite", () =>
        App.Storage.toggleFavorite(resource.id)
      );
      e.currentTarget.classList.toggle("active", active);
      e.currentTarget.setAttribute("aria-pressed", String(active));
      document.dispatchEvent(new CustomEvent("app:data-changed"));
    });
    App.Dom.qs("#modal-bookmark-btn", overlayEl).addEventListener("click", (e) => {
      const active = App.ErrorHandler.safeCall("toggle bookmark", () =>
        App.Storage.toggleBookmark(resource.id)
      );
      e.currentTarget.classList.toggle("active", active);
      e.currentTarget.setAttribute("aria-pressed", String(active));
      document.dispatchEvent(new CustomEvent("app:data-changed"));
    });
    const noteEl = App.Dom.qs("#resource-note", overlayEl);
    noteEl.addEventListener("blur", () => {
      App.ErrorHandler.safeCall("save note", () => App.Storage.setNote(resource.id, noteEl.value));
      document.dispatchEvent(new CustomEvent("app:data-changed"));
    });

    App.Dom.qsa("[data-open-related]", overlayEl).forEach((btn) => {
      btn.addEventListener("click", () => open(btn.getAttribute("data-open-related")));
    });

    paintAiToolsPanel(overlayEl, resource);
  }

  const AI_FEATURE_BUTTONS = [
    {
      id: "explain-resource",
      label: "Explain this",
      fn: (r) => App.AI.Features.explainResource(r),
    },
    {
      id: "generate-study-notes",
      label: "Study notes",
      fn: (r) => App.AI.Features.generateStudyNotes(r),
    },
    {
      id: "suggest-related-topics",
      label: "Related topics",
      fn: (r) => App.AI.Features.suggestRelatedTopics(r),
    },
  ];

  function paintAiToolsPanel(overlay, resource) {
    const panel = App.Dom.qs("#ai-tools-panel", overlay);
    const settings = App.Storage.getAiSettings();

    if (!settings.enabled) {
      panel.innerHTML = `<p class="rm-muted-hint">AI is disabled. <a href="#ai-settings" data-goto-ai-settings>Enable it in AI Settings</a> to use these tools — everything else in the app works the same either way.</p>`;
      App.Dom.qs("[data-goto-ai-settings]", panel)?.addEventListener("click", (e) => {
        e.preventDefault();
        App.Components.closeResourceModal();
        App.Router.navigate("ai-settings");
      });
      return;
    }

    const hasNote = !!App.Storage.getNote(resource.id);
    panel.innerHTML = `
      <div class="rm-ai-actions-row">
        ${AI_FEATURE_BUTTONS.map((b) => `<button class="btn btn-secondary rm-ai-btn" data-ai-action="${b.id}">${b.label}</button>`).join("")}
      </div>
      <div class="rm-ai-ask-row">
        <input type="text" id="ai-question-input" class="rm-ai-question-input" placeholder="Ask a question about this resource…" />
        <button class="btn btn-secondary rm-ai-btn" id="ai-ask-btn">Ask</button>
      </div>
      ${
        hasNote
          ? `<label class="rm-ai-notes-checkbox-label">
              <input type="checkbox" id="ai-include-notes" /> Include my note on this resource (off by default)
            </label>`
          : ""
      }
      <div id="ai-tools-result"></div>
    `;

    const resultEl = App.Dom.qs("#ai-tools-result", panel);

    async function runAiAction(fn) {
      resultEl.innerHTML = `<p class="rm-muted-hint">Thinking…</p>`;
      try {
        await App.AI.ensureLoaded();
        if (!App.AI.Service.isConfigured()) {
          resultEl.innerHTML = `<p class="rm-muted-hint">AI is enabled but not fully configured (check provider/API key in AI Settings).</p>`;
          return;
        }
        const result = await fn();
        if (result.ok) {
          // Escaped — this is AI-GENERATED text landing in the DOM, held
          // to the exact same rule as every other free-text source in
          // this app (notes, resource fields): never trust it unescaped.
          resultEl.innerHTML = `<div class="card rm-ai-result-card">${App.Utils.escapeHtml(result.text)}</div>`;
        } else {
          resultEl.innerHTML = `<p class="rm-error-hint">${App.Utils.escapeHtml(result.error)}</p>`;
        }
      } catch (err) {
        resultEl.innerHTML = `<p class="rm-error-hint">Something went wrong loading AI tools: ${App.Utils.escapeHtml(err.message)}</p>`;
      }
    }

    App.Dom.qsa("[data-ai-action]", panel).forEach((btn) => {
      btn.addEventListener("click", async () => {
        const action = AI_FEATURE_BUTTONS.find((b) => b.id === btn.getAttribute("data-ai-action"));
        btn.disabled = true;
        await runAiAction(() => action.fn(resource));
        btn.disabled = false;
      });
    });

    const askBtn = App.Dom.qs("#ai-ask-btn", panel);
    askBtn.addEventListener("click", async () => {
      const input = App.Dom.qs("#ai-question-input", panel);
      const question = input.value.trim();
      if (!question) return;
      const includeNotes = !!App.Dom.qs("#ai-include-notes", panel)?.checked;
      askBtn.disabled = true;
      await runAiAction(() => App.AI.Features.answerQuestion(resource, question, { includeNotes }));
      askBtn.disabled = false;
    });
  }

  function open(id) {
    const resource = App.Data.getById(id);
    if (!resource) {
      App.Toast.show(`Resource ${id} not found`, "error");
      return;
    }
    ensureOverlay();
    App.ErrorHandler.guard(overlayEl, `resource ${id}`, () => render(resource));
    overlayEl.classList.add("open");
    App.ErrorHandler.safeCall("track recently viewed", () => App.Storage.pushRecentlyViewed(id));
    App.ErrorHandler.safeCall("track view count", () => App.Storage.incrementViewCount(id));
    App.State.set({ activeModalResourceId: id });
    document.body.style.overflow = "hidden";
    App.FocusTrap.trap(overlayEl);
    const closeBtn = App.Dom.qs(".modal-close", overlayEl);
    // Deferred: if this open() was itself triggered by an Enter keypress
    // (e.g. header search), synchronously focusing a <button> here would let
    // that same keyup activate the button's native click handler and instantly
    // close the modal that just opened. Yielding a tick avoids that race.
    if (closeBtn) setTimeout(() => closeBtn.focus(), 0);
  }

  function close() {
    if (!overlayEl) return;
    overlayEl.classList.remove("open");
    document.body.style.overflow = "";
    App.FocusTrap.release();
    App.State.set({ activeModalResourceId: null });
  }

  function isOpen() {
    return !!(overlayEl && overlayEl.classList.contains("open"));
  }

  App.Components = App.Components || {};
  App.Components.openResourceModal = open;
  App.Components.closeResourceModal = close;
  App.Components.isResourceModalOpen = isOpen;
})((window.App = window.App || {}));
