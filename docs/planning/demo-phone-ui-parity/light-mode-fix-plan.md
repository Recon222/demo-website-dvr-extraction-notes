# Light mode — survey and fix plan

**Written:** 2026-08-28, against `master` @ `c4851b1`, from a live Chromium walk of `/demo`.
**Status of the switch:** SHIPPED. Dark Mode in Settings › Appearance flips the demo for real,
persists for the tab, and defaults to **dark**. Mechanism in `features/demo/ui/tokens/palette.ts`
(`SEAM(LM1)`), commit `8bb837e`.

**Captures:** `worktrees/_captures/light-survey/` — `light/` and `dark/` (57 shots each, the same
walk in both schemes), `light-tail/` and `dark-tail/` (8 more each). Filenames below are relative
to those directories. **The two sets are the same driver at the same commit** — differences are
the scheme and nothing else.

**Census:** `worktrees/_captures/light-survey/census-code.txt`, produced by `census.mjs` beside it.

---

## 1. Verdict

**The token layer is correct. The paint is not.**

Everything the UI-parity port routed through `colors.*` / `GLASS_TIER[scheme]` renders correctly in
light — the entire Settings surface, the wizard's forms and section cards, the map's case picker,
the export tab. Those screens are genuinely good on white; they need no work at all.

What is broken is **177 hard-coded dark-half colour values in 47 files** that never went through
the token layer and therefore cannot follow the switch. Three of them account for 129 hits, and all
three are TEXT tones:

| literal | token it should be | code hits |
|---|---|---|
| `#f0f4f8` | `colors.text` | 58 |
| `#7a9fc4` | `colors.textTertiary` | 51 |
| `#99badd` | `colors.textSecondary` | 20 |
| `#4ba3d4` | `colors.primaryLight` | 19 |
| `#2b8cc1` | `colors.primary` | 9 |
| `#ff4757` · `#10d177` · `#ffd93d` · `#1f6b99` | `colors.error` · `.success` · `.warning` · `.primaryDark` | 20 |

`#f0f4f8` is `dark.text`. Painted on light's `#ffffff` ground it measures **1.11:1** — invisible.
That single literal is why the Cases title, every case number, every location name, every wizard
header and **every item in the navigation drawer** cannot be read in light mode. The other two text
tones are not much better on white: `#99badd` **2.01:1**, `#7a9fc4` **2.77:1** — both far under
AA's 4.5, and both used for real prose rather than decoration.

**This is a port defect, not a design gap.** The phone already has the light answer for nearly all
of it: `MainHeader.tsx:67` paints its screen title `{ color: colors.text }`. The demo spelled the
dark value of that same token as a literal.

### Why no test caught it

The clause-12 flip evidence (`docs/code-reviews/ui-parity/w4/lightflip-objector-manifest.md`)
recorded **2 failing tests** under the light flip and called that clean. It was accurate and it was
blind: the suite pins the token LAYER, and the token layer is fine. A literal is paint, not a
token, so no relationship pin has anything to say about it. **A green flip is not a working flip**,
and the ratchet in LM-0 below is the missing gate.

### What is already right and must be left alone

Three families look dark in light mode **on purpose**, and each has its provenance:

- **The boot gate / scanner HUD.** `scanner-hud-colors.ts` forces the dark half through a separate
  constant and its docblock predicted this exact day: *"`colors.textSecondary` here would put
  light-theme grey on a navy gate the day light opens."* The phone does the same —
  `AuthenticatedSplashScreen.tsx:314` paints `Colors.dark.background` with the comment *"this
  surface is pre-theme."* `light/01-boot-gate.png` is CORRECT.
- **The import terminal panel.** `TERMINAL_SCHEME` pins it dark; phone-inventory §5.7.3 is explicit
  ("dark in both themes by design"). Its surrounding modal chrome follows the scheme, which is also
  what the phone does.
- **The narration rail and the page around the phone** (`light/05-page-full.png`). That is site
  chrome, not app chrome. A light phone on a dark desk is the intended reading.

---

## 2. What's broken, surface by surface

Root-cause classes, referenced in the table:

