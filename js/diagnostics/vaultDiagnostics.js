/* ============================================================
   Vault Diagnostics. Objective #11. Important scope note, stated
   honestly in the UI too: this is an OFFLINE app, so "broken
   link" detection here means structural/format validation (malformed
   URL, duplicate ID, dangling relatedResources reference, invalid
   enum value) — NOT a live network check of whether each of
   hundreds/thousands of external links currently resolves. A true
   link-liveness sweep needs network access and is a natural
   future extension (see docs/ARCHITECTURE.md future-compat notes),
   not something this offline dashboard can honestly claim to do.
   ============================================================ */
(function (App) {
  "use strict";

  function run() {
    const all = App.Data.getAll();
    const issues = [];
    const idSeen = new Map(); // id -> count
    const linkSeen = new Map(); // link -> [ids]
    const validIds = new Set(all.map((r) => r.id));
    const enums = {
      difficulty: App.Constants.DIFFICULTY_LEVELS,
      quality: App.Constants.QUALITY_LEVELS,
      status: App.Constants.PROGRESS_STATUSES,
      verificationStatus: App.Constants.VERIFICATION_STATUSES,
    };

    all.forEach((r) => {
      idSeen.set(r.id, (idSeen.get(r.id) || 0) + 1);

      if (!r.isCrossRef) {
        if (!linkSeen.has(r.link)) linkSeen.set(r.link, []);
        linkSeen.get(r.link).push(r.id);
      }

      App.Validators.validateResource(r, enums).forEach((issue) => {
        issues.push({
          severity: "error",
          category: "Invalid Metadata",
          resourceId: r.id,
          message: issue.message,
        });
      });

      (r.relatedResources || []).forEach((relId) => {
        if (!validIds.has(relId)) {
          issues.push({
            severity: "warning",
            category: "Schema Inconsistency",
            resourceId: r.id,
            message: `Related resource "${relId}" does not exist in the vault`,
          });
        }
      });

      if (r.isCrossRef && !r.crossRefTarget) {
        issues.push({
          severity: "warning",
          category: "Schema Inconsistency",
          resourceId: r.id,
          message: `Marked as a cross-reference but has no crossRefTarget`,
        });
      }
      if (!r.isCrossRef && r.crossRefTarget) {
        issues.push({
          severity: "info",
          category: "Schema Inconsistency",
          resourceId: r.id,
          message: `Has a crossRefTarget but isCrossRef is false`,
        });
      }
    });

    idSeen.forEach((count, id) => {
      if (count > 1)
        issues.push({
          severity: "error",
          category: "Duplicate ID",
          resourceId: id,
          message: `ID "${id}" appears ${count} times`,
        });
    });
    linkSeen.forEach((ids, link) => {
      if (ids.length > 1) {
        issues.push({
          severity: "warning",
          category: "Duplicate Link",
          resourceId: ids.join(", "),
          message: `${ids.length} non-cross-ref resources share the same link — consider a cross-reference`,
        });
      }
    });

    const bySeverity = { error: 0, warning: 0, info: 0 };
    issues.forEach((i) => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    });

    return {
      generatedAt: new Date().toISOString(),
      totalResources: all.length,
      totalIssues: issues.length,
      bySeverity,
      issues: issues.sort(
        (a, b) => (a.severity === "error" ? -1 : 1) - (b.severity === "error" ? -1 : 1)
      ),
    };
  }

  App.Diagnostics = { run };
})((window.App = window.App || {}));
