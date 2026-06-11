import { ROLES } from "../config/constants.js";
import { t } from "./i18n.js";

/**
 * Navigation items per role — used by sidebar and bottom nav.
 * @param {string} role
 * @returns {Array<{ label: string, href: string, icon: string, id: string }>}
 */
export function getNavItems(role) {
  const items = {
    [ROLES.DOCTOR]: [
      { id: "dashboard", labelKey: "nav.dashboard", href: "/doctor/dashboard.html", icon: "grid" },
      { id: "patients", labelKey: "nav.patients", href: "/doctor/patients/list.html", icon: "users" },
      { id: "diet-plans", labelKey: "nav.dietPlans", href: "/doctor/diet-plans/list.html", icon: "leaf" },
      { id: "appointments", labelKey: "nav.appointments", href: "/doctor/appointments/list.html", icon: "calendar" },
      { id: "messages", labelKey: "nav.messages", href: "/doctor/messages/list.html", icon: "message" },
      { id: "reports", labelKey: "nav.reports", href: "/doctor/reports/list.html", icon: "chart" },
    ],
    [ROLES.SECRETARY]: [
      { id: "dashboard", labelKey: "nav.dashboard", href: "/secretary/dashboard.html", icon: "grid" },
      { id: "add-patient", labelKey: "nav.addPatient", href: "/secretary/add-patient.html", icon: "user-plus" },
      { id: "patients", labelKey: "nav.patients", href: "/secretary/patients/list.html", icon: "users" },
      { id: "appointments", labelKey: "nav.appointments", href: "/secretary/appointments/list.html", icon: "calendar" },
      { id: "payments", labelKey: "nav.payments", href: "/secretary/payments/list.html", icon: "wallet" },
    ],
    [ROLES.PATIENT]: [
      { id: "dashboard", labelKey: "nav.home", href: "/patient/dashboard.html", icon: "grid" },
      { id: "diet-plan", labelKey: "nav.diet", href: "/patient/diet-plan/view.html", icon: "leaf" },
      { id: "medicine", labelKey: "nav.medicine", href: "/patient/medicine/list.html", icon: "pill" },
      { id: "appointments", labelKey: "nav.visits", href: "/patient/appointments/list.html", icon: "calendar" },
      { id: "messages", labelKey: "nav.chat", href: "/patient/messages/list.html", icon: "message" },
    ],
  };

  const roleItems = items[role] || [];
  return roleItems.map((item) => ({
    ...item,
    label: t(item.labelKey),
  }));
}

/** SVG icon map for navigation. */
export const NAV_ICONS = {
  grid: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  users: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  "user-plus": `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`,
  leaf: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`,
  calendar: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  message: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  chart: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  wallet: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>`,
  trending: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  camera: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  pill: `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
};
