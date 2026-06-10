/**
 * Supabase Storage architecture.
 * Defines bucket names, folder conventions, and allowed file types.
 */

export const BUCKETS = Object.freeze({
  PATIENT_PHOTOS: "patient-photos",
  LAB_REPORTS: "lab-reports",
  MEAL_PHOTOS: "meal-photos",
  MEDICINE_PHOTOS: "medicine-photos",
  AVATARS: "avatars",
  DOCUMENTS: "documents",
});

/**
 * Storage path builders — keep paths consistent across the app.
 * Format: {bucket}/{entityId}/{category}/{filename}
 */
export const StoragePaths = Object.freeze({
  patientProgressPhoto: (patientId, filename) =>
    `${BUCKETS.PATIENT_PHOTOS}/${patientId}/progress/${filename}`,

  patientMealPhoto: (patientId, filename) =>
    `${BUCKETS.MEAL_PHOTOS}/${patientId}/${filename}`,

  patientMedicinePhoto: (patientId, filename) =>
    `${BUCKETS.MEDICINE_PHOTOS}/${patientId}/${filename}`,

  patientLabReport: (patientId, filename) =>
    `${BUCKETS.LAB_REPORTS}/${patientId}/${filename}`,

  userAvatar: (userId, filename) =>
    `${BUCKETS.AVATARS}/${userId}/${filename}`,

  clinicDocument: (category, filename) =>
    `${BUCKETS.DOCUMENTS}/${category}/${filename}`,
});

export const FILE_CONSTRAINTS = Object.freeze({
  IMAGE: {
    maxSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  DOCUMENT: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ["application/pdf", "image/jpeg", "image/png"],
  },
});

/** Supabase RLS policy hints for developers. */
export const STORAGE_ACCESS = Object.freeze({
  [BUCKETS.PATIENT_PHOTOS]: "Patient upload own; doctor read assigned patients",
  [BUCKETS.LAB_REPORTS]: "Patient upload own; doctor read assigned",
  [BUCKETS.MEAL_PHOTOS]: "Patient upload own; doctor read assigned",
  [BUCKETS.MEDICINE_PHOTOS]: "Patient upload own; doctor read assigned",
  [BUCKETS.AVATARS]: "User upload own; public read",
  [BUCKETS.DOCUMENTS]: "Staff write; role-based read",
});
