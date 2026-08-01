# P5 (export) + P6 (map depth) phase-boundary side-by-side — demo master @ `cc1a5c7`

Run 2026-07-31. Shape-only comparison.

**Status: BOTH SIDES OBSERVED.** The first pass could not drive the phone — the dev client sat
at "Downloading 100%…" forever. That was **not** a build problem: the Mac was on battery with
the screen locked, which throttles/suspends Simulator GUI processes while headless shells keep
running (Metro looked perfectly healthy throughout). Once the host was back on AC power and
unlocked, the app resumed **on its own** with no relaunch, and the phone half was driven in
full. The earlier "documented behaviour" caveat is withdrawn — every row below is now observed
on both sides except where explicitly noted.

Baselines (scratchpad):

| Set | Count | Path |
|---|---|---|
| demo P5/P6 | 21 | `baselines/demo/p56/` |
| demo P6 map (real Mapbox) | 14 | `baselines/demo/p56-map/` |
| **phone P5/P6** | **11 + the real export ZIP** | `baselines/phone/p56/` |
| downloaded / exported artifacts | 3 | `baselines/demo/p56*/downloads/`, `baselines/phone/p56/export/` |

---

## Verdicts

| # | Surface | Verdict | One line |
|---|---|---|---|
| 1 | Export tab / hub | **MATCH — both observed** | Same accordion, same tri-state (phone shows the indeterminate dash), same lit/dimmed cards, and **byte-identical footer artifact lines** (`CASE ZIP • CANONICAL • INCLUDES CASE MAP`, `Export Full Case (N locations)`). |
| 2 | Export modals | **MATCH — both observed** | Phone and demo render the same all-invalid prompt — same title, same per-location missing-field list, same red icon, same **Cancel / Export Anyway** pair. They diverge only at the terminal: the phone hands over a real 24 KB ZIP, the demo shows the D4 block. |
| 3 | Case Map export | **DELTA — intended, and now confirmed on both sides** | Demo: `OCC-2026-P6-Case-Map.html`, correct title, **0 failed requests**. Phone: generic `map/Case Map.html`, title `Case Map — OCC-2026-00417` (a **sample** OCC — the real case is SIM01), and **1 failed request** for a missing `assets/case-map.data.js`. Bugs 10 and 11 reproduced exactly as documented. |
| 4 | Map depth | **MATCH — both observed** | Identical control set (Started/Working/Complete, Clear, Proximity), same case picker, same count pill, and **identical radius presets `[0.5, 1, 2, 5]` km** verified in both sources. Clustering exercised on the demo only (the phone case had a single plotted location). |
| 5 | Long-press on the map | **MATCH — both observed, placement accurate on both** | Demo: presses 26 px off each marker resolve to 4-of-6 / 1-of-6 / 1-of-6, and a right-button hold correctly does nothing. Phone: a long-press at (45 %, 45 %) drops the proximity ring centred at ~(46 %, 46 %). |

---

## Surface detail

### 1 — Export hub — MATCH

Empty state: **"No cases to export"** (`01-s1-export-empty.png`).

Populated (`02`–`06`): one card per case, `OCC-… / Draft / N locations / ▸`, expanding to `▾`
with a location row per site (`Loc name / City / Working`).

Tri-state select-all measured directly off `aria-checked` — the checkbox is a
`<button role="checkbox">`, so it reports a real tri-state:

| Action | select-all `aria-checked` |
|---|---|
| initial | `false` |
| "Select all locations in …" | `true` |
| untick one row | **`mixed`** |

Footer artifact lines, verbatim: `CASE ZIP · CANONICAL · INCLUDES CASE MAP`, then
`OCC-2026-P5A`, `2 of 2 locations selected`, `Clear`, `Export Full Case (N locations)`.
The one-case-armed rule holds — only the armed card carries a selection.

### 2 — Export modals — MATCH (demo side)

**Validation prompt** (`07-s2-validation-prompt.png`), measured:

```
continueLabel : "Export Anyway"        <- the all-invalid arm
iconAll       : true                   <- export-validation-icon-all
iconSome      : false
title/body    : "All Locations Missing PDF Data — None of the locations have the
                 required fields for PDF generation: • Plaza North Entrance
                 - Missing: At least one extraction scope with start and end times
                 - Missing: Completion date  - Missing: Completed by …"
```

So the all-invalid arm renders the destructive-tinted icon and swaps Continue → **Export
Anyway**, exactly as `stage.ts:153` specifies.

