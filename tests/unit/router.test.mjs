// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.Router (real hash-routing source)", () => {
  beforeEach(async () => {
    // Router keeps module-level state (onChange), so give each test a fresh
    // boot rather than sharing one across the file.
    window.location.hash = "";
    await bootApp(window);
  });

  it("empty hash resolves to the home view", () => {
    window.location.hash = "";
    expect(window.App.Router.current()).toEqual({ view: "home", params: {} });
  });

  it("parses a simple view route", () => {
    window.location.hash = "#/browse";
    expect(window.App.Router.current()).toEqual({ view: "browse", params: {} });
  });

  it("parses a university route with its key param", () => {
    window.location.hash = "#/university/GIKI";
    expect(window.App.Router.current()).toEqual({
      view: "university",
      params: { key: "GIKI" },
    });
  });

  it("parses a subject route with its name param", () => {
    window.location.hash = "#/subject/Physics";
    expect(window.App.Router.current()).toEqual({
      view: "subject",
      params: { name: "Physics" },
    });
  });

  it("parses a resource route with its id param", () => {
    window.location.hash = "#/resource/ETV-0001";
    expect(window.App.Router.current()).toEqual({
      view: "resource",
      params: { id: "ETV-0001" },
    });
  });

  it("decodes URI-encoded params", () => {
    window.location.hash = "#/subject/" + encodeURIComponent("Advance Maths");
    expect(window.App.Router.current()).toEqual({
      view: "subject",
      params: { name: "Advance Maths" },
    });
  });

  it("falls back to home for an unknown view", () => {
    window.location.hash = "#/totally-not-a-real-view";
    expect(window.App.Router.current()).toEqual({ view: "home", params: {} });
  });

  it("navigate() updates location.hash and current() reflects the new route", () => {
    window.App.Router.navigate("stats");
    expect(window.location.hash).toBe("#stats");
    expect(window.App.Router.current()).toEqual({ view: "stats", params: {} });
  });

  it("init() fires the handler immediately with the current route", async () => {
    window.location.hash = "#/favorites";
    let received = null;
    window.App.Router.init((route) => {
      received = route;
    });
    expect(received).toEqual({ view: "favorites", params: {} });
  });

  it("init() fires the handler again on hashchange", async () => {
    window.location.hash = "#/home";
    const seen = [];
    window.App.Router.init((route) => seen.push(route.view));
    window.location.hash = "#/queue";
    await new Promise((r) => setTimeout(r, 0));
    expect(seen).toContain("queue");
  });
});
