// @vitest-environment node
//
// Runs axe-core against the REAL index.html, served over a real local
// HTTP server (not a hand-rolled DOM skeleton — an earlier draft of this
// test used a bare `<body>` shell and got 2 false-positive violations
// for a missing <title>/lang that the real index.html already has).
//
// KNOWN LIMITATION, stated plainly rather than hidden: jsdom has no real
// layout/paint engine, so `color-contrast` can never be verified here —
// it always comes back "incomplete" (axe's "cannot determine" bucket,
// not a pass). Same for `landmark-one-main`/`page-has-heading-one` in
// this environment, even though both `<main>` and `<h1>` are directly
// confirmed present in the DOM below. This test catches real structural/
// ARIA problems (and did — see js/ui/resourceCard.js's V5.2 fix); it is
// NOT a substitute for periodically checking real color contrast and
// visual rendering with a real browser (Lighthouse or the axe DevTools
// extension).
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { existsSync, createReadStream } from "node:fs";
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

async function runAxeOnRealApp(setup) {
  const server = await startServer();
  const { port } = server.address();
  const dom = await JSDOM.fromURL(`http://127.0.0.1:${port}/`, {
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });
  const win = dom.window;
  const ready = await waitFor(() => win.App && typeof win.App.init === "function", 5000);
  if (!ready)
    throw new Error("App never became ready — index.html's scripts didn't finish loading");
  win.App.init();
  if (setup) setup(win);
  await new Promise((r) => setTimeout(r, 100));

  const axeSrc = await readFile(path.join(ROOT, "node_modules/axe-core/axe.min.js"), "utf8");
  win.eval(axeSrc);
  const results = await win.axe.run(win.document, {});

  server.close();
  win.close();
  return results;
}

describe("Accessibility audit (axe-core against the real app, V5.2)", () => {
  it("home view: zero automated-detectable violations", async () => {
    const results = await runAxeOnRealApp();
    if (results.violations.length) {
      console.error(JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  }, 15000);

  it("browse view (resource cards, the component with the V5.2 fix): zero violations", async () => {
    const results = await runAxeOnRealApp((win) => win.App.Router.navigate("browse"));
    if (results.violations.length) {
      console.error(JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  }, 15000);

  it("analytics dashboard (the most complex view, most recently added): zero violations", async () => {
    const results = await runAxeOnRealApp((win) => win.App.Router.navigate("analytics"));
    if (results.violations.length) {
      console.error(JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  }, 15000);

  it("settings view (has the most form controls): zero violations", async () => {
    const results = await runAxeOnRealApp((win) => win.App.Router.navigate("settings"));
    if (results.violations.length) {
      console.error(JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  }, 15000);

  it("diagnostics view, including the new AI & Storage tab (V5.4): zero violations", async () => {
    const results = await runAxeOnRealApp((win) => {
      win.App.Router.navigate("diagnostics");
    });
    if (results.violations.length) {
      console.error(JSON.stringify(results.violations, null, 2));
    }
    expect(results.violations).toEqual([]);
  }, 15000);
});
