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

**Status (DP-2)** — INVESTIGATED

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

**Status (DP-3)** — INVESTIGATED

---

## DP-4 — Sweep: residual dark grounds across `ui/**`

**Seen** — Several surfaces had wrong (too dark) backgrounds before W4; the owner believes all but the drawer were fixed and wants certainty.

**Result — the owner's belief is correct. The drawer is the only residual, and it is two sites, both already written up as DP-2.** One further in-frame surface shares the same orphan hex.

**Why these three survived every guard — the structural gap.** The campaign has two mechanical sweeps and neither can see these:
- `ui/tokens/__tests__/palette.test.ts:81-92` — the `RETIRED` list, 7 entries, sweeps `ui/**` and `.design-sync/previews/` for hexes **the PHONE retired** in its P0 re-base (`#0d1b2a`, `#1e3a5f`, `#2a4a6f`, `#132236`, `#0f2035`, `#35a0d6`, `#2580ad`).
- `.design-sync/check-rn-parity.mjs` — 145 anchor rows, compares values that **exist on both sides**.

`#0b1626` and `#101f33` are demo-**original** prototype navies. The phone never had them, so they were never retired; nothing on the phone corresponds to them, so no anchor row covers them. A demo-invented ground is invisible to both guards by construction. That is the whole reason the drawer slipped through five waves.

**The raw-hex ground sweep** (every `background`/`backgroundColor` set to a hex literal under `features/demo/ui/**`, tests excluded — 21 sites, all classified):

| demo site | paints | verdict |
|---|---|---|
| `controls/WizardDrawer.tsx:358` | `#0b1626` | **DARKER** — phone `CustomDrawerContent.tsx:153` = `colors.background` `#002853`. **DP-2.** |
| `controls/WizardDrawer.tsx:386` | `#101f33` | **DARKER** — phone `CustomDrawerContent.tsx:184-196` = card glass gradient. **DP-2.** |
| `inputs/AddressAutocomplete.tsx:187` | `#0b1626` | **RESIDUAL** — the typeahead dropdown. Web-only affordance (the phone's address entry is a plain modal on `colors.background`, `EditIncidentLocationModal.tsx:104`, with no suggestion list), so there is no parity mismatch — but it is inside the frame, so D12 applies and it should follow the palette rather than an orphan hex. Same hex as the drawer; fix it in the same pass. |
| `controls/ExitDialog.tsx:55` | `#0b1626` | **EXEMPT** — `position:fixed`, outside the phone frame; Case-File marketing chrome ("Exploration manifest", mono + `#4ecdc4`), not an app surface. |
| `PhoneFrame.tsx:123` | `#04060a` | EXEMPT — frame bezel, demo-only. |
| `screens/MediaCaptureScreen.tsx:99,867,875` · `OcrCaptureScreen.tsx:576,591` · `AudioRecorderScreen.tsx:388` · `AudioPreviewScreen.tsx:110` · `MediaLibrarySheet.tsx:551,562` · `import/PasteStage.tsx:43` | `#05080d` / `#0a1320` | EXEMPT — viewfinder/recorder/terminal chrome, deliberately near-black. |
| `screens/map/MapScreen.tsx:473` | `#0a1422` | EXEMPT — map container ground; map chrome is always-dark by design (the guard carries 4 always-dark map-chrome rows). |
| `chrome/PdfPreview.tsx:139,154` | `#11151c` / `#3a3f47` | NO-COUNTERPART — pdf.js viewer chrome; the phone renders PDFs through a native viewer. |
| `screens/ImportModal.tsx:170` | `#0a1626` | NO-COUNTERPART — the `<pre>` technical-details well inside the import error card. A near-black code block is the idiom, and the phone's import modal has no equivalent raw-JSON disclosure. |
| `screens/DashboardScreen.tsx:172,209` | `#1a2d44` | NOT A GROUND, but a token residual — a personnel chip and the "+N more" pill. **Lighter** than `colors.background`, so not a dark-ground defect; it is a raw hex with no palette sibling. Flagged, not swept: out of DP-4's scope, worth its own row if the owner wants zero orphan hexes. |

**Fix** — Three one-line token swaps, and then make the guard able to see them:
1. `WizardDrawer.tsx:358` → `colors.background`.
2. `WizardDrawer.tsx:386` → `GLASS.gradientCard` + `GLASS.borderSoft` + lit top edge (drop `border: 'none'`).
3. `AddressAutocomplete.tsx:187` → the elevated/card tier rather than the orphan hex.
4. **Add `#0b1626` and `#101f33` to `RETIRED`** (`palette.test.ts:81`) with their replacements. That is the real fix: the existing sweep then enforces all three sites and any future one, mechanically, and no hand-written colour pin is needed. It also widens `RETIRED` from "hexes the phone retired" to "hexes this design system has replaced", which is what it needed to be for a demo-original value to be catchable at all.

No existing test pins either hex (swept: zero hits under `features/demo/**/__tests__`), so the fix reddens nothing and the `RETIRED` addition is itself the RED.

**Status (DP-4)** — INVESTIGATED
