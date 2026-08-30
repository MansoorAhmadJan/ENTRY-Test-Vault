/* Applies the saved theme/contrast BEFORE first paint so there's no
   flash of the wrong theme. Externalized from index.html <head> so it
   can run under a strict CSP (script-src 'self') without needing
   'unsafe-inline'. Everything else theme-related (js/core/themeManager.js)
   runs later, after the DOM exists, and re-applies the same values —
   this duplication is intentional, see themeManager.js's header comment. */
(function () {
  try {
    var theme = localStorage.getItem("etv:theme") || "light";
    var contrast = localStorage.getItem("etv:contrast") || "normal";
    document.documentElement.setAttribute("data-theme", theme.replace(/"/g, ""));
    document.documentElement.setAttribute("data-contrast", contrast.replace(/"/g, ""));
  } catch (e) {
    /* localStorage unavailable (e.g. privacy mode) — fall back to CSS defaults */
  }
})();