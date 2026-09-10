// ==========================================================================
// Date / week / 84-day journey logic. All dates are handled as local
// "YYYY-MM-DD" strings to avoid timezone drift.
// ==========================================================================

export const TOTAL_DAYS = 84;
export const TOTAL_WEEKS = 12;
export const DOW_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function todayStr() {
  return toDateStr(new Date());
}

export function toDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromDateStr(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(dateStr, n) {
  const d = fromDateStr(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function dayOfWeekName(dateStr) {
  const d = fromDateStr(dateStr);
  return DOW_NAMES[d.getDay()];
}

// Day index relative to start date: 0 = start date, ... 83 = last day.
// Negative = before program starts. >=84 = after program ends.
export function dayIndex(startDate, dateStr) {
  const start = fromDateStr(startDate);
  const d = fromDateStr(dateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((d.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / msPerDay);
}

export function weekNumberForIndex(idx) {
  if (idx < 0) return 0;
  return Math.min(TOTAL_WEEKS, Math.floor(idx / 7) + 1);
}

export function weekNumber(startDate, dateStr) {
  return weekNumberForIndex(dayIndex(startDate, dateStr));
}

// All 7 date strings belonging to a given 1-indexed week.
export function datesInWeek(startDate, week) {
  const first = (week - 1) * 7;
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, first + i));
}

export function allJourneyDates(startDate) {
  return Array.from({ length: TOTAL_DAYS }, (_, i) => addDays(startDate, i));
}

export function formatDateLong(dateStr) {
  const d = fromDateStr(dateStr);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function formatDateShort(dateStr) {
  const d = fromDateStr(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function isoWeekKey(dateStr) {
  // Monday-based ISO week key, used to auto-reset the grocery list weekly.
  const d = fromDateStr(dateStr);
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const diff = target - firstThursday;
  const week = 1 + Math.round(diff / (7 * 24 * 60 * 60 * 1000));
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthMatrix(year, month) {
  // Returns weeks (array of 7) of Date|null for calendar rendering, Sun-first.
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
