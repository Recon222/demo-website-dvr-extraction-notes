# Plan review r1 fix-delta — FIX MAPPING r2

**Round:** 2 · **Verdict under repair:** REVISE (0 BLOCKER / 4 MAJOR / 7 MINOR)
**Disposition: 11 FIXED · 0 REFUTED · 0 PARTIAL · 0 unresolved.** All 19 §5 edits applied.
**Docs edited:** `01-master-ui-parity-plan.md` (529 → 531) · `00-ui-parity-matrix.md` (748, in place) · `demo-ui-inventory.md` (2,480, one row rewritten in place)
**Not committed.**

Ordering honoured: VD-8's §4.8/§4.9 move ran **last** among the plan edits, so every line number in §5 stayed valid while editing.

| VD | Sev | Disposition | Doc : location | What landed |
|---|---|---|---|---|
| **VD-1** | MAJOR (regression) | **FIXED** | plan U0.1 ADD list + U3.1 ADD list | `errorLight #b72136` **returned to U0.1**; the "NOT added here" sentence replaced with *"IS added here — U2.2's danger fill (A52) takes it in phase U2, before U3.1 exists, and U0.5's banned-literal guard forbids hardcoding it."* U3.1 strikes it from its ADD and now reads *"already exists from U0.1 (one owner only — and that owner is U0.1, because U2.2 consumes it a full phase before this one)"*. `errorOnLight` and the four status anchors stay U3.1's. Per R-D1. |
| **VD-2** | MAJOR | **FIXED** | plan U0.1 Matrix-rows + a new line under the U0 table | Cell → **`A1–A9, A19, A27, A28`** (was the whole-phase list pasted verbatim). Added: *"Each package's Matrix-rows cell lists only ITS OWN rows… `A41`/`A42`/`A53` are U0.2's, `A50` U0.3's, `A96` U0.4's, `A97` U0.5's, and **`A47` is §4.9's, not any package's**. Do not paste the phase list into a brief."* A47 no longer re-lands where V-27 removed it. |
| **VD-3** | MAJOR | **FIXED** | plan §4.5 first bullet + §5 prerequisite | §4.5 → *"cut from the `feat/uiparity` integration branch (§4.8 / D18) — except U0.1's, which is cut from `master` (§5 prerequisite)"*. The §5 prerequisite's *"while §4.5 cuts every package branch off `master`"* → *"while U0.1's branch is cut from `master` (§4.8)"*. D18's Blocks column now describes a §4.5 that actually says this. Zero remaining *"off `master`"*. |
| **VD-4** | MAJOR | **FIXED** | plan §6.4 items 1 and 8 | Item 8 → **`D1–D20`**, plus *"D20's carve-out (§2) is quoted in full in the briefs for U2.3, U4.2, U4.3, U5.2, U5.3 and U6.3."* Item 1's paste list gains **§2** (*"§2 and §4 of this file in full — the scope carve-out (D20 lives there), the conventions…"*), so the one channel §3 reaches an implementer through now carries the execution-shaped decisions. |
| **VD-5** | MINOR (U0-blocking) | **FIXED** | plan `:56` D3, U0 preamble, tracker; matrix D1 rec, D3 item 4, §C.4 | All **six** bare *"22 anchors" / "22-anchor"* sites swept. D3 (plan + matrix) → *"extend the drift guard to the anchors each package tokenises (U0.4 ~15 → U1.1 +12 → U3.1 +4 → U8.2 +1)"*. U0's bolded RED/GREEN preamble → *"PASS at U0's own anchor set (~15, per U0.4) … the set grows with the phases (§6.6 gate 1)"*. Matrix D1 rec and §C.4 → *"the drift guard (at its current anchor set)"*. Tracker → *"U0.4 drift guard + first anchor stage"*. **The only surviving "22" is §9 DoD `:519`, which records the supersession deliberately.** |
| **VD-6** | MINOR | **FIXED** | plan §6.1 shared-set row + U3.4 | §6.1 → *"D19's re-cut resolves **five of the seven**. Two survive: `_pane-chrome.tsx` (U2.4 `:163` ∥ U3.2 `:68`) and `export/ExportCaseCard.tsx` (U2.4 `:68-82` ∥ U3.4's A80 sweep at `:211`). Both textual, non-overlapping regions: **merge U2 before U3.**"* U3.4 gains the cross-cutting-sweep rule naming the U2.4 / U4.4-U7.2 / U5.2-U5.3 files A80 reaches and the "empty-state block only" limit. |
| **VD-7** | MINOR | **FIXED** | plan U6.4a Matrix-rows | `41 (partial)` dropped, with the reason stated: *"Row 41 is U6.4b's in full — `DvrInfoScreen.tsx` is not in this package's file list."* |
| **VD-8** | MINOR | **FIXED** | plan §4 ordering | §4.8 and §4.9 moved below §4.7. Heading order is now 4.1 → 4.9 in sequence (verified by re-parsing `^### 4\.`); **no renumbering**, so every cross-reference to §4.8/§4.9 stays valid. Run last, per §5's instruction. |
| **VD-9** | MINOR (pre-ratification) | **FIXED** | plan §3 D8 row | → *"Splash `#000314` → `#002853` (`BootSequence.tsx:272`) — Port the value and re-measure the disclosure against the new ground in the same commit. **There is no `#000314` assertion** — `SplashScreen.test.tsx:43-48` is a `>= 0.65` floor, and the floor may itself need raising to hold 5.27:1."* The ratification surface now matches A87, matrix D8 and U8.1. |
| **VD-10** | MINOR | **FIXED** | `demo-ui-inventory.md` §6.2 row | Rewritten in place with a **`CORRECTED (plan-review r1, V-41)`** marker: cite is now `:52-53`; states that `:45` is `expect(spinner!.style.animation).toBe('')`, carries no colour, and is already listed correctly in that document's own §6.5; the `#35A0D6` pin is at `:53` inside the `toHaveStyle({` opened at `:52`. Same treatment as the `phone-ui-delta-inventory.md` V-2 row. **Zero remaining `:45,52`.** |
| **VD-11** | MINOR | **FIXED** | plan U1.1 | `Colors.ts:345-406` → **`Colors.ts:345-438`**, so the range covers the sixth tier (`recessed` `:433-438`). |

## Verification run

- `grep '22 anchors\|22-anchor'` across both docs → **1 hit**, `plan:519`, the §9 DoD line that records the supersession on purpose.
- `grep "off \`master\`\|(D1–D17)\|Colors.ts:345-406\|41 (partial)"` in the plan → **0**.
- `grep 'reduced-motion.test.tsx:45,52'` in `demo-ui-inventory.md` → **0**.
- `errorLight` in the plan → two sites, U0.1 (creates) and U3.1 (declines, pointing at U0.1). One owner.
- §4 heading order re-parsed: `4.1 … 4.9` ascending.

**All 19 §5 edits applied; nothing unresolved. Not committed.**
