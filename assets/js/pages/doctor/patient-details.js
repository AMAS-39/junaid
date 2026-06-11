import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal, confirmModal } from "../../components/modal.js";
import { getQueryParam, calculateBMI, escapeHtml, formatDateTime } from "../../utils/format.js";
import { getTodayChecklist, getTodayDateString } from "../../services/daily-checklist.service.js";
import { renderDoctorCompliance } from "../patient/checklist-ui.js";

let currentPatientId = null;
let currentDoctorId = null;
let doctorNotes = [];

bootstrap({
  onReady: async (session) => {
    const patientDetails = document.getElementById("patientDetails");
    const patientId = getQueryParam("id");

    if (!patientId) {
      toast.error(t("toast.patientIdMissing"));
      if (patientDetails) {
        patientDetails.innerHTML = emptyBlock(t("doctor.missingId"), t("doctor.noPatientSpecified"));
      }
      return;
    }

    if (!session?.user?.uid) return;

    currentPatientId = patientId;
    currentDoctorId = session.user.uid;

    await loadPatient(patientId, patientDetails);
    await loadDailyCompliance(patientId);
    bindDoctorNotes();
    await loadDoctorNotes();
  },
});

async function loadPatient(patientId, container) {
  showLoading(t("loading.patient"));

  try {
    const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);

    if (!patient) {
      container.innerHTML = emptyBlock(t("doctor.patientNotFound"), t("doctor.patientNotFoundHint"));
      return;
    }

    renderPatient(patient, container);
    document.getElementById("doctorNotesSection")?.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadPatient"));
    container.innerHTML = emptyBlock(t("toast.failed"), t("doctor.errorLoading"));
  } finally {
    hideLoading();
  }
}

function renderPatient(patient, container) {
  const fullName = escapeHtml(patient.fullName || t("doctor.unnamedPatient"));
  const phone = escapeHtml(patient.phone || t("doctor.noPhone"));
  const email = escapeHtml(patient.email || t("doctor.noEmail"));
  const gender = escapeHtml(patient.gender || t("common.notFound"));
  const na = t("common.notFound");
  const age = patient.age ?? na;
  const height = patient.height ?? na;
  const currentWeight = patient.currentWeight ?? na;
  const targetWeight = patient.targetWeight ?? na;
  const bmi = calculateBMI(patient.height, patient.currentWeight);
  const bmiDisplay = bmi ? bmi : na;
  const pid = escapeHtml(patient.id);

  container.innerHTML = `
    <section class="details-header-card">
      <div class="patient-avatar large">${fullName.charAt(0).toUpperCase()}</div>
      <div>
        <h1>${fullName}</h1>
        <p>${email}</p>
        <p>${phone}</p>
      </div>
    </section>

    <section class="details-grid">
      ${infoCard(t("doctor.age"), age)}
      ${infoCard(t("doctor.gender"), gender)}
      ${infoCard(t("doctor.heightLabel"), `${height} cm`)}
      ${infoCard(t("doctor.currentWeight"), `${currentWeight} kg`)}
      ${infoCard(t("doctor.targetWeight"), `${targetWeight} kg`)}
      ${infoCard(t("doctor.bmi"), bmiDisplay)}
    </section>

    <section class="action-grid">
      ${actionCard(t("doctor.createDietPlanAction"), t("doctor.createDietPlanDesc"), "🥗", `../diet-plans/create.html?patientId=${pid}`)}
      ${actionCard(t("doctor.progressAction"), t("doctor.progressActionDesc"), "📈", `../progress/list.html?patientId=${pid}`)}
      ${actionCard(t("doctor.photosAction"), t("doctor.photosActionDesc"), "📷", `../photos/list.html?patientId=${pid}`)}
      ${actionCard(t("doctor.appointmentsAction"), t("doctor.appointmentsActionDesc"), "📅", `../appointments/list.html?patientId=${pid}`)}
      ${actionCard(t("doctor.messagesAction"), t("doctor.messagesActionDesc"), "💬", `../messages/list.html?patientId=${pid}`)}
      ${actionCard(t("doctor.medicineAction"), t("doctor.medicineActionDesc"), "💊", `../medicine/list.html?patientId=${pid}`)}
    </section>
  `;
}

