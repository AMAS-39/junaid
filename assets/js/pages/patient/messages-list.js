import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import {
  renderChatHeader,
  renderChatBubble,
  renderChatCompose,
} from "../../components/chat-ui.js";
import { getAssignedDoctorId, tsMillis } from "./patient-helpers.js";
import { patientEmptyStateHtml } from "../../components/patient-ui.js";

let patientId = null;
let doctorId = null;
let doctorName = "";
let allMessages = [];

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    patientId = session.user.uid;
    doctorId = await getAssignedDoctorId(patientId);

    if (!doctorId) {
      document.getElementById("messagesPanel").innerHTML = patientEmptyStateHtml({
        icon: "💬",
        title: t("empty.noDoctor"),
        message: t("empty.noDoctorHint"),
        hint: t("patient.clinicHours"),
      });
      return;
    }

    const doctor = await FirestoreService.getById(COLLECTIONS.USERS, doctorId);
    doctorName = doctor?.fullName || t("roles.doctor");

    await loadMessages();
  },
});

async function loadMessages() {
  const panel = document.getElementById("messagesPanel");
  showLoading(t("loading.messages"));

  try {
    const sent = await FirestoreService.query(COLLECTIONS.MESSAGES, [
      ["senderId", "==", patientId],
    ]);
    const received = await FirestoreService.query(COLLECTIONS.MESSAGES, [
      ["receiverId", "==", patientId],
    ]);

    allMessages = [...sent, ...received]
      .filter(
        (m) =>
          (m.senderId === patientId && m.receiverId === doctorId) ||
          (m.senderId === doctorId && m.receiverId === patientId)
      )
      .sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt));

    renderThread(panel);
    markRead();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadMessages"));
  } finally {
    hideLoading();
  }
}

function renderThread(panel) {
  const threadHtml =
    allMessages.length === 0
      ? patientEmptyStateHtml({
          icon: "💬",
          title: t("empty.noMessages"),
          message: t("empty.noMessagesHint"),
          hint: t("patient.clinicHours"),
        })
      : allMessages.map((m) => renderChatBubble(m, m.senderId === patientId)).join("");

  panel.innerHTML = `
    <div class="chat-shell chat-panel-shell">
      ${renderChatHeader({
        name: doctorName,
        subtitle: t("patient.clinicHours"),
      })}
      <div class="messages-thread chat-thread" id="messagesThread">${threadHtml}</div>
      ${renderChatCompose({ compact: true })}
    </div>
  `;

  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("messageInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  const thread = document.getElementById("messagesThread");
  if (thread && allMessages.length > 0) thread.scrollTop = thread.scrollHeight;
}

async function markRead() {
  const unread = allMessages.filter((m) => m.senderId === doctorId && !m.read);
  for (const msg of unread) {
    try {
      await FirestoreService.update(COLLECTIONS.MESSAGES, msg.id, { read: true });
      msg.read = true;
    } catch {
      /* ignore */
    }
  }
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const body = input?.value.trim();
  if (!body || !doctorId) return;

  showLoading(t("loading.sending"));
  try {
    await FirestoreService.create(COLLECTIONS.MESSAGES, {
      senderId: patientId,
      receiverId: doctorId,
      patientId,
      body,
      read: false,
    });

    allMessages.push({
      senderId: patientId,
      receiverId: doctorId,
      body,
      createdAt: { toMillis: () => Date.now() },
    });

    input.value = "";
    renderThread(document.getElementById("messagesPanel"));
    toast.success(t("toast.messageSent"));
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedSendMessage"));
  } finally {
    hideLoading();
  }
}
