/**
 * Firestore collections architecture.
 * Defines collection names, document shapes, and relationships.
 * Business logic is not implemented here — only schema contracts.
 */

export const COLLECTIONS = Object.freeze({
  USERS: "users",
  PATIENTS: "patients",
  APPOINTMENTS: "appointments",
  DIET_PLANS: "dietPlans",
  MESSAGES: "messages",
  PROGRESS_ENTRIES: "progressEntries",
  PAYMENTS: "payments",
  REPORTS: "reports",
  NOTIFICATIONS: "notifications",
  PATIENT_PHOTOS: "patientPhotos",
  DOCTOR_NOTES: "doctorNotes",
  DAILY_CHECKLISTS: "dailyChecklists",
});

/**
 * @typedef {Object} UserDocument
 * @property {string} name
 * @property {string} email
 * @property {string} phone
 * @property {"doctor"|"secretary"|"patient"} role
 * @property {string} [avatarUrl]
 * @property {import("firebase/firestore").Timestamp} createdAt
 * @property {import("firebase/firestore").Timestamp} [updatedAt]
 * @property {string} [createdBy] - UID of creator (for patients)
 * @property {boolean} [isActive]
 */

/**
 * @typedef {Object} PatientDocument
 * @property {string} patientId - Same as Firebase Auth UID
 * @property {string} fullName
 * @property {string} email
 * @property {string} phone
 * @property {"Male"|"Female"|"Other"} gender
 * @property {number} age
 * @property {number} height - cm
 * @property {number} currentWeight - kg
 * @property {number} targetWeight - kg
 * @property {string} assignedDoctorId
 * @property {import("firebase/firestore").Timestamp} createdAt
 * @property {import("firebase/firestore").Timestamp} [updatedAt]
 * @property {string} createdBy
 */

/**
 * @typedef {Object} AppointmentDocument
 * @property {string} patientId
 * @property {string} doctorId
 * @property {string} [secretaryId]
 * @property {import("firebase/firestore").Timestamp} scheduledAt
 * @property {"pending"|"approved"|"rejected"|"completed"|"cancelled"} status
 * @property {string} [notes]
 * @property {import("firebase/firestore").Timestamp} createdAt
 */

/**
 * @typedef {Object} DietPlanDocument
 * @property {string} patientId
 * @property {string} doctorId
 * @property {string} title
 * @property {Object[]} meals - Structured meal entries (to be defined in business layer)
 * @property {import("firebase/firestore").Timestamp} startDate
 * @property {import("firebase/firestore").Timestamp} [endDate]
 * @property {"active"|"archived"} status
 * @property {import("firebase/firestore").Timestamp} createdAt
 */

/**
 * @typedef {Object} MessageDocument
 * @property {string} senderId
 * @property {string} receiverId
 * @property {string} body
 * @property {boolean} read
 * @property {import("firebase/firestore").Timestamp} createdAt
 */

/**
 * @typedef {Object} ProgressEntryDocument
 * @property {string} patientId
 * @property {number} weight
 * @property {string} [notes]
 * @property {string[]} [photoUrls] - Supabase storage paths
 * @property {import("firebase/firestore").Timestamp} recordedAt
 * @property {import("firebase/firestore").Timestamp} createdAt
 */

/**
 * @typedef {Object} PaymentDocument
 * @property {string} patientId
 * @property {number} amount
 * @property {"paid"|"unpaid"|"partial"} status
 * @property {string} [description]
 * @property {string} recordedBy - Secretary UID
 * @property {import("firebase/firestore").Timestamp} createdAt
 */

/**
 * @typedef {Object} ReportDocument
 * @property {string} patientId
 * @property {string} doctorId
 * @property {string} title
 * @property {Object} summary - Structured report data (business layer)
 * @property {import("firebase/firestore").Timestamp} generatedAt
 */

/**
 * @typedef {Object} DailyChecklistDocument
 * @property {string} patientId
 * @property {string} date - YYYY-MM-DD
 * @property {boolean} breakfastDone
 * @property {string} [breakfastWhat]
 * @property {string} [breakfastHow]
 * @property {string} [breakfastAmount]
 * @property {boolean} lunchDone
 * @property {string} [lunchWhat]
 * @property {string} [lunchHow]
 * @property {string} [lunchAmount]
 * @property {boolean} dinnerDone
 * @property {string} [dinnerWhat]
 * @property {string} [dinnerHow]
 * @property {string} [dinnerAmount]
 * @property {boolean} snacksDone
 * @property {string} [snacksWhat]
 * @property {string} [snacksHow]
 * @property {string} [snacksAmount]
 * @property {boolean} waterDone
 * @property {string} [waterWhat]
 * @property {string} [waterHow]
 * @property {string} [waterAmount]
 * @property {import("firebase/firestore").Timestamp} updatedAt
 */

/**
 * @typedef {Object} DoctorNoteDocument
 * @property {string} patientId
 * @property {string} doctorId
 * @property {string} note
 * @property {import("firebase/firestore").Timestamp} createdAt
 * @property {import("firebase/firestore").Timestamp} updatedAt
 */

/**
 * @typedef {Object} NotificationDocument
 * @property {string} userId
 * @property {string} title
 * @property {string} body
 * @property {string} [link]
 * @property {boolean} read
 * @property {import("firebase/firestore").Timestamp} createdAt
 */

/** Sub-collection paths (parentId is the parent document ID). */
export const SUB_COLLECTIONS = Object.freeze({
  PATIENT_NOTES: (patientId) => `${COLLECTIONS.PATIENTS}/${patientId}/notes`,
  DIET_PLAN_ITEMS: (planId) => `${COLLECTIONS.DIET_PLANS}/${planId}/items`,
});

/** Firestore security rule hints (document in code for developers). */
export const FIRESTORE_ACCESS = Object.freeze({
  [COLLECTIONS.USERS]: "Owner read/write; staff read patients",
  [COLLECTIONS.PATIENTS]: "Doctor/secretary write; patient read own",
  [COLLECTIONS.APPOINTMENTS]: "Role-based read; secretary/doctor write",
  [COLLECTIONS.DIET_PLANS]: "Doctor write; patient read own",
  [COLLECTIONS.MESSAGES]: "Sender/receiver only",
  [COLLECTIONS.PROGRESS_ENTRIES]: "Patient write own; doctor read assigned",
  [COLLECTIONS.PAYMENTS]: "Secretary write; doctor read",
  [COLLECTIONS.REPORTS]: "Doctor write; patient read own",
  [COLLECTIONS.NOTIFICATIONS]: "User read own",
  [COLLECTIONS.PATIENT_PHOTOS]: "Patient upload own; doctor read assigned",
  [COLLECTIONS.DOCTOR_NOTES]: "Doctor read/write own notes only",
  [COLLECTIONS.DAILY_CHECKLISTS]: "Patient write own; doctor read assigned patients",
});
