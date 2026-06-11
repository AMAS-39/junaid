import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import {
  renderConversationItem,
  renderChatHeader,
  renderChatBubble,
  renderChatCompose,
  renderChatEmpty,
  renderConversationsEmpty,
} from "../../components/chat-ui.js";
import { getQueryParam, escapeHtml, formatShortTime } from "../../utils/format.js";

let doctorId = null;
let patientsMap = {};
let conversations = [];
let activePatientId = null;
let allMessages = [];

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    doctorId = session.user.uid;
    activePatientId = getQueryParam("patientId");

    await loadData();
  },
});

async function loadData() {
  showLoading(t("loading.messages"));

  try {
    const patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
    patientsMap = Object.fromEntries(patients.map((p) => [p.id, p]));

    const sent = await FirestoreService.query(COLLECTIONS.MESSAGES, [
      ["senderId", "==", doctorId],
    ]);
    const received = await FirestoreService.query(COLLECTIONS.MESSAGES, [
      ["receiverId", "==", doctorId],
    ]);

    allMessages = [...sent, ...received].sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

    buildConversations();

    if (activePatientId && patientsMap[activePatientId]) {
      selectConversation(activePatientId);
    } else if (conversations.length > 0) {
      selectConversation(conversations[0].patientId);
    } else {
      renderConversationList();
      renderThreadEmpty();
    }
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadMessages"));
  } finally {
    hideLoading();
  }
}

function buildConversations() {
  const map = new Map();

  for (const msg of allMessages) {
    const otherId = msg.senderId === doctorId ? msg.receiverId : msg.senderId;
    if (!patientsMap[otherId]) continue;

    if (!map.has(otherId)) {
      map.set(otherId, { patientId: otherId, lastMessage: msg, unread: 0 });
    }

    if (msg.receiverId === doctorId && !msg.read) {
      map.get(otherId).unread += 1;
    }
  }

  conversations = Array.from(map.values()).sort((a, b) => {
    const ta = a.lastMessage.createdAt?.toMillis?.() ?? 0;
    const tb = b.lastMessage.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
}

function renderConversationList() {
  const list = document.getElementById("conversationList");
  if (!list) return;

  if (conversations.length === 0) {
    list.innerHTML = `<div class="chat-sidebar-list">${renderConversationsEmpty()}</div>`;
    return;
  }

  list.innerHTML = `
    <div class="chat-sidebar-head">
      <p class="chat-sidebar-title">${escapeHtml(t("chat.conversations"))}</p>
    </div>
    <div class="chat-sidebar-list">
      ${conversations
        .map((c) => {
          const patient = patientsMap[c.patientId];
          const name = patient?.fullName || t("labels.patient");
          const preview = String(c.lastMessage.body || "").slice(0, 48);
          const time = formatShortTime(c.lastMessage.createdAt);

          return renderConversationItem({
            id: c.patientId,
            name,
            preview: preview || t("chat.emptyHint"),
            time,
            unread: c.unread,
            active: c.patientId === activePatientId,
          });
        })
        .join("")}
    </div>
  `;

  list.querySelectorAll("[data-conversation]").forEach((el) => {
    el.addEventListener("click", () => selectConversation(el.dataset.conversation));
  });
}

function selectConversation(patientId) {
  activePatientId = patientId;
  renderConversationList();
  renderThread();
}

function renderThreadEmpty() {
  const panel = document.getElementById("messagesPanel");
  if (panel) {
    panel.innerHTML = renderChatEmpty({
      title: t("pages.messages.selectConversation"),
      subtitle: t("pages.messages.selectConversationHint"),
      icon: "💬",
    });
  }
}

function renderThread() {
  const panel = document.getElementById("messagesPanel");
  if (!panel || !activePatientId) return;

  const patient = patientsMap[activePatientId];
  const patientName = patient?.fullName || t("labels.patient");

  const thread = allMessages
    .filter(
      (m) =>
        (m.senderId === doctorId && m.receiverId === activePatientId) ||
        (m.senderId === activePatientId && m.receiverId === doctorId)
    )
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return ta - tb;
    });

  const threadHtml =
    thread.length === 0
      ? renderChatEmpty({
          title: t("pages.messages.noMessagesYet"),
          subtitle: t("chat.emptyHint"),
          icon: "✉️",
        })
      : thread.map((m) => renderChatBubble(m, m.senderId === doctorId)).join("");

  panel.innerHTML = `
    ${renderChatHeader({ name: patientName, subtitle: t("patient.messagesSub") })}
    <div class="messages-thread chat-thread" id="messagesThread">${threadHtml}</div>
    ${renderChatCompose()}
  `;

  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("messageInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  const threadEl = document.getElementById("messagesThread");
  if (threadEl && thread.length > 0) threadEl.scrollTop = threadEl.scrollHeight;

  markMessagesRead(activePatientId);
}

async function markMessagesRead(patientId) {
  const unread = allMessages.filter(
    (m) => m.senderId === patientId && m.receiverId === doctorId && !m.read
  );

  for (const msg of unread) {
    try {
      await FirestoreService.update(COLLECTIONS.MESSAGES, msg.id, { read: true });
      msg.read = true;
    } catch {
      /* ignore individual failures */
    }
  }
  buildConversations();
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const body = input?.value.trim();
  if (!body || !activePatientId) return;

  showLoading(t("loading.sending"));
  try {
    const id = await FirestoreService.create(COLLECTIONS.MESSAGES, {
      senderId: doctorId,
      receiverId: activePatientId,
      patientId: activePatientId,
      body,
      read: false,
    });

    allMessages.push({
      id,
      senderId: doctorId,
      receiverId: activePatientId,
      patientId: activePatientId,
      body,
      read: false,
      createdAt: { toMillis: () => Date.now() },
    });

    input.value = "";
    buildConversations();
    renderThread();
    toast.success(t("toast.messageSent"));
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedSendMessage"));
  } finally {
    hideLoading();
  }
}
