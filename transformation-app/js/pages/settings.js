// ==========================================================================
// SETTINGS — program config, daily targets, appearance, and data
// (export / import / reset). Defaults come from the Excel; everything here
// is user-overridable and persisted.
// ==========================================================================
import { icon } from "../utils/icons.js";
import { openSheet, closeSheet, toast, escapeHtml, cardHead, pageHeader, pageBody } from "../ui.js";
import { getSettings, updateSettings, exportJSON, exportLogsCSV, importJSON, resetAllTrackingData } from "../store.js";
import { PLAN } from "../data/planData.js";

export function render(route) {
  const s = getSettings();
  return `
    ${pageHeader({
      eyebrow: "Your setup",
      title: `<em>Settings</em>`,
      sub: "Program dates, daily targets, appearance and your data.",
    })}
    ${pageBody(`
    <div class="dash">
    <div class="card c6" id="sec-photo">
      ${cardHead("camera", "Hero photo", "", "on-accent")}
      <p class="faint text-sm">The picture behind your Today screen. It stays on this device — nothing is uploaded anywhere.</p>
      <div class="flex gap-8 mt-16" style="flex-wrap:wrap;">
        <button class="btn btn-primary" data-hero-pick>${icon("camera", { size: 14 })} ${s.heroPhoto ? "Replace photo" : "Choose photo"}</button>
        ${s.heroPhoto ? `<button class="btn btn-secondary" data-hero-clear>${icon("trash", { size: 14 })} Remove</button>` : ""}
      </div>
      <input type="file" accept="image/*" id="hero-file" style="display:none;">
    </div>

    <div class="card c6" id="sec-program">
      ${cardHead("calendar", "Program", "", "on-accent")}
      <div class="field"><label for="s-start">Start date</label><input id="s-start" type="date" value="${s.startDate}"></div>
      <div class="field-row">
        <div class="field"><label for="s-sw">Starting weight (kg)</label><input id="s-sw" type="number" step="0.1" value="${s.startingWeight ?? ""}"></div>
        <div class="field"><label for="s-gw">Goal weight (kg)</label><input id="s-gw" type="number" step="0.1" value="${s.goalWeight ?? ""}"></div>
      </div>
      <div class="field"><label for="s-rate">Weekly target rate (kg/week, optional)</label><input id="s-rate" type="number" step="0.05" value="${s.weeklyTargetRateKg ?? ""}" placeholder="e.g. 0.5"></div>
    </div>

    <div class="card c6">
      ${cardHead("target", "Daily targets")}
      <div class="field-row">
        <div class="field"><label for="s-cal">Calories (kcal)</label><input id="s-cal" type="number" value="${s.calorieTarget}"></div>
        <div class="field"><label for="s-pro">Protein (g)</label><input id="s-pro" type="number" value="${s.proteinTarget}"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="s-fib">Fiber (g)</label><input id="s-fib" type="number" value="${s.fiberTarget}"></div>
        <div class="field"><label for="s-wat">Water (L)</label><input id="s-wat" type="number" step="0.1" value="${s.waterTarget}"></div>
      </div>
      <div class="field"><label for="s-steps">Step target (optional)</label><input id="s-steps" type="number" value="${s.stepTarget ?? ""}" placeholder="e.g. 8000"></div>
      <p class="faint text-sm mt-4">Defaults from your plan: ${escapeHtml(PLAN.dailyTargets.calories.guidance)}, ${escapeHtml(PLAN.dailyTargets.protein.guidance)}.</p>
    </div>

    <div class="card c6">
      ${cardHead("sun", "Appearance & units")}
      <div class="field"><label for="s-theme">Theme</label>
        <select id="s-theme">
          <option value="system" ${s.theme === "system" ? "selected" : ""}>System</option>
          <option value="light" ${s.theme === "light" ? "selected" : ""}>Light</option>
          <option value="dark" ${s.theme === "dark" ? "selected" : ""}>Dark</option>
        </select>
      </div>
      <div class="field"><label for="s-units">Units</label>
        <select id="s-units">
          <option value="metric" ${s.units === "metric" ? "selected" : ""}>Metric (kg, cm)</option>
          <option value="imperial" ${s.units === "imperial" ? "selected" : ""}>Imperial (lb, in)</option>
        </select>
      </div>
    </div>

    <div class="card c6" id="sec-data">
      ${cardHead("download", "Your data")}
      <div class="grid-2">
        <button class="btn btn-secondary" data-export="json">${icon("download", { size: 14 })} Export JSON</button>
        <button class="btn btn-secondary" data-export="csv">${icon("download", { size: 14 })} Export CSV</button>
      </div>
      <button class="btn btn-secondary btn-block mt-12" data-import>${icon("upload", { size: 14 })} Import backup</button>
      <input type="file" accept="application/json" id="import-file" style="display:none;">
      <button class="btn btn-danger btn-block mt-12" data-reset>${icon("trash", { size: 14 })} Reset all tracking data</button>
      <p class="faint text-sm mt-8">Reset clears your logged weight, meals, workouts and metrics. Your imported meal & workout plan is never affected.</p>
    </div>
    </div>
    `)}
  `;
}

