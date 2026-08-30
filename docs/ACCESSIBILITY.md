# Accessibility Audit (V5.2)

## What this is

An automated `axe-core` audit run against the real, running application
(`tests/accessibility/axe.test.mjs`), not a manual checklist or a claim
taken on faith. It runs in CI on every push (`.github/workflows/ci.yml`,
via `npm test`).

Before this, `docs/ARCHITECTURE.md` had claimed "accessibility
foundations" since V4.3 without an automated check behind that claim.
This audit is what makes that claim verifiable instead of asserted.

## How it works

`tests/accessibility/axe.test.mjs` serves the real `index.html` over a
real local HTTP server (not a hand-rolled DOM shell — an earlier draft
of this test used a bare `<body>` skeleton and produced 2 false-positive
violations for a missing `<title>`/`lang` that the real `index.html`
already has), boots the real app in jsdom, navigates to a view, and runs
`axe.run()` against the live DOM. Covers Home, Browse (resource cards),
Learning Analytics (the most complex view), and Settings (the most form
controls).

## Real findings, and what was fixed

Three genuine violations were found in `js/ui/resourceCard.js`, the
component every resource-listing view uses:

1. **`aria-allowed-role`** — the card was an `<article role="button">`.
   `button` isn't an ARIA-allowed role for `<article>`.
2. **`nested-interactive`** (serious) — that same fake "button" card
   contained two real `<button>` elements (favorite/bookmark toggles).
   A screen reader cannot correctly present an interactive control
   nested inside another interactive control.
3. **`heading-order`** — the card title was an `<h3>` with no `<h2>`
   between it and the page's `<h1>`, breaking the document outline.

**Fix:** the standard "stretched button" pattern. Only the card title
is now a real `<button>` (`.rc-open-btn`); CSS
(`.rc-open-btn::before { position: absolute; inset: 0; }`) makes its
clickable _area_ cover the entire card, so clicking anywhere still opens
it — the UX is unchanged, verified directly (see commit) — while the
DOM itself has no nested interactive elements. The card title is no
longer a heading element at all (it's redundant with the button's own
`aria-label`, which already gives assistive tech the resource's name).

A fourth, related finding — `aria-prohibited-attr` — was `aria-label`
on a plain `<span>` (the star-rating indicator), which isn't an allowed
attribute for a `generic`-role element. Fixed by giving it `role="img"`
(the correct pattern for "a glyph that stands in for text"). Fixing
this surfaced a **real accessibility gap that predates this audit**:
`js/views/browseView.js`'s star rating had no `aria-label` at all —
found only because the fix was applied consistently across all three
call sites instead of just the one axe flagged.

## Known limitations — stated plainly, not hidden

`jsdom` has no real layout/paint/rendering engine. Three checks always
come back `"incomplete"` (axe's "cannot automatically determine" state,
**not** a pass) in this environment, regardless of the real app:

- **`color-contrast`** — cannot be computed without real rendering.
- **`landmark-one-main`** / **`page-has-heading-one`** — the audit
  directly confirmed `<main>` and `<h1>` both exist and are not
  `display:none` in the real DOM (see the test file's inline checks),
  but jsdom's limited visibility detection still can't fully confirm it.

**This automated suite is not a substitute for periodically checking
real color contrast and visual rendering with a real browser** —
Lighthouse or the axe DevTools browser extension. It catches real
structural/ARIA problems (and did, three of them) that a visual-only
check would likely miss; it does not replace visual verification.

## Result

0 violations across all 4 audited views, verified 3 times in a row for
flake (an earlier version of this test had a fixed-timeout race
condition — fixed to poll for readiness instead of guessing a delay).
