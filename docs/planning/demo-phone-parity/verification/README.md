# drive-harness — driving the phone app + the web demo, programmatically

Everything here runs **without computer use**. The phone is driven with Maestro taps and read
with a Vision-framework OCR helper; the demo is driven with Playwright. No screenshot ever has
to enter an agent transcript just to find out what is on screen — `look.sh` prints the screen as
text with tap coordinates.

**Scratch base** (referred to below as `$SP`):

```
/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/7423d8f5-e7f4-4135-a726-296308b62d4d/scratchpad
```

The phone repo `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative` is
**read-only**. Running builds/sims out of it is fine; nothing here writes to it or commits.

---

## 1. The phone app (iOS Simulator)

### Pre-flight — do this before every phone-side run

```bash
pmset -g batt | head -2                    # must read "Now drawing from 'AC Power'"
xcrun simctl list devices | grep Booted    # a booted device
```

The host must be **awake, unlocked, and on power**. Simulator GUI processes throttle or suspend
on a locked/battery machine while headless shells keep running, which produces a very
convincing fake failure — see the "Downloading 100%…" entry under *Traps* below. Confirming
this takes two seconds and saves ~20 minutes of misdiagnosis.

### Device / app / build facts (verified 2026-07-30)

| | |
|---|---|
| Simulator | iPhone 17 Pro, iOS 26.5 — UDID `3906B441-8B65-4907-AA8F-8197D1932C5A` |
| Xcode | 26.6 |
| Bundle id | `com.kris.dvrextractionnotes` |
| App bundle | already installed — **no rebuild was needed for any of this work** |
| Metro | already running on `:8081` (`curl -s localhost:8081/status` → `packager-status:running`) |
| Arch | x86_64 under Rosetta (ML Kit has no arm64 sim slice — see CLAUDE.md) |

Check before you ever consider rebuilding — a rebuild is ~20 min and was **not** required:

```bash
xcrun simctl list devices booted
xcrun simctl listapps booted | grep -A3 dvrextractionnotes
curl -s -m 5 http://localhost:8081/status
```

### Start / stop

```bash
# launch (Metro must already be up; the dev client attaches to :8081)
xcrun simctl launch    booted com.kris.dvrextractionnotes
xcrun simctl terminate booted com.kris.dvrextractionnotes

# pre-grant permissions so no dialog can ever block a flow
for s in camera photos location microphone; do
  xcrun simctl privacy booted grant $s com.kris.dvrextractionnotes
done
xcrun simctl location booted set 43.6532,-79.3832
```

### Prerequisites installed by this session

* **Maestro 2.7.0** → `~/.maestro/bin/maestro` (`curl -Ls https://get.maestro.mobile.dev | bash`).
* **Java** — Maestro needs a JRE and there is **no system Java**; `/usr/libexec/java_home` fails.
  Homebrew `openjdk` **is** installed but unlinked. Every script here therefore exports:

  ```bash
  export JAVA_HOME=/opt/homebrew/opt/openjdk
  export PATH="$JAVA_HOME/bin:$HOME/.maestro/bin:$PATH"
  ```

  Without that, Maestro dies with `Unable to locate a Java Runtime`. This is the single
  most likely thing to break for the next agent.
* **`ocr`** — a Swift/Vision binary compiled here from `ocr.swift` (`swiftc -O -o ocr ocr.swift`).
  Recompile if it goes missing; it needs nothing but Xcode.

### The driving loop

```bash
./look.sh [out.png]          # screenshot the sim + print every on-screen string as
                             #   "<y%>  <x%>  text"   -> read state, get tap targets
./tap.sh   50% 79%           # tap a point (repeatable: x y x y x y ...)
./ftap.sh  30% 36%           # FAST tap — use this on rows that have a long-press handler
./lpress.sh 45% 45%          # long-press a point (Maestro longPressOn) — map proximity, etc.
./swipe.sh 50% 75% 50% 30%   # swipe (scrolling — mouse wheel does NOT work in the sim)
./mrun.sh flow.yaml          # run any Maestro flow file
```

