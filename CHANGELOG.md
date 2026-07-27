# Changelog

## V6.0.0 (current) — Final Stable Release

Stabilization only, per this release's own brief — no new features, no
architecture changes. Full detail in `RELEASE_NOTES.md` and
`RELEASE_REPORT.md`; summary here.

**Real bugs found and fixed:**

1. Service worker offline fallback resolved to `undefined` (a hard
   Fetch API error) instead of a graceful response on cache-miss +
   network-failure. Now falls back to the cached app shell for
   navigations, a real empty Response otherwise.
2. Sidebar badge counts (Favorites/Queue) went stale without
   navigating — toggling from a resource card or the Queue page never
   notified the sidebar. Fixed with a single listener registered once
   at boot (not per-render, avoiding a listener-accumulation class of
   bug found earlier in this project).
3. The app displayed the wrong version number in its own UI —
   `APP_VERSION` had been hardcoded to `"4.2.0"` since V4.3, silently
   wrong through 6+ versions. Removed in favor of `App.BuildInfo.version`
   (the real source of truth since V5.4).

**Release readiness:** `LICENSE` (MIT), `CONTRIBUTING.md`, and
`docs/USER_GUIDE.md` added — none existed before. `RELEASE_NOTES.md`,
`RELEASE_CHECKLIST.md`, `RELEASE_REPORT.md`, and `RELEASE_ASSETS.md`
document what's real, what's verified, and what genuinely isn't
(honestly — no real screenshots/GIFs/video were fabricated; see
`RELEASE_ASSETS.md` for what this environment can and can't produce).

**Testing:** 209 tests total (was 201), 8 new — all covering the 2 real
bugs above.

---

## V5.4-rc1 — Platform Polish & Release Candidate

**Scope note, stated upfront:** the original V5.4 brief included a
First-Run Experience (welcome screen, guided tour, sample data) and UX
consistency/animation polish. Both were deferred — the former for the
same reason as prior rounds (no real second user needing onboarding);
the latter because it needs to be driven by real friction found using
the app, which still hasn't happened. Everything below is real,
verified engineering work that doesn't depend on that.

**Diagnostics (Objective #8)** — new "AI & Storage" tab: AI provider
status (without forcing a lazy-load just to check it), a real per-key
`localStorage` breakdown (not just a total), a storage-quota estimate,
AI response cache stats, and real build information (version, commit
hash, build timestamp) injected by `scripts/build.mjs` — verified
against the actual production bundle, not asserted. Also fixed a real
gap while building this: `package.json`'s version had been stuck at
`4.4.0` since V4.4 despite five versions of real work since; bumped to
`5.4.0-rc1`.

**Backup & Restore (Objective #4)** — most of this already existed
(`exportAll`/`importAll` since V4.x); what's genuinely new: a
version-compatibility check on import (informational, not a hard
block — this app's storage schema has been purely additive so far) and
selective restore (choose which categories — Progress, Favorites/Queue,
Notes, Search History, Activity Log, Preferences — to bring back,
rather than all-or-nothing).

**QA Audit (Objective #10)** — ran the existing data-integrity
diagnostics (`js/diagnostics/vaultDiagnostics.js`, built in V5.2)
against the real 102-resource dataset. First pass showed 102/102
resources "failing" link validation — traced to a broken test harness
missing the `URL` global (a bare `vm` context, not a real browser),
not real data corruption. Re-ran correctly: **0 issues**, genuinely
clean data.

**Security/dependency hygiene** — ran `npm audit`, found 5 high-severity
advisories (all in `eslint`'s dependency chain, dev-only, zero runtime
exposure). Fixed via a major-version upgrade to eslint 10.x, verified
lint still passes identically (same 6 pre-existing warnings, 0 errors)
after the upgrade.

**Final cleanup (Objective #11)** — checked every JS file against what's
actually referenced from `index.html`/`aiLoader.js`/`build.mjs`/tests:
zero orphaned files found.

**Accessibility** — extended the existing axe-core audit to cover the
Diagnostics view (previously untested), including the new AI & Storage
tab. 0 violations across all 5 audited views.

**Testing:** 201 tests total (was 176), 25 new.

---

## V5.3 — AI Integration Layer

Built at explicit request after I recommended a smaller, single-provider
scope and explained the tradeoff (see conversation/commit history) — the
full 12-objective spec was built, real and tested, not stubbed.

**AI Provider Abstraction** — 5 providers (Ollama, LM Studio, OpenAI,
Claude, Gemini), each verified against real current API documentation
(fetched live while building this, not assumed from memory). Providers
are pure `buildRequest`/`parseResponse`/`parseError` functions — no
`fetch()` inside them — which is what makes them unit-testable with zero
network access and swappable without touching the service layer. See
`docs/PROVIDER_INTERFACE.md`.

**AI Service Layer** (`js/ai/aiService.js`) — provider selection, request
orchestration, 30s timeout via `AbortController`, a 2-second client-side
rate-limit guard (intentionally minimal — see `docs/AI_INTEGRATION.md`
for why), an optional 10-minute in-memory response cache, and every
failure mode normalized to `{ok, text, error}`. Verified against a
genuinely closed local port (not a mock) — fails in ~150ms with a clear
message.

**AI Features** — Explain this resource, Generate study notes, Suggest
related topics, and Ask a question (in the resource modal); Summarize
and Suggest study order (in the Analytics view, operating on
not-yet-completed resources).

**Search 3.0** — natural-language query preprocessing (strips "what are
the...", "show me...", etc. before tokenizing) layered on Search 2.0's
existing alias/topic-aware matching. Explicitly NOT embedding-based
semantic search, per the brief — see `docs/V5_DEFERRED_SCOPE.md` item 9.

**Privacy (Objective #7)** — AI disabled by default; default provider
(if enabled) is local (Ollama), not cloud. Personal notes are never sent
to any AI feature except "Ask a question," and only with an explicit,
unchecked-by-default opt-in checkbox — enforced structurally (other
features' functions don't accept a notes parameter at all, not just a
runtime check). API keys live in a separate storage key
(`SENSITIVE_KEY_NAMES` in `storageService.js`) structurally excluded
from `exportAll()` — verified with a test that plants a real-shaped key
and confirms it's absent from the serialized export.

**Performance (Objective #8)** — real lazy-loading, not just deferred
bundling: only `js/ai/aiLoader.js` (a tiny stub) is in the main
production bundle; the other 9 files load via dynamic `<script>`
injection on first real use. Verified against a real HTTP server with
real script execution that `App.AI.Service` genuinely doesn't exist
until `ensureLoaded()` is called, and that the main bundle doesn't
contain provider-specific code inline.

**Security note found and fixed during this work:** AI-generated text is
untrusted input, same as a user's note or an imported resource field —
verified with a live-DOM test where a mocked AI response contains a
`<script>` tag; it renders as escaped, inert text.

**Testing:** 176 tests total (was 120), 56 new — provider conformance,
service orchestration (mocked fetch), the real lazy-load mechanism
(real server + real script execution), AI settings storage (especially
the API-key export exclusion), the notes privacy opt-in, and Search 3.0.

---

## V5.2 — Engineering Quality

_(Recorded now, after the fact — this entry should have been added when
the work was committed; it wasn't, which is itself worth naming rather
than quietly backfilling without a note.)_

**CI/CD** — `.github/workflows/ci.yml`: lint, format check, test, build,
smoke test on every push. Verified the gate is real (deliberately broke
a lint rule and a test, confirmed both fail the build, confirmed the
exit-code check itself wasn't silently broken by a pipe).

**Accessibility audit** — `axe-core` against the real running app (4
views). Found and fixed 4 real violations in `js/ui/resourceCard.js`
(invalid ARIA role, nested interactive controls, a heading-order skip,
`aria-label` on a non-interactive element) using the standard "stretched
button" pattern — verified the click-anywhere-on-card UX was unchanged.
See `docs/ACCESSIBILITY.md`.

**Security review** — every one of 62 `innerHTML` sites checked, not
sampled. Found and fixed: `resource.link` rendered into `href` with no
escaping and no protocol enforcement at render time (a `javascript:`
URL via Settings' vault-data import would have executed on click), and
3 enum fields interpolated raw across 5 files. Verified fixes against a
live DOM with script execution enabled, not string-matching. Also ran
`npm audit` for the first time this project and fixed a moderate esbuild
advisory. See `docs/SECURITY.md`.

**Testing:** 120 tests total (was 78), including 2 new permanent suites
(`tests/accessibility/`, `tests/security/`).

---

## V5.1

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
