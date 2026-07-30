# HANDOFF — Demo↔Phone Parity Orchestration Runbook

**Purpose:** everything a fresh orchestrator instance (post-compaction or new session) needs to pick up EXACTLY where the previous one left off. Updated by the orchestrator at every milestone — trust the newest "Current state" snapshot over anything in a conversation summary.

**Last updated:** 2026-07-30 — milestone: *P0 fix round merged; fix-delta re-review running; PR #29 open.*

---

## 1. Mission & role

You are the ORCHESTRATOR of the demo↔phone parity effort: bring the `/demo` experience in THIS repo (`demo-website-dvr-extraction-notes`) to full screen/logic parity with the phone app (`../DVR-Extraction-Notes-ReactNative`), executing the phased plan below with a fleet of subagents while the owner is away (Kennebunkport, checking in occasionally by phone). You do not write feature code yourself — you brief agents, merge branches, run reviews, keep the docs/trackers current, and report digestibly.

## 2. Read-first documents (in order)

1. This file, fully.
2. `docs/planning/demo-phone-parity/01-master-parity-plan.md` — the phased plan P0–P8. §3 = owner-ratified decisions D1–D9. §4 = binding agent conventions. §5 = per-package specs. §6 = execution model (worktrees, agent continuity, review mechanics, verification lane). §7 = progress tracker.
3. `docs/planning/demo-phone-parity/00-surface-parity-matrix.md` — the 94-surface gap matrix; §7 = owner ratification rulings.
4. `features/demo/CLAUDE.md` — the demo's binding architecture contract (store bridge, engine purity, inline styles, registries).
5. `docs/code-reviews/deferred.md` — the living deferral ledger (§29–§32 are from this effort).
6. Reference detail when needed: `docs/planning/demo-phone-parity/phone-inventory.md` + `demo-inventory.md` (deep per-screen specs); phone repo `docs/ui-mapping/` (118-surface fact-checked UI map — the per-surface spec source).

## 3. Owner directives (binding, accumulated 2026-07-30)

