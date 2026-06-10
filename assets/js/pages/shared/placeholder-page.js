import { bootstrap } from "../../core/bootstrap.js";
import { findRoute, getCurrentPath } from "../../core/router.js";

/**
 * Generic placeholder for feature pages not yet implemented.
 */
bootstrap({
  onReady: () => {
    const route = findRoute(getCurrentPath());
    const titleEl = document.getElementById("pageTitle");
    const descEl = document.getElementById("pageDescription");

    if (titleEl && route?.title) {
      titleEl.textContent = route.title;
    }

    if (descEl) {
      descEl.textContent = "This module will be implemented in a future phase.";
    }
  },
});
