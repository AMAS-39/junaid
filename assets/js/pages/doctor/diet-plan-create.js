import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { getQueryParam, escapeHtml } from "../../utils/format.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    let patientId = getQueryParam("patientId");
    const form = document.getElementById("dietPlanForm");
    const patientBanner = document.getElementById("patientBanner");
    const patientSelectWrap = document.getElementById("patientSelectWrap");
    const patientSelect = document.getElementById("patientSelect");

    if (!patientId) {
      const patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
      if (patientSelect && patients.length > 0) {
        patientSelect.innerHTML = patients
          .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.fullName || p.id)}</option>`)
          .join("");
        patientSelectWrap?.classList.remove("hidden");
        patientId = patientSelect.value;
        patientSelect.addEventListener("change", () => {
          patientId = patientSelect.value;
          updateBanner(patientId, patientBanner);
        });
      } else {
        toast.warning("No patients found. Add a patient first.");
      }
    }

    if (patientId) await updateBanner(patientId, patientBanner);

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const selectedId = patientSelectWrap?.classList.contains("hidden")
        ? patientId
        : patientSelect?.value;
      if (!selectedId) {
        toast.error("Please select a patient.");
        return;
      }
      await savePlan(session, selectedId);
    });
  },
});

async function updateBanner(patientId, banner) {
  const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);
  if (patient && banner) {
    banner.innerHTML = `
      <strong>${escapeHtml(patient.fullName || "Patient")}</strong>
      <span>Creating diet plan for this patient</span>
    `;
    banner.classList.remove("hidden");
  }
}

async function archiveActivePlans(patientId) {
  const patientPlans = await FirestoreService.query(COLLECTIONS.DIET_PLANS, [
    ["patientId", "==", patientId],
  ]);
  const activePlans = patientPlans.filter((p) => p.status === "active");

  for (const plan of activePlans) {
    await FirestoreService.update(COLLECTIONS.DIET_PLANS, plan.id, { status: "archived" });
  }
}

async function savePlan(session, patientId) {
  const saveBtn = document.getElementById("saveBtn");
  const title = document.getElementById("title").value.trim();
  const breakfast = document.getElementById("breakfast").value.trim();
  const lunch = document.getElementById("lunch").value.trim();
  const dinner = document.getElementById("dinner").value.trim();
  const snacks = document.getElementById("snacks").value.trim();
  const waterGoal = Number(document.getElementById("waterGoal").value);
  const notes = document.getElementById("notes").value.trim();

  if (!title) {
    toast.error("Plan title is required.");
    return;
  }

  if (!breakfast && !lunch && !dinner && !snacks) {
    toast.error("Add at least one meal entry.");
    return;
  }

  saveBtn.disabled = true;
  showLoading("Saving diet plan...");

  try {
    await archiveActivePlans(patientId);

    const planId = await FirestoreService.create(COLLECTIONS.DIET_PLANS, {
      patientId,
      doctorId: session.user.uid,
      title,
      breakfast,
      lunch,
      dinner,
      snacks,
      waterGoal: waterGoal > 0 ? waterGoal : null,
      notes,
      status: "active",
      startDate: FirestoreService.serverTimestamp(),
    });

    toast.success("Diet plan created successfully.");
    window.location.href = `edit.html?id=${planId}`;
  } catch (error) {
    console.error(error);
    toast.error("Failed to save diet plan.");
    saveBtn.disabled = false;
  } finally {
    hideLoading();
  }
}
