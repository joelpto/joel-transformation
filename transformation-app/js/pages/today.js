// ==========================================================================
// TODAY — the overview dashboard. Answers "what do I need to do today?" in
// the first screenful, then backs it with the numbers behind the answer.
// ==========================================================================
import { icon } from "../utils/icons.js";
import {
  ring, bar, statusBadge, fmt, escapeHtml, openSheet, closeSheet, toast,
  cardHead, figure, deltaPill, bubbleChart, dotGrid, barRow, pageHeader, pageBody,
} from "../ui.js";
import { bindHeroPhoto } from "./settings.js";
import { getSettings, getLog, updateLog, getAllLogs } from "../store.js";
import { todayStr, dayIndex, weekNumber, formatDateLong, datesInWeek, addDays, fromDateStr, TOTAL_DAYS } from "../utils/dates.js";
import {
  plannedMealsForDate,
  plannedTotals,
  actualTotals,
  plannedWorkoutForDate,
  workoutSetStats,
  dailyScore,
  hasAnyLogging,
  trailingAvgWeight,
  computeStreaks,
} from "../utils/calculations.js";
import { generateInsights } from "../utils/insights.js";
import { navigate } from "../app.js";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function render() {
  const settings = getSettings();
  const today = todayStr();
  const idx = dayIndex(settings.startDate, today);

  if (idx < 0) return renderCountdown(settings, idx);
  if (idx >= TOTAL_DAYS) return renderCompleted(settings);
  return renderDashboard(settings, today, idx);
}

function renderCountdown(settings, idx) {
  const daysAway = -idx;
  return `
    ${pageHeader({
      eyebrow: "Not started yet",
      title: `<em>${daysAway}</em> day${daysAway === 1 ? "" : "s"} to go`,
      sub: `Day 1 lands on ${formatDateLong(settings.startDate)}.`,
      actions: `<button class="btn btn-secondary" data-start-now>Start today instead</button>`,
    })}
    ${pageBody(`
    <div class="dash">
      <div class="card c8">
        ${cardHead("sparkle", "While you wait")}
        <div class="insight-item"><span class="ic">${icon("cart", { size: 15 })}</span><span>Check the Grocery list and stock up for Week 1.</span></div>
        <div class="insight-item"><span class="ic">${icon("target", { size: 15 })}</span><span>Review your daily targets in Settings — calories, protein, water.</span></div>
        <div class="insight-item"><span class="ic">${icon("dumbbell", { size: 15 })}</span><span>Preview Monday's session on the Training screen.</span></div>
      </div>
      <div class="card c4">
        ${cardHead("calendar", "Program")}
        ${figure(daysAway, `day${daysAway === 1 ? "" : "s"} out`, { size: "lg" })}
        <button class="btn btn-primary btn-block mt-16" data-nav data-page="settings">Change start date</button>
      </div>
    </div>
    `)}`;
}

function renderCompleted(settings) {
  return renderDashboard(settings, todayStr(), dayIndex(settings.startDate, todayStr()), true);
}

