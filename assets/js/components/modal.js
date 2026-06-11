import { t } from "../core/i18n.js";

let containerEl = null;
let activeModal = null;

/**
 * Initialize modal container.
 */
export function initModal() {
  if (document.getElementById("ncms-modal-container")) return;

  containerEl = document.createElement("div");
  containerEl.id = "ncms-modal-container";
  document.body.appendChild(containerEl);
}

/**
 * Open a modal dialog.
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.body - HTML content for modal body
 * @param {string} [options.confirmText="Confirm"]
 * @param {string} [options.cancelText="Cancel"]
 * @param {boolean} [options.showCancel=true]
 * @param {() => void|Promise<void>} [options.onConfirm]
 * @param {() => void} [options.onCancel]
 * @returns {{ close: () => void }}
 */
export function openModal(options) {
  if (!containerEl) initModal();

  closeModal();

  const {
    title,
    body,
    confirmText = t("modal.confirm"),
    cancelText = t("modal.cancel"),
    showCancel = true,
    onConfirm,
    onCancel,
  } = options;

  const backdrop = document.createElement("div");
  backdrop.className =
    "fixed inset-0 z-[9997] flex items-end sm:items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in";
  backdrop.setAttribute("role", "dialog");
  backdrop.setAttribute("aria-modal", "true");

  backdrop.innerHTML = `
    <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-slide-up sm:animate-scale-in">
      <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 class="text-lg font-semibold text-slate-800">${title}</h2>
        <button type="button" data-modal-close class="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="${t("common.close")}">&times;</button>
      </div>
      <div class="px-5 py-4 text-slate-600 text-sm leading-relaxed">${body}</div>
      <div class="flex gap-3 border-t border-slate-100 px-5 py-4 justify-end">
        ${showCancel ? `<button type="button" data-modal-cancel class="ncms-btn-secondary">${cancelText}</button>` : ""}
        <button type="button" data-modal-confirm class="ncms-btn-primary">${confirmText}</button>
      </div>
    </div>
  `;

  const close = () => {
    backdrop.classList.add("opacity-0");
    setTimeout(() => {
      backdrop.remove();
      if (activeModal === backdrop) activeModal = null;
    }, 150);
  };

  backdrop.querySelector("[data-modal-close]").addEventListener("click", () => {
    if (onCancel) onCancel();
    close();
  });

  const cancelBtn = backdrop.querySelector("[data-modal-cancel]");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      if (onCancel) onCancel();
      close();
    });
  }

  backdrop.querySelector("[data-modal-confirm]").addEventListener("click", async () => {
    if (onConfirm) await onConfirm();
    close();
  });

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) {
      if (onCancel) onCancel();
      close();
    }
  });

  containerEl.appendChild(backdrop);
  activeModal = backdrop;

  return { close };
}

/**
 * Close the active modal if any.
 */
export function closeModal() {
  if (activeModal) {
    activeModal.remove();
    activeModal = null;
  }
}

/**
 * Convenience confirm dialog.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function confirmModal(title, message) {
  return new Promise((resolve) => {
    openModal({
      title,
      body: message,
      confirmText: t("modal.confirm"),
      cancelText: t("modal.cancel"),
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}
