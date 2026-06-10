import { bootstrap } from "../../core/bootstrap.js";
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
    const backBtn = document.getElementById("backBtn");

    if (!planId) {
      toast.error("Diet plan ID is required.");
      return;
    }

    backBtn?.addEventListener("click", () => {
      window.location.href = "list.html";
    });

    await loadPlan(planId);

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await updatePlan(planId);
    });

    document.getElementById("archiveBtn")?.addEventListener("click", async () => {
      showLoading("Archiving plan...");
      try {
        await FirestoreService.update(COLLECTIONS.DIET_PLANS, planId, { status: "archived" });
        toast.success("Diet plan archived.");
        window.location.href = "list.html";
      } catch (error) {
        console.error(error);
        toast.error("Failed to archive plan.");
      } finally {
        hideLoading();
      }
    });
  },
});

async function loadPlan(planId) {
  showLoading("Loading diet plan...");

  try {
    const plan = await FirestoreService.getById(COLLECTIONS.DIET_PLANS, planId);
    if (!plan) {
      toast.error("Diet plan not found.");
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
        <span class="status-badge status-${plan.status === "active" ? "active" : "archived"}">${escapeHtml(plan.status || "active")}</span>
      `;
      banner.classList.remove("hidden");
    }
  } catch (error) {
    console.error(error);
    toast.error("Failed to load diet plan.");
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
    toast.error("Plan title is required.");
    return;
  }

  saveBtn.disabled = true;
  showLoading("Updating diet plan...");

  try {
    await FirestoreService.update(COLLECTIONS.DIET_PLANS, planId, data);
    toast.success("Diet plan updated.");
  } catch (error) {
    console.error(error);
    toast.error("Failed to update diet plan.");
  } finally {
    saveBtn.disabled = false;
    hideLoading();
  }
}
