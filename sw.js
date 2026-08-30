/* ============================================================
   Service Worker — PWA support (V4.3).

   IMPORTANT SCOPE NOTE, stated here and in docs/EXTENSIBILITY.md:
   Browsers do not allow service worker registration on the
   file:// origin. This dashboard's core promise — "double-click
   index.html, works offline, no server" — is delivered entirely
   by data/vault-data.js being a <script> tag (see ARCHITECTURE.md),
   NOT by this file. This service worker only activates if someone
   deploys the dashboard folder behind an http(s) server (e.g. to
   install it as a home-screen app on a phone, or host it on a
   school intranet) — a legitimate but separate use case from the
   primary "open the file" one. app.js registers this defensively
   and silently skips registration under file://, so nothing breaks
   either way.
   ============================================================ */

const CACHE_NAME = "etv-dashboard-v4.3.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/variables.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/responsive.css",
  "./data/vault-data.js",
  "./icons/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// Cache-first for app-shell files (they're versioned by CACHE_NAME);
// network-first fallback for anything else (e.g. a future data-provider
// endpoint), so this never silently serves stale non-shell content.
//
// V6.0 fix: on a cache MISS combined with a network failure, this used to
// resolve to `undefined` (the outer `cached` variable, still unset at
// that point) — which the Fetch API treats as a hard network error, not
// a graceful offline response. Now falls back to the cached app shell for
// page navigations (so offline-but-uncached routes still show something
// usable instead of the browser's raw error page), and a real empty
// Response otherwise, so respondWith() never resolves to undefined.
async function decideFetchResponse(request, cachesApi, fetchApi) {
  const cached = await cachesApi.match(request);
  if (cached) return cached;
  try {
    return await fetchApi(request);
  } catch {
    if (request.mode === "navigate") {
      const shell = await cachesApi.match("./index.html");
      if (shell) return shell;
    }
    return new Response("", { status: 503, statusText: "Offline and not cached" });
  }
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(decideFetchResponse(event.request, caches, fetch));
});

// Exported for tests (harmless in the browser — module is undefined
// there, so this branch never runs outside Node).
if (typeof module !== "undefined") {
  module.exports = { decideFetchResponse };
}
