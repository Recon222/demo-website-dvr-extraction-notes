# Lane: web — W2 (phases U2 + U3 + U4), PR #42

Head reviewed: `feat/uiparity-w2` @ `00a96c7` (assembly head `7bcb553` + one docs-only commit).
Base: `master` @ `43ccbad`, confirmed an ancestor of HEAD. Diff `43ccbad...HEAD` excluding `docs/`
= **129 files, +9,149 / −1,359**, entirely under `features/demo/` plus `.design-sync/check-rn-parity.mjs`.
Shared worktree `worktrees/w2-wave`, read-only. `gh pr view 42`: `MERGEABLE` / `mergeStateStatus CLEAN`,
no status checks configured.

Fresh seat. Read first: `reviewer-contract.md`, `web-reviewer.md`, `mutation-testing/SKILL.md`,
predecessor lanes `w0/lane-web.md` + `w1/lane-web.md`, `w2/INTEGRATION-u2-assembly.md` +
`INTEGRATION-w2-assembly.md`, the PR body, and the u2.2 / u2.4 / u3.2 / u3.3 / u4.1 / u4.3 / u4.4
implementation reports for the surfaces below. Phone source read at
`extraction_case_notes_react_native_expo` (read-only): `constants/Layout.ts`, `constants/Typography.ts`,
`components/common/Button.tsx`, `TextInput.tsx`, `GlassBottomSheet.tsx`.

**Probe worktree:** `probe-w2-web-recipes` @ `00a96c7`, cut + installed (7.2 s). Four probe files
added and deleted; one source mutation applied and reverted; `git status --short` empty at teardown.
Removed with `tools/worktree-remove.ps1` — *"unlinked 549 junction(s) in 2 pass(es) · .pnpm 240 → 240
· OK"*, exit 0. Branch deleted. jsdom 29.1.1, react-dom 19.2, **both motion modes exercised and
labelled below**.

---

## Gates I ran myself

| Gate | Result |
|---|---|
| `pnpm build` @ HEAD | exit 0. `/demo` First Load **107 kB** — matches the PR body. Marketing unmoved: `/` 121 kB, `/beta` 111 kB, `/features` 110 kB, `/features/[slug]` 120 kB, shared 106 kB. |
| `pnpm build` @ `43ccbad` (same tree, `.next` wiped between) | exit 0, byte-for-byte the same route table. Demo async chunk **559,651 → 561,014 B (+1,363 B, +0.24 %)**; all `static/chunks` **3,995,177 → 3,996,703 B (+1,526 B)**. |
| `vitest run` a11y + `controls/__tests__` + `palette-contrast` @ HEAD | 15 files / 246 passed / 4 todo, 0 failed. |
| The wall (grep for `features/demo` under `components` `app` `lib`) | Only `components/marketing/phone-frame.tsx` (a comment), the guard test itself, and the pre-existing server-side `app/api/extract/route.ts`. **Preserved.** |

Bundle verdict: **no regression**, measured against master in the same tree. This is the first W2
build figure I have seen independently confirmed — `_captures/w2/` carries an `after/` set but no
`before/`, no `DIFF.md` and no build log at the time I read.

---

## Probes run (all verdicts from the runner's exit code)

