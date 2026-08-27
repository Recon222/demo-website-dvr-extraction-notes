# Plan review r2 — ARCHITECT lane (post-ratification edit)

**Diff reviewed:** `git diff 1024a0b HEAD -- docs/planning/demo-phone-ui-parity/0*.md` (commit
`ba1921d`), plan +303/−… and matrix +185/−…. Scope: the ratification write-in, the D18 override, the
D2 amendment, the execution-wave restatement, and the kit citations. Kit read on `master`:
`.claude/skills/fleet-orchestration/{SKILL.md,hazard-playbook.md,reviewer-contract.md}` and
`.claude/skills/mutation-testing/SKILL.md`.

**Verdict: BLOCK** — 1 CRITICAL, 1 HIGH, 2 MEDIUM, 1 LOW.

**What holds.** The D18 override is written in cleanly and consistently: §3, §4.5, §4.8 and §9
clause 10 all say the same thing, the "what this accepts, stated plainly" paragraph is honest about
the mixed-palette consequence, and the superseded recommendation is preserved as a parenthetical
rather than deleted. The overlap table in §6.2 is real work — I re-derived the load-bearing cells
from the package Files columns and **U2 ∩ U3 = ∅, U5 ∩ U6 = U5 ∩ U7 = U6 ∩ U7 = ∅, and U1 ∩ U3.1 = ∅
all check out** on named files. The kit citations are accurate: §6.2's fan-out rule ("M-or-larger get
their own worktree; S packages run in a warm agent's tree") is a faithful reading of
`fleet-orchestration/SKILL.md:117-119`, and its parallelise-on-disjoint-files basis matches `:116-118`
exactly. §4.7's replacement of the restated rules with a pointer to `hazard-playbook.md` is right —
the retained items are genuinely the repo-specific ones the playbook does not carry.

---

## CRITICAL

### [CRITICAL] ARCH-R2-1 — D2's both-halves ruling is unimplementable as the U1–U4 seams are written, and U0.5's light half has nothing to composite against

**Doc:** plan `:34` (§2), `:56` (D2), `:224` (U0.5), `:238` (U1.1); U2.1 `:250`, U3.2 `:266`,
U4.1 `:279`, U4.4 `:282`.

**Issue.** D2 as amended is explicit: *"The palette module ships `{ light, dark }` under one key set
… **Nothing hard-codes a dark value that has a light sibling.** U0.4 pins both halves; U0.5 ports
both halves; **U1–U4 seams take colours from the scheme record, never a bare dark hex.**"* That
landed in §2, §3, U0.1, U0.4 and U0.5. **It did not land in a single one of the U1–U4 seam packages
it names.**

U1.1 is the load-bearing case, because the edit added an explicit exported type signature to it:

> `export const GLASS_TIER = { card: { gradient: readonly [string, string]; border: string; highlightTop: string; innerShadow: string }, nestedCard: …, elevated: …, header: …, sheet: …, recessed: … } as const`

That is a **single flat scheme**, and its Recipes column lists dark values only. An implementer
building to that signature produces a six-tier seam with no light half — after which D2's promise
that flipping the consumed scheme is a one-site change is false for every glass surface in the demo,
which is the port's largest Tier-A block (A29–A40) and ~40 consumers.

The dead end is not merely stylistic, it is a **wave-ordering inversion**. U0.5 (wave 0) is now
required to port *"**BOTH the `DARK_GROUNDS` and `LIGHT_GROUNDS` stacks (D2, amended — the light half
is in)**"* and matrix §C.1 *"in full, both schemes"*. `LIGHT_GROUNDS` is by construction the light
`card` / `nestedCard` / `sheet` / `recessed` stops composited over the light background — those
values live in the tier module, which is U1.1, in **wave 1**. So a wave-0 package is specified to
consume a wave-1 seam that, as written, will never contain the half it needs. Every light row in the
contrast test would have to land `it.todo` against a seam that never satisfies it.

**Evidence.** Phone `src/constants/Colors.ts:274-345` — `GlassColors.light` is a complete six-tier
half (light `card.gradient` is `['rgba(248, 250, 252, 1)', 'rgba(241, 245, 249, 1)']` at `:277`),
paired with the `dark:` half at `:345-438` that U1.1 transcribes. `ElevatedEdges` at `:488-489` is
likewise `{ light, dark }` — and U2.2 owns *"the two edge tokens"* with, by grep, **zero** occurrences
of `light` or `scheme` in its row. Same grep on U2.1, U3.2, U4.1 and U4.4: **zero each**. The
amendment reached §2/§3/U0 and stopped.

