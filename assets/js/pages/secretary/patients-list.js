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
  const name = escapeHtml(patient.fullName || t("labels.unnamed"));
  const phone = escapeHtml(patient.phone || t("labels.emDash"));
  const initial = name.charAt(0).toUpperCase();

  return `
    <div class="patient-card">
      <div class="patient-avatar">${initial}</div>
      <div class="patient-info">
        <h3>${name}</h3>
        <p>${phone}</p>
      </div>
      <div class="patient-stats">
        <div><span>${escapeHtml(t("lists.age"))}</span><strong>${patient.age ?? t("labels.emDash")}</strong></div>
        <div><span>${escapeHtml(t("lists.weight"))}</span><strong>${patient.currentWeight ?? t("labels.emDash")} kg</strong></div>
      </div>
      <div class="btn-row mt-3">
        <button type="button" class="btn-sm btn-sm-secondary flex-1" data-view="${escapeHtml(patient.id)}">${escapeHtml(t("buttons.view"))}</button>
        <button type="button" class="btn-sm btn-sm-primary flex-1" data-edit="${escapeHtml(patient.id)}">${escapeHtml(t("buttons.edit"))}</button>
      </div>
    </div>
  `;
}

function openViewModal(patientId) {
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;

  const bmi = calculateBMI(patient.height, patient.currentWeight);

  openModal({
    title: patient.fullName || t("labels.patient"),
    body: `
      <p><strong>${escapeHtml(t("labels.email"))}</strong> ${escapeHtml(patient.email || t("labels.emDash"))}</p>
      <p class="mt-2"><strong>${escapeHtml(t("labels.phone"))}</strong> ${escapeHtml(patient.phone || t("labels.emDash"))}</p>
      <p class="mt-2"><strong>${escapeHtml(t("labels.genderLabel"))}</strong> ${escapeHtml(patient.gender || t("labels.emDash"))}</p>
      <p class="mt-2"><strong>${escapeHtml(t("labels.ageLabel"))}</strong> ${escapeHtml(String(patient.age ?? t("labels.emDash")))}</p>
      <p class="mt-2"><strong>${escapeHtml(t("labels.heightLabel"))}</strong> ${escapeHtml(String(patient.height ?? t("labels.emDash")))} cm</p>
      <p class="mt-2"><strong>${escapeHtml(t("labels.currentWeight"))}</strong> ${escapeHtml(String(patient.currentWeight ?? t("labels.emDash")))} kg</p>
      <p class="mt-2"><strong>${escapeHtml(t("labels.targetWeight"))}</strong> ${escapeHtml(String(patient.targetWeight ?? t("labels.emDash")))} kg</p>
      <p class="mt-2"><strong>${escapeHtml(t("labels.bmi"))}</strong> ${bmi ?? t("labels.emDash")}</p>
    `,
    showCancel: false,
    confirmText: t("buttons.close"),
    onConfirm: () => {},
  });
}

function openEditModal(patientId) {
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) return;

  openModal({
    title: t("modal.editPatient"),
    body: `
      <div class="form-group mb-3">
        <label>${escapeHtml(t("forms.fullName"))}</label>
        <input id="editFullName" class="form-input" value="${escapeHtml(patient.fullName || "")}" />
      </div>
      <div class="form-group mb-3">
        <label>${escapeHtml(t("pages.addPatient.phone"))}</label>
        <input id="editPhone" class="form-input" value="${escapeHtml(patient.phone || "")}" />
      </div>
      <div class="form-group mb-3">
        <label>${escapeHtml(t("pages.addPatient.email"))}</label>
        <input id="editEmail" type="email" class="form-input" value="${escapeHtml(patient.email || "")}" />
      </div>
      <div class="form-group mb-3">
        <label>${escapeHtml(t("doctor.gender"))}</label>
        <select id="editGender" class="form-input">
          <option value="Male" ${patient.gender === "Male" ? "selected" : ""}>${escapeHtml(t("pages.addPatient.male"))}</option>
          <option value="Female" ${patient.gender === "Female" ? "selected" : ""}>${escapeHtml(t("pages.addPatient.female"))}</option>
        </select>
      </div>
      <div class="form-group mb-3">
        <label>${escapeHtml(t("pages.addPatient.age"))}</label>
        <input id="editAge" type="number" min="1" class="form-input" value="${patient.age ?? ""}" />
      </div>
      <div class="form-group mb-3">
        <label>${escapeHtml(t("forms.heightCm"))}</label>
        <input id="editHeight" type="number" min="1" class="form-input" value="${patient.height ?? ""}" />
      </div>
      <div class="form-group mb-3">
        <label>${escapeHtml(t("forms.currentWeightKg"))}</label>
        <input id="editCurrentWeight" type="number" min="1" class="form-input" value="${patient.currentWeight ?? ""}" />
      </div>
      <div class="form-group">
        <label>${escapeHtml(t("forms.targetWeightKg"))}</label>
        <input id="editTargetWeight" type="number" min="1" class="form-input" value="${patient.targetWeight ?? ""}" />
      </div>
    `,
    confirmText: t("buttons.saveChanges"),
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
        toast.error(t("toast.namePhoneEmailRequired"));
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
        toast.error(t("toast.failedUpdatePatient"));
      } finally {
        hideLoading();
      }
    },
  });
}
