/* ============================================================
   Keyboard Shortcuts modal — reads its content from
   App.Config.SHORTCUTS so the help panel can never drift out of
   sync with what app.js actually binds.
   ============================================================ */
(function (App) {
  "use strict";

  let overlayEl = null;

  function ensure() {
    if (overlayEl) return overlayEl;
    overlayEl = App.Dom.el("div", { class: "modal-overlay", id: "shortcuts-modal-overlay" });
    document.body.appendChild(overlayEl);
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl) close();
    });
    App.Dom.delegate(overlayEl, "click", "[data-close-modal]", close);
    return overlayEl;
  }

  function kbdHtml(combo) {
    return combo
      .split(" ")
      .map((part) =>
        part
          .split("+")
          .map((k) => `<kbd>${k === "mod" ? "Ctrl" : App.Utils.escapeHtml(k)}</kbd>`)
          .join("+")
      )
      .join(" then ");
  }

  function open() {
    ensure();
    overlayEl.innerHTML = `
      <div class="modal csp-73f9c4">
        <div class="modal-header">
          <h2 class="csp-864c8f">Keyboard Shortcuts</h2>
          <button class="modal-close" data-close-modal aria-label="Close">${App.Icons.get("close")}</button>
        </div>
        <div class="modal-body">
          <div class="shortcut-grid">
            ${App.Config.SHORTCUTS.map(
              (s) => `
              <div class="shortcut-row"><span>${s.label}</span>${kbdHtml(s.combo)}</div>
            `
            ).join("")}
          </div>
        </div>
      </div>`;
    overlayEl.classList.add("open");
    App.FocusTrap.trap(overlayEl);
  }
  function close() {
    if (overlayEl) overlayEl.classList.remove("open");
    App.FocusTrap.release();
  }
  function isOpen() {
    return !!(overlayEl && overlayEl.classList.contains("open"));
  }

  App.Components = App.Components || {};
  App.Components.openShortcutsModal = open;
  App.Components.closeShortcutsModal = close;
  App.Components.isShortcutsModalOpen = isOpen;
})((window.App = window.App || {}));
