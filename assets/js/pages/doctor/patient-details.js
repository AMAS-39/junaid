import { bootstrap } from "../../core/bootstrap.js";
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
    const backBtn = document.getElementById("backBtn");
    const patientId = getQueryParam("id");

    backBtn?.addEventListener("click", () => {
      window.location.href = "list.html";
    });

    if (!patientId) {
      toast.error("Patient ID is missing.");
      if (patientDetails) {
        patientDetails.innerHTML = emptyBlock("Missing patient ID", "No patient was specified.");
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
  showLoading("Loading patient...");

  try {
    const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);

    if (!patient) {
      container.innerHTML = emptyBlock("Patient not found", "This patient record does not exist.");
      return;
    }

    renderPatient(patient, container);
    document.getElementById("doctorNotesSection")?.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    toast.error("Failed to load patient details.");
    container.innerHTML = emptyBlock("Error", "Could not load patient details.");
  } finally {
    hideLoading();
  }
}

function renderPatient(patient, container) {
  const fullName = escapeHtml(patient.fullName || "Unnamed Patient");
  const phone = escapeHtml(patient.phone || "No phone");
  const email = escapeHtml(patient.email || "No email");
  const gender = escapeHtml(patient.gender || "N/A");
  const age = patient.age ?? "N/A";
  const height = patient.height ?? "N/A";
  const currentWeight = patient.currentWeight ?? "N/A";
  const targetWeight = patient.targetWeight ?? "N/A";
  const bmi = calculateBMI(patient.height, patient.currentWeight);
  const bmiDisplay = bmi ? bmi : "N/A";
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
      ${infoCard("Age", age)}
      ${infoCard("Gender", gender)}
      ${infoCard("Height", `${height} cm`)}
      ${infoCard("Current Weight", `${currentWeight} kg`)}
      ${infoCard("Target Weight", `${targetWeight} kg`)}
      ${infoCard("BMI", bmiDisplay)}
    </section>

    <section class="action-grid">
      ${actionCard("Create Diet Plan", "Add nutrition plan for this patient", "🥗", `../diet-plans/create.html?patientId=${pid}`)}
      ${actionCard("Progress", "View weight and body changes", "📈", `../progress/list.html?patientId=${pid}`)}
      ${actionCard("Photos", "Medicine, meal, lab and progress photos", "📷", `../photos/list.html?patientId=${pid}`)}
      ${actionCard("Appointments", "View patient appointments", "📅", `../appointments/list.html?patientId=${pid}`)}
      ${actionCard("Messages", "Open patient conversation", "💬", `../messages/list.html?patientId=${pid}`)}
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
    container.innerHTML = `<p class="daily-compliance-error">Could not load today's compliance.</p>`;
    section.classList.remove("hidden");
  }
}

function bindDoctorNotes() {
  const saveBtn = document.getElementById("saveNoteBtn");
  saveBtn?.addEventListener("click", saveNewNote);
}

async function loadDoctorNotes() {
  if (!currentPatientId || !currentDoctorId) return;

  showLoading("Loading notes...");

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
    toast.error("Failed to load private notes.");
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
          <button type="button" class="btn-sm btn-sm-secondary" data-edit-note="${escapeHtml(note.id)}">Edit</button>
          <button type="button" class="btn-sm btn-sm-danger" data-delete-note="${escapeHtml(note.id)}">Delete</button>
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
    toast.error("Please enter a note before saving.");
    return;
  }

  if (!currentPatientId || !currentDoctorId) return;

  saveBtn.disabled = true;
  const originalLabel = saveBtn.textContent;
  saveBtn.textContent = "Saving...";
  showLoading("Saving note...");

  try {
    await FirestoreService.create(COLLECTIONS.DOCTOR_NOTES, {
      patientId: currentPatientId,
      doctorId: currentDoctorId,
      note: text,
      updatedAt: FirestoreService.serverTimestamp(),
    });

    toast.success("Private note saved.");
    if (input) input.value = "";
    await loadDoctorNotes();
  } catch (error) {
    console.error(error);
    toast.error("Failed to save note.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = originalLabel;
    hideLoading();
  }
}

function editNote(noteId) {
  const note = doctorNotes.find((n) => n.id === noteId);
  if (!note) {
    toast.error("Note not found.");
    return;
  }

  openModal({
    title: "Edit Private Note",
    body: `
      <label for="editNoteInput" class="form-label">Note</label>
      <textarea id="editNoteInput" class="form-textarea" rows="5"></textarea>
    `,
    confirmText: "Update Note",
    onConfirm: async () => {
      const input = document.getElementById("editNoteInput");
      const text = input?.value?.trim() || "";

      if (!text) {
        toast.error("Note cannot be empty.");
        return;
      }

      showLoading("Updating note...");

      try {
        await FirestoreService.update(COLLECTIONS.DOCTOR_NOTES, noteId, { note: text });
        toast.success("Note updated.");
        await loadDoctorNotes();
      } catch (error) {
        console.error(error);
        toast.error("Failed to update note.");
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
    toast.error("Note not found.");
    return;
  }

  const confirmed = await confirmModal(
    "Delete Private Note",
    "Are you sure you want to delete this note? This cannot be undone."
  );

  if (!confirmed) return;

  showLoading("Deleting note...");

  try {
    await FirestoreService.remove(COLLECTIONS.DOCTOR_NOTES, noteId);
    toast.success("Note deleted.");
    await loadDoctorNotes();
  } catch (error) {
    console.error(error);
    toast.error("Failed to delete note.");
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
