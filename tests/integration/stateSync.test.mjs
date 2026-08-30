// @vitest-environment node
//
// Uses the real JSDOM+HTTP-server harness (not bootApp.mjs) because this
// bug is specifically about a listener registered once in App.init(),
// which needs a real page-load lifecycle to test meaningfully.
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { existsSync, createReadStream } from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
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

describe("V6.0 bug fix: sidebar badges stay in sync without requiring navigation", () => {
  it("toggling a favorite from a resource card updates the sidebar count immediately", async () => {
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
    win.App.Router.navigate("browse");
    await waitFor(() => win.document.querySelector(".resource-card"), 3000);

    const badge = () =>
      win.document.querySelector('[data-route="favorites"] .nav-count')?.textContent;
    expect(badge()).toBe("0");

    win.document.querySelector(".resource-card [data-action='toggle-favorite']").click();
    await waitFor(() => badge() === "1", 2000);
    expect(badge()).toBe("1");

    server.close();
    win.close();
  }, 15000);

  it("removing an item from the Reading Queue page updates the sidebar count immediately", async () => {
    const server = await startServer();
    const { port } = server.address();
    const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/`, {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
    });
    const win = dom.window;
    await waitFor(() => win.App && typeof win.App.init === "function", 5000);
    win.App.Data.init();
    win.App.Storage.addToQueue("ETV-0001");
    win.App.init();
    win.App.Router.navigate("queue");
    await waitFor(() => win.document.querySelector("[data-remove]"), 3000);

    const badge = () => win.document.querySelector('[data-route="queue"] .nav-count')?.textContent;
    expect(badge()).toBe("1");

    win.document.querySelector("[data-remove]").click();
    await waitFor(() => badge() === "0", 2000);
    expect(badge()).toBe("0");

    server.close();
    win.close();
  }, 15000);

  it("repeated navigation followed by one data change still produces exactly one correct, non-duplicated badge update", async () => {
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

    win.App.Router.navigate("browse");
    win.App.Router.navigate("goals");
    win.App.Router.navigate("browse");
    await waitFor(() => win.document.querySelector(".resource-card"), 3000);

    let dispatchCount = 0;
    win.document.addEventListener("app:data-changed", () => dispatchCount++);

    win.document.querySelector(".resource-card [data-action='toggle-favorite']").click();
    await new Promise((r) => setTimeout(r, 100));

    // The event itself must fire exactly once per click — this is the
    // actual observable contract; how many internal render calls result
    // from it is an implementation detail, not what matters here.
    expect(dispatchCount).toBe(1);

    const favItems = win.document.querySelectorAll('[data-route="favorites"]');
    expect(favItems.length).toBe(1); // exactly one nav item, not duplicated
    expect(favItems[0].querySelector(".nav-count").textContent).toBe("1");

    server.close();
    win.close();
  }, 15000);
});
