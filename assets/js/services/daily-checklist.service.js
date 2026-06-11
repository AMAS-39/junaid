import { FirestoreService } from "./firestore.service.js";
import { COLLECTIONS } from "../architecture/firestore-collections.js";

/** Daily checklist task definitions. */
export const CHECKLIST_ITEMS = Object.freeze([
  {
    key: "breakfastDone",
    prefix: "breakfast",
    label: "Breakfast completed",
    shortLabel: "Breakfast",
    type: "meal",
    icon: "🌅",
  },
  {
    key: "lunchDone",
    prefix: "lunch",
    label: "Lunch completed",
    shortLabel: "Lunch",
    type: "meal",
    icon: "☀️",
  },
  {
    key: "dinnerDone",
    prefix: "dinner",
    label: "Dinner completed",
    shortLabel: "Dinner",
    type: "meal",
    icon: "🌙",
  },
  {
    key: "snacksDone",
    prefix: "snacks",
    label: "Snacks completed",
    shortLabel: "Snacks",
    type: "meal",
    icon: "🍎",
  },
  {
    key: "waterDone",
    prefix: "water",
    label: "Water goal completed",
    shortLabel: "Water",
    type: "water",
    icon: "💧",
  },
]);

/** @param {string} prefix */
export function getDetailFieldKeys(prefix) {
  return {
    what: `${prefix}What`,
    how: `${prefix}How`,
    amount: `${prefix}Amount`,
  };
}

/**
 * @returns {string} YYYY-MM-DD (local date)
 */
export function getTodayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * @param {string} patientId
 * @returns {string}
 */
export function getChecklistDocId(patientId) {
  return `${patientId}_${getTodayDateString()}`;
}

/**
 * @param {string} patientId
 * @returns {object}
 */
export function emptyChecklist(patientId) {
  const base = {
    patientId,
    date: getTodayDateString(),
    breakfastDone: false,
    lunchDone: false,
    dinnerDone: false,
    snacksDone: false,
    waterDone: false,
  };

  for (const item of CHECKLIST_ITEMS) {
    const fields = getDetailFieldKeys(item.prefix);
    base[fields.what] = "";
    base[fields.how] = "";
    base[fields.amount] = "";
  }

  return base;
}

/**
 * Load today's checklist for a patient (defaults if missing).
 * @param {string} patientId
 */
export async function getTodayChecklist(patientId) {
  const docId = getChecklistDocId(patientId);
  const doc = await FirestoreService.getById(COLLECTIONS.DAILY_CHECKLISTS, docId);

  if (!doc) {
    return { id: docId, ...emptyChecklist(patientId) };
  }

  return { ...emptyChecklist(patientId), ...doc, id: docId };
}

/**
 * Upsert partial fields on today's checklist document.
 * @param {string} patientId
 * @param {Record<string, unknown>} fields
 */
export async function updateChecklistFields(patientId, fields) {
  const docId = getChecklistDocId(patientId);
  const existing = await FirestoreService.getById(COLLECTIONS.DAILY_CHECKLISTS, docId);

  if (existing) {
    await FirestoreService.update(COLLECTIONS.DAILY_CHECKLISTS, docId, fields);
    return;
  }

  await FirestoreService.create(
    COLLECTIONS.DAILY_CHECKLISTS,
    {
      ...emptyChecklist(patientId),
      ...fields,
      updatedAt: FirestoreService.serverTimestamp(),
    },
    docId
  );
}

/**
 * Toggle or set a checklist done field for today.
 * @param {string} patientId
 * @param {string} field
 * @param {boolean} done
 */
export async function setChecklistItem(patientId, field, done) {
  await updateChecklistFields(patientId, { [field]: done });
}

/**
 * Save detail fields for one checklist entry (meal or water).
 * @param {string} patientId
 * @param {string} prefix
 * @param {{ what?: string, how?: string, amount?: string, done?: boolean }} details
 */
export async function saveChecklistEntryDetails(patientId, prefix, details) {
  const fields = getDetailFieldKeys(prefix);
  const item = CHECKLIST_ITEMS.find((i) => i.prefix === prefix);
  const payload = {
    [fields.what]: details.what ?? "",
    [fields.how]: details.how ?? "",
    [fields.amount]: details.amount ?? "",
  };

  if (typeof details.done === "boolean" && item) {
    payload[item.key] = details.done;
  }

  await updateChecklistFields(patientId, payload);
}

/**
 * @param {object} checklist
 * @param {string} prefix
 */
export function getEntryDetails(checklist, prefix) {
  const fields = getDetailFieldKeys(prefix);
  return {
    what: String(checklist?.[fields.what] || "").trim(),
    how: String(checklist?.[fields.how] || "").trim(),
    amount: String(checklist?.[fields.amount] || "").trim(),
  };
}

/**
 * @param {object} checklist
 * @returns {{ completed: number, total: number, percent: number }}
 */
export function getComplianceStats(checklist) {
  const total = CHECKLIST_ITEMS.length;
  const completed = CHECKLIST_ITEMS.filter((item) => Boolean(checklist?.[item.key])).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
