/**
 * Application-wide constants for the Nutrition Clinic Management System.
 */

export const APP_NAME = "Nutrition Clinic";

export const ROLES = Object.freeze({
  DOCTOR: "doctor",
  SECRETARY: "secretary",
  PATIENT: "patient",
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.DOCTOR]: "Doctor",
  [ROLES.SECRETARY]: "Secretary",
  [ROLES.PATIENT]: "Patient",
});

export const DIRECTIONS = Object.freeze({
  LTR: "ltr",
  RTL: "rtl",
});

export const STORAGE_KEYS = Object.freeze({
  LOCALE: "ncms_locale",
  DIRECTION: "ncms_direction",
});

export const ROUTES = Object.freeze({
  LOGIN: "/auth/login.html",
  SETUP: "/auth/setup.html",
  DOCTOR_DASHBOARD: "/doctor/dashboard.html",
  SECRETARY_DASHBOARD: "/secretary/dashboard.html",
  PATIENT_DASHBOARD: "/patient/dashboard.html",
  UNAUTHORIZED: "/shared/unauthorized.html",
  NOT_FOUND: "/shared/not-found.html",
});

/** Default landing page per role after authentication. */
export const ROLE_HOME = Object.freeze({
  [ROLES.DOCTOR]: ROUTES.DOCTOR_DASHBOARD,
  [ROLES.SECRETARY]: ROUTES.SECRETARY_DASHBOARD,
  [ROLES.PATIENT]: ROUTES.PATIENT_DASHBOARD,
});
