/* ============================================================
   DOM helper. Deliberately not a virtual-DOM system — at this
   app's scale (thousands, not millions, of nodes; document
   browsing, not a real-time app) direct innerHTML/DOM writes are
   simpler and fast enough. See docs/ARCHITECTURE.md "Why no
   framework" for the threshold at which this decision should be
   revisited.
   ============================================================ */
(function (App) {
  "use strict";

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function")
        node.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v !== false && v !== null && v !== undefined) node.setAttribute(k, v);
    });
    (children || []).forEach((c) => {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  // Event delegation: attach one listener on `root`, fire `handler(target, event)`
  // whenever an element matching `selector` is the click target (or a descendant of one).
  function delegate(root, eventName, selector, handler) {
    root.addEventListener(eventName, (e) => {
      const target = e.target.closest(selector);
      if (target && root.contains(target)) handler(target, e);
    });
  }

  // Paints width onto every [data-fill] element under `root` from its
  // data-fill value (a 0-100 number). Used for progress-bar-fill /
  // bar-chart-fill widths, which must be set via the CSSOM (.style.width)
  // rather than a style attribute written in markup — CSP's style-src blocks
  // the latter (see SECURITY.md), but direct property assignment is exempt.
  function paintFills(root) {
    qsa("[data-fill]", root).forEach((elm) => {
      elm.style.width = elm.dataset.fill + "%";
    });
  }

  App.Dom = { qs, qsa, el, delegate, paintFills };
})((window.App = window.App || {}));
