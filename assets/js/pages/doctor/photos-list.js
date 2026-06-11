import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import {
  getPhotoPreviewUrl,
  getPhotoTypeLabel,
  getPhotoNote,
  canPreviewPhoto,
} from "../../services/photo-storage.service.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal } from "../../components/modal.js";
import { getQueryParam, formatDate, escapeHtml } from "../../utils/format.js";

let allPhotos = [];
let activeFilter = "all";
let patientId = null;

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    patientId = getQueryParam("patientId");

    if (!patientId) {
      toast.error("Patient ID is required.");
      return;
    }

    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((b) => b.classList.remove("filter-active"));
        btn.classList.add("filter-active");
        renderPhotos();
      });
    });

    await loadPhotos();
  },
});

async function loadPhotos() {
  const container = document.getElementById("photosContainer");
  const emptyState = document.getElementById("emptyState");
  const patientBanner = document.getElementById("patientBanner");

  const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);
  if (patient && patientBanner) {
    patientBanner.innerHTML = `
      <h2>${escapeHtml(patient.fullName || "Patient")}</h2>
      <p>Uploaded photos and reports</p>
    `;
  }

  showLoading("Loading photos...");

  try {
    allPhotos = await FirestoreService.query(COLLECTIONS.PATIENT_PHOTOS, [
      ["patientId", "==", patientId],
    ]);
    allPhotos.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
    renderPhotos();
  } catch (error) {
    console.error(error);
    toast.error("Failed to load photos.");
    container.innerHTML = "";
    emptyState?.classList.remove("hidden");
  } finally {
    hideLoading();
  }
}

function getFilteredPhotos() {
  if (activeFilter === "all") return allPhotos;
  return allPhotos.filter((p) => getPhotoTypeLabel(p) === activeFilter);
}

function renderPhotos() {
  const container = document.getElementById("photosContainer");
  const emptyState = document.getElementById("emptyState");
  const filtered = getFilteredPhotos();

  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");
  container.innerHTML = `
    <div class="photo-grid">
      ${filtered.map((photo) => photoCard(photo)).join("")}
    </div>
  `;

  container.querySelectorAll("[data-preview]").forEach((btn) => {
    btn.addEventListener("click", () => previewPhoto(btn.dataset.preview));
  });
}

function photoCard(photo) {
  const type = escapeHtml(getPhotoTypeLabel(photo));
  const note = escapeHtml(getPhotoNote(photo));
  const canPreview = canPreviewPhoto(photo);

  return `
    <div class="photo-card">
      <div class="photo-placeholder">${canPreview ? "🖼️" : "📷"}</div>
      <span class="status-badge status-${photo.status === "uploaded" ? "approved" : "pending"}">${type}</span>
      ${note ? `<p class="text-sm text-slate-600 mt-2">${note}</p>` : ""}
      <p class="text-xs text-slate-400 mt-1">${escapeHtml(formatDate(photo.createdAt))}</p>
      ${canPreview ? `
        <button type="button" class="btn-sm btn-sm-primary mt-3 w-full" data-preview="${escapeHtml(photo.id)}">Preview</button>
      ` : ""}
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

    const url = await getPhotoPreviewUrl(photo, 3600);
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

function tsMillis(ts) {
  return ts?.toMillis?.() ?? 0;
}
