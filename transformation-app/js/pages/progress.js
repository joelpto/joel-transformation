// ==========================================================================
// PROGRESS — Metrics, Charts, Calendar, 12-Week Journey, Photos, Transformation.
// ==========================================================================
import { icon } from "../utils/icons.js";
import { bar, ring, statusBadge, fmt, escapeHtml, openSheet, closeSheet, toast, cardHead, figure, deltaPill, dotGrid, pageHeader, pageBody } from "../ui.js";
import { getSettings, getLog, getAllLogs, updateLog, getPhotos, addPhoto, deletePhoto } from "../store.js";
import { todayStr, addDays, dayIndex, weekNumber, formatDateShort, formatDateLong, monthMatrix, fromDateStr, toDateStr, TOTAL_DAYS, TOTAL_WEEKS, datesInWeek } from "../utils/dates.js";
import {
  actualTotals, plannedWorkoutForDate, trailingAvgWeight, weekSummary, allWeekSummaries,
  dailyScore, dayStatus, hasAnyLogging, exercisesTouched, totalsAcrossJourney, computeStreaks,
} from "../utils/calculations.js";
import { lineChart, barChart, cssVar } from "../charts/charts.js";
import { navigate } from "../app.js";

let calMonthOffset = 0; // months from program start month
let chartPeriod = "weekly"; // daily | weekly | all
let comparisonWeeks = [1, 4];

export function render(route) {
  const tab = route.tab || "metrics";
  let body = "";
  if (tab === "charts") body = renderCharts();
  else if (tab === "calendar") body = renderCalendar();
  else if (tab === "journey") body = renderJourney();
  else if (tab === "photos") body = renderPhotos();
  else if (tab === "transformation") body = renderTransformation();
  else body = renderMetrics();

  return `
    ${pageHeader({
      eyebrow: "Your numbers",
      title: `Your <em>progress</em>`,
      sub: "Metrics, trends, and the full twelve-week journey — all computed from what you logged.",
      tabs: [
        ["metrics", "Metrics"], ["charts", "Charts"], ["calendar", "Calendar"],
        ["journey", "Journey"], ["photos", "Photos"], ["transformation", "Transformation"],
      ].map(([key, label]) => ({ key, label, active: tab === key })),
      tabAttr: "data-p-tab",
    })}
    ${pageBody(`<div class="section">${body}</div>`)}
  `;
}

// ---------------------------------------------------------------- METRICS --
function renderMetrics() {
  const settings = getSettings();
  const today = todayStr();
  const log = getLog(today);
  const logs = getAllLogs();
  const avg7 = trailingAvgWeight(logs, today, 7);
  const weightHistory = Object.values(logs)
    .filter((l) => typeof l.weight === "number")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 8);
  const stepsThisWeek = weekSummary(settings.startDate, weekNumber(settings.startDate, today) || 1, logs, settings.waterTarget);

  return `
    <div class="card">
      ${cardHead("scale", "Weight", `<button class="link-btn" data-qa-open="weight">Log</button>`, "on-accent")}
      <div class="grid-3">
        ${miniStat("Current", log.weight != null ? fmt(log.weight, 1) + " kg" : "—")}
        ${miniStat("7-day avg", avg7 != null ? fmt(avg7, 1) + " kg" : "—")}
        ${miniStat("Starting", settings.startingWeight != null ? fmt(settings.startingWeight, 1) + " kg" : "—")}
      </div>
      ${weightHistory.length ? `<div class="hr"></div>${weightHistory.map((l) => `<div class="stat-row"><span class="label">${formatDateShort(l.date)}</span><span class="value">${fmt(l.weight, 1)} kg${l.weightNote ? ` <span class="of">· ${escapeHtml(l.weightNote)}</span>` : ""}</span></div>`).join("")}` : emptyRow("No weight logged yet")}
    </div>

    <div class="section card">
      ${cardHead("footprints", "Steps", `<button class="link-btn" data-qa-open="steps">Log</button>`)}
      <div class="grid-2">
        ${miniStat("Today", log.steps != null ? log.steps.toLocaleString() : "—")}
        ${miniStat("This week avg", stepsThisWeek.avgSteps != null ? stepsThisWeek.avgSteps.toLocaleString() : "—")}
      </div>
      ${settings.stepTarget ? `<div class="mt-12">${bar(log.steps ? log.steps / settings.stepTarget : 0)}<div class="faint text-sm mt-4">Target: ${settings.stepTarget.toLocaleString()}</div></div>` : ""}
    </div>

    <div class="section card">
      ${cardHead("droplet", "Water", `<button class="link-btn" data-qa-open="water">Log</button>`)}
      <div class="flex-between"><span class="muted text-sm">Today</span><span style="font-weight:700;">${fmt(log.water || 0, 1)} / ${fmt(settings.waterTarget, 1)} L</span></div>
      ${bar((log.water || 0) / settings.waterTarget, { thick: true })}
    </div>

    <div class="section card">
      ${cardHead("moon", "Sleep", `<button class="link-btn" data-qa-open="sleep">Log</button>`)}
      <div class="grid-2">
        ${miniStat("Last night", log.sleep?.hours != null ? log.sleep.hours + " hrs" : "—")}
        ${miniStat("Quality", log.sleep?.quality != null ? log.sleep.quality + " / 5" : "—")}
      </div>
    </div>

    <div class="section card">
      ${cardHead("ruler", "Measurements", `<button class="link-btn" data-qa-open="measurement">Log</button>`)}
      ${renderMeasureGrid(log.measurements)}
    </div>
  `;
}

