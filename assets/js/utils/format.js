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
