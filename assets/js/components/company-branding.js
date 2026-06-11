import { t } from "../core/i18n.js";
import { ZAS_TECH } from "../config/constants.js";
import { escapeHtml } from "../utils/format.js";

/**
 * HTML for the ZAS Tech company branding strip.
 * @param {{ variant?: "auth" | "app" }} [options]
 */
export function renderZasTechBranding(options = {}) {
  const variant = options.variant || "auth";
  return `
    <div class="zas-tech-branding zas-tech-branding--${variant}">
      <div class="zas-tech-branding-card">
        <div class="zas-tech-branding-logo" aria-hidden="true">ZAS</div>
        <div class="zas-tech-branding-text">
          <p class="zas-tech-branding-title">${escapeHtml(t("company.poweredBy", { name: ZAS_TECH.name }))}</p>
          <p class="zas-tech-branding-tagline">${escapeHtml(t("company.tagline"))}</p>
        </div>
        <a
          href="${escapeHtml(ZAS_TECH.website)}"
          target="_blank"
          rel="noopener noreferrer"
          class="zas-tech-branding-link"
        >
          ${escapeHtml(t("company.visitWebsite"))}
          <span class="zas-tech-branding-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  `;
}

/**
 * Mount branding on auth/public pages (login, setup, 404).
 */
export function mountAuthZasTechBranding() {
  if (document.getElementById("zas-tech-branding")) return;
  const el = document.createElement("div");
  el.id = "zas-tech-branding";
  el.innerHTML = renderZasTechBranding({ variant: "auth" });
  document.body.appendChild(el);
}

/**
 * Mount branding in the app shell footer slot.
 */
export function mountAppZasTechBranding() {
  const slot = document.getElementById("ncms-zas-tech-slot");
  if (!slot || slot.dataset.mounted === "1") return;
  slot.innerHTML = renderZasTechBranding({ variant: "app" });
  slot.dataset.mounted = "1";
}
