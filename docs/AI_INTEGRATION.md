# AI Integration Guide (V5.3)

## Status: real, working, and fully optional

Every piece described here is real code that actually runs — not a
stub. It's been verified end-to-end: against genuinely closed local
ports (Ollama/LM Studio not running), against mocked cloud responses
matching each provider's real documented API shape, and against a
resource card rendering an AI response that contains an XSS payload
(it doesn't execute — the response is escaped exactly like every other
free-text source in this app).

What it is NOT: this was built as infrastructure ahead of validated
need, at the person's explicit, informed request, after I recommended
building a single real provider first and explained the tradeoff. See
the conversation history / commit log for that discussion — worth
knowing if you're deciding whether to trust this layer's design as
"battle-tested" (it isn't, by real usage) versus "correct against
documented specs and thoroughly tested in isolation" (it is).

**AI is disabled by default.** The entire rest of the app — Browse,
Search, Goals, Notes, Analytics, everything from V4.1 through V5.2 —
works completely unchanged whether AI is on or off.

## Architecture

```
js/ai/
  aiLoader.js           <- ONLY this file is in the main bundle (Objective #8)
  providerInterface.js  <- contract + registry (lazy-loaded)
  providers/
    ollamaProvider.js     local, no API key
    lmstudioProvider.js   local, no API key, OpenAI-compatible shape
    openaiProvider.js     cloud, API key required
    claudeProvider.js     cloud, API key required
    geminiProvider.js     cloud, API key required
  promptLibrary.js      <- versioned prompt templates
  aiService.js           <- the ONLY file that calls fetch() for AI
  aiFeatures.js          <- one function per user-facing capability
```

**Data flow for one AI action** (e.g. clicking "Explain this" in the
resource modal):

1. UI calls `App.AI.ensureLoaded()` — lazy-loads the 9 files above if
   they haven't been fetched yet (first use only).
2. UI calls `App.AI.Features.explainResource(resource)`.
3. `aiFeatures.js` calls `App.AI.Service.ask("explain-resource", resource)`.
4. `aiService.js` checks `isConfigured()`, builds provider-agnostic
   `messages` via `App.AI.PromptLibrary.build(...)`, checks the cache,
   checks the rate-limit guard, then calls `callProvider()`.
5. `callProvider()` calls the active provider's pure `buildRequest()`
   to get `{url, headers, body}`, does the actual `fetch()` with a
   30s timeout (`AbortController`), and calls the provider's pure
   `parseResponse()`/`parseError()` to normalize the result.
6. UI receives `{ok, text, error}` and renders `text` through
   `App.Utils.escapeHtml()` — AI-generated text is untrusted input,
   handled exactly like a user's note or an imported resource field.

## Why providers are pure functions, not classes with fetch() inside

`buildRequest`/`parseResponse`/`parseError` take plain data in, return
plain data out, and never touch the network. This is what makes
`tests/unit/aiProviders.test.mjs` able to verify all 5 providers
against their real documented request/response shapes with **zero
network access** — and what makes `aiService.js` the single place that
needs to change if the fetch/timeout/retry strategy ever changes,
instead of five places.

## Provider status

| Provider           | Local/Cloud | API key | Verified against                                                                                                           |
| ------------------ | ----------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| Ollama             | Local       | No      | Real `/api/chat` docs                                                                                                      |
| LM Studio          | Local       | No      | OpenAI-compatible `/v1/chat/completions` (LM Studio's own design)                                                          |
| OpenAI             | Cloud       | Yes     | Real `/v1/chat/completions` docs                                                                                           |
| Claude (Anthropic) | Cloud       | Yes     | Real `/v1/messages` docs (verified `max_tokens` is required, `system` is a top-level field, response is `content[0].text`) |
| Gemini (Google)    | Cloud       | Yes     | Real `generateContent` docs (verified `x-goog-api-key` header form, `contents`/`parts` shape)                              |

None of these have been called against a real live server in this
environment (no API keys, no Ollama installed here) — see
`docs/PROVIDER_INTERFACE.md` for exactly what "verified" means here
and its limits.

## Privacy (Objective #7)

- AI is **opt-in**, disabled by default.
- The default provider, if enabled, is Ollama (local) — not a cloud
  provider.
- What gets sent per feature: only the resource's own catalog metadata
  (title, subject, university, category, difficulty, description) —
  never the link URL, never progress status, never notes.
- **Exception, explicit opt-in only:** "Ask a question" has an
  "Include my note" checkbox, unchecked by default. Every other
  feature never has access to note text at all — this isn't a runtime
  check, `aiFeatures.js`'s other functions structurally don't accept a
  notes parameter.
- API keys are stored in a separate `localStorage` key
  (`etv:aiApiKeys`) that is **structurally excluded** from
  `exportAll()` — see `js/storage/storageService.js`'s
  `SENSITIVE_KEY_NAMES`. Verified with a test that plants a real-shaped
  key and confirms it's absent from the serialized export.
- The AI Settings page states plainly, per provider, whether it's
  local ("nothing leaves your device") or cloud ("sends data to
  {provider}'s servers").

## Performance (Objective #8)

The ~15-20KB of AI code is not in the main bundle. Verified two ways:
`tests/integration/aiLazyLoad.test.mjs` confirms `App.AI.Service`
genuinely doesn't exist until `ensureLoaded()` is called (checked
against a real HTTP server + real script execution, not a mock), and
confirms the main production bundle doesn't contain provider-specific
strings (e.g. Anthropic's `anthropic-version` header name) inline.

Graceful degradation: a closed port (Ollama not running) fails in
~150ms with a clear message, not a hang or a crash — verified against
an actually-closed port, not a simulated one.

## Rate limiting & caching — intentionally minimal

A 2-second minimum interval between requests, checked client-side. Not
a token bucket, not configurable per-provider. This is a UX guard
against double-clicking a button, not a real API rate-limit
implementation — actual provider rate limits are handled by each
provider's `parseError()` reading the real 429 response. Building a
more sophisticated rate limiter now, before any real usage has shown
the simple guard is insufficient, would be exactly the kind of
speculative complexity this project has been trying to avoid.

Caching is an optional (default on) in-memory `Map` with a 10-minute
TTL, keyed by template+provider+model+prompt text. Not persisted to
`localStorage` — deliberately, to avoid AI response text (of unknown
size and content) growing the storage backup indefinitely.

## What's still deferred

Full embedding-based semantic search — explicitly out of scope for
V5.3 per the brief. Search 3.0 here means natural-language query
preprocessing (stripping "what are the...", "show me...", etc. before
tokenizing) plus the alias/topic-aware matching from Search 2.0 —
covered in `docs/ARCHITECTURE.md`'s search section. RAG and
embedding-based search remain in `docs/V5_DEFERRED_SCOPE.md` item 9,
unchanged — nothing here calls an embedding model or maintains a
vector index.
