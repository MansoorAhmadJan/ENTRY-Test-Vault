// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.Storage — Backup version compatibility & selective restore (V5.4)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
  });

  it("exportAll() stamps the real app version onto the payload", () => {
    const exported = window.App.Storage.exportAll();
    expect(exported._appVersion).toBe(window.App.BuildInfo.version);
  });

  it("checkBackupCompatibility reports no warning for a same-version backup", () => {
    const exported = window.App.Storage.exportAll();
    const check = window.App.Storage.checkBackupCompatibility(exported);
    expect(check.compatible).toBe(true);
    expect(check.warning).toBeNull();
  });

  it("checkBackupCompatibility warns (but still allows) a major-version mismatch", () => {
    const originalVersion = window.App.BuildInfo.version;
    window.App.BuildInfo.version = "5.4.0-rc1"; // stub a realistic current version — the raw-source test harness's real value is the honest "dev" placeholder (see buildInfo.js), which has no major-version number to compare against
    const check = window.App.Storage.checkBackupCompatibility({ _appVersion: "3.0.0" });
    expect(check.compatible).toBe(true); // informational, not a hard block
    expect(check.warning).toMatch(/different major version/i);
    window.App.BuildInfo.version = originalVersion;
  });

  it("checkBackupCompatibility does not warn for a matching major version with a different minor/patch", () => {
    window.App.BuildInfo.version = "5.4.0-rc1";
    const check = window.App.Storage.checkBackupCompatibility({ _appVersion: "5.0.0-different" });
    expect(check.warning).toBeNull();
  });

  it("checkBackupCompatibility handles a payload with no version stamp at all (pre-V5.4 backups) without throwing", () => {
    const check = window.App.Storage.checkBackupCompatibility({ favorites: [] });
    expect(check.exportedVersion).toBe("unknown");
  });

  it("importAll with onlyKeys restores ONLY the specified categories", () => {
    window.App.Storage.toggleFavorite("ETV-0001");
    window.App.Storage.setNote("ETV-0002", "a note");
    window.App.Storage.addToQueue("ETV-0003");
    const exported = window.App.Storage.exportAll();
    window.App.Storage.clearAll();

    window.App.Storage.importAll(exported, { onlyKeys: ["favorites"] });

    expect(window.App.Storage.getFavorites()).toContain("ETV-0001");
    expect(window.App.Storage.getNote("ETV-0002")).toBe(""); // NOT restored — wasn't in onlyKeys
    expect(window.App.Storage.getReadingQueue()).toEqual([]); // NOT restored either
  });

  it("importAll with multiple onlyKeys restores exactly that set, nothing more", () => {
    window.App.Storage.toggleFavorite("ETV-0001");
    window.App.Storage.setNote("ETV-0002", "a note");
    window.App.Storage.addToQueue("ETV-0003");
    const exported = window.App.Storage.exportAll();
    window.App.Storage.clearAll();

    window.App.Storage.importAll(exported, { onlyKeys: ["favorites", "notes"] });

    expect(window.App.Storage.getFavorites()).toContain("ETV-0001");
    expect(window.App.Storage.getNote("ETV-0002")).toBe("a note");
    expect(window.App.Storage.getReadingQueue()).toEqual([]); // still not restored
  });

  it("importAll without onlyKeys restores everything present, exactly as before (backward compatible default)", () => {
    window.App.Storage.toggleFavorite("ETV-0001");
    window.App.Storage.setNote("ETV-0002", "a note");
    const exported = window.App.Storage.exportAll();
    window.App.Storage.clearAll();

    window.App.Storage.importAll(exported); // no options — old call signature, still works

    expect(window.App.Storage.getFavorites()).toContain("ETV-0001");
    expect(window.App.Storage.getNote("ETV-0002")).toBe("a note");
  });

  it("importAll with an empty onlyKeys array restores nothing (explicit, not treated as 'restore all')", () => {
    window.App.Storage.toggleFavorite("ETV-0001");
    const exported = window.App.Storage.exportAll();
    window.App.Storage.clearAll();

    window.App.Storage.importAll(exported, { onlyKeys: [] });

    expect(window.App.Storage.getFavorites()).toEqual([]);
  });
});
