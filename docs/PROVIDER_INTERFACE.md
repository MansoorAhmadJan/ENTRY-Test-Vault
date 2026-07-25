# AI Provider Interface Specification (V5.3)

## Contract

Every provider registers itself via `App.AI.registerProvider(provider)`
(in `js/ai/providerInterface.js`), which validates the shape at
registration time and throws if anything is missing — a broken
provider fails loudly at load time, not silently at first use.

```js
{
  id: string,             // stable key, e.g. "ollama"
  label: string,          // shown in AI Settings
  requiresApiKey: boolean,
  isLocal: boolean,       // drives the privacy label (Objective #7)
  defaultEndpoint: string,
  defaultModel: string,
  docsUrl: string,

  buildRequest(messages, config) -> { url, headers, body }
  parseResponse(rawJson) -> string          // throws on unexpected shape
  parseError(status, rawJson) -> string     // human-readable
}
```

`buildRequest` and `parseResponse`/`parseError` are **pure** — no
`fetch()`, no side effects. `aiService.js` is the only caller of
`fetch()` for AI requests. This is the actual design decision that
makes providers swappable and unit-testable without network access —
see `tests/unit/aiProviders.test.mjs`.

`messages` is always the same provider-agnostic shape going in:
`[{role: "system"|"user"|"assistant", content: string}]`. Each provider
adapts that to its own real wire format — see the per-provider notes
below for where that adaptation is non-trivial.

## Per-provider notes (what's NOT obvious from the shared contract)

**Ollama** — `POST {endpoint}/api/chat`, `{model, messages, stream:
false}`. `stream: false` is required for this app's request/response
model (no streaming UI exists) — an easy thing to get wrong by copying
a streaming example from Ollama's docs.

**LM Studio** — deliberately reuses the exact OpenAI request/response
shape, because LM Studio's own local server is designed to be
OpenAI-API-compatible. `parseResponse` is literally the same function
signature as OpenAI's — not a coincidence, a documented fact about
LM Studio worth knowing if you're extending this.

**OpenAI** — standard `/v1/chat/completions`, `Authorization: Bearer`.

**Claude (Anthropic)** — two real gotchas verified against current
docs: (1) `max_tokens` is a **required** field, unlike OpenAI where
it's optional; (2) system prompts are a separate top-level `system`
field, NOT a `{role: "system"}` message in the array — `buildRequest`
extracts it out of the provider-agnostic `messages` array before
sending. Response text is at `content[0].text`, not
`choices[0].message.content`.

**Gemini (Google)** — the most different shape of the five: no
`messages` array at all, instead `contents: [{role, parts: [{text}]}]`
where `role` is `"user"` or `"model"` (not `"assistant"`). No native
system-prompt concept — `buildRequest` folds a system message into the
first user turn's text instead of dropping it. Auth is
`x-goog-api-key` header (the currently-recommended form over the
legacy `?key=` query parameter, which would leak the key into server
logs/browser history).

## What "verified" means here, and its limit

Every provider's `buildRequest`/`parseResponse`/`parseError` was
checked against that provider's real, current API documentation
(fetched via web search while building this) and tested with
realistic example payloads shaped like real responses. **None of them
have been exercised against a real live API call** in this
environment — no API keys are configured here, and no local Ollama/LM
Studio server is running. If a provider changes its API shape in the
future, these adapters will need re-verification against the new docs
— they are not self-updating or schema-validated at runtime beyond the
`parseResponse` shape check (which does catch a changed shape, just
not proactively).

## Adding a 6th provider

1. Create `js/ai/providers/yourProvider.js` implementing the contract
   above.
2. Add it to `js/ai/aiLoader.js`'s `MODULE_FILES` array and
   `scripts/build.mjs`'s `AI_LAZY_FILES` array (both need the same
   path — this is intentionally two small lists rather than one
   generated one, since introducing build-time file discovery for a
   5-6 item list would be more complexity than it saves).
3. Add it to `tests/helpers/bootApp.mjs`'s `AI_MODULE_FILES` array so
   tests can load it.
4. Write a conformance test in `tests/unit/aiProviders.test.mjs`
   following the existing pattern (real documented request/response
   shape, no network needed).

No changes to `aiService.js`, `aiFeatures.js`, or the AI Settings view
are needed — they all iterate `App.AI.listProviders()` generically.
This is the extensibility Objective #9 asked for, demonstrated by what
it does NOT require you to touch.
