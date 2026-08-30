# Extensibility Guide (V4.3)

This document is deliberately split into two kinds of claims: things that are **built and tested** in this codebase right now, and things the architecture is **prepared for** but does not implement. Objective #9 in the V4.3 brief asked to "prepare the architecture" for six things — that phrase is taken literally below. Claiming a hook point as "done" when only a config surface exists would be the same overclaim this project has avoided everywhere else.

## 1. Plugin System — **prepared, not built**

There is no plugin loader in this codebase. What exists is the structural precondition for one: every feature is a self-contained module attached to `window.App.<Name>`, registered independently, with no module reaching into another's internals (see `docs/ARCHITECTURE.md` § Module map). A plugin system, when built, would look like:

```js
// Proposed shape — NOT implemented:
App.Plugins.register({
  id: "my-plugin",
  onInit: () => {
    /* runs after App.Data.init() */
  },
  navItems: [{ route: "my-view", label: "My View", icon: "..." }],
  views: {
    "my-view": (container, route) => {
      /* ... */
    },
  },
});
```

Because `App.Views` is already a flat registry keyed by route name (see `js/views/*.js`), and `App.Config.NAV_ITEMS` is already a plain array a sidebar renders from, a plugin loader's actual job would be small: merge plugin-provided entries into those two structures before `app.js` mounts the shell. The reason this isn't built now is that a plugin system with no second plugin to validate it against is speculative code — it would be guessing at an API surface no real use case has exercised yet.

## 2. Service Layer — **partially built**

`App.Data`, `App.Search`, `App.Filter`, and `App.Storage` already function as a service layer: every view calls them through a stable function interface, never touching `window.VAULT_DATA` or `localStorage` directly (`js/data/dataLoader.js` is explicitly documented as "the ONLY module that reads the raw shape"). What's **not** built is a formal service registry or dependency-injection container — at this app's size (a few dozen modules, no test doubles needed), that would add indirection without a corresponding benefit. If a future version needs swappable service implementations (e.g., a mock `App.Data` for testing), the existing function-object pattern (`App.Data = { init, getAll, ... }`) already supports drop-in replacement — just assign a different object to `window.App.Data` before `app.js` runs.

## 3. Multiple Data Providers — **prepared, single provider built**

`App.Data.reload(payload)` (added V4.3, see `js/data/dataLoader.js`) already accepts any object matching the vault-data shape and rebuilds every index from it — this is the seam a second data provider would plug into. Today there is exactly one provider: the generated `data/vault-data.js`. A hypothetical second provider (e.g., fetching from a remote API instead of a static file) would implement:

```js
// Proposed interface — NOT implemented:
DataProvider.fetch() -> Promise<VaultDataPayload>  // same shape as data/vault-data.js
```

and call `App.Data.reload(payload)` with the result. No changes to `App.Search`, `App.Filter`, or any view would be needed — they all consume `App.Data`'s output, not the provider.

## 4. PWA Support — **built**

`manifest.json` and `sw.js` exist and were verified working (not just written) during this build: service worker registration was confirmed to actually occur when the dashboard is served over `http://` (tested via a local Python server), and confirmed to safely no-op under `file://` (tested directly) — see `sw.js`'s header comment for why both behaviors are correct. This is the one item in this list that's a completed feature, not a prepared seam.

## 5. Desktop Application Packaging — **prepared, not built**

No Electron/Tauri/NW.js wrapper exists in this repository. The reason packaging is realistic without restructuring: the app has zero build step, zero server dependency, and zero absolute paths (every `<script src="...">` and CSS `url()` is relative) — the exact preconditions a desktop wrapper needs to load a local folder as its UI. A minimal Electron wrapper would be:

```js
// Proposed main.js — NOT implemented, not part of this codebase:
const { app, BrowserWindow } = require("electron");
app.whenReady().then(() => {
  const win = new BrowserWindow({ width: 1400, height: 900 });
  win.loadFile("dashboard/index.html");
});
```

This isn't included because adding an `electron` dependency and a packaging pipeline is a meaningful scope/tooling decision (npm dependency, build step, code signing for distribution) that the "no frameworks, no build step" project constraint deliberately avoids taking on speculatively.

## 6. Future AI Integration — **prepared, not built**

No AI/LLM calls exist anywhere in this codebase (this dashboard is fully offline and makes no network requests other than the optional service worker's asset caching). The prepared seam is `App.Search`: it already exposes a stable `search(query, limit) -> Resource[]` function that every caller (header, Browse, command palette) uses uniformly. A future AI-backed search would implement the same signature —

```js
// Proposed — NOT implemented:
App.Search.search = async (query, limit) => {
  /* call an LLM/embedding endpoint, return Resource[] */
};
```

— and every existing call site keeps working unchanged, because none of them depend on the current inverted-index implementation, only on the function's input/output contract. The same applies to a future "AI study plan" feature: it would read from `App.Data` and write to `App.Storage.reorderQueue()` (added V4.3), exactly like the human-driven Reading Queue feature does today.

## Summary table

| Item                    | Status                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| Plugin system           | Prepared (modular registries exist); loader not built                                     |
| Service layer           | Substantially built (Data/Search/Filter/Storage); no DI container                         |
| Multiple data providers | Prepared (`App.Data.reload()` exists); one provider implemented                           |
| PWA support             | **Built and verified** (manifest + service worker, tested under both file:// and http://) |
| Desktop packaging       | Prepared (zero build step, relative paths); no wrapper included                           |
| AI integration          | Prepared (stable `App.Search`/`App.Storage` interfaces); no AI code                       |
