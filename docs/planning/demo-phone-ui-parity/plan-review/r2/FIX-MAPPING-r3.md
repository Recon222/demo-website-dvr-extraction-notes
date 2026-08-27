# Plan review r2 — FIX MAPPING r3

**Round:** 3 · **Verdict under repair:** BLOCK (1 BLOCKER / 3 MAJOR / 7 MINOR)
**Disposition: 11 FIXED · 0 REFUTED · 0 PARTIAL · 0 unresolved.** All 24 §4 edits applied, plus the D1 checkpoint restatement.
**Files:** `01-master-ui-parity-plan.md` 633 → **638** · `00-ui-parity-matrix.md` **755** (in place) · `02-ratification-brief.md` (one line) · **Not committed.**

V-47 taken as **option (A)** per R-4 — (B) would reopen an owner ruling, which is not a writer's edit.

| V-ID | Sev | Disposition | Doc : where | What landed |
|---|---|---|---|---|
| **V-47** | BLOCKER | **FIXED** | plan D2, U0.5 ×2, U1.1 ×3, U2.1, U2.2, U3.2, U4.1, U4.4; matrix A40, A51 | **`GLASS_TIER` is now `{ light: {…six tiers…}, dark: {…} } as const`**, consumers resolve `GLASS_TIER[scheme]`. **All six light tiers transcribed** from `Colors.ts:274-344` into U1.1's Recipes (`card`/`nestedCard`/`elevated`/`header`/`sheet`/`recessed`, four values each) — stated as *not optional* because U0.5's `LIGHT_GROUNDS` composites against them. **`ElevatedEdges` → `{ light, dark }`** per `Colors.ts:487-490`, U2.2 reads `ElevatedEdges[scheme]` and is told not to hardcode the dark pair. **One scheme sentence** added to U2.1, U3.2, U4.1, U4.4. **U0.5's todo list** now names the light tier-ground rows and un-todos them in U1.1, exactly like dark 31/33. U1.1's closing act → **12 tier KEYS, both halves = 24 anchor rows**. |
| **V-48** | MAJOR | **FIXED** | plan §5 wave preamble, §6.2 wave-2/3 cells, §6.2 "Merging" | R-2's topology written in full: **a wave is concurrent phases, each on its own `feat/uiparity-u<N>` off `master`, each with its own PR; PR order = merge order; no wave branch.** Added the standing rule: **when an earlier-ordered phase PR lands, every still-open phase branch merges `master` (`--no-ff`, never rebase) and re-gates before its own PR opens** — named as where `_shared.tsx`'s U2↔U4 collision resolves. Wave-2/3 cells split into **within-phase order** + **phase-PR order** (U2→U3→U4; U5→U6→U7). "Merging" → *"on each phase branch, at that phase's assembly"*. |
| **V-49** | MAJOR | **FIXED** | plan U0.1 Scope, U0.5 Scope | U0.1 → *"add every missing token **in both scheme halves (D2-amended)**"*; U0.5 → *"Port `palette-contrast.test.ts` (**both schemes, per D2-amended**)"*. These are the first strings §6.4 item 2 pastes. |
| **V-50** | MAJOR | **FIXED** | plan U0.4 (3b), §5 wave-1 row, U0 exit, §9 DoD 1 | (3b) gains **"The count is KEYS, each pinned in both halves: ~15 keys are ~30 anchor rows. Every stage figure (~15 → +12 → +4 → +1, ~32) is a KEY count."** Echoed at the wave-1 row, the U0 exit (*"~15 keys"*) and DoD 1 (*"~32 keys are ~64 anchor rows"*). |
| **V-51** | MINOR | **FIXED** | plan U7.3, §6.1 | U7.3 gains U3.4's cross-cutting-sweep sentence (A93 greps every user-facing string under `ui/**`, intersects U5/U6's wave-3 files, edits only the offending string). New §6.1 row: `ui/**` (strings) → U7.3. |
| **V-52** | MINOR | **FIXED** | plan §5 wave preamble | **U3.1 rides wave 1 on `feat/uiparity-u3`**, cut from `master` at wave-1 start, lands as U3's **first** phase PR; the branch then merges `master` after U1's PR and continues into wave 2 as U3's second PR. The enabling fact is recorded: **no wave-2 package consumes a U3.1 token.** No package moved phases; tracker and matrix untouched, per R-2's smaller-diff reasoning. |
| **V-53** | MINOR | **FIXED** | plan §2 + eight Exit lines | The nine verbatim restatements collapsed to **"**Fidelity:** §2's bar."** — §4.7's own anti-restatement rule applied to my own prose. `grep 'every surface in this phase matches'` → 0. |
| **V-54** | MINOR | **FIXED** | `02-ratification-brief.md:43` | → *"Cuts the **`feat/uiparity-u0`** phase branch off `master` (**D18 as overridden** — plan §4.8) and briefs U0 …"*. |
| **V-55** | MINOR | **FIXED** | plan U0.1 `errorLight` clause | The false "before U3.1 exists" reason replaced with *"it is the one `*Light` the danger fill (A52) needs from the palette module itself, and U0.5's banned-literal guard forbids hardcoding it."* Outcome (one owner = U0.1) unchanged. |
| **V-56** | MINOR | **FIXED** | plan U0.1 `primaryLight` | → *"41 sites across **19** files, 4 of them lowercase (the 20th file, `mapTokens.ts`, holds only the keyed definition)."* |
| **V-57** | MINOR | **FIXED** | plan U0.4 Scope; matrix A96 | U0.4 → *"Fix the **remaining** defects (**U0.0 already landed the `PARSE-FAILED` degrade — do not re-touch `check-rn-parity.mjs:74-75`**) … U0.0's degrade is this package's precondition; U0.4 **proves** it with a deliberately-broken anchor."* Matrix A96 gains the ownership line. Double-ownership closed. |

## Also in this round — the device-pass checkpoint conflict

The brief said U1/U5/U8, plan D1 said U1/U4/U5, `GATES.md` flagged the divergence. **Restated as WAVE boundaries** in four places (matrix D1 body, matrix ratification row, plan §3 D1, plan §6.6): **after wave 1** (U1 + U3.1 — the glass/card look, where PR #125's device pass found the two ΔE-shaped defects a ratio is blind to), **after wave 2** (U2 + U3 + U4 — controls, sheets, dialogs, scrims, and the map chrome's accepted failure), and **at U8 exit** (final side-by-side). `grep 'after U1, U4, U5|U1/U4/U5'` → 0 in both docs.

**`GATES.md` lives on `master`, not this branch — not edited here.** Its one-sentence replacement is in the round reply.

## Verification

- 24/24 §4 edits applied; every one asserted its pattern matched exactly once (no silent no-ops).
- V-47 spot-checks: `GLASS_TIER = { light` ×1 · `GLASS_TIER[scheme]` ×5 · `ElevatedEdges[scheme]` ×1 line (both edges) · light tier values cited to `Colors.ts:274-344` · `LIGHT_GROUNDS` todo instruction present.
- Matrix re-parsed: **97 rows, A1–A97 contiguous**, DRIFTED 41 / MISSING 24 / MISSING-SEAM 21 / COMPLETE 7 / 4 singles — unchanged by this round.
- Residuals zero: `after U1, U4, U5` · `U1/U4/U5` · `feat/uiparity` (per D18) · the eight restated fidelity lines.

**Nothing refuted; nothing unresolved.**
