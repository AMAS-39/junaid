import { getNavItems, NAV_ICONS } from "../core/navigation-config.js";
import { getCurrentPath, buildUrl } from "../core/router.js";

/**
 * Render mobile bottom navigation (max 5 items).
 * @param {object} profile
 * @returns {string}
 */
export function renderBottomNav(profile) {
  const navItems = getNavItems(profile.role).slice(0, 5);
  const currentPath = getCurrentPath();

  const items = navItems
    .map((item) => {
      const isActive = currentPath === item.href;
      const href = buildUrl(item.href);
      const icon = NAV_ICONS[item.icon] || NAV_ICONS.grid;

      return `
        <a href="${href}"
           class="ncms-bottom-nav-item ${isActive ? "ncms-bottom-nav-item-active" : ""}"
           data-nav-id="${item.id}">
          <span class="ncms-bottom-nav-icon">${icon}</span>
          <span class="ncms-bottom-nav-label">${item.label}</span>
        </a>
      `;
    })
    .join("");

  return `
    <nav id="ncms-bottom-nav"
         class="ncms-bottom-nav-shell lg:hidden fixed bottom-0 inset-x-0 z-40 safe-area-bottom"
         aria-label="Mobile navigation">
      <div class="ncms-bottom-nav-inner">
        ${items}
      </div>
    </nav>
  `;
}
