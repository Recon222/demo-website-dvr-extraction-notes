# Device-pass findings

Owner-observed demo↔phone mismatches from the hands-on device pass, one entry per finding. Demo repo @ `master`; phone repo READ-ONLY @ `00c69e06`.

---

## DP-1 — Wizard footer button says "Continue →" instead of "Next: <next screen>"

**Seen** — The phone's wizard footer button names the next screen ("Next: Requested Scope"); the demo says "Continue →" on every wizard screen, and the button looks a different size.

**Root cause (demo)** — The label is hardcoded at each call site, not derived. Nine screens pass the literal:
`ArrivalDepartureScreen.tsx:46` · `CamerasScreen.tsx:126` · `DvrInfoScreen.tsx:309` · `ExportInfoScreen.tsx:37` · `ExtractedScopeScreen.tsx:66` · `NotesScreen.tsx:459` · `RequestedScopeScreen.tsx:70` · `TimeOffsetScreen.tsx:175` (all `features/demo/ui/screens/`).
`WizardNext` itself (`features/demo/ui/screens/_shared.tsx:665`) is a dumb `{ label, onClick }` pass-through — there is no per-screen label plumbing at all.

The tenth site, `SubmissionScreen.tsx:169`, is a *second* form of the same bug: it hardcodes `"Next: Requested Scope"`, so it reads correctly by luck rather than by derivation. **Correction to this row's first draft:** that label cannot actually go stale — Requested Scope is must-stay (`scope.startDateTime` / `scope.endDateTime` are in `ALWAYS_ON_FIELDS`, `form-customization.ts:257-258`, so `isStepMustStay` at `:273` returns true), so no configuration hides it. The duplication is still worth removing, but it was never a live wrong-label bug, and no test can falsify it by configuration.

Provenance: `git log -S` puts both literals in `bb27a87` ("relocate UI to features/demo/ui") — original prototype residue. v1 inventoried it verbatim (`docs/planning/demo-phone-parity/demo-inventory.md:314`, "full-width primary 'Continue →'") and never flagged the copy delta; v2 was styling-only and was never scoped to catch it.

**Phone dead code?** — **NO, both ways.**
- No dead "Continue" misled the port. The phone's single live label source is `src/features/form-customization/hooks/useWizardNav.ts:45` — `` label: `Next: ${next.label}` `` — fed by the step registry `src/features/form-customization/config/wizard-steps.ts:21-126` and walked through the *visible* step set (`getNextStep`). Every screen consumes it: e.g. `app/(form)/requested-scope.tsx:182-186` renders the Button only when `nav.next` is non-null. Every other "Continue" literal on the phone is a different, live control — `app/(form)/time-offset.tsx:386` and `ImportPickerModal.tsx:317,475` (Alert buttons), `src/components/export/ExportModal.tsx:237` (export validation — the demo ports *this* one correctly), `agency-cloud/.../TokenStep.tsx:104` + `OrgPlanStep.tsx:107`. Nothing to remove.
- The port **missed live phone code**. The demo already holds the phone's label table verbatim — `DRAWER_DEFS` in `features/demo/engine/content/screens.ts:88-99` matches all ten `wizard-steps.ts` labels character-for-character — and already has the visibility-aware walker `nextVisibleChapter` (`engine/logic/form-visibility.ts:112`, called at `ui/DemoExperience.tsx:1286`). Both halves of `useWizardNav` exist; they were simply never wired to the button.

**Geometry** — The button box is **token-for-token identical**; there is no size delta in the recipe. Phone `src/components/common/Button.tsx` size `medium` (the default, and what `requested-scope.tsx:183` uses — no `size` prop) vs demo `buttonStyle()` default (`ui/controls/button-recipe.ts:146`):

| | Phone | Demo |
|---|---|---|
| padding V / H | 16 / 24 (`Button.tsx:102-103`) | 16 / 24 |
| minHeight | 48 (`touchTarget.comfortable`) | 48 |
| radius | 10 (`borderRadius.control`) | 10 |
| borderWidth | 1 (`Button.tsx:91`) | 1 |
| font size / weight | 16 / 600 (`Button.tsx:175,185`) | 16 / 600 |
| width | `fullWidth` | `width: '100%'` |