**Fix.** Push D2 into the seams it names, in the same pass:
- **U1.1** — change the exported shape to `GLASS_TIER = { light: { card: {…}, … }, dark: { card: {…}, … } } as const`, add the light half's values from `Colors.ts:274-345`, and add the light tiers to its closing-act anchor addition (12 dark + 12 light).
- **U2.2** — `ElevatedEdges` becomes `{ light, dark }` per `Colors.ts:488-489`.
- **U2.1 / U3.2 / U4.1 / U4.4** — state that each recipe resolves its colours through the scheme record (`palette[scheme].x`, `GLASS_TIER[scheme].sheet`), with the demo passing `'dark'` at the one consumption site.
- **U0.5** — say which light rows are `it.todo` until U1.1 lands the light tiers, exactly as the dark rows 31/33 already are.

If instead the owner meant the light half to stop at the flat palette and *not* extend to the glass
tiers, D2's *"U1–U4 seams take colours from the scheme record"* clause and U0.5's `LIGHT_GROUNDS`
requirement both have to come out. Either resolution is fine; the two cannot both stand.

---

## HIGH

### [HIGH] ARCH-R2-2 — waves 2 and 3 have no branch to assemble on: §6.2's cross-phase merge order contradicts D18's phase-branch topology

**Doc:** plan `:53` / `:146` (§4.5 topology), `:386-437` (§6.2), `:437` ("Merging").

**Issue.** D18's ratified topology is strictly per-phase: *"phase branch `feat/uiparity-u<N>` off
`master`; package branches `uiparity/u<N>.<pkg>` off the phase branch; phase PR → `master`."* But
§6.2's wave rows are written across phases:

- Wave 2's conflict cell mixes phases in one list — `_shared.tsx → U2.1, U2.3, U4.2, U4.4`,
  `DeleteConfirmationModal.tsx → U2.2, U4.3, U4.4` — and its Fixed-merge-order cell is a **single
  flat sequence spanning three phases**: `U2.1 → U2.2 → U2.3 → U2.4 → U3.2 → U3.3 → U3.4 → U4.1 →
  U4.2 → U4.3 → U4.4`.
- The closing paragraph then says gates run *"at assembly on **the phase branch**"* — singular — for
  a wave that has three of them.

There is no branch on which that eleven-package sequence can be merged. `grep -c "wave branch"` → **0**;
no wave-level branch is defined anywhere. So the orchestrator opening wave 2 has two readings and the
plan does not choose: either (a) one assembly branch per wave, which makes "phase PR" a wave PR and
contradicts D18's topology and its `git revert -m 1 <phase merge>` rollback granularity, or (b) three
phase branches, which leaves §6.2's flat merge order and its cross-phase conflict list with nowhere to
be executed — `_shared.tsx`'s four claimants sit in two different phase branches that never meet until
`master`.

This also breaks the one thing D18's rollback rests on. §4.8 keeps *"§5's dependency shape is also the
revert-safety order"*, which assumes phase-granular merges; under reading (a) a wave is one merge
commit and reverting U3 alone is no longer possible.

**Evidence.** §4.5 `:146` and D18's §3 entry both state the per-phase topology in the same words.
§6.2's wave-2 and wave-3 rows are the only place in either document where packages from different
phases appear in one ordered merge sequence. The kit is unambiguous on the intended shape —
`fleet-orchestration/SKILL.md:104`: *"**Parallel wave:** one worktree per agent, **branched off the
phase branch**"* — i.e. a wave is agents inside one phase, not phases inside one wave. The edit
reuses the kit's word "wave" for a larger unit than the kit's own model has.

**Fix.** State the branch topology for a multi-phase wave explicitly. The reading consistent with D18
and the kit: **each phase in a wave keeps its own phase branch and its own PR to `master`**; §6.2's
per-wave sequence is then the **order the phase PRs merge to `master`** (U2 → U3 → U4), with the
within-phase package order unchanged, and the cross-phase conflict cells become notes about what the
*later* phase branch must rebase-free absorb at its own assembly. Change the closing paragraph's
"the phase branch" to "each phase branch, at that phase's assembly". If the owner instead wants one
assembly branch per wave, D18's rollback clause and §9 clause 10 need re-wording to wave granularity.

---

## MEDIUM

### [MEDIUM] ARCH-R2-3 — U7.3's unbounded `ui/**` sweep runs concurrently with U5 and U6, and did not get the bounding treatment U3.4's identical defect got

**Doc:** plan U7.3 `:329` (Files: *"every user-facing string in `ui/**`"*), §6.2 wave 3.

