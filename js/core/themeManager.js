/* ============================================================
   Theme Manager. Toggles [data-theme] and [data-contrast] on
   <html> — the actual color values live entirely in
   css/variables.css, this module only flips the attributes and
   persists the choice. Applying the saved theme happens twice:
   once inline in index.html's <head> (before first paint, to
   avoid a flash of the wrong theme) and once here (so the UI —
   e.g. a theme toggle button's pressed state — can react to it).
   ============================================================ */
(function (App) {
  "use strict";

  const THEMES = ["light", "dark"];
  const CONTRASTS = ["normal", "high"];

  function apply(theme, contrast) {
    const root = document.documentElement;
    root.setAttribute("data-theme", THEMES.includes(theme) ? theme : "light");
    root.setAttribute("data-contrast", CONTRASTS.includes(contrast) ? contrast : "normal");
  }

  function init() {
    apply(App.Storage.getTheme(), App.Storage.getContrast());
  }

  function setTheme(theme) {
    App.Storage.setTheme(theme);
    apply(theme, App.Storage.getContrast());
    App.State && App.State.set({ theme });
  }

  function toggleTheme() {
    const next = App.Storage.getTheme() === "dark" ? "light" : "dark";
    setTheme(next);
    return next;
  }

  function setContrast(contrast) {
    App.Storage.setContrast(contrast);
    apply(App.Storage.getTheme(), contrast);
    App.State && App.State.set({ contrast });
  }

  function toggleContrast() {
    const next = App.Storage.getContrast() === "high" ? "normal" : "high";
    setContrast(next);
    return next;
  }

  App.Theme = {
    init,
    apply,
    setTheme,
    toggleTheme,
    setContrast,
    toggleContrast,
    THEMES,
    CONTRASTS,
  };
})((window.App = window.App || {}));
