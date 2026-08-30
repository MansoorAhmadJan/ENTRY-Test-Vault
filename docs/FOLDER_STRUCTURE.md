# Folder Structure — Entry-Test Knowledge Vault Dashboard

```
dashboard/
├── index.html                  Entry point. Open this file directly — no server needed.
├── manifest.json                PWA manifest (V4.3) — enables "Add to Home Screen" when served over http(s).
├── sw.js                        Service worker (V4.3) — app-shell caching; no-ops safely under file://.
│
├── assets/                     Reserved for future static assets (images, fonts) — empty by
│                                design; icons are inline SVG (see js/ui/icons.js) so nothing
│                                needs to live here yet.
│
├── css/
│   ├── variables.css            Design tokens (colors, spacing, radii, fonts). Every other
│   │                            CSS file reads from these — change theme/branding here only.
│   ├── base.css                 Reset + base element styles (body, headings, links).
│   ├── layout.css                App shell: sidebar/header/main grid, modal, page structure.
│   ├── components.css           Reusable UI pieces: cards, badges, buttons, modals, charts,
│   │                            command palette, context menu, filter presets (V4.3 additions
│   │                            appended at the end of the file, clearly marked).
│   └── responsive.css            Breakpoints for tablet/laptop/desktop; prefers-reduced-motion.
│
├── js/
│   ├── app.js                   Bootstrap. Loads last; wires every module together, mounts
│   │                            the app shell, wires the router to the view registry, records
│   │                            startup performance marks, registers the service worker.
│   ├── core/
│   │   ├── config.js              Central config: nav structure, routes, keyboard shortcuts.
│   │   ├── state.js               Minimal pub/sub store for cross-component UI state.
│   │   ├── router.js              Hash-based navigation (#/browse, #/resource/:id, etc.).
│   │   ├── themeManager.js        Light/dark + high-contrast, applies <html> attributes.
│   │   ├── errorHandler.js        Render guards + safe-call wrapper (graceful degradation).
│   │   └── perfMonitor.js         Startup timing marks, data/localStorage size estimates (V4.3).
│   ├── data/
│   │   └── dataLoader.js          Loads window.VAULT_DATA, builds Map-based indices. The ONLY
│   │                            module that reads the raw data shape. reload() (V4.3) supports
│   │                            session-only runtime data import.
│   ├── search/
│   │   ├── searchEngine.js       Inverted-index instant search + highlighting + fuzzy typo-
│   │   │                        tolerant fallback + autocomplete suggestions (V4.3) + index
│   │   │                        health reporting (V4.3).
│   │   └── filterEngine.js       Faceted filtering (university, subject, difficulty, ...).
│   ├── diagnostics/
│   │   └── vaultDiagnostics.js    Data-integrity checks: duplicate IDs, malformed URLs,
│   │                            invalid enum values, dangling related-resource references.
│   ├── storage/
│   │   └── storageService.js     All localStorage reads/writes (theme, favorites, progress,
│   │                            bookmarks, notes, recently-viewed, view counts, preferences,
│   │                            search history, saved searches, filter presets, reading
│   │                            queue — the last four added V4.3).
│   ├── utils/
│   │   ├── helpers.js             Generic helpers: debounce, escapeHtml, groupBy, countBy.
│   │   ├── formatters.js          Display formatting: star ratings, dates, badge colors.
│   │   ├── validators.js          Resource-shape validation, used by diagnostics.
│   │   ├── constants.js           Enumerated value lists — single source of truth.
│   │   └── fuzzyMatch.js          Levenshtein distance + typo-tolerance threshold (V4.3).
│   ├── ui/
│   │   ├── icons.js               Inline SVG icon library (no icon font, no image files).
│   │   ├── dom.js                 Tiny DOM helpers: el(), qs(), delegate().
│   │   ├── focusTrap.js           Tab-cycling + focus restoration for modals (V4.3).
│   │   ├── toast.js               Notification component.
│   │   ├── resourceCard.js        Reusable Resource Card — used by every view that lists resources.
│   │   ├── resourceModal.js       Resource Viewer modal — full metadata, progress, notes.
│   │   ├── shortcutsModal.js      Keyboard shortcuts help panel.
│   │   ├── commandPalette.js      Ctrl+K unified command + resource search (V4.3).
│   │   ├── contextMenu.js         Right-click quick actions on resource cards (V4.3).
│   │   ├── virtualList.js         Windowed rendering for large List-view result sets (V4.3).
│   │   ├── sidebar.js             Primary navigation with live counts.
│   │   ├── header.js              Global instant search (+ history/suggestions, V4.3) and
│   │   │                        theme/contrast controls.
│   │   ├── breadcrumbs.js         Pure function of current route.
│   │   └── filterPanel.js         Advanced multi-filter UI + filter presets (V4.3), talks to App.Filter.
│   └── views/                     One file per route; each exports (container, route) => void
│       ├── homeView.js             #/home — stats, recent, Continue Studying (V4.3), quick actions.
│       ├── browseView.js           #/browse, #/university/:key, #/subject/:name.
│       ├── collectionView.js       #/favorites, #/bookmarks, #/progress (shared renderer).
│       ├── queueView.js            #/queue — Reading Queue with drag-to-reorder (V4.3).
│       ├── statsView.js            #/stats — charts, completion %, most-used.
│       ├── diagnosticsView.js      #/diagnostics — data integrity, performance (V4.3), system health.
│       └── settingsView.js         #/settings — theme, granular exports (V4.3), vault-data import (V4.3).
│
├── icons/
│   └── favicon.svg               Browser tab icon. (In-app icons are inline SVG in icons.js.)
│
├── data/
│   ├── vault-data.js             GENERATED. window.VAULT_DATA — loaded via <script>, not
│   │                            fetch, so it works under file://. Never hand-edit this file.
│   ├── vault-data.json           GENERATED. Canonical JSON twin, for future import/export tooling.
│   └── schema.md                 Documents the exact shape of vault-data.js and how to
│                                 regenerate it from an updated Word/Excel/JSON/CSV source.
│
└── docs/
    ├── ARCHITECTURE.md           Module map, dependency order, design rationale, milestone
    │                            status, and what was actually tested vs. just written.
    ├── FOLDER_STRUCTURE.md       This file.
    ├── INSTALLATION.md           How to open/run the dashboard, and how to regenerate its data.
    └── EXTENSIBILITY.md          Plugin/service-layer/data-provider/PWA/desktop/AI hooks (V4.3)
                                 — explicit about what's built vs. architecturally prepared.
```

## Where the generator script lives (outside `dashboard/`)

```
vault/
└── build-vault-data.js         Reads vault/data_v3.js (the V3.0 Knowledge Vault source data)
                                 and writes dashboard/data/vault-data.js + .json. Lives next to
                                 the vault source, not inside dashboard/, since it's a build
                                 tool for the vault's maintainers, not part of the shipped app.
```

## Naming conventions used throughout

- **Files**: `camelCase.js` for JS modules, `kebab-case.css` for stylesheets, `UPPER_SNAKE.md` for docs meant to be read top-to-bottom, `Title_Case.md` is avoided to keep filenames shell-friendly.
- **JS namespace**: everything hangs off `window.App.<ModuleName>` (PascalCase module names — `App.Data`, `App.Search`) to avoid global namespace pollution while staying framework-free.
- **CSS**: BEM-ish (`self-test-row`, `self-test-row.pass`) rather than strict BEM — enough structure to avoid collisions without the verbosity overhead at this project size.
- **localStorage keys**: namespaced `etv:*` (Entry Test Vault) so this app never collides with anything else that might share a browser profile.
