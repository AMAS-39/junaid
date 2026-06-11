import { initI18n, t, applyPageTranslations } from "./i18n.js";
import { guardPage, redirectIfAuthenticated } from "./auth-guard.js";
import { initLayout } from "../components/layout.js";
import { initToast } from "../components/toast.js";
import { initModal } from "../components/modal.js";
import { initLoading, forceHideLoading } from "../components/loading.js";
import { toast } from "../components/toast.js";
import { findRoute, getCurrentPath, getRouteTitle } from "./router.js";
import { initBackNavigation, resolveBackHrefs } from "../utils/back-nav.js";
import {
  mountAuthZasTechBranding,
  mountAppZasTechBranding,
} from "../components/company-branding.js";

/**
 * Application bootstrap — call once per page.
 * @param {Object} [options]
 * @param {boolean} [options.publicPage=false] - Skip auth guard (login, 404, etc.)
 * @param {boolean} [options.redirectIfAuth=false] - Redirect logged-in users from login
 * @param {(session: { user: object, profile: object } | null) => void} [options.onReady]
 */
export async function bootstrap(options = {}) {
  const { publicPage = false, redirectIfAuth = false, onReady } = options;

  initI18n();
  applyPageTranslations();
  initToast();
  initModal();
  initLoading();
  initBackNavigation();

  const path = getCurrentPath();
  const route = findRoute(path);
  const routeTitle = getRouteTitle(route);
  document.title = routeTitle ? `${routeTitle} | ${t("app.name")}` : t("app.name");

  let session = null;

  if (redirectIfAuth) {
    const redirected = await redirectIfAuthenticated();
    if (redirected) return;
  }

  if (!publicPage) {
    session = await guardPage();
    if (!session) return;
  }

  forceHideLoading();

  const useLayout = document.body.dataset.layout !== "none";
  if (useLayout && session) {
    try {
      initLayout(session);
      applyPageTranslations(document.getElementById("ncms-main-content") || document);
      mountAppZasTechBranding();
    } catch (layoutError) {
      console.error("Layout initialization failed:", layoutError);
      toast.error(t("toast.navShellFailed"));
    }
  } else {
    mountAuthZasTechBranding();
  }

  forceHideLoading();
  resolveBackHrefs();

  if (onReady) {
    try {
      await onReady(session);
    } catch (pageError) {
      console.error("Page initialization failed:", pageError);
      toast.error(t("toast.failedLoadContent"));
    }
  }

  forceHideLoading();
  resolveBackHrefs();

  document.dispatchEvent(
    new CustomEvent("ncms:ready", { detail: { session, path, t } })
  );
}