**Issue.** Wave 3 runs U5, U6 and U7 concurrently on the strength of *"U5 ∩ U6 = U5 ∩ U7 = U6 ∩ U7 =
∅"*. That extraction is correct for **named** files — I re-derived it — but U7.3's A93 em-dash sweep
is a glob over the entire UI tree, so it intersects every file U5 and U6 have open by definition. It
is the same defect as U3.4's A80 empty-state sweep, which r1-delta VD-6 fixed by naming the files it
reaches and bounding it (*"touches only the empty-state block in each and opens those files for
nothing else"*). U7.3 got no equivalent sentence: `grep` for a bound on its row returns **0**.

Consequence is bounded — the edits are one-character (em dash → period) in a handful of strings, so
the conflicts are textual and trivial, and the repo-wide test U7.3 adds runs at wave assembly where it
would catch anything a sibling introduced. That is why this is MEDIUM and not HIGH.

**Fix.** Give U7.3 U3.4's sentence: *"**A93 is a cross-cutting sweep** — it greps every user-facing
string under `ui/**`, including files U5 and U6 own in this wave. It edits **only** the offending
string in each and opens those files for nothing else."* And add a row to §6.1 so the contention map
records it, since §6.2 is derived from §6.1 and currently cannot see it.

### [MEDIUM] ARCH-R2-4 — the wave table's ∅ claims are asserted for phases but computed for packages, and wave 1 splits a phase

**Doc:** plan `:386` (*"Derived from §6.1, by extracting every package's Files column and
cross-tabulating … computed, not assumed"*), wave 1 row.

**Issue.** The method note is accurate and I could reproduce the results, but the table mixes two
granularities without saying so. Wave 1 is **U1 + U3.1** — one phase plus a single package lifted out
of another. Under D18's topology U3.1 must then either get its own phase branch (there is no
`feat/uiparity-u3.1`) or land on U1's branch, which puts a U3 package inside U3's own phase PR
boundary and breaks the tracker's phase accounting in §7. The same question applies to "U3 (rest)" in
wave 2.

**Fix.** One sentence in §6.2: *"U3.1 rides wave 1 on the `feat/uiparity-u3` phase branch, which is
cut at wave 1 and completed in wave 2; its PR opens at the end of wave 2 with the rest of U3."* Or
move U3.1 into U0 (its only file is `ui/tokens/palette.ts`, which is U0.1's file, and its ADD list is
palette tokens) — that is the lazier fix and removes the split entirely.

---

## LOW

### [LOW] ARCH-R2-5 — the per-phase "Fidelity" clause is appended verbatim to all eight exits

**Doc:** plan, every phase Exit line (U1 `:245`, U2 `:257`, U3 `:270`, U4 `:285`, U5 `:301`,
U6 `:317`, U7 `:332`, U8 `:346`).

The identical sentence — *"**Fidelity:** every surface in this phase matches the phone recipe
**exactly — values AND geometry** — not merely passes the guard."* — is pasted into eight exits while
§2 already states it once as a scope rule. Restating a standing rule per phase is precisely what §4.7
was just rewritten to stop doing (*"Restating them here is how they drift"*). No failure mode, but it
is eight places to keep in sync. Cut to one reference: *"Fidelity: §2's bar."*

---

## Architect Summary

| Severity | Count |
|---|---|
| CRITICAL | 1 |
| HIGH | 1 |
| MEDIUM | 2 |
| LOW | 1 |

| ID | Severity | Target | Claim |
|---|---|---|---|
| ARCH-R2-1 | CRITICAL | D2 vs U1.1/U2.1/U2.2/U3.2/U4.1/U4.4, U0.5 | The both-halves ruling reached §2/§3/U0 and none of the U1–U4 seams it names; U1.1's exported shape is single-scheme, so U0.5's `LIGHT_GROUNDS` has nothing to composite against |
| ARCH-R2-2 | HIGH | §6.2 waves vs §4.5/D18 topology | Waves 2 and 3 give a cross-phase merge order with no branch to execute it on, and wave-granular merging would break D18's phase-granular revert |
| ARCH-R2-3 | MEDIUM | U7.3, §6.1 | Unbounded `ui/**` em-dash sweep runs concurrently with U5/U6; U3.4's identical defect was bounded, this one was not |
| ARCH-R2-4 | MEDIUM | §6.2 wave 1 | U3.1 is split out of its phase with no branch or PR story under D18 |
| ARCH-R2-5 | LOW | eight phase Exit lines | §2's fidelity bar restated eight times, against §4.7's own anti-drift rule |

**Verdict: BLOCK.** The wave restatement is sound work and its disjointness arithmetic holds where I
could check it. The blocker is the D2 amendment: it was written into the decision and the U0 packages
but not into the six seam packages the decision explicitly binds, and one of those seams now carries a
flat exported type signature that contradicts it outright.
