# Plan review r2 — QUALITY / EXECUTABILITY lane

**Scope:** `git diff 1024a0b HEAD -- docs/planning/demo-phone-ui-parity/0*.md` only. Question unchanged: can a package be briefed and built from the doc alone?

**Counts: 2 HIGH · 1 MEDIUM · 1 LOW · 0 CRITICAL. Verdict: REVISE.**

Both HIGHs are the same shape and both were created by the D2 amendment: **the edit updated the package bodies to "both halves" but not the cells and counters that summarise them.** Everything else the round touched is clean.

---

## HIGH

### [HIGH] QUAL-R2-1 — Two U0 packages say "dark half" in their Scope cell and "both halves" in their body

**Doc:** plan `:237` (U0.1), `:241` (U0.5)

- **U0.5** Scope: *"Port `palette-contrast.test.ts` (**dark half**)"*. Its Recipes cell, same row: *"**BOTH the `DARK_GROUNDS` and `LIGHT_GROUNDS` stacks (D2, amended — the light half is in)** … and matrix §C.1 **in full, both schemes** — not the dark-only subset"*, then pins two light ceilings (DEF-063 at 3.87, DEF-UI-014's 3.97 nested floor) and warns that the phone's own pin asserts `>= 3.79` for both themes so **light must be pinned at its own 3.87**.
- **U0.1** Scope: *"Re-base `T` and add every missing **dark** token."* Its Recipes cell: *"**The module ships BOTH scheme halves (D2, amended): `export const palette = { light: {...}, dark: {...} } as const`**"*, with light values sourced from phone §1.1 and *"Where the light half has a value the demo has no surface for, port the token anyway."*

**Why it matters:** §6.4 item 2 pastes the package row **verbatim** into the brief. An implementer reads the Scope cell first — it is the one-line statement of what the package is — and the two cells disagree about roughly half the work. U0.5's is the sharper of the two: "dark half" is a scoping instruction, and an agent that follows it ships a contrast gate blind to the light scheme that D2 just ruled in, while the guard U0.4 builds pins light anyway. The mismatch would surface as a review finding, not a build error.

**Fix:** U0.5 Scope → *"Port `palette-contrast.test.ts` (**both schemes, per D2-amended**) and widen `glass-tokens.test.ts`'s banned-literal mechanism."* U0.1 Scope → *"Re-base `T` and add every missing token **in both scheme halves (D2-amended)**."*

### [HIGH] QUAL-R2-2 — The anchor-set numbers never say whether light anchors are counted, and U0.4 says they are

**Doc:** plan `:240` (U0.4 repair 3b), `:233` + `:245` (U0 preamble and exit), `:508` (§6.6 gate 1), `:614` (§9 DoD 1)

U0.4 gained: *"**(3b) Pin BOTH scheme halves (D2, amended)** — **light anchors count toward the anchor set**, and the two sides' light halves must not silently diverge either."* Every place that carries the number was left at its single-scheme value:

| Where | Text |
|---|---|
| `:233` U0 preamble | *"PASS at U0's own anchor set (**~15**, per U0.4)"* |
| `:245` U0 exit | *"exits 0 at its CURRENT anchor set (**~15**)"* |
| `:508` gate 1 | *"U0.4 **~15** → U1.1 +12 tiers → U3.1 +4 status → U8.2 +`gridSubtle`"* |
| `:614` DoD 1 | *"i.e. **~32** at the end"* |

If a key pinned in both halves is two anchor rows, U0.4 lands ~30 and the port ends near ~64; if "~15" counts keys, the numbers stand but nothing says so. U0.4's own list — *"(surface ramp, text ramp, `primaryDark`, `primaryLight`, `errorDark`, `textInverse`, `link`)"* — is a list of **keys**, which suggests the latter, but the exit criterion is phrased as a count of resolved anchors.

**Why it matters:** this is the phase's mechanical RED/GREEN and the DoD's clause 1. It is the exact three-numbers-one-gate problem QUAL-D-4 closed last round, re-opened by the amendment. U0.4's implementer cannot tell whether a run reporting 15 resolved anchors has met its exit or is half done.

**Fix:** one clause in U0.4's (3b) and echo it in the three counters: *"The count is **keys**, each pinned in both halves — U0.4's ~15 keys are ~30 anchor rows. The stage figures (~15 → +12 → +4 → +1, ~32 at the end) are key counts throughout."* Or, if the intent is rows, restate all four numbers.

---

## MEDIUM

### [MEDIUM] QUAL-R2-3 — The ratification brief's "After you rule" step still instructs cutting the branch D18 overrode

**Doc:** `02-ratification-brief.md:43` vs `:3`

The header stamps the outcome correctly: *"**RATIFIED 2026-08-27** … **D18 overridden** (phases merge straight to `master`) … This brief is now historical."* The forward checklist below it was not updated:

> `:43` — *"2. **Cuts `feat/uiparity` (per D18)** and briefs **U0** per plan §6.4 under the HANDOFF §2 spawn policy…"*

`:36`'s D18 row stating the old recommendation is correct as history and should stay. `:43` is different — it is the runbook step an orchestrator executes next, and it names a branch topology the owner rejected. Plan `:151`/`:182` are authoritative and correct (`feat/uiparity-u<N>` off `master`, package branches `uiparity/u<N>.<pkg>`), so the risk is confined to whoever works from the brief's checklist rather than the plan.

**Fix:** `:43` → *"2. Cuts the **`feat/uiparity-u0`** phase branch off `master` (per D18 **as overridden** — see plan §4.8) and briefs **U0** per plan §6.4…"*, or mark the "After you rule" section historical alongside the header.

## LOW

### [LOW] QUAL-R2-4 — U0.1's `errorLight` rationale is stale under the wave order

**Doc:** plan `:237`

U0.1 now justifies owning `errorLight`: *"**`errorLight #b72136` IS added here** — U2.2's danger fill (A52) takes it in phase U2, **before U3.1 exists**."* Under §6.2 the waves put **U3.1 in wave 1** and **U2.2 in wave 2**, so U3.1 lands first and the stated reason is false. The *outcome* is right and unambiguous — U3.1 `:` was updated to *"`errorLight` already exists from U0"*, so there is one owner and no conflict.

**Fix:** replace the clause with the reason that survives the re-ordering: *"— it is the one `*Light` the danger fill needs from the palette module itself, and U0.5's banned-literal guard forbids hardcoding it. The rest of the `*Light` family is U3.1's."*

---

## Verified clean

- **D18 propagation.** `grep uiparity|integration branch|feat/uiparity` → every plan sentence updated: §3 `:53` (the ruling), `:74` (Blocks names §4.5/§4.8/§6.2/§6.3/§9), §4.5 `:151` (branch topology), §4.8 `:182` + `:188` (the overridden recommendation kept as a marked footnote), §6.3 `:440` (`uiparity/u<N>.<pkg>` off the phase branch), §6.6 `:535` (`SHOT_DIR` path, unrelated to topology). Matrix `:530`, `:532`, `:753` consistent. Only `02-ratification-brief.md:43` is stale (QUAL-R2-3).
- **Wave tables mutually consistent.** §5's summary (`0`=U0 · `1`=U1+U3.1 · `2`=U2·U3(rest)·U4 · `3`=U5·U6·U7 · `4`=U8), §6.2's wave table `:420-424`, §6.2's fan-out table `:428-434`, and §7's tracker all agree. Tracker rows tally **W0 5 · W1 5 · W2 11 · W3 12 · W4 4 = 37**, matching the 37-package total; the fan-out split matches each package's Effort column (S → warm tree: U0.2, U0.3, U3.1, U8.2, U8.3 — exactly the five S packages). Phase headings (`:231-350`) carry no dependency claim the waves contradict.
- **Estimates struck.** No `~N days` / `~N weeks` / wall-clock string survives anywhere in the plan, including the phase headings, which now read as dependency statements only.
- **§6.4 names the kit files.** Item 0 is `.claude/skills/fleet-orchestration/hazard-playbook.md`, "read first, before anything else in the brief"; §4.7 `:168` cites it rather than restating; §6.5 `:463`/`:477`/`:479` binds the lanes and fix rounds to `reviewer-contract.md`. Item 0b's verify-then-refute duty and item 11's ≤15-line reply / report-to-disk rule are new and concrete.
- **U0 buildable from the doc alone — yes, with QUAL-R2-1 and -2 fixed.** U0.1 gives the module path, the `{ light, dark }` type shape with the compile-error requirement, the 29-name key set, the four `T` aliases, both halves' value sources (phone §1.1 / §1.2 + the §2.A dereference table), and the `primaryLight` correction (already keyed at `mapTokens.ts:58`, one reader, 41-site sweep across 20 files, 4 lowercase). U0.5 gives the allow-list edit at source precision — `:25`'s basename skip, the 10 `BANNED` tuples at `:33-44`, `text.includes` substring matching, `relative`/`sep` already imported at `:3`, the exact replacement expression, and the ordering constraint that the allow-list lands *with* the new bans, not before. U0.2/U0.3/U0.4 unchanged from the state this lane approved in r1-delta r2.
- **`:243`'s new note** — *"Each package's Matrix-rows cell lists only ITS OWN rows"* — closes QUAL-D-1 permanently rather than just correcting the one cell.
