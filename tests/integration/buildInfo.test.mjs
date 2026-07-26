// @vitest-environment node
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

describe("build.mjs injects real build info (V5.4, Objective #8)", () => {
  it("dist bundle contains a real version, timestamp, and commit hash — not the dev placeholder", async () => {
    execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
    const distHtml = await readFile(path.join(ROOT, "dist", "index.html"), "utf8");
    const bundleMatch = distHtml.match(/js\/(bundle\.[a-f0-9]+\.min\.js)/);
    expect(bundleMatch).not.toBeNull();
    const bundle = await readFile(path.join(ROOT, "dist", "js", bundleMatch[1]), "utf8");

    const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));

    expect(bundle).toContain(`version:"${pkg.version}"`);
    expect(bundle).not.toContain('version:"dev"'); // the dev-mode placeholder must NOT survive into prod
    expect(bundle).toMatch(/mode:"production"/);
    expect(bundle).toMatch(/builtAt:"\d{4}-\d{2}-\d{2}T/); // a real ISO timestamp, not null
    expect(bundle).toMatch(/commit:"[0-9a-f]{7,}"/); // a real short git hash, not null
  }, 30000);

  it("dev mode (raw index.html, no build) shows the honest placeholder, not fabricated build metadata", async () => {
    const source = await readFile(path.join(ROOT, "js", "core", "buildInfo.js"), "utf8");
    expect(source).toContain('version: "dev"');
    expect(source).toContain("development");
  });
});
