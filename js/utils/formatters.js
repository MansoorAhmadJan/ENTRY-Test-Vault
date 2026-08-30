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

  /**
   * Parses the vault's free-text `estTime` field (e.g. "2–3 hrs per paper
   * attempt", "20+ hrs (full video course)", "0.5–1 hr (reading)") into an
   * approximate numeric hours range. Returns null for anything that
   * doesn't match a recognizable pattern — analytics code MUST treat null
   * as "unknown", not silently drop it to 0, since 0 hours is a false
   * claim of precision the source data doesn't have.
   *
   * Deliberately simple: this is a best-effort approximation for
   * dashboard summaries, not a claim that the vault has structured time
   * data (it doesn't — see docs/V5_DEFERRED_SCOPE.md item 5).
   */
  function parseEstTime(str) {
    if (!str) return null;
    // Matches "2–3", "2-3", "20+", "0.5–1" — en-dash or hyphen, optional "+".
    const m = String(str).match(/(\d+(?:\.\d+)?)\s*(?:[–-]\s*(\d+(?:\.\d+)?))?\s*(\+)?\s*hrs?/i);
    if (!m) return null;
    const min = parseFloat(m[1]);
    const max = m[2] ? parseFloat(m[2]) : m[3] ? null : min; // "X+" -> max unknown; plain "X" -> max=min
    const avg = max !== null ? (min + max) / 2 : min; // open-ended: report the stated minimum, not a guessed ceiling
    return { min, max, avg, openEnded: !!m[3] };
  }

  App.Formatters = { starRating, truncate, pluralize, formatDate, badgeClass, parseEstTime };
})((window.App = window.App || {}));
