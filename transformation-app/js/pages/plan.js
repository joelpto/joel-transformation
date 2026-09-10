// ==========================================================================
// PLAN — Meals (full plan-vs-actual tracking) + Nutrition (daily dashboard).
// ==========================================================================
import { icon } from "../utils/icons.js";
import { bar, escapeHtml, openSheet, closeSheet, toast, fmt, cardHead, pageHeader, pageBody } from "../ui.js";
import { getSettings, getLog, updateLog } from "../store.js";
import { todayStr, addDays, formatDateLong, dayOfWeekName } from "../utils/dates.js";
import { plannedMealsForDate, plannedTotals, actualTotals } from "../utils/calculations.js";
import { PLAN } from "../data/planData.js";
import { navigate } from "../app.js";

let selectedDate = todayStr();

export function render(route) {
  if (route.date) selectedDate = route.date;
  const tab = route.tab || "meals";
  return `
    ${pageHeader({
      eyebrow: "From your plan",
      title: `<em>Meals</em> &amp; macros`,
      sub: "Your seven-day rotation, mapped onto whichever date you're looking at.",
      tabs: nutritionTabs(tab),
      tabAttr: "data-plan-tab",
    })}
    ${pageBody(`
      ${dateNav()}
      <div class="section">${tab === "nutrition" ? renderNutrition(selectedDate) : renderMeals(selectedDate)}</div>
    `)}
  `;
}

/** Shared by Meals, Targets and Grocery so the three read as one section. */
export function nutritionTabs(active) {
  return [
    { key: "meals", label: "Meals", active: active === "meals", page: "plan" },
    { key: "nutrition", label: "Targets", active: active === "nutrition", page: "plan" },
    { key: "grocery", label: "Grocery", active: active === "grocery", page: "grocery" },
  ];
}

function dateNav() {
  const isToday = selectedDate === todayStr();
  return `
    <div class="flex-between card" style="padding:10px 12px;">
      <button class="icon-btn" data-day-shift="-1" aria-label="Previous day">${icon("chevronLeft", { size: 16 })}</button>
      <div style="text-align:center;">
        <div style="font-weight:700;">${formatDateLong(selectedDate)}</div>
        ${!isToday ? `<button class="link-btn text-sm" data-day-today>Jump to today</button>` : `<div class="text-sm muted">${dayOfWeekName(selectedDate)} rotation</div>`}
      </div>
      <button class="icon-btn" data-day-shift="1" aria-label="Next day">${icon("chevronRight", { size: 16 })}</button>
    </div>`;
}

function renderMeals(dateStr) {
  const log = getLog(dateStr);
  const meals = plannedMealsForDate(dateStr);
  return `<div class="dash">${meals
    .map((m) => {
      const entry = log.meals[m.id];
      const status = entry ? entry.status : "pending";
      return `
      <div class="meal-card status-${status} c6">
        <div class="meal-head">
          <div>
            <div class="meal-type">${m.meal}</div>
            <div class="meal-food">${escapeHtml(m.food)}</div>
            <div class="meal-qty">${escapeHtml(m.quantity)}</div>
          </div>
        </div>
        <div class="meal-macros">
          <span><b>${m.calories}</b> kcal</span><span><b>${m.protein}</b>g protein</span><span><b>${m.carbs}</b>g carbs</span><span><b>${m.fat}</b>g fat</span><span><b>${m.fiber}</b>g fiber</span>
        </div>
        ${m.notes ? `<div class="meal-note">${escapeHtml(m.notes)}</div>` : ""}
        ${status === "modified" && entry.actual ? renderActualBlock(entry.actual) : ""}
        ${status === "modified" && entry.note ? `<div class="text-sm muted">Note: ${escapeHtml(entry.note)}</div>` : ""}
        <div class="meal-actions">
          <button class="${status === "completed" ? "on done" : ""}" data-meal-action="completed" data-meal-id="${m.id}">${icon("check", { size: 13 })} Completed</button>
          <button class="${status === "skipped" ? "on skip" : ""}" data-meal-action="skipped" data-meal-id="${m.id}">${icon("skip", { size: 13 })} Skipped</button>
          <button class="${status === "modified" ? "on mod" : ""}" data-meal-action="modify" data-meal-id="${m.id}">${icon("edit", { size: 13 })} Modify</button>
        </div>
      </div>`;
    })
    .join("")}</div>`;
}

