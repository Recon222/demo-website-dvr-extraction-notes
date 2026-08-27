---
name: fleet-orchestration
description: The Dreamteam master playbook — context economy, the disk-first review pipeline, agent continuity and rotation, worktree isolation, and post-compaction recovery. Read by both orchestrator agents. Use when running or recovering a multi-phase engineering effort that must survive session limits, stalls, and compaction. Architecture-agnostic.
---

# Fleet Orchestration

The operating theory behind the Dreamteam. The two orchestrator agents
(`dt-plan-orchestrator`, `dt-build-orchestrator`) carry the *flows*; this skill carries the
*principles those flows implement* and the recovery procedure when a context is lost.

**Companion reference files in this directory:**
- `reviewer-contract.md` — the base contract every review lane reads
- `hazard-playbook.md` — the non-negotiables every repo-writing agent reads

---

## 0. The one idea

**The orchestrator's context is the only resource in this system that cannot be recreated.**

A lost implementer can be respawned. A lost review can be re-run. A lost worktree can be re-cut. The
orchestrator — the instance holding the whole build in its head — cannot, because nobody else ever had
that picture. Every design decision below answers one question: *how do we keep substance on disk and
out of the orchestrator's context?*

Four mechanisms carry it. They are defaults, not options.

1. **Disk-first reviews.** Lanes write full findings to files and reply with counts and a path. The
   orchestrator never opens a lane file. Measured across twelve dispatches and two milestones: zero
   lane files read.
2. **The aggregator.** One agent reads the lanes from disk, dedupes, adjudicates disputes by running
   probes, and writes ONE vetted document. The orchestrator reads only that.
3. **Warm resumption.** Fix rounds resume the original authors; fix-delta resumes the original
   reviewers. Nobody re-derives context that already exists in a live transcript.
4. **The pointer and the trail.** `docs/current-implementation/<slug>/STATE.md` is the recovery document, stamped with the
   commit it describes, refreshed at every milestone, pointed to from `CLAUDE.md`, and re-injected by
   hooks at session start and before compaction.

**The two-part output contract is how mechanisms 1 and 2 generalise.** Review lanes have always had
it. Implementers, the integrator, and the mutation tester have it too: **full report to disk,
committed; reply ≤15 lines.** Before that change, implementer reports and the briefs that transcribed
them were measured at ~51% of orchestrator context. Reports that live only in transcripts are both
expensive and fragile.

**Briefs point; they do not transcribe.** Once reports are on disk, "read your predecessor's report at
`<path>`" replaces relaying a surface inventory. Every relay is paid twice — once writing it, and
again in every subsequent turn.

## 1. Foundations

1. **Plan set** — authored per `planning-doc-house-style`. For fleet execution, the plan carries its
   own **Execution Strategy**: per-package size, tier, dependencies and parallel-safety, the mode
   call, the seam plan, PR granularity, and a ship-righting watchlist. That strategy is *reviewed*
   by the plan lanes, which is why it lives in the plan rather than being re-derived at build time.
2. **Runbook (`docs/current-implementation/<slug>/STATE.md`)** — the recovery document. Template in `docs/templates/`.
3. **Pointer trail** — the current-implementation path goes into every involved repo's `CLAUDE.md`. `dt-init` writes
   it; the session hooks reinforce it.
4. **Deferral ledger (`docs/code-reviews/deferred.md`)** — one living document of deliberate
   non-fixes, numbered, append-only, every entry carrying a concrete un-defer Trigger. **This is the
   system's only suppression mechanism.** Reviewer personas carry no "do not flag" lists, because a
   suppression that cannot expire eventually suppresses a real finding. Reserve § ranges per agent in
   every brief — parallel agents claiming "next free §" collide at merge.
5. **Agent contracts** — `.claude/agents/dt-*.md`. Personas carry the standing rules; briefs carry
   only package specifics.

## 2. Implementation

**Mode is decided in the plan, not here.** The plan's Execution Strategy names parallel wave,
sequential, or hybrid, with its reasoning, and the plan lanes have judged it. The build orchestrator
executes that decision and only revisits it if reality diverges — in which case it records the
divergence in DECISIONS.md.

**Parallel wave:** one worktree per agent, branched off the phase branch. Per worktree: install
dependencies, copy env files, confirm the baseline is green *before* its agent starts. Reserve ledger
§ ranges per agent. Map seams — shared capabilities where the first builder ships it as its own commit
and the sibling consumes, files two packages both touch with explicit ownership notes, and planned
schema collisions where both sides are briefed that the collision is expected.

