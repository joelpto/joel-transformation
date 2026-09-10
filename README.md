# Joel Transformation

An 84-day fat-loss and training tracker, built as an installable web app. It
takes a meal-and-workout plan from a spreadsheet and turns it into something
you actually use every day: plan-vs-actual meal logging, a set-by-set workout
tracker, weekly aggregation, charts, a calendar, progress photos, and a
consistency score — all stored on your own device.

No build step, no dependencies, no backend. Clone it, serve the folder, done.

**[Live app →](https://joelpto.github.io/joel-transformation/)**

---

## Install it on your phone

It's a PWA, so it installs from the browser and then behaves like any other
app: own launcher icon, full screen, works with no signal.

**Android (Chrome).** Open the live link, then either accept Chrome's install
prompt or tap ⋮ → **Install app**. There's also an *Install on your phone*
button at the top of Settings.

**iOS (Safari).** Safari ignores the web manifest, so it's Share → **Add to
Home Screen**. The `apple-*` tags in `index.html` are what make it open full
screen with the right icon.

It must be served over **https** (or `localhost`). Service workers are refused
on plain http and on `file://`, so opening `index.html` off the filesystem
runs the app but gives you no install option and no offline cache.

Want a real `.apk` for sideloading or the Play Store? Point
[PWABuilder](https://www.pwabuilder.com) at the live URL — it wraps this exact
app in a Trusted Web Activity, so it stays one codebase.

## Run it locally

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. That's the entire dev setup — there's
nothing to install and nothing to compile.

You can't just double-click `index.html`: the app is written as ES modules,
and browsers block those over `file://`. If you want a single file you *can*
double-click, build one:

```bash
python3 scripts/bundle.py > dist/bundle.js
python3 scripts/build_artifact.py --standalone > standalone.html
```

## Deploying

Any static host works, because it *is* static. This repo is arranged so
GitHub Pages needs no configuration: `index.html` sits at the root, so
Settings → Pages → *Deploy from a branch* → `main` / `/ (root)` publishes it
as-is. Paths in the manifest and service worker are all relative, so it works
from a subpath like `/joel-transformation/` without any changes.

After changing anything in `css/` or `js/`, regenerate the service worker so
installed copies pick the update up:

```bash
python3 scripts/build_pwa.py
```

That derives both the precache list and the cache version from the files that
actually exist, so the worker can't drift out of sync with the app.

## Where your data lives

Everything you log — weight, meals, sets, cardio, measurements, journal
entries, photos — is written to **IndexedDB in your browser**, on the device
you logged it on. None of it is in this repo, none of it is uploaded, and
there's no server to send it to. That also means it doesn't sync: the copy on
your phone and the copy on your laptop are separate. Settings → Your data →
**Export JSON** and **Import backup** move it between them.

The repo is public, so treat what's committed as public — including
`source/1700_Calorie_Indian_Cutting_Plan.xlsx`, which is the plan itself.

## How the spreadsheet becomes the app

`scripts/extract_plan.py` reads the workbook and writes `js/data/planData.js`,
a plain object that is the single source of truth for plan data:

| Sheet | Becomes |
|---|---|
| `7-Day Meal Plan` | `PLAN.mealPlan[dayOfWeek]` — each meal's food, quantity, calories, protein, carbs, fat, fiber, notes |
| `Targets & Guidelines` | `PLAN.dailyTargets` (calorie/protein/fiber/water/veg ranges) and `PLAN.guidelines` |
| `Workout & Cardio` | `PLAN.workoutPlan[dayOfWeek]` — resistance label, exercise list, planned cardio, duration, rest/optional flags |
| `Weekly Grocery List` | `PLAN.grocery` and `PLAN.groceryByCategory` |
| `12-Week Tracker` | Nothing — its columns are **computed live** from your logs by `weekSummary()`, since the sheet ships empty |

**Nothing in the plan is invented.** Where the spreadsheet didn't specify a
number — sets, reps, weights per exercise — the app leaves the field blank for
you to fill in rather than making one up.

To change the plan, either edit the Excel and re-run the extractor:

```bash
pip install openpyxl
python3 scripts/extract_plan.py path/to/your-plan.xlsx
```

...or hand-edit `js/data/planData.js`, which is plain JSON-ish JS. Either way
your logged data is untouched — it lives in IndexedDB, entirely separately.

### Plan vs actual

The two datasets never mix. A completed meal counts the plan's own numbers, a
modified meal counts what you entered (falling back to the plan's figure for
any macro you left blank), a skipped meal counts zero, and an unlogged meal is
excluded rather than counted as zero — it shows as pending. See
`actualTotals()` in `js/utils/calculations.js`.

### Daily score

Each day gets a 0–100 consistency score (`dailyScore()`), weighted toward
following the plan rather than passively logging: meals 35%, resistance
training 25%, cardio 15%, water 15%, weight/steps 10%. It drives the calendar
colours, the streaks, and the weekly Strong / Mixed / Needs-attention badges.
Tune the weights there if you want a different balance.

## Design

A chunky, information-dense dashboard: summary numbers first, detail
underneath, state encoded in shape as well as in the figure.

- **Ground** — one vertical gradient, near-black navy through true blue into a
  pale sky, landing on the off-white the content sits on. It runs behind every
  page header, so the identity is the page rather than a stripe of brand colour.
- **Data** — three blues at spaced lightness. Deliberately monochrome; the
  gradient is already doing the talking. Rose is reserved for missed days and
  destructive actions and appears nowhere else.
- **Type** — Instrument Serif for headlines, with one italic word carrying the
  emphasis; Instrument Sans for every label, control and figure.
- **Layout** — a dark sticky top bar over the gradient band that holds the page
  header and its tab strip. Five sections, never more. No side rail; on mobile
  the same five sit in a floating bottom bar.

Every colour is a custom property declared in the bare `:root`, then redefined
for `prefers-color-scheme: dark` and again for `:root[data-theme="dark"]`, so
light and dark both hold together and the in-app toggle wins either way.

Dashboard primitives live in `js/ui.js`: `bubbleChart()` (the day's calories
as a circle pack by macro), `dotGrid()` (the 84-day consistency matrix),
`barRow()`, `cardHead()`, `figure()`, `deltaPill()`.

## Project structure

```
index.html               entry point — loads Chart.js, Google Fonts, the CSS, main.js
manifest.webmanifest     PWA manifest (generated)
sw.js                    service worker, precaches the app shell (generated)
icons/                   launcher icons, including maskable variants (generated)
css/styles.css           the whole design system: tokens, both themes, every component
js/
  main.js                boot: hydrate the store, apply the theme, mount
  app.js                 router, top nav, bottom nav, render loop
  store.js               in-memory state + IndexedDB read/write + pub-sub
  ui.js                  page shell, sheets, toasts, and the dashboard primitives
  data/
    planData.js          generated PLAN object — the source of truth
    defaults.js          empty-state factories for Settings and DailyLog
  utils/
    dates.js             date / week / 84-day-index maths
    calculations.js      plan-vs-actual totals, daily score, weekly aggregation, streaks
    insights.js          rule-based observations, generated only from logged data
    icons.js             inline SVG icon set — no icon-font dependency
  storage/db.js          IndexedDB wrapper with a localStorage fallback
  charts/charts.js       Chart.js wrappers
  pages/                 one module per screen
scripts/
  extract_plan.py        regenerates js/data/planData.js from the Excel
  bundle.py              zero-dependency ES-module bundler → dist/bundle.js
  build_artifact.py      inlines CSS + bundle into one HTML file
  build_pwa.py           regenerates manifest.webmanifest and sw.js
  make_icons.py          regenerates the icon set
  simulate_journey.mjs   84-day simulation test
```

### A note on the stack

This is vanilla JavaScript, hand-written CSS and Chart.js — not React. It was
originally specced for React + Vite + Tailwind, but the sandbox it was built
in had no npm registry access, so a toolchain couldn't be installed. The
upside is a zero-build app with no `node_modules` and nothing to keep patched.
The module boundaries map roughly onto components and hooks if it's ever worth
porting.

`scripts/bundle.py` is a small purpose-built ES-module bundler that handles
the app's one circular import (`navigate`, shared between the router and every
page) — it exists so a single-file build is possible without a toolchain.

## Tests

```bash
node scripts/simulate_journey.mjs
```

Simulates a full 84-day journey with varying adherence and asserts that all 12
weeks are disjoint and contiguous (no cross-week bleed), that the week 4/8/12
boundaries land on the right 7-day windows, that every daily score stays
within 0–100, and that aggregation never throws.

## Accessibility

Semantic buttons and labels throughout, visible `:focus-visible` rings, no
status conveyed by colour alone (every state has a text label too), large
touch targets, `prefers-reduced-motion` respected, and Escape closes any
open sheet.

## Known limitations

- No sync. One device, one dataset — export/import is the bridge.
- Progress photos are data URLs in IndexedDB. Fine for personal use; a real
  backend would be needed for multi-device, which is why the storage layer is
  isolated in `js/storage/db.js`.
- Sets, reps and weights start empty, by design — the source spreadsheet
  doesn't specify them.
