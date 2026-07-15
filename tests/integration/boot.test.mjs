// @vitest-environment node
//
// This suite deliberately does NOT use vitest's shared jsdom environment.
// App.init() attaches document-level listeners (keyboard shortcuts, resize)
// that are never torn down between calls — realistic for a real page load,
// but if five tests shared one `document` (vitest's default per-FILE jsdom
// instance), each test's App.init() would stack another listener on top of
// the last test's, causing cross-test interference. A fresh JSDOM per test
// gives each test its own document/window, matching a real page load.
import { describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { bootApp } from "../helpers/bootApp.mjs";

async function freshApp() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  dom.window.document.body.innerHTML = '<div id="app-root"></div>';
  await bootApp(dom.window);
  return dom;
}

describe("Integration: full app boot (real app.js init sequence)", () => {
  it("App.init() renders the shell and the home view without throwing", async () => {
    const dom = await freshApp();
    expect(() => dom.window.App.init()).not.toThrow();
    const root = dom.window.document.getElementById("app-root");
    expect(root.querySelector(".app-shell")).not.toBeNull();
    expect(root.querySelector("#sidebar-root").innerHTML.trim()).not.toBe("");
    expect(root.querySelector("#view-root").innerHTML.trim()).not.toBe("");
    dom.window.close();
  });

  it("navigating via the router re-renders the view for the new route", async () => {
    const dom = await freshApp();
    dom.window.App.init();
    dom.window.App.Router.navigate("stats");
    const viewRoot = dom.window.document.getElementById("view-root");
    expect(viewRoot.innerHTML.trim()).not.toBe("");
    dom.window.close();
  });

  it("deep-linking straight to a resource route renders home underneath plus the modal", async () => {
    const dom = await freshApp();
    dom.window.location.hash = "#/resource/ETV-0001";
    dom.window.App.init();
    const root = dom.window.document.getElementById("app-root");
    expect(root.querySelector("#view-root").innerHTML.trim()).not.toBe("");
    expect(dom.window.document.querySelector(".resource-modal, [role='dialog']")).not.toBeNull();
    dom.window.close();
  });

  it("an unknown view falls back to router's home redirect, not an app.js error state", async () => {
    const dom = await freshApp();
    dom.window.location.hash = "#/not-a-real-view";
    expect(() => dom.window.App.init()).not.toThrow();
    expect(dom.window.App.Router.current().view).toBe("home");
    dom.window.close();
  });

  it("keyboard shortcut g+h navigates home from another view", async () => {
    const dom = await freshApp();
    dom.window.App.init();
    dom.window.App.Router.navigate("stats");
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "g" }));
    dom.window.document.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "h" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(dom.window.App.Router.current().view).toBe("home");
    dom.window.close();
  });
});
