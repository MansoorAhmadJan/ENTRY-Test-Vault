# Release Assets — v6.0.0

Stated honestly rather than fabricated: this is a text/code environment
with no real browser to screenshot, no video/GIF capture, and no raster
image generation tool available. Here's what's real and what isn't.

## Application icon — exists, one real gap

`icons/favicon.svg` is a real, existing SVG icon (referenced in
`manifest.json` and `index.html`). It covers modern browsers/OSes that
support SVG PWA icons via `"sizes": "any"`.

**Gap:** stricter PWA installability checks (notably Lighthouse's PWA
audit, and some older Android/iOS "add to home screen" flows) expect
explicit PNG icons at specific sizes — commonly 192×192 and 512×512,
plus a maskable variant. Generating real PNG raster images isn't
possible in this environment. If you want full Lighthouse PWA-audit
compliance, export `icons/favicon.svg` to PNG at 192×192 and 512×512
(any image editor or `npx sharp-cli` can do this in seconds) and add
both to `manifest.json`'s `icons` array.

## Screenshots — not produced

Would require an actual browser rendering the app and a screenshot
tool — neither exists in this environment. `docs/USER_GUIDE.md`
describes each screen in enough detail to reconstruct what a
screenshot would show, if that's useful as a stand-in.

## Demo GIF — not produced

Same limitation — no real browser, no screen recording capability here.

## Demo video outline — this I can actually produce, and did

A script/storyboard is a text artifact, genuinely within reach:

1. **Open** (0:00–0:15) — double-click `index.html`, no install step,
   home screen with Continue Studying / Study Queue / quick stats.
2. **Search** (0:15–0:40) — type a natural-language query ("what are
   the giki past papers"), show the alias/topic-aware match, open a
   result.
3. **Track progress** (0:40–1:10) — mark a resource In Progress, add
   one to the Reading Queue, favorite one from a card (show the
   sidebar badge update live — this release's bug fix).
4. **Study Goals & Analytics** (1:10–1:45) — set a daily goal, show
   the streak counter, jump to Learning Analytics for the subject
   progress chart and a recommendation.
5. **AI Tools, opt-in** (1:45–2:15) — show AI Settings (disabled by
   default), enable Ollama, open a resource, click "Explain this,"
   show the response.
6. **Offline** (2:15–2:35) — toggle devtools offline mode, reload,
   show the app still works.
7. **Close** (2:35–2:45) — Diagnostics page: test suite badge, build
   info, "built with 209 automated tests."

## Social preview image — not produced

Same raster-image limitation as the PNG icons above. A simple banner
(app name + tagline on a solid background matching the theme color
`#1f3864`) would satisfy GitHub's social-preview requirement (1280×640
PNG/JPG) — straightforward to make in any design tool using the same
navy/gold palette as `icons/favicon.svg`, just not producible here.

## What IS packaged and real

- Production `dist/` build (verified, smoke-tested)
- Full source + tests + docs, zipped
- `manifest.json` (valid PWA manifest, SVG icon)
- `sw.js` (offline support, the V6.0 bug fix included)
