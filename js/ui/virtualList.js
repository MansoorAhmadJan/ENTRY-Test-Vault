/* ============================================================
   Virtual List. Genuine windowed rendering — only creates DOM
   nodes for rows currently in (or near) the viewport, regardless
   of how many total items there are. This is what actually makes
   "50,000+ resources" viable in List view: a 60-item "Load more"
   page is fine at 102 resources but doesn't scale to 50,000.

   Scope note (stated honestly, not just in docs): this virtualizes
   the LIST view (uniform row height, single column) because that's
   a tractable, correct implementation. The Grid view keeps paginated
   "Load more" loading — virtualizing a responsive multi-column CSS
   grid (rows of varying column count per breakpoint) is a materially
   harder problem and wasn't worth the complexity at this vault's
   actual size. If Grid needs the same treatment later, this module's
   scroll/window-math is directly reusable; only the row-rendering
   function changes.
   ============================================================ */
(function (App) {
  "use strict";

  /**
   * @param {HTMLElement} viewport - scrollable container (fixed height, overflow-y:auto)
   * @param {Array} items
   * @param {number} rowHeight - px, must be uniform
   * @param {(item:any, index:number) => HTMLElement} renderRow
   * @param {number} buffer - extra rows rendered above/below the visible window
   */
  function mount(viewport, items, rowHeight, renderRow, buffer) {
    buffer = buffer || 6;
    viewport.classList.add("virtual-scroll-viewport");
    viewport.innerHTML = "";

    const spacer = App.Dom.el("div", { class: "virtual-scroll-spacer" });
    spacer.style.height = items.length * rowHeight + "px";
    const windowEl = App.Dom.el("div", { class: "virtual-scroll-window" });
    spacer.appendChild(windowEl);
    viewport.appendChild(spacer);

    let lastStart = -1;
    let lastEnd = -1;

    function renderWindow() {
      const scrollTop = viewport.scrollTop;
      const viewportHeight = viewport.clientHeight;
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
      const end = Math.min(
        items.length,
        Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer
      );
      if (start === lastStart && end === lastEnd) return;
      lastStart = start;
      lastEnd = end;

      windowEl.style.transform = `translateY(${start * rowHeight}px)`;
      windowEl.innerHTML = "";
      for (let i = start; i < end; i++) {
        const row = renderRow(items[i], i);
        row.style.height = rowHeight + "px";
        windowEl.appendChild(row);
      }
    }

    const onScroll = App.Utils.debounce(renderWindow, 16); // ~1 frame
    viewport.addEventListener("scroll", onScroll);
    renderWindow();

    return {
      destroy: () => viewport.removeEventListener("scroll", onScroll),
      updateItems: (newItems) => {
        items = newItems;
        spacer.style.height = items.length * rowHeight + "px";
        lastStart = -1;
        lastEnd = -1;
        renderWindow();
      },
    };
  }

  App.VirtualList = { mount };
})((window.App = window.App || {}));
