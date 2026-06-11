import { DIRECTIONS, STORAGE_KEYS } from "../config/constants.js";
import en from "../i18n/en.js";
import ar from "../i18n/ar.js";
import ku from "../i18n/ku.js";

export const SUPPORTED_LOCALES = Object.freeze(["en", "ar", "ku"]);
export const RTL_LOCALES = Object.freeze(["ar", "ku"]);

const translations = { en, ar, ku };

let currentLocale = normalizeLocale(localStorage.getItem(STORAGE_KEYS.LOCALE) || "en");
let currentDirection =
  localStorage.getItem(STORAGE_KEYS.DIRECTION) || localeToDirection(currentLocale);

/**
 * @param {string} locale
 */
function normalizeLocale(locale) {
  const value = String(locale || "en").toLowerCase();
  return SUPPORTED_LOCALES.includes(value) ? value : "en";
}

/**
 * @param {string} locale
 */
function localeToDirection(locale) {
  return RTL_LOCALES.includes(normalizeLocale(locale)) ? DIRECTIONS.RTL : DIRECTIONS.LTR;
}

/**
 * @param {string} locale
 * @returns {string}
 */
export function getIntlLocale(locale = currentLocale) {
  const loc = normalizeLocale(locale);
  if (loc === "ar") return "ar";
  if (loc === "ku") {
    try {
      new Intl.DateTimeFormat("ckb-IQ");
      return "ckb-IQ";
    } catch {
      return "ar-IQ";
    }
  }
  return "en";
}

/**
 * @param {string} key - Dot path e.g. "buttons.save"
 * @param {string} [locale]
 * @returns {string}
 */
export function t(key, locale = currentLocale) {
  const value = resolveKey(translations[normalizeLocale(locale)], key);
  if (value !== undefined) return String(value);

  const fallback = resolveKey(translations.en, key);
  return fallback !== undefined ? String(fallback) : key;
}

/**
 * @param {object} obj
 * @param {string} key
 */
function resolveKey(obj, key) {
  if (!obj || !key) return undefined;
  if (obj[key] !== undefined) return obj[key];

  const parts = key.split(".");
  let current = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}

/**
 * @param {string} status
 */
export function tStatus(status) {
  const key = String(status || "").trim().toLowerCase();
  if (!key) return "";
  const translated = t(`status.${key}`);
  return translated === `status.${key}` ? status : translated;
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
  currentLocale = normalizeLocale(locale);
  localStorage.setItem(STORAGE_KEYS.LOCALE, currentLocale);
  setDirection(localeToDirection(currentLocale));
}

/**
 * @param {string} direction
 */
export function setDirection(direction) {
  currentDirection = direction === DIRECTIONS.RTL ? DIRECTIONS.RTL : DIRECTIONS.LTR;
  localStorage.setItem(STORAGE_KEYS.DIRECTION, currentDirection);
  document.documentElement.setAttribute("dir", currentDirection);
  document.documentElement.setAttribute("lang", currentLocale);
  document.body?.classList.toggle("ncms-rtl", currentDirection === DIRECTIONS.RTL);
}

/**
 * Apply stored locale/direction to the document.
 */
export function initI18n() {
  currentDirection = localeToDirection(currentLocale);
  setDirection(currentDirection);
}

/**
 * Apply data-i18n / data-i18n-placeholder attributes in the DOM.
 * @param {ParentNode} [root]
 */
export function applyPageTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const value = t(key);
    if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
      if (el.hasAttribute("data-i18n-placeholder")) {
        el.placeholder = value;
      } else {
        el.value = value;
      }
    } else {
      el.textContent = value;
    }
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) el.placeholder = t(key);
  });

  root.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key) el.title = t(key);
  });
}

/**
 * Render language switcher options HTML.
 */
export function renderLanguageOptions() {
  return SUPPORTED_LOCALES.map((code) => {
    const label = t(`language.${code}`);
    return `<option value="${code}">${label}</option>`;
  }).join("");
}

/**
 * @deprecated Use language switcher instead.
 */
export function toggleDirection() {
  const next = currentDirection === DIRECTIONS.LTR ? DIRECTIONS.RTL : DIRECTIONS.LTR;
  setDirection(next);
  return next;
}
