// ==========================================================================
// Minimal hand-authored line-icon set (Lucide-inspired stroke style),
// inlined as SVG so the app has zero external icon dependency.
// ==========================================================================

const PATHS = {
  home: 'M3 11.5 12 4l9 7.5 M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9',
  calendar: 'M7 2v3M17 2v3M3.5 8.5h17M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z',
  dumbbell: 'M4 9v6M2 10v4M20 9v6M22 10v4M7 9v6M17 9v6M7 12h10',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  more: 'M4 12h.01M12 12h.01M20 12h.01',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  skip: 'M5 4l10 8-10 8V4ZM19 5v14',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z',
  droplet: 'M12 2s7 7.5 7 12a7 7 0 0 1-14 0c0-4.5 7-12 7-12Z',
  footprints: 'M8 3a2 2 0 0 1 2 2c0 1.5-1 2-1 3.5S10 11 8.5 11 6 10 6 8.5 8 5 8 3ZM16 10a2 2 0 0 1 2 2c0 1.5-1 2-1 3.5s1 2.5-.5 2.5-2.5-1-2.5-2.5 2-3.5 2-5.5Z',
  moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z',
  scale: 'M12 3v2M8 5h8l2 5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5l2-5ZM7 21h10',
  ruler: 'M3 8h18v8H3z M7 8v3M11 8v3M15 8v3',
  camera: 'M4 8h3l2-2h6l2 2h3v11H4Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  cart: 'M3 4h2l2.4 12.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5Zm0 0V19',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V20a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z',
  download: 'M12 3v13m0 0-4.5-4.5M12 16l4.5-4.5M4 19.5h16',
  upload: 'M12 21V8m0 0 4.5 4.5M12 8 7.5 12.5M4 4.5h16',
  trash: 'M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m-8 0 1 13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-13',
  sun: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z',
  moonTheme: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  flame: 'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  trophy: 'M8 4h8v4a4 4 0 0 1-8 0Zm0 0H4v2a3 3 0 0 0 3 3M16 4h4v2a3 3 0 0 1-3 3M10 15v3H8v2h8v-2h-2v-3',
  target: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 12m-1 0a1 1 0 1 0 2 0 1 1 0 1 0-2 0',
  info: 'M12 16v-4m0-4h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  clock: 'M12 7v5l3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  utensils: 'M6 2v7a2 2 0 0 0 2 2 2 2 0 0 0 2-2V2M8 11v11M17 2v20M17 2a4 4 0 0 0-4 4v3h4',
  sparkle: 'M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6Zm7 10 .8 2.7L22 15.5l-2.2.8L19 19l-.8-2.7-2.2-.8 2.2-.8Z',
  weight: 'M12 3v2M8 5h8l2 5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5l2-5ZM7 21h10',
  note: 'M4 4h16v13l-5 5H4Z M15 22v-5h5',
  camera2: 'M4 8h3l2-2h6l2 2h3v11H4Zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
  arrowDown: 'M12 4v16m0 0-5-5m5 5 5-5',
  layers: 'M12 2 2 7l10 5 10-5-10-5ZM2 17l10 5 10-5M2 12l10 5 10-5',
  refresh: 'M21 12a9 9 0 1 1-3-6.7M21 3v6h-6',
  circle: 'M12 12m-9 0a9 9 0 1 0 18 0 9 9 0 1 0-18 0',
  filter: 'M4 5h16l-6 8v6l-4 2v-8Z',
};

export function icon(name, opts = {}) {
  const size = opts.size || 20;
  const stroke = opts.stroke || "currentColor";
  const fill = opts.fill || "none";
  const sw = opts.sw || 2;
  const d = PATHS[name] || PATHS.circle;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d
    .split(/(?=M)/)
    .map((seg) => `<path d="${seg.trim()}"/>`)
    .join("")}</svg>`;
}
