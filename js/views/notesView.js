/* ============================================================
   My Notes view (V5.0, Objective #1 + #7: Personal Learning
   Workspace / Personal Knowledge Base). Aggregates App.Storage's
   existing per-resource notes map into one browsable list. Actual
   note EDITING still happens in the resource modal (App.Storage.setNote
   already exists there) — this view reads and deletes, and deep-links
   into the modal to edit, rather than duplicating a second textarea
   UI and a second save path.
   ============================================================ */
(function (App) {
  "use strict";

  function noteRow(resource, note) {
    const preview = note.length > 220 ? note.slice(0, 220) + "…" : note;
    return `
      <div class="card" data-note-id="${resource.id}" style="margin-bottom:var(--sp-3);">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--sp-3);margin-bottom:var(--sp-2);">
          <div style="min-width:0;">
            <div style="font-weight:600;font-size:13.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${App.Utils.escapeHtml(resource.title)}</div>
            <div style="font-size:11.5px;color:var(--text-muted);">${resource.id} · ${App.Utils.escapeHtml(resource.university)} · ${App.Utils.escapeHtml(resource.subject)}</div>
          </div>
          <div style="display:flex;gap:var(--sp-2);flex-shrink:0;">
            <button class="icon-toggle" data-edit-note="${resource.id}" aria-label="Edit note for ${App.Utils.escapeHtml(resource.title)}">${App.Icons.get("external")}</button>
            <button class="icon-toggle" data-delete-note="${resource.id}" aria-label="Delete note for ${App.Utils.escapeHtml(resource.title)}">${App.Icons.get("trash")}</button>
          </div>
        </div>
        <p style="font-size:13px;white-space:pre-wrap;color:var(--text-primary);">${App.Utils.escapeHtml(preview)}</p>
      </div>`;
  }

  function paint(container) {
    const notesMap = App.Storage.getNotesMap();
    const entries = Object.entries(notesMap)
      .map(([id, note]) => ({ resource: App.Data.getById(id), note }))
      .filter((e) => e.resource && e.note && e.note.trim()); // defensive: drop notes for since-removed resources

    const listHost = container.querySelector("#notes-list");
    if (!entries.length) {
      listHost.innerHTML = `<div class="empty-state">${App.Icons.get("note")}<p>No notes yet. Open any resource and use the "Your Notes" field to jot something down — it'll show up here.</p></div>`;
      return;
    }
    entries.sort((a, b) => a.resource.title.localeCompare(b.resource.title));
    listHost.innerHTML = entries.map((e) => noteRow(e.resource, e.note)).join("");

    App.Dom.qsa("[data-edit-note]", listHost).forEach((btn) => {
      btn.addEventListener("click", () =>
        App.Components.openResourceModal(btn.getAttribute("data-edit-note"))
      );
    });
    App.Dom.qsa("[data-delete-note]", listHost).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-delete-note");
        if (!window.confirm("Delete this note? This can't be undone.")) return;
        App.Storage.setNote(id, "");
        App.Toast.show("Note deleted", "info");
        paint(container);
      });
    });
  }

  function render(container) {
    container.innerHTML = `
      <div class="page-header">
        <div><h1>My Notes</h1><p class="subtitle">Every note you've written, in one place.</p></div>
      </div>
      <div id="notes-list" style="max-width:720px;"></div>
    `;
    paint(container);

    // Notes are edited from the resource modal, not this page — refresh
    // when the modal saves one so a newly-added note appears without a
    // manual navigation, mirroring queueView.js's app:data-changed pattern.
    document.addEventListener("app:data-changed", function refresh() {
      if (!document.body.contains(container)) {
        document.removeEventListener("app:data-changed", refresh);
        return;
      }
      paint(container);
    });
  }

  App.Views = App.Views || {};
  App.Views.notes = (container) =>
    App.ErrorHandler.guard(container, "My Notes", () => render(container));
})((window.App = window.App || {}));