**Sequential:** the phase branch and ONE worktree. The hazard rules do not relax for one lane, and
your own checkout stays free for independent inspection and gate-running. Packages land in dependency
order, each gated before the next dispatch. Consecutive same-tier packages resume the same implementer
warm. No blind seams exist, and the integrator has nothing to harmonise.

**Parallelism has a fixed tax.** Every side worktree costs roughly ten minutes before any work happens
— dependency install plus cold compile — plus a merge. Parallelise only when a lane's work comfortably
exceeds that: roughly M-sized or larger. S-sized items belong in a warm agent's existing worktree. The
plan states this tax explicitly so the mode call is auditable rather than instinctive.

**Tiering is fixed at spawn, so keep a tier idle until its work appears.** Effort is a property of the
agent, not the task, and warm resumption means the tier chosen at first dispatch governs every package
that agent goes on to own. An idle agent costs nothing. One `L` package inside a run of `M` work goes
to a new max agent while the xhigh agent keeps the `M` packages — promoting instead would spend max
effort on every subsequent package. Warm resumption applies *within* a tier; a tier change means a
fresh agent with a predecessor note. **`max` is a top-tier-only concept**: when the fleet runs a
cheaper model, all implementers are standard unless a package is explicitly named.

**Verify-then-refute.** Every brief carries the duty verbatim: *"Verify every claim in this brief
against source; refute with file:line evidence instead of silently complying."* Briefs are wrong
sometimes. Each refutation is a spec correction to commit — process them first when reports come in.

**Seams are the workflow's blind spot.** When a plan splits one user-visible flow across two or more
packages, each side's suite mocks the other's responsibilities, and **the step neither side owns gets
implemented by nobody** while both suites stay green. The last package in a split owes an integration
arm exercising the seam with both real implementations and only the outermost boundary mocked. For
every split flow, the answerable question is *"which package owns each step, and which arm runs the
join?"* — an unanswerable one is a finding before the PR opens.

**Merging.** Sequential, `--no-ff`, dependency order, gates at assembly. Resolve mechanical conflicts
yourself — but **one pass only.** If it does not come out clean on the first attempt (the file stops
parsing, a test goes red, a second judgment call appears), STOP and hand the whole merge to the
`dt-integrator`. Do not iterate. A judgment call is not mechanical even when it is small, and a seam
an implementer explicitly declined to land-grab is a dispatch, not a note. The reason this carve-out
is bounded: your context is the resource that cannot be re-created, and every avoidable call spent
grinding a merge is borrowed from the ability to run the next milestone.

**Keep-both is wrong for modify/modify on one logical block.** Duplicated switch cases, dueling
implementations of one function, twin registrations — reconcile to a union or a winner and re-run the
tests pinning BOTH sides' behaviour.

**Spec corrections belong on the branch that produced them.** A correction committed to the default
branch while the milestone branch carries none means reviewers cross-check code against the version it
deliberately diverged *from* — so a correct implementation reads as a deviation. If a correction must
land on the default branch early, merge default INTO the milestone branch before opening the PR and
say in the body which commits carry spec changes.

## 3. The review pipeline

**Lanes → disk → aggregator → ONE vetted doc → orchestrator.** Lane selection, dispatch mechanics, and
verdict rules live in the `dt-plan-review` and `dt-code-review` skills.

**Lanes run before the aggregator, never in parallel with it.** The aggregator reads lane files from
disk; dispatching it concurrently buys nothing and produces a verdict that predates a lane's findings.

**The orchestrator reads only the vetted doc** — never the lane files. This is the rule that keeps a
context alive for days.

**Agent lifecycle — the same for implementers, code-review lanes, and the aggregator.** Both accumulate a model of
their territory that is expensive to rebuild and invisible in any artifact: the conventions they have
learned to read as intentional, the false-positive shapes they have stopped raising, the ledger
entries they already know are live. **Keep them warm across milestones.** A milestone boundary is not
a reason to reset; it is just a date.

**The aggregator is the clearest case of all.** Resume the same one every round, in both plan and
code review. The vetted doc records its rulings but never its reasoning, so a fresh aggregator
silently re-derives every severity call and adjudication it already made — at no cost to
correctness, which is why it can go unnoticed for a whole campaign, and at full cost in tokens.

Plan-review lanes are the exception, and structurally so: Stage 1 runs in its own terminal and ends
with it, so the plan trio cannot be kept warm no matter what this says. Their continuity is the vetted
doc and the Revision Log.

After any *forced*-fresh agent (a crash, a lost transcript), explicitly re-test resumability rather
than carrying the loss forward out of habit.

**Fresh eyes are a tool, not a schedule.** The one real argument for a deliberate reset is anchoring —
a lane that approved something in milestone two is less likely to re-question it in milestone five.
Handle that by re-dispatching one specific lane fresh when it has been unusually quiet, as a judgement
call. Do not buy it by resetting every lane on a calendar.

