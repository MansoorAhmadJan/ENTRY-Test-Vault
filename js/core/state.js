/* ============================================================
   Central State Store
   A minimal pub/sub store — not Redux, deliberately. The dashboard
   is a document-browsing tool, not a complex app; a single mutable
   state object with subscriber callbacks is easier to maintain than
   introducing a state-management dependency for this scale of app.
   ============================================================ */
(function (App) {
  "use strict";

  const state = {
    route: { view: "home", params: {} },
    query: "",
    filters: null, // set below once Filter engine is available
    viewMode: "grid", // grid | list
    activeModalResourceId: null,
    sidebarCollapsed: false,
  };

  const listeners = new Set();

  function get() {
    return state;
  }

  function set(patch) {
    Object.assign(state, patch);
    listeners.forEach((fn) => fn(state));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  App.State = { get, set, subscribe };
})((window.App = window.App || {}));
