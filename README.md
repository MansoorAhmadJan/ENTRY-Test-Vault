# Entry-Test Knowledge Vault — Interactive Dashboard (v6.0.0)

[![CI](https://github.com/MansoorAhmadJan/ENTRY-Test-Vault/actions/workflows/ci.yml/badge.svg)](https://github.com/MansoorAhmadJan/ENTRY-Test-Vault/actions/workflows/ci.yml)

An offline, framework-free browsing interface for the Pakistan Entry-Test Knowledge Vault (Version 3.0). The Word/Excel documents remain the source of truth; this dashboard is a faster way to browse, search, filter, and track progress through the same data.

**v6.0.0 — Final Stable Release.** Browse/search/filter/queue/favorites/bookmarks, a real build+lint+format+test pipeline (209 automated tests), a Personal Learning Workspace (Study Goals, Notes, alias-aware Search 3.0 with natural-language query support), Learning Analytics, an optional AI Integration Layer (5 providers, off by default, lazy-loaded), and a full accessibility/security audit trail.

See `RELEASE_NOTES.md` for this release specifically, `CHANGELOG.md` for the full version-by-version history, and `docs/V5_DEFERRED_SCOPE.md` for what was deliberately not built and why.

## 🎓 For Students

New to the Entry-Test Vault?

👉 **[Read the Student Guide](STUDENT-GUIDE.md)**

The guide explains how to download, open, navigate, and use the Vault.

Open `index.html` directly for the app — no build step required for local use (`npm run build` produces a minified `dist/` if you want a production bundle).

See `docs/ARCHITECTURE.md` for the module map and design decisions, `docs/USER_GUIDE.md` for how to use the application, and `docs/AI_INTEGRATION.md` for the AI layer specifically.

## Quick start

```text
Double-click index.html. No install, no server, no internet required.
```

For development (linting, tests, and production build):

```bash
npm install
npm run dev
npm test         # 209 tests, Vitest + jsdom
npm run build    # minified dist/ output
```

## Documentation

* **`CHANGELOG.md`** — what shipped in each version, and why
* **`RELEASE_NOTES.md`** / **`RELEASE_REPORT.md`** — this release specifically: bugs fixed, real test/performance numbers, and known limitations
* **`docs/USER_GUIDE.md`** — how to use the application
* **`docs/ARCHITECTURE.md`** — module map, dependency order, design decisions, milestone status, and what was actually tested
* **`docs/AI_INTEGRATION.md`** / **`docs/PROVIDER_INTERFACE.md`** — the optional AI layer, how it works, and what's verified
* **`docs/SECURITY.md`** / **`docs/ACCESSIBILITY.md`** — audit findings and fixes
* **`docs/V5_DEFERRED_SCOPE.md`** — features deliberately deferred, including Knowledge Graph and ML recommendations, with trigger conditions for revisiting them
* **`docs/FOLDER_STRUCTURE.md`** — annotated tree of every file and why it's there
* **`docs/INSTALLATION.md`** — running the dashboard and regenerating its data
* **`docs/EXTENSIBILITY.md`** — plugin/service-layer/data-provider/PWA/desktop hooks, with a distinction between what is built and what is prepared
* **`data/schema.md`** — exact shape of the data layer and how to import from other formats
* **`CONTRIBUTING.md`** — contribution and development information

## Design principles this build follows

1. **The data layer is generated, never hand-written.** `data/vault-data.js` comes from `vault/build-vault-data.js`, which reads the actual Version 3.0 vault source. No resource content is hardcoded into HTML/JS.

2. **Every engine is called through a stable interface**, not accessed directly — `App.Data`, `App.Search`, `App.Filter`, `App.Storage`. This makes future integrations such as AI search or cloud synchronization more contained rather than requiring a complete rearchitecture.

3. **No framework**, because a build step contradicts "open the file and it works." Revisit only if the vault grows large enough that render performance genuinely requires it — see `docs/ARCHITECTURE.md` for the specific threshold to watch.

4. **User data (favorites, progress, notes) never lives in the data file.** It's entirely in `localStorage`, namespaced `etv:*`, so regenerating the vault data cannot silently erase tracked progress.

5. **One component, many call sites.** `resourceCard.js` and `resourceModal.js` are each used from five+ different views instead of being re-implemented per page — see `docs/ARCHITECTURE.md` § V4.2 additions.

6. **Errors degrade one panel, not the whole app.** Every view render goes through `App.ErrorHandler.guard()`; a broken resource or corrupted localStorage entry shows an inline error card in its own section instead of white-screening the dashboard.

## What's next

V4.5/V4.6 remain for a dedicated polish pass: loading skeletons, animation refinement, a broader accessibility audit, and cross-browser spot checks beyond the Chromium testing already done during V4.2.

See `docs/ARCHITECTURE.md`'s milestone table for the full breakdown.

## Author

**Mansoor Ahmad Jan**

Sole creator and developer of the Entry-Test Knowledge Vault Interactive Dashboard.

## License

Copyright © 2026 Mansoor Ahmad Jan.

This project is proprietary. All rights reserved.

The source code, original design, documentation, and original project assets may not be copied, reproduced, modified, distributed, published, sublicensed, sold, or otherwise used without prior written permission from the copyright holder.

Third-party libraries, frameworks, resources, or content included in or used by this project remain subject to their respective licenses and terms.

See [`LICENSE`](LICENSE) for the complete terms.
