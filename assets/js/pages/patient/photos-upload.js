import { bootstrap } from "../../core/bootstrap.js";
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
    const form = document.getElementById("photoForm");
    const listEl = document.getElementById("photoList");
    const emptyState = document.getElementById("emptyState");

    await loadPhotos(patientId, listEl, emptyState);

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const photoType = document.getElementById("photoType").value;
      const note = document.getElementById("note").value.trim();
      const saveBtn = document.getElementById("saveBtn");

      saveBtn.disabled = true;
      showLoading("Saving record...");

      try {
        await FirestoreService.create(COLLECTIONS.PATIENT_PHOTOS, {
          patientId,
          category: photoType,
          notes: note,
          photoUrl: "",
          status: "pending_upload",
        });

        toast.success("Photo record saved. Upload will be enabled soon.");
        form.reset();
        await loadPhotos(patientId, listEl, emptyState);
      } catch (error) {
        console.error(error);
        toast.error("Failed to save photo record.");
      } finally {
        saveBtn.disabled = false;
        hideLoading();
      }
    });
  },
});

async function loadPhotos(patientId, listEl, emptyState) {
  showLoading("Loading records...");

  try {
    let photos = await FirestoreService.query(COLLECTIONS.PATIENT_PHOTOS, [
      ["patientId", "==", patientId],
    ]);
    photos.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));

    if (photos.length === 0) {
      listEl.innerHTML = "";
      emptyState?.classList.remove("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    listEl.innerHTML = photos
      .map(
        (p) => `
        <div class="patient-list-card">
          <div class="flex justify-between items-center gap-2">
            <span class="status-badge status-pending">${escapeHtml(p.category || "photo")}</span>
            <span class="text-xs text-slate-400">${escapeHtml(formatDate(p.createdAt))}</span>
          </div>
          ${p.notes ? `<p class="text-sm text-slate-600 mt-2">${escapeHtml(p.notes)}</p>` : ""}
          <p class="text-xs text-slate-400 mt-1">${escapeHtml(p.status || "pending_upload")}</p>
        </div>
      `
      )
      .join("");
  } catch (error) {
    console.error(error);
    toast.error("Failed to load photo records.");
  } finally {
    hideLoading();
  }
}
