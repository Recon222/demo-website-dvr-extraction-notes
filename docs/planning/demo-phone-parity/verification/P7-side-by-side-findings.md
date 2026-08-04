# P7 (Settings replica · real User Profile · real Form Customization) side-by-side — master @ `30482d6`

Run 2026-08-01. Shape-only comparison; both sides observed. Host pre-flight (AC power, unlocked)
was green before any sim driving.

Baselines (scratchpad):

| Set | Count | Path |
|---|---|---|
| demo — shell + stub panes | 16 | `baselines/demo/p7/` |
| demo — profile (partial run) | 3 | `baselines/demo/p7b/` |
| demo — profile end-to-end | 5 | `baselines/demo/p7c/` |
| demo — PDF + completion | 5 | `baselines/demo/p7d/` |
| demo — live toggles | 6 | `baselines/demo/p7e/` |
| **phone** | 7 | `baselines/phone/p7/` |

---

## Verdicts

| # | Surface | Verdict | One line |
|---|---|---|---|
| 1 | Settings entry + shell | **MATCH** | Gear on both Dashboard and Cases headers; identical master/detail nav, identical group order (Account · Capture & Time · Data & Security · System) and identical 10-category order; padlock on Security only. |
| 2 | Stub panes | **MATCH (shape) + honest notes** | Appearance / Time Sync / Export Security / About all carry the same layout and a demo-only "IN THE DEMO" note saying exactly what is and isn't real. About is demo-true — `Web (browser)` / `Interactive demo`, never claiming iOS. |
| 3 | User Profile (REAL) | **MATCH** | All **7** fields identical in order, label and placeholder (incl. the `No date` empty literal); career-duration lines compute; save updates the preview row; Completion autofills **Completed By**; the Case Notes PDF carries a **Completion Information** section with that name. |
| 4 | Form Customization (REAL) | **MATCH + demo-only reduction line** | Same three chips with verbatim-shared descriptions, same group rows and "Always on" markers. Toggling fields changes the wizard live; the Canvas profile removes the **Cameras** screen from the drawer. The demo adds a reduction line the phone does not have. |
| 5 | Phone Settings drive | **MATCH** | Phone panes are functional where the demo's are stubs, but structure, copy and control positions line up throughout. One phone-only row (**Developer**) is `devOnly` and correctly absent from the demo. |

---

## Surface detail

### 1 — Entry + shell — MATCH

Both put the gear at the right of the **Dashboard and Cases** headers (demo: `aria-label="Open settings"`,
phone: `MainHeader.onSettingsPress`) and open a master/detail modal with a back-or-close nav bar.

