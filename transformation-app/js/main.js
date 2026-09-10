// ==========================================================================
// Entry point: hydrate store from IndexedDB, apply theme, mount the app.
// ==========================================================================
import { initStore, getSettings, updateSettings } from "./store.js";
import { initApp } from "./app.js";
import { initUiRoots, openSheet, closeSheet, toast } from "./ui.js";
import { applyTheme } from "./pages/settings.js";
import { todayStr } from "./utils/dates.js";

async function boot() {
  initUiRoots();
  await initStore();
  const settings = getSettings();
  applyTheme(settings.theme);

  // Keep system-theme in sync live.
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (getSettings().theme === "system") applyTheme("system");
    });
  }

  initApp(document.getElementById("app"));

  if (!settings.onboarded) {
    setTimeout(showWelcome, 250);
  }
}

function showWelcome() {
  openSheet({
    title: "Welcome 👋",
    bodyHtml: `
      <p class="muted text-sm">Your 12-week meal & workout plan is already loaded from your Excel. Set a few basics to personalize your dashboard — you can change these anytime in Settings.</p>
      <div class="field mt-16"><label for="w-start">Program start date</label><input id="w-start" type="date" value="${getSettings().startDate}"></div>
      <div class="field-row">
        <div class="field"><label for="w-sw">Starting weight (kg)</label><input id="w-sw" type="number" step="0.1" placeholder="optional"></div>
        <div class="field"><label for="w-gw">Goal weight (kg)</label><input id="w-gw" type="number" step="0.1" placeholder="optional"></div>
      </div>
      <button class="btn btn-primary btn-block" id="w-save">Let's go</button>
    `,
    onMount: (root) => {
      root.querySelector("#w-save").addEventListener("click", async () => {
        const startDate = root.querySelector("#w-start").value || todayStr();
        const swRaw = root.querySelector("#w-sw").value;
        const gwRaw = root.querySelector("#w-gw").value;
        await updateSettings({
          startDate,
          startingWeight: swRaw ? parseFloat(swRaw) : null,
          goalWeight: gwRaw ? parseFloat(gwRaw) : null,
          onboarded: true,
        });
        closeSheet();
        toast("You're all set!");
      });
    },
  });
}

boot();
