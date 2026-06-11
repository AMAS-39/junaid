import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal, confirmModal } from "../../components/modal.js";
import { getQueryParam, escapeHtml, formatDate } from "../../utils/format.js";
import { formatFirestoreError } from "../../utils/firestore-error.js";
import { groupRemindersByTime } from "../../utils/medicine-time.js";
import {
  uploadMedicineDocument,
  listMedicineDocuments,
  getMedicineDocumentUrl,
  getCategoryLabel,
} from "../../services/medicine-document.service.js";
import { StorageService } from "../../services/storage.service.js";

let doctorId = null;
let patientId = null;
let reminders = [];
let papers = [];

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    doctorId = session.user.uid;
    patientId = getQueryParam("patientId");

    if (!patientId) {
      toast.error("Patient ID is required.");
      return;
    }

    document.getElementById("reminderForm")?.addEventListener("submit", handleAddReminder);
    document.getElementById("paperUploadForm")?.addEventListener("submit", handlePaperUpload);

    const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);
    const subtitle = document.getElementById("patientSubtitle");
    if (subtitle && patient) {
      subtitle.textContent = `${patient.fullName || "Patient"} — reminders and papers`;
    }

    await loadReminders();
    await loadPapers();
  },
});

async function loadReminders() {
  showLoading("Loading reminders...");

  try {
    reminders = await FirestoreService.query(COLLECTIONS.MEDICINE_REMINDERS, [
      ["patientId", "==", patientId],
    ]);
    renderReminders();
  } catch (error) {
    console.error(error);
    toast.error(formatFirestoreError(error));
  } finally {
    hideLoading();
  }
}

function renderReminders() {
  const listEl = document.getElementById("remindersList");
  const emptyState = document.getElementById("emptyState");
  if (!listEl) return;

  if (reminders.length === 0) {
    listEl.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");
  const groups = groupRemindersByTime(reminders);

  listEl.innerHTML = groups
    .map(
      (group) => `
      <section class="medicine-time-group">
        <h3 class="medicine-time-heading">
          <span class="medicine-time-badge">${escapeHtml(group.time)}</span>
        </h3>
        <div class="medicine-cards-stack">
          ${group.items.map((r) => reminderCard(r)).join("")}
        </div>
      </section>
    `
    )
    .join("");

  listEl.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.edit));
  });
  listEl.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => deleteReminder(btn.dataset.delete));
  });
}

function reminderCard(reminder) {
  const status = reminder.status || "active";
  const statusClass = status === "active" ? "approved" : "old";

  return `
    <article class="medicine-reminder-card">
      <div class="medicine-reminder-top">
        <h4 class="medicine-reminder-name">${escapeHtml(reminder.medicineName || "Medicine")}</h4>
        <span class="status-badge status-${statusClass}">${escapeHtml(status)}</span>
      </div>
      <p class="medicine-reminder-dosage"><strong>Dosage:</strong> ${escapeHtml(reminder.dosage || "—")}</p>
      <p class="medicine-reminder-time-inline">
        <span class="medicine-time-badge small">${escapeHtml(reminder.time || "—")}</span>
      </p>
      ${reminder.instructions ? `<p class="medicine-reminder-instructions">${escapeHtml(reminder.instructions)}</p>` : ""}
      <div class="btn-row mt-3">
        <button type="button" class="btn-sm btn-sm-secondary" data-edit="${escapeHtml(reminder.id)}">Edit</button>
        <button type="button" class="btn-sm btn-sm-danger" data-delete="${escapeHtml(reminder.id)}">Delete</button>
      </div>
    </article>
  `;
}

async function handleAddReminder(e) {
  e.preventDefault();

  const medicineName = document.getElementById("medicineName").value.trim();
  const dosage = document.getElementById("dosage").value.trim();
  const time = document.getElementById("time").value.trim();
  const instructions = document.getElementById("instructions").value.trim();
  const status = document.getElementById("status").value;
  const saveBtn = document.getElementById("saveBtn");

  if (!medicineName || !dosage || !time) {
    toast.error("Medicine name, dosage, and time are required.");
    return;
  }

  saveBtn.disabled = true;
  showLoading("Adding reminder...");

  try {
    await FirestoreService.create(COLLECTIONS.MEDICINE_REMINDERS, {
      patientId,
      doctorId,
      medicineName,
      dosage,
      time,
      instructions,
      status,
      updatedAt: FirestoreService.serverTimestamp(),
    });
    toast.success("Reminder added.");
    e.target.reset();
    await loadReminders();
  } catch (error) {
    console.error(error);
    toast.error(formatFirestoreError(error));
  } finally {
    saveBtn.disabled = false;
    hideLoading();
  }
}

