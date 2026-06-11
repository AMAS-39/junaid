import { StorageService } from "./storage.service.js";
import { FirestoreService } from "./firestore.service.js";
import { COLLECTIONS } from "../architecture/firestore-collections.js";
import { BUCKETS, buildMedicineDocumentPath } from "../architecture/storage-buckets.js";

export const MEDICINE_DOC_CATEGORIES = Object.freeze([
  { value: "prescription", label: "Prescription" },
  { value: "test", label: "Lab / test result" },
  { value: "report", label: "Medical report" },
  { value: "other", label: "Other" },
]);

/**
 * @param {File} file
 */
export function validateMedicineDocument(file) {
  if (!file) return { valid: false, error: "Please select a file." };
  return StorageService.validateFile(file, "DOCUMENT");
}

/**
 * @param {{ patientId: string, uploadedBy: string, file: File, title?: string, category?: string, note?: string }}
 */
export async function uploadMedicineDocument({
  patientId,
  uploadedBy,
  file,
  title = "",
  category = "other",
  note = "",
}) {
  const validation = validateMedicineDocument(file);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid file.");
  }

  const bucket = BUCKETS.DOCUMENTS;
  const filePath = buildMedicineDocumentPath(patientId, file.name);
  const docTitle = title.trim() || file.name;

  try {
    await StorageService.upload(bucket, filePath, file, {
      contentType: file.type || "application/pdf",
      upsert: false,
    });

    const id = await FirestoreService.create(COLLECTIONS.MEDICINE_DOCUMENTS, {
      patientId,
      uploadedBy,
      title: docTitle,
      category,
      note: note.trim(),
      bucket,
      filePath,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      status: "uploaded",
    });

    return { id, bucket, filePath };
  } catch (error) {
    try {
      await StorageService.remove(bucket, [filePath]);
    } catch {
      /* ignore */
    }
    throw error;
  }
}

/**
 * @param {object} doc
 * @param {number} [expiresIn=3600]
 */
export async function getMedicineDocumentUrl(doc, expiresIn = 3600) {
  if (!doc?.bucket || !doc?.filePath) {
    throw new Error("Document file not available.");
  }
  return StorageService.getSignedUrl(doc.bucket, doc.filePath, expiresIn);
}

/**
 * @param {string} patientId
 */
export async function listMedicineDocuments(patientId) {
  const docs = await FirestoreService.query(COLLECTIONS.MEDICINE_DOCUMENTS, [
    ["patientId", "==", patientId],
  ]);
  docs.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
  return docs;
}

/**
 * @param {object} doc
 */
export function getCategoryLabel(doc) {
  const cat = MEDICINE_DOC_CATEGORIES.find((c) => c.value === doc?.category);
  return cat?.label || doc?.category || "Document";
}

function tsMillis(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  return new Date(value).getTime() || 0;
}
