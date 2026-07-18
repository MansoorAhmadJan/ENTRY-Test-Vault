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

    // Accessibility note (found by the V5.2 axe-core audit, see docs/
    // ACCESSIBILITY.md): this used to be an <article role="button"> with
    // real <button> action buttons nested inside it. That's invalid ARIA
    // two ways at once — role="button" isn't an allowed role for
    // <article>, and a screen reader genuinely cannot present a button
    // nested inside another interactive control. The fix is the standard
    // "stretched button" pattern: only the title is a REAL <button>
    // (keyboard/AT get correct native semantics for free), and CSS
    // (.rc-open-btn::before, position:absolute;inset:0) makes its
    // clickable AREA cover the whole card — so the click-anywhere-on-card
    // UX is unchanged, but the DOM has no nested interactive elements.
    const card = App.Dom.el("article", {
      class: `resource-card ${resource.isCrossRef ? "is-xref" : ""}`,
      "data-id": resource.id,
    });

    card.innerHTML = `
      <div class="rc-top">
        <div>
          <button class="rc-open-btn" data-action="open" aria-label="Open ${App.Utils.escapeHtml(resource.title)}">
            <span class="rc-id">${resource.id} · ${App.Utils.escapeHtml(resource.university)}</span>
            <span class="rc-title">${title}</span>
          </button>
        </div>
      </div>
      <div class="rc-actions">
        ${actionButton("heart", isFav, "toggle-favorite", "Toggle favorite")}
        ${actionButton("bookmark", isBookmarked, "toggle-bookmark bookmark", "Toggle bookmark")}
      </div>
      <p class="rc-desc">${desc}</p>
      <div class="rc-meta">
        <span class="badge ${App.Formatters.badgeClass(resource.difficulty)}">${App.Utils.escapeHtml(resource.difficulty)}</span>
        <span class="badge ${App.Formatters.badgeClass(resource.verificationStatus)}">${App.Utils.escapeHtml(resource.verificationStatus)}</span>
        <span class="badge badge-outline">${App.Utils.escapeHtml(resource.subject)}</span>
        <span class="badge ${App.Formatters.badgeClass(status)}">${status}</span>
      </div>
      <div class="rc-meta" style="margin-bottom:0;">
        <span class="stars" role="img" aria-label="Priority ${resource.priority} of 5">${App.Formatters.starRating(resource.priority)}</span>
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
    App.Dom.delegate(container, "click", "[data-action='open']", (btn) => {
      const id = btn.closest(".resource-card").getAttribute("data-id");
      if (callbacks.onOpen) callbacks.onOpen(id);
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
