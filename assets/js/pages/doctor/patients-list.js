import { bootstrap } from "../../core/bootstrap.js";
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

  showLoading("Loading patients...");

  try {
    patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
    patients.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
    renderPatients("", patientsContainer, emptyState);
  } catch (error) {
    console.error(error);
    toast.error("Failed to load patients.");
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
  const fullName = escapeHtml(patient.fullName || "Unnamed Patient");
  const phone = escapeHtml(patient.phone || "No phone");
  const gender = escapeHtml(patient.gender || "N/A");
  const age = patient.age ?? "N/A";
  const currentWeight = patient.currentWeight ?? "N/A";
  const targetWeight = patient.targetWeight ?? "N/A";
  const initial = fullName.charAt(0).toUpperCase();

  return `
    <div class="patient-card">
      <div class="patient-avatar">${initial}</div>
      <div class="patient-info">
        <h3>${fullName}</h3>
        <p>${phone}</p>
      </div>
      <div class="patient-stats">
        <div><span>Age</span><strong>${age}</strong></div>
        <div><span>Gender</span><strong>${gender}</strong></div>
        <div><span>Weight</span><strong>${currentWeight} kg</strong></div>
        <div><span>Goal</span><strong>${targetWeight} kg</strong></div>
      </div>
      <button class="view-btn" type="button" data-patient-id="${escapeHtml(patient.id)}">
        View Details
      </button>
    </div>
  `;
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-patient-id]");
  if (!btn) return;
  window.location.href = `details.html?id=${btn.dataset.patientId}`;
});
