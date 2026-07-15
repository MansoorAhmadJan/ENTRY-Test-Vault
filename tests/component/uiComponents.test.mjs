// @vitest-environment jsdom
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("Component: Sidebar (App.Components.renderSidebar)", () => {
  beforeAll(async () => {
    await bootApp(window);
    window.App.Data.init();
  });

  beforeEach(() => {
    document.body.innerHTML = '<div id="sidebar-root"></div>';
  });

  it("renders one nav item per App.Config.NAV_ITEMS entry", () => {
    window.App.Components.renderSidebar({ view: "home", params: {} });
    const root = document.getElementById("sidebar-root");
    const items = root.querySelectorAll("[data-route]");
    // At least the configured nav items, plus one per university.
    expect(items.length).toBeGreaterThanOrEqual(window.App.Config.NAV_ITEMS.length);
  });

  it("marks the item matching the current route as active/aria-current", () => {
    window.App.Components.renderSidebar({ view: "favorites", params: {} });
    const active = document.querySelector('[data-route="favorites"]');
    expect(active).not.toBeNull();
    expect(active.classList.contains("active")).toBe(true);
    expect(active.getAttribute("aria-current")).toBe("page");
  });

  it("a non-active item is not marked current", () => {
    window.App.Components.renderSidebar({ view: "favorites", params: {} });
    const inactive = document.querySelector('[data-route="stats"]');
    expect(inactive.classList.contains("active")).toBe(false);
    expect(inactive.getAttribute("aria-current")).toBe("false");
  });

  it("does nothing (no throw) if #sidebar-root is missing from the DOM", () => {
    document.body.innerHTML = "";
    expect(() => window.App.Components.renderSidebar({ view: "home", params: {} })).not.toThrow();
  });

  it("favorites count badge reflects App.Storage state", () => {
    window.localStorage.clear();
    window.App.Storage.toggleFavorite("ETV-0001");
    window.App.Storage.toggleFavorite("ETV-0002");
    window.App.Components.renderSidebar({ view: "home", params: {} });
    const favItem = document.querySelector('[data-route="favorites"]');
    const badge = favItem.querySelector(".nav-count");
    expect(badge.textContent.trim()).toBe("2");
  });
});

describe("Component: Resource card (App.Components.renderResourceCard)", () => {
  let sample;

  beforeAll(async () => {
    await bootApp(window);
    window.App.Data.init();
    sample = window.App.Data.getById("ETV-0001");
  });

  it("renders a DOM node containing the resource's title", () => {
    const node = window.App.Components.renderResourceCard(sample);
    expect(node.textContent).toContain(sample.title);
  });

  it("escapes HTML in resource fields to prevent XSS (defense-in-depth check)", () => {
    const malicious = {
      ...sample,
      id: "ETV-TEST-XSS",
      title: '<img src=x onerror="window.__xss=true">',
    };
    const node = window.App.Components.renderResourceCard(malicious);
    expect(node.querySelector("img")).toBeNull();
    expect(window.__xss).toBeUndefined();
    // The literal text should still be visible (escaped), not silently dropped.
    expect(node.innerHTML).toContain("&lt;img");
  });
});
