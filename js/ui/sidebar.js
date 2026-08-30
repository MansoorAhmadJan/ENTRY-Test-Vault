/* ============================================================
   Sidebar. Renders once into #sidebar-root; re-render on route
   change (cheap — it's a short list) to update the active state
   and live counts (favorites/bookmarks/in-progress badges).
   ============================================================ */
(function (App) {
  "use strict";

  function countFor(key) {
    switch (key) {
      case "all":
        return App.Data.count();
      case "favorites":
        return App.Storage.getFavorites().length;
      case "bookmarks":
        return App.Storage.getBookmarks().length;
      case "queue":
        return App.Storage.getReadingQueue().length;
      case "inProgress":
        return Object.values(App.Storage.getProgressMap()).filter((s) => s === "In Progress")
          .length;
      default:
        return null;
    }
  }

  function navItemHtml(item, activeRoute) {
    const count = item.countKey ? countFor(item.countKey) : null;
    const isActive = activeRoute === item.route;
    return `
      <div class="nav-item ${isActive ? "active" : ""}" data-route="${item.route}" role="link" tabindex="0" aria-current="${isActive ? "page" : "false"}">
        <span class="nav-icon">${App.Icons.get(item.icon)}</span>
        <span class="nav-label">${item.label}</span>
        ${count !== null ? `<span class="nav-count">${count}</span>` : ""}
      </div>`;
  }

  function uniItemHtml(uni, activeRoute, activeParams) {
    const isActive = activeRoute === "university" && activeParams && activeParams.key === uni.key;
    const count = App.Data.getByUniversity(uni.key).length;
    return `
      <div class="nav-item ${isActive ? "active" : ""}" data-route="university" data-key="${uni.key}" role="link" tabindex="0">
        <span class="nav-icon">${App.Icons.get("layers")}</span>
        <span class="nav-label">${uni.label}</span>
        <span class="nav-count">${count}</span>
      </div>`;
  }

  function render(route) {
    const root = document.getElementById("sidebar-root");
    if (!root) return;

    let mainSection = "";
    let workspaceSection = "";
    let insightsSection = "";
    let systemSection = "";
    App.Config.NAV_ITEMS.forEach((item) => {
      const html = navItemHtml(item, route.view);
      if (item.section === "Workspace") workspaceSection += html;
      else if (item.section === "Insights") insightsSection += html;
      else if (item.section === "System") systemSection += html;
      else mainSection += html;
    });

    const uniSection = App.Config.UNIVERSITY_NAV.map((u) =>
      uniItemHtml(u, route.view, route.params)
    ).join("");

    root.innerHTML = `
      <div class="sidebar-brand">
        <div class="brand-mark">ETV</div>
        <div class="brand-text">
          <strong>Knowledge Vault</strong>
          <span>${App.Data.count()} resources</span>
        </div>
      </div>
      <nav class="sidebar-nav" aria-label="Primary">
        <div class="nav-section-label">Vault</div>
        ${mainSection}
        <div class="nav-section-label">Workspace</div>
        ${workspaceSection}
        <div class="nav-section-label">Universities</div>
        ${uniSection}
        <div class="nav-section-label">Insights</div>
        ${insightsSection}
        <div class="nav-section-label">System</div>
        ${systemSection}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-version">
          Vault v${App.Data.getMeta().sourceVersion} · Dashboard v${App.BuildInfo.version}
        </div>
      </div>
    `;
  }

  function bindOnce() {
    const root = document.getElementById("sidebar-root");
    if (!root || root.dataset.bound) return;
    root.dataset.bound = "1";
    const go = (target) => {
      const route = target.getAttribute("data-route");
      const key = target.getAttribute("data-key");
      if (route === "university" && key) App.Router.navigate(`university/${key}`);
      else App.Router.navigate(route);
      // On tablet, close the drawer after navigating.
      const shell = document.querySelector(".app-shell");
      if (shell) shell.classList.remove("sidebar-open");
    };
    App.Dom.delegate(root, "click", ".nav-item", go);
    App.Dom.delegate(root, "keydown", ".nav-item", (target, e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        go(target);
      }
    });
  }

  App.Components = App.Components || {};
  App.Components.renderSidebar = (route) => {
    bindOnce();
    App.ErrorHandler.guard(document.getElementById("sidebar-root"), "sidebar", () => render(route));
  };
})((window.App = window.App || {}));
