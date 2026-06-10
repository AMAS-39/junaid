import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal } from "../../components/modal.js";
import { getQueryParam, formatDate, escapeHtml } from "../../utils/format.js";

const CATEGORIES = ["medicine", "meal", "lab", "progress"];

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const patientId = getQueryParam("patientId");
    const backBtn = document.getElementById("backBtn");
    const addBtn = document.getElementById("addPhotoBtn");

    if (!patientId) {
      toast.error("Patient ID is required.");
      return;
    }

    backBtn?.addEventListener("click", () => {
      window.location.href = `../../patients/details.html?id=${patientId}`;
    });

    addBtn?.addEventListener("click", () => openAddPhotoModal(patientId, session.user.uid));

    await loadPhotos(patientId);
  },
});

async function loadPhotos(patientId) {
  const container = document.getElementById("photosContainer");
  const emptyState = document.getElementById("emptyState");
  const patientBanner = document.getElementById("patientBanner");

  const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);
  if (patient && patientBanner) {
    patientBanner.innerHTML = `<h2>${escapeHtml(patient.fullName || "Patient")}</h2><p>Photo records — uploads via Supabase coming soon</p>`;
  }

  showLoading("Loading photos...");

  try {
    let photos = await FirestoreService.query(COLLECTIONS.PATIENT_PHOTOS, [
      ["patientId", "==", patientId],
    ]);
    photos.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));

    if (photos.length === 0) {
      container.innerHTML = "";
      emptyState?.classList.remove("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    container.innerHTML = `
      <div class="photo-grid">
        ${photos.map((photo) => photoCard(photo)).join("")}
      </div>
    `;
  } catch (error) {
    console.error(error);
    toast.error("Failed to load photo records.");
  } finally {
    hideLoading();
  }
}

function tsMillis(ts) {
  return ts?.toMillis?.() ?? 0;
}

function photoCard(photo) {
  return `
    <div class="photo-card">
      <div class="photo-placeholder">📷</div>
      <span class="status-badge status-pending">${escapeHtml(photo.category || "photo")}</span>
      <p class="text-sm text-slate-600 mt-2">${escapeHtml(photo.notes || "No notes")}</p>
      <p class="text-xs text-slate-400 mt-1">${escapeHtml(formatDate(photo.createdAt))}</p>
      <p class="text-xs text-slate-400">${escapeHtml(photo.status || "pending_upload")}</p>
    </div>
  `;
}

function openAddPhotoModal(patientId, doctorId) {
  openModal({
    title: "Add Photo Record",
    body: `
      <p class="text-sm text-slate-500 mb-3">File upload will be enabled with Supabase Storage. This creates a placeholder record.</p>
      <div class="form-group">
        <label for="photoCategory">Category</label>
        <select id="photoCategory" class="form-input">
          ${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </div>
      <div class="form-group mt-3">
        <label for="photoNotes">Notes</label>
        <textarea id="photoNotes" class="form-textarea" rows="3" placeholder="Describe the photo..."></textarea>
      </div>
    `,
    confirmText: "Save Record",
    onConfirm: async () => {
      const category = document.getElementById("photoCategory").value;
      const notes = document.getElementById("photoNotes").value.trim();
      showLoading("Saving...");
      try {
        await FirestoreService.create(COLLECTIONS.PATIENT_PHOTOS, {
          patientId,
          doctorId,
          category,
          notes,
          photoUrl: "",
          status: "pending_upload",
        });
        toast.success("Photo record created.");
        await loadPhotos(patientId);
      } catch (error) {
        console.error(error);
        toast.error("Failed to save photo record.");
      } finally {
        hideLoading();
      }
    },
  });
}
