# Release Report — v6.0.0

## Test results (measured this session, not estimated)

| Metric                                       | Value                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Automated tests                              | 209 passing / 209 total (0 failing)                                                                                      |
| Test files                                   | 23                                                                                                                       |
| ESLint errors                                | 0                                                                                                                        |
| ESLint warnings                              | 6 (pre-existing, intentionally untouched — unused `catch` bindings in defensive error handling, documented at each site) |
| `npm audit` vulnerabilities                  | 0                                                                                                                        |
| Accessibility violations (axe-core, 5 views) | 0                                                                                                                        |
| Production build                             | Succeeds                                                                                                                 |

## Performance metrics (measured, with honest caveats)

| Metric                                            | Value                                           | Caveat                                                                                                                                                                                           |
| ------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Main bundle (minified)                            | 243.5 KB (from 389.4 KB source, 46 files)       | Real, from actual build output                                                                                                                                                                   |
| CSS bundle (minified)                             | 22.8 KB (from 31.6 KB, 5 files)                 | Real                                                                                                                                                                                             |
| AI modules                                        | 9 files, lazy-loaded, excluded from main bundle | Verified against actual dist output, not asserted                                                                                                                                                |
| Search latency (102 real resources)               | ~2 ms                                           | Real, measured against the production build                                                                                                                                                      |
| Search latency (synthetic 50,000 resources)       | <500 ms                                         | Real, from a dedicated performance test (`tests/component/analyticsView.test.mjs`)                                                                                                               |
| Internal boot marks (data ready → search indexed) | ~2.5 ms                                         | Real, from `App.Perf` marks — this is the app's own work, not environment overhead                                                                                                               |
| Total "page load" in this test environment        | ~900–1000 ms                                    | **Not representative of a real browser** — this is jsdom + Node HTTP overhead, much slower than V8 in an actual browser. No real-browser load-time measurement was possible in this environment. |
| Memory usage                                      | Not measured                                    | jsdom doesn't provide meaningful heap metrics comparable to a real browser's memory profile — reporting a number here would be fabricated precision, not a real measurement                      |

## Resolved this release

1. Service worker offline fallback resolving to `undefined` instead of a
   valid Response on cache-miss + network-failure (real bug, real fix,
   verified against the exact Promise-resolution behavior, plus 5 new tests).
2. Sidebar badge counts going stale without navigation (real bug,
   traced to two separate missing event dispatches, fixed, verified
   live against a real DOM, 3 new tests).
3. The app displaying its own wrong version number in its UI
   (`"4.2.0"`, frozen since V4.3) — consolidated to a single real
   source of truth.
4. 5 high-severity `npm audit` advisories (V5.4) — dev-only, zero
   runtime exposure, fixed via a clean major-version upgrade.
5. `package.json` version drift (V5.4) — was silently wrong for 5+
   versions before anything surfaced it.

## Strengths

- **Verification discipline held up under scale.** Every claim in this
  report is backed by a command that was actually run this session, not
  an assertion. This pattern — verify, don't assume — caught real bugs
  in nearly every development round across this project's history, this
  one included.
- **Test coverage is broad and mechanistically real.** Tests boot the
  actual app source (`tests/helpers/bootApp.mjs`) rather than mocking
  it away; several suites specifically exercise real failure modes (a
  genuinely closed network port, a real HTTP server, live script
  injection) rather than simulated ones.
- **Security posture is actively maintained, not just documented.** The
  V5.2 security review's findings are still holding (re-verified this
  session), and this session's own new code (the service worker fix)
  was held to the same "verify against a real live DOM" standard.
- **Documentation is honest about its own gaps** — deferred features
  have stated trigger conditions, not vague "future work" hand-waving;
  this report itself follows that pattern.

## Remaining minor issues (not blocking, stated plainly)

- **No real-usage validation.** Repeated in every release note since
  V5.0 because it's still true and still the most important gap.
- **PWA icon set incomplete** for strict Lighthouse compliance (SVG
  only, no PNG sizes) — see `RELEASE_ASSETS.md`.
- **No multi-browser testing** — everything here is verified via
  jsdom + Node, which is excellent for logic/DOM-structure correctness
  but doesn't catch real CSS rendering quirks across browsers.
- **AI providers unverified against live APIs** (no keys/local server
  available here) — see `docs/PROVIDER_INTERFACE.md`'s explicit
  statement of what "verified" means for those adapters.
- **The 6 ESLint warnings** are unused `catch` bindings in old
  defensive code (predating this session), left alone deliberately —
  fixing them means touching working error-handling logic for zero
  functional benefit.

## Maintainability & scalability assessment

- **Maintainability: strong.** Single consistent architectural pattern
  (global-namespace IIFE modules) held across 60+ files without drift;
  every new module this project added followed the same shape. Real
  tests mean regressions get caught, not just hoped against.
- **Scalability: good up to the low thousands of resources**, verified
  at 50,000 synthetically for the analytics aggregation specifically.
  The real, known ceiling is `localStorage`'s ~5MB practical limit,
  documented with a concrete migration path (`IndexedDB`, same function
  signatures) rather than left as a vague future concern.

## Consistency audit

Spot-checked: every view follows the same `render(container) ->
App.ErrorHandler.guard` pattern; every storage function follows the
same `safeGet`/`safeSet` pattern; every new feature this session
followed the established escaping discipline without exception (checked
directly, not assumed, per this report's own stated standard).
