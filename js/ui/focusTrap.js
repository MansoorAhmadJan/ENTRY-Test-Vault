/* ============================================================
   Focus Trap. Objective #8 (full keyboard navigation / focus
   management). One small utility, reused by every overlay
   (resource modal, command palette, shortcuts modal) instead of
   each modal reimplementing Tab-cycling logic.
   ============================================================ */
(function (App) {
  "use strict";

  const FOCUSABLE =
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
  let lastActiveElement = null;
  let trapHandler = null;
  let trappedEl = null;

  function trap(containerEl) {
    release(); // only one trap active at a time
    lastActiveElement = document.activeElement;
    trappedEl = containerEl;

    trapHandler = (e) => {
      if (e.key !== "Tab") return;
      const focusable = App.Dom.qsa(FOCUSABLE, containerEl).filter(
        (el) => el.offsetParent !== null
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    containerEl.addEventListener("keydown", trapHandler);
  }

  function release() {
    if (trappedEl && trapHandler) trappedEl.removeEventListener("keydown", trapHandler);
    trapHandler = null;
    trappedEl = null;
    // Restore focus to whatever opened the overlay (a card, a button, ...)
    // so keyboard users don't lose their place when a modal closes.
    if (lastActiveElement && document.body.contains(lastActiveElement)) {
      lastActiveElement.focus();
    }
    lastActiveElement = null;
  }

  App.FocusTrap = { trap, release };
})((window.App = window.App || {}));
