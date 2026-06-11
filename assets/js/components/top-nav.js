import { t, getLocale, setLocale, renderLanguageOptions } from "../core/i18n.js";
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
  const locale = getLocale();

  return `
    <header class="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 ncms-top-nav">
      <div class="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div class="flex items-center gap-3 min-w-0">
          <button type="button"
                  data-open-sidebar
                  class="lg:hidden flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100"
                  aria-label="${t("common.openMenu")}">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div class="min-w-0">
            <h1 class="text-lg font-semibold text-slate-800 truncate">${pageTitle || t("nav.dashboard")}</h1>
            <p class="text-xs text-slate-500 truncate hidden sm:block">${profile.name || ""}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <label class="ncms-lang-switch hidden sm:flex items-center gap-2">
            <span class="text-xs font-semibold text-slate-500">${t("language.label")}</span>
            <select id="ncms-language-select" class="ncms-lang-select" aria-label="${t("language.label")}">
              ${renderLanguageOptions()}
            </select>
          </label>

          <select id="ncms-language-select-mobile" class="ncms-lang-select sm:hidden" aria-label="${t("language.label")}">
            ${renderLanguageOptions()}
          </select>

          <button type="button"
                  id="ncms-logout-btn"
                  class="hidden sm:inline-flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 transition">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            ${t("buttons.logout")}
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
  const locale = getLocale();

  const bindLangSelect = (select) => {
    if (!select) return;
    select.value = locale;
    select.addEventListener("change", () => {
      if (select.value === locale) return;
      setLocale(select.value);
      window.location.reload();
    });
  };

  bindLangSelect(document.getElementById("ncms-language-select"));
  bindLangSelect(document.getElementById("ncms-language-select-mobile"));

  const logoutBtn = document.getElementById("ncms-logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const confirmed = await confirmModal(t("buttons.logout"), t("login.logoutConfirm"));
      if (!confirmed) return;

      await logout();
      navigateTo(ROUTES.LOGIN);
    });
  }
}