```
PROBE 1  lit edge across two paints — sheetSurface / dialogSurface / buttonStyle / fieldInputStyle
Target:  features/demo/ui/controls/sheet-chrome.ts:108, controls/CentredDialog.tsx:76,
         controls/button-recipe.ts:232, tokens/field-input.ts:69   (canonical sources, not mirrors)
Method:  one component, four consumers, a state flip between paint 1 and paint 2; six border
         longhands read back per node. Motion mode: ON (harness default, matchMedia.matches=false).
Result:  lit edge HELD on both paints, zero React "conflicting property" warnings (the W1
         vitest.setup tripwire is armed, so a warning would have RED the file).

  paint1  s: rgba(184,212,240,0.14) | rgba(28,78,132,0.6) x3 | 2px | solid
  paint2  s: rgba(184,212,240,0.14) | rgba(28,78,132,0.6) x3 | 2px | solid   <- sheetSurface
  paint1  d: rgba(184,212,240,0.12) | rgba(43,140,193,0.25) x3 | 1px | solid
  paint2  d: rgba(184,212,240,0.12) | rgba(43,140,193,0.25) x3 | 1px | solid <- dialogSurface
  paint1  b: rgba(255,255,255,0.14) | transparent | rgba(0,0,0,0.3) | transparent
  paint2  b: rgb(46,95,151) x2 | transparent x2                              <- buttonStyle disabled
  paint1  f: rgb(28,78,132) x4 | 1px      paint2  f: rgb(255,71,87) x4 | 2px <- fieldInputStyle error

PROBE 2  reduced-motion gate on every new/changed overlay entrance
Method:  window.matchMedia stubbed to matches=true for prefers-reduced-motion, restored in
         afterAll. Motion mode: REDUCED.
Result:  CentredDialog ""  ·  GlassBottomSheet panel ""  ·  its scrim ""  ·  ModalShell ""
         PdfPreview "screenIn 0.3s ease"   <- the one that does not gate; see MEDIUM 2.
         Motion-ON control arm: "screenIn 0.2s ease" / "sheetUp 260ms ease" / "termFadeIn 260ms ease".

PROBE 3  CentredDialog focus restore
Method:  host with a real opener; pointerdown + click to arm the capture-phase tracker, Escape to
         dismiss. Motion mode: ON.
Result:  after open activeElement = the dialog panel; after Escape activeElement = the opener.
         The capture-phase mechanism works as documented.

PROBE 4  MUTATION — is the unchecked checkbox's border colour pinned by VALUE or by CONTRAST?
Target:  features/demo/ui/controls/choice-controls.tsx:180 (canonical source)
Claimed pin: features/demo/ui/controls/__tests__/choice-controls.test.tsx:145
Mutation:    borderColor: filled ? colors.primary : colors.border
          -> borderColor: filled ? colors.primary : 'rgba(1, 2, 3, 0.9)'
Result:  **KILLED** — 1 failed / 41. AssertionError: expected 'rgba(1, 2, 3, 0.9)' to be
         'rgb(28, 78, 132)'. The HEX is pinned. **Nothing pins the RATIO**, which is the whole of
         HIGH 1 below.
Restore: git checkout -- + git status --short empty, suite green.

PROBE 5  cost of the new per-render recipe functions (the brief asked me to measure, not assume)
Method:  200k iterations after a 20k warm-up, in-suite.
Result:  buttonStyle() 0.156 us/call (6,410/ms) · disabled danger/small 0.128 us · fieldInputStyle()
         0.039 us · severityTone+statusBadgeStyle 0.033 us · a bare 20-key object literal 0.019 us.
         The densest demo screen renders ~10 buttons -> ~1.6 us per render, ~0.01 % of a 16.7 ms
         frame. **Not a finding.** buttonStyle() returning a fresh object is also harmless to
         react-dom, which diffs style objects per property, not by identity; no React.memo child
         in this diff receives one.
```

Zero unexplained survivors. Probe 4's KILL is reported because it is *evidence for* a finding, not
against one.

---

## Findings

