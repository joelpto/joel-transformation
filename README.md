# Joel Transformation

An 84-day fat-loss and training tracker, built as an installable web app. It
takes a meal-and-workout plan from a spreadsheet and turns it into something
you use daily: plan-vs-actual meal logging, a set-by-set workout tracker with
a rest timer, weekly aggregation, charts, a calendar, progress photos, and a
consistency score — all stored on your own device.

**[Open the app →](https://joelpto.github.io/joel-transformation/)**

## Install it on your phone

It's a PWA, so it installs straight from the browser and then behaves like any
other app: its own launcher icon, full screen, and it works with no signal.

**Android (Chrome)** — open the link above, then accept Chrome's install
prompt or tap ⋮ → **Install app**. There's also an *Install on your phone*
button at the top of Settings.

**iOS (Safari)** — Safari ignores the web manifest, so it's Share → **Add to
Home Screen**.

It has to be served over **https**. Service workers are refused on plain http
and on `file://`, so opening `index.html` off your desktop runs the app but
gives you no install option and no offline cache. The GitHub Pages URL above
is https, which is the whole reason it's hosted there.

Want a real `.apk`? Point [PWABuilder](https://www.pwabuilder.com) at the live
URL — it wraps this exact app in a Trusted Web Activity.

## The rest timer

Tick a set complete and the rest countdown starts on its own — there's no
separate button to remember mid-workout. Un-ticking the set cancels it.

It counts to a timestamp rather than decrementing a number, so locking your
phone mid-rest doesn't corrupt the clock: the time shown is recomputed the
instant you look again. It also lives outside the page's render loop, so it
keeps running while you browse other screens, and it survives a reload.

Rest length is **learned, not configured**. Everything starts at the default
(90s), and every −30 or +30 you tap is remembered for that exercise, so
compounds and isolation settle on their real values within a session or two.
Settings → Rest timer holds the default, the sound and vibration toggles, and
a button to forget what it has learned.

Two honest limits: vibration works on Android Chrome but iOS has no vibration
API at all, and if your phone is locked the browser may suspend the page, so
the end-of-rest beep can arrive late. Screen on and app in front, it's
dependable. Rest times are a preference, not plan data — the source
spreadsheet doesn't specify them.

## What's in here

Everything sits at the repo root. There are no subfolders, deliberately: the
whole app is inlined into one HTML file, so there's no directory structure to
get wrong when uploading, and GitHub Pages finds `index.html` without any
configuration.

| File | What it is |
|---|---|
| `index.html` | **The entire app** — every stylesheet and script inlined into one file |
| `manifest.webmanifest` | Name, colours and icons that make it installable |
| `sw.js` | Service worker: precaches the app so it opens offline |
| `icon-192.png`, `icon-512.png` | Launcher icons |
| `maskable-192.png`, `maskable-512.png` | Same mark, padded so Android can crop it to any launcher shape |
| `apple-touch-icon.png`, `favicon-64.png` | iOS home screen and browser tab |
| `joel-transformation-source.zip` | The readable multi-file source, plus the build scripts |

`index.html` is a build output. To change the app, work from the source
archive and rebuild — see below.

## Publishing it

Settings → Pages → *Deploy from a branch* → `main` / `/ (root)` → Save. That's
all; there's no build step for GitHub to run. Every path in the manifest and
service worker is relative, so it works from a subpath like
`/joel-transformation/` without changes.

## Working on the source

Unzip `joel-transformation-source.zip` and serve the folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. That's the entire dev setup — no
`node_modules`, no bundler, nothing to install. (You can't just double-click
`index.html` in the source tree: it's written as ES modules, which browsers
block over `file://`. That's exactly why the published build is a single
inlined file.)

After editing anything under `css/` or `js/`, rebuild:

```bash
python3 scripts/bundle.py > dist/bundle.js   # all of js/ into one script
python3 scripts/build_pages.py               # → pages/, the flat build in this repo
```

Then replace the root files here with the contents of `pages/`. The service
worker's cache version is derived from the build's own contents, so installed
copies pick the update up on their next launch.

## Where your data lives

Everything you log — weight, meals, sets, cardio, measurements, journal
entries, photos — is written to **IndexedDB in your browser**, on the device
you logged it on. None of it is in this repo, none of it is uploaded, and
there's no server to send it to.

That also means it doesn't sync: the copy on your phone and the copy on your
laptop are separate. Settings → Your data → **Export JSON** and **Import
backup** move it between them. Export before clearing browser data.

## How the spreadsheet becomes the app

`scripts/extract_plan.py` (in the source archive) reads the workbook and
writes `js/data/planData.js`, the single source of truth for plan data:

| Sheet | Becomes |
|---|---|
| `7-Day Meal Plan` | Each meal's food, quantity, calories, protein, carbs, fat, fiber, notes |
| `Targets & Guidelines` | Daily calorie / protein / fiber / water / vegetable ranges, and the guidance text |
| `Workout & Cardio` | Per-day resistance label, exercise list, planned cardio, duration, rest and optional flags |
| `Weekly Grocery List` | The grocery list, flat and grouped by category |
| `12-Week Tracker` | Nothing — those columns are **computed live** from your logs, since the sheet ships empty |

**Nothing in the plan is invented.** Where the spreadsheet didn't specify a
number — sets, reps, weights — the app leaves the field blank for you to fill
in rather than making one up.

Plan and actual never mix. A completed meal counts the plan's own numbers, a
modified meal counts what you entered (falling back to the plan's figure for
any macro left blank), a skipped meal counts zero, and an unlogged meal is
excluded rather than counted as zero — it shows as pending.

### Daily score

Each day gets a 0–100 consistency score, weighted toward following the plan
rather than passively logging: meals 35%, resistance training 25%, cardio 15%,
water 15%, weight and steps 10%. It drives the calendar colours, the streaks,
and the weekly Strong / Mixed / Needs-attention badges.

## Design

- **Ground** — one vertical gradient, near-black navy through true blue into a
  pale sky, landing on the off-white the content sits on. It runs behind every
  page header, so the identity is the page rather than a stripe of brand colour.
- **Data** — three blues at spaced lightness. Deliberately monochrome; the
  gradient is already doing the talking. Rose is reserved for missed days and
  destructive actions and appears nowhere else.
- **Type** — Instrument Serif for headlines, one italic word carrying the
  emphasis; Instrument Sans for every label, control and figure.
- **Layout** — a dark sticky top bar over the gradient band that holds the page
  header and its tab strip. Five sections, never more. No side rail; on mobile
  the same five sit in a floating bottom bar.

Every colour is a custom property declared in the bare `:root`, then redefined
for `prefers-color-scheme: dark` and again for `:root[data-theme="dark"]`, so
light and dark both hold together and the in-app toggle wins either way.

## Known limitations

- No sync. One device, one dataset — export/import is the bridge.
- Progress photos are data URLs in IndexedDB. Fine for personal use; a real
  backend would be needed for multi-device.
- Sets, reps and weights start empty by design — the source spreadsheet
  doesn't specify them.
- The rest-timer beep can be late if the phone is locked, and vibration is
  Android-only.

## Stack

Vanilla JavaScript, hand-written CSS, Chart.js. No framework, no build
toolchain, no dependencies to keep patched. `scripts/bundle.py` is a small
purpose-built ES-module bundler that handles the app's one circular import, so
a single-file build is possible without npm.
