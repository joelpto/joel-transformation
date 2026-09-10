// ==========================================================================
// JOURNAL — one simple daily entry: energy, hunger, mood, workout difficulty
// (1-5 sliders) plus free notes.
// ==========================================================================
import { getLog, updateLog } from "../store.js";
import { todayStr, addDays, formatDateLong } from "../utils/dates.js";
import { icon } from "../utils/icons.js";
import { escapeHtml, toast, pageHeader, pageBody } from "../ui.js";
import { navigate } from "../app.js";

let selectedDate = todayStr();

const FIELDS = [
  { key: "energy", label: "Energy" },
  { key: "hunger", label: "Hunger" },
  { key: "mood", label: "Mood" },
  { key: "difficulty", label: "Workout difficulty" },
];

export function render(route) {
  if (route.date) selectedDate = route.date;
  const log = getLog(selectedDate);
  const j = log.journal || {};
  const isToday = selectedDate === todayStr();
  return `
    ${pageHeader({
      eyebrow: "Daily check-in",
      title: `Daily <em>journal</em>`,
      sub: "Four sliders and a note. Thirty seconds, most days.",
    })}
    ${pageBody(`
    <div class="flex-between card" style="padding:10px 12px;">
      <button class="icon-btn" data-day-shift="-1" aria-label="Previous day">${icon("chevronLeft", { size: 16 })}</button>
      <div style="text-align:center;"><div style="font-weight:700;">${formatDateLong(selectedDate)}</div>${!isToday ? `<button class="link-btn text-sm" data-day-today>Jump to today</button>` : ""}</div>
      <button class="icon-btn" data-day-shift="1" aria-label="Next day">${icon("chevronRight", { size: 16 })}</button>
    </div>
    <div class="section card">
      ${FIELDS.map(
        (f) => `
        <div class="field">
          <label for="j-${f.key}">${f.label}: <span id="j-${f.key}-val">${j[f.key] || 3}</span> / 5</label>
          <input type="range" min="1" max="5" step="1" class="slider" id="j-${f.key}" value="${j[f.key] || 3}">
        </div>`
      ).join("")}
      <div class="field"><label for="j-notes">Notes</label><textarea id="j-notes" rows="4" placeholder="How did today feel?">${escapeHtml(j.notes || "")}</textarea></div>
      <button class="btn btn-primary btn-block" id="j-save">${icon("check", { size: 14 })} Save entry</button>
    </div>
    `)}
  `;
}

export function mount() {
  FIELDS.forEach((f) => {
    const inp = document.getElementById(`j-${f.key}`);
    const out = document.getElementById(`j-${f.key}-val`);
    if (inp) inp.addEventListener("input", () => (out.textContent = inp.value));
  });
  document.querySelectorAll("[data-day-shift]").forEach((b) =>
    b.addEventListener("click", () => { selectedDate = addDays(selectedDate, parseInt(b.dataset.dayShift, 10)); navigate("journal", null, { date: selectedDate }); })
  );
  const jumpBtn = document.querySelector("[data-day-today]");
  if (jumpBtn) jumpBtn.addEventListener("click", () => { selectedDate = todayStr(); navigate("journal", null, { date: selectedDate }); });

  const saveBtn = document.getElementById("j-save");
  if (saveBtn)
    saveBtn.addEventListener("click", async () => {
      const entry = {};
      FIELDS.forEach((f) => (entry[f.key] = Number(document.getElementById(`j-${f.key}`).value)));
      entry.notes = document.getElementById("j-notes").value;
      await updateLog(selectedDate, (d) => { d.journal = entry; });
      toast("Journal saved");
    });
}
