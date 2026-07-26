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

  /**
   * Per-key breakdown, sorted largest-first. Same "etv:" scoping as the
   * total estimate above, so the two numbers are always consistent with
   * each other (this function's total should sum to that one's result).
   */
  function getStorageBreakdown() {
    try {
      const rows = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("etv:")) continue;
        const value = localStorage.getItem(key) || "";
        const bytes = key.length + value.length;
        rows.push({ key: key.replace(/^etv:/, ""), bytes, kb: +(bytes / 1024).toFixed(2) });
      }
      return rows.sort((a, b) => b.bytes - a.bytes);
    } catch (e) {
      return [];
    }
  }

  // Rough estimate of localStorage's practical browser ceiling — used to
  // show a "X% of typical limit" figure. 5MB is the conservative common
  // denominator across major browsers; actual limits vary by browser and
  // aren't queryable, so this is explicitly labeled as an estimate.
  const TYPICAL_LOCALSTORAGE_LIMIT_KB = 5 * 1024;
  function getStorageQuotaEstimate() {
    const usedKb = estimateLocalStorageUsageKb() || 0;
    return {
      usedKb,
      limitKb: TYPICAL_LOCALSTORAGE_LIMIT_KB,
      pct: Math.min(100, Math.round((usedKb / TYPICAL_LOCALSTORAGE_LIMIT_KB) * 100)),
    };
  }

  App.Perf = {
    mark,
    since,
    getAll,
    estimateDataSizeKb,
    estimateLocalStorageUsageKb,
    getStorageBreakdown,
    getStorageQuotaEstimate,
  };
})((window.App = window.App || {}));
