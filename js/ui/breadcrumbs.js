/* ============================================================
   Breadcrumbs. Pure function of the current route — no state of
   its own, so it can't drift out of sync with what's on screen.
   ============================================================ */
(function (App) {
  "use strict";

  const LABELS = {
    home: "Dashboard",
    browse: "Browse All",
    favorites: "Favorites",
    bookmarks: "Bookmarks",
    progress: "Progress Tracker",
    stats: "Statistics",
    diagnostics: "Diagnostics",
    settings: "Settings",
  };

  function trailFor(route) {
    const trail = [{ label: "Dashboard", path: "home" }];
    if (route.view === "home") return trail;
    if (route.view === "university") {
      const uni = App.Data.getUniversity(route.params.key);
      trail.push({ label: "Browse All", path: "browse" });
      trail.push({ label: uni ? uni.label : route.params.key, current: true });
      return trail;
    }
    if (route.view === "subject") {
      trail.push({ label: "Browse All", path: "browse" });
      trail.push({ label: route.params.name, current: true });
      return trail;
    }
    trail.push({ label: LABELS[route.view] || route.view, current: true });
    return trail;
  }

  function render(route) {
    const root = document.getElementById("breadcrumbs-root");
    if (!root) return;
    const trail = trailFor(route);
    root.innerHTML = trail
      .map((step, i) => {
        const isLast = i === trail.length - 1;
        const sep = i > 0 ? `<span class="sep">${App.Icons.get("chevronRight")}</span>` : "";
        if (isLast || step.current)
          return `${sep}<span class="current">${App.Utils.escapeHtml(step.label)}</span>`;
        return `${sep}<a href="#/${step.path}">${App.Utils.escapeHtml(step.label)}</a>`;
      })
      .join("");
  }

  App.Components = App.Components || {};
  App.Components.renderBreadcrumbs = render;
})((window.App = window.App || {}));
