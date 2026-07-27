/* ============================================================
   App Bootstrap (V4.2). Loads last, after every other module.
   Responsible for: init order, mounting the app shell, wiring
   the router to the view registry (App.Views.*), and global
   keyboard shortcuts. The V4.1 diagnostic self-test this file
   used to run now lives permanently at #/diagnostics (System
   Health tab) instead of being the whole landing page.
   ============================================================ */
(function (App) {
  "use strict";

  function renderShell() {
    const root = document.getElementById("app-root");
    root.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar" id="sidebar-root" aria-label="Sidebar navigation"></aside>
        <header class="app-header" id="header-root"></header>
        <main class="app-main" id="app-main">
          <div class="view-container">
            <nav class="breadcrumbs" id="breadcrumbs-root" aria-label="Breadcrumb"></nav>
            <div id="view-root"></div>
          </div>
        </main>
      </div>
    `;
    if (App.Storage.getPrefs().sidebarCollapsed) {
      root.querySelector(".app-shell").classList.add("sidebar-collapsed");
    }
  }

  function renderView(route) {
    const container = document.getElementById("view-root");
    const handler = App.Views[route.view];
    if (route.view === "resource") {
      // Deep-link support: if view-root is empty (fresh load on a #/resource/:id
      // hash), render Home underneath first so the modal has something to sit over.
      if (!container.innerHTML.trim()) App.Views.home(container);
      App.Components.openResourceModal(route.params.id);
      return;
    }
    if (!handler) {
      container.innerHTML = `<div class="empty-state">${App.Icons.get("inbox")}<p>Unknown view "${App.Utils.escapeHtml(route.view)}"</p></div>`;
      return;
    }
    handler(container, route);
  }

  function onRouteChange(route) {
    App.State.set({ route });
    App.ErrorHandler.guard(document.getElementById("sidebar-root"), "sidebar", () =>
      App.Components.renderSidebar(route)
    );
    App.ErrorHandler.guard(document.getElementById("breadcrumbs-root"), "breadcrumbs", () =>
      App.Components.renderBreadcrumbs(route)
    );
    renderView(route);
  }

  // ---------------- Keyboard shortcuts ----------------
  // Matches App.Config.SHORTCUTS. Chord shortcuts ("g h") wait up to
  // 600ms for the second key; mod+k and single-key shortcuts fire immediately.
  function installShortcuts() {
    let pendingChord = null;
    let chordTimer = null;

    function isTypingTarget(e) {
      const tag = (e.target.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || e.target.isContentEditable;
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (App.Components.isCommandPaletteOpen()) App.Components.closeCommandPalette();
        else if (App.Components.isShortcutsModalOpen()) App.Components.closeShortcutsModal();
        else if (App.Components.isResourceModalOpen()) App.Components.closeResourceModal();
        return;
      }
      if (isTypingTarget(e) && !(e.key === "k" && (e.ctrlKey || e.metaKey))) return;

      if (e.key === "k" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        App.Components.openCommandPalette();
        return;
      }
      if (e.key === "?" && !e.shiftKey === false) {
        // "?" is Shift+/ on most layouts; e.key is reliably "?" though.
      }
      if (e.key === "?") {
        e.preventDefault();
        App.Components.openShortcutsModal();
        return;
      }
      if (pendingChord === "g") {
        clearTimeout(chordTimer);
        pendingChord = null;
        const map = { h: "home", b: "browse", f: "favorites", s: "stats" };
        if (map[e.key]) {
          e.preventDefault();
          App.Router.navigate(map[e.key]);
        }
        return;
      }
      if (e.key === "g") {
        pendingChord = "g";
        chordTimer = setTimeout(() => {
          pendingChord = null;
        }, 600);
      }
    });
  }

  function init() {
    App.Perf.mark("boot:start");
    App.ErrorHandler.installGlobalHandlers();
    App.Theme.init();

    try {
      App.Data.init();
      App.Perf.mark("boot:dataReady");
      App.Search.build();
      App.Perf.mark("boot:searchIndexed");
    } catch (err) {
      // Data layer failed to load — this is unrecoverable (no resources to show),
      // so show a full-page error instead of a broken shell.
      document.getElementById("app-root").innerHTML = `
        <div class="diagnostics-page">
          <div class="empty-state" role="alert">
            ${App.Icons.get("alertTriangle")}
            <p><strong>The vault data failed to load.</strong></p>
            <p style="font-size:13px;">${App.Utils.escapeHtml(String((err && err.message) || err))}</p>
            <p style="font-size:12px;color:var(--text-muted);margin-top:var(--sp-3);">
              Check that data/vault-data.js is present and loaded before this script. See docs/INSTALLATION.md.
            </p>
          </div>
        </div>`;
      console.error("[App.init] fatal:", err);
      return;
    }

    renderShell();
    App.Components.renderHeader();
    App.Components.bindHeader((id) => App.Components.openResourceModal(id));
    installShortcuts();
    App.Router.init(onRouteChange);
    App.Perf.mark("boot:firstRouteRendered");
    registerServiceWorkerIfSupported();

    // V6.0 fix: sidebar nav-item badges (Favorites/Queue/etc. counts) only
    // updated on navigation before this — toggling a favorite while
    // staying on the same page left the sidebar showing a stale count
    // until the next route change. Registered ONCE here (not inside
    // renderSidebar, which runs on every navigation) so this doesn't
    // accumulate duplicate listeners the way a per-render registration
    // would.
    document.addEventListener("app:data-changed", () => {
      App.ErrorHandler.guard(document.getElementById("sidebar-root"), "sidebar", () =>
        App.Components.renderSidebar(App.State.get().route)
      );
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 900)
        document.querySelector(".app-shell").classList.remove("sidebar-open");
    });
  }

  // PWA support (V4.3) — see sw.js header comment for the file:// scope note.
  function registerServiceWorkerIfSupported() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("sw.js").catch((err) => {
      App.ErrorHandler.record("service worker registration", err);
    });
  }

  document.addEventListener("DOMContentLoaded", init);
  App.init = init; // exposed for manual re-run from the console during development
})((window.App = window.App || {}));
