/**
 * Shared formatting utilities.
 */

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
  if (!value) return "N/A";
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

export function formatDateTime(value) {
  if (!value) return "N/A";
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "N/A";
  }
}

export function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
