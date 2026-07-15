/* ============================================================
   Diagnostics view. Objective #11. Two tabs: "Data Integrity"
   (the vault-content checks) and "System Health" (the module
   self-test carried over from the V4.1 architecture check, so
   that diagnostic capability isn't lost now that index.html
   shows the real UI instead of the self-test panel).
   ============================================================ */
(function (App) {
  "use strict";

  function severityBadge(sev) {
    if (sev === "error") return '<span class="badge badge-red">Error</span>';
    if (sev === "warning") return '<span class="badge badge-amber">Warning</span>';
    return '<span class="badge badge-blue">Info</span>';
  }

  function renderDataIntegrity(container, report) {
    container.innerHTML = `
      <div class="stat-grid" style="margin-bottom:var(--sp-5);">
        <div class="stat-card"><div class="stat-value">${report.totalResources}</div><div class="stat-label">Resources Scanned</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--c-red);">${report.bySeverity.error || 0}</div><div class="stat-label">Errors</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--c-amber);">${report.bySeverity.warning || 0}</div><div class="stat-label">Warnings</div></div>
        <div class="stat-card"><div class="stat-value" style="color:var(--c-blue);">${report.bySeverity.info || 0}</div><div class="stat-label">Info</div></div>
      </div>
      ${
        report.totalIssues === 0
          ? `
        <div class="empty-state">${App.Icons.get("checkCircle")}<p><strong>No issues found.</strong> Every resource has complete, valid metadata and no dangling references.</p></div>
      `
          : `
        <div class="card" style="padding:0;overflow:hidden;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead>
              <tr style="background:var(--bg-hover);text-align:left;">
                <th style="padding:var(--sp-3);">Severity</th>
                <th style="padding:var(--sp-3);">Category</th>
                <th style="padding:var(--sp-3);">Resource</th>
                <th style="padding:var(--sp-3);">Message</th>
              </tr>
            </thead>
            <tbody>
              ${report.issues
                .map(
                  (i) => `
                <tr style="border-top:1px solid var(--border);">
                  <td style="padding:var(--sp-3);">${severityBadge(i.severity)}</td>
                  <td style="padding:var(--sp-3);">${App.Utils.escapeHtml(i.category)}</td>
                  <td style="padding:var(--sp-3);font-family:var(--font-mono);font-size:12px;">${App.Utils.escapeHtml(i.resourceId)}</td>
                  <td style="padding:var(--sp-3);">${App.Utils.escapeHtml(i.message)}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `
      }
      <p style="font-size:12px;color:var(--text-muted);margin-top:var(--sp-4);">
        Scope note: these are structural/format checks (duplicate IDs, malformed URLs, invalid enum values,
        dangling related-resource references). This is an offline app, so it cannot verify whether each
        external link is currently reachable — that needs a live network check, a natural future extension.
      </p>
    `;
  }

  function runSystemSelfTest() {
    const results = [];
    const step = (label, fn) => {
      try {
        results.push({ label, ok: true, detail: fn() });
      } catch (err) {
        results.push({ label, ok: false, detail: String((err && err.message) || err) });
      }
    };
    step(
      "Data layer",
      () => `${App.Data.count()} resources, ${App.Data.getUniversities().length} universities`
    );
    step("Search engine", () => `${App.Search.indexedCount} resources indexed`);
    step("Filter engine", () => `${App.Filter.FACETS.length} facets available`);
    step("Storage service", () => `theme="${App.Storage.getTheme()}"`);
    step("Router", () => `current route: ${JSON.stringify(App.Router.current())}`);
    step("Theme manager", () => `contrast="${App.Storage.getContrast()}"`);
    step("Icon library", () => `${App.Icons.names().length} icons`);
    return results;
  }

  function renderSystemHealth(container) {
    const results = runSystemSelfTest();
    const passCount = results.filter((r) => r.ok).length;
    container.innerHTML = `
      <div class="self-test-summary ${passCount === results.length ? "pass" : "fail"}" style="margin-bottom:var(--sp-4);">
        ${App.Icons.get(passCount === results.length ? "checkCircle" : "alertTriangle")}
        <strong>${passCount}/${results.length} modules healthy</strong>
      </div>
      <ul class="self-test-list">
        ${results
          .map(
            (r) => `
          <li class="self-test-row ${r.ok ? "pass" : "fail"}">
            <span class="self-test-icon">${App.Icons.get(r.ok ? "checkCircle" : "close")}</span>
            <span class="self-test-label">${r.label}</span>
            <span class="self-test-detail">${App.Utils.escapeHtml(String(r.detail))}</span>
          </li>`
          )
          .join("")}
      </ul>
      <p style="font-size:12px;color:var(--text-muted);margin-top:var(--sp-4);">
        This is the same architecture check introduced in V4.1 (then shown as the whole landing page);
        it now lives here permanently as the "System Health" tab.
      </p>
    `;
  }

  function renderPerformance(container) {
    const marks = App.Perf.getAll();
    const health = App.Search.getIndexHealth();
    const dataKb = App.Perf.estimateDataSizeKb();
    const storageKb = App.Perf.estimateLocalStorageUsageKb();

    const startupDurationMs =
      marks.length >= 2 ? +(marks[marks.length - 1].t - marks[0].t).toFixed(2) : null;

    container.innerHTML = `
      <div class="stat-grid" style="margin-bottom:var(--sp-5);">
        <div class="stat-card"><div class="stat-value">${startupDurationMs ?? "—"}<span style="font-size:13px;">ms</span></div><div class="stat-label">Total Startup Time</div></div>
        <div class="stat-card"><div class="stat-value">${health.lastBuildDurationMs}<span style="font-size:13px;">ms</span></div><div class="stat-label">Search Index Build Time</div></div>
        <div class="stat-card"><div class="stat-value">${dataKb ?? "—"}<span style="font-size:13px;">KB</span></div><div class="stat-label">Vault Data Size (JSON)</div></div>
        <div class="stat-card"><div class="stat-value">${storageKb ?? "—"}<span style="font-size:13px;">KB</span></div><div class="stat-label">Local Storage Used</div></div>
      </div>

      <div class="card" style="margin-bottom:var(--sp-5);">
        <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Startup Timeline</strong></div>
        ${marks
          .map(
            (m, i) => `
          <div class="filter-bar" style="margin-bottom:var(--sp-2);">
            <span style="width:220px;font-size:12.5px;">${App.Utils.escapeHtml(m.name)}</span>
            <span class="badge badge-outline">${(m.t - marks[0].t).toFixed(2)} ms from boot</span>
          </div>`
          )
          .join("")}
      </div>

      <div class="card">
        <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Search Index Health</strong></div>
        <div class="meta-table">
          <div class="meta-item"><div class="meta-label">Resources Indexed</div><div class="meta-value">${health.resourceCount}</div></div>
          <div class="meta-item"><div class="meta-label">Unique Tokens</div><div class="meta-value">${health.uniqueTokens}</div></div>
          <div class="meta-item"><div class="meta-label">Total Postings</div><div class="meta-value">${health.totalPostings}</div></div>
          <div class="meta-item"><div class="meta-label">Avg Tokens / Resource</div><div class="meta-value">${health.avgTokensPerResource}</div></div>
        </div>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin-top:var(--sp-4);">
        These numbers reflect the current session and this specific device/browser — they're a diagnostic
        signal, not a guaranteed benchmark. At the vault's current size (102 resources) everything here should
        be near-instant; this tab exists mainly so a much larger future import has something to watch.
      </p>
    `;
  }

  function render(container) {
    let activeTab = "integrity";
    const report = App.Diagnostics.run();

    function paint() {
      container.innerHTML = `
        <div class="page-header"><div><h1>Diagnostics</h1><p class="subtitle">Vault data-integrity report, performance, and dashboard system health.</p></div>
          <button class="btn" id="rerun-diagnostics-btn">${App.Icons.get("checkCircle")} Re-run</button>
        </div>
        <div class="tabs">
          <button class="tab-btn ${activeTab === "integrity" ? "active" : ""}" data-tab="integrity">Data Integrity</button>
          <button class="tab-btn ${activeTab === "performance" ? "active" : ""}" data-tab="performance">Performance</button>
          <button class="tab-btn ${activeTab === "system" ? "active" : ""}" data-tab="system">System Health</button>
        </div>
        <div id="diagnostics-body"></div>
      `;
      const body = container.querySelector("#diagnostics-body");
      if (activeTab === "integrity") renderDataIntegrity(body, report);
      else if (activeTab === "performance") renderPerformance(body);
      else renderSystemHealth(body);

      container.querySelector("#rerun-diagnostics-btn").addEventListener("click", () => {
        App.Toast.show("Diagnostics re-run", "success");
        render(container);
      });
      App.Dom.qsa("[data-tab]", container).forEach((btn) => {
        btn.addEventListener("click", () => {
          activeTab = btn.getAttribute("data-tab");
          paint();
        });
      });
    }
    paint();
  }

  App.Views = App.Views || {};
  App.Views.diagnostics = (c) => App.ErrorHandler.guard(c, "Diagnostics", () => render(c));
})((window.App = window.App || {}));
