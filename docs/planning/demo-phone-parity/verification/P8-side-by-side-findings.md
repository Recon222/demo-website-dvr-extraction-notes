# P8 (the boot experience) side-by-side — master @ `128770d`

Run 2026-08-01. The campaign's final phase. Shape-only comparison; both sides observed.
Host pre-flight (AC power, unlocked) green before any sim driving.

Baselines: `baselines/demo/p8/` (10) · `baselines/phone/p8/` (3).

**Harness note:** `lib.js` defaulted to `reducedMotion: 'reduce'`, which makes the boot gate
**instant-complete** — every earlier phase ran through it without ever seeing it. `open()` now
takes `motion` (and `gotoDemo`), and the default path drives the gate before waiting for the app
shell. Anyone measuring boot beats MUST pass `motion: 'no-preference'` or they will measure
nothing.

---

## Verdicts

| # | Surface | Verdict | One line |
|---|---|---|---|
| 1 | Cold boot | **MATCH (posture) + D7 divergence, disclosed** | Demo runs `BIOMETRIC LOCK → TAP TO SCAN → SCANNING → AUTHORIZED/ACCESS GRANTED → app` on the same dark-navy backdrop the phone uses; the disclosure line is present and **measures 5.26:1 contrast (WCAG AA pass)**. The phone's real Face ID sheet is the by-design divergence. |
| 2 | Returning visitor | **MATCH — gate, not view** | Demo: a tab refresh re-runs the gate **and** the restored position survives it (returned to the same Map screen, byte-identical). Phone: background→foreground does **not** re-splash. Both correct; they are different mechanisms, documented not compared. |
| 3 | SKIP + Escape | **PASS (demo-only, §87c)** | Both lift the gate cleanly and focus lands **inside the phone frame**, never on `<body>`. |
| 4 | Reduced motion | **PASS** | Under `prefers-reduced-motion` the gate is gone within the first 60 ms sample after the tap — **no SCANNING frame, no AUTHORIZED frame, no flicker**. |
| 5 | Video slot NULL | **PASS** | `BOOT_VIDEO = null`; no `demo-boot-video` element, **zero `<video>` elements**, and nothing references a missing asset. The no-video route is what runs. |

---

## Surface detail

### 1 — Cold boot

Demo HUD, read straight out of `[data-testid="demo-boot"]`:

| Beat | HUD contents |
|---|---|
| idle | `BIOMETRIC LOCK` · `TAP TO SCAN` · disclosure · `SKIP` |
| scanning | `BIOMETRIC LOCK` · `SCANNING` · `. . .` · disclosure · `SKIP` |
| authorized | `BIOMETRIC LOCK` · `AUTHORIZED` · `ACCESS GRANTED` · disclosure · `SKIP` |
| after | gate detached, Cases visible |

Timing sampled at 60 ms with motion on: `SCANNING ×6 → AUTHORIZED ×8`, i.e. ~360 ms of scan and
~800 ms of authorized — matching `SCAN_MS = 400` / `AUTHORIZED_MS = 800` in
`engine/logic/boot.ts`.

**Disclosure line — measured, not eyeballed** (the brief asked that it read clearly):

```
text      : "Simulated scan — a browser tab has no biometric sensor. On the phone this is Face ID."
font      : 11px / 400 / letter-spacing 0.3px
colour    : rgba(153, 186, 221, 0.7) composited over rgb(0, 3, 20) → rgb(107, 131, 161)
contrast  : 5.26 : 1     → WCAG AA normal-text (≥4.5) PASS
box       : 250 × 50 px, visible
```

It is present in **every** phase (idle, scanning, authorized), not just at rest — so the claim is
on screen the whole time the scan is being shown.

**Phone cold boot:** launch → a dark navy splash (`#000314`-class backdrop, the same family the
demo's gate paints) → straight to Dashboard. **No biometric prompt appeared**, and that is
correct for this environment rather than a finding: `AuthenticatedSplashScreen.tsx:156` skips the
prompt when `!settings.appLockEnabled || !capability.hasHardware || !capability.isEnrolled`, and
the simulator has no enrolled biometrics. It is corroborated by the Settings list, where the
phone's Security row reads **"Unavailable"**. On a device with Face ID enrolled the phone shows
its real sheet — the D7 divergence the demo discloses instead of faking.

The phone's splash video did not play in the sim (an `AVFoundationErrorDomain -11800` decode
error surfaces in LogBox), so the captured splash is the bare backdrop.

### 2 — Returning visitor — gate, not view

Demo: built a case + location, navigated to the **Map** tab, then reloaded the tab.

```
position BEFORE : ["No case selected", "Pick a case to view its locations on the map.", "Pick a Case", …]
gate re-ran     : true
position AFTER  : identical string-for-string
```

So the gate is genuinely a gate — it re-runs on a fresh page load and the restored position is
still underneath when it lifts. It does not reset the app to a default view.

Phone: backgrounded via another app, then foregrounded — landed straight on Dashboard with **no
splash re-run**. Per D7 the phone's LockScreen surface stays unbuilt, so there is nothing to
compare here; recorded rather than judged.

### 3 — SKIP + Escape (demo-only, deviation §87c)

Both affordances lift the gate, and neither strands the keyboard:

| Route | gate after | focus after |
|---|---|---|
| `SKIP` button (`aria-label="Skip the opening sequence"`) | detached | a `DIV` **inside** `[data-phone="frame"]`, `isBody: false` |
| `Escape` key | detached | a `DIV` **inside** `[data-phone="frame"]`, `isBody: false` |

That matters because `BootSequence.tsx:246` calls out the failure it is avoiding — dropping the
keyboard visitor to `<body>` halfway through the app's first interaction. Observed behaviour
matches the intent.

The phone's splash has neither affordance; these are deliberate demo additions for a surface a
visitor cannot otherwise escape.

### 4 — Reduced motion

With `prefers-reduced-motion: reduce`, sampling every 60 ms **from the moment of the tap**:

```
["GATE-GONE", "GATE-GONE", "GATE-GONE", … ×14]
```

No `SCANNING` frame and no `AUTHORIZED` frame is ever observable — it instant-completes. For
contrast, the same sampling with motion on yields `SCANNING ×6 → AUTHORIZED ×8`.

Note the gate still *waits for the tap* under reduce — correct, since it is a gate and not an
animation. Only the beats collapse. (Sampling before the tap therefore shows a steady
`TAP TO SCAN` and proves nothing; sample after.)

### 5 — Video slot NULL

`engine/logic/boot.ts:126` — `export const BOOT_VIDEO: BootVideo | null = null`, with the phase
machine routing `video → holding → fading` around it when null. Measured in the live DOM at the
idle beat:

```json
{ "bootVideoEl": false, "videoElements": [] }
```

No `[data-testid="demo-boot-video"]`, no `<video>` element of any kind, no console error and no
failed request for a missing asset. The no-video route is what runs, and the slot is ready for
the owner's intro without a dangling reference in the meantime.

---

## Notes for the next driver

* **`motion: 'no-preference'` is mandatory for boot work.** The harness default (`reduce`)
  instant-completes the gate; every pre-P8 script ran straight through it without seeing it.
* **Sample reduced-motion AFTER the tap.** Before the tap the gate legitimately sits at
  `TAP TO SCAN` in both modes, so a pre-tap sample shows nothing either way.
* The phone shows **no biometric prompt in the simulator** — not a defect. Biometrics are
  unenrolled, so the app skips the gate; the Settings Security row reads "Unavailable" for the
  same reason. Real-device verification is the only way to see the Face ID sheet.
