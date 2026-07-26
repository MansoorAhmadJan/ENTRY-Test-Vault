/* ============================================================
   Build Info (V5.4, Objective #8: Diagnostics). This file's
   CONTENT is rewritten by scripts/build.mjs during a production
   build (real version from package.json, real build timestamp,
   real git commit hash if available) — what you see here is only
   the development-mode fallback, shown honestly as such rather
   than presenting a placeholder as if it were real build metadata.
   ============================================================ */
(function (App) {
  "use strict";

  App.BuildInfo = {
    version: "dev",
    builtAt: null,
    commit: null,
    mode: "development (unbuilt — running raw source files)",
  };
})((window.App = window.App || {}));
