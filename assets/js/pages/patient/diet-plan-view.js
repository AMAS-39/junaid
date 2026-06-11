import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/format.js";
import { getActiveDietPlan } from "./patient-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const container = document.getElementById("dietPlanContent");
    const emptyState = document.getElementById("emptyState");
    const patientId = session.user.uid;

    showLoading(t("loading.dietPlan"));

    try {
      const plan = await getActiveDietPlan(patientId);

      if (!plan) {
        container.innerHTML = "";
        emptyState?.classList.remove("hidden");
        return;
      }

      emptyState?.classList.add("hidden");
      container.innerHTML = `
        <div class="patient-summary-card mb-4">
          <h2 class="text-xl font-bold text-slate-800">${escapeHtml(plan.title || t("patient.myDietPlan"))}</h2>
        </div>
        ${mealBlock(t("patient.breakfast"), plan.breakfast)}
        ${mealBlock(t("patient.lunch"), plan.lunch)}
        ${mealBlock(t("patient.dinner"), plan.dinner)}
        ${mealBlock(t("patient.snacks"), plan.snacks)}
        ${plan.waterGoal ? `
          <div class="patient-meal-card">
            <h3>${t("patient.waterGoal")}</h3>
            <p>${escapeHtml(String(plan.waterGoal))} L / day</p>
          </div>
        ` : ""}
        ${plan.notes ? `
          <div class="patient-meal-card">
            <h3>${t("patient.notes")}</h3>
            <p>${escapeHtml(plan.notes)}</p>
          </div>
        ` : ""}
      `;
    } catch (error) {
      console.error(error);
      toast.error(t("toast.failedLoadDietPlan"));
    } finally {
      hideLoading();
    }
  },
});

function mealBlock(label, content) {
  if (!content) return "";
  return `
    <div class="patient-meal-card">
      <h3>${escapeHtml(label)}</h3>
      <p>${escapeHtml(content)}</p>
    </div>
  `;
}
