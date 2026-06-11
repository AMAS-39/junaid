import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { escapeHtml } from "../../utils/format.js";

let patients = [];

bootstrap({
  onReady: async () => {
    const patientsContainer = document.getElementById("patientsContainer");
    const searchInput = document.getElementById("searchInput");
    const emptyState = document.getElementById("emptyState");

    if (!patientsContainer) return;

    await loadPatients();

    searchInput?.addEventListener("input", () => {
      renderPatients(searchInput.value, patientsContainer, emptyState);
    });
  },
});

async function loadPatients() {
  const patientsContainer = document.getElementById("patientsContainer");
  const emptyState = document.getElementById("emptyState");

  showLoading(t("loading.patients"));

  try {
    patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
    patients.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    renderPatients("", patientsContainer, emptyState);
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadPatients"));
  } finally {
    hideLoading();
  }
}

function renderPatients(searchValue, container, emptyState) {
  const keyword = searchValue.trim().toLowerCase();

  const filtered = patients.filter((patient) => {
    const name = String(patient.fullName || "").toLowerCase();
    const phone = String(patient.phone || "").toLowerCase();
    return name.includes(keyword) || phone.includes(keyword);
  });

  container.innerHTML = "";

  if (filtered.length === 0) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  filtered.forEach((patient) => {
    container.innerHTML += patientCard(patient);
  });
}

function patientCard(patient) {
  const fullName = escapeHtml(patient.fullName || t("doctor.unnamedPatient"));
  const phone = escapeHtml(patient.phone || t("doctor.noPhone"));
  const gender = escapeHtml(patient.gender || t("common.notFound"));
  const age = patient.age ?? t("common.notFound");
  const currentWeight = patient.currentWeight ?? t("common.notFound");
  const targetWeight = patient.targetWeight ?? t("common.notFound");
  const initial = fullName.charAt(0).toUpperCase();

  return `
    <div class="patient-card">
      <div class="patient-avatar">${initial}</div>
      <div class="patient-info">
        <h3>${fullName}</h3>
        <p>${phone}</p>
      </div>
      <div class="patient-stats">
        <div><span>${escapeHtml(t("lists.age"))}</span><strong>${age}</strong></div>
        <div><span>${escapeHtml(t("lists.gender"))}</span><strong>${gender}</strong></div>
        <div><span>${escapeHtml(t("lists.weight"))}</span><strong>${currentWeight} kg</strong></div>
        <div><span>${escapeHtml(t("lists.goal"))}</span><strong>${targetWeight} kg</strong></div>
      </div>
      <button class="view-btn" type="button" data-patient-id="${escapeHtml(patient.id)}">
        ${escapeHtml(t("buttons.viewDetails"))}
      </button>
    </div>
  `;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-patient-id]");
  if (!btn) return;
  window.location.href = `details.html?id=${btn.dataset.patientId}`;
});
