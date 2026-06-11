import { t } from "../core/i18n.js";
import { escapeHtml, formatDateTime, formatShortTime } from "../utils/format.js";

/**
 * @param {string} name
 */
export function getChatInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * @param {string} name
 * @param {string} [extraClass]
 */
export function renderChatAvatar(name, extraClass = "") {
  const initials = escapeHtml(getChatInitials(name));
  return `<span class="chat-avatar ${extraClass}" aria-hidden="true">${initials}</span>`;
}

/**
 * @param {object} options
 */
export function renderConversationItem({
  id,
  name,
  preview,
  time,
  unread = 0,
  active = false,
}) {
  const unreadBadge =
    unread > 0
      ? `<span class="chat-unread-badge" aria-label="${escapeHtml(t("chat.unreadCount", { count: unread }))}">${unread}</span>`
      : "";

  return `
    <button
      type="button"
      class="conversation-item chat-conversation ${active ? "active" : ""}"
      data-conversation="${escapeHtml(id)}"
      aria-pressed="${active}"
    >
      ${renderChatAvatar(name, "chat-avatar-sm")}
      <span class="chat-conversation-body">
        <span class="chat-conversation-top">
          <strong class="chat-conversation-name">${escapeHtml(name)}</strong>
          ${time ? `<time class="chat-conversation-time">${escapeHtml(time)}</time>` : ""}
        </span>
        <span class="chat-conversation-preview">${escapeHtml(preview)}</span>
      </span>
      ${unreadBadge}
    </button>
  `;
}

/**
 * @param {object} options
 */
export function renderChatHeader({ name, subtitle = "", icon = "💬" }) {
  return `
    <header class="chat-header">
      ${renderChatAvatar(name)}
      <div class="chat-header-text">
        <h2 class="chat-header-name">${escapeHtml(name)}</h2>
        ${subtitle ? `<p class="chat-header-sub">${escapeHtml(subtitle)}</p>` : ""}
      </div>
      <span class="chat-header-icon" aria-hidden="true">${icon}</span>
    </header>
  `;
}

/**
 * @param {object} msg
 * @param {boolean} isSent
 */
export function renderChatBubble(msg, isSent) {
  const rowClass = isSent ? "sent" : "received";
  const bubbleClass = isSent ? "sent" : "received";

  return `
    <div class="chat-bubble-row ${rowClass}">
      <div class="chat-bubble message-bubble ${bubbleClass}">
        <p class="chat-bubble-text">${escapeHtml(msg.body || "")}</p>
        <time class="chat-bubble-time">${escapeHtml(formatShortTime(msg.createdAt))}</time>
      </div>
    </div>
  `;
}

/**
 * @param {object} options
 */
export function renderChatCompose({ inputId = "messageInput", sendId = "sendBtn", compact = false } = {}) {
  const btnClass = compact
    ? "chat-send-btn patient-btn-primary patient-btn-compact"
    : "chat-send-btn ncms-btn-primary";

  return `
    <div class="message-compose chat-compose">
      <div class="chat-compose-field">
        <input
          id="${escapeHtml(inputId)}"
          type="text"
          class="form-input chat-compose-input"
          placeholder="${escapeHtml(t("forms.messagePlaceholder"))}"
          autocomplete="off"
        />
      </div>
      <button type="button" id="${escapeHtml(sendId)}" class="${btnClass}" aria-label="${escapeHtml(t("buttons.send"))}">
        <span class="chat-send-icon" aria-hidden="true">➤</span>
        <span class="chat-send-label">${escapeHtml(t("buttons.send"))}</span>
      </button>
    </div>
  `;
}

/**
 * @param {object} options
 */
export function renderChatEmpty({ title, subtitle, icon = "💬" }) {
  return `
    <div class="chat-empty">
      <span class="chat-empty-icon" aria-hidden="true">${icon}</span>
      <h3>${escapeHtml(title)}</h3>
      ${subtitle ? `<p>${escapeHtml(subtitle)}</p>` : ""}
    </div>
  `;
}

/**
 * Sidebar empty state.
 */
export function renderConversationsEmpty() {
  return renderChatEmpty({
    title: t("pages.messages.noConversations"),
    subtitle: t("chat.emptyHint"),
    icon: "👥",
  });
}
