# Plan review r1 — FIX-DELTA — VETTED (aggregator)

**Verdict: REVISE** — 0 BLOCKER · **4 MAJOR** (VD-1 regression, VD-2, VD-3, VD-4) · 7 MINOR (VD-5..11), after dedupe of 11 lane findings (ARCH-D-1..3, QUAL-D-1..5, REAL-D-1..3; two merges). Round-1: **45/46 FIXED-VERIFIED**, 1 REFUTED-ACCEPTED (V-37), 0 NOT-FIXED; no lane finding refuted or downgraded here. **U0-blocking: VD-1, VD-2, VD-3, VD-4, VD-5** (+ VD-9 before the owner's D1–D20 ratification pass). 19 concrete edits in §5; fix-delta r2 = same-lanes resume over those edits only.
**Aggregator:** Fable. **Base → head:** `3365e3e` → `011b0c8` (docs at `00-ui-parity-matrix.md` 748L, `01-master-ui-parity-plan.md` 529L).
**Inputs:** `plan-review/r1/VETTED.md` (46 V-IDs, BLOCK), `plan-review/r1/FIX-MAPPING.md` (45 FIXED / 1 REFUTED), lane files `r1-delta/lane-architect.md` (REVISE), `lane-quality.md` (REVISE), `lane-reality.md` (APPROVE).

---

## 1. Round-1 verification table — all 46 V-IDs

Lane columns: A = architect, Q = quality, R = reality. `✔` = FIXED-VERIFIED by that lane. Overlaps (V-3, V-4, V-5, V-8, V-17) were checked by two lanes; lane totals 13 + 22 + 14 = 49 dispositions over 46 IDs.

| V-ID | Sev (r1) | Lanes | Verdict | Note |
|---|---|---|---|---|
| V-1 | BLOCKER | A ✔ | FIXED-VERIFIED | anchor set grows per phase; deadlock gone. **Collateral regression → VD-1.** |
| V-2 | BLOCKER | Q ✔ | FIXED-VERIFIED | U7.2 buildable from its cell; inventory `#125` also confirmed by R. |
| V-3 | MAJOR | A ✔ Q ✔ | FIXED-VERIFIED | `ui/tokens/palette.ts` ruled; phone names binding. |
| V-4 | MAJOR | A ✔ Q ✔ | FIXED-VERIFIED | literal `rgba()`; jsdom helper for pins. |
| V-5 | MAJOR | Q ✔ R ✔ | FIXED-VERIFIED | `link`/`linkHover` in U0.1; A27 rehomed. **Cell-paste side-effect → VD-2.** |
| V-6 | MAJOR | A ✔ | FIXED-VERIFIED | D19 re-cut. **Overclaim residue → VD-6.** |
| V-7 | MAJOR | A ✔ | FIXED-VERIFIED | |
| V-8 | MAJOR | A ✔ Q ✔ | FIXED-VERIFIED | D18 + §4.8. **§4.5 not propagated → VD-3.** |
| V-9 | MAJOR | A ✔ | FIXED-VERIFIED | |
| V-10 | MAJOR | Q ✔ | FIXED-VERIFIED | |
| V-11 | MAJOR | Q ✔ | FIXED-VERIFIED | D20. **Not in briefing template → VD-4.** |
| V-12 | MAJOR | Q ✔ | FIXED-VERIFIED | |
| V-13 | MAJOR | R ✔ | FIXED-VERIFIED | |
| V-14 | MAJOR | R ✔ | FIXED-VERIFIED | |
| V-15 | MAJOR | R ✔ | FIXED-VERIFIED | **§3 D8 row still stale → VD-9.** |
| V-16 | MAJOR | R ✔ | FIXED-VERIFIED | |
| V-17 | MAJOR | Q ✔ (A collateral ✔) | FIXED-VERIFIED | |
| V-18 | MAJOR | Q ✔ | FIXED-VERIFIED | `:192` still argues from stale §4.5 → folded into VD-3. |
| V-19 | MINOR | A ✔ | FIXED-VERIFIED | |
| V-20 | MINOR | A ✔ | FIXED-VERIFIED | |
| V-21 | MINOR | A ✔ | FIXED-VERIFIED | |
| V-22 | MINOR | A ✔ | FIXED-VERIFIED | |
| V-23 | MINOR | A ✔ | FIXED-VERIFIED | |
| V-24 | MINOR | A ✔ | FIXED-VERIFIED | U6.4a/b split. **Row 41 double-claim → VD-7.** |
| V-25 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-26 | MINOR | Q ✔ | FIXED-VERIFIED | R confirmed all 17 sites at source. |
| V-27 | MINOR | Q ✔ | FIXED-VERIFIED | A47 → §4.9. **Re-landed in U0.1's cell → VD-2.** |
| V-28 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-29 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-30 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-31 | MINOR | Q ✔ | FIXED-VERIFIED (as written) | "one owner only" holds; **the owner chosen is wrong → VD-1 (ruling in §4).** |
| V-32 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-33 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-34 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-35 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-36 | MINOR | Q ✔ | FIXED-VERIFIED | |
| V-37 | (refuted r1) | Q — | REFUTED-ACCEPTED | no edit; correct. |
| V-38 | MINOR | R ✔ | FIXED-VERIFIED | totals re-parsed by script; match. |
| V-39 | MINOR | R ✔ | FIXED-VERIFIED | |
| V-40 | MINOR | R ✔ | FIXED-VERIFIED | |
| V-41 | MINOR | R ✔ | FIXED-VERIFIED | **upstream inventory row still stale → VD-10.** |
| V-42 | MINOR | R ✔ | FIXED-VERIFIED | |
| V-43 | MINOR | R ✔ | FIXED-VERIFIED | |
| V-44 | MINOR | R ✔ | FIXED-VERIFIED | |
| V-45 | MINOR | R ✔ | FIXED-VERIFIED | |
| V-46 | MINOR | R ✔ | FIXED-VERIFIED | |

**Accounting:** 46/46 present. 45 FIXED-VERIFIED · 1 REFUTED-ACCEPTED (V-37) · 0 NOT-FIXED · 0 REGRESSED-in-place. One collateral regression introduced by the V-1/V-3/V-31 edits (VD-1).

---

## 2. NEW findings — deduped

Dedupe map: ARCH-D-2 rows `:215/:56/:454` + QUAL-D-4 → **VD-5**; ARCH-D-2 row `:146` + QUAL-D-2 → **VD-3**; everything else 1:1.

| VD | Sev | Source | Doc:line | Claim | Evidence | Required fix (concrete text) |
|---|---|---|---|---|---|---|
| **VD-1** | **MAJOR (regression)** | ARCH-D-1 | plan `:219`, `:263`, `:249` | `errorLight #b72136` moved U0.1 → U3.1, but U2.2 (phase U2, Deps `U0.3, U1`) specifies danger fill `#b72136`; U0.5's banned-literal guard forbids the hardcode, and U3.1 is a later phase U2.2 does not depend on. | `grep -n errorLight plan` → only `:219` (declining) and `:263` (adding). `:249` U2.2 danger `#b72136`, Deps tail `U0.3, U1`. Phone `Colors.ts:170` `errorLight: '#b72136'`. See §SC-1. | `:219` U0.1 ADD list: re-add `errorLight #b72136`; replace *"`errorLight` is NOT added here — U3.1 owns the whole status family"* with *"`errorLight #b72136` IS added here — U2.2's danger fill (A52) takes it in phase U2, before U3.1 exists; the rest of the `*Light` family is U3.1's."* `:263` U3.1: strike `errorLight #b72136` from ADD; replace *"U3.1 owns the whole status family — `errorLight` is created HERE and NOT in U0.1 (it was listed in both; one owner only)"* with *"`errorLight` already exists from U0.1 (one owner only — U0.1); U3.1 adds the remaining `*Light` / `*OnLight` / `*Accent` tokens."* Keep `errorOnLight` in U3.1. |
| **VD-2** | **MAJOR** | QUAL-D-1 | plan `:219` vs matrix `:687` | U0.1's Matrix-rows cell is the U0 **by-phase** list pasted verbatim (`A1–A9, A19, A27, A28, A41, A42, A47, A50, A53, A96, A97`), double-owning U0.2/U0.3/U0.4/U0.5 rows and re-landing A47 (removed from U0.2 by V-27). §6.4 item 3 pastes each cell's rows with full Delta text into the brief. | Matrix `:687` reads character-for-character the same list `(**19**)`. Sibling cells: A41/A42/A53 at `:220`, A50 `:221`, A96 `:222`, A97 `:223`. See §SC-2. | `:219` Matrix-rows → **`A1–A9, A19, A27, A28`**. Add one line under the U0 table: *"The by-phase list in matrix §TOTALS covers the whole phase — `A41/A42/A53` are U0.2's, `A50` U0.3's, `A96` U0.4's, `A97` U0.5's; `A47` is §4.9's, not any package's."* |
| **VD-3** | **MAJOR** | QUAL-D-2 + ARCH-D-2 (`:146`) | plan `:146` (§4.5), `:155` (§4.8), `:192` | §4.5 says branches cut **off `master`**; §4.8 (D18) says cut from `feat/uiparity` (U0.1 excepted) and cites "per §4.5". D18's Blocks column names §4.5 as changed; it was not. §6.4 item 1 pastes §4 whole into every brief. `:192` still argues from the stale §4.5. | `:146` verbatim: *"Branch per package: `feat/uiparity-u<N>-<slug>` off `master`."* `:192`: *"while §4.5 cuts every package branch off `master`"*. | `:146` → *"Branch per package: `feat/uiparity-u<N>-<slug>`, **cut from the `feat/uiparity` integration branch (§4.8 / D18)** — except U0.1's, which is cut from `master` (§5 prerequisite). One PR per phase (or per package for L-sized packages — the orchestrator's call)."* `:192` → *"while U0.1's branch is cut from `master` (§4.8)"*. |
| **VD-4** | **MAJOR** | QUAL-D-3 | plan `:385` (§6.4 item 8) vs `:4`, `:71-73` | Briefing template item 8 says "D1–D17"; D18–D20 are execution-shaped (branch cut, U2∥U3 re-cut, behaviour carve-out) and §6.4 is the only channel by which §3 reaches an implementer. §2 (where D20's carve-out lives) is not in item 1's paste list. | `:385` verbatim: *"**Which decisions (D1–D17) govern it**"*. `:4`: *"rules on **D1–D20**"*. See §SC-4. | `:385` → *"**Which decisions (D1–D20) govern it**, and the instruction to stop if one it depends on is unruled. **D20's carve-out (§2) is quoted in full in the briefs for U2.3, U4.2, U4.3, U5.2, U5.3 and U6.3.**"* Add §2 to item 1's paste list. |
| **VD-5** | MINOR | ARCH-D-2 + QUAL-D-4 | plan `:56`, `:215`, `:454`; matrix `:392`, `:410`, `:655` | "22 anchors" / "22-anchor" survives in six places after V-1 superseded it (`:519`). `:215` is U0's bolded RED/GREEN preamble, ten lines above `:225`'s "~15 … not 22"; `:56` / matrix `:410` are D3's ratifiable recommendation cell. | grep confirmed all six (§SC-5). | `:215` → *"must FAIL before this phase and PASS at U0's own anchor set (~15, per U0.4) after it. That is U0's RED/GREEN — the set grows with the phases (§6.6 gate 1)."* `:56` and matrix `:410` → *"extend the drift guard to the anchors each package tokenises (U0.4 ~15 → U1.1 +12 → U3.1 +4 → U8.2 +1) and add the banned-literal guard"*. `:454` → *"U0.4 drift guard + first anchor stage"*. Matrix `:392`, `:655` → *"the drift guard (at its current anchor set)"*. |
| **VD-6** | MINOR | ARCH-D-3 | plan `:363-364`, `:266` | §6.1 says D19's re-cut "resolves this" for the shared set; two of seven collisions are not U3.3's and survive: `_pane-chrome.tsx` (U2.4 `:163` ∥ U3.2 `:68`) and `export/ExportCaseCard.tsx` (U2.4 `:68-82` ∥ U3.4's A80 sweep at `:211`). U3.4's A80 sweep also reaches U4.4/U7.2 and U5.2/U5.3 serialised files with no "cross-cutting" rule like U0.1's. | See §SC-6. | `:363` → *"D19's re-cut resolves five of the seven. Two survive: `_pane-chrome.tsx` (U2.4 ∥ U3.2 — row below) and `export/ExportCaseCard.tsx` (U2.4 `:68-82` ∥ U3.4's A80 sweep). Both textual, non-overlapping regions; merge U2 before U3."* U3.4 `:266` add: *"**U3.4's empty-state pass is a cross-cutting sweep** — A80's ten sites include files owned by U2.4, U4.4/U7.2 and U5.2/U5.3. It touches only the empty-state block in each and opens those files for nothing else."* |
| **VD-7** | MINOR | QUAL-D-5(a) | plan `:309-310` | U6.4a's Matrix-rows carries `41 (partial)` but its file list has no `DvrInfoScreen`; U6.4b owns row 41 and the file. | See §SC-7. | Drop `41 (partial)` from U6.4a's Matrix-rows, or name the residual U6.4a is meant to apply. |
| **VD-8** | MINOR | QUAL-D-5(b) | plan `:153`, `:163`, `:169`, `:177` | §4.8 and §4.9 were inserted before §4.6 and §4.7. | See §SC-8. | Move §4.8/§4.9 after §4.7 (no renumbering — cross-refs stay valid). |
| **VD-9** | MINOR | REAL-D-1 | plan `:61` (§3 D8) | D8's gate row still says "and its test pins … update `SplashScreen.test.tsx`" — the claim V-15 removed from A87, matrix D8 and U8.1. This is the row the owner ratifies. | `:61` verbatim confirmed. | `:61` → `| **D8** | Splash `#000314` → `#002853` (`BootSequence.tsx:272`) | **Port the value and re-measure the disclosure against the new ground in the same commit. There is no `#000314` assertion — `SplashScreen.test.tsx:43-48` is a `>= 0.65` floor, and the floor may itself need raising to hold 5.27:1.** | U8.1 |` |
| **VD-10** | MINOR | REAL-D-2 | `demo-ui-inventory.md:2186` | V-41's upstream source still reads `reduced-motion.test.tsx:45,52`; `:2232` in the same file contradicts it. §6.4 item 6 briefs test lists from demo §6, so the stale row can override the corrected plan cell. | See §SC-10. | Rewrite `:2186` in place with a `**CORRECTED (plan-review r1, V-41)**` marker: `:45` → spinner `animation ''`; `:52-53` → `#35A0D6`. Same treatment as the `phone-ui-delta-inventory.md` V-2 row. |
| **VD-11** | MINOR | REAL-D-3 | plan `:235` (U1.1) | `Colors.ts:345-406` excludes the sixth tier (`recessed :433-438`). | See §SC-11. | `:235` → `Colors.ts:345-438`. |

**Counts after dedupe: 0 BLOCKER · 4 MAJOR (VD-1..4) · 7 MINOR (VD-5..11).** Severities confirmed by §3.

---

## 3. Spot-check log (aggregator, at doc line and at source)

| SC | For | Checked | Result |
|---|---|---|---|
| SC-1 | VD-1 | plan `:219` ADD list — contains `errorDark`, `successDark`, `infoDark`, `primaryDark`, no `errorLight`; the bolded *"`errorLight` is NOT added here — U3.1 owns the whole status family"* is present. `:263` ADD list contains **`errorLight #b72136`**. `:249` U2.2: *"**danger:** fill+border **`#b72136`**"*, Deps `U0.3, U1`. `grep b72136` in plan → only `:249`, `:263`. Matrix A52 (`:137`) *"dark **`#b72136`** (= `errorLight`)"* phased **U2**; A67 (`:159`) *"`DangerFill.dark #b72136` (A52)"* phased **U2**; matrix `:207` footnote: A28 *"MISSING for four (`primaryDark`, `errorLight`, `successDark`, `infoDark` — all four must be ADDED)"* — and A28 is in U0.1's own Matrix-rows. Phone `Colors.ts:170` `errorLight: '#b72136'`, `:171` `errorDark: '#ee2f44'`. A28's Phase cell = **U0**; matrix rows A14–A18 (U3.1's own Matrix-rows) contain **zero** mentions of `errorLight` — the "status family" claim at `:263` has no matrix backing. | **CONFIRMED — real regression.** The matrix itself (A28 footnote) places `errorLight` in a U0.1 row; two U2 rows consume it; the plan now creates it in U3. `errorDark` in U0.1 is correct and stays. MAJOR upheld. |
| SC-2 | VD-2 | plan `:219` Matrix-rows = `A1–A9, A19, **A27**, A28, A41, A42, A47, A50, A53, A96, A97`; matrix `:687` U0 by-phase = same string + `(**19**)`. `:220` U0.2 = `A41, A42, A49, A53 (**not A47 — the type rule lives in §4.9**)`; `:221` U0.3 = `A50`; `:222` U0.4 = `A96`; `:223` U0.5 = `A97, matrix §C.4`. §6.4 item 3 (`:381`): *"Its matrix rows … pasted with their **full Delta text**"*. | **CONFIRMED.** Verbatim paste of the phase list; A47 re-landed one cell left of where V-27 removed it. MAJOR upheld. |
| SC-3 | VD-3 | plan `:146` *"off `master`"*; `:155` *"every package branch is cut from it (except U0.1's …)"*; `:192` *"while §4.5 cuts every package branch off `master`"*; D18 `:71` Blocks names §4.5. §6.4 item 1 pastes §4 in full. | **CONFIRMED.** Note `:155`'s "per §4.5" refers to *merge commits*, not the cut — ARCH-D-2's "cites the opposite" is slightly overstated, but the contradiction stands. MAJOR upheld. |
| SC-4 | VD-4 | plan `:385` item 8 *"(D1–D17)"*; `:4` *"D1–D20"*; items 1–10 read in full — §2 is absent from item 1's list. D20 `:73` names the six packages. | **CONFIRMED.** MAJOR upheld. |
| SC-5 | VD-5 | `grep '22 anchors\|22-anchor'` → plan `:56`, `:215`, `:454`; matrix `:392`, `:410`, `:655`. `:519` records the supersession. `:215` is bolded and sits in U0's phase preamble. | **CONFIRMED**, six sites. MINOR (one careful reader resolves it via `:225`), but the `:215`/`:56` instances are in U0's brief and D3's ratifiable cell — so U0-blocking despite severity. |
| SC-6 | VD-6 | plan `:363` *"D19's re-cut resolves this"*; `:364` *"removes one of the three"*; U3.4 `:266` scopes A80's ~10 sites; matrix A80 (`:172`) enumerates `ExportCaseCard:211`, `MediaLibrarySheet:494-505`, `LocationList:159-172`, `MapScreen:105-117`. Source: `_pane-chrome.tsx` 326L, `:68` `const NOTE_TONE`, `:163` `const radioOption`; `ExportCaseCard.tsx:68` `const boxBase`, `:82` `}`, `:211` italic `#7a9fc4` empty state. | **CONFIRMED.** Overclaim + missing sweep rule. MINOR upheld. |
| SC-7 | VD-7 | plan `:309` U6.4a Matrix-rows `… 41 (partial) …`, file list has no `DvrInfoScreen`; `:310` U6.4b rows `34, 35, 41, 46`, files include `DvrInfoScreen.tsx`. | **CONFIRMED.** MINOR. |
| SC-8 | VD-8 | `grep '^### 4\.'` → 4.1, 4.2, 4.3, 4.4, 4.5, **4.8, 4.9**, 4.6, 4.7. | **CONFIRMED.** MINOR. |
| SC-9 | VD-9 | plan `:61` verbatim *"and its test pins … update `SplashScreen.test.tsx` in the same commit"*. Source: `SplashScreen.test.tsx` 106L; `:41` is the `#000314` comment; `:48` `expect(alpha).toBeGreaterThanOrEqual(0.65)`. | **CONFIRMED.** MINOR — but §3 is the ratification surface; fix before the owner's pass. |
| SC-10 | VD-10 | `demo-ui-inventory.md:2186` `…test.tsx:45,52 | #35A0D6`; `:2232` `…test.tsx:45 | spinner animation ''`. Source `:45` `expect(spinner!.style.animation).toBe('')`, `:53` `borderTopColor: '#35A0D6'`. | **CONFIRMED.** MINOR. |
| SC-11 | VD-11 | phone `Colors.ts:345` `dark: {`, `:406` is a comment line (*"The 'well' tier…"*), `recessed` `:433-438`, block closes `:439`. | **CONFIRMED.** `345-438` is the right range. MINOR. |

No severity changed by spot-check. No lane finding refuted.

---

## 4. Rulings on lane disagreements

**R-D1 — V-31 (QUAL: FIXED-VERIFIED, owner U3.1) vs ARCH-D-1 (owner must be U0.1).** Both lanes agree on the invariant ("one owner only"); they disagree on which. The contracts decide it: the matrix phases A52/A67 (the consumers) at U2 and files `errorLight` under A28 (a U0.1 row) as "must be ADDED"; §4.8/D18 makes U2 depend on U0–U1 only; U0.5's banned-literal guard forbids the hardcode exit. So the only owner that keeps every phase buildable is **U0.1**. Ruling: **ARCH-D-1 upheld as VD-1 (MAJOR, regression)**; V-31 stays FIXED-VERIFIED in substance — the writer applies "one owner" with U0.1 as that owner and U3.1's text amended per VD-1. U3.1's four status anchors (`success`, `successLight`, `warning`, `warningLight`) are unaffected; U0.4's ~15 set gains `errorLight` back (it was in the r1 recommendation's list at VETTED V-1).

**R-D2 — Reality APPROVE vs Architect/Quality REVISE.** Not a factual disagreement: Reality's scope was citation truth and it found none false. The verdict rule (any MAJOR → REVISE) governs.

**R-D3 — MAJOR for QUAL-D-1/2/3 (each "a single cell or bullet").** Upheld. Size of edit is not severity; all three sit on the *delivery* surfaces (§6.4 template, §4.5, U0.1's cell) that decide what an implementer actually receives, and two of them (VD-2, VD-3) reach the U0 briefs directly.

**R-D4 — VD-5 severity.** Kept MINOR per both lanes, but flagged U0-blocking (see §5) because `:215` is pasted into every U0 brief as the phase's bolded RED/GREEN and `:56` is D3's ratifiable text.

---

## 5. Ordered fix list for the writer

### `01-master-ui-parity-plan.md` (ascending line)

| # | Line | VD | Edit |
|---|---|---|---|
| 1 | `:56` | VD-5 | D3 recommendation: *"extend the drift guard to 22 anchors"* → *"extend the drift guard to the anchors each package tokenises (U0.4 ~15 → U1.1 +12 → U3.1 +4 → U8.2 +1)"* |
| 2 | `:61` | VD-9 | D8 row → the VD-9 text (floor, not pins; `BootSequence.tsx:272`; floor may need raising) |
| 3 | `:146` | VD-3 | §4.5 first bullet → cut from `feat/uiparity` (§4.8 / D18), U0.1 from `master` |
| 4 | `:153-168` | VD-8 | move §4.8 + §4.9 below §4.7 (`:177…`) — do this LAST among the plan edits so the other line numbers above stay valid while editing |
| 5 | `:192` | VD-3 | *"while §4.5 cuts every package branch off `master`"* → *"while U0.1's branch is cut from `master` (§4.8)"* |
| 6 | `:215` | VD-5 | U0 preamble → *"PASS at U0's own anchor set (~15, per U0.4) after it … the set grows with the phases (§6.6 gate 1)"* |
| 7 | `:219` | VD-2 | U0.1 Matrix-rows → `A1–A9, A19, A27, A28`; add the one-line by-phase note under the U0 table |
| 8 | `:219` | VD-1 | U0.1 ADD list: re-add `errorLight #b72136`; replace the "NOT added here" sentence per VD-1 |
| 9 | `:235` | VD-11 | `Colors.ts:345-406` → `Colors.ts:345-438` |
| 10 | `:263` | VD-1 | U3.1: strike `errorLight #b72136` from ADD; replace the "created HERE and NOT in U0.1" sentence per VD-1 |
| 11 | `:266` | VD-6 | U3.4: add the cross-cutting-sweep sentence |
| 12 | `:309` | VD-7 | U6.4a: drop `41 (partial)` or name the residual |
| 13 | `:363` | VD-6 | §6.1 shared-set row: "resolves this" → "resolves five of the seven …" per VD-6 |
| 14 | `:385` | VD-4 | §6.4 item 8: `D1–D17` → `D1–D20` + the D20 full-quote rule; add §2 to item 1 |
| 15 | `:454` | VD-5 | tracker: *"U0.4 drift guard + 22 anchors"* → *"+ first anchor stage"* |

### `00-ui-parity-matrix.md`

| # | Line | VD | Edit |
|---|---|---|---|
| 16 | `:392` | VD-5 | *"the 22-anchor drift guard"* → *"the drift guard (at its current anchor set)"* |
| 17 | `:410` | VD-5 | D3 item 4 → same wording as plan `:56` |
| 18 | `:655` | VD-5 | *"the 22-anchor drift guard"* → *"the drift guard (at its current anchor set)"* |

### `demo-ui-inventory.md`

| # | Line | VD | Edit |
|---|---|---|---|
| 19 | `:2186` | VD-10 | in-place correction with `**CORRECTED (plan-review r1, V-41)**` marker: `:45` → `animation ''`; `:52-53` → `#35A0D6` |

### Must be clean before U0 can be briefed

**VD-1, VD-2, VD-3, VD-4, VD-5** (fix rows 1, 3, 5, 6, 7, 8, 10, 14, 15, 17). Reason: VD-1/VD-2 are inside U0.1's own row; VD-3 and VD-5 (`:215`) are pasted into every U0 brief via §6.4 items 1–2; VD-4 is the template itself and D18 governs U0.2–U0.5's branch cut; VD-5's `:56`/matrix `:410` and VD-9's `:61` are text the owner ratifies, and ratification precedes U0. **VD-9** should therefore also land before the owner's D1–D20 pass, though it does not touch a U0 brief. VD-6, VD-7, VD-8, VD-10, VD-11 may land in the same round but do not gate U0.

Re-review: fix-delta round 2 should be a **same-lanes resume** confined to the 19 edits above; no fresh full read is warranted.

---

## 6. Closing verdict (r2)

**Verdict: APPROVE** (house rule: no BLOCKER, no MAJOR open). Docs at HEAD `f354a6d` (fix round `1024a0b`), diff `git diff 011b0c8 -- docs/planning/demo-phone-ui-parity/0*.md`. Writer's `FIX-MAPPING-r2.md`: 11/11 FIXED. All three lanes APPROVE; 12/12 lane dispositions FIXED-VERIFIED; 0 new findings.

### Per-VD verification

| VD | Sev | Lane verification (r2) | Aggregator spot-check at HEAD |
|---|---|---|---|
| VD-1 | MAJOR (regression) | ARCH-D-1 → FIXED-VERIFIED (`lane-architect-r2.md`) | **Confirmed.** Plan `:219` U0.1 ADD list contains `errorLight #b72136` + *"IS added here — U2.2's danger fill (A52) takes it in phase U2, before U3.1 exists"*. `:265` U3.1 ADD list has no `errorLight`; reads *"already exists from U0.1 (one owner only — and that owner is U0.1 …)"*. `grep errorLight` plan → exactly `:219`, `:265`. |
| VD-2 | MAJOR | QUAL-D-1 → FIXED-VERIFIED (`lane-quality-r2.md`) | **Confirmed.** `:219` Matrix-rows = **`A1–A9, A19, A27, A28`**; `:225` carries the new *"Each package's Matrix-rows cell lists only ITS OWN rows"* note naming A41/A42/A53 → U0.2, A50 → U0.3, A96 → U0.4, A97 → U0.5, A47 → §4.9. |
| VD-3 | MAJOR | ARCH-D-2 (§4.5 half) + QUAL-D-2 → FIXED-VERIFIED | Confirmed: `:146` *"cut from the `feat/uiparity` integration branch (§4.8 / D18) — except U0.1's, which is cut from `master`"*; no `off \`master\`` survives in either doc. |
| VD-4 | MAJOR | QUAL-D-3 → FIXED-VERIFIED | Confirmed: `:380` item 1 now pastes **§2 and §4**; `:387` item 8 reads **D1–D20** + the D20 full-quote rule for the six packages. |
| VD-5 | MINOR (U0-blocking) | ARCH-D-2 + QUAL-D-4 → FIXED-VERIFIED | Confirmed: `22 anchors`/`22-anchor` → zero in the matrix; one in the plan, `:521`, which is the DoD's own supersession note. |
| VD-6 | MINOR | ARCH-D-3 → FIXED-VERIFIED (`:365`, `:268`) | Lane-verified; not re-opened. |
| VD-7 | MINOR | QUAL-D-5(a) → FIXED-VERIFIED | Confirmed: U6.4a Matrix-rows no longer lists 41; states *"Row 41 is U6.4b's in full"*. |
| VD-8 | MINOR | QUAL-D-5(b) → FIXED-VERIFIED | Confirmed: `### 4.1 … 4.9` now in sequence (`:77`–`:182`). |
| VD-9 | MINOR (pre-ratification) | REAL-D-1 → FIXED-VERIFIED (`lane-reality-r2.md`) | Lane-verified at `:61`; not re-opened. |
| VD-10 | MINOR | REAL-D-2 → FIXED-VERIFIED | Confirmed: `demo-ui-inventory.md:2186` → `:52-53` with the `CORRECTED (plan-review r1, V-41)` marker; the stale `:45,52` string is gone. |
| VD-11 | MINOR | REAL-D-3 → FIXED-VERIFIED | Confirmed: plan `:237` cites `Colors.ts:345-438`. |

**11/11 verified** (each by its originating lane; VD-1..5, 7, 8, 10, 11 additionally re-checked at the doc line by the aggregator). Reality's r2 observation on A80's *"all … italic"* wording (`MapScreen.tsx:105-117` is `#9fb6d0`, non-italic) is recorded as **no-action**: the row enumerates the sites by `file:line`, the implementer opens the file, and D12 governs the treatment either way. Nothing open.

### State of the plan — for the owner's ratification brief

Across two review rounds, 46 round-1 findings (2 BLOCKER / 16 MAJOR / 27 MINOR / 1 refuted) and 11 fix-delta findings (4 MAJOR / 7 MINOR) have been closed and independently re-verified — every `file:line` in both docs resolves at source (~160 citations re-opened across the phone repo and the demo worktree), the matrix's 97 Tier-A rows and 215-row totals are script-derived and reconcile, and the U0 phase (U0.1–U0.5) is buildable from the plan alone: the palette module, its phone naming, the `withAlpha`/`flattenOver` signatures, the staged drift-guard anchor set (~15 → +12 → +4 → +1, ~32 at DoD), the banned-literal guard, the branch model and the briefing template all agree with each other and with the matrix. What is **not** proven and remains owner-gated is §3's decision gate: execution does not start until **D1–D20** are ruled, and three of those — **D18** (integration branch `feat/uiparity`, `master` takes one merge at U8 exit, per-phase `git revert -m 1`), **D19** (re-cut U2 ∥ U3 rather than serialise; two textual collisions survive and are documented in §6.1), and **D20** (the behaviour-change carve-out for six named packages) — are execution-shaped and must be ruled in the same pass, since the U0 briefs paste the branch model and the template quotes D20. The matrix's §OWNER RATIFICATION table carries a one-line recommendation for all twenty; ruling "as recommended" on each is sufficient to unblock U0.1 once the planning bundle is merged to `master` (§5 prerequisite).
