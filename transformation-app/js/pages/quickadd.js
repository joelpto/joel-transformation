// ==========================================================================
// Floating "+" quick-add sheet — optimized for one-handed mobile use.
// ==========================================================================
import { icon } from "../utils/icons.js";
import { openSheet, closeSheet, toast } from "../ui.js";
import { updateLog, getLog } from "../store.js";
import { todayStr } from "../utils/dates.js";
import { navigate } from "../app.js";

const ITEMS = [
  { key: "weight", label: "Log Weight", ic: "scale" },
  { key: "meal", label: "Log Meal", ic: "utensils" },
  { key: "workout", label: "Log Workout", ic: "dumbbell" },
  { key: "cardio", label: "Log Cardio", ic: "activity" },
  { key: "water", label: "Log Water", ic: "droplet" },
  { key: "steps", label: "Log Steps", ic: "footprints" },
  { key: "sleep", label: "Log Sleep", ic: "moon" },
  { key: "measurement", label: "Log Measurement", ic: "ruler" },
  { key: "note", label: "Add Note", ic: "note" },
];

export function renderQuickAdd() {
  const html = `<div class="quick-grid">${ITEMS.map(
    (it) => `<button class="quick-item" data-qa="${it.key}"><span class="ic">${icon(it.ic, { size: 19 })}</span>${it.label}</button>`
  ).join("")}</div>`;
  openSheet({
    title: "Quick Add",
    bodyHtml: html,
    onMount: (rootEl) => {
      rootEl.querySelectorAll("[data-qa]").forEach((btn) => {
        btn.addEventListener("click", () => handleQuickAdd(btn.dataset.qa));
      });
    },
  });
}