**Fix-delta economy — scope the round, do not narrow the roster.**

Dispatch is driven by the commit-to-finding mapping comment `dt-address-review` posted on the PR.
That table is the input, not a record for later.

1. **Every lane that raised findings comes back warm, scoped to its own** — its findings, the commits
   claiming to fix them, and the fallout from those fixes. A fix can satisfy the letter of a finding
   and miss its point, and the vantage that saw the problem is the one that reliably sees that. This
   is where the strongest round-two findings have consistently come from.
2. **Plus any lane whose territory the fix diff touches**, even with no prior finding — a fix lands in
   files that were never flagged and can break something there.
3. **The aggregator verifies every fix mechanically regardless**, as the floor under both. Two passes
   over the same fix is intended: the aggregator catches the fix that never landed, the lane catches
   the fix that landed wrong.

Resume nobody only when the fix diff is trivial and mechanical, everything it closes is LOW, and no
new file was touched — and say so explicitly rather than leaving it implied.

The economy is in the SCOPE each lane receives — its own findings plus the fix diff, never the whole
original diff again. It is not in refusing to wake the lane that understands why the finding existed.

Matching verification cost to round size is what keeps the gauntlet affordable enough to always run.

**Identifiers must carry across boundaries.** The aggregator assigns sequential F-numbers; lanes keep
their own labels. If the mapping is not written down, resumed lanes truthfully disclaim findings they
actually authored — replies that are individually true and collectively wrong, immediately before a
merge. The aggregator records **originating lane and that lane's own label** beside every F-number,
and every resume brief supplies the mapping. **Treat unanimous denial as a smell:** if every lane
disclaims a finding set, the numbering is wrong, not the authorship.

**Lane-definition fixes land on the default branch before the review is dispatched** — agent
definitions resolve from the main checkout, so a fix riding only the PR branch reaches the reviewers
one merge too late.

**The orchestrator's own merge and seam code is reviewed like any other,** and its findings route to a
code-owning agent, never back to the orchestrator. The net must not care who wrote the line.

**A vetted doc's prescribed fix is a suggestion, not a spec.** The fix owner must verify a prescribed
pin actually kills the mutant before adopting it. A prescription has shipped that did not — a mock
queue served the fixture positionally and both prescribed clauses passed over a broken path.

**Which ledger triggers does this diff satisfy?** Answer it explicitly, per row, before the PR opens.
A trigger has been satisfied *by a fix round* — precisely the event it was written to catch — and went
unnoticed for two rounds because nothing asked.

**The PR body and the ledger are reviewable artifacts.** An overclaim ("wired", "tested") is a finding
with a named amendment obligation; amend the body the moment a lane flags it, so later rounds work
from accurate ground truth.

**Review-earned maxims for reviewer and fixer briefs:**
- *When a comment cites a precedent, open the precedent.* The dominant defect class in mature rounds is
  a comment describing the right idiom over code shipping half of it.
- *A fix that adds two only-meaningful-together props has added a third state nobody wants* — collapse
  correlated optionals into one member.
- *Prove totality, don't assert it.* A cast claiming exhaustiveness claims what a total construct would
  enforce. Derive lists from their source registry; counts in prose drift, derived counts cannot.
- *A replacement pin must itself be mutation-verified,* or you have swapped one unfalsifiable assertion
  for another.
- *Does any arm assert the defect?* A sequence or call-count assertion can pin broken behaviour as
  correct, after which anyone who "makes the tests pass" reproduces the bug faithfully.

## 4. Continuity, rotation, integrity

**Agent IDs are the durable handle. Names are not reachable via `SendMessage`; IDs are.** Record every
ID in STATE.md's live-agent table when spawned, with package, workspace, branch, and ledger §§.

**Rotation is a review trigger, not a guillotine.** At roughly **700k cumulative tokens**, note the
agent and plan its handoff — then let it finish to a natural boundary. **Never cut an implementer or a
lane mid-milestone just because a number was crossed.** Retire at the merge, not in the middle of the
work, because a mid-flight swap costs a full re-derivation and buys nothing the boundary would not
have given you for free a few days later.

This threshold was set on caution and the evidence says it is conservative: an implementer ran to a
**1.6M-token lifetime** across a compaction with no visible discontinuity, and did its sharpest work
at the end. So 700k is where you start watching, not where you act.

**Retire early only for cause**, not for arithmetic: quality is visibly degrading, the agent reports
it is struggling to hold its territory, or it is genuinely near the context wall rather than merely
past 700k.