**`tap.sh` vs `ftap.sh` — this will bite you.** Maestro's `tapOn: point:` intermittently holds
long enough to fire `onLongPress`. On the Cases screen that means tapping a location row opens
the **Duplicate Location** action sheet instead of entering the wizard — roughly half the time.
`ftap.sh` issues a 1 %-displacement 50 ms swipe instead, which is a clean touch down/up well
under the long-press threshold, and it never mis-fired. Use `ftap.sh` for anything on a row
with a long-press handler; `tap.sh` is fine (and slightly more reliable) for plain buttons —
the audio recorder's record button, for instance, only responded to `tap.sh`.

`look.sh` prints **y first, then x**; `tap.sh` takes **x first, then y**. Swapping them is the
easiest mistake to make.

Typical cycle: `./look.sh` → pick a label's coordinates → `./tap.sh <x%> <y%>` → `./look.sh`.
Each Maestro invocation carries ~8 s of JVM startup, so batch taps into one `tap.sh` call or one
flow file when the sequence is known.

### Text entry — no paste permission needed

Maestro `inputText` typed a 247-character request **cleanly**, with no accent-popover glitch and
no iOS paste dialog. Prefer it over the `simctl pbcopy` + Paste-affordance route, which triggers
a permission dialog:

```yaml
appId: com.kris.dvrextractionnotes
---
- tapOn:
    point: "50%,31%"
- inputText: "Please recover CCTV for occurrence 2026-451122. ..."
```

Run with `./mrun.sh flow-typetext.yaml`. (`flow-typetext.yaml` here is the exact flow used for
the import baselines.)

### Programmatic dialog handling (what actually came up)

| Dialog | How it was cleared — no computer use |
|---|---|
| `Open in "DVR Extraction Notes"?` (leftover deep-link confirm, blocking the Dashboard) | `./look.sh` located `Cancel` at x≈32% y≈54% → `./tap.sh 32% 54%` |
| Camera / photos / location / microphone prompts | never appeared — pre-granted with `simctl privacy grant` before launch |
| iOS paste permission | never appeared — avoided entirely by using Maestro `inputText` instead of the clipboard |

General recipe for any unexpected dialog: `./look.sh` renders its buttons **with coordinates**,
so it is tappable even when Maestro can't see it as a semantic element. Maestro's own
`maestro hierarchy` sees only the status bar for this RN app — accessibility nodes are not
exposed usefully, which is exactly why the OCR helper exists.

**Corollary — never put `assertVisible` / `extendedWaitUntil: visible:` in a flow.** They match
against that same empty hierarchy, so they always fail and the flow aborts before your taps
run (silently: Maestro prints no step lines at all). Sequence work as separate `tap.sh` /
`ftap.sh` / `swipe.sh` calls with `sleep`s between them, and verify with `look.sh`.

### Navigating the wizard drawer

The form drawer is **`drawerPosition: 'right'`** with `swipeEdgeWidth: 50` pt (≈12 % of the
402 pt-wide screen), so it opens with a **right-edge** swipe:

```bash
./swipe.sh 98% 40% 10% 40%     # open the drawer
./swipe.sh 55% 80% 55% 40%     # scroll DOWN inside it (Media sits below Completion)
```

Start at **98 %, not 99 %** — 99 % lands on the iOS system edge gesture and sends the app to
the home screen. Starting left of ~88 % misses the edge entirely and just scrolls the form.
There is no hamburger button: the header's top-left control is **Back** (it exits the wizard).

### Reading the sim: things that look like failures but aren't

* A `look.sh` that returns only the clock, or the iOS home screen, usually means the app is
  **mid-transition or cold-booting**, not that it crashed. Confirm with
  `ps aux | grep -c '[D]VRExtractionNotes'` before concluding anything. A cold launch that has
  to re-pull the Metro bundle takes **~60 s** to first paint.
* Rotated screens (the OCR capture surface) come back from OCR as lines sharing one `y` with
  different `x`, and a garbled status-bar clock. That geometry IS the evidence of rotation —
  you do not need to look at the image.