function renderActualBlock(actual) {
  return `<div class="card" style="background:var(--surface-2);padding:10px 12px;margin:2px 0;">
    <div class="text-sm faint" style="font-weight:700;margin-bottom:4px;">ACTUAL</div>
    ${actual.food ? `<div class="text-sm" style="margin-bottom:4px;">${escapeHtml(actual.food)}</div>` : ""}
    <div class="meal-macros">
      ${actual.calories != null ? `<span><b>${actual.calories}</b> kcal</span>` : ""}
      ${actual.protein != null ? `<span><b>${actual.protein}</b>g protein</span>` : ""}
      ${actual.carbs != null ? `<span><b>${actual.carbs}</b>g carbs</span>` : ""}
      ${actual.fat != null ? `<span><b>${actual.fat}</b>g fat</span>` : ""}
      ${actual.fiber != null ? `<span><b>${actual.fiber}</b>g fiber</span>` : ""}
    </div>
  </div>`;
}

function renderNutrition(dateStr) {
  const settings = getSettings();
  const log = getLog(dateStr);
  const planned = plannedTotals(dateStr);
  const actual = actualTotals(log, dateStr);
  const rows = [
    { key: "calories", label: "Calories", unit: "kcal", target: settings.calorieTarget },
    { key: "protein", label: "Protein", unit: "g", target: settings.proteinTarget },
    { key: "carbs", label: "Carbs", unit: "g", target: planned.carbs },
    { key: "fat", label: "Fat", unit: "g", target: planned.fat },
    { key: "fiber", label: "Fiber", unit: "g", target: settings.fiberTarget },
  ];
  return `
    <div class="card">
      ${cardHead("target", "Plan vs actual", "", "on-accent")}
      ${rows
        .map((r) => {
          const pct = r.target ? actual[r.key] / r.target : 0;
          const diff = actual[r.key] - planned[r.key];
          const statusTxt = diffLabel(r.key, actual[r.key], r.target);
          return `<div class="mt-16">
            <div class="stat-row"><span class="label">${r.label}</span><span class="value">${fmt(actual[r.key])}${r.unit} <span class="of">/ ${fmt(r.target)}${r.unit} target</span></span></div>
            ${bar(pct)}
            <div class="flex-between mt-4"><span class="faint text-sm">Plan: ${fmt(planned[r.key])}${r.unit}</span><span class="faint text-sm">${statusTxt}</span></div>
          </div>`;
        })
        .join("")}
      <div class="text-sm muted mt-16">${actual.loggedCount} of ${actual.totalCount} meals logged today.</div>
    </div>

    <div class="section card">
      ${cardHead("info", "Guidance from your plan")}
      ${Object.entries(PLAN.guidelines)
        .map(([k, v]) => `<div class="insight-item"><span class="ic">${icon("sparkle", { size: 14 })}</span><span><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</span></div>`)
        .join("")}
      <div class="insight-item"><span class="ic">${icon("droplet", { size: 14 })}</span><span><b>Vegetables:</b> ${escapeHtml(PLAN.dailyTargets.vegetables.guidance)}</span></div>
      <div class="insight-item"><span class="ic">${icon("sparkle", { size: 14 })}</span><span><b>Dark chocolate:</b> ${escapeHtml(PLAN.dailyTargets.darkChocolate.guidance)}</span></div>
      <div class="insight-item"><span class="ic">${icon("activity", { size: 14 })}</span><span><b>Whey:</b> ${escapeHtml(PLAN.dailyTargets.whey.guidance)}</span></div>
    </div>
  `;
}

function diffLabel(key, actual, target) {
  if (!target) return "";
  const ratio = actual / target;
  if (ratio >= 0.92 && ratio <= 1.08) return "On target";
  if (ratio < 0.92) return "Slightly below";
  return "Above target";
}

