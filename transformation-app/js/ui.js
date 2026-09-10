// ==========================================================================
// Small shared UI helpers: sheets/modals, toasts, SVG progress rings, bars.
// Sheets render outside the main re-render cycle so typing inside them stays
// smooth (uncontrolled inputs, read via DOM on submit).
// ==========================================================================
import { icon } from "./utils/icons.js";

let sheetRoot, toastRoot;

export function initUiRoots() {
  sheetRoot = document.getElementById("sheet-root");
  toastRoot = document.getElementById("toast-root");
}

export function openSheet({ title, bodyHtml, onMount, wide }) {
  sheetRoot.innerHTML = `
    <div class="sheet-overlay" data-close-sheet>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${escapeAttr(title || "")}">
        <div class="sheet-handle"></div>
        <div class="sheet-head">
          <h3>${title || ""}</h3>
          <button class="icon-btn" data-close-sheet aria-label="Close">${icon("x", { size: 18 })}</button>
        </div>
        <div class="sheet-body">${bodyHtml}</div>
      </div>
    </div>`;
  const overlay = sheetRoot.querySelector(".sheet-overlay");
  overlay.addEventListener("click", (e) => {
    // Two ways out: click the backdrop itself, or click any control marked as
    // a close affordance. `closest` is needed because a click on the X button
    // actually lands on the <svg> inside it — but it has to exclude the
    // overlay, which carries the same attribute and is an ancestor of every
    // control in the sheet, and would otherwise close on any click at all.
    if (e.target === overlay || e.target.closest("[data-close-sheet]:not(.sheet-overlay)")) {
      closeSheet();
    }
  });
  document.addEventListener("keydown", onSheetKeydown);
  if (onMount) onMount(sheetRoot);
  const firstField = sheetRoot.querySelector("input, select, textarea, button");
  if (firstField && firstField.autofocus) firstField.focus();
}

function onSheetKeydown(e) {
  if (e.key === "Escape") closeSheet();
}

export function closeSheet() {
  document.removeEventListener("keydown", onSheetKeydown);
  if (sheetRoot) sheetRoot.innerHTML = "";
}

let toastTimer;
export function toast(msg) {
  if (!toastRoot) return;
  toastRoot.textContent = msg;
  toastRoot.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastRoot.classList.remove("show"), 2200);
}

