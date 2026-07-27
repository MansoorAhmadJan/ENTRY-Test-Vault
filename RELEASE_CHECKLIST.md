# Release Checklist — v6.0.0

## Pre-release verification

- [x] Full test suite passes (`npm test`) — 209/209
- [x] Lint clean (`npm run lint`) — 0 errors, 6 known/accepted warnings
- [x] Format check clean (`npm run format:check`)
- [x] Production build succeeds (`npm run build`)
- [x] Production build smoke-tested (boots, renders, zero runtime errors)
- [x] `npm audit` — 0 vulnerabilities
- [x] Accessibility audit — 0 violations, 5 views checked
- [x] Security review — see `docs/SECURITY.md` (V5.2) + this release's
      AI-request-handling spot check
- [x] `package.json` version matches the release tag
- [x] `CHANGELOG.md` updated
- [x] `RELEASE_NOTES.md` written
- [x] `LICENSE` present
- [x] `CONTRIBUTING.md` present
- [x] `docs/USER_GUIDE.md` present

## What's genuinely NOT verified (stated honestly, not silently skipped)

- [ ] Real-browser smoke test (this environment tests via jsdom + a real
      HTTP server, which catches script/DOM/network-logic bugs but not
      real rendering/paint/CSS issues — recommend opening `dist/index.html`
      in an actual browser once before tagging, if that's feasible for you)
- [ ] Real AI provider call (no API keys or local Ollama/LM Studio
      instance available in this environment — the code is verified
      against real API docs and tested with realistic mocks, not a live call)
- [ ] Real screenshots/GIFs/demo video (see `RELEASE_ASSETS.md`)
- [ ] Multi-browser compatibility check (Safari, Firefox, mobile browsers)
- [ ] Real device offline test (airplane mode on an actual phone/laptop
      after installing as a PWA)

## Tagging

```
git tag -a v6.0.0 -m "v6.0.0 — Final Stable Release"
git push origin v6.0.0   # requires a configured remote — none exists in this environment
```

## GitHub Release (once a remote exists)

1. Push the tag above.
2. Draft a release on GitHub targeting `v6.0.0`.
3. Paste `RELEASE_NOTES.md`'s content into the release description.
4. Attach the packaged ZIP (see `RELEASE_REPORT.md` for what's included).
5. Mark as the latest release.
