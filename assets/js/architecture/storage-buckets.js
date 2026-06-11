/**
 * Supabase Storage architecture.
 * Defines bucket names, folder conventions, and allowed file types.
 */

export const BUCKETS = Object.freeze({
  MEDICINE_PHOTOS: "medicine-photos",
  MEAL_PHOTOS: "meal-photos",
  PROGRESS_PHOTOS: "progress-photos",
  LAB_REPORTS: "lab-reports",
  AVATARS: "avatars",
  DOCUMENTS: "documents",
});

/** Map patient photo types to Supabase buckets. */
export const PHOTO_TYPE_BUCKET = Object.freeze({
  medicine: BUCKETS.MEDICINE_PHOTOS,
  meal: BUCKETS.MEAL_PHOTOS,
  progress: BUCKETS.PROGRESS_PHOTOS,
  "lab-report": BUCKETS.LAB_REPORTS,
});

export const PATIENT_PHOTO_TYPES = Object.freeze(["medicine", "meal", "progress", "lab-report"]);

/**
 * Build storage path inside bucket.
 * Format: patients/{patientId}/{photoType}/{timestamp}-{filename}
 */
export function buildPatientPhotoPath(patientId, photoType, fileName) {
  const safeName = String(fileName || "photo")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  return `patients/${patientId}/${photoType}/${Date.now()}-${safeName}`;
}

/**
 * Build path for medicine papers / test results in documents bucket.
 * Format: medicine-papers/{patientId}/{timestamp}-{filename}
 */
export function buildMedicineDocumentPath(patientId, fileName) {
  const safeName = String(fileName || "document")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
  return `medicine-papers/${patientId}/${Date.now()}-${safeName}`;
}

export const StoragePaths = Object.freeze({
  patientPhoto: (patientId, photoType, filename) =>
    buildPatientPhotoPath(patientId, photoType, filename),

  userAvatar: (userId, filename) =>
    `${BUCKETS.AVATARS}/${userId}/${filename}`,

  clinicDocument: (category, filename) =>
    `${BUCKETS.DOCUMENTS}/${category}/${filename}`,
});

export const FILE_CONSTRAINTS = Object.freeze({
  IMAGE: {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
  },
  DOCUMENT: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
});

/** Supabase RLS policy hints for developers. */
export const STORAGE_ACCESS = Object.freeze({
  [BUCKETS.MEDICINE_PHOTOS]: "Patient upload own; doctor read assigned patients",
  [BUCKETS.MEAL_PHOTOS]: "Patient upload own; doctor read assigned",
  [BUCKETS.PROGRESS_PHOTOS]: "Patient upload own; doctor read assigned",
  [BUCKETS.LAB_REPORTS]: "Patient upload own; doctor read assigned",
  [BUCKETS.AVATARS]: "User upload own; signed URL read",
  [BUCKETS.DOCUMENTS]: "Staff write; role-based read",
});
