/* ============================================================
   Fuzzy Match. Pure algorithm, no dependencies — kept separate
   from searchEngine.js so the core exact/substring search path
   (fast, and already correct) never has to import or reason
   about edit-distance code unless it actually falls back to it.
   ============================================================ */
(function (App) {
  "use strict";

  // Classic Levenshtein distance with O(min(a,b)) memory (two rolling rows).
  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let prev = new Array(b.length + 1);
    let curr = new Array(b.length + 1);
    for (let j = 0; j <= b.length; j++) prev[j] = j;
    for (let i = 1; i <= a.length; i++) {
      curr[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      [prev, curr] = [curr, prev];
    }
    return prev[b.length];
  }

  // How many edits count as "close enough" scales with word length —
  // 1 typo in a 4-letter word is a lot; 1 typo in a 12-letter word is nothing.
  function maxAllowedDistance(len) {
    if (len <= 4) return 1;
    if (len <= 8) return 2;
    return 3;
  }

  function isCloseMatch(a, b) {
    if (!a || !b) return false;
    if (Math.abs(a.length - b.length) > maxAllowedDistance(Math.max(a.length, b.length)))
      return false;
    return levenshtein(a, b) <= maxAllowedDistance(Math.max(a.length, b.length));
  }

  App.FuzzyMatch = { levenshtein, isCloseMatch, maxAllowedDistance };
})((window.App = window.App || {}));
