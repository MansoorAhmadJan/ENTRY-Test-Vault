# V5.0 Deferred Scope — Design Notes

## Why this document exists

The original V5.0 brief asked for 12 subsystems: Personal Learning
Workspace, Intelligent Learning Paths, a Recommendation Engine, a
Knowledge Graph, full Learning Analytics, Search 2.0, a Personal
Knowledge Base, Resource Intelligence, a Plugin Architecture, an AI
Integration Layer, "efficient for 50,000+ resources" performance, and
updated documentation.

We shipped the part with real near-term value on a **102-resource**
personal vault: Study Goals, My Notes, and Search 2.0 (see
`CHANGELOG.md` / commit history for what actually landed). Everything
below was deliberately **not** built as code. This document exists so
that decision isn't silently lost — each item has a real design
sketch, an honest trigger condition for when it'd be worth building,
and a rough sense of effort, so revisiting this later is a quick read,
not a re-litigation from scratch.

**General principle applied throughout:** don't build infrastructure
for a scale or a use case the project doesn't have yet. A
recommendation engine, a knowledge graph, and a plugin architecture
are each legitimate multi-week efforts on their own — worth doing when
there's a concrete problem they solve, not preemptively.

---

## 1. Custom Collections

**What it is:** user-defined groups of resources (e.g. "Physics Redo
List"), separate from the system-defined Favorites/Bookmarks/Queue.

**Why deferred:** Favorites + Bookmarks + Reading Queue already cover
"a group of resources I care about" three different ways (unordered
starred, unordered saved-for-later, ordered study plan). A fourth,
user-named, arbitrary-membership mechanism is real value once you have
dozens of self-defined study groupings — on 102 resources, the
existing three probably cover it.

**Trigger to build:** you personally hit a case where Favorites/
Bookmarks/Queue genuinely aren't enough — e.g. you want multiple
concurrently-active named study plans, not just one ordered queue.

**Integration sketch (for later):** additive `KEYS.collections` in
`storageService.js` (`[{id, name, resourceIds: []}]`), a
`collectionsView.js` list+detail page (route `#/collections/:id?`,
mirroring `queueView.js`'s structure), and one new action in
`resourceModal.js` ("Add to Collection ▾"). `exportAll`/`importAll`
already generalize over `KEYS`, so backup/restore needs zero changes.
Estimated effort: half a day.

---

## 2. Intelligent Learning Paths

**What it is:** auto-sequencing resources into a prerequisite-aware
order per subject.

**Why deferred:** the data has a `prerequisites` array per resource,
but it's largely empty/unpopulated in the real dataset today — building
a path-sequencer on prerequisite data that mostly doesn't exist yet
produces paths that are either trivial (everything unlocked) or wrong
(missing edges the curator never entered). This is a data-completeness
problem before it's an engineering problem.

**Trigger to build:** once `prerequisites` is meaningfully populated
across most resources in a subject (a data-authoring task, not a code
task).

**Integration sketch:** a topological sort over the prerequisite DAG
per subject, exposed as `App.LearningPaths.getPath(subject)`, rendered
as a linear checklist view. Cycle detection needed (bad data can create
loops) — fail loud into the diagnostics page rather than silently
mis-ordering. Estimated effort: 1–2 days once data is ready.

---

## 3. Recommendation Engine

**What it is:** "next resource," "related resources," "easier
alternative," "advanced resource," "missing prerequisite" suggestions.

**Why deferred:** with 102 hand-curated resources, you already know
what's in the vault — you compiled it. A recommendation engine solves
"I don't know what I don't know" at a scale where discovery is hard;
at this scale, Browse + Filter + Search 2.0 already surface everything
in a few clicks. Building a recommender now optimizes a problem that
doesn't exist yet.

**Trigger to build:** resource count grows into the many hundreds/
low thousands, where manual browsing genuinely stops scaling.

**Integration sketch:** start with rule-based, not ML — "same subject,
next difficulty tier, not yet completed" gets you 80% of the value
with none of the cold-start/data problems a learned recommender has at
this scale. `App.Recommend.getNext(resourceId)` as a pure function
over existing `App.Data` indices; no new storage. Estimated effort:
2–3 days for a rule-based version.

---

## 4. Knowledge Graph

**What it is:** explicit relationship edges between subjects,
chapters, universities, shared resources, and prerequisites.

**Why deferred:** this is real architecture, not a feature — it
implies a graph data structure, a query layer, and (for it to be worth
having over just filtering) a UI that lets people actually traverse
relationships. At 102 resources with a handful of facets, the existing
`App.Data` Map-based indices already ARE a lightweight graph (id →
university, subject → resources, etc.) — a formal graph layer adds
abstraction without adding capability yet.

**Trigger to build:** you need multi-hop queries the current indices
can't answer directly (e.g. "resources that share a chapter with
something I've completed, across universities") — that's the point
where a real adjacency-list graph earns its complexity.

**Integration sketch:** a `js/knowledge/graph.js` module building
adjacency lists from existing facets at index time (cheap — same
O(n) pass `searchEngine.js` already does), with a small traversal API.
No new storage needed initially since it's derived, not user data.
Estimated effort: 3–5 days including a UI to make it visible/useful
(otherwise it's invisible plumbing nobody benefits from).

---

## 5. Learning Analytics (beyond Study Goals)

**What shipped:** streak, daily/weekly completion vs. target
(`js/views/goalsView.js`).

**What's deferred:** weak-topic/strong-topic detection, estimated
remaining study time, resource-usage analytics beyond the existing
"most viewed" list in `statsView.js`.

**Why deferred:** weak/strong topic detection needs a _signal_ for
"weak" — right now the only signals are progress status and view
count, neither of which reliably means "struggling." Calling something
a "weak topic" from that data would be a fabricated-looking insight,
not a real one — worse than not having the feature. Estimated
remaining study time has the same problem `goalsView.js` already
flagged: `estTime` is free text ("2–3 hrs"), not structured, so any
sum is fake precision.

**Trigger to build:** either (a) start capturing a real difficulty
signal — e.g. a quick "was this hard?" rating on completion (small,
cheap addition) — before attempting weak/strong detection from it, or
(b) restructure `estTime` into `{min, max, unit}` in the data if
remaining-time estimates matter enough to justify a data migration.

---

## 6. Personal Knowledge Base extras (highlights, ratings, tags, linked notes)

**What shipped:** notes (already existed) + the new aggregate My Notes
view.

**What's deferred:** highlighting within a resource, usefulness
ratings, custom tags, and notes linked to each other.

**Why deferred:** "highlight resources" needs something to highlight
_within_ — most vault entries are external links (Google Drive, PDFs
hosted elsewhere), not text rendered inside the app, so in-app
highlighting has no surface to attach to for most resources. Ratings
and tags are legitimate small additions but weren't part of the
approved v5.0 scope this round. Linked notes (a note referencing
another note) is a real feature but wants the Knowledge Graph's
adjacency-list foundation to be useful rather than being a flat,
easily-tangled ad hoc link list.

**Trigger to build:** ratings/tags — anytime, they're cheap and
additive (`storageService.js` pattern is already proven for exactly
this shape of feature); reconsider alongside item 4 above.

---

## 7. Resource Intelligence

**What it is:** duplicate detection, metadata suggestion, auto-tagging,
related-resource linking, missing-topic-coverage detection.

**Why deferred:** every one of these is a data-quality tool for
_someone curating the vault_, not a feature the end user (studying for
an entry test) directly benefits from. They're valuable, but they're a
different persona's tool — worth building as a maintenance script when
new resources get imported, not as a live in-app feature.

**Trigger to build:** when resource curation becomes a recurring,
frequent task (e.g. importing new batches regularly) rather than a
one-time compilation.

**Integration sketch:** this is naturally a Node script (like
`scripts/build.mjs`), not a browser feature — run it against
`data/vault-data.json` before regenerating `vault-data.js`, flag
likely duplicates (title similarity, same link) and missing metadata
for human review. Doesn't need to run in the browser at all.

---

## 8. Plugin Architecture

**What it is:** extension points for Study Planner, Flashcards,
Calendar, AI Assistant, Analytics, Importers.

**Why deferred:** a plugin architecture is only valuable once there
are at least two real plugins to prove the interface is right — an
extension point designed against zero actual extensions is a guess
about what future code will need, and guesses like that are usually
wrong in some detail that only shows up once someone tries to build
the first real plugin.

**Trigger to build:** the moment you actually start building the FIRST
of these (Flashcards is the most self-contained candidate) — design
its extension point from that concrete need, then generalize once a
second plugin proves the pattern actually generalizes.

**Integration sketch (informal, not a commitment):** the existing
`App.*` namespace convention already is a lightweight plugin surface —
a "plugin" is just another `App.X` module loaded after core, reading
`App.Data`/`App.Storage` through the same public functions everything
else uses. Formalizing this (a `App.Plugins.register()` call, a
defined lifecycle hook) is worth doing once, not speculatively.

---

## 9. AI Integration Layer (local LLM / cloud API / RAG / embeddings / summaries)

**Why deferred:** every one of these — local LLM inference, cloud API
calls, RAG, embedding-based search — either needs a network call this
offline-first app doesn't make today, or a model runtime this static
dashboard doesn't have. Building "interfaces, not implementations" for
five different AI integration patterns for a 102-resource personal
tool is speculative infrastructure with no current caller — a stub
interface that's never exercised isn't validated design, it's a
guess wearing a design's clothes.

**Trigger to build:** a specific, concrete AI feature you actually
want (e.g. "summarize this past paper's topics" via a cloud API) —
design the interface FROM that one real use case, not in the
abstract ahead of any use case.

**Note on embeddings/semantic search specifically:** Search 2.0
(shipped) already covers the practical want here — synonym/alias
matching and topic-aware faceted boosting — without needing an
embedding model, a vector index, or a network dependency. True
semantic search earns its complexity at a scale/ambiguity level this
vault isn't at.

---

## 10. "Efficient for 50,000+ resources"

**Current reality:** 102 resources. The existing architecture
(`App.Data`'s `Map`-based indices, `searchEngine.js`'s inverted index,
`js/utils/constants.js` `PAGE_SIZE = 60` pagination in Browse) was
already built with thousands-of-resources scale in mind — see
`docs/ARCHITECTURE.md`'s "Scalable to thousands" row. That holds
without changes up to roughly the low thousands.

**What would actually break at 50,000:** `localStorage`'s ~5–10MB
practical ceiling (per-browser) is the real wall — completion events,
notes, and the full resource dataset itself would need to move to
`IndexedDB` well before 50,000 resources. The inverted index itself
(`Map<token, Set<id>>`) stays fine; index _build time_ (currently
under 5ms server-side per `getIndexHealth()`) would need re-measuring
at that scale, but the data structure doesn't need to change.

**Recommendation:** don't build for 50,000 now. If/when the dataset
approaches that range, the concrete next step is migrating
`storageService.js`'s backing store from `localStorage` to
`IndexedDB` behind the exact same function signatures — every call
site (`App.Storage.getFavorites()`, etc.) stays identical, only the
implementation underneath changes. That's precisely why
`storageService.js` was built as a function-call façade over
`localStorage` rather than direct `localStorage.getItem` calls
scattered through the app.

---

## Summary table

| #   | Subsystem                   | Trigger to revisit                               |
| --- | --------------------------- | ------------------------------------------------ |
| 1   | Custom Collections          | Favorites/Bookmarks/Queue genuinely insufficient |
| 2   | Learning Paths              | `prerequisites` data actually populated          |
| 3   | Recommendation Engine       | Resource count reaches low-thousands             |
| 4   | Knowledge Graph             | Need multi-hop queries indices can't answer      |
| 5   | Weak/strong topic analytics | A real difficulty signal exists to detect from   |
| 6   | Ratings/tags/linked notes   | Ratings/tags: anytime. Linked notes: with #4     |
| 7   | Resource Intelligence       | Curation becomes a recurring task                |
| 8   | Plugin Architecture         | Building the actual first plugin (Flashcards)    |
| 9   | AI Integration Layer        | One concrete AI feature you actually want        |
| 10  | 50,000+ scale               | Dataset approaches that range (currently 102)    |
