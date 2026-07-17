# Entry-Test Knowledge Vault — Interactive Dashboard (V5.1)

<!-- Once this repo has a GitHub remote, replace OWNER/REPO below — the badge is a placeholder until then, not a live check. -->

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

An offline, framework-free browsing interface for the Pakistan Entry-Test Knowledge Vault (Version 3.0). The Word/Excel documents remain the source of truth; this dashboard is a faster way to browse, search, filter, and track progress through the same data.

**Current state (V5.1):** Browse/search/filter/queue/favorites/bookmarks (V4.1–V4.3), a real build+lint+format+test pipeline with 110 automated tests (V4.4), a Personal Learning Workspace — Study Goals, My Notes, alias-aware Search 2.0 (V5.0) — and a Learning Analytics dashboard covering progress, recommendations, revision tracking, and a timeline (V5.1). See `CHANGELOG.md` for the version-by-version detail and `docs/V5_DEFERRED_SCOPE.md` for what was deliberately not built and why.

Open `index.html` directly for the app — no build step required for local use (`npm run build` produces a minified `dist/` if you want a production bundle). See `docs/ARCHITECTURE.md` for what's built vs. what remains, and `docs/EXTENSIBILITY.md` for what's genuinely built vs. architecturally prepared for plugins/desktop/AI.

## Quick start

```
Double-click index.html. No install, no server, no internet required.
```

For development (linting, tests, production build):

```
npm install
npm run dev      # zero-build dev server
npm test         # 110 tests, Vitest + jsdom
npm run build    # minified dist/ output
```

## Documentation

- **`CHANGELOG.md`** — what shipped in each version, and why
- **`docs/ARCHITECTURE.md`** — module map, dependency order, design decisions, milestone status, and what was actually tested (not just written)
- **`docs/V5_DEFERRED_SCOPE.md`** — features deliberately deferred (Knowledge Graph, AI layer, etc.), each with a concrete trigger condition for revisiting
- **`docs/FOLDER_STRUCTURE.md`** — annotated tree of every file and why it's there
- **`docs/INSTALLATION.md`** — running the dashboard and regenerating its data
- **`docs/EXTENSIBILITY.md`** — plugin/service-layer/data-provider/PWA/desktop/AI hooks, explicit about what's built vs. prepared
- **`data/schema.md`** — exact shape of the data layer and how to import from other formats

## Design principles this build follows

1. **The data layer is generated, never hand-written.** `data/vault-data.js` comes from `vault/build-vault-data.js`, which reads the actual Version 3.0 vault source. No resource content is hardcoded into HTML/JS.
2. **Every engine is called through a stable interface**, not accessed directly — `App.Data`, `App.Search`, `App.Filter`, `App.Storage`. This is what makes "AI search later" or "cloud sync later" a contained rewrite instead of a rearchitecture.
3. **No framework**, because a build step contradicts "open the file and it works." Revisit only if the vault grows large enough that render performance genuinely requires it — see `docs/ARCHITECTURE.md` for the specific threshold to watch.
4. **User data (favorites, progress, notes) never lives in the data file.** It's entirely in `localStorage`, namespaced `etv:*`, so regenerating the vault data can never silently erase someone's tracked progress.
5. **One component, many call sites.** `resourceCard.js` and `resourceModal.js` are each used from five+ different views instead of being re-implemented per page — see `docs/ARCHITECTURE.md` § V4.2 additions.
6. **Errors degrade one panel, not the whole app.** Every view render goes through `App.ErrorHandler.guard()`; a broken resource or a corrupted localStorage entry shows an inline error card in its own section instead of white-screening the dashboard.

## What's next

V4.5/V4.6 remain for a dedicated polish pass: loading skeletons, animation refinement, a broader accessibility audit, and cross-browser spot checks beyond the Chromium testing already done during V4.2. See `docs/ARCHITECTURE.md`'s milestone table for the full breakdown.
