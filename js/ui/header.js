/* ============================================================
   Header. Owns the global instant-search box (Objective #2) —
   search here is separate from the Browse page's inline search;
   this one is a fast jump-to-resource dropdown available from
   anywhere in the app.
   ============================================================ */
(function (App) {
  "use strict";

  function resultItemHtml(r, q) {
    return `
      <div class="sd-item" data-id="${r.id}" role="option" tabindex="-1">
        <div class="sd-title">${App.Search.highlight(r.title, q)}</div>
        <div class="sd-meta">${r.id} · ${App.Utils.escapeHtml(r.university)} · ${App.Utils.escapeHtml(r.subject)}</div>
      </div>`;
  }

  function historyItemHtml(q) {
    return `<div class="sd-history-item" data-history="${App.Utils.escapeHtml(q)}">${App.Icons.get("clock")}<span>${App.Utils.escapeHtml(q)}</span></div>`;
  }
  function suggestionItemHtml(s) {
    return `<div class="sd-history-item" data-suggestion="${App.Utils.escapeHtml(s.term)}">${App.Icons.get("search")}<span>${App.Utils.escapeHtml(s.term)}</span><span style="margin-left:auto;font-size:11px;color:var(--text-muted);">${s.count}</span></div>`;
  }

  function renderEmptyDropdown(dropdown) {
    const history = App.Storage.getSearchHistory().slice(0, 6);
    if (!history.length) {
      dropdown.classList.remove("open");
      return;
    }
    dropdown.innerHTML = `<div class="sd-section-label">Recent Searches</div>${history.map(historyItemHtml).join("")}`;
    dropdown.classList.add("open");
  }

  function render() {
    const root = document.getElementById("header-root");
    if (!root) return;
    root.innerHTML = `
      <button class="sidebar-toggle" id="sidebar-toggle-btn" aria-label="Toggle sidebar">${App.Icons.get("menu")}</button>
      <div class="header-search">
        <div class="search-box">
          ${App.Icons.get("search")}
          <input type="text" id="global-search-input" placeholder="Search titles, tags, IDs, subjects…" aria-label="Global search" autocomplete="off" />
          <button class="clear-btn" id="global-search-clear" style="display:none;" aria-label="Clear search">${App.Icons.get("x")}</button>
        </div>
        <div class="search-dropdown" id="global-search-dropdown" role="listbox"></div>
      </div>
      <div class="header-actions">
        <button class="icon-btn" id="command-palette-btn" title="Command palette (Ctrl K)" aria-label="Open command palette">${App.Icons.get("command")}</button>
        <button class="icon-btn" id="contrast-toggle-btn" title="Toggle high contrast" aria-label="Toggle high contrast">${App.Icons.get("shield")}</button>
        <button class="icon-btn" id="theme-toggle-btn" title="Toggle dark mode" aria-label="Toggle dark mode"></button>
        <button class="icon-btn" id="shortcuts-btn" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts">${App.Icons.get("keyboard")}</button>
      </div>
    `;
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const btn = document.getElementById("theme-toggle-btn");
    if (!btn) return;
    btn.innerHTML =
      App.Storage.getTheme() === "dark" ? App.Icons.get("sun") : App.Icons.get("moon");
  }

  function closeDropdown() {
    const dd = document.getElementById("global-search-dropdown");
    if (dd) dd.classList.remove("open");
  }

  function bind(onOpenResource) {
    const root = document.getElementById("header-root");
    if (!root || root.dataset.bound) return;
    root.dataset.bound = "1";

    document.getElementById("sidebar-toggle-btn").addEventListener("click", () => {
      const shell = document.querySelector(".app-shell");
      if (window.innerWidth <= 900) shell.classList.toggle("sidebar-open");
      else {
        shell.classList.toggle("sidebar-collapsed");
        App.Storage.setPrefs({ sidebarCollapsed: shell.classList.contains("sidebar-collapsed") });
      }
    });

    document
      .getElementById("command-palette-btn")
      .addEventListener("click", () => App.Components.openCommandPalette());
    document.getElementById("theme-toggle-btn").addEventListener("click", () => {
      App.Theme.toggleTheme();
      updateThemeIcon();
    });
    document.getElementById("contrast-toggle-btn").addEventListener("click", () => {
      const now = App.Theme.toggleContrast();
      App.Toast.show(`High contrast ${now === "high" ? "on" : "off"}`, "info");
    });
    document
      .getElementById("shortcuts-btn")
      .addEventListener("click", () => App.Components.openShortcutsModal());

    const input = document.getElementById("global-search-input");
    const dropdown = document.getElementById("global-search-dropdown");
    const clearBtn = document.getElementById("global-search-clear");

    const runSearch = App.Utils.debounce(() => {
      const q = input.value.trim();
      clearBtn.style.display = q ? "flex" : "none";
      if (!q) {
        renderEmptyDropdown(dropdown);
        return;
      }
      const results = App.ErrorHandler.safeCall("global search", () => App.Search.search(q, 8), []);
      const suggestions =
        q.length >= 2 && q.length <= 6
          ? App.ErrorHandler.safeCall("suggestions", () => App.Search.getSuggestions(q, 4), [])
          : [];
      let html = "";
      if (suggestions.length)
        html += `<div class="sd-section-label">Suggestions</div>${suggestions.map(suggestionItemHtml).join("")}`;
      if (!results.length) {
        html += `<div class="sd-empty">No resources match "${App.Utils.escapeHtml(q)}"</div>`;
      } else {
        html +=
          (suggestions.length ? `<div class="sd-section-label">Resources</div>` : "") +
          results.map((r) => resultItemHtml(r, q)).join("") +
          `<div class="sd-footer">${results.length} result${results.length === 1 ? "" : "s"} · Enter to open first result</div>`;
      }
      dropdown.innerHTML = html;
      dropdown.classList.add("open");
    }, 120);

    input.addEventListener("focus", () => {
      if (!input.value.trim()) renderEmptyDropdown(dropdown);
    });
    input.addEventListener("input", runSearch);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = dropdown.querySelector(".sd-item");
        if (first) {
          App.Storage.pushSearchHistory(input.value.trim());
          onOpenResource(first.getAttribute("data-id"));
        }
        closeDropdown();
      } else if (e.key === "Escape") {
        closeDropdown();
        input.blur();
      }
    });
    App.Dom.delegate(dropdown, "click", ".sd-item", (item) => {
      App.Storage.pushSearchHistory(input.value.trim());
      onOpenResource(item.getAttribute("data-id"));
      closeDropdown();
      input.value = "";
      clearBtn.style.display = "none";
    });
    App.Dom.delegate(dropdown, "click", "[data-history]", (item) => {
      input.value = item.getAttribute("data-history");
      runSearch();
      input.focus();
    });
    App.Dom.delegate(dropdown, "click", "[data-suggestion]", (item) => {
      input.value = item.getAttribute("data-suggestion");
      runSearch();
      input.focus();
    });
    clearBtn.addEventListener("click", () => {
      input.value = "";
      clearBtn.style.display = "none";
      closeDropdown();
      input.focus();
    });
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) closeDropdown();
    });
  }

  function focusSearch() {
    const input = document.getElementById("global-search-input");
    if (input) input.focus();
  }

  App.Components = App.Components || {};
  App.Components.renderHeader = render;
  App.Components.bindHeader = bind;
  App.Components.focusGlobalSearch = focusSearch;
  App.Components.updateThemeIcon = updateThemeIcon;
})((window.App = window.App || {}));