function renderDashboard(settings, today, idx, bonusMode = false) {
  const logs = getAllLogs();
  const week = weekNumber(settings.startDate, today);
  const log = getLog(today);
  const meals = plannedMealsForDate(today);
  const planned = plannedTotals(today);
  const actual = actualTotals(log, today);
  const workoutPlan = plannedWorkoutForDate(today);
  const setStats = workoutSetStats(log.workout);
  const score = dailyScore(log, today, settings.waterTarget);
  const streaks = computeStreaks(settings.startDate, logs, settings.waterTarget);
  const avg7 = trailingAvgWeight(logs, today, 7);
  const currentWeight = typeof log.weight === "number" ? log.weight : avg7 ?? settings.startingWeight;
  const lost = settings.startingWeight != null && currentWeight != null
    ? Math.round((settings.startingWeight - currentWeight) * 10) / 10
    : null;
  const daysRemaining = Math.max(0, TOTAL_DAYS - idx - 1);
  const insights = generateInsights(settings, logs);

  return `
    <header class="band hero">
      <div class="band-inner">
        <div class="eyebrow">Week ${week} · ${formatDateLong(today)}${bonusMode ? " · bonus day" : ""}</div>
        <div class="hero-grid">
          ${heroMedia(settings)}
          <div class="hero-copy">
            <p class="hero-quote">Change is hard at first, messy in the middle and gorgeous at the end.</p>
            <h1 class="hero-title"><em>Day ${idx + 1}</em> of ${TOTAL_DAYS}</h1>
            <div class="hero-stats">
              ${heroStat(daysRemaining, "days remaining")}
              ${heroStat(lost != null ? `${lost > 0 ? "&minus;" : "+"}${fmt(Math.abs(lost), 1)} kg` : "—", "since day one")}
              ${heroStat(`${score}%`, "today's score")}
            </div>
          </div>
        </div>
      </div>
      <input type="file" accept="image/*" id="hero-file" style="display:none;">
    </header>
    ${pageBody(`
    <div class="dash">
      ${energyCard(settings, actual, planned, log)}
      ${mealsCard(meals, log, actual)}

      <div class="c3 stack">
        ${workoutCard(workoutPlan, log, setStats)}
        ${scoreCard(score, streaks)}
      </div>

      ${weekCard(settings, logs, week, today)}

      <div class="c4 stack">
        ${weightCard(settings, log, currentWeight, avg7, lost)}
        ${metricsCard(log, settings)}
      </div>

      ${consistencyCard(settings, logs, today, idx)}

      ${insights.length ? `<div class="card c12">
        ${cardHead("sparkle", "What the numbers say")}
        ${insights.map((i) => `<div class="insight-item"><span class="ic">${icon(i.icon, { size: 15 })}</span><span>${escapeHtml(i.text)}</span></div>`).join("")}
      </div>` : ""}
    </div>
    `)}
  `;
}

/* ----------------------------------------------------------------- hero -- */
function heroMedia(settings) {
  if (settings.heroPhoto) {
    return `<figure class="hero-media" style="margin:0;">
      <img src="${settings.heroPhoto}" alt="Progress photo">
      <button class="hero-photo-edit" data-hero-pick>Change</button>
    </figure>`;
  }
  return `<div class="hero-media">
    <button class="ph" data-hero-pick>
      ${icon("camera", { size: 26 })}
      <div class="ph-title">Add your photo</div>
      <div class="ph-sub">Stays on this device</div>
    </button>
  </div>`;
}

function heroStat(value, label) {
  return `<div class="hero-stat"><div class="hs-val">${value}</div><div class="hs-label">${label}</div></div>`;
}

/* -------------------------------------------------------------- energy -- */
function energyCard(settings, actual, planned, log) {
  const target = settings.calorieTarget;
  const remaining = Math.round(target - actual.calories);
  const delta = actual.loggedCount === 0
    ? deltaPill("Nothing logged yet", "cool")
    : remaining >= 0
      ? deltaPill(`${remaining} left`, "good")
      : deltaPill(`${Math.abs(remaining)} over`, "cool");

  // Bubbles are sized by the calories each macro contributes, so the picture
  // is a share of the day's energy rather than a comparison of grams.
  const kcal = { protein: actual.protein * 4, carbs: actual.carbs * 4, fat: actual.fat * 9 };
  const bubbles = bubbleChart(
    [
      { value: kcal.protein, label: Math.round(kcal.protein) || "", sub: "protein", fill: "var(--series-a)", text: "var(--series-a-on)" },
      { value: kcal.carbs, label: Math.round(kcal.carbs) || "", sub: "carbs", fill: "var(--series-c)", text: "var(--series-c-on)" },
      { value: kcal.fat, label: Math.round(kcal.fat) || "", sub: "fat", fill: "var(--series-b)", text: "var(--series-b-on)" },
    ],
    { alt: "Calories by macro", maxHeight: 186 }
  );

  return `
    <div class="card c5">
      ${cardHead("flame", "Energy today", `<button class="link-btn" data-nav data-page="plan" data-tab="nutrition">Details</button>`, "on-accent")}
      ${figure(Math.round(actual.calories).toLocaleString(), `kcal of ${target.toLocaleString()}`, { size: "lg", delta })}
      <div class="figure-note">${actual.loggedCount} of ${actual.totalCount} meals logged · plan is ${Math.round(planned.calories).toLocaleString()} kcal today</div>
      <div class="mt-16">${bubbles}</div>
      <div class="mt-8">
        ${barRow(Math.round(actual.protein), "g", "Protein", settings.proteinTarget ? actual.protein / settings.proteinTarget : 0, "var(--series-a)")}
        ${barRow(Math.round(actual.fiber), "g", "Fiber", settings.fiberTarget ? actual.fiber / settings.fiberTarget : 0, "var(--series-b)")}
        ${barRow(fmt(log.water || 0, 1), "L", "Water", settings.waterTarget ? (log.water || 0) / settings.waterTarget : 0, "var(--series-c)")}
      </div>
    </div>`;
}

