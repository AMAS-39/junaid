import { getNavItems, NAV_ICONS } from "../core/navigation-config.js";
import { getCurrentPath, buildUrl } from "../core/router.js";
import { t } from "../core/i18n.js";

/**
 * Render the desktop sidebar.
 * @param {object} profile
 * @returns {string}
 */
export function renderSidebar(profile) {
  const navItems = getNavItems(profile.role);
  const currentPath = getCurrentPath();
  const roleLabel = t(`roles.${profile.role}`) || profile.role;

  const links = navItems
    .map((item) => {
      const isActive = currentPath === item.href;
      const href = buildUrl(item.href);
      const icon = NAV_ICONS[item.icon] || NAV_ICONS.grid;

      return `
        <a href="${href}"
           class="ncms-nav-link ${isActive ? "ncms-nav-link-active" : ""}"
           data-nav-id="${item.id}">
          <span class="shrink-0">${icon}</span>
          <span class="truncate">${item.label}</span>
        </a>
      `;
    })
    .join("");

  return `
    <aside id="ncms-sidebar"
           class="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-white border-e border-slate-200 h-screen sticky top-0">
      <div class="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-medical-400 to-sky-500 text-white font-bold text-sm">
          NC
        </div>
        <div class="min-w-0">
          <p class="font-bold text-slate-800 truncate">${t("app.name")}</p>
          <p class="text-xs text-slate-500 truncate">${roleLabel}</p>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Main navigation">
        ${links}
      </nav>

      <div class="border-t border-slate-100 px-4 py-4">
        <div class="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-medical-100 text-medical-700 font-semibold text-sm">
            ${getInitials(profile.name)}
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-slate-800 truncate">${profile.name || "User"}</p>
            <p class="text-xs text-slate-500 truncate">${profile.email || ""}</p>
          </div>
        </div>
      </div>
    </aside>
  `;
}

/**
 * @param {string} name
 * @returns {string}
 */
function getInitials(name = "") {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

/**
 * Toggle mobile sidebar drawer.
 * @param {boolean} [open]
 */
export function toggleSidebar(open) {
  const drawer = document.getElementById("ncms-sidebar-drawer");
  const overlay = document.getElementById("ncms-sidebar-overlay");
  if (!drawer || !overlay) return;

  const shouldOpen = open ?? drawer.classList.contains("-translate-x-full");

  if (shouldOpen) {
    drawer.classList.remove("-translate-x-full");
    overlay.classList.remove("hidden");
    document.body.classList.add("overflow-hidden");
  } else {
    drawer.classList.add("-translate-x-full");
    overlay.classList.add("hidden");
    document.body.classList.remove("overflow-hidden");
  }
}

/**
 * Render mobile sidebar drawer (overlay + panel).
 * @param {object} profile
 * @returns {string}
 */
export function renderSidebarDrawer(profile) {
  const navItems = getNavItems(profile.role);
  const currentPath = getCurrentPath();

  const links = navItems
    .map((item) => {
      const isActive = currentPath === item.href;
      const href = buildUrl(item.href);
      const icon = NAV_ICONS[item.icon] || NAV_ICONS.grid;

      return `
        <a href="${href}"
           class="ncms-nav-link ${isActive ? "ncms-nav-link-active" : ""}"
           data-nav-id="${item.id}"
           data-close-drawer>
          <span class="shrink-0">${icon}</span>
          <span>${item.label}</span>
        </a>
      `;
    })
    .join("");

  return `
    <div id="ncms-sidebar-overlay"
         class="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm hidden lg:hidden"
         aria-hidden="true"></div>
    <aside id="ncms-sidebar-drawer"
           class="fixed inset-y-0 start-0 z-50 w-72 bg-white shadow-xl transform -translate-x-full transition-transform duration-200 lg:hidden flex flex-col">
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p class="font-bold text-slate-800">${t("app.name")}</p>
        <button type="button" data-close-sidebar class="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Close menu">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <nav class="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        ${links}
      </nav>
    </aside>
  `;
}

/**
 * Bind sidebar drawer events.
 */
export function bindSidebarEvents() {
  document.querySelectorAll("[data-open-sidebar]").forEach((btn) => {
    btn.addEventListener("click", () => toggleSidebar(true));
  });

  document.querySelectorAll("[data-close-sidebar], #ncms-sidebar-overlay").forEach((el) => {
    el.addEventListener("click", () => toggleSidebar(false));
  });

  document.querySelectorAll("[data-close-drawer]").forEach((link) => {
    link.addEventListener("click", () => toggleSidebar(false));
  });
}
