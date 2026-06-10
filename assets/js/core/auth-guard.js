import { getSession } from "../services/auth.service.js";
import { getCurrentPath, findRoute, navigateTo, getHomeForRole } from "./router.js";
import { ROUTES } from "../config/constants.js";
import { showLoading, hideLoading } from "../components/loading.js";

/**
 * Protect a page based on route registry metadata.
 * Call from bootstrap on every protected page.
 * @returns {Promise<{ user: object, profile: object } | null>}
 */
export async function guardPage() {
  const path = getCurrentPath();
  const route = findRoute(path);

  showLoading();

  try {
    if (!route) {
      navigateTo(ROUTES.NOT_FOUND, { replace: true });
      return null;
    }

    if (route.public) {
      return null;
    }

    const session = await getSession();

    if (!session) {
      navigateTo(ROUTES.LOGIN, { replace: true });
      return null;
    }

    const { user, profile } = session;
    const role = profile.role;

    if (!route.roles.includes(role)) {
      navigateTo(ROUTES.UNAUTHORIZED, { replace: true });
      return null;
    }

    return { user, profile };
  } finally {
    hideLoading();
  }
}

/**
 * Redirect authenticated users away from public pages (e.g. login).
 * @returns {Promise<boolean>} true if redirected
 */
export async function redirectIfAuthenticated() {
  const path = getCurrentPath();
  const route = findRoute(path);

  if (!route?.public || path !== ROUTES.LOGIN) return false;

  const session = await getSession();
  if (!session) return false;

  navigateTo(getHomeForRole(session.profile.role), { replace: true });
  return true;
}
