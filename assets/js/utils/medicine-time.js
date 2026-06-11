/**
 * Sort and group medicine reminders by time label.
 */

/**
 * @param {string} timeStr
 * @returns {number}
 */
export function getTimeSortValue(timeStr) {
  const raw = String(timeStr || "").trim().toLowerCase();
  if (!raw) return 9999;

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})/);
  if (hhmm) {
    const h = Math.min(23, parseInt(hhmm[1], 10));
    const m = Math.min(59, parseInt(hhmm[2], 10));
    return h * 60 + m;
  }

  const keywords = {
    morning: 480,
    breakfast: 510,
    noon: 720,
    lunch: 780,
    afternoon: 900,
    evening: 1080,
    dinner: 1140,
    night: 1200,
    bedtime: 1320,
  };

  for (const [word, value] of Object.entries(keywords)) {
    if (raw.includes(word)) return value;
  }

  return 8000 + raw.charCodeAt(0);
}

/**
 * @param {object[]} reminders
 * @returns {Array<{ time: string, items: object[] }>}
 */
export function groupRemindersByTime(reminders) {
  const map = new Map();

  for (const reminder of reminders) {
    const time = String(reminder.time || "Any time").trim() || "Any time";
    if (!map.has(time)) map.set(time, []);
    map.get(time).push(reminder);
  }

  return Array.from(map.entries())
    .sort((a, b) => getTimeSortValue(a[0]) - getTimeSortValue(b[0]))
    .map(([time, items]) => ({
      time,
      items: items.sort((a, b) =>
        String(a.medicineName || "").localeCompare(String(b.medicineName || ""))
      ),
    }));
}
