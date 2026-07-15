/* ============================================================
   Statistics view. Objective #7. Charts are plain CSS bars
   (.bar-chart-*, already defined in components.css) — no
   charting library, consistent with the "no framework unless
   necessary" rule at this data scale.
   ============================================================ */
(function (App) {
  "use strict";

  function barChart(rows, maxOverride) {
    const max = maxOverride || Math.max(1, ...rows.map((r) => r.value));
    return rows
      .map(
        (r) => `
      <div class="bar-chart-row">
        <div class="bar-chart-label" title="${App.Utils.escapeHtml(r.label)}">${App.Utils.escapeHtml(r.label)}</div>
        <div class="bar-chart-track"><div class="bar-chart-fill" style="width:${Math.round((r.value / max) * 100)}%"></div></div>
        <div class="bar-chart-value">${r.value}</div>
      </div>`
      )
      .join("");
  }

  function render(container) {
    const all = App.Data.getAll();
    const bySubject = App.Utils.countBy(all, (r) => r.subject);
    const byUniversity = App.Utils.countBy(all, (r) => r.university);
    const progress = App.Storage.getProgressMap();
    const completed = Object.values(progress).filter((s) => s === "Completed").length;
    const completionPct = Math.round((completed / all.length) * 100);

    const viewCounts = App.Storage.getViewCounts();
    const mostUsed = Object.entries(viewCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ resource: App.Data.getById(id), count }))
      .filter((x) => x.resource);

    const favoriteResources = App.Data.getByIds(App.Storage.getFavorites()).slice(0, 5);

    container.innerHTML = `
      <div class="page-header"><div><h1>Statistics</h1><p class="subtitle">How the vault breaks down, and how your own progress through it looks.</p></div></div>

      <div class="section">
        <div class="stat-grid">
          <div class="stat-card"><div class="stat-value">${all.length}</div><div class="stat-label">Total Resources</div></div>
          <div class="stat-card"><div class="stat-value">${completionPct}%</div><div class="stat-label">Completion Rate</div></div>
          <div class="stat-card"><div class="stat-value">${Object.keys(viewCounts).length}</div><div class="stat-label">Resources You've Opened</div></div>
          <div class="stat-card"><div class="stat-value">${App.Storage.getFavorites().length}</div><div class="stat-label">Favorites</div></div>
        </div>
      </div>

      <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
        <div class="card">
          <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Resources by Subject</strong></div>
          ${barChart(Array.from(bySubject, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value))}
        </div>
        <div class="card">
          <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Resources by University</strong></div>
          ${barChart(Array.from(byUniversity, ([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value))}
        </div>
      </div>

      <div class="section" style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);">
        <div class="card">
          <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Most Used Resources</strong></div>
          <div id="stats-most-used"></div>
        </div>
        <div class="card">
          <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Your Favorites</strong></div>
          <div id="stats-favorites"></div>
        </div>
      </div>
    `;

    const mostUsedHost = container.querySelector("#stats-most-used");
    if (!mostUsed.length) {
      mostUsedHost.innerHTML = `<p style="font-size:13px;color:var(--text-muted);">Open a few resources to see your most-used list build up here.</p>`;
    } else {
      mostUsedHost.innerHTML = mostUsed
        .map(
          (x) => `
        <div class="filter-bar" style="margin-bottom:var(--sp-2);">
          <span style="flex:1;font-size:13px;font-weight:600;cursor:pointer;" data-open="${x.resource.id}">${App.Utils.escapeHtml(x.resource.title)}</span>
          <span class="badge badge-outline">${x.count}× opened</span>
        </div>`
        )
        .join("");
    }

    const favHost = container.querySelector("#stats-favorites");
    if (!favoriteResources.length) {
      favHost.innerHTML = `<p style="font-size:13px;color:var(--text-muted);">No favorites yet.</p>`;
    } else {
      favHost.innerHTML = favoriteResources
        .map(
          (r) => `
        <div class="filter-bar" style="margin-bottom:var(--sp-2);">
          <span style="flex:1;font-size:13px;font-weight:600;cursor:pointer;" data-open="${r.id}">${App.Utils.escapeHtml(r.title)}</span>
          <span class="badge ${App.Formatters.badgeClass(r.difficulty)}">${r.difficulty}</span>
        </div>`
        )
        .join("");
    }

    App.Dom.qsa("[data-open]", container).forEach((el) => {
      el.addEventListener("click", () =>
        App.Components.openResourceModal(el.getAttribute("data-open"))
      );
    });
  }

  App.Views = App.Views || {};
  App.Views.stats = (c) => App.ErrorHandler.guard(c, "Statistics", () => render(c));
})((window.App = window.App || {}));
