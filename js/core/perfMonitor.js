/* ============================================================
   Perf Monitor. Thin wrapper over the browser's Performance API
   with a graceful fallback (Date.now()) if it's unavailable.
   app.js marks the real startup milestones; this module just
   records and reports them for the Diagnostics Performance tab.
   ============================================================ */
(function (App) {
  "use strict";

  const marks = new Map(); // name -> timestamp
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  function mark(name) {
    marks.set(name, now());
  }

  function since(fromMark) {
    const start = marks.get(fromMark);
    return start !== undefined ? +(now() - start).toFixed(2) : null;
  }

  function getAll() {
    return Array.from(marks.entries()).map(([name, t]) => ({ name, t: +t.toFixed(2) }));
  }

  // Rough in-memory footprint estimate of the loaded vault data —
  // not exact (V8 object overhead isn't measured), but a useful
  // order-of-magnitude signal for "is this data getting heavy".
  function estimateDataSizeKb() {
    try {
      return +(JSON.stringify(window.VAULT_DATA).length / 1024).toFixed(1);
    } catch (e) {
      return null;
    }
  }

  function estimateLocalStorageUsageKb() {
    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("etv:"))
          total += key.length + (localStorage.getItem(key) || "").length;
      }
      return +(total / 1024).toFixed(2);
    } catch (e) {
      return null;
    }
  }

  App.Perf = { mark, since, getAll, estimateDataSizeKb, estimateLocalStorageUsageKb };
})((window.App = window.App || {}));
