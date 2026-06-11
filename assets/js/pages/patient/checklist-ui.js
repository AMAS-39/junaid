import { t } from "../../core/i18n.js";
import { escapeHtml } from "../../utils/format.js";
import {
  CHECKLIST_ITEMS,
  getComplianceStats,
  getEntryDetails,
} from "../../services/daily-checklist.service.js";

function checklistItemLabel(item) {
  return item.shortLabelKey ? t(item.shortLabelKey) : item.shortLabel;
}

/**
 * @param {object} details
 * @param {boolean} done
 */
export function buildEntryPreview(details, done) {
  const parts = [];
  if (details.what) parts.push(details.what);
  if (details.amount) parts.push(details.amount);
  if (parts.length) return parts.join(" · ");
  return done ? t("checklist.markedComplete") : t("checklist.tapToLog");
}

/**
 * Render interactive checklist with detail fields for the patient dashboard.
 * @param {HTMLElement} container
 * @param {object} checklist
 * @param {(field: string, done: boolean, btn?: HTMLElement) => void | Promise<void>} onToggle
 * @param {(prefix: string, details: { what: string, how: string, amount: string, done?: boolean }) => void | Promise<void>} onSaveDetails
 */
export function renderPatientChecklist(container, checklist, onToggle, onSaveDetails) {
  if (!container) return;

  const stats = getComplianceStats(checklist);
  const firstOpenIndex = CHECKLIST_ITEMS.findIndex((item) => !checklist[item.key]);

  container.innerHTML = CHECKLIST_ITEMS.map((item, index) => {
    const done = Boolean(checklist[item.key]);
    const details = getEntryDetails(checklist, item.prefix);
    const preview = buildEntryPreview(details, done);
    const isOpen = index === (firstOpenIndex >= 0 ? firstOpenIndex : 0);
    const amountLabel =
      item.type === "water" ? t("checklist.howMuchDrink") : t("checklist.howMuchEat");
    const amountPlaceholder =
      item.type === "water" ? t("checklist.drinkAmountPh") : t("checklist.eatAmountPh");
    const whatLabel =
      item.type === "water" ? t("checklist.whatDrink") : t("checklist.whatEat");
    const itemLabel = checklistItemLabel(item);

    return `
      <article
        class="checklist-entry ${isOpen ? "is-open" : ""} ${done ? "is-done" : ""}"
        data-checklist-prefix="${escapeHtml(item.prefix)}"
      >
        <div class="checklist-entry-header">
          <button
            type="button"
            class="checklist-expand-btn"
            data-expand-prefix="${escapeHtml(item.prefix)}"
            aria-expanded="${isOpen}"
            aria-controls="checklist-panel-${escapeHtml(item.prefix)}"
          >
            <span class="checklist-meal-icon" aria-hidden="true">${item.icon}</span>
            <span class="checklist-header-text">
              <strong class="checklist-meal-title">${escapeHtml(itemLabel)}</strong>
              <span class="checklist-preview ${details.what || details.amount ? "has-log" : ""}">${escapeHtml(preview)}</span>
            </span>
            <span class="checklist-chevron" aria-hidden="true"></span>
          </button>
          <button
            type="button"
            class="checklist-quick-done ${done ? "done" : "pending"}"
            data-checklist-key="${escapeHtml(item.key)}"
            data-checklist-done="${done ? "1" : "0"}"
            aria-pressed="${done}"
            aria-label="${escapeHtml(done ? t("checklist.markNotDone", { label: itemLabel }) : t("checklist.markDone", { label: itemLabel }))}"
          >
            <span class="checklist-check">${done ? "✓" : ""}</span>
          </button>
        </div>

        <div
          id="checklist-panel-${escapeHtml(item.prefix)}"
          class="checklist-details"
          ${isOpen ? "" : "hidden"}
        >
          <p class="checklist-steps-hint">${t("checklist.stepsHint")}</p>
          <div class="checklist-details-grid">
            <div class="checklist-field">
              <label for="${escapeHtml(item.prefix)}-what">
                <span class="checklist-step">1</span>
                ${escapeHtml(whatLabel)}
              </label>
              <textarea
                id="${escapeHtml(item.prefix)}-what"
                class="form-textarea checklist-detail-input"
                rows="2"
                placeholder="${item.type === "water" ? t("checklist.whatPlaceholderWater") : t("checklist.whatPlaceholderMeal")}"
                data-detail-field="what"
              >${escapeHtml(details.what)}</textarea>
            </div>
            <div class="checklist-field">
              <label for="${escapeHtml(item.prefix)}-how">
                <span class="checklist-step">2</span>
                ${t("checklist.howDidYouDo")}
              </label>
              <textarea
                id="${escapeHtml(item.prefix)}-how"
                class="form-textarea checklist-detail-input"
                rows="2"
                placeholder="${t("checklist.howPlaceholder")}"
                data-detail-field="how"
              >${escapeHtml(details.how)}</textarea>
            </div>
            <div class="checklist-field">
              <label for="${escapeHtml(item.prefix)}-amount">
                <span class="checklist-step">3</span>
                ${escapeHtml(amountLabel)}
              </label>
              <input
                id="${escapeHtml(item.prefix)}-amount"
                type="text"
                class="form-input checklist-detail-input"
                placeholder="${escapeHtml(amountPlaceholder)}"
                value="${escapeHtml(details.amount)}"
                data-detail-field="amount"
              />
            </div>
          </div>
          <button
            type="button"
            class="ncms-btn-primary checklist-save-details"
            data-save-prefix="${escapeHtml(item.prefix)}"
          >
            ${t("checklist.saveMeal")} ${escapeHtml(itemLabel)}
          </button>
        </div>
      </article>
    `;
  }).join("");

  bindChecklistInteractions(container, onToggle, onSaveDetails);
  updateChecklistProgress(stats);
}

