# Vault Data Schema (v1) — /dashboard/data/vault-data.js

The dashboard never hardcodes resource content into the interface. Everything
rendered in the UI comes from a single global object, `window.VAULT_DATA`,
loaded via a plain `<script>` tag (not `fetch`) so the dashboard works from
`file://` with zero server and zero build step.

## Why a `.js` file instead of `.json`

Browsers block `fetch()` of local files under the `file://` protocol (CORS).
A `<script src="data/vault-data.js">` tag has no such restriction. The file
is valid JSON assigned to a global — swap it for a real `fetch('data/vault-data.json')`
call in `js/data/dataLoader.js` if you later serve the dashboard over HTTP.

## Top-level shape

```js
window.VAULT_DATA = {
  generatedAt: "2026-07-12",      // ISO date this export was generated
  sourceVersion: "3.0",            // which Knowledge Vault version this came from
  universities: [ University ],
  searchAliases: { "term": "canonical tag/subject", ... },
  resources: [ Resource ]
};
```

## University object

| Field    | Type   | Notes                             |
| -------- | ------ | --------------------------------- |
| key      | string | Stable short key, e.g. `"NUST"`   |
| label    | string | Display name, e.g. `"NUST / NET"` |
| fullName | string | Full institution name             |

## Resource object

| Field              | Type         | Notes                                                                                                                                                          |
| ------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                 | string       | Permanent ID, e.g. `"ETV-0031"`. Never reused.                                                                                                                 |
| title              | string       |                                                                                                                                                                |
| description        | string       |                                                                                                                                                                |
| university         | string       | Must match a `universities[].key`                                                                                                                              |
| subject            | string       | One of the 8 standardized subjects                                                                                                                             |
| category           | string       | Original library category (e.g. "Past Papers")                                                                                                                 |
| chapter            | string       | Scope label, e.g. "Grade 11 / FSC Part 1"                                                                                                                      |
| platform           | string       | e.g. "Google Drive", "YouTube Playlist"                                                                                                                        |
| resourceType       | string       | Standardized type, see Maintenance Manual                                                                                                                      |
| difficulty         | string       | Beginner / Intermediate / Advanced                                                                                                                             |
| priority           | number       | 1–5 (star rating)                                                                                                                                              |
| quality            | string       | Excellent / Good / Average                                                                                                                                     |
| estTime            | string       | Free-text planning estimate                                                                                                                                    |
| language           | string       | e.g. "English"                                                                                                                                                 |
| status             | string       | Not Started / In Progress / Completed / Revision Needed — **this is the document's baseline; the dashboard overrides it per-user via localStorage, see below** |
| verificationStatus | string       | Verified / Outdated / Broken / Needs Review                                                                                                                    |
| dateAdded          | string       | ISO date                                                                                                                                                       |
| lastUpdated        | string       | ISO date                                                                                                                                                       |
| prerequisites      | string[]     | May be empty                                                                                                                                                   |
| relatedResources   | string[]     | Array of other resource IDs                                                                                                                                    |
| tags               | string[]     | Plain tags                                                                                                                                                     |
| tagsNamespaced     | string[]     | `namespace:value` tags, see Maintenance Manual                                                                                                                 |
| isCrossRef         | boolean      | True if this is a cross-reference pointer, not a full entry                                                                                                    |
| crossRefTarget     | string\|null | Label of the canonical library, if `isCrossRef`                                                                                                                |
| link               | string       | Direct URL                                                                                                                                                     |
| notes              | string       | Free-text, empty by default — **user notes are stored in localStorage, not here**                                                                              |

## Important: document baseline vs. live user state

`status` in this file is the **document baseline** (what Version 3.0 shipped
with — almost always `"Not Started"`). The dashboard's actual source of truth
for progress, favorites, bookmarks, and personal notes while you use it is
**localStorage** (see `js/storage/localStorage.js`), keyed by resource ID.
This file is never mutated by the dashboard at runtime — re-exporting it from
an updated Word/Excel vault will not erase anyone's tracked progress.

## Importing from other formats

To regenerate `vault-data.js` from an updated vault:

1. **From Excel** — read the `All Resources` sheet (it already has this exact
   column set, see the V3.0 Maintenance Manual). Map columns 1:1 to the
   Resource object above.
2. **From Word** — not recommended as a source of truth for bulk import;
   Word libraries are a human-readable view generated _from_ the same data
   model this file mirrors. Regenerate from the data model instead.
3. **From JSON/CSV** — any tool that can emit the Resource shape above works;
   validate required fields (`id`, `title`, `university`, `subject`, `link`)
   are non-empty before writing the file.

Always output valid JSON assigned to `window.VAULT_DATA = ...;` — the parser
in `js/data/dataLoader.js` expects the global to already exist when it runs.