function handleQuickAdd(key) {
  if (key === "meal") { closeSheet(); navigate("plan", "meals"); return; }
  if (key === "workout") { closeSheet(); navigate("workout", "strength"); return; }
  if (key === "cardio") { closeSheet(); navigate("workout", "cardio"); return; }
  if (key === "note") { closeSheet(); navigate("journal"); return; }

  const forms = {
    weight: {
      title: "Log Weight",
      body: `
        <div class="field"><label for="qa-weight">Weight (kg)</label><input id="qa-weight" type="number" step="0.1" inputmode="decimal" autofocus placeholder="e.g. 81.4"></div>
        <div class="field"><label for="qa-weight-note">Note (optional)</label><input id="qa-weight-note" type="text" placeholder="Morning, fasted..."></div>
        <button class="btn btn-primary btn-block" id="qa-save">Save</button>`,
      save: () => {
        const v = parseFloat(document.getElementById("qa-weight").value);
        if (Number.isNaN(v)) return toast("Enter a weight");
        const note = document.getElementById("qa-weight-note").value;
        updateLog(todayStr(), (d) => { d.weight = v; d.weightNote = note; }).then(() => toast("Weight logged"));
        closeSheet();
      },
    },
    water: {
      title: "Log Water",
      body: `
        <div class="grid-3 mt-8">
          ${[0.25, 0.5, 1].map((a) => `<button class="btn btn-secondary" data-water="${a}">+${a}L</button>`).join("")}
        </div>
        <div class="field mt-16"><label for="qa-water-custom">Custom amount (L)</label><input id="qa-water-custom" type="number" step="0.1" inputmode="decimal" placeholder="e.g. 0.3"></div>
        <button class="btn btn-primary btn-block" id="qa-save">Add custom</button>`,
      save: () => {
        const v = parseFloat(document.getElementById("qa-water-custom").value);
        if (Number.isNaN(v) || v <= 0) return toast("Enter an amount");
        updateLog(todayStr(), (d) => { d.water = Math.round(((d.water || 0) + v) * 100) / 100; }).then(() => toast("Water logged"));
        closeSheet();
      },
      extraMount: (rootEl) => {
        rootEl.querySelectorAll("[data-water]").forEach((btn) =>
          btn.addEventListener("click", () => {
            const amt = parseFloat(btn.dataset.water);
            updateLog(todayStr(), (d) => { d.water = Math.round(((d.water || 0) + amt) * 100) / 100; }).then(() => toast(`+${amt}L logged`));
            closeSheet();
          })
        );
      },
    },
    steps: {
      title: "Log Steps",
      body: `
        <div class="field"><label for="qa-steps">Today's steps</label><input id="qa-steps" type="number" inputmode="numeric" autofocus placeholder="e.g. 8450"></div>
        <button class="btn btn-primary btn-block" id="qa-save">Save</button>`,
      save: () => {
        const v = parseInt(document.getElementById("qa-steps").value, 10);
        if (Number.isNaN(v)) return toast("Enter a step count");
        updateLog(todayStr(), (d) => { d.steps = v; }).then(() => toast("Steps logged"));
        closeSheet();
      },
    },
    sleep: {
      title: "Log Sleep",
      body: `
        <div class="field"><label for="qa-sleep-hrs">Hours slept</label><input id="qa-sleep-hrs" type="number" step="0.25" inputmode="decimal" placeholder="e.g. 7.5"></div>
        <div class="field"><label for="qa-sleep-q">Sleep quality</label>
          <select id="qa-sleep-q"><option value="">—</option>${[1,2,3,4,5].map((n)=>`<option value="${n}">${n} / 5</option>`).join("")}</select>
        </div>
        <div class="field"><label for="qa-sleep-notes">Notes (optional)</label><textarea id="qa-sleep-notes" rows="2"></textarea></div>
        <button class="btn btn-primary btn-block" id="qa-save">Save</button>`,
      save: () => {
        const hours = parseFloat(document.getElementById("qa-sleep-hrs").value);
        const quality = document.getElementById("qa-sleep-q").value;
        const notes = document.getElementById("qa-sleep-notes").value;
        if (Number.isNaN(hours)) return toast("Enter hours slept");
        updateLog(todayStr(), (d) => { d.sleep = { hours, quality: quality ? Number(quality) : null, notes }; }).then(() => toast("Sleep logged"));
        closeSheet();
      },
    },
    measurement: {
      title: "Log Measurement",
      body: (() => {
        const log = getLog(todayStr());
        const m = log.measurements || {};
        const field = (key, label, val) => `<div class="field"><label for="qa-m-${key}">${label} (cm)</label><input id="qa-m-${key}" type="number" step="0.1" value="${val ?? ""}"></div>`;
        return `
        ${field("waist", "Waist", m.waist)}
        <div class="field-row">${field("chest", "Chest", m.chest)}${field("arms", "Arms", m.arms)}</div>
        <div class="field-row">${field("thighs", "Thighs", m.thighs)}${field("hips", "Hips", m.hips)}</div>
        <div class="field-row">${field("neck", "Neck", m.neck)}<div class="field"><label for="qa-m-bodyFat">Body fat (%)</label><input id="qa-m-bodyFat" type="number" step="0.1" value="${m.bodyFat ?? ""}"></div></div>
        <button class="btn btn-primary btn-block" id="qa-save">Save</button>`;
      })(),
      save: () => {
        const keys = ["waist", "chest", "arms", "thighs", "hips", "neck", "bodyFat"];
        const vals = {};
        keys.forEach((k) => {
          const raw = document.getElementById(`qa-m-${k}`).value;
          if (raw !== "") vals[k] = parseFloat(raw);
        });
        updateLog(todayStr(), (d) => { d.measurements = { ...d.measurements, ...vals }; }).then(() => toast("Measurements logged"));
        closeSheet();
      },
    },
  };

  const form = forms[key];
  if (!form) return;
  openSheet({
    title: form.title,
    bodyHtml: form.body,
    onMount: (rootEl) => {
      const saveBtn = rootEl.querySelector("#qa-save");
      if (saveBtn) saveBtn.addEventListener("click", form.save);
      if (form.extraMount) form.extraMount(rootEl);
    },
  });
}