export function mount(route) {
  const tab = route.tab || "meals";
  document.querySelectorAll("[data-plan-tab]").forEach((b) =>
    b.addEventListener("click", () => navigate(b.dataset.tabPage || "plan", b.dataset.planTab, { date: selectedDate }))
  );
  document.querySelectorAll("[data-day-shift]").forEach((b) =>
    b.addEventListener("click", () => {
      selectedDate = addDays(selectedDate, parseInt(b.dataset.dayShift, 10));
      navigate("plan", tab, { date: selectedDate });
    })
  );
  const jumpBtn = document.querySelector("[data-day-today]");
  if (jumpBtn)
    jumpBtn.addEventListener("click", () => {
      selectedDate = todayStr();
      navigate("plan", tab, { date: selectedDate });
    });

  document.querySelectorAll("[data-meal-action]").forEach((b) =>
    b.addEventListener("click", () => handleMealAction(b.dataset.mealId, b.dataset.mealAction, selectedDate))
  );
}

async function handleMealAction(mealId, action, dateStr) {
  if (action === "modify") {
    openModifySheet(mealId, dateStr);
    return;
  }
  await updateLog(dateStr, (d) => {
    const existing = d.meals[mealId];
    if (existing && existing.status === action) {
      delete d.meals[mealId]; // tap again to un-mark
    } else {
      d.meals[mealId] = { status: action, actual: null, note: "" };
    }
  });
}

function openModifySheet(mealId, dateStr) {
  const meal = plannedMealsForDate(dateStr).find((m) => m.id === mealId);
  if (!meal) return;
  const log = getLog(dateStr);
  const existing = log.meals[mealId]?.actual || {};
  const noteVal = log.meals[mealId]?.note || "";
  openSheet({
    title: `Modify — ${meal.meal}`,
    bodyHtml: `
      <p class="muted text-sm">Planned: ${escapeHtml(meal.food)} (${meal.calories} kcal)</p>
      <div class="field mt-12"><label for="mf-food">What you actually ate</label><input id="mf-food" type="text" value="${escapeHtml(existing.food || meal.food)}"></div>
      <div class="field-row">
        <div class="field"><label for="mf-cal">Calories</label><input id="mf-cal" type="number" value="${existing.calories ?? ""}" placeholder="${meal.calories}"></div>
        <div class="field"><label for="mf-pro">Protein (g)</label><input id="mf-pro" type="number" value="${existing.protein ?? ""}" placeholder="${meal.protein}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="mf-carb">Carbs (g)</label><input id="mf-carb" type="number" value="${existing.carbs ?? ""}" placeholder="${meal.carbs}"></div>
        <div class="field"><label for="mf-fat">Fat (g)</label><input id="mf-fat" type="number" value="${existing.fat ?? ""}" placeholder="${meal.fat}"></div>
      </div>
      <div class="field"><label for="mf-fiber">Fiber (g)</label><input id="mf-fiber" type="number" value="${existing.fiber ?? ""}" placeholder="${meal.fiber}"></div>
      <div class="field"><label for="mf-note">Note</label><textarea id="mf-note" rows="2">${escapeHtml(noteVal)}</textarea></div>
      <button class="btn btn-primary btn-block" id="mf-save">Save modified meal</button>`,
    onMount: (rootEl) => {
      rootEl.querySelector("#mf-save").addEventListener("click", async () => {
        const val = (id) => {
          const raw = rootEl.querySelector(id).value;
          return raw === "" ? null : parseFloat(raw);
        };
        const food = rootEl.querySelector("#mf-food").value;
        const note = rootEl.querySelector("#mf-note").value;
        await updateLog(dateStr, (d) => {
          d.meals[mealId] = {
            status: "modified",
            actual: { food, calories: val("#mf-cal"), protein: val("#mf-pro"), carbs: val("#mf-carb"), fat: val("#mf-fat"), fiber: val("#mf-fiber") },
            note,
          };
        });
        closeSheet();
        toast("Meal updated");
      });
    },
  });
}
