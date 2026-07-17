# Changelog

## V5.0 (current)

**Personal Learning Workspace**

- Study Goals (`js/views/goalsView.js`): daily/weekly resource-completion
  targets, rolling 7-day weekly progress, and a consecutive-day study
  streak. New `#/goals` route, new "Workspace" sidebar section.
- My Notes (`js/views/notesView.js`): aggregate browsable list of every
  resource with a saved note. New `#/notes` route. Reuses the existing
  per-resource note storage/editing rather than duplicating it.
- Continue Studying and Reading Queue were already fully built in V4.4 —
  audited, confirmed working, no changes needed.

**Search 2.0**

- Alias resolution now works per-token and per-bigram, not just when the
  entire query matches an alias exactly (e.g. "mechanics past papers" now
  resolves the embedded alias "mechanics" -> "physics", where V4.4 only
  matched if the query was _exactly_ "mechanics").
- Topic-aware boosting: a query that names a real subject/university/
  category now pulls in every resource on that facet, even ones with zero
  literal text overlap (e.g. searching "mechanics" surfaces every Physics
  resource, not just ones whose title happens to say "physics").
- New `App.Search.getTopicMatch(query)`, surfaced as a "Related topic"
  hint chip in the global search dropdown.

**Fixes found while building the above**

- `js/search/searchEngine.js`: short common words (e.g. "non", "for")
  could match as a substring of any sufficiently long garbage query,
  returning irrelevant results. Fixed with a minimum-length guard on the
  reverse substring check.
- `js/ui/resourceModal.js`: saving a note never dispatched
  `app:data-changed`, so nothing could react to a note being saved. Now
  it does (needed for My Notes to refresh live; fixes a real, if minor,
  pre-existing gap).
- `js/ui/sidebar.js`: config already supported a generic `section` field
  per nav item, but the renderer only recognized `"Insights"` and
  `"System"` — anything else silently fell into the main list with no
  header. Added `"Workspace"` as a first-class recognized section.

**Deferred, by design, not oversight** — see `docs/V5_DEFERRED_SCOPE.md`:
Custom Collections, Intelligent Learning Paths, a Recommendation Engine,
a Knowledge Graph, weak/strong-topic analytics, resource ratings/tags,
Resource Intelligence tooling, a formal Plugin Architecture, an AI
Integration Layer, and explicit 50,000+-resource scaling work. Each has
a design sketch and a concrete trigger condition for when it's worth
building — none of it was simply skipped without a decision.

**Testing:** 78 automated tests (was 50 in V4.4), all passing — 28 new
tests covering Goals/streak math (including fake-timer-controlled edge
cases), the Notes view, and Search 2.0.

---

## V4.4

**Build & Packaging**

- `package.json` + npm scripts (`dev`, `build`, `lint`, `format`, `test`).
- ESLint (flat config) + Prettier, configured to match the app's actual
  global-namespace script architecture — no ES module conversion, no
  Vite; a custom esbuild-based `scripts/build.mjs` concatenates and
  minifies the exact scripts/stylesheets `index.html` declares, in order.
- Production build verified by actually booting it (jsdom + a real local
  HTTP server), not just checking it parses.

**Automated Testing**

- Vitest + jsdom test harness (`tests/helpers/bootApp.mjs`) that executes
  the real app source files against a real `window`, rather than
  reimplementing or mocking them.
- 50 tests across search, filter, router, storage, a full-boot
  integration path, and UI components.
- Found and fixed a real search relevance bug while writing the search
  tests (see V5.0 entry above — same class of fix, this was the first
  instance): a garbage query could match real resources via an
  overly-permissive substring check.

---

## V4.3 and earlier

Architecture, modular UI, search engine, filtering, command palette,
diagnostics, service worker, local storage, accessibility foundations,
and extensibility — see `docs/ARCHITECTURE.md` for the full module map.
