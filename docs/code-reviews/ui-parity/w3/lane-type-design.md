# Lane: type-design — Wave 3 (U5 map + U6 wizard/settings + U7 import/OCR/media)

## Round 1 (fix delta)

Warm, scoped. Phase branch `feat/uiparity-w3` @ `eb98295`, fix-merge `3dc8676`, delta
`7d0bf57..3dc8676`. Authority: the round-1 fix-mapping comment on PR #43. Read the delta only,
plus the lines each fix now depends on. Probes ran in `probe-w3d-td-census` (own worktree off
`3dc8676`), torn down via `tools/worktree-remove.ps1` — **"unlinked 549 junction(s) in 2
pass(es)"**, `.pnpm` 240 to 240, exit 0; branch deleted. Restores proven byte-identical
(`git status --short` and `git diff --stat` both empty).

Baseline at `3dc8676` BEFORE any mutation: `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit
--incremental false` -> **EXIT 0**.

**My findings per the mapping: F51 (co-owned with silent-failures), F61, F62, F68, F75.** The
coordinator also asked me to judge **F74** (web / typescript lanes) and **F65**'s type shape
(aggregator), since both are type-design questions, and to verify U7.2's **Q9/Q10r** probe
disclosures. Judged below, marked as not-mine.

---

### F51 [HIGH] — **FIXED, and stronger than prescribed**

Consumer side `176f0d6` + `88587e3`, seam-side docblock `552ec8b`. Re-ran my round-0 census at
the merged head:

```
grep -rn "sample-badge" features/   ->  ImportResultAccordion:6 · OcrCaptureScreen:8
                                        MediaLibrarySheet:28 · MediaCaptureScreen:24
                                        AudioPreviewScreen:15         (5 of 5 consumers)
grep -rni "rgba(255,\s*200,\s*90,\s*0\.12)" features/  ->  sample-badge.ts:60 ONLY (1 hit)
```

All three orphans route through the seam; zero rendered bytes moved (checked value by value at
`MediaCaptureScreen.tsx:902-907`, `AudioPreviewScreen.tsx:202`, `MediaLibrarySheet.tsx:930-940`).
`MediaLibrarySheet`'s `sampleBadge` also became `as const satisfies CSSProperties`, closing an F61
site in the same edit.

**Three things go beyond what I asked for:**

1. **The docblock census is corrected as a TABLE**, not a number — five rows, each naming its
   owner and marking the three ORPHANs. It opens: "This docblock previously said 'Two surfaces
   paint it… One owner, one pin.' **That was false when it was written.**" That is the honest
   form; a corrected count would have left the next reader no way to check it.
2. **A new ownership ratchet**, `screens/__tests__/sample-badge-consumers.test.ts`, which is the
   mechanism my finding said was missing (the value pins cannot see a re-inline at the identical
   value). It carries a live-read control (`:94-99`: length floor, import, and `SAMPLE_BADGE.`
   usage), which is F67's lesson applied.
3. **The scan's CLAIM is narrowed to what its pattern can carry, and the narrowing is asserted
   rather than described** (`:101-109`): `OWNED` is pinned to `['background']`, and both
   exclusions are proven live in the scanned file. Its docblock states the reason — "The honest
   response is to shrink the CLAIM to the pattern, not to widen the pattern until it lies."
   Given this round's own theme, that is the right call and I endorse it over a wider regex.

**My scope note confirmed, as the coordinator asked.** The looser amber family is untouched and
correctly so: `PdfPreview.tsx:170`, `ImportModal.tsx:278,294` (0.1 / 0.28),
`MediaLibrarySheet.tsx:585` (0.06 / 0.25), `MediaCaptureScreen.tsx:891-892` (the sample-data CARD
at 0.3 / 0.08, the chip's wrapper, which my finding excluded by name), plus bare `#ffd07a`
advisory text at five sites. None is the defended trio; F51 excluded them and U7.2 left them.

One imprecision, **not filed** (prose, and it errs safe): the scan's docblock at `:67` says the
fill "has exactly ONE occurrence in the whole of features/demo/ outside sample-badge.ts".
Measured, there are **zero** outside — which is what makes the scan a working ratchet rather than
a pre-broken one. The sentence understates its own guarantee.

---

### F61 [MEDIUM] — **FIXED. The census is closed, and the round went past it.**

Eight commits across seven seats. Re-ran my full 35-site census by mutation, not by grep.

**PROBE P2 — the three EXPORTED fragments plus the two records, one throwaway
`features/demo/ui/zz-probe-w3d.tsx`, one compiler run:**

```
CONTROL.glass.size = 999                 -> TS2540 read-only   (round 0: SURVIVED)
MAP_FILTER_SECTION_LABEL.color = 'red'   -> TS2540 read-only   (round 0: SURVIVED)
fieldLabelStyle.fontSize = 999           -> TS2540 read-only   (round 0: SURVIVED)
fieldErrorStyle.color = 'red'            -> TS2540 read-only   (round 0: SURVIVED)
sampleBadge.fontSize = 99                -> TS2540 read-only   (F51's edit, bonus closure)
```

**PROBE P3 — all 30 located module-LOCAL sites, assignments appended in-file across 10 files,
one compiler run:**

```
TS2540 (readonly refusal)                            : 10
TS2339 whose REPORTED TYPE is spelled "readonly …"   : 20
TS2339 whose reported type is NOT readonly           :  0   <- a survivor would appear here
any other diagnostic on the whole tree               :  0
```

The split is an artefact of my probe key (`color`), not of the fix: tables carrying a `color` key
refuse the write (TS2540); tables that do not report their narrowed literal type first — and
**every one of those 20 types is printed with the `readonly` modifier**, e.g.
`MapControls.tsx(527,18)`: "Property 'color' does not exist on type '{ readonly position:
"absolute"; readonly top: 0; … }'". Both forms prove `as const` landed. **Zero survivors.**

