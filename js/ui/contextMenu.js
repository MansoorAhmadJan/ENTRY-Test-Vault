/* ============================================================
   Context Menu. Attach once via App.ContextMenu.attachToResourceCards(root);
   uses event delegation so it works for cards rendered/removed
   dynamically (pagination, filtering) without re-binding.
   ============================================================ */
(function (App) {
  "use strict";

  let menuEl = null;

  function ensure() {
    if (menuEl) return menuEl;
    menuEl = App.Dom.el("div", { class: "context-menu", role: "menu" });
    menuEl.style.display = "none";
    document.body.appendChild(menuEl);
    document.addEventListener("click", () => hide());
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hide();
    });
    return menuEl;
  }

  function itemHtml(icon, label, action) {
    return `<div class="context-menu-item" role="menuitem" tabindex="-1" data-action="${action}">${App.Icons.get(icon)}<span>${label}</span></div>`;
  }

  function buildItems(resource) {
    const isFav = App.Storage.isFavorite(resource.id);
    const isBookmarked = App.Storage.isBookmarked(resource.id);
    const isQueued = App.Storage.isQueued(resource.id);
    return [
      itemHtml("external", "Open Resource", "open"),
      itemHtml("external", "Open in New Tab", "open-new-tab"),
      itemHtml("link", "Copy Link", "copy-link"),
      '<div class="context-menu-sep"></div>',
      itemHtml("heart", isFav ? "Remove from Favorites" : "Add to Favorites", "toggle-favorite"),
      itemHtml("bookmark", isBookmarked ? "Remove Bookmark" : "Add Bookmark", "toggle-bookmark"),
      itemHtml(
        "layers",
        isQueued ? "Remove from Reading Queue" : "Add to Reading Queue",
        "toggle-queue"
      ),
      '<div class="context-menu-sep"></div>',
      itemHtml("search", "View Full Details", "view-details"),
    ].join("");
  }

  function show(x, y, resource) {
    ensure();
    menuEl.innerHTML = buildItems(resource);
    menuEl.style.display = "block";
    // Position, clamped to viewport so it never renders off-screen.
    const rect = menuEl.getBoundingClientRect();
    const clampedX = Math.min(x, window.innerWidth - rect.width - 8);
    const clampedY = Math.min(y, window.innerHeight - rect.height - 8);
    menuEl.style.left = Math.max(8, clampedX) + "px";
    menuEl.style.top = Math.max(8, clampedY) + "px";

    menuEl.onclick = (e) => {
      e.stopPropagation();
      const item = e.target.closest("[data-action]");
      if (!item) return;
      handleAction(item.getAttribute("data-action"), resource);
      hide();
    };
    const first = menuEl.querySelector(".context-menu-item");
    if (first) first.focus();
  }

  function hide() {
    if (menuEl) menuEl.style.display = "none";
  }

  function handleAction(action, resource) {
    switch (action) {
      case "open":
        App.Components.openResourceModal(resource.id);
        break;
      case "open-new-tab":
        if (App.Validators.isValidUrl(resource.link)) {
          window.open(resource.link, "_blank", "noopener,noreferrer");
        } else {
          App.Toast.show("This resource's link isn't a valid http/https URL", "error");
        }
        break;
      case "copy-link":
        App.ErrorHandler.safeCall("copy link", () => navigator.clipboard.writeText(resource.link));
        App.Toast.show("Link copied to clipboard", "success");
        break;
      case "toggle-favorite": {
        const active = App.Storage.toggleFavorite(resource.id);
        App.Toast.show(active ? "Added to favorites" : "Removed from favorites", "success");
        document.dispatchEvent(new CustomEvent("app:data-changed"));
        break;
      }
      case "toggle-bookmark": {
        const active = App.Storage.toggleBookmark(resource.id);
        App.Toast.show(active ? "Bookmarked" : "Bookmark removed", "success");
        document.dispatchEvent(new CustomEvent("app:data-changed"));
        break;
      }
      case "toggle-queue": {
        const active = App.Storage.toggleQueue(resource.id);
        App.Toast.show(active ? "Added to reading queue" : "Removed from reading queue", "success");
        document.dispatchEvent(new CustomEvent("app:data-changed"));
        break;
      }
      case "view-details":
        App.Components.openResourceModal(resource.id);
        break;
    }
  }

  // Delegate contextmenu (right-click) events on any container of .resource-card elements.
  function attachToResourceCards(root) {
    root.addEventListener("contextmenu", (e) => {
      const card = e.target.closest(".resource-card");
      if (!card) return;
      e.preventDefault();
      const resource = App.Data.getById(card.getAttribute("data-id"));
      if (resource) show(e.clientX, e.clientY, resource);
    });
  }

  App.ContextMenu = { attachToResourceCards, show, hide };
})((window.App = window.App || {}));
