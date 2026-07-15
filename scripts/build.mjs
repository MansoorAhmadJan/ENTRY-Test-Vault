#!/usr/bin/env node
/**
 * Production build for the Entry-Test Knowledge Vault Dashboard.
 *
 * WHY THIS SHAPE:
 * The app is intentionally NOT ES modules (see docs/ARCHITECTURE.md and
 * eslint.config.mjs). Every js/**\/*.js file is a global-namespace IIFE
 * that depends on load ORDER, fixed today by the sequence of <script src>
 * tags in index.html. Rather than introduce a bundler that assumes
 * import/export (which would mean rewriting 30 files — explicitly out of
 * scope), this script:
 *
 *   1. Reads index.html itself as the single source of truth for script
 *      and stylesheet order (no separate, driftable file list to maintain).
 *   2. Concatenates the JS files in that exact order into one bundle, and
 *      the CSS files in their <link> order into one bundle.
 *   3. Minifies both with esbuild and emits external source maps.
 *   4. Copies runtime assets (data/, icons/, manifest.json) as-is.
 *   5. Rewrites dist/index.html to reference the single hashed bundle
 *      instead of 30+ individual <script> tags.
 *   6. Regenerates dist/sw.js's precache list so the service worker caches
 *      the actual files that ship, not the dev file list.
 *
 * Semantics are unchanged: same files, same order, same global `App`
 * object at runtime — just concatenated and minified instead of loaded as
 * 30 separate HTTP requests.
 */
import { readFile, writeFile, mkdir, rm, cp, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import { extractAssetOrder } from "./lib/assetOrder.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const DIST = path.join(ROOT, "dist");

function log(msg) {
  console.log(`[build] ${msg}`);
}

function fmtBytes(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

function hashOf(buf) {
  return createHash("sha256").update(buf).digest("hex").slice(0, 10);
}

async function concatFiles(relPaths, joiner) {
  const parts = [];
  for (const rel of relPaths) {
    const full = path.join(ROOT, rel);
    const content = await readFile(full, "utf8");
    parts.push(`/* ---- ${rel} ---- */\n${content}`);
  }
  return parts.join(joiner);
}

async function build() {
  const t0 = Date.now();
  await rm(DIST, { force: true, recursive: true });
  await mkdir(path.join(DIST, "js"), { recursive: true });
  await mkdir(path.join(DIST, "css"), { recursive: true });

  const indexHtml = await readFile(path.join(ROOT, "index.html"), "utf8");
  const { scripts, styles } = extractAssetOrder(indexHtml);

  if (scripts.length === 0 || styles.length === 0) {
    throw new Error(
      "Could not find <script src> / <link rel=stylesheet> entries in index.html — " +
        "the parser regex may be out of sync with index.html's markup."
    );
  }
  log(`Found ${scripts.length} script(s) and ${styles.length} stylesheet(s) in index.html`);

  // ---- JS bundle ----
  const jsSourceConcat = await concatFiles(scripts, "\n\n");
  const jsSourceBytes = Buffer.byteLength(jsSourceConcat, "utf8");
  const jsResult = await esbuild.transform(jsSourceConcat, {
    loader: "js",
    minify: true,
    sourcemap: "external",
    sourcefile: "bundle.js",
    target: ["es2018"],
  });
  const jsHash = hashOf(jsResult.code);
  const jsFileName = `bundle.${jsHash}.min.js`;
  await writeFile(path.join(DIST, "js", jsFileName), jsResult.code, "utf8");
  await writeFile(path.join(DIST, "js", `${jsFileName}.map`), jsResult.map, "utf8");
  log(
    `JS:  ${fmtBytes(jsSourceBytes)} -> ${fmtBytes(Buffer.byteLength(jsResult.code))} ` +
      `(${scripts.length} files -> ${jsFileName})`
  );

  // ---- CSS bundle ----
  const cssSourceConcat = await concatFiles(styles, "\n\n");
  const cssSourceBytes = Buffer.byteLength(cssSourceConcat, "utf8");
  const cssResult = await esbuild.transform(cssSourceConcat, {
    loader: "css",
    minify: true,
    sourcemap: "external",
    sourcefile: "bundle.css",
  });
  const cssHash = hashOf(cssResult.code);
  const cssFileName = `bundle.${cssHash}.min.css`;
  await writeFile(path.join(DIST, "css", cssFileName), cssResult.code, "utf8");
  await writeFile(path.join(DIST, "css", `${cssFileName}.map`), cssResult.map, "utf8");
  log(
    `CSS: ${fmtBytes(cssSourceBytes)} -> ${fmtBytes(Buffer.byteLength(cssResult.code))} ` +
      `(${styles.length} files -> ${cssFileName})`
  );

  // ---- Runtime assets, copied verbatim ----
  const assetDirs = ["data", "icons"];
  for (const dir of assetDirs) {
    const src = path.join(ROOT, dir);
    try {
      await stat(src);
      await cp(src, path.join(DIST, dir), { recursive: true });
    } catch {
      log(`(skipped missing asset dir: ${dir})`);
    }
  }
  await cp(path.join(ROOT, "manifest.json"), path.join(DIST, "manifest.json"));

  // ---- Rewrite index.html: collapse to one script + one stylesheet ----
  let distHtml = indexHtml;
  const styleBlockRe = /(\s*<link rel="stylesheet"[^>]*\/>\n?)+/;
  distHtml = distHtml.replace(
    styleBlockRe,
    `\n  <link rel="stylesheet" href="css/${cssFileName}" />\n`
  );
  const scriptBlockRe =
    /<!-- ============ Script load order[\s\S]*<script src="js\/app\.js"><\/script>\n/;
  distHtml = distHtml.replace(scriptBlockRe, `<script src="js/${jsFileName}"></script>\n`);
  await writeFile(path.join(DIST, "index.html"), distHtml, "utf8");

  // ---- Regenerate the service worker's precache list for the real dist files ----
  const swSrc = await readFile(path.join(ROOT, "sw.js"), "utf8");
  const version = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8")).version;
  const cacheName = `etv-dashboard-v${version}-${jsHash}`;
  const shellList = [
    "./",
    "./index.html",
    "./manifest.json",
    `./css/${cssFileName}`,
    "./data/vault-data.js",
    "./icons/favicon.svg",
  ];
  let distSw = swSrc.replace(/const CACHE_NAME = "[^"]+";/, `const CACHE_NAME = "${cacheName}";`);
  distSw = distSw.replace(
    /const APP_SHELL = \[[\s\S]*?\];/,
    `const APP_SHELL = ${JSON.stringify(shellList, null, 2)};`
  );
  distSw = distSw.replace(
    /(const APP_SHELL = \[[\s\S]*?\];)/,
    `$1\nAPP_SHELL.push("./js/${jsFileName}");`
  );
  await writeFile(path.join(DIST, "sw.js"), distSw, "utf8");

  const ms = Date.now() - t0;
  log(`Done in ${ms}ms -> dist/`);
  log("Verify with: npx http-server dist -p 8081 -c-1  (then open http://localhost:8081)");
}

build().catch((err) => {
  console.error("[build] FAILED:", err);
  process.exitCode = 1;
});
