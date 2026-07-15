/* ============================================================
   Filter Panel. Renders one <select> per facet (values computed
   live from App.Data.getDistinctValues, so new data —e.g. after
   a future import— shows up with zero code changes) plus chips
   for active filters. Talks to App.Filter for all state logic;
   this module is presentation only.
   ============================================================ */
(function (App) {
  "use strict";

  const FACET_LABELS = {
    university: "University",
    subject: "Subject",
    chapter: "Chapter",
    difficulty: "Difficulty",
    priority: "Priority",
    quality: "Quality",
    resourceType: "Type",
    platform: "Platform",
    language: "Language",
    status: "Status",
    tags: "Tag",
  };
  // Facets shown as dropdowns in the compact bar; "chapter"/"tags" have too
  // many distinct values to be a useful single dropdown at this data size,
  // so they're filterable via search/URL but not cluttering the visible bar.
  const VISIBLE_FACETS = [
    "university",
    "subject",
    "difficulty",
    "priority",
    "quality",
    "resourceType",
    "platform",
    "language",
    "status",
  ];

  function optionsFor(facet) {
    if (facet === "priority") return App.Constants.PRIORITY_LEVELS.map(String);
    if (facet === "difficulty") return App.Constants.DIFFICULTY_LEVELS;
    if (facet === "quality") return App.Constants.QUALITY_LEVELS;
    if (facet === "status") return App.Constants.PROGRESS_STATUSES;
    if (facet === "university") return App.Config.UNIVERSITY_NAV.map((u) => u.key);
    return App.Data.getDistinctValues(facet);
  }
  function labelFor(facet, value) {
    if (facet === "university") {
      const u = App.Config.UNIVERSITY_NAV.find((x) => x.key === value);
      return u ? u.label : value;
    }
    return value;
  }

  function presetsBarHtml() {
    const presets = App.Storage.getFilterPresets();
    if (!presets.length) return "";
    return `<div class="filter-bar" style="margin-top:var(--sp-2);">
      <span style="font-size:12px;color:var(--text-muted);">Presets:</span>
      ${presets
        .map(
          (p) => `
        <span class="preset-pill" data-apply-preset="${p.id}">
          ${App.Utils.escapeHtml(p.name)}
          <button data-delete-preset="${p.id}" aria-label="Delete preset ${App.Utils.escapeHtml(p.name)}">${App.Icons.get("x")}</button>
        </span>`
        )
        .join("")}
    </div>`;
  }

  function render(container, filterState) {
    const chips = [];
    App.Filter.FACETS.forEach((facet) => {
      (filterState[facet] || new Set()).forEach((value) => {
        chips.push({ facet, value });
      });
    });

    container.innerHTML = `
      <div class="filter-bar" role="group" aria-label="Filters">
        ${VISIBLE_FACETS.map(
          (facet) => `
          <select class="filter-select" data-facet="${facet}" aria-label="Filter by ${FACET_LABELS[facet]}">
            <option value="">${FACET_LABELS[facet]}</option>
            ${optionsFor(facet)
              .map(
                (v) =>
                  `<option value="${App.Utils.escapeHtml(String(v))}">${App.Utils.escapeHtml(String(labelFor(facet, v)))}</option>`
              )
              .join("")}
          </select>
        `
        ).join("")}
        ${chips.length ? `<button class="btn btn-ghost btn-sm" id="clear-all-filters">${App.Icons.get("x")} Clear all</button>` : ""}
        ${chips.length ? `<button class="btn btn-ghost btn-sm" id="save-preset-btn">${App.Icons.get("download")} Save as preset</button>` : ""}
        <span class="filter-summary" id="filter-summary"></span>
      </div>
      ${
        chips.length
          ? `<div class="filter-bar" style="margin-top:-8px;">
        ${chips
          .map(
            (c) => `
          <span class="filter-chip" data-facet="${c.facet}" data-value="${App.Utils.escapeHtml(String(c.value))}">
            ${FACET_LABELS[c.facet]}: ${App.Utils.escapeHtml(String(labelFor(c.facet, c.value)))}
            <button aria-label="Remove filter">${App.Icons.get("x")}</button>
          </span>`
          )
          .join("")}
      </div>`
          : ""
      }
      ${presetsBarHtml()}
    `;
  }

  function serializeFilterState(filterState) {
    const out = {};
    App.Filter.FACETS.forEach((facet) => {
      out[facet] = Array.from(filterState[facet] || []);
    });
    return out;
  }
  function applyPresetToState(filterState, preset) {
    App.Filter.clear(filterState);
    Object.entries(preset.filters || {}).forEach(([facet, values]) => {
      (values || []).forEach((v) => App.Filter.toggle(filterState, facet, v));
    });
  }

  function bind(container, filterState, onChange) {
    App.Dom.delegate(container, "change", ".filter-select", (select) => {
      const facet = select.getAttribute("data-facet");
      const value = facet === "priority" ? Number(select.value) : select.value;
      if (select.value === "") return;
      App.Filter.toggle(filterState, facet, value);
      select.value = "";
      onChange();
    });
    App.Dom.delegate(container, "click", ".filter-chip button", (btn) => {
      const chip = btn.closest(".filter-chip");
      const facet = chip.getAttribute("data-facet");
      let value = chip.getAttribute("data-value");
      if (facet === "priority") value = Number(value);
      App.Filter.toggle(filterState, facet, value);
      onChange();
    });
    App.Dom.delegate(container, "click", "[data-apply-preset]", (el) => {
      const preset = App.Storage.getFilterPresets().find(
        (p) => p.id === el.getAttribute("data-apply-preset")
      );
      if (preset) {
        applyPresetToState(filterState, preset);
        onChange();
      }
    });
    App.Dom.delegate(container, "click", "[data-delete-preset]", (btn, e) => {
      e.stopPropagation();
      App.Storage.deleteFilterPreset(btn.getAttribute("data-delete-preset"));
      render(container, filterState);
      bind(container, filterState, onChange);
    });
    container.addEventListener("click", (e) => {
      if (e.target.closest("#clear-all-filters")) {
        App.Filter.clear(filterState);
        onChange();
      }
      if (e.target.closest("#save-preset-btn")) {
        const name = window.prompt("Name this filter preset:", "My filter preset");
        if (name && name.trim()) {
          App.Storage.saveFilterPreset(name.trim(), serializeFilterState(filterState));
          App.Toast.show("Filter preset saved", "success");
          render(container, filterState);
          bind(container, filterState, onChange);
        }
      }
    });
  }

  App.Components = App.Components || {};
  App.Components.renderFilterPanel = render;
  App.Components.bindFilterPanel = bind;
})((window.App = window.App || {}));