- **No shortcuts.** Quality over speed; "we get as far as we get."
- **Models:** Fable for ALL coding agents (`model: "fable"`). Opus for review lanes and app-driving/verification agents. Review aggregation: Fable.
- **Agent continuity:** resume the ORIGINAL authoring agent (SendMessage) for review fixes and follow-on work in its area — don't re-brief fresh agents. Every agent has ~1M context; brief richly.
- **Phone repo is STRICTLY READ-ONLY.** Never edit ANY phone file. (Sole exceptions, owner-directed: the CLAUDE.md pointer section and future BUG-NNN ledger entries.)
- **Reviews are macro milestones:** every phase boundary runs the `demo-phase-review` workflow (initial → fix round by original authors → fix-delta re-review) before merge. Commit→finding mapping table posted as a PR comment each fix round.
- **Git:** merge commits only (`gh pr merge N --merge --delete-branch`), never squash/rebase; granular red+green commits; every commit body ends with `Co-Authored-By: <agent's own model name> <noreply@anthropic.com>` + `Claude-Session: https://claude.ai/code/session_01KW377grzkqNJ3fLAAeb56Z`. Demo default branch: `master`.
- **Verification lane:** Playwright drives the demo; the phone runs on the iOS Simulator via the phone repo's `driving-ios-simulator` skill; Opus agents absorb all screenshot-heavy work. Computer use available as backup.
- **P4.7 OCR screen:** landscape viewfinder (owner directive in plan §5 P4.7 — the phone's portrait-vertical strip means "rotate the phone"; demo renders landscape).
- Owner is burning a Max-plan quota week — front-load heavy work; don't idle agents.

## 4. Standing rules learned this session (put these in EVERY agent brief)

- **NEVER `git stash`** in any form — the stash stack is shared across all worktrees of a repo; two agents collided this session (fully recovered). Commit WIP to the agent's own branch instead.
- **Foreground commands only** — no background watchers for installs/builds; raise timeouts instead. (An agent stalled twice on background `pnpm install` watchers.)
- **Re-run flaky-looking test failures before concluding** — parallel-agent CPU contention produced load-induced flakes (MapScreen `waitFor` timeouts etc.) that pass clean solo.
- **Workflow args may arrive as a JSON string** — `demo-phase-review.js` parses both forms (fixed `a9a5565`).
- No `.env.local` exists in the demo repo — map/AI degrade gracefully by design; never fabricate tokens.
- Agents do NOT edit the plan/matrix/HANDOFF — orchestrator updates them at merge time. Agents DO append to `deferred.md` (next free § — check first).
- Worktree setup: `pnpm install --prefer-offline` (shared store, ~2s). Full gates: `pnpm test --silent` + `pnpm exec tsc --noEmit`.
- **Agent context rotation (owner directive):** the `subagent_tokens` figure in each task notification's usage block is CUMULATIVE for that agent. When an implementing Fable agent approaches **~700k**, do NOT resume it again — retire it and brief a FRESH Fable agent seeded with: the retiree's final reports (its task output file), its commit list, the package specs, and the §4 standing rules. Track each agent's running total in the §7 roster on every notification. (Loads as of the P0 fix round: store ~363k, options ~303k, tokens ~242k, boundary ~211k, fonts ~91k.)

## 5. Current state snapshot

**Merged to demo `master`** (at `db9de9d`):
- Planning bundle (matrix, plan, both inventories) — `bd5d178`
- `demo-phase-review` workflow (`.claude/workflows/demo-phase-review.js`) — `c0cedbb` + args fix `a9a5565`
- Review system port — PR #28 (`b939f13`): 5 Opus lane agents in `.claude/agents/` (typescript-reviewer, web-reviewer, test-analyzer, silent-failure-hunter, type-design-analyzer) + `.claude/skills/demo-code-review/SKILL.md` + CLAUDE.md review section
- P4.7 landscape directive — `db9de9d`

**PR #29 open** (`feat/parity-p0` → master): ALL of P0 —
- P0.1 error boundary, P0.2 truthful statuses + completeCase, P0.3 canonical form options + custom path, P0.4 sessionStorage persistence (D2), P0.5 glass tokens.
- Initial review verdict: **approve-with-fixes** (1 blocker R-1, 3 majors, 14 minors) — vetted doc + 5 lane files committed at `docs/code-reviews/parity/p0/` (commit `165de2b`).
- Fix round COMPLETE: 3 fix branches merged (`parity/p0-fix-boundary` → `parity/p0-fix-options` → `parity/p0-fix-store`), all 18 findings fixed, zero refutations. Combined tree: **119 files / 890 tests green, tsc clean**, head `a25396b` pushed. Mapping table posted as PR #29 comment.
- **IN FLIGHT: fix-delta re-review** (workflow run `wf_034c6d18-55f`). On clean verdict: commit the fix-delta review doc, merge PR #29 (--merge --delete-branch has failed before when a worktree holds the branch — remove worktrees first or expect the local-delete error, it's benign), `git checkout master && git pull && git fetch --prune`, update plan §7 tracker + matrix statuses + this file, then launch the P1 wave.

**Also in flight:** the verification-harness Opus agent (Playwright setup + demo baselines + simulator build/baselines) — launched in wave 1, still running, NO report yet. Its deliverables land in `<scratchpad>/drive-harness/` + `<scratchpad>/baselines/`; if it comes back blocked, resolve before P1 needs phone-side import-terminal screenshots.

**Banked for P1:** branch `parity/p1-fonts` (pushed, `f01f85d`) — next/font migration; merge into the P1 phase branch when it exists.

## 6. Git topology

- Demo repo: `/Users/fvadev/Developer/extraction-notes/demo-website-dvr-extraction-notes` (github Recon222/demo-website-dvr-extraction-notes; main checkout stays on `master`).
- Phone repo (READ-ONLY): `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative`.
- Worktree base: `/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/7423d8f5-e7f4-4135-a726-296308b62d4d/scratchpad/worktrees/` — currently: `p0-store`, `p0-boundary`, `p0-options`, `p1-fonts`, `p0-tokens`, `parity-p0` (the phase-assembly worktree; fix-delta runs against it). `review-system` already removed.
- Scratchpad is session-scoped and may vanish on reboot — branches/PRs on origin are the durable record; recreate worktrees freely (`git worktree add <path> <branch>`).
- Phase pattern: agent branches `parity/<pkg>` → phase branch `feat/parity-p<N>` (merge --no-ff each) → PR → review → fix branches `parity/p<N>-fix-<pkg>` off the phase branch → merge → fix-delta → PR merge with bubble.

## 7. Agent fleet & continuity handles

Resume agents with SendMessage using the basename (without `.output`) of their task file in `<scratchpad>/tasks/`. Roster (all reports live in those files — read them for full context of what each built):

| Role (packages) | Task output file (basename = SendMessage handle) |
|---|---|
| Store foundation (P0.2+P0.4, owns persistence + completion) — Fable | `a56dfdc6f5b5b284e.output` |
| Error boundary (P0.1) — Fable | `a6613c0ffed5370e6.output` |
| Options (P0.3, owns form enums + custom path) — Fable | `a2b51d954c1e5a43f.output` |
| Fonts (P1.1) — Fable | `a4ac7fe263be102c6.output` |
| Glass tokens (P0.5) — Fable | `aca36de553446187a.output` |
| Review-system port (done, resumable for review-system refinement) — Opus | `a388a76a7b0739c99.output` |
| Verification harness / app driving — Opus | `adf24869c18c6bef3.output` |
| Recon (done): doc-locator / demo-inventory / phone-inventory / parity-matrix — Opus | `ac59c0bc448ce5aed.output` / `a46f0f3ccdc81d89c.output` / `a0257d509da576d42.output` / `a9a9f02d2f5bea836.output` |

Review workflow runs are NOT resumable as agents — each phase runs fresh via the Workflow tool with `scriptPath: <demo>/.claude/workflows/demo-phase-review.js` (see plan §6 for arg shapes; fix-delta needs `mode` + `priorReviewDoc`).

## 8. Next-step queue (after PR #29 merges)

1. Update plan §7 tracker (P0.1–P0.5 ✅ with PR link) + matrix row statuses + this file; prune P0 worktrees/branches.
2. **Launch P1 wave** (phase branch `feat/parity-p1` off fresh master; merge `parity/p1-fonts` into it first): P1.2 picker upgrade, P1.3 log bus (engine), P1.4 live terminal (the owner-flagged centerpiece — spec: phone-inventory §5.7), P1.5 flow modes + dwell, P1.6 real PDF saves (D4: window.print primary + html2pdf one-click spike). Sequence: (P1.2 ∥ P1.3) → P1.4 → P1.5 → P1.6. Reuse the SAME agent-brief skeleton (worktree, standing rules §4 above, trailers, push, report).
3. P1 review milestone → fix round → fix-delta → merge → P2 ∥ P3 waves (see plan §5 for package specs and the shared-geolocation coordination note).
4. Keep the phone-repo follow-up ledger growing (plan §8): NEW this session — the phone's own `app/(form)/cameras.tsx:36-61` has the same index-keyed custom-flag desync bug fixed in the demo (file as BUG-NNN when the owner returns).

## 9. Update protocol (for the orchestrator)

At EVERY milestone (phase assembled / review verdict / fix round merged / PR merged / wave launched / notable incident): update §5 "Current state snapshot" + the "Last updated" line, and add any new standing rule to §4. Commit this file with the milestone's docs commit (or its own `docs(handoff):` commit). Also keep the auto-memory (`~/.claude/projects/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/memory/`) pointer file current — it and both repos' CLAUDE.md pointer sections are how a fresh instance finds this file.