/* --------------------------------------------------------------- meals -- */
function mealsCard(meals, log, actual) {
  return `
    <div class="card c4">
      ${cardHead("utensils", "Today's meals", `<span class="pill-select">${actual.loggedCount}/${meals.length} logged</span>`)}
      ${meals
        .map((m) => {
          const entry = log.meals[m.id];
          const status = entry ? entry.status : "pending";
          const done = status === "completed" || status === "modified";
          const skipped = status === "skipped";
          return `<div class="check-row ${done ? "done" : ""}" data-meal-row="${m.id}">
            <div class="check-circle ${done ? "done" : skipped ? "skip" : ""}">${done ? icon("check", { size: 14 }) : skipped ? icon("x", { size: 13 }) : ""}</div>
            <div class="name">${m.meal}<span class="sub">${escapeHtml(m.food)}</span></div>
            ${status === "modified" ? `<span class="badge badge-mid">Modified</span>` : ""}
          </div>`;
        })
        .join("")}
    </div>`;
}

/* ------------------------------------------------------------- workout -- */
function workoutCard(plan, log, setStats) {
  if (plan && plan.isRestDay) {
    return `
      <div class="card">
        ${cardHead("moon", "Training")}
        <div class="figure sm">Rest day</div>
        <div class="figure-note">${escapeHtml(plan.cardio || "Recovery")}</div>
      </div>`;
  }
  const status = log.workout.status === "skipped"
    ? "skipped"
    : setStats.pct === 100 ? "completed" : setStats.pct > 0 ? "in_progress" : "not_started";
  return `
    <div class="card">
      ${cardHead("dumbbell", "Training", statusBadge(status))}
      <div class="figure" style="text-transform:capitalize;">${escapeHtml(plan?.label || "Training")}</div>
      <div class="figure-note">${setStats.completed} of ${setStats.total} sets done · ${escapeHtml(plan?.duration || "")}</div>
      <div class="mt-12">${bar(setStats.pct / 100)}</div>
      <div class="flex-between mt-12">
        <span class="text-sm muted">Cardio: ${escapeHtml(plan?.cardio || "—")}</span>
        ${statusBadge(log.cardio.status)}
      </div>
      <button class="btn btn-primary btn-block mt-16" data-nav data-page="workout" data-tab="strength">Open workout</button>
    </div>`;
}

/* --------------------------------------------------------------- score -- */
function scoreCard(score, streaks) {
  return `
    <div class="card">
      ${cardHead("target", "Today's score")}
      <div class="flex" style="justify-content:center;padding:4px 0 14px;">
        ${ring({ pct: score / 100, valueLabel: score, capLabel: "of 100", size: 116, stroke: 11 })}
      </div>
      <div class="streak-row" style="justify-content:center;">
        ${streaks.current > 0 ? `<span class="streak-chip">${icon("flame", { size: 14 })} ${streaks.current}-day streak</span>` : ""}
        ${streaks.best > 0 ? `<span class="streak-chip">${icon("trophy", { size: 14 })} Best ${streaks.best}</span>` : ""}
        ${streaks.current === 0 && streaks.best === 0 ? `<span class="faint text-sm">Log anything today to start a streak.</span>` : ""}
      </div>
    </div>`;
}

