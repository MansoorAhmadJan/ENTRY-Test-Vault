/* ============================================================
   Formatters — turn raw data values into display strings/markup.
   No DOM dependency; returns strings the UI layer inserts.
   ============================================================ */
(function (App) {
  "use strict";

  function starRating(priority, max) {
    max = max || 5;
    const filled = App.Utils.clamp(Number(priority) || 0, 0, max);
    let html = "";
    for (let i = 0; i < max; i++) {
      html += i < filled ? "★" : '<span class="dim">★</span>';
    }
    return html;
  }

  function truncate(str, len) {
    if (!str) return "";
    if (str.length <= len) return str;
    return str.slice(0, len - 1).trimEnd() + "…";
  }

  function pluralize(n, singular, plural) {
    return n === 1 ? singular : plural || singular + "s";
  }

  function formatDate(isoDate) {
    if (!isoDate) return "—";
    try {
      const d = new Date(isoDate + "T00:00:00");
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (e) {
      return isoDate;
    }
  }

  // Badge color class for a given semantic value, using the badge-* classes in components.css.
  const BADGE_COLOR = {
    // difficulty
    Beginner: "badge-green",
    Intermediate: "badge-blue",
    Advanced: "badge-red",
    // quality
    Excellent: "badge-green",
    Good: "badge-blue",
    Average: "badge-amber",
    // verification status
    Verified: "badge-green",
    Outdated: "badge-amber",
    Broken: "badge-red",
    "Needs Review": "badge-grey",
    // progress status
    "Not Started": "badge-grey",
    "In Progress": "badge-amber",
    Completed: "badge-green",
    "Revision Needed": "badge-red",
  };
  function badgeClass(value) {
    return BADGE_COLOR[value] || "badge-grey";
  }

  App.Formatters = { starRating, truncate, pluralize, formatDate, badgeClass };
})((window.App = window.App || {}));
