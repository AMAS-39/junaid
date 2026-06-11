import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal } from "../../components/modal.js";
import { escapeHtml, calculateBMI } from "../../utils/format.js";

let patients = [];

bootstrap({
  onReady: async () => {
    const container = document.getElementById("patientsContainer");
    const searchInput = document.getElementById("searchInput");
    const emptyState = document.getElementById("emptyState");

    await loadPatients();

    searchInput?.addEventListener("input", () => {
      renderPatients(searchInput.value, container, emptyState);
    });
  },
});

async function loadPatients() {
  const container = document.getElementById("patientsContainer");
  const emptyState = document.getElementById("emptyState");

  showLoading(t("loading.patients"));

  try {
    patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
    patients.sort((a, b) => String(a.fullName || "").localeCompare(String(b.fullName || "")));
    renderPatients("", container, emptyState);
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadPatients"));
  } finally {
    hideLoading();
  }
}

function renderPatients(searchValue, container, emptyState) {
  const keyword = searchValue.trim().toLowerCase();
  const filtered = patients.filter((p) => {
    const name = String(p.fullName || "").toLowerCase();
    const phone = String(p.phone || "").toLowerCase();
    return name.includes(keyword) || phone.includes(keyword);
  });

  if (!container) return;
  container.innerHTML = "";

  if (filtered.length === 0) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  filtered.forEach((patient) => {
    container.innerHTML += patientCard(patient);
  });

  container.querySelectorAll("[data-view]").forEach((btn) => {
    btn.addEventListener("click", () => openViewModal(btn.dataset.view));
  });
  container.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", () => openEditModal(btn.dataset.edit));
  });
}

function patientCard(patient) {
  const name = escapeHtml(patient.fullName || "Unnamed");
  const phone = escapeHtml(patient.phone || "—");
  const initial = name.charAt(0).toUpperCase();

  return `
    <div class="patient-card">
      <div class="patient-avatar">${initial}</div>
      <div class="patient-info">
        <h3>${name}</h3>
        <p>${phone}</p>
      </div>
      <div class="patient-stats">
        <div><span>Age</span><strong>${patient.age ?? "—"}</strong></div>
        <div><span>Weight</span><strong>${patient.currentWeight ?? "—"} kg</strong></div>
      </div>
      <div class="btn-row mt-3">
        <button type="button" class="btn-sm btn-sm-secondary flex-1" data-view="${escapeHtml(patient.id)}">View</button>
        <button type="button" class="btn-sm btn-sm-primary flex-1" data-edit="${escapeHtml(patient.id)}">Edit</button>
      </div>
    </div>
  `;
}

function openViewModal(patientId) {
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;

  const bmi = calculateBMI(patient.height, patient.currentWeight);

  openModal({
    title: patient.fullName || "Patient",
    body: `
      <p><strong>Email:</strong> ${escapeHtml(patient.email || "—")}</p>
      <p class="mt-2"><strong>Phone:</strong> ${escapeHtml(patient.phone || "—")}</p>
      <p class="mt-2"><strong>Gender:</strong> ${escapeHtml(patient.gender || "—")}</p>
      <p class="mt-2"><strong>Age:</strong> ${escapeHtml(String(patient.age ?? "—"))}</p>
      <p class="mt-2"><strong>Height:</strong> ${escapeHtml(String(patient.height ?? "—"))} cm</p>
      <p class="mt-2"><strong>Current weight:</strong> ${escapeHtml(String(patient.currentWeight ?? "—"))} kg</p>
      <p class="mt-2"><strong>Target weight:</strong> ${escapeHtml(String(patient.targetWeight ?? "—"))} kg</p>
      <p class="mt-2"><strong>BMI:</strong> ${bmi ?? "—"}</p>
    `,
    showCancel: false,
    confirmText: "Close",
    onConfirm: () => {},
  });
}

function openEditModal(patientId) {
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;

  openModal({
    title: "Edit Patient",
    body: `
      <div class="form-group mb-3">
        <label>Full Name</label>
        <input id="editFullName" class="form-input" value="${escapeHtml(patient.fullName || "")}" />
      </div>
      <div class="form-group mb-3">
        <label>Phone</label>
        <input id="editPhone" class="form-input" value="${escapeHtml(patient.phone || "")}" />
      </div>
      <div class="form-group mb-3">
        <label>Email</label>
        <input id="editEmail" type="email" class="form-input" value="${escapeHtml(patient.email || "")}" />
      </div>
      <div class="form-group mb-3">
        <label>Gender</label>
        <select id="editGender" class="form-input">
          <option value="Male" ${patient.gender === "Male" ? "selected" : ""}>Male</option>
          <option value="Female" ${patient.gender === "Female" ? "selected" : ""}>Female</option>
        </select>
      </div>
      <div class="form-group mb-3">
        <label>Age</label>
        <input id="editAge" type="number" min="1" class="form-input" value="${patient.age ?? ""}" />
      </div>
      <div class="form-group mb-3">
        <label>Height (cm)</label>
        <input id="editHeight" type="number" min="1" class="form-input" value="${patient.height ?? ""}" />
      </div>
      <div class="form-group mb-3">
        <label>Current Weight (kg)</label>
        <input id="editCurrentWeight" type="number" min="1" class="form-input" value="${patient.currentWeight ?? ""}" />
      </div>
      <div class="form-group">
        <label>Target Weight (kg)</label>
        <input id="editTargetWeight" type="number" min="1" class="form-input" value="${patient.targetWeight ?? ""}" />
      </div>
    `,
    confirmText: "Save Changes",
    onConfirm: async () => {
      const data = {
        fullName: document.getElementById("editFullName").value.trim(),
        phone: document.getElementById("editPhone").value.trim(),
        email: document.getElementById("editEmail").value.trim(),
        gender: document.getElementById("editGender").value,
        age: Number(document.getElementById("editAge").value),
        height: Number(document.getElementById("editHeight").value),
        currentWeight: Number(document.getElementById("editCurrentWeight").value),
        targetWeight: Number(document.getElementById("editTargetWeight").value),
      };

      if (!data.fullName || !data.phone || !data.email) {
        toast.error("Name, phone, and email are required.");
        return;
      }

      showLoading(t("loading.saving"));
      try {
        await FirestoreService.update(COLLECTIONS.PATIENTS, patientId, data);
        await FirestoreService.update(COLLECTIONS.USERS, patientId, {
          name: data.fullName,
          phone: data.phone,
          email: data.email,
        });

        const idx = patients.findIndex((p) => p.id === patientId);
        if (idx >= 0) patients[idx] = { ...patients[idx], ...data };

        const container = document.getElementById("patientsContainer");
        const searchInput = document.getElementById("searchInput");
        renderPatients(searchInput?.value || "", container, document.getElementById("emptyState"));

        toast.success(t("toast.saved"));
      } catch (error) {
        console.error(error);
        toast.error("Failed to update patient.");
      } finally {
        hideLoading();
      }
    },
  });
}
