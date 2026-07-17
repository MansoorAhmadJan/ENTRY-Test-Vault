/* ============================================================
   Router
   Hash-based (works from file://, no server needed). Routes:
     #/home
     #/browse                      -> all resources, filters/search apply
     #/university/:key             -> pre-filtered to one university
     #/subject/:name               -> pre-filtered to one subject
     #/favorites
     #/bookmarks
     #/progress
     #/stats
     #/diagnostics                 -> vault data-integrity report (added V4.2)
     #/queue                        -> reading queue (drag to reorder)
     #/goals                        -> daily/weekly study goals (V5.0)
     #/notes                        -> aggregate view of all your saved notes (V5.0)
     #/settings
     #/resource/:id                -> opens the resource modal over current view
   ============================================================ */
(function (App) {
  "use strict";

  let onChange = null;

  function parseHash() {
    const hash = window.location.hash.replace(/^#\/?/, "");
    const parts = hash.split("/").filter(Boolean).map(decodeURIComponent);
    if (parts.length === 0) return { view: "home", params: {} };

    const view = parts[0];
    switch (view) {
      case "university":
        return { view: "university", params: { key: parts[1] } };
      case "subject":
        return { view: "subject", params: { name: parts[1] } };
      case "resource":
        return { view: "resource", params: { id: parts[1] } };
      case "browse":
      case "favorites":
      case "bookmarks":
      case "progress":
      case "stats":
      case "settings":
      case "diagnostics":
      case "queue":
      case "goals":
      case "notes":
        return { view, params: {} };
      default:
        return { view: "home", params: {} };
    }
  }

  function navigate(path) {
    window.location.hash = path;
  }

  function init(handler) {
    onChange = handler;
    window.addEventListener("hashchange", () => onChange(parseHash()));
    onChange(parseHash());
  }

  function current() {
    return parseHash();
  }

  App.Router = { init, navigate, current };
})((window.App = window.App || {}));