```
[HIGH] The unchecked / unselected selection mark lost its only visual carrier — measured
       4.35:1 -> 1.33:1 against the surface it sits on (WCAG 2.1 SC 1.4.11)
File: features/demo/ui/controls/choice-controls.tsx:180-181 (CheckboxBox), :79 + :94 + :111 (RadioOption)
Consumers: features/demo/ui/screens/export/ExportCaseCard.tsx:161 ·
           features/demo/ui/screens/RequestedScopeScreen.tsx:57-58 ·
           features/demo/ui/screens/settings/panes/FormFieldsPane.tsx:158 ·
           features/demo/ui/screens/settings/panes/_pane-chrome.tsx:216
Issue: CheckboxBox paints its UNCHECKED state as an opaque colors.background (#002853) square
  with a 2px colors.border (#1c4e84) ring and NO glyph (GLYPH.false = null). On the Export Hub
  card that square is the entire visual existence of the "Select all locations in <case>" control —
  it has no visible label, and aria-label is not a pixel. Both of its edges now measure ~1.2-1.4:1
  against the glass card behind it, i.e. effectively invisible to a low-vision visitor on /demo
  -> Export tab. Master rendered the same control with a TRANSPARENT fill and a #7a9fc4 ring at
  3.87-4.41:1, so this is a regression from PASS to FAIL, not an inherited gap.
Evidence: MEASURED TWICE, and the two agree.
  (a) Pixels sampled from THIS WAVE OWN capture,
      worktrees/_captures/w2/after/08-export/02-s1-export-hub-collapsed.png, row y=230 (2x scale):
        x=92..95   card       rgb(13,55,99)
        x=96..99   box border rgb(20,66,116)   <- colors.border, composited
        x=100..139 box fill   rgb(6,46,91)     <- colors.background
        x=140..143 box border rgb(20,66,116)
      border vs card 1.18:1 · border vs its own fill 1.33:1 · fill vs card 1.13:1.
      Best available carrier = **1.33:1**, floor 3.0.
      The same card pixel against MASTER #7a9fc4 ring = **4.35:1**.
  (b) Independent arithmetic on the composited tiers (card rgba(14,57,101,0.85) ->
      rgba(23,65,110,0.92) and elevated rgba(23,65,110,0.88) -> rgba(14,57,101,0.95) over
      #002853): head 1.20-1.44 on all four stops, master 3.87-4.41 on all four.
  The rule is already written INSIDE this wave, at controls/button-recipe.ts:190-192:
  "link and not primary: the 1px outline is the ONLY mark of a control here, so 1.4.11 3:1
  bites" — and the phone repeats it verbatim at Button.tsx:145-152. The outline BUTTON got that
  reasoning applied (7.65:1); the checkbox and the radio ring, which are the same shape of argument,
  did not. ui/__tests__/palette-contrast.test.ts grew 237 lines this wave and has rows for the
  four status accents (22-25) and every text-on-fill pairing, but no row for a selection control
  boundary — and PROBE 4 shows the only pin on this value asserts the HEX, so it stayed green
  through a 3.3x contrast drop.
  RadioOption is the same root cause with one mitigation: its unselected edge is colors.border
  at 1.26-1.44 where master used #7a9fc4, but each option carries a visible 16px label at 10.60:1
  and the SELECTED option is unambiguous at 6.83:1, so the option remains findable. Folded here
  rather than filed separately because one edit to choice-controls.tsx settles both.
Fix: give the unchecked/unselected edge a token that clears 3:1 on the demo dark grounds —
  colors.textTertiary (#7a9fc4, the value master shipped, 3.87-4.41) is the smallest change and
  is already the demo ring colour elsewhere; colors.borderLight (#2e5f97) does NOT clear it
  (~1.9). Move the pin at choice-controls.test.tsx:145 with the value, and add a 1.4.11 row to
  palette-contrast.test.ts bounding the unchecked mark against the card and elevated tiers so the
  next re-point cannot repeat this silently. If the owner rules that the phone colors.border is
  binding, that is a deliberate divergence that needs a ledger row with a trigger — not the current
  state, where nothing records it and nothing observes it.
```

```
[MEDIUM] Four new sheet/dialog chrome values ship the phone DARK-ONLY treatment unconditionally,
         against D2 and against the both-halves precedent this same wave follows for buttons
File: features/demo/ui/controls/sheet-chrome.ts:74 (SHEET_SHADOW), :214 (sheetAccentDot.boxShadow),
      :228 (sheetTitle.textShadow) · features/demo/ui/controls/CentredDialog.tsx:60 (DIALOG_SHADOW)
Issue: each of the four is a single hard-coded dark value on a fragment that otherwise resolves
  through GLASS_TIER[scheme] / colors. Flipping tokens/palette.ts one `scheme` site — the
  documented one-line light switch — repaints the gradients and borders and leaves every sheet and
  dialog casting a pure-black rgba(0,0,0,0.5) 40px shadow, a black title text-shadow and a dark
  accent glow onto a pale surface. That is a config flip on a path with no reviewer on the day it
  fires.
Evidence: the phone gates two of them explicitly — GlassBottomSheet.tsx:326-332 and :339-343
  are both inside `isDark && {...}` — and ships light halves for the other two:
  Layout.ts:157-163 shadow.dialog.light = rgba(30,58,138,0.15) offset 0 8 radius 28, and
  Layout.ts:175-181 shadow.sheet.light = the same colour at offset 0 -8.
  The repo already ruled on this shape: W1/F19 gave SHADOW_CARD both halves
  (glass-tokens.ts:125-128, `as const satisfies Record<ColorScheme, string>`) for exactly this
  reason, and controls/button-recipe.ts:170-179 — landed in THIS wave — branches its boxShadow
  and textShadow on `scheme` correctly. The PR body lists D2 ("both halves throughout") as applied.
  Ledger §95 covers the absence of a drift anchor on the hand-ported shadows; it does not cover a
  missing light half, so this is not a re-file.
Fix: make the four Record<ColorScheme, ...> and read [scheme], exactly as SHADOW_CARD and
  buttonStyle do — dark values unchanged, so nothing the demo renders today moves. The two
  `isDark &&` ones become `scheme === 'dark' ? ... : undefined`.
```

