# Vetted Review — W3 (phases U5+U6+U7, `feat/uiparity-w3` @ `13827de` vs `master` @ `6764a28`) — Round 1

**Verdict:** REVISE
**Lanes read:** typescript 0/0/1/1 APPROVE-wc · web 0/1/2/3 REVISE · tests 0/2/2/3 REVISE (28 probes, 7 SURVIVED) · silent-failures 0/1/3/1 REVISE · type-design 0/1/2/2 REVISE · integration report (4 hazards, 2 fixed in-assembly) — verification v5 lands separately, not waited on
**After dedupe:** 0 critical · 3 high · 12 medium · 10 low — **F51–F75** (24 raw lane items + 1 aggregator-filed from a lane out-of-lane note + 2 TRIGGER-LAPSED ledger rows → 25 findings)
**Unsettled (operator escalation):** 0
**Aggregator:** warm (`ab0635173e8414282`), same seat as W2. Cold gates at `13827de`, reproduced by three lanes: tsc 0 · 305 files / 4,194 passed | 2 todo · guard 143/143 · marketing wall clean.

## Unsettled — for the operator

None. Three adjudications settled at this desk: (1) the D12-amber convergence merged into ONE finding (F51 — the same defence broken on two independent axes); (2) the status-ratchet HIGH demoted to MEDIUM on four-precedent consistency (Dropped/demoted); (3) StoryRail's §89 residue ruled **D12-frozen** — the ratified freeze governs the specific surface over the ledger's general clause; recorded in §89's annotation, not escalated.

## Findings

