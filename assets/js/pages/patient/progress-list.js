import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { escapeHtml, formatDate } from "../../utils/format.js";
import { tsMillis } from "./patient-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const patientId = session.user.uid;
    const form = document.getElementById("progressForm");
    const listEl = document.getElementById("progressList");
    const emptyState = document.getElementById("emptyState");

    await loadEntries(patientId, listEl, emptyState);

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const weight = Number(document.getElementById("weight").value);
      const note = document.getElementById("note").value.trim();
      const saveBtn = document.getElementById("saveBtn");

      if (!weight || weight <= 0) {
        toast.error(t("toast.enterValidWeight"));
        return;
      }

      saveBtn.disabled = true;
      showLoading(t("loading.saving"));

      try {
        await FirestoreService.create(COLLECTIONS.PROGRESS_ENTRIES, {
          patientId,
          weight,
          notes: note,
          recordedAt: FirestoreService.serverTimestamp(),
        });

        toast.success(t("toast.weightSaved"));
        form.reset();
        await loadEntries(patientId, listEl, emptyState);
      } catch (error) {
        console.error(error);
        toast.error(t("toast.failedSaveProgress"));
      } finally {
        saveBtn.disabled = false;
        hideLoading();
      }
    });
  },
});

async function loadEntries(patientId, listEl, emptyState) {
  showLoading(t("loading.progress"));

  try {
    let entries = await FirestoreService.query(COLLECTIONS.PROGRESS_ENTRIES, [
      ["patientId", "==", patientId],
    ]);
    entries.sort((a, b) => tsMillis(b.recordedAt || b.createdAt) - tsMillis(a.recordedAt || a.createdAt));

    if (entries.length === 0) {
      listEl.innerHTML = "";
      emptyState?.classList.remove("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    listEl.innerHTML = entries
      .map(
        (e) => `
        <div class="progress-card">
          <div>
            <strong>${escapeHtml(String(e.weight))} kg</strong>
            <p class="text-sm text-slate-500">${escapeHtml(formatDate(e.recordedAt || e.createdAt))}</p>
            ${e.notes ? `<p class="text-sm text-slate-600 mt-1">${escapeHtml(e.notes)}</p>` : ""}
          </div>
        </div>
      `
      )
      .join("");
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadProgress"));
  } finally {
    hideLoading();
  }
}
