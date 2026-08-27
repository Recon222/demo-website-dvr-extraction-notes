# GATES — Demo↔Phone UI Parity v2

**Blocking conditions. This file exists so a HANDOFF.md rewrite can never delete them.**
HANDOFF.md is a snapshot and gets overwritten every milestone; these do not move. Nothing below
is advisory, and "we'll catch it next phase" is not a disposition. If a gate cannot be run, that
is a BLOCK, not a pass.

## Mechanical — every phase PR, from a COLD CACHE, at the MERGED head

A branch-level green proves nothing about the combined tree. Quote these only after the merge,
and delete the caches first — an incremental cache can return exit 0 over a broken tree.
**Gate on exit codes, never on grepped output fragments.**

1. `node .design-sync/check-rn-parity.mjs` → exit 0, at the phase's **current** anchor set.
   The anchor set GROWS as phases land; a green run against a stale anchor list is not a pass.
   Known-RED on `master` as of planning (`Button PRIMARY_GRADIENT.dark not found` — phone P9
   renamed it); U0 owns repairing it, and it blocks from U0 onward.
2. The ported `palette-contrast.test.ts` green — **both scheme halves** (D2 as amended: the
   token layer ships light and dark from U0 even though the demo consumes dark).
3. `pnpm test --silent` → exit 0. Test count recorded in HANDOFF §5, and it may not fall.
   **Baseline as of 2026-08-26 is RED: 3,480 passed / 1 failed** — the same drift guard as gate 1,
   throwing at `.design-sync/check-rn-parity.mjs:75`. U0 must land this green; from U0 onward a
   single failure is a BLOCK, not the baseline.
4. `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` → exit 0.
5. `pnpm build` → succeeds. A gate that never produces the shipped artifact can stay green over
   a project that cannot produce one; v1 hid an unbuildable app for two milestones this way.
6. **`/demo` First Load JS unchanged** — the `pnpm build` route table's First Load JS column for
   `/demo`. v1 held **107 kB** across all nine of its phases
   (`docs/planning/demo-phone-parity/HANDOFF.md:5`). A styling port has no excuse to move it;
   any movement is explained in the PR body or reverted.
7. `node docs/planning/demo-phone-ui-parity/census.mjs` run and its trend recorded in HANDOFF §5.
   A trend, not a threshold — the number going the wrong way is a question to answer, not an
   automatic block.

## Process — before any phase is called done

8. The review cycle is **closed APPROVE by `dt-review-aggregator`**, through however many fix
   and fix-delta rounds it takes. Every gating finding fixed or evidence-refuted.
9. Review artifacts committed under `docs/code-reviews/ui-parity/u<N>/`, and every ledger row
   this round earned written to `docs/code-reviews/deferred.md` — by the aggregator, its sole
   writer. Each row carries a concrete un-defer **Trigger**; a trigger-less deferral is a
   dropped finding.
10. Merged with a **merge commit** (`gh pr merge <N> --merge --delete-branch`). Never squash,
    never rebase.
11. Worktrees and branches pruned (`git worktree list` clean of the phase's trees).
12. HANDOFF §5 rewritten and its **`state-as-of:`** stamp re-pointed at the merge commit. The
    `dt-handoff-staleness` hook warns when it drifts; the warning is not the gate — this is.

## Owner — cannot be delegated, automated, or inferred

13. **Owner device-pass checkpoints after U1, U5 and U8** (decision D1). These catch the
    ΔE-shaped, "cards on cards read flat" defect class that a computed contrast ratio is
    structurally blind to — exactly what the phone's own PR #125 device pass found. No agent
    passes this on the owner's behalf.
    ⚠ **Unresolved:** `02-ratification-brief.md:19` says U1/U5/U8; `01-master-ui-parity-plan.md`
    (§D1 row, §6.6, :536) says U1/U4/U5. The brief is what the owner ratified, so U1/U5/U8
    stands here until the plan is corrected. Settle it before U4.
14. **The fidelity bar is the definition of done, and it is the owner's call** (verbatim: *"right
    now it looks bang on for what it used to look like; after this I want it bang on for what it
    looks like now"*). Every mechanical gate above is the FLOOR under that judgement, never a
    substitute for it. A phase can pass 1–12 and still not be done.