/**
 * @param {HTMLElement} container
 */
function bindChecklistInteractions(container, onToggle, onSaveDetails) {
  container.querySelectorAll("[data-expand-prefix]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const entry = btn.closest(".checklist-entry");
      if (!entry) return;

      const isOpen = entry.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", String(isOpen));
      const panel = entry.querySelector(".checklist-details");
      if (panel) panel.hidden = !isOpen;
    });
  });

  container.querySelectorAll("[data-checklist-key]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const field = btn.dataset.checklistKey;
      const current = btn.dataset.checklistDone === "1";
      const next = !current;
      await onToggle(field, next, btn);
    });
  });

  container.querySelectorAll("[data-save-prefix]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const prefix = btn.dataset.savePrefix;
      const entry = container.querySelector(`[data-checklist-prefix="${prefix}"]`);
      if (!entry) return;

      const what = entry.querySelector("[data-detail-field='what']")?.value?.trim() || "";
      const how = entry.querySelector("[data-detail-field='how']")?.value?.trim() || "";
      const amount = entry.querySelector("[data-detail-field='amount']")?.value?.trim() || "";

      btn.disabled = true;
      const original = btn.textContent;
      btn.textContent = t("checklist.saving");

      try {
        await onSaveDetails(prefix, { what, how, amount });
        updateEntryPreview(entry, { what, how, amount }, true);
      } finally {
        btn.disabled = false;
        btn.textContent = original;
      }
    });
  });
}

/**
 * @param {HTMLElement} entry
 * @param {{ what: string, how: string, amount: string }} details
 * @param {boolean} done
 */
export function updateEntryPreview(entry, details, done) {
  const preview = entry.querySelector(".checklist-preview");
  if (!preview) return;

  const text = buildEntryPreview(details, done);
  preview.textContent = text;
  preview.classList.toggle("has-log", Boolean(details.what || details.amount));
  entry.classList.toggle("is-done", done);
}

/**
 * Update quick-done button without re-rendering.
 * @param {HTMLElement} btn
 * @param {boolean} done
 */
export function updateChecklistToggleButton(btn, done) {
  btn.classList.toggle("done", done);
  btn.classList.toggle("pending", !done);
  btn.dataset.checklistDone = done ? "1" : "0";
  btn.setAttribute("aria-pressed", String(done));
  const check = btn.querySelector(".checklist-check");
  if (check) check.textContent = done ? "✓" : "";

  const entry = btn.closest(".checklist-entry");
  if (entry) entry.classList.toggle("is-done", done);
}

/**
 * Render read-only compliance view for doctors.
 * @param {HTMLElement} container
 * @param {object} checklist
 * @param {string} dateLabel
 */
export function renderDoctorCompliance(container, checklist, dateLabel) {
  if (!container) return;

  const stats = getComplianceStats(checklist);

  container.innerHTML = `
    <div class="compliance-summary">
      <div class="compliance-percent-ring" data-percent="${stats.percent}">
        <strong>${stats.percent}%</strong>
        <span>${t("checklist.percentToday")}</span>
      </div>
      <div class="compliance-summary-text">
        <p class="compliance-summary-main">${stats.completed} ${t("checklist.ofCompleted")} ${stats.total} ${t("checklist.tasksComplete")}</p>
        <p class="compliance-date">${escapeHtml(dateLabel)}</p>
      </div>
    </div>
    <div class="checklist-items checklist-items-readonly">
      ${CHECKLIST_ITEMS.map((item) => {
        const done = Boolean(checklist[item.key]);
        const details = getEntryDetails(checklist, item.prefix);
        const hasDetails = details.what || details.how || details.amount;
        const amountLabel = item.type === "water" ? t("checklist.amountDrunk") : t("checklist.amountEaten");
        const itemLabel = checklistItemLabel(item);

        return `
          <div class="checklist-entry readonly ${done ? "is-done" : ""}">
            <div class="checklist-entry-header readonly">
              <div class="checklist-expand-btn readonly">
                <span class="checklist-meal-icon" aria-hidden="true">${item.icon}</span>
                <span class="checklist-header-text">
                  <strong class="checklist-meal-title">${escapeHtml(itemLabel)}</strong>
                  <span class="checklist-status-pill ${done ? "done" : "pending"}">${done ? t("checklist.done") : t("checklist.notYet")}</span>
                </span>
              </div>
            </div>
            ${hasDetails ? `
              <div class="checklist-details-readonly">
                ${details.what ? `<div class="compliance-detail-row"><span>${t("checklist.what")}</span><p>${escapeHtml(details.what)}</p></div>` : ""}
                ${details.how ? `<div class="compliance-detail-row"><span>${t("checklist.how")}</span><p>${escapeHtml(details.how)}</p></div>` : ""}
                ${details.amount ? `<div class="compliance-detail-row"><span>${escapeHtml(amountLabel)}</span><p>${escapeHtml(details.amount)}</p></div>` : ""}
              </div>
            ` : `
              <p class="checklist-no-details">${t("checklist.noLogYet")}</p>
            `}
          </div>
        `;
      }).join("")}
    </div>
  `;
}

/**
 * @param {{ completed: number, total: number, percent: number }} stats
 */
export function updateChecklistProgress(stats) {
  const wrap = document.getElementById("checklistProgress");
  const bar = document.getElementById("checklistProgressBar");
  const text = document.getElementById("checklistProgressText");
  const percentEl = document.getElementById("checklistProgressPercent");

  if (!wrap || !bar || !text) return;

  wrap.classList.remove("hidden");
  bar.style.width = `${stats.percent}%`;
  text.textContent = `${stats.completed} ${t("checklist.ofCompleted")} ${stats.total}`;
  if (percentEl) percentEl.textContent = `${stats.percent}%`;
}
