import { DIRECTIONS, STORAGE_KEYS } from "../config/constants.js";

const translations = {
  en: {
    appName: "Nutrition Clinic",
    login: "Login",
    logout: "Logout",
    welcome: "Welcome",
    dashboard: "Dashboard",
    patients: "Patients",
    appointments: "Appointments",
    dietPlans: "Diet Plans",
    messages: "Messages",
    reports: "Reports",
    payments: "Payments",
    progress: "Progress",
    settings: "Settings",
    unauthorized: "You do not have permission to access this page.",
    notFound: "Page not found.",
    loading: "Loading...",
  },
  ar: {
    appName: "عيادة التغذية",
    login: "تسجيل الدخول",
    logout: "تسجيل الخروج",
    welcome: "مرحباً",
    dashboard: "لوحة التحكم",
    patients: "المرضى",
    appointments: "المواعيد",
    dietPlans: "خطط الحمية",
    messages: "الرسائل",
    reports: "التقارير",
    payments: "المدفوعات",
    progress: "التقدم",
    settings: "الإعدادات",
    unauthorized: "ليس لديك صلاحية للوصول إلى هذه الصفحة.",
    notFound: "الصفحة غير موجودة.",
    loading: "جاري التحميل...",
  },
};

let currentLocale = localStorage.getItem(STORAGE_KEYS.LOCALE) || "en";
let currentDirection =
  localStorage.getItem(STORAGE_KEYS.DIRECTION) ||
  (currentLocale === "ar" ? DIRECTIONS.RTL : DIRECTIONS.LTR);

/**
 * @param {string} key
 * @param {string} [locale]
 * @returns {string}
 */
export function t(key, locale = currentLocale) {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}

/**
 * @returns {string}
 */
export function getLocale() {
  return currentLocale;
}

/**
 * @returns {string}
 */
export function getDirection() {
  return currentDirection;
}

/**
 * @param {string} locale
 */
export function setLocale(locale) {
  currentLocale = locale;
  localStorage.setItem(STORAGE_KEYS.LOCALE, locale);

  const dir = locale === "ar" ? DIRECTIONS.RTL : DIRECTIONS.LTR;
  setDirection(dir);
}

/**
 * @param {string} direction
 */
export function setDirection(direction) {
  currentDirection = direction;
  localStorage.setItem(STORAGE_KEYS.DIRECTION, direction);
  document.documentElement.setAttribute("dir", direction);
  document.documentElement.setAttribute("lang", currentLocale);
}

/**
 * Apply stored locale/direction to the document.
 */
export function initI18n() {
  setDirection(currentDirection);
  document.documentElement.setAttribute("lang", currentLocale);
}

/**
 * Toggle between LTR and RTL.
 */
export function toggleDirection() {
  const next = currentDirection === DIRECTIONS.LTR ? DIRECTIONS.RTL : DIRECTIONS.LTR;
  setDirection(next);
  return next;
}
