# HANDOFF — Demo↔Phone UI Parity (v2) Orchestration Runbook

state-as-of: 152487a
last-full-plan-read: 152487a

**Purpose:** everything a fresh orchestrator instance needs to pick up EXACTLY where the previous one left off. Updated at every milestone — trust the newest "Current state" snapshot over any conversation summary.

**Last updated:** 2026-08-27 — milestone: ***W0 ASSEMBLED + GATED @ `feat/uiparity-u0` `7099e54` (guard 33/33 exit 0 · cold tsc 0 · 3,513 pass + 15 todo · build 0 · 107 kB) — PR #39 OPEN with full body. W0 REVIEW r1: five lanes DONE (`e858371`): raw 0C/4H/11M/8L — ts REVISE (anchor SET unpinned), web REVISE (`accentFrom` fill shade spent as foreground ×6, 5.92→2.54, in captures), tests REVISE (BANNED scan whitespace-blind; 15/32 palette keys unanchored), silent-failures + type-design APPROVE-w/comments. Verification AFTER done: 117 shots, 104 changed / 0 required-missing / 0 U0 regressions; gap: `engine/logic/case-map/template.ts` old palette, no matrix row (aggregator rules). **VETTED r1: REVISE — 0C/3H/4M/3L (F1–F10; ledger §89–§93 written; `T.rowH` deferral refused → F9).** F1 `accentFrom` foreground misuse ×6 → A; F2 anchor set unpinned + 17/32 keys unanchored → U0.4 seat (anchor ALL 32 keys now — plan's anchor schedule changes); F3 scans whitespace/case-blind → U0.5 seat. **FIX ROUND 1 IN FLIGHT** on `uiparity/u0-fix-{foundation,guard,contrast}` off the phase head → merge in that order → fix-mapping comment on PR #39 → fix-delta (warm lanes + aggregator) → APPROVE → merge. Per-lane scratchpad dirs from W1 (web lane's scratchpad was cross-contaminated). → warm-author fix rounds (A / U0.4 / U0.5 seats) → fix-delta → APPROVE → `gh pr merge 39 --merge`. Verification: AFTER captures + DIFF.md in flight on 7099e54. PIPELINED W1: U1.1 LANDED (`uiparity/u1.tiers` @ `e574b48`; guard 81 rows/42 keys; 3,523 green) and merged --no-ff into `feat/uiparity-w1` @ `22f5a00` (wave worktree `w1-wave`). FAN-OUT IN FLIGHT: U1.2→U1.3 (one warm seat, worktree `u1-cards`, branch `uiparity/u1.cards`) ∥ U1.4 (worktree `u1-headers`, branch `uiparity/u1.headers`), both off 22f5a00. When W0's fixes merge to `feat/uiparity-u0`: merge it into `feat/uiparity-w1` (--no-ff, re-gate) — EXPECT a collision between U0.4's F2 fix (anchors all 32 palette keys; `toBe(N)` pin) and U1.1's `toBe(81)`: the guard test's count pin must be re-derived once at that merge (integrator or the U0.4 seat).***

## 1. Mission & role

