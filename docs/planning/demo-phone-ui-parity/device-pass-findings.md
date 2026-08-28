# Device-pass findings

Owner-observed demo↔phone mismatches from the hands-on device pass, one entry per finding. Demo repo @ `master`; phone repo READ-ONLY @ `00c69e06`.

---

## DP-1 — Wizard footer button says "Continue →" instead of "Next: <next screen>"

**Seen** — The phone's wizard footer button names the next screen ("Next: Requested Scope"); the demo says "Continue →" on every wizard screen, and the button looks a different size.

**Root cause (demo)** — The label is hardcoded at each call site, not derived. Nine screens pass the literal:
`ArrivalDepartureScreen.tsx:46` · `CamerasScreen.tsx:126` · `DvrInfoScreen.tsx:309` · `ExportInfoScreen.tsx:37` · `ExtractedScopeScreen.tsx:66` · `NotesScreen.tsx:459` · `RequestedScopeScreen.tsx:70` · `TimeOffsetScreen.tsx:175` (all `features/demo/ui/screens/`).
`WizardNext` itself (`features/demo/ui/screens/_shared.tsx:665`) is a dumb `{ label, onClick }` pass-through — there is no per-screen label plumbing at all.

The tenth site, `SubmissionScreen.tsx:169`, is a *second* form of the same bug: it hardcodes `"Next: Requested Scope"`, so it reads correctly by luck and goes stale the moment Form Customization hides the Requested Scope step.

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

**Status** — INVESTIGATED
