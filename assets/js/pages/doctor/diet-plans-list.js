import { bootstrap } from "../../core/bootstrap.js";
import { t, tStatus } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { formatDate, escapeHtml } from "../../utils/format.js";

let plans = [];
let patientsMap = {};

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const searchInput = document.getElementById("searchInput");
    const createBtn = document.getElementById("createBtn");

    createBtn?.addEventListener("click", () => {
      window.location.href = "create.html";
    });

    await loadData(session.user.uid);

    searchInput?.addEventListener("input", () => {
      renderPlans(searchInput.value);
    });
  },
});

async function loadData(doctorId) {
  showLoading(t("loading.dietPlans"));

  try {
    const allPatients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
    patientsMap = Object.fromEntries(allPatients.map((p) => [p.id, p]));

    plans = await FirestoreService.query(COLLECTIONS.DIET_PLANS, [
      ["doctorId", "==", doctorId],
    ]);
    plans.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));

    renderPlans("");
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadDietPlans"));
  } finally {
    hideLoading();
  }
}

function renderPlans(searchValue) {
  const container = document.getElementById("plansContainer");
  const emptyState = document.getElementById("emptyState");
  const keyword = searchValue.trim().toLowerCase();

  const filtered = plans.filter((plan) => {
    const patient = patientsMap[plan.patientId];
    const name = String(patient?.fullName || "").toLowerCase();
    const title = String(plan.title || "").toLowerCase();
    return name.includes(keyword) || title.includes(keyword);
  });

  if (!container) return;
  container.innerHTML = "";

  if (filtered.length === 0) {
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  container.innerHTML = `
    <div class="card data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>${escapeHtml(t("lists.patient"))}</th>
            <th>${escapeHtml(t("lists.plan"))}</th>
            <th>${escapeHtml(t("lists.status"))}</th>
            <th>${escapeHtml(t("lists.created"))}</th>
            <th>${escapeHtml(t("lists.actions"))}</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((plan) => planRow(plan)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function planRow(plan) {
  const patient = patientsMap[plan.patientId];
  const patientName = escapeHtml(patient?.fullName || t("labels.unknown"));
  const status = plan.status === "active" ? "active" : "old";
  const statusLabel = tStatus(plan.status === "active" ? "active" : plan.status || "inactive");

  return `
    <tr>
      <td>${patientName}</td>
      <td>${escapeHtml(plan.title || t("pages.dietPlans.untitled"))}</td>
      <td><span class="status-badge status-${status}">${statusLabel}</span></td>
      <td>${escapeHtml(formatDate(plan.createdAt))}</td>
      <td>
        <div class="btn-row">
          <button type="button" class="btn-sm btn-sm-secondary" data-view-plan="${escapeHtml(plan.id)}">${escapeHtml(t("buttons.view"))}</button>
          <button type="button" class="btn-sm btn-sm-primary" data-edit-plan="${escapeHtml(plan.id)}">${escapeHtml(t("buttons.edit"))}</button>
        </div>
      </td>
    </tr>
  `;
}

function tsMillis(ts) {
  return ts?.toMillis?.() ?? 0;
}

document.addEventListener("click", (e) => {
  const viewBtn = e.target.closest("[data-view-plan]");
  const editBtn = e.target.closest("[data-edit-plan]");
  if (viewBtn) window.location.href = `edit.html?id=${viewBtn.dataset.viewPlan}`;
  if (editBtn) window.location.href = `edit.html?id=${editBtn.dataset.editPlan}`;
});