/* ---------------------------------------------------------- week chart -- */
function weekCard(settings, logs, week, today) {
  const dates = datesInWeek(settings.startDate, week);
  const scores = dates.map((d) => {
    const l = logs[d];
    const has = l && hasAnyLogging(l);
    return { date: d, score: has ? dailyScore(l, d, settings.waterTarget) : 0, has, future: d > today };
  });
  const logged = scores.filter((s) => s.has).length;
  const scored = scores.filter((s) => s.has);
  const avg = scored.length ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : 0;
  const best = scored.length ? Math.max(...scored.map((s) => s.score)) : -1;
  let bestUsed = false;

  const cols = scores
    .map((s) => {
      const isToday = s.date === today;
      const isBest = !isToday && !bestUsed && s.has && s.score === best && best > 0 && (bestUsed = true);
      const d = fromDateStr(s.date);
      return `<div class="wkcol ${isToday ? "is-today" : ""} ${isBest ? "is-best" : ""}">
        <div class="wktrack"><div class="wkfill" style="height:${s.future ? 0 : Math.max(4, s.score)}%"></div></div>
        <div class="wklabel">${DOW[d.getDay()]}</div>
      </div>`;
    })
    .join("");

  return `
    <div class="card feature c5">
      ${cardHead("chart", `Week ${week}`, `<span class="pill-select">${logged}/7 days</span>`)}
      <div class="flex" style="gap:26px;flex-wrap:wrap;margin-bottom:18px;">
        <div class="marked">
          <i style="background:var(--accent)"></i>
          <div class="m-body">
            <div class="figure">${avg}<span class="unit" style="color:var(--on-ink-muted)">%</span></div>
            <div class="m-label">Average consistency</div>
          </div>
        </div>
        <div class="marked">
          <i style="background:var(--lav-fill)"></i>
          <div class="m-body">
            <div class="figure">${best > 0 ? best : "—"}<span class="unit" style="color:var(--on-ink-muted)">${best > 0 ? "%" : ""}</span></div>
            <div class="m-label">Best day this week</div>
          </div>
        </div>
      </div>
      <div class="wkbars">${cols}</div>
    </div>`;
}

/* -------------------------------------------------------------- weight -- */
function weightCard(settings, log, currentWeight, avg7, lost) {
  let delta = "";
  if (lost != null && lost !== 0) {
    delta = lost > 0 ? deltaPill(`&minus;${fmt(Math.abs(lost), 1)} kg`, "good") : deltaPill(`+${fmt(Math.abs(lost), 1)} kg`, "cool");
  }
  let goalPct = null;
  if (settings.startingWeight != null && settings.goalWeight != null && currentWeight != null) {
    const span = settings.startingWeight - settings.goalWeight;
    if (span > 0) goalPct = Math.max(0, Math.min(1, (settings.startingWeight - currentWeight) / span));
  }
  return `
    <div class="card">
      ${cardHead("scale", "Weight", `<button class="link-btn" data-metric-tile="weight">Log</button>`)}
      ${figure(currentWeight != null ? fmt(currentWeight, 1) : "—", "kg", { delta })}
      <div class="figure-note">${avg7 != null ? `7-day average ${fmt(avg7, 1)} kg` : "No weigh-ins yet this week"}</div>
      ${goalPct != null ? `
        <div class="mt-16">${bar(goalPct)}</div>
        <div class="flex-between mt-8">
          <span class="faint text-sm">${fmt(settings.startingWeight, 1)} kg start</span>
          <span class="faint text-sm">${Math.round(goalPct * 100)}% to goal</span>
          <span class="faint text-sm">${fmt(settings.goalWeight, 1)} kg</span>
        </div>` : `<div class="faint text-sm mt-12">Set a starting and goal weight in Settings to track progress toward it.</div>`}
    </div>`;
}

/* ------------------------------------------------------------- metrics -- */
function metricsCard(log, settings) {
  const tile = (ic, label, value, key) => `
    <button class="tile" data-metric-tile="${key}">
      <div class="flex gap-8" style="color:var(--text-muted)">${icon(ic, { size: 14 })}<span class="tile-label">${label}</span></div>
      <div class="tile-val">${value}</div>
    </button>`;
  return `
    <div class="card">
      ${cardHead("activity", "Log today", `<span class="faint text-sm">tap to add</span>`)}
      <div class="grid-2">
        ${tile("footprints", "Steps", log.steps != null ? log.steps.toLocaleString() : "—", "steps")}
        ${tile("droplet", "Water", fmt(log.water || 0, 1) + " L", "water")}
        ${tile("moon", "Sleep", log.sleep?.hours != null ? log.sleep.hours + " h" : "—", "sleep")}
        ${tile("ruler", "Waist", log.measurements?.waist != null ? log.measurements.waist + " cm" : "—", "measurement")}
      </div>
    </div>`;
}

