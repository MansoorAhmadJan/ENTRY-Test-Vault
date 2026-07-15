/**
 * Boots the actual application source into the current test's jsdom
 * environment, so tests exercise the real js/**\/*.js files — not
 * reimplementations or mocks of them.
 *
 * How: reads index.html for the authoritative script order (same list
 * scripts/build.mjs uses), then evaluates each file's source against the
 * test's `window` via Node's vm module. This works BECAUSE the app is
 * global-namespace IIFEs with no import/export — each file is valid
 * classic-script source, so it can be run directly against a `window`
 * global without a bundler or module loader.
 *
 * This does not touch data/vault-data.js's role: real vault data is loaded
 * the same way it is in production, so search/filter tests run against
 * real (not fixture) resource data.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { extractAssetOrder } from "../../scripts/lib/assetOrder.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");

let cachedOrder = null;

async function getOrder() {
  if (!cachedOrder) {
    const html = await readFile(path.join(ROOT, "index.html"), "utf8");
    cachedOrder = extractAssetOrder(html);
  }
  return cachedOrder;
}

/**
 * Executes data/vault-data.js + every js/** file (in index.html's order)
 * against the given window. Returns the same `window` for convenience.
 * Pass the test's jsdom `window` (globalThis.window under environment:
 * 'jsdom') so App attaches to the real test global, not a detached object.
 */
export async function bootApp(win) {
  const { scripts } = await getOrder();
  const context = vm.createContext(win);
  for (const rel of scripts) {
    const full = path.join(ROOT, rel);
    const source = await readFile(full, "utf8");
    vm.runInContext(source, context, { filename: rel });
  }
  // Mirror what app.js's own init() does at boot, minus the DOM shell
  // rendering — tests call App.Data.init()/App.Search.build() explicitly
  // where needed so each suite controls its own setup cost.
  return win;
}

export { getOrder };
