# Plan review r1 — FIX-DELTA, REALITY-CHECK lane

**Agent:** `plan-reality-checker`, resumed warm from r1. **Base:** `3365e3e` → **head:** `011b0c8`.
**Diff reviewed:** `git diff 3365e3e -- docs/planning/demo-phone-ui-parity/` — matrix `+183/-…` (748L), plan `+178/-…` (529L), one corrected `phone-ui-delta-inventory.md` row, HANDOFF.
**My r1 findings:** REAL-1..14 → V-13, V-14, V-15, V-16, V-5, V-38..V-46. FIX-MAPPING claims **FIXED** on all 14.
**Method:** unchanged from r1 — every corrected `file:line` re-opened at source (demo worktree; phone repo read-only), the totals re-parsed from the row cells by script, and the whole diff's new citations resolved mechanically to catch anything the fix round introduced.

## Verdict per finding

| r1 | V-ID | Result | Evidence |
|---|---|---|---|
| REAL-1 | V-13 | **FIXED-VERIFIED** | A65 → `Button.tsx:142-145` + `:215-217`; A66 → `:146-157` (outline `:146-153`, ghost `:154-157`) + `:227-232`; A67 → `:158-161` + `:233-235`. All six ranges re-opened at `main`: `:142` `secondary: {`, `:146` `outline: {`, `:154` `ghost: {`, `:158` `danger: {`, `:215` `secondary: {` (label), `:227`/`:230` outline/ghost labels, `:233` danger label. **Exact.** A64 (`:114-140`, `:279-286`) and A68 (`:81-111`) left untouched as instructed. The mechanical tell is gone: no `Button.tsx` citation is past EOF anywhere in either doc. |
| REAL-2 | V-14 | **FIXED-VERIFIED** | B.8 row 77 (`:349`) now reads `**—**`, names the phone's `ImportResultDetails.tsx` (+27/-5) as the verdict's true owner, and states outright that it does **not** belong to `ImportResultBody.tsx` (+247/-93), pointing at B.6 row 79. Both diffstats match my `git diff --numstat` re-derivation. B.6 row 79 (`:305`) still owns `ImportResultBody`. The contradiction is closed; B.8 still totals 15 rows. |
| REAL-3 | V-15 | **FIXED-VERIFIED** (three places) — one residual, see **REAL-D-1** | A87, D8 and U8.1 each now say: the file is **106 lines**, `:43-48` asserts a **FLOOR** `expect(alpha).toBeGreaterThanOrEqual(0.65)`, and `#000314` appears only in the `:41` comment and `SplashScreen.tsx:129`'s prose, never as an assertion. Re-verified: `wc -l` = **106**, `:48` is the floor, `:41` is the comment. D8 goes further than the finding asked and is right to: it records that `#002853` is lighter so the ratio **falls**, that the floor may need raising to hold 5.27:1, and that the `:41` comment's arithmetic needs rewriting. |
| REAL-4 | V-16 | **FIXED-VERIFIED** | Both docs now cite **`_shared.tsx:397`** (gradient, inside `WizardHeader` declared `:394`) and **`TabBar.tsx:75`** (+ borderTop `:76`, padding `:77`, boxShadow `:80`) — every one re-opened and exact. Both name the *wrong* anchors explicitly (`:418` = `WizardNext`'s closing brace, `:62` = a JSDoc line) so they cannot be re-introduced. The surviving `TabBar.tsx:62` string is inside the accuracy note documenting the fix, not a live citation. |
| REAL-5 | V-5 | **FIXED-VERIFIED** | U0.1's Matrix-rows column now reads `A1–A9, A19, **A27**, A28, …`; its ADD list carries **`link #b8d4f0`** and **`linkHover #d0e4f7`** — both confirmed at phone `Colors.ts:208-209`. A27's Phase cell is `**U0** (token) / U2, U6 (adoption)`. All four spenders (U2.2, U2.4, U6.1, U6.2) now read `palette.link` with the literal only in parentheses plus *"created in U0.1 — reference the token"*. By-phase U0 = **19**, U2 = **15** — both re-derived by script. |
| REAL-6 | V-38 | **FIXED-VERIFIED** | Re-parsed all 97 rows from the cells: 97 rows, IDs A1–A97, no gaps, no duplicates. Every bucket header now equals its own list **and** every listed ID's Status cell agrees: DRIFTED 41 · MISSING 24 · MISSING-SEAM 21 · COMPLETE 7 · OPTIONAL 1 · PARTIAL 1 · N/A 1 · OUT 1 = **97**. Zero rows fall outside a printed list. Effort **S 53 · M 35 · L 5 · no-effort 4** matches my independent parse exactly. By-tier note (`:665`), grand total 215 (`:670`) and by-phase U0 19 / U1 15 / U2 15 all reconcile. The FIX-MAPPING note that these were re-derived by script after every other edit is borne out — the numbers match a fresh parse, not r1's figures. |
| REAL-7 | V-39 | **FIXED-VERIFIED** | All eleven corrected, each re-opened: `SyncStatusCard.tsx:48`, `CompletionScreen.tsx:67`, `ImportModal.tsx:259`, `mapTokens.ts:136`, `DeleteConfirmationModal.tsx:96`, `ExportModal.tsx:83`, `CompletionScreen.tsx:94-106`, `AlertDialog.tsx:150`, `DeleteConfirmationModal.tsx:115`, `ExportModal.tsx:263`, `with-alpha.ts:61-62`. No stale variant survives — each grep returns exactly one value. The A36-vs-U1.3 conflict was resolved to the plan's `:94-106`, as the finding directed. |
| REAL-8 | V-40 | **FIXED-VERIFIED** | A93's demo column now names the two real demo-only sites (`chrome/DemoErrorBoundary.tsx`, `chrome/PdfPreview.tsx`) with both strings quoted — verified present. Action 1 is gone. The false premise is corrected in the row's own text rather than silently dropped. `VisionCameraScreen.tsx:679` (correct in r1) retained. |
| REAL-9 | V-41 | **FIXED-VERIFIED** in both docs under review — upstream source uncorrected, see **REAL-D-2** | Matrix and plan now cite `ExportModal.reduced-motion.test.tsx:52-53`, each noting `:45` is `animation === ''` and carries no colour. Re-verified: `:45` is the animation assertion, `:53` is `borderTopColor: '#35A0D6'`. |
| REAL-10 | V-42 | **FIXED-VERIFIED** | Plan `:14` now reads *"97 Tier-A token/recipe rows + **72** Tier-B surface rows + 15 inert + 14 demo-only (**215** total, matching the matrix's own §TOTALS)"* — and it does match the re-parsed matrix. |
| REAL-11 | V-43 | **FIXED-VERIFIED** | §6.1 now reads *"566 lines, 18 exports (15 value + 3 type), consumers across 32 non-test files"* — all three match my counts. The correct sibling rows (`input-theme.ts` 7 importers, `DemoExperience.tsx` 6 style blocks) were left untouched. |
| REAL-12 | V-44 | **FIXED-VERIFIED** | A70's Status cell is now `MISSING-SEAM (demo-originated)`, and the script confirms it is counted in MISSING-SEAM's 21. Cell, totals table and footnote now agree. |
| REAL-13 | V-45 | **FIXED-VERIFIED** | U7.1 now cites **`TerminalLine.tsx:134`** — re-opened: `export const TerminalLine = memo(function TerminalLine(…)` at `:134` in the 178-line demo file. `:17-18` is gone; the correct `:39-60` (palette) and `:44` (VERB accent) are retained. |
| REAL-14 | V-46 | **FIXED-VERIFIED** | Both docs now read *"**86-section** deferral ledger (numbered to §88; **46 and 47 are absent**)"* with *"Next free section is §89"* retained. Matches my parse (`## 1`–`## 45`, `## 48`–`## 88`). |

**Totals: 14 FIXED-VERIFIED · 0 NOT-FIXED · 0 REGRESSED.**

No regression anywhere: I re-ran the full citation resolver and the value-vs-line drift detector over both revised docs. Every r1 correction holds, and nothing previously correct was broken — A64/A68, the six phone glass tiers, the contrast-test pins, the census figures, the `SEAM`/`verification/` claims and the deferral-ledger cross-references all still resolve.

---

## New claims introduced by the fix round — reality-checked

The diff's added lines carry ~140 `file:line` citations. All resolved; the following are the substantive new ones, all **TRUE** unless noted.

| New claim | Verified |
|---|---|
| U0.1's rewritten 17-token ADD list | Every value confirmed at phone `Colors.ts`: `backgroundSecondary #0e3965` `:136` · `backgroundTertiary #17416e` `:137` · `card #0e3965` `:212` · `modal #17416e` `:213` · `borderLight #2e5f97` `:154` · `borderDark #063d72` `:155` · `textInverse #002853` `:150` · `onPrimary`/`onError` `#ffffff` `:201-202` · `primaryDark #1F6B99` `:132` · `primaryLight #4BA3D4` `:131` · `successDark #0faa5e` `:167` · `infoDark #7a9fc4` `:184` · `disabled #2e5f97` `:234` · `disabledText #6b7f95` `:235` · `link`/`linkHover` `:208-209`. |
| *"`primaryLight #4BA3D4` — today a bare literal 40×, no key"* | `census.mjs` → `40x #4BA3D4`. **Exact.** |
| The 15 bare `#1e3a5f` sites now enumerated in A7/U0.1 | Cross-checked against `census.mjs`'s `17x #1e3a5f`: `glass-tokens.ts:39`, `input-theme.ts:16`, `GpsCaptureControl.tsx:179`, `CaseActionsSheet.tsx:193`, `CasesScreen.tsx:189`, `DashboardScreen.tsx:110`, `DvrInfoScreen.tsx:143`, `ExportCaseCard.tsx:198`, `ExportActionSheet.tsx:238`, `ImportTerminalProgress.tsx:195`, `CaseMapPicker.tsx:132`, `FormFieldsPane.tsx:186,225`, `_pane-chrome.tsx:171`, `SettingsCategoryList.tsx:158`, `TimeOffsetScreen.tsx:121`, `_shared.tsx:552`. **All 17 accounted for, every line exact.** |
| U0.4's `check-rn-parity.mjs:35` (the `norm()` fix, V-21) | `:35` = `const norm = (v) => v.trim().toLowerCase()`. **Exact.** |
| U0.4's `check-rn-parity.mjs:38-61` | `readField` opens `:38`; `readConst` returns `:60`, closes `:61`. Covers both readers. |
| U0.5's `glass-tokens.test.ts:19-30,33-44` | `:19-30` = `sourceFiles()` scanner; `:33` = `const BANNED`, `:44` = `]`. **Exact.** |
| §6.6's `app.config.js:236` (Mapbox token note) | `:236` = `// Note on the Mapbox public token (separate, lives in EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`. File is 251L. **Exact.** |
| U0.1 *"edits 13 files … including `_shared.tsx:190`"* | `:190` = `background: '#0d1b2a'`. **Exact** (census: `_shared.tsx:125,190`). |
| U2.1's `_shared.tsx:262` | `const boxStyle = error ? { ...fieldInput, borderColor: '#ff4757' } : fieldInput` — a real error-border site. |
| U2.1's `SubmissionScreen.tsx:146` | The label div at `color:'#cdd9e6'`, paired with `:147`'s read-only field — supports the *"not `opacity:0.6` on the wrapper, that faded the label too"* point. |
| A69's `screenData.ts:17-43` | `caseStatusTheme` opens `:17`; the block closes `:43`. Covers both theme functions. |
| U5.x's `MapControls.tsx:48-53` | The JSDoc on the pill-clearance adaptation. **Exact.** |
| A67/U2.2's `RowActions.tsx:108` | The `glassBtnSecondary` branch of the danger/secondary ternary. |
| D19's *"one 326-line file"*, `radioOption` `:163`, `NOTE_TONE` `:68` | `_pane-chrome.tsx` is **326 lines**; `:68` = `const NOTE_TONE`, `:163` = `const radioOption`. **All exact.** |
| D19's *"§6.1 positively (and falsely) asserted `_pane-chrome.tsx` was single-owner"* | The r1 §6.1 row did read *"U6.2 only — Single-owner by construction. Good."* **Correct.** |
| **V-2's inventory correction** — `OverlayHeader` provenance `P9 / #123` → **`#125`** | The commit that adds `src/components/layout/OverlayHeader.tsx` is `4c0116cf` *"feat(layout): EXPERIMENTAL floating header for Cases and Dashboard"*. `git log --merges --ancestry-path 4c0116cf..main` gives `2d4defa3 Merge pull request #125 from Recon222/fix/post-campaign-ui-triage` as the earliest merge. **#125 is right**, and it reconciles the doc with D15's *"PR #125's floating header"* and the commit body's own "PROTOTYPE — pending a device verdict". |

---

## New findings

### REAL-D-1 [MINOR] Plan §3's D8 gate row still carries the claim V-15 removed everywhere else

`01-master-ui-parity-plan.md:61`:

> `| **D8** | Splash `#000314` → `#002853` **and its test pins** | **Port the value; update `SplashScreen.test.tsx` in the same commit; re-measure the disclosure alpha against the new ground.** | U8.1 |`

V-15 corrected this claim in A87, matrix D8 and plan U8.1 — but §3 is a fourth statement of it, and it is the row the **owner reads when ratifying D8**. As written it still asserts "test pins" (plural) and an update to `SplashScreen.test.tsx`, which has no assertion to update. `wc -l` = 106; the only `#000314` is the `:41` comment; `:48` is a floor.

**Fix:** `| **D8** | Splash `#000314` → `#002853` (`BootSequence.tsx:272`) | **Port the value and re-measure the disclosure against the new ground in the same commit. There is no `#000314` assertion — `SplashScreen.test.tsx:43-48` is a `>= 0.65` floor, and the floor may itself need raising to hold 5.27:1.** | U8.1 |`

### REAL-D-2 [MINOR] V-41's upstream source is uncorrected, and the inventory is a briefing input

`demo-ui-inventory.md:2186` still reads:

> `| ui/screens/__tests__/ExportModal.reduced-motion.test.tsx:45,52 | #35A0D6 (spinner borderTopColor) |`

This is where V-41's error came from. The same file gets it right two rows later (`:2232` maps `:45` to *"spinner `animation` `''`"*), so the inventory contradicts itself. §6.4 item 6 briefs every implementer with *"the exact list of tests it is expected to redden (from demo §6)"* — i.e. straight from this table — so the corrected plan cell can be overridden by the stale inventory row at briefing time.

The fix round already showed the right pattern here, correcting one `phone-ui-delta-inventory.md` row in place with a `**CORRECTED (plan-review r1, V-2)**` marker.

**Fix:** same treatment — `:45` → spinner `animation`; `:52-53` → `#35A0D6`.

### REAL-D-3 [MINOR] NEW: U1.1's `Colors.ts:345-406` covers five of the six tiers

`01-master-ui-parity-plan.md:235` (U1.1, *"Six tiers × four parts, dark only"*) cites `Colors.ts:345-406` as the source.

`dark: {` opens at `:345` and closes at `:439`. The tiers sit at `card :346-351`, `nestedCard :379-384`, `elevated :385-390`, `header :391-396`, `sheet :397-405`, **`recessed :433-438`**. `:406` lands in the explanatory comment above `recessed` — so the cited range **excludes the entire sixth tier**, the one U1.1's own recipe cell quotes in full and the one A39 flags as bound by a two-sided ΔE that a contrast ratio cannot see.

Low blast radius: the recipe cell carries all six tiers' values verbatim and I verified every one, so an implementer copying the cell is fine. Only one told to consult the source range would come up short.

**Fix:** `Colors.ts:345-438`.

---

## Summary

| | Count |
|---|---|
| r1 findings FIXED-VERIFIED | **14** |
| NOT-FIXED | 0 |
| REGRESSED | 0 |
| New claims reality-checked | **~140 citations; 16 substantive claims tabulated, all true** |
| New findings | **3, all MINOR** (REAL-D-1..3) |

The fix round is unusually clean for its size. Two things are worth naming: the totals were **re-derived by script after every other edit** rather than hand-patched from my figures — the fresh parse agrees to the row — and several fixes went past what the finding asked and were right to (D8's falling-ratio consequence, A93's corrected premise, and naming the *wrong* anchors in V-16 so they cannot come back). All three new findings are pointer-level and none blocks execution: two are stale restatements of an already-corrected claim, one is a range that stops 32 lines early.

**Verdict: APPROVE** (three MINORs, none blocking).
