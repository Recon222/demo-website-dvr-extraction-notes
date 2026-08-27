# Plan review r1 — FIX MAPPING

**Round:** 1 · **Verdict under repair:** BLOCK (2 BLOCKER / 16 MAJOR / 27 MINOR / 1 refuted)
**VETTED.md revision:** amended mid-round with **three additive edits** (V-IDs unchanged, nothing renumbered) — re-read from disk and folded in; see the three ➕ rows below under V-4, V-2 and D15.
**Docs edited:** `00-ui-parity-matrix.md` (699 → 748) · `01-master-ui-parity-plan.md` (465 → 529) · **`phone-ui-delta-inventory.md`** (one row corrected — the amended V-2 requires it)
**Not committed** — the orchestrator commits.

**Disposition totals: 45 FIXED · 1 REFUTED (V-37, by the aggregator, no fix required) · 0 PARTIAL · 0 unresolved**, plus the **three additive edits** (2 new fixes + 1 already covered). Every V-ID appears below.

**Ordering constraints honoured:** V-3 landed before V-1's U0.4 edit (the anchor set's web-side names depend on the naming ruling) · V-5 landed before V-38 (rehoming A27 changes the by-phase counts) · V-21's `norm()` fix is written into U0.4 as repair (5) and named in U1.1's Deps as a hard input, so it cannot land after the first string-valued anchor.

**One method note:** V-38's counts were **re-parsed from the row cells by script after all other matrix edits**, not hand-patched from the review's figures — the review's own numbers were taken as a signal to re-derive, not as the answer. The parse confirms 97 rows, IDs A1–A97, no gaps, no duplicates.

---

## BLOCKER

| V-ID | Disposition | Doc : section changed | What landed |
|---|---|---|---|
| **V-1** | **FIXED** | plan U0.4, U0 exit, §6.6 gate 1, §9 DoD 1; matrix A96 | The anchor set now **grows with the phases**: U0.4 extends only to the ~15 U0.1 creates, U1.1 adds the 12 glass-tier anchors, U3.1 the 4 status anchors, U8.2 `gridSubtle`. U0's exit reads *"exits 0 at its CURRENT anchor set"*; §6.6 gate 1 and §9 DoD 1 restated; DoD now says ~32 at the end and records that "22 anchors" was a superseded pre-port proposal. |
| **V-2** | **FIXED** | plan U7.2; matrix A61 | Taken as R-3's option (ii). A61's "Recipe in phone §2.B" struck and the PR attribution corrected **#123 → #125**; both docs now carry *"⚠ THIS IS NOT THE PHONE'S `OverlayHeader.tsx` — D15 defers that component"*, plus the four demo sites' **current** recipes and the merged target stated inline. D15 gains the matching rider in §3 and in the matrix's D15 entry. |
| ➕ **V-2 (additive)** | **FIXED** | **`phone-ui-delta-inventory.md:18154`** (§4.2 new-components table) | **The wrong attribution was inherited, not invented — confirmed at source before editing.** `:18154` read *"P9 / #123 — The shared full-bleed-overlay header (camera, recorder, preview) — §2.B"* while that same document's detail entry at **`:3197-3200`** records it as **NEW in PR #125, EXPERIMENTAL, a scroll-linked WRAPPER over the four TAB routes**. The summary row now reads **#125**, carries the correction inline (naming what it previously said and why it was wrong), states that the camera/recorder/preview headers live in §2.G and are per-surface hand-rolled, and notes **D15 defers the component**. **Without this the next port re-seeds A61 verbatim from the inventory.** |

## MAJOR