function openEditModal(reminderId) {
  const reminder = reminders.find((r) => r.id === reminderId);
  if (!reminder) {
    toast.error("Reminder not found.");
    return;
  }

  openModal({
    title: "Edit Reminder",
    body: `
      <div class="form-group mb-3">
        <label for="editMedicineName">Medicine / supplement</label>
        <input id="editMedicineName" type="text" class="form-input" value="${escapeHtml(reminder.medicineName || "")}" />
      </div>
      <div class="form-group mb-3">
        <label for="editDosage">Dosage</label>
        <input id="editDosage" type="text" class="form-input" value="${escapeHtml(reminder.dosage || "")}" />
      </div>
      <div class="form-group mb-3">
        <label for="editTime">Time</label>
        <input id="editTime" type="text" class="form-input" value="${escapeHtml(reminder.time || "")}" />
      </div>
      <div class="form-group mb-3">
        <label for="editStatus">Status</label>
        <select id="editStatus" class="form-input">
          <option value="active" ${reminder.status === "active" ? "selected" : ""}>Active</option>
          <option value="inactive" ${reminder.status === "inactive" ? "selected" : ""}>Inactive</option>
        </select>
      </div>
      <div class="form-group">
        <label for="editInstructions">Instructions</label>
        <textarea id="editInstructions" class="form-textarea" rows="3"></textarea>
      </div>
    `,
    confirmText: "Save Changes",
    onConfirm: async () => {
      const medicineName = document.getElementById("editMedicineName").value.trim();
      const dosage = document.getElementById("editDosage").value.trim();
      const time = document.getElementById("editTime").value.trim();
      const instructions = document.getElementById("editInstructions").value.trim();
      const status = document.getElementById("editStatus").value;

      if (!medicineName || !dosage || !time) {
        toast.error("Medicine name, dosage, and time are required.");
        return;
      }

      showLoading("Updating reminder...");
      try {
        await FirestoreService.update(COLLECTIONS.MEDICINE_REMINDERS, reminderId, {
          medicineName,
          dosage,
          time,
          instructions,
          status,
        });
        toast.success("Reminder updated.");
        await loadReminders();
      } catch (error) {
        console.error(error);
        toast.error(formatFirestoreError(error));
      } finally {
        hideLoading();
      }
    },
  });

  const instructionsEl = document.getElementById("editInstructions");
  if (instructionsEl) instructionsEl.value = reminder.instructions || "";
}

async function deleteReminder(reminderId) {
  const reminder = reminders.find((r) => r.id === reminderId);
  const confirmed = await confirmModal(
    "Delete Reminder",
    `Delete "${reminder?.medicineName || "this reminder"}"? This cannot be undone.`
  );
  if (!confirmed) return;

  showLoading("Deleting...");
  try {
    await FirestoreService.remove(COLLECTIONS.MEDICINE_REMINDERS, reminderId);
    toast.success("Reminder deleted.");
    await loadReminders();
  } catch (error) {
    console.error(error);
    toast.error(formatFirestoreError(error));
  } finally {
    hideLoading();
  }
}

async function loadPapers() {
  const countEl = document.getElementById("papersCount");
  if (countEl) countEl.textContent = "Loading…";

  try {
    clearPapersError();
    papers = await listMedicineDocuments(patientId);
    renderPapers();
  } catch (error) {
    console.error(error);
    const message = formatFirestoreError(error);
    showPapersError(message);
    toast.error(message);
    renderPapers();
  }
}

function clearPapersError() {
  const errorEl = document.getElementById("papersLoadError");
  if (!errorEl) return;
  errorEl.textContent = "";
  errorEl.classList.add("hidden");
}

function showPapersError(message) {
  const errorEl = document.getElementById("papersLoadError");
  if (!errorEl) return;
  errorEl.textContent = message;
  errorEl.classList.remove("hidden");
}

function showPapersTab() {
  const radio = document.getElementById("medicineViewPapers");
  if (radio) radio.checked = true;
}

