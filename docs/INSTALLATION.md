# Installation Guide

## Running the dashboard (no install needed)

1. Copy the entire `dashboard/` folder anywhere on your computer.
2. Double-click `index.html`, or right-click → Open With → your browser.
3. That's it. No server, no `npm install`, no build step. Works fully offline.

You should see an **architecture self-test** page (V4.1) confirming 7/7 checks pass. This will be replaced by the real browsing UI in V4.2 — the underlying engines it's testing don't change.

### Why not just double-click and see the final dashboard?

Because V4.2 (the visual UI) hasn't been built yet — this response is milestone V4.1 only, per your instruction to split the build across milestones. What you're opening now is proof that the foundation V4.2 will be built on top of actually works.

## Regenerating the data from an updated vault

If the underlying Version 3.0 Knowledge Vault data changes (new resources added, links fixed, etc.), regenerate the dashboard's data file:

```bash
cd vault/                 # wherever data_v3.js lives
node build-vault-data.js
```

This overwrites `dashboard/data/vault-data.js` and `dashboard/data/vault-data.json`. It does **not** touch anything in the browser's `localStorage` — your favorites, progress, bookmarks, and notes are safe across data updates, because they're stored separately from the vault data itself (see `docs/ARCHITECTURE.md` → Data flow, and `data/schema.md`).

## Browser requirements

Any modern browser (Chrome, Edge, Firefox, Safari from roughly the last 3–4 years). The code uses plain ES6+ (`const`/`let`, arrow functions, `Map`/`Set`, template literals) with no transpilation — if your browser can run this, it needs no polyfills; if it can't, it's old enough that the dashboard isn't a priority.

## Verifying the install worked

Open the browser's developer console (F12) after loading `index.html`. You should see no red errors. The on-page self-test panel is the human-readable version of the same check — if it shows 7/7 passed, everything is wired correctly.

## Troubleshooting

| Symptom                               | Likely cause                                                  | Fix                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Self-test shows fewer than 7/7 passed | A script failed to load — check the browser console for a 404 | Make sure the whole `dashboard/` folder (not just `index.html`) was copied, including `css/`, `js/`, `data/` |
| "window.VAULT_DATA not found" error   | `data/vault-data.js` is missing or was renamed                | Re-run `build-vault-data.js`, or confirm the file exists at `dashboard/data/vault-data.js`                   |
| Page looks unstyled                   | A `.css` file failed to load                                  | Same as above — confirm the full folder structure was copied intact                                          |
