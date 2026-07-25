/* ============================================================
   Search Engine
   Builds a simple inverted index (token -> Set of resource ids)
   once at startup, so searches over thousands of resources stay
   instant (no re-scanning all resources per keystroke). Ranking
   is a small weighted score: title match > id match > tag match
   > subject/university match > description match.
   ============================================================ */
(function (App) {
  "use strict";

  let index = new Map(); // token -> Set(resourceId)
  let resourcesById = new Map();
  let aliases = {};
  let builtCount = 0;

  // ---- Search 2.0: topic lookup tables (Objective #6) ----
  // Maps a lowercased facet name -> canonical { type, value, label } so a
  // query token that names a subject/university/category can boost/attach
  // resources by FACET even when the word never appears in the resource's
  // title or description (e.g. "mechanics" -> alias "physics" -> subject
  // facet "Physics", even for a resource titled "GIKI Paper 2021" that
  // never literally says "physics").
  let topicLookup = new Map();

  function tokenize(text) {
    if (!text) return [];
    return String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1);
  }

  function addToIndex(token, id) {
    if (!index.has(token)) index.set(token, new Set());
    index.get(token).add(id);
  }

  function build() {
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    index = new Map();
    resourcesById = new Map();
    aliases = App.Data.getSearchAliases();
    const all = App.Data.getAll();

    all.forEach((r) => {
      resourcesById.set(r.id, r);
      const fields = [
        r.id,
        r.title,
        r.description,
        r.subject,
        r.university,
        r.chapter,
        r.platform,
        r.resourceType,
        r.category,
      ];
      fields.forEach((f) => tokenize(f).forEach((tok) => addToIndex(tok, r.id)));
      (r.tags || []).forEach((tag) => tokenize(tag).forEach((tok) => addToIndex(tok, r.id)));
    });

    builtCount = all.length;

    topicLookup = new Map();
    App.Data.getSubjects().forEach((s) =>
      topicLookup.set(s.toLowerCase(), { type: "subject", value: s, label: s })
    );
    App.Data.getUniversities().forEach((u) => {
      topicLookup.set(u.key.toLowerCase(), { type: "university", value: u.key, label: u.label });
      topicLookup.set(u.label.toLowerCase(), {
        type: "university",
        value: u.key,
        label: u.label,
      });
    });
    new Set(all.map((r) => r.category).filter(Boolean)).forEach((c) => {
      const key = c.toLowerCase();
      // Subject/university names win ties (see test: "Physics" is both a
      // subject AND a category value in the real dataset — searching
      // "physics" should mean the subject, the broader/more useful facet).
      if (!topicLookup.has(key)) topicLookup.set(key, { type: "category", value: c, label: c });
    });

    lastBuildDurationMs = +(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
    ).toFixed(2);
    return true;
  }

  // Resolve an alias term to its canonical form, if one exists.
  function resolveAlias(term) {
    const lower = term.toLowerCase();
    return aliases[lower] || null;
  }

  // Search 2.0: alias resolution across the WHOLE query (original V4.4
  // behavior, kept for backward compatibility with anything calling
  // resolveAlias() directly) is too narrow — "flp" resolves but "flp 2024"
  // does not, even though a human typing "flp 2024" clearly means the same
  // thing. This expands aliasing to also check each individual token and
  // each adjacent bigram (since several real aliases are two words, e.g.
  // "advance maths", "full length paper", "video course").
  function resolveAliasesInQuery(qLower, qTokens) {
    const resolved = new Set();
    const whole = resolveAlias(qLower);
    if (whole) resolved.add(whole);
    qTokens.forEach((tok) => {
      const a = resolveAlias(tok);
      if (a) resolved.add(a);
    });
    for (let i = 0; i < qTokens.length - 1; i++) {
      const bigram = qTokens[i] + " " + qTokens[i + 1];
      const a = resolveAlias(bigram);
      if (a) resolved.add(a);
    }
    return Array.from(resolved);
  }

  // Search 2.0 topic-aware matching: does this (already alias-expanded)
  // token set name a real subject / university / category? Returns the
  // best single match (subject/university beat category on tie, since
  // they're the more common way people search) or null.
  function findTopicMatch(effectiveTokens, qLower) {
    if (topicLookup.has(qLower)) return topicLookup.get(qLower);
    let found = null;
    effectiveTokens.forEach((tok) => {
      if (found) return;
      if (topicLookup.has(tok)) found = topicLookup.get(tok);
    });
    return found;
  }

  function fieldContains(field, q) {
    return field && String(field).toLowerCase().includes(q);
  }

  function scoreResource(r, qLower, qTokens) {
    let score = 0;
    if (String(r.id).toLowerCase() === qLower) score += 100;
    if (fieldContains(r.id, qLower)) score += 20;
    if (fieldContains(r.title, qLower)) score += 40;
    if (fieldContains(r.subject, qLower)) score += 15;
    if (fieldContains(r.university, qLower)) score += 15;
    if ((r.tags || []).some((t) => fieldContains(t, qLower))) score += 18;
    if (fieldContains(r.description, qLower)) score += 8;

    // token-level partial credit so multi-word queries still rank sensibly
    qTokens.forEach((tok) => {
      if (fieldContains(r.title, tok)) score += 6;
      if ((r.tags || []).some((t) => fieldContains(t, tok))) score += 4;
      if (fieldContains(r.description, tok)) score += 1;
    });

    if (r.priority) score += r.priority; // slight bump for higher-priority resources on ties
    return score;
  }

  /**
   * Instant search. Returns resources ranked by relevance.
   * @param {string} query
   * @param {number} limit
   */
  // ---------------- Search 3.0: natural-language query prep ----------------
  // Deliberately NOT embedding-based semantic search (see
  // docs/V5_DEFERRED_SCOPE.md item 9 and docs/AI_INTEGRATION.md) — this is
  // a cheap, honest preprocessing step: strip conversational filler that
  // would otherwise just become noise tokens (unmatched, diluting
  // relevance) or coincidentally fuzzy-match something irrelevant.
  const NL_FILLER_PATTERNS = [
    /^(what|which|where)\s+(are|is|were|was)\s+(the|some|any)?\s*/i,
    /^(show|find|get|give)\s+me\s+(the|some|any)?\s*/i,
    /^(can|could)\s+you\s+(find|show|get)\s+(me\s+)?(the|some|any)?\s*/i,
    /^i\s+(need|want|am looking for|m looking for)\s+(the|some|any)?\s*/i,
    /^(find|search for|look up)\s+/i,
  ];
  function stripNaturalLanguageFiller(text) {
    let out = text;
    let changed = true;
    while (changed) {
      changed = false;
      for (const re of NL_FILLER_PATTERNS) {
        const next = out.replace(re, "");
        if (next !== out) {
          out = next;
          changed = true;
        }
      }
    }
    return out.replace(/[?!]+$/, "").trim() || text; // never return an empty string for an all-filler query
  }

  function search(query, limit) {
    limit = limit || 50;
    const q = stripNaturalLanguageFiller((query || "").trim());
    if (!q) return [];

    const qLower = q.toLowerCase();
    const qTokens = tokenize(q);
    const resolvedAliases = resolveAliasesInQuery(qLower, qTokens);
    const effectiveTokens = resolvedAliases.length
      ? qTokens.concat(resolvedAliases.flatMap((a) => tokenize(a)))
      : qTokens;

    // Search 2.0: topic-aware boost. If the query (post-alias) names a real
    // subject/university/category, pull in every resource on that facet as
    // a candidate — this is what lets "mechanics" (-> alias "physics")
    // surface a Physics past-paper whose title never contains the word
    // "physics" at all, not just resources with literal text overlap.
    const topic = findTopicMatch(effectiveTokens, qLower);
    const topicBoostedIds = new Set();
    if (topic) {
      resourcesById.forEach((r, id) => {
        const matches =
          (topic.type === "subject" && r.subject === topic.value) ||
          (topic.type === "university" && r.university === topic.value) ||
          (topic.type === "category" && r.category === topic.value);
        if (matches) topicBoostedIds.add(id);
      });
    }

    // Candidate set: union of token matches from the index (fast filter),
    // then precisely scored/ranked with the substring-aware scorer above.
    const candidateIds = new Set();
    const fuzzyMatchedIds = new Set(); // tracked separately so exact matches can outrank typo matches on ties
    effectiveTokens.forEach((tok) => {
      let tokenHadMatch = false;
      index.forEach((ids, indexedToken) => {
        if (
          indexedToken.includes(tok) ||
          (indexedToken.length >= 4 && tok.includes(indexedToken))
        ) {
          ids.forEach((id) => candidateIds.add(id));
          tokenHadMatch = true;
        }
      });
      // Typo tolerance: only spend the O(index size) fuzzy scan on tokens that
      // found nothing exact — keeps the common case (correctly-spelled queries) fast.
      if (!tokenHadMatch && tok.length >= 3) {
        index.forEach((ids, indexedToken) => {
          if (App.FuzzyMatch.isCloseMatch(tok, indexedToken)) {
            ids.forEach((id) => {
              candidateIds.add(id);
              fuzzyMatchedIds.add(id);
            });
          }
        });
      }
    });
    // Always also do a direct substring pass in case tokenization split something odd
    if (candidateIds.size === 0) {
      resourcesById.forEach((r, id) => {
        if (
          fieldContains(r.title, qLower) ||
          fieldContains(r.description, qLower) ||
          fieldContains(r.id, qLower)
        ) {
          candidateIds.add(id);
        }
      });
    }
    topicBoostedIds.forEach((id) => candidateIds.add(id));

    const results = Array.from(candidateIds)
      .map((id) => resourcesById.get(id))
      .filter(Boolean)
      .map((r) => ({
        resource: r,
        score:
          scoreResource(r, qLower, effectiveTokens) -
          (fuzzyMatchedIds.has(r.id) ? 5 : 0) +
          (topicBoostedIds.has(r.id) ? 25 : 0),
        viaFuzzy: fuzzyMatchedIds.has(r.id),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((x) => x.resource);

    return results;
  }

  /**
   * Wraps matches of `query` in `text` with <mark class="hl"> for highlighting.
   * Escapes HTML first to stay XSS-safe, then re-inserts marks.
   */
  function highlight(text, query) {
    if (!text) return "";
    const escaped = String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (!query) return escaped;
    const tokens = tokenize(query).filter((t) => t.length > 1);
    if (!tokens.length) return escaped;
    const pattern = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    try {
      const re = new RegExp("(" + pattern + ")", "gi");
      return escaped.replace(re, '<mark class="hl">$1</mark>');
    } catch (e) {
      return escaped;
    }
  }

  /**
   * Autocomplete suggestions for a partial query — indexed tokens that start
   * with `prefix`, ranked by how many resources they appear in.
   */
  function getSuggestions(prefix, limit) {
    limit = limit || 6;
    const p = (prefix || "").trim().toLowerCase();
    if (p.length < 2) return [];
    const matches = [];
    index.forEach((ids, token) => {
      if (token.startsWith(p) && token !== p) matches.push({ term: token, count: ids.size });
    });
    return matches.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  let lastBuildDurationMs = 0;
  function getIndexHealth() {
    let totalPostings = 0;
    index.forEach((ids) => {
      totalPostings += ids.size;
    });
    return {
      resourceCount: builtCount,
      uniqueTokens: index.size,
      totalPostings,
      avgTokensPerResource: builtCount ? +(totalPostings / builtCount).toFixed(1) : 0,
      lastBuildDurationMs,
    };
  }

  /**
   * Public entry point for "topic-aware" UI hints (e.g. a "Related: Physics"
   * chip under the search box). Wraps the internal alias+topic resolution
   * used by search() itself, so the hint always matches actual behavior.
   */
  function getTopicMatch(query) {
    const q = stripNaturalLanguageFiller((query || "").trim()).toLowerCase();
    if (!q) return null;
    const qTokens = tokenize(q);
    const resolvedAliases = resolveAliasesInQuery(q, qTokens);
    const effectiveTokens = resolvedAliases.length
      ? qTokens.concat(resolvedAliases.flatMap((a) => tokenize(a)))
      : qTokens;
    return findTopicMatch(effectiveTokens, q);
  }

  App.Search = {
    build,
    search,
    highlight,
    resolveAlias,
    getTopicMatch,
    stripNaturalLanguageFiller,
    tokenize,
    getSuggestions,
    getIndexHealth,
    get indexedCount() {
      return builtCount;
    },
  };
})((window.App = window.App || {}));
