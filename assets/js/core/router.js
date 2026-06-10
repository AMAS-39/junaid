import { ROUTES, ROLE_HOME, ROLES } from "../config/constants.js";

/**
 * Route registry — maps paths to metadata for guards and navigation.
 * Paths are relative to the site root.
 */
export const routeRegistry = Object.freeze([
  {
    path: ROUTES.LOGIN,
    name: "login",
    public: true,
    roles: [],
  },
  {
    path: ROUTES.SETUP,
    name: "setup",
    public: true,
    roles: [],
    title: "Staff Setup",
  },
  {
    path: ROUTES.DOCTOR_DASHBOARD,
    name: "doctor-dashboard",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Doctor Dashboard",
  },
  {
    path: "/doctor/patients/list.html",
    name: "doctor-patients",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Patients",
  },
  {
    path: "/doctor/patients/details.html",
    name: "doctor-patient-details",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Patient Details",
  },
  {
    path: "/doctor/diet-plans/list.html",
    name: "doctor-diet-plans",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Diet Plans",
  },
  {
    path: "/doctor/diet-plans/create.html",
    name: "doctor-diet-plan-create",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Create Diet Plan",
  },
  {
    path: "/doctor/diet-plans/edit.html",
    name: "doctor-diet-plan-edit",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Edit Diet Plan",
  },
  {
    path: "/doctor/appointments/list.html",
    name: "doctor-appointments",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Appointments",
  },
  {
    path: "/doctor/progress/list.html",
    name: "doctor-progress",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Patient Progress",
  },
  {
    path: "/doctor/photos/list.html",
    name: "doctor-photos",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Patient Photos",
  },
  {
    path: "/doctor/messages/list.html",
    name: "doctor-messages",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Messages",
  },
  {
    path: "/doctor/reports/list.html",
    name: "doctor-reports",
    public: false,
    roles: [ROLES.DOCTOR],
    title: "Reports",
  },
  {
    path: ROUTES.SECRETARY_DASHBOARD,
    name: "secretary-dashboard",
    public: false,
    roles: [ROLES.SECRETARY],
    title: "Secretary Dashboard",
  },
  {
    path: "/secretary/add-patient.html",
    name: "secretary-add-patient",
    public: false,
    roles: [ROLES.SECRETARY],
    title: "Add Patient",
  },
  {
    path: "/secretary/patients/list.html",
    name: "secretary-patients",
    public: false,
    roles: [ROLES.SECRETARY],
    title: "Patients",
  },
  {
    path: "/secretary/appointments/list.html",
    name: "secretary-appointments",
    public: false,
    roles: [ROLES.SECRETARY],
    title: "Appointments",
  },
  {
    path: "/secretary/payments/list.html",
    name: "secretary-payments",
    public: false,
    roles: [ROLES.SECRETARY],
    title: "Payments",
  },
  {
    path: ROUTES.PATIENT_DASHBOARD,
    name: "patient-dashboard",
    public: false,
    roles: [ROLES.PATIENT],
    title: "My Dashboard",
  },
  {
    path: "/patient/diet-plan/view.html",
    name: "patient-diet-plan",
    public: false,
    roles: [ROLES.PATIENT],
    title: "My Diet Plan",
  },
  {
    path: "/patient/progress/list.html",
    name: "patient-progress",
    public: false,
    roles: [ROLES.PATIENT],
    title: "My Progress",
  },
  {
    path: "/patient/appointments/list.html",
    name: "patient-appointments",
    public: false,
    roles: [ROLES.PATIENT],
    title: "Appointments",
  },
  {
    path: "/patient/messages/list.html",
    name: "patient-messages",
    public: false,
    roles: [ROLES.PATIENT],
    title: "Messages",
  },
  {
    path: ROUTES.UNAUTHORIZED,
    name: "unauthorized",
    public: true,
    roles: [],
  },
  {
    path: ROUTES.NOT_FOUND,
    name: "not-found",
    public: true,
    roles: [],
  },
]);

/**
 * Resolve the current page path relative to site root.
 * @returns {string}
 */
export function getCurrentPath() {
  const { pathname } = window.location;
  const segments = pathname.split("/").filter(Boolean);
  const projectIndex = segments.findIndex((s) =>
    ["auth", "doctor", "secretary", "patient", "shared"].includes(s)
  );

  if (projectIndex === -1) {
    return pathname.endsWith("login.html") ? ROUTES.LOGIN : pathname;
  }

  return "/" + segments.slice(projectIndex).join("/");
}

/**
 * Find route metadata for a given path.
 * @param {string} path
 */
export function findRoute(path) {
  const normalized = path.split("?")[0];
  return routeRegistry.find((r) => r.path === normalized) ?? null;
}

/**
 * Get the home route for a user role.
 * @param {string} role
 * @returns {string}
 */
export function getHomeForRole(role) {
  return ROLE_HOME[role] || ROUTES.LOGIN;
}

/**
 * Navigate to a route (full page navigation).
 * @param {string} path
 * @param {{ replace?: boolean }} [options]
 */
export function navigateTo(path, options = {}) {
  const base = getBasePath();
  const url = `${base}${path}`;

  if (options.replace) {
    window.location.replace(url);
  } else {
    window.location.href = url;
  }
}

/**
 * Detect base path when app is served from a subdirectory.
 * @returns {string}
 */
export function getBasePath() {
  const path = window.location.pathname;
  const routePrefixes = ["/auth/", "/doctor/", "/secretary/", "/patient/", "/shared/"];

  for (const prefix of routePrefixes) {
    const idx = path.indexOf(prefix);
    if (idx >= 0) {
      return idx === 0 ? "" : path.slice(0, idx);
    }
  }

  return "";
}

/**
 * Build an absolute app URL from a route path.
 * @param {string} routePath
 * @returns {string}
 */
export function buildUrl(routePath) {
  return `${getBasePath()}${routePath}`;
}

/**
 * Check if a role can access a route.
 * @param {string} role
 * @param {string} path
 * @returns {boolean}
 */
export function canAccess(role, path) {
  const route = findRoute(path);
  if (!route) return false;
  if (route.public) return true;
  return route.roles.includes(role);
}
