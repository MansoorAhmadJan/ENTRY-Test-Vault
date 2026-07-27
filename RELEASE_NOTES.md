# Release Notes — v6.0.0

## What this release is

The final stabilization pass on top of V5.4-RC1. Per this release's own
brief: no new features, no architecture changes — regression testing,
real bug fixes, documentation, and release packaging only.

**Context worth stating plainly:** this is a personal study-tool project
that has been developed through an unusually long, deliberate engineering
process (V4.1 through V6.0), including several rounds where feature
requests were pushed back on and either scoped down or explicitly
deferred with reasoning (see `docs/V5_DEFERRED_SCOPE.md`). It has not yet
been used for real day-to-day studying. That doesn't block a stable,
well-tested release — it does mean "v6.0 stable" should be read as
"the codebase is solid and ready," not "this has survived real-world
usage," which are different claims.

## Real bugs fixed this release

1. **Service worker offline fallback resolved to `undefined`** on a
   cache-miss + network-failure, which the Fetch API treats as a hard
   error rather than a graceful offline response. Now falls back to the
   cached app shell for page navigations, and a real (if empty) Response
   otherwise. (`sw.js`)
2. **Sidebar badge counts (Favorites/Reading Queue) went stale** when
   toggled from a resource card or the Queue page without navigating
   elsewhere — they only updated on route changes. Fixed by having the
   sidebar listen for the app's existing `app:data-changed` event
   (registered once at boot, not per-render, to avoid a listener-
   accumulation bug of the same class found and fixed earlier in this
   project). (`js/app.js`, `js/ui/resourceCard.js`, `js/views/queueView.js`)
3. **The dashboard displayed the wrong version number in its own UI**
   (sidebar footer and Settings page) — a hardcoded `APP_VERSION`
   constant had been frozen at `"4.2.0"` since V4.3, silently wrong
   through every version since. Removed in favor of `App.BuildInfo.version`
   (populated from `package.json` at build time), the single source of
   truth introduced in V5.4. (`js/core/config.js`)
4. **`package.json`'s version had been stuck at `4.4.0`** since V4.4,
   found and fixed in V5.4; confirmed still correct this release
   (`5.4.0-rc1` → bumped to `6.0.0` for this release).

## Verified, not just claimed

- **209 automated tests, all passing** (was 201 at the start of this
  release). 8 new tests, all covering the bugs above.
- **0 ESLint errors** (6 pre-existing, intentionally-untouched warnings
  — unused `catch` bindings in defensive error handling, documented at
  each site).
- **0 `npm audit` vulnerabilities.**
- **0 accessibility violations** across 5 audited views (Home, Browse,
  Analytics, Settings, Diagnostics) via `axe-core` against the real
  running app.
- **Production build succeeds**, main bundle 243.5 KB minified (from
  389 KB source), AI modules (9 files, lazy-loaded) confirmed excluded
  from the main bundle.
- Every fix above was verified against real behavior — a genuinely
  closed port for the SW test, a real DOM for the sidebar-sync test,
  actual `grep` results for the version-string audit — not asserted.

## Known limitations

- **Real-world usage validation: none yet.** Every feature is tested at
  the code level; none has been exercised by actual studying. This is
  the single most important gap, named the same way in every release
  since V5.0.
- **AI providers are unverified against live APIs.** Request/response
  shapes are checked against current documentation and tested with
  realistic mocked payloads; none has been called with a real API key
  or a running local server in this development environment.
- **`localStorage` has a practical ~5MB ceiling** (browser-dependent,
  not directly queryable). Fine at the current 102-resource scale;
  would need a storage-backend migration (to `IndexedDB`) well before
  50,000 resources — see `docs/V5_DEFERRED_SCOPE.md` item 10.
- **Prerequisite data is sparse** (15/102 resources) — the
  "missing prerequisite" recommendation feature reports its own low
  coverage honestly rather than fabricating relationships.
- **Backup version-compatibility checking is informational, not a hard
  gate** — see `js/storage/storageService.js`'s `checkBackupCompatibility`
  for the reasoning (the schema has been purely additive so far).
- **No real screenshots, GIFs, or demo video** ship with this release —
  this development environment can't capture a real running browser.
  See `RELEASE_ASSETS.md` for what's provided instead.

## Deliberately not built (by design, not oversight)

Knowledge Graph, learned/ML recommendation engine, Plugin SDK, RAG/
embedding-based semantic search, multi-language support, First-Run
onboarding (welcome screen/guided tour). Each has a documented reason
and a trigger condition for revisiting in `docs/V5_DEFERRED_SCOPE.md`.

## Roadmap (if this continues)

The honest next step, stated the same way at the end of the last three
releases: **use it to actually study**, then let real friction — not
another speculative feature round — decide what V6.1 should contain.
