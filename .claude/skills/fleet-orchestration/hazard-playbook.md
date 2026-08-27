# The Hazard Playbook

**Every Dreamteam agent that writes to a repo reads this file first** — implementers of every tier,
the integrator, the mutation tester, and both orchestrators. Read-only review lanes do not need it.

Every rule here was paid for by a real incident. None is theoretical, and none is a preference.

This file exists in exactly one place on purpose. Before it existed, these rules were restated across
six agent files and two skills, and they drifted.

---

## Git — the two that destroy work

**NEVER `git stash`, in any mutating form.** The stash stack is shared across *all* worktrees of a
repo. Two agents stashing concurrently swap each other's changesets. Commit work-in-progress to your
own branch instead: `git add <named paths> && git commit -m "wip: <what>"`. **Named paths, not `-A`** —
`git add -A` sweeps every dirty file in the tree, including a sibling agent's in-flight edit, which is
the very incident recorded three paragraphs below (an orchestrator's `commit -a` on a doc change swept
an implementer's edit into an unrelated commit and left a review finding with no traceable fix). The
guard blocks `-A` for that reason; this remedy has to survive it. Read-only `git stash list` and
`git stash show` are fine. *(Mechanically enforced by the `dt-git-guard` hook.)*

**NEVER blanket-discard a working tree.** No `git checkout -- .`, no `git restore .`, no
`git clean -f`. One uninspected restore has destroyed a sibling agent's uncommitted work,
unrecoverably. Run `git status` and `git diff` first, then restore only files you own, named
explicitly. If you genuinely need a clean tree, use your own dedicated worktree.
*(Also enforced by the hook.)*

**A file-SPECIFIC restore is allowed by the guard and can still destroy your own work.** The
carve-out's reasoning is that naming a path means you know what you are discarding. Measured
2026-08-18: an implementer ran a named `git checkout --` to revert a probe mutation and lost the
uncommitted fix living in the same file. Naming the path is not knowing the contents.

**So: commit the fix FIRST, then probe — and probe in a throwaway worktree, never in place.**
The mutation-testing skill already requires the worktree; mutating over uncommitted work is what
turns a routine revert into a loss. A hook cannot catch this one, because the command it would
have to block is the legitimate one.

**Never `commit -a` in a worktree another agent is live in,** and never mutate dependencies there. An
orchestrator's `commit -a` on a doc change once swept an implementer's in-flight edit into an
unrelated commit, leaving a review finding with no traceable fix. A concurrent `npm install` broke
typecheck under a running agent twice. If you need dependencies a shared tree lacks, work from your
own copy or commit the lockfile edit deliberately.

**Push only your own assigned branch.** Never touch the default branch or the phase branch. Open no
PRs — the orchestrator owns those. The `integrator` is the single exception and its persona says so.

## Gates — how to know something is actually green

**Gate on exit codes, never on grepped output fragments.** A grep for a summary line can match its own
negation ("Tests" matches "no tests"), and a piped chain that preserves exit 0 will happily push a red
suite. If a runner silences consoles, probe through thrown assertion messages, not prints.

**Quote gates only from a cold cache at the merged head.** Delete incremental build and compiler
caches first — they can return exit 0 against a broken tree. A branch-level green proves nothing about
the combined tree; widening and exhaustiveness interactions only fail after the merge.

**Run the build, not just the checks.** A gate that never produces the shipped artifact can stay green
over a project that cannot produce one. Whatever "build" means for this stack — compile, bundle,
package, image, wheel, binary — run it at milestone boundaries. This has hidden an unbuildable
application for two entire milestones while type-checks and both test suites stayed green.

**When a defect lives in a build transform, verify the built artifact — never the source diff.** Any
toolchain that compiles, bundles, minifies, links, or reorders is in scope. Reviewing source for a
transform-stage defect reads as diligence and proves nothing; a fix once shipped marked FIXED and was
provably inert for a full review round.

## Process discipline

**Foreground commands only.** Background watchers stall agents. Raise the command timeout instead;
never end your turn waiting on a background process.

**Re-run unexplained failures in isolation before concluding anything.** Parallel fleets saturate the
box, so timeout-class failures shift between runs and pass solo. Never widen a timeout just to look
clean — but do fix real timeout-geometry defects, where an async budget equal to the test budget
leaves zero headroom.

**Every scripted edit asserts its own pattern matched.** A `.replace()` or `sed` that silently no-ops,
plus a report claiming the edit landed, is how a ledger ends up contradicting the tree. Assert the
match or the edit did not happen.

**No computer-use tools.** Unattended access approvals cannot be granted. Beyond that: **an exclusive
host resource — computer use, a display grant, a device lock, an interactive login — cannot be held by
a subagent of a session that already holds it.** A subagent runs inside its parent's process, so there
is no sibling to release the lock, and killing the holder kills the subagent and its report. Such work
is staged from the orchestrator and handed to a separate top-level session that reports back through a
committed file.

**Never fabricate tokens, keys, or data.**

## Diagnosis — three lessons that cost real milestones

**When a capability reports *granted* but behaves as *denied*, ask the tool who holds it before
theorising a mechanism.** One read-only ownership query beats a process-ancestry walk and a wrong
standing rule written into memory as fact.

**After any failure affecting more than one agent at once, check the environment before the harness.**
Every live agent handle stopped resuming simultaneously, and the conclusion recorded was "warm
resumption is unreliable." The actual cause was the host losing power. Add "awake, unlocked, on power"
to pre-flight for long runs.

**When N independent agents fail at the same step with N different plausible theories, suspect what
they have in common** — and test it from outside the pattern. Each agent's local explanation was
well-evidenced and wrong.

**When a false hypothesis explains an incident, keep hunting.** Record hypotheses with their
confidence, never as fact. A "best explanation of the joint evidence" stays labelled *unproven* until
it is proven.

## Records

**Cross-referenced numbered lists are append-only.** Renumbering an item breaks every reference above
it. New items take the next number even when the grouping looks untidy. This binds finding IDs, ledger
sections, and runbook sections alike.

**You do not write `docs/code-reviews/deferred.md`. You PROPOSE.** Put the deferral you believe is
warranted in your report, in house format — Source / What / Why deferred / concrete un-defer
**Trigger** — and the `dt-review-aggregator` decides and writes the numbered § row. It is the sole
writer of that file. A proposed deferral without a concrete trigger is a dropped finding and will be
flagged as one. Never edit the plan or the runbook yourself either; report what you believe belongs
there.

**Exactly one writer per shared file per round.** The ledger's case is settled — one writer, no
reserved ranges. The general rule still binds everywhere else: any single shared file edited by
multiple concurrent agents needs a named owner for the round, because reserved ranges prevent
numbering collisions but never *file* collisions.

**Commit trailers carry your own model name** and the `Claude-Session:` link from your brief. Fix
yours if you slip.

**Write package rationale and probe evidence into commit bodies.** When a transcript was lost at a
session boundary and a warm resume failed outright, recovery worked *only* because the reasoning was
in the commits. This practice is why a power loss cost that campaign nothing.

## If you are resumed after a stall or reset

Check your own `git status` and `git log` **first**, then continue from committed progress. Never redo
work blindly — a resumed agent that repeats itself produces duplicate commits and contradictory
reports.