**Whenever it retires, it owes a successor brief** in its final report — the 3–9 non-obvious territory
invariants a fresh agent needs. For an implementer that is the hazards and the seams; for a review
lane it is the recurring defect classes in its territory, the conventions it has learned to read as
intentional, and which ledger entries it has already checked. It goes to the report file on disk, and
STATE.md cites the path. **The brief is the real safeguard — not the number.**

**Every project has defect classes its automated harness structurally cannot observe.** Identify them
at `dt-init` and make an appropriate live or manual verification a merge gate for milestones that ship
them. The rule is universal; the blind spots differ per stack. Such verification runs from a top-level
session, per the exclusive-resource rule in the hazard playbook.

**Integrity culture.** Agents disclose their own process slips. Reviewers admit when a suggested fix
was wrong. The orchestrator's bookkeeping errors get refuted by agents who check `merge-base` instead
of trusting the brief. Record all of it — it compounds.

**A delegation rule that is physically impossible will be obeyed perfectly and produce nothing.**
Record capability constraints *next to* the delegation rule they bound.

## 5. Post-compaction recovery

**Read this section the moment you realise you are a fresh or freshly-compacted instance.**

Compaction drops the *skill* but leaves the *work*. STATE.md, the ledger, and the plan set
reconstruct **state** — what is merged, what is open, what is owed. None of them reconstruct
**process** — dispatch shape, lane selection, warm-resumption rules, the output contracts, ledger
discipline. So a post-compaction orchestrator reliably recovers *what* and silently loses *how*.

**The hazard is that the failure is silent and self-confident.** You will not feel under-informed. You
have a pointer, a summary, and working greps. Everything looks recovered. Run the procedure anyway.

1. **Re-invoke this skill and your own orchestrator agent contract.** You are reading this because
   something told you to; finish reading it.
2. **Open `docs/current-implementation/<slug>/STATE.md` and read it top to bottom.** Trust its newest snapshot over any
   conversation summary. Check its `state-as-of` stamp against `git log` — if the pointer is behind
   HEAD, its snapshot is stale and you must reconstruct the delta from git before acting on it.
3. **Open the plan set and read it in full** at any milestone boundary. **"Read" means open the file.**
   This has been violated with the pointers present and correct: an orchestrator read the pointer, then
   used `grep` against the plan and a summary, and came one message from writing an execution plan that
   missed a standing conventions block governing every package in the milestone. **Grep confirms what
   you already suspect; it cannot surface what you do not know to look for.** A pointer list naming a
   document is not an instruction to read it. Update STATE.md's `last-full-plan-read` marker when
   you do.
4. **Rebuild the agent roster.** If the roster survived, verify it. If it did not, ping every known
   agent ID with one line — *"identify your lane and the F-numbers you authored"* — about five seconds
   and one line back each, and it rebuilds the table exactly.
5. **Read the deferral ledger** before re-flagging anything, and the latest vetted review before
   assuming a round's state.
6. **Check `git status`, `git log`, and `git worktree list`** before resuming any task, and continue
   from committed progress rather than redoing work.

## 6. Model policy

**The orchestrator always runs top-tier.** Comprehension of the whole build, live adjudication, and
ship-righting are the most judgment-dense work in the system. Economise anywhere but here.

**Standing policy lives in frontmatter, never in per-call overrides.** A per-call override is one
forgotten dispatch away from silently reverting, with no signal. Effort is fixed at spawn, so a policy
change cannot affect running agents — schedule changes at package or milestone boundaries.

**Fleet configuration is the owner's call, presented rather than assumed.** Model economics, budget
headroom, wall-clock tolerance, and risk appetite are inputs the orchestrator cannot observe. `dt-init`
presents the current roster read from the agent files themselves — never from memory — with a
recommendation per seat and its rejected alternative, and writes the owner's answers into frontmatter.
The reasons captured in that conversation are what let a successor make the *next* call correctly.

When choosing implementation tiers, run a controlled A/B: same briefs, same conventions, same review
gauntlet. Compare severity-weighted findings density normalised by package size, refutation quality,
fix-round counts, and token burn. Commit the debrief with a scheduled reassessment point.

## 7. Definition of done, per phase

Every gating finding fixed or evidence-refuted, across however many rounds it takes. Fix-delta clean.
Full gates green from a cold cache at the merged head — typecheck, suite, **and the build that produces
the shipped artifact**. Live or manual verification passed for any defect class the harness cannot
observe. Review artifacts and ledger committed. PR merged with a merge commit. Worktrees and branches
pruned. Runbook snapshot updated and its `state-as-of` stamp current. Residual minors fixed, batched
into the next phase's rider, or ledgered with concrete triggers.

Then — and only then — the next phase launches.