Demo `tokens/scale.ts` spacing/radius/touchTarget are equal to the phone's `Layout.ts` sets (pinned by `tokens/__tests__/scale.test.ts:24,28,32`). The apparent size difference is the **label**: a short centred "Continue →" in a full-width button reads chunkier than a long "Next: Extracted Video Scope", and the demo's 378px screen is narrower than the device's logical width, so everything inside it scales up in a side-by-side.

**One geometry delta found — CLOSED, DO NOT PORT.** The demo never ported the phone's `FormActions` wrapper (`src/components/form/FormActions.tsx:43`, `marginTop: 16`): phone gap above the button after a section = 24 (`FormSection.tsx:152`) **+ 16 = 40** (RN never collapses margins), demo = 24. **The owner is fixing this phone-side; the demo's 24 stays.** Recorded here only so a later pass does not "restore parity" on it.

**Drop shadow: RULED KEEP** (owner). The demo's primary boxShadow/textShadow (`button-recipe.ts:179-188`) stays as-is; the owner intends to port it *to* the phone. Do not remove, do not "restore parity" on it.

**Fix** — Derive the label the way the phone does. Add a label lookup beside the registry (`screens.ts`, one line off `DRAWER_DEFS`), have `DemoExperience` compute `` `Next: ${label}` `` from the `nextVisibleChapter` it already calls at `:1286`, and thread it to the nine screens as a prop passed straight into `WizardNext`'s existing `label`. `WizardNext` needs no change.

