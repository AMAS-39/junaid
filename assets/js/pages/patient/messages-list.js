import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { escapeHtml, formatDateTime } from "../../utils/format.js";
import { getAssignedDoctorId, tsMillis } from "./patient-helpers.js";

let patientId = null;
let doctorId = null;
let allMessages = [];

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    patientId = session.user.uid;
    doctorId = await getAssignedDoctorId(patientId);

    if (!doctorId) {
      document.getElementById("messagesPanel").innerHTML = `
        <p class="text-slate-500 text-center py-8">No doctor assigned yet. Contact the clinic.</p>
      `;
      return;
    }

    await loadMessages();
    bindSend();
  },
});

async function loadMessages() {
  const panel = document.getElementById("messagesPanel");
  showLoading("Loading messages...");

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
    toast.error("Failed to load messages.");
  } finally {
    hideLoading();
  }
}

function renderThread(panel) {
  panel.innerHTML = `
    <div class="messages-thread" id="messagesThread">
      ${allMessages.length === 0 ? `<p class="text-slate-500 text-sm">No messages yet. Send a message to your doctor.</p>` : ""}
      ${allMessages.map((m) => messageBubble(m)).join("")}
    </div>
    <div class="message-compose">
      <input id="messageInput" type="text" class="form-input" placeholder="Type your message..." />
      <button type="button" id="sendBtn" class="view-btn px-5">Send</button>
    </div>
  `;

  document.getElementById("sendBtn")?.addEventListener("click", sendMessage);
  document.getElementById("messageInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });

  const thread = document.getElementById("messagesThread");
  if (thread) thread.scrollTop = thread.scrollHeight;
}

function messageBubble(msg) {
  const isSent = msg.senderId === patientId;
  return `
    <div class="message-bubble ${isSent ? "sent" : "received"}">
      ${escapeHtml(msg.body)}
      <div class="text-xs opacity-70 mt-1">${escapeHtml(formatDateTime(msg.createdAt))}</div>
    </div>
  `;
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

function bindSend() {
  /* bound in renderThread */
}

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const body = input?.value.trim();
  if (!body || !doctorId) return;

  showLoading("Sending...");
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
    toast.success("Message sent.");
  } catch (error) {
    console.error(error);
    toast.error("Failed to send message.");
  } finally {
    hideLoading();
  }
}