function renderMeasureGrid(m = {}) {
  const fields = [["waist", "Waist"], ["chest", "Chest"], ["arms", "Arms"], ["thighs", "Thighs"], ["hips", "Hips"], ["neck", "Neck"], ["bodyFat", "Body fat %"]];
  const has = fields.some(([k]) => m[k] != null);
  if (!has) return emptyRow("No measurements logged yet");
  return `<div class="grid-3">${fields.filter(([k]) => m[k] != null).map(([k, label]) => miniStat(label, m[k] + (k === "bodyFat" ? "%" : "cm"))).join("")}</div>`;
}

function miniStat(label, value) {
  return `<div class="tile"><div class="tile-label">${label}</div><div class="tile-val">${value}</div></div>`;
}
function emptyRow(text) {
  return `<div class="faint text-sm" style="padding:10px 0;">${text}</div>`;
}

// ----------------------------------------------------------------- CHARTS --
function renderCharts() {
  return `
    <div class="pill-tabs" style="margin-top:0;">
      <button class="${chartPeriod === "daily" ? "active" : ""}" data-chart-period="daily">Daily</button>
      <button class="${chartPeriod === "weekly" ? "active" : ""}" data-chart-period="weekly">Weekly</button>
      <button class="${chartPeriod === "all" ? "active" : ""}" data-chart-period="all">12 Weeks</button>
    </div>
    <div class="dash mt-16">
      ${chartCard("scale", "Weight", "kg", "chart-weight", "c6")}
      ${chartCard("flame", "Calories", "kcal", "chart-calories", "c6")}
      ${chartCard("target", "Protein", "g", "chart-protein", "c6")}
      ${chartCard("ruler", "Waist", "cm", "chart-waist", "c6")}
      ${chartCard("dumbbell", "Gym sessions", "per week", "chart-gym", "c4")}
      ${chartCard("activity", "Cardio sessions", "per week", "chart-cardio", "c4")}
      ${chartCard("footprints", "Steps", "", "chart-steps", "c4")}
    </div>
  `;
}

function chartCard(ic, title, unit, id, span) {
  return `<div class="card ${span}">
    ${cardHead(ic, title, unit ? `<span class="pill-select">${unit}</span>` : "")}
    <div class="chart-box"><canvas id="${id}"></canvas></div>
  </div>`;
}

