/* ============================================================
   Home Dashboard view. Objective #1. Pure read of App.Data +
   App.Storage; renders once per navigation to #/home.
   ============================================================ */
(function (App) {
  "use strict";

  function statCard(icon, value, label) {
    return `
      <div class="stat-card">
        <div class="stat-icon">${App.Icons.get(icon)}</div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>`;
  }

  function quickAction(icon, label, route) {
    return `<button class="btn" data-goto="${route}">${App.Icons.get(icon)} ${label}</button>`;
  }

  function recentlyAdded() {
    return App.Data.getAll()
      .slice()
      .sort((a, b) => (b.dateAdded || "").localeCompare(a.dateAdded || ""))
      .slice(0, 6);
  }

  function recentlyViewed() {
    return App.Data.getByIds(App.Storage.getRecentlyViewed()).slice(0, 6);
  }

  function progressSummary() {
    const map = App.Storage.getProgressMap();
    const counts = { "Not Started": 0, "In Progress": 0, Completed: 0, "Revision Needed": 0 };
    const total = App.Data.count();
    let tracked = 0;
    Object.values(map).forEach((status) => {
      if (counts[status] !== undefined) {
        counts[status]++;
        tracked++;
      }
    });
    counts["Not Started"] = total - tracked;
    const pct = total ? Math.round((counts.Completed / total) * 100) : 0;
    return { counts, pct, total };
  }

  function continueStudying() {
    const progressMap = App.Storage.getProgressMap();
    const recentIds = App.Storage.getRecentlyViewed();
    const inProgressId = recentIds.find((id) => progressMap[id] === "In Progress");
    return inProgressId ? App.Data.getById(inProgressId) : null;
  }

  function cardStrip(resources, emptyMsg) {
    if (!resources.length)
      return `<div class="empty-state">${App.Icons.get("inbox")}<p>${emptyMsg}</p></div>`;
    const wrap = App.Dom.el("div", { class: "resource-grid" });
    resources.forEach((r) => wrap.appendChild(App.Components.renderResourceCard(r)));
    return wrap;
  }

  function render(container) {
    const meta = App.Data.getMeta();
    const subjects = App.Data.getSubjects();
    const universities = App.Data.getUniversities();
    const progress = progressSummary();
    const continuing = continueStudying();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Welcome back</h1>
          <p class="subtitle">Vault v${meta.sourceVersion} · Data generated ${App.Formatters.formatDate(meta.generatedAt)} · ${App.Data.count()} resources across ${universities.length} universities</p>
        </div>
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;">
          ${quickAction("search", "Browse All", "browse")}
          ${quickAction("heart", "Favorites", "favorites")}
          ${quickAction("barChart", "Statistics", "stats")}
        </div>
      </div>

      <div class="section">
        <div class="stat-grid">
          ${statCard("layers", App.Data.count(), "Total Resources")}
          ${statCard("university", universities.length, "Universities")}
          ${statCard("subject", subjects.length, "Subjects")}
          ${statCard("heart", App.Storage.getFavorites().length, "Favorites")}
          ${statCard("bookmark", App.Storage.getBookmarks().length, "Bookmarks")}
          ${statCard("checkCircle", `${progress.pct}%`, "Completed")}
        </div>
      </div>

      <div class="section">
        <div class="card">
          <div class="section-title" style="margin-bottom:var(--sp-3);">
            <strong>Progress Overview</strong>
            <span style="font-size:12.5px;color:var(--text-muted);">${progress.counts.Completed} of ${progress.total} completed</span>
          </div>
          <div class="progress-bar" style="margin-bottom:var(--sp-4);">
            <div class="progress-bar-fill" style="width:${progress.pct}%"></div>
          </div>
          <div class="rc-meta" style="margin-bottom:0;">
            <span class="badge badge-grey">${progress.counts["Not Started"]} Not Started</span>
            <span class="badge badge-amber">${progress.counts["In Progress"]} In Progress</span>
            <span class="badge badge-green">${progress.counts.Completed} Completed</span>
            <span class="badge badge-red">${progress.counts["Revision Needed"]} Revision Needed</span>
          </div>
        </div>
      </div>

      ${
        continuing
          ? `
      <div class="section">
        <div class="card" style="display:flex;align-items:center;justify-content:space-between;gap:var(--sp-4);flex-wrap:wrap;">
          <div>
            <div class="section-title" style="margin-bottom:4px;"><strong>Continue Studying</strong></div>
            <div style="font-size:14px;font-weight:600;">${App.Utils.escapeHtml(continuing.title)}</div>
            <div style="font-size:12px;color:var(--text-muted);">${continuing.id} · ${App.Utils.escapeHtml(continuing.university)} · marked In Progress</div>
          </div>
          <button class="btn btn-primary" id="continue-studying-btn">${App.Icons.get("external")} Resume</button>
        </div>
      </div>`
          : ""
      }

      <div class="section">
        <div class="section-title"><strong>Recently Added to the Vault</strong></div>
        <div id="home-recent-added"></div>
      </div>

      <div class="section">
        <div class="section-title"><strong>Recently Viewed by You</strong></div>
        <div id="home-recent-viewed"></div>
      </div>
    `;

    const addedNode = cardStrip(recentlyAdded(), "No resources yet.");
    const addedHost = document.getElementById("home-recent-added");
    if (typeof addedNode === "string") addedHost.innerHTML = addedNode;
    else addedHost.appendChild(addedNode);

    const viewedNode = cardStrip(
      recentlyViewed(),
      "You haven't viewed any resources yet — open one from Browse to see it here."
    );
    const viewedHost = document.getElementById("home-recent-viewed");
    if (typeof viewedNode === "string") viewedHost.innerHTML = viewedNode;
    else viewedHost.appendChild(viewedNode);

    [addedHost, viewedHost].forEach((host) => {
      App.Components.bindResourceCardEvents(host, {
        onOpen: (id) => App.Components.openResourceModal(id),
      });
      App.ContextMenu.attachToResourceCards(host);
    });

    App.Dom.qsa("[data-goto]", container).forEach((btn) => {
      btn.addEventListener("click", () => App.Router.navigate(btn.getAttribute("data-goto")));
    });
    const resumeBtn = container.querySelector("#continue-studying-btn");
    if (resumeBtn)
      resumeBtn.addEventListener("click", () => App.Components.openResourceModal(continuing.id));
  }

  App.Views = App.Views || {};
  App.Views.home = (container) =>
    App.ErrorHandler.guard(container, "Dashboard", () => render(container));
})((window.App = window.App || {}));
