# HANDOFF — Demo↔Phone UI Parity (v2) Orchestration Runbook

state-as-of: 43ccbad
last-full-plan-read: 152487a

**Purpose:** everything a fresh orchestrator instance needs to pick up EXACTLY where the previous one left off. Updated at every milestone — trust the newest "Current state" snapshot over any conversation summary.

**Last updated:** 2026-08-27 — milestone: ***W2 ASSEMBLED + GATED @ `feat/uiparity-w2` `7bcb553` (guard 65 keys/135 rows · 3,881 pass + 4 todo · 107 kB · SEAM 50/1 pinned wait) — PR #42 OPEN. W2 REVIEW r1 IN FLIGHT: FIVE FRESH lanes (ts `a919df545115dc79d` · web `a10886dc1d2b77b90` · tests `ad231ec85927cfa13` · sfh `a19be93c2a312f772` · type-design `adc7fb4d78688a72d`) → `w2/lane-*.md` in worktree `w2-wave` → AGGREGATOR v2 (`ab0635173e8414282`, F26+, §99+) → warm-author fix rounds → fix-delta → merge #42. Verification: W2 before/after + owner checkpoint 2 in flight. PIPELINED W3: `feat/uiparity-w3` + `feat/uiparity-u5/u6/u7` cut @ 7bcb553; partner producing the shift table; first packages (U5.1 mapTokens re-point ∥ U6.1 ∥ U7.1) launch on its reply.***

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
- **PLAN CORRECTIONS OWED (apply at the W1 merge, orchestrator):** plan §4.3 "override `borderColor`, never `border`" is WRONG — `border-color` is a four-side shorthand and erases `border-top-color` identically (U1.2 measured, probes killed) — the lit top edge needs `borderTopColor` set AFTER any `borderColor`; matrix row 82 / A37: `SettingsNavBar` reads the ELEVATED tier, not header (phone `SettingsNavBar.tsx:43`); U0.4 = 32 keys / 67 rows, U3.1 adds 2 keys not 4, port ends 59 keys / 123 rows (+ U1.1's 24 tier keys: 115 rows at W1); U0.5 P-2 (header/elevated grounds) closed NO by U1.4's arithmetic; the eight/seven/eight per-report correction lists in `reports/u1.*-implementation-report.md` §9.
- **Wave PR bases: open every wave PR against `master` from the start** (the earlier-wave PR shows in the diff until it merges — acceptable). Basing a PR on the previous wave's branch gets it AUTO-CLOSED when that branch is deleted at merge (#40 incident).
- **Session-limit cutoffs terminate every in-flight agent at once** ("Agent terminated early due to an API error: session limit"). Recovery: `git status`/`git log` in every active worktree FIRST (committed progress survives; uncommitted edits are the owner's — never discard), then resume each seat by ID with a one-line "resume from committed progress" message; respawn fresh ONLY when SendMessage says "No transcript found" (seed from the on-disk artifacts). Check `git worktree list` for orphaned `probe-*` trees.
- **Session link is `https://claude.ai/code/session_01UtQCSnhF3oHi92Lu3mBSv4`** (`…Lu3mBSv4`, with the `m`) — two briefs carried a one-char typo; the integrator caught it. Copy from here.
- **THE LIT-EDGE RULE (Fable ruling 2026-08-27, measured jsdom + Chromium, `reports/partner-lit-edge-ruling.md`):** glass fragments carry ONLY longhands — `borderStyle`/`borderWidth` (+`borderTopWidth` where the recipe says) + `borderRightColor/BottomColor/LeftColor` + `borderTopColor`; NO `border`, NO `borderColor` key, ever. Consumers write ONLY colour longhands after a spread; `border`/`borderColor`/`borderTop` after a spread is a defect in every shape (paint-1 OK / paint-2 FAIL trap). A `vitest.setup.ts` `console.error` guard on React's `/conflicting property/` warning is the mechanical gate (W1 rider). Supersedes W1 F14's fragment shape AND U4.1's `sheetSurface` form; plan §4.3 is rewritten to this at the W1 merge.
- **`.env.local` EXISTS in the main checkout** (live `NEXT_PUBLIC_MAPBOX_TOKEN` + Ollama keys — key names only; never read/print values; never commit it). Plan §4.7/§6.3/§4.6 saying "none exists" are STALE. Consequences: worktrees for U5 (map) and the verification seat COPY it (`cp .env.local <worktree>/`); U7 import captures will take the LIVE AI path — pin the fallback mode for before/after parity or shots differ for non-styling reasons. W0–W2 captures were taken WITHOUT it (map = fallback panel) — keep that consistent within a wave; switch at W3's BEFORE set.
- **Close-label props (phone, verified):** `GlassBottomSheet.closeLabel?` (optional, labels the SCRIM — U4.1 correct); `ModalHeader.closeAccessibilityLabel` (required, labels the ✕ — U4.2's). Both exist; W2 legwork §3.1's recommendation is struck.
- **jsdom does not synthesize `borderColor` from the four longhands** (U3.3, measured): after a fragment converts to the lit-edge rule, `el.style.borderColor` reads `''` — pin per side (`borderTopColor/Right/Bottom/Left`) via a `sides(el)` helper, never the shorthand.
- **Hex sweeps: never `grep -F '#rrggbb'` in Git Bash** — it matches nothing and exits quietly (U1.4's first sweep was a false clean). Sweep the hex BODY without `#`, case-insensitive, with a positive control that must hit.
- Mutation-probing lanes get their own worktree or serialise full-suite runs. **Probe worktrees are named `probe-<pkg>-<topic>` — never a generic name** (W0 fix round: two seats both cut `probe-u0-fix`; one's chained `pnpm install` ran in the other's live tree). Per-lane scratchpad subdirs likewise (W0 web lane's scratchpad was cross-contaminated).
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
| **PARTNER — hard problems only** (`dt-partner`, WARM; resume by id) | agentId `ae623de02de846e92` | **Fable** | in flight: the lit-edge composition ruling (F14 vs U4.1) with a React/jsdom/Chromium harness |
| **PARTNER — legwork** (`dt-partner-opus`, WARM for the whole build; resume by id) | agentId `aa1ddb75b9ac90195` | Opus | warm; probed U0.1/U0.5 premises (one refuted, one confirmed) |
| **U0 implementer A** (`opus-implementer`; U0.0→U0.3; worktree `worktrees/u0-foundation`, branch `uiparity/u0.foundation`) | agentId `ae5f52b4da850cd08` | Opus xhigh | done (~351k tokens); WARM for W0 fix rounds on its packages |
| **U0.4 implementer** (`opus-implementer-max`; worktree `worktrees/u0-guard`, branch `uiparity/u0.guard`) | agentId `adff9eb9a7670742f` | Opus max | done (`3182b33`, merged; 33/33 anchors; 7 probes 0 survivors); WARM for W0 fix rounds |
| **U0.5 implementer** (`opus-implementer-max`; worktree `worktrees/u0-contrast`, branch `uiparity/u0.contrast`) | agentId `aaa5c5ea7ea00825b` | Opus max | done (`ee91bb9`, merged --no-ff into `feat/uiparity-u0`; 3,506+15 todo green; 2 survived probes fixed pre-push); WARM for W0 fix rounds |
| **W0 REVIEW LANES r1** typescript / web / tests / silent-failures / type-design (fix-delta resumes THESE) | `a4c5c572ffccfbfd2` / `a8c0513e7045e143e` / `a612a9b18fb01a882` / `a0eee46d047065bbd` / `ae371985d5c932c30` | Opus | r1 done; WARM — fix-delta resumes THESE |
| REVIEW AGGREGATOR v1 (`dt-review-aggregator`) | agentId `a0a927cee97a72c8d` | **Fable** | W0 + W1 closed (~600k); RETIRING after W1's final rider delta; successor brief in `w1/VETTED-r2.md` pipeline notes |
| **REVIEW AGGREGATOR v2 — the warm seat from W2 on** (`dt-review-aggregator`; SOLE ledger writer; rotation successor seeded from v1's precedent) | agentId `ab0635173e8414282` | **Fable** | orienting |
| **U1.1 implementer** (`opus-implementer-max`; worktree `worktrees/u1-tiers`, branch `uiparity/u1.tiers` off `feat/uiparity-w1`) | agentId `ac9a1a0c98322500a` | Opus max | done + fix r1 (`bc7c51a`); WARM |
| **U1.2→U1.3 implementer** (`opus-implementer`; worktree `u1-cards`, branch `uiparity/u1.cards`) | agentId `aec4149c990c8d0ef` | Opus xhigh | done + fix r1 (`228bb32`; F14 refined: three-side longhands only); WARM |
| **U1.4 implementer** (`opus-implementer`; worktree `u1-headers`, branch `uiparity/u1.headers`) | agentId `a9f135565ce43133b` | Opus xhigh | done + fix r1 (`0703e5f`; F18 scan refined); WARM |
| **W0 INTEGRATOR** (`dt-integrator`; owns the phase-branch merge of the fix round) | agentId `aace40599f45bd260` | Opus xhigh | done (W0 r1 merge); WARM for any later non-clean merge |
| **U2.1 implementer** (`opus-implementer`; `u2-fields`, `uiparity/u2.fields`) | agentId `acfeda2f7cd15b91a` | Opus xhigh | done (`a1024ce`, merged into U2 @ b9124b8; 3,582 green; 13/13 probes); WARM for W2 fix rounds |
| **U2.2 implementer** (`opus-implementer-max`; `u2-buttons`, `uiparity/u2.buttons`) | agentId `aa98c67e1b8a92570` | Opus max | done (7 commits; 17/17 probes; 12 refutations); WARM for W2 fix rounds |
| **U2.3 implementer** (`opus-implementer`; `u2-switches`, `uiparity/u2.switches`) | agentId `a22c8bac1dd03a700` | Opus xhigh | done (`c51f472`, merged into U2 @ 530f779; 3,576 green); WARM for W2 fix rounds |
| **U3.1→U3.4 implementer** (`opus-implementer`; `u3-status`, `uiparity/u3.status`) | agentId `a29c3ecd7bdf86f63` | Opus xhigh | done (`eefc0ee`, merged into U3 @ ae87f9b; guard 131 rows; 15 italics ruled KEEP); WARM |
| **U3.2 implementer** (`opus-implementer-max`; `u3-severity`, `uiparity/u3.severity`) | agentId `ae1c1cc2c29908306` | Opus max | done (`f663c12`, merged into U3 @ 63d21f9; 11/11 probes; engine purity restored); WARM |
| **U3.3 implementer** (`opus-implementer`; `u3-banner`, `uiparity/u3.banner`) | agentId `ae5212edcaf8ada66` | Opus xhigh | done (`a52a0ff`, merged into U3 @ b336665; 12/12 probes; one in-tree probe incident recorded); WARM |
| **U4.1 (+U4.4 next) implementer** (`opus-implementer-max`; `u4-sheet`, `uiparity/u4.sheet`) | agentId `a182220a9c6c7b4a9` | Opus max | U4.1 + U4.4 done (merged); ~493k — ROTATION WATCH: no new packages; retire after W2's fix rounds with a successor note |
| **U4.2 implementer** (`opus-implementer`; `u4-modal`, `uiparity/u4.modal`) | agentId `a285e52f0befce2f2` | Opus xhigh | done (6 commits, merged into U4 @ 0fc7db8; 24/25 probes); WARM |
| **U4.3 implementer** (`opus-implementer-max`; `u4-dialog`, `uiparity/u4.dialog`) | agentId `aacd7de1d0b63642a` | Opus max | done (`b94a261`, merged; U4 complete); WARM |
| **VERIFICATION seat** (Playwright captures; WARM across waves; captures under `worktrees/_captures/w<N>/{before,after}`, Playwright scratch at `worktrees/_pw`) | agentId `ae2b8ca4003b5eb41` | Opus | TRANSCRIPT LOST at the cutoff — do not resume; artifacts inherited by v2 |
| **VERIFICATION seat v2** (respawned from on-disk state; WARM across waves) | agentId `a6ddd2310b9caabc9` | Opus | W1 re-cut done; WARM for W2 |
| **U2.4 implementer** (`opus-implementer-max`; `u2-pickers`, `uiparity/u2.pickers` off e11d3a4) | agentId `ae2d7a1139ac951d1` | Opus max | in flight |
| Demo UI inventory | `recon-demo-ui` | Opus | done (resumable for §3 line-range re-checks) |

## 7. Next-step queue

**OWNER GATE (2026-08-26): PAUSE at the end of the planning phase.** Finish writer fix round → fix-delta (three warm lanes) → fresh FABLE aggregator → commit bundle → ratification brief for D1–D20. Then STOP. No implementer is briefed until the owner returns and rules.

1. When both inventories land: launch the matrix+plan writer (Opus) → `00-ui-parity-matrix.md` + `01-master-ui-parity-plan.md` (v1 format: status legend, effort, phase, decisions-needed section for owner ratification).
2. Owner ratifies decisions → commit the planning bundle → phased execution per the plan.
3. Verification lane: extend `check-rn-parity.mjs` to the new anchor set (mechanical guard) + Playwright demo captures; phone-side runtime TBD (owner).

## 8. Update protocol

At EVERY milestone: update §5 + "Last updated", add new standing rules to §4, record agent handles in §6, commit with the milestone's docs commit.
