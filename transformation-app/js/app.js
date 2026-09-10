// ==========================================================================
// App shell: navigation state, sidebar (desktop) / bottom nav (mobile),
// top-level render dispatch. Pages are plain modules with a render(ctx)
// function returning an HTML string.
// ==========================================================================
import { icon } from "./utils/icons.js";
import { subscribe } from "./store.js";
import { closeSheet } from "./ui.js";

import * as TodayPage from "./pages/today.js";
import * as PlanPage from "./pages/plan.js";
import * as WorkoutPage from "./pages/workout.js";
import * as ProgressPage from "./pages/progress.js";
import * as GroceryPage from "./pages/grocery.js";
import * as JournalPage from "./pages/journal.js";
import * as SettingsPage from "./pages/settings.js";
import { renderQuickAdd } from "./pages/quickadd.js";

const PAGES = {
  today: TodayPage,
  plan: PlanPage,
  workout: WorkoutPage,
  progress: ProgressPage,
  grocery: GroceryPage,
  journal: JournalPage,
  settings: SettingsPage,
};

export const route = { page: "today", tab: null, date: null };

export function navigate(page, tab = null, extra = {}) {
  route.page = page;
  route.tab = tab;
  Object.assign(route, extra);
  closeSheet();
  render();
  window.scrollTo(0, 0);
}

/**
 * Five sections, and only five. Everything that used to sit in the side rail
 * is now either a tab inside its section or lives behind the settings icon —
 * the top bar never grows past what fits comfortably on one line.
 */
const NAV = [
  { page: "today", label: "Today", ic: "home" },
  { page: "plan", tab: "meals", label: "Nutrition", ic: "utensils", also: ["grocery"] },
  { page: "workout", tab: "strength", label: "Training", ic: "dumbbell" },
  { page: "progress", tab: "metrics", label: "Progress", ic: "chart" },
  { page: "journal", label: "Journal", ic: "book" },
];

function isNavActive(it) {
  return route.page === it.page || (it.also || []).includes(route.page);
}

function brandHtml() {
  return `
    <button class="brand" data-nav data-page="today" aria-label="Joel Transformation — go to Today">
      <span class="brand-name">Joel</span>
      <span class="brand-rule"></span>
      <span class="brand-sub">Transformation</span>
    </button>`;
}

function topnavHtml() {
  return `
  <nav class="topnav" aria-label="Main navigation">
    ${brandHtml()}
    <div class="nav-links">
      ${NAV.map(
        (it) => `<button class="nav-link ${isNavActive(it) ? "active" : ""}" data-nav data-page="${it.page}" data-tab="${it.tab || ""}">${it.label}</button>`
      ).join("")}
    </div>
    <div class="nav-right">
      <button class="nav-icon" data-nav data-page="settings" aria-label="Settings">${icon("settings", { size: 17 })}</button>
      <button class="nav-cta" data-fab>Log today<span class="cta-box">${icon("arrowDown", { size: 15 })}</span></button>
    </div>
  </nav>`;
}

function bottomNavHtml() {
  return `
  <nav class="bottom-nav" aria-label="Bottom navigation">
    ${NAV.map(
      (it) => `<button class="bn-item ${isNavActive(it) ? "active" : ""}" data-nav data-page="${it.page}" data-tab="${it.tab || ""}">
        ${icon(it.ic, { size: 20 })}<span>${it.label}</span>
      </button>`
    ).join("")}
  </nav>`;
}

let root;
export function initApp(rootEl) {
  root = rootEl;
  subscribe(render);
  root.addEventListener("click", handleClick);
  root.addEventListener("change", handleChange);
  render();
}

function handleClick(e) {
  const navBtn = e.target.closest("[data-nav]");
  if (navBtn) {
    navigate(navBtn.dataset.page, navBtn.dataset.tab || null);
    return;
  }
  const fab = e.target.closest("[data-fab]");
  if (fab) {
    renderQuickAdd();
    return;
  }
}

function handleChange() {
  /* per-page modules attach their own listeners via delegation in render(); this is a placeholder for future global handling */
}

export function render() {
  if (!root) return;
  const page = PAGES[route.page] || TodayPage;
  const contentHtml = page.render(route);
  root.innerHTML = `
    <div class="app-shell">
      ${topnavHtml()}
      ${contentHtml}
    </div>
    ${bottomNavHtml()}
    <button class="fab" data-fab aria-label="Quick add">${icon("plus", { size: 26 })}</button>
  `;
  if (page.mount) page.mount(route);
}
