/* ============================================================
   Icon Library
   Small inline SVGs (24x24 viewBox, stroke-based, currentColor)
   so icons inherit text color and theme automatically. Kept as
   plain strings — no external icon font or image files, which
   matters for "fully offline" and for the /icons folder staying
   simple (just a favicon lives there; icons here are inline).
   ============================================================ */
(function (App) {
  "use strict";

  const stroke =
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

  const ICONS = {
    home: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
    search: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`,
    filter: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 5h16M7 12h10M10 19h4"/></svg>`,
    grid: `<svg viewBox="0 0 24 24" ${stroke}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    list: `<svg viewBox="0 0 24 24" ${stroke}><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>`,
    star: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`,
    starFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg>`,
    bookmark: `<svg viewBox="0 0 24 24" ${stroke}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    bookmarkFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`,
    university: `<svg viewBox="0 0 24 24" ${stroke}><path d="M2 9l10-6 10 6-10 6-10-6z"/><path d="M6 11v6c0 1 3 3 6 3s6-2 6-3v-6"/></svg>`,
    subject: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    chart: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>`,
    clock: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
    check: `<svg viewBox="0 0 24 24" ${stroke}><path d="M20 6L9 17l-5-5"/></svg>`,
    checkCircle: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>`,
    circle: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="9"/></svg>`,
    progress: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/></svg>`,
    revision: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 12a9 9 0 1 1 3 6.7"/><path d="M3 21v-6h6"/></svg>`,
    external: `<svg viewBox="0 0 24 24" ${stroke}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/></svg>`,
    close: `<svg viewBox="0 0 24 24" ${stroke}><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    sun: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
    moon: `<svg viewBox="0 0 24 24" ${stroke}><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>`,
    menu: `<svg viewBox="0 0 24 24" ${stroke}><path d="M4 7h16M4 12h16M4 17h16"/></svg>`,
    chevronRight: `<svg viewBox="0 0 24 24" ${stroke}><path d="M9 18l6-6-6-6"/></svg>`,
    chevronDown: `<svg viewBox="0 0 24 24" ${stroke}><path d="M6 9l6 6 6-6"/></svg>`,
    link: `<svg viewBox="0 0 24 24" ${stroke}><path d="M10 13a5 5 0 0 0 7.5.4l2-2a5 5 0 0 0-7-7l-1.2 1.1"/><path d="M14 11a5 5 0 0 0-7.5-.4l-2 2a5 5 0 0 0 7 7l1.1-1.2"/></svg>`,
    inbox: `<svg viewBox="0 0 24 24" ${stroke}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" ${stroke}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    keyboard: `<svg viewBox="0 0 24 24" ${stroke}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6"/></svg>`,
    trash: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0l-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>`,
    download: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 3v12m0 0l4-4m-4 4l-4-4"/><path d="M4 19h16"/></svg>`,
    sparkle: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 3l1.8 4.6L18 9l-4.2 1.9L12 15l-1.8-4.1L6 9l4.2-1.4z"/></svg>`,
    layers: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 2l9 5-9 5-9-5z"/><path d="M3 12l9 5 9-5M3 17l9 5 9-5"/></svg>`,
    x: `<svg viewBox="0 0 24 24" ${stroke}><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    heart: `<svg viewBox="0 0 24 24" ${stroke}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
    heartFilled: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>`,
    alertTriangle: `<svg viewBox="0 0 24 24" ${stroke}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z"/><path d="M9 12l2 2 4-4"/></svg>`,
    upload: `<svg viewBox="0 0 24 24" ${stroke}><path d="M12 21V9m0 0l4 4m-4-4l-4 4"/><path d="M4 5h16"/></svg>`,
    barChart: `<svg viewBox="0 0 24 24" ${stroke}><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>`,
    command: `<svg viewBox="0 0 24 24" ${stroke}><path d="M6 9a3 3 0 1 1 3 3H6a3 3 0 1 1 3-3zm9 0a3 3 0 1 0-3 3h3a3 3 0 1 0-3-3zM6 15a3 3 0 1 0 3 3v-3H6zm9 0a3 3 0 1 1 3 3v-3h-3z"/></svg>`,
    note: `<svg viewBox="0 0 24 24" ${stroke}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>`,
  };

  App.Icons = {
    get: (name) => ICONS[name] || "",
    names: () => Object.keys(ICONS),
  };
})((window.App = window.App || {}));