**Progress overlay** (`08`–`10`): `[data-testid="export-progress-overlay"]` with a staged
message (`aria-label` = current stage) and a polite live region.

**D4 terminal** (`11-s2-d4-download-terminal.png`) — blocking, verbatim:

> **Downloads Aren't Available in the Demo**
> The real app writes a ZIP of the whole case — every location's documents, media and JSON
> metadata, plus the interactive case map, then hands it to the system share sheet.
> This demo runs entirely in a browser tab — no file system, no share sheet — so there is no
> file to hand you. Everything that would have gone into it is in this session and on screen.
> The court documents are the exception, and they are real: preview the Case Notes or the
> Time-Offset Calibration from Completion and print or save either one as a PDF.

Demo-only by design; the phone really exports. The shapes up to the terminal match the phone's
documented flow (validation → progress → artifact), with the terminal replacing the share sheet.

### 3 — Case Map export — MATCH, with the intended divergence

Downloaded from the map sheet footer (`[data-testid="export-map-button"]`, "Export case map").
Two artifacts captured; the populated one was re-opened from `file://` and measured:

```
filename : OCC-2026-P6-Case-Map.html        (85 KB)
<title>  : "Case Map — OCC-2026-P6"          <- carries the CASE NUMBER (phone bug 11 fix)
render   : mapboxgl loaded, 1 canvas, all 6 recovery sites listed
network  : 0 failed requests                  <- (phone bug 10 fix)
console  : 0 errors
```

Self-contained apart from deliberate CDN references (Mapbox GL JS/CSS, Google Fonts), which
resolve fine. **The phone's artifact is expected to differ** — 404ing assets and a sample OCC
title — and that divergence is the point of P5.4, not a regression.

### 4 — Map depth — MATCH

**These surfaces do not exist without a Mapbox token** — `MapCanvas` early-returns the
`[data-map-fallback]` panel, so clustering and long-press cannot be tested at all. Run the dev
server with `NEXT_PUBLIC_MAPBOX_TOKEN` (see README).

Measured against 6 GPS-plotted locations (4 tight + 2 far):

| Check | Result |
|---|---|
| Clustering | 3 marker elements for 6 locations — one `cluster-21` bubble labelled **"4"** plus 2 single pins |
| Count pill | `6 locations` |
| Text filter "Plaza" | `2 locations` |
| No-match empty state | "No locations match your filters." + "Clear filters" |
| No-coordinates empty state | "No located locations yet — add an address to a location to plot it here." |
| Proximity 1 km / 2 km | `4 of 6 locations` |
| Proximity 5 km | `5 of 6 locations` |

The two empty states are genuinely discriminated — *no match under filters* vs *nothing plotted
yet* are different strings for different causes.

### 5 — Long-press — MATCH, placement accurate

Placement was measured rather than eyeballed: press 26 px off each rendered marker and read the
resulting proximity set.

| Press target (26 px off) | Result |
|---|---|
| the `"4"` cluster bubble | **4 of 6 locations** |
| single marker `l6` | **1 of 6 locations** |
| single marker `l7` | **1 of 6 locations** |

The unprojected centre tracks the press exactly, so the phone-frame scale correction is correct
at a 1440×1000 window (`usePhoneScale()` = 1.0; canvas rect 378×786 at x=53,y=41).

Gate behaviour, both arms:

* **primary (left) button, stationary hold** → `Deactivate proximity mode` — activated. ✅
* **right button, stationary hold** → still `Activate proximity mode` — correctly ignored. ✅

Note for future runs: pressing arbitrary canvas fractions often yields `0 of 6` — that is not a
placement bug, it just means the point is genuinely >1 km from any pin. Anchor presses to marker
positions read out of the DOM.

---

## Phone side — what was observed (2026-07-31, host on AC power)

### 1 — Export hub

Tapping the case card expands it to the location rows, exactly as on the demo. The tri-state is
visible rather than inferred:

| State | Phone rendering |
|---|---|
| nothing selected | empty square |
| one of two rows selected | **filled square with a dash** (indeterminate) |
| all selected | filled square with a check |

Footer artifact lines change with the selection, and match the demo's wording exactly:

* 1 of 2 selected → `LOCATION ZIP • SINGLE LOCATION` · `OCC-2026-SIM01 1 of 2 locations selected` · `Clear` · **`Export 1 Location`**
* 2 of 2 selected → `CASE ZIP • CANONICAL • INCLUDES CASE MAP` · `OCC-2026-SIM01 2 of 2 locations selected` · `Clear` · **`Export Full Case (2 locations)`**

