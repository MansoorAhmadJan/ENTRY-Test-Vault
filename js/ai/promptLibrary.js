/* ============================================================
   Prompt Library (V5.3, Objective #5). Versioned templates, one
   builder function per AI feature. "Versioned" here means what it
   can actually mean for a client-side app with no prompt-eval
   pipeline: each template has an explicit version tag baked into
   its id, so if a template's wording changes later, old cached
   responses (see aiService.js's cache) can be identified as having
   come from a different prompt version and invalidated correctly
   rather than silently mixing outputs from different templates.

   Every builder returns { systemPrompt, userPrompt } — plain text,
   not HTML. Nothing here escapes HTML because prompts are never
   inserted into the DOM as markup; the RESPONSE that comes back
   from the AI service is what gets escaped, at render time, in
   js/views/aiFeaturesUI or wherever it lands. Conflating "escape for
   HTML" with "build a prompt" would be a category error.
   ============================================================ */
(function (App) {
  "use strict";

  const TEMPLATES = {};

  function register(id, version, builderFn) {
    TEMPLATES[id] = { id, version, build: builderFn };
  }

  function resourceContext(resource) {
    // Deliberately does NOT include resource.link (no reason to send a
    // URL to the model) or any user-personal data (notes, progress
    // status) — see Objective #7. Only the resource's own catalog
    // metadata, which is what every one of these features is about.
    return [
      `Title: ${resource.title}`,
      `Subject: ${resource.subject}`,
      `University: ${resource.university}`,
      `Category: ${resource.category}`,
      `Difficulty: ${resource.difficulty}`,
      `Description: ${resource.description}`,
    ].join("\n");
  }

  register("explain-resource", 1, (resource) => ({
    systemPrompt:
      "You are a study assistant for Pakistani university entry-test preparation (GIKI, NUST, FAST, ECAT, NTS/NAT). Be concise and practical.",
    userPrompt: `Explain what this study resource covers and who it's useful for, in 3-4 sentences.\n\n${resourceContext(resource)}`,
  }));

  register("summarize-chapter", 1, (resources) => ({
    systemPrompt:
      "You are a study assistant for Pakistani university entry-test preparation. Summarize concisely, in plain language.",
    userPrompt: `Summarize what this group of resources collectively covers, as a short study-focused overview (5-6 sentences):\n\n${resources.map((r) => `- ${r.title} (${r.subject})`).join("\n")}`,
  }));

  register("generate-study-notes", 1, (resource) => ({
    systemPrompt:
      "You are a study assistant. Generate concise, well-organized bullet-point study notes a student could review before an exam.",
    userPrompt: `Generate study notes (bullet points, organized by sub-topic) for this resource:\n\n${resourceContext(resource)}`,
  }));

  register("suggest-related-topics", 1, (resource) => ({
    systemPrompt: "You are a study assistant for entry-test preparation. Be brief and specific.",
    userPrompt: `List 3-5 related topics a student should also study alongside this resource, as a short bullet list (topic names only, no explanation):\n\n${resourceContext(resource)}`,
  }));

  register("recommend-study-sequence", 1, (resources) => ({
    systemPrompt:
      "You are a study planner for entry-test preparation. Suggest a logical study ORDER, not a full plan with dates.",
    userPrompt: `Given this list of resources a student hasn't completed yet, suggest a sensible study order and briefly say why (2-3 sentences of reasoning, then a numbered list):\n\n${resources.map((r) => `- ${r.id}: ${r.title} (${r.subject}, ${r.difficulty})`).join("\n")}`,
  }));

  register("answer-question", 1, (resource, question) => ({
    systemPrompt:
      "You are a study assistant answering a student's question about a specific resource. If the resource description doesn't contain enough information to answer confidently, say so plainly instead of guessing.",
    userPrompt: `Resource:\n${resourceContext(resource)}\n\nStudent's question: ${question}`,
  }));

  App.AI.PromptLibrary = {
    build(templateId, ...args) {
      const t = TEMPLATES[templateId];
      if (!t) throw new Error(`Unknown prompt template: ${templateId}`);
      return { ...t.build(...args), templateId: t.id, templateVersion: t.version };
    },
    listTemplates: () => Object.values(TEMPLATES).map((t) => ({ id: t.id, version: t.version })),
  };
})((window.App = window.App || {}));
