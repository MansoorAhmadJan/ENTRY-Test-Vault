/* ============================================================
   Validators — pure predicate/report functions over plain data.
   Used by js/diagnostics/vaultDiagnostics.js and available for
   any future import-wizard validation (V4.x future-compat item).
   ============================================================ */
(function (App) {
  "use strict";

  function isValidUrl(str) {
    if (typeof str !== "string") return false;
    try {
      const u = new URL(str);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch (e) {
      return false;
    }
  }

  const REQUIRED_FIELDS = [
    "id",
    "title",
    "university",
    "subject",
    "link",
    "difficulty",
    "priority",
    "quality",
  ];
  const ID_PATTERN = /^ETV-\d{4,}$/;

  function validateResource(r, enums) {
    const issues = [];
    REQUIRED_FIELDS.forEach((f) => {
      if (App.Utils.isEmpty(r[f]))
        issues.push({ field: f, message: `Missing required field "${f}"` });
    });
    if (r.id && !ID_PATTERN.test(r.id)) {
      issues.push({ field: "id", message: `ID "${r.id}" does not match the ETV-#### convention` });
    }
    if (r.priority !== undefined && (r.priority < 1 || r.priority > 5)) {
      issues.push({ field: "priority", message: `Priority ${r.priority} out of range 1–5` });
    }
    if (r.link && !isValidUrl(r.link)) {
      issues.push({ field: "link", message: `Link is not a well-formed http(s) URL` });
    }
    if (enums) {
      ["difficulty", "quality", "status", "verificationStatus"].forEach((f) => {
        if (enums[f] && r[f] && !enums[f].includes(r[f])) {
          issues.push({
            field: f,
            message: `Value "${r[f]}" is not one of: ${enums[f].join(", ")}`,
          });
        }
      });
    }
    return issues;
  }

  App.Validators = { isValidUrl, validateResource, REQUIRED_FIELDS, ID_PATTERN };
})((window.App = window.App || {}));
