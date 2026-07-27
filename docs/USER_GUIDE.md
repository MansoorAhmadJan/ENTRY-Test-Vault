# User Guide

## Getting started

Double-click `index.html`. No install, no account, no internet required
after the first load (see `docs/INSTALLATION.md` for details on the
offline service worker, which is optional and only relevant if you're
hosting this on a server rather than opening the file directly).

## Finding resources

- **Browse** — filter by university, subject, category, difficulty, and
  more. Switch between grid and list view.
- **Search** — type in the search bar at the top. Understands synonyms
  ("FLP" finds "mock test", "mechanics" finds Physics resources) and
  natural-language phrasing ("what are the past papers" works the same
  as "past papers"). A "Related topic" hint appears when your search
  matches a real subject/university.
- **Command Palette** — press `Ctrl+K` (or `Cmd+K` on Mac) to jump
  anywhere or run an action without touching the mouse.

## Tracking your progress

- Click the star on any resource card to **favorite** it; the bookmark
  icon saves it for later without marking it a favorite.
- Add resources to your **Reading Queue** to build an ordered study
  plan — drag to reorder.
- Open a resource and change its status (Not Started / In Progress /
  Completed / Revision Needed) to track progress. "Continue Studying"
  on the Home page picks up your most recent in-progress resource.

## Study Goals

Set a daily and/or weekly target (in resources completed, not hours —
see `docs/AI_INTEGRATION.md`'s note on why the vault's time estimates
aren't precise enough to build hour-based goals on). Tracks your
current streak and shows progress toward each target.

## Notes

Every resource has a private notes field — stored only on your device,
never sent anywhere unless you explicitly opt in for a specific AI
question (see below). "My Notes" in the sidebar lists everything you've
written in one place.

## Learning Analytics

A dashboard of overall/per-subject/per-university completion, weekly
activity, recommendations for what to study next, revision tracking
(flags resources you completed a while ago as due for review), and your
personal stats. Exportable as a JSON report.

## AI features (optional, off by default)

Go to **AI Settings** to turn this on. Choose a provider:

- **Ollama** or **LM Studio** — run entirely on your own computer, no
  account needed, nothing leaves your device. You'll need the
  corresponding app installed and running separately.
- **OpenAI / Claude / Gemini** — cloud providers, need your own API key
  from that provider, and your requests go to their servers.

Once configured, open any resource and use the **AI Tools** section:
Explain this, generate Study notes, suggest Related topics, or ask a
free-form question. Your private notes are never included unless you
check the "include my note" box for that specific question.

## Backup & Restore

Settings → Export Backup downloads everything (progress, notes, goals,
queue, preferences — **not** AI API keys, which never leave your
browser). Import Backup lets you restore from that file, with a
category picker so you can restore just some of it (e.g. progress but
not notes), and a warning if the backup is from a different major
version of the app.

## Keyboard shortcuts

Press `?` anywhere to see the full list. Highlights: `Ctrl+K` (or `Cmd+K`)
for the command palette, `g h` go to Dashboard, `g b` go to Browse All,
`g f` go to Favorites, `g s` go to Statistics, `Esc` closes any open
modal or dropdown.

## Diagnostics

The Diagnostics page (sidebar → Insights) shows data integrity checks,
system health, performance timings, AI provider status, storage usage,
and build information — useful if something seems off.
