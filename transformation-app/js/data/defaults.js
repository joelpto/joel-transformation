// ==========================================================================
// Default/empty data factories — the "types" of the app, documented via
// JSDoc so the shapes are explicit even without TypeScript compilation.
// ==========================================================================
import { PLAN } from "./planData.js";
import { dayOfWeekName, todayStr } from "../utils/dates.js";

/**
 * @typedef {Object} Settings
 * @property {string} startDate        "YYYY-MM-DD"
 * @property {number|null} startingWeight
 * @property {number|null} goalWeight
 * @property {number} calorieTarget
 * @property {number} proteinTarget
 * @property {number} fiberTarget
 * @property {number} waterTarget
 * @property {number|null} stepTarget
 * @property {'light'|'dark'|'system'} theme
 * @property {'metric'|'imperial'} units
 * @property {number|null} weeklyTargetRateKg
 */
export function defaultSettings() {
  const t = PLAN.dailyTargets;
  return {
    startDate: todayStr(),
    startingWeight: null,
    goalWeight: null,
    calorieTarget: t.calories.default,
    proteinTarget: t.protein.default,
    fiberTarget: t.fiber.default,
    waterTarget: t.water.default,
    stepTarget: null,
    theme: "system",
    units: "metric",
    weeklyTargetRateKg: null,
    heroPhoto: null,
    onboarded: false,
  };
}

/** One set within an exercise (weight/reps are user-entered, never invented). */
function emptySet() {
  return { weight: null, reps: null, completed: false };
}

function exerciseFromName(name) {
  return {
    name,
    sets: [emptySet(), emptySet(), emptySet()],
    notes: "",
  };
}

/** Builds the workout skeleton for a given date from the plan (day-of-week rotation). */
export function createWorkoutForDate(dateStr) {
  const dow = dayOfWeekName(dateStr);
  const plan = PLAN.workoutPlan[dow];
  if (!plan) return { exercises: [], cardioPlanned: "", duration: "", status: "not_started", label: "" };
  return {
    label: plan.label,
    exercises: plan.exercises.map(exerciseFromName),
    duration: plan.duration,
    status: plan.isRestDay ? "rest" : "not_started",
  };
}

export function createCardioForDate(dateStr) {
  const dow = dayOfWeekName(dateStr);
  const plan = PLAN.workoutPlan[dow];
  return {
    plannedType: plan ? plan.cardio : "",
    type: "",
    duration: null,
    distance: null,
    pace: "",
    calories: null,
    status: "not_started", // not_started | completed | skipped
    notes: "",
  };
}

/**
 * @typedef {Object} MealLog
 * @property {'completed'|'skipped'|'modified'} status
 * @property {Object} actual  { food, quantity, calories, protein, carbs, fat, fiber }
 * @property {string} note
 */

/**
 * @typedef {Object} DailyLog
 * @property {string} date
 * @property {number|null} weight
 * @property {Object} measurements { waist, chest, arms, thighs, hips, neck, bodyFat }
 * @property {Object.<string, MealLog>} meals  keyed by meal id
 * @property {number} water  liters logged today
 * @property {number|null} steps
 * @property {Object|null} sleep { hours, quality, notes }
 * @property {Object} workout
 * @property {Object} cardio
 * @property {Object|null} journal { energy, hunger, mood, difficulty, notes }
 * @property {string} updatedAt
 */
export function createEmptyDailyLog(dateStr) {
  return {
    date: dateStr,
    weight: null,
    measurements: {},
    meals: {},
    water: 0,
    steps: null,
    sleep: null,
    workout: createWorkoutForDate(dateStr),
    cardio: createCardioForDate(dateStr),
    journal: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Ensures a log has all nested objects present (for logs created before a schema addition). */
export function hydrateLog(log, dateStr) {
  if (!log) return createEmptyDailyLog(dateStr);
  const fresh = createEmptyDailyLog(dateStr);
  return {
    ...fresh,
    ...log,
    measurements: { ...fresh.measurements, ...(log.measurements || {}) },
    meals: log.meals || {},
    workout: log.workout && log.workout.exercises ? log.workout : fresh.workout,
    cardio: log.cardio || fresh.cardio,
  };
}
