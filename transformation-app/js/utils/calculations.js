// ==========================================================================
// All derived numbers in the app are computed here, from PLAN (source of
// truth) + logged DailyLog data. Nothing here invents plan values — it only
// aggregates what the Excel specified and what the user actually logged.
// ==========================================================================
import { PLAN } from "../data/planData.js";
import { dayOfWeekName, weekNumber, datesInWeek, dayIndex, todayStr } from "./dates.js";

const round1 = (n) => Math.round(n * 10) / 10;
const round0 = (n) => Math.round(n);

export function plannedMealsForDate(dateStr) {
  return PLAN.mealPlan[dayOfWeekName(dateStr)] || [];
}

export function plannedWorkoutForDate(dateStr) {
  return PLAN.workoutPlan[dayOfWeekName(dateStr)] || null;
}

/** Sum of the plan's own nutrition numbers for a day — never altered by logging. */
export function plannedTotals(dateStr) {
  const meals = plannedMealsForDate(dateStr);
  return meals.reduce(
    (acc, m) => {
      acc.calories += m.calories || 0;
      acc.protein += m.protein || 0;
      acc.carbs += m.carbs || 0;
      acc.fat += m.fat || 0;
      acc.fiber += m.fiber || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}

/**
 * Actual totals so far, built from what's been logged for each planned meal:
 *  - completed -> counts the plan's own numbers
 *  - modified  -> counts the user's entered numbers (falls back to plan's
 *                 number for any macro the user left blank)
 *  - skipped   -> counts as zero
 *  - not logged yet -> excluded (not zero — simply "pending")
 */
export function actualTotals(dailyLog, dateStr) {
  const meals = plannedMealsForDate(dateStr);
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  let loggedCount = 0;
  meals.forEach((m) => {
    const entry = dailyLog.meals[m.id];
    if (!entry) return;
    loggedCount++;
    if (entry.status === "skipped") return;
    if (entry.status === "modified" && entry.actual) {
      totals.calories += num(entry.actual.calories, m.calories);
      totals.protein += num(entry.actual.protein, m.protein);
      totals.carbs += num(entry.actual.carbs, m.carbs);
      totals.fat += num(entry.actual.fat, m.fat);
      totals.fiber += num(entry.actual.fiber, m.fiber);
    } else {
      totals.calories += m.calories || 0;
      totals.protein += m.protein || 0;
      totals.carbs += m.carbs || 0;
      totals.fat += m.fat || 0;
      totals.fiber += m.fiber || 0;
    }
  });
  return { ...totals, loggedCount, totalCount: meals.length };
}

function num(v, fallback) {
  return typeof v === "number" && !Number.isNaN(v) ? v : fallback || 0;
}

export function mealStatus(dailyLog, mealId) {
  const e = dailyLog.meals[mealId];
  return e ? e.status : "pending";
}

/** Total completed sets / total sets across a workout's exercises. */
export function workoutSetStats(workout) {
  let total = 0, completed = 0;
  (workout.exercises || []).forEach((ex) => {
    ex.sets.forEach((s) => {
      total++;
      if (s.completed) completed++;
    });
  });
  return { total, completed, pct: total ? Math.round((completed / total) * 100) : 0 };
}

export function exercisesTouched(workout) {
  return (workout.exercises || []).filter((ex) => ex.sets.some((s) => s.completed)).length;
}

/**
 * Composite 0-100 daily consistency score. Weighted toward actually
 * following the plan (meals + training) over passive logging.
 * Weights: meals 35%, workout 25%, cardio 15%, water 15%, other logging 10%.
 */
export function dailyScore(dailyLog, dateStr, waterTarget = 2.5) {
  const meals = plannedMealsForDate(dateStr);
  let mealPts = 0;
  meals.forEach((m) => {
    const e = dailyLog.meals[m.id];
    if (!e) return;
    if (e.status === "completed" || e.status === "modified") mealPts += 1;
    else if (e.status === "skipped") mealPts += 0;
  });
  const mealScore = meals.length ? mealPts / meals.length : 0;

  const plan = plannedWorkoutForDate(dateStr);
  let workoutScore = 1;
  if (plan && !plan.isRestDay) {
    const stats = workoutSetStats(dailyLog.workout);
    workoutScore = dailyLog.workout.status === "skipped" ? 0 : stats.pct / 100;
  }

  let cardioScore = 1;
  if (plan && !plan.isRestDay) {
    cardioScore = dailyLog.cardio.status === "completed" ? 1 : dailyLog.cardio.status === "skipped" ? 0.4 : 0;
  }

  const waterScore = Math.min(1, (dailyLog.water || 0) / waterTarget);

  const loggingScore = ((dailyLog.weight ? 1 : 0) + (dailyLog.steps ? 1 : 0)) / 2;

  const score =
    mealScore * 0.35 + workoutScore * 0.25 + cardioScore * 0.15 + waterScore * 0.15 + loggingScore * 0.1;
  return Math.round(score * 100);
}

export function dayStatus(score, hasAnyLog) {
  if (!hasAnyLog) return "not_started";
  if (score >= 75) return "excellent";
  if (score >= 40) return "partial";
  return "missed";
}

export function hasAnyLogging(log) {
  return (
    Object.keys(log.meals || {}).length > 0 ||
    !!log.weight ||
    (log.water || 0) > 0 ||
    !!log.steps ||
    !!log.sleep ||
    exercisesTouched(log.workout) > 0 ||
    log.cardio.status !== "not_started"
  );
}

/** 7-day trailing average of weight ending at dateStr (uses whatever days have entries). */
export function trailingAvgWeight(logsByDate, dateStr, windowDays = 7) {
  const idx = dayIndex(dateStr, dateStr); // 0
  const vals = [];
  for (let i = 0; i < windowDays; i++) {
    const d = shiftDate(dateStr, -i);
    const log = logsByDate[d];
    if (log && typeof log.weight === "number") vals.push(log.weight);
  }
  if (!vals.length) return null;
  return round1(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function shiftDate(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/** Aggregates a full week (1-12) from the per-date logs, per the 12-Week Tracker sheet columns. */
export function weekSummary(startDate, week, logsByDate, waterTarget = 2.5) {
  const dates = datesInWeek(startDate, week);
  const today = todayStr();
  const pastOrToday = dates.filter((d) => d <= today);
  const weights = [], waists = [], cals = [], prots = [], steps = [], scores = [];
  let gymSessions = 0, cardioSessions = 0, plannedTrainingDays = 0;

  dates.forEach((d) => {
    const log = logsByDate[d];
    if (!log) return;
    if (typeof log.weight === "number") weights.push(log.weight);
    if (typeof log.measurements?.waist === "number") waists.push(log.measurements.waist);
    if (typeof log.steps === "number") steps.push(log.steps);
    const at = actualTotals(log, d);
    if (at.loggedCount > 0) {
      cals.push(at.calories);
      prots.push(at.protein);
    }
    if (exercisesTouched(log.workout) > 0) gymSessions++;
    if (log.cardio.status === "completed") cardioSessions++;
    const plan = plannedWorkoutForDate(d);
    if (plan && !plan.isRestDay) plannedTrainingDays++;
    if (d <= today) scores.push(dailyScore(log, d, waterTarget));
  });

  const avg = (arr) => (arr.length ? round1(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
  const avgScore = scores.length ? round0(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  let status = "upcoming";
  if (pastOrToday.length > 0) {
    if (avgScore === null) status = "upcoming";
    else if (avgScore >= 75) status = "strong";
    else if (avgScore >= 45) status = "mixed";
    else status = "needs-attention";
  }

  return {
    week,
    dates,
    avgWeight: avg(weights),
    weightChange: weights.length >= 2 ? round1(weights[weights.length - 1] - weights[0]) : null,
    avgWaist: avg(waists),
    avgCalories: cals.length ? round0(cals.reduce((a, b) => a + b, 0) / cals.length) : null,
    avgProtein: prots.length ? round0(prots.reduce((a, b) => a + b, 0) / prots.length) : null,
    gymSessions,
    cardioSessions,
    plannedTrainingDays,
    avgSteps: steps.length ? round0(steps.reduce((a, b) => a + b, 0) / steps.length) : null,
    avgScore,
    daysLogged: dates.filter((d) => logsByDate[d] && hasAnyLogging(logsByDate[d])).length,
    status,
  };
}

export function allWeekSummaries(startDate, logsByDate, waterTarget = 2.5) {
  return Array.from({ length: 12 }, (_, i) => weekSummary(startDate, i + 1, logsByDate, waterTarget));
}

/** Current + best consistency streaks (score >= 60 counts as "on track"). */
export function computeStreaks(startDate, logsByDate, waterTarget = 2.5) {
  const today = todayStr();
  const idxToday = dayIndex(startDate, today);
  let current = 0, best = 0, run = 0;
  const lastIdx = Math.min(idxToday, 83);
  for (let i = 0; i <= lastIdx; i++) {
    const d = shiftDate(startDate, i);
    const log = logsByDate[d];
    const ok = log && hasAnyLogging(log) && dailyScore(log, d, waterTarget) >= 60;
    if (ok) {
      run++;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  // current streak = trailing run ending today (or the most recent logged day)
  let i = lastIdx;
  current = 0;
  while (i >= 0) {
    const d = shiftDate(startDate, i);
    const log = logsByDate[d];
    const ok = log && hasAnyLogging(log) && dailyScore(log, d, waterTarget) >= 60;
    if (!ok) break;
    current++;
    i--;
  }
  return { current, best };
}

export function totalsAcrossJourney(startDate, logsByDate, waterTarget = 2.5) {
  const today = todayStr();
  let meals = 0, workouts = 0, cardio = 0, daysCompleted = 0, totalScoreSum = 0, scoredDays = 0;
  Object.keys(logsByDate).forEach((d) => {
    if (d > today) return;
    if (dayIndex(startDate, d) < 0 || dayIndex(startDate, d) > 83) return;
    const log = logsByDate[d];
    meals += Object.values(log.meals || {}).filter((m) => m.status === "completed" || m.status === "modified").length;
    if (exercisesTouched(log.workout) > 0) workouts++;
    if (log.cardio.status === "completed") cardio++;
    if (hasAnyLogging(log)) {
      daysCompleted++;
      totalScoreSum += dailyScore(log, d, waterTarget);
      scoredDays++;
    }
  });
  return {
    meals,
    workouts,
    cardio,
    daysCompleted,
    avgConsistency: scoredDays ? round0(totalScoreSum / scoredDays) : 0,
  };
}
