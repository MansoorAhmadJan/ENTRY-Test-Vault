/**
 * Single source of truth for "what order do the app's scripts/stylesheets
 * load in". Both scripts/build.mjs (production bundling) and
 * tests/helpers/bootApp.mjs (test harness) read this from index.html
 * itself rather than maintaining a second, driftable list.
 */
export function extractAssetOrder(html) {
  const scriptRe = /<script\s+src="([^"]+)"\s*><\/script>/g;
  const linkRe = /<link\s+rel="stylesheet"\s+href="([^"]+)"\s*\/?>/g;
  const scripts = [...html.matchAll(scriptRe)].map((m) => m[1]);
  const styles = [...html.matchAll(linkRe)].map((m) => m[1]);
  return { scripts, styles };
}
