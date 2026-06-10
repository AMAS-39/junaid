import { t, toggleDirection } from "../core/i18n.js";
import { logout } from "../services/auth.service.js";
import { navigateTo } from "../core/router.js";
import { ROUTES } from "../config/constants.js";
import { confirmModal } from "./modal.js";

/**
 * Render the top navigation bar.
 * @param {object} profile
 * @param {string} [pageTitle]
 * @returns {string}
 */
export function renderTopNav(profile, pageTitle = "") {
  return `
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div class="flex items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div class="flex items-center gap-3 min-w-0">
          <button type="button"
                  data-open-sidebar
                  class="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
                  aria-label="Open menu">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div class="min-w-0">
            <h1 class="text-lg font-semibold text-slate-800 truncate">${pageTitle || t("dashboard")}</h1>
            <p class="text-xs text-slate-500 truncate hidden sm:block">${profile.name || ""}</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button type="button"
                  id="ncms-direction-toggle"
                  class="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
                  title="Toggle RTL/LTR"
                  aria-label="Toggle text direction">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M4 7h16M4 12h10M4 17h16"/>
            </svg>
          </button>

          <button type="button"
                  id="ncms-logout-btn"
                  class="hidden sm:inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ${t("logout")}
          </button>
        </div>
      </div>
    </header>
  `;
}

/**
 * Bind top navigation events.
 */
export function bindTopNavEvents() {
  const directionBtn = document.getElementById("ncms-direction-toggle");
  if (directionBtn) {
    directionBtn.addEventListener("click", () => toggleDirection());
  }

  const logoutBtn = document.getElementById("ncms-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const confirmed = await confirmModal(t("logout"), "Are you sure you want to log out?");
      if (!confirmed) return;

      await logout();
      navigateTo(ROUTES.LOGIN);
    });
  }
}
