/* ============================================================
   Central configuration. App-level behavior/wiring lives here —
   NOT data enums (those are js/utils/constants.js) and NOT user
   preferences (those are js/storage/storageService.js). This is
   the one file to edit to change nav structure, add a route, or
   rebind a keyboard shortcut.
   ============================================================ */
(function (App) {
  "use strict";

  const APP_NAME = "Entry-Test Knowledge Vault";
  const APP_VERSION = "4.2.0";
  const SOURCE_VAULT_VERSION = "3.0";

  // Primary sidebar navigation. `route` matches App.Router views;
  // `countKey` (optional) tells the sidebar renderer how to compute
  // a live badge count without hardcoding logic per item.
  const NAV_ITEMS = [
    { route: "home", label: "Dashboard", icon: "home" },
    { route: "browse", label: "Browse All", icon: "grid", countKey: "all" },
    { route: "favorites", label: "Favorites", icon: "heart", countKey: "favorites" },
    { route: "bookmarks", label: "Bookmarks", icon: "bookmark", countKey: "bookmarks" },
    { route: "queue", label: "Reading Queue", icon: "layers", countKey: "queue" },
    { route: "goals", label: "Study Goals", icon: "checkCircle", section: "Workspace" },
    { route: "notes", label: "My Notes", icon: "note", section: "Workspace" },
    { route: "progress", label: "Progress Tracker", icon: "checkCircle", countKey: "inProgress" },
    { route: "analytics", label: "Learning Analytics", icon: "barChart", section: "Insights" },
    { route: "stats", label: "Statistics", icon: "barChart", section: "Insights" },
    { route: "diagnostics", label: "Diagnostics", icon: "shield", section: "Insights" },
    { route: "settings", label: "Settings", icon: "settings", section: "System" },
  ];

  const UNIVERSITY_NAV = [
    { key: "GIKI", label: "GIKI" },
    { key: "NUST", label: "NUST / NET" },
    { key: "FAST", label: "FAST-NUCES" },
    { key: "ECAT", label: "ECAT / UET" },
    { key: "PIEAS", label: "PIEAS" },
    { key: "NTS_NAT", label: "NTS / NAT" },
    { key: "SHARED", label: "Shared Resources" },
  ];

  // Keyboard shortcuts. `combo` uses the format checked by app.js's
  // global keydown listener: "mod+k" means Ctrl/Cmd+K.
  const SHORTCUTS = [
    { combo: "mod+k", label: "Open command palette", action: "open-palette" },
    { combo: "g h", label: "Go to Dashboard", action: "goto:home" },
    { combo: "g b", label: "Go to Browse All", action: "goto:browse" },
    { combo: "g f", label: "Go to Favorites", action: "goto:favorites" },
    { combo: "g s", label: "Go to Statistics", action: "goto:stats" },
    { combo: "?", label: "Show keyboard shortcuts", action: "show-shortcuts" },
    { combo: "escape", label: "Close modal / dropdown", action: "close-overlay" },
  ];

  const PAGE_SIZE = 60; // resources rendered per "page" in Browse — see docs/ARCHITECTURE.md § Scalability

  App.Config = {
    APP_NAME,
    APP_VERSION,
    SOURCE_VAULT_VERSION,
    NAV_ITEMS,
    UNIVERSITY_NAV,
    SHORTCUTS,
    PAGE_SIZE,
  };
})((window.App = window.App || {}));
