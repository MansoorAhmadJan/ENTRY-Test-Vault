/* ============================================================
   Error Handler. Objective #12 (graceful error handling for
   missing/corrupted data): every view render and every risky
   operation should go through App.ErrorHandler.guard() instead
   of running unguarded, so one broken resource or one bad
   localStorage entry degrades a single panel instead of white-
   screening the whole app.
   ============================================================ */
(function (App) {
  "use strict";

  const log = [];

  function record(context, err) {
    const entry = {
      context,
      message: String((err && err.message) || err),
      time: new Date().toISOString(),
    };
    log.push(entry);
    console.error(`[ErrorHandler] ${context}:`, err);
    return entry;
  }

  // Wrap a render function: if it throws, show an inline error card
  // in `container` instead of leaving a blank panel or crashing the
  // rest of the page (other already-rendered regions stay intact).
  function guard(container, context, fn) {
    try {
      return fn();
    } catch (err) {
      record(context, err);
      if (container) {
        container.innerHTML = `
          <div class="empty-state" role="alert">
            ${App.Icons.get("alertTriangle")}
            <p><strong>Something went wrong rendering "${App.Utils.escapeHtml(context)}".</strong></p>
            <p class="csp-65c9a6">
              ${App.Utils.escapeHtml(String((err && err.message) || err))}
            </p>
          </div>`;
      }
      if (App.Toast) App.Toast.show(`Couldn't load ${context}`, "error");
      return null;
    }
  }

  // Wrap a plain (non-DOM) operation, e.g. a localStorage write triggered by a click.
  function safeCall(context, fn, fallback) {
    try {
      return fn();
    } catch (err) {
      record(context, err);
      if (App.Toast) App.Toast.show(`Action failed: ${context}`, "error");
      return fallback;
    }
  }

  function installGlobalHandlers() {
    window.addEventListener("error", (e) => record("window.onerror", e.error || e.message));
    window.addEventListener("unhandledrejection", (e) => record("unhandledrejection", e.reason));
  }

  function getLog() {
    return log.slice();
  }

  App.ErrorHandler = { guard, safeCall, installGlobalHandlers, getLog, record };
})((window.App = window.App || {}));
