import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { getQueryParam, formatDateTime, escapeHtml } from "../../utils/format.js";

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
    bindCompose();
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
    list.innerHTML = `<p class="text-sm text-slate-500 p-3">No conversations yet.</p>`;
    return;
  }

  list.innerHTML = conversations
    .map((c) => {
      const patient = patientsMap[c.patientId];
      const active = c.patientId === activePatientId ? "active" : "";
      const preview = escapeHtml(String(c.lastMessage.body || "").slice(0, 40));
      const unread = c.unread > 0 ? `<span class="status-badge status-pending">${c.unread}</span>` : "";

      return `
        <div class="conversation-item ${active}" data-conversation="${escapeHtml(c.patientId)}">
          <strong>${escapeHtml(patient?.fullName || "Patient")}</strong>
          <p class="text-xs text-slate-500 mt-1">${preview}</p>
          ${unread}
        </div>
      `;
    })
    .join("");

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
    panel.innerHTML = `<p class="text-slate-500 text-center py-12">Select a conversation to view messages.</p>`;
  }
}

function renderThread() {
  const panel = document.getElementById("messagesPanel");
  if (!panel || !activePatientId) return;

  const patient = patientsMap[activePatientId];
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

  panel.innerHTML = `
    <div class="mb-3">
      <strong>${escapeHtml(patient?.fullName || "Patient")}</strong>
    </div>
    <div class="messages-thread" id="messagesThread">
      ${thread.length === 0 ? `<p class="text-slate-500 text-sm">No messages yet. Send the first message.</p>` : ""}
      ${thread.map((m) => messageBubble(m)).join("")}
    </div>
    <div class="message-compose">
      <input id="messageInput" type="text" class="form-input" placeholder="${t("forms.messagePlaceholder")}" />
      <button type="button" id="sendBtn" class="ncms-btn-primary px-4">${t("buttons.send")}</button>
    </div>
  `;

  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("messageInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  markMessagesRead(activePatientId);
}

function messageBubble(msg) {
  const isSent = msg.senderId === doctorId;
  return `
    <div class="message-bubble ${isSent ? "sent" : "received"}">
      ${escapeHtml(msg.body)}
      <div class="text-xs opacity-70 mt-1">${escapeHtml(formatDateTime(msg.createdAt))}</div>
    </div>
  `;
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

function bindCompose() {
  /* handled per thread render */
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
