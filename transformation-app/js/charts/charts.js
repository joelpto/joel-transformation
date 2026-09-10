// ==========================================================================
// Chart.js wrappers (Chart.js loaded globally via CDN <script> in index.html).
// Keeps one Chart instance per canvas id so re-renders don't leak instances.
// ==========================================================================
const instances = {};

function css(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/** Read a CSS custom property live (theme-reactive) for use as a chart color. */
export function cssVar(varName, fallback) {
  return css(varName) || fallback || "#888";
}

function baseOptions(extra = {}) {
  const grid = css("--border-soft") || "#eee";
  const text = css("--text-muted") || "#888";
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: { legend: { display: extra.legend !== false, labels: { color: text, boxWidth: 10, font: { size: 11, weight: "600" } } }, tooltip: { backgroundColor: css("--text") || "#222", titleColor: css("--bg") || "#fff", bodyColor: css("--bg") || "#fff", padding: 10, cornerRadius: 8 } },
    scales: {
      x: { grid: { color: "transparent" }, ticks: { color: text, font: { size: 10 } } },
      y: { grid: { color: grid }, ticks: { color: text, font: { size: 10 } }, beginAtZero: extra.beginAtZero !== false },
    },
    ...extra.overrides,
  };
}

export function lineChart(canvasId, labels, datasets, extra = {}) {
  const el = document.getElementById(canvasId);
  if (!el || typeof Chart === "undefined") return;
  if (instances[canvasId]) instances[canvasId].destroy();
  instances[canvasId] = new Chart(el.getContext("2d"), {
    type: "line",
    data: { labels, datasets: datasets.map((ds) => ({ tension: 0.35, pointRadius: 2, pointHoverRadius: 4, borderWidth: 2.5, fill: ds.fill ?? false, ...ds })) },
    options: baseOptions(extra),
  });
}

export function barChart(canvasId, labels, datasets, extra = {}) {
  const el = document.getElementById(canvasId);
  if (!el || typeof Chart === "undefined") return;
  if (instances[canvasId]) instances[canvasId].destroy();
  instances[canvasId] = new Chart(el.getContext("2d"), {
    type: "bar",
    data: { labels, datasets: datasets.map((ds) => ({ borderRadius: 5, maxBarThickness: 26, ...ds })) },
    options: baseOptions(extra),
  });
}

export function destroyAllCharts() {
  Object.values(instances).forEach((c) => c.destroy());
  Object.keys(instances).forEach((k) => delete instances[k]);
}