- **A — scheme-leaking literal.** A dark-half hex spelled inline. Fix: swap for the token.
- **B — half-dark island.** A surface that is deliberately dark, whose *foregrounds* follow the
  scheme and so vanish on it. Fix: force the whole island dark, the way
  `scanner-hud-colors.ts` already does.
- **C — dark-ground effect.** A glow / bloom / inner-shadow recipe that reads as depth on navy and
  as a smudge on white. Fix: a light arm, or suppress under `activeScheme === 'light'`.
- **D — depth collapse.** Values are phone-correct but the perceptual separation is gone on white.
- **E — no phone answer.** Demo-only chrome; the demo has to decide.

| # | surface | what's wrong | screenshot | class | fix sketch | risk to dark |
|---|---|---|---|---|---|---|
| 1 | Wizard drawer | **Every navigation label is invisible.** The drawer is unusable. `WizardDrawer.tsx` ×7 | `light/38-wizard-drawer.png` vs `dark/38` | A | `#f0f4f8`→`colors.text`, `#7a9fc4`→`colors.textTertiary` | none — identical in dark |
| 2 | Cases list | Title "Cases", every case number, every location name pale-on-white; secondary text is fine, so the hierarchy inverts. `CasesScreen.tsx` ×8 | `light/11-cases-with-location.png` vs `dark/11` | A | as above; `#99badd`→`colors.textSecondary` | none |
| 3 | Dashboard | "Dashboard" title, case number, location chip label all illegible. `DashboardScreen.tsx` ×14 | `light/12-dashboard.png` vs `dark/12` | A | as above | none |
| 4 | Wizard headers (all 10 screens) | `WizardHeader` title invisible on every wizard screen; the body below it is fine. `_shared.tsx` ×5 | `light/37-wizard-submission.png` | A | as above | none |
| 5 | Import modal | The three option **titles** ("Pick File", "Paste from Clipboard", "Paste Text") are invisible; only their descriptions read. `ImportModal.tsx` ×8 | `light-tail/06-modal-import.png` | A | as above | none |
| 6 | OCR capture | Dark camera panel with **light-half foregrounds**: "Grant Camera Permission", "Use sample DVR clock", "Ambiguous date", "Time only" are light's deep-navy `link` (`#1e40af`) on near-black — **~2.1:1**. `OcrCaptureScreen.tsx` ×15 | `light/57-ocr-capture.png` | **B** | force the island dark — a `CAMERA_SCHEME` constant mirroring `TERMINAL_SCHEME` | none — the island becomes scheme-independent |
| 7 | Media capture / library / audio | Same shape as 6: dark viewfinder chrome, scheme-following text. `MediaLibrarySheet` ×9, `AudioRecorderScreen` ×13, `MediaCaptureScreen` ×4, `AudioPreviewScreen` ×3, `CameraGpsCapture` ×5 | not captured (driver gap) | **B** | same `CAMERA_SCHEME` island | none |
| 8 | Phone status bar | `9:41`, signal, wifi, battery are white on white — the top of every screen. `PhoneFrame.tsx` ×6 | every `light/*` shot | A + **E** | `colors.text`. iOS has no token to port — the demo decides, and "follow the app" is what a real handset does | none |
| 9 | Scan sweep | The ambient sweep line reads as a grey smear across the middle of every screen. `SCAN_LINE`/`SCAN_GLOW` DO follow the scheme; the 12px `boxShadow` bloom is what fails on white. `PhoneFrame.tsx:119-120` | `light/04-cases-empty.png` (mid-screen) | **C** | drop the bloom in light, or re-weight it; the line itself is fine | contained — light arm only |
| 10 | Case / section cards | The glass card is nearly the same value as the page behind it; containers read as flat. | `light/11`, `light/12`, `light/37` | **D** | raise the light tier's separation, or add the border weight the dark tier gets from its glow | needs a both-halves ΔE pin so dark cannot drift |
| 11 | `PickerSheet` recessed well | `GLASS_TIER.light.recessed.gradient[1]` measures **ΔE 2.50** against `backgroundSecondary` — below the 3.0 floor. Phone-verbatim (`Colors.ts:339`); the defect is inherited. | — | **D** | phone-side re-tint is the honest fix; see §5 | the pin is already `activeScheme`-gated |
| 12 | Secondary buttons | "Import" beside "Add Location" is white-on-white with a hairline; the button edge is nearly invisible. | `light/11-cases-with-location.png` | **D** | check the secondary recipe's light border against the phone's | both-halves pin |
| 13 | GPS / coordinates | `GpsCaptureControl` ×7, `CoordinateDisplay` ×5 — mono readouts in `#7a9fc4`. | not captured | A | tokens | none |
| 14 | Dialogs & sheets | `DeleteConfirmationModal` ×7, `CaseActionsSheet` ×6, `ExportModal` ×5, `ExportActionSheet` ×4, `ExitDialog` ×3, `DuplicateLocationModal` ×2, `AlertDialog` ×1 | not captured (driver gap) | A | tokens | none |
| 15 | Remaining long tail | 20 files at 1–2 hits each — inputs, wizard screens, map sheets, `PdfPreview`, `RowActions`, `ExploreChecklist` ×5 | — | A | tokens | none |