```
[MEDIUM] PdfPreview is the one `screenIn` entrance the U4.2 reduced-motion sweep left behind, and
         after this wave it is the only ungated animation in the demo
File: features/demo/ui/chrome/PdfPreview.tsx:136
Issue: `animation: 'screenIn 0.3s ease'` is written unconditionally. `screenIn` translates 8px
  (ui/demo.css:92-95), ui/demo.css carries no prefers-reduced-motion block at all, and
  app/css/style.css:248-258 block is class-matched (attribute-substring class selectors plus the
  .animate-* utilities) so it cannot reach an inline `style`. A visitor with the OS preference set
  gets the translate on the PDF preview and on nothing else in the demo.
Evidence: PROBE 2, reduced-motion arm, one run, four components:
    CentredDialog ""  ·  GlassBottomSheet panel ""  ·  GlassBottomSheet scrim ""  ·  ModalShell ""
    PdfPreview "screenIn 0.3s ease"
  The line itself is untouched by this diff, so this is a sweep residual rather than a new defect —
  but the file IS in the diff (it adopts buttonStyle at :170-171), the PR body claims U4.2
  "gated screenIn", and the two packages that could have taken it each pointed at the other:
  reports/u4.3-implementation-report.md:135 marks PdfPreview "no — U4.4 file", and
  reports/u4.4-implementation-report.md only reaches its close chip (R-4/A90). It fell in the gap,
  it is now a singleton, and it is a one-line fix in a file the wave already opens.
Fix: `const reducedMotion = useReducedMotion()` from @/lib/hooks/use-reduced-motion (the hook the
  other three shells in this wave took), then
  `animation: reducedMotion ? undefined : 'screenIn 0.3s ease'` — the identical shape as
  CentredDialog.tsx:320. Alternatively a ledger row with a trigger; the current state (neither) is
  what makes it a finding.
```

```
[LOW] GlassBottomSheet scrim becomes role="button" with no tabIndex and no key handler the
      moment a caller passes `closeLabel`
File: features/demo/ui/controls/GlassBottomSheet.tsx:391-393
Issue: `role={closeLabel ? 'button' : undefined}` puts a button in the accessibility tree that no
  keyboard visitor can focus or activate — AT announces a control that is not operable from the
  keyboard. Today nothing reaches it: `closeLabel` has ZERO production callers (only
  controls/__tests__/GlassBottomSheet.test.tsx:483), so this is latent, not live. It is filed
  because the docblock at :135-143 explicitly invites matrix A82 map-filters sheet to pass
  it — a sheet the same docblock says has no visible close control — and that adoption lands in a
  later package where nobody will be re-reading this line.
Evidence: WCAG 2.1 SC 4.1.2 (name / role / VALUE, i.e. operability of the exposed role) and the
  in-repo idiom: every other dismiss affordance in the demo is a real `button type="button"`
  (inputs/PickerSheet.tsx:50, screens/_shared.tsx:308). Escape does close the sheet (:250-251),
  so nobody is trapped — hence LOW, not HIGH.
Fix: either drop the `role` and keep aria-label off the scrim entirely (a click-only backdrop with
  no role is what master PickerSheet shipped and what nothing announces wrongly), or give it
  tabIndex={0} plus the repo switchKeyDown equivalent when `closeLabel` is set. Decide it at the
  seam now rather than in A82 diff.
```

---

## What I checked and found clean

- **The wall.** No `components/`, `lib/` or `app/(default)/` file in the diff at all. No new
  @/features/demo import anywhere in marketing. `app/layout.tsx` untouched — no chrome hoist.
- **Lazy heavy deps.** mapbox-gl and pdfjs-dist are still `await import`ed inside their
  effect/function; nothing in this diff moves either to a static top-level import. `package.json`
  unchanged — no new dependency, no barrel import.
