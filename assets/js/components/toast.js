import { t } from "../core/i18n.js";

let containerEl = null;

const TOAST_TYPES = {
  success: {
    bg: "bg-medical-50 border-medical-200 text-medical-800",
    icon: "✓",
  },
  error: {
    bg: "bg-red-50 border-red-200 text-red-800",
    icon: "✕",
  },
  warning: {
    bg: "bg-amber-50 border-amber-200 text-amber-800",
    icon: "!",
  },
  info: {
    bg: "bg-sky-50 border-sky-200 text-sky-800",
    icon: "i",
  },
};

/**
 * Initialize toast container.
 */
export function initToast() {
  if (document.getElementById("ncms-toast-container")) return;

  containerEl = document.createElement("div");
  containerEl.id = "ncms-toast-container";
  containerEl.className =
    "fixed top-4 end-4 z-[9998] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none";
  containerEl.setAttribute("aria-live", "polite");
  document.body.appendChild(containerEl);
}

/**
 * Show a toast notification.
 * @param {string} message
 * @param {"success"|"error"|"warning"|"info"} [type="info"]
 * @param {number} [duration=4000]
 */
export function showToast(message, type = "info", duration = 4000) {
  if (!containerEl) initToast();

  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const toast = document.createElement("div");
  toast.className = `pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg animate-slide-in ${config.bg}`;
  toast.innerHTML = `
    <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-xs font-bold">${config.icon}</span>
    <p class="flex-1 text-sm font-medium leading-snug">${message}</p>
    <button type="button" class="shrink-0 text-current opacity-60 hover:opacity-100" aria-label="${t("common.dismiss")}">&times;</button>
  `;

  const dismiss = () => {
    toast.classList.add("opacity-0", "translate-x-4");
    setTimeout(() => toast.remove(), 200);
  };

  toast.querySelector("button").addEventListener("click", dismiss);
  containerEl.appendChild(toast);

  if (duration > 0) {
    setTimeout(dismiss, duration);
  }

  return dismiss;
}

export const toast = {
  success: (msg, duration) => showToast(msg, "success", duration),
  error: (msg, duration) => showToast(msg, "error", duration),
  warning: (msg, duration) => showToast(msg, "warning", duration),
  info: (msg, duration) => showToast(msg, "info", duration),
};
