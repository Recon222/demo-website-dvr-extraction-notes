# P5 (export) + P6 (map depth) phase-boundary side-by-side — demo master @ `cc1a5c7`

Run 2026-07-31. Shape-only comparison.

**Status: demo side complete and verified; phone side BLOCKED** — the iOS dev client wedged at
"Downloading 100%…" and never finished loading the JS bundle (details in *Blocker* below). The
verdicts therefore rest on the demo behaviour measured here plus the phone's documented
behaviour; the four rows that genuinely needed a live phone comparison are marked as such.

Baselines (scratchpad):

| Set | Count | Path |
|---|---|---|
| demo P5/P6 | 21 | `baselines/demo/p56/` |
| demo P6 map (real Mapbox) | 14 | `baselines/demo/p56-map/` |
| downloaded artifacts | 2 | `baselines/demo/p56*/downloads/` |

---

## Verdicts

| # | Surface | Verdict | One line |
|---|---|---|---|
| 1 | Export tab / hub | **MATCH (demo verified)** | Accordion, tri-state (`false→true→mixed`), lit/dimmed cards, footer artifact lines and the "No cases to export" empty state all present and behaving. |
| 2 | Export modals | **MATCH (demo verified)** | All-invalid arm reads **"Export Anyway"** with the all-invalid icon; progress overlay runs staged; D4 terminal blocks as designed. Phone-side shape comparison not re-run this pass. |
| 3 | Case Map export | **MATCH + intended divergence** | Demo downloads `OCC-<case>-Case-Map.html`, titled `Case Map — OCC-…`, opening with **0 failed requests, 0 console errors**. That is the deliberate fix of phone bugs 10/11 — the phone artifact still 404s assets and carries the sample OCC title. |
| 4 | Map depth | **MATCH (demo verified)** | Clustering, count pill, status/text filters, discriminated empty states, proximity ring + radius presets all verified against a real Mapbox render. |
| 5 | Long-press on the map | **MATCH (demo verified, placement accurate)** | Primary-button hold activates proximity at the pressed point; a right-button hold correctly does not. Placement measured accurate to the marker. |

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

## Blocker — phone side not driven this pass

The iOS dev client would not finish loading. Sequence, all programmatic, no computer use:

1. App relaunched → splash parked on **"Downloading 100%…"** indefinitely (>3 min).
2. Metro was alive (`packager-status:running`) but had served a **1-module** bundle.
3. Metro restarted with `--clear`; it then bundled correctly — `Bundled 24572ms … (3984 modules)`.
4. App terminated + relaunched twice against the warm bundle → still parked at "Downloading 100%…".
5. Deep-link reconnect
   (`exp+extractioncasenotesreactnativeexpo://expo-development-client/?url=http://localhost:8081`)
   → the "Open in …" confirm was dismissed programmatically, app launched, **same wedge**.
6. OS log for the process is completely silent; the process is alive (`proc: 1`).

The preceding P4 session left the app on the **rotated OCR capture screen**, and the wedge began
after that plus a Metro restart. Worth trying first next time: reinstall the dev build, or
`expo run:ios` to rebuild, rather than re-running the same relaunch loop — the loop was tried
five times and never recovered.

Not captured as a result: phone Export tab, phone export modals, phone case-map artifact (to
document the 404/sample-title divergence first-hand), phone map depth, phone long-press.
