import { initI18n, t } from "./i18n.js";
import { guardPage, redirectIfAuthenticated } from "./auth-guard.js";
import { initLayout } from "../components/layout.js";
import { initToast } from "../components/toast.js";
import { initModal } from "../components/modal.js";
import { initLoading } from "../components/loading.js";
import { findRoute, getCurrentPath } from "./router.js";
import { APP_NAME } from "../config/constants.js";

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
  initToast();
  initModal();
  initLoading();

  const path = getCurrentPath();
  const route = findRoute(path);
  const pageTitle = route?.title ? `${route.title} | ${APP_NAME}` : APP_NAME;
  document.title = pageTitle;

  let session = null;

  if (redirectIfAuth) {
    const redirected = await redirectIfAuthenticated();
    if (redirected) return;
  }

  if (!publicPage) {
    session = await guardPage();
    if (!session) return;
  }

  const useLayout = document.body.dataset.layout !== "none";
  if (useLayout && session) {
    initLayout(session.profile);
  }

  if (onReady) {
    onReady(session);
  }

  document.dispatchEvent(
    new CustomEvent("ncms:ready", { detail: { session, path, t } })
  );
}
