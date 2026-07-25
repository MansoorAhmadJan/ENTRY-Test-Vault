/* ============================================================
   AI Features (V5.3, Objective #3). Thin, one-per-feature wrappers
   over App.AI.Service.ask() + App.AI.PromptLibrary. No fetch(), no
   provider logic here — this layer only knows "what data does this
   feature need and which template does it use."
   ============================================================ */
(function (App) {
  "use strict";

  function explainResource(resource) {
    return App.AI.Service.ask("explain-resource", resource);
  }

  function summarizeChapter(resources) {
    return App.AI.Service.ask("summarize-chapter", resources);
  }

  function generateStudyNotes(resource) {
    return App.AI.Service.ask("generate-study-notes", resource);
  }

  function suggestRelatedTopics(resource) {
    return App.AI.Service.ask("suggest-related-topics", resource);
  }

  function recommendStudySequence(resources) {
    return App.AI.Service.ask("recommend-study-sequence", resources);
  }

  /**
   * Objective #7 (Privacy) is enforced HERE, structurally, not just by
   * convention: the caller must explicitly pass includeNotes:true for
   * the user's own note on this resource to be added to the question.
   * Without that flag, only the resource's own catalog metadata is
   * sent — same as every other feature above.
   */
  function answerQuestion(resource, question, opts) {
    opts = opts || {};
    let effectiveResource = resource;
    if (opts.includeNotes) {
      const note = App.Storage.getNote(resource.id);
      if (note) {
        effectiveResource = {
          ...resource,
          description: `${resource.description}\n\n[Student's note: ${note}]`,
        };
      }
    }
    return App.AI.Service.ask("answer-question", effectiveResource, question);
  }

  App.AI.Features = {
    explainResource,
    summarizeChapter,
    generateStudyNotes,
    suggestRelatedTopics,
    recommendStudySequence,
    answerQuestion,
  };
})((window.App = window.App || {}));