- **THE LIT-EDGE RULE, swept repo-wide, not sampled.** I wrote a comment/string-stripped brace-depth
  scanner over every non-test file under features/demo/ui and listed every border-family SHORTHAND
  written after a spread in the same object literal. Sixteen hits; **five are in this diff** and
  none of them spreads a lit-edge fragment:
  choice-controls.tsx:94 (the spread is a flex/width ternary), TimeWheel.tsx:184-185 (`overlay` =
  position keys only), AudioRecorderScreen.tsx:156 (`pillButton`, whose `border` shorthand precedes
  the override and neither value ever changes), ExportCaseCard.tsx:134 (`wrapper` carries no border
  key), ExportLocationRow.tsx:90 (`indicatorBase` carries borderWidth/borderStyle longhands and no
  side colour). The other eleven are pre-existing files this diff does not touch. PROBE 1 then
  confirmed the four new recipes hold their edges across a real update.
- **glassWell composition.** Dropdown.tsx:172 writes `{ padding: 5, ...glassWell }` — spread LAST.
  glassWell (glass-tokens.ts:324-333) carries no `padding` key, so the phone Picker.tsx:363 value
  survives, and the fragment is longhands-only.
- **Resource cleanup.** Five listeners/timers added, all accounted for. CentredDialog two
  capture-phase document listeners are installed once at module scope behind
  `typeof document === 'undefined' || tracking` — SSR-safe, idempotent, page-lifetime by design, not
  a per-mount leak. GlassBottomSheet setTimeout clears on re-open and unmount (:245); both Escape
  listeners remove (:263, :254); setPointerCapture is implicitly released on pointerup/pointercancel
  and both are wired. No createObjectURL, no observer, no new fetch.
- **Render cost / store discipline.** DemoExperience.tsx changed by 3 lines (one button adopting the
  recipe). No new state lifted into the bridge, no new useStore subscription, no whole-state
  selector, no selector returning a fresh reference. PROBE 5 priced the recipe functions at noise.
  GlassBottomSheet keeps the drag in a ref and only setDragY once the pointer is claimed, which is
  the right call. endDrag reads getBoundingClientRect() once, on pointerup — no thrash. Every
  animation in the diff is transform or opacity.
- **Recipe fidelity vs the phone, read at source.** Layout.spacing / borderRadius / touchTarget /
  iconSize are value-identical to constants/Layout.ts. buttonStyle three sizes match
  Button.tsx:96-110 exactly (8px 16px / 44, 16px 24px / 48, 24px 32px / 56), label sizes match
  Typography.fontSize.sm/base/lg (14/16/18), borderRadius.control and borderWidth 1 on the base
  match :90-91, all five variants fills and edges match :114-161, and both the primary boxShadow
  and its textShadow fold RN five-prop form correctly in BOTH halves (0 6px 20px rgba(0,0,0,0.45)
  and rgba(30,58,138,0.22); 0 1px 1px rgba(255,255,255,0.06) and rgba(0,0,0,0.1)). fieldInputStyle
  matches TextInput.tsx:165-175 (radius 8, 16/16 padding, fontSize 16, minHeight 44, error
  borderWidth 2). Sheet chrome matches GlassBottomSheet.tsx:491-551 (radius 22 top-only,
  borderWidth 1 + borderTopWidth 2, handle 40x4 at radius full, header 8/16/12, dot 6x6, title
  14/700/0.3/uppercase, subtitle 12/400/mt2). Dialog and sheet shadows match Layout.ts:165-190 in
  the dark half. The maxWidth non-port is arithmetically correct: 378 minus 2x24 = 330, under both
  the 340 and 380 caps.
- **Contrast of everything else the wave introduced.** Independently recomputed (WCAG 2.1,
  source-over composited, my own implementation) — every figure the implementers claimed reproduces
  to the hundredth: badge text on the four *Light fills 5.94 / 5.40 / 5.93 / 5.79 (floor 4.5);
  primary CTA label 5.80 top stop and 8.32 bottom; secondary label 10.60; danger label on DangerFill
  6.39; outline/ghost label link 7.65 on card and 6.80 on modal; checkbox glyph onPrimary on primary
  3.73 (non-text floor 3.0); selected radio label and ring 6.83 on the composited 8 percent wash;
  SAMPLE_TINT outline label 6.47. The disabled label (disabledText on colors.disabled, 1.59) is
  correctly left alone — WCAG 1.4.3 exempts inactive components and button-recipe.ts:149-151 says
  so, citing the phone declining the same branches.
