// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

describe("App.AI.Features.answerQuestion — notes privacy opt-in (Objective #7)", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    window.App.Storage.setAiSettings({
      enabled: true,
      activeProvider: "ollama",
      cacheEnabled: false,
    });
  });

  it("without includeNotes, the user's note text is NOT sent in the request", async () => {
    window.App.Storage.setNote("ETV-0001", "SECRET-PERSONAL-STRUGGLE-NOTE");
    let capturedBody = null;
    window.fetch = vi.fn().mockImplementation((url, options) => {
      capturedBody = options.body;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: { content: "answer" } }),
      });
    });

    await window.App.AI.Features.answerQuestion(
      window.App.Data.getById("ETV-0001"),
      "What is this about?",
      { includeNotes: false }
    );

    expect(capturedBody).not.toContain("SECRET-PERSONAL-STRUGGLE-NOTE");
  });

  it("without explicitly passing opts at all (default), the note is still NOT sent — safe default", async () => {
    window.App.Storage.setNote("ETV-0001", "SECRET-PERSONAL-STRUGGLE-NOTE");
    let capturedBody = null;
    window.fetch = vi.fn().mockImplementation((url, options) => {
      capturedBody = options.body;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: { content: "answer" } }),
      });
    });

    await window.App.AI.Features.answerQuestion(
      window.App.Data.getById("ETV-0001"),
      "What is this about?"
    );

    expect(capturedBody).not.toContain("SECRET-PERSONAL-STRUGGLE-NOTE");
  });

  it("with includeNotes:true, the note IS included — the explicit opt-in works", async () => {
    window.App.Storage.setNote("ETV-0001", "SECRET-PERSONAL-STRUGGLE-NOTE");
    let capturedBody = null;
    window.fetch = vi.fn().mockImplementation((url, options) => {
      capturedBody = options.body;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: { content: "answer" } }),
      });
    });

    await window.App.AI.Features.answerQuestion(
      window.App.Data.getById("ETV-0001"),
      "What is this about?",
      { includeNotes: true }
    );

    expect(capturedBody).toContain("SECRET-PERSONAL-STRUGGLE-NOTE");
  });

  it("no other AI feature (explain, study notes, related topics) ever includes notes — only answerQuestion supports it, and only when asked", async () => {
    window.App.Storage.setNote("ETV-0001", "SECRET-PERSONAL-STRUGGLE-NOTE");
    let capturedBodies = [];
    window.fetch = vi.fn().mockImplementation((url, options) => {
      capturedBodies.push(options.body);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ message: { content: "x" } }),
      });
    });

    const resource = window.App.Data.getById("ETV-0001");
    await window.App.AI.Features.explainResource(resource);
    await window.App.AI.Features.generateStudyNotes(resource);
    await window.App.AI.Features.suggestRelatedTopics(resource);

    capturedBodies.forEach((body) => expect(body).not.toContain("SECRET-PERSONAL-STRUGGLE-NOTE"));
  });
});
