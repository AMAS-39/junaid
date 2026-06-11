import { t } from "../core/i18n.js";

let overlayEl = null;
let requestCount = 0;

/**
 * Initialize the global loading overlay container.
 */
export function initLoading() {
  if (document.getElementById("ncms-loading")) return;

  overlayEl = document.createElement("div");
  overlayEl.id = "ncms-loading";
  overlayEl.className =
    "fixed inset-0 z-[9999] hidden items-center justify-center bg-slate-900/30 backdrop-blur-sm";
  overlayEl.setAttribute("role", "status");
  overlayEl.setAttribute("aria-live", "polite");
  overlayEl.innerHTML = `
    <div class="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-xl">
      <div class="ncms-spinner h-10 w-10 rounded-full border-4 border-medical-100 border-t-medical-500"></div>
      <p class="text-sm font-medium text-slate-600" data-loading-text>Loading...</p>
    </div>
  `;
  document.body.appendChild(overlayEl);
}

/**
 * Show the global loading overlay.
 * @param {string} [message]
 */
export function showLoading(message = t("common.loading")) {
  if (!overlayEl) initLoading();

  requestCount += 1;
  const textEl = overlayEl.querySelector("[data-loading-text]");
  if (textEl) textEl.textContent = message;

  overlayEl.classList.remove("hidden");
  overlayEl.classList.add("flex");
}

/**
 * Hide the global loading overlay.
 */
export function hideLoading() {
  if (!overlayEl) return;

  requestCount = Math.max(0, requestCount - 1);
  if (requestCount === 0) {
    overlayEl.classList.add("hidden");
    overlayEl.classList.remove("flex");
  }
}

/**
 * Force-hide loading regardless of request count.
 */
export function forceHideLoading() {
  requestCount = 0;
  hideLoading();
}