Bring `features/demo/` (the web replica) to **UI parity with the phone app's refactored UI** — the phone's UI-consistency campaign (PRs #110–#124, `fix/ui-consistency-p0..p13`, 2026-08-20→22), post-campaign triage (#125, `docs/plans/ui-touchups/`) and the map-chrome redesign (#127). Logic parity was completed by the previous effort (`docs/planning/demo-phone-parity/`, P0–P8, 2026-07-30→08-01) and is NOT in scope again — this is a styling/recipe/token port.

You are the ORCHESTRATOR: you brief agents, merge branches, run reviews, keep docs current. You do not write feature code. Keep your own context light — reports on disk, counts-only replies, path-passing.

## 2. Owner directives (binding)

- **Model & spawn policy (owner, 2026-08-26, supersedes the earlier "force opus on any agents"):**
  - **Implementers:** spawn as `subagent_type: "opus-implementer"` (xhigh effort; `opus-implementer-high`/`-max` only where the plan's package tier says so).
  - **Review lanes:** spawn with an EXPLICIT `model: "opus"` on every call — most `.claude/agents/*-reviewer.md` definitions carry no model frontmatter and would silently inherit something else.
  - **Aggregator (review + plan-review): FABLE** (`model: "fable"`), as in v1 — the one seat that settles disputes.
  - **NO NAMED AGENTS from the build phase on** — `name:` forces the teams machinery, which is flaky. Spawn unnamed, record the raw `agentId` from each spawn result in §6, and resume via that id. (Planning-phase agents already named may finish; nothing new gets a name.)
- **D1–D20 RATIFIED 2026-08-27 (owner: "you are the expert — 100% best path, no shortcuts, no band-aids").** D1–D17, D19, D20 = the matrix recommendations. **D18 OVERRIDDEN: phases merge straight to `master`** (site not live; no integration branch). **D2 AMENDED: light mode stays open** — the token layer ships BOTH scheme halves from U0, the demo consumes dark, drift guard + contrast test pin both halves; nothing hard-codes a dark value that has a light sibling. Human-time estimates are struck from the plan; wall-clock is agent-time.
- **D21 (owner, 2026-08-27, overrides the per-phase PR topology): ONE PR + ONE review cycle PER WAVE — five total (W0=U0 · W1=U1 · W2=U2+U3+U4 · W3=U5+U6+U7 · W4=U8).** "Review cycles are a big spend; that should be one per milestone, not phase." Topology: wave branch `feat/uiparity-w<N>` off `master`; phase branches `feat/uiparity-u<N>` off the wave branch (concurrent phases in a wave merge `--no-ff` into the wave branch in the plan's §6.2 order, `dt-integrator` for any merge not clean in one pass); package branches `uiparity/u<N>.<pkg>` off their phase branch; ONE PR per wave → `master` (merge commit); rollback `git revert -m 1 <wave merge>` (packages still revert individually). Review artifacts: `docs/code-reviews/ui-parity/w<N>/`. Wave 0 = U0 alone, so `feat/uiparity-u0` IS the W0 branch (no rename). Device checkpoints unchanged (after W1, after W2, at W4 exit).
- **Fidelity bar (owner, verbatim): "right now it looks bang on for what it used to look like; after this I want it bang on for what it looks like now."** DoD clause 11 (side-by-side reads as the same product) is the definition of done; the mechanical gates are the floor under it.
- **Parallelism (owner): "go parallel everywhere you can without sacrificing quality."** The plan's §6.2 wave table (derived from §6.1 file contention) is the mode call; one worktree per M+ package; S packages ride a warm agent's tree; `dt-integrator` takes any wave merge not clean in one pass.
- **PR HYGIENE (owner, 2026-08-27):** partner legwork (`reports/partner-legwork-*.md`) lives on `master` ONLY — never on a wave branch, never in a PR diff. Wave PRs carry code + the implementer reports + `docs/code-reviews/ui-parity/w<N>/`. PR body = scope + decisions applied + commit→package/finding table + deviations-with-justification + "deliberate choices — don't re-flag" + verification evidence (gate exit codes, test counts, First Load, capture manifest path). Commits granular, RED+GREEN together, one commit per fix (group only when entangled); every fix round posts a fix→finding mapping comment on the PR. Every seat stays WARM and is reused; at ~700k stop assigning new packages and retire it after its current wave, with a successor note.
- **PIPELINING (owner, 2026-08-27):** wave N+1's implementation starts off wave N's ASSEMBLED, GATED head as soon as those gates are green — it never waits for wave N's review cycle to close. Wave N's review runs concurrently with wave N+1's build; wave N's fixes are merged into wave N+1's branch (`--no-ff`, re-gate) before its PR. Reviews of different waves may overlap (per-wave lane seats; one warm aggregator). Never start a wave off an ungated head. Within a wave: all phases concurrent; within a phase: every M+ package in its own worktree; §6.1/§6.2 contention is the only brake.
- **Orchestration doctrine:** `.claude/skills/fleet-orchestration/SKILL.md` (+ `hazard-playbook.md` for every repo-writing agent, `reviewer-contract.md` for every lane, `mutation-testing/SKILL.md` for every pin). Seats: `opus-implementer` (impl) · five code lanes · `dt-review-aggregator` (Fable, warm all rounds, SOLE ledger writer) · `dt-integrator` (any merge not clean in one mechanical pass) · TWO partner seats, used differently (owner, 2026-08-27): **`dt-partner-opus` = legwork** (measuring, reading source, probing, census) — the default; **`dt-partner` (Fable) = the hardest problems only** (adjudication, open design questions, contradictions the Opus seats can't settle). "Fable is the best model in the world and should be used for the hardest problems; Opus 5 is a great model — we don't need Fable for legwork." Blocking conditions live in `GATES.md`.
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

- **Briefs POINT, they do not transcribe** (fleet SKILL §0 is canonical over plan §6.4's "paste the text" items 1–7): every implementer brief names the exact plan §/rows, matrix rows, inventory sections and files, and the implementer reads them IN FULL from disk. Never relay a spec into a brief.
- Every repo-writing agent reads `.claude/skills/fleet-orchestration/hazard-playbook.md` FIRST — those are the rules; the bullets below are demo-specific additions. NEVER `git stash`; never blanket-discard; `git add <named paths>` only (the `dt-git-guard` hook blocks `stash`, `checkout -- .`, `restore .`, `clean -f`, `add -A`, `commit -a`).
- Foreground commands only; raise timeouts instead of background watchers.
- Re-run flaky-looking failures before concluding (parallel-agent CPU contention).
- Agents do NOT edit the plan/matrix/HANDOFF — the orchestrator does at merge time. **Nobody but `dt-review-aggregator` writes `docs/code-reviews/deferred.md`** — implementers PROPOSE deferrals in their disk reports (with a concrete un-defer trigger); the aggregator decides and writes the row. The v1 "next free §" protocol is retired.
- Never `git checkout -- <file>` / `git restore` on a shared worktree without reading the diff first.
- Quote gates only from a cold cache on the merged head (`pnpm exec tsc --noEmit --incremental false`).
- Mutation-probing lanes get their own worktree or serialise full-suite runs.
- **Aggregators write to disk as they go** (learned r1: an aggregator that narrates its whole analysis before writing loses everything to one API cutoff — twice). Brief every aggregator to write the findings table first, then append per step.
- Agent context rotation: retire an implementer approaching ~700k cumulative tokens; brief a fresh one from its final report + commit list.
- Windows specifics: **pnpm lays ~535 directory junctions inside a worktree's `node_modules`** (measured); plain `git worktree remove` fails "Directory not empty". Teardown ONLY via `tools/worktree-remove.ps1 <path>` (unlinks reparse points, removes, prunes, proves the main checkout's `.pnpm` count unchanged) — recipe in `.claude/skills/mutation-testing/SKILL.md` project hazards. Setup is cheap: `git worktree add` 1s + `pnpm install --prefer-offline` ~6s.
- **Baseline on master @ `5cf88fe` (measured 2026-08-27):** install 5.3s · cold `tsc` 10s green · `pnpm test --silent` 60s **RED 3,480/3,481** (the RN drift-guard test THROWS at `check-rn-parity.mjs:75` — deterministic; U0's first commit repairs it to report `PARSE-FAILED`) · `pnpm build` 75s green · `/demo` First Load JS **107 kB** (v1's figure holds). A single red in `rn-token-parity.test.ts` before U0 is baseline, not a kill.
- **Verification harness on Windows (measured):** v1's Playwright drivers run here with `npm i playwright@1.60.0` in a scratch dir + `NODE_PATH` (cached chromium-1223); `probe.js` vs `pnpm dev --port 3007` exit 0. ALWAYS set `SHOT_DIR` (default writes into v1's baselines dir, `lib.js:8-10`); `dvrclock.y4m` absent → live-OCR capture skips.
- **Phone scheme facts (verified @ dd5551ec):** `Colors.light`/`.dark` identical 45-key sets, `GlassColors` 24 each, no one-sided keys; `PrimaryButtonGradient`/`ElevatedEdges`/`DangerFill` per-scheme; `DangerFill.dark` = `errorLight` (names invert by design). Light mode is closed in the demo by ABSENCE only — the sole pins that redden when it opens: `panes.test.tsx:87,113`.
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
| Matrix + master plan writer | `matrix-plan-writer` | Opus | **RETIRED at its context wall (2026-08-27)** — successor note at `reports/plan-writer-successor-note.md`; plan/matrix edits are the orchestrator's from here (legwork via the Opus partner) |
| Plan-review r1 lanes architect / quality / reality | `planrev-architect` / `planrev-quality` / `planrev-reality` | Opus | done (r1 + two deltas, all APPROVE); retire-eligible |
| Plan-review r1 aggregator v1 | `planrev-aggregator` | Opus | RECOVERED after two API cutoffs and completed VETTED.md; warm but fix-delta aggregation goes to a fresh FABLE seat per §2 |
| Plan-review r1 aggregator v2 | `planrev-aggregator-v2` | Opus | STOPPED (redundant) — never resume |
| Fix-delta r1 aggregator (unnamed, per §2 policy) | agentId `a7557cc07fd72b866` | **Fable** | done — issued the closing APPROVE; retire-eligible |
| Kit-integration (dt kit → this repo: personas, hooks, git-guard, GATES.md, CLAUDE.md pointer) — on `master` in the main checkout | agentId `aab4aa3d664ebec47` | Opus | in flight |
| **PARTNER — hard problems only** (`dt-partner`, WARM; resume by id) | agentId `ae623de02de846e92` | **Fable** | in flight on its one legwork task (baseline gates, Colors.ts scheme-key parity, harness check) — after that, hard questions only |
| **PARTNER — legwork** (`dt-partner-opus`, WARM for the whole build; resume by id) | agentId `aa1ddb75b9ac90195` | Opus | warm; probed U0.1/U0.5 premises (one refuted, one confirmed) |
| **U0 implementer A** (`opus-implementer`; U0.0→U0.3; worktree `worktrees/u0-foundation`, branch `uiparity/u0.foundation`) | agentId `ae5f52b4da850cd08` | Opus xhigh | done (~351k tokens); WARM for W0 fix rounds on its packages |
| **U0.4 implementer** (`opus-implementer-max`; worktree `worktrees/u0-guard`, branch `uiparity/u0.guard`) | agentId `adff9eb9a7670742f` | Opus max | done (`3182b33`, merged; 33/33 anchors; 7 probes 0 survivors); WARM for W0 fix rounds |
| **U0.5 implementer** (`opus-implementer-max`; worktree `worktrees/u0-contrast`, branch `uiparity/u0.contrast`) | agentId `aaa5c5ea7ea00825b` | Opus max | done (`ee91bb9`, merged --no-ff into `feat/uiparity-u0`; 3,506+15 todo green; 2 survived probes fixed pre-push); WARM for W0 fix rounds |
| **W0 REVIEW LANES r1** typescript / web / tests / silent-failures / type-design (fix-delta resumes THESE) | `a4c5c572ffccfbfd2` / `a8c0513e7045e143e` / `a612a9b18fb01a882` / `a0eee46d047065bbd` / `ae371985d5c932c30` | Opus | r1 done; WARM — fix-delta resumes THESE |
| **REVIEW AGGREGATOR — the build's warm seat, every round of every wave** (`dt-review-aggregator`; SOLE ledger writer) | agentId `a0a927cee97a72c8d` | **Fable** | in flight: W0 r1 |
| **U1.1 implementer** (`opus-implementer-max`; worktree `worktrees/u1-tiers`, branch `uiparity/u1.tiers` off `feat/uiparity-w1`) | agentId `ac9a1a0c98322500a` | Opus max | done (`e574b48`, merged into W1; 21 probes); WARM for W1 fix rounds |
| **U1.2→U1.3 implementer** (`opus-implementer`; worktree `u1-cards`, branch `uiparity/u1.cards`) | agentId `aec4149c990c8d0ef` | Opus xhigh | in flight |
| **U1.4 implementer** (`opus-implementer`; worktree `u1-headers`, branch `uiparity/u1.headers`) | agentId `a9f135565ce43133b` | Opus xhigh | in flight |
| **VERIFICATION seat** (Playwright captures; WARM across waves; captures under `worktrees/_captures/w<N>/{before,after}`, Playwright scratch at `worktrees/_pw`) | agentId `ae2b8ca4003b5eb41` | Opus | W0 before+after done (117+117, `_captures/w0/DIFF.md`); WARM for W1 |
| Demo UI inventory | `recon-demo-ui` | Opus | done (resumable for §3 line-range re-checks) |

## 7. Next-step queue

**OWNER GATE (2026-08-26): PAUSE at the end of the planning phase.** Finish writer fix round → fix-delta (three warm lanes) → fresh FABLE aggregator → commit bundle → ratification brief for D1–D20. Then STOP. No implementer is briefed until the owner returns and rules.

1. When both inventories land: launch the matrix+plan writer (Opus) → `00-ui-parity-matrix.md` + `01-master-ui-parity-plan.md` (v1 format: status legend, effort, phase, decisions-needed section for owner ratification).
2. Owner ratifies decisions → commit the planning bundle → phased execution per the plan.
3. Verification lane: extend `check-rn-parity.mjs` to the new anchor set (mechanical guard) + Playwright demo captures; phone-side runtime TBD (owner).

## 8. Update protocol

At EVERY milestone: update §5 + "Last updated", add new standing rules to §4, record agent handles in §6, commit with the milestone's docs commit.