The 35th site is accounted for: `MapFiltersSheet`'s `hintText` was renamed and exported by F60's
fix as `MAP_FILTER_HINT_TEXT` (`:218-226`), and it ships
`} as const satisfies CSSProperties & { color: string }`.

**35 of 35 CLOSED.** The seats also went well beyond my census — measured across the fix diff,
**71** `as const satisfies (CSSProperties|Record<…>)` closers were added, against the ~50 claimed:
`MapControls` now carries 14 where I named 10, `LocationDetailCard` 11 where I named 2,
`SheetHandle` 6 where I named 1. Pre-existing siblings in the same files were closed alongside the
new ones, which is the right unit of work and is why the file counts exceed the finding.

**`CONTROL` took the strictly better shape**, with the reason written down
(`OverlayHeader.tsx:141-143`): `as const satisfies Record<…>` rather than the annotation, because
"satisfies keeps the literal types (so a missing variant is still a compile error, which is what
this table is for) while as const makes it readonly. An annotation alone widens every value to
string." Correct, and it is the F44/F45 idiom.

**Q9 / Q10r — the disclosure verified, both directions.** `3ea5d31` discloses that the two
`@ts-expect-error` readonly pins cannot distinguish `as const satisfies X` from `satisfies X`
alone. I reproduced it rather than accepting it:

```
PROBE P5   previewActionFace: "} as const satisfies CSSProperties" -> "} satisfies CSSProperties"
             tsc EXIT 0 · MediaLibrarySheet.test.tsx 54 passed       SURVIVED  (as disclosed)
PROBE P5b  previewActionFace: -> "const previewActionFace: CSSProperties = { … }"  (F61's shape)
             MediaLibrarySheet.test.tsx(732,7) TS2578 Unused '@ts-expect-error'   KILLED
```

Their explanation is also right: `satisfies` already pins a fresh literal's type, so the
assignment errors either way and no `@ts-expect-error` can separate a readonly refusal from a
literal-type mismatch. **So the pins guard exactly the regression F61 names and nothing wider, and
the comment now says so.** Writing that down instead of widening the pin until it lied is the
correct disposition, and the second time this round a seat chose the honest claim over the
impressive one.

---

### F62 [MEDIUM] — **FIXED. Disclosed deviation, accepted on the merits.**

`64af690`. My finding offered two shapes and asked the author to say which; they took the cheap one
and said which, with a refutation of the union that I accept:

```
const proximityFiltering = proximityResult !== null      // MapScreen.tsx (F62)
MapControls  proximityActive={proximityFiltering}        // the chip: what is RUNNING
MapFiltersSheet  proximityActive={proximityActive}       // the switch: what was ASKED FOR
```

"Both values already exist, so a union would re-encode a derivation rather than remove one." That
is correct, and it is the repo's own derived-not-stored precedent (`ScopeRetention` omits
`status`): `proximityFiltering` is a pure function of `proximityResult`, so there is no second
source of truth to drift. Keeping the SWITCH on `proximityActive` is right too, and the reason is
better than mine — gating a toggle on the result springs it back under the visitor's finger.
`MapControls`'s prop docblock ("True while the proximity ring is active") is true again.

The window was unobservable in jsdom, which is how it shipped; the fix adds
`MapScreen.proximity-window.test.tsx` with a **never-settling** module mock to hold it open, plus
an anti-vacuity control (two of three cases assert `aria-checked="true"`, so a mock that degraded
into a rejecting one would red). Mutation-verified by the author, and the failure text quoted is
the right one.

---

### F68 [LOW] — **FIXED**

`5d31381`. The ladder now carries
`U5.1 (LANDED) +2 map-glass keys x 2, +4 always-dark map-chrome rows = +8 rows -> 143`, and the
MEASURED line reads `41 palette keys / 67 anchor keys / 143 rows`. Arithmetic re-checked
independently: 41x2 + 24x2 + 2x2 + 1 + 3 + 4 CTA stops + touchFloor = **143**; anchor keys
41 + 24 + 2 = **67**. Both correct, and the anchor-key figure was corrected too (65 -> 67), which
I did not ask for.

### F75 [LOW] — **FIXED**

`ed59934`. `terminal-palette.ts:79-82` now ends `} as const satisfies Record<ColorScheme, string>`,
with a comment naming F45 and pointing at `mapTokens.ts:96` as the sibling. `ColorScheme` was
already imported.

---

## Not my findings — judged at the coordinator's request

### F74 [LOW] (web · typescript) — **FIXED, and it is the F39 shape exactly**

`6259114`. `OverlayHeaderProps` is now `OverlayHeaderBase & OverlayHeaderControl`, where
`OverlayHeaderControl` is the pair `{ onBack(): void; backLabel: string }` union
`{ onBack?: undefined; backLabel?: undefined }`. The `onBack?: undefined` arm is the load-bearing
half, and the docblock knows it: "without it, { onBack: fn } alone still matches the no-control arm
by width subtyping." That is the trap this shape usually falls into, named and avoided.

**PROBE P1 — four JSX call sites, one compiler run, canonical source:**

```
OverlayHeader variant="glass" onBack={fn}                     -> TS2322   KILLED
OverlayHeader variant="glass" backLabel="Close"               -> TS2322   KILLED
OverlayHeader variant="glass" onBack={fn} backLabel="Close"   -> no error  <- CONTROL, compiles
OverlayHeader variant="cameraScrim" title="x"                 -> no error  <- CONTROL, compiles
```

Both illegal shapes red, both legal shapes compile — so the pair is exhaustive rather than merely
over-strict. This is W2/F39's `disabled?: { reasonId }` ruling applied to a second seam, and it
cites `SettingsNavBarProps` as the in-wave precedent.