| V-ID | Disposition | Doc : section changed | What landed |
|---|---|---|---|
| **V-3** | **FIXED** | plan U0.1, U0.4 | `ui/tokens/palette.ts` ruled as **the** module (no longer "implementer's call"); the binding **phone-naming** sentence + the four `T` aliases (`bg→background`, `raised→backgroundSecondary`, `textMute→textSecondary`, `textFaint→textTertiary`); and U0.4 gains repair **(4)**: repoint the web-side readers and teach `readField` to follow a one-level re-export. |
| **V-4** | **FIXED** | plan U0.2; matrix A53 | `withAlpha` returns a literal **`rgba(r, g, b, a)`** computed in TypeScript. `color-mix()` reserved for the `@theme` mirrors. Reason stated as R-4 ruled it: `flattenOver` cannot composite a CSS function, so the value becomes invisible to the gate U0.5 builds. **ARCH-5's "byte-identical" corrected** — the test asserts through the existing `hexToJsdomRgb`-style helper because jsdom re-spaces. |
| ➕ **V-4 (additive)** | **ALREADY COVERED** | matrix A53 | The amended VETTED row requires A53's `color-mix()` **web form** struck at the source, since A53 is upstream of U0.2's spec. **This landed in the original pass** — A53 now reads *"Web form inside `features/demo/**`: a literal `rgba(r, g, b, a)` string computed in TypeScript — NOT `color-mix()`… `color-mix()` is reserved for `app/css/style.css`'s `@theme` mirrors"*, with the `flattenOver`-cannot-parse-a-CSS-function reason and the n-deep arity. **Verified: `grep -c 'color-mix(in srgb, var(--token)' 00-ui-parity-matrix.md` → 0.** No further edit. |
| **V-5** | **FIXED** | plan U0.1, U2.2, U2.4, U6.1, U6.2; matrix A27, by-phase table | `link #b8d4f0` + `linkHover #d0e4f7` added to U0.1's ADD list and **A27 added to U0.1's Matrix-rows**; A27 rehomed **U2 → U0 (token) / U2, U6 (adoption)**; the four spending packages now reference `palette.link`, not the literal. |
| **V-6** | **FIXED** | plan §3 (**D19**), §5 preamble, §6.1, U3.3 | R-2's re-cut taken as the recommendation. U3.3 adopts only where no other lane touches the file (six sites named); its six cross-lane adoptions are **handed back** to U6.2 / U6.4a / U6.4b / U7.2 / U7.3. §5's dependency shape now says U2 ∥ U3 is **conditional on D19**. |
| **V-7** | **FIXED** | plan §2, U1.1; matrix A96 | §2's Tier-A parity definition softened to *"proves the palette tier mechanically; the glass tiers are proven by transcription plus the review pipeline"* **until U1.1**; U1.1 gains the tier anchors as its closing act, with the `readField {after:'card: {'}` mechanism and the ~12-lines-not-a-new-mechanism note. |
| **V-8** | **FIXED** | plan §3 (**D18**), new **§4.8**, §9 item 10 | New §4.8 "Integration model and rollback": `feat/uiparity` integration branch, `master` takes one merge at U8 exit, gates run on the integration head, `git revert -m 1` per phase, dependency shape = revert-safety order. §9 item 10 records the override branch explicitly. |
| **V-9** | **FIXED** | plan U2.1, §3 D10; matrix B.5 row 29 | The `SubmissionScreen` disabled-path clause **deleted**. All three places now record that `:146` is the label div (no opacity) and `:147` a **sibling** value div — two siblings, not a wrapper. **D10 governs; U2.1 keeps the geometry half only.** |
| **V-10** | **FIXED** | plan U5.2; matrix A19, §C.1 (new rows 41–45), D5 | The badge fill becomes **`primaryDark #1F6B99`** (5.80) with the 3.73 arithmetic and the "a numeral is not a non-text mark" reasoning stated. §C.1 gains five map-chrome rows plus an explicit inherited-DEF-062 row. D5 amended in both docs. |
| **V-11** | **FIXED** | plan §2, §3 (**D20**), §6.5, U5.3 | §2's absolute prohibition replaced by D20's carve-out, with all six packages named. U5.3's self-contradiction rewritten: *"`filtersVisible` is NEW local state and is permitted; the filter VALUES and their reducer stay."* §6.5's reviewer briefing line rewritten to match. |
| **V-12** | **FIXED** | plan U4.1, U4.2, U5.3, U7.2 | U4.1 now delivers **two** seams: `sheet-chrome.ts` (`SEAM(U4.1)`) **and** `GlassBottomSheet.tsx` (`SEAM(U4.1b)`) with its full prop signature; `Escape` named as the Android-back analog; portals through `PhoneOverlayPortal`. **`closeAccessibilityLabel` used uniformly** across U4.1/U4.2/U5.3. U5.3's Files column names the seam. |
| **V-13** | **FIXED** | matrix A65, A66, A67 | Corrected to `Button.tsx:142-145` + `:215-217`, `:146-157` (outline `:146-153`, ghost `:154-157`) + `:227-232`, `:158-161` + `:233-235`. **A64 and A68 left untouched** as instructed. |
| **V-14** | **FIXED** | matrix B.8 row 77 | Demo component → **`—`**, with a note that the demo has no `Details` sibling and that the "32-line diffstat, zero rendered values" verdict belongs to the phone's `ImportResultDetails.tsx` (+27/-5), **not** to `ImportResultBody.tsx` (+247/-93). B.6 row 79 keeps `ImportResultBody`. |
| **V-15** | **FIXED** | plan U8.1; matrix A87, D8 | The false pin claim removed from all three places and replaced with the **floor** (`:43-48`, `alpha >= 0.65`) plus the `:41`-comment fact. The real consequence written in: `#002853` is lighter, so the ratio **falls**; the floor may itself need raising to hold 5.27:1. |
| **V-16** | **FIXED** | plan U1.4; matrix A37 | **`_shared.tsx:397`** and **`TabBar.tsx:75`** in both docs, each with the wrong anchor named so nobody re-introduces it (`:418` is `WizardNext`'s closing brace; `:62` is a JSDoc line). |
| **V-17** | **FIXED** | plan §6.1 | U0.1 added to the `_shared.tsx` row; the "**U0.1 is a cross-cutting sweep — it lands first, alone**" sentence added, naming `_shared.tsx:190` as `fieldInput`'s fill. Four new rows: `MediaLibrarySheet.tsx`, `MapScreen.tsx`, `map/LocationRow.tsx`, `screenData.ts`, plus a row for the whole U2 ∥ U3 shared set. |
| **V-18** | **FIXED** | plan §5 preamble | A blockquoted **PREREQUISITE** above the U0 table: the planning bundle (plan, matrix, both inventories, `census.mjs`, `verification/`) is merged to `master` before U0 starts, with the `git ls-tree` evidence and the consequence for gate 5 and the PR-body captures. |

## MINOR

| V-ID | Disposition | Doc : section changed | What landed |
|---|---|---|---|
| **V-19** | **FIXED** | plan U0.5 | The filename skip replaced by an explicit **`TOKEN_MODULES` path allow-list**, with "adding a path is a reviewable act" and the warning not to repair it with a loose predicate. The six token modules the port creates are named. |
| **V-20** | **FIXED** | plan U2.1 | Exported as a **function** — `fieldInputStyle({ disabled, error, focused })` — from `ui/tokens/`, with the two live re-derivations cited as evidence a static const cannot carry the precedence. The pin now pins the **call**, plus one per branch. |
| **V-21** | **FIXED** | plan U0.4 (repair 5), U1.1 Deps; matrix A96 | `norm` extended to strip whitespace inside function notation, with the phone-vs-demo `rgba()` spelling shown and the explicit warning not to "fix" it by re-spacing the demo's literals. U1.1's Deps name it as a hard input, so it cannot land late. |
| **V-22** | **FIXED** | plan §4.3, U1.2 | New §4.3 bullet: **a shorthand after a longhand of the same family ERASES it**; override `borderColor`, never `border`. The two live instances cited (`RowActions.tsx:108`, `AlertDialog.tsx:182`). U1.2's pin is now **looped over every `glassCard` consumer**. |
| **V-23** | **FIXED** | plan §2 (never-regress list), U5.2 | The 378px adaptation added to §2's never-regress list with its verbatim rationale; U5.2 must **record the supersession in the PR body and verify the single row fits 378px with the chip visible**. |
| **V-24** | **FIXED** | plan §5 U6.4, §7 tracker, package totals | Split into **U6.4a** (eight adoption-only screens, M, `opus-implementer`) and **U6.4b** (the four with named recipe changes, M, `opus-implementer-max`). U6.4b carries four new pins, not one. Tracker and totals updated (36 → 37 packages). |
| **V-25** | **FIXED** | plan U3.3, U4.1, U6.4a; matrix B rows 6, 9, 29, 31, 43 | Orphans assigned: row 6 → **U3.3**, row 9 → **U4.2** (via U4.1's Files). Double-ownership resolved: rows 29 / 31 / 43 struck from U6.4 and marked in the matrix as owned by **U2.1 / U2.4 / U3.3**. |
| **V-26** | **FIXED** | matrix A7; plan U0.1 Files | A7's **15 sites enumerated**, and the `17 − 2 = 15` arithmetic written in with "**15 and 17 are consistent — do not reconcile**", per R-5. U0.1's Files column repointed at the real list. |
| **V-27** | **FIXED** | plan new **§4.9**, U0.2 Matrix-rows | A47 promoted to a standing convention (§4.9 Type scale) naming the seven packages it governs. **A47 removed from U0.2's Matrix-rows** with a pointer, since U0.2 has no type deliverable. |
| **V-28** | **FIXED** | plan §4.4, U1.2, U2.2, U2.3, U2.4, U4.1, U5.1 | All six hedges resolved to concrete statements. New §4.4 rule for **cross-package reds**: update the value, hand the pin back unchanged, record in **both** PR bodies — with `controls.test.tsx`'s TabBar pins named as **U8.3's**. |
| **V-29** | **FIXED** | plan §3 Blocks column | D1 → **§6.6** (was §6.5) · D12 → `U2.2, U3.3, U4.4, U6.2, U7.3, U8.2` · D14 → `U5.2's zIndex choice; the must-not-move z pins in U4.2 and U6.2`. |
| **V-30** | **FIXED** | plan U0.2, U1.1, U3.2, U3.3, U4.1, U4.3, U5.3, U7.2 | An `export` signature added to **every** creating package. The U0-blocking pair is exact: `withAlpha(hex, a): string` returning `rgba()`, and **`flattenOver(top, ...grounds): string` — n-deep**, not A53's two-arg form. |
| **V-31** | **FIXED** | plan U0.1, U3.1 | `errorLight` **struck from U0.1**; U3.1 owns the whole status family. The `infoLight` / `borderLight` same-hex note (`#2e5f97`, A8/A16) added to U3.1 with "do not collapse them". |
| **V-32** | **FIXED** | plan §4.6 | The corrected recipe, not the README's macOS path: read `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` **read-only** from the phone repo's `.env`, pass it inline, **never write `.env.local`, never commit, never paste into a PR body**; the fallback evidence path stated. |
| **V-33** | **FIXED** | plan §4.6 | *"Gates 3 and 4 come online with U0.4 and U0.5 respectively. U0.1–U0.3 run gates 1, 2 and 5 only; U0's phase EXIT is where all five are first green together."* |
| **V-34** | **FIXED** | plan U8.4 Tests | Replaced `— (tooling; no product tests)` with a real gate: assert the four new components resolve from the generated entry, assert `grep -rl '#0d1b2a' .design-sync/previews/` returns zero, **record both outputs verbatim in the PR body**. |
| **V-35** | **FIXED** | matrix §OWNER RATIFICATION | **Recommendation (one line)** column added for all 20 rows, copied from plan §3, plus D18/D19/D20 and a note that the three new ones are execution-shaped and ruled in the same pass. |
| **V-36** | **FIXED** | plan §6.6 | An eight-row **phase → driver** table, plus the "before" capture rule (v1 baselines where one exists, else run the driver on `master` first; `SHOT_DIR=…/uiparity/<pkg>/{before,after}`). |
| **V-37** | **REFUTED** | — (no edit; recorded here and in the matrix's accuracy notes) | `type-design-analyzer` **does** exist at `.claude/agents/type-design-analyzer.md`, alongside all four sibling lanes. Plan §6.5's five-lane list is correct as written. **Recorded so a later reader does not "fix" a correct line.** Refutation was the aggregator's, verified at spot-check 17; this writer confirms no edit was made. |
| **V-38** | **FIXED** | matrix §TOTALS, by-tier note, by-phase table | **All seven figures re-derived by script after every other edit.** DRIFTED **41** · MISSING **24** · MISSING-SEAM **21** · COMPLETE **7** · OPTIONAL 1 · PARTIAL 1 · N/A 1 · OUT 1 = **97**. Effort S **53** · M **35** · L **5** · no-effort **4**. By-phase U0 **19** (A27 rehomed), U1 **15**, U2 **15**; a "no phase" row added for A13/A24/A25/A26. |
| **V-39** | **FIXED** | matrix A8, A14 ×2, A20, A22 ×2, A36, A45 ×3, A53 | All eleven line-drift corrections applied. Where the plan and the matrix disagreed (`CompletionScreen` A36 vs U1.3), **the plan's `:94-106` was taken as correct**, per the finding. |
| **V-40** | **FIXED** | matrix A93 | Action 1 dropped (the phone's `ConfirmationScreen.tsx:266` already reads the fixed string at `main`, and the string does not exist in the demo). The "inherits any violations" premise replaced by the **two real demo-only sites** (`DemoErrorBoundary`, `PdfPreview`) under D12, with U7.3's repo-wide test named as what closes the row. |
| **V-41** | **FIXED** | plan U0.3; matrix B.4 row 25 | **`:52-53`**, not `:45,52`, in both docs, each noting that `:45` is `animation === ''` and carries no colour. |
| **V-42** | **FIXED** | plan §1 | *"97 Tier-A + **72** Tier-B + 15 inert + 14 demo-only (**215** total)"* — applied **after** V-38 so both documents derive from the same corrected parse. |
| **V-43** | **FIXED** | plan §6.1 | `_shared.tsx` → **566 lines, 18 exports (15 value + 3 type), 32 consumer files**. Folded into the same §6.1 edit as V-17. The sibling rows (`input-theme.ts` 7 importers, `DemoExperience.tsx` 6 style blocks) were verified correct and left untouched. |
| **V-44** | **FIXED** | matrix A70 | Status cell → **MISSING-SEAM**, matching the totals table and the row's own prose. Folded into V-38's re-derivation pass. |
| **V-45** | **FIXED** | plan U7.1 | *"The memo boundary at **`TerminalLine.tsx:134`** is load-bearing (`export const TerminalLine = memo(…)`; the rationale is the docblock at `:15-18`, which is prose, not the mechanism)."* |
| **V-46** | **FIXED** | matrix §Sources; plan §1 | *"the demo's **86-section** deferral ledger (numbered to §88; 46 and 47 are absent). Next free section is §89."* |
| ➕ **D15 rider (additive)** | **FIXED** | matrix §DECISIONS D15 amendment + §OWNER RATIFICATION; plan §3 D15, U3.4, U7.2 | The amended §8 requires the rider to **split ownership**, because one phone component was referenced by two packages in two phases for two unrelated surfaces. Now stated in four places: **U3.4 owns D15's GEOMETRY half** (92pt → 64pt, first card +108 → +80 — device-approved, no open defect); **U7.2 owns the OVERLAY-CONSOLIDATION half** (matrix A61, demo-originated, no phone counterpart); **neither ports the phone's `OverlayHeader.tsx` — it stays deferred and belongs to neither.** Each package's own row now says so, so U3.4 and U7.2 cannot both think they own it. |

---

## Out-of-band change requested with this round

**The owner's spawn policy** (`HANDOFF.md` §2, 2026-08-26) — **not a review finding**; VETTED.md's header quotes the superseded line.

| Where | Was | Now |
|---|---|---|
| plan §6.5 preamble | *"every agent runs on Opus — implementers, lanes **and** the aggregator"* | Implementers spawn as `subagent_type: "opus-implementer"` (xhigh), with `-high`/`-max` **only** where a package's Tier column says so · review lanes spawn with an **explicit `model: "opus"`** on every call (most `*-reviewer.md` definitions carry no model frontmatter and would inherit silently) · **the aggregator is FABLE** · **no named agents from the build phase on** — spawn unnamed, record the raw `agentId` in `HANDOFF.md` §6, resume via that id |
| plan §6.5 bullet | *"An **Opus aggregator** dedupes…"* | *"A **Fable aggregator** dedupes…"* |
| plan §7 package totals | — | Added: *"Spawn per `HANDOFF.md` §2: implementers as `opus-implementer` unless the Tier column says `-high`/`-max`; **unnamed**, with the raw `agentId` recorded."* |

The per-package **Tier** column is unchanged — it already names `opus-implementer-high` / `opus-implementer` / `opus-implementer-max` per package, which is exactly the exception the new policy allows.

---

## Verification run on the edited docs

- Every stale string the review named is **gone**: `22 anchors resolved`, `88-section`, the three wrong `Button.tsx` ranges, `_shared.tsx:418`, `TabBar.tsx:62`, `TerminalLine.tsx:17-18`, `Recipe in phone §2.B`, `reduced-motion.test.tsx:45,52`, `color-mix(in srgb, var(--token)`, `Single-owner by construction`, `(nothing — it is the absence of a package)`. The only surviving occurrences are **deliberate**: the matrix's accuracy note and the plan's U1.4 / U8.1 cells quote the wrong anchors in order to name them as wrong.
- Every new string is **present**: `D18`, `D19`, `D20`, `SEAM(U4.1b)`, `fieldInputStyle`, `TOKEN_MODULES`, `§4.8`, `§4.9`, `U6.4a`, `U6.4b`, `Fable aggregator`, `model: "opus"`, `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`, `PARSE-FAILED`.
- Tier-A rows re-parsed: **97, A1–A97, no gaps, no duplicates**, and the §TOTALS figures are the parse output.

**Not committed.** Line counts after the round: matrix **748**, plan **529**, `phone-ui-delta-inventory.md` unchanged in length (one row rewritten in place).

**On the discarded `section1-aggregator.md`:** never read; no content from it entered either document.
