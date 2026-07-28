# Security Review (V5.2)

## Scope and method

The app's actual untrusted-input boundary is narrower than "everything
is untrusted": resource data ships curated in `data/vault-data.js`, but
Settings supports **importing a replacement vault-data file**, and
notes/goal targets are genuine free-form user input. This review is
about what happens if either of those paths carries something hostile.

Method: enumerated every `.innerHTML =` assignment in `js/` (62 sites
across 23 files), traced each interpolated value back to its source,
and checked whether user/import-controlled values are escaped before
reaching the DOM. Not sampled — every site was checked.

## What was already correct

- `App.Utils.escapeHtml()` correctly escapes all five dangerous
  characters (`& < > " '`), including quotes — which matters because
  it's used inside HTML attributes (`title="..."`, `aria-label="..."`),
  where an unescaped `"` would let a value break out and inject a new
  attribute.
- `App.Search.highlight()` (used for nearly every displayed resource
  title/description) escapes `&`/`<`/`>` before doing anything else,
  including when no search query is active.
- Notes (`resourceModal.js`'s textarea), toast messages
  (`App.Toast.show`), and diagnostics detail lines were already
  escaped correctly.
- `metaItem()` (resourceModal.js) already escaped its `value` argument
  — several fields I initially flagged via grep (university, subject,
  chapter, platform, resourceType, language, estTime) turned out to
  already be safe once I checked the function they're passed through,
  not just the call site.

## Real findings, fixed

1. **`resource.link` rendered into `href` unescaped, with no protocol
   check at render time** (`js/ui/resourceModal.js`). The app already
   had `App.Validators.isValidUrl()` (used in the diagnostics data
   validator), but it wasn't actually _enforced_ where the link gets
   used — a `javascript:` URI in an imported vault-data file would
   have rendered as a normal-looking "Open Resource" button that
   executes script on click. Fixed: the link is now validated
   (http/https only) before being rendered as a clickable `<a>`; an
   invalid link renders a disabled placeholder instead. Same fix
   applied to `js/ui/contextMenu.js`'s "open in new tab" action,
   which called `window.open()` on the raw link with the same risk.

2. **`resource.difficulty` / `.quality` / `.verificationStatus`
   interpolated raw** into badge `<span>` text across 5 files
   (`resourceModal.js`, `resourceCard.js`, `queueView.js`,
   `statsView.js`, `browseView.js`). These come from a fixed enum in
   normal use, but an imported vault-data file isn't guaranteed to
   respect that — fixed with `App.Utils.escapeHtml()` at all 8 call
   sites.

## Verified, not assumed

Every fix above was checked by actually attaching a malicious payload
to a **live DOM with script execution enabled** and confirming nothing
fires — not by string-matching the HTML output. That distinction
matters: an early version of this review checked
`html.includes("<script>")` and got a false positive, because a
correctly-escaped attribute value can legitimately _serialize_ back
with literal `<`/`>` characters without being unsafe (those characters
don't need escaping inside an already-quoted attribute value — only
the matching quote character does, and that WAS escaped). The
permanent regression test (`tests/security/xss.test.mjs`) uses the
correct method: render the payload into a real document, wait a tick,
check whether an `onerror`/`<script>` handler actually set a flag.

The test suite's teeth were verified directly: temporarily reverted the
`href` validation fix, confirmed the relevant test failed, restored the
fix, confirmed it passed again (byte-identical diff against the
pre-revert file).

## What this review did not cover

- **Service worker / cache poisoning** — out of scope for this pass;
  `sw.js`'s cache logic wasn't audited here.
- **`localStorage` tampering** — a user with devtools access can edit
  their own `localStorage` directly regardless of any in-app
  validation; this was never a security boundary (it's the user's own
  device/data) and isn't treated as one.

- **Supply chain (npm dependencies)** — actually run, not just
  suggested: `npm audit` found one moderate advisory
  ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)),
  in `esbuild`, concerning its built-in dev server accepting
  cross-origin requests. This project never invokes that server —
  `scripts/build.mjs` only calls `esbuild.transform()`, and `npm run
dev` uses `http-server`, not esbuild's — so the advisory's actual
  attack surface didn't exist in this codebase's usage. Upgraded
  anyway (`esbuild@latest`, a clean upgrade with no build breakage):
  `npm audit` now reports 0 vulnerabilities.

## AI provider API keys — storage trade-off (V6.0.1)

API keys entered in AI Settings are stored in `sessionStorage`, not
`localStorage`. This is a different threat than the `localStorage`
tampering point above. That one is about a user editing their own
data on their own device — not a real security boundary. This one is
about a third-party script (XSS) reading a secret and exfiltrating it
somewhere the user never intended — a real boundary worth defending.

No purely client-side, no-backend app can fully close that gap: any
encryption scheme still needs its decryption key reachable by JS at
runtime, which an XSS payload running in the same page can reach too.
`sessionStorage` doesn't prevent theft while the tab is open — it
reduces the exposure window from indefinite to "until the tab
closes," and keys are excluded from `exportAll()` so they can't leak
into a shared backup file either. `clearAll()` (Reset/Clear All Data)
also explicitly wipes the `sessionStorage` copy, not just
`localStorage` keys.

Users who want zero client-side exposure of a cloud-provider key
should use the local Ollama/LM Studio provider instead, which
requires no key at all.

A strict Content-Security-Policy (`default-src 'self'`, no
`unsafe-inline`) is also in place as of V6.0.1, which mitigates the
actual delivery mechanism (script injection) rather than protecting
the secret after the fact. The one inline script this app previously
had (the pre-paint theme-flash-prevention snippet in `index.html`)
was externalized to `js/core/earlyTheme.js` specifically so it could
keep running without weakening the CSP with `unsafe-inline`.