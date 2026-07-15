/* ============================================================
   Generic helpers. Pure functions only — nothing here touches
   App.Data/Storage/etc, so this module has zero dependencies
   and can load anywhere in the script order.
   ============================================================ */
(function (App) {
  "use strict";

  function debounce(fn, wait) {
    let t = null;
    return function debounced(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function groupBy(list, keyFn) {
    const map = new Map();
    list.forEach((item) => {
      const key = keyFn(item);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }

  function countBy(list, keyFn) {
    const map = new Map();
    list.forEach((item) => {
      const key = keyFn(item);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  // Small, dependency-free unique id for DOM element ids (not resource IDs).
  function uid(prefix) {
    return (prefix || "id") + "-" + Math.random().toString(36).slice(2, 9);
  }

  function isEmpty(v) {
    if (v === null || v === undefined) return true;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "string") return v.trim() === "";
    return false;
  }

  App.Utils = App.Utils || {};
  Object.assign(App.Utils, { debounce, escapeHtml, groupBy, countBy, clamp, uid, isEmpty });
})((window.App = window.App || {}));
