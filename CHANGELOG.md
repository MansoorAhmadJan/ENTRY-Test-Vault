# Changelog

## V5.1 (current)

**Learning Analytics** — new, self-contained module
(`js/analytics/analyticsEngine.js`), a new `#/analytics` page
(`js/views/analyticsView.js`), new "Learning Analytics" sidebar item.

- **Learning Dashboard:** overall completion, per-subject and
  per-university progress, last-7-days activity chart, study streak,
  approximate remaining study time.
- **Progress Analytics:** per-subject completion %, resources remaining,
  approximate remaining hours. Uses the vault's **real 7 subjects**
  (`Entry Test Strategy`, `Multi-Subject / General Prep`, `English`,
  `Mathematics`, `Physics`, `IQ / Analytical Reasoning`, `Chemistry`) —
  not the 7 names originally requested (`Computer`, `General Knowledge`
  don't exist in the data; `IQ` maps to `IQ / Analytical Reasoning`).
  Hardcoding the requested names would have silently shown 0/0 forever
  for two of them.
- **Learning Recommendations:** rule-based (continue / next-topic /
  revision / missing-prerequisite). See `docs/V5_DEFERRED_SCOPE.md` item
  3 for why this is rule-based rather than learned, and why that's the
  right call at 102 resources.
- **Resource Insights:** frequently-revisited resources, average
  completion time (approximate, from parsed `estTime`).
- **Goal Analytics:** daily/weekly consistency over the last 30
  days/4 weeks, missed-day list. Uses today's goal target retroactively
  for past days (historical targets aren't stored — documented plainly
  in `storageService.js`, not hidden).
- **Revision Tracking:** last-studied date (last completion or note),
  a recommended review date (fixed +14-day heuristic, explicitly not a
  tuned spaced-repetition algorithm), overdue flag, full revision
  history per resource.
- **Timeline:** merges completions, note-saves, and queue add/remove
  into one feed. Historical data starts from when V5.1 was installed —
  notes/queue items that already existed have no real creation date to
  show, and none is fabricated.
- **Personal Statistics:** notes/favorites/queue counts, "study
  sessions" (distinct days with any tracked activity), estimated total
  study hours (approximate).
- **Data Export:** a new `exportAnalyticsSummary()` report (JSON
  download from the dashboard), distinct from the existing raw backup
  export (`App.Storage.exportAll()`, unchanged, still covers
  progress/goals/notes automatically since it's generic over all
  storage keys).

**New estTime parser** (`App.Formatters.parseEstTime`, in
`js/utils/formatters.js`) — the vault's free-text time estimates
("2–3 hrs", "20+ hrs") are now parsed into an approximate numeric range,
validated against all 8 unique real values in the dataset (100%
parseable). Anything unparseable returns `null` and is excluded from
sums, never silently treated as 0 hours.

**Storage additions** (all additive, `App.Storage.exportAll()`/
`importAll()` automatically cover them since those are generic over
`KEYS`): `activityLog` (note/queue events for the Timeline),
`getGoalHistory()`/`getGoalConsistency()`/`getWeeklyConsistency()`.
`setNote()` now logs a "note" activity event on real saves;
`addToQueue()`/`removeFromQueue()` now log queue events.

**Performance (Objective #11):** verified, not just claimed — a test
builds a synthetic 50,000-resource dataset and confirms the full
dashboard aggregation completes in under 500ms (`tests/component/
analyticsView.test.mjs`). The remaining real constraint at that scale
is `localStorage`'s size ceiling, a storage-backend question, not an
analytics-algorithm one — see `docs/V5_DEFERRED_SCOPE.md` item 10.

**Testing:** 110 automated tests (was 78 in V5.0), all passing — 32 new
tests covering the analytics engine (including fake-timer-controlled
revision-date math and a real 50k-resource performance check) and the
new dashboard view.

---

## V5.0

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
