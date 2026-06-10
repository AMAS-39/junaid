import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { getQueryParam, calculateBMI, escapeHtml } from "../../utils/format.js";

bootstrap({
  onReady: async () => {
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

    await loadPatient(patientId, patientDetails);
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