### F65 [MEDIUM] (aggregator) — **type shape FIXED; one defect, filed LOW below**

`c43ddd6`. The engine's `getConfidenceLevel` now returns `{ level, message }` — matching the
phone's own `timestamp-parser.ts:339-342` — with `ConfidenceLevel` a named union, and the colour
maps in the UI. That is the right split: presentation left `engine/`, the layer
`features/demo/CLAUDE.md` keeps pure, and the orphan `#ff7a45` collapsed onto `warningDark` with a
stated reason rather than being tokenised into a fifth hue nobody owns.

**One-sided-key-proof, as asked. PROBE P6 — canonical source:** adding a fifth member to
`ConfidenceLevel` in `engine/logic/ocr.ts` gives
`OcrCaptureScreen.tsx(132,7): error TS2741: Property 'zzFifth' is missing in type` … `but required
in type 'Record<ConfidenceLevel, string>'` — **KILLED at the declaration.** The commit's claim
("a fifth band is a compile error rather than an undefined that paints currentColor") holds in the
missing-key direction, and an excess key is rejected too by excess-property checking on the
annotated literal. The U0.1 standard is met.

---

## New finding (fix-introduced)

```
[LOW] The F65 fix lands the ONE new mutable module-level table of the round — F61's own shape,
      two commits after the same round closed it 35 times
Type: CONFIDENCE_COLOR at features/demo/ui/screens/OcrCaptureScreen.tsx:132
Issue: "const CONFIDENCE_COLOR: Record<ConfidenceLevel, string> = { … }" is the bare-annotation
  form. Measured across the whole fix diff, it is the ONLY new module-level annotated table the
  round introduced (git diff 7d0bf57..3dc8676, grepped for added const-colon-CSSProperties-or-
  Record declarations -> one hit), against 71 "as const satisfies" closers landed in the same
  range. The annotation also widens every value to string, which is the exact cost
  OverlayHeader.tsx:141-143 documents two commits earlier in this round while taking the other
  shape.
MUTATION PROBE P4 — canonical source, one compiler run:
    CONFIDENCE_COLOR.high = 'zz'
    CONFIDENCE_COLOR.fail = 'zz'
      -> no diagnostic anywhere on the tree                SURVIVED
  (Negative controls for the same run are P2's five TS2540s and P6's TS2741 on this very table, so
  the compiler run is live and this table's exhaustiveness half is intact.)
Downstream consequence: bounded and small — module-local, one file, four values, and the
  exhaustiveness guarantee the commit message advertises is unaffected. Filed because it is the
  seed of the fourth recurrence of the F20/F38/F61 class, and because the ledger will otherwise
  record F61 as closed while a new instance ships in the same merge.
Fix: "} as const satisfies Record<ConfidenceLevel, string>" — one token, the shape CONTROL took in
  commit 6259114 of this same round, and it keeps the four literal types the UI paints.
```

---

## Regression sweep over the fix commits' blast radius

- **71 declarations changed from a mutable annotation to a readonly literal type.** The only
  consumers that could break are those indexing a key absent from the narrowed type; cold
  `tsc --noEmit --incremental false` at `3dc8676` is **EXIT 0**, and my P3 run produced **zero**
  diagnostics outside the ones my own probe caused.
- **`CONTROL` and `sampleBadge` became EXPORTED** where they were module-local. Both are exported
  for their own pins (`overlay-header.test.tsx`, `MediaLibrarySheet.test.tsx`), both are readonly,
  so the widened surface carries no mutation hazard. No finding.
- **F65 removed `color` from a section-2-protected engine type.** It reddened four fixtures and the
  engine test at COMPILE time (quoted in the commit) — the right kind of red — and all were updated
  rather than weakened. `OcrResult.confidence` carries `level` now; the two UI readers and
  `DemoExperience.tsx` were updated in the same commit.
- **F62 changed which boolean `MapControls` receives.** Sibling readers checked: the sheet's
  `Toggle` and the radius chips still take `proximityActive` (deliberate, documented), and
  `proximityResult` is the only input to `proximityFiltering`, so nothing else moved.
- **F74's discriminated pair reached all four call sites** without a cast — tsc EXIT 0 is the
  proof, and P1's two negative controls show the legal shapes still compile.

**No fix-introduced regressions in my lane beyond the LOW above.**

---

## Type Design Summary (Round 1 fix delta)
CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 1 (new, fix-introduced)
Prior-round findings: **F51, F61, F62, F68, F75 — 5 of 5 FIXED.** 0 PARTIAL, 0 UNFIXED.
Judged at request (not mine): **F74 FIXED** · **F65 type shape FIXED** (its LOW is the finding above).
Verdict: **APPROVE with comments**