function renderPapers() {
  const listEl = document.getElementById("papersList");
  const emptyEl = document.getElementById("papersEmpty");
  const countEl = document.getElementById("papersCount");
  if (!listEl) return;

  const count = papers.length;
  if (countEl) countEl.textContent = count === 1 ? "1 file" : `${count} files`;

  if (count === 0) {
    listEl.innerHTML = "";
    emptyEl?.classList.remove("hidden");
    return;
  }

  emptyEl?.classList.add("hidden");
  listEl.innerHTML = papers.map((doc) => paperCard(doc)).join("");

  listEl.querySelectorAll("[data-view-paper]").forEach((btn) => {
    btn.addEventListener("click", () => previewPaper(btn.dataset.viewPaper));
  });
  listEl.querySelectorAll("[data-delete-paper]").forEach((btn) => {
    btn.addEventListener("click", () => deletePaper(btn.dataset.deletePaper));
  });
}

function paperCard(doc) {
  return `
    <article class="medicine-paper-card">
      <div class="medicine-paper-top">
        <h4 class="medicine-paper-title">${escapeHtml(doc.title || doc.fileName || "Document")}</h4>
        <span class="medicine-paper-type">${escapeHtml(getCategoryLabel(doc))}</span>
      </div>
      ${doc.note ? `<p class="medicine-paper-note">${escapeHtml(doc.note)}</p>` : ""}
      <p class="medicine-paper-meta">${escapeHtml(formatDate(doc.createdAt))} · ${escapeHtml(doc.fileName || "")}</p>
      <div class="btn-row mt-3">
        <button type="button" class="btn-sm btn-sm-primary" data-view-paper="${escapeHtml(doc.id)}">View</button>
        <button type="button" class="btn-sm btn-sm-danger" data-delete-paper="${escapeHtml(doc.id)}">Delete</button>
      </div>
    </article>
  `;
}

async function handlePaperUpload(e) {
  e.preventDefault();
  const file = document.getElementById("paperFile")?.files?.[0];
  const title = document.getElementById("paperTitle").value;
  const category = document.getElementById("paperCategory").value;
  const note = document.getElementById("paperNote").value;
  const btn = document.getElementById("paperUploadBtn");

  if (!file) {
    toast.error("Please select a file.");
    return;
  }

  btn.disabled = true;
  showLoading("Uploading paper...");

  try {
    await uploadMedicineDocument({
      patientId,
      uploadedBy: doctorId,
      file,
      title,
      category,
      note,
    });
    toast.success("Paper uploaded and saved.");
    e.target.reset();
    showPapersTab();
    await loadPapers();
    document.querySelector(".medicine-papers-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    const message = error?.message || "Upload failed.";
    toast.error(message);
    showPapersError(message);
  } finally {
    btn.disabled = false;
    hideLoading();
  }
}

async function previewPaper(docId) {
  const doc = papers.find((d) => d.id === docId);
  if (!doc) return;

  showLoading("Opening document...");
  try {
    const url = await getMedicineDocumentUrl(doc);
    const isPdf = String(doc.mimeType || "").includes("pdf") || doc.fileName?.toLowerCase().endsWith(".pdf");

    openModal({
      title: doc.title || "Medicine Paper",
      body: isPdf
        ? `<p class="mb-3"><a href="${url}" target="_blank" rel="noopener" class="text-medical-600 font-semibold">Open PDF in new tab</a></p>`
        : `<img src="${url}" alt="Document" class="photo-preview-img" />`,
      showCancel: false,
      confirmText: "Close",
      onConfirm: () => {},
    });
  } catch (error) {
    console.error(error);
    toast.error(error?.message || "Could not open document.");
  } finally {
    hideLoading();
  }
}

async function deletePaper(docId) {
  const doc = papers.find((d) => d.id === docId);
  const confirmed = await confirmModal("Delete Paper", `Delete "${doc?.title || "this file"}"?`);
  if (!confirmed) return;

  showLoading("Deleting...");
  try {
    await FirestoreService.remove(COLLECTIONS.MEDICINE_DOCUMENTS, docId);
    if (doc?.bucket && doc?.filePath) {
      try {
        await StorageService.remove(doc.bucket, [doc.filePath]);
      } catch {
        /* metadata removed */
      }
    }
    toast.success("Paper deleted.");
    await loadPapers();
  } catch (error) {
    console.error(error);
    toast.error(formatFirestoreError(error));
  } finally {
    hideLoading();
  }
}
