/* ============================================================
   Resource Card. One function, many call sites — this is the
   "reusable component" objective in practice: Browse, Favorites,
   Bookmarks, Progress, and the Home dashboard's recent-items
   strip all call renderResourceCard() instead of each hand-
   rolling their own card markup.
   ============================================================ */
(function (App) {
  "use strict";

  function actionButton(icon, active, extraClass, title) {
    return `<button class="icon-toggle ${active ? "active" : ""} ${extraClass || ""}" data-action="${extraClass}" title="${title}" aria-pressed="${active}" aria-label="${title}">
      ${App.Icons.get(icon)}
    </button>`;
  }

  /**
   * @param {object} resource
   * @param {object} opts { query: string (for highlighting), compact: boolean }
   * @returns {HTMLElement}
   */
  function renderResourceCard(resource, opts) {
    opts = opts || {};
    const q = opts.query || "";
    const isFav = App.Storage.isFavorite(resource.id);
    const isBookmarked = App.Storage.isBookmarked(resource.id);
    const status = App.Storage.getProgress(resource.id);
    const title = App.Search.highlight(resource.title, q);
    const desc = App.Search.highlight(App.Formatters.truncate(resource.description, 140), q);

    const card = App.Dom.el("article", {
      class: `resource-card ${resource.isCrossRef ? "is-xref" : ""}`,
      "data-id": resource.id,
      tabindex: "0",
      role: "button",
      "aria-label": `Open ${resource.title}`,
    });

    card.innerHTML = `
      <div class="rc-top">
        <div>
          <div class="rc-id">${resource.id} · ${App.Utils.escapeHtml(resource.university)}</div>
          <h3 class="rc-title">${title}</h3>
        </div>
      </div>
      <div class="rc-actions">
        ${actionButton("heart", isFav, "toggle-favorite", "Toggle favorite")}
        ${actionButton("bookmark", isBookmarked, "toggle-bookmark bookmark", "Toggle bookmark")}
      </div>
      <p class="rc-desc">${desc}</p>
      <div class="rc-meta">
        <span class="badge ${App.Formatters.badgeClass(resource.difficulty)}">${resource.difficulty}</span>
        <span class="badge ${App.Formatters.badgeClass(resource.verificationStatus)}">${resource.verificationStatus}</span>
        <span class="badge badge-outline">${App.Utils.escapeHtml(resource.subject)}</span>
        <span class="badge ${App.Formatters.badgeClass(status)}">${status}</span>
      </div>
      <div class="rc-meta" style="margin-bottom:0;">
        <span class="stars" aria-label="Priority ${resource.priority} of 5">${App.Formatters.starRating(resource.priority)}</span>
        <span class="badge badge-outline">${App.Utils.escapeHtml(resource.platform)}</span>
      </div>
    `;
    return card;
  }

  /**
   * Attaches ONE delegated listener set for a container of resource
   * cards. Call once per view render, not once per card.
   */
  function bindResourceCardEvents(container, callbacks) {
    callbacks = callbacks || {};
    App.Dom.delegate(container, "click", ".resource-card", (cardEl, e) => {
      if (e.target.closest("[data-action]")) return; // action buttons handle their own click below
      const id = cardEl.getAttribute("data-id");
      if (callbacks.onOpen) callbacks.onOpen(id);
    });
    App.Dom.delegate(container, "keydown", ".resource-card", (cardEl, e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const id = cardEl.getAttribute("data-id");
        if (callbacks.onOpen) callbacks.onOpen(id);
      }
    });
    App.Dom.delegate(container, "click", "[data-action='toggle-favorite']", (btn, e) => {
      e.stopPropagation();
      const id = btn.closest(".resource-card").getAttribute("data-id");
      const nowActive = App.ErrorHandler.safeCall("toggle favorite", () =>
        App.Storage.toggleFavorite(id)
      );
      btn.classList.toggle("active", nowActive);
      btn.setAttribute("aria-pressed", String(nowActive));
      if (callbacks.onFavoriteToggle) callbacks.onFavoriteToggle(id, nowActive);
    });
    App.Dom.delegate(container, "click", "[data-action='toggle-bookmark']", (btn, e) => {
      e.stopPropagation();
      const id = btn.closest(".resource-card").getAttribute("data-id");
      const nowActive = App.ErrorHandler.safeCall("toggle bookmark", () =>
        App.Storage.toggleBookmark(id)
      );
      btn.classList.toggle("active", nowActive);
      btn.setAttribute("aria-pressed", String(nowActive));
      if (callbacks.onBookmarkToggle) callbacks.onBookmarkToggle(id, nowActive);
    });
  }

  App.Components = App.Components || {};
  App.Components.renderResourceCard = renderResourceCard;
  App.Components.bindResourceCardEvents = bindResourceCardEvents;
})((window.App = window.App || {}));
