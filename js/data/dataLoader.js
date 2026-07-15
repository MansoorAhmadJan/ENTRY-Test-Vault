/* ============================================================
   Data Layer
   Loads window.VAULT_DATA (see /data/schema.md) and builds fast
   lookup indices. This is the ONLY module that touches the raw
   data shape — everything else in the app should go through
   App.Data's public functions, never window.VAULT_DATA directly.
   That indirection is what lets the data source change later
   (JSON fetch, IndexedDB, an import wizard) without touching UI code.
   ============================================================ */
(function (App) {
  "use strict";

  let raw = null;
  let byId = new Map();
  let byUniversity = new Map();
  let bySubject = new Map();
  let ready = false;

  function validate(payload) {
    if (!payload || !Array.isArray(payload.resources)) {
      throw new Error("VAULT_DATA is missing or malformed — expected { resources: [...] }");
    }
    const seen = new Set();
    payload.resources.forEach((r, i) => {
      if (!r.id) throw new Error(`Resource at index ${i} is missing an id`);
      if (seen.has(r.id)) throw new Error(`Duplicate resource id found: ${r.id}`);
      seen.add(r.id);
    });
    return true;
  }

  function buildIndices() {
    byId = new Map();
    byUniversity = new Map();
    bySubject = new Map();

    raw.resources.forEach((r) => {
      byId.set(r.id, r);

      if (!byUniversity.has(r.university)) byUniversity.set(r.university, []);
      byUniversity.get(r.university).push(r);

      if (!bySubject.has(r.subject)) bySubject.set(r.subject, []);
      bySubject.get(r.subject).push(r);
    });
  }

  function init() {
    if (typeof window.VAULT_DATA === "undefined") {
      throw new Error(
        "window.VAULT_DATA not found — is data/vault-data.js loaded before this script?"
      );
    }
    raw = window.VAULT_DATA;
    validate(raw);
    buildIndices();
    ready = true;
    return true;
  }

  /**
   * Replace the in-memory vault data with a freshly-imported payload
   * (added V4.3, powers Settings → Import Updated Vault Data).
   *
   * SCOPE NOTE — this is a SESSION-ONLY override. It does not write to
   * disk (a static, no-backend, no-build-step app can't do that from
   * the browser), so a page reload reverts to data/vault-data.js. Its
   * purpose is letting someone preview/verify a newly-generated export
   * before actually replacing that file on disk — the durable path is
   * still "run build-vault-data.js, replace vault-data.js" per
   * docs/INSTALLATION.md. Callers should tell the user this plainly.
   */
  function reload(payload) {
    validate(payload);
    raw = payload;
    buildIndices();
    ready = true;
    return true;
  }

  App.Data = {
    init,
    reload,
    isReady: () => ready,

    getMeta: () => ({ generatedAt: raw.generatedAt, sourceVersion: raw.sourceVersion }),
    getUniversities: () => raw.universities.slice(),
    getUniversity: (key) => raw.universities.find((u) => u.key === key) || null,
    getSearchAliases: () => raw.searchAliases || {},

    getAll: () => raw.resources.slice(),
    getById: (id) => byId.get(id) || null,
    getByIds: (ids) => ids.map((id) => byId.get(id)).filter(Boolean),
    getByUniversity: (key) => (byUniversity.get(key) || []).slice(),
    getBySubject: (subject) => (bySubject.get(subject) || []).slice(),

    getSubjects: () => Array.from(bySubject.keys()).sort(),

    // Distinct values for filter dropdowns — computed live so new data
    // (e.g. after a future import) is picked up without code changes.
    getDistinctValues: (field) => {
      const set = new Set();
      raw.resources.forEach((r) => {
        const v = r[field];
        if (Array.isArray(v)) v.forEach((x) => set.add(x));
        else if (v !== undefined && v !== null && v !== "") set.add(v);
      });
      return Array.from(set).sort();
    },

    count: () => raw.resources.length,
  };
})((window.App = window.App || {}));
