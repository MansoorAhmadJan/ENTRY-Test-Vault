#!/usr/bin/env node
// Loads dist/index.html + dist bundle in jsdom and checks the app actually
// boots: renders the shell, indexes search, and hits the home route without
// throwing. This is a smoke test, not a substitute for the real Testing
// phase (see docs/ROADMAP.md) — jsdom doesn't do layout/paint, so visual and
// CSS behavior still needs a real browser. It DOES catch "the bundle throws
// on load" and "the shell never renders" class failures, which is exactly
// the risk a pure syntax check (node --check) can't catch.
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, "..", "dist");

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
      const full = path.join(DIST, p);
      if (!full.startsWith(DIST) || !existsSync(full)) {
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

async function main() {
  const server = await startServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}/`;
  const html = await readFile(path.join(DIST, "index.html"), "utf8");
  const errors = [];

  const dom = new JSDOM(html, {
    url: base,
    runScripts: "dangerously",
    resources: "usable",
    pretendToBeVisual: true,
  });

  dom.window.onerror = (msg) => errors.push(String(msg));
  dom.window.addEventListener("error", (e) => errors.push(String(e.error || e.message)));

  // jsdom doesn't implement service workers; app.js already guards
  // `"serviceWorker" in navigator`, so simply not defining it is enough.

  // Give the DOMContentLoaded-driven boot sequence a tick to run.
  await new Promise((resolve) => setTimeout(resolve, 500));

  const root = dom.window.document.getElementById("app-root");
  const hasShell = !!root && !!root.querySelector(".app-shell");
  const sidebarRendered = !!root && !!root.querySelector("#sidebar-root")?.innerHTML.trim();
  const viewRendered = !!root && !!root.querySelector("#view-root")?.innerHTML.trim();

  console.log("[smoke] app-shell rendered:", hasShell);
  console.log("[smoke] sidebar rendered:  ", sidebarRendered);
  console.log("[smoke] home view rendered:", viewRendered);
  console.log("[smoke] runtime errors:    ", errors.length ? errors : "none");

  dom.window.close();
  server.close();

  if (!hasShell || !sidebarRendered || !viewRendered || errors.length) {
    console.error("[smoke] FAIL — production bundle does not boot cleanly");
    process.exitCode = 1;
  } else {
    console.log("[smoke] PASS — production bundle boots and renders home view");
  }
}

main().catch((err) => {
  console.error("[smoke] FAILED:", err);
  process.exitCode = 1;
});
