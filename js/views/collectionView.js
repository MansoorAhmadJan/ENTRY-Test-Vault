/* ============================================================
   Collection views: Favorites, Bookmarks, Progress Tracker.
   One renderer, three thin wrappers — avoids the "duplicated
   logic" anti-pattern the brief explicitly calls out.
   ============================================================ */
(function (App) {
  "use strict";

  function renderGrid(container, resources, emptyMessage) {
    if (!resources.length) {
      container.innerHTML = `<div class="empty-state">${App.Icons.get("inbox")}<p>${emptyMessage}</p></div>`;
      return;
    }
    container.innerHTML = "";
    container.className = "resource-grid";
    resources.forEach((r) => container.appendChild(App.Components.renderResourceCard(r)));
    App.Components.bindResourceCardEvents(container, {
      onOpen: (id) => App.Components.openResourceModal(id),
      // Re-render the page when a favorite/bookmark is removed from within its own list,
      // so the item disappears immediately instead of lingering until next navigation.
      onFavoriteToggle: () => container.dispatchEvent(new CustomEvent("collection:refresh")),
      onBookmarkToggle: () => container.dispatchEvent(new CustomEvent("collection:refresh")),
    });
    App.ContextMenu.attachToResourceCards(container);
  }

  let activeFavHandler = null;
  let activeBookmarkHandler = null;

  function renderFavorites(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1>Favorites</h1><p class="subtitle">Resources you've marked with the heart icon.</p></div></div>
      <div id="collection-grid"></div>`;
    const grid = container.querySelector("#collection-grid");
    const paint = () =>
      renderGrid(
        grid,
        App.Data.getByIds(App.Storage.getFavorites()),
        "No favorites yet. Click the heart icon on any resource card to add one."
      );
    grid.addEventListener("collection:refresh", paint);
    if (activeFavHandler) document.removeEventListener("app:data-changed", activeFavHandler);
    activeFavHandler = paint;
    document.addEventListener("app:data-changed", activeFavHandler);
    paint();
  }

  function renderBookmarks(container) {
    container.innerHTML = `
      <div class="page-header"><div><h1>Bookmarks</h1><p class="subtitle">Resources you've saved for later.</p></div></div>
      <div id="collection-grid"></div>`;
    const grid = container.querySelector("#collection-grid");
    const paint = () =>
      renderGrid(
        grid,
        App.Data.getByIds(App.Storage.getBookmarks()),
        "No bookmarks yet. Click the bookmark icon on any resource card to add one."
      );
    grid.addEventListener("collection:refresh", paint);
    if (activeBookmarkHandler)
      document.removeEventListener("app:data-changed", activeBookmarkHandler);
    activeBookmarkHandler = paint;
    document.addEventListener("app:data-changed", activeBookmarkHandler);
    paint();
  }

  let activeDataChangedHandler = null;

  function renderProgress(container) {
    const statuses = App.Constants.PROGRESS_STATUSES;
    let activeTab = "In Progress";

    function idsForStatus(status) {
      const map = App.Storage.getProgressMap();
      if (status === "Not Started") {
        const tracked = new Set(Object.keys(map));
        return App.Data.getAll()
          .filter((r) => !tracked.has(r.id))
          .map((r) => r.id);
      }
      return Object.entries(map)
        .filter(([, s]) => s === status)
        .map(([id]) => id);
    }

    function paintTabs() {
      container.querySelector("#progress-tabs").innerHTML = statuses
        .map(
          (s) => `
        <button class="tab-btn ${s === activeTab ? "active" : ""}" data-status="${s}">
          ${s} <span class="badge badge-grey" style="margin-left:4px;">${idsForStatus(s).length}</span>
        </button>`
        )
        .join("");
    }

    function paintGrid() {
      const grid = container.querySelector("#collection-grid");
      renderGrid(
        grid,
        App.Data.getByIds(idsForStatus(activeTab)),
        `Nothing marked "${activeTab}" yet.`
      );
    }

    container.innerHTML = `
      <div class="page-header"><div><h1>Progress Tracker</h1><p class="subtitle">Track what you've completed, what's in progress, and what needs revision.</p></div></div>
      <div class="tabs" id="progress-tabs"></div>
      <div id="collection-grid"></div>`;

    paintTabs();
    paintGrid();
    container.querySelector("#collection-grid").addEventListener("collection:refresh", () => {
      paintTabs();
      paintGrid();
    });

    if (activeDataChangedHandler)
      document.removeEventListener("app:data-changed", activeDataChangedHandler);
    activeDataChangedHandler = () => {
      paintTabs();
      paintGrid();
    };
    document.addEventListener("app:data-changed", activeDataChangedHandler);
    container.querySelector("#progress-tabs").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-status]");
      if (!btn) return;
      activeTab = btn.getAttribute("data-status");
      paintTabs();
      paintGrid();
    });
  }

  App.Views = App.Views || {};
  App.Views.favorites = (c) => App.ErrorHandler.guard(c, "Favorites", () => renderFavorites(c));
  App.Views.bookmarks = (c) => App.ErrorHandler.guard(c, "Bookmarks", () => renderBookmarks(c));
  App.Views.progress = (c) =>
    App.ErrorHandler.guard(c, "Progress Tracker", () => renderProgress(c));
})((window.App = window.App || {}));
