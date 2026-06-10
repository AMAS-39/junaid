import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { ROLES } from "../../config/constants.js";

export function tsMillis(ts) {
  if (!ts) return 0;
  if (ts.toMillis) return ts.toMillis();
  return new Date(ts).getTime();
}

export function isToday(timestamp) {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

/**
 * Load all patients keyed by id.
 */
export async function loadPatientsMap() {
  const patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
  return Object.fromEntries(patients.map((p) => [p.id, p]));
}

/**
 * Resolve a doctor UID for appointments.
 */
export async function getDefaultDoctorId() {
  const doctors = await FirestoreService.query(COLLECTIONS.USERS, [
    ["role", "==", ROLES.DOCTOR],
  ]);
  return doctors[0]?.id || "";
}
