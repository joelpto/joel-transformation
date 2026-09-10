// ==========================================================================
// WORKOUT — Strength (editable sets/reps/weight tracker) + Cardio tabs.
// ==========================================================================
import { icon } from "../utils/icons.js";
import { statusBadge, bar, escapeHtml, toast, cardHead, pageHeader, pageBody } from "../ui.js";
import { getLog, updateLog } from "../store.js";
import { todayStr, addDays, formatDateLong, dayOfWeekName } from "../utils/dates.js";
import { plannedWorkoutForDate, workoutSetStats } from "../utils/calculations.js";
import { navigate } from "../app.js";

let selectedDate = todayStr();

export function render(route) {
  if (route.date) selectedDate = route.date;
  const tab = route.tab || "strength";
  const plan = plannedWorkoutForDate(selectedDate);
  return `
    ${pageHeader({
      eyebrow: dayOfWeekName(selectedDate),
      title: `<em>Training</em> log`,
      sub: "The plan sets the shape. Sets, reps and weights are yours to enter.",
      tabs: [
        { key: "strength", label: "Strength", active: tab === "strength" },
        { key: "cardio", label: "Cardio", active: tab === "cardio" },
      ],
      tabAttr: "data-w-tab",
    })}
    ${pageBody(`
      ${dateNav()}
      <div class="section">${tab === "cardio" ? renderCardio(selectedDate, plan) : renderStrength(selectedDate, plan)}</div>
    `)}
  `;
}

function dateNav() {
  const isToday = selectedDate === todayStr();
  return `
    <div class="flex-between card" style="padding:10px 12px;">
      <button class="icon-btn" data-day-shift="-1" aria-label="Previous day">${icon("chevronLeft", { size: 16 })}</button>
      <div style="text-align:center;">
        <div style="font-weight:700;">${formatDateLong(selectedDate)}</div>
        ${!isToday ? `<button class="link-btn text-sm" data-day-today>Jump to today</button>` : `<div class="text-sm muted">Today</div>`}
      </div>
      <button class="icon-btn" data-day-shift="1" aria-label="Next day">${icon("chevronRight", { size: 16 })}</button>
    </div>`;
}

function computeStatus(workout, stats) {
  if (workout.status === "rest") return "rest";
  if (workout.status === "skipped") return "skipped";
  if (stats.total === 0 || stats.completed === 0) return "not_started";
  if (stats.completed === stats.total) return "completed";
  return "partial";
}

function renderStrength(dateStr, plan) {
  const log = getLog(dateStr);
  const workout = log.workout;
  const stats = workoutSetStats(workout);
  const status = computeStatus(workout, stats);

  if (!plan || plan.isRestDay) {
    return `
      <div class="card empty-state">
        ${icon("moon", { size: 30 })}
        <div class="title">Rest day</div>
        <div class="desc">No resistance training planned today. ${escapeHtml(plan?.cardio || "")} is optional.</div>
      </div>`;
  }

  return `
    <div class="card">
      <div class="flex-between">
        <div><b style="text-transform:capitalize;">${escapeHtml(plan.label)}</b><div class="muted text-sm">${plan.duration}</div></div>
        ${statusBadge(status)}
      </div>
      ${bar(stats.pct / 100)}
      <div class="faint text-sm mt-4">${stats.completed} / ${stats.total} sets completed · ${stats.pct}%</div>
    </div>
    <div class="section">
      ${workout.exercises.map((ex, i) => exerciseCard(ex, i)).join("")}
    </div>
    <div class="grid-2 mt-16">
      <button class="btn btn-secondary" data-w-skip>${icon("skip", { size: 14 })} Mark day skipped</button>
      <button class="btn btn-primary" data-w-reset>${icon("refresh", { size: 14 })} Reset today's sets</button>
    </div>
  `;
}

function exerciseCard(ex, exIdx) {
  return `
  <div class="exercise-card">
    <div class="exercise-head">
      <div class="name">${escapeHtml(ex.name)}</div>
      <span class="faint text-sm">${ex.sets.filter((s) => s.completed).length}/${ex.sets.length} sets</span>
    </div>
    <div class="set-row-labels"><span>#</span><span>Weight (kg)</span><span>Reps</span><span>✓</span></div>
    ${ex.sets
      .map(
        (s, si) => `
      <div class="set-row">
        <div class="set-idx">${si + 1}</div>
        <input type="number" inputmode="decimal" placeholder="—" value="${s.weight ?? ""}" data-set-field="weight" data-ex="${exIdx}" data-set="${si}">
        <input type="number" inputmode="numeric" placeholder="—" value="${s.reps ?? ""}" data-set-field="reps" data-ex="${exIdx}" data-set="${si}">
        <button class="set-done ${s.completed ? "checked" : ""}" data-set-done data-ex="${exIdx}" data-set="${si}" aria-label="Mark set complete">${s.completed ? icon("check", { size: 15 }) : ""}</button>
      </div>`
      )
      .join("")}
    <div class="set-add-remove">
      <button data-add-set data-ex="${exIdx}">+ Add set</button>
      ${ex.sets.length > 1 ? `<button data-remove-set data-ex="${exIdx}">− Remove set</button>` : ""}
    </div>
  </div>`;
}