function mountCharts() {
  const settings = getSettings();
  const logs = getAllLogs();
  const today = todayStr();

  // Theme-reactive palette — reads the live CSS custom properties so every
  // series matches the brand and flips correctly between light and dark.
  const cWeight = cssVar("--series-line-a", "#a98700");
  const cMuted = cssVar("--text-faint", "#948f7c");
  const cCalories = cssVar("--series-line-c", "#16150f");
  const cProtein = cssVar("--series-line-b", "#8f79e0");
  const cWaist = cssVar("--red", "#b5402f");
  const cSteps = cssVar("--series-a", "#ffd400");
  const cGym = cssVar("--series-c", "#16150f");
  const cCardio = cssVar("--series-b", "#b9a7f2");
  // Line charts get a faint area fill under them; hex8 because these strings
  // go straight to the canvas, which knows nothing about CSS colour functions.
  const wash = (hex) => (/^#[0-9a-f]{6}$/i.test(hex) ? hex + "1c" : "transparent");

  if (chartPeriod === "daily") {
    const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
    const labels = days.map((d) => formatDateShort(d));
    const weight = days.map((d) => (logs[d] && typeof logs[d].weight === "number" ? logs[d].weight : null));
    const avg = days.map((d) => trailingAvgWeight(logs, d, 7));
    lineChart("chart-weight", labels, [
      { label: "Weight", data: weight, borderColor: cWeight, backgroundColor: wash(cWeight), fill: true, spanGaps: true },
      { label: "7-day avg", data: avg, borderColor: cMuted, borderDash: [4, 3] },
    ]);
    const cal = days.map((d) => { const l = logs[d]; if (!l) return null; const t = actualTotals(l, d); return t.loggedCount ? t.calories : null; });
    lineChart("chart-calories", labels, [{ label: "Calories", data: cal, borderColor: cCalories, backgroundColor: wash(cCalories), fill: true, spanGaps: true }], { legend: false });
    const pro = days.map((d) => { const l = logs[d]; if (!l) return null; const t = actualTotals(l, d); return t.loggedCount ? t.protein : null; });
    lineChart("chart-protein", labels, [{ label: "Protein", data: pro, borderColor: cProtein, backgroundColor: wash(cProtein), fill: true, spanGaps: true }], { legend: false });
    const waist = days.map((d) => (logs[d]?.measurements?.waist ?? null));
    lineChart("chart-waist", labels, [{ label: "Waist", data: waist, borderColor: cWaist, backgroundColor: wash(cWaist), fill: true, spanGaps: true }], { legend: false });
    const steps = days.map((d) => (logs[d]?.steps ?? null));
    barChart("chart-steps", labels, [{ label: "Steps", data: steps, backgroundColor: cSteps }], { legend: false });
    const gym = days.map((d) => (logs[d] && exercisesTouched(logs[d].workout) > 0 ? 1 : 0));
    barChart("chart-gym", labels, [{ label: "Trained", data: gym, backgroundColor: cGym }], { legend: false });
    const cardio = days.map((d) => (logs[d]?.cardio?.status === "completed" ? 1 : 0));
    barChart("chart-cardio", labels, [{ label: "Cardio", data: cardio, backgroundColor: cCardio }], { legend: false });
    return;
  }

  const weeksToShow = chartPeriod === "weekly" ? Math.min(6, Math.max(1, weekNumber(settings.startDate, today) || 1)) : TOTAL_WEEKS;
  const startWeek = chartPeriod === "weekly" ? Math.max(1, weeksToShow >= 6 ? (weekNumber(settings.startDate, today) || 1) - 5 : 1) : 1;
  const weeks = Array.from({ length: chartPeriod === "weekly" ? Math.min(6, weekNumber(settings.startDate, today) || 1) : TOTAL_WEEKS }, (_, i) => startWeek + i);
  const summaries = weeks.map((w) => weekSummary(settings.startDate, w, logs, settings.waterTarget));
  const labels = weeks.map((w) => `Wk ${w}`);

  lineChart("chart-weight", labels, [
    { label: "Avg weight", data: summaries.map((s) => s.avgWeight), borderColor: cWeight, backgroundColor: wash(cWeight), fill: true, spanGaps: true },
    ...(settings.goalWeight ? [{ label: "Goal", data: weeks.map(() => settings.goalWeight), borderColor: cMuted, borderDash: [3, 3], pointRadius: 0 }] : []),
  ]);
  lineChart("chart-calories", labels, [{ label: "Avg calories", data: summaries.map((s) => s.avgCalories), borderColor: cCalories, backgroundColor: wash(cCalories), fill: true, spanGaps: true }], { legend: false });
  lineChart("chart-protein", labels, [{ label: "Avg protein", data: summaries.map((s) => s.avgProtein), borderColor: cProtein, backgroundColor: wash(cProtein), fill: true, spanGaps: true }], { legend: false });
  lineChart("chart-waist", labels, [{ label: "Waist", data: summaries.map((s) => s.avgWaist), borderColor: cWaist, backgroundColor: wash(cWaist), fill: true, spanGaps: true }], { legend: false });
  barChart("chart-gym", labels, [{ label: "Gym sessions", data: summaries.map((s) => s.gymSessions), backgroundColor: cGym }], { legend: false });
  barChart("chart-cardio", labels, [{ label: "Cardio sessions", data: summaries.map((s) => s.cardioSessions), backgroundColor: cCardio }], { legend: false });
  barChart("chart-steps", labels, [{ label: "Avg steps", data: summaries.map((s) => s.avgSteps), backgroundColor: cSteps }], { legend: false });
}

// --------------------------------------------------------------- CALENDAR --
function renderCalendar() {
  const settings = getSettings();
  const start = fromDateStr(settings.startDate);
  const base = new Date(start.getFullYear(), start.getMonth() + calMonthOffset, 1);
  const year = base.getFullYear(), month = base.getMonth();
  const weeks = monthMatrix(year, month);
  const logs = getAllLogs();
  const today = todayStr();
  const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return `
    <div class="card">
      <div class="flex-between">
        <button class="icon-btn" data-cal-shift="-1">${icon("chevronLeft", { size: 16 })}</button>
        <b>${monthLabel}</b>
        <button class="icon-btn" data-cal-shift="1">${icon("chevronRight", { size: 16 })}</button>
      </div>
      <div class="cal-grid mt-16">
        ${["S", "M", "T", "W", "T", "F", "S"].map((d) => `<div class="cal-dow">${d}</div>`).join("")}
        ${weeks
          .flat()
          .map((d) => {
            if (!d) return `<div class="cal-day empty"></div>`;
            const dateStr = toDateStr(d);
            const idx = dayIndex(settings.startDate, dateStr);
            const inProgram = idx >= 0 && idx < TOTAL_DAYS;
            if (!inProgram) return `<div class="cal-day future">${d.getDate()}</div>`;
            const log = logs[dateStr];
            const has = log && hasAnyLogging(log);
            const score = has ? dailyScore(log, dateStr, settings.waterTarget) : 0;
            const status = dateStr > today ? "future" : dayStatus(score, has);
            return `<div class="cal-day ${status} ${dateStr === today ? "today" : ""}" data-cal-day="${dateStr}">${d.getDate()}${status !== "future" ? `<span class="dot"></span>` : ""}</div>`;
          })
          .join("")}
      </div>
      <div class="cal-legend">
        <span><span class="dot" style="background:var(--series-a)"></span>Excellent</span>
        <span><span class="dot" style="background:var(--series-b)"></span>Partial</span>
        <span><span class="dot" style="background:var(--red)"></span>Missed</span>
        <span><span class="dot" style="background:var(--border)"></span>Not started / outside program</span>
      </div>
    </div>`;
}

function openDaySheet(dateStr) {
  const settings = getSettings();
  const log = getLog(dateStr);
  const score = hasAnyLogging(log) ? dailyScore(log, dateStr, settings.waterTarget) : 0;
  openSheet({
    title: formatDateLong(dateStr),
    bodyHtml: `
      <div class="flex" style="justify-content:center;padding:10px 0;">${ring({ pct: score / 100, valueLabel: score, capLabel: "SCORE", size: 84 })}</div>
      <div class="grid-2 mt-12">
        <button class="btn btn-secondary" data-goto-plan>${icon("utensils", { size: 14 })} View Meals</button>
        <button class="btn btn-secondary" data-goto-workout>${icon("dumbbell", { size: 14 })} View Workout</button>
      </div>`,
    onMount: (rootEl) => {
      rootEl.querySelector("[data-goto-plan]").addEventListener("click", () => { closeSheet(); navigate("plan", "meals", { date: dateStr }); });
      rootEl.querySelector("[data-goto-workout]").addEventListener("click", () => { closeSheet(); navigate("workout", "strength", { date: dateStr }); });
    },
  });
}

// ----------------------------------------------------------------- JOURNEY --
function renderJourney() {
  const settings = getSettings();
  const logs = getAllLogs();
  const summaries = allWeekSummaries(settings.startDate, logs, settings.waterTarget);
  const curWeek = weekNumber(settings.startDate, todayStr());

  return `
    <div class="week-strip">
      ${summaries
        .map(
          (s) => `<div class="week-chip ${s.week === curWeek ? "current" : ""}" data-week-jump="${s.week}">
            <div class="wk">Week ${s.week}</div>
            <div class="pct">${s.avgScore != null ? s.avgScore : "–"}${s.avgScore != null ? "%" : ""}</div>
            ${weekDot(s.status)}
          </div>`
        )
        .join("")}
    </div>
    <div class="section">
      ${summaries.map((s) => weekCard(s)).join("")}
    </div>`;
}

function weekDot(status) {
  const colors = { strong: "var(--series-a)", mixed: "var(--series-b)", "needs-attention": "var(--red)", upcoming: "var(--border)" };
  return `<span class="week-status-dot" style="background:${colors[status] || "var(--text-faint)"}"></span>`;
}

function weekCard(s) {
  return `
    <div class="week-card" data-week-detail="${s.week}">
      <div class="week-card-head">
        <div class="title">Week ${s.week}</div>
        ${statusBadge(s.status)}
      </div>
      <div class="grid-3">
        ${miniStat("Weight", s.avgWeight != null ? fmt(s.avgWeight, 1) + " kg" : "—")}
        ${miniStat("Change", s.weightChange != null ? (s.weightChange > 0 ? "+" : "") + s.weightChange + " kg" : "—")}
        ${miniStat("Waist", s.avgWaist != null ? s.avgWaist + " cm" : "—")}
      </div>
      <div class="grid-3 mt-8">
        ${miniStat("Calories", s.avgCalories ?? "—")}
        ${miniStat("Protein", s.avgProtein != null ? s.avgProtein + "g" : "—")}
        ${miniStat("Steps", s.avgSteps != null ? s.avgSteps.toLocaleString() : "—")}
      </div>
      <div class="grid-2 mt-8">
        ${miniStat("Gym", `${s.gymSessions}/${s.plannedTrainingDays}`)}
        ${miniStat("Cardio", s.cardioSessions)}
      </div>
      <div class="faint text-sm mt-8">Daily averages across the week</div>
    </div>`;
}

function openWeekDetail(week) {
  const settings = getSettings();
  const s = weekSummary(settings.startDate, week, getAllLogs(), settings.waterTarget);
  openSheet({
    title: `Week ${week}${s.status === "strong" || s.status === "mixed" || s.status === "needs-attention" ? " Summary" : ""}`,
    bodyHtml: `
      ${statusBadge(s.status)}
      <div class="grid-2 mt-16">
        ${miniStat("Consistency", s.avgScore != null ? s.avgScore + "%" : "—")}
        ${miniStat("Days logged", `${s.daysLogged}/7`)}
      </div>
      <div class="hr"></div>
      <div class="grid-2">
        ${miniStat("Weight", s.avgWeight != null ? fmt(s.avgWeight, 1) + " kg" : "—")}
        ${miniStat("Change", s.weightChange != null ? (s.weightChange > 0 ? "+" : "") + s.weightChange + " kg" : "—")}
      </div>
      <div class="grid-2 mt-8">
        ${miniStat("Gym", `${s.gymSessions}/${s.plannedTrainingDays}`)}
        ${miniStat("Cardio", s.cardioSessions)}
      </div>
      <div class="grid-2 mt-8">
        ${miniStat("Calories", s.avgCalories ?? "—")}
        ${miniStat("Protein", s.avgProtein != null ? s.avgProtein + "g" : "—")}
      </div>
    `,
  });
}

// ------------------------------------------------------------------ PHOTOS --
const PHOTO_WEEKS = [1, 2, 4, 8, 12];
const ANGLES = ["front", "side", "back"];

function renderPhotos() {
  const photos = getPhotos();
  return `
    ${PHOTO_WEEKS.map(
      (w) => `
      <div class="section card">
        <div class="card-title">Week ${w}</div>
        <div class="photo-grid">
          ${ANGLES.map((a) => {
            const p = photos.find((ph) => ph.week === w && ph.angle === a);
            return `<div class="photo-slot" data-photo-slot="${w}:${a}">
              ${p ? `<img src="${p.dataUrl}" alt="${a}">` : `<div style="text-align:center;"><div>${icon("camera", { size: 20 })}</div><div class="text-sm mt-4">${a}</div></div>`}
            </div>`;
          }).join("")}
        </div>
      </div>`
    ).join("")}
    <div class="section card">
      <div class="card-title">Compare</div>
      <div class="field-row">
        <div class="field"><label for="cmp-a">From week</label><select id="cmp-a">${PHOTO_WEEKS.map((w) => `<option value="${w}" ${w === comparisonWeeks[0] ? "selected" : ""}>Week ${w}</option>`).join("")}</select></div>
        <div class="field"><label for="cmp-b">To week</label><select id="cmp-b">${PHOTO_WEEKS.map((w) => `<option value="${w}" ${w === comparisonWeeks[1] ? "selected" : ""}>Week ${w}</option>`).join("")}</select></div>
      </div>
      ${renderComparison(photos)}
    </div>
    <input type="file" accept="image/*" capture="environment" id="photo-file-input" style="display:none;">
  `;
}

function renderComparison(photos) {
  const [a, b] = comparisonWeeks;
  return `<div class="grid-2">
    ${["front"].map(() => "").join("")}
    ${renderCompareCol(photos, a)}${renderCompareCol(photos, b)}
  </div>`;
}
function renderCompareCol(photos, week) {
  const p = photos.find((ph) => ph.week === week && ph.angle === "front") || photos.find((ph) => ph.week === week);
  return `<div>
    <div class="text-sm muted" style="text-align:center;margin-bottom:6px;">Week ${week}</div>
    <div class="photo-slot" style="cursor:default;">${p ? `<img src="${p.dataUrl}" alt="Week ${week}">` : `<span class="faint text-sm">No photo</span>`}</div>
  </div>`;
}

// --------------------------------------------------------- TRANSFORMATION --
function renderTransformation() {
  const settings = getSettings();
  const logs = getAllLogs();
  const today = todayStr();
  const idx = dayIndex(settings.startDate, today);
  const avg7 = trailingAvgWeight(logs, today, 7);
  const current = getLog(today).weight ?? avg7 ?? settings.startingWeight;
  const totals = totalsAcrossJourney(settings.startDate, logs, settings.waterTarget);
  const streaks = computeStreaks(settings.startDate, logs, settings.waterTarget);
  const change = settings.startingWeight != null && current != null ? Math.round((current - settings.startingWeight) * 10) / 10 : null;

  return `
    <div class="card feature" style="padding:28px 24px;">
      <div class="eyebrow" style="color:var(--on-ink-muted);">My transformation</div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:18px;flex-wrap:wrap;margin-top:6px;">
        ${bigStat("Start", settings.startingWeight != null ? fmt(settings.startingWeight, 1) : "—", "kg")}
        ${bigStat("Now", current != null ? fmt(current, 1) : "—", "kg", true)}
        ${bigStat("Goal", settings.goalWeight != null ? fmt(settings.goalWeight, 1) : "—", "kg")}
        ${change != null ? `<div>
          <div class="figure lg" style="color:${change <= 0 ? "var(--accent)" : "var(--lav-fill)"}">${change > 0 ? "+" : "&minus;"}${Math.abs(change)}<span class="unit" style="color:var(--on-ink-muted)">kg change</span></div>
        </div>` : ""}
      </div>
    </div>
    <div class="section grid-2">
      ${statCard("Days completed", `${Math.min(idx + 1, TOTAL_DAYS)}/${TOTAL_DAYS}`)}
      ${statCard("Workouts", totals.workouts)}
      ${statCard("Meals logged", totals.meals)}
      ${statCard("Consistency", totals.avgConsistency + "%")}
    </div>
    <div class="section card">
      ${cardHead("trophy", "Streaks & badges", "", "on-accent")}
      <div class="streak-row">
        <span class="streak-chip">${icon("flame", { size: 14 })} ${streaks.current}-day streak</span>
        <span class="streak-chip">${icon("trophy", { size: 14 })} Best ${streaks.best} days</span>
        ${totals.workouts >= 5 ? `<span class="streak-chip">${icon("dumbbell", { size: 14 })} ${totals.workouts} workouts</span>` : ""}
        ${totals.daysCompleted >= 7 ? `<span class="streak-chip">${icon("trophy", { size: 14 })} Week completed</span>` : ""}
      </div>
    </div>`;
}

function bigStat(label, value, unit, emphasis = false) {
  return `<div>
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;color:var(--on-ink-muted);margin-bottom:4px;">${label}</div>
    <div class="figure ${emphasis ? "lg" : ""}">${value}<span class="unit" style="color:var(--on-ink-muted)">${unit}</span></div>
  </div>`;
}
function statCard(label, value) {
  return `<div class="card">
    <div class="tile-label">${label}</div>
    <div class="figure" style="margin-top:6px;">${value}</div>
  </div>`;
}

// --------------------------------------------------------------------- mount
export function mount(route) {
  const tab = route.tab || "metrics";
  document.querySelectorAll("[data-p-tab]").forEach((b) => b.addEventListener("click", () => navigate("progress", b.dataset.pTab)));
  document.querySelectorAll("[data-qa-open]").forEach((b) =>
    b.addEventListener("click", async () => {
      const { renderQuickAdd } = await import("./quickadd.js");
      renderQuickAdd();
      setTimeout(() => { const btn = document.querySelector(`[data-qa="${b.dataset.qaOpen}"]`); if (btn) btn.click(); }, 30);
    })
  );

  if (tab === "charts") {
    document.querySelectorAll("[data-chart-period]").forEach((b) => b.addEventListener("click", () => { chartPeriod = b.dataset.chartPeriod; navigate("progress", "charts"); }));
    mountCharts();
  }

  if (tab === "calendar") {
    document.querySelectorAll("[data-cal-shift]").forEach((b) => b.addEventListener("click", () => { calMonthOffset += parseInt(b.dataset.calShift, 10); navigate("progress", "calendar"); }));
    document.querySelectorAll("[data-cal-day]").forEach((d) => d.addEventListener("click", () => openDaySheet(d.dataset.calDay)));
  }

  if (tab === "journey") {
    document.querySelectorAll("[data-week-jump]").forEach((c) =>
      c.addEventListener("click", () => {
        const card = document.querySelector(`[data-week-detail="${c.dataset.weekJump}"]`);
        if (card) card.scrollIntoView({ behavior: "smooth", block: "center" });
      })
    );
    document.querySelectorAll("[data-week-detail]").forEach((c) => c.addEventListener("click", () => openWeekDetail(Number(c.dataset.weekDetail))));
  }

  if (tab === "photos") {
    let pendingSlot = null;
    const fileInput = document.getElementById("photo-file-input");
    document.querySelectorAll("[data-photo-slot]").forEach((slot) =>
      slot.addEventListener("click", () => { pendingSlot = slot.dataset.photoSlot; fileInput.click(); })
    );
    document.querySelectorAll("#cmp-a, #cmp-b").forEach((sel) =>
      sel.addEventListener("change", () => {
        comparisonWeeks = [Number(document.getElementById("cmp-a").value), Number(document.getElementById("cmp-b").value)];
        navigate("progress", "photos");
      })
    );
    if (fileInput)
      fileInput.addEventListener("change", async () => {
        const file = fileInput.files[0];
        if (!file || !pendingSlot) return;
        const [week, angle] = pendingSlot.split(":");
        const reader = new FileReader();
        reader.onload = async () => {
          await addPhoto(Number(week), angle, reader.result);
          toast("Photo saved");
        };
        reader.readAsDataURL(file);
        fileInput.value = "";
      });
  }
}
