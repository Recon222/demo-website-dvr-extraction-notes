# Plan review r2 — VETTED (aggregator) — post-ratification edit

**Verdict: BLOCK** — **1 BLOCKER** (V-47: D2's both-halves ruling never reached the U1–U4 seams; U1.1's binding `GLASS_TIER` signature is single-scheme, so U0.5's `LIGHT_GROUNDS` — which on the phone is built from `GlassColors.light` tier stops — has nothing to composite against and §9 cl. 12 is unreachable) · **3 MAJOR** (V-48 wave/D18 topology, V-49 U0 Scope cells, V-50 anchor count keys-vs-rows) · **7 MINOR** (V-51..V-57). 11 findings (5 ARCH + 4 QUAL + 1 REAL + 1 aggregator-originated from `a3a9001`), no dedupe merges (R-1). Topology ruled in R-2: waves = concurrent phases on their own phase branches, PR order = merge order, no wave branch — compatible with D18's revert granularity given one added "merge `master` after each earlier PR" rule. **U0-blocking: V-47 (rows 1/11/13), V-49, V-50, V-54, V-55, V-56, V-57.** 24 edits in §4.
**Aggregator:** Fable (warm seat from r1 / r1-delta). **Diff under review:** `git diff 1024a0b HEAD -- docs/planning/demo-phone-ui-parity/0*.md` — `ba1921d` (owner rulings D1–D20, D18 override, D2 amendment, waves, kit citations, estimates struck, source corrections) **plus `a3a9001`** (U0.0, measured baseline, scheme facts, harness recipe), which landed after the lanes read. HEAD = `baa368e`.
**Lane inputs:** `plan-review/r2/lane-architect.md` (BLOCK: 1 CRITICAL / 1 HIGH / 2 MEDIUM / 1 LOW), `lane-quality.md` (REVISE: 2 HIGH / 1 MEDIUM / 1 LOW), `lane-reality.md` (APPROVE: 1 LOW; 44/45 new claims verified).
**ID scheme:** V-IDs continue from r1's `V-46` (the `VD-*` series was the r1 fix-delta and is closed). Lane severities CRITICAL/HIGH/MEDIUM/LOW map to the house rule as BLOCKER/MAJOR/MINOR/MINOR.
**Line numbers** are at HEAD (`a3a9001` shifted the plan by +3 from `:236` on; lane citations `:224/:237/:238/:240/:241/:508/:614` read at HEAD as `:227?/:240/:241?/:243/:244/:511/:622` — every one re-located below by content, not by number).

---

## 1. Findings — deduped

**Dedupe ruling on ARCH-R2-1 vs QUAL-R2-1:** same root cause (the D2 amendment was written into §2/§3/U0 bodies and stopped), **kept as two findings**. They have different edit targets (six seam packages + U0.5's todo list vs two U0 Scope cells), different severities, and fixing either leaves the other open — merging them would let a "FIXED" on the cell edit mask the unbuilt seams. Cross-linked as V-47 ↔ V-49. No other overlaps; ARCH-R2-4 shares its fix paragraph with ARCH-R2-2 but is a distinct defect (a split phase, not a merge order) and stays separate.

| V-ID | Sev (house) | Lane ID | Doc:line (HEAD) | Claim | Evidence | Required fix |
|---|---|---|---|---|---|---|
| **V-47** | **BLOCKER** | ARCH-R2-1 | plan `:58` (D2), `:244` (U0.5), `:258` (U1.1), `:271` (U2.1), `:272` (U2.2), `:287` (U3.2), `:299` (U4.1), `:302` (U4.4), `:633` (§9 cl. 12) | D2-amended binds *"U1–U4 seams take colours from the scheme record, never a bare dark hex"* and §9 clause 12 makes a one-site `dark`→`light` flip with green light rows the DoD — but U1.1's **binding exported signature** is single-scheme (`GLASS_TIER = { card: {…}, nestedCard: …, … }`), its Recipes are dark-only, U2.2 hardcodes the dark `ElevatedEdges` pair, and U2.1/U4.1 never mention a scheme. U0.5 (wave 0) must port `LIGHT_GROUNDS` "in full, both schemes" — grounds that are light tier stops over the light background, values a wave-1 seam will never contain as written. | §SC-1. `grep -ci 'light\|scheme'` per row: U1.1's 3 "light" hits are all `highlightTop`; U2.1 0/0, U2.2 0/0, U4.1 0/0. Phone `Colors.ts:274-344` `GlassColors.light` has all six tiers; `:488-489` `ElevatedEdges = { light, dark }`. U0.5's `it.todo` instructions name only dark rows 31/33 (→U1.1) and 41–45 (→U5.2). | **Choose one, in the same pass.** (A, recommended — it is what the owner ruled): U1.1 shape → `GLASS_TIER = { light: { card: …, … }, dark: { card: …, … } } as const`, light values transcribed from `Colors.ts:274-344`, closing-act anchors = 12 keys pinned in both halves; U2.2 edge tokens → `ElevatedEdges = { light, dark }` per `Colors.ts:488-489`; one sentence in U2.1, U3.2, U4.1, U4.4: *"Recipes resolve through the scheme record (`palette[scheme]`, `GLASS_TIER[scheme]`); the demo passes `'dark'` at the single consumption site named in §9 cl. 12."*; U0.5: *"the light tier-ground rows land `it.todo` and un-todo in U1.1, exactly like dark rows 31/33."* (B): strike D2's "U1–U4 seams" clause, U0.5's `LIGHT_GROUNDS` requirement and §9 cl. 12 — requires the owner to re-rule D2. |
| **V-48** | **MAJOR** | ARCH-R2-2 | plan `:213` (§5 wave 2 row), `:425-426` (§6.2 wave 2/3 rows), `:439` ("Merging") vs `:53`/`:74`/`:151`/`:184` (D18 topology) | §6.2's wave-2 "Fixed merge order" is one flat 11-package sequence across three phases and the closing paragraph says gates run *"on the phase branch"* (singular); D18's topology has no branch on which a cross-phase sequence can be assembled (`grep -c "wave branch"` → 0). Reading (a) one branch per wave breaks `git revert -m 1 <phase merge>`; reading (b) per-phase branches leaves the flat order unexecutable. | §SC-2. Ruling R-2 below settles the topology. | Per R-2: rewrite wave 2/3 "Fixed merge order" cells as **within-phase order** + **phase-PR order to `master`** (wave 2: U2 → U3 → U4; wave 3: U5 → U6 → U7); add the standing rule *"When an earlier-ordered phase PR lands, every open phase branch in the wave merges `master` (`--no-ff`) and re-runs its gates before its own PR opens — never rebases."*; `:439` *"on the phase branch"* → *"on each phase branch, at that phase's assembly"*. |
| **V-49** | **MAJOR** | QUAL-R2-1 | plan `:240` (U0.1 Scope), `:244` (U0.5 Scope) | Scope cells still read *"add every missing **dark** token"* / *"Port `palette-contrast.test.ts` (**dark half**)"* while the same rows' bodies ship both halves. §6.4 item 2 pastes the row verbatim; the Scope cell is the first thing the implementer reads. | §SC-3: both strings confirmed verbatim at HEAD; `a3a9001` did not touch them. | U0.5 Scope → *"Port `palette-contrast.test.ts` (**both schemes, per D2-amended**) and widen `glass-tokens.test.ts`'s banned-literal mechanism."* U0.1 Scope → *"Re-base `T` and add every missing token **in both scheme halves (D2-amended)**."* Cross-link: V-47. |
| **V-50** | **MAJOR** | QUAL-R2-2 | plan `:235` (U0 preamble), `:243` (U0.4 3b), `:248` (U0 exit), `:511` (§6.6 gate 1), `:622` (§9 DoD 1) | U0.4 (3b) says *"light anchors count toward the anchor set"*; every counter stays at the single-scheme figure (~15 / +12 / +4 / +1 / ~32). Keys or rows is undefined, so U0.4's RED/GREEN is ambiguous by a factor of two. | §SC-4 confirmed. Also interacts with V-47(A): U1.1's "+12" must become "12 keys × 2 halves". | Add to U0.4 (3b): *"The count is **keys**, each pinned in both halves — U0.4's ~15 keys are ~30 anchor rows. All stage figures (~15 → +12 → +4 → +1, ~32 at the end) are key counts."* Echo "(keys)" once at `:235`, `:248`, `:511`, `:622`. |
| **V-51** | MINOR | ARCH-R2-3 | plan `:347` (U7.3 Files), §6.1 | U7.3's A93 sweep is *"every user-facing string in `ui/**`"* — a glob that intersects every file U5/U6 hold open in wave 3; the ∅ claims are computed over named files only. U3.4's identical defect was bounded (VD-6); `grep -c cross-cutting` on U7.3's row → 0. | §SC-5 confirmed. Edits are one-character; conflicts textual. | Add U3.4's sentence to U7.3: *"**A93 is a cross-cutting sweep** — it greps every user-facing string under `ui/**`, including files U5 and U6 own in this wave. It edits only the offending string in each and opens those files for nothing else."* Add a §6.1 row for it. |
| **V-52** | MINOR | ARCH-R2-4 | plan `:210` (§5 wave 1), `:424` (§6.2 wave 1) | U3.1 rides wave 1 without its phase; under D18 there is no `feat/uiparity-u3` at wave 1 and no PR story for a lone package. | §SC-2. | Per R-2: *"U3.1 rides wave 1 on `feat/uiparity-u3`, cut from `master` at wave-1 start; it merges as **U3's first phase PR** at wave-1 end (§4.5 already allows more than one PR per phase). `feat/uiparity-u3` then merges `master` after U1's PR and continues in wave 2; U3 (rest) is U3's second PR."* |
| **V-53** | MINOR | ARCH-R2-5 | plan: §2 + eight phase Exit lines (`grep -c 'Fidelity:'` → 9) | §2's fidelity bar is pasted verbatim into all eight exits, against §4.7's own anti-restatement rule. | Confirmed: 9 occurrences. | Each Exit → *"**Fidelity:** §2's bar."* |
| **V-54** | MINOR | QUAL-R2-3 | `02-ratification-brief.md:43` | The forward runbook step still says *"Cuts `feat/uiparity` (per D18)"* — the branch the owner rejected. The header correctly marks the brief historical. | Confirmed verbatim. | `:43` → *"Cuts the `feat/uiparity-u0` phase branch off `master` (D18 **as overridden** — plan §4.8) and briefs U0 per plan §6.4 …"*. |
| **V-55** | MINOR | QUAL-R2-4 | plan `:240` (U0.1, `errorLight` clause) | *"U2.2's danger fill (A52) takes it in phase U2, before U3.1 exists"* is false under the waves (U3.1 = wave 1, U2.2 = wave 2). Outcome (one owner, U0.1) is right. | Confirmed. | Clause → *"— it is the one `*Light` the danger fill needs from the palette module itself, and U0.5's banned-literal guard forbids hardcoding it. The rest of the `*Light` family is U3.1's."* |
| **V-56** | MINOR | REAL-R2-1 | plan `:240` (U0.1, `primaryLight` sweep) | *"41 sites across 20 files"* — 41 bare sites sit in **19** files; the 20th (`mapTokens.ts`) holds only the keyed definition. | Lane-verified by grep; not re-run. | → *"41 sites across **19** files, 4 of them lowercase (`mapTokens.ts` holds only the keyed definition)."* |
| **V-57** | MINOR | **AGG-R2-1** (aggregator; introduced by `a3a9001`, unseen by the lanes) | plan `:239` (U0.0), `:243` (U0.4) | U0.0 now owns *"wrap each anchor's read in its own `try/catch` and report `PARSE-FAILED` … repair the throw only"*, but U0.4's row still says *"Fix the four defects … **The parse-failure fix is the important one** — a renamed phone constant must degrade to one `PARSE-FAILED` anchor, never a throw"*. Two packages own the same repair — the double-ownership class VD-1/VD-2 closed, re-created by the new package. U0.0's Matrix-rows `A96 (partial)` is the `(partial)` pattern VD-7 just removed, though here the residual *is* named. | §SC-6. | U0.4 Scope → *"Fix the remaining defects (U0.0 already landed the `PARSE-FAILED` degrade — do not re-touch `:74-75`), then extend only to anchors U0.1 creates."* Strike or reword *"the parse-failure fix is the important one"* to *"U0.0's `PARSE-FAILED` degrade is the precondition; this package proves it with a deliberately-broken anchor (§9 DoD 1)."* Matrix A96: note U0.0 as co-owner of the throw fix. |

**Counts after dedupe: 1 BLOCKER (V-47) · 3 MAJOR (V-48, V-49, V-50) · 7 MINOR (V-51..V-57).** Eleven lane/aggregator findings, no merges.

---

## 2. Spot-check log (aggregator, at doc line and at source)

| SC | For | Checked | Result |
|---|---|---|---|
| SC-1 | V-47 (CRITICAL) | Plan `:58` D2: *"U1–U4 seams take colours from the scheme record, never a bare dark hex"*; `:633` §9 cl. 12: one-site flip, *"light contrast rows are already green when it flips"*. `:258` U1.1 **Exported shape:** `export const GLASS_TIER = { card: { gradient…; border…; highlightTop…; innerShadow… }, nestedCard: …, … } as const` — flat, no scheme key; the row's only "light" strings are `highlightTop`. `:272` U2.2 edge tokens hardcoded `borderTopColor: rgba(255,255,255,0.14)` / `borderBottomColor: rgba(0,0,0,0.3)` = phone `ElevatedEdges.dark` only; `Colors.ts:487-490` is `{ light: { top: rgba(255,255,255,0.35), bottom: rgba(0,0,0,0.1) }, dark: {…} }`. `:271`/`:299` U2.1/U4.1 contain neither "light" nor "scheme". `:244` U0.5 requires *"BOTH the `DARK_GROUNDS` and `LIGHT_GROUNDS` stacks … matrix §C.1 in full, both schemes"*; its `it.todo` instructions cover only dark rows 31/33 (→U1.1) and 41–45 (→U5.2). **Phone `palette-contrast.test.ts:152-158`: `LIGHT_GROUNDS = [LIGHT_BG, ...stops(GlassColors.light.card), ...stops(GlassColors.light.nestedCard, …), ...stops(GlassColors.light.sheet), ...stops(GlassColors.light.recessed, …)]`** — the light grounds are the light tier stops. `Colors.ts:273-344` `GlassColors.light` defines `card`, `nestedCard`, `elevated`, `header`, `sheet`, `recessed`. | **CONFIRMED CRITICAL.** U0.5 (wave 0) is specified to composite against values that only U1.1 can create and U1.1's binding signature forbids. §9 cl. 12 is unreachable as written. BLOCKER upheld. |
| SC-2 | V-48 / V-52 | `:53`, `:74`, `:151`, `:184`, `:188` all state the per-phase topology in the same words; `:425` wave-2 order `U2.1 → … → U3.4 → U4.1 → … → U4.4` (one sequence, three phases); `:426` wave 3 *"The three phases merge in that order; the lanes themselves run concurrently"*; `:439` *"gates at assembly on the phase branch"*. `grep -c 'wave branch'` → 0. Wave-2 rows U2.1–U2.4, U4.1–U4.4 consume **no** U3.1 token (grep for `successLight|warningLight|infoLight|warningAccent|OnLight|U3.1` → none in all eight). | **CONFIRMED.** See ruling R-2. The no-consumer fact lets U3.1 ride wave 1 without a mid-wave PR. |
| SC-3 | V-49 | `:240` Scope: *"Re-base `T` and add every missing dark token."*; body: *"ships BOTH scheme halves (D2, amended): `export const palette = { light: {…}, dark: {…} }`"*. `:244` Scope: *"Port `palette-contrast.test.ts` (dark half)"*. | **CONFIRMED.** MAJOR. |
| SC-4 | V-50 | `:243` (3b) *"light anchors count toward the anchor set"*; `:235` *"~15, per U0.4"*; `:248` *"CURRENT anchor set (~15)"*; `:622` *"~15 from U0.4, +12 … +4 … +`gridSubtle` … ~32"*; `:511` gate 1 says "the CURRENT anchor set" without a number (lane's `:508` cite is the shifted line; the number lives at `:622`). | **CONFIRMED.** Three numbered sites + (3b), not four; fix list adjusted. MAJOR. |
| SC-5 | V-51 | `:347` U7.3 Files ends *"every user-facing string in `ui/**`"*; `grep -c cross-cutting` on the row → 0. | **CONFIRMED.** MINOR. |
| SC-6 | V-57 | `:239` U0.0: *"Wrap each anchor's read in its own `try/catch` and report `PARSE-FAILED` … Repair the throw only — the anchor work stays in U0.4"*, Files `check-rn-parity.mjs:74-75`, Matrix-rows `A96 (partial)`. `:243` U0.4: *"Fix the four defects … The parse-failure fix is the important one — a renamed phone constant must degrade to one `PARSE-FAILED` anchor, never a throw"*; its numbered items are (1) `PrimaryButtonGradient`, (2) RN resolver, (3b) both halves, (4) web readers, (5) `norm`. | **CONFIRMED** — the degrade is U0.0's deliverable and U0.4's headline prose; not a numbered U0.4 defect, so a prose fix suffices. MINOR. |
| SC-7 | V-53 | `grep -c 'Fidelity:'` → **9** (§2 + eight exits; lane said eight exits — consistent). | Confirmed. |
| SC-8 | V-54 | `02-ratification-brief.md:43` verbatim *"Cuts `feat/uiparity` (per D18)"*. | Confirmed. |
| SC-9 | V-55 | `:240` *"takes it in phase U2, before U3.1 exists"*; §5 `:210` U3.1 in wave 1, U2 in wave 2. | Confirmed. |

No severity changed. Nothing refuted.

---

## 3. Rulings

**R-1 — V-47 vs V-49 (dedupe).** Two findings, one root cause; stated in §1. V-47 is the design fix, V-49 the cell fix; each is verified independently in the fix-delta.

**R-2 — Waves vs D18 topology (V-48, V-52).** The coordinator's intended reading is **confirmed compatible with D18 and with the fleet kit**, and it is the reading the plan must state: *a wave is a set of phases running concurrently, each on its **own** phase branch `feat/uiparity-u<N>` cut from `master`, each merging to `master` through its **own** phase PR; the merge order inside a wave is the order of the phase PRs; no wave-level branch exists.* This keeps `git revert -m 1 <phase merge>` at phase granularity (one merge commit per phase, as before), keeps §4.8's "dependency shape = revert-safety order" true, and keeps `dt-integrator`'s scope ("the phase branch") meaningful. The one rule the plan is missing, which makes the cross-phase conflict cells executable: **when an earlier-ordered phase PR lands on `master`, every still-open phase branch in the wave merges `master` (`--no-ff`, never rebase) and re-runs its assembly gates before its own PR opens.** That is where `_shared.tsx`'s U2↔U4 collision is resolved (on `feat/uiparity-u4`, after U2's PR), and it is a merge, so the house "never rebase" rule holds. §6.2's flat per-wave sequences are therefore rewritten as *within-phase order* (unchanged) plus *phase-PR order* (wave 2: U2 → U3 → U4; wave 3: U5 → U6 → U7 — the same order the cells already imply). **U3.1 (V-52):** since no wave-2 package consumes a U3.1 token (SC-2), U3.1 needs no mid-wave PR — it rides wave 1 on `feat/uiparity-u3`, cut from `master` at wave-1 start; that branch merges `master` after U1's PR and continues into wave 2; U3 lands as **one** phase PR at wave-2 end. No package moves phases, no tracker or matrix edit is needed. (The alternative — moving U3.1 into U0 — would renumber A14–A18's phase cells and the tracker; rejected as the larger diff for no gain.)

**R-3 — Severity mapping.** Lane CRITICAL → BLOCKER; HIGH → MAJOR; MEDIUM and LOW → MINOR. V-54 (MEDIUM) is MINOR by severity but **U0-blocking** by position (it is the orchestrator's next runbook step); V-57 likewise touches U0's first two packages.

**R-4 — V-47 option.** The aggregator recommends **(A)** (push the light half into the seams). It is what D2-amended and §9 cl. 12 already say; (B) reopens an owner ruling. The fix-delta should treat (B) as requiring a new D2 entry, not a writer's edit.

---

## 4. Ordered fix list for the writer

### `01-master-ui-parity-plan.md` (ascending line at HEAD; lines will shift — locate by content)

| # | Line | V | Edit |
|---|---|---|---|
| 1 | `:58` (D2) | V-47 | Append: *"This binds `GLASS_TIER` (U1.1) and `ElevatedEdges` (U2.2) as `{ light, dark }` records, not only `palette`."* |
| 2 | `:213` (§5 wave 2 row) + new sentence under `:214` | V-48 | Add R-2's rule: own phase branch per phase, PR order = merge order, open branches merge `master` after each earlier PR lands. |
| 3 | `:210` / `:424` (wave 1) | V-52 | Add the U3.1 sentence from V-52's fix. |
| 4 | `:235` | V-50 | *"(~15 keys, per U0.4)"*. |
| 5 | `:240` U0.1 Scope | V-49 | *"add every missing token in both scheme halves (D2-amended)"*. |
| 6 | `:240` U0.1 `errorLight` clause | V-55 | Replace the "before U3.1 exists" reason. |
| 7 | `:240` U0.1 `primaryLight` | V-56 | *"41 sites across 19 files"* + the `mapTokens.ts` note. |
| 8 | `:243` U0.4 Scope + prose | V-57 | *"Fix the remaining defects (U0.0 landed the `PARSE-FAILED` degrade — do not re-touch `:74-75`)"*; reword "the parse-failure fix is the important one" per V-57. |
| 9 | `:243` U0.4 (3b) | V-50 | Add the keys-not-rows clause and *"~15 keys are ~30 anchor rows"*. |
| 10 | `:244` U0.5 Scope | V-49 | *"(both schemes, per D2-amended)"*. |
| 11 | `:244` U0.5 Tests | V-47 | Add: *"the light tier-ground rows (§C.1 light `card`/`nestedCard`/`sheet`/`recessed` grounds) land `it.todo` and un-todo in U1.1, like dark rows 31/33."* |
| 12 | `:248` U0 exit | V-50 | *"(~15 keys)"*. |
| 13 | `:258` U1.1 | V-47 | Exported shape → `GLASS_TIER = { light: {…}, dark: {…} } as const`; Recipes gain the light half from `Colors.ts:274-344` (six tiers); closing act → *"12 tier keys, each pinned in both halves"*; consumers resolve `GLASS_TIER[scheme]`. |
| 14 | `:271` U2.1, `:287` U3.2, `:299` U4.1, `:302` U4.4 | V-47 | One sentence each: recipes resolve through the scheme record; the demo passes `'dark'` at the §9 cl. 12 site. |
| 15 | `:272` U2.2 | V-47 | *"the two edge tokens"* → `ElevatedEdges = { light: { top: rgba(255,255,255,0.35), bottom: rgba(0,0,0,0.1) }, dark: { top: rgba(255,255,255,0.14), bottom: rgba(0,0,0,0.3) } }` per `Colors.ts:487-490`; primary recipe reads `ElevatedEdges[scheme]`. |
| 16 | eight Exit lines (`:248`…`:349`) | V-53 | *"**Fidelity:** §2's bar."* |
| 17 | `:347` U7.3 | V-51 | Add the cross-cutting-sweep sentence. |
| 18 | §6.1 table | V-51 | Add a row: `ui/**` (strings) → U7.3, with U5/U6 in wave 3. |
| 19 | `:425` wave 2, `:426` wave 3 | V-48 | Split "Fixed merge order" into within-phase order + phase-PR order; cross-phase conflict cells become *"resolved on the later phase's branch after the earlier PR lands"*. |
| 20 | `:439` "Merging" | V-48 | *"on each phase branch, at that phase's assembly"*. |
| 21 | `:622` DoD 1 | V-50 | *"(key counts; each key pinned in both halves)"*. |

### `00-ui-parity-matrix.md`

| # | Where | V | Edit |
|---|---|---|---|
| 22 | A96 row | V-57 | Note U0.0 as owner of the throw→`PARSE-FAILED` degrade; U0.4 owns the rest. |
| 23 | A29–A40 (glass tiers), A51 (edges) | V-47 | Delta text: web form is the `{ light, dark }` record; demo consumes `dark`. |

### `02-ratification-brief.md`

| # | Line | V | Edit |
|---|---|---|---|
| 24 | `:43` | V-54 | *"Cuts the `feat/uiparity-u0` phase branch off `master` (D18 as overridden — plan §4.8) …"*. |

### Must be clean before U0 can be briefed

**V-47** (at minimum rows 1, 11, 13 — U0.5's todo list is meaningless until U1.1's shape is ruled), **V-49**, **V-50**, **V-57**, **V-54** (runbook step), **V-55/V-56** (both inside U0.1's row, pasted verbatim). **V-48/V-52** must be clean before **wave 1** is briefed, not U0 (U0 is a single phase on a single branch; §6.2 is not pasted into briefs). V-51 before wave 3; V-53 any time.

**Re-review:** fix-delta with the same three lanes resumed, confined to the 24 edits; the architect lane re-verifies V-47 at U1.1's signature and at U0.5's todo list specifically.

---

**`a3a9001` effect on the lane findings:** resolves none, worsens none. It adds U0.0 to wave 0 and the tracker, the measured baseline, the harness recipe, and §9 clause 12's tripwire list; it does not touch the seam rows, the Scope cells, the anchor counters, §6.2's merge-order cells, or the brief. Its one side-effect is V-57.

---

## 5. Closing verdict (r3)

**Verdict: APPROVE** (house rule: no BLOCKER, no MAJOR open). Docs at HEAD `99351e9` (fix round `81468a1` + arithmetic `99351e9`). Writer's `FIX-MAPPING-r3.md`: 12/12 FIXED (V-47..V-57 + REAL-R3-1). Delta lanes: architect 5/5, quality 4/4, reality 3/3 + REAL-R3-1 fixed — all three APPROVE; 0 new findings; nothing refuted.

### Per-V verification

| V | Sev | Lane verification (r3) | Aggregator spot-check at HEAD |
|---|---|---|---|
| V-47 | BLOCKER | ARCH-R2-1 → FIXED-VERIFIED; all 24 light tier values diffed byte-exact vs `Colors.ts:274-344` | **Confirmed.** U1.1 `:262` exported shape `GLASS_TIER = { light: { card: {…}, nestedCard: …, … }, dark: … } as const`, cites `Colors.ts:274-344`. Consumers: U2.1 `:275`, U3.2 `:291`, U4.1 `:303`, U4.4 `:306` each carry `GLASS_TIER[scheme]` / `palette[scheme]` / "scheme record"; U2.2 `:276` `borderTopColor: ElevatedEdges[scheme].top` / `.bottom`, `ElevatedEdges` as `{ light, dark }` per `Colors.ts:487-490`. D2 `:58` now binds `GLASS_TIER` and `ElevatedEdges`. U0.5 `:248`: *"The LIGHT tier-ground rows land `it.todo` the same way and un-todo in U1.1 too"*. |
| V-48 | MAJOR | ARCH-R2-2 → FIXED-VERIFIED (`:214`, `:430`, `:431`, `:444`) | **Confirmed.** `:214` topology sentence (concurrent phases, own phase branch, own PR, PR order = merge order, no wave branch); wave-2/3 cells split into **Within phase** + **Phase-PR order to `master`** (U2 → U3 → U4; U5 → U6 → U7), *"resolved on the LATER phase's branch after the earlier PR lands"*, *"each merges `master` and re-gates after an earlier PR lands"*; `:444` *"gates on each phase branch, at that phase's assembly"*. |
| V-49 | MAJOR | QUAL-R2-1 → FIXED-VERIFIED | Lane-verified at `:244`, `:248`; "dark half"/"dark token" strings gone. |
| V-50 | MAJOR | QUAL-R2-2 → FIXED-VERIFIED (one anchor number set) | **Confirmed** — see arithmetic below. |
| V-51 | MINOR | ARCH-R2-3 → FIXED-VERIFIED | Confirmed: U7.3 row carries "cross-cutting sweep"; §6.1 `:389` new row `ui/**` (user-facing strings) → U7.3, bounded. |
| V-52 | MINOR | ARCH-R2-4 → FIXED-VERIFIED | Confirmed: `:216` *"U3.1 rides wave 1 on `feat/uiparity-u3` … U3's first phase PR at wave-1 end … merges `master` after U1's PR and continues into wave 2"*. (Writer chose the two-PR variant rather than R-2's single-PR one; both preserve D18 granularity — accepted.) |
| V-53 | MINOR | ARCH-R2-5 → FIXED-VERIFIED | Confirmed: 9 `Fidelity:` occurrences, 9 are `**Fidelity:** §2…` references. |
| V-54 | MINOR | QUAL-R2-3 → FIXED-VERIFIED | Confirmed: brief `:43` *"Cuts the `feat/uiparity-u0` phase branch off `master` (D18 as overridden — plan §4.8)"*. |
| V-55 | MINOR | QUAL-R2-4 → FIXED-VERIFIED | Confirmed: "before U3.1 exists" gone from U0.1. |
| V-56 | MINOR | REAL-R2-1 → FIXED-VERIFIED | Confirmed: U0.1 *"41 sites across 19 files"*. |
| V-57 | MINOR | (aggregator-originated) FIXED per `FIX-MAPPING-r3`; architect lane covered U0.4 | Confirmed: U0.4 `:247` *"Fix the remaining defects (U0.0 already landed the `PARSE-FAILED` degrade — do not re-touch `check-rn-parity.mjs:74-75`)"*; matrix A96 `:188` names U0.0. |
| REAL-R3-1 | MEDIUM (new in r3) | reality lane → fixed at `99351e9`; 28/28 values exact | **Confirmed propagated.** Stale `12 tier` / `+12` / `~32` / `~64` → 0 in the plan (the two matrix hits are Tier-B diffstats `+129/-49`, `+122/-227`, not anchor counts). Consistent set: U0.4 `:247` *"~15 keys are ~30 anchor rows … every stage figure is a key count"*; U1.1 `:262` *"24 tier KEYS — 4 per tier × 6 — each pinned in BOTH halves = 48 anchor rows"* (`innerShadow` deliberately unanchored); §6.6 `:516` *"U0.4 ~15 → U1.1 +24 tier keys → U3.1 +4 → U8.2 +gridSubtle; key counts"*; §9 `:627` *"~44 keys are ~88 anchor rows"*; D3 in plan and matrix `:414` *"U0.4 ~15 → U1.1 +24 → U3.1 +4 → U8.2 +1"*. 15 + 24 + 4 + 1 = 44 ✓. |

**12/12 verified.** Nothing open.

### State of the plan

The plan is **ratified (D1–D20 ruled 2026-08-27) and executable from U0.0**. Across three review rounds — 46 + 11 + 12 findings, two BLOCKERs and one CRITICAL among them — every finding has been fixed and independently re-verified by the lane that raised it, with the aggregator re-opening every BLOCKER/MAJOR at the doc line and at source. What is now proven: every `file:line` in both docs resolves against the phone repo and the demo worktree (~300 citations re-opened over the three rounds); the matrix's 97 Tier-A rows and 215-row totals are script-derived; the D2-amended both-halves shape reaches every seam that consumes it (`palette`, `GLASS_TIER`, `ElevatedEdges` as `{ light, dark }` records, 24 light tier values byte-exact against `Colors.ts:274-344`, consumers resolving through `[scheme]`, one flip site at §9 cl. 12); the anchor set is one arithmetic (~15 → +24 → +4 → +1 keys, each pinned in both halves, ~88 rows at U8 exit); the wave topology is per-phase branches with PR-order merging and a `--no-ff` re-gate rule, so D18's `git revert -m 1` per phase still holds; and U0.0–U0.5 are buildable from their rows alone, with U0.0's `PARSE-FAILED` degrade as the port's first commit on `feat/uiparity-u0` off `master`. The only preconditions left are operational, not planning: merge the planning bundle to `master` (§5 prerequisite) and brief U0 per §6.4 under HANDOFF §2.
