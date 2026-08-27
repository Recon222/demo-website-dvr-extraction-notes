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
