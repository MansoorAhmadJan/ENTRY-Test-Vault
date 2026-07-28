/* ============================================================
   Storage Service
   Every localStorage read/write in the app goes through here.
   Keys are namespaced (etv:*) so this app never collides with
   anything else that might share a browser profile. All reads
   are defensive — corrupted/missing data never throws, it just
   falls back to a sane default, so a bad localStorage entry
   can't crash the whole dashboard.
   ============================================================ */
(function (App) {
  "use strict";

  const NS = "etv:"; // Entry Test Vault
  const KEYS = {
    theme: NS + "theme",
    contrast: NS + "contrast",
    favorites: NS + "favorites",
    bookmarks: NS + "bookmarks",
    progress: NS + "progress", // { [resourceId]: "Not Started"|"In Progress"|"Completed"|"Revision Needed" }
    notes: NS + "notes", // { [resourceId]: "free text" }
    recentlyViewed: NS + "recentlyViewed", // [resourceId, ...] most recent first
    viewCounts: NS + "viewCounts", // { [resourceId]: number } — total opens, for "most used" stats
    prefs: NS + "prefs", // { sidebarCollapsed, viewMode, lastFilters }
    searchHistory: NS + "searchHistory", // [query, ...] most recent first, capped
    savedSearches: NS + "savedSearches", // [{ id, name, query, filters }]
    filterPresets: NS + "filterPresets", // [{ id, name, filters }]
    readingQueue: NS + "readingQueue", // [resourceId, ...] user-ordered
    goals: NS + "goals", // { dailyTarget, weeklyTarget } — resource-completion counts (V5.0)
    completionEvents: NS + "completionEvents", // [{ id, date: "YYYY-MM-DD" }, ...] — one per transition INTO "Completed" (V5.0)
    activityLog: NS + "activityLog", // [{ type: "note"|"queue-add"|"queue-remove", id, date, ts }] — Timeline feed (V5.1)
    aiSettings: NS + "aiSettings", // { enabled, activeProvider, endpoint, model, temperature, maxTokens, cacheEnabled } (V5.3)
    aiApiKeys: NS + "aiApiKeys", // { [providerId]: apiKey } — SENSITIVE, lives in sessionStorage not localStorage (V6.0.1), see SENSITIVE_KEY_NAMES below
  };

  // Keys that must NEVER be included in exportAll()'s output, and that
  // live in sessionStorage instead of localStorage. An API key ending up
  // inside a "backup" JSON file someone shares, uploads, or commits to a
  // repo by accident is a real, common leak vector — this is enforced
  // structurally (exportAll loops over KEYS but explicitly skips anything
  // in this list; clearAll routes these to sessionStorage.removeItem)
  // rather than trusted to be remembered at every call site that might
  // someday touch export/clear logic.
  const SENSITIVE_KEY_NAMES = ["aiApiKeys"];

  function safeGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[storageService] failed to read", key, e);
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[storageService] failed to write", key, e);
      return false;
    }
  }

  // ---------------- Theme ----------------
  function getTheme() {
    return safeGet(KEYS.theme, "light");
  }
  function setTheme(theme) {
    return safeSet(KEYS.theme, theme);
  }
  function getContrast() {
    return safeGet(KEYS.contrast, "normal");
  }
  function setContrast(v) {
    return safeSet(KEYS.contrast, v);
  }

  // ---------------- Favorites ----------------
  function getFavorites() {
    return safeGet(KEYS.favorites, []);
  }
  function isFavorite(id) {
    return getFavorites().includes(id);
  }
  function toggleFavorite(id) {
    const list = getFavorites();
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(id);
    safeSet(KEYS.favorites, list);
    return list.includes(id);
  }

  // ---------------- Bookmarks ----------------
  function getBookmarks() {
    return safeGet(KEYS.bookmarks, []);
  }
  function isBookmarked(id) {
    return getBookmarks().includes(id);
  }
  function toggleBookmark(id) {
    const list = getBookmarks();
    const idx = list.indexOf(id);
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(id);
    safeSet(KEYS.bookmarks, list);
    return list.includes(id);
  }

  // ---------------- Progress ----------------
  const VALID_STATUSES = ["Not Started", "In Progress", "Completed", "Revision Needed"];
  function getProgressMap() {
    return safeGet(KEYS.progress, {});
  }
  function getProgress(id, fallback) {
    const map = getProgressMap();
    return map[id] || fallback || "Not Started";
  }
  function setProgress(id, status) {
    if (VALID_STATUSES.indexOf(status) === -1) {
      console.warn("[storageService] invalid status", status);
      return false;
    }
    const map = getProgressMap();
    const prev = map[id];
    map[id] = status;
    const ok = safeSet(KEYS.progress, map);
    if (ok && status === "Completed" && prev !== "Completed") {
      recordCompletionEvent(id);
    }
    return ok;
  }

  // ---------------- Goals & study streaks (V5.0) ----------------
  // Design: goals are tracked purely by COUNT of resources marked
  // Completed, not estimated study minutes. Resource `estTime` in the data
  // is a free-text string ("2-3 hrs per paper attempt"), not a structured
  // duration — parsing it reliably enough to sum into a minutes target
  // would be guessing at precision the data doesn't have, so we don't.
  const MAX_COMPLETION_EVENTS = 3000; // generous cap; defensive against unbounded growth
  const DEFAULT_GOALS = { dailyTarget: 3, weeklyTarget: 15 };

  function todayStr() {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function dateStrDaysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  }

  function getCompletionEvents() {
    return safeGet(KEYS.completionEvents, []);
  }
  function recordCompletionEvent(id) {
    let events = getCompletionEvents();
    events.push({ id, date: todayStr() });
    if (events.length > MAX_COMPLETION_EVENTS) {
      events = events.slice(events.length - MAX_COMPLETION_EVENTS);
    }
    safeSet(KEYS.completionEvents, events);
  }
  function getCompletionsOnDate(dateStr) {
    return getCompletionEvents().filter((e) => e.date === dateStr).length;
  }
  function getCompletionsSinceDaysAgo(n) {
    // Inclusive rolling window: today plus the previous n days (n=6 -> 7-day week).
    const cutoff = dateStrDaysAgo(n);
    return getCompletionEvents().filter((e) => e.date >= cutoff).length;
  }

  function getGoals() {
    return Object.assign({}, DEFAULT_GOALS, safeGet(KEYS.goals, {}));
  }
  function setGoals(partial) {
    const merged = Object.assign({}, getGoals(), partial || {});
    safeSet(KEYS.goals, merged);
    return merged;
  }

  function getDailyGoalProgress() {
    const target = getGoals().dailyTarget;
    const completed = getCompletionsOnDate(todayStr());
    return {
      target,
      completed,
      pct: target ? Math.min(100, Math.round((completed / target) * 100)) : 0,
    };
  }
  function getWeeklyGoalProgress() {
    const target = getGoals().weeklyTarget;
    const completed = getCompletionsSinceDaysAgo(6);
    return {
      target,
      completed,
      pct: target ? Math.min(100, Math.round((completed / target) * 100)) : 0,
    };
  }

  /**
   * Current study streak, in consecutive days with at least one completion.
   * Definition (documented because streak off-by-ones are a classic bug):
   * walk backward from TODAY. If today has zero completions yet, that does
   * NOT break a streak that's still "alive" from yesterday — it just hasn't
   * extended today. So: start the walk at today; if today has 0, start
   * counting from yesterday instead; then count consecutive days backward
   * until the first day with 0 completions.
   */
  function getStudyStreak() {
    const hasEventsOn = (dateStr) => getCompletionEvents().some((e) => e.date === dateStr);
    let offset = hasEventsOn(todayStr()) ? 0 : 1;
    if (offset === 1 && !hasEventsOn(dateStrDaysAgo(1))) return 0; // no events today OR yesterday -> no active streak
    let streak = 0;
    while (hasEventsOn(dateStrDaysAgo(offset))) {
      streak++;
      offset++;
    }
    return streak;
  }

  // ---------------- AI settings (V5.3) ----------------
  const DEFAULT_AI_SETTINGS = {
    enabled: false, // opt-in by default — Objective #7
    activeProvider: "ollama", // local-first default, not a cloud provider
    endpoint: "",
    model: "",
    temperature: 0.7,
    maxTokens: 1024,
    cacheEnabled: true,
  };
  function getAiSettings() {
    return Object.assign({}, DEFAULT_AI_SETTINGS, safeGet(KEYS.aiSettings, {}));
  }
  function setAiSettings(partial) {
    const merged = Object.assign({}, getAiSettings(), partial || {});
    safeSet(KEYS.aiSettings, merged);
    return merged;
  }
  // API keys are intentionally namespaced separately from the rest of AI
  // settings — see SENSITIVE_KEY_NAMES above. Keeping them in their own
  // storage key (rather than nested inside aiSettings) is what makes the
  // exportAll() exclusion a single clean skip instead of having to
  // selectively strip one field out of a larger object on every export.
  //
  // API keys use sessionStorage, not localStorage — cleared when the tab
  // closes rather than persisting indefinitely (V6.0.1). This doesn't stop
  // an XSS payload from reading the key while the tab is open (nothing
  // client-side-only can fully stop that — see docs/SECURITY.md), but it
  // shrinks the exposure window from "forever" to "this session."
  function safeGetSession(key, fallback) {
    try {
      const raw = sessionStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.warn("[storageService] failed to read", key, e);
      return fallback;
    }
  }
  function safeSetSession(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn("[storageService] failed to write", key, e);
      return false;
    }
  }
  function getAiApiKey(providerId) {
    return safeGetSession(KEYS.aiApiKeys, {})[providerId] || "";
  }
  function setAiApiKey(providerId, key) {
    const map = safeGetSession(KEYS.aiApiKeys, {});
    if (key) map[providerId] = key;
    else delete map[providerId];
    return safeSetSession(KEYS.aiApiKeys, map);
  }
  function clearAiApiKeys() {
    return safeSetSession(KEYS.aiApiKeys, {});
  }

  // ---------------- Activity log (V5.1 Timeline) ----------------
  // NOTE on historical data: this log only records events from the moment
  // V5.1 is installed onward. Notes/queue items that already existed
  // before this version won't have a real creation date — there is no
  // way to know it retroactively. The Timeline honestly starts "now",
  // not pretending to have history it doesn't have.
  const MAX_ACTIVITY_EVENTS = 2000;
  function getActivityLog() {
    return safeGet(KEYS.activityLog, []);
  }
  function recordActivity(type, id) {
    let log = getActivityLog();
    log.push({ type, id, date: todayStr(), ts: new Date().toISOString() });
    if (log.length > MAX_ACTIVITY_EVENTS) log = log.slice(log.length - MAX_ACTIVITY_EVENTS);
    safeSet(KEYS.activityLog, log);
  }

  // ---------------- Goal history & consistency (V5.1) ----------------
  // IMPORTANT simplification, stated plainly: we do not store what the
  // daily/weekly TARGET was on any past day — only the current target.
  // "Was day X's goal met" is therefore computed by checking that day's
  // real completion count against TODAY's target, retroactively. If you
  // change your target, history recalculates under the new target rather
  // than preserving what the old target was. This is a reasonable
  // simplification (goal history isn't a compliance record), but it's
  // real behavior worth knowing about, not hidden in a comment nobody reads.
  function getGoalHistory(days) {
    days = days || 30;
    const target = getGoals().dailyTarget;
    const out = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = dateStrDaysAgo(i);
      const completed = getCompletionsOnDate(date);
      out.push({ date, completed, target, met: completed >= target });
    }
    return out;
  }
  function getGoalConsistency(days) {
    const history = getGoalHistory(days || 30);
    const metDays = history.filter((d) => d.met).length;
    return {
      metDays,
      totalDays: history.length,
      pct: history.length ? Math.round((metDays / history.length) * 100) : 0,
      missedDays: history.filter((d) => !d.met).map((d) => d.date),
    };
  }
  function getWeeklyConsistency(weeks) {
    weeks = weeks || 4;
    const target = getGoals().weeklyTarget;
    const out = [];
    for (let w = weeks - 1; w >= 0; w--) {
      const endOffset = w * 7;
      const events = getCompletionEvents();
      const startDate = dateStrDaysAgo(endOffset + 6);
      const endDate = dateStrDaysAgo(endOffset);
      const completed = events.filter((e) => e.date >= startDate && e.date <= endDate).length;
      out.push({ weekEnding: endDate, completed, target, met: completed >= target });
    }
    return out;
  }

  // ---------------- Notes ----------------
  function getNotesMap() {
    return safeGet(KEYS.notes, {});
  }
  function getNote(id) {
    return getNotesMap()[id] || "";
  }
  function setNote(id, text) {
    const map = getNotesMap();
    if (text && text.trim()) {
      map[id] = text;
      recordActivity("note", id);
    } else delete map[id];
    return safeSet(KEYS.notes, map);
  }

  // ---------------- Recently viewed ----------------
  const MAX_RECENT = 12;
  function getRecentlyViewed() {
    return safeGet(KEYS.recentlyViewed, []);
  }
  function pushRecentlyViewed(id) {
    let list = getRecentlyViewed();
    list = list.filter((x) => x !== id);
    list.unshift(id);
    if (list.length > MAX_RECENT) list = list.slice(0, MAX_RECENT);
    safeSet(KEYS.recentlyViewed, list);
    return list;
  }

  // ---------------- View counts (added V4.2, powers Statistics "Most Used") ----------------
  function getViewCounts() {
    return safeGet(KEYS.viewCounts, {});
  }
  function incrementViewCount(id) {
    const map = getViewCounts();
    map[id] = (map[id] || 0) + 1;
    safeSet(KEYS.viewCounts, map);
    return map[id];
  }

  // ---------------- Search history (added V4.3) ----------------
  const MAX_SEARCH_HISTORY = 15;
  function getSearchHistory() {
    return safeGet(KEYS.searchHistory, []);
  }
  function pushSearchHistory(query) {
    const q = (query || "").trim();
    if (!q || q.length < 2) return getSearchHistory();
    let list = getSearchHistory().filter((x) => x.toLowerCase() !== q.toLowerCase());
    list.unshift(q);
    list = list.slice(0, MAX_SEARCH_HISTORY);
    safeSet(KEYS.searchHistory, list);
    return list;
  }
  function clearSearchHistory() {
    safeSet(KEYS.searchHistory, []);
  }

  // ---------------- Saved searches (added V4.3) ----------------
  function getSavedSearches() {
    return safeGet(KEYS.savedSearches, []);
  }
  function saveSearch(name, query, filters) {
    const list = getSavedSearches();
    const entry = {
      id: "ss-" + Date.now().toString(36),
      name: name || query,
      query,
      filters: filters || {},
    };
    list.unshift(entry);
    safeSet(KEYS.savedSearches, list);
    return entry;
  }
  function deleteSavedSearch(id) {
    safeSet(
      KEYS.savedSearches,
      getSavedSearches().filter((s) => s.id !== id)
    );
  }

  // ---------------- Filter presets (added V4.3) ----------------
  function getFilterPresets() {
    return safeGet(KEYS.filterPresets, []);
  }
  function saveFilterPreset(name, filters) {
    const list = getFilterPresets();
    const entry = { id: "fp-" + Date.now().toString(36), name, filters };
    list.unshift(entry);
    safeSet(KEYS.filterPresets, list);
    return entry;
  }
  function deleteFilterPreset(id) {
    safeSet(
      KEYS.filterPresets,
      getFilterPresets().filter((p) => p.id !== id)
    );
  }

  // ---------------- Reading queue (added V4.3) ----------------
  // Distinct from Bookmarks: a queue is ORDERED (a study plan / "read next"
  // list), while bookmarks are an unordered saved set. Same resource can be
  // in both, neither, or just one.
  function getReadingQueue() {
    return safeGet(KEYS.readingQueue, []);
  }
  function isQueued(id) {
    return getReadingQueue().includes(id);
  }
  function addToQueue(id) {
    const list = getReadingQueue();
    if (!list.includes(id)) {
      list.push(id);
      safeSet(KEYS.readingQueue, list);
      recordActivity("queue-add", id);
    }
    return true;
  }
  function removeFromQueue(id) {
    const wasQueued = getReadingQueue().includes(id);
    safeSet(
      KEYS.readingQueue,
      getReadingQueue().filter((x) => x !== id)
    );
    if (wasQueued) recordActivity("queue-remove", id);
    return false;
  }
  function toggleQueue(id) {
    return isQueued(id) ? (removeFromQueue(id), false) : (addToQueue(id), true);
  }
  function reorderQueue(newOrderIds) {
    const current = new Set(getReadingQueue());
    const filtered = newOrderIds.filter((id) => current.has(id));
    safeSet(KEYS.readingQueue, filtered);
  }

  // ---------------- Preferences ----------------
  function getPrefs() {
    return safeGet(KEYS.prefs, { sidebarCollapsed: false, viewMode: "grid" });
  }
  function setPrefs(partial) {
    const current = getPrefs();
    const merged = Object.assign({}, current, partial);
    safeSet(KEYS.prefs, merged);
    return merged;
  }

  // ---------------- Bulk export/import (future-proofing: backups) ----------------
  function exportAll() {
    const out = {};
    Object.entries(KEYS).forEach(([name, key]) => {
      if (SENSITIVE_KEY_NAMES.includes(name)) return; // never leak API keys into a shareable export
      out[name] = safeGet(key, null);
    });
    out._exportedAt = new Date().toISOString();
    out._excludedForPrivacy = SENSITIVE_KEY_NAMES; // documents the omission IN the file, not just in code
    out._appVersion = (App.BuildInfo && App.BuildInfo.version) || "unknown";
    return out;
  }

  /**
   * Compatibility is informational, not a hard gate — this app's storage
   * schema has been purely additive version over version (no key has ever
   * been removed or repurposed), so there's no known case where an old
   * export would actually corrupt current state. This still surfaces a
   * clear warning on a major-version gap, since "purely additive so far"
   * is a fact about history, not a guarantee about the future.
   */
  function checkBackupCompatibility(payload) {
    const exportedVersion = (payload && payload._appVersion) || "unknown";
    const currentVersion = (App.BuildInfo && App.BuildInfo.version) || "unknown";
    const exportedMajor = String(exportedVersion).match(/^(\d+)\./)?.[1];
    const currentMajor = String(currentVersion).match(/^(\d+)\./)?.[1];
    const majorMismatch = exportedMajor && currentMajor && exportedMajor !== currentMajor;
    return {
      exportedVersion,
      currentVersion,
      compatible: true, // see comment above — always allowed, this is a warning signal not a block
      warning: majorMismatch
        ? `This backup was made with v${exportedVersion}, which is a different major version than the current v${currentVersion}. It will likely still restore correctly (storage keys have only ever been added, never removed) — but review what you're restoring.`
        : null,
    };
  }

  function importAll(payload, options) {
    if (!payload || typeof payload !== "object") return false;
    const onlyKeys = options && options.onlyKeys; // array of KEYS names, or undefined = restore everything present
    Object.entries(KEYS).forEach(([name, key]) => {
      if (onlyKeys && !onlyKeys.includes(name)) return;
      if (payload[name] !== undefined) safeSet(key, payload[name]);
    });
    return true;
  }

  // Routes each key to the storage it actually lives in: sensitive keys
  // (currently just aiApiKeys) live in sessionStorage, everything else in
  // localStorage. Uses the same SENSITIVE_KEY_NAMES list as exportAll()
  // rather than a separate ad-hoc check, so the two stay in sync by
  // construction if a future sensitive key is ever added.
  function clearAll() {
    Object.entries(KEYS).forEach(([name, key]) => {
      if (SENSITIVE_KEY_NAMES.includes(name)) {
        sessionStorage.removeItem(key);
      } else {
        localStorage.removeItem(key);
      }
    });
  }

  App.Storage = {
    getTheme,
    setTheme,
    getContrast,
    setContrast,
    getFavorites,
    isFavorite,
    toggleFavorite,
    getBookmarks,
    isBookmarked,
    toggleBookmark,
    getProgressMap,
    getProgress,
    setProgress,
    VALID_STATUSES,
    getNotesMap,
    getNote,
    setNote,
    getRecentlyViewed,
    pushRecentlyViewed,
    getViewCounts,
    incrementViewCount,
    getPrefs,
    setPrefs,
    getSearchHistory,
    pushSearchHistory,
    clearSearchHistory,
    getSavedSearches,
    saveSearch,
    deleteSavedSearch,
    getFilterPresets,
    saveFilterPreset,
    deleteFilterPreset,
    getReadingQueue,
    isQueued,
    addToQueue,
    removeFromQueue,
    toggleQueue,
    reorderQueue,
    getGoals,
    setGoals,
    getCompletionEvents,
    getCompletionsOnDate,
    getCompletionsSinceDaysAgo,
    getDailyGoalProgress,
    getWeeklyGoalProgress,
    getStudyStreak,
    getActivityLog,
    recordActivity,
    getGoalHistory,
    getGoalConsistency,
    getWeeklyConsistency,
    getAiSettings,
    setAiSettings,
    getAiApiKey,
    setAiApiKey,
    clearAiApiKeys,
    exportAll,
    checkBackupCompatibility,
    importAll,
    clearAll,
  };
})((window.App = window.App || {}));