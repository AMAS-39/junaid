import { buildUrl } from "../core/router.js";
import { escapeHtml } from "../utils/format.js";
import { t, tStatus } from "../core/i18n.js";

export const PATIENT_HOME = buildUrl("/patient/dashboard.html");

/**
 * @param {HTMLElement | null} container
 * @param {Array<{ title: string, icon: string, href: string, tone?: string }>} actions
 */
export function renderPatientActionGrid(container, actions) {
  if (!container) return;

  container.innerHTML = `
    <div class="patient-action-grid">
      ${actions
        .map(
          (action) => `
        <a href="${escapeHtml(action.href)}" class="patient-action-btn patient-action-btn--${action.tone || "green"}">
          <span class="patient-action-icon" aria-hidden="true">${action.icon}</span>
          <span class="patient-action-label">${escapeHtml(action.title)}</span>
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * @param {HTMLElement | null} container
 * @param {{ nextAppointment?: object | null, dietPlan?: object | null, checklistPercent?: number, checklistDone?: number, checklistTotal?: number }} data
 * @param {{ formatDate?: (v: unknown) => string, formatDateTime?: (v: unknown) => string }} formatters
 */
export function renderPatientTodayCards(container, data, formatters = {}) {
  if (!container) return;

  const { nextAppointment, dietPlan, checklistPercent = 0, checklistDone = 0, checklistTotal = 5 } = data;
  const formatDateTime = formatters.formatDateTime || ((v) => String(v ?? "—"));

  const appointmentCard = nextAppointment
    ? `
      <a href="${buildUrl("/patient/appointments/list.html")}" class="patient-info-card patient-info-card--blue">
        <div class="patient-info-card-icon" aria-hidden="true">📅</div>
        <div class="patient-info-card-body">
          <span class="patient-info-card-label">${escapeHtml(t("patient.nextVisit"))}</span>
          <strong class="patient-info-card-value">${escapeHtml(formatDateTime(nextAppointment.scheduledAt))}</strong>
          <span class="patient-info-card-meta">${escapeHtml(tStatus(nextAppointment.status || "pending"))}</span>
        </div>
      </a>
    `
    : `
      <div class="patient-info-card patient-info-card--muted">
        <div class="patient-info-card-icon" aria-hidden="true">📅</div>
        <div class="patient-info-card-body">
          <span class="patient-info-card-label">${escapeHtml(t("patient.nextVisit"))}</span>
          <strong class="patient-info-card-value">${escapeHtml(t("patient.noVisitBooked"))}</strong>
          <span class="patient-info-card-meta">${escapeHtml(t("patient.tapAppointment"))}</span>
        </div>
      </div>
    `;

  const dietCard = dietPlan
    ? `
      <a href="${buildUrl("/patient/diet-plan/view.html")}" class="patient-info-card patient-info-card--teal">
        <div class="patient-info-card-icon" aria-hidden="true">🥗</div>
        <div class="patient-info-card-body">
          <span class="patient-info-card-label">${escapeHtml(t("patient.yourDietPlan"))}</span>
          <strong class="patient-info-card-value">${escapeHtml(dietPlan.title || t("patient.activePlan"))}</strong>
          <span class="patient-info-card-meta">${escapeHtml(t("patient.tapMeals"))}</span>
        </div>
      </a>
    `
    : `
      <div class="patient-info-card patient-info-card--muted">
        <div class="patient-info-card-icon" aria-hidden="true">🥗</div>
        <div class="patient-info-card-body">
          <span class="patient-info-card-label">${escapeHtml(t("patient.yourDietPlan"))}</span>
          <strong class="patient-info-card-value">${escapeHtml(t("patient.notAssignedYet"))}</strong>
          <span class="patient-info-card-meta">${escapeHtml(t("patient.doctorWillAssign"))}</span>
        </div>
      </div>
    `;

  const checklistCard = `
    <a href="#todayChecklist" class="patient-info-card patient-info-card--green">
      <div class="patient-info-card-icon" aria-hidden="true">✅</div>
      <div class="patient-info-card-body">
        <span class="patient-info-card-label">${escapeHtml(t("patient.todayChecklist"))}</span>
        <strong class="patient-info-card-value">${checklistPercent}% ${escapeHtml(t("patient.checklistDone"))}</strong>
        <span class="patient-info-card-meta">${checklistDone} ${escapeHtml(t("patient.tasksCompleted"))}</span>
      </div>
    </a>
  `;

  container.innerHTML = appointmentCard + dietCard + checklistCard;
}

/**
 * @param {{ icon?: string, titleKey: string, messageKey: string, hintKey?: string }} options
 */
export function patientEmptyStateFromKeys({ icon = "📋", titleKey, messageKey, hintKey }) {
  return patientEmptyStateHtml({
    icon,
    title: t(titleKey),
    message: t(messageKey),
    hint: hintKey ? t(hintKey) : undefined,
  });
}

/**
 * @param {{ icon?: string, title: string, message: string, hint?: string }} options
 */
export function patientEmptyStateHtml({ icon = "📋", title, message, hint }) {
  return `
    <div class="patient-empty-state">
      <span class="patient-empty-icon" aria-hidden="true">${icon}</span>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      ${hint ? `<p class="patient-empty-hint">${escapeHtml(hint)}</p>` : ""}
    </div>
  `;
}