**Driver gaps to close before the fix rounds are called done:** the date/time pickers, the media
surfaces, the delete dialog and the import terminal never fired in either scheme (they fail
identically in dark, so nothing is hidden — they are harness gaps, not findings). The
`20-scheme-survey.js` `ONLY=` switch re-cuts them cheaply.

---

## 3. Work packages

Ordered. LM-0 first because it is what stops the other four from regressing each other.

### LM-0 · The ratchet (do this first)

A test that fails when a **new** scheme-leaking literal enters `features/demo/ui/**`, seeded with
the current 47-file baseline as an explicit allowlist that may only shrink.

`census.mjs` is the whole implementation: it derives the forbidden set from `palette.ts` itself
(dark values whose light sibling DIFFERS — a value identical in both halves is not a leak) and
carries its own positive control. `tokens/__tests__/palette.test.ts` already runs this exact shape
for the retired navy ramp; this is the same sweep with a different needle list.

- **Guard against breaking dark:** none needed — it is a source scan, it paints nothing.
- **Why an allowlist and not a clean sweep:** four packages will be burning the list down in
  parallel; without the ratchet the count goes back up between rounds.

### LM-1 · Text legibility (the blocker) — 4 parallel packages

129 of the 177 hits are the three text tones. This package is what makes light mode *usable*, and
it is close to mechanical.

- **LM-1a — shell & chrome:** `WizardDrawer`, `CasesScreen`, `DashboardScreen`, `PhoneFrame`,
  `_shared.tsx`. **The worst offenders; do this one first and the demo becomes navigable.**
- **LM-1b — modals & sheets:** `ImportModal`, `DeleteConfirmationModal`, `CaseActionsSheet`,
  `ExportModal`, `ExportActionSheet`, `ExitDialog`, `DuplicateLocationModal`, `AlertDialog`,
  `NewCaseModal`, `RowActions`, `PdfPreview`, `ImportResult*`, `PickerStage`.
- **LM-1c — inputs:** `GpsCaptureControl`, `CoordinateDisplay`, `CameraGpsCapture`, `TimeWheel`,
  `Dropdown`, `AddressAutocomplete`, `MetadataForm`, `LocationFields`, `IncidentLocationFields`.
- **LM-1d — wizard screens:** `RequestedScope`, `ExtractedScope`, `DvrInfo`, `Cameras`, `Notes`,
  `Completion`, `ArrivalDeparture`, `TimeOffset`, `DateDisambiguationWarning`, `SyncStatusCard`,
  `ExportCaseCard`, `ExploreChecklist`, `CamerasScreen`, map sheets.

**Cannot-break-dark guard — the strong one.** Every swap in LM-1 is **provably a no-op in dark**:
`colors.text` *is* `#f0f4f8` when the scheme is dark, so the dark rendering is byte-identical by
construction. The mechanical proof is a re-run of the dark capture set against `dark/*` — same
driver, same commit, pixel-comparable.

