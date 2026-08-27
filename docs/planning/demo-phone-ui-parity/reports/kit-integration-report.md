# Dreamteam kit integration — report

**Author:** kit-integration agent (Opus 5) · **Date:** 2026-08-26 · **Branch:** `master`
**Base:** `5cf88fe` · **Scope:** docs + config only. No app code touched, nothing pushed.

---

## T1 — Track the kit as-is · `a8b54d3`

Committed verbatim, no edits: `.claude/agents/dt-{partner,partner-opus,review-aggregator,integrator}.md`,
`.claude/skills/fleet-orchestration/{SKILL.md,hazard-playbook.md,reviewer-contract.md}`,
`.claude/skills/mutation-testing/SKILL.md`.
`.agents/`, `.codex/` and `AGENTS.md` left untracked (owner's Codex mirrors).

## T2 — Make the kit reference THIS repo

### `mutation-testing/SKILL.md` · `d547dfa`, sharpened in `a51af6c`

Everything from `# Project hazards — THIS REPO` to EOF (the four Rust junctions, mirror-homed pins,
junction-first teardown) deleted. Replaced with **Project hazards — THIS REPO (Next.js demo, Vitest +
jsdom)**, every item verified against source:

| Hazard | Evidence |
|---|---|
| Probe worktrees: `git worktree add … && pnpm install --prefer-offline` (**measured 9.6 s**); teardown **must** use `tools/worktree-remove.ps1` — see the correction below; scratch base = session scratchpad or `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\` | measured end-to-end on a probe worktree I cut and tore down |
| jsdom shares one window per test file — non-injected `DemoExperience` mounts couple through `sessionStorage` | v1 rule `docs/planning/demo-phone-parity/HANDOFF.md:128` (store territory item 3); hygiene shown at `features/demo/ui/__tests__/DemoExperience.persistence.test.tsx:15-16` (`beforeEach` **and** `afterEach`) |
| Style pins are the weakest pins here | `vitest.config.mts:31` (`css: false`) + the measured jsdom behaviour below + `features/demo/CLAUDE.md:105` (inline styles, not Tailwind) |
| `navigator.mediaDevices` deliberately undefined; sample-fallback is the contract | `vitest.setup.ts:74-75` |
| A skipped `skipIf` test is not a killed mutant | `features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:10`; `.design-sync/check-rn-parity.mjs:28,31` |
| State the motion mode a probe ran under | `lib/hooks/use-reduced-motion.ts`; `vitest.setup.ts:47-60` stubs `matchMedia` to `matches:false`, so **the default test mode is motion-ON**; v1's mirror-image loss at `demo-phone-parity/HANDOFF.md:5` |
| **`pnpm test` is RED on master today** — 265 files / 3,480 passed / 1 failed (3,481). A probe seeing that one failure is seeing BASELINE, not a kill | ran the suite: the RN drift guard throws at `.design-sync/check-rn-parity.mjs:75`, `Button PRIMARY_GRADIENT.dark not found` |
| Re-run unexplained failures solo | `vitest.setup.ts:24` (asyncUtilTimeout 5000) + `vitest.config.mts:28` (testTimeout 20000), both carrying measured-contention comments |
| Commands: scoped `pnpm exec vitest run <path>`; full gate `pnpm test --silent` + `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` + `pnpm build` | — |

### Correction 1 — `git worktree remove` DOES NOT WORK HERE (`fb3b437`)

My first draft of this section said "no junctions in this repo and there never should be" and
"teardown is a plain `git worktree remove`". **Both were wrong.** The coordinator caught it; I then
measured it end to end on a probe worktree I cut myself:

```
$ git worktree add "<...>/worktrees/probe-kit-teardown" -b probe/kit-teardown HEAD
$ pnpm install --prefer-offline                     -> Done in 9.6s
$ (Get-ChildItem -Recurse -Force -Directory -Attributes ReparsePoint).Count
549
$ git worktree remove "<...>/worktrees/probe-kit-teardown"
error: failed to delete '<...>/probe-kit-teardown': Directory not empty
EXIT=255
$ git worktree list          # <- and it is ALREADY GONE from the list
```

pnpm does not install a flat tree; it lays a symlink farm of ~535–549 **directory junctions** inside
`node_modules`, with targets in-tree under `node_modules/.pnpm/`. `git worktree remove` deregisters
the worktree and *then* fails to delete it, leaving a full tree on disk that git no longer tracks —
worse than either outcome alone. And `rm -rf` is worse still: a recursive delete follows junctions.

**`tools/worktree-remove.ps1 <worktree-path>` (new)** implements the only order that works: enumerate
reparse points (`Get-ChildItem -Recurse -Attributes ReparsePoint`), unlink each deepest-first with
`[System.IO.Directory]::Delete` (removes the LINK, never the target), looping until a pass finds none;
`Remove-Item -Recurse`; `git worktree prune`. It prints the MAIN checkout's `node_modules/.pnpm` entry
count before and after and **exits 1 if it moved**. It also refuses to run against the main checkout.

Verified run, on the worktree above:

```
main checkout : D:/Work Coding Projects/.../demo-website-dvr-extraction-notes
node_modules/.pnpm entries BEFORE: 240
removing worktree: D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\probe-kit-teardown
unlinked 535 junction(s) in 2 pass(es)
node_modules/.pnpm entries AFTER : 240
OK -- worktree removed, main checkout's .pnpm store intact (240 entries).
EXIT=0
```

`git worktree list` clean afterwards, `worktrees/` directory clean, `probe/kit-teardown` branch
deleted. The script is **ASCII-only on purpose** — Windows PowerShell 5.1 reads a BOM-less UTF-8 file
as ANSI, and an em dash inside a string is a parser error (hit while testing; first run died at
`worktree-remove.ps1:98`).

### Correction 2 — the suite is RED on master (`fb3b437`)

Verified by running it, not taken on report:

```
 Test Files  1 failed | 265 passed (266)
      Tests  1 failed | 3480 passed (3481)
 FAIL features/demo/ui/inputs/__tests__/rn-token-parity.test.ts
 Error: Button PRIMARY_GRADIENT.dark not found
 ❯ checkParity .design-sync/check-rn-parity.mjs:75:24
```

Phone P9 renamed `PRIMARY_GRADIENT` → `PrimaryButtonGradient`; U0 owns the repair. Recorded in the
hazards section (*"a probe run that shows that one failure is seeing the BASELINE, not a kill"*) and
as a baseline note on **GATES.md mechanical gate 3**.

One nuance worth keeping: the drift guard currently **resolves and runs** on this box — the failing
test title names the RN root — so today its non-verdict is the import-time throw, not a `skipIf`
skip. Both are non-verdicts and the section now says not to assume which one you are looking at.

**Correction to the brief.** The brief said jsdom *silently DROPS* style values it cannot parse
(`color-mix()`, `oklch()`). **It does not, on this repo's jsdom 29.1.1.** Measured:

```
"rgba(0,0,0,.5)"                      -> "rgba(0, 0, 0, 0.5)"
"color-mix(in srgb, red 50%, blue)"   -> "color-mix(in srgb, red, blue)"     <- the 50% IS dropped
"oklch(0.7 0.1 200)"                  -> "oklch(0.7 0.1 200)"
"#002853"        (background-color)   -> "rgb(0, 40, 83)"
"linear-gradient(180deg,#002853 0%,…)"-> "linear-gradient(180deg, rgb(0, 40, 83) 0%, …)"
```

The real hazard is **normalisation, not dropping**: a string-equality pin compares against jsdom's
rewrite rather than what the component wrote, and one *component* of a value (the `color-mix`
percentage) does vanish. The section documents what was measured. The prescribed remedy is unchanged
and still correct: mutate to a differing literal `rgba()` and confirm the pin reds.

Also (`a51af6c`) the `css: false` bullet was sharpened after reading `features/demo/CLAUDE.md:105` —
the demo styles with `CSSProperties`, so inline pins *do* read. The exposure is `ui/demo.css`,
Tailwind-classed elements, and anything moved to a custom property, which is exactly what a token port
produces.

`reviewer-contract.md` §2's Rust parenthetical now names the new section's contents instead.

### `fleet-orchestration/SKILL.md` + `hazard-playbook.md` · `8a73518`

- **"## Mapping to THIS repo"** added after the companion-file list: a 14-row table mapping
  `STATE.md` → v2 `HANDOFF.md`, `GATES.md` → the new file, `AGENTS-LOG.md` → HANDOFF §6 (append-only),
  the plan set → matrix + master plan, `reviews/` → `docs/code-reviews/ui-parity/u<N>/`, the ledger →
  `deferred.md` (sole writer `dt-review-aggregator`), both `dt-*-orchestrator` seats → **the main
  session**, `dt-init`/`dt-start` → no command, `dt-handoff` → the orchestrator restamps by hand,
  `dt-address-review` → the implementer's commit→finding PR comment, `dt-plan-review`/`dt-code-review`
  → the `/plan-review` and `/demo-code-review` skills + the `demo-phase-review` workflow,
  `dt-git-guard` → the new hook, `planning-doc-house-style` → the v1 plan set, `docs/templates/` →
  none. Plus a live-seat roster line.
- **Internal drift resolved.** SKILL.md §1 item 4 and hazard-playbook "Records" both still ordered
  agents to reserve ledger § ranges; the `dt-review-aggregator` persona (§"You are the sole writer of
  the deferral ledger") retired ranges outright. The aggregator is newer, so both older passages now
  say implementers and lanes **PROPOSE** deferrals in their reports and the aggregator writes the rows.
  The playbook keeps the generalised "exactly one writer per shared file per round" rule.
- **The worktree tax** in §2 was written against ten minutes of install + cold compile. Restated for
  this repo: ~2 s with pnpm's shared store, so the mode call is about **file contention and seam risk**,
  not amortising setup.
- Every other sentence left intact.

### Agent personas · `337dc52`

- `model: opus` on all nine review lanes. **Three were actually sonnet** — `pr-test-analyzer`,
  `plan-quality-checker`, `plan-reality-checker`. The other five demo lanes and
  `plan-architect-reviewer` already carried `model: opus`, contrary to the brief's expectation and to
  HANDOFF §2's note that "most `.claude/agents/*-reviewer.md` definitions carry no model frontmatter".
  They all do now, so the explicit per-spawn override is belt-and-braces rather than load-bearing.
- Every lane persona gained the one-line **Base contract** pointer at the top of its body (after the
  Prompt Defense Baseline block where one exists).
- `opus-implementer{,-high,-max}` gained the hazard-playbook + mutation-testing pointer.
- **No-op:** the instruction to annotate BLOCKER/MAJOR/MINOR scales found nothing. `grep -n
  "BLOCKER\|MAJOR\|MINOR" .claude/agents/*.md` returns zero matches — all nine lanes already speak
  CRITICAL/HIGH/MEDIUM/LOW.

## T3 — Hooks · `fc51dd0`

`dt-session-continuity.sh` (rewritten), `dt-handoff-staleness.sh` (rewritten), `dt-git-guard.sh` (new),
wired in `.claude/settings.json`; `.gitattributes` added pinning `*.sh` to `eol=lf`.

**`.gitattributes` is not optional here.** `core.autocrlf=true` on this box; hooks checked out with
CRLF do not run under Git Bash, and a silently broken hook is worse than no hook.

**Continuity hook.** Campaign signal is the fixed directory `docs/planning/demo-phone-ui-parity/` — no
`<slug>` scan, no one-directory invariant. `startup|resume` prints a banner + the read-first list with
paths and injects HANDOFF.md **whole**; `compact` prints the recovery procedure in this repo's terms
(re-invoke fleet-orchestration §5, OPEN HANDOFF, OPEN GATES, OPEN both plan docs in full at a milestone
boundary, rebuild the roster from §6 by pinging IDs, read `deferred.md` + the newest vetted review,
then `git status`/`log`/`worktree list`) and injects HANDOFF.md **and** GATES.md whole. jq-absent sed
fallback kept; a `PreCompact` payload (which carries `trigger`, not `source`) also takes the compact
branch.

**Staleness hook.** State file `docs/planning/demo-phone-ui-parity/HANDOFF.md`; reads `state-as-of:`;
fires only on `git merge` / `git push` / `gh pr merge`; excludes HANDOFF.md's own commits from the
behind-count; call-to-action is now "update HANDOFF.md §5 + its state-as-of stamp". **HANDOFF.md is
still on the planning branch, so an absent file exits 0 silently** rather than nagging every merge.

**Git guard (new).** Reads `tool_input.command`, exits 2 with a refusal naming the hazard-playbook rule
for: mutating `git stash` (bare / push / pop / apply / drop / clear / save / branch — `list` and `show`
allowed), blanket discards (`checkout -- .`, `checkout .`, `restore .`, `restore --staged .`,
`clean -f|-fd|-fdx`), and indiscriminate staging (`add -A`, `add .`, `commit -a|-am|--all`).
File-specific restores stay allowed by design. `set -u`; jq-absent sed fallback; tolerates a `git -C`
or `-c` prefix and a leading chain operator.
**The refusal is written to BOTH stdout and stderr** — the hooks reference says PreToolUse feeds
*stderr* back on exit 2, while every sibling hook here uses stdout, and a blocked call with an
invisible reason is just an unexplained failure.

### Hook test output (verbatim, trimmed)

```
########## STARTUP (CLAUDE_PROJECT_DIR unset)
DREAMTEAM CONTINUITY: Demo<->Phone UI Parity v2 is in motion.
Branch: master @ 337dc52
...
!! docs/planning/demo-phone-ui-parity/HANDOFF.md is MISSING. The campaign directory exists but has no runbook.
EXIT=0

########## COMPACT (CLAUDE_PROJECT_DIR SET)
DREAMTEAM POST-COMPACTION RECOVERY — Demo<->Phone UI Parity v2. Run this before acting on anything.
Branch: master @ 337dc52
...
--- docs/planning/demo-phone-ui-parity/GATES.md (whole) ---
EXIT=0

### PreCompact payload (no source field)  {"hook_event_name":"PreCompact","trigger":"auto"}
DREAMTEAM POST-COMPACTION RECOVERY — ...   EXIT=0

### HANDOFF whole-injection proof (CLAUDE_PROJECT_DIR -> planning worktree)
Branch: docs/ui-parity-planning @ 28b8e43
25:--- docs/planning/demo-phone-ui-parity/HANDOFF.md (whole) ---
(112 lines out; tail = HANDOFF §8, i.e. all 86 lines injected)   EXIT=0
```

```
### A) master, HANDOFF.md absent -> silent            EXIT=0   (no output)
### B) non-git command (pnpm test)                    EXIT=0   (no output)
### C) planning worktree, stamp = PENDING-MERGE
DREAMTEAM: docs/planning/demo-phone-ui-parity/HANDOFF.md has no state-as-of stamp — staleness cannot be detected.
Add a `state-as-of: <short sha>` line to its header and keep it current.
### D) stamp behind HEAD (scratch repo, git push)
==================================================================
 DREAMTEAM: HANDOFF.md IS STALE
   state-as-of: 7ae8e29   HEAD: a609506   (2 commits behind)
   a609506 fix: another one
   dbb54d3 feat: something after the stamp
   ... Update HANDOFF.md §5 + its state-as-of stamp ...
==================================================================
### E) only HANDOFF.md changed since stamp            EXIT=0   (silent — correctly excluded)
### F) bogus stamp (deadbeef)                         EXIT=0   (re-stamp message)
```

```
GUARD — blocked (rc=2): git stash · git stash push -m x · git stash pop · git stash save wip ·
  git stash branch b · git checkout -- . · git checkout . · git restore . · git restore --staged . ·
  git clean -f · git clean -fd · git clean -fdx · git add -A · git add . · git commit -a -m x ·
  git commit -am x · git commit --all · cd foo && git stash · git -C /repo stash drop
GUARD — allowed (rc=0): git stash list · git stash show · git status · git add path/one path/two ·
  git commit -m x · git commit --amend --no-edit · git checkout -- features/demo/foo.ts ·
  git restore features/demo/foo.ts · git clean -n · git merge master · pnpm test ·
  git worktree remove /tmp/x · git log --oneline · (empty stdin) · ({"foo":1})
```

`git commit -am x` escaped the first draft (`-[a-zA-Z]*a` anchors 'a' at the end of the cluster);
fixed to `-[a-zA-Z]*a[a-zA-Z]*` and retested. `git commit --amend` correctly still passes.

### settings.json

`enabledPlugins` unchanged apart from committing the already-uncommitted `playground@…` entry.
Hooks: `SessionStart` (matcher `startup|resume|compact`), `PreCompact` (matcher `manual|auto`),
`PreToolUse`→`Bash`, `PostToolUse`→`Bash`. All commands use `bash "$CLAUDE_PROJECT_DIR/…"`.
JSON validated with `node -e "JSON.parse(...)"` → OK.

Event facts confirmed against <https://code.claude.com/docs/en/hooks.md> via the `claude-code-guide`
agent: SessionStart **does** take a matcher and alternation is valid; `PreCompact` exists, takes
`manual`/`auto`, and fires **before** compaction; SessionStart `source=compact` fires **after** it —
hence both are wired.

## T4 — GATES.md + CLAUDE.md · `530182d`

`docs/planning/demo-phone-ui-parity/GATES.md` (58 lines): 7 mechanical gates, 5 process gates, 2 owner
gates, each with the reason it exists. First Load: v1 held **107 kB** across all nine phases
(`docs/planning/demo-phone-parity/HANDOFF.md:5`, repeated at `01-master-parity-plan`-adjacent matrix
§7 and `P2-DEBRIEF.md:48`); the measurement is the `pnpm build` route table's First Load JS column for
`/demo` — I found no separate measurement script in the v1 docs.

CLAUDE.md: ACTIVE INITIATIVE replaced (v2, the five read-first docs, v1 noted complete + archived);
phone repo path corrected to `…\extraction_case_notes_react_native_expo` — the old
`../DVR-Extraction-Notes-ReactNative` does not exist, and `.design-sync/check-rn-parity.mjs:28`
resolves the corrected one. Review workflow one-liner now names `dt-review-aggregator` and
`reviewer-contract.md`. Everything else intact.

---

## Could not verify

1. **`palette-contrast.test.ts` does not exist in this repo yet** — GATES.md gate 2 names it as
   "ported", per the plan. Nothing to cite.
2. **How v1 *measured* First Load** — the 107 kB figure is quoted repeatedly in the v1 docs but no
   command or script is recorded. GATES.md states the `pnpm build` route table as the method; if v1
   used something else, correct gate 6.
3. **`census.mjs` trend semantics** — the script exists on the planning branch only; I did not run it
   and GATES.md deliberately makes it a recorded trend, not a threshold.
4. **PostToolUse stream behaviour on exit 2** is not documented; the staleness hook never exits 2, so
   it does not matter, but it is unverified.
5. **Whether the harness re-reads `settings.json` mid-session.** The hooks are tested standalone and
   correct; that they *fire* will only be provable on the next session start.

---

## Contradictions found — listed, not resolved

0. **I got the worktree hazard backwards on the first pass** (see Correction 1). Worth recording as a
   process note, not just a fix: I wrote "no junctions ever" from the brief plus a plausible mental
   model of pnpm, and did not probe it, in a section whose entire subject is *not trusting claims you
   have not probed*. The rule the file states about tests applies to the file itself.
1. **The hazard playbook's own WIP remedy is blocked by the guard it asks for.** "Git — the two that
   destroy work" says: *"Commit work-in-progress to your own branch instead: `git add -A && git commit
   -m "wip: <what>"`"* — and `dt-git-guard.sh` blocks `git add -A`, as the same file's parenthetical
   *"(Mechanically enforced by the `dt-git-guard` hook.)"* implies it should. The guard's refusal
   message prescribes `git add <named paths>`, so an agent that hits it is corrected immediately, but
   the playbook sentence should be amended. I left it, per "keep every other sentence intact".
2. **Who writes the deferral ledger — three sources, two answers.**
   - `dt-review-aggregator.md`: *"You are the sole writer of the deferral ledger… Owners propose
     deferrals in their fix reports."*
   - v2 `HANDOFF.md` §4 (inherited verbatim from v1 §4): *"Agents DO append to
     `docs/code-reviews/deferred.md` (next free § , check first)."*
   - root `CLAUDE.md` "Deferral ledger": *"Log every deferral there **before merging**"*, addressed to
     whoever is merging.
   I amended the two **kit** passages to the aggregator's rule as instructed. HANDOFF §4 and CLAUDE.md
   still say the older thing. Both are outside my brief's edit scope.
3. **Review artifact naming.** root `CLAUDE.md` Review workflow: *"Reviews live in
   `docs/code-reviews/` as `pr-<N>-review.md` and `pr-<N>-fixes-review.md`."* The v1 campaign and the
   v2 plan use per-phase directories (`docs/code-reviews/parity/p<N>/`, `.../ui-parity/u<N>/`). My
   mapping table follows the campaign convention; CLAUDE.md's sentence still describes the old one.
4. **Same-tree probes.** `reviewer-contract.md` §2 allows *"a same-tree probe you declare explicitly,
   with a verified revert"*; v1/v2 HANDOFF §4 says *"Mutation-probing lanes get their own worktree or
   serialise full-suite runs."* The contract's carve-out is narrower than it reads once the playbook's
   "a named restore also destroys the uncommitted fix in the same file" incident is applied to it.
5. **Device-pass checkpoints disagree inside the planning bundle.** `02-ratification-brief.md:19` says
   after **U1/U5/U8**; `01-master-ui-parity-plan.md` (D1 row, §6.6, and :536) says **U1/U4/U5**.
   GATES.md follows the ratification brief and flags the conflict in situ. Settle before U4.
6. **`model:` frontmatter vs HANDOFF §2's spawn directive.** §2 requires an explicit `model: "opus"` on
   every lane spawn *"because most `.claude/agents/*-reviewer.md` definitions carry no model
   frontmatter"*. Six of nine already did, and all nine do now. The directive is still safe, just no
   longer load-bearing for the reason given.
7. **`dt-partner` is `model: fable` while `dt-partner-opus` is `model: opus`.** HANDOFF §2 names one
   warm `dt-partner` (Fable) for the orchestrator's legwork — consistent — but note the fleet now has
   two partner seats and only one is budgeted in the roster.
