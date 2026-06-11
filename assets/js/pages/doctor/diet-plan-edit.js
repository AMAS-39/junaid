import { bootstrap } from "../../core/bootstrap.js";
import { t, tStatus } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { getQueryParam, escapeHtml } from "../../utils/format.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const planId = getQueryParam("id");
    const form = document.getElementById("dietPlanForm");

    if (!planId) {
      toast.error(t("toast.planIdRequired"));
      return;
    }

    await loadPlan(planId);

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await updatePlan(planId);
    });

    document.getElementById("archiveBtn")?.addEventListener("click", async () => {
      showLoading(t("loading.archiving"));
      try {
        await FirestoreService.update(COLLECTIONS.DIET_PLANS, planId, { status: "archived" });
        toast.success(t("toast.planArchived"));
        window.location.href = "list.html";
      } catch (error) {
        console.error(error);
        toast.error(t("toast.failedArchive"));
      } finally {
        hideLoading();
      }
    });
  },
});

async function loadPlan(planId) {
  showLoading(t("loading.dietPlan"));

  try {
    const plan = await FirestoreService.getById(COLLECTIONS.DIET_PLANS, planId);
    if (!plan) {
      toast.error(t("toast.planNotFound"));
      return;
    }

    document.getElementById("title").value = plan.title || "";
    document.getElementById("breakfast").value = plan.breakfast || "";
    document.getElementById("lunch").value = plan.lunch || "";
    document.getElementById("dinner").value = plan.dinner || "";
    document.getElementById("snacks").value = plan.snacks || "";
    document.getElementById("waterGoal").value = plan.waterGoal ?? "";
    document.getElementById("notes").value = plan.notes || "";

    const banner = document.getElementById("planBanner");
    if (banner) {
      const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, plan.patientId);
      banner.innerHTML = `
        <strong>${escapeHtml(patient?.fullName || "Patient")}</strong>
        <span class="status-badge status-${plan.status === "active" ? "active" : "archived"}">${escapeHtml(tStatus(plan.status || "active"))}</span>
      `;
      banner.classList.remove("hidden");
    }
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadDietPlan"));
  } finally {
    hideLoading();
  }
}

async function updatePlan(planId) {
  const saveBtn = document.getElementById("saveBtn");
  const data = {
    title: document.getElementById("title").value.trim(),
    breakfast: document.getElementById("breakfast").value.trim(),
    lunch: document.getElementById("lunch").value.trim(),
    dinner: document.getElementById("dinner").value.trim(),
    snacks: document.getElementById("snacks").value.trim(),
    waterGoal: Number(document.getElementById("waterGoal").value) || null,
    notes: document.getElementById("notes").value.trim(),
  };

  if (!data.title) {
    toast.error(t("toast.planTitleRequired"));
    return;
  }

  saveBtn.disabled = true;
  showLoading(t("loading.updatingPlan"));

  try {
    await FirestoreService.update(COLLECTIONS.DIET_PLANS, planId, data);
    toast.success(t("toast.planUpdated"));
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedUpdatePlan"));
  } finally {
    saveBtn.disabled = false;
    hideLoading();
  }
}
