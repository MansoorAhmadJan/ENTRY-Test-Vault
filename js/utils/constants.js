/* ============================================================
   Constants — enumerated value lists. If a field's valid values
   ever change, this is the one file to edit; everything else
   (filter panel options, badge colors, validators, diagnostics)
   reads from here rather than repeating the list.
   ============================================================ */
(function (App) {
  "use strict";

  const DIFFICULTY_LEVELS = ["Beginner", "Intermediate", "Advanced"];
  const QUALITY_LEVELS = ["Excellent", "Good", "Average"];
  const VERIFICATION_STATUSES = ["Verified", "Needs Review", "Outdated", "Broken"];
  const PROGRESS_STATUSES = ["Not Started", "In Progress", "Completed", "Revision Needed"];
  const PRIORITY_LEVELS = [5, 4, 3, 2, 1];
  const RESOURCE_TYPES = [
    "Video",
    "Video Playlist",
    "Past Paper Archive",
    "Mock Test",
    "MCQ Bank",
    "Book / PDF",
    "File Collection",
    "Reference Page",
    "Social Post",
    "Other",
  ];
  const LANGUAGES = ["English", "Urdu"];

  App.Constants = {
    DIFFICULTY_LEVELS,
    QUALITY_LEVELS,
    VERIFICATION_STATUSES,
    PROGRESS_STATUSES,
    PRIORITY_LEVELS,
    RESOURCE_TYPES,
    LANGUAGES,
  };
})((window.App = window.App || {}));
