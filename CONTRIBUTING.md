# Contributing

This started as a personal study tool and grew into a portfolio-quality
engineering project across V4.1–V6.0. It's built to be genuinely
extensible if you want to build on it.

## Before you start

Read `docs/ARCHITECTURE.md` first — it explains the actual architecture
(global-namespace scripts, not ES modules or a bundler-based build) and
why, plus the module map and dependency order. `docs/FOLDER_STRUCTURE.md`
has an annotated file tree. `docs/V5_DEFERRED_SCOPE.md` documents
features that were deliberately not built, and why — worth checking
before proposing one of them.

## Setup

```
npm install
npm run dev       # zero-build dev server, raw source files
npm test          # full test suite (Vitest + jsdom)
npm run lint      # ESLint
npm run format    # Prettier
npm run build     # production dist/
```

## Ground rules

- **No ES modules, no bundler-based dev server.** The app is plain
  global-namespace `<script>` tags by design (see `ARCHITECTURE.md`) —
  it works by double-clicking `index.html`, no server required. Don't
  introduce `import`/`export` syntax into `js/` files.
- **Every module follows the same IIFE pattern**: `(function (App) {
"use strict"; ... App.SomeModule = {...}; })((window.App = window.App
|| {}));`. New files should match this.
- **Write real tests, not assertions.** This project's whole engineering
  practice has been "verify, don't assume" — every test in `tests/`
  boots the real app source (see `tests/helpers/bootApp.mjs`) rather
  than mocking it away. New features should follow the same pattern.
- **Escape everything that reaches the DOM.** User input, AI-generated
  text, and imported/untrusted resource data are all treated the same
  way — see `docs/SECURITY.md` for the reasoning and the real bugs that
  reasoning caught.
- **Run the full gate before committing**: `npm run lint && npm run
format:check && npm test && npm run build`. CI (`.github/workflows/
ci.yml`) runs the same gate on every push.

## Adding a new AI provider

See `docs/PROVIDER_INTERFACE.md` — it has a step-by-step guide and the
exact contract to implement.

## Adding a new view/route

Follow the pattern in any existing `js/views/*.js` file: a `render(container)`
function wrapped in `App.ErrorHandler.guard`, registered on `App.Views.<name>`,
plus a case in `js/core/router.js`'s switch and an entry in
`js/core/config.js`'s `NAV_ITEMS` if it needs a sidebar link.

## Reporting bugs

Open an issue with: what you did, what you expected, what actually
happened, and (if relevant) which browser. If it's a data problem
(wrong metadata, broken link), check `data/schema.md` for the expected
shape first — `js/diagnostics/vaultDiagnostics.js` can catch a lot of
these automatically (visible on the Diagnostics page in-app).
