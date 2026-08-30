// @vitest-environment node
import { describe, it, expect } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const require = createRequire(import.meta.url);

// sw.js calls self.addEventListener(...) at module top-level, exactly as
// a real service worker must. Node has no `self` global — stub the one
// method it needs so requiring the file doesn't throw. The tests below
// call the exported decideFetchResponse() function directly and never
// exercise these listener registrations, so a no-op stub is sufficient.
globalThis.self = { addEventListener: () => {} };
const { decideFetchResponse } = require(path.join(ROOT, "sw.js"));

function fakeCaches(store) {
  return {
    match: async (req) => {
      const key = typeof req === "string" ? req : req.url;
      return store[key];
    },
  };
}

describe("Service Worker fetch strategy — V6.0 bug fix", () => {
  it("cache hit: serves the cached response directly, never touches the network", async () => {
    const cachedResponse = { fromCache: true };
    const caches = fakeCaches({ "./index.html": cachedResponse });
    const fetchApi = async () => {
      throw new Error("should never be called on a cache hit");
    };
    const result = await decideFetchResponse(
      { url: "./index.html", mode: "navigate" },
      caches,
      fetchApi
    );
    expect(result).toBe(cachedResponse);
  });

  it("cache miss + network succeeds: serves the real network response", async () => {
    const caches = fakeCaches({});
    const networkResponse = { fromNetwork: true };
    const fetchApi = async () => networkResponse;
    const result = await decideFetchResponse(
      { url: "./some-new-file.js", mode: "same-origin" },
      caches,
      fetchApi
    );
    expect(result).toBe(networkResponse);
  });

  it("THE BUG: cache miss + network fails, on a page navigation -> falls back to the cached app shell, not undefined", async () => {
    const shellResponse = { isShell: true };
    const caches = fakeCaches({ "./index.html": shellResponse });
    const fetchApi = async () => {
      throw new TypeError("Failed to fetch");
    };
    const result = await decideFetchResponse(
      { url: "./some/deep/route", mode: "navigate" },
      caches,
      fetchApi
    );
    expect(result).toBeDefined(); // the original bug: this was undefined
    expect(result).toBe(shellResponse);
  });

  it("THE BUG: cache miss + network fails, for a non-navigation request -> a real Response, not undefined", async () => {
    const caches = fakeCaches({}); // nothing cached at all, not even the shell
    const fetchApi = async () => {
      throw new TypeError("Failed to fetch");
    };
    const result = await decideFetchResponse(
      { url: "./some-uncached-asset.js", mode: "same-origin" },
      caches,
      fetchApi
    );
    expect(result).toBeDefined(); // the original bug: this was undefined
    expect(result.status).toBe(503);
  });

  it("navigation with no cached shell available either: still returns a real Response, not undefined", async () => {
    const caches = fakeCaches({}); // completely empty cache
    const fetchApi = async () => {
      throw new TypeError("Failed to fetch");
    };
    const result = await decideFetchResponse(
      { url: "./anywhere", mode: "navigate" },
      caches,
      fetchApi
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(503);
  });
});
