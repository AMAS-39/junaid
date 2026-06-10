import { StorageService } from "./storage.service.js";
import { FirestoreService } from "./firestore.service.js";
import { COLLECTIONS } from "../architecture/firestore-collections.js";
import {
  PHOTO_TYPE_BUCKET,
  buildPatientPhotoPath,
  PATIENT_PHOTO_TYPES,
} from "../architecture/storage-buckets.js";

/**
 * @param {string} photoType
 * @returns {string | null}
 */
export function getBucketForPhotoType(photoType) {
  return PHOTO_TYPE_BUCKET[photoType] ?? null;
}

/**
 * @param {File} file
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePatientPhoto(file) {
  if (!file) return { valid: false, error: "Please select an image file." };
  return StorageService.validateFile(file, "IMAGE");
}

/**
 * Upload a patient photo to Supabase and save metadata in Firestore.
 * @param {{ patientId: string, uploadedBy: string, photoType: string, file: File, note?: string }}
 */
export async function uploadPatientPhoto({ patientId, uploadedBy, photoType, file, note = "" }) {
  if (!PATIENT_PHOTO_TYPES.includes(photoType)) {
    throw new Error("Invalid photo type.");
  }

  const validation = validatePatientPhoto(file);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid file.");
  }

  const bucket = getBucketForPhotoType(photoType);
  if (!bucket) throw new Error("Invalid photo type bucket.");

  const filePath = buildPatientPhotoPath(patientId, photoType, file.name);

  try {
    await StorageService.upload(bucket, filePath, file);

    const id = await FirestoreService.create(COLLECTIONS.PATIENT_PHOTOS, {
      patientId,
      uploadedBy,
      photoType,
      bucket,
      filePath,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      note,
      status: "uploaded",
    });

    return { id, bucket, filePath };
  } catch (error) {
    try {
      await StorageService.remove(bucket, [filePath]);
    } catch {
      /* ignore cleanup failure */
    }
    throw error;
  }
}

/**
 * Get a signed preview URL for a stored photo.
 * @param {{ bucket?: string, filePath?: string }} photo
 * @param {number} [expiresIn]
 */
export async function getPhotoPreviewUrl(photo, expiresIn = 3600) {
  if (!photo?.bucket || !photo?.filePath) {
    throw new Error("Photo file not available.");
  }
  return StorageService.getSignedUrl(photo.bucket, photo.filePath, expiresIn);
}

/**
 * Normalize legacy and new photo document fields.
 * @param {object} photo
 */
export function getPhotoTypeLabel(photo) {
  return photo.photoType || photo.category || "photo";
}

export function getPhotoNote(photo) {
  return photo.note || photo.notes || "";
}
