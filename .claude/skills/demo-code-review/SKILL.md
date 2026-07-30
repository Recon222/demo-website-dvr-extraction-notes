---
name: demo-code-review
description: Multi-agent review of a code PR in this Next.js demo/marketing repo (typescript + web + tests + silent-failure + type-design, strict decision). Two modes — initial (fresh agents, parallel fan-out) and fix-delta (resume the SAME reviewers via stored agent IDs). Use when a PR contains implementation code, and at every demo↔phone parity phase boundary.
argument-hint: "[pr-number | pr-url | blank for current branch PR] [--fix-delta]"
---

# /demo-code-review

Comprehensive multi-agent review of a code PR for this Next.js 15 (App Router) + React 19 + TypeScript strict repo — the DVR Extraction Notes marketing site plus the interactive `/demo`. Ported from the phone repo's `/react-native-code-review` and retuned for this codebase's architecture, test stack, and failure surfaces.

**Input**: $ARGUMENTS

---

## When to Use

Run this when a PR contains implementation changes (TS/TSX, route handlers, CSS, config) and you want a structured, multi-perspective review with an explicit decision (BLOCK / REVISE / APPROVE). It catches type lies, undeclared fallbacks, bundle-boundary breaches, false-coverage traps, and convention drift while they're still cheap.

**This is the gate for the demo↔phone parity effort.** Per `docs/planning/demo-phone-parity/01-master-parity-plan.md` §6, every phase boundary runs this review on the phase PR: findings are verified, fixed by the original authoring agents (resumed with their context), fix-delta re-reviewed, then merged with a merge commit and the review artifacts committed.

Do **not** use it on a PR that is only planning docs or only `.claude/` changes.

---

## Mode Selection

| Input | Mode |
|---|---|
| Number (e.g. `31`) | **Initial — PR mode**: `gh pr view <n>`, fresh agents, parallel fan-out |
| URL (`github.com/.../pull/31`) | **Initial — PR mode**: extract the number |
| Blank | **Initial — current-branch PR mode**: `gh pr list --head $(git branch --show-current)` |
| Any of the above + `--fix-delta` | **Fix-delta mode**: read `docs/code-reviews/pr-<n>-review.md`, extract stored agent IDs, resume each via `SendMessage`, scope each to their own findings |

**Fix-delta requires the original review doc to exist.** If `docs/code-reviews/pr-<n>-review.md` is missing or has no `## Agent IDs` section, abort with an instruction to run the initial review first (or fall back to fresh dispatch with an explicit warning that context is being re-derived).

---

## Phase 1 — FETCH

```bash
gh pr view <NUMBER> --json number,title,body,author,baseRefName,headRefName,changedFiles,additions,deletions,files
gh pr diff <NUMBER> --name-only
```

If the PR is not found, stop with an error.

### Sanity gate

- PR contains **only** `docs/**/*.md` with no implementation siblings → abort: "This PR has no code changes."
- PR contains **only** `.claude/**` → abort: agent/skill definitions don't need this pipeline.
- A mix of code and docs is fine — the agents scope themselves to the implementation surface.

---

## Phase 2 — TRIAGE

Classify every changed file into a lane, then decide which agents to dispatch.

| File pattern | Lane(s) | Agent(s) |
|---|---|---|
| `features/demo/**/*.ts(x)` (non-test) | TypeScript + Web (BOTH, concurrently) | `typescript-reviewer` + `web-reviewer` |
| `app/**/*.tsx`, `components/**/*.tsx`, `lib/**/*.ts` (non-test) | TypeScript + Web | `typescript-reviewer` + `web-reviewer` |
| `app/api/**/route.ts`, `app/api/**/guards.ts` | TypeScript (server correctness, guards, secrets) | `typescript-reviewer` + `silent-failure-hunter` |
| `**/__tests__/**`, `*.test.ts(x)`, `*.spec.ts(x)`, `vitest.setup.ts`, `vitest.config.mts` | Tests | `test-analyzer` |
| `app/css/**/*.css`, `features/demo/ui/demo.css`, `postcss.config.js` | Styling / tokens | `web-reviewer` only |
| `package.json`, `next.config.js`, `tsconfig.json`, `.env.example` | Config / bundle | `web-reviewer` + `typescript-reviewer` |
| `docs/**`, `*.md` | Docs (skipped) | orchestrator checks only for code↔doc drift |
| `.claude/**` | Agent definitions (skipped) | — |