**Where judgement is actually required.** Five tokens collapse to `#f0f4f8` in dark and diverge in
light: `text`, `infoOnLight`, `warningOnLight`, `successOnLight`, `errorOnLight`. The literal does
not say which one the author meant, and in light they are `#111827` vs Blue 800 / Amber 900 /
Emerald 800 / Red 800. **Every `#f0f4f8` inside a status badge, chip or banner is one of the four
`*OnLight` tones, not `text`** — that is matrix §C.3 rule 1, and picking `text` there would be a
silent parity loss that dark can never reveal. Each such site cites its phone `file:line` in the
commit body. `#7a9fc4` (`textTertiary` vs `infoDark`) and `#99badd` (`textSecondary` vs `info`)
carry the same trap at lower stakes.

### LM-2 · The half-dark islands

The camera family (OCR, media capture, media library, audio recorder/preview, camera GPS) is
deliberately dark chrome over a video feed — on the phone too — but its text currently follows the
scheme and disappears. Give it one forced-dark constant, exactly as `terminal-palette.ts` and
`scanner-hud-colors.ts` already do, and the island stops being scheme-dependent at all.

- **Guard against breaking dark:** the island resolves to the dark half either way, so dark output
  is unchanged by construction. Pin it the way `NotesScreen`'s fix was pinned — assert the island
  reads `palette[CAMERA_SCHEME]` and **not** `palette[scheme]`, which is the exact bug W4/F85 found
  in `NotesScreen` (a pin that called itself forced-dark while asserting the app scheme).
- Confirm the boundary against the phone's D17 camera-chrome ruling before drawing the line: the
  terminal's own precedent is that the *outcome badge and CTA sit outside* the forced-dark subtree
  and correctly read app chrome. The camera family will have the same seam.

### LM-3 · Dark-ground effects

The scan sweep's bloom, the frame's inset shadow, `glass-tokens.ts`'s `highlightTop` (whose light
model is already documented as INVERTED), and the grid weight.

- **Guard against breaking dark:** every change here is a **light arm only** —
  `activeScheme === 'light' ? … : <the existing value>`. The four existing production gates
  (`button-recipe.ts:181,186`, `sheet-chrome.ts:227,242`) are the precedent and the shape to copy.
  Pin both arms in one `it.each(SCHEMES)` row so neither can move alone.

### LM-4 · Depth on white

Cards reading flat against the page, the secondary button's invisible edge, and the inherited
ΔE 2.50 recessed well.

This is the one package that is **design work, not a port** — and it is where the owner device pass
matters, because a computed ratio is structurally blind to the "cards on cards read flat" class
(the same defect the phone's own PR #125 device pass found). Do it last, on a demo that is already
legible, or the judgement is made against noise.

- **Guard against breaking dark:** both-halves ΔE pins (`it.each(SCHEMES)`) with per-stop
  assertions, not aggregates — the D1 defect was found *because* row 33 asserts per stop and would
  have been averaged away otherwise.
- **Where the phone has no answer:** the recessed-well stop is phone-verbatim and phone-wrong. A
  web-side re-tint invents a divergence from the source of truth. The honest fix is phone-side;
  until then the row stays `activeScheme`-gated and named.

---

## 4. Suggested order

1. **LM-0** ratchet — alone, one commit.
2. **LM-1a** — after it lands, light mode is navigable; worth an owner look before the rest.
3. **LM-1b / LM-1c / LM-1d / LM-2** — fully parallel, no file contention between them.
4. **LM-3** — after LM-1, so the effects are judged against legible screens.
5. **LM-4** — last, with an owner device pass.
6. Re-cut both capture sets with `20-scheme-survey.js` and diff `dark/` against the pre-work
   `dark/` set: **it must be pixel-identical.** That is the campaign-level proof that opening light
   cost dark nothing.

---

## 5. Ledger note (proposal, not a write)

`docs/code-reviews/deferred.md` §-for-D1 (the `light.recessed` stop-2 ΔE 2.50 row from W4/F85)
carries the trigger *"the day light mode is opened for any demo surface (the `scheme` switch moves,
or a per-surface light branch lands)"*. **That trigger has now fired** — `8bb837e` moved the
switch. The entry needs re-adjudication by `dt-review-aggregator`, which is the ledger's sole
writer; this document does not edit it.