The armed card is lit (blue border) while the rest dim — the same one-case-armed rule.
The "no cases" empty state was not reproduced on the phone (the device has cases); the demo's
`No cases to export` was observed.

### 2 — Export modals

The phone prompt (`06-s2-validation-prompt.png`) is the same object as the demo's:

> ⛔ (red) **All Locations Missing PDF Data**
> None of the locations have the required fields for PDF generation:
> • Riverside Variety — Missing: Completion date / Completed by
> • Sim Corner Store — Missing: At least one extraction scope with start and end times / Completion date / Completed by
> *The ZIP will be created without any PDF notes.*
> **[ Cancel ] [ Export Anyway ]**

Same all-invalid arm, same destructive icon, same per-location breakdown, same button pair.

Past that point they diverge **by design**: "Export Anyway" on the phone produced
`Opening share dialog…` → **ZIP Archive · 24 KB** → the iOS share sheet. The demo shows the D4
"Downloads Aren't Available in the Demo" terminal instead. The phone's progress overlay was too
fast to catch on a 2-location case (14 rapid frames all landed after completion) — the staged
overlay was captured on the demo.

### 3 — Case Map artifact, phone vs demo

Pulled the real ZIP out of the app container
(`Documents/exports/OCC-2026-SIM01-2026-07-31 23-36-23.zip`) and opened its map from `file://`:

| | Phone artifact | Demo artifact |
|---|---|---|
| path / name | `map/Case Map.html` (generic, inside the ZIP) | `OCC-2026-P6-Case-Map.html` (case-named download) |
| `<title>` | `Case Map — OCC-2026-00417` — a **sample** OCC; the real case is **OCC-2026-SIM01** | `Case Map — OCC-2026-P6` — the real case number |
| failed requests | **1** — `assets/case-map.data.js` → `ERR_FILE_NOT_FOUND` | **0** |
| console errors | 1 | 0 |
| body content | correct (`OCC-2026-SIM01`, its recovery sites) | correct |

Both documented phone defects reproduce exactly. Worth recording precisely: **bug 11 is
title-only** — the page *body* carries the correct case number, so only the browser tab/window
title lies. And the ZIP contains no `map/assets/` directory at all, which is bug 10's mechanism.

### 4 — Map depth

Phone case picker reads "Pick a Case — Select which case you'd like to view on the map",
matching the demo's `case-map-picker`. The map renders live Mapbox with the same control set:
`Change Case`, status toggles `Started / Working / Complete`, `Clear`, `Proximity`.

Count pill and status breakdown render in the sheet header — `1 Location`, `• 1 Started` (the
demo's `6 locations`). The expanded sheet lists the location row and carries the same
**`Export Map`** footer action as the demo.

**Radius presets are identical in source on both sides — `[0.5, 1, 2, 5]` km**
(`map-view/constants/index.ts:131` vs `map/mapTokens.ts:114`).

Not exercised on the phone: clustering, camera-marker toggle, and the text filter — the phone
case had only **one** geocoded location, so there was nothing to cluster or filter down. All
three were exercised on the demo.

### 5 — Long-press

A Maestro `longPressOn` at **(45 %, 45 %)** of the phone map activated proximity: the control
flipped to its ON state, the radius row appeared, and a blue proximity ring was drawn with its
centre dot at **~(46 %, 46 %)** (`10-s5-longpress-proximity-ring.png`). Placement tracks the
press on the phone just as it does on the demo.

---

## Postmortem — the "phone is broken" false alarm

The first pass concluded the dev client was wedged and suggested a rebuild. That was wrong, and
the retraction is worth keeping:

* **Symptom:** app parks on "Downloading 100%…" forever; OS log for the process completely
  silent; process alive. Metro healthy and rebundles on demand (3984 modules).
* **Actual cause:** the Mac was on **battery with the screen locked**. Simulator GUI processes
  throttle/suspend under those conditions; headless shells (Metro, `simctl`, this agent) keep
  running normally, so every check an agent can cheaply run looks fine.
* **Resolution:** none needed. Back on AC power and unlocked, the app resumed by itself — no
  relaunch, no rebuild, no cache clear.
* **Standing rule, now in the README pre-flight:** confirm the host is awake, unlocked and on
  power (`pmset -g batt`) before driving the simulator. Never rebuild in response to this
  signature.