| Check | Result |
|---|---|
| Does the fix round reach my full F61 census? | **yes** — 35/35; P2 five at TS2540, P3 ten at TS2540 plus twenty reporting `readonly` types, zero survivors, zero stray diagnostics. 71 closers landed, past my census into pre-existing siblings |
| F51's orphans actually route through the seam | **yes** — 5/5 consumers import; the defended fill has exactly one occurrence repo-wide, in the seam. The looser 0.06-0.28 family correctly untouched, per my own scope note |
| Q9/Q10r disclosure accurate | **yes, both directions** — P5 SURVIVED (dropping `as const`), P5b KILLED (bare annotation, TS2578). The pins guard exactly F61's shape; the comment now says which mutation kills and which does not |
| F74's pair exhaustive, not merely additive | **yes** — P1: both illegal shapes TS2322, both legal shapes compile. The `onBack?: undefined` arm defeats width subtyping |
| F65 one-sided-key-proof (U0.1 standard) | **yes** — P6: TS2741 at the declaration on a fifth band. Mutability is the separate LOW |
| Fixes address the finding, not the symptom | **yes** — F51 corrected the census as a checkable table and added the ownership mechanism I said was missing; F61 closed pre-existing siblings in the same files |
| Fix-introduced regressions in blast radius | **one**, filed LOW — `CONFIDENCE_COLOR`, the round's only new annotated table |
| Mutation probes this round | **7 run — 5 KILLED (P1 x2, P2/P3's TS2540s, P5b, P6), 2 SURVIVED (P4, the new LOW; P5, the disclosed and explained TypeScript property)**, with four in-run negative controls (P1c, P1d, and P2/P6 on the same tables as P4). Restores proven byte-identical; worktree torn down with the script's proof line |

Out-of-lane observations:
- The three round-0 observations are resolved or absorbed: the u7.3 report's "TWO files" census is superseded by the corrected table in `sample-badge.ts`, and `MediaLibrarySheet.tsx`'s "shared in appearance" docblock now states the F51 history and imports the seam. The `NotesScreen.test.tsx:75-80` tautology was not in scope this round and I did not re-check it — it remains the tests lane's.

---
# Lane: type-design — Wave 3 (U5 map + U6 wizard/settings + U7 import/OCR/media)

**Mode:** code review (round 1) · **Tree:** `worktrees/w3-wave` @ `13827de`, read-only ·
**Scope:** `git diff master...13827de` — 81 non-test `.ts`/`.tsx` files, 5 of them new
(`chrome/OverlayHeader.tsx`, `controls/sample-badge.ts`, `screens/camera-chrome.ts`,
`screens/import/terminal-palette.ts`, `screens/map/MapFiltersSheet.tsx`).

**Probes:** `probe-w3r-types-census`, own worktree off `13827de`, `pnpm install --prefer-offline`
11.5 s. Baseline BEFORE any mutation: `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit
--incremental false` → **EXIT 0**. Restores proven byte-identical (`git status --short` and
`git diff --stat` both empty). Torn down with `tools/worktree-remove.ps1` — **"unlinked 549
junction(s) in 2 pass(es)"**, `.pnpm` 240 → 240, exit 0; branch deleted.
**Provenance: every mutation below was applied to the CANONICAL source file, never a mirror.**

---

## HIGH

```
[HIGH] SAMPLE_BADGE is declared the single owner of D12's defended amber while THREE
       byte-identical copies survive — all three in files this wave opened and edited
Type: SAMPLE_BADGE at features/demo/ui/controls/sample-badge.ts:30-37
Issue: The module's docblock states the census that justifies its existence — "Two surfaces
  paint it: ImportResultAccordion's per-location badge and OcrCaptureScreen's confidence
  badge … One owner, one pin." The census is wrong. The exact triple #ffd07a /
  rgba(255,200,90,0.12) / rgba(255,200,90,0.3) is live, byte-identical, at three further
  "Sample"-badge sites, none of which imports the module. So the seam owns 2 of 5 copies while
  its docblock and its consume-me both assert it owns all of them.
Invariant violated / permitted invalid state: D12's freeze-and-defend arm is quoted in the
  module as a CORRECTNESS constraint — "It must stay visually distinct from real data." Nothing
  types, links or scans the other three sites to the constant, so the constraint holds today only
  because five hand-typed literals happen to agree.
Construction sites (all four literal owners, canonical source, measured
  grep -rn "ffd07a|255,200,90" over features/, tests excluded):
    features/demo/ui/controls/sample-badge.ts:32,34,36        <- the declared owner
    features/demo/ui/screens/MediaLibrarySheet.tsx:917-926     <- const sampleBadge: CSSProperties
    features/demo/ui/screens/MediaCaptureScreen.tsx:894-908    <- the inline "Sample data" chip
    features/demo/ui/screens/AudioPreviewScreen.tsx:199        <- the inline "Sample" chip
  MediaLibrarySheet.tsx:915-916 is the sharpest: its docblock says "The demo's sample badge,
  SHARED IN APPEARANCE with the two capture screens'" — it names the sharing and then re-types
  the three values under it. All three files are edited by this diff (U7.2), so none is out of
  reach; MediaLibrarySheet.tsx gained two new fragments 12 lines above this one.
Downstream consequence: D12 explicitly authorises a re-derive ("Re-derive it only if A15's
  warningLight would collide with it"). On that day the editor reads "Two consumers" in the
  docblock and at u7.3's consume-me item 4, moves the module, and ships a demo where the Import
  and OCR sample marks are one amber and the Media Library / Camera / Audio-Preview sample marks
  are another — a bundled asset labelled two different ways in one session, which is exactly the
  provenance-honesty failure D12 calls a correctness constraint. palette-contrast.test.ts
  measures the separation only at the constant, so the three orphans are unmeasured and the
  re-derive is green.
Evidence — the repo's own correct pattern, one FILE away in the same wave:
  screens/import/terminal-palette.ts:9-14 opens with the identical census — "Three demo files
  used to own four parallel copies of these shades — ImportTerminalProgress's TERM_CHROME +
  C, TerminalLine's LEVEL_ACCENT + TERM_ROW, and NotesScreen's PANEL_BG/PANEL_BORDER …
  This module is the single owner." — and U7.1 then migrated ALL FOUR (verified:
  NotesScreen.tsx:61-62 reads TERMINAL_PALETTE.screen[scheme] / .border; zero copies remain).
  Same wave, same author-facing rule, opposite outcome. This is also W2/F26's class verbatim
  (aggregator, HIGH): "the surfaces and the seam agreed on the values while sharing no source,
  and no scheduled check observed the divergence."
Fix: import SAMPLE_BADGE at the three sites (MediaLibrarySheet.tsx:922-924,
  MediaCaptureScreen.tsx:902-904, AudioPreviewScreen.tsx:199) — zero rendered bytes move —
  and correct the census in the docblock and in u7.3's consume-me item 4 from "Two consumers" to
  the measured number. If a package boundary genuinely blocks one site, the ledger row must name
  WHICH site and carry the re-derive day as its trigger; a five-way freeze defended at two of
  five is not a defence.
NOT folded in (deliberately, and named so the sweep is complete): the LOOSER amber family at
  PdfPreview.tsx:169, ImportModal.tsx:278,294, MediaLibrarySheet.tsx:587,
  MediaCaptureScreen.tsx:889-890,543,545,912,917, OcrCaptureScreen.tsx:650 uses
  0.06/0.08/0.1/0.25/0.28 alphas — a different set, not byte-identical to SAMPLE_BADGE, and
  several are notices rather than provenance marks. They are not this finding.
```

---

## MEDIUM

```
[MEDIUM] 35 NEW module-level style tables ship mutable — the F38 census re-opened one wave
         after it closed, and larger (35 vs F38's 22)
Type: the wave's new module-level ": CSSProperties" fragments + the two typed lookup records
File: 12 files, enumerated below
Issue: W1/F20 and W2/F38 established "} as const satisfies CSSProperties" (or the Record
  equivalent) for every module-level style table, and W2 round 2 closed that census —
  "26 fragments total, 9/9 assignment probes now TS2540" (w2/VETTED-r1-delta.md F38').
  W3 introduces 35 new module-level declarations of the same shape, every one of them annotated
  rather than "as const satisfies", so every one is a mutable shared reference again. The wave
  applied the standard correctly to its new CONSTANT BLOCKS (TERMINAL_PALETTE,
  TERMINAL_FONT_SIZE, CAMERA_CHROME, SAMPLE_BADGE, MAP_GLASS_SCHEME, MAP_SURFACE_COLORS —
  all "as const", three of them probed KILLED below) and missed it entirely on the style
  fragments.
Construction sites — the full census (NEW in this diff; "git show master:<file>" carries no
  declaration of the same name, and the five new files carry none of it):
    tokens/field-input.ts:83 fieldLabelStyle *EXPORTED*, :105 fieldErrorStyle *EXPORTED*
    screens/map/MapFiltersSheet.tsx:101 MAP_FILTER_SECTION_LABEL *EXPORTED*
      (+ :111 body, :119 chipRow, :137 chip, :167 chipDot, :175 switchRow, :184 switchLabel,
         :187 hintText, :190 footerRow, :198 footerButton, :205 srOnly)
    screens/map/MapControls.tsx:119 outerContainer, :134 innerPadding, :149 surface,
      :156 closeButton, :198 inlineButton, :212 filterDivider, :219 badge, :238 chip,
      :246 chipBody, :259 chipText
    chrome/OverlayHeader.tsx:109 CONTROL (Record<OverlayHeaderVariant, …>), :129 row,
      :137 titleText
    screens/MediaLibrarySheet.tsx:880 glassButtonFace, :905 previewActionFace
    screens/map/LocationDetailCard.tsx:77 infoCard, :134 typeChip
    screens/map/LocationRow.tsx:44 rowBtn
    screens/map/MapBottomSheet.tsx:51 divider
    screens/map/SheetHandle.tsx:27 accentStrip
    screens/OcrCaptureScreen.tsx:132 evidenceCard
    screens/export/ExportCaseCard.tsx:96 locationsBody
MUTATION PROBE A + B + C — canonical sources, one compiler run each, baseline EXIT 0:
  A  a throwaway features/demo/ui/zz-probe-w3-census.ts assigning to the three EXPORTED
     fragments, alongside three NEGATIVE CONTROLS taken from this wave's own shipped constants:
       MAP_FILTER_SECTION_LABEL.color = 'red'   -> no diagnostic   SURVIVED
       fieldLabelStyle.fontSize = 999           -> no diagnostic   SURVIVED
       fieldErrorStyle.color = 'red'            -> no diagnostic   SURVIVED
       TERMINAL_FONT_SIZE.row = 99    -> TS2540 read-only   <- CONTROL, KILLED
       CAMERA_CHROME.onCamera = 'red' -> TS2540 read-only   <- CONTROL, KILLED
       SAMPLE_BADGE.border = 'red'    -> TS2540 read-only   <- CONTROL, KILLED
     The three controls satisfy all four clauses (shipped, non-equivalent, compiled in the same
     run, on the executed path) and prove the check is live rather than blind.
  B  31 assignments appended in-file to all 31 module-LOCAL fragments across 10 files:
       -> 0 of 31 TS2540, and ZERO other diagnostics on the whole tree (tsc otherwise clean)
  C  CONTROL.glass.size = 999 · CONTROL.cameraScrim.stroke = 'zz'
       -> no diagnostic   SURVIVED (a Record<…> ANNOTATION gives exhaustiveness, not readonly)
  36 assignments, 35 declarations, 0 TS2540. Probe files deleted / files restored by name;
  "git status --short" and "git diff --stat" empty afterwards.
Downstream consequence: fieldLabelStyle / fieldErrorStyle are the worst instance and are new
  this wave — 12 production modules import them (_shared.tsx, AddressAutocomplete,
  DateTimeField, Dropdown, IncidentLocationFields, input-theme.ts, CompletionScreen,
  DvrInfoScreen, NewCaseModal, RequestedScopeScreen, SubmissionScreen, UserProfileModal).
  That is the largest shared-style reference in the demo, and it is exactly the shape W1/F20 was
  filed against: one write on the shared object re-tints every form label in the product with no
  diff at any call site. MAP_FILTER_SECTION_LABEL is imported by two test files that both
  read .color.
Fix: "} as const satisfies CSSProperties" per site ("as const satisfies Record<
  OverlayHeaderVariant, {…}>" for CONTROL; MAP_FILTER_SECTION_LABEL's
  "CSSProperties & { color: string }" becomes "as const satisfies CSSProperties" — the literal
  type already makes color present, which is what the intersection was buying). Purely
  additive; every consumer spreads or reads. Per the W2 delta's own closing note ("one
  owner-routing row per seat per file, no parenthetical riders"), this routes as 12 rows:
  field-input.ts -> U6.4a · MapFiltersSheet.tsx -> U5.3 · MapControls.tsx -> U5.2 ·
  OverlayHeader.tsx -> U7.2 · MediaLibrarySheet.tsx -> U7.2 · LocationDetailCard.tsx,
  LocationRow.tsx, MapBottomSheet.tsx, SheetHandle.tsx -> U5.4/U5.1 · OcrCaptureScreen.tsx ->
  U7.3 · ExportCaseCard.tsx -> U6.4.
Note for the aggregator: function-LOCAL ": CSSProperties" sites remain accepted class (my W2
  round-2 ruling — freshly constructed per render, no shared reference); the 160 PRE-EXISTING
  module-level annotated fragments outside this diff are repo drift, are NOT counted here, and
  are not a finding.
```

```
[MEDIUM] MapScreen's proximity state is three independent useState hooks, so "proximity ON but
         not filtering" is representable — and U5.3 put a new caller on the path that reaches it
Type: the (proximityActive, proximityCenter, proximityModule) trio
File: features/demo/ui/screens/map/MapScreen.tsx:167-171 (declarations), :232-237 (projection),
      :375-390 (handleProximityToggle)
Invariant violated / permitted invalid state: proximityResult is null unless ALL THREE of
  proximityActive, proximityCenter and proximityModule are set (:233). The flat trio lets
  proximityActive === true coexist with proximityModule === null, which the projection then
  treats as "no proximity": display = filtered (:237), filteredCount = locationCount (:247),
  proximityRing={null} (:429).
Construction site: handleProximityToggle (:375-390) fires "void loadProximity()" (:380, a
  dynamic import of the Turf chunk) and then setProximityActive(true) SYNCHRONOUSLY at :389.
  Between that commit and the chunk resolving, the invalid combination is live on screen.
  handleLongPress (:394-401) does the same. The FAILURE path is handled — the .catch at
  :190-196 reverts the toggle and raises PROXIMITY_UNAVAILABLE — the LOADING window is not.
Downstream consequence: MapControls.tsx:411-424 renders the proximity chip under
  "proximityActive &&", with an aria-label that interpolates
  "Proximity filter, N kilometre radius, showing X of Y locations". During the window it
  announces and prints "2 km · 9 of 9" over a map with no ring and no filter applied — the chip
  asserts a filter that is not running, which is the thing MapScreen.tsx:28-34's own comment
  forbids in words ("a control must not assert what it cannot do") for the sibling failure path.
  This is in scope because U5.3 re-opened the ON branch: MapScreen.tsx:496-500 records it —
  "This is the caller that brings its ON branch … back into reach after U5.2 deleted the
  toggle pill."
Fix: the house pattern is engine/logic/retention.ts's RetentionView — "the union makes 'no
  total => no scopes' unrepresentable otherwise." One state instead of three:
  { mode: 'off' } | { mode: 'loading'; center: LngLat } | { mode: 'on'; center: LngLat;
  mod: ProximityModule }, with the chip and the counts reading the 'on' arm only. If the union
  is judged disproportionate for a sub-second window, the cheap alternative is to gate the chip
  on "proximityResult !== null" rather than on proximityActive — one condition, same guarantee
  at the render site, and it makes the invariant checkable. Either way, say which, because the
  current shape documents the guarantee in three separate comments and enforces it nowhere.
```

---

## LOW

```
[LOW] TERMINAL_PALETTE.screen's two-half record names no ColorScheme — W2/F45's exact shape,
      in a module created after F45 was fixed
Type: TERMINAL_PALETTE.screen at features/demo/ui/screens/import/terminal-palette.ts:74-77
Issue: "screen: { light, dark }" sits inside TERMINAL_PALETTE's "as const" (so it is readonly —
  that half is right) but carries no "satisfies Record<ColorScheme, string>". The sibling
  two-half record shipped by this same wave does: mapTokens.ts:96,
  "} as const satisfies Record<ColorScheme, { containerBg: string; border: string }>", whose
  docblock spells the reason — "a key present in one half and absent in the other is a compile
  error in both directions, exactly as in tokens/palette.ts."
MUTATION PROBE D — canonical source, one compiler run:
  delete "light: '#0b1420'," (:75)
    -> NotesScreen.test.tsx(81,36)          TS2339 'light' does not exist
    -> terminal-palette.test.ts(108,46)     TS2339 'light' does not exist
    -> features/demo/ui/screens/NotesScreen.tsx  NO ERROR
  i.e. test-file-only, which is the precise state W2/F45's fix left behind: "a dropped half
  is now TS1360 at the constant (was a test-file TS2339 only)" (w2/VETTED-r1-delta.md).
  NotesScreen.tsx:61's "TERMINAL_PALETTE.screen[scheme]" cannot catch it because
  palette.ts:240 declares "export const scheme = 'dark' satisfies ColorScheme" — a 'dark'
  literal, so the light arm has no source-side reader at all.
Downstream consequence: bounded — two tests red, and on the flip day the panel would fall back
  to the console black on a light app. Filed because the fix is one clause and it teaches the
  idiom the file next door already ships.
Fix: "screen: { light: …, dark: … } satisfies Record<ColorScheme, string>" inside the existing
  "as const" (the ColorScheme type is already imported at :2), matching mapTokens.ts's
  MAP_GLASS_SCHEME.
```

```
[LOW] The drift guard's SCHEDULE ladder says the table produces 135 rows; MEASURED it produces
      143 — W2/F49's class, same docblock, next wave, and U5.1 added no line
Type: the anchor-count arithmetic block at .design-sync/check-rn-parity.mjs:281-288
Issue: W2/F49 corrected three figures in this exact ladder and closed with "-> 41 palette keys /
  65 anchor keys / 135 rows, MEASURED, which is what this table produces today". U5.1 then
  appended MAP_GLASS_KEYS (2 x 2 halves), MAP_GLASS_FLAT_KEYS (1) and MAP_SURFACE_KEYS (3) at
  :492-495 — +8 rows — and added no "U5.1 (LANDED)" line, unlike every previously landed
  package on the ladder.
Evidence — MEASURED, not inferred, at 13827de in the probe worktree:
    $ node .design-sync/check-rn-parity.mjs
    all 143 anchor rows match between the RN app and the web demo
  The claim "135 … which is what this table produces today" is false by 8.
Downstream consequence: reading only. The GATE is unaffected and was updated correctly —
  rn-token-parity.test.ts:252-262 derives its expectation and now includes
  "MAP_GLASS_KEYS.length * 2 + MAP_GLASS_FLAT_KEYS.length + MAP_SURFACE_KEYS.length", and the
  docblock itself says "DO NOT TREAT THESE NUMBERS AS A GATE." So this is exactly F49's severity
  and no more — but it is the second recurrence in the same block, and the block's whole value
  is that a reader can trust it.
Fix: add "U5.1 (LANDED) +2 map-glass keys x 2 + 4 always-dark map rows = +8 rows -> 143" and
  change the MEASURED line to 143. One line and one number.
Attribution: F49 was authored and verified by the TESTS lane (settled in w2/VETTED-r1-delta.md,
  Unsettled section). I surface it here because my W3 brief names F49's class as a hunt item; if
  the tests lane files it too, it is one finding, not two.
```

---

## What I checked and found SOUND (recorded so the aggregator can close these hunt rows)

**(3) OverlayHeader's `variant: 'glass' | 'cameraScrim'` — exhaustive, and better than a switch.**
There is no switch: `CONTROL` (`OverlayHeader.tsx:109-127`) is a record-arm table, the F33/F44
shape. **PROBE E** (canonical source): adding a third member `zzProbeVariant` to the union ->
`OverlayHeader.tsx(110,7): error TS2741: Property 'zzProbeVariant' is missing … but required in
type Record<OverlayHeaderVariant, …>` — KILLED at the DECLARATION. Its docblock's stated reason
("a record rather than two ternaries so a new variant cannot be added while forgetting one of the
four fields") is accurate, which is the thing the contract's standing guidance says to verify. Its
only defect is mutability, folded into the census MEDIUM. W3 adds **no new switch statements at
all**, so there is no `default:` to swallow a variant anywhere in this wave.

**(2) MapFiltersSheet filter state — no invalid combination is representable.**
`activeStatuses: readonly LocationMapStatus[]`, `proximityRadius: RadiusPreset`
(= `(typeof PROXIMITY_PRESETS)[number]`, a 4-wide literal union), `proximityActive: boolean`. A
status outside the union is a compile error; a radius off the preset list is a compile error. The
anchorless-proximity case cannot be expressed here at all — the anchor is deliberately not a prop
("Resolving the ring's centre is the host's concern", `:79`), which is why that finding is filed
against MapScreen and not this component. Upstream is equally tight: `MapFilterState`
(`mapFilters.ts:41-46`) is readonly on both fields, `EMPTY_MAP_FILTERS` is Object.freeze'd with a
stated reason, and `toggleStatus` re-derives through `MAP_FILTER_STATUSES` rather than appending.
The U5.2 StatusSeverity friction closed cleanly: `tokens/status.ts:54-60` and `:89-95` are both
`as const satisfies Record<LocationMapStatus | 'incident', …>`, so the sheet's
`STATUS_SEVERITY[status]` / `STATUS_ACCENT[status]` reads are total.

**(4) DvrInfoScreen ratchet pin + status-owner scan — test-time red, correctly and unavoidably.**
`status-owners.test.tsx:118-147` is a source-text scan for object literals holding two or more
`colors.<severity>` reads; "no private status vocabulary re-grows" is not a type-expressible
property, so there is no compile-level alternative to hold out for. The scan is well-built by this
repo's own standards: it is pattern-keyed rather than name-keyed (its comment names W0/F2, W1/F16,
W2/F23 as the hand-typed-roster failures it is avoiding), it carries a PLANTED CONTROL
(`:136-137`) so a broken regex reds and names itself, and its one hand-typed roster is FILE NAMES
read through readFileSync, so a typo throws ENOENT rather than passing vacuously.
`RETENTION_SEVERITY` itself is `as const satisfies Record<RetentionStatus, StatusSeverity>`.
No finding.

**(5) TERMINAL_SCHEME — type-level indistinguishable from `scheme`, but the wave closed it the
only way this repo can, deliberately.** `TERMINAL_SCHEME` (`terminal-palette.ts:64`) and `scheme`
(`palette.ts:240`) are both the literal type `'dark'`, so they are freely interchangeable and no
type can tell them apart without a brand this codebase does not use. U7.1 found this itself by
mutation and wrote `terminal-palette.test.ts:80-113`, which vi.doMocks a coherent light app and
re-imports: a module reading the FORCED scheme is unmoved, one reading the APP scheme goes
light-grey on near-black. That is a real, non-vacuous pin for the module. I audited both
directions in the source and found **no mix-up**: `terminal-palette.ts:66` reads
`palette[TERMINAL_SCHEME]`, `NotesScreen.tsx:78` reads `palette[TERMINAL_SCHEME]` and `:61` reads
`TERMINAL_PALETTE.screen[scheme]`, `ImportTerminalProgress.tsx:227` reads
`TERMINAL_PALETTE.screen[TERMINAL_SCHEME]` — every one is the identifier its docblock names. Per
my persona's standing rule I do NOT propose a brand without a demonstrated mix-up, and there is
none. No finding.

**(6) Scheme-record discipline on new two-half records.** Two exist in the wave.
`mapTokens.ts:71-96` `MAP_GLASS_SCHEME` is `as const satisfies Record<ColorScheme, {…}>`, correct,
and it also ships the `MAP_GLASS_SCHEMES` export plus `rn-token-parity.test.ts:167`'s key pin so
the .mjs guard's hand-typed list is held honest against it (the W0/F2 PALETTE_KEYS precedent).
`terminal-palette.ts:74-77` is the LOW above.

**(7) Derived-count comments.** `TERMINAL_PALETTE.accent` is
`satisfies Record<ImportLogLevel, string>` and the "ten levels" claim checks out (10 keys, 10
members, plus a runtime half at `terminal-palette.test.ts:121-126`). `camera-chrome.ts:35-43`
states a 7-occurrence / 5-alpha census AND then explicitly refuses to assert it — "That census is
history the moment this module lands, so it is not asserted as a number; what
camera-chrome.test.ts asserts instead is that ZERO of them come back" — which is the right
resolution of exactly F49's hazard and is worth citing to future scan authors. The one stale count
in the wave is the drift-guard ladder, filed LOW above.

**Canonical homes / parallel entity declarations — none.** The wave adds exactly three
module-level type declarations (`OverlayHeaderVariant`, `OverlayHeaderProps`,
`MapFiltersSheetProps`), all local UI contracts. No Profile / DemoLocation / LocationForm /
MediaKind shape is re-declared anywhere in the diff, tests included.

**Props-type honesty (store-bridge rule) — clean.** `MapFiltersSheetProps` and
`OverlayHeaderProps` are data plus callbacks only; no store, no setter, no
`Record<string, unknown>` bag. Callback params are typed to the domain unions
(`onStatusToggle(statuses: readonly LocationMapStatus[])`,
`onRadiusChange(radius: RadiusPreset)`), not to string/number.

**Optional/required calculus.** `FieldError`'s `role?: 'alert'` (`_shared.tsx:672-677`) is
W2/F39's ratified shape applied correctly — the only meaningful value is spelled, `false` and
`'status'` are unrepresentable, and the docblock gives the reason (a role="alert" nested in a
role="status"). `OverlayHeaderProps.onBack?` / `backLabel?` carry a stated pairing rule enforced
by convention rather than by type; a single `{ onBack; backLabel }` member would collapse it the
way F39 did, but with four call sites and no wrong one shipped it does not clear my bar to file.

**readonly on shared/module data.** Correct on every new CONSTANT BLOCK (`as const` x6, three
probed KILLED) and on `MapCanvas.tsx:75-76` / `MapScreen.tsx:44`'s `Object.freeze([])` stable
empties. The gap is the style fragments only — the MEDIUM above.

**Boundary types / isolatedModules.** No new untrusted-input boundary type in this wave (no model
reply, PDF text, env var or URL param shape added or changed). All new cross-module type
re-exports use `import type` / `export type`; `tsc --noEmit --incremental false` EXIT 0 cold.

---

## Type Design Summary
CRITICAL: 0 · HIGH: 1 · MEDIUM: 2 · LOW: 2
Verdict: **REVISE**

| Check | Result |
|---|---|
| Canonical homes preserved (no parallel entity declarations) | **yes** — 3 new type declarations, all local UI contracts |
| Discriminated unions well-formed | **yes** — no new result/mode union ships a payload on the wrong arm |
| Exhaustiveness enforced | **yes** — record-arm, not switch; PROBE E puts a new `OverlayHeaderVariant` at TS2741 on the declaration. Zero new switch statements in the wave, so zero `default:` swallow sites |
| Correlated state modelled as a union | **flat shape found** — MapScreen's proximity trio (MEDIUM) |
| Id spaces typed (no bare-string registries/keys) | **yes** — no new `Record<string, …>`, no bare-string lookup where a finite union exists |
| readonly discipline on shared data | **gap found** — 35 of 35 new module-level style tables mutable; 36 assignments / 0 TS2540 against 3 shipped controls at TS2540 (MEDIUM) |
| Single-owner seams actually own their values | **no** — SAMPLE_BADGE owns 2 of 5 copies while claiming all (HIGH) |
| Boundary types honest about untrusted input | **n/a** — no boundary type added or changed |
| Mutation probes this round | **5 run — 2 KILLED (E, plus A's three negative controls), 3 SURVIVED (A, B, C)**, plus PROBE D which reproduced the F45 state exactly. Canonical sources throughout. Restores proven byte-identical; worktree torn down with the script's proof line |

Out-of-lane observations:
- `NotesScreen.test.tsx:75-80` — the test named "indexes screen with the APP scheme, not the console's forced-dark one" asserts `TERMINAL_PALETTE.screen[scheme]` equals `TERMINAL_PALETTE.screen.dark`, a tautology while scheme is 'dark'; it stays green through swapping `scheme` for `TERMINAL_SCHEME` in the source it names. The equivalent pin in `terminal-palette.test.ts:80-113` does it properly with vi.doMock. Tests lane.
- `u7.3-implementation-report.md:256` ("lived as byte-identical literals in TWO files") and its consume-me item 4 ("Two consumers") carry the false census behind the HIGH; both need correcting with the fix, and any ledger row should carry the re-derive day as its trigger.
- `MediaLibrarySheet.tsx:915-916`'s docblock asserts a shared appearance it does not import. Same fix as the HIGH; noted separately because a reader who fixes only the values will leave the comment claiming a link that still does not exist.
