# Entry-Test Knowledge Vault — Interactive Dashboard (v6.0.0)

<!-- Once this repo has a GitHub remote, replace OWNER/REPO below — the badge is a placeholder until then, not a live check. -->

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

An offline, framework-free browsing interface for the Pakistan Entry-Test Knowledge Vault (Version 3.0). The Word/Excel documents remain the source of truth; this dashboard is a faster way to browse, search, filter, and track progress through the same data.

**v6.0.0 — Final Stable Release.** Browse/search/filter/queue/favorites/bookmarks, a real build+lint+format+test pipeline (209 automated tests), a Personal Learning Workspace (Study Goals, Notes, alias-aware Search 3.0 with natural-language query support), Learning Analytics, an optional AI Integration Layer (5 providers, off by default, lazy-loaded), and a full accessibility/security audit trail. See `RELEASE_NOTES.md` for this release specifically, `CHANGELOG.md` for the full version-by-version history, and `docs/V5_DEFERRED_SCOPE.md` for what was deliberately not built and why.

## 🎓 For Students

New to the Entry-Test Vault?

👉 **[Read the Student Guide](STUDENT-GUIDE.md)**

The guide explains how to download, open, navigate, and use the Vault.




Open `index.html` directly for the app — no build step required for local use (`npm run build` produces a minified `dist/` if you want a production bundle). See `docs/ARCHITECTURE.md` for the module map and design decisions, `docs/USER_GUIDE.md` for how to actually use it, and `docs/AI_INTEGRATION.md` for the AI layer specifically.

## Quick start

```
Double-click index.html. No install, no server, no internet required.
```

For development (linting, tests, production build):

```
npm install
npm run dev      # zero-build dev server
npm test         # 209 tests, Vitest + jsdom
npm run build    # minified dist/ output
```

## Documentation

- **`CHANGELOG.md`** — what shipped in each version, and why
- **`RELEASE_NOTES.md`** / **`RELEASE_REPORT.md`** — this release specifically: bugs fixed, real test/performance numbers, known limitations
- **`docs/USER_GUIDE.md`** — how to actually use the app
- **`docs/ARCHITECTURE.md`** — module map, dependency order, design decisions, milestone status, and what was actually tested (not just written)
- **`docs/AI_INTEGRATION.md`** / **`docs/PROVIDER_INTERFACE.md`** — the optional AI layer, how it works, what's verified
- **`docs/SECURITY.md`** / **`docs/ACCESSIBILITY.md`** — audit findings and fixes
- **`docs/V5_DEFERRED_SCOPE.md`** — features deliberately deferred (Knowledge Graph, ML recommendations, etc.), each with a concrete trigger condition for revisiting
- **`docs/FOLDER_STRUCTURE.md`** — annotated tree of every file and why it's there
- **`docs/INSTALLATION.md`** — running the dashboard and regenerating its data
- **`docs/EXTENSIBILITY.md`** — plugin/service-layer/data-provider/PWA/desktop hooks, explicit about what's built vs. prepared
- **`data/schema.md`** — exact shape of the data layer and how to import from other formats
- **`CONTRIBUTING.md`** — if you want to build on this

## Design principles this build follows

1. **The data layer is generated, never hand-written.** `data/vault-data.js` comes from `vault/build-vault-data.js`, which reads the actual Version 3.0 vault source. No resource content is hardcoded into HTML/JS.
2. **Every engine is called through a stable interface**, not accessed directly — `App.Data`, `App.Search`, `App.Filter`, `App.Storage`. This is what makes "AI search later" or "cloud sync later" a contained rewrite instead of a rearchitecture.
3. **No framework**, because a build step contradicts "open the file and it works." Revisit only if the vault grows large enough that render performance genuinely requires it — see `docs/ARCHITECTURE.md` for the specific threshold to watch.
4. **User data (favorites, progress, notes) never lives in the data file.** It's entirely in `localStorage`, namespaced `etv:*`, so regenerating the vault data can never silently erase someone's tracked progress.
5. **One component, many call sites.** `resourceCard.js` and `resourceModal.js` are each used from five+ different views instead of being re-implemented per page — see `docs/ARCHITECTURE.md` § V4.2 additions.
6. **Errors degrade one panel, not the whole app.** Every view render goes through `App.ErrorHandler.guard()`; a broken resource or a corrupted localStorage entry shows an inline error card in its own section instead of white-screening the dashboard.

## What's next

V4.5/V4.6 remain for a dedicated polish pass: loading skeletons, animation refinement, a broader accessibility audit, and cross-browser spot checks beyond the Chromium testing already done during V4.2. See `docs/ARCHITECTURE.md`'s milestone table for the full breakdown.

MIT License

Copyright (c) 2026 Mansoor Ahmad Jan
