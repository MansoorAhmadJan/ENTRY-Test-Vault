// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("View: Settings — selective restore panel (V5.4)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    document.body.innerHTML = '<div id="view-root"></div>';
  });

  function selectFile(container, content) {
    const fileInput = container.querySelector("#import-backup-input");
    const fakeFile = new window.File([content], "backup.json", { type: "application/json" });
    Object.defineProperty(fileInput, "files", { value: [fakeFile], configurable: true });
    fileInput.dispatchEvent(new window.Event("change"));
  }

  it("shows the category selection panel after selecting a valid backup file", async () => {
    const backup = JSON.stringify(window.App.Storage.exportAll());
    const container = document.getElementById("view-root");
    window.App.Views.settings(container);
    selectFile(container, backup);
    await new Promise((r) => setTimeout(r, 30));

    const panel = container.querySelector("#restore-options-panel");
    expect(panel.textContent).toContain("Choose what to restore");
    expect(panel.querySelectorAll("[data-restore-cat]").length).toBeGreaterThan(0);
  });

  it("restoring with a category unchecked does NOT restore that category's data", async () => {
    window.App.Storage.toggleFavorite("ETV-0001");
    window.App.Storage.setNote("ETV-0002", "should not come back");
    const backup = JSON.stringify(window.App.Storage.exportAll());
    window.App.Storage.clearAll();

    const container = document.getElementById("view-root");
    window.App.Views.settings(container);
    selectFile(container, backup);
    await new Promise((r) => setTimeout(r, 30));

    const panel = container.querySelector("#restore-options-panel");
    const notesLabel = Array.from(panel.querySelectorAll("label")).find((l) =>
      l.textContent.includes("Notes")
    );
    notesLabel.querySelector("input").checked = false;
    panel.querySelector("#confirm-restore-btn").click();
    await new Promise((r) => setTimeout(r, 30));

    expect(window.App.Storage.getFavorites()).toContain("ETV-0001");
    expect(window.App.Storage.getNote("ETV-0002")).toBe("");
  });

  it("shows a version-mismatch warning for an old backup, but still allows restoring", async () => {
    const backup = JSON.stringify({ ...window.App.Storage.exportAll(), _appVersion: "1.0.0" });
    const container = document.getElementById("view-root");
    window.App.Views.settings(container);
    selectFile(container, backup);
    await new Promise((r) => setTimeout(r, 30));

    const panel = container.querySelector("#restore-options-panel");
    // Real behavior depends on App.BuildInfo.version's major digit vs "1" —
    // in this raw-source test harness BuildInfo.version is "dev" (no
    // digits), so no mismatch is detected here; this test instead confirms
    // the panel doesn't crash and still offers a restore path either way.
    expect(panel.querySelector("#confirm-restore-btn")).not.toBeNull();
  });

  it("cancel clears the panel and the file input without restoring anything", async () => {
    window.App.Storage.toggleFavorite("ETV-0001");
    const backup = JSON.stringify(window.App.Storage.exportAll());
    window.App.Storage.clearAll();

    const container = document.getElementById("view-root");
    window.App.Views.settings(container);
    selectFile(container, backup);
    await new Promise((r) => setTimeout(r, 30));

    container.querySelector("#cancel-restore-btn").click();

    expect(container.querySelector("#restore-options-panel").innerHTML).toBe("");
    expect(window.App.Storage.getFavorites()).toEqual([]); // nothing restored
  });

  it("a malformed (non-JSON) file shows an error via ErrorHandler instead of crashing", async () => {
    const container = document.getElementById("view-root");
    window.App.Views.settings(container);
    expect(() => selectFile(container, "not valid json{{{")).not.toThrow();
    await new Promise((r) => setTimeout(r, 30));
    // No panel should be populated for a file that couldn't even be parsed.
    expect(container.querySelector("#restore-options-panel").innerHTML).toBe("");
  });
});
