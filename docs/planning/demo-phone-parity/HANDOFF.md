# HANDOFF — Demo↔Phone Parity Orchestration Runbook

**Purpose:** everything a fresh orchestrator instance (post-compaction or new session) needs to pick up EXACTLY where the previous one left off. Updated by the orchestrator at every milestone — trust the newest "Current state" snapshot over anything in a conversation summary.

**Last updated:** 2026-07-30 — milestone: *PR #29 MERGED (all of P0, verdict APPROVE after 2 fix rounds); P1 wave + riders launching.*

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
- **Agent context rotation (owner directive):** the `subagent_tokens` figure in each task notification's usage block is CUMULATIVE for that agent. When an implementing Fable agent approaches **~700k**, do NOT resume it again — retire it and brief a FRESH Fable agent seeded with: the retiree's final reports (its task output file), its commit list, the package specs, and the §4 standing rules. Track each agent's running total on every notification. (Loads after P0 round 2: store ~430k — rotation candidate after its P1 rider round; options ~305k; boundary ~256k; tokens ~242k; fonts ~91k. P1 implementation packages went to FRESH agents for this reason.)

## 5. Current state snapshot

**Merged to demo `master`** (at `2bc4867` = PR #29 merge commit):
- Planning bundle (`bd5d178`), `demo-phase-review` workflow (`c0cedbb` + args fix `a9a5565`), review-system port (PR #28, `b939f13`), P4.7 landscape directive (`db9de9d`), handoff/runbook + CLAUDE.md pointers (`1f92568`, `108216d`; phone repo pointer `d9606460` on phone main).
- **ALL OF P0** (PR #29): P0.1 error boundary (+ `app/demo/error.tsx` outer net with Start-fresh escape hatch), P0.2 truthful statuses + location-scoped completion, P0.3 canonical form options + custom path, P0.4 sessionStorage persistence v2 with compile-time drift guards, P0.5 glass tokens + @theme mirrors. Review history: initial 1B/3M/14m → round 1 fixed all 18 → fix-delta found R-19 (coherence MAJOR) + 11m → round 2 fixed all 12 → fix-delta r2 **APPROVE** (0B/0M). 120 files / 904 tests green at merge. Full trail: `docs/code-reviews/parity/p0/`; commit→finding tables on PR #29.
- **10 non-gating minors** from `p0-r2-review-fixdelta.md` carry as RIDER packages into P1 (owners: P0.1 ×3, P0.2 ×3, P0.3 ×1, P0.4 ×3, one shared with P0.5).

**P1 wave A — MERGED into `feat/parity-p1` (@ `1a85f16`, 128 files / 991 tests green):** fonts (P1.1), all three riders (all 10 carried minors closed; R-34 landed twice from parallel riders — two additive test guards in different suites, disclosed for the P1 review), P1.3 log bus (real pipeline emission, FallbackMode honesty in the log, stale-run isolation in the bus), P1.2 picker+paste (phone-verbatim copy with cited D5 honesty adaptations; clipboard feeds the pasted-text AI path), P1.6 PDF saves (real `window.print()` with pinned `sandbox="allow-modals allow-same-origin"`; html2pdf spike NOT shipped — evidence in deferred §34: 0 extractable text chars, 8.8x size; deferred §21 struck RESOLVED). Merge-integration fixes made by the orchestrator (in merge commits): DemoExperience import-block + picker/logbus combination (picker's `documentText` param + logbus's `emitter`; cancel path carries BOTH `importLogBus.reset()` AND the phone-parity `setImp(blankImport)`); logbus test queries updated to the new picker copy; deferred §33/§34 renumbering.
**IN FLIGHT: P1.4 live terminal** (fresh Fable, `parity/p1-terminal` off 1a85f16) — bus API + full §5.7 spec + truthful-trust-line requirement in its brief. **P1.5 (flow modes + dwell + result-error enrichment) launches after P1.4.**

**Verification lane: COMPLETE (v2 agent).** 57 baselines on disk (`<scratchpad>/baselines/`: phone/import ×10 incl. terminal mid-run + dwell — the on-device Apple model genuinely extracted pasted text in the sim; demo/import ×11 from the parity-p1 worktree on :3001; demo sweep ×36). Harness scripts + the 241-line README are preserved IN-REPO at `docs/planning/demo-phone-parity/verification/` (scratchpad copies are session-ephemeral; the PNG baselines stay in scratchpad pending the owner's call on committing images). Non-negotiables for future driving agents (full detail in the README): NO COMPUTER USE while the owner is away; Maestro needs `JAVA_HOME=/opt/homebrew/opt/openjdk`; `maestro hierarchy` is useless on this RN app — use the Vision-OCR helper (`ocr` + `look.sh`) for text+coordinates screen reads; `simctl privacy grant` for permissions; Maestro `inputText` avoids the iOS paste dialog; **demo keyless sample mode substitutes fixed content (Kim's Convenience) — side-by-side parity compares UI SHAPE ONLY, never field values.**

## 6. Git topology

- Demo repo: `/Users/fvadev/Developer/extraction-notes/demo-website-dvr-extraction-notes` (github Recon222/demo-website-dvr-extraction-notes; main checkout stays on `master`).
- Phone repo (READ-ONLY): `/Users/fvadev/Developer/extraction-notes/DVR-Extraction-Notes-ReactNative`.
- Worktree base: `/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/7423d8f5-e7f4-4135-a726-296308b62d4d/scratchpad/worktrees/` — P0-era worktrees all removed after the PR #29 merge. Current set (P1): `parity-p1` (phase assembly, `feat/parity-p1`), `p1-picker`, `p1-logbus`, `p1-pdfsave`, `rider-store`, `rider-boundary`, `rider-options`.
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
| P1.2 picker (P1 wave) — Fable | `ad03e47807a849f5d.output` |
| P1.3 log bus (P1 wave) — Fable | `a88740b63052d01a2.output` |
| P1.4+P1.5 terminal/dwell (P1 wave) — Fable | `a957bc487fa6d2f6d.output` |
| P1.6 PDF saves **v2** (v1 `a33af4ad84c351a28` transcript lost pre-limit; v2 inherits ownership via brief) — Fable | `a5fc0dd9016aabb04.output` |
| Verification harness / app driving — Opus **v2** (v1 `adf24869c18c6bef3` hung 4h blocked on a computer-use access dialog, killed; v2 inherits its scripts + booted sim with a hard NO-COMPUTER-USE rule + interim-report duty) | `ac12740426479a4bb.output` |
| Recon (done): doc-locator / demo-inventory / phone-inventory / parity-matrix — Opus | `ac59c0bc448ce5aed.output` / `a46f0f3ccdc81d89c.output` / `a0257d509da576d42.output` / `a9a9f02d2f5bea836.output` |

Review workflow runs are NOT resumable as agents — each phase runs fresh via the Workflow tool with `scriptPath: <demo>/.claude/workflows/demo-phase-review.js` (see plan §6 for arg shapes; fix-delta needs `mode` + `priorReviewDoc`).

**RETIRED agents + successor briefs (rotation policy).** Two agents retired at high context; their territory briefs for successors:
- **Store/persistence territory** (store agent retired ~512k): (1) The selection pair has ONE law with two enforcement layers — "the open location owns the case" (`loc.caseId`, never a separately-tracked `currentCaseId`) is enforced in every store writer AND `loadSnapshot`'s repair block; the bridge's `onComplete` re-derivation is deliberate defense-in-depth, not dead weight — "simplifying" it re-introduces R-19. The `completeLocation(locationId)` reshape is pre-approved in deferred §29's addendum — do it as a RENAME, never an in-place param swap. (2) The snapshot guard is three compile-time devices that move together: `as const` union tuples in `engine/types` via `z.enum(TUPLE)`; `satisfies FullShape/FullShapeIn<T>` + `z.ZodType` on every shape literal; any `PersistedState` change bumps `SNAPSHOT_VERSION` + key suffix together. (3) jsdom shares one window per test file — non-injected `DemoExperience` mounts need `sessionStorage.clear()` hygiene or tests couple through the snapshot.
- **Import/terminal territory** (terminal agent retired ~547k): three layers with strict scope rules — engine/pure (`import-log.ts` bus: retain-and-replay/400-cap/epoch-token — P1.3's file; `import-flow-mode.ts` owns `ImportUiStage` + the dwell: non-null result ≠ results showing until `acknowledged`); IO/bridge (`run-import.ts` owns `ImportStageId`/`ImportRealStageId`/`ImportErrorCode` incl. bridge-only `UNEXPECTED_ERROR` + `SAMPLE_FALLBACK_PREFIX`; in `DemoExperience` the `importGen` token guards EVERY async checkpoint incl. `importStageFor`, `lastRealStage` has a state+ref mirror because React batches `onStage`, `guardImportRun` stays tally-aware, `finishImport` pins `stage:'progress'`); presentational (`ImportTerminalProgress` — THE trap is trust scoping: `deriveTrust` is segment-scoped for live surfaces, `runHadSampleFallback` is run-scoped for CTA attribution; they deliberately disagree on mixed batches and R-35 is what happens if anyone unifies them; tail-pin state changes only on user gestures via `pinnedRef`; never let "on-device"/"nothing leaves this phone" copy in; the dwell CTA `onReviewImport` (required) is the only progress→result path).

## 8. Next-step queue (P1 in flight)

1. **When P1.3 (log bus) lands:** launch P1.4 live terminal (fresh Fable; the owner-flagged centerpiece — spec phone-inventory §5.7.1–§5.7.3, exact copy/colors/sizes; terminal dark in both themes; morphing badge slot; pin-aware auto-follow), then P1.5 flow modes + dwell after P1.4. Same worktree pattern off `feat/parity-p1`.
2. **Assemble `feat/parity-p1`** as branches land (fonts already in; riders + picker + logbus + pdfsave in arrival order; terminal + flow-modes last), full gates each merge, then PR → `demo-phase-review` initial → fix rounds by authors → fix-delta(s) → merge with bubble. Post commit→finding tables per round.
3. **Then P2 ∥ P3 waves** per plan §5 (note the shared geolocation capability: build once — first lane to need it — consume twice; blocking-dialog primitive wanted by P3.1/P4.5/P5.3).
4. **Phone-repo follow-up ledger** (plan §8 + accumulating): cameras.tsx:36-61 index-keyed custom-flag desync (same bug fixed in demo R-2); MediaLibrarySheet missing onDismiss (B6); the 3 import-date bugs (B1); `completeCase(locationId)` reshape follow-up (deferred §29 addendum). File as BUG-NNNs when the owner returns.
5. **Verification lane:** get the harness agent's report (pinged); then schedule side-by-side parity checks as a standing phase-boundary step, starting with the P1 import terminal vs the phone's.

## 9. Update protocol (for the orchestrator)

At EVERY milestone (phase assembled / review verdict / fix round merged / PR merged / wave launched / notable incident): update §5 "Current state snapshot" + the "Last updated" line, and add any new standing rule to §4. Commit this file with the milestone's docs commit (or its own `docs(handoff):` commit). Also keep the auto-memory (`~/.claude/projects/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/memory/`) pointer file current — it and both repos' CLAUDE.md pointer sections are how a fresh instance finds this file.