function renderCardio(dateStr, plan) {
  const log = getLog(dateStr);
  const c = log.cardio;
  const optional = plan?.isOptional || plan?.isRestDay;
  return `
    <div class="card">
      <div class="flex-between">
        <div><b>Planned</b><div class="muted text-sm">${escapeHtml(plan?.cardio || "—")}${optional ? " (optional)" : ""}</div></div>
        ${statusBadge(c.status)}
      </div>
    </div>
    <div class="section card">
      ${cardHead("activity", "Log cardio", "", "on-accent")}
      <div class="field"><label for="c-type">Cardio type</label><input id="c-type" type="text" value="${escapeHtml(c.type || "")}" placeholder="${escapeHtml(plan?.cardio || "e.g. Easy walk")}"></div>
      <div class="field-row">
        <div class="field"><label for="c-duration">Duration (min)</label><input id="c-duration" type="number" value="${c.duration ?? ""}"></div>
        <div class="field"><label for="c-distance">Distance (km)</label><input id="c-distance" type="number" step="0.1" value="${c.distance ?? ""}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="c-pace">Pace</label><input id="c-pace" type="text" value="${escapeHtml(c.pace || "")}" placeholder="e.g. 6:00/km"></div>
        <div class="field"><label for="c-cal">Calories burned</label><input id="c-cal" type="number" value="${c.calories ?? ""}"></div>
      </div>
      <div class="field"><label for="c-notes">Notes</label><textarea id="c-notes" rows="2">${escapeHtml(c.notes || "")}</textarea></div>
      <div class="grid-2">
        <button class="btn btn-primary" data-cardio-save data-status="completed">${icon("check", { size: 14 })} Save & mark completed</button>
        <button class="btn btn-secondary" data-cardio-save data-status="skipped">${icon("skip", { size: 14 })} Skip today</button>
      </div>
    </div>
  `;
}

export function mount(route) {
  const tab = route.tab || "strength";
  document.querySelectorAll("[data-w-tab]").forEach((b) => b.addEventListener("click", () => navigate("workout", b.dataset.wTab, { date: selectedDate })));
  document.querySelectorAll("[data-day-shift]").forEach((b) =>
    b.addEventListener("click", () => {
      selectedDate = addDays(selectedDate, parseInt(b.dataset.dayShift, 10));
      navigate("workout", tab, { date: selectedDate });
    })
  );
  const jumpBtn = document.querySelector("[data-day-today]");
  if (jumpBtn) jumpBtn.addEventListener("click", () => { selectedDate = todayStr(); navigate("workout", tab, { date: selectedDate }); });

  document.querySelectorAll("[data-set-field]").forEach((inp) =>
    inp.addEventListener("change", async () => {
      const exIdx = Number(inp.dataset.ex), setIdx = Number(inp.dataset.set), field = inp.dataset.setField;
      const val = inp.value === "" ? null : parseFloat(inp.value);
      await updateLog(selectedDate, (d) => { d.workout.exercises[exIdx].sets[setIdx][field] = val; d.workout.status = "in_progress"; });
    })
  );
  document.querySelectorAll("[data-set-done]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const exIdx = Number(btn.dataset.ex), setIdx = Number(btn.dataset.set);
      await updateLog(selectedDate, (d) => {
        const s = d.workout.exercises[exIdx].sets[setIdx];
        s.completed = !s.completed;
        d.workout.status = "in_progress";
      });
    })
  );
  document.querySelectorAll("[data-add-set]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const exIdx = Number(btn.dataset.ex);
      await updateLog(selectedDate, (d) => { d.workout.exercises[exIdx].sets.push({ weight: null, reps: null, completed: false }); });
    })
  );
  document.querySelectorAll("[data-remove-set]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const exIdx = Number(btn.dataset.ex);
      await updateLog(selectedDate, (d) => { d.workout.exercises[exIdx].sets.pop(); });
    })
  );
  const skipBtn = document.querySelector("[data-w-skip]");
  if (skipBtn) skipBtn.addEventListener("click", async () => { await updateLog(selectedDate, (d) => { d.workout.status = "skipped"; }); toast("Workout marked skipped"); });
  const resetBtn = document.querySelector("[data-w-reset]");
  if (resetBtn)
    resetBtn.addEventListener("click", async () => {
      await updateLog(selectedDate, (d) => {
        d.workout.exercises.forEach((ex) => ex.sets.forEach((s) => { s.completed = false; }));
        d.workout.status = "not_started";
      });
      toast("Sets reset");
    });

  document.querySelectorAll("[data-cardio-save]").forEach((btn) =>
    btn.addEventListener("click", async () => {
      const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
      const numVal = (id) => { const raw = val(id); return raw === "" ? null : parseFloat(raw); };
      await updateLog(selectedDate, (d) => {
        d.cardio = {
          ...d.cardio,
          type: val("c-type"),
          duration: numVal("c-duration"),
          distance: numVal("c-distance"),
          pace: val("c-pace"),
          calories: numVal("c-cal"),
          notes: val("c-notes"),
          status: btn.dataset.status,
        };
      });
      toast(btn.dataset.status === "completed" ? "Cardio logged" : "Cardio skipped");
    })
  );
}
