import { t, tStatus } from "../core/i18n.js";
import { escapeHtml, formatAppointmentParts } from "../utils/format.js";

/**
 * @param {string} status
 */
export function appointmentStatusClass(status) {
  const s = status || "pending";
  return s === "archived" ? "old" : s;
}

/**
 * @param {object} options
 * @param {string} options.status
 * @param {Date | object} options.scheduledAt
 * @param {string} [options.patientName]
 * @param {string} [options.reason]
 * @param {string} [options.notes]
 * @param {string} [options.actionsHtml]
 * @param {boolean} [options.patientView]
 * @param {boolean} [options.showTodayBadge]
 */
export function renderAppointmentCard({
  status,
  scheduledAt,
  patientName = "",
  reason = "",
  notes = "",
  actionsHtml = "",
  patientView = false,
  showTodayBadge = true,
}) {
  const statusKey = appointmentStatusClass(status);
  const parts = formatAppointmentParts(scheduledAt);
  const todayBadge =
    showTodayBadge && parts.isToday
      ? `<span class="appointment-today-badge">${escapeHtml(t("status.today"))}</span>`
      : "";

  const titleBlock = patientView
    ? `<p class="appointment-card-time">${escapeHtml(parts.time)}</p>
       <p class="appointment-card-weekday">${escapeHtml(parts.weekday)}</p>`
    : `<p class="appointment-card-patient">${escapeHtml(patientName || t("labels.unknown"))}</p>
       <p class="appointment-card-time">${escapeHtml(parts.time)} · ${escapeHtml(parts.weekday)}</p>`;

  const reasonBlock = reason
    ? `<div class="appointment-meta-row">
         <span class="appointment-meta-icon" aria-hidden="true">📋</span>
         <span class="appointment-meta-text">${escapeHtml(reason)}</span>
       </div>`
    : "";

  const notesBlock = notes
    ? `<div class="appointment-meta-row appointment-meta-notes">
         <span class="appointment-meta-icon" aria-hidden="true">💬</span>
         <span class="appointment-meta-text">${escapeHtml(notes)}</span>
       </div>`
    : "";

  return `
    <article class="appointment-card appointment-card--${escapeHtml(statusKey)} ${patientView ? "appointment-card--patient" : ""}">
      <div class="appointment-date-rail" aria-hidden="true">
        <span class="appointment-date-day">${escapeHtml(parts.day)}</span>
        <span class="appointment-date-month">${escapeHtml(parts.month)}</span>
      </div>
      <div class="appointment-card-body">
        <div class="appointment-card-top">
          <div class="appointment-card-heading">
            ${titleBlock}
          </div>
          <div class="appointment-card-badges">
            ${todayBadge}
            <span class="status-badge status-${escapeHtml(statusKey)}">${escapeHtml(tStatus(status || "pending"))}</span>
          </div>
        </div>
        ${reasonBlock || notesBlock ? `<div class="appointment-card-meta">${reasonBlock}${notesBlock}</div>` : ""}
        ${actionsHtml ? `<div class="appointment-card-actions">${actionsHtml}</div>` : ""}
      </div>
    </article>
  `;
}

/**
 * @param {object} options
 * @param {string} options.title
 * @param {string} [options.subtitle]
 * @param {string} [options.icon]
 */
export function renderAppointmentEmptyState({ title, subtitle, footer, icon = "📅" }) {
  return `
    <div class="appointment-empty">
      <span class="appointment-empty-icon" aria-hidden="true">${icon}</span>
      <h3>${escapeHtml(title)}</h3>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
      ${footer ? `<p class="appointment-empty-footer">${escapeHtml(footer)}</p>` : ""}
    </div>
  `;
}
