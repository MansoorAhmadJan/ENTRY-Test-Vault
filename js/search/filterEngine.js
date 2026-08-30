/* ============================================================
   Filter Engine
   Applies the "Advanced Filters" panel to a resource list.
   Filter state shape:
     {
       university: Set<string>, subject: Set<string>, chapter: Set<string>,
       difficulty: Set<string>, priority: Set<number>, quality: Set<string>,
       resourceType: Set<string>, platform: Set<string>, language: Set<string>,
       status: Set<string>, tags: Set<string>
     }
   Semantics: values WITHIN one field are OR'd (e.g. university=GIKI OR NUST),
   values ACROSS different fields are AND'd (university=GIKI AND difficulty=Advanced).
   This is the conventional faceted-search behavior and scales cleanly —
   adding a new facet is just one more Set in the state object.
   ============================================================ */
(function (App) {
  "use strict";

  const FACETS = [
    "university",
    "subject",
    "chapter",
    "difficulty",
    "priority",
    "quality",
    "resourceType",
    "platform",
    "language",
    "status",
    "tags",
  ];

  function emptyState() {
    const state = {};
    FACETS.forEach((f) => {
      state[f] = new Set();
    });
    return state;
  }

  function isEmpty(state) {
    return FACETS.every((f) => !state[f] || state[f].size === 0);
  }

  function activeCount(state) {
    return FACETS.reduce((sum, f) => sum + (state[f] ? state[f].size : 0), 0);
  }

  function matches(resource, state) {
    for (const facet of FACETS) {
      const set = state[facet];
      if (!set || set.size === 0) continue;

      if (facet === "tags") {
        const tags = resource.tags || [];
        if (!tags.some((t) => set.has(t))) return false;
      } else if (facet === "priority") {
        if (!set.has(resource.priority)) return false;
      } else {
        if (!set.has(resource[facet])) return false;
      }
    }
    return true;
  }

  function apply(resources, state) {
    if (isEmpty(state)) return resources.slice();
    return resources.filter((r) => matches(r, state));
  }

  function toggle(state, facet, value) {
    if (!state[facet]) state[facet] = new Set();
    if (state[facet].has(value)) state[facet].delete(value);
    else state[facet].add(value);
    return state;
  }

  function clear(state, facet) {
    if (facet) state[facet] = new Set();
    else
      FACETS.forEach((f) => {
        state[f] = new Set();
      });
    return state;
  }

  // Serialize/deserialize for persisting last-used filters (localStorage stores plain objects, not Sets)
  function serialize(state) {
    const out = {};
    FACETS.forEach((f) => {
      out[f] = Array.from(state[f] || []);
    });
    return out;
  }
  function deserialize(obj) {
    const state = emptyState();
    if (!obj) return state;
    FACETS.forEach((f) => {
      state[f] = new Set(obj[f] || []);
    });
    return state;
  }

  App.Filter = {
    FACETS,
    emptyState,
    isEmpty,
    activeCount,
    matches,
    apply,
    toggle,
    clear,
    serialize,
    deserialize,
  };
})((window.App = window.App || {}));