**No-next-visible-step case: structurally unreachable, no fallback needed.** `nextVisibleChapter` (`form-visibility.ts:112-120`) returns `null` only for the LAST entry of `getVisibleChapters`, and that entry is always `completion`: `isStepMustStay` returns `true` unconditionally for the terminal step (`form-customization.ts:264` `TERMINAL_STEP = 'completion'`, `:271-272`), so `resolveStepVisible` (`:54-55`) short-circuits before any profile default or user override is consulted — the Settings "Form Fields" pane renders Completion locked and there is no configuration, profile or override, that removes it. The last screen that renders a button is Notes (`NotesScreen.tsx:459`); its next is `completion` under every configuration (hide Cameras, Export Info, Notes' predecessors, all ten profiles — the tail is invariant), and `CompletionScreen` renders no `WizardNext` at all. Today that Notes button reads "Continue →"; after the fix it reads "Next: Completion" in every configuration.

Scope: D20-safe (presentational prop only; no store reach below the bridge, no engine impurity). Exactly **one** test pin reddens — `ui/__tests__/DemoExperience.form-customization.test.tsx:136` (`getByRole('button', { name: 'Continue →' })`); `screens/__tests__/shared.test.tsx:58` supplies its own label and is unaffected.

**Status (DP-1)** — **FIXED @ `52ee594`.** `nextCtaLabel` (`engine/logic/form-visibility.ts`) joins the two halves the demo already had; `DemoExperience` computes it from the same visible walk `onNext` takes and threads `nextLabel` to the nine screens; `WizardNext` renders the prop and nothing else. No fallback arm — `null` is the phone's own `WizardNav.next` shape and reaches only `completion`, which renders no CTA.

Probes (worktree `probe-dp1-ctalabel`, both from exit code 1, restores proved byte-identical, teardown 549 junctions / `.pnpm` 240→240):
- *hardcoded-label regression* — `DvrInfoScreen`'s CTA back to `label="Continue →"` → **KILLED**, 3 red.
- *visibility-blind derivation* — `nextCtaLabel` walking the raw `CHAPTERS` registry instead of the visible set → **KILLED**, 3 red.

Gates cold at that head: `tsc --noEmit` 0 · `tsc -p tsconfig.previews.json` 0 · 4,337 passed + 2 todo (310 files) · drift guard "all 145 anchor rows match" · `next build` OK, `/demo` First Load **107 kB**.

---

## DP-2 — Drawer panel ground is far darker than the phone's

**Seen** — The phone's drawer background sits only a shade below its row buttons (glass rows on a near-ground panel); the demo's drawer panel is close to black, so the rows read as floating on a hole.

**Root cause (demo)** — Two raw hexes in `features/demo/ui/controls/WizardDrawer.tsx` that never went through the token port:

1. **The panel ground**, `:358` — `background: '#0b1626'`, a hard-coded literal. The phone paints `backgroundColor: colors.background` (`src/components/layout/CustomDrawerContent.tsx:153`) = `#002853` (`Colors.ts:135`), which the demo already carries verbatim as `colors.background` (`ui/tokens/palette.ts:76`) and which the drift guard pins. The drawer simply never asks for it.
2. **The "Back to Cases" button**, `:386` — `background: '#101f33', border: 'none'`. The phone paints it with the **same card glass recipe as the rows** — gradient + border + `highlightTop` + card shadow (`CustomDrawerContent.tsx:184-196`) — and its docblock at `:181-183` says why, in as many words: *"It used to paint a single flat `backgroundColor`, which read as a hole next to them."* The demo is still in the exact state the phone diagnosed and fixed.

**Measured** (dark scheme, sRGB relative luminance; rows are the card tier `rgba(14,57,101,0.85) → rgba(23,65,110,0.92)`, identical on both sides):

| | phone | demo |
|---|---|---|
| panel ground | `#002853`, L = 0.0214 | `#0b1626`, L = 0.0078 |
| row over that ground (top stop) | ≈ `rgb(12,54,98)` | ≈ `rgb(14,52,92)` |
| **ground ↔ row contrast** | **1.20 : 1** | **1.44 : 1** |

The demo's ground is **2.7× darker** in relative luminance. The rows barely move (the card gradient is 85–92% opaque, so it hides its own backdrop) — it is the ground alone that is wrong, which is exactly why the owner reads it as "the rows float". 1.20:1 is the phone's "only slightly darker".

**Phone dead code?** — **NO.** Both phone values are live and current: `CustomDrawerContent.tsx:153` renders on every drawer open, and the back-link's glass recipe at `:184-196` is the *newer* code — it post-dates the flat fill the demo still carries. Nothing to delete phone-side; this is a demo-side miss, in the port's own token vocabulary.

**Fix** — `:358` → `colors.background`; `:386` → the same `GLASS.gradientCard` + `GLASS.borderSoft` (+ lit top edge per the lit-edge rule) the rows at `:61-74` already use, deleting `border: 'none'`. Both are one-line token swaps against values the drift guard already pins. Note `#0b1626` also appears at `ExitDialog.tsx:55` and `AddressAutocomplete.tsx:187` — see DP-4.

**Status (DP-2)** — **FIXED @ `d6e0afd`.** Panel ground -> `colors.background`; "Back to Cases" -> the row recipe (`GLASS.gradientCard` + `GLASS.borderSoft`), `border:'none'` gone. `AddressAutocomplete.tsx:187` fixed in the same commit (same hex, so the guard could not land without it). RED was a new `FAMILIES` entry, "the orphan panel navies"; probe: reverting the ground to `#0b1626` -> KILLED. **Follow-up, not done here:** the phone's drawer ROWS carry a lit top edge (`CustomDrawerContent.tsx:184-196` calls it out) and the demo's `itemButton` does not — a whole-drawer gap, deliberately not smuggled into this fix.

---

## DP-3 — Drawer footer save notice has no phone counterpart

**Seen** — The demo's drawer footer shows a save-status line above the app name; the phone's footer shows only `DVR Extraction Notes` / `v1.0.0` (owner's screenshot).

**Root cause (demo)** — `WizardDrawer.tsx:425-429` renders `saveStatus.text` when the bridge supplies one. It is **not a mis-port** — it is a deliberate demo original, already documented as such at `:41-48` and `:109-114` ("No phone counterpart — session persistence is demo-only"), and adjudicated in v1 as ledger **§59a** (`docs/code-reviews/deferred.md:2539`). It exists to satisfy the honesty rule: the demo's only durable surface is a per-tab `sessionStorage` snapshot, and the line says so rather than implying the phone's device persistence.

**Phone dead code?** — **The demo's line does not come from it — but YES, there is dead phone code in this exact territory, and the owner can delete it.** Re-verified at phone HEAD `9a1d386d` (moved during this session):

- `src/hooks/useSaveStatus.ts:31` — `export function useSaveStatus(): SaveStatusState`, **the reader**, has **zero** production callers. Every other reference in `src/`/`app/` imports the *writer* `setSaveStatus`; the only non-test, non-doc mention of the reader is its own definition.
- The phone's own docs already say it: `src/components/README.md:209` — *"`AppStateHandler` calls `setSaveStatus` (save-status pipeline; **no UI consumer currently**)"*.
- So the write pipeline is live but terminal: `setSaveStatus` (`useSaveStatus.ts:79`), the `persistence.slice.ts:38,101` fields, and the `'success' → 'idle'` auto-reset timer (`store/README.md:260`) all maintain a state **nothing renders**. `CustomDrawerContent.tsx` imports `useSectionCompletion` and never `useSaveStatus`.

**Suggested phone-side deletion:** the `useSaveStatus()` reader hook at `useSaveStatus.ts:31` is dead outright. The writer pipeline behind it is a judgement call — it costs a store slice and a timer to feed a value with no consumer; if no save UI is planned, `saveStatus`/`saveError` on `persistence.slice.ts` and every `setSaveStatus(...)` call go with it. `isDirty` is separate and **is** consumed — do not sweep that in.

**Fix (demo)** — Owner's call, and it is a product decision, not a defect:
- **Keep** — it is the honesty surface for the demo's weaker persistence, and the phone has no equivalent claim to contradict. Divergence stays, documented.
- **Drop** — the footer then matches the phone exactly. The honesty argument survives elsewhere: the same fact is available to the Settings/About surface, and nothing else in the demo claims a save.

Recommendation: **keep**, but only if the owner still wants the honesty line in a *transient* overlay — note ledger §59d already flags that it is sampled per drawer-open and never ticks, so a drawer left open reads "just now" indefinitely. If DP-3 is resolved by dropping the line, §59d's deferral resolves with it.

**Status (DP-3)** — **FIXED @ `30d7cd1`.** Save line removed, with `describeSaveStatus`/`formatSaveRecency`/`SaveStatusView` and their tests (no other consumer); `SaveState` stays for `store/persistence.ts`. Footer is now the phone's two centred lines: `DVREN` over `Interactive demo · v1.0.0`. `APP_NAME` renamed globally per the owner, so the About pane title, the copyright line and the support mailto follow it. Ledger §59d retires with the line. **Phone-side deletion still owed to the owner:** `src/hooks/useSaveStatus.ts:31` (the reader, zero production callers).

---

## DP-4 — Sweep: residual dark grounds across `ui/**`

**Seen** — Several surfaces had wrong (too dark) backgrounds before W4; the owner believes all but the drawer were fixed and wants certainty.

> **CORRECTION.** This row's first version said "clean apart from the drawer". **That was wrong.** It swept only `background: '#hex'` **literals**, so it missed every ground written as `rgba(...)` — which is most of them. An independent second sweep found **17**. Two further claims in that first version were also wrong and are corrected below: the phone *does* have an autocomplete suggestion list (`AutocompleteSuggestionList.tsx:77`), and the camera/recorder screens are *not* deliberately black on the phone. Both errors came from stopping the search at the first plausible file.

**Result — NOT clean. ~17 residual darker-than-phone surfaces**, in two families, both explained by the same guard gap.

### Root cause — the guards have two blind spots, and one was foreseen

`ui/tokens/__tests__/palette.test.ts` sweeps `ui/**` for retired colours by substring match. Its `RETIRED` list (`:81-92`) holds **7 entries, all spelled as hex**.

1. **A retired hex respelled as `rgba()` is invisible to it.** `#0d1b2a` — the retired `background`, `RETIRED[0]` — is `rgb(13,27,42)`, and it is **alive at four sites** in that spelling:
   `inputs/CoordinateDisplay.tsx:78` `rgba(13,27,42,0.55)` · `screens/ImportResultAccordion.tsx:20` `rgba(13,27,42,0.5)` · `screens/NotesScreen.tsx:422` `rgba(13,27,42,0.7)` · `screens/_shared.tsx:561` `rgba(13,27,42,0.4)`.
   The needle `#0d1b2a` cannot match the string `rgba(13,27,42,0.55)`. **The sweep's own docblock foresaw exactly this** (`:68-71`): *"The whitespace strip is for the entries that are coming: a retired `rgba(19,34,54,0.85)` must also catch `rgba(19, 34, 54, 0.85)`."* The machinery was built for rgba entries; none was ever added. (Five further `rgba(13,27,42,…)` hits are prose in comments describing what U1.3 replaced — not live values.)
2. **A demo-ORIGINAL navy has nothing to match against.** `#0b1626`, `#101f33`, `#05080d`, `#0a1320` were never on the phone, so `RETIRED` never listed them and no drift-guard anchor row covers them (that guard compares values existing on *both* sides). Invisible by construction.

### The residuals

`[V]` = I verified both sides at source. `[S]` = from the sweep, phone side not independently re-checked.

| # | demo | paints | phone counterpart paints | |
|---|---|---|---|---|
| 1 | `controls/WizardDrawer.tsx:358` | `#0b1626` | `CustomDrawerContent.tsx:153` `colors.background` `#002853` | **[V] DP-2** |
| 2 | `controls/WizardDrawer.tsx:386` | `#101f33` | `CustomDrawerContent.tsx:184-196` card glass | **[V] DP-2** |
| 3 | `inputs/CoordinateDisplay.tsx:78` | `rgba(13,27,42,0.55)` | `CoordinateDisplay.tsx:92,149` `nestedCard` glass | **[V]** retired hex |
| 4 | `inputs/AddressAutocomplete.tsx:187` | `#0b1626` | `AutocompleteSuggestionList.tsx:77` `colors.background` | **[V]** — corrects this doc's earlier "no counterpart" |
| 5 | `screens/AudioRecorderScreen.tsx:388` | `#05080d` | `RecorderScreen.tsx:279` `colors.background` | **[V]** |
| 6 | `screens/OcrCaptureScreen.tsx:576`, `MediaCaptureScreen.tsx:99` | `#05080d` | `CameraScreen.tsx:283` `colors.background` | **[V]** — the phone's camera **ground** is not black; only its overlays are |
| 7 | `screens/AudioPreviewScreen.tsx:110` | `#05080d` | `Screen.tsx:191` `colors.background` | [S] |
| 8 | `chrome/PdfPreview.tsx:154` | `#3a3f47` | `documentation/constants.ts:18` `PDF_VIEWER_CHROME = '#525659'` | **[V]** — the phone NAMED this constant to stop drift, and says "Do not tokenise" |
| 9 | `chrome/PdfPreview.tsx:139` | `#11151c` | `CaseNotesPreviewModal.tsx:189` `colors.background` | [S] |
| 10 | `screens/ImportResultAccordion.tsx:20` | `rgba(13,27,42,0.5)` | `BatchResultDetails.tsx:125-128` `nestedCard` | [S] retired hex |
| 11 | `screens/NotesScreen.tsx:422` | `rgba(13,27,42,0.7)` | `NotesSectionEditor.tsx:204` `nestedCard` | [S] retired hex |
| 12 | `screens/_shared.tsx:561` (`Accordion`) | `rgba(13,27,42,0.4)` | `FormSection.tsx:142-155` — no fill, sits on `colors.background` | [S] retired hex |
| 13 | `screens/DashboardScreen.tsx:172,209` | `#1a2d44` | `DashboardCaseCard.tsx:146` / `LocationPill.tsx:143` `nestedCard` | [S] |
| 14 | `screens/AudioRecorderScreen.tsx:486` | `rgba(26,45,68,.6)→rgba(19,34,54,.8)` | `RecordButton.tsx:184` card tier | [S] |
| 15 | `screens/import/PasteStage.tsx:43` | `#0a1320` | `ImportPickerModal.tsx:731` `colors.backgroundSecondary` | [S] — adjudicate: the import flow has a deliberate terminal aesthetic, so this may be intended |
| 16 | `screens/map/MapScreen.tsx:473` | `#0a1422` | `MapHost.tsx:489` `colors.background` | [S] — adjudicate against the guard's 4 always-dark map-chrome rows |
| 17 | `screens/map/MapCanvas.tsx:93` | `linear-gradient(160deg,#002853,#0a1422)` | `MapHost.tsx:489` flat `colors.background` | [S] bottom stop only |

**Known-but-open seam, not a new find:** `screens/_shared.tsx:103` `modalScrim` paints `rgba(4,8,14,0.55)` where `palette.scrim` is `rgba(0,40,83,0.32)`. Its own comment marks it `SEAM(U4.4)` — "one of the three scrim darknesses matrix A22 collapses into `palette[scheme].scrim`… this is the survivor". U4.4 collapsed two of three and left this one. Owner's call whether it closes now.

**Genuinely exempt** (checked): `PhoneFrame.tsx:123` bezel · `ExitDialog.tsx` + `ExploreChecklist.tsx` (render *outside* the phone viewport) · `camera-chrome.ts` scrims and the radial vignettes · `MediaLibrarySheet.tsx:488` `#000` fullscreen viewer. **No counterpart:** `map/CallConfirmSheet.tsx`, `map/DemoNotification.tsx` (phone hands off to OS), `ImportModal.tsx:170` JSON dump, the media letterboxes.

**Fix** — in this order; the guard work is the part that matters:
1. **Teach the sweep that a hex and its `rgb()`/`rgba()` spelling are the same colour** — normalise `#rrggbb` to `rgb(r,g,b)` on both sides of the match in `palette.test.ts`. The docblock already asked for this, and it makes every current and future `RETIRED` entry catch both spellings automatically. **This is the RED** for rows 3, 10, 11, 12.
2. **Widen `RETIRED`** to `#0b1626`, `#101f33`, `#05080d`, `#0a1320`, `#1a2d44`, `#11151c`, `#3a3f47` with replacements — i.e. from "hexes the phone retired" to "hexes this design system has replaced", which is what it must be to catch a demo-original value at all. **This is the RED** for the rest.
3. Then the swaps: rows 1–2 per DP-2; rows 3/10/11/12/13 → `nestedCard`; rows 4/5/6/7/9/16 → `colors.background`; row 8 → `#525659`; row 14 → card tier.
4. **Adjudicate rows 15–17 and the `modalScrim` seam with the owner before touching them** — each has a documented reason it might be deliberate.

Sized: ~17 sites, but only two guard edits carry the enforcement. No existing test pins any of these values (swept: zero hits under `features/demo/**/__tests__`), so the guard edits are the RED and the swaps are the GREEN.

**Status (DP-4)** — **PARTIAL @ `dfb9878`.** Guard-first, as ruled — but via `FAMILIES`, not the hex->rgb normaliser + widened `RETIRED` this row proposed: that mechanism already existed (regex over hex AND rgb/rgba, comment-stripped, ruled exemptions, two anti-vacuity controls), built after ledger §120 for exactly this. Four families added; rows 3, 8-14 swapped (rows 3/10/11 adopt `glassCardNested` exactly as U1.3 did at its three sibling sites). Three probes KILLED — including planting a SPACED `rgba(13, 27, 42, 0.55)` in a live file, which the old `RETIRED` sweep stayed green on in the same run.

**OWNER RULINGS (2026-08-28) — three of the four holds are closed:**
- **Rows 16 + 17 (map ground `#0a1422`, canvas gradient) — CLOSED, KEEP AS-IS.** Owner sees no difference on device: the ground is tile-covered. No change, no guard family.
- **Row 15 (`import/PasteStage.tsx:43`) — CLOSED, KEEP.** The import flow's terminal aesthetic is deliberate.
- **`modalScrim` SEAM(U4.4) — HOLD STANDS**, owner deciding separately.
- **Rows 5-7 (`#05080d` camera/recorder vignettes) — HOLD STANDS.**
- **Row 12 (`_shared.tsx:561`, the `Accordion`) — SUPERSEDED BY DP-5.** The owner independently reported these very boxes from a device screenshot, which is the ruling this hold was waiting for. Its exemption in the retired-navy family is now temporary, and DP-5 removes it.

Nothing above is exempted in the guard that did not need to be: no family covers rows 15-17's colours, so the guard is silent on them by construction rather than by exemption.
- **Rows 5-7 (`#05080d` camera/recorder grounds)** — NEWLY discovered during implementation, and the reason they were not swept: `OcrCaptureScreen.tsx:577` paints `#05080d` as the **outer stop of a deliberate vignette** (`radial-gradient(ellipse at center, colors.background, #05080d)`) in the same file as the shell at `:576`, and `MediaCaptureScreen` has the same shape. A per-file guard cannot separate the shell from the vignette, and repainting four full-screen surfaces from near-black to navy is a bigger visual change than the drawer's — the owner has not seen it in a screenshot. Recommend ruling on these together with 15-17.

---

## DP-5 — OIC / Video-Coordinator groups render as dark cards, not flat sections

**Seen** — In New Case / Edit Case the demo puts "Officer in Charge" and "Video/Canvas Coordinator" inside dark boxes; the phone renders them flat on the screen ground — bold title, hairline rule, plain fields (owner's image 1).

**This is DP-4 row 12, and the screenshot is the ruling it was held for.** Same component, same line. The hold is lifted.

**Root cause (demo)** — `Accordion` in `features/demo/ui/screens/_shared.tsx:559-575`, rendered at `NewCaseModal.tsx:249` ("Officer in Charge") and `:254` ("Video / Canvas Coordinator") — its only two callers. It is a `<details>` disclosure painting a card:

```
marginBottom: 14, borderRadius: 10, border: GLASS.border,
background: 'rgba(13,27,42,0.4)', overflow: 'hidden'
```

That ground is the retired `#0d1b2a` navy in the rgb spelling DP-4 exposed. It entered at `802ab13` ("New Case — coordinator + incident location + notes (phase 2)") — an original the prototype invented, never a port.

**The phone's counterpart** is `FormSection title=… collapsible` **without** `glass` (`NewCaseModal.tsx:333-334` and `:367-368`), i.e. the "Standard non-glass section" branch at `FormSection.tsx:142-147` — a bare `<View style={styles.container}>` whose *entire* styling is `marginBottom: Layout.spacing.lg` (24). No background, no border, no radius. Five concrete deltas:

| | phone | demo |
|---|---|---|
| container | no fill, no border, `marginBottom` 24 (`FormSection.tsx:151-153`) | card: `rgba(13,27,42,0.4)` + `GLASS.border` + radius 10, `marginBottom` 14 |
| header rule | `paddingBottom` 8 + `borderBottomWidth: 1` + `marginBottom` 16 (`:175-183`) | none |
| title | `fontSize.lg` (18) / semibold (`:184-187`) | 14 / 600 |
| collapse affordance | `'+'` / `'−'` text, `fontSize['2xl']` (24), bold, `width: 24`, `colors.textSecondary` (`:80-84`, `:190-195`) | a rotating chevron SVG |
| default state | **expanded** — `defaultCollapsed = false` (`:60`), and neither call site overrides it | **collapsed** (`<details>` with no `open`) |

**Phone dead code?** — **NO.** Both `FormSection` branches are live: the glass branch is what the demo's `SectionCard` ports for the wizard screens, and the non-glass branch is what these two sections use. Nothing to delete. The demo's card is not a mis-read of the phone — it is prototype furniture that predates the port and no phase was ever scoped to it.

**Fix** — One component, both call sites untouched. Rework `Accordion` into the phone's non-glass collapsible section: drop `background`/`border`/`borderRadius`/`overflow`, take `marginBottom: spacing.lg`, give the summary the header rule (`paddingBottom: spacing.sm`, `borderBottomWidth/Style/Color`, `marginBottom: spacing.md`) and 18/600, and swap the chevron for the `+`/`−` indicator at 24px bold. **Default it open**, matching `defaultCollapsed = false` — `<details open>`.

Renaming it (`FormSection`? `PlainSection`?) is optional and not proposed: two callers, and the name still describes what it does.

Watch: the ruling also removes `screens/_shared.tsx` from the retired-navy family's `exempt` list in `palette.test.ts` — leaving it there would trip the exemption anti-vacuity test ("every exemption is still a real one"), so that deletion is part of the same commit and is a second RED confirming the colour is gone.

**Status (DP-5)** — INVESTIGATED

---

## DP-7 — New Case has no "Use Current Location" / Geocode block

**Seen** — The phone's New Case modal carries the "Use Current Location (Highest Accuracy)" button with a GEOCODE toggle above Latitude/Longitude (owner's image 3); the demo's New Case modal has neither.

**REFUTATION of the finding's premise.** The brief says the demo has the block "ONLY in the location modal, not New Case". It is not in the location modal either. `GpsCaptureControl` has exactly **one** render site in the whole demo — `features/demo/ui/inputs/LocationFields.tsx:255`, the **recovery-location** form (Add/Edit Location). The Edit *Incident* Location modal renders `IncidentLocationFields` (`EditIncidentLocationModal.tsx:78`), which deliberately does **not** mount it. So the block is missing from *both* incident surfaces, for one reason.

**Root cause — a recorded deferral, not a miss.** `IncidentLocationFields.tsx:31-39` documents the omission in situ, and ledger **§53a** (`docs/code-reviews/deferred.md`) carries it with a trigger. The phone mounts `GpsCaptureControl` at `IncidentLocationForm.tsx:305-308` with `INCIDENT_ACCURACY_OVERRIDE = 'precise'` and `label="Use Current Location (Highest Accuracy)"` — which is exactly the label in the screenshot, and why it differs from the demo's plain `'Use Current Location'` (`GpsCaptureControl.tsx:56`; the label is already a prop).

**D20 / plumbing answer: NO, this is not presentational-only — it is the one blocker.** `DemoCase.incidentCoordinates.source` is typed to `COORD_SOURCES = ['geocoded', 'manual']` (`engine/types/index.ts:364`, consumed at `:373` and `:391`) under an explicit invariant — *"Incident coordinates come from the address pick or hand entry — never a live GPS fix"*. `:372` says it outright: *"widening `COORD_SOURCES` reaches every one of them."* A capture button must stamp a third provenance, so the change runs through `NewCaseInput`, `createCase`, the persistence schema and the provenance chip. Everything *else* is presentational: `GpsCaptureControl` is already parameterised (`label`, `config`, `geocodeEnabled`/`onToggleGeocode`), and New Case already holds `incidentLatitude` / `incidentLongitude` / `incidentCoordinateSource` in its form state (`NewCaseModal.tsx:269-271`, read back at `:284-286`).

**Phone dead code?** — **NO.** `IncidentLocationForm.tsx:305-308` is live and is what the screenshot shows.

**Fix** — Take §53a's own trigger, which spells it: widen `COORD_SOURCES` to include `'gps'` (plus the store, create path, persistence schema and provenance chip that ride on it), then drop `GpsCaptureControl` in above the lat/lng row **in `IncidentLocationFields`** — which fixes New Case and Edit Incident Location together, since both render those fields — passing `label="Use Current Location (Highest Accuracy)"` and moving `geocodeEnabled` from "implicitly on" to the control's toggle. §53a also says to re-read §45a (the `onClick` busy guard) and §45f (the write-guard token) while doing it.

Two notes before this is scheduled. It is an **engine + store change, not a UI one**, so it wants its own package and a widened-union sweep rather than riding a device-pass fix. And the demo's New Case section is currently hand-rolled fields (`NewCaseModal.tsx:259-280`) rather than `IncidentLocationFields`, so "one form, two modes" (matrix row 23) is only half-true today — routing New Case through `IncidentLocationFields` first would make the drop-in land in one place instead of two.

**Status (DP-7)** — INVESTIGATED
