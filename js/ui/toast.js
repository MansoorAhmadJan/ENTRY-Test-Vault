/* ============================================================
   Toast notifications. Lazily creates its container on first use
   so it never assumes a particular index.html structure exists
   yet at script-load time.
   ============================================================ */
(function (App) {
  "use strict";

  const ICON_BY_TYPE = { info: "checkCircle", success: "checkCircle", error: "alertTriangle" };

  function container() {
    let node = document.getElementById("toast-container");
    if (!node) {
      node = App.Dom.el("div", {
        id: "toast-container",
        class: "toast-container",
        "aria-live": "polite",
      });
      document.body.appendChild(node);
    }
    return node;
  }

  function show(message, type) {
    type = type || "info";
    const c = container();
    const toast = App.Dom.el("div", { class: "toast", role: "status" }, []);
    toast.innerHTML = `${App.Icons.get(ICON_BY_TYPE[type] || "checkCircle")} <span>${App.Utils.escapeHtml(message)}</span>`;
    if (type === "error") toast.style.borderLeftColor = "var(--c-red)";
    if (type === "success") toast.style.borderLeftColor = "var(--c-green)";
    c.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = "opacity 200ms ease";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 220);
    }, 2600);
  }

  App.Toast = { show };
})((window.App = window.App || {}));