* **OCR cannot see checkboxes, radio circles, rings or icons** — only text. When a control has
  no label (the export hub's tri-state boxes, map pins), `look.sh` reports nothing and taps
  appear to "do nothing". Downscale the whole screenshot and read it once:

  ```bash
  xcrun simctl io booted screenshot shot.png
  sips -Z 620 shot.png --out shot-small.png     # then Read shot-small.png
  ```

  `sips -c … --cropOffset` is unreliable here — it centre-crops and silently ignores the offset,
  which yields a blank tile. Downscale the full frame instead.

### Simulator capability limits (P4)

The sim has **no camera and no microphone**, which bounds what can be verified there:

| Surface | What the sim shows |
|---|---|
| Media capture | "No camera device available / Go Back" — honest terminal state, no crash |
| Audio recorder | Full CRT chrome, but transport stays `READY`, timer stuck at `00:00`, header clock frozen |
| Media library | Always empty (nothing can be captured), so rows/delete-confirm are unreachable |
| OCR capture | Rotated chrome renders; no live frame |

Anything needing a real capture must move to a physical device.

### Observing

```bash
xcrun simctl spawn booted log stream --process DVRExtractionNotes
xcrun simctl get_app_container booted com.kris.dvrextractionnotes data
```

The SQLite DB is SQLCipher-encrypted — `sqlite3` from the Mac cannot read it. Don't chase the
key; use the Fast-Refresh injection pattern in `.claude/skills/driving-ios-simulator/SKILL.md`.

---

## 2. The web demo (Next.js)

**Use the P1 worktree, not master — master does not contain the P1 import experience.**

```bash
cd $SP/worktrees/parity-p1        # node_modules already installed (pnpm)
pnpm dev --port 3001              # ✓ Ready in ~1s; app at http://localhost:3001/demo

# stop
kill $(lsof -nP -iTCP:3001 -sTCP:LISTEN -t)
```

**Post-P4 (merged to master @ `2868fff`), run from the main repo and `pnpm install` FIRST.**
P4 added `tesseract.js`; with stale `node_modules` the `/demo` route returns **500**
(`Module not found: Can't resolve 'tesseract.js'`) and every driver dies on the hydration wait.

```bash
cd /Users/fvadev/Developer/extraction-notes/demo-website-dvr-extraction-notes
pnpm install && pnpm dev --port 3001
```

### Camera / microphone in Playwright — required for every capture surface

`lib.js` `open()` now launches Chromium with a fake camera and grants camera+microphone, and
adds **two shims you must not remove**:

1. **The audio shim.** In headless Chromium `getUserMedia({video:true})` resolves, but ANY
   request that includes audio — `{video,audio}` or `{audio}` alone — **never settles**. It
   does not reject; it hangs. The capture screen awaits it and parks on
   *"Opening… / Waiting for your browser's camera permission…"* forever with only Cancel.
   `lib.js` wraps `getUserMedia` to serve audio from a silent WebAudio track, so the live path
   proceeds. Measured, not guessed — `probe4.js` times each constraint shape.
2. **A real DVR clock for the fake camera.** Chromium's built-in fake device is a rolling
   colour pattern; the OCR surface reads nothing off it and honestly reports *"Text recognition
   failed."* `mky4m.swift` renders a black panel with a bright monospace timestamp and writes a
   looping `.y4m`, which `lib.js` feeds via `--use-file-for-fake-video-capture`:

   ```bash
   swiftc -O -o mky4m mky4m.swift
   ./mky4m dvrclock.y4m "2026-07-31 14:23:45"
   ```

   With it, tesseract.js genuinely reads the frame (it parsed `0026-07-31 14:23:00` from that
   input — a real low-confidence misread, correctly flagged). This is the ONLY way to exercise
   the live-camera OCR path, and surface 6 below depends on it.

Pass `open({ camera: 'deny' })` to exercise the denied/no-camera branch instead.

### Mapbox token — REQUIRED for any map-depth work (P6)

Without `NEXT_PUBLIC_MAPBOX_TOKEN`, `MapCanvas` early-returns the `[data-map-fallback]`
"Map preview unavailable" panel. **Clustering, the proximity ring and long-press then do not
exist to test at all** — a run against the tokenless fallback proves nothing about them. A
usable `pk.` token lives in the phone repo's `.env` (read-only use — never write to that repo):

```bash
TOK=$(grep -oE "EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk\.[A-Za-z0-9._-]+" \
      /Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative/.env | cut -d= -f2)
NEXT_PUBLIC_MAPBOX_TOKEN="$TOK" pnpm dev --port 3001
```

### Plotting locations on the map

The address autocomplete returns **zero suggestions** without a Mapbox token, so addresses
cannot be geocoded that way. Coordinates come from **"Use Current Location"**
(`GpsCaptureControl`, mounted inside the *New Location* modal). `lib.js` grants `geolocation`
and seeds a fix; move it per location and pass `gps: true`:

```js
await context.setGeolocation({ latitude: l.lat, longitude: l.lng, accuracy: 8 });
await addLocation(page, l.name, { ...l, gps: true });
```

Space four locations ~15 m apart and two several km away to get one cluster bubble plus two
single pins.

### Measuring long-press placement honestly

Pressing arbitrary canvas fractions usually reports `0 of 6 locations` — **not** a placement
bug, just a point genuinely >1 km from any pin. Anchor presses to real marker positions:

```js
const markers = await page.evaluate(() => [...document.querySelectorAll('.mapboxgl-marker')]
  .map(m => { const r = m.getBoundingClientRect();
              return { cx: r.x + r.width/2, cy: r.y + r.height/2, txt: m.textContent.trim() }; }));
// press ~26px OFF a marker — markers themselves are excluded from the gesture by design
```

A correct build yields `4 of 6` next to the "4" cluster bubble and `1 of 6` next to each single
pin. Always run the negative control too: a **right-button** stationary hold must NOT arm
proximity (`aria-label` stays `Activate proximity mode`).

Drivers (Playwright, installed in this directory):

```bash
cd $SP/drive-harness
DEMO_BASE=http://localhost:3001 SHOT_DIR=$SP/baselines/demo/<name> node <script>.js
HEADED=1 ...                      # watch it run
```

| Script | Covers |
|---|---|
| `01-wizard-walk.js` | empty state → New Case → Add Location → all 10 wizard screens → PDF preview → dashboard |
| `02-time-offset.js` | requested scope → Time Offset → Use Current Time → Calculate → adjusted ranges → extracted scope → OCR capture |
| `03-import.js` | **stale** — written against the pre-P1 import UI (`Extract & import`, `Import complete` stages). Superseded by `05-import-p1.js`; keep only as a master-branch reference |
| `04-map.js` | Map tab case picker → tokenless map fallback → bottom sheet |
| `05-import-p1.js` | the P1 import experience: 3-card picker → paste step → live terminal → dwell → result |
| `06-p4-media.js` | P4: drawer Media accordion, capture (gate → live → mode pills → review), audio recorder, media library, OCR viewfinder, time-offset |
| `07-p4-ocr-pdf.js` | P4 surfaces 5 & 6 live-camera: landscape viewfinder with a real stream, then the Time-Offset PDF image-block check LIVE vs SAMPLE |
| `08-p56-export-map.js` | P5: export hub (accordion, tri-state, footer), validation prompt, progress overlay, D4 terminal; plus the map pass |
| `09-p56-map-depth.js` | P6 against a REAL Mapbox render: clustering, filters, empty states, proximity presets, long-press placement + right-button negative control, case-map download |
| `lib.js` / `flows.js` | shared open/shot/step helpers and case/location/wizard sub-flows |
| `probe.js` | scratch introspection — dumps the phone frame's text and every button name |

### Working selectors (demo)

```js
phone(page)                                  // [data-phone="frame"] — modals portal INSIDE it
p.getByRole('button', { name: 'New case' })
p.getByRole('dialog',  { name: 'New Case' })
p.getByLabel('Case Number' | 'Display Name' | 'Unit' | 'OIC Name' | 'Business / Scene Name' | 'City')
p.getByRole('button', { name: 'Import', exact: true })      // on the expanded case card
p.getByText('Pick File' | 'Paste from Clipboard' | 'Paste Text', { exact: true })
p.getByLabel('Pasted request text')                          // the paste textarea
p.getByRole('button', { name: /Import with AI/i })
p.locator('[data-testid="import-terminal"]')                 // the live terminal
p.locator('[data-testid="terminal-status"]')                 // headline, aria-live
p.locator('[data-testid="terminal-log"]')
p.locator('[data-testid="terminal-review-cta"]')             // "Review import →" — the dwell gate
p.locator('[data-testid="case-map-picker"]')
p.locator('[data-testid^="case-row-"]')

// P4 media surfaces
p.getByRole('button', { name: 'Media section' })                    // drawer accordion toggle
p.getByRole('button', { name: 'Open camera to capture media' })
p.getByRole('button', { name: 'Record audio note' })
p.getByRole('button', { name: 'Open media library' })
p.getByRole('button', { name: /^Grant$/i })                         // capture-screen gate
p.getByRole('button', { name: 'Photo mode' | 'Video mode' | 'Take photo' | 'Save image' })
p.getByRole('button', { name: 'Start recording' | 'Stop recording' })
p.locator('[data-testid="media-library-content"] button')           // library rows
p.getByRole('button', { name: 'Grant Camera Permission' })          // OCR screen's OWN gate
p.getByRole('button', { name: 'Use sample DVR clock' })
p.getByRole('button', { name: 'Capture from DVR' })                 // on Time Offset
p.getByRole('button', { name: 'Preview Time-Offset Calibration' })  // on Completion
```

The OCR screen has a **separate** permission gate whose button reads `Grant Camera Permission`,
not `Grant` — a `/^Grant$/` matcher silently skips it and you land on the sample path.

Viewport is pinned to 1440×1000 in `lib.js` — height ≥ 840 forces `usePhoneScale()` to exactly
1.0 so the phone renders 1:1 and no coordinate math is needed. Don't shrink it.

### Traps found in the demo drivers

* **`expandCase` must be idempotent.** The demo **auto-expands** a freshly created case; the
  inherited unconditional click *collapsed* it and every downstream `Add Location` wait timed
  out at 30 s. This is what made all four inherited scripts fail. Fixed in `flows.js` and in
  `01-wizard-walk.js`'s inline copy — check for `Add Location` first, only click if absent.
* **New Case now has a "Confirm Case Number" step** ("…can't be changed after the case is
  created"). It renders a SECOND Cancel/Create Case pair, and — critically — it lives in an
  **alert overlay above a `[data-alert-scrim]`, OUTSIDE the New Case dialog**. A dialog-scoped
  `getByRole('button', {name:'Create Case'}).last()` resolves to the button *behind* the scrim
  and the click is intercepted until timeout. Scope to the phone frame instead. Handled in
  `flows.createCase`.
* **`getByLabel('Location Name')` needs `{ exact: true }`** — it otherwise also matches the
  New Location dialog's `Business/Location Name`, a strict-mode violation.
* **The business field is `Business/Location Name`, not `Business Name`.** The latter label
  does not exist and `fill()` sits there for the full 30 s timeout. Fixed in `flows.addLocation`.
* **Export checkboxes are `<button role="checkbox">`.** An explicit `role` overrides the
  implicit one, so `getByRole('button', …)` never matches them and they are invisible to a
  button dump. Use `getByRole('checkbox', …)`, and read `aria-checked` for the real tri-state
  (`false` / `true` / `mixed`) rather than inferring it from a screenshot.
* The export trigger is labelled **`Export Full Case (N locations)`** — a `/^Export/` matcher
  also hits the tab-bar `Export` button.
* **"Downloading 100%…" forever + silent OS log = THE HOST IS ASLEEP, LOCKED, OR ON BATTERY.**
  Diagnosed 2026-07-31: the Mac was on battery with the screen locked. Simulator GUI processes
  throttle/suspend under those conditions while headless shells keep running normally — so
  Metro looks perfectly healthy (it even rebundles on demand: 3984 modules) and `simctl`
  answers instantly, but the dev client never finishes loading and the app emits no OS log at
  all. Five terminate/launch cycles and a deep-link reconnect all failed against it.
  **Do NOT rebuild or reinstall the dev build for this** — it is not a build problem and a
  rebuild wastes ~20 min. Check the host first:

  ```bash
  pmset -g batt | head -2      # want "Now drawing from 'AC Power'"
  ```

  **Standing pre-flight before ANY sim driving: confirm the host is awake, unlocked, and on
  power.** Add it to the top of every phone-side run.
* **Sample mode substitutes content.** With no `OLLAMA_API_KEY`, `/api/extract` returns
  `503 NOT_CONFIGURED` and `run-import.ts` falls back to the fixed `SAMPLE_EXTRACTION`. The
  result screen therefore shows **Kim's Convenience / 2025-03-08** regardless of what was
  pasted, plus an amber *"Live model not configured — imported the sample request instead."*
  For parity work: compare the **UI shape**, never the field values, against the phone.
* **The keyless 503 returns instantly**, so the live terminal flashes past. `05-import-p1.js`
  holds it open with `page.route('**/api/extract', …)` + a 6 s delay to make mid-run states
  observable. Keep that when re-capturing.
* No `NEXT_PUBLIC_MAPBOX_TOKEN` in this environment → `MapCanvas` renders the
  `[data-map-fallback]` "Map preview unavailable" panel. Expected, not a bug.
* The demo has **Dashboard / Cases / Map** tabs only — no Export tab.

---

## 3. Baseline inventory (57 PNG)

```
$SP/baselines/
├── phone/import/                      10   ← P1 review evidence, the parity reference
│   ├── 01-picker-3-cards.png
│   ├── 02-paste-text-empty.png
│   ├── 03-paste-text-filled.png
│   ├── 04-terminal-midrun-init.png              T+0.00 INIT / T+0.31 PDF extract
│   ├── 05-terminal-midrun-prompt-stream.png     prompt streaming live
│   ├── 06-terminal-dwell-review-cta.png         "Import ready for review" + "Review import →"
│   ├── 07-terminal-dwell-confirm.png            dwell persists (no auto-advance)
│   ├── 08-import-result.png
│   ├── 09-import-result-scrolled.png            extraction scopes + "Imported in 6.8s"
│   └── 10-import-result-warning-expanded.png
└── demo/
    ├── import/                        11   ← the NEW P1 experience
    │   ├── 01-picker-3-cards.png … 03-paste-text-filled.png
    │   ├── 04/05/06-terminal-midrun-*.png
    │   ├── 07-terminal-dwell-review-cta.png     "Import ready for review" + "Review import →"
    │   ├── 08-terminal-dwell-persists.png       still there 2.5 s later — CTA is the only exit
    │   └── 09/10/11-import-result*.png
    ├── wizard/                        23   full walk, 10 wizard screens + PDF preview
    ├── time-offset/                   10   NTP sync → Calculate → adjusted ranges → OCR
    ├── map/                            3   picker → tokenless fallback → expanded sheet
    ├── p4/                            18   drawer Media, capture gate/live/pills/review,
    │                                       audio idle→rec→preview, library tabs/row/delete,
    │                                       OCR viewfinder + result, time-offset
    ├── p4-live/                        7   live-camera OCR landscape + the Time-Offset PDF
    │                                       image-block check, LIVE vs SAMPLE
    ├── p56/                           21   export hub + tri-state + validation prompt +
    │                                       progress overlay + D4 terminal (+ downloads/)
    └── p56-map/                       14   REAL Mapbox: clustering, filters, empty states,
                                            proximity presets, long-press (+ downloads/)
```

Phone P4 set (`baselines/phone/p4/`, 8): drawer Media collapsed/expanded, capture screen
("No camera device available"), audio recorder READY, media library empty state, rotated OCR
capture screen.

Phone P5/P6 set (`baselines/phone/p56/`, 11 + `export/`): export hub, partial-selection footer,
tri-state indeterminate, all-selected footer, validation prompt, the real share-sheet export,
map case picker, live map, long-press proximity ring, expanded sheet — plus the **real exported
ZIP** under `export/`, which is how the Case Map artifact's bugs 10/11 were confirmed.

**P4 phase-boundary verdicts live in `P4-side-by-side-findings.md`** next to this file.

Phone run detail worth keeping: the **on-device Apple Foundation Models provider genuinely ran
in the simulator** — no key, nothing stubbed. It extracted Riverside Variety / 4120 Lakeshore
Blvd West / 2026-03-03 21:15→23:45 / "cameras 1 through 4" from the pasted text, finishing at
T+36.12 with a 6.8 s import and one warning. So the phone side can be re-driven end-to-end at
will; only the demo needs the sample-mode caveat.

## 4. Blockers

* **None that stopped a capture.** No iOS dialog required computer use; no build was needed.
* Maestro's `hierarchy` is useless for this RN app (status-bar nodes only) — hence OCR-driven
  coordinate tapping. If a future agent wants semantic Maestro selectors, RN accessibility
  props would have to be surfaced to XCUITest first.
* `03-import.js` is left stale on purpose (documents the pre-P1 demo surface); delete it once
  P1 merges to master.