export function escapeAttr(s) {
  return String(s).replace(/"/g, "&quot;");
}
export function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** SVG ring: value/max in [0,1] visually, label shown in center. */
export function ring({ pct, size = 84, stroke = 8, color = "var(--accent-line)", track = "var(--surface-2)", valueLabel = "", capLabel = "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, pct));
  const offset = c * (1 - clamped);
  return `
  <div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" style="fill:none;stroke:${track}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${offset}"
        transform="rotate(-90 ${size / 2} ${size / 2})" style="fill:none;stroke:${color};transition:stroke-dashoffset .5s ease"/>
    </svg>
    <div class="ring-label">
      <span class="val">${valueLabel}</span>
      <span class="cap">${capLabel}</span>
    </div>
  </div>`;
}

export function bar(pct, opts = {}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const cls = opts.thin ? "bar thin" : opts.thick ? "bar thick" : "bar";
  const color = opts.color ? `background:${opts.color}` : "";
  return `<div class="${cls}"><span style="width:${clamped * 100}%;${color}"></span></div>`;
}

export function statusBadge(status) {
  const map = {
    excellent: ["badge-good", "Excellent"],
    strong: ["badge-good", "Strong"],
    partial: ["badge-mid", "Partial"],
    mixed: ["badge-mid", "Mixed"],
    missed: ["badge-bad", "Missed"],
    "needs-attention": ["badge-bad", "Needs attention"],
    not_started: ["badge-neutral", "Not started"],
    upcoming: ["badge-neutral", "Upcoming"],
    completed: ["badge-good", "Completed"],
    skipped: ["badge-bad", "Skipped"],
    in_progress: ["badge-mid", "In progress"],
    rest: ["badge-neutral", "Rest day"],
  };
  const [cls, label] = map[status] || ["badge-neutral", status];
  return `<span class="badge ${cls}">${label}</span>`;
}

export function fmt(n, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
}

// ==========================================================================
// Page shell — every screen is a gradient band (header + tab strip) followed
// by the content on the pale ground. Keeping it in one place is what makes
// the identity hold across seven different screens.
// ==========================================================================

/** The gradient header. `tabs` is an array of {key, label, active}. */
export function pageHeader({ eyebrow, title, sub, actions = "", tabs = null, tabAttr = "data-tab-key" }) {
  return `
  <header class="band">
    <div class="band-inner">
      <div class="topbar">
        <div>
          ${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ""}
          <h1>${title}</h1>
          ${sub ? `<div class="sub">${sub}</div>` : ""}
        </div>
        ${actions ? `<div class="topbar-actions">${actions}</div>` : ""}
      </div>
      ${tabs ? tabStrip(tabs, tabAttr) : ""}
    </div>
  </header>`;
}

export function tabStrip(tabs, attr = "data-tab-key") {
  return `<div class="pill-tabs" role="tablist">${tabs
    .map((t) => `<button role="tab" aria-selected="${!!t.active}" class="${t.active ? "active" : ""}" ${attr}="${t.key}"${t.page ? ` data-tab-page="${t.page}"` : ""}>${t.label}</button>`)
    .join("")}</div>`;
}

/** Content below the band. */
export function pageBody(html) {
  return `<main class="main-scroll page-enter" id="main-scroll">${html}</main>`;
}

// ==========================================================================
// Dashboard primitives
// ==========================================================================

/** Card header: icon chip + uppercase label + optional right-hand control. */
export function cardHead(iconName, label, rightHtml = "", chipClass = "") {
  return `<div class="card-title">
    <span class="chip-ic ${chipClass}">${icon(iconName, { size: 15 })}</span>
    <span class="grow">${label}</span>
    ${rightHtml}
  </div>`;
}

/** Big display figure with a unit suffix and an optional delta pill. */
export function figure(value, unit = "", opts = {}) {
  const cls = ["figure", opts.size || ""].filter(Boolean).join(" ");
  return `<div class="${cls}">
    <span>${value}</span>
    ${unit ? `<span class="unit">${unit}</span>` : ""}
    ${opts.delta || ""}
  </div>
  ${opts.note ? `<div class="figure-note">${opts.note}</div>` : ""}`;
}

/**
 * Small delta pill. `tone` is "good" (on plan), "cool" (neutral/informational),
 * "bad" (off plan) — semantic, deliberately not tied to the sign of the number.
 */
export function deltaPill(text, tone = "cool") {
  return `<span class="delta ${tone}">${text}</span>`;
}

/**
 * Circle-pack of up to 3 parts — used for the day's calorie split across
 * protein / carbs / fat. Areas are proportional to value, so the picture
 * reads as a share rather than a ranking of diameters.
 * items: [{ value, label, sub, fill, text }]
 */
export function bubbleChart(items, opts = {}) {
  const parts = items.filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  if (!parts.length) {
    return `<div class="faint text-sm" style="padding:22px 0;text-align:center;">Log a meal to see today's split</div>`;
  }
  const max = parts[0].value;
  const R = 46; // radius of the largest bubble, in viewBox units
  const rOf = (v) => Math.max(15, R * Math.sqrt(v / max));
  const r = parts.map((p) => rOf(p.value));

  // Deterministic 3-circle pack: largest top-left, second top-right,
  // third tucked below the seam between them.
  const pos = [{ x: r[0], y: r[0] }];
  if (r[1] != null) pos.push({ x: r[0] + (r[0] + r[1]) * 0.86, y: r[0] + (r[0] - r[1]) * 0.22 });
  if (r[2] != null) pos.push({ x: r[0] + (r[0] + r[2]) * 0.66, y: r[0] + (r[0] + r[2]) * 0.8 });

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  pos.forEach((p, i) => {
    minX = Math.min(minX, p.x - r[i]); maxX = Math.max(maxX, p.x + r[i]);
    minY = Math.min(minY, p.y - r[i]); maxY = Math.max(maxY, p.y + r[i]);
  });
  const pad = 2;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;

  // Draw smallest last so it sits on top of the seam, like the pack implies.
  const order = parts.map((_, i) => i).reverse();
  const circles = order
    .map((i) => {
      const p = parts[i];
      const showText = r[i] >= 22;
      const showSub = r[i] >= 30;
      return `<g>
        <circle cx="${pos[i].x.toFixed(2)}" cy="${pos[i].y.toFixed(2)}" r="${r[i].toFixed(2)}" style="fill:${p.fill}"></circle>
        ${showText ? `<text x="${pos[i].x.toFixed(2)}" y="${(pos[i].y + (showSub ? 0 : 4)).toFixed(2)}" text-anchor="middle" font-size="${(r[i] * 0.4).toFixed(1)}" style="fill:${p.text};font-family:Archivo,sans-serif;font-weight:800;letter-spacing:-0.5px">${p.label}</text>` : ""}
        ${showSub ? `<text x="${pos[i].x.toFixed(2)}" y="${(pos[i].y + r[i] * 0.36).toFixed(2)}" text-anchor="middle" font-size="${(r[i] * 0.2).toFixed(1)}" style="fill:${p.text};opacity:.7;font-family:'Instrument Sans',sans-serif;font-weight:600">${p.sub}</text>` : ""}
      </g>`;
    })
    .join("");

  return `<svg class="bubbles" viewBox="${vb}" role="img" aria-label="${escapeAttr(opts.alt || "Composition")}" style="max-height:${opts.maxHeight || 190}px">${circles}</svg>`;
}

/**
 * 84-day consistency matrix — one dot per program day, banded by daily score.
 * cells: [{ level: 0|1|2|3|"miss", title, isToday }]
 */
export function dotGrid(cells, opts = {}) {
  const cols = opts.cols || 14;
  const dots = cells
    .map((c) => {
      const cls = [c.level === "miss" ? "miss" : c.level ? "l" + c.level : "", c.isToday ? "today" : ""].filter(Boolean).join(" ");
      return `<i class="${cls}" title="${escapeAttr(c.title || "")}"></i>`;
    })
    .join("");
  return `<div class="dotgrid" style="grid-template-columns:repeat(${cols},1fr)">${dots}</div>`;
}

/** Value + named track + percentage, the row form used for mixes and splits. */
export function barRow(value, unit, name, pct, color) {
  return `<div class="bar-row">
    <div class="br-val">${value}<small>${unit}</small></div>
    <div class="br-track">
      <div class="bar thin"><span style="width:${Math.max(0, Math.min(1, pct)) * 100}%;background:${color}"></span></div>
    </div>
    <div class="br-name"><i style="background:${color}"></i>${name}</div>
  </div>`;
}