async function loadDailyCompliance(patientId) {
  const section = document.getElementById("dailyComplianceSection");
  const container = document.getElementById("dailyComplianceContent");

  if (!section || !container) return;

  try {
    const checklist = await getTodayChecklist(patientId);
    renderDoctorCompliance(container, checklist, getTodayDateString());
    section.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p class="daily-compliance-error">${escapeHtml(t("doctor.complianceLoadError"))}</p>`;
    section.classList.remove("hidden");
  }
}

function bindDoctorNotes() {
  const saveBtn = document.getElementById("saveNoteBtn");
  saveBtn?.addEventListener("click", saveNewNote);
}

async function loadDoctorNotes() {
  if (!currentPatientId || !currentDoctorId) return;

  showLoading(t("loading.notes"));

  try {
    doctorNotes = await FirestoreService.query(COLLECTIONS.DOCTOR_NOTES, [
      ["patientId", "==", currentPatientId],
      ["doctorId", "==", currentDoctorId],
    ]);

    doctorNotes.sort(
      (a, b) => tsMillis(b.updatedAt || b.createdAt) - tsMillis(a.updatedAt || a.createdAt)
    );

    renderDoctorNotes();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadNotes"));
  } finally {
    hideLoading();
  }
}

function renderDoctorNotes() {
  const listEl = document.getElementById("notesList");
  const emptyEl = document.getElementById("notesEmpty");

  if (!listEl || !emptyEl) return;

  if (doctorNotes.length === 0) {
    listEl.innerHTML = "";
    emptyEl.classList.remove("hidden");
    return;
  }

  emptyEl.classList.add("hidden");
  listEl.innerHTML = doctorNotes.map((note) => noteCard(note)).join("");

  listEl.querySelectorAll("[data-edit-note]").forEach((btn) => {
    btn.addEventListener("click", () => editNote(btn.dataset.editNote));
  });

  listEl.querySelectorAll("[data-delete-note]").forEach((btn) => {
    btn.addEventListener("click", () => deleteNote(btn.dataset.deleteNote));
  });
}

function noteCard(note) {
  const dateLabel = formatDateTime(note.updatedAt || note.createdAt);
  const text = escapeHtml(note.note || "");

  return `
    <article class="doctor-note-item">
      <div class="doctor-note-meta">
        <time class="doctor-note-date">${escapeHtml(dateLabel)}</time>
        <div class="doctor-note-actions">
          <button type="button" class="btn-sm btn-sm-secondary" data-edit-note="${escapeHtml(note.id)}">${escapeHtml(t("buttons.edit"))}</button>
          <button type="button" class="btn-sm btn-sm-danger" data-delete-note="${escapeHtml(note.id)}">${escapeHtml(t("buttons.delete"))}</button>
        </div>
      </div>
      <p class="doctor-note-text">${text}</p>
    </article>
  `;
}

async function saveNewNote() {
  const input = document.getElementById("newNoteInput");
  const saveBtn = document.getElementById("saveNoteBtn");
  const text = input?.value?.trim() || "";

  if (!text) {
    toast.error(t("toast.enterNote"));
    return;
  }

  if (!currentPatientId || !currentDoctorId) return;

  saveBtn.disabled = true;
  const originalLabel = saveBtn.textContent;
  saveBtn.textContent = t("loading.saving");
  showLoading(t("loading.savingNote"));

  try {
    await FirestoreService.create(COLLECTIONS.DOCTOR_NOTES, {
      patientId: currentPatientId,
      doctorId: currentDoctorId,
      note: text,
      updatedAt: FirestoreService.serverTimestamp(),
    });

    toast.success(t("toast.noteSaved"));
    if (input) input.value = "";
    await loadDoctorNotes();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedSaveNote"));
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalLabel;
    hideLoading();
  }
}

function editNote(noteId) {
  const note = doctorNotes.find((n) => n.id === noteId);
  if (!note) {
    toast.error(t("toast.noteNotFound"));
    return;
  }

  openModal({
    title: t("doctor.editPrivateNote"),
    body: `
      <label for="editNoteInput" class="form-label">${escapeHtml(t("forms.note"))}</label>
      <textarea id="editNoteInput" class="form-textarea" rows="5"></textarea>
    `,
    confirmText: t("doctor.updateNote"),
    onConfirm: async () => {
      const input = document.getElementById("editNoteInput");
      const text = input?.value?.trim() || "";

      if (!text) {
        toast.error(t("toast.noteEmpty"));
        return;
      }

      showLoading(t("loading.updating"));

      try {
        await FirestoreService.update(COLLECTIONS.DOCTOR_NOTES, noteId, { note: text });
        toast.success(t("toast.noteUpdated"));
        await loadDoctorNotes();
      } catch (error) {
        console.error(error);
        toast.error(t("toast.failedUpdateNote"));
      } finally {
        hideLoading();
      }
    },
  });

  const editInput = document.getElementById("editNoteInput");
  if (editInput) editInput.value = note.note || "";
}

async function deleteNote(noteId) {
  const note = doctorNotes.find((n) => n.id === noteId);
  if (!note) {
    toast.error(t("toast.noteNotFound"));
    return;
  }

  const confirmed = await confirmModal(
    t("doctor.deletePrivateNote"),
    t("doctor.deleteNoteConfirm")
  );

  if (!confirmed) return;

  showLoading(t("loading.deleting"));

  try {
    await FirestoreService.remove(COLLECTIONS.DOCTOR_NOTES, noteId);
    toast.success(t("toast.noteDeleted"));
    await loadDoctorNotes();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedDeleteNote"));
  } finally {
    hideLoading();
  }
}

function tsMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  return new Date(value).getTime() || 0;
}

function infoCard(label, value) {
  return `<div class="info-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function actionCard(title, desc, icon, link) {
  return `
    <a href="${link}" class="action-card">
      <div class="text-icon">${icon}</div>
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(desc)}</p>
    </a>
  `;
}

function emptyBlock(title, message) {
  return `
    <div class="empty-state">
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}
