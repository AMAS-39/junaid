import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import {
  uploadPatientPhoto,
  getPhotoPreviewUrl,
  getPhotoTypeLabel,
  getPhotoNote,
  canPreviewPhoto,
} from "../../services/photo-storage.service.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal } from "../../components/modal.js";
import { escapeHtml, formatDate } from "../../utils/format.js";
import { tsMillis } from "./patient-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const patientId = session.user.uid;
    const form = document.getElementById("photoForm");
    const listEl = document.getElementById("photoList");
    const emptyState = document.getElementById("emptyState");
    const fileInput = document.getElementById("photoFile");

    fileInput?.addEventListener("change", () => {
      const hint = document.getElementById("fileHint");
      if (hint && fileInput.files?.[0]) {
        const f = fileInput.files[0];
        hint.textContent = `${f.name} (${(f.size / 1024).toFixed(0)} KB)`;
      }
    });

    await loadPhotos(patientId, listEl, emptyState);

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const photoType = document.getElementById("photoType").value;
      const note = document.getElementById("note").value;
      const file = fileInput?.files?.[0];
      const saveBtn = document.getElementById("saveBtn");

      if (!file) {
        toast.error("Please select an image file.");
        return;
      }

      saveBtn.disabled = true;
      const originalLabel = saveBtn.textContent;
      saveBtn.textContent = "Uploading...";
      showLoading("Uploading photo...");

      try {
        await uploadPatientPhoto({
          patientId,
          uploadedBy: patientId,
          photoType,
          file,
          note: note.trim(),
        });

        toast.success("Photo uploaded successfully.");
        form.reset();
        const hint = document.getElementById("fileHint");
        if (hint) hint.textContent = "JPG, PNG, WEBP — max 5MB";
        await loadPhotos(patientId, listEl, emptyState);
      } catch (error) {
        console.error(error);
        toast.error(error?.message || "Failed to upload photo.");
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalLabel;
        hideLoading();
      }
    });
  },
});

async function loadPhotos(patientId, listEl, emptyState) {
  showLoading("Loading photos...");

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
    listEl.innerHTML = photos.map((p) => photoRow(p)).join("");

    listEl.querySelectorAll("[data-preview]").forEach((btn) => {
      btn.addEventListener("click", () => previewPhoto(btn.dataset.preview));
    });
  } catch (error) {
    console.error(error);
    toast.error("Failed to load photo records.");
  } finally {
    hideLoading();
  }
}

function photoRow(photo) {
  const type = escapeHtml(getPhotoTypeLabel(photo));
  const note = escapeHtml(getPhotoNote(photo));
  const canPreview = canPreviewPhoto(photo);

  return `
    <div class="patient-list-card">
      <div class="flex justify-between items-center gap-2">
        <span class="status-badge status-${photo.status === "uploaded" ? "approved" : "pending"}">${type}</span>
        <span class="text-xs text-slate-400">${escapeHtml(formatDate(photo.createdAt))}</span>
      </div>
      ${note ? `<p class="text-sm text-slate-600 mt-2">${note}</p>` : ""}
      ${canPreview ? `
        <button type="button" class="btn-sm btn-sm-primary mt-3" data-preview="${escapeHtml(photo.id)}">Preview</button>
      ` : `<p class="text-xs text-slate-400 mt-2">${escapeHtml(photo.status || "pending")}</p>`}
    </div>
  `;
}

async function previewPhoto(photoId) {
  showLoading("Loading preview...");
  try {
    const photo = await FirestoreService.getById(COLLECTIONS.PATIENT_PHOTOS, photoId);
    if (!photo) {
      toast.error("Photo not found.");
      return;
    }

    const url = await getPhotoPreviewUrl(photo);
    openModal({
      title: getPhotoTypeLabel(photo),
      body: `<img src="${url}" alt="Photo preview" class="photo-preview-img" />`,
      showCancel: false,
      confirmText: "Close",
      onConfirm: () => {},
    });
  } catch (error) {
    console.error(error);
    toast.error(error?.message || "Could not load preview.");
  } finally {
    hideLoading();
  }
}
