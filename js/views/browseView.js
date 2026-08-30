/* ============================================================
   Browse view. Handles three routes with one implementation:
     #/browse                -> no preset filter
     #/university/:key       -> preset university filter
     #/subject/:name         -> preset subject filter
   Objective #13 (50,000+ resources): renders in pages of
   App.Config.PAGE_SIZE via a "Load more" button rather than
   dumping the full filtered list into the DOM at once.
   ============================================================ */
(function (App) {
  "use strict";

  let filterState = App.Filter.emptyState();
  let query = "";
  let visibleCount = App.Config.PAGE_SIZE;
  let viewMode = "grid";

  function computeResults() {
    const base = query ? App.Search.search(query, 5000) : App.Data.getAll();
    return App.Filter.apply(base, filterState);
  }

  // Above this many results, List view switches from normal DOM rendering to
  // virtual scrolling. Below it, plain rendering is simpler and just as fast —
  // no reason to pay virtualization's complexity cost for a handful of rows.
  const VIRTUAL_SCROLL_THRESHOLD = 150;
  const LIST_ROW_HEIGHT = 68;
  let virtualListHandle = null;

  function listRowHtml(r) {
    const status = App.Storage.getProgress(r.id);
    const isFav = App.Storage.isFavorite(r.id);
    return `
      <div class="resource-card browse-list-row" data-id="${r.id}" tabindex="0" role="button" aria-label="Open ${App.Utils.escapeHtml(r.title)}">
        <button class="icon-toggle ${isFav ? "active" : ""}" data-action="toggle-favorite" aria-label="Toggle favorite">${App.Icons.get("heart")}</button>
        <div class="browse-list-row-text">
          <div class="browse-list-row-title">${App.Utils.escapeHtml(r.title)}</div>
          <div class="browse-list-row-meta">${r.id} · ${App.Utils.escapeHtml(r.university)} · ${App.Utils.escapeHtml(r.subject)}</div>
        </div>
        <span class="badge ${App.Formatters.badgeClass(r.difficulty)}">${App.Utils.escapeHtml(r.difficulty)}</span>
        <span class="badge ${App.Formatters.badgeClass(status)}">${status}</span>
        <span class="stars browse-list-row-stars" role="img" aria-label="Priority ${r.priority} of 5">${App.Formatters.starRating(r.priority)}</span>
      </div>`;
  }

  function renderVirtualizedList(hostEl, results) {
    hostEl.innerHTML = "";
    hostEl.style.height = "70vh";
    if (virtualListHandle) {
      virtualListHandle.destroy();
      virtualListHandle = null;
    }
    virtualListHandle = App.VirtualList.mount(hostEl, results, LIST_ROW_HEIGHT, (r) => {
      const node = App.Dom.el("div", { html: listRowHtml(r) });
      return node.firstElementChild;
    });
    App.Components.bindResourceCardEvents(hostEl, {
      onOpen: (id) => App.Components.openResourceModal(id),
    });
    App.ContextMenu.attachToResourceCards(hostEl);
  }

  function renderResults(container, route) {
    const resultsHost = container.querySelector("#browse-results");
    const countHost = container.querySelector("#filter-summary");
    const results = computeResults();

    if (countHost)
      countHost.textContent = `${results.length} resource${results.length === 1 ? "" : "s"}`;

    if (!results.length) {
      resultsHost.innerHTML = `
        <div class="empty-state">
          ${App.Icons.get("inbox")}
          <p><strong>No resources match your search/filters.</strong></p>
          <p class="browse-empty-hint">Try clearing a filter or using a broader search term.</p>
        </div>`;
      return;
    }

    if (viewMode === "list" && results.length > VIRTUAL_SCROLL_THRESHOLD) {
      resultsHost.className = "resource-list";
      renderVirtualizedList(resultsHost, results);
      const loadMoreHost = container.querySelector("#browse-load-more");
      loadMoreHost.innerHTML = `<p class="browse-virtual-hint">Virtual scrolling active — all ${results.length} results are scrollable above, nothing more to load.</p>`;
      return;
    }
    if (virtualListHandle) {
      virtualListHandle.destroy();
      virtualListHandle = null;
    }

    const page = results.slice(0, visibleCount);
    resultsHost.innerHTML = "";
    resultsHost.className = viewMode === "grid" ? "resource-grid" : "resource-list";
    page.forEach((r) => resultsHost.appendChild(App.Components.renderResourceCard(r, { query })));

    const loadMoreHost = container.querySelector("#browse-load-more");
    if (results.length > visibleCount) {
      loadMoreHost.innerHTML = `<button class="btn" id="load-more-btn">Load ${Math.min(App.Config.PAGE_SIZE, results.length - visibleCount)} more (${results.length - visibleCount} remaining)</button>`;
    } else {
      loadMoreHost.innerHTML = "";
    }
  }

  function presetFromRoute(route) {
    const state = App.Filter.emptyState();
    if (route.view === "university" && route.params.key) state.university.add(route.params.key);
    if (route.view === "subject" && route.params.name) state.subject.add(route.params.name);
    return state;
  }

  function titleFromRoute(route) {
    if (route.view === "university") {
      const uni = App.Data.getUniversity(route.params.key);
      return uni ? uni.label : route.params.key;
    }
    if (route.view === "subject") return route.params.name;
    return "Browse All Resources";
  }

  function render(container, route) {
    // Reset filter state when navigating fresh into a pre-filtered route;
    // preserve it when re-rendering the same #/browse (e.g. after a toggle).
    if (route.view !== "browse" || !container.querySelector("#browse-results")) {
      filterState = presetFromRoute(route);
      query = "";
      visibleCount = App.Config.PAGE_SIZE;
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>${App.Utils.escapeHtml(titleFromRoute(route))}</h1>
          <p class="subtitle">Search and filter across the vault. Filters combine — selecting more than one narrows results.</p>
        </div>
        <div class="tabs browse-tabs">
          <button class="btn btn-sm ${viewMode === "grid" ? "btn-primary" : ""}" id="view-mode-grid" aria-pressed="${viewMode === "grid"}" aria-label="Grid view">${App.Icons.get("grid")}</button>
          <button class="btn btn-sm ${viewMode === "list" ? "btn-primary" : ""}" id="view-mode-list" aria-pressed="${viewMode === "list"}" aria-label="List view">${App.Icons.get("list")}</button>
        </div>
      </div>

      <div class="search-box browse-search-box">
        ${App.Icons.get("search")}
        <input type="text" id="browse-search-input" placeholder="Search within these results…" value="${App.Utils.escapeHtml(query)}" aria-label="Search"/>
        <button class="clear-btn" id="browse-search-clear" aria-label="Clear">${App.Icons.get("x")}</button>
      </div>

      <div id="browse-filter-panel"></div>
      <div id="browse-results" class="resource-grid" aria-live="polite"></div>
      <div id="browse-load-more" class="browse-load-more-wrap"></div>
    `;

    const filterPanelHost = container.querySelector("#browse-filter-panel");
    App.Components.renderFilterPanel(filterPanelHost, filterState);
    App.Components.bindFilterPanel(filterPanelHost, filterState, () => {
      visibleCount = App.Config.PAGE_SIZE;
      App.Components.renderFilterPanel(filterPanelHost, filterState);
      renderResults(container, route);
    });

    renderResults(container, route);

    App.Components.bindResourceCardEvents(container.querySelector("#browse-results"), {
      onOpen: (id) => App.Components.openResourceModal(id),
    });
    App.ContextMenu.attachToResourceCards(container.querySelector("#browse-results"));

    const searchInput = container.querySelector("#browse-search-input");
    const clearBtn = container.querySelector("#browse-search-clear");
    clearBtn.style.display = query ? "flex" : "none";
    const runSearch = App.Utils.debounce(() => {
      query = searchInput.value.trim();
      clearBtn.style.display = query ? "flex" : "none";
      visibleCount = App.Config.PAGE_SIZE;
      renderResults(container, route);
    }, 150);
    searchInput.addEventListener("input", runSearch);
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      query = "";
      clearBtn.style.display = "none";
      renderResults(container, route);
    });

    container.querySelector("#view-mode-grid").addEventListener("click", () => {
      viewMode = "grid";
      render(container, route);
    });
    container.querySelector("#view-mode-list").addEventListener("click", () => {
      viewMode = "list";
      render(container, route);
    });

    container.querySelector("#browse-load-more").addEventListener("click", (e) => {
      if (e.target.closest("#load-more-btn")) {
        visibleCount += App.Config.PAGE_SIZE;
        renderResults(container, route);
      }
    });

    if (activeDataChangedHandler)
      document.removeEventListener("app:data-changed", activeDataChangedHandler);
    activeDataChangedHandler = () => renderResults(container, route);
    document.addEventListener("app:data-changed", activeDataChangedHandler);
  }

  let activeDataChangedHandler = null;

  App.Views = App.Views || {};
  App.Views.browse = (container, route) =>
    App.ErrorHandler.guard(container, "Browse", () => render(container, route));
  App.Views.university = App.Views.browse;
  App.Views.subject = App.Views.browse;
})((window.App = window.App || {}));