Category order is not merely similar — the ids are shared verbatim
(`engine/content/settings-catalog.ts` mirrors the phone's `settings-catalog.tsx`), which makes the
comparison mechanical. Observed demo order:

```
user-profile · appearance · media-capture · location · time-sync ·
form-customization · security · export-security · cloud-sync · about
```

grouped `ACCOUNT / CAPTURE & TIME / DATA & SECURITY / SYSTEM`. The phone list renders the same
rows in the same groups in the same order.

Preview values differ exactly where the platforms differ, which is the honest outcome:

| Row | Phone | Demo |
|---|---|---|
| Appearance | `Light` | `Dark` (the demo frame has no light theme) |
| Export Security | `Off` | `Not applied` (nothing to encrypt in a browser) |
| Cloud Sync | `Connected` | `Off` |
| About | `v1.0.0` | `v1.0.0` |

Padlock: demo draws it on **`security` only** (`settings-lock-security`), matching the phone's
single `requiresAuth` row. The demo never simulates the Face ID prompt — decision D6.

**Phone-only row: `Developer`** appears under SYSTEM on the sim. Not a parity gap — the phone
declares it `devOnly: true` and `getVisibleCategories()` filters it out of production builds
(`settings-catalog.tsx:261-272`). The demo models the production-visible set, so omitting it is
correct.

### 2 — Stub panes — MATCH in shape, with honest notes

Each demo pane opens with an **"IN THE DEMO"** block stating precisely what is real. Spot-checks:

* **Appearance** — "…renders the app's dark theme and only the dark theme — there is no light
  palette here to switch to, so Dark Mode is fixed on."
* **Time Sync** — "A browser has no raw UDP socket, so the demo cannot speak NTP at all — its
  calibration is simulated… The uncertainty maths and the traceability line on the time-offset
  report are the app's own; only the network exchange is mocked."
* **Export Security** — "Nothing the demo produces is encrypted… On the phone these switches
  drive AES encryption of the exported evidence."
* **About** — demo-true throughout: `Platform: Web (browser)`, `Build: Interactive demo`,
  version 1.0.0, and the app's own description paragraph verbatim.

Phone About, for comparison, shows `Platform: ios` and `Expo SDK: 54.0.0` with the **same**
description paragraph, Contact Support row and copyright block. Same structure; each side states
what is true of itself. The demo substituting `Build: Interactive demo` for the phone's
`Expo SDK` row is the right call — a browser build has no Expo SDK to report.

### 3 — User Profile (REAL) — MATCH

**All seven fields, identical order / label / placeholder on both sides:**

| # | Label | Placeholder |
|---|---|---|
| 1 | Full Name | Your full name |
| 2 | Badge / ID Number | Badge or employee number |
| 3 | **Start Date in Field** | `No date` (date button) |
| 4 | **Start Date at Current Agency** | `No date` (date button) |
| 5 | Current Agency | Police service or employer |
| 6 | Unit / Section Name | e.g., Forensic Video Unit, FVU, Forensic Multimedia |
| 7 | Qualifications & Education | Paste your qualifications, education, certifications... |

Fields 3 and 4 are **buttons, not inputs** — a plain input dump finds only five and looks like a
missing-fields bug. It isn't.

Unconfigured state matches: "No profile configured." + "Set Up Profile" on both.

**Career-duration lines** (demo, measured): with dates 100 and 40 months back —
`Time in field: 8 years, 4 months`, `Time at agency: 3 years, 4 months`. Confirming an *empty*
date defaults to today and yields a zero span with **no** duration line, so a driver that just
taps Done proves nothing here.

**Configured pane** → `Name: … | Badge: … | Agency: … | Unit: … | Edit Profile`, and the
category-list preview row flips from `Not set` to the name (`D/Cst. Priya Raman`).

**Completion autofill** → the Completion screen's `Completed By` input arrives pre-filled with
`D/Cst. Priya Raman`.

**Case Notes PDF** → gated behind "Required Fields Missing — at least one extraction scope with
start and end times", exactly as on the phone. With a scope filled, the generated PDF contains:

> **Completion Information** — Completed By: D/Cst. Priya Raman — Report generated on
> 2026-08-01 03:09:54 — Forensic Video Unit - Case Report System v1.0

So the profile → Completion → PDF chain is real end-to-end.

### 4 — Form Customization (REAL) — MATCH, plus a demo-only line

Both panes open with the same intro ("Pick a profile for sensible defaults, then turn individual
screens or fields on or off. Required screens and fields stay on. Changes apply to the wizard
immediately."), a **Profile** section with three chips, and the per-screen group rows with
`Always on` markers on the required ones.

Chip descriptions are verbatim-shared (`engine/content/profiles.ts` vs the phone's
`config/profiles.ts`):

| Chip | Description (both sides) |
|---|---|
| Forensic | Everything on — full forensic detail (FVA/FVT). |
| Limited | Comprehensive, lightly reduced (SPC/SOCO). |
| Canvas | Streamlined for canvassing — fewer technical fields. |

**`Limited` hides nothing, and that is correct** — `profiles.ts:77` is
`limited: buildDefaults([], [])`, with the source citing the phone's own comment
*"limited: comprehensive — nothing off"*. A reviewer expecting a reduction here would be wrong.

**Toggles change the wizard live** (demo, measured): the Submission group exposes **16**
switches, all on by default. Turning three off and returning to the wizard removed
`Requester Name` and `Requester Badge` from the rendered screen.

**A hidden screen leaves the drawer**: selecting **Canvas** from a clean state reports
`Hides 1 screen · 12 fields by default.`, and the wizard drawer loses **Cameras**:

```
default : … DVR Information · Cameras · Export Information …
canvas  : … DVR Information ·           Export Information …
```

**Demo-only addition:** the reduction line (`Hides 1 screen · 12 fields by default.`) has no
phone counterpart — the phone shows the chip description and nothing further. A demo original,
like the drawer's save-status line; recorded here so it isn't later mistaken for drift.

### 5 — Phone Settings drive — MATCH

Driven on the sim: gear → shell → About → User Profile (pane + editor) → Form Fields (+ Canvas
chip). Every structural element lines up with the demo; the differences are the ones listed
above (live preview values, the devOnly Developer row, the demo's stub notes and reduction line).

---

## Notes for the next driver

* **The settings gear is on the Dashboard/Cases headers only — there is no gear inside the
  wizard.** Any settings round-trip mid-wizard must exit via the drawer's "Back to Cases" first.
* **In a detail pane the nav bar shows "Back to settings" and has NO close button.** A
  close-only helper silently no-ops, the modal stays open, and every later click is intercepted
  by `[data-testid="settings-detail-body"]` — a 30 s timeout with a misleading message. Go back,
  then close.
* Date pickers: confirm with **exact** `Done`. A `/Set/i` matcher also matches the "Set date"
  trigger, leaving the picker open and blocking everything after it.