/* --------------------------------------------------------- consistency -- */
function consistencyCard(settings, logs, today, idx) {
  const cells = [];
  let sum = 0, n = 0;
  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = addDays(settings.startDate, i);
    const l = logs[d];
    const has = l && hasAnyLogging(l);
    const s = has ? dailyScore(l, d, settings.waterTarget) : null;
    if (s != null) { sum += s; n++; }
    let level = 0;
    if (s != null) level = s >= 75 ? 3 : s >= 40 ? 2 : 1;
    else if (d < today) level = "miss";
    cells.push({ level, isToday: d === today, title: `Day ${i + 1} · ${d}${s != null ? ` · ${s}%` : ""}` });
  }
  const avg = n ? Math.round(sum / n) : 0;
  return `
    <div class="card c3">
      ${cardHead("layers", "84-day consistency")}
      ${figure(avg, "%", { note: `Average score · ${n} of ${idx + 1} days logged` })}
      <div class="mt-16">${dotGrid(cells, { cols: 14 })}</div>
      <div class="dot-legend">
        <span><i style="background:var(--series-a)"></i>Strong</span>
        <span><i style="background:var(--series-b)"></i>Partial</span>
        <span><i style="background:var(--lav-soft)"></i>Light</span>
        <span><i style="background:var(--red-soft)"></i>Missed</span>
      </div>
    </div>`;
}

/* --------------------------------------------------------------- mount -- */
export function mount() {
  const settings = getSettings();
  const idx = dayIndex(settings.startDate, todayStr());
  document.querySelectorAll("[data-start-now]").forEach((b) =>
    b.addEventListener("click", async () => {
      const { updateSettings } = await import("../store.js");
      await updateSettings({ startDate: todayStr() });
      toast("Day 1 starts today");
    })
  );
  if (idx >= 0) mountDashboard();
}

function mountDashboard() {
  const today = todayStr();
  bindHeroPhoto();
  document.querySelectorAll("[data-meal-row]").forEach((row) => {
    row.addEventListener("click", () => openMealQuickSheet(row.dataset.mealRow, today));
  });
  document.querySelectorAll("[data-metric-tile]").forEach((tile) => {
    tile.addEventListener("click", async (e) => {
      e.stopPropagation();
      const { renderQuickAdd } = await import("./quickadd.js");
      renderQuickAdd();
      setTimeout(() => {
        const btn = document.querySelector(`[data-qa="${tile.dataset.metricTile}"]`);
        if (btn) btn.click();
      }, 30);
    });
  });
}

function openMealQuickSheet(mealId, dateStr) {
  const meal = plannedMealsForDate(dateStr).find((m) => m.id === mealId);
  if (!meal) return;
  openSheet({
    title: meal.meal,
    bodyHtml: `
      <p style="font-weight:700;font-size:16px;">${escapeHtml(meal.food)}</p>
      <p class="muted text-sm mt-4">${escapeHtml(meal.quantity)}</p>
      <div class="meal-macros mt-12">
        <span><b>${meal.calories}</b> kcal</span><span><b>${meal.protein}</b>g protein</span><span><b>${meal.carbs}</b>g carbs</span><span><b>${meal.fat}</b>g fat</span><span><b>${meal.fiber}</b>g fiber</span>
      </div>
      <div class="meal-actions mt-16">
        <button data-mset="completed">${icon("check", { size: 14 })} Completed</button>
        <button data-mset="skipped">${icon("skip", { size: 14 })} Skipped</button>
        <button data-mset="modify">${icon("edit", { size: 14 })} Modify</button>
      </div>`,
    onMount: (rootEl) => {
      rootEl.querySelectorAll("[data-mset]").forEach((b) =>
        b.addEventListener("click", async () => {
          const action = b.dataset.mset;
          if (action === "modify") {
            closeSheet();
            navigate("plan", "meals");
            return;
          }
          await updateLog(dateStr, (d) => {
            d.meals[mealId] = { status: action, actual: null, note: "" };
          });
          closeSheet();
          toast(action === "completed" ? "Marked complete" : "Marked skipped");
        })
      );
    },
  });
}
