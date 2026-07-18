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
            <h2 style="font-size:1.2rem;margin-top:4px;">${App.Utils.escapeHtml(resource.title)}</h2>
          </div>
          <button class="modal-close" data-close-modal aria-label="Close">${App.Icons.get("close")}</button>
        </div>
        <div class="modal-body">
          <p style="color:var(--text-secondary);font-size:14px;">${App.Utils.escapeHtml(resource.description)}</p>

          <div class="rc-meta" style="margin-top:var(--sp-4);">
            <span class="badge ${App.Formatters.badgeClass(resource.difficulty)}">${resource.difficulty}</span>
            <span class="badge ${App.Formatters.badgeClass(resource.quality)}">${resource.quality} quality</span>
            <span class="badge ${App.Formatters.badgeClass(resource.verificationStatus)}">${resource.verificationStatus}</span>
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
            <div class="empty-state" style="padding:var(--sp-4);text-align:left;">
              ${App.Icons.get("link")} This resource is a cross-reference. Full details live in <strong>${App.Utils.escapeHtml(resource.crossRefTarget || "another library")}</strong>.
            </div>`
              : ""
          }

          ${
            (resource.prerequisites || []).length
              ? `
            <div class="section" style="margin-bottom:var(--sp-4);">
              <div class="meta-label" style="margin-bottom:6px;">Prerequisites</div>
              <ul style="padding-left:18px;font-size:13.5px;color:var(--text-secondary);">
                ${resource.prerequisites.map((p) => `<li>${App.Utils.escapeHtml(p)}</li>`).join("")}
              </ul>
            </div>`
              : ""
          }

          ${
            related.length
              ? `
            <div class="section" style="margin-bottom:var(--sp-4);">
              <div class="meta-label" style="margin-bottom:6px;">Related Resources</div>
              <div class="related-list">
                ${related.map((r) => `<button class="related-pill" data-open-related="${r.id}">${App.Utils.escapeHtml(r.title)}</button>`).join("")}
              </div>
            </div>`
              : ""
          }

          <div class="section" style="margin-bottom:0;">
            <div class="meta-label" style="margin-bottom:6px;">Tags</div>
            <div class="related-list">
              ${(resource.tags || []).map((t) => `<span class="badge badge-outline">${App.Utils.escapeHtml(t)}</span>`).join("")}
            </div>
          </div>

          <div class="section" style="margin-top:var(--sp-4);margin-bottom:0;">
            <label class="meta-label" for="resource-note" style="display:block;margin-bottom:6px;">Your Notes</label>
            <textarea id="resource-note" class="notes-textarea" placeholder="Private notes, stored only on this device…">${App.Utils.escapeHtml(note)}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <div style="display:flex;gap:var(--sp-2);align-items:center;">
            <select class="status-select" id="resource-status-select" aria-label="Progress status">
              ${App.Constants.PROGRESS_STATUSES.map((s) => `<option value="${s}" ${s === status ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <button class="icon-toggle ${isFav ? "active" : ""}" id="modal-fav-btn" aria-pressed="${isFav}" aria-label="Toggle favorite" title="Toggle favorite">${App.Icons.get("heart")}</button>
            <button class="icon-toggle ${isBookmarked ? "active bookmark" : ""}" id="modal-bookmark-btn" aria-pressed="${isBookmarked}" aria-label="Toggle bookmark" title="Toggle bookmark">${App.Icons.get("bookmark")}</button>
          </div>
          <a class="btn btn-primary" href="${resource.link}" target="_blank" rel="noopener noreferrer">
            ${App.Icons.get("external")} Open Resource
          </a>
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