export function mount(route) {
  bindNum("s-sw", "startingWeight", true);
  bindNum("s-gw", "goalWeight", true);
  bindNum("s-rate", "weeklyTargetRateKg", true);
  bindNum("s-cal", "calorieTarget");
  bindNum("s-pro", "proteinTarget");
  bindNum("s-fib", "fiberTarget");
  bindNum("s-wat", "waterTarget", false, true);
  bindNum("s-steps", "stepTarget", true);

  const startInput = document.getElementById("s-start");
  if (startInput) startInput.addEventListener("change", () => updateSettings({ startDate: startInput.value }).then(() => toast("Start date updated")));

  const themeSel = document.getElementById("s-theme");
  if (themeSel) themeSel.addEventListener("change", () => { updateSettings({ theme: themeSel.value }); applyTheme(themeSel.value); });

  const unitsSel = document.getElementById("s-units");
  if (unitsSel) unitsSel.addEventListener("change", () => updateSettings({ units: unitsSel.value }));

  document.querySelectorAll("[data-export]").forEach((btn) =>
    btn.addEventListener("click", () => {
      if (btn.dataset.export === "json") downloadFile("transformation-backup.json", exportJSON(), "application/json");
      else downloadFile("transformation-logs.csv", exportLogsCSV(), "text/csv");
    })
  );

  const importBtn = document.querySelector("[data-import]");
  const importFile = document.getElementById("import-file");
  if (importBtn && importFile) {
    importBtn.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", async () => {
      const file = importFile.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        await importJSON(text);
        toast("Backup imported");
      } catch (e) {
        toast("Import failed: invalid file");
      }
      importFile.value = "";
    });
  }

  const resetBtn = document.querySelector("[data-reset]");
  if (resetBtn) resetBtn.addEventListener("click", confirmReset);

  bindHeroPhoto();

  if (route.tab === "data") {
    const el = document.getElementById("sec-data");
    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }
}

/**
 * Hero photo. Downscaled to a sensible long edge before it's stored, so a
 * 12-megapixel phone shot doesn't get parked in IndexedDB at full size.
 */
export function bindHeroPhoto(pickSelector = "[data-hero-pick]", inputId = "hero-file") {
  const input = document.getElementById(inputId);
  if (!input) return;
  document.querySelectorAll(pickSelector).forEach((b) => b.addEventListener("click", () => input.click()));
  document.querySelectorAll("[data-hero-clear]").forEach((b) =>
    b.addEventListener("click", async () => {
      await updateSettings({ heroPhoto: null });
      toast("Photo removed");
    })
  );
  input.addEventListener("change", async () => {
    const file = input.files[0];
    input.value = "";
    if (!file) return;
    try {
      const dataUrl = await downscaleImage(file, 1200);
      await updateSettings({ heroPhoto: dataUrl });
      toast("Photo saved");
    } catch (e) {
      toast("Couldn't read that image — try a JPG or PNG");
    }
  });
}

function downscaleImage(file, maxEdge) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read failed"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode failed"));
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function bindNum(id, key, nullable = false, float = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener("change", () => {
    const raw = el.value;
    let val;
    if (raw === "" && nullable) val = null;
    else val = float ? parseFloat(raw) : Number(raw);
    updateSettings({ [key]: val });
  });
}

async function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });

  // Published-artifact context: the page can't trigger a browser download
  // directly (the viewer sandbox blocks it) — offer the file through the
  // `downloads` capability instead, which shows the viewer a save prompt.
  if (window.claude && typeof window.claude.use === "function") {
    try {
      const downloads = await window.claude.use("downloads");
      if (downloads) {
        const result = await downloads.save({ filename, data: blob });
        toast(result.status === "saved" ? "Saved " + filename : "Sent " + filename);
        return;
      }
    } catch (e) {
      if (e && e.code === "declined") return; // user said no — don't also show an error
      toast("Couldn't save the file" + (e && e.message ? ": " + e.message : ""));
      return;
    }
  }

  // Standalone / self-hosted build: normal browser download.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast("Downloaded " + filename);
}

function confirmReset() {
  openSheet({
    title: "Reset all tracking data?",
    bodyHtml: `
      <p class="muted text-sm">This permanently deletes all logged weight, meals, workouts, cardio, metrics, journal entries and photos. Your meal & workout plan (from the Excel) is never touched. This cannot be undone.</p>
      <div class="grid-2 mt-16">
        <button class="btn btn-secondary" data-close-sheet>Cancel</button>
        <button class="btn btn-danger" id="confirm-reset-btn">Reset everything</button>
      </div>`,
    onMount: (rootEl) => {
      rootEl.querySelector("#confirm-reset-btn").addEventListener("click", async () => {
        await resetAllTrackingData();
        closeSheet();
        toast("All tracking data reset");
      });
    },
  });
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme === "system" ? "" : theme);
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
}
