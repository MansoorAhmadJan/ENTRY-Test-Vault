/* ============================================================
   Reading Queue view. An ORDERED list (unlike Bookmarks, which
   is unordered) — drag to reorder, remove individually, or open
   directly. Persisted via App.Storage.getReadingQueue()/reorderQueue().
   ============================================================ */
(function (App) {
  "use strict";

  let dragSourceId = null;

  function itemHtml(resource, index) {
    return `
      <div class="queue-item" draggable="true" data-id="${resource.id}" data-index="${index}" role="listitem" tabindex="0" aria-label="${App.Utils.escapeHtml(resource.title)}, position ${index + 1}">
        <span class="queue-drag-handle" aria-hidden="true">${App.Icons.get("menu")}</span>
        <span style="font-size:12px;color:var(--text-muted);width:20px;">${index + 1}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${App.Utils.escapeHtml(resource.title)}</div>
          <div style="font-size:11.5px;color:var(--text-muted);">${resource.id} · ${App.Utils.escapeHtml(resource.university)} · ${App.Utils.escapeHtml(resource.subject)}</div>
        </div>
        <span class="badge ${App.Formatters.badgeClass(resource.difficulty)}">${App.Utils.escapeHtml(resource.difficulty)}</span>
        <button class="icon-toggle" data-open="${resource.id}" aria-label="Open ${App.Utils.escapeHtml(resource.title)}">${App.Icons.get("external")}</button>
        <button class="icon-toggle" data-remove="${resource.id}" aria-label="Remove from queue">${App.Icons.get("x")}</button>
      </div>`;
  }

  function paint(container) {
    const ids = App.Storage.getReadingQueue();
    const resources = App.Data.getByIds(ids);
    const listHost = container.querySelector("#queue-list");
    if (!resources.length) {
      listHost.innerHTML = `<div class="empty-state">${App.Icons.get("layers")}<p>Your reading queue is empty. Add resources via the card menu or right-click → Add to Reading Queue.</p></div>`;
      return;
    }
    listHost.setAttribute("role", "list");
    listHost.innerHTML = resources.map(itemHtml).join("");

    listHost.addEventListener("dragstart", (e) => {
      const item = e.target.closest(".queue-item");
      if (!item) return;
      dragSourceId = item.getAttribute("data-id");
      item.classList.add("dragging");
    });
    listHost.addEventListener("dragend", (e) => {
      const item = e.target.closest(".queue-item");
      if (item) item.classList.remove("dragging");
    });
    listHost.addEventListener("dragover", (e) => {
      e.preventDefault();
      const target = e.target.closest(".queue-item");
      if (!target || target.getAttribute("data-id") === dragSourceId) return;
      const rect = target.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      target.parentNode.insertBefore(
        listHost.querySelector(`[data-id="${dragSourceId}"]`),
        before ? target : target.nextSibling
      );
    });
    listHost.addEventListener("drop", (e) => {
      e.preventDefault();
      const newOrder = App.Dom.qsa(".queue-item", listHost).map((el) => el.getAttribute("data-id"));
      App.Storage.reorderQueue(newOrder);
      paint(container);
    });

    App.Dom.qsa("[data-open]", listHost).forEach((btn) => {
      btn.addEventListener("click", () =>
        App.Components.openResourceModal(btn.getAttribute("data-open"))
      );
    });
    App.Dom.qsa("[data-remove]", listHost).forEach((btn) => {
      btn.addEventListener("click", () => {
        App.Storage.removeFromQueue(btn.getAttribute("data-remove"));
        App.Toast.show("Removed from reading queue", "info");
        paint(container);
      });
    });
  }

  function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1>Reading Queue</h1><p class="subtitle">Your ordered study plan. Drag items to reorder.</p></div>
        <button class="btn" id="clear-queue-btn">${App.Icons.get("trash")} Clear Queue</button>
      </div>
      <div id="queue-list" style="max-width:720px;"></div>
    `;
    paint(container);
    container.querySelector("#clear-queue-btn").addEventListener("click", () => {
      if (!App.Storage.getReadingQueue().length) return;
      if (!window.confirm("Clear your entire reading queue?")) return;
      App.Storage.reorderQueue([]);
      paint(container);
    });

    document.addEventListener("app:data-changed", function refresh() {
      if (!document.body.contains(container)) {
        document.removeEventListener("app:data-changed", refresh);
        return;
      }
      paint(container);
    });
  }

  App.Views = App.Views || {};
  App.Views.queue = (c) => App.ErrorHandler.guard(c, "Reading Queue", () => render(c));
})((window.App = window.App || {}));
