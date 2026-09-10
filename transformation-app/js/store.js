// ==========================================================================
// Central app store: single source of truth in memory, persisted to
// IndexedDB (services/storage). Simple pub/sub — components re-render via
// the app router's subscribe() rather than a virtual DOM diff.
// ==========================================================================
import { dbGet, dbSet, dbGetAll, dbDelete, dbAdd, dbClearStore, clearAllData } from "./storage/db.js";
import { defaultSettings, createEmptyDailyLog, hydrateLog } from "./data/defaults.js";
import { todayStr, isoWeekKey } from "./utils/dates.js";
import { PLAN } from "./data/planData.js";

const listeners = new Set();

export const state = {
  settings: defaultSettings(),
  logs: {}, // date -> DailyLog
  photos: [], // {id, week, angle, date, dataUrl}
  groceryChecked: {}, // weekKey -> [itemId,...]
  journeyRoute: { page: "today", params: {} },
  ready: false,
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let notifyScheduled = false;
export function notify() {
  if (notifyScheduled) return;
  notifyScheduled = true;
  requestAnimationFrame(() => {
    notifyScheduled = false;
    listeners.forEach((fn) => fn());
  });
}

export async function initStore() {
  const [settings, logs, photos] = await Promise.all([
    dbGet("settings", "main"),
    dbGetAll("logs"),
    dbGetAll("photos"),
  ]);
  if (settings) state.settings = { ...defaultSettings(), ...settings };
  else await dbSet("settings", "main", state.settings);

  state.logs = {};
  (logs || []).forEach((l) => {
    if (l && l.date) state.logs[l.date] = hydrateLog(l, l.date);
  });
  state.photos = photos || [];

  const groceryKeys = await import("./storage/db.js").then((m) => m.dbGetAllKeys("grocery"));
  const groceryEntries = await Promise.all(groceryKeys.map((k) => dbGet("grocery", k).then((v) => [k, v])));
  groceryEntries.forEach(([k, v]) => (state.groceryChecked[k] = v || []));

  state.ready = true;
  notify();
}

export function getSettings() {
  return state.settings;
}

export async function updateSettings(partial) {
  state.settings = { ...state.settings, ...partial };
  await dbSet("settings", "main", state.settings);
  notify();
}

export function getLog(dateStr) {
  if (!state.logs[dateStr]) {
    state.logs[dateStr] = createEmptyDailyLog(dateStr);
  }
  return state.logs[dateStr];
}

export async function saveLog(dateStr, log) {
  log.updatedAt = new Date().toISOString();
  state.logs[dateStr] = log;
  await dbSet("logs", dateStr, log);
  notify();
}

/** Convenience mutator: pass a function that mutates a draft copy of today's (or given date's) log. */
export async function updateLog(dateStr, mutator) {
  const draft = JSON.parse(JSON.stringify(getLog(dateStr)));
  mutator(draft);
  await saveLog(dateStr, draft);
  return draft;
}

export function getAllLogs() {
  return state.logs;
}

// ---- Grocery (resets automatically each ISO week; manual reset also available) ----
export function currentGroceryWeekKey() {
  return isoWeekKey(todayStr());
}

export function getGroceryChecked(weekKey = currentGroceryWeekKey()) {
  return new Set(state.groceryChecked[weekKey] || []);
}

export async function toggleGroceryItem(itemId, weekKey = currentGroceryWeekKey()) {
  const set = getGroceryChecked(weekKey);
  if (set.has(itemId)) set.delete(itemId);
  else set.add(itemId);
  state.groceryChecked[weekKey] = Array.from(set);
  await dbSet("grocery", weekKey, state.groceryChecked[weekKey]);
  notify();
}

export async function resetGroceryWeek(weekKey = currentGroceryWeekKey()) {
  state.groceryChecked[weekKey] = [];
  await dbSet("grocery", weekKey, []);
  notify();
}

// ---- Photos ----
export async function addPhoto(week, angle, dataUrl) {
  const rec = { week, angle, date: todayStr(), dataUrl };
  const id = await dbAdd("photos", rec);
  state.photos.push({ ...rec, id });
  notify();
  return id;
}

export async function deletePhoto(id) {
  await dbDelete("photos", id);
  state.photos = state.photos.filter((p) => p.id !== id);
  notify();
}

export function getPhotos() {
  return state.photos;
}

// ---- Import / export / reset ----
export function exportJSON() {
  return JSON.stringify(
    { version: 1, exportedAt: new Date().toISOString(), settings: state.settings, logs: state.logs, groceryChecked: state.groceryChecked },
    null,
    2
  );
}

export function exportLogsCSV() {
  const dates = Object.keys(state.logs).sort();
  const header = ["date", "weight", "waist", "steps", "water", "sleepHours", "workoutStatus", "cardioStatus"];
  const rows = [header.join(",")];
  dates.forEach((d) => {
    const l = state.logs[d];
    rows.push(
      [
        d,
        l.weight ?? "",
        l.measurements?.waist ?? "",
        l.steps ?? "",
        l.water ?? 0,
        l.sleep?.hours ?? "",
        l.workout?.status ?? "",
        l.cardio?.status ?? "",
      ].join(",")
    );
  });
  return rows.join("\n");
}

export async function importJSON(jsonStr) {
  const data = JSON.parse(jsonStr);
  if (!data || typeof data !== "object") throw new Error("Invalid backup file");
  if (data.settings) {
    state.settings = { ...defaultSettings(), ...data.settings };
    await dbSet("settings", "main", state.settings);
  }
  if (data.logs) {
    for (const [date, log] of Object.entries(data.logs)) {
      const hydrated = hydrateLog(log, date);
      state.logs[date] = hydrated;
      await dbSet("logs", date, hydrated);
    }
  }
  if (data.groceryChecked) {
    for (const [wk, ids] of Object.entries(data.groceryChecked)) {
      state.groceryChecked[wk] = ids;
      await dbSet("grocery", wk, ids);
    }
  }
  notify();
}

export async function resetAllTrackingData() {
  // Never touches PLAN (the imported Excel plan) — only clears logged data.
  await clearAllData();
  state.logs = {};
  state.photos = [];
  state.groceryChecked = {};
  state.settings = defaultSettings();
  await dbSet("settings", "main", state.settings);
  notify();
}