- **A11y idioms.** Toggle (_shared.tsx:716-728) keeps role="switch" + aria-checked + aria-label +
  tabIndex 0 + Enter/Space through switchKeyDown, and the three hand-rolled copies it replaces
  (GpsCaptureControl, TimeOffsetScreen DVR-DST, FormFieldsPane) all had strictly less. The three
  consolidated dialogs were role="alertdialog" aria-modal="true" at master and still are. Banner
  carries role="alert" plus an explicit aria-live plus aria-hidden on its icon.
  RequestedScopeScreen segmented pair GAINS role="radiogroup"/role="radio" where it had none. The
  ModalShell and GlassBottomSheet shells have no focus move/restore — **and neither did the
  _shared.tsx ModalShell or PickerSheet at 43ccbad**, verified by grep at both SHAs, so that is
  inherited, not introduced. CentredDialog is a strict improvement: the two mount-time
  document.activeElement reads its own docblock calls broken are gone, and PROBE 3 shows the
  capture-phase survivor restores focus correctly.
- **Style-convention half.** Zero `className=` added anywhere under features/demo. ui/demo.css is
  not in the diff — no new global rule, no new keyframe, no unscoped selector. Frame math,
  PhoneFrame and the marketing copy untouched. No new img element.
- **Escape stacking.** CentredDialog openDialogs mount-order stack correctly answers Escape on the
  topmost dialog only. It does not make deferred §19 (an Escape closing a modal and its picker
  together) worse: GlassBottomSheet and CentredDialog still listen on document independently, which
  is the same shape master shipped with PickerSheet + AlertDialog. Not re-filed.

---

## Web Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 2 |
| LOW | 1 |

Marketing<->demo isolation: **preserved** — no marketing file in the diff; the wall grep is clean at
both SHAs; app/layout.tsx untouched.

Bundle impact: **none, measured.** /demo First Load 107 kB at HEAD and at 43ccbad; the demo async
chunk grew 1,363 B (+0.24 %) and all static/chunks 1,526 B, across a +9,149-line diff. No dependency,
import-shape or lazy-to-static change.

Browser-resource cleanup: **complete.** Every effect-scoped listener and timer added has a matching
teardown; the two module-scope capture listeners are idempotent, SSR-guarded and page-lifetime by
design.

Accessibility: **one regression found** — HIGH 1, the unchecked selection mark 4.35 -> 1.33 non-text
contrast drop. Everything else is neutral-or-better; the dialog focus consolidation is a real
improvement.

Style-convention adherence: **correct half; lifted rules intact.** Inline CSSProperties throughout,
no Tailwind entered features/demo/ui, no lifted pixel value or frame math moved, demo.css untouched.
The lit-edge rule holds on every new consumer, probed.

Verdict: **REVISE**

Notes: the recipes are a high-fidelity port — every geometry and every contrast figure I re-derived
from the phone source reproduces exactly. The one thing the wave own arithmetic did not cover is the
boundary of the control that has no other carrier.

Out-of-lane observations:
- Captures at _captures/w2/ are `after/` only (6 of 9 groups); no `before/`, no DIFF.md, no build
  log. My bundle figures above are the first independently-run ones for this wave; the pixel evidence
  in HIGH 1 comes from the `after/` set and would be twice as strong with a `before/` beside it.
- `closeLabel` (GlassBottomSheet.tsx:144) has no production caller — a prop shipped for a future
  package. Type-design call whether that is worth naming; I only judged its a11y consequence.
- ExportCaseCard.tsx:147 uses the real `disabled` attribute where the demo stated house rule
  (_shared.tsx:663-667) is aria-disabled plus an inert handler so focus is never stranded. It is
  byte-identical to master, so out of scope for this diff — noting it for whichever package reopens
  that file.
- RadioOption groups are Tab-navigable but not arrow-navigable (no roving tabIndex), which is an APG
  deviation rather than a WCAG one. Master already shipped that shape at two sites and the third had
  no radio role at all, so the diff is a net improvement; not filed.
