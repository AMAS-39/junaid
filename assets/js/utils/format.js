/**
 * Shared formatting utilities.
 */
import { getIntlLocale, t } from "../core/i18n.js";

export function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

export function calculateBMI(heightCm, weightKg) {
  const height = Number(heightCm);
  const weight = Number(weightKg);
  if (!height || !weight) return null;
  const heightM = height / 100;
  return Number((weight / (heightM * heightM)).toFixed(1));
}

export function formatDate(value) {
  if (!value) return t("common.notFound");
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString(getIntlLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return t("common.notFound");
  }
}

export function formatDateTime(value) {
  if (!value) return t("common.notFound");
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleString(getIntlLocale(), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return t("common.notFound");
  }
}

/**
 * @param {Date | string | { toDate?: () => Date }} value
 */
export function toJsDate(value) {
  if (!value) return null;
  try {
    return value?.toDate ? value.toDate() : new Date(value);
  } catch {
    return null;
  }
}

/**
 * @param {Date | string | { toDate?: () => Date }} value
 */
export function isDateToday(value) {
  const date = toJsDate(value);
  if (!date) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Visual date parts for appointment cards.
 * @param {Date | string | { toDate?: () => Date }} value
 */
export function formatAppointmentParts(value) {
  const date = toJsDate(value);
  if (!date) {
    return { day: "—", month: "", weekday: "", time: "", full: t("common.notFound"), isToday: false };
  }
  return {
    day: date.toLocaleDateString(getIntlLocale(), { day: "numeric" }),
    month: date.toLocaleDateString(getIntlLocale(), { month: "short" }),
    weekday: date.toLocaleDateString(getIntlLocale(), { weekday: "short" }),
    time: date.toLocaleTimeString(getIntlLocale(), { hour: "2-digit", minute: "2-digit" }),
    full: formatDateTime(value),
    isToday: isDateToday(date),
  };
}

export function formatNumber(value, options = {}) {
  const num = Number(value);
  if (Number.isNaN(num)) return String(value ?? "");
  return num.toLocaleString(getIntlLocale(), options);
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
