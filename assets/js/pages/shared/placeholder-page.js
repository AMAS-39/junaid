import { bootstrap } from "../../core/bootstrap.js";
import { findRoute, getCurrentPath, getRouteTitle } from "../../core/router.js";
import { t } from "../../core/i18n.js";

/**
 * Generic placeholder for feature pages not yet implemented.
 */
bootstrap({
  onReady: () => {
    const route = findRoute(getCurrentPath());
    const titleEl = document.getElementById("pageTitle");
    const descEl = document.getElementById("pageDescription");

    const routeTitle = getRouteTitle(route);
    if (titleEl && routeTitle) {
      titleEl.textContent = routeTitle;
    }

    if (descEl) {
      descEl.textContent = t("placeholder.moduleFuture");
    }
  },
});
