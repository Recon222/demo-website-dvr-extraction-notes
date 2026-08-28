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
