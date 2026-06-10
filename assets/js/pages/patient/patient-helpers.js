import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { ROLES } from "../../config/constants.js";

/**
 * @param {string} patientId
 */
export async function getPatientRecord(patientId) {
  return FirestoreService.getById(COLLECTIONS.PATIENTS, patientId);
}

/**
 * Resolve doctor UID for messaging and appointments.
 * @param {string} patientId
 */
export async function getAssignedDoctorId(patientId) {
  const patient = await getPatientRecord(patientId);
  if (patient?.assignedDoctorId) return patient.assignedDoctorId;

  const doctors = await FirestoreService.query(COLLECTIONS.USERS, [
    ["role", "==", ROLES.DOCTOR],
  ]);

  return doctors[0]?.id || null;
}

/**
 * @param {string} patientId
 */
export async function getActiveDietPlan(patientId) {
  const plans = await FirestoreService.query(COLLECTIONS.DIET_PLANS, [
    ["patientId", "==", patientId],
  ]);
  return plans.find((p) => p.status === "active") || null;
}

export function tsMillis(ts) {
  if (!ts) return 0;
  if (ts.toMillis) return ts.toMillis();
  return new Date(ts).getTime();
}
