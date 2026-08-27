# HANDOFF — Demo↔Phone UI Parity (v2) Orchestration Runbook

**Purpose:** everything a fresh orchestrator instance needs to pick up EXACTLY where the previous one left off. Updated at every milestone — trust the newest "Current state" snapshot over any conversation summary.

**Last updated:** 2026-08-26 — milestone: MATRIX + PLAN DRAFTED (`3365e3e`): matrix 699 lines = 97 Tier-A rows (5 COMPLETE / 44 DRIFTED / 21 MISSING-SEAM / 22 MISSING) + 72 Tier-B (56 DRIFTED / 3 MISSING) + 15 inert + 14 demo-only, decisions D1–D17; plan 465 lines = U0 tokens → U1 glass/cards → U2 controls ∥ U3 status/badges → U4 sheets/dialogs → U5 map ∥ U6 wizard/settings/export → U7 import/OCR/audio/media → U8 splash/shell/design-sync (~4–5 wks two-lane). **PLAN-REVIEW ROUND 1 IN FLIGHT** (3 Opus lanes → `plan-review/r1/lane-*.md`). Nothing merged to master yet.

## 1. Mission & role

Bring `features/demo/` (the web replica) to **UI parity with the phone app's refactored UI** — the phone's UI-consistency campaign (PRs #110–#124, `fix/ui-consistency-p0..p13`, 2026-08-20→22), post-campaign triage (#125, `docs/plans/ui-touchups/`) and the map-chrome redesign (#127). Logic parity was completed by the previous effort (`docs/planning/demo-phone-parity/`, P0–P8, 2026-07-30→08-01) and is NOT in scope again — this is a styling/recipe/token port.

You are the ORCHESTRATOR: you brief agents, merge branches, run reviews, keep docs current. You do not write feature code. Keep your own context light — reports on disk, counts-only replies, path-passing.

## 2. Owner directives (binding)

- **All agents run on Opus** (owner, 2026-08-26: "force opus on any agents") — implementers, review lanes, AND the aggregator.
- Phone repo `D:\Work Coding Projects\CCTV Recovery Notes App\extraction_case_notes_react_native_expo` is **STRICTLY READ-ONLY**.
- Same quality bar as v1: matrix → plan → owner ratification → phased execution → per-phase multi-lane review + aggregator → fix rounds by warm authors → fix-delta → merge commits. "We keep going until UI parity is reached."
- Reuse v1's machinery: `.claude/agents/opus-implementer*.md`, the five review lanes, `docs/code-reviews/deferred.md` ledger, the v1 HANDOFF §4 standing rules (all still binding — copied to §4 below).

## 3. Read-first documents (in order)

1. This file.
2. `01-master-ui-parity-plan.md` (when written) — phases, decisions, conventions, tracker.
3. `00-ui-parity-matrix.md` (when written) — the per-surface/per-recipe gap matrix.
4. `phone-ui-delta-inventory.md` + `demo-ui-inventory.md` — the recon inventories the matrix is built from.
5. v1 runbook `../demo-phone-parity/HANDOFF.md` — the system this effort inherits (standing rules §4, review mechanics §7, territory briefs).
6. `features/demo/CLAUDE.md` — the demo architecture contract (binding).
7. Phone: `docs/plans/ui-consistency/{02-ui-consistency-owner-rulings.md,03-SESSION-RUNBOOK.md}` — the phone campaign's rulings + runbook; `ds-bundle/README.md` — the token DS.

## 4. Standing rules (inherited from v1 §4 — all still binding)

- NEVER `git stash` (shared stash stack across worktrees). Commit WIP to the agent's own branch.
- Foreground commands only; raise timeouts instead of background watchers.
- Re-run flaky-looking failures before concluding (parallel-agent CPU contention).
- Agents do NOT edit the plan/matrix/HANDOFF — the orchestrator does at merge time. Agents DO append to `docs/code-reviews/deferred.md` (next free §, check first).
- Never `git checkout -- <file>` / `git restore` on a shared worktree without reading the diff first.
- Quote gates only from a cold cache on the merged head (`pnpm exec tsc --noEmit --incremental false`).
- Mutation-probing lanes get their own worktree or serialise full-suite runs.
- Agent context rotation: retire an implementer approaching ~700k cumulative tokens; brief a fresh one from its final report + commit list.
- Windows specifics (from the phone repo's incidents): never `rm -rf` anything that might be a junction; worktree node_modules — `pnpm install --prefer-offline` in the demo repo is fine (pnpm shared store), but never delete a junction blindly.
- Platform: this effort runs on **Windows 11** — no iOS simulator, no Android SDK on this box. The v1 verification harness's phone side (Maestro/simctl/Vision OCR) does not run here; the Playwright demo side does. Phone-side verification strategy is an open decision for the plan (see `verification/README.md` for what v1 had).

## 5. Current state snapshot

**Branch:** `docs/ui-parity-planning` (worktree `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\demo-ui-parity-planning`) off `master` @ `5cf88fe`. Owner's main checkout is on `feat/splash-a-three` (splash WIP — unrelated; leave it alone).
**Phone HEAD:** `main` @ `dd5551ec` (2026-08-25). **Demo-parity baseline on the phone:** `d9606460` (2026-07-30) — everything after it is the delta.
**Known:** `.design-sync/check-rn-parity.mjs` (v1's 9-anchor RN↔web token drift guard) is RED on master — `Button PRIMARY_GRADIENT.dark not found` (phone P9 moved it).
**Landed:** `demo-ui-inventory.md` (2,480 lines, §0–§8 + census script `census.mjs`; §5 shows the drift guard masks FOUR real token drifts — bg `#0d1b2a→#002853`, border `#1e3a5f→#1c4e84`, the primary gradient renamed `PRIMARY_GRADIENT→PrimaryButtonGradient` and inverted in character). **Landed:** `phone-ui-delta-inventory.md` (18,613 lines; §0 High confidence; §0.6 flags: rulings D3(a)/D1(a) superseded by #127 code — follow the code; `.design-sync/tokens.css` + `constants/README.md` on the phone are STALE, never mine them; contrast ratios mostly COMPUTED not observed — only PR #125's DEVICE-PASS observed hardware). **Landed:** `00-ui-parity-matrix.md` + `01-master-ui-parity-plan.md` (draft, `3365e3e`). **In flight:** plan-review r1 — `planrev-architect` / `planrev-quality` / `planrev-reality` (Opus, following `.claude/agents/plan-*.md`, findings to `plan-review/r1/`). Next: small Opus aggregator → one vetted doc → `matrix-plan-writer` (warm) fix round → lanes fix-delta → owner ratifies D1–D17 → planning bundle PR to master.

## 6. Agent roster & continuity handles

| Role | Handle | Model | Status |
|---|---|---|---|
| Phone UI-delta inventory | `recon-phone-delta` | Opus | done (resumable to settle inventory contradictions) |
| Matrix + master plan writer | `matrix-plan-writer` | Opus | done; WARM — fix rounds go to it by path |
| Plan-review r1 lanes architect / quality / reality | `planrev-architect` / `planrev-quality` / `planrev-reality` | Opus | in flight; fix-delta resumes THESE |
| Demo UI inventory | `recon-demo-ui` | Opus | done (resumable for §3 line-range re-checks) |

## 7. Next-step queue

1. When both inventories land: launch the matrix+plan writer (Opus) → `00-ui-parity-matrix.md` + `01-master-ui-parity-plan.md` (v1 format: status legend, effort, phase, decisions-needed section for owner ratification).
2. Owner ratifies decisions → commit the planning bundle → phased execution per the plan.
3. Verification lane: extend `check-rn-parity.mjs` to the new anchor set (mechanical guard) + Playwright demo captures; phone-side runtime TBD (owner).

## 8. Update protocol

At EVERY milestone: update §5 + "Last updated", add new standing rules to §4, record agent handles in §6, commit with the milestone's docs commit.