**Key nuance:** `typescript-reviewer` and `web-reviewer` **both** cover TS/TSX. Their lanes are conceptual, not extension-based:

- `typescript-reviewer` — type safety, async correctness, error handling, RSC/`'use client'` boundaries, and architecture compliance (store bridge, engine purity, single barrel, registry-derived ordering, determinism seam, marketing↔demo isolation).
- `web-reviewer` — render + bundle performance, browser-API correctness, resource cleanup, accessibility, CSS/inline-style discipline (including which half's convention applies), and the chrome-scope / bundle wall from the platform side.

Dispatch both whenever implementation TS/TSX changes.

**Always dispatched** (regardless of file types):
- `silent-failure-hunter` — swallowed errors *and* undeclared fallbacks, anywhere
- `type-design-analyzer` — type design

**Conditionally dispatched:**
- `typescript-reviewer` — at least one non-test implementation `.ts`/`.tsx`/`.js` file changed
- `web-reviewer` — implementation code, CSS, or bundle-relevant config changed
- `test-analyzer` — any test file changed, OR non-trivial implementation landed without tests

Record the lane decision and report it in the artifact under "Reviewer lanes."

---

## Phase 3 — PRE-FLIGHT

Run the gates that make sense for what changed. Surface pass/fail as **context** for the reviewers — don't abort the review on infra failures unless the suite genuinely can't run.

```bash
# A fresh worktree has no node_modules.
pnpm install --frozen-lockfile

# Typecheck; then filter to the changed surface.
pnpm exec tsc --noEmit 2>&1 | tee /tmp/tsc.txt | grep -E "<changed-files>" | head -30
echo "Total TS errors: $(grep -c 'error TS' /tmp/tsc.txt)"

# Tests. Vitest takes positional path filters (there is no --testPathPattern).
pnpm test --silent <changed-path>     # targeted
pnpm test --silent                    # full suite when changes span areas

# Only when dependencies or import shapes changed:
pnpm build 2>&1 | tail -40            # route table + First Load JS per route
```

**There is no flaky-test baseline in this repo.** Unlike the phone repo (BUG-003), this suite is expected to be deterministic and fully green. **Any failure is real signal** — attribute it to the PR or to pre-existing repo state, but never wave it off as noise. If the pre-flight is red before the diff, say so explicitly so `test-analyzer` can scope correctly.

If `node_modules` can't be installed, report each gate as **unverified** rather than guessing, and tell the agents so.

### Pre-flight status payload

Each agent receives:
- `pnpm test`: pass/fail counts, and whether any failure is in-scope vs pre-existing
- `pnpm exec tsc --noEmit`: errors **on the changed surface only**, plus the project total for context
- `pnpm build`: route table / First Load JS deltas — or "not run (no dependency or import-shape change)"
- `git diff --stat`: changed file count, lines added/deleted

---

## Phase 4 — DISPATCH (initial mode)

**Send all dispatched agents in a single message with multiple `Agent` tool calls** so they run concurrently. Each agent gets:

1. The changed files in their lane
2. Pointers to the project rules: root `CLAUDE.md`, `features/demo/CLAUDE.md` (binding for anything under `features/demo/`), and `docs/code-reviews/deferred.md` (the tracked-deferrals ledger — reviewers must not re-file what's already logged)
3. The pre-flight status payload
4. PR metadata (number, title, and the parity phase/package if applicable)
5. **Scope boundary briefing** — which surfaces are intentionally absent because they belong to a later parity phase. This is the single highest-value briefing item in this repo: the demo is mid-parity, and without it reviewers will flag missing camera capture, persistence, geolocation, Settings panes, and Export surfaces that are scheduled work, not gaps. Cite the phase from `docs/planning/demo-phone-parity/01-master-parity-plan.md` §5.
6. **For lane specialists**: an explicit out-of-scope tag naming the other lanes

### Capturing agent IDs for fix-delta

The `Agent` tool returns an `agentId` in its result. **Capture every agent's ID** and write them into the artifact under `## Agent IDs` so fix-delta can resume them. If the harness doesn't expose an ID, omit that row — fix-delta falls back to fresh dispatch for that lane.

### Lane briefing template

Each agent carries its full persona from `.claude/agents/<name>.md`. Keep the dispatch prompt terse:

```
Code review for PR #<N> — <title>.

<Parity phase/package context, if applicable: which matrix rows this package covers.>
<One-line scope note: what is intentionally NOT in this PR because it belongs to a later phase.>

## Files in your lane
<list>

## Out of your lane (other agents handle)
<short list>

## Pre-flight status
<the Phase 3 payload. Note: this repo has NO flaky baseline — any test failure is real.>

## Project conventions to load
Root CLAUDE.md; features/demo/CLAUDE.md (binding for features/demo/**);
docs/code-reviews/deferred.md (already-tracked deferrals — do not re-file);
docs/planning/demo-phone-parity/01-master-parity-plan.md §5 (phase scope).

Begin. Follow your persona's discipline (Pre-Report Gate, HIGH/CRITICAL proof,
zero-findings-is-valid).
```

**Do not run agents sequentially.** One message, N `Agent` blocks.

---

## Phase 4-alt — DISPATCH (fix-delta mode)

Skip Phase 4's fresh dispatch entirely. Instead:

1. Read `docs/code-reviews/pr-<n>-review.md`.
2. Extract the agent IDs from `## Agent IDs`.
3. Map each fix commit to the finding(s) it closes.
4. Identify findings that were **deferred** rather than fixed, and locate their entry in `docs/code-reviews/deferred.md`.
5. Re-run the Phase 3 pre-flight against the fixed head.
6. **`SendMessage` every agent in parallel** (single message, multiple blocks):

```
Fix-delta review for PR #<N>.

The implementer landed <N> commits since your initial <VERDICT>. You raised <N>
findings (<breakdown>). <M> have direct fixes; <K> were deferred to the ledger.

## Pre-flight status (re-verified by the orchestrator)
<pnpm test / tsc / build counts>

## Your original findings → fix commits
| Finding | Severity | Fix commit | Type |
|---|---|---|---|
<table mapping THIS AGENT'S findings to a commit SHA, or to "DEFERRED">

## Out of your lane (other agents handle)
<short list of commits owned by other lanes>

## What to verify
<per-finding checklist: closed / regressed / deferral-justified / new>

## Deferral assessment (if applicable)
Read docs/code-reviews/deferred.md entry §<N>. This repo's ledger bar is explicit:
each entry needs a real reason to wait AND a concrete un-defer trigger, and the
existing entries are written as Source / What / Why deferred / Trigger. Assess
against that bar. A vague deferral or a missing trigger → MEDIUM finding. A
specific rationale with a concrete trigger → justified.

## Discipline (unchanged)
Pre-Report Gate. HIGH/CRITICAL require proof. Zero findings is valid.

## Output format
Same as the initial review. Title it "## <Lane> Reviewer Summary (Fix Delta)".
Per-finding status (closed / regressed / deferral-justified / new). Summary table
+ verdict at the end.

Begin.
```

One commit may close findings in several lanes — each agent gets the same SHA in their brief and judges it from their own lens. That's expected.

---

## Phase 5 — AGGREGATE

1. **Dedupe** — when two agents identify the same root cause from different angles (the type reviewer sees the union gap; the silent-failure hunter sees the undeclared fallback it permits), merge into one finding and credit both lanes. Cross-lane independent identification is a strong signal — note it in Pipeline notes.
2. **Verify before accepting.** Every finding is a claim about this codebase until you check it. Read the cited file:line yourself. Refute wrong findings **with evidence** and record the refutation in the artifact — a reviewer confidently describing behavior the code doesn't have is the failure mode this step exists for. Pay particular attention to findings that would be true of the *phone* repo but not this one (SQLite, save mutex, UUID brand, native modules, Jest-isms, StyleSheet.create) — those are porting artifacts.
3. **Surface conflicts** — opposing positions on the same code go in a top-of-report "Disputed" section. Conflicts outrank agreed findings.
4. **Rank by severity**, then file path, then line.
5. **Tally** per severity per agent.

---

## Phase 6 — DECIDE (strict mode)

| Condition | Decision |
|---|---|
| Any CRITICAL | **BLOCK** — must revise before merge |
| Any HIGH (no CRITICAL) | **REVISE** — address before merge |
| Only MEDIUM / LOW | **APPROVE** with comments |
| Zero findings from all agents | **APPROVE** (a clean review is valid) |

The strictness is deliberate: a HIGH under "REVISE" is the cheap version of a production bug.

**Special cases:**
- Draft PR → still issue the decision; soften the framing.
- Agent conflict → escalate to at least REVISE regardless of individual severities.
- Fix-delta with one new finding in one lane → REVISE on that lane; the other lanes' APPROVE stands.
- A finding you refuted with evidence does **not** count toward the decision — but record both the finding and the refutation.

---

## Phase 7 — REPORT

Review artifacts live in `docs/code-reviews/` and are **committed before merge**.

**Naming:** `docs/code-reviews/pr-<NUMBER>-review.md` and `docs/code-reviews/pr-<NUMBER>-fixes-review.md`. (`pr-8-foundation-review.md` predates this convention; when resolving an existing review for fix-delta, glob `docs/code-reviews/pr-<N>-*review.md` before failing.)

### Initial mode

```markdown
# PR <N> — Aggregate Code Review

**PR:** [#<N>](<URL>) — <title>
**Branch:** <head> → <base>
**Parity phase / package:** <e.g. P0.4 persistence — matrix rows …, or "n/a">
**Reviewers (fresh fan-out):** <dispatched agents>
**Date:** <YYYY-MM-DD>

## Verdict
**<BLOCK | REVISE | APPROVE>.**

<2-3 sentences. Lead with the decision rationale.>

## Pre-flight gates
<table: gate / command / result>
<note if any gate was unverified, and why>

## Reviewer verdicts at a glance
<table: agent / C / H / M / L / verdict>

## Disputed
<opposing positions, or "None.">

## Findings (deduped, verified, ranked by severity)

### CRITICAL
<list, or "None.">

### HIGH
<list, or "None.">

### MEDIUM
<list, or "None.">

### LOW
<list, or "None.">

## Refuted findings
<findings the orchestrator checked and rejected, each with the evidence. "None." if clean.>

## Architecture invariants checked & confirmed
<positive confirmations — store bridge intact, engine pure, barrel surface unchanged,
marketing↔demo wall held, registry ordering derived, fallbacks announced, coverage gate met.>

## Recommended next steps
<contextual, based on the decision>

## Agent IDs
<!-- Used by /demo-code-review --fix-delta to resume reviewers via SendMessage. -->
- typescript-reviewer: <agentId or "not dispatched">
- web-reviewer: <agentId or "not dispatched">
- test-analyzer: <agentId or "not dispatched">
- silent-failure-hunter: <agentId or "not dispatched">
- type-design-analyzer: <agentId or "not dispatched">

## Reviewer pipeline notes (optional)
<cross-lane dedupes, coverage gaps, porting artifacts caught in verification.>
```

### Fix-delta mode

Write to `docs/code-reviews/pr-<NUMBER>-fixes-review.md` — a **separate** file that does not overwrite the initial review, and is self-contained so the implementing instance needn't reread the original.

```markdown
# PR <N> — Fix Delta Review

**PR:** [#<N>](<URL>) — <title>
**Scope:** Fix delta only — re-review of the <N> commits landed in response to `pr-<N>-review.md`.
**Reviewers (resumed via SendMessage, full transcript context):** <list>
**Date:** <YYYY-MM-DD>

> **For the implementing instance:** this document is self-contained.

## Verdict
**<BLOCK | REVISE | APPROVE>.**

## Pre-flight gates (re-verified after fixes)
<table>

## Fix commit → original finding mapping
<table: commit SHA / original finding / type of fix / verdict>

## Reviewer verdicts at a glance (fix delta)
<table>

## Closed findings — verification detail
<per-finding detail of what was verified>

## Deferral justifications — verification detail
<per-deferral assessment against the ledger bar: reason to wait AND a concrete un-defer trigger>

## New findings introduced by the fixes (if any)
<rare but possible — don't paper over a regression>

## Architecture invariants — re-verified clean
<bullet list>

## Recommended next steps
<"ready for merge", or the specific remaining commit>

## Reviewer pipeline notes
<observations — resume-vs-fresh performance, deferral rubric application, cross-lane re-verification>
```

### Deferral ledger

Any finding deliberately not fixed **must** be logged in `docs/code-reviews/deferred.md` before merge, in the established house format — a numbered `## N. <title>` section with **Source**, **What**, **Why deferred**, and **Trigger**. The ledger's own preamble sets the bar: *"Each entry needs a real reason to wait and a concrete un-defer trigger — this is not a general TODO dump."* Resolved entries are struck through and marked `✅ RESOLVED — PR #<N>` rather than deleted. Number the new entry after the current last one.

### Commit → finding mapping table on the PR

After every fix round, post a comment on the PR mapping each fix commit to the finding it closes:

```bash
gh pr comment <N> --body-file <path>
```

| Commit | Finding | Lane | Type |
|---|---|---|---|
| `<sha>` | H-1 <title> | silent-failure | fix + test |
| `<sha>` | M-2 <title> | type-design | deferred → `deferred.md` §<n> |

One commit per finding when clean; group only when genuinely entangled. Red and green land together — the failing test and the code that passes it in the same commit.

---

## Phase 8 — OUTPUT

Report to the terminal as well as the artifact. Keep it tight.

### Initial mode
```
PR #<N>: <TITLE>
Decision: <BLOCK | REVISE | APPROVE>

Findings: <C> critical · <H> high · <M> medium · <L> low
Lanes dispatched: <list>
Disputed: <count>   Refuted: <count>

Artifact: docs/code-reviews/pr-<N>-review.md

Top <3> things to address:
  1. <highest-impact finding — file:line + 1-line fix>
  2. <next>
  3. <next>
```

### Fix-delta mode
```
PR #<N>: <TITLE> — Fix Delta
Decision: <BLOCK | REVISE | APPROVE>

Closed: <count> / <original-count>
Deferral-justified: <count>   New findings: <count>

Artifact: docs/code-reviews/pr-<N>-fixes-review.md

<one line — "ready for merge" or the remaining work>
```

---

## Merge

Per the owner's convention (mirrored from the phone repo): **merge commits only.**

```bash
gh pr merge <N> --merge --delete-branch
git checkout master && git pull && git fetch --prune
```

Never squash, never rebase. Review artifacts and ledger updates are committed **before** the merge.

---

## Edge Cases

- **No `gh` CLI** — fall back to reviewing the local branch diff against `master`; note the degradation in the artifact.
- **PR is only planning docs / only `.claude/`** — stop; no review needed here.
- **`docs/code-reviews/` missing** — it exists; if it ever doesn't, create it.
- **An agent errors** — continue with the rest; mark that lane "errored" in the summary table and say what wasn't covered.
- **Fix-delta with no stored agent IDs** — fall back to fresh dispatch and warn that context is re-derived (slower, and the verdict may differ).
- **Fix-delta finds a new HIGH introduced by the fixes** — verdict returns to REVISE. The original review was right; the fixes regressed. Don't paper over it.
- **A finding that's true of the phone repo but not this one** — refute with evidence and log it in Pipeline notes. Recurring porting artifacts should be fed back into the agent persona's "Common False Positives" section.
- **PR touches `features/demo/CLAUDE.md` or the root `CLAUDE.md`** — architectural rules changed by a doc edit; the orchestrator reviews that personally, since the agents read those files as ground truth.
- **PR touches `vitest.setup.ts`** — a setup shim change alters the tested contract for *every* suite (e.g. defining `navigator.mediaDevices` would silently move camera surfaces off the sample-fallback path). Always dispatch `test-analyzer` and brief it explicitly.
- **PR adds a dependency** — `web-reviewer` must run `pnpm build` and report the First Load JS delta, and check that nothing new crosses the marketing↔demo wall.
- **Parity phase PR** — brief every agent with the phase's package scope and the surfaces deliberately deferred to later phases.

---

## Confidence Rule (inherited from the persona files)

Every agent dispatched by this skill runs with:
- Confidence ≥ 80% before reporting
- Pre-Report Gate: cite exact file:line, name a concrete failure mode, prove HIGH/CRITICAL with a snippet + scenario
- Zero findings is a valid clean review

If the agents return noise, tighten the persona file — don't relax the gate.

---

## Pipeline notes (repo-specific)

- **Fresh agents for initial reviews; resume for fix-delta.** Resume preserves context exactly and is faster than re-deriving.
- **TS-reviewer and web-reviewer overlap on TS/TSX intentionally.** They dedupe at aggregation; double coverage is a feature.
- **Verification is not optional.** These agents were ported from a React Native repo; the highest-frequency false positive class is a phone-shaped finding (SQLite, mutex, UUID brand, `StyleSheet.create`, Jest flags) asserted against this codebase. Check the code before accepting.
- **`features/demo/CLAUDE.md` inverts root conventions on purpose.** Inline styles are correct inside `features/demo/ui/**`; a reviewer flagging them hasn't read it.
- **The silent-failure lane is the highest-yield one here**, because its charter includes undeclared fallbacks — the demo's whole value proposition is telling the truth about what the browser can and can't do. Don't skip it, even on a small PR.
- **The test lane catches the coverage-boundary game** no other lane sees: logic placed in `features/demo/ui/**` (ungated) that belongs in `features/demo/engine/**` (80% gated).
- **Skip lanes when the diff genuinely doesn't touch them.** Skipping is correct, not under-coverage — record it.
