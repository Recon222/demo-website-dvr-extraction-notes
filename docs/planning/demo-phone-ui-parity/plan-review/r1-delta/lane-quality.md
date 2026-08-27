# Plan Review r1 — FIX-DELTA — QUALITY / EXECUTABILITY lane

**Reviewer:** `plan-quality-checker` role, resumed. **Round:** r1 fix-delta.
**Under review:** `00-ui-parity-matrix.md` (748L) · `01-master-ui-parity-plan.md` (529L) @ `011b0c8`, vs `3365e3e`.
**Scope:** the 23 findings that originated with this lane (QUAL-1..23 → V-2, V-3, V-4, V-5, V-8, V-10, V-11, V-12, V-17, V-18, V-25, V-26, V-27, V-28, V-29, V-30, V-31, V-32, V-33, V-34, V-35, V-36, V-37), plus collateral in territory this lane covered — with the U0-blocking subset re-read end to end and D18–D20 read as new text.

**Summary:** **22 FIXED-VERIFIED · 1 REFUTED-accepted · 0 NOT-FIXED · 0 REGRESSED.** The BLOCKER is cleared properly, not papered over. Several fixes are materially better than the fix I proposed (V-26, V-32, V-2, V-17, V-1's anchor-staging model). **Four NEW findings**, all created by this round and all one-cell edits — three of them MAJOR because they sit in the two places that decide whether the fixes actually reach an implementer: **U0.1's Matrix-rows cell** and **§6.4's briefing template**.

---

## 1. Disposition of this lane's findings

| QUAL | V-ID | Disposition | Opened at | Note |
|---|---|---|---|---|
| QUAL-1 | V-2 | **FIXED-VERIFIED** | plan `:323`; matrix A61 | Option (ii), executed fully. U7.2 now carries the ⚠ warning (correct PR **#125**), states *"phone §2.B is 'App chrome and shell'; the camera/recorder/preview headers live in **§2.G** and are per-surface and hand-rolled there too — **there is no shared full-bleed overlay header on the phone to port**"*, then gives **all four demo sites' current recipes** (`AudioPreview` 20/700; `AudioRecorder` 40×40 r20 on `rgba(19,34,54,0.85)`; `MediaCapture` `top:44` 48×48 r24 scrim circles; `OcrCapture` — **no header control at all**) and the **merged target** (`top:44`, `padding:'0 16px'`, `space-between`, **44×44** leading control per A49, optional 16/600 title, trailing slot, two variants). Plus an export signature. **Buildable from the doc alone.** |
| QUAL-2 | V-3 | **FIXED-VERIFIED** | plan `:219` | `ui/tokens/palette.ts` ruled, not delegated. 29 phone names enumerated; the four `T` aliases stated; *"Every later package's recipe text is written in phone names and resolves against this module, not `T`."* Adds a pin I did not ask for and should have: *"a pin that every `T` alias resolves to its phone-named source."* |
| QUAL-3 | V-5 | **FIXED-VERIFIED** | plan `:219`, `:249`, `:251`, `:306`, `:307` | `link #b8d4f0` + `linkHover #d0e4f7` in U0.1's ADD list; **A27** in its Matrix-rows; all four spending packages now read `palette.link` with *"reference the token, not the literal"*. |
| QUAL-4 | V-4 | **FIXED-VERIFIED** | plan `:220`; matrix A53 | Literal `rgba(r, g, b, a)` computed in TS; `color-mix()` reserved for the `@theme` mirrors, with the reason (no channels → invisible to the U0.5 gate). Struck at the A53 source too, so the next reader cannot re-seed it. Correctly refuses "byte-identical" — jsdom re-spaces, so the pin goes through the `hexToJsdomRgb`-style helper. |
| QUAL-5 | V-10 | **FIXED-VERIFIED** | plan `:58` (D5), `:281` (U5.2) | Badge fill → `palette.primaryDark #1F6B99` (5.80), with the arithmetic and *"the badge renders a **numeral**, so the 4.5 text floor applies — C.3 rule 2's carve-out is 'non-text marks'"*. D5 amended in both docs; §C.1 gained the map-chrome floors as rows 41–45, landed `it.todo` in U0.5 and un-todo'd in U5.2. |
| QUAL-6 | V-11 | **FIXED-VERIFIED** | plan `:32` (§2), `:73` (D20), `:405` (§6.5), U5.3 | Carve-out states in/out and names all six packages; §6.5's reviewer line rewritten to match; U5.3's self-contradiction gone. |
| QUAL-7 | V-8 | **FIXED-VERIFIED** | plan `:153-161` (§4.8), `:71` (D18), `:528` (§9 item 10) | Integration branch, revert recipe, dependency-shape-as-revert-order, and the override clause written so a `master`-merging owner must accept a mixed-palette `/demo` **in writing**. (See **QUAL-D-2** — §4.5 was not updated to match.) |
| QUAL-8 | V-12 | **FIXED-VERIFIED** | plan U4.1 (`SEAM(U4.1b)`) | Full prop signature incl. `showAccentStrip`; **`Escape`** named as the Android-back analog; four close routes → one handler; portals through `PhoneOverlayPortal`; `closeAccessibilityLabel` used uniformly, stated as such. U5.3's Files cell says *"Consumes `SEAM(U4.1b)` — the mountable `GlassBottomSheet`, not just the style constants."* |
| QUAL-9 | V-17 | **FIXED-VERIFIED** | plan `:347-364` | Ten rows (was seven). U0.1 added to `_shared.tsx` with `:190` named; the standalone *"U0.1 is a cross-cutting sweep… lands first, alone"* paragraph at `:349`; four new rows; the U2∥U3 shared-set row; and `_pane-chrome.tsx` corrected from "Single-owner by construction" to **three owners across three phases**. |
| QUAL-10 | V-25 | **FIXED-VERIFIED** | plan `:265` (U3.3), `:309` (U6.4a), U4.2 | Row 6 → U3.3 *"(previously orphaned between phases)"*; row 9 → U4.2 *"(its A58/A60 half — previously orphaned)"*; rows 29/31/43 struck from U6.4a with *"the undivided U6.4 originally claimed all three and double-owned them."* |
| QUAL-11 | V-26 | **FIXED-VERIFIED** | matrix A7 | All 15 sites enumerated, plus the arithmetic I could not resolve: *"the census counts `#1e3a5f` 17×; minus the two TOKEN sites (`input-theme.ts:16`, `glass-tokens.ts:39`) = 15 bare. **15 and 17 are consistent.**"* |
| QUAL-12 | V-27 | **FIXED-VERIFIED** | plan `:163-167` (§4.9), `:220` | §4.9 promotes A47 to a standing convention and names the seven packages it governs. A47 removed from U0.2 with a pointer. *(It reappeared in U0.1 — see **QUAL-D-1**; that is the cell paste, not this fix.)* |
| QUAL-13 | V-18 | **FIXED-VERIFIED** | plan `:192` | Blockquoted PREREQUISITE above the U0 table, with `git ls-tree -r master … returns **empty**` as evidence and the day-one consequence for gate 5 and the PR-body captures. |
| QUAL-14 | V-28 | **FIXED-VERIFIED** | plan `:142`, U1.2, U2.3, U2.4, U4.1, U5.1 | **Zero hedges survive** (grepped). U1.2's is better than requested — the pin is *"looped over EVERY `glassCard` consumer (nine today)"*, not one component. U5.1's "none expected" restated positively with the reason. §4.4 gained the cross-package rule with `controls.test.tsx` → **U8.3** named. |
| QUAL-15 | V-29 | **FIXED-VERIFIED** | plan `:54`, `:65`, `:67` | D1 → §6.6 · D12 → six packages · D14 → U5.2's zIndex + the U4.2/U6.2 z pins. §3's preamble now claims the column is *"complete and correct by construction"* — true for these three. |
| QUAL-16 | V-30 | **FIXED-VERIFIED** | plan `:198`, U0.2, U1.1, U3.2, U3.3, U4.1, U4.3, U5.3, U7.2 | A signature on every creating package, plus a standing paragraph at `:198` giving the reason (*"a consumer cannot resolve `'1px solid <card.border>'` without knowing whether that is `GLASS_TIER.card.border` or `glassTier('card').border`"*). The U0-blocking pair is exact, including `flattenOver`'s **n-deep** arity. |
| QUAL-17 | V-31 | **FIXED-VERIFIED** | plan `:263` | `errorLight` struck from U0.1, owned by U3.1, with *"it was listed in both; one owner only"*. The `infoLight`/`borderLight` same-hex note added with "do not collapse them". |
| QUAL-18 | V-32 | **FIXED-VERIFIED** | plan `:175` | Better than my fix: it caught that the harness README names the **wrong variable** — the phone's is `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` (`app.config.js:236`). Read-only, inline, never `.env.local`, never in a PR body; fallback evidence path stated. |
| QUAL-19 | V-33 | **FIXED-VERIFIED** | plan `:173`, `:225` | In §4.6 **and** restated in U0's Exit line. |
| QUAL-20 | V-34 | **FIXED-VERIFIED** | plan U8.4 | Real gate: resolve each of the four new components by its `componentSrcMap` key, `grep -rl '#0d1b2a' .design-sync/previews/` → zero, both outputs verbatim in the PR body. |
| QUAL-21 | V-37 | **REFUTED — accepted** | — | `type-design-analyzer` exists at `.claude/agents/`. I flagged it as cross-lane and unverified; the refutation is correct and is recorded in the accuracy notes so nobody "fixes" a correct line. No edit was the right disposition. |
| QUAL-22 | V-35 | **FIXED-VERIFIED** | matrix §OWNER RATIFICATION | **Recommendation (one line)** column for all 20 rows, plus a note that D18–D20 are execution-shaped and must be ruled in the same pass. |
| QUAL-23 | V-36 | **FIXED-VERIFIED** | plan `:426-439` | Eight-row phase→driver table with the invocation, plus the "before" rule (v1 baselines else run on `master` first; `SHOT_DIR=…/uiparity/<pkg>/{before,after}`). |

**U0-blocking subset re-read** (QUAL-2/3/4/11/12/13/17 → V-3/V-5/V-4/V-26/V-27/V-18/V-31): all seven verified. U0.1–U0.5 are now buildable from the doc alone **except** for QUAL-D-1's cell and QUAL-D-4's stale exit criterion, both below.

**D18–D20 read as new text:** all three are ruled-shaped — each states the problem, one recommendation, and what happens if the owner overrides it. D18's override branch is written into §9 item 10 so the alternative is recorded rather than lost. D19 is the only one whose override has a stated cost (*"4–5 days of critical path"*), which is what an owner needs. No executability objection to any of the three.

---

## 2. New findings

### [MAJOR] QUAL-D-1 — U0.1's Matrix-rows cell is the U0 **by-phase** list pasted verbatim, double-owning five packages' rows and re-landing A47

**Doc:** `01-master-ui-parity-plan.md:219` vs `00-ui-parity-matrix.md:687`

U0.1's Matrix-rows cell now reads `A1–A9, A19, **A27**, A28, A41, A42, A47, A50, A53, A96, A97`. The matrix's by-phase table at `:687` reads, character for character, `A1–A9, A19, **A27**, A28, A41, A42, A47, A50, A53, A96, A97 (**19**)`. The **phase's** row list was pasted into the **first package's** cell. Before this round U0.1's cell was `A1–A9, A19, A28`; A27 was the one row V-5 correctly added.

The other six belong to siblings, and each names its own: **A41, A42, A53** are U0.2's (`:220`), **A50** is U0.3's (`:221`), **A96** is U0.4's (`:222`), **A97** is U0.5's (`:223`). And **A47** is the row V-27 just removed from U0.2 for having no type deliverable — U0.1 has no type deliverable either, so the fix relocated the defect rather than closing it.

**Why it matters:** §6.4 item 3 requires each brief to paste its package's matrix rows **with their full Delta text**. U0.1's implementer therefore receives A96 (repair the drift guard, four defects, `readField`, `norm`) and A97 (widen the banned-literal mechanism) as part of its own spec, in the one package the plan marks *"lands FIRST, ALONE"* — while U0.4 and U0.5 hold the same rows. That is the double-ownership class V-25 just closed in U6.4, re-created inside U0. A47 additionally re-opens QUAL-12.

**Fix:** restore U0.1's cell to **`A1–A9, A19, A27, A28`** and add one line under the U0 table: *"The by-phase list in matrix §TOTALS covers the whole phase — `A41/A42/A53` are U0.2's, `A50` U0.3's, `A96` U0.4's, `A97` U0.5's, and `A47` is §4.9's, not any package's."*

### [MAJOR] QUAL-D-2 — §4.5 and §4.8 give opposite branch-cut instructions, and both are pasted into every brief

**Doc:** `01-master-ui-parity-plan.md:146` (§4.5) vs `:155` (§4.8)

§4.5: *"Branch per package: `feat/uiparity-u<N>-<slug>` **off `master`**."*
§4.8: *"every package branch is **cut from it** [`feat/uiparity`] (except U0.1's, which is cut from `master`)."*

D18's own Blocks column names **§4.5** as a section the ruling changes (`:71` — *"§4.8, §4.5, §6.2, §9"*); §4.8, §9 and §6.3 were updated, §4.5 was not. §6.4 item 1 pastes **§4 in full** into every brief, so every implementer receives both sentences. The §5 prerequisite at `:192` still argues from the stale one (*"while §4.5 cuts every package branch off `master`"*).

**Why it matters:** a U4.1 branch cut from `master` instead of `feat/uiparity` is missing U0–U3 entirely — its gates run against a tree without the palette module it imports, and the merge is a conflict per touched file. This is the one instruction an implementer executes before reading anything else.

**Fix:** rewrite §4.5's first bullet: *"Branch per package: `feat/uiparity-u<N>-<slug>`, **cut from the `feat/uiparity` integration branch (§4.8)** — except U0.1's, which is cut from `master` (see §5's prerequisite). One PR per phase (or per package for L-sized packages — the orchestrator's call)."* And in `:192`, change *"while §4.5 cuts every package branch off `master`"* → *"while U0.1's branch is cut from `master` (§4.8)"*.

### [MAJOR] QUAL-D-3 — The briefing template still says "D1–D17", so D18–D20 never reach an implementer

**Doc:** `01-master-ui-parity-plan.md:385` (§6.4 item 8) vs `:4`, `:71-73`

Item 8: *"**Which decisions (D1–D17) govern it**, and the instruction to stop if one it depends on is unruled."* The header at `:4` now says execution waits on **D1–D20**, and the three new decisions govern packages directly: **D18** decides which branch the agent cuts (QUAL-D-2's subject), **D19** decides whether U2 ∥ U3 exists at all and moves six adoptions between packages, **D20** is the carve-out that makes U2.3, U4.2, U4.3, U5.2, U5.3 and U6.3 buildable rather than stop-and-raise.

§6.4 is the sole mechanism by which any of §3 reaches an agent. As written, the six packages D20 exists for are briefed with §2's carve-out text (item 1 pastes §4… but §2 is **not** in the template at all — items 1–10 cover §4, the package row, matrix rows, phone §2, demo §3/§4, tests, contrast, decisions, commits, and the no-edit rule). So D20 reaches them only through §3, which item 8 truncates at D17.

**Why it matters:** U5.3's implementer, briefed on D1–D17, reads its own row's `filtersVisible` and has no D20 to authorise it — the exact stop-and-raise QUAL-6 was raised to prevent, re-armed by the template.

**Fix:** item 8 → *"**Which decisions (D1–D20) govern it**, and the instruction to stop if one it depends on is unruled. **D20's carve-out is quoted in full for U2.3, U4.2, U4.3, U5.2, U5.3 and U6.3.**"* Consider adding §2 to item 1's list, since the scope boundary is now where the carve-out lives.

### [MINOR] QUAL-D-4 — "22 anchors" survives in six places, including U0's exit-criterion preamble and D3's ratifiable cell

**Doc:** plan `:56` (D3), `:215` (U0 preamble), `:454` (tracker) · matrix `:392` (D1), `:410` (D3), `:655` (§C.4)

V-1 replaced the fixed 22-anchor target with a set that grows per phase, and §9 item 1 (`:519`) now records *"('22 anchors' was the demo inventory's pre-port proposal and is superseded)"*. The fix-round verification checked for the string `22 anchors resolved`; the bare phrase survives. The sharpest instance is two lines above the U0 table:

> `:215` — *"**Exit criterion is mechanical: `check-rn-parity.mjs` must FAIL before this phase and PASS at 22 anchors after it. That is U0's RED/GREEN.**"*

against the Exit line for the same phase at `:225`: *"exits 0 at its CURRENT anchor set (**~15**) … **not 22**"*, and DoD 1's **~32**. Three numbers for one gate in one document. `:56`/`matrix:410` matter separately because they are D3's **recommendation cell** — the text an owner ratifies in one word.

**Fix:** `:215` → *"**Exit criterion is mechanical: `check-rn-parity.mjs` must FAIL before this phase and PASS at U0's anchor set (~15, per U0.4) after it. That is U0's RED/GREEN — the set grows with the phases (§6.6 gate 1).**"* In D3 (both docs) → *"extend the drift guard **to the anchors each package tokenises** (U0.4 ~15 → U1.1 +12 → U3.1 +4 → U8.2 +1) and add the banned-literal guard."* Tracker `:454` → "U0.4 drift guard + first anchor stage". Matrix `:392`/`:655` → "the drift guard (at its current anchor set)".

### [MINOR] QUAL-D-5 — Two housekeeping slips from the split and the insertions

**Doc:** `01-master-ui-parity-plan.md:309`/`:310`; `:153`, `:163`, `:169`, `:177`

(a) **B.5 row 41 is claimed by both halves of the split** — U6.4a's Matrix-rows carries `41 (partial)` while its file list (eight screens) contains no `DvrInfoScreen`, and U6.4b owns both row 41 and the file. U6.4a's implementer gets row 41's Delta pasted with no file to apply it to. Fix: drop `41 (partial)` from U6.4a, or name the residual it means.

(b) **§4 is now out of order** — §4.8 (`:153`) and §4.9 (`:163`) were inserted ahead of §4.6 (`:169`) and §4.7 (`:177`). Harmless to agents (item 1 pastes §4 whole) but D18's Blocks column sends a human reader to "§4.8" ahead of §4.6. Fix: move the two new sections after §4.7, or renumber.

---

## Plan Quality Summary — fix-delta

| | Count |
|---|---|
| FIXED-VERIFIED | 22 |
| REFUTED (accepted) | 1 |
| NOT-FIXED | 0 |
| REGRESSED | 0 |
| **NEW** | **5** (3 MAJOR · 2 MINOR) |

**Lane verdict: REVISE.**

No blocker remains — QUAL-1 is closed properly and U7.2 is buildable from its own cell. The three MAJORs are each a **single cell or bullet**, and they cluster on one theme worth naming for the next round: **the fixes are correct where they landed, but three of them did not propagate to the place that delivers them** — §4.5 still hands out the old branch, §6.4 still hands out D1–D17, and U0.1's cell now hands out four other packages' rows. A doc this size fixed this thoroughly earns one more pass over its *delivery* surfaces (§4.5, §6.4, the package Matrix-rows cells) rather than its content.
