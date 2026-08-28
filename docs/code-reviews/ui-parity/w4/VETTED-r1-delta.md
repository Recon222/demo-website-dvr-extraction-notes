# Vetted Review — W4 (`feat/uiparity-w4`) — Round 1 FIX-DELTA @ `277564c`

**Verdict:** REVISE — narrowly: **6 of 8 FIXED, F83 + F85 PARTIAL, one new fix-introduced HIGH (F90)**; the whole remainder is **one rider chain on one seat**.
**Fix diff:** `de1cd33..277564c` (4 seat branches; U8.4's F85 triage ran as four family sub-branches, merged in). **No PR exists yet** — the lanes' authority was the declared disk mapping artifact; contract §7's PR mapping comment must be posted when the PR opens (pipeline notes).
**Lanes read (delta sections):** web APPROVE (F86/F87 two-sided; the sweep-glow rider phone-exact; §123's sharpened trigger endorsed) · sfh APPROVE (F82 both survivors KILL + two extra fixes: the dual-React-tree and exclude-enumeration; F85's manifest arithmetic recomputed to four decimals) · td APPROVE (F83 DS1 clean over all 37 + a fourth `Promise<T>` fix; F84 flip compiles in BOTH programs) · ts APPROVE-wc (**F83 PARTIAL**) · tests REVISE (**F85 PARTIAL + the new HIGH**; 13 probes, 11 KILLED; baseline 4,326 → 4,334, no deletions).
**Aggregator:** warm (`ab0635173e8414282`).

## Prior findings — status

| F | r1 sev | Status | Evidence (floor + lanes) |
|---|---|---|---|
| F82 | HIGH | **FIXED** | `tsconfig.previews.json` in the gate; both r0 survivors re-planted and KILLED; the fix went past the prescription (the dual React tree and the exclude enumeration were real second doors, found and closed by the seat); the 8 drifted previews repaired; NOTES.md's wrong reason corrected. D-2's row confirmed unnecessary — drift is now compile-checked. |
| F83 | HIGH | **PARTIAL** | Repairs 1, 2 and a disclosed fourth (`Promise<T>`) land — DS1 re-transcribed clean over all 37; the `OverlayHeader` KNOWN-LOSSY notice sits **inside the emitted contract**, better than the prescribed NOTES.md arm. **Repair 3's erasure is unfaithful:** `onChange`'s erased `value: string` re-admits the exact typo class R-13 closed (`incidentCoordinateSource` is a union; both source comments name `(field, value: string)` as the defect — spot-checked in the shipped contract). The ts lane owns half (its own r1 prescription spelled the erased form) and says so. Remainder → rider. |
| F84 | HIGH | **FIXED** | The flip typechecks exit 0 in the root AND previews programs (td; tests reproduced `FLIP_TYPECHECK_EXIT=0` independently). The six gates read through a widened local; the `satisfies typeof` devices kept their literals. |
| F85 | HIGH | **PARTIAL** | The triage itself is the campaign's largest single test repair and it is sound: 28 files, scheme-relative conversion with the RELATION preserved where the relation was the contract (`9a89848`, `5a683ab` read through to the TIER), the `jsdomBackground` round-trip with its solid-colour ceiling NAMED, two commit-body counts self-corrected, and a manifest taking 77 reds to **2 named objectors** with per-decimal arithmetic (sfh recomputed D1 to four decimals). **But the manifest is stale at the merged head** — F90. |
| F86 | MEDIUM | **FIXED** | Both mechanical gates landed + a phone-exact sweep-glow rider; web verified both arms; §123 stands for the frame question with the sharpened trigger. |
| F87 | MEDIUM | **FIXED** (its pin spawned F90) | Tints exported, §C.1 row 49 bounds both at `AA_NON_TEXT` two-sided; the inversion recorded for the device pass. The row's LAST assertion is F90's subject. |
| F88 | LOW | **FIXED** | `{6}(?:[0-9a-fA-F]{2})?` + the planted-control line; T3 re-run KILLED, T1 control still kills. |
| F89 | LOW | **FIXED** | The docblock names both records. |

## New finding (append-only)

### F90 [HIGH] The light-flip manifest's falsifiable claim — "no unexplained objectors" over a 2-red table — is FALSE at the merged head: three objectors, the third a fresh instance of the class F85 exists to remove, introduced by F87's row-49 relation pin on a parallel branch
Lanes: tests — original label: HIGH (fix-introduced, F87's blast radius; the flip replicated independently at `277564c`: tsc 0, **3 failed / 3 files**, the scoped re-run naming row 49 — `expected 10.36 to be less than 7.56`)
File: `__tests__/palette-contrast.test.ts` row 49's last assertion (`worst(active) < worst(inactive)` — pins the DARK half's perceptual inversion as if it were a contract; in light the inversion CORRECTS and the pin reds exactly when the product improves) · `w4/lightflip-objector-manifest.md:27` (the claim, measured at `3f9bad3`) · the mechanism: `merge-base --is-ancestor c7e82fe 3f9bad3` → NO — F87's fix and the manifest's flip run were parallel branches; the flip was never re-run at the head. W3's hazard-#2 clean-merge shape, one wave on.
Issue: the manifest is the clause-12 exit evidence for the whole campaign; its claim is false at the SHA that ships, and the flip day has no reviewer. Bounded honestly: nothing a visitor sees is wrong; the third objector is a pin defect, not a light-half defect.
Fix (the rider): one line — gate the relation to the dark half (`activeScheme === 'dark'`, joining the manifest's §3 deliberate-dark list) or replace it with the scheme-safe fact (`!==`, already two lines above) plus the measured 3.14 as a device-pass comment; then **re-run the flip at HEAD and re-cut the manifest's Result table, stamping the SHA it was measured at**.
Owner: `a01d6a84f84ea047a` (U8.4 — see routing)

## The rider chain — ONE seat, ruled

Both PARTIAL remainders and F90 fold into **U8.4** (`a01d6a84f84ea047a`), not split with U8.3: row 49 lives in `palette-contrast.test.ts`, which U8.4's triage already holds this round — two seats editing that file in parallel is the exact mechanism that produced F90 (one writer per file is the rule the defect proves). U8.3's F87 code fix in `TabBar.tsx` stands untouched.
1. **F83'** — the same one-line in-contract KNOWN-LOSSY notice its sibling got, on `NewCaseModal.onChange` (the erased `value: string` + "the provenance field is a union — see the component type"), or emit the two-arg erasure per key if the seat prefers; either closes R-13's re-admission.
2. **F90 / F85'** — the row-49 one-liner + flip re-run at HEAD + manifest re-cut with its SHA.
3. **Housekeeping** — tear down `probe-u8.4-lightflip` (its own stale tree — plausibly WHY the flip was not re-run: a tree that looked current was sitting there with the old answer) and `f85-screens-probe`, both via `tools/worktree-remove.ps1` with proof lines.
**Targeted delta:** tests only (re-run the flip + row 49's probes); ts eyeballs the F83' notice in the same pass. Web/sfh/td stand down.

## Ledger interaction

**Rows written: §125** — `gen-dts-props.mjs`'s interface-body emission is KNOWN-LOSSY for two contract classes (union-of-object props types — `OverlayHeader`; generic keyed setters — `NewCaseModal`), both now carrying in-contract notices; the faithful fix is an emitter that can wrap non-interface contracts, which is out-of-repo toolchain work (td's verified premise); trigger: **the first post-campaign change to the design-sync toolchain, or the design tool consuming typed contracts directly** — whichever first replaces the notice with a faithful encoding. This IS ts's owed residue row; one row, both classes.
**Refused:** a separate row for the manifest's two legitimate objectors (O1/D1) — the manifest itself is the named-objector record F85's fix line mandated, referenced from the plan at merge; a ledger row would duplicate it (precedent 5: recorded-elsewhere work is never a row).
No strikes; §123/§124 stand for the device pass.

## Pipeline notes

- **F90's mechanism is the round's lesson:** an EVIDENCE artifact (the manifest) is stale the moment a parallel branch lands — evidence docs must stamp their SHA and be re-cut at every merge that touches their subject, exactly like gates. The stale probe worktree compounding it (a current-looking tree holding the old answer) is the isolation rule's teardown clause proving its worth.
- **No PR for W4 yet** — the lanes' authority was the declared disk artifact; acceptable this once and disclosed by every lane, but the PR must carry the full mapping comment when it opens, before merge.
- The ts lane's "I own half of this" on F83' — its own r1 prescription spelled the erased form — is the campaign's third warm-seat self-correction (predecessor's F7, this desk's F34/F84). The pattern holds: warm seats re-question their own precedents when evidence arrives.
- Aggregator: F-numbering at **F90**; next § **126**.

---

# Round 2 — RIDER ROUND + CLOSING @ `a7d4215`

**Verdict: APPROVE** — **F82–F90 ALL FIXED.** The wave's review state is complete; per the owner's instruction the PR merge and the final DoD pass are HELD for their return. Cold gates: tsc 0 in BOTH programs · 4,335 passed · guard 145/145 · `/demo` 107 kB.

## Rider verification (floor + tests lane r2, APPROVE 0/0/0/0)

| Item | Commit | Status | Evidence |
|---|---|---|---|
| **F83'** | `5274aef` | **FIXED** | The KNOWN-LOSSY notice is inside the emitted `NewCaseModal` contract (spot-checked: present, names the union); tests' out-of-lane check: the contract-text pin KILLS and the generator fails loud alone. §125 covers both lossy classes. |
| **F90 / F85'** | `c081a51` + `bb26314` | **FIXED** | Row 49's inversion relation gated to the dark half (spot-checked; tests probe Y5 isolates the gated relation and KILLS). The manifest re-cut at the merged head: **exactly 2 objectors, matching its claim**, SHA-stamped at `c081a51` with the parallel-branch re-cut rule now written into the manifest itself — the F90 lesson made structural. Merge-base checked including F83's test-program commits. |
| Housekeeping | — | **DONE** | `probe-u8.4-lightflip` and `f85-screens-probe` confirmed gone (tests + this desk). One MERGED fix-branch worktree remains — `worktrees/f85-screens` @ `467cf8d` — not a probe hazard; orchestrator tears it down with `tools/worktree-remove.ps1` at leisure. |

## Final status, F82–F90 (and the campaign's F-ledger)

**F82–F90: ALL FIXED.** No PARTIAL, no UNFIXED, no unsettled. Campaign totals: **F1–F90 across five waves — every finding closed or deliberately ledgered with a live trigger.** Open ledger rows awaiting the owner: §123 (frame sweep under reduce), §124 (tab-bar boxShadow) — both keyed to the U8-exit device pass; §99's flip-day class is discharged by the clause-12 work (the scan + the manifest are its mechanism). F-numbering ends at **F90**; next § is **126**.

## Clause 12 — final state for the owner's DoD pass

The flip at the merged head: **compiles in both programs (exit 0)** and reds **exactly the 2 manifest objectors** (O1 `CentredDialog`, D1 `glass-well` — each with its reasoned entry and per-decimal arithmetic). The F85 owner flag resolves empirically: the clause's original "exactly three objectors" prose was wrong arithmetic; the shipped mechanism is stronger (a SHA-stamped, re-cut-on-merge manifest). **The owner ratifies at the DoD pass:** accept the manifest as clause 12's satisfaction (a plan §9 amendment referencing it), or rule further work on the two objectors.

## Plan / matrix corrections for the orchestrator (apply at merge)

1. **Plan §9 clause 12:** replace "exactly three objectors" with a reference to `w4/lightflip-objector-manifest.md` (SHA-stamped, re-cut at every merge touching its subject) — pending the owner's ratification above.
2. **Plan §5 U8.4's Toggle row (D-7):** refuted — `Toggle` was never in `componentSrcMap`/`dtsPropsFor`; the row assumed a pin that did not exist. Correct the row; pinning Toggle later needs a `componentSrcMap` entry + preview, covered by the exemption-free entry test with no edit.
3. **Matrix D12's rationale sentence** (banked W3, re-listed in case unapplied): the constraint stands; "different families cannot collide" is replaced by the measured role-based separation.
4. **The four U8 reports' own §-correction lists**, as usual.
5. **Owner device-pass checklist for the DoD** (the accumulated open judgement calls, all recorded): §123 frame sweep · §124 tab-bar boxShadow · F87's phone-verbatim active-tint inversion (3.14, dimmest of four — accept-and-record or `colors.link`) · U8.1's disclosed 5.19-vs-5.27 disclosure ratio · W2's mid-word wrap (checkpoint row 11) · §118's input-boundary family · the two manifest objectors.

## Seat-closing precedent (this desk, W2–W4 — successor brief if this seat rotates before any post-campaign round)

1. **Severity by compensating check:** silent survivor on a load-bearing surface with no gate = HIGH (F28, F53); single-site pin gap or scan-scope hole with a live compensating gate or scheduled check = MEDIUM (F30/F31/F32/F33/F54) — held consistently across nine demotions, zero contested.
2. **The scan-conventions arc closed:** no-exemption + anti-vacuity control; "shrink the CLAIM to the pattern, not widen the pattern until it lies"; the planted control must exercise the claim (F67). Quote these in any future scan brief.
3. **Triggers name the AUTHORITY, not the opener** (§107 twice, §112, §103) — a row whose trigger names an actor without power to act lapses on arrival.
4. **Evidence artifacts are gates:** SHA-stamp and re-cut at every merge touching the subject (F90); a parallel branch invalidates a measurement silently.
5. **Cross-seat touch-points are dispatch rows, not parentheticals** (W2's F34/F38 drops) — one routing row per seat per file, held since.
6. **Warm seats re-question their own precedents when evidence arrives** — predecessor's F7, this desk's F34→F84, ts's F83' erasure. Treat your own prior prescriptions as claims.
7. **Refutations with measurements are accepted on the merits** (F58, F62, F51-scope, D-2's mechanism) — the pipeline's health metric, both directions.
8. **Ledger discipline:** phone source beats matrix prose; recorded-elsewhere work is never a row; a strictly-stricter defect can ledger where a looser one must fix (F81 vs F29).
9. **Zero manufactured findings in three waves of lanes** — when a lane self-corrects ("one assertion too generous", "I own half of this"), say so in pipeline notes; it is the counter-signal that keeps the severity ladder honest.

## Pipeline notes (closing)

- The W4 PR, when opened, must carry the full commit→finding mapping for both rounds (the disk artifact substituted once, disclosed by every lane).
- Verification v7's final capture set and the owner's device pass are the two remaining acts of the campaign; this seat stays warm for the DoD pass and any post-campaign spot-check ride.
