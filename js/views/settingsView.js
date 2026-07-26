/* ============================================================
   Settings view. Objective #8 (theme manager UI) + future-proofing
   objective #15 (export/import backups is explicitly called out
   as a thing to design for — storageService.exportAll/importAll
   already exist from V4.1; this view is their first real UI).
   ============================================================ */
(function (App) {
  "use strict";

  function render(container) {
    const theme = App.Storage.getTheme();
    const contrast = App.Storage.getContrast();

    container.innerHTML = `
      <div class="page-header"><div><h1>Settings</h1><p class="subtitle">Appearance, data, and backups. All stored locally in this browser.</p></div></div>

      <div class="section card">
        <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Appearance</strong></div>
        <div class="filter-bar" style="margin-bottom:var(--sp-3);">
          <span style="width:140px;">Theme</span>
          <button class="btn btn-sm ${theme === "light" ? "btn-primary" : ""}" data-theme-choice="light">${App.Icons.get("sun")} Light</button>
          <button class="btn btn-sm ${theme === "dark" ? "btn-primary" : ""}" data-theme-choice="dark">${App.Icons.get("moon")} Dark</button>
        </div>
        <div class="filter-bar">
          <span style="width:140px;">High Contrast</span>
          <button class="btn btn-sm ${contrast === "normal" ? "btn-primary" : ""}" data-contrast-choice="normal">Off</button>
          <button class="btn btn-sm ${contrast === "high" ? "btn-primary" : ""}" data-contrast-choice="high">On</button>
        </div>
      </div>

      <div class="section card">
        <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Backup &amp; Restore</strong></div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--sp-3);">
          Your favorites, bookmarks, progress, and notes live only in this browser's local storage.
          Export a backup before clearing browser data, switching browsers, or moving to a new computer.
        </p>
        <div class="filter-bar">
          <button class="btn" id="export-backup-btn">${App.Icons.get("download")} Export Full Backup</button>
          <button class="btn" id="export-favorites-btn">${App.Icons.get("heart")} Export Favorites</button>
          <button class="btn" id="export-progress-btn">${App.Icons.get("checkCircle")} Export Progress</button>
          <button class="btn" id="export-settings-btn">${App.Icons.get("settings")} Export Settings</button>
        </div>
        <div class="filter-bar" style="margin-top:var(--sp-2);">
          <button class="btn" id="import-backup-btn">${App.Icons.get("upload")} Import Backup</button>
          <input type="file" id="import-backup-input" accept="application/json" style="display:none;" />
        </div>
        <div id="restore-options-panel"></div>
      </div>

      <div class="section card">
        <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Import Updated Vault Data</strong></div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--sp-3);">
          Preview a newly-exported <code>vault-data.json</code> without regenerating the whole dashboard.
          <strong>Session-only:</strong> this does not write to disk — reloading the page reverts to the
          bundled data. To make an update permanent, run <code>build-vault-data.js</code> and replace
          <code>data/vault-data.js</code> per docs/INSTALLATION.md.
        </p>
        <div class="filter-bar">
          <button class="btn" id="import-vault-data-btn">${App.Icons.get("upload")} Import Vault Data (Preview)</button>
          <input type="file" id="import-vault-data-input" accept="application/json" style="display:none;" />
        </div>
      </div>

      <div class="section card">
        <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>Danger Zone</strong></div>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:var(--sp-3);">
          Permanently clears favorites, bookmarks, progress, notes, and preferences from this browser. This cannot be undone — export a backup first.
        </p>
        <button class="btn" id="clear-data-btn" style="border-color:var(--c-red);color:var(--c-red);">${App.Icons.get("trash")} Clear All Local Data</button>
      </div>

      <div class="section card">
        <div class="section-title" style="margin-bottom:var(--sp-3);"><strong>About</strong></div>
        <div class="meta-table">
          <div class="meta-item"><div class="meta-label">Dashboard Version</div><div class="meta-value">${App.Config.APP_VERSION}</div></div>
          <div class="meta-item"><div class="meta-label">Vault Version</div><div class="meta-value">${App.Data.getMeta().sourceVersion}</div></div>
          <div class="meta-item"><div class="meta-label">Data Generated</div><div class="meta-value">${App.Formatters.formatDate(App.Data.getMeta().generatedAt)}</div></div>
          <div class="meta-item"><div class="meta-label">Total Resources</div><div class="meta-value">${App.Data.count()}</div></div>
        </div>
      </div>
    `;

    App.Dom.qsa("[data-theme-choice]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        App.Theme.setTheme(btn.getAttribute("data-theme-choice"));
        App.Components.updateThemeIcon();
        render(container);
      });
    });
    App.Dom.qsa("[data-contrast-choice]", container).forEach((btn) => {
      btn.addEventListener("click", () => {
        App.Theme.setContrast(btn.getAttribute("data-contrast-choice"));
        render(container);
      });
    });

    function downloadJson(filename, data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    const todayStr = new Date().toISOString().slice(0, 10);

    container.querySelector("#export-backup-btn").addEventListener("click", () => {
      downloadJson(`etv-backup-${todayStr}.json`, App.Storage.exportAll());
      App.Toast.show("Full backup exported", "success");
    });
    container.querySelector("#export-favorites-btn").addEventListener("click", () => {
      downloadJson(`etv-favorites-${todayStr}.json`, { favorites: App.Storage.getFavorites() });
      App.Toast.show("Favorites exported", "success");
    });
    container.querySelector("#export-progress-btn").addEventListener("click", () => {
      downloadJson(`etv-progress-${todayStr}.json`, { progress: App.Storage.getProgressMap() });
      App.Toast.show("Progress exported", "success");
    });
    container.querySelector("#export-settings-btn").addEventListener("click", () => {
      downloadJson(`etv-settings-${todayStr}.json`, {
        theme: App.Storage.getTheme(),
        contrast: App.Storage.getContrast(),
        prefs: App.Storage.getPrefs(),
      });
      App.Toast.show("Settings exported", "success");
    });

    const vaultFileInput = container.querySelector("#import-vault-data-input");
    container
      .querySelector("#import-vault-data-btn")
      .addEventListener("click", () => vaultFileInput.click());
    vaultFileInput.addEventListener("change", () => {
      const file = vaultFileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        App.ErrorHandler.safeCall("import vault data", () => {
          const payload = JSON.parse(reader.result);
          App.Data.reload(payload);
          App.Search.build();
          App.Toast.show(
            `Loaded ${App.Data.count()} resources for this session. Refresh reverts to the bundled data.`,
            "success"
          );
          App.Router.navigate("home");
        });
      };
      reader.onerror = () => App.Toast.show("Could not read that file", "error");
      reader.readAsText(file);
    });

    const RESTORE_CATEGORIES = [
      { label: "Study Progress", keys: ["progress", "completionEvents", "goals"] },
      { label: "Favorites, Bookmarks & Queue", keys: ["favorites", "bookmarks", "readingQueue"] },
      { label: "Notes", keys: ["notes"] },
      {
        label: "Search History & Saved Searches",
        keys: ["searchHistory", "savedSearches", "filterPresets"],
      },
      {
        label: "Activity Log & View History",
        keys: ["activityLog", "viewCounts", "recentlyViewed"],
      },
      {
        label: "Preferences (theme, AI settings, etc.)",
        keys: ["theme", "contrast", "prefs", "aiSettings"],
      },
    ];

    const fileInput = container.querySelector("#import-backup-input");
    container
      .querySelector("#import-backup-btn")
      .addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        App.ErrorHandler.safeCall("read backup file", () => {
          const payload = JSON.parse(reader.result);
          const compat = App.Storage.checkBackupCompatibility(payload);
          const presentCategories = RESTORE_CATEGORIES.filter((c) =>
            c.keys.some((k) => payload[k] !== undefined)
          );

          const panel = container.querySelector("#restore-options-panel");
          panel.innerHTML = `
            <div class="card" style="margin-top:var(--sp-3);">
              ${
                compat.warning
                  ? `<p style="font-size:12.5px;color:var(--c-red,#c62828);margin-bottom:var(--sp-3);">⚠ ${App.Utils.escapeHtml(compat.warning)}</p>`
                  : `<p style="font-size:12px;color:var(--text-muted);margin-bottom:var(--sp-3);">Backup version: ${App.Utils.escapeHtml(compat.exportedVersion)} (current: ${App.Utils.escapeHtml(compat.currentVersion)})</p>`
              }
              <div class="section-title" style="margin-bottom:var(--sp-2);font-size:12.5px;">Choose what to restore</div>
              ${presentCategories
                .map(
                  (c, i) => `
                <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;margin-bottom:6px;">
                  <input type="checkbox" checked data-restore-cat="${i}" />
                  ${App.Utils.escapeHtml(c.label)}
                </label>`
                )
                .join("")}
              ${!presentCategories.length ? `<p style="font-size:12px;color:var(--text-muted);">This file doesn't contain any recognized categories.</p>` : ""}
              <div class="filter-bar" style="margin-top:var(--sp-3);">
                <button class="btn btn-primary" id="confirm-restore-btn" ${!presentCategories.length ? "disabled" : ""}>Restore Selected</button>
                <button class="btn btn-secondary" id="cancel-restore-btn">Cancel</button>
              </div>
            </div>
          `;

          panel.querySelector("#confirm-restore-btn")?.addEventListener("click", () => {
            const checked = App.Dom.qsa("[data-restore-cat]:checked", panel);
            const onlyKeys = checked.flatMap(
              (el) => presentCategories[+el.getAttribute("data-restore-cat")].keys
            );
            if (!onlyKeys.length) {
              App.Toast.show("Select at least one category to restore", "error");
              return;
            }
            App.Storage.importAll(payload, { onlyKeys });
            App.Toast.show("Backup restored — reloading…", "success");
            setTimeout(() => window.location.reload(), 900);
          });
          panel.querySelector("#cancel-restore-btn").addEventListener("click", () => {
            panel.innerHTML = "";
            fileInput.value = "";
          });
        });
      };
      reader.onerror = () => App.Toast.show("Could not read that file", "error");
      reader.readAsText(file);
    });

    container.querySelector("#clear-data-btn").addEventListener("click", () => {
      if (
        !window.confirm(
          "This will permanently erase your favorites, bookmarks, progress, and notes on this device. Continue?"
        )
      )
        return;
      App.Storage.clearAll();
      App.Toast.show("Local data cleared", "success");
      setTimeout(() => window.location.reload(), 600);
    });
  }

  App.Views = App.Views || {};
  App.Views.settings = (c) => App.ErrorHandler.guard(c, "Settings", () => render(c));
})((window.App = window.App || {}));
