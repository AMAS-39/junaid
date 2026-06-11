import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
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

    if (!patientId) {
      toast.error(t("toast.patientIdRequired"));
      return;
    }

    const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);
    if (patient && patientBanner) {
      patientBanner.innerHTML = `
        <h2>${escapeHtml(patient.fullName || t("labels.patient"))}</h2>
        <p>${escapeHtml(t("pages.progress.subtitle"))}</p>
      `;
    }

    showLoading(t("loading.progress"));

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
          <div class="stat-card"><span>${escapeHtml(t("reportStats.startingWeight"))}</span><strong>${startWeight ?? t("labels.emDash")} kg</strong></div>
          <div class="stat-card"><span>${escapeHtml(t("reportStats.latestWeight"))}</span><strong>${latestWeight ?? t("labels.emDash")} kg</strong></div>
          <div class="stat-card"><span>${escapeHtml(t("lists.entries"))}</span><strong>${entries.length}</strong></div>
          <div class="stat-card"><span>${escapeHtml(t("reportStats.goal"))}</span><strong>${patient?.targetWeight ?? t("labels.emDash")} kg</strong></div>
        </div>
        <div class="progress-list">
          ${entries.map((entry) => progressCard(entry)).join("")}
        </div>
      `;
    } catch (error) {
      console.error(error);
      toast.error(t("toast.failedLoadProgress"));
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
