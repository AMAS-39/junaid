import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal, confirmModal } from "../../components/modal.js";
import { escapeHtml, formatDate } from "../../utils/format.js";
import { formatFirestoreError } from "../../utils/firestore-error.js";
import { groupRemindersByTime } from "../../utils/medicine-time.js";
import {
  uploadMedicineDocument,
  listMedicineDocuments,
  getMedicineDocumentUrl,
  getCategoryLabel,
} from "../../services/medicine-document.service.js";
import { StorageService } from "../../services/storage.service.js";

let patientId = null;
let papers = [];

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    patientId = session.user.uid;
    document.getElementById("paperUploadForm")?.addEventListener("submit", handlePaperUpload);
    await loadSchedule(patientId);
    await loadPapers();
  },
});

async function loadSchedule(patientId) {
  const container = document.getElementById("medicineSchedule");
  const emptyState = document.getElementById("emptyState");

  showLoading(t("loading.schedule"));

  try {
    let reminders = await FirestoreService.query(COLLECTIONS.MEDICINE_REMINDERS, [
      ["patientId", "==", patientId],
    ]);
    reminders = reminders.filter((r) => r.status === "active");

    if (reminders.length === 0) {
      if (container) container.innerHTML = "";
      emptyState?.classList.remove("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    const groups = groupRemindersByTime(reminders);

    if (container) {
      container.innerHTML = groups
        .map(
          (group) => `
          <section class="medicine-time-group">
            <h2 class="medicine-time-heading">
              <span class="medicine-time-badge">${escapeHtml(group.time)}</span>
            </h2>
            <div class="medicine-cards-stack">
              ${group.items.map((r) => patientReminderCard(r)).join("")}
            </div>
          </section>
        `
        )
        .join("");
    }
  } catch (error) {
    console.error(error);
    toast.error(formatFirestoreError(error));
    if (container) container.innerHTML = "";
    emptyState?.classList.remove("hidden");
  } finally {
    hideLoading();
  }
}

function patientReminderCard(reminder) {
  return `
    <article class="medicine-reminder-card patient">
      <h3 class="medicine-reminder-name">${escapeHtml(reminder.medicineName || t("medicine.medicineType"))}</h3>
      <p class="medicine-reminder-dosage-large">${escapeHtml(reminder.dosage || t("labels.emDash"))}</p>
      ${reminder.instructions ? `
        <p class="medicine-reminder-instructions">
          <span class="medicine-instructions-label">${escapeHtml(t("forms.instructions"))}</span>
          ${escapeHtml(reminder.instructions)}
        </p>
      ` : ""}
    </article>
  `;
}

async function loadPapers() {
  const countEl = document.getElementById("papersCount");
  if (countEl) countEl.textContent = t("common.loading");

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
  if (countEl) {
    countEl.textContent =
      count === 1 ? t("doctor.oneFile") : `${count} ${t("medicine.filesCount")}`;
  }

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
  const canDelete = doc.uploadedBy === patientId;
  return `
    <article class="medicine-paper-card">
      <div class="medicine-paper-top">
        <h4 class="medicine-paper-title">${escapeHtml(doc.title || doc.fileName || t("pages.medicine.document"))}</h4>
        <span class="medicine-paper-type">${escapeHtml(getCategoryLabel(doc))}</span>
      </div>
      ${doc.note ? `<p class="medicine-paper-note">${escapeHtml(doc.note)}</p>` : ""}
      <p class="medicine-paper-meta">${escapeHtml(formatDate(doc.createdAt))}</p>
      <div class="btn-row mt-3">
        <button type="button" class="btn-sm btn-sm-primary" data-view-paper="${escapeHtml(doc.id)}">${escapeHtml(t("buttons.view"))}</button>
        ${canDelete ? `<button type="button" class="btn-sm btn-sm-danger" data-delete-paper="${escapeHtml(doc.id)}">${escapeHtml(t("buttons.delete"))}</button>` : ""}
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
    toast.error(t("toast.selectFile"));
    return;
  }

  btn.disabled = true;
  showLoading(t("loading.uploading"));

  try {
    await uploadMedicineDocument({
      patientId,
      uploadedBy: patientId,
      file,
      title,
      category,
      note,
    });
    toast.success(t("toast.paperUploaded"));
    e.target.reset();
    showPapersTab();
    await loadPapers();
    document.querySelector(".medicine-papers-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    console.error(error);
    const message = error?.message || t("toast.uploadFailed");
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

  showLoading(t("loading.opening"));
  try {
    const url = await getMedicineDocumentUrl(doc);
    const isPdf = String(doc.mimeType || "").includes("pdf") || doc.fileName?.toLowerCase().endsWith(".pdf");

    openModal({
      title: doc.title || t("pages.medicine.medicinePaper"),
      body: isPdf
        ? `<p><a href="${url}" target="_blank" rel="noopener" class="ncms-btn-primary inline-block px-4 py-2 rounded-xl no-underline">${escapeHtml(t("buttons.openPdf"))}</a></p>`
        : `<img src="${url}" alt="${escapeHtml(t("pages.medicine.document"))}" class="photo-preview-img" />`,
      showCancel: false,
      confirmText: t("common.close"),
      onConfirm: () => {},
    });
  } catch (error) {
    console.error(error);
    toast.error(error?.message || t("toast.couldNotOpenFile"));
  } finally {
    hideLoading();
  }
}

async function deletePaper(docId) {
  const confirmed = await confirmModal(t("modal.deletePaper"), t("modal.removeFileConfirm"));
  if (!confirmed) return;

  const doc = papers.find((d) => d.id === docId);
  showLoading(t("loading.deleting"));
  try {
    await FirestoreService.remove(COLLECTIONS.MEDICINE_DOCUMENTS, docId);
    if (doc?.bucket && doc?.filePath) {
      try {
        await StorageService.remove(doc.bucket, [doc.filePath]);
      } catch {
        /* ignore */
      }
    }
    toast.success(t("toast.deleteSuccess"));
    await loadPapers();
  } catch (error) {
    console.error(error);
    toast.error(formatFirestoreError(error));
  } finally {
    hideLoading();
  }
}
