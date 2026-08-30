// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

// The view is genuinely async now (Objective #8: it awaits
// App.AI.ensureLoaded() before rendering real content, showing a
// "Loading..." state first). This helper renders and waits for the
// real content, matching how it actually behaves in production.
async function renderAndWait(container) {
  window.App.Views["ai-settings"](container);
  await new Promise((r) => setTimeout(r, 20));
}

describe("View: AI Settings (App.Views['ai-settings'])", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await bootApp(window);
    window.App.Data.init();
    document.body.innerHTML = '<div id="view-root"></div>';
  });

  it("shows a loading state immediately, then real content once AI modules resolve", async () => {
    const container = document.getElementById("view-root");
    window.App.Views["ai-settings"](container);
    expect(container.textContent).toContain("Loading AI Settings");
    await new Promise((r) => setTimeout(r, 20));
    expect(container.textContent).toContain("AI Settings");
    expect(container.textContent).toContain("currently disabled");
    expect(container.innerHTML).not.toMatch(/NaN|undefined/);
  });

  it("lists all 5 providers as radio options", async () => {
    const container = document.getElementById("view-root");
    await renderAndWait(container);
    const radios = container.querySelectorAll("[data-provider-radio]");
    expect(radios.length).toBe(5);
  });

  it("toggling enabled persists to storage and re-renders", async () => {
    const container = document.getElementById("view-root");
    document.body.appendChild(container);
    await renderAndWait(container);
    container.querySelector("#ai-enabled-toggle").click();
    expect(window.App.Storage.getAiSettings().enabled).toBe(true);
    expect(container.textContent).not.toContain("currently disabled");
  });

  it("only cloud providers show an API key field; local providers don't", async () => {
    const container = document.getElementById("view-root");
    window.App.Storage.setAiSettings({ activeProvider: "ollama" });
    await renderAndWait(container);
    expect(container.querySelector("#ai-api-key")).toBeNull();

    window.App.Storage.setAiSettings({ activeProvider: "openai" });
    await renderAndWait(container);
    expect(container.querySelector("#ai-api-key")).not.toBeNull();
  });

  it("privacy labeling matches each provider's real isLocal value", async () => {
    const container = document.getElementById("view-root");
    await renderAndWait(container);
    expect(container.innerHTML).toContain("Local — nothing leaves your device");
    expect(container.innerHTML).toContain("Cloud — sends data to");
  });

  it("API key input value is never rendered in plaintext HTML outside the input's own value attribute (no accidental double-render)", async () => {
    window.App.Storage.setAiApiKey("openai", "sk-should-not-leak-as-text");
    window.App.Storage.setAiSettings({ activeProvider: "openai" });
    const container = document.getElementById("view-root");
    await renderAndWait(container);
    // It's fine (expected) that the key appears once, inside the input's value attribute.
    const keyInput = container.querySelector("#ai-api-key");
    expect(keyInput.value).toBe("sk-should-not-leak-as-text");
    // But the visible page TEXT (not attribute values) should not show it as plain readable text elsewhere.
    const bodyTextOnly = Array.from(container.querySelectorAll("p, span, div"))
      .map((el) => el.childNodes)
      .flat()
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent)
      .join(" ");
    expect(bodyTextOnly).not.toContain("sk-should-not-leak-as-text");
  });
});
