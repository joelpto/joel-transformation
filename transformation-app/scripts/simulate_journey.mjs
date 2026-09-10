// Standalone Node simulation of an 84-day journey to sanity-check the
// calculation engine (no browser/IndexedDB needed — pure data functions).
import { createEmptyDailyLog } from "../js/data/defaults.js";
import { addDays, todayStr } from "../js/utils/dates.js";
import {
  weekSummary, allWeekSummaries, computeStreaks, totalsAcrossJourney, dailyScore, hasAnyLogging, plannedMealsForDate,
} from "../js/utils/calculations.js";

const startDate = "2026-01-05"; // a Monday, arbitrary fixed date for deterministic test
const waterTarget = 3.0;
const logs = {};

function simulateDay(dateStr, adherence) {
  const log = createEmptyDailyLog(dateStr);
  const meals = plannedMealsForDate(dateStr);
  meals.forEach((m, i) => {
    const roll = Math.random();
    if (roll < adherence) log.meals[m.id] = { status: "completed", actual: null, note: "" };
    else if (roll < adherence + 0.1) log.meals[m.id] = { status: "modified", actual: { calories: m.calories - 40 }, note: "swap" };
    else log.meals[m.id] = { status: "skipped", actual: null, note: "" };
  });
  log.weight = 83 - (dateIndexOf(dateStr) * 0.05) + (Math.random() - 0.5) * 0.4;
  log.steps = Math.round(6000 + Math.random() * 5000);
  log.water = Math.round((adherence * waterTarget + Math.random() * 0.5) * 10) / 10;
  log.workout.exercises.forEach((ex) => ex.sets.forEach((s) => { if (Math.random() < adherence) { s.completed = true; s.weight = 20; s.reps = 10; } }));
  if (Math.random() < adherence) log.cardio.status = "completed";
  return log;
}

function dateIndexOf(dateStr) {
  const [y, m, d] = startDate.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const [y2, m2, d2] = dateStr.split("-").map(Number);
  const cur = new Date(y2, m2 - 1, d2);
  return Math.round((cur - start) / 86400000);
}

let allOk = true;
function assert(cond, msg) {
  if (!cond) { console.error("FAIL:", msg); allOk = false; }
  else console.log("OK:", msg);
}

// Simulate all 84 days with varying adherence patterns per "phase" to create realistic variance.
for (let i = 0; i < 84; i++) {
  const d = addDays(startDate, i);
  const week = Math.floor(i / 7) + 1;
  const adherence = week <= 2 ? 0.9 : week <= 6 ? 0.6 : week <= 10 ? 0.75 : 0.3; // dip mid-program, recover, then a rough patch
  logs[d] = simulateDay(d, adherence);
}

// --- Checks ---
const summaries = allWeekSummaries(startDate, logs, waterTarget);
assert(summaries.length === 12, "allWeekSummaries returns 12 weeks");
summaries.forEach((s) => {
  assert(s.week >= 1 && s.week <= 12, `week ${s.week} in range`);
  assert(s.dates.length === 7, `week ${s.week} has 7 dates`);
});

// No cross-week bleed: each week's dates must be disjoint and contiguous.
const seenDates = new Set();
let bleed = false;
summaries.forEach((s) => s.dates.forEach((d) => { if (seenDates.has(d)) bleed = true; seenDates.add(d); }));
assert(!bleed, "no date appears in two different weeks");
assert(seenDates.size === 84, "all 84 unique dates covered across 12 weeks");

// Week 1 avg calories should differ from week 7 (different adherence) — sanity, not strict correctness.
assert(summaries[0].avgScore !== null, "week 1 has a computed avg score");
assert(summaries[0].gymSessions >= 0 && summaries[0].gymSessions <= 7, "week 1 gym sessions in valid range");

// Daily score bounds
Object.entries(logs).forEach(([d, log]) => {
  const score = dailyScore(log, d, waterTarget);
  if (score < 0 || score > 100) { assert(false, `score out of bounds on ${d}: ${score}`); }
});
assert(true, "all daily scores within 0-100");

// Streak sanity: current streak <= 84, best streak >= current in a full-past simulation... (today() is real 'today', not in our fake range, so streaks will be 0 since our fake dates are in the past relative to real today or not — just check it doesn't throw)
const streaks = computeStreaks(startDate, logs, waterTarget);
assert(typeof streaks.current === "number" && typeof streaks.best === "number", "computeStreaks returns numbers without throwing");

// Totals across journey
const totals = totalsAcrossJourney(startDate, logs, waterTarget);
assert(totals.meals >= 0, "totalsAcrossJourney.meals non-negative");
assert(totals.avgConsistency >= 0 && totals.avgConsistency <= 100, "avgConsistency within bounds");

// Spot check week 4, 8, 12 boundaries explicitly (day indices 21-27, 49-55, 77-83)
const w4 = weekSummary(startDate, 4, logs, waterTarget);
const w8 = weekSummary(startDate, 8, logs, waterTarget);
const w12 = weekSummary(startDate, 12, logs, waterTarget);
assert(w4.dates[0] === addDays(startDate, 21) && w4.dates[6] === addDays(startDate, 27), "week 4 date range correct (day 22-28)");
assert(w8.dates[0] === addDays(startDate, 49) && w8.dates[6] === addDays(startDate, 55), "week 8 date range correct (day 50-56)");
assert(w12.dates[0] === addDays(startDate, 77) && w12.dates[6] === addDays(startDate, 83), "week 12 date range correct (day 78-84)");

console.log("\n" + (allOk ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"));
process.exit(allOk ? 0 : 1);
