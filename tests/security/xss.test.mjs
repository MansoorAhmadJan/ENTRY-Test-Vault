// @vitest-environment jsdom
//
// Tests that a malicious/malformed resource (as could arrive via
// Settings' vault-data import — this app's actual untrusted-input
// boundary) cannot execute script or navigate to a javascript: URL when
// rendered through the real components.
//
// IMPORTANT methodology note: these tests check for actual script
// EXECUTION on a live DOM, not string-matching on serialized innerHTML.
// An early draft of this test checked `html.includes("<script>")` and
// got a false positive — a correctly-escaped attribute value can
// legitimately *serialize* back with literal `<`/`>` characters (they
// aren't required to be escaped inside an already-quoted attribute
// value), without that being unsafe. The only test that actually proves
// safety is: attach it to a live document with script execution enabled,
// and confirm nothing fires. See docs/SECURITY.md for the full writeup.
import { describe, it, expect, beforeAll } from "vitest";
import { bootApp } from "../helpers/bootApp.mjs";

const MALICIOUS_RESOURCE = {
  id: "ETV-EVIL",
  title:
    'test"><script>window.__xssFired=true;</script><img src=x onerror="window.__xssFired=true">',
  description: "x",
  university: "GIKI",
  subject: "Physics",
  category: "Books",
  chapter: "x",
  platform: "x",
  resourceType: "x",
  difficulty: '<img src=x onerror="window.__xssFired=true">',
  priority: 3,
  quality: "Good",
  estTime: "1 hr",
  language: "English",
  status: "Not Started",
  verificationStatus: "Verified",
  dateAdded: "2026-01-01",
  lastUpdated: "2026-01-01",
  prerequisites: [],
  link: "javascript:window.__xssFired=true",
};

describe("Security (V5.2): malicious resource data cannot execute script", () => {
  beforeAll(async () => {
    await bootApp(window);
    window.App.Data.init();
  });

  it("rendering a resource card with script/event-handler injection attempts does not execute them", async () => {
    window.__xssFired = false;
    const card = window.App.Components.renderResourceCard(MALICIOUS_RESOURCE);
    document.body.appendChild(card);
    await new Promise((r) => setTimeout(r, 30));
    expect(window.__xssFired).toBe(false);
    card.remove();
  });

  it("opening the resource modal for a malicious resource does not execute script", async () => {
    window.__xssFired = false;
    window.App.Data.reload({
      resources: [MALICIOUS_RESOURCE],
      universities: window.VAULT_DATA.universities,
      searchAliases: {},
    });
    window.App.Components.openResourceModal("ETV-EVIL");
    await new Promise((r) => setTimeout(r, 30));
    expect(window.__xssFired).toBe(false);
  });

  it("a javascript: URL is rejected by the URL validator", () => {
    expect(window.App.Validators.isValidUrl("javascript:alert(1)")).toBe(false);
    expect(window.App.Validators.isValidUrl("data:text/html,<script>alert(1)</script>")).toBe(
      false
    );
  });

  it("a real http(s) URL still passes validation (the fix isn't overly broad)", () => {
    expect(window.App.Validators.isValidUrl("https://drive.google.com/file/x")).toBe(true);
    expect(window.App.Validators.isValidUrl("http://example.com")).toBe(true);
  });

  it("a resource with a javascript: link renders a disabled placeholder, not a clickable link", () => {
    window.App.Data.reload({
      resources: [MALICIOUS_RESOURCE],
      universities: window.VAULT_DATA.universities,
      searchAliases: {},
    });
    window.App.Components.openResourceModal("ETV-EVIL");
    const link = document.querySelector(".modal-footer a[href]");
    const disabled = document.querySelector(".modal-footer [aria-disabled='true']");
    expect(link).toBeNull();
    expect(disabled).not.toBeNull();
  });

  it("difficulty/quality/verificationStatus badge fields are HTML-escaped, not raw-interpolated", () => {
    const card = window.App.Components.renderResourceCard(MALICIOUS_RESOURCE);
    expect(card.querySelector(".badge").innerHTML).not.toContain("<img");
    expect(card.querySelector(".badge").innerHTML).toContain("&lt;img");
  });
});
