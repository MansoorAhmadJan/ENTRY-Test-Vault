/* ============================================================
   Study Goals view (V5.0, Objective #1: Personal Learning
   Workspace). Pure read/write of App.Storage's goals + completion
   event log — no new data layer, no new dependency.
   ============================================================ */
(function (App) {
  "use strict";

  function progressCard(title, progress, editKey) {
    const remaining = Math.max(0, progress.target - progress.completed);
    return `
      <div class="card" data-goal-card="${editKey}">
        <div class="section-title" style="margin-bottom:var(--sp-3);">
          <strong>${App.Utils.escapeHtml(title)}</strong>
          <span style="font-size:12.5px;color:var(--text-muted);">${progress.completed} of ${progress.target} resources</span>
        </div>
        <div class="progress-bar" style="margin-bottom:var(--sp-3);">
          <div class="progress-bar-fill" style="width:${progress.pct}%"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:var(--sp-3);flex-wrap:wrap;">
          <span style="font-size:12.5px;color:var(--text-muted);">
            ${
              remaining === 0
                ? "Goal reached — nice work."
                : `${remaining} more to hit today's goal.`
            }
          </span>
          <label style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;gap:6px;">
            Target:
            <input type="number" min="1" max="500" step="1" value="${progress.target}" data-goal-target="${editKey}" style="width:64px;padding:4px 6px;border:1px solid var(--border);border-radius:6px;background:var(--bg-elevated);color:var(--text-primary);" />
          </label>
        </div>
      </div>`;
  }

  function render(container) {
    const daily = App.Storage.getDailyGoalProgress();
    const weekly = App.Storage.getWeeklyGoalProgress();
    const streak = App.Storage.getStudyStreak();

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h1>Study Goals</h1>
          <p class="subtitle">Set a daily and weekly target and track it against resources you've marked Completed.</p>
        </div>
      </div>

      <div class="section">
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-icon">${App.Icons.get("sparkle")}</div>
            <div class="stat-value">${streak}</div>
            <div class="stat-label">Day Streak</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">${App.Icons.get("checkCircle")}</div>
            <div class="stat-value">${daily.completed}</div>
            <div class="stat-label">Completed Today</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">${App.Icons.get("barChart")}</div>
            <div class="stat-value">${weekly.completed}</div>
            <div class="stat-label">Completed This Week</div>
          </div>
        </div>
      </div>

      <div class="section" style="display:grid;gap:var(--sp-4);max-width:640px;">
        ${progressCard("Today's Goal", daily, "dailyTarget")}
        ${progressCard("This Week's Goal (rolling 7 days)", weekly, "weeklyTarget")}
      </div>

      <div class="section" style="max-width:640px;">
        <p style="font-size:12px;color:var(--text-muted);">
          Streak counts consecutive days with at least one resource marked Completed.
          Progress is based on resource count, not estimated study time — the vault's
          time estimates (e.g. "2–3 hrs per paper") aren't precise enough to sum reliably.
        </p>
      </div>
    `;

    App.Dom.qsa("[data-goal-target]", container).forEach((input) => {
      const commit = () => {
        const key = input.getAttribute("data-goal-target");
        const value = parseInt(input.value, 10);
        if (!Number.isFinite(value) || value < 1) {
          input.value = App.Storage.getGoals()[key];
          return;
        }
        App.Storage.setGoals({ [key]: value });
        App.Toast.show("Goal updated", "success");
        render(container); // re-render so the bar/remaining-count reflect the new target immediately
      };
      input.addEventListener("blur", commit);
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          input.blur();
        }
      });
    });
  }

  App.Views = App.Views || {};
  App.Views.goals = (container) =>
    App.ErrorHandler.guard(container, "Study Goals", () => render(container));
})((window.App = window.App || {}));
