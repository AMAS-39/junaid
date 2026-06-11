import { escapeHtml } from "../utils/format.js";

/**
 * @typedef {Object} DashStatCard
 * @property {string} label
 * @property {string|number} value
 * @property {string} [meta]
 * @property {string} [icon]
 * @property {string} [tone] - green | blue | teal | amber | sky | violet
 * @property {string} [href]
 * @property {string} [badge]
 * @property {string} [badgeTone] - success | warning | muted
 */

/**
 * @typedef {Object} DashActionCard
 * @property {string} title
 * @property {string} [desc]
 * @property {string} icon
 * @property {string} href
 */

/**
 * @param {HTMLElement | null} container
 * @param {DashStatCard[]} cards
 * @param {{ gridClass?: string }} [options]
 */
export function renderDashStats(container, cards, options = {}) {
  if (!container) return;

  const gridClass = options.gridClass || "dash-stats-grid";

  container.innerHTML = `
    <div class="${gridClass}">
      ${cards.map((card) => dashStatCardHtml(card)).join("")}
    </div>
  `;
}

/**
 * @param {HTMLElement | null} container
 * @param {DashActionCard[]} actions
 * @param {string} [gridClass]
 */
export function renderDashActions(container, actions, gridClass = "dash-actions-grid") {
  if (!container) return;

  container.innerHTML = `
    <div class="${gridClass}">
      ${actions
        .map(
          (action) => `
        <a href="${escapeHtml(action.href)}" class="dash-action-card">
          <span class="dash-action-icon" aria-hidden="true">${action.icon}</span>
          <span class="dash-action-text">
            <span class="dash-action-title">${escapeHtml(action.title)}</span>
            ${action.desc ? `<span class="dash-action-desc">${escapeHtml(action.desc)}</span>` : ""}
          </span>
          <span class="dash-action-arrow" aria-hidden="true">›</span>
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

/**
 * @param {DashStatCard} card
 */
function dashStatCardHtml(card) {
  const tone = card.tone || "green";
  const tag = card.href ? "a" : "div";
  const hrefAttr = card.href ? ` href="${escapeHtml(card.href)}"` : "";

  const badgeHtml = card.badge
    ? `<span class="dash-stat-badge dash-stat-badge--${escapeHtml(card.badgeTone || "muted")}">${escapeHtml(card.badge)}</span>`
    : "";

  return `
    <${tag}${hrefAttr} class="dash-stat-card dash-stat-card--${tone}${card.href ? " dash-stat-card--link" : ""}">
      <div class="dash-stat-icon-wrap" aria-hidden="true">${card.icon || "📊"}</div>
      <div class="dash-stat-body">
        <span class="dash-stat-label">${escapeHtml(card.label)}</span>
        <strong class="dash-stat-value">${escapeHtml(String(card.value))}</strong>
        ${card.meta ? `<span class="dash-stat-meta">${escapeHtml(card.meta)}</span>` : ""}
      </div>
      ${badgeHtml}
    </${tag}>
  `;
}
