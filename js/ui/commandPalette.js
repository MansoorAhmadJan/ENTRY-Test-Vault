/* ============================================================
   Command Palette (Ctrl+K). Two kinds of results in one list:
     - "Commands" (navigate, toggle theme, run diagnostics, ...)
     - "Resources" (delegates to App.Search — same engine as the
       header search box and Browse page, so ranking/fuzzy/highlight
       behavior is identical everywhere, not reimplemented here)
   This supersedes the old "Ctrl+K focuses header search" behavior
   from V4.2 — the header search box still exists for quick inline
   lookups without a modal, but Ctrl+K's job is now this palette.
   ============================================================ */
(function (App) {
  "use strict";

  let overlayEl = null;
  let activeIndex = 0;
  let currentItems = [];

  function commands() {
    const theme = App.Storage.getTheme();
    return [
      {
        type: "command",
        icon: "home",
        label: "Go to Dashboard",
        run: () => App.Router.navigate("home"),
      },
      {
        type: "command",
        icon: "grid",
        label: "Go to Browse All",
        run: () => App.Router.navigate("browse"),
      },
      {
        type: "command",
        icon: "heart",
        label: "Go to Favorites",
        run: () => App.Router.navigate("favorites"),
      },
      {
        type: "command",
        icon: "bookmark",
        label: "Go to Bookmarks",
        run: () => App.Router.navigate("bookmarks"),
      },
      {
        type: "command",
        icon: "layers",
        label: "Go to Reading Queue",
        run: () => App.Router.navigate("queue"),
      },
      {
        type: "command",
        icon: "checkCircle",
        label: "Go to Progress Tracker",
        run: () => App.Router.navigate("progress"),
      },
      {
        type: "command",
        icon: "barChart",
        label: "Go to Statistics",
        run: () => App.Router.navigate("stats"),
      },
      {
        type: "command",
        icon: "shield",
        label: "Go to Diagnostics",
        run: () => App.Router.navigate("diagnostics"),
      },
      {
        type: "command",
        icon: "settings",
        label: "Go to Settings",
        run: () => App.Router.navigate("settings"),
      },
      {
        type: "command",
        icon: theme === "dark" ? "sun" : "moon",
        label: `Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`,
        run: () => {
          App.Theme.toggleTheme();
          App.Components.updateThemeIcon();
        },
      },
      {
        type: "command",
        icon: "shield",
        label: "Toggle High Contrast",
        run: () => App.Theme.toggleContrast(),
      },
      {
        type: "command",
        icon: "checkCircle",
        label: "Re-run Diagnostics",
        run: () => App.Router.navigate("diagnostics"),
      },
      {
        type: "command",
        icon: "keyboard",
        label: "Show Keyboard Shortcuts",
        run: () => App.Components.openShortcutsModal(),
      },
    ];
  }

  function ensure() {
    if (overlayEl) return overlayEl;
    overlayEl = App.Dom.el("div", { class: "modal-overlay", id: "command-palette-overlay" });
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) close();
    });
    return overlayEl;
  }

  function itemHtml(item, i) {
    const active = i === activeIndex;
    if (item.type === "resource") {
      return `
        <div class="cp-item ${active ? "active" : ""}" data-index="${i}" role="option">
          <span class="cp-icon">${App.Icons.get("search")}</span>
          <div class="cp-item-text">
            <div class="cp-item-title">${App.Search.highlight(item.resource.title, currentQuery)}</div>
            <div class="cp-item-sub">${item.resource.id} · ${App.Utils.escapeHtml(item.resource.university)}</div>
          </div>
        </div>`;
    }
    return `
      <div class="cp-item ${active ? "active" : ""}" data-index="${i}" role="option">
        <span class="cp-icon">${App.Icons.get(item.icon)}</span>
        <div class="cp-item-text"><div class="cp-item-title">${App.Utils.escapeHtml(item.label)}</div></div>
        <span class="cp-item-tag">Command</span>
      </div>`;
  }

  let currentQuery = "";

  function computeItems(query) {
    currentQuery = query;
    if (!query.trim()) {
      const history = App.Storage.getSearchHistory()
        .slice(0, 5)
        .map((q) => ({
          type: "command",
          icon: "search",
          label: `Search "${q}"`,
          run: () => renderList(q),
        }));
      return [...commands().slice(0, 6), ...history];
    }
    const matchedCommands = commands().filter((c) =>
      c.label.toLowerCase().includes(query.toLowerCase())
    );
    const matchedResources = App.Search.search(query, 8).map((r) => ({
      type: "resource",
      resource: r,
    }));
    return [...matchedCommands, ...matchedResources];
  }

  function renderList(query) {
    const input = overlayEl.querySelector("#cp-input");
    if (input && input.value !== query) input.value = query;
    currentItems = computeItems(query);
    activeIndex = 0;
    const listHost = overlayEl.querySelector("#cp-list");
    listHost.innerHTML = currentItems.length
      ? currentItems.map(itemHtml).join("")
      : `<div class="sd-empty">No matches. Press Enter to search "${App.Utils.escapeHtml(query)}" in Browse.</div>`;
  }

  function runItem(item) {
    if (!item) return;
    if (item.type === "resource") {
      App.Components.openResourceModal(item.resource.id);
      App.Storage.pushSearchHistory(currentQuery);
    } else if (item.run) {
      item.run();
    }
    close();
  }

  function open() {
    ensure();
    overlayEl.innerHTML = `
      <div class="modal command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div class="cp-search-row">
          ${App.Icons.get("search")}
          <input id="cp-input" type="text" placeholder="Search resources or type a command…" autocomplete="off" aria-label="Command palette input" />
          <span class="kbd-hint">Esc</span>
        </div>
        <div id="cp-list" class="cp-list" role="listbox"></div>
        <div class="cp-footer">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>Enter</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>`;
    overlayEl.classList.add("open");
    App.FocusTrap.trap(overlayEl);
    renderList("");

    const input = overlayEl.querySelector("#cp-input");
    input.focus();
    const debouncedRender = App.Utils.debounce((v) => renderList(v), 80);
    input.addEventListener("input", (e) => debouncedRender(e.target.value));

    overlayEl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        move(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        move(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (currentItems.length) runItem(currentItems[activeIndex]);
        else if (input.value.trim()) {
          App.Storage.pushSearchHistory(input.value.trim());
          App.Router.navigate("browse");
          App.State.set({ pendingBrowseQuery: input.value.trim() });
          close();
        }
      }
    });
    App.Dom.delegate(overlayEl, "click", ".cp-item", (el) =>
      runItem(currentItems[Number(el.getAttribute("data-index"))])
    );
    App.Dom.delegate(overlayEl, "mouseenter", ".cp-item", (el) => {
      activeIndex = Number(el.getAttribute("data-index"));
      App.Dom.qsa(".cp-item", overlayEl).forEach((n) => n.classList.remove("active"));
      el.classList.add("active");
    });
  }

  function move(delta) {
    if (!currentItems.length) return;
    activeIndex = App.Utils.clamp(activeIndex + delta, 0, currentItems.length - 1);
    App.Dom.qsa(".cp-item", overlayEl).forEach((n) => n.classList.remove("active"));
    const el = overlayEl.querySelector(`.cp-item[data-index="${activeIndex}"]`);
    if (el) {
      el.classList.add("active");
      el.scrollIntoView({ block: "nearest" });
    }
  }

  function close() {
    if (overlayEl) overlayEl.classList.remove("open");
    App.FocusTrap.release();
  }
  function isOpen() {
    return !!(overlayEl && overlayEl.classList.contains("open"));
  }

  App.Components = App.Components || {};
  App.Components.openCommandPalette = open;
  App.Components.closeCommandPalette = close;
  App.Components.isCommandPaletteOpen = isOpen;
})((window.App = window.App || {}));
