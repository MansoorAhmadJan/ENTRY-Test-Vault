// @vitest-environment node
//
// Tests the REAL lazy-loading mechanism (js/ai/aiLoader.js's dynamic
// <script> injection) against a real HTTP server and a real JSDOM
// instance with script execution enabled. This is deliberately NOT
// using tests/helpers/bootApp.mjs (which loads AI modules directly via
// vm.runInContext for test convenience — see that file's comment) — this
// test exists specifically to prove the actual production mechanism
// works, not just the AI logic it eventually loads.
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync, existsSync, createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      if (p === "/") p = "/index.html";
      const full = path.join(ROOT, p);
      if (!full.startsWith(ROOT) || !existsSync(full)) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(full)] || "application/octet-stream",
      });
      createReadStream(full).pipe(res);
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function waitFor(predicate, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, 20));
  }
  return false;
}

describe("V5.3 Objective #8: AI modules are genuinely lazy-loaded (real mechanism, not mocked)", () => {
  it("App.AI.Service does not exist until ensureLoaded() is called", async () => {
    const server = await startServer();
    const { port } = server.address();
    const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/`, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });
    const win = dom.window;

    const ready = await waitFor(() => win.App && typeof win.App.init === "function", 5000);
    expect(ready).toBe(true);
    win.App.init();

    // The real, load-bearing assertion: before ensureLoaded(), the AI
    // service genuinely has not been fetched or executed.
    expect(win.App.AI.isLoaded()).toBe(false);
    expect(win.document.querySelectorAll("script[data-ai-module]").length).toBe(0);

    await win.App.AI.ensureLoaded();

    expect(win.App.AI.isLoaded()).toBe(true);
    expect(win.App.AI.listProviders().length).toBe(5);
    expect(win.document.querySelectorAll("script[data-ai-module]").length).toBe(9);

    server.close();
    win.close();
  }, 15000);

  it("calling ensureLoaded() twice concurrently only loads the modules once", async () => {
    const server = await startServer();
    const { port } = server.address();
    const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/`, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });
    const win = dom.window;
    await waitFor(() => win.App && typeof win.App.init === "function", 5000);
    win.App.init();

    const [a, b] = await Promise.all([win.App.AI.ensureLoaded(), win.App.AI.ensureLoaded()]);
    expect(a).toBe(b); // same resolved value — proves it's one shared in-flight promise, not two loads racing
    expect(win.document.querySelectorAll("script[data-ai-module]").length).toBe(9); // not 18

    server.close();
    win.close();
  }, 15000);

  it("the main bundle (production dist/) does not contain AI provider code inline", async () => {
    // Confirms the build-time separation, not just the runtime behavior.
    const { execSync } = await import("node:child_process");
    execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
    const distDir = path.join(ROOT, "dist", "js");
    const files = readFileSync(path.join(ROOT, "dist", "index.html"), "utf8");
    const bundleMatch = files.match(/js\/(bundle\.[a-f0-9]+\.min\.js)/);
    expect(bundleMatch).not.toBeNull();
    const bundleContent = await readFile(path.join(distDir, bundleMatch[1]), "utf8");
    // The main bundle should reference the loader but not contain a
    // provider's actual request-building logic (e.g. Anthropic's
    // distinctive header name) inline.
    expect(bundleContent).not.toContain("anthropic-version");
    expect(existsSync(path.join(distDir, "ai", "providers", "claudeProvider.js"))).toBe(true);
  }, 30000);

  it("resource modal AI Tools panel: real lazy-load -> real AI call -> safely-escaped render, end to end", async () => {
    const server = await startServer();
    const { port } = server.address();
    const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/`, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });
    const win = dom.window;
    await waitFor(() => win.App && typeof win.App.init === "function", 5000);
    win.App.init();
    win.App.Data.init();

    // Disabled by default: no AI buttons, a clear explanation instead.
    win.App.Components.openResourceModal("ETV-0001");
    await waitFor(() => win.document.getElementById("ai-tools-panel")?.textContent.trim(), 2000);
    expect(win.document.getElementById("ai-tools-panel").textContent).toContain("AI is disabled");
    expect(win.document.querySelectorAll("[data-ai-action]").length).toBe(0);

    // Enable AI, reopen — buttons appear, lazy-loaded modules are used.
    win.App.Storage.setAiSettings({ enabled: true, activeProvider: "ollama", cacheEnabled: false });
    win.App.Components.openResourceModal("ETV-0001");
    await waitFor(() => win.document.querySelectorAll("[data-ai-action]").length === 3, 2000);

    // Mock the network call an AI-generated response containing an XSS
    // attempt (the AI's response is untrusted text like any other).
    win.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        message: { content: "Covers past papers.<script>window.__xssFired=true;</script>" },
      }),
    });
    win.__xssFired = false;
    win.document.querySelector("[data-ai-action='explain-resource']").click();

    const resolved = await waitFor(
      () => !win.document.getElementById("ai-tools-result").textContent.includes("Thinking"),
      5000
    );
    expect(resolved).toBe(true);
    expect(win.__xssFired).toBe(false); // the payload never executed
    expect(win.document.getElementById("ai-tools-result").innerHTML).toContain("&lt;script&gt;"); // rendered as inert text
    expect(win.document.getElementById("ai-tools-result").textContent).toContain(
      "Covers past papers"
    );

    server.close();
    win.close();
  }, 15000);
});
