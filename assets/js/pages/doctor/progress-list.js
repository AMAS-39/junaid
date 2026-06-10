import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { getQueryParam, formatDate, escapeHtml } from "../../utils/format.js";

bootstrap({
  onReady: async () => {
    const patientId = getQueryParam("patientId");
    const container = document.getElementById("progressContainer");
    const emptyState = document.getElementById("emptyState");
    const patientBanner = document.getElementById("patientBanner");
    const backBtn = document.getElementById("backBtn");

    if (!patientId) {
      toast.error("Patient ID is required.");
      return;
    }

    backBtn?.addEventListener("click", () => {
      window.location.href = `../../patients/details.html?id=${patientId}`;
    });

    const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);
    if (patient && patientBanner) {
      patientBanner.innerHTML = `
        <h2>${escapeHtml(patient.fullName || "Patient")}</h2>
        <p>Weight progress history — chart view coming soon</p>
      `;
    }

    showLoading("Loading progress...");

    try {
      let entries = await FirestoreService.query(COLLECTIONS.PROGRESS_ENTRIES, [
        ["patientId", "==", patientId],
      ]);
      entries.sort((a, b) => tsMillis(b.recordedAt || b.createdAt) - tsMillis(a.recordedAt || a.createdAt));

      if (entries.length === 0) {
        container.innerHTML = "";
        emptyState?.classList.remove("hidden");
        return;
      }

      emptyState?.classList.add("hidden");

      const startWeight = patient?.currentWeight;
      const latestWeight = entries[0]?.weight;

      container.innerHTML = `
        <div class="stats-grid mb-4">
          <div class="stat-card"><span>Starting weight</span><strong>${startWeight ?? "—"} kg</strong></div>
          <div class="stat-card"><span>Latest weight</span><strong>${latestWeight ?? "—"} kg</strong></div>
          <div class="stat-card"><span>Entries</span><strong>${entries.length}</strong></div>
          <div class="stat-card"><span>Goal</span><strong>${patient?.targetWeight ?? "—"} kg</strong></div>
        </div>
        <div class="progress-list">
          ${entries.map((entry) => progressCard(entry)).join("")}
        </div>
      `;
    } catch (error) {
      console.error(error);
      toast.error("Failed to load progress entries.");
    } finally {
      hideLoading();
    }
  },
});

function tsMillis(ts) {
  return ts?.toMillis?.() ?? (ts ? new Date(ts).getTime() : 0);
}

function progressCard(entry) {
  return `
    <div class="progress-card">
      <div>
        <strong>${escapeHtml(String(entry.weight))} kg</strong>
        <p class="text-sm text-slate-500 mt-1">${escapeHtml(formatDate(entry.recordedAt || entry.createdAt))}</p>
        ${entry.notes ? `<p class="text-sm text-slate-600 mt-1">${escapeHtml(entry.notes)}</p>` : ""}
      </div>
    </div>
  `;
}
