import { buildUrl } from "../core/router.js";
import { escapeHtml } from "../utils/format.js";

export const PATIENT_HOME = buildUrl("/patient/dashboard.html");

/**
 * @param {string} [label]
 */
export function patientHomeHref(label = "Back to Home") {
  return `<a href="${PATIENT_HOME}" class="patient-back-link">${escapeHtml(label)}</a>`;
}

/**
 * @typedef {{ title: string, icon: string, href: string, tone?: string }} PatientAction
 */

/**
 * @param {HTMLElement | null} container
 * @param {PatientAction[]} actions
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
  const formatDate = formatters.formatDate || ((v) => String(v ?? "—"));
  const formatDateTime = formatters.formatDateTime || ((v) => String(v ?? "—"));

  const appointmentCard = nextAppointment
    ? `
      <a href="${buildUrl("/patient/appointments/list.html")}" class="patient-info-card patient-info-card--blue">
        <div class="patient-info-card-icon" aria-hidden="true">📅</div>
        <div class="patient-info-card-body">
          <span class="patient-info-card-label">Next visit</span>
          <strong class="patient-info-card-value">${escapeHtml(formatDateTime(nextAppointment.scheduledAt))}</strong>
          <span class="patient-info-card-meta">Status: ${escapeHtml(nextAppointment.status || "pending")}</span>
        </div>
      </a>
    `
    : `
      <div class="patient-info-card patient-info-card--muted">
        <div class="patient-info-card-icon" aria-hidden="true">📅</div>
        <div class="patient-info-card-body">
          <span class="patient-info-card-label">Next visit</span>
          <strong class="patient-info-card-value">No visit booked</strong>
          <span class="patient-info-card-meta">Tap Appointment below to request one</span>
        </div>
      </div>
    `;

  const dietCard = dietPlan
    ? `
      <a href="${buildUrl("/patient/diet-plan/view.html")}" class="patient-info-card patient-info-card--teal">
        <div class="patient-info-card-icon" aria-hidden="true">🥗</div>
        <div class="patient-info-card-body">
          <span class="patient-info-card-label">Your diet plan</span>
          <strong class="patient-info-card-value">${escapeHtml(dietPlan.title || "Active plan")}</strong>
          <span class="patient-info-card-meta">Tap to see meals</span>
        </div>
      </a>
    `
    : `
      <div class="patient-info-card patient-info-card--muted">
        <div class="patient-info-card-icon" aria-hidden="true">🥗</div>
        <div class="patient-info-card-body">
          <span class="patient-info-card-label">Your diet plan</span>
          <strong class="patient-info-card-value">Not assigned yet</strong>
          <span class="patient-info-card-meta">Your doctor will add a plan for you</span>
        </div>
      </div>
    `;

  const checklistCard = `
    <a href="#todayChecklist" class="patient-info-card patient-info-card--green">
      <div class="patient-info-card-icon" aria-hidden="true">✅</div>
      <div class="patient-info-card-body">
        <span class="patient-info-card-label">Today's checklist</span>
        <strong class="patient-info-card-value">${checklistPercent}% done</strong>
        <span class="patient-info-card-meta">${checklistDone} of ${checklistTotal} tasks completed</span>
      </div>
    </a>
  `;

  container.innerHTML = appointmentCard + dietCard + checklistCard;
}

/**
 * Friendly empty state HTML.
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