### F51 [HIGH] D12's defended amber is defended by neither ownership nor measurement — `SAMPLE_BADGE` owns 2 of 5 byte-identical copies while its docblock claims all, and the ΔE guard scores a DELETED fill higher than the shipped one
Lanes: type-design — original label: HIGH (the trio duplication); silent-failures — original label: HIGH (the vacuous guard). Independent convergence on the two halves of one broken defence — the strongest confirmation shape this round.
File: `features/demo/ui/controls/sample-badge.ts:30-37` (+ the false census in its docblock, spot-checked: "Two surfaces paint it… One owner, one pin"); the three orphan copies (all in U7.2-edited files, spot-checked at `MediaLibrarySheet.tsx:915-926` — a docblock claiming "shared in appearance" over re-typed literals): `MediaLibrarySheet.tsx:917-926` · `MediaCaptureScreen.tsx:894-908` · `AudioPreviewScreen.tsx:199`; the vacuous guard: `__tests__/palette-contrast.test.ts:980-991` (badge composited at 12% alpha vs the RAW opaque `#7d5f10` — the alpha dominates; sfh measured: shipped 65.31, `warningLight`-at-badge-alpha 68.94 PASSES, **no fill at all 77.62 PASSES**, all vs a >10 bound); `u7.3-implementation-report.md:256` + its consume-me item 4 carry the same false census.
Issue: D12's third arm is an owner-ratified CORRECTNESS constraint (the provenance mark of sampled data). Today it holds by five hand-typed literals happening to agree, guarded by a test that cannot fail for the reason D12 names — sfh's probes B (warningLight at the badge's alpha) and C (fill deleted) survive the whole 4,194-test suite. The authorized re-derive day ("only if A15's warningLight would collide") reads "Two consumers", moves the module, and ships two different sample ambers in one session — unmeasured. The correct pattern is one file away in the same wave (`terminal-palette.ts` migrated ALL its copies) and 300 lines away in the same test (row 33's two-sided composite).
Fix (one root fix, per-seat by file): import `SAMPLE_BADGE` at the three sites — zero rendered bytes move (U7.2); correct the docblock census + report/consume-me, and rewrite the ΔE case to composite BOTH sides (`flatten([severityTone('warning').background, ...CARD])`, same for error/info) with sfh's tautology control — a fully transparent fill must FAIL the bound (U7.3). Re-run sfh's probes B/C and confirm both kills. The looser 0.06–0.28 amber family is explicitly NOT this finding (td's completeness sweep).
Owner: `aee070c22b4ac8667` (U7.2 — the three consumer files) · `aed41144d930dc6f7` (U7.3 — `sample-badge.ts`, `palette-contrast.test.ts`, its report)

### F52 [HIGH · TRIGGER-LAPSED §89] Accent-as-text: U5.4 moved the map card's only call/e-mail affordance from 5.07:1 to 2.88:1 (PASS→FAIL), and §89's un-defer condition has now occurred unmet
Lanes: web — original label: HIGH (calibrated helper reproduces the repo's own published figures to ±0.02; five-site family; the §89 grep still returns four `color:` sites outside token modules)
File: `screens/map/LocationDetailCard.tsx:88` (`tapRow` — spot-checked: `color: colors.primary` with the phone cite and NO measured ratio; the pin at `LocationDetailCard.test.tsx:253-259` ratifies it) · `screens/map/CaseMapPicker.tsx:178` (selected title 4.12→3.09) · `settings/panes/_pane-chrome.tsx:117` (the `85%` readout at 3.94 on `background`) · §89 residue: `SplashScreen.tsx:61,63,96`, `StoryRail.tsx:75` (all 3.94).
Issue: §89's own text sets the severity ("any site still measuring < 4.5 after U6 merges reopens this at HIGH") and its named grep condition holds at head; no U6 report contains the re-measure. The house rule is stated three ways inside this same wave (`SettingsNavBar`'s BACK_TINT docblock, `CompletionScreen`'s CTA, D5's `MAP_FILTER_BADGE_FILL` precedent one file from the regression) — U5.4 moved a contact row onto a value worse than every figure a sibling package measured and called failing. `colors.link` measures 7.02/7.54 on the same stacks.
Fix: re-point `tapRow`, `CaseMapPicker`'s selected arm and `_pane-chrome:117`'s `settingValue` to `colors.link`; move the pins and docblocks with the values (W2/F27's shape — bound the RATIO at the constant, not the hex). §89's residue is ruled at this desk (ledger annotation): **StoryRail = D12-frozen, no re-point, recorded as the freeze's documented ceiling; SplashScreen ×3 re-cut to U8.1's re-base.** Divergence-from-phone recorded at each site with the C.3 citations, phone-side follow-up to plan §8.
Owner: `af7b6cf9a5a92efa1` (U5.4 — the two map files) · `a0563f8ce601ff95e` (U6.2 — `_pane-chrome.tsx:117`)

### F53 [HIGH] The A94/D13 mono policy is enforced by a source scan a dead constant satisfies — the demo's signature surfaces can lose the scanner face with all 4,194 tests green
Lanes: tests — original label: HIGH (MONO1/2/3 all SURVIVED full-suite; negative control KILLED — the scan runs, membership is `text.includes`, so an unconsumed constant or docblock satisfies it)
File: `__tests__/fonts.test.ts:137-195`; unobserved surfaces: `TerminalLine.tsx` (five render sites), `StoryRail.tsx` (×2), `SplashScreen.tsx:23`, `BootSequence.tsx:26`, `ImportTerminalProgress.tsx:180`. The only font render pins in the demo are `OcrCaptureScreen.test.tsx:70-90` and `NotesScreen.test.tsx:159`.
Issue: the commit that landed the policy is titled "codified and **pinned**" — codified yes, pinned no. `css: false` makes inline `fontFamily` the only observable, and it is unobserved on the terminal, the rail and the HUD — the surfaces D13 exists for. W0/F11's precedent (silent survivor on the round's own load-bearing deliverable, no compensating gate) holds this at HIGH.
Fix: one render pin per `SCANNER_ONLY` file plus `StoryRail`, in `OcrCaptureScreen.test.tsx:67-72`'s exact shape (`toContain('--font-stmono')` AND `not.toContain('--font-jbmono')`); `TerminalLine.test.tsx` and `ImportTerminalProgress.test.tsx` already mount their subjects. Re-run MONO1/2/3 and confirm the kills.
Owner: `aed41144d930dc6f7` (U7.3 — the policy's author; U7.1's terminal test files route here, that seat is retired)

### F54 [MEDIUM] The "no local STATUS map" ratchet bans one SPELLING of the shape — nested literals, `*Light` reads and computed template-key reads (F26's own form) all walk past it
Lanes: tests — original label: HIGH (DEMOTED, see Dropped/demoted). P12-nested / P12-light / P12-computed SURVIVED; flat control KILLED.
File: `screens/__tests__/status-owners.test.tsx:126-138`; the claim at `:105-116` cites W2/F26 as its reason and cannot see F26's shape.
Issue: `\{[^{}]*\}` sees only brace-free literals and `colors\.(error|…)\b` only bare severity names. A re-grown private vocabulary in the two forms this campaign has actually shipped lands green in all four OWNED files.
Fix: tests' three-part prescription — brace-balanced slicing (or recursion), widen the token pattern to `[A-Za-z]*\b` + the computed bracket form, and add all three surviving forms to the planted-control case so roster completeness is asserted. Re-run all four probes. PRESCRIPTION-UNVERIFIED (the widened predicate itself was not executed).
Owner: `a9f361c07c5747b81` (U6.4b — the ratchet is its mandated pin; it also takes F55's two `status-owners` lines, one writer per file)

### F55 [MEDIUM] Two W3-new pins spell `severityTone()` fills/foregrounds as raw `*Light` palette tokens — the F26-pin class the integrator declared and fixed three siblings of, missed in U6.4a's and U6.2's files
Lanes: typescript — original label: MEDIUM; tests — original label: MEDIUM. Independent, same files, same probe design (a seam re-tint reds exactly these two files plus the two intended anchors).
File: `__tests__/field-recipe-sweep.test.tsx:471,:476/478` (zero `severityTone` imports in the file) · `screens/__tests__/status-owners.test.tsx:183,:186` (+`:93` touch-point); production reads the seam (`Banner.tsx`, `_pane-chrome.tsx`).
Issue: a legitimate seam re-point reds these files naming a palette token — the cheapest repair ratifies the change with no oracle. The integrator's own §5.3 rule ("any new pin that spells a Banner fill as a `*Light` token is the same defect") applies; its 2-of-4 sweep ran over U7.2's files and missed U6's. ts's second-order catch folds in: the `:469-470` comment credits the wrong line (the `not.toContain('rgba')` is the real anti-wash guard).
Fix: read the seam in the POSITIVE assertions (both lanes' identical prescription; negative assertions stay in palette terms per the integrator's ruling); correct the comment. Re-run the seam probe — only `status.test.ts` + `palette-contrast` should red.
Owner: `ad9302749c2672c0c` (U6.4a — `field-recipe-sweep.test.tsx`) · `a9f361c07c5747b81` (U6.4b — the `status-owners` lines, with F54)

### F56 [MEDIUM] The A93 em-dash guard fails OPEN on one unbalanced paren inside a console string — everything after it in the file is silently exempt
Lanes: silent-failures — original label: MEDIUM (probe: planted violation KILLED; same violation + one `(` in a console string above it SURVIVED)
File: `__tests__/copy-rules.test.ts:139-159`.
Issue: the paren-depth blanker is string-blind; a `(` inside a console argument's string erases coverage to the next stray `)`. Latent (zero such strings today) — hence MEDIUM.
Fix: treat quoted runs as opaque while matching parens (track quote state + escapes), plus a case planting a `(` inside a console string proving a later rendered string still reds.
Owner: `aed41144d930dc6f7` (U7.3 — the guard's author)

### F57 [MEDIUM] The FROZEN em-dash exemption is applied per LINE, discarding its own string key — a new violation sharing a line with a frozen phone-verbatim string is excused
Lanes: silent-failures — original label: MEDIUM (probe: second demo-originated key appended to a frozen string's line SURVIVED)
File: `__tests__/copy-rules.test.ts:187`.
Issue: the third consecutive wave of the exemption-broader-than-its-reason class (F32 file-for-role, F33 line-for-arm, now line-for-string) — on a scan shipped after both rulings. Blast radius: 5 lines / 5 files.
Fix: sfh's one-liner — match at the occurrence index (`at >= s && at < s + text.length`).
Owner: `aed41144d930dc6f7` (U7.3 — same file as F56, one commit)

### F58 [MEDIUM] On a token-less mount the filters sheet instructs a long-press on a map that is not rendered, and the host announces a "current view" that is a frozen constant
Lanes: silent-failures — original label: MEDIUM (render probe: the contradiction reproduces on shipped code with no mutation)
File: `screens/map/MapFiltersSheet.tsx:388` (the unconditional hint) · `MapScreen.tsx:41,381-388` (the three anchor provenances collapsed to two notices).
Issue: the Mapbox fallback panel announces itself honestly and the sheet mounted over it contradicts it — a cause-collapse, not substituted data (the counts are real).
Fix: either of sfh's two — a `canPlaceRing` boolean from the host swapping the hint, or split the `!plotted` arm on whether `getCenter()` returned, with a `DEFAULT_MAP_CENTER` sentence promising neither a view nor a gesture.
Owner: `a54e06ec295ee45be` (U5.3 — both touch-points are its reachability, per its own comment)

### F59 [MEDIUM] WCAG 2.5.3 Label in Name — three new map controls are unreachable by voice input
Lanes: web — original label: MEDIUM
File: `MapFiltersSheet.tsx:303` ("Done" → "Apply filters and close"), `:372` ("0.5 km" → "0.5 kilometre radius" breaks the `km` token) · `MapControls.tsx:419` (the chip). All three pinned as literals, so the divergence is ratified.
Issue: the accessible name omits the visible text; speech-input users cannot address the controls by what they read. The repo states the rule in-tree this same wave (`ImportTerminalProgress.tsx:618-622`) and solves it with `aria-describedby`.
Fix: keep the visible string inside the name ("Done, apply filters" / "{preset} km radius" / "Proximity filter, {radius} km, showing {n} of {m}"), or the `aria-describedby`+srOnly pattern already constant-ed at `:205-215`. Move the two literal pins.
Owner: `a54e06ec295ee45be` (U5.3 — the sheet's two) · `af52d302ebd6d0f94` (U5.2 — the chip)

### F60 [MEDIUM] `MapFiltersSheet` adds NEW `textTertiary` body text at 4.23:1 — D5's rider verbatim, contradicted by the same file's own exported-label docblock
Lanes: web — original label: MEDIUM
File: `MapFiltersSheet.tsx:186-187` + `:388`.
Issue: "do not ADD new `textTertiary` text" (D5 rider); two sibling packages cite the rider while routing away from the token; this file's `MAP_FILTER_SECTION_LABEL` docblock names the sub-AA measurement on this exact tier, then `:187` paints the hint at it.
Fix: `colors.textSecondary` (5.82 worst on the same stacks) — one token; or a named D5 inheritance + ledger row, not silence. Interacts with F58 (the hint's copy may change in the same commit).
Owner: `a54e06ec295ee45be` (U5.3)

### F61 [MEDIUM] 35 new module-level style tables ship mutable — the F20/F38 census re-opened a third time, larger, one wave after it closed
Lanes: type-design — original label: MEDIUM (36 assignments / 0 TS2540; three shipped `as const` controls KILLED in the same run)
File: 12 files, td's enumerated census (the wave applied the standard to its six CONSTANT BLOCKS and missed every style fragment). `fieldLabelStyle`/`fieldErrorStyle` are the worst instance — 12 importers.
Issue: same invariant, same fix, third recurrence; the class needs a durable close, not another sweep — but no lane proposed a mechanical guard that isn't a string scan, so the fix stays per-site this round and the recurrence is named in pipeline notes for the W4 briefs.
Fix: `} as const satisfies CSSProperties` (Record-form for `CONTROL`) per site. Routing, one seat per file: `field-input.ts` → U6.4a · `MapFiltersSheet.tsx` → U5.3 · `MapControls.tsx` → U5.2 · `OverlayHeader.tsx`, `MediaLibrarySheet.tsx` → U7.2 · `LocationDetailCard.tsx`, `LocationRow.tsx`, `MapBottomSheet.tsx`, `SheetHandle.tsx` → U5.4 (U5.1 territory; that seat is retired) · `OcrCaptureScreen.tsx` → U7.3 · `export/ExportCaseCard.tsx` → U6.4b (U6.3 territory; retired).
Owner: as routed above (primary volume: U5.x)

### F62 [MEDIUM] MapScreen's proximity state is three independent hooks, so "proximity ON but not filtering" is live during the chunk-load window — and the chip announces a filter that is not running
Lanes: type-design — original label: MEDIUM
File: `MapScreen.tsx:167-171, :232-237, :375-390`; the chip at `MapControls.tsx:411-424`.
Issue: `setProximityActive(true)` commits synchronously before the Turf chunk resolves; the failure path is handled, the loading window is not; the chip prints "2 km · 9 of 9" over a map with no ring — the assertion `MapScreen.tsx:28-34`'s own comment forbids for the sibling path.
Fix: td's cheap alternative is sanctioned here: gate the chip (and the announced counts) on `proximityResult !== null` — one condition, checkable. The three-state union stays available if the seat prefers the house `RetentionView` shape; say which.
Owner: `a54e06ec295ee45be` (U5.3 — the seat whose caller re-opened the branch; the chip-gate lands in `MapScreen`'s projection)

### F63 [MEDIUM] `ImportTerminalProgress` ships a private three-arm severity-title table off `severityTone` — the F26 class, live, in the same wave as the ratchet built to ban it (and outside that ratchet's scope)
Lanes: aggregator (from the tests lane's out-of-lane observation; filed with the same proof burden — the table at `:372,387,399` reads `colors.successOnLight|warningOnLight|errorOnLight` where `severityTone(sev).color` is the seam's same value)
File: `screens/import/ImportTerminalProgress.tsx:372,387,399`.
Issue: a private trio off the seam, in a file outside `status-owners`' four-file OWNED scope — exactly the escape route F54 documents. One consumer, no rendered difference today; the seam's docblock claims every severity surface resolves through it.
Fix: `severityTone(sev).color` at the three arms (one line each); add the file to the ratchet's OWNED scope when F54's predicate widens.
Owner: `aed41144d930dc6f7` (U7.3 — U7.1's file; that seat is retired)

### F64 [MEDIUM · TRIGGER-LAPSED §103] U7.2 rewrote `MediaLibrarySheet` and the focus-restore family moved not at all — five mount-time `activeElement` blocks and two `aria-modal` shells with no trap remain
Lanes: aggregator (ledger audit — §103's trigger: "U7.2 opening `MediaLibrarySheet`. The mover extracts the hook…"; measured at head: zero `useOpenerFocusReturn` anywhere, five `activeElement` hits across the three named files)
File: per §103 — `MediaLibrarySheet.tsx` (fullscreen block), `ExportActionSheet.tsx:124-130`, `PdfPreview.tsx:129`; `CentredDialog.tsx:239-262` still holds the only correct mechanism, private.
Issue: the row's mover-obligation fired and was not performed or mentioned; this is the reopening mechanism working, not new analysis.
Fix: §103's own prescription — extract `useOpenerFocusReturn(ref)` from `CentredDialog`, adopt in `MediaLibrarySheet`'s fullscreen block, fix the stale `AlertDialog.tsx:55-61` citations; the remaining sites follow one line each (ExportActionSheet/PdfPreview may ride or re-defer with the row re-cut — say which in the fix report).
Owner: `aee070c22b4ac8667` (U7.2)

### F65 [MEDIUM · TRIGGER-LAPSED §112] U7.3 opened `OcrCaptureScreen` and the engine's OCR confidence colours — including the unnamed `#ff7a45` — were neither enumerated nor ruled
Lanes: aggregator (ledger audit — `ocr.ts:272-278` still returns `color: string` with the fifth hue at `:278`)
File: `engine/logic/ocr.ts:272-278`; consumer `OcrCaptureScreen.tsx`.
Issue: the trigger fired unmet. One authority note, flagged for the orchestrator rather than silently re-cut: the fix changes a §2-protected engine signature, which U7.3's row does not authorize — **the fix brief must carry the orchestrator's D20-style authorization (U3.2's mid-task ruling is the precedent), or this row re-cuts to U8 exit with that stated as the reason.**
Fix: return a `ConfidenceLevel` enum, map to colour in the UI (`Record<Level, string>`), and RULE on `#ff7a45` (name a token or collapse to the four-band vocabulary) — §112's text.
Owner: `aed41144d930dc6f7` (U7.3), conditional on the authorization above

### F66 [LOW] `settings-palette-sweep`'s exemption is keyed by hex for a per-site reason
Lanes: tests — original label: MEDIUM (DEMOTED); silent-failures — original label: LOW. Same finding, independent probes (SP2 / the planted `#5d7a9a`), sfh's bound decides: the ban case carries no exemption and killed; the leak is one non-palette grey in the inventory case only.
File: `settings/__tests__/settings-palette-sweep.test.ts:32-43`.
Fix: key `ALLOWED` by `path:hex` (F32's remedy); re-run SP2.
Owner: `a0563f8ce601ff95e` (U6.2)

### F67 [LOW] `camera-chrome.test.ts`'s "POSITIVE CONTROL" asserts over strings it builds itself — a claim defect, not a coverage hole (the real scan killed a planted re-inline)
Lanes: tests — original label: LOW
File: `screens/__tests__/camera-chrome.test.ts:91-105`.
Fix: restate the comment (it proves `norm`, not the scan) or add one length assertion on the real haystack.
Owner: `aee070c22b4ac8667` (U7.2 — camera chrome is D17/U7.2 territory)

### F68 [LOW] The drift guard's schedule ladder says 135 rows; it produces 143 — F49's class, same block, next wave
Lanes: type-design — original label: LOW (measured by running the guard; the GATE derives correctly — comment-only)
File: `.design-sync/check-rn-parity.mjs:281-288`.
Fix: add the `U5.1 (LANDED) +8 → 143` line. One line, one number.
Owner: `af7b6cf9a5a92efa1` (U5.4 — U5.1's addition; that seat is retired)

### F69 [LOW] `banner.test.tsx:319` still says "a FOUR-entry list" over the ten-entry union
Lanes: tests — original label: LOW
File: `controls/__tests__/banner.test.tsx:316-322`.
Fix: "a fixed list" — the anti-vacuity argument needs no number (the F48 rule the docblock itself cites).
Owner: `aace40599f45bd260` (integrator — its union, its sibling counts already fixed in hazard #4)

### F70 [LOW] `modals.test.tsx:232` fixtures the pre-A93 em-dashed `pdf-extract` message
Lanes: tests — original label: LOW
File: `screens/__tests__/modals.test.tsx:232` vs `import/pdf-extract.ts:48`.
Fix: update the fixture to the shipped copy.
Owner: `aed41144d930dc6f7` (U7.3 — A93's owner)

### F71 [LOW] The PaneNote-vs-Banner glyph pin optional-chains both sides of a `toBe` — `undefined === undefined` passes when BOTH glyphs vanish
Lanes: typescript — original label: LOW (probed: shared-`BannerIcon` break survives this file and is caught by three others; the isolating direction kills — weak assertion, not a hole)
File: `settings/__tests__/pane-chrome.test.tsx:151`.
Fix: `!` on both (the `:141-142` idiom in the same file) or a `toBeTruthy()` first.
Owner: `a0563f8ce601ff95e` (U6.2)

### F72 [LOW] `MapControls.chipBody` declares `paddingLeft` then the `padding` shorthand in one object — a dead key today, the tripwire's trap the day it turns state-dependent
Lanes: web — original label: LOW
File: `MapControls.tsx:246-257`.
Fix: delete `paddingLeft: 12` (the shorthand already spells it).
Owner: `af52d302ebd6d0f94` (U5.2)

### F73 [LOW] The proximity chip's `role="status"` mounts already populated, so activation is never announced — the sibling sheet ships the correct empty-then-set idiom two files away
Lanes: web — original label: LOW (U5.2's own D-5, half-closed by U5.3; fixed now rather than ledgered)
File: `MapControls.tsx:456-467`; the idiom: `MapFiltersSheet.tsx:249-267` / `ExportModal.tsx:124-139`.
Fix: apply the empty-then-set idiom. D-5 needs no ledger row once this lands.
Owner: `af52d302ebd6d0f94` (U5.2)

### F74 [LOW] `OverlayHeader` can render a nameless icon-only button — `backLabel` is prose-required, type-optional
Lanes: web — original label: LOW; typescript — out-of-lane concurrence (independent identification)
File: `chrome/OverlayHeader.tsx:85-101,149-152`. All four callers pass it; latent on a brand-new shared seam.
Fix: the discriminated pair (`{ onBack; backLabel } | { onBack?: undefined; backLabel?: undefined }`) — `SettingsNavBarProps`' own shape this wave.
Owner: `aee070c22b4ac8667` (U7.2 — the component's author)

### F75 [LOW] `TERMINAL_PALETTE.screen` names no `ColorScheme` — F45's exact shape in a module created after F45 closed
Lanes: type-design — original label: LOW (probe reproduces the pre-F45 state: test-file TS2339 only)
File: `screens/import/terminal-palette.ts:74-77`; the correct sibling: `mapTokens.ts:96`.
Fix: `satisfies Record<ColorScheme, string>` inside the existing `as const`.
Owner: `aed41144d930dc6f7` (U7.3 — U7.1's module; retired)

## Dropped / demoted lane findings

| Lane item | Lane · label | Disposition | Reason |
|---|---|---|---|
| Status-ratchet evasion forms | tests · HIGH | DEMOTED → F54 MEDIUM | The scan-gap class has held MEDIUM four times (F16/F23/F32/F33): no live violation inside the scan's OWNED scope (the one live off-seam trio is OUTSIDE it and is filed separately as F63), the fix is one predicate commit, and re-grown trios have in practice been caught by review (F26, F63 — both found by lanes, not gates). tests' framing ("bans a spelling, not the shape") is right and is quoted in the finding. |
| settings-sweep hex-keyed exemption | tests · MEDIUM + sfh · LOW | MERGED → F66 LOW | sfh's empirical bound decides: the palette-hex ban carries no exemption mechanism and KILLED its control; the leak is one non-palette grey in the inventory case. F32's MEDIUM covered a two-file full-role hole; this is materially smaller. |
| F26-class pins ×2 files | ts · MEDIUM + tests · MEDIUM | MERGED → F55 | Same files, same probe, same prescription — model cross-lane confirmation. |
| D12 trio duplication + vacuous ΔE guard | td · HIGH + sfh · HIGH | MERGED → F51 HIGH | Two halves of one broken defence; one root fix, two seats by file. |
| MapFiltersSheet sr-only constant duplicated from ExportModal | sfh · out-of-lane | not filed | Disclosed at source in its own comment as a proposed deferral; a one-constant duplication with no drift surface worth a row — refused as both finding and row (recorded here). |
| `NotesScreen.test.tsx:75-80` tautological scheme pin | td · out-of-lane | folded into F75's commit as a touch-point | Same module, same owner; the real pin exists at `terminal-palette.test.ts:80-113` — the tautological sibling gets the one-line honest retitle or deletion. |
| Integration residual §5.1 (PaneNote/Banner glyph unpinned) | integrator | REFUTED by the tests lane at source | `pane-chrome.test.tsx:126-155` pins it relationally; recorded as the wave's strongest F26-shaped guard. F71 is the one weak character in it. |
| `CompletionScreen.tsx:151` Label-in-Name | web · out-of-lane | not filed | Pre-existing on master, outside the diff (contract: pre-existing drift is context). |
| ts out-of-lane: Completion blocked-CTA `title` | ts · out-of-lane | not filed this round | Pre-existing string newly keyboard-reachable; noted for U8's a11y pass in pipeline notes. |

**Report-level deferral dispositions:** U5.2's D-5 → **fixed now (F73), no row**. U7.3's D-2 (the one engine em-dash message) → **§121 written** (one string, engine copy outside A93's ui/ scope, concrete trigger). U7.3's D-3 (viewfinder `#1e3a5f` as `rgba()`) → folded into **§120** as its second witness. sfh proposed no rows; no other report proposal surfaced by the lanes.

## Owner routing summary (one row per seat per file)

| Owner | Findings (files) |
|---|---|
| `a54e06ec295ee45be` U5.3 | F58, F59, F60, F61 (`MapFiltersSheet.tsx`) · F62 (`MapScreen.tsx` chip gate) |
| `af52d302ebd6d0f94` U5.2 | F59, F61, F72, F73 (`MapControls.tsx`) |
| `af7b6cf9a5a92efa1` U5.4 | F52 (`LocationDetailCard.tsx`, `CaseMapPicker.tsx`) · F61 (four U5.1-territory files, seat retired → here) · F68 (guard ladder) |
| `a0563f8ce601ff95e` U6.2 | F52 (`_pane-chrome.tsx:117`) · F66, F71 (settings tests) |
| `ad9302749c2672c0c` U6.4a | F55, F61 (`field-recipe-sweep.test.tsx`, `field-input.ts`) |
| `a9f361c07c5747b81` U6.4b | F54 + F55's lines (`status-owners.test.tsx`, one writer) · F61 (`ExportCaseCard.tsx`, U6.3 retired → here) |
| `aee070c22b4ac8667` U7.2 | F51 (three consumer files) · F61 (`OverlayHeader.tsx`, `MediaLibrarySheet.tsx`) · F64, F67, F74 |
| `aed41144d930dc6f7` U7.3 | F51 (`sample-badge.ts` + ΔE pin) · F53, F56, F57, F61 (`OcrCaptureScreen.tsx`), F63, F65 (authorization-conditional), F70, F75 |
| `aace40599f45bd260` integrator | F69 |

Retired-seat routing stated: U5.1 → U5.4 · U6.1/U6.3 → U6.4a/U6.4b by file · U7.1 → U7.3.

## Lanes to resume for the fix-delta

All five, scoped to their own findings plus the fix diff: tests (F53/F54/F55 probe re-runs — the heaviest), sfh (F51's B/C kills, F56/F57/F58), web (F52 re-measure, F59/F60), type-design (F51 census, F61's 35 sites, F62, F75), typescript (F55, F71). Verification: F52's two map surfaces and F60's hint want a targeted re-cut after fixes.

## Ledger interaction

**Struck ✅ RESOLVED — W3 (`feat/uiparity-w3`):** **§100** (DvrInfo pill adopted `CheckboxBox` ×2, EXEMPT entry hand-deleted — the tombstone comment records it) · **§102** (`T.textDim` DELETED, not re-pointed — no palette sibling; residual hits are comments) · **§108** (A93 sweep landed with a live guard; tests probed the kill both directions) · **§110** (U7.3 took both jobs: the ambers stay per D12, `import-data-found` on the nested tier with the radius ruling in-code at `ImportModal.tsx:188-190`; the failure list keeps translucent red as a LIST per the row's own Banner-refusal) · **§114** (`ElevatedEdges` imported at `MediaLibrarySheet.tsx:27`) · **§117** (textarea `minHeight: 100` with the phone cite at `_shared.tsx:520-526`).
**Trigger-lapsed:** **§89 → F52** (annotated: the W3-owned three sites fix now; SplashScreen ×3 re-cut to U8.1; **StoryRail ruled D12-frozen** — the ratified freeze governs the surface, recorded as its documented ceiling) · **§103 → F64** · **§112 → F65** (with the authority condition).
**Annotated:** **§105** (U6 declined the icon slot WITH an in-code ruling, `_shared.tsx:166` "## No leading icon prop"; the U8-exit hard stop stands — A60 COMPLETE or owner-ratified divergence) · **§107** (second misfire of an actor-without-authority trigger — U6.4a opened the files but holds no D20 behaviour authority; re-cut to **U8's closing motion pass**, which owns motion-value parity).
**Rows written:** **§120** — the RETIRED sweep matches hex spellings only; a retired colour re-spelled as `rgb()`/`rgba()` passes (two witnesses this wave: U5.1's local `mapTokens` rgb-ban compensation, U7.3's R-9 viewfinder `#1e3a5f`-as-rgba); trigger: the next commit that retires a palette value adds the rgb-form needle in the same commit, or U8.2's sweep adds a hex→rgb normalizer to the sweep itself. **§121** — one em-dashed engine message renders via `MediaCaptureScreen` (A93's sweep is scoped to `ui/`); trigger: the next package that opens `engine/logic/media`'s strings, or U8's exit copy pass.
Standing rows checked and unmoved: §99 (U8 flip) · §101 · §104 (U4.5 — not W3) · §106 · §109 · §113 (sweep unowned; `CoordinateDisplay` still ×2) · §115 · §116 · §118 · §119 (fix-delta lanes: re-run `tsc --noUnusedLocals` and report the count as W3 packages were obliged to clear their files).

## Agent IDs

Lane seats: fresh W3 seats — IDs in the orchestrator's dispatch record (still not printed in lane files; fifth round of the ask). Implementers: U5.2 `af52d302ebd6d0f94` · U5.3 `a54e06ec295ee45be` · U5.4 `af7b6cf9a5a92efa1` · U6.2 `a0563f8ce601ff95e` · U6.4a `ad9302749c2672c0c` · U6.4b `a9f361c07c5747b81` · U7.2 `aee070c22b4ac8667` · U7.3 `aed41144d930dc6f7` · integrator `aace40599f45bd260` · aggregator (this seat) `ab0635173e8414282`. Retired: U5.1, U6.1, U6.3, U7.1 (territory routed above).

## Pipeline notes

- **The wave's theme, fourth wave running:** source-scan guards whose pattern or exemption is narrower than the claim written beside them — F53 (includes-membership), F54 (one spelling), F56/F57 (string-blind blanker, line-keyed freeze), F66 (hex-keyed allow). W2's counter-example brief line (`one-switch-renderer`'s no-exemption + anti-vacuity shape) demonstrably did not reach the W3 scan authors; **the W4 briefs should carry it as a named convention**, and every new scan should ship its own planted-control the way `status-owners` and `camera-chrome` did — both of this wave's best and worst scans have one, so the control alone is not sufficient; the control must exercise the CLAIM (F67's lesson).
- **Cross-lane confirmations:** F51 (td × sfh, opposite ends of one defence — the round's strongest signal) · F55 (ts × tests, same probe design independently) · F74 (web + ts) · F66 (tests × sfh).
- **Trigger-lapse yield:** this round's ledger audit produced six strikes, two lapses-to-findings and two annotations — the highest-churn round yet, expected as W3 was the named trigger for much of W2's ledger. The two lapses share a shape worth naming: **rows whose trigger names a package without the authority to perform the action** (§107 twice, §112, arguably §103's hook). When I write rows from now on, the trigger will name the ACTION's authority, not just the opener.
- **F26's descendants:** the class is now three findings wide in one wave (F55 pins, F63 live trio, F54's predicate that cannot see it). The seam-relational idiom is winning where applied (`banner.test`/`pane-chrome` refuted the integrator's own residual-risk claim); the gap is authorship habits, not mechanism.
- **Integration quality:** the branch-collision recovery (§0) was handled exactly right (ancestry proven before re-point, no force-push). Hazard #3's 2-of-4 sweep miss became F55; hazard #4's stale-count fix missed its twelve-lines-away sibling (F69) — partial sweeps are this integrator's recurring edge, third instance (W2 F36's I-5-applied-at-one-hunk).
- **Verification:** v5's captures land separately; F52's re-measure and F60's hint are the two rendered checks its delta set should prioritise. The web lane's calibrated-helper discipline (reproducing the repo's published ratios before measuring new ones) is the standard to keep.
