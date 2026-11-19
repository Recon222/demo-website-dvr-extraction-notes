# Planning-doc templates for parallel agent fleets

Source analysed (read-only): `scratchpad/recon/timeline-scope` (the TimelineScope planning set). Read in full: `docs/01-architecture.md`,
`docs/02-sliced-plan.md`, `docs/03-test-spec.md`. Read as context: `docs/plan/00-high-level-plan.md`, `docs/briefs/fable-planning-brief.md`
(the brief that produced the three docs), `docs/process/{implementer,build-orchestrator,00-workflow,review-orchestrator,reviewer,orchestrator-handoff}.md`,
`docs/plan-errata.md` (25 rows), the plan's own 4-round review (`docs/reviews/pr-1/`: brief, README, round-1 aggregate), 11 of the 36 files in `docs/briefs/slices/`
in full and shape statistics for all 36, and `state.md`/`agent-roster.md` for agent context sizes. I also looked at this RN repo's existing plan docs under
`docs/plans/` (see 5.6). Not read: the individual reviewer files, rounds 2-4 beyond their README, unit reviews, `docs/research/*`.

Where I say "by my reading" a number is my own classification, not something the source states. Token figures are estimates.
Items marked **[added]** in the templates are my additions, not observed in the source.

---

# 1. Findings

## 1.1 What the three docs are, and how big

| | `01-architecture.md` | `02-sliced-plan.md` | `03-test-spec.md` |
|---|---|---|---|
| Size | 1,377 lines, 22.1k words, 145 KB | 917 lines, 11.0k words, 65 KB | 671 lines, 14.1k words, 83 KB |
| Share of lines that are table rows | 43% | 73% | 74% |
| Lines over 400 characters (dense cells) | 51 | 14 | 7 |
| Core content | 44 decisions (`AD-n`), ~50 ground-truth facts, module map, 8 subsystem specs, 14 upstream-change specs (`D-a`..`D-n`), 14 risks, 11 owner answers | 50 slice cards, 9 lanes, 6 milestones, dependency graph, conflict table, 21 review units | 362 registered tests, fixture catalogue, gate scripts, registry-checker rules, procedures |
| Answers the question | What is the system and why is it this way? | Who builds which piece, in what order, owning which files? | What proves each piece, and how is that checked mechanically? |

Total is about 47k words, roughly 100-120k tokens (the first 500 lines of the architecture alone measured 25.9k tokens). **No agent is expected to read
all of it.** The docs are random-access reference material: a slice brief names the card heading, the `AD-n` ids, the architecture `§`s and the test-id range,
and the implementer reads only those (`implementer.md` section 1; `build-orchestrator.md` section 3: "It names paths and copies no text").

Fleet scale it was built for: 50 slices, 9 lanes, 3 build trees in 2 repos, about 10 implementer sessions plus 5 review sessions, one orchestrator,
and a leg-work partner. Slices were not small: finished implementers sat at 400-820k tokens (F0 600k, C2 820k, S1 697k, S2 768k, DT1 673k; `agent-roster.md`,
`state.md`), and `orchestrator-handoff.md` says to retire an agent at 700-800k and never plan a fix round on one above about 700k.

## 1.2 Section maps: what each section is for in the fleet

Legend. **LB** = load-bearing for parallel work (an agent or the orchestrator acts directly on it; losing it causes collisions, rework or untestable
slices). **REF** = reference that one lane reads when its slice touches that subsystem. **AUD** = audit/governance, used by reviewers, orchestrator or
owner rather than implementers. **PS** = project-specific content (the pattern may be reusable, the content is not). **CUT?** = candidate to cut or shrink on reuse.

### `01-architecture.md`

| § (lines) | What it holds | What the fleet does with it | Class |
|---|---|---|---|
| Header (1-17) | "Doc 1 of 3", status "design, nothing built", **authority order** (owner decisions > current source > high-level plan > this doc > research), **citation-prefix table** (`DSS:`, `FS:`... each pinned to a commit) | Settles conflicts without asking; tells every reader which statements are verified (cited) and which are design | LB (small) |
| 1 Decisions (21-97) | 44 `AD-n` rows in 6 themed tables: **Decision / Reason / Rejected / Serves** | Cards cite them in "Implements"; briefs cite them in "Decisions"; "Rejected" stops agents re-litigating; "Serves" ties each to an owner decision; reviewers test soundness; orchestrator checks coverage | LB |
| 2 Ground truth (101-166) | ~50 facts about pre-existing code, each with `path:line` | Stops agents guessing about code that exists; every fact is checkable; the accuracy arguments in section 11 lean on them | REF, PS. CUT? for greenfield (replace with a short "external facts" list) |
| 3.1 Crates and dependency direction (172-194) | Module table: Kind / Holds / **May depend on**; rules (no cycle; which layers never import which) | Module boundaries become lane ownership; enforced by a test (FD006) | LB |
| 3.2 Pins (196-226) | Exact toolchain and dependency versions, lint set, deny policy | One version policy for the foundation slice | LB but heavy and drift-prone: 4 errata (E5, E6, E9, E10) correct it |
| 3.3 Copied code (228-247) | Table of what is copied from where, status verbatim/adapted | Reuse tracking read by the three lanes that copy | PS, optional |
| 4 Domain (251-416) | Model and ids; typed views of external files; stage graph; staleness rules **with precedence order**; derived statuses; validation rules | Spec of the domain lane; the tables are executable (row order is precedence) | LB for its lane, PS content |
| 5 Store (420-533) | On-disk layout; data-ownership table; atomic-write protocol; watcher; audit-log format and recovery | Spec of the persistence lane | LB for its lane, PS |
| 6 Job runner (537-618) | Process model, protocol adapters, scheduler tokens, cancel ladder, run record | Spec of the runner lane | LB for its lane, PS |
| 7 Command layer (622-790) | Actor/inbox model; **command table** (method / kind / params / result); operation lifecycle; actors; events; **error-code table**; orchestrator rules; **7.8 ports** (trait / implemented by / used by / methods) | **The inter-lane contract.** Contract slice C2 freezes it; every port gets a fake so lanes build against fakes, not each other | LB (highest value section) |
| 8 Agent control (794-857) | IPC wire, CLI, MCP, security policy | One lane, off the critical path | PS |
| 9 UI (860-998) | Shell pattern; region table with sizes; reflow table; secondary windows; kit; chart; images; flows | UI lane | PS |
| 10 Health and settings (1002-1032) | Probe table, settings keys | Small lane | PS |
| 11 Upstream change specs (1036-1330) | Per change: interface, behaviour, accuracy argument, intended deltas, test ids; plus 11.1 **equivalence method** (baseline before change, normalisation, replay) | Spec of the lanes that modify existing tools; 11.1 is a reusable pattern | PS; ~295 lines, 21% of the doc |
| 12 Risks (1334-1351) | 14 rows: risk / containment (cites `AD-n` and test ids) | Reviewer and orchestrator use | AUD |
| 13 Owner answers (1355-1377) | Q1-Q11 with answers; last line "No owner question is open." | Closes every open item so nothing blocks on the owner | AUD |

### `02-sliced-plan.md`

| § (lines) | What it holds | What the fleet does with it | Class |
|---|---|---|---|
| Header (1-8) | How `§`/`AD`/test ids are referenced; "everything here is planned; a slice is done only when its evidence is recorded" | Sets the status vocabulary | LB (small) |
| 1 Phases, milestones, lanes (12-51) | Phase table; milestone table (reached when / owner checkpoint); **lane table: Lane / Repo / Owns (exclusive) / Slices in order**; the rules paragraph | The ownership map. The paragraph is the parallelism protocol: two slices in a lane never run at once unless marked parallel with disjoint files; the contract slice creates every module and index file empty so lanes own disjoint files; later slices add only `mod`/re-export lines to their own directory's index; any change to a manifest, port or existing exported name is a **contract proposal** | LB. Milestones: AUD |
| 2 Dependency graph (53-91) | ASCII graph; **critical path**; off-path lanes; **"ready on day one" list and dispatch order when seats < ready slices**; rule for using another lane's unreviewed work | Orchestrator's scheduling input | LB |
| 3 Slices (93-780) | 50 cards, ~13 lines each: **Goal / Repo-lane-size / Owns / Needs / Parallel-safe / Implements / Exit / Tests / Evidence**; size legend S <= 400, M <= 1,500, L > 1,500 changed lines | The unit of dispatch. Briefs point at the card by heading. Exit is the observable acceptance; Tests is an id range; Evidence names what the slice records | LB (the core of the whole set) |
| 4 Coverage (782-809) | AD to slices, change-spec to slice tables | Lets a reviewer check every decision is built | AUD; derivable from the cards |
| 5 Conflict avoidance (811-833) | **Shared thing / Owner / How others change it** table; "a blocked implementer reports the exact signature it needs and works on tests that do not depend on it; nobody creates a duplicate type" | Resolves who may touch manifests, lockfiles, contract types, golden files | LB |
| 6 Branches, review units, process (835-917) | Prerequisites; branch model (lane/slice/unit, merge commits, no stacked PRs); 21-row review-unit table (slices, depth, reviewer agents, owner checkpoint); 6.4 what every slice records | 6.4 is load-bearing (evidence file convention). 6.2-6.3 are process, restated in `process/00-workflow.md` | 6.4 LB; 6.1 small; 6.2-6.3 CUT? to process docs |

### `03-test-spec.md`

| § (lines) | What it holds | What the fleet does with it | Class |
|---|---|---|---|
| Header (1-9) | Sync rules, enforced by the checker: every test in exactly one slice; every slice has >= 1 test; a registered test has at most one function at its location; an unregistered id in code fails the gate | The invariant that keeps three docs and the code in sync | LB |
| 1 Design (13-56) | Layer table; **gate table** (fast / slow / gpu / models / window / owner: what runs, what it needs); **kind table** (test / suite / script / manual / review: what "exists" means); hard rules (no silent re-bless, no mock inside a tool, a lane that did not run is **unexecuted**, never passed, retries off) | Tells each seat which commands to run and what counts as a pass | LB |
| 2 Fixtures (60-121) | Fixture sets with short codes (G1, C, S, F, D...); recorded-reply stub design; fake executables; **goldens table (where / how to re-bless)**; scale matrix | Shared test data every lane consumes | REF, PS. Codes and the goldens table are LB |
| 3 Registry (125-536) | 362 rows in 9 area tables: **ID / Kind / Slice / Gate / Layer / Fixture / Location / Proves**. ~61% of the file | The acceptance contract: "Slice" must equal a `####` heading in the plan; "Location" fixes which file a test lives in; "Proves" is one behavioural sentence | LB |
| 4 Gates and checker (540-608) | Numbered gate steps per repo; checker rules: test existence **derived from source** (no status column), "landed" slice = its evidence README exists, `--require-slice`, nextest cross-check | Mechanical enforcement; the same gate runs on every seat | LB |
| 5 Procedures (611-660) | Offscreen render, real-window, real-model, real-footage evidence | Needed by 3 slices | REF, PS |
| 6 Mutation, coverage, done (664-671) | What is *not* a gate; "a slice is done when..."; the "Never" list (never mark a skipped lane passed; never weaken a golden) | Definition of done | LB (small) |

**If you could keep only seven things** (in priority order): (1) lane table plus per-card **Owns** plus the conflict table; (2) the contracts section plus the
freeze slice and fakes; (3) cards with Needs / Exit / Tests; (4) dependency graph with ready-now and dispatch order; (5) the test registry with ids and the sync
rules; (6) decisions with Rejected and Serves; (7) the authority order with cited facts. Everything else is either lane-specific content or governance.

## 1.3 What makes the set effective for a fleet (ranked, with evidence)

1. **Ownership by construction, not by courtesy.** Each card's *Owns* lists exact paths, including its test files, fixtures, goldens and even the manifest
   line it may add (DR2's Owns, as corrected by E16 and E22, names `tests/full_root.rs`, `tests/subset.rs`, `tests/host.rs`, `tests/support/deltas.rs`). The contract slice (C2) creates every
   crate and index file empty, so later slices fill files nobody else owns. Index files accept additive lines only; anything else is a written contract proposal.
   The cost of getting this wrong is visible: errata E12, E16, E19, E20, E22, E23, E24 (about 7 of 25, by my reading) are cards whose Owns or Exit missed a file or a test.
2. **Contract-first, then fan out.** Two sequential slices (C1 for the external contract, C2 for the app's types/traits/skeleton/fixtures) precede nine parallel
   lanes. Interfaces are tables (command table, error table, port table); every port has a fake; schemas are committed goldens vendored with hashes. Result: ten
   slices were ready on day one after the freeze (plan 2).
3. **Falsifiable acceptance with mechanical sync.** Card *Exit* is observable; card *Tests* is an id range; the registry says what each test *proves*, which gate
   runs it, which fixture it uses and where it lives; a checker script enforces both directions and **derives test existence from the source** (no status column
   to edit, so parallel branches never conflict on the registry). A slice counts as landed when `docs/evidence/<SLICE>/README.md` exists, after which its tests
   are required on every branch forever. "Unexecuted is never passed."
4. **Every decision carries its reason, its rejected alternatives and what it serves.** 138 `AD-n` mentions in the plan: cards cite them, briefs cite them,
   reviewers test them. The Rejected column prevents re-litigation by agents with fresh context.
5. **Epistemic hygiene.** Authority order up front; existing behaviour carries `path:line`, design does not; capability flags are false until a test proves
   them; "no implementation code, only contract-level names and signatures" (planning brief section 4).
6. **Parallelism is planned, not hoped for.** Dependency graph, critical path, off-path lanes, ready-on-day-one list, dispatch order for fewer seats than ready
   slices, and the rule "a slice that needs another lane's work merges that lane's branch at a green commit and never waits for its review."
7. **Decide, don't defer.** Every open item gets a default; the owner-question table ends "No owner question is open"; user-facing questions that can wait go
   to a queue file with a default (`decisions-for-owner.md`). Agents never block on a human.
8. **The plan is reviewed adversarially before fan-out, then kept honest.** Three lanes (ground truth, architecture/contracts, plan-fit) over 4 rounds:
   round 1 found 2 blockers, 20 majors, 36 minors; round 4 approved. Afterwards an **errata loop** (`E-n`: found in / plan said / what is true / text to
   correct) fixes the plan text in place; the workflow doc says "where this file and the plan disagree, the plan is right."
9. **Dense tables.** One fact per line, tables over prose (the planning brief's rule). Efficient for tokens and for random access. The hazard: 51 architecture
   lines exceed 400 characters, and dense cells are where contradictions hide (round-1 findings AGG-r1-15 and -16 are two rows disagreeing).
10. **Process lives outside the plan.** Role briefs in `docs/process/`, standing rules in `CLAUDE.md`, live state in `state.md`, per-slice knowledge in
    `docs/evidence/<SLICE>/README.md` ("Invariants for a successor", "Where a successor starts"), which the next brief names under "Read first". This is
    what lets agents be rotated at 600-800k tokens without losing the plan.

## 1.4 How the three docs connect

```
owner decisions (binding) ─┐
high-level plan ───────────┴─► 01 architecture
                               AD-n  Decision | Reason | Rejected | Serves ──► (owner decision / plan §)
                               GT/G-n facts (cite file:line)     §-numbered contract sections (7.2 commands, 7.8 ports...)
                                   │                                   │
                  "Implements: AD-n, D-x" on every card                │ "architecture §7.8" in briefs
                                   ▼                                   ▼
                               02 sliced plan
                               card heading `#### S1` = the slice ID
                               Owns (paths) · Needs (slice IDs) · Exit · Tests: SE001–SE015 · Evidence
                                   │                         ▲
                 registry "Slice" column must equal          │ every slice has ≥ 1 registry row (checker)
                 a card heading                              │
                                   ▼                         │
                               03 test spec
                               row: SE004 | test | S1 | fast | integration | D | app:crates/…/ledger.rs | "if_match mismatch writes nothing"
                                   │
                                   ▼
          docs/briefs/slices/S1.md  — PATHS ONLY: card heading, AD ids + § list, test-id range + gate §, frozen contract paths,
                                      predecessor evidence README, base branch, seat, resource-lane grant, report path
                                   ▼
          docs/evidence/S1/README.md — existence ⇒ slice "landed" ⇒ checker requires its rows from now on
                                   ▼
          docs/plan-errata.md  E-n — a plan statement building proved wrong; plan text corrected in place
```

**ID and reference conventions actually in use:**

| Thing | Form | Defined in | Cited from | Notes |
|---|---|---|---|---|
| Decision | `AD-n` | 01 s1 | card "Implements", plan s4 coverage, briefs, risks | Stable once merged ("IDs are stable once merged", 01 line 4) |
| Upstream change spec | `D-a`..`D-n` | 01 s11 | cards, test "Proves" text | Letters |
| Ground-truth fact | `G1`..`G62` (numbered in blocks per source) | 01 s2 | errata, s11 | Blocks leave room to add |
| Risk / owner question / errata | `R1`.. / `Q1`.. / `E1`.. | 01 s12 / s13 / `plan-errata.md` | | |
| Section anchors | `architecture §7.8`, `test spec §4.1` | headings | cards, briefs, process docs | Numbered headings are the only anchors; renumbering would break every brief |
| Slice | letters + number (`F0`, `DR2`, `S1`) as a `####` heading; lanes, milestones `M0`-`M5`, review units | 02 s3 | registry "Slice" column, briefs, branches `slice/<ID>`, evidence dirs | The checker requires the registry's Slice to equal a heading |
| Test | 2 letters + 3 digits (`SE004`), numbered in a **block per slice** (`SE001-SE015`) with gaps | 03 s3 | card "Tests" row, briefs, test function names (`fn se004_…`) | Checker regex `[A-Z]{2}\d{3}`; function name carries the id in lower case |
| Fixture | short code (G1-G4, C, S, F, D, X, T, M) | 03 s2 | registry "Fixture" column | |
| Gate | `fast`/`slow`/`gpu`/`models`/`window`/`owner` | 03 s1 | registry "Gate" column, brief "Gate" row, `#[ignore = "<gate>: reason"]` | |
| Evidence | `docs/evidence/<SLICE>/README.md` | 02 s6.4 | checker ("landed"), next slice's brief | |
| Contract proposal | `docs/evidence/<SLICE>/contract-proposal.md` | `implementer.md` s4 | orchestrator | The only sanctioned way to change a frozen shape |

Collisions inside the source worth avoiding on reuse: `R` is both risk (`R1`..) and the runner slices (`R1`..`R4`); `G` is both ground-truth facts and fixture sets
(`G1`..`G4`); `D-x` (change spec) vs `D` (DayFixture). It worked because humans and agents read context, but a script cannot.

**How a slice brief is derived** (S1's brief, `docs/briefs/slices/S1.md`): *Slice* row = card heading in the plan; *Repo/base/branch* = card's lane + branch model;
*Decisions* = card's "Implements" line (AD-5, AD-19..23, AD-29) + the architecture sections those ADs cite (s7, s8); *Tests* = card's "Tests" row (SE001-SE015) +
the gate section (test spec 4.1); *The contract you build on* = C2's evidence report and the contract directories; *A1* = card's "Needs" with a special instruction
(build against fakes first, merge when A1 lands, never stub its rules); *Standing rules* = pointer to `CLAUDE.md` + the foundation slice's "Invariants for a
successor"; *Model/GPU lane* = the gate table's lane grant ("not granted"); *Report* = evidence convention; then 3-4 "must get right" bullets that are traps not obvious from
the card (e.g. "a job's video list is not on the wire; do not put it back"), and a reply cap. Briefs are 18-44 lines.

## 1.5 What is heavy or redundant

| Item | Where | Why it costs | Reuse fix |
|---|---|---|---|
| The equivalence method (cassette key, replay stub, ffmpeg identity, "shipped build" numeric-printing trap) is described 2-3 times | 01 s11.1 (rows Cassette/Replay/Shipped build/ffmpeg identity) vs 03 s2.2 (Cassette/Stub/ffmpeg identity/Tools under test) vs 03 s5.3 vs card F1's Exit | Three places to keep identical; any change needs three edits | Describe a test method **once**, in the test spec; the architecture states the requirement and points |
| One behaviour stated as arch "accuracy argument", card Exit and registry "Proves" (e.g. offsets round-trip: arch 1244, DR7 Exit, DR081) | 01 s11, 02 s3, 03 s3 | Triple maintenance | Exit = 1-4 bullets that cite test ids; "Proves" carries the sentence; architecture cites the id |
| Lane ownership in four places | 02 s1 lane table, each card's Owns, 02 s5, `process/00-workflow.md` unit table (which restates 02 s6.3 and says "the plan is right") | Drift: E22 ("the DR2 card owned no bin although D-a edits eight") | Cards own the paths; the lane table lists directory roots only; units live only in the process doc |
| Coverage tables (AD to slices, change to slice) | 02 s4 | Hand-maintained mirror of the cards' "Implements" | Generate or lint, do not hand-write |
| Version pins restated in prose | 01 s3.2 | The foundation slice's manifests become the truth; E5, E6, E9, E10 are corrections to the prose | Policy plus only version-sensitive pins, each marked `verified`/`owed`; manifests are authority once they exist |
| Frozen-contract prose restated in the architecture | 01 s4.4, s11.2, s11.6 vs the frozen contract docs and schemas in the upstream repo | Prose and contract diverged (E13: "The authority is the DSS repo's `docs/contracts/`"; E11 and E14 record frozen-contract rewrites of statements the architecture had made) | When a contract is frozen as an executable artifact (schema, golden, type definition), the prose **cites** it |
| Process and history inside the plan | 02 s6.2-6.3 (branch model, 21-row reviewer table, ~70 lines); milestone cells such as "the owner waived the stop on 2026-11-18" | Narrative history in a planning doc; duplicated in `docs/process/` and `state.md` | Plan keeps only "what every slice records"; the rest is process; decisions log goes to `state.md` |
| Sections implementers never act on | 01 s12 Risks, s13 Owner answers; 02 s4, s6.3 | Reviewer/owner material in the file every agent opens | Keep (they are cheap) but mark AUD so briefs never point at them |
| Facts with a single consumer | e.g. G53 (harness scale setter) | Lives far from the slice that needs it | Put in that slice's brief or the card |
| Narrow-lane subsystem specs (agent control 64 lines, UI 138 lines, change specs 295 lines) | 01 s8, s9, s11 | Every reader of the file pays for lanes they are not in | Split architecture per subsystem once it passes ~800 lines **[added]**; the index file keeps AD table + contracts |

Context cost in practice falls on three readers: the orchestrator (must keep the set consistent), reviewers (read whole sections), and whoever maintains errata.
Implementers read only what the brief names.

## 1.6 Where the plan was wrong: defects the templates should pre-empt

*Round-1 plan review* (`docs/reviews/pr-1/aggregate-round-1.md`): 58 deduped findings from 3 lanes; every blocker/major confirmed (22 of 22). **22 of 58 (38%) came
from the lane that checked only plan/registry/process fit**, and they are mostly structural, so a template can prevent them:

- File ownership contradictions between slices that can run at once (AGG-r1-19, -47, -48, -49); test files, goldens and fixtures that no card owns (-19, -43).
- Shared interfaces named but never specified: three port traits appear only in a plan cell (AGG-r1-12); a UI harness unreachable from where its tests sit (-13).
- Gates that cannot pass or select nothing: `slow`/`gpu` filters on names that never contain those words (-18); F0's gate needs a script F0 has not built (-52); DSS gate reads a registry that is not on the slice branch (-17).
- Exit criteria with no test that could fail (-57); a decision implemented by no slice (the `detect_ts` half of one change, -20).
- Critical path omitted real cross-lane waits (-21); branch model undefined for phases 0-1 and for cross-unit needs (-22, -44).
- Ten ready slices against four seats with no dispatch order (-45).

*Errata after approval* (25 rows, by my reading): about 10 are **environment or tooling assumptions** that building disproved (a port that did not need to be free;
a normalisation rule; a path in a recorded file; zero advisory ignores unachievable; a licence list; nextest output; a gate step depending on an unbuilt slice), about 8 are
**interface prose that drifted from the frozen contract** (stamp shape, port signatures, `Launch` fields, `JobInfo`), about 7 are **cards whose Owns/Exit missed something**.
The planner had not verified `rmcp 3.9.0`; the F0 brief says so under "Owed before you pin or depend on anything". Lesson built into the templates: mark unverified
assumptions and give their verification to the first slice.

## 1.7 What lives outside the three docs but makes them work

| Artifact | Role |
|---|---|
| High-level plan (`docs/plan/00-high-level-plan.md`, 219 lines) | The **input** to the three docs: mission, settled decisions, facts to respect, system shape, constraints, delivery shape, out of scope, open items with defaults. Architecture "closes" its open items |
| Owner decisions file | Binding; top of the authority order |
| Planning brief (`docs/briefs/fable-planning-brief.md`, 122 lines) | The brief that produced the docs: read order, what each doc must contain, rules (sync, decide-don't-defer, facts-vs-design, no implementation code, tables over prose), git/PR, reply cap. Reusable as a "planner brief" template |
| Role briefs (`docs/process/*`) and `CLAUDE.md` | Roles, standing rules, reply caps (agents reply in <= 15 lines / 1,500 chars; reports go to disk) |
| `state.md` | Orchestrator's live ledger, updated before each next action |
| Slice briefs, evidence READMEs, errata | The per-slice routing layer and the per-slice memory |

---

# 2. Multi-doc template (architecture + sliced plan + test spec)

For large efforts (rule of thumb: more than 8 parallel agents, more than about 20 slices, more than 2 weeks, more than one toolchain or repo, or an orchestrator
that will be compacted/rotated). Files:

```
docs/plan/00-high-level-plan.md   (input; optional skeleton in section 5.8)
docs/01-architecture.md
docs/02-sliced-plan.md
docs/03-test-spec.md
docs/plan-errata.md               (created when building starts)
docs/briefs/slices/<SLICE>.md     (orchestrator writes one per slice; template in section 4)
docs/evidence/<SLICE>/README.md   (implementer writes; presence = slice landed)
docs/process/*.md, state.md       (process and live state; not part of the three docs)
```

Instruction lines are `>` blockquotes; delete them in the real docs. Lengths are guidance for a large effort, not limits.
`[OPTIONAL: ...]` marks sections that only some stacks or situations need.

## 2.1 `01-architecture.md`

````markdown
# <PROJECT> — architecture

> Document 1 of 3, <date>. Status: design, nothing built. Say what docs 2 and 3 do ("02 cuts this into slices; 03 proves them"). State that IDs are stable once merged. (3-4 lines)

**Authority, highest first:** <owner/stakeholder decisions file> → <current source code and tests> → <high-level plan> → this document → <research notes>

> Ordered list of what wins when sources disagree, naming the actual files. (3-6 lines)

| Prefix in citations | Source | Checked at |
|---|---|---|

> [OPTIONAL: only if the design depends on existing code, other repos, or external docs] One row per source with a short prefix, a location, and the commit/version/date it was verified at. (2-8 rows)

Everything in §2 is **existing behaviour** and carries a citation (`<prefix>:<path>:<line>`). Everything else is **design** unless it carries one.

> Keep this sentence verbatim; it stops agents treating plans as facts. (1 line)

## 0. Conventions: IDs and cross-references

> One table of every ID form used in the three docs, where it is defined, where it is cited. Choose prefixes that cannot collide (each letter space belongs to one kind of thing). Defaults below. (≤ 15 rows)

| Thing | Form | Defined in | Cited from |
|---|---|---|---|
| Decision | `AD-n` | 01 §1 | slice card "Implements", briefs, risks |
| Ground-truth / external fact | `GT-n` (blocks per source: GT-1.., GT-30..) | 01 §2 | body text, errata |
| Change spec to existing system | `CS-x` | 01 §<N> | cards, test "Proves" |
| Risk / owner question / erratum | `RK-n` / `Q-n` / `E-n` | 01 §<N-1> / §<N> / `plan-errata.md` | |
| Section anchor | `architecture §7.8` (numbered headings; never renumber after fan-out, append instead) | headings | cards, briefs |
| Slice | `<LANE LETTERS><n>` as a `####` heading in 02 | 02 §3 | registry "Slice", briefs, branch `slice/<ID>`, evidence dir |
| Test | `<AREA 2 letters><3 digits>`, a numbered **block per slice** with gaps | 03 §3 | card "Tests" (ranges), briefs, test names or `Location` (see 03 §4) |
| Evidence | `docs/evidence/<SLICE>/README.md`; existence = slice landed | 02 §6 | checker, next slice's brief |

## 1. Decisions

> Close every "decide" the high-level plan left open. Group by theme. (20-50 rows total, ~1 per 20-30 lines of eventual architecture)

`Serves` names the owner decision or plan section the row satisfies.

### 1.1 <Theme: shape and build / data / execution / interfaces / UI / quality>

| AD | Decision | Reason | Rejected | Serves |
|---|---|---|---|---|

> One decision per row. Decision: 1-2 sentences stating the choice. Reason: the constraint or evidence that forces it (cite a fact). Rejected: alternatives and why not. Serves: owner decision / plan § it satisfies. (5-10 rows per theme)

## 2. Ground truth (existing behaviour the design depends on)   [OPTIONAL: greenfield projects replace this with a 5-10 row "External facts" list]

| # | Fact | Evidence |
|---|---|---|

> One verifiable statement per row about code, services or platforms that exist today, with `<prefix>:<path>:<line>` or a doc URL + version. Only facts a design choice or a test depends on. Number in blocks per source so rows can be added without renumbering. Facts needed by one slice only go in that slice's brief. (20-60 rows)

## 3. Modules, pins, reuse

### 3.1 Modules and dependency direction

| Module / package / feature dir | Kind | Holds | May depend on |
|---|---|---|---|

> One row per top-level unit a lane can own; "May depend on" lists allowed edges. Below the table: the forbidden edges and rules (no cycles; layers that never import each other; one barrel/index per unit; "a test that uses the shared test kit lives in <place>"). This table becomes lane ownership and gets an automated check. (8-20 rows + ≤ 8 rule lines)

### 3.2 Pins and toolchain   [stack-specific]

| Item | Pin | Note | Status (`verified` / `owed`) |
|---|---|---|---|

> Only what the foundation slice must set: runtime/SDK/toolchain, framework majors, lint/format/test tooling, lockfile policy, with the reason for any non-default. Mark anything not yet checked `owed`; the foundation slice verifies it before depending on it. Do not restate what the manifests will say. (10-25 rows)

### 3.3 Reused / copied code   [OPTIONAL: only when porting or copying]

| Source (`<prefix>:path`) | Destination | Status (verbatim / adapted / pattern only) | Change |
|---|---|---|---|

> One row per copied file group, source pinned at a commit; a manifest file (hashes) is checked in the gate. (≤ 12 rows)

## 4. <Subsystem name>   (repeat for each subsystem; include only those that apply)

> One section per subsystem a lane will own. Lead with the **contract** (names, fields, enums, error codes, file/wire formats, signatures; no function bodies), then behaviour as tables with explicit precedence/order, then failure modes. Every rule here should be testable. (40-150 lines each; once the whole file passes ~800 lines, split per subsystem and keep this file as index + decisions + contracts)

Suggested menu (delete what does not apply):

- **Domain model and rules**: entities, ids, state machines, derived values, validation; pure, no I/O.
- **Persistence and data ownership**: layout, which actor may write which field, atomicity, migrations, source of truth, recovery.
- **Background work and concurrency**: jobs, scheduling, cancellation ladder, resource limits, timeouts.
- **Command / API surface**: table `method | kind (query/mutation/control) | params | result`; operation lifecycle; request identity and idempotency; events; **error-code table** mapped to each outer surface.
- **Module interfaces (ports)**: table `interface | implemented by | used by | methods`; every port gets a fake in the shared test kit; frozen by the contract slice.
- **UI structure**: screens/regions, states (empty/loading/error), navigation, responsive and scale rules, accessibility, the honesty convention for unbuilt controls.
- **Settings, config, health, feature flags**: keys, files, who may write them, preflight probes and the reason shown when something is disabled.
- **Security, privacy, permissions**: threat model, trust boundary, who can do what, audit.
- **Observability**: logging, audit trail, metrics, diagnostics surface.
- **[OPTIONAL: mobile / native] Platform specifics**: permission prompts and denied-state behaviour, background and offline behaviour, OS/version matrix, native-module and dev-build requirements, app-config/store implications, behaviours that only show on a device.

## <N-3>. Changes to existing systems (CS-x)   [OPTIONAL: only when the project modifies code that already exists]

> State the invariant ("existing behaviour is unchanged except the listed deltas"), then how equivalence is proved **once** (baseline captured before any change, normalisation rules, replay of recorded external replies, what a pass means), then one block per change. The method lives here OR in 03 §2, never both. (equivalence ≤ 20 rows; ≤ 40 lines per change)

### How equivalence is proved
| Step | What |
|---|---|

### CS-a <change>
| Aspect | Specification |
|---|---|

> Rows: interface; behaviour; compatibility argument; intended deltas (each with a test id); tests; owning slice. (6-10 rows)

## <N-2>. Contract inventory   **[added]**

| Contract | Kind (type / interface / schema / file format / event / error table) | Defined in | Frozen by slice | Producer(s) | Consumer(s) | Proving test or golden |
|---|---|---|---|---|---|---|

> One row for every surface two lanes share. This is the checklist the contract-freeze slice must finish; anything a lane needs that is not here is a contract proposal. (10-40 rows)

## <N-1>. Risks

| RK | Risk | Containment |
|---|---|---|

> Reviewer-facing. Each containment cites an `AD-n` or a test id, not just prose. (8-15 rows)

## <N>. Owner answers and open questions

| Q | Question | Answer / default taken |
|---|---|---|

> Every item the plan left open gets an answer or a default; end with the line "No owner question is open." or list what is. Questions that can wait go to a queue file with a default. (5-15 rows)
````

## 2.2 `02-sliced-plan.md`

````markdown
# <PROJECT> — sliced plan

> Document 2 of 3, <date>. State that the architecture governs behaviour (`AD-n`, `§n.m`), test ids are acceptance contracts, and "everything here is planned; a slice is done only when its evidence is recorded". Define short names for repos/areas. (3-6 lines)

**Who reads what.**   **[added]**

| Role | Reads |
|---|---|
| Implementer | its card (§3), the `AD-n` and architecture sections named in its brief, its registry rows, §5 |
| Orchestrator | §1, §2, §3 (Needs/Owns), §5, §6 |
| Reviewer | the card + the registry rows + the architecture sections the card cites |

> Three-to-five rows so nobody reads the whole file. (≤ 6 rows)

---

## 1. Phases, milestones and lanes

> Phases: foundation (build/gate/tooling), contract freeze (sequential), parallel lanes, integration (mostly sequential). (one table, 4-6 rows)

| Phase | What | Mode |
|---|---|---|

> Milestones: when each is reached, and any owner checkpoint. Keep history ("waived on <date>") in the orchestrator's state file, not here. (one table, 3-8 rows)

| Milestone | Reached when | Owner checkpoint |
|---|---|---|

> The ownership map. One row per lane; **Owns** lists directory roots (exact file lists live in the cards); each shared file or directory has exactly one owner. Slices listed in run order with `∥` where parallel and file sets are disjoint. (5-12 rows)

| Lane | Area / repo | Owns (exclusive) | Slices, in order |
|---|---|---|---|

> The parallelism protocol, as a short paragraph or bullets: (1) within a lane two slices never run at once unless marked `∥` with disjoint file sets; (2) the contract slice creates every module and index/barrel file (empty) so lanes own disjoint files; (3) a lane may add only new export/declaration lines to its own directory's index, never change an existing name or signature; (4) a change to a manifest, a port/interface, or an existing exported name is a contract proposal (§5). (≤ 10 lines)

## 2. Dependency graph

> ASCII graph of slice dependencies (edges = "Needs"). Derived from the cards; if they disagree, the cards win. (≤ 40 lines)

```
F0 ─┐
    ├─ C1 ─ C2 ─┬─ A1 ──┐
    │           ├─ B1 ─ B2 ─┴─ I1
```

> Then: **critical path** (one line, slice ids), **off-path lanes** (which can slip without delaying the first milestone), **ready on day one after the freeze** (list) and **dispatch order when seats < ready slices**, and the rule for **using another lane's unreviewed work** ("merge that lane's branch at a green commit; never wait for its review; only the consuming unit's review PR waits"). (≤ 15 lines)

## 3. Slices

> One-line legend: size S ≤ 400 changed lines, M ≤ 1,500, L larger; "Evidence" = what the slice records under `docs/evidence/<SLICE>/README.md` beyond the gate result. Aim for slices one agent finishes within ~500k tokens of context; split L slices. **[added]** (1-3 lines)

### Phase 0 — Foundation   (one `###` per phase)

#### <ID> — <title>   (one `####` per slice; the heading text starts with the slice ID; the test registry's `Slice` column must equal it)

| | |
|---|---|
| Goal | One sentence: the capability that exists after this slice. |
| Area · lane · size | `<repo/area>` · `<LANE>` · `S|M|L` |
| Owns | Exact paths this slice may edit: source, **its tests, fixtures, goldens, test-support files, and any manifest/index lines it adds**. Nothing outside this list may be edited without a contract proposal. |
| Needs | Slice ids that must be merged (and non-slice prerequisites such as "a device with X installed"). |
| Parallel-safe | `yes` / `no` + why (name the slices it may run beside). |
| Implements | `AD-n…`, `CS-x…`: the decisions this slice makes real. |
| Exit | 1-4 observable conditions, each backed by at least one test id that would fail if it were false; no restating of the registry's "Proves". |
| Tests | Id range(s), e.g. `XY001–XY012`. |
| Evidence | What to record (commands, versions, outputs, screenshots) beyond the gate. |

> Repeat the table per slice (~10-15 lines each). Foundation and contract slices also carry a "file created / from / adaptation" table. Contract slices' Exit must say "every type, interface and fake in the contract inventory exists; the lane modules exist and are empty". (all cards: ~12 lines × N slices)

## 4. Coverage   (decision ↔ slice)

> Generated by script or linted, not hand-maintained: every `AD-n` and `CS-x` appears in at least one card's "Implements", and every card implements at least one (or is declared infrastructure). (one table or a script)

## 5. Conflict avoidance

| Shared thing | Owner | How others change it |
|---|---|---|

> One row per shared resource: manifests and lockfiles, build/CI config, contract types, every index file and existing exported name, shared test support, golden files, copy manifests, the test registry, plan/briefs. State the **contract-proposal protocol** in one line: a file `docs/evidence/<SLICE>/contract-proposal.md` with the exact signature, reason and every consumer; the orchestrator decides; the contract owner lands it; lanes merge it. Add: "A blocked implementer reports the exact signature it needs and works on what does not depend on it. Nobody creates a duplicate type to get unblocked." (8-20 rows)

## 6. Branches, evidence and process pointers

> Keep to one page. Prerequisites (remote, base branch, toolchain versions, accounts); branch model in 5-8 lines (lane branch, slice branch, merge commits, no stacked PRs, building never waits for review); **what every slice records** (gate result with `--require-slice <ID>`, `docs/evidence/<SLICE>/README.md` with a section "Invariants for a successor" and "Where a successor starts"; its presence marks the slice landed); a pointer to the process docs for roles, review units and checkpoints. Do not restate the review-unit table here. (≤ 40 lines)
````

## 2.3 `03-test-spec.md`

````markdown
# <PROJECT> — test specification

> Document 3 of 3, <date>. Synced to the plan by slice ID and to the architecture by `AD-n`/`§`. Say nothing has run yet. Say the registry is not edited as slices land: existence is derived from source; evidence of execution goes to `docs/evidence/` and a verification record. (3-5 lines)

**Sync rules (enforced by the checker):** every test belongs to exactly one slice; every slice has at least one test; a registered test has at most one implementation, at its `Location`; a test with an unregistered id fails the gate; every test of a landed or `--require-slice` slice must exist.

> Keep these five rules; they are the invariant between all three docs. (≤ 6 lines)

## 1. Design

> Layers: what each layer means and which gate normally runs it. (1 table, 6-12 rows: unit, property, contract/schema, golden, process/CLI, integration, UI-headless, render/visual, end-to-end, device/manual, script, review)

| Layer | Meaning | Typical gate |
|---|---|---|

> Gates: every lane of execution, what runs it, what it needs, and who may run it (resource-constrained lanes such as device, simulator, GPU, paid API or network are **granted by the orchestrator, one at a time**). (1 table, 3-7 rows)

| Gate | Runs | Needs |
|---|---|---|

> Kinds: what "exists" means for each kind of registry row. (1 table, 4-6 rows)

| Kind | Meaning | When its slice has landed or is required |
|---|---|---|
| `test` | one automated test | exactly one implementation at `Location` |
| `suite` | carried-over tests | `Location` exists and holds at least `n` |
| `script` | a script run by the gate | the file exists and the gate runs it |
| `manual` | executed by a person/agent, recorded | the evidence file in `Location` exists |
| `review` | a recorded independent review | the evidence file exists |

> Hard rules, as a bullet list: no test silently replaces an expected value (re-bless only through an explicit switch and a reviewed diff); no mock inside the system under test where a recorded or fake external is possible; a lane that did not run is **unexecuted**, never passed; a flaky test is a defect (retries off); tests that use the shared test kit live in <place>. (5-10 bullets)

## 2. Fixtures and test data

> Catalogue every shared fixture with a short code used in the registry's `Fixture` column. (1 table, 5-15 rows: code, what it is, how it is produced/recorded, used for)

| Code | Fixture | Source / how produced | Used for |
|---|---|---|---|

> Describe each non-obvious test double once (recorded-reply stub, fake external process, fake port implementations, time/clock/permission fakes): behaviour, how a test selects a script/scenario, what it refuses. (3-10 rows; if you have a change-equivalence method in 01 it is **not** repeated here)

> Goldens: where each lives and how it may be changed. (1 table)

| Golden | Where | Re-bless |
|---|---|---|

## 3. Test registry

> One table per area (foundation, each subsystem/lane, integration). The `Proves` cell is one behavioural sentence a failing test would contradict. Number tests in a block per slice, leaving gaps. (1 row per test; ~5-15 rows per slice)

| ID | Kind | Slice | Gate | Layer | Fixture | Location | Proves |
|---|---|---|---|---|---|---|---|

> `Location` = `<area>:<relative path>`. Where the project forbids ids in test names, add a `Title` column holding the behavioural test title and let the checker match on `Location` + `Title`. For every registered slice, include at least one row whose failure would falsify each Exit clause.

## 4. Gates and the registry checker

> Gate script(s): numbered steps, each with the exact command and what makes it fail; one gate per build tree; a slice passes steps 1..k with `--require-slice <ID>` before it merges. Name which steps need a granted lane. A gate step must not depend on a slice that is not yet built (state the interim behaviour). (1 table per tree, 8-14 rows)

| # | Step | Fails when |
|---|---|---|

> Checker rules: source of the registry (tables whose header starts with `ID`), required columns, id grammar, how `Slice` is validated against the plan's headings, `Location` forms, **existence derived from the source (no status column)**, "landed" = the slice's evidence README exists and from then every run requires its rows, `--require-slice`, a flag that prints the selection for each gate lane (and an empty selection is an error). Exit codes. (1 table, 8-12 rows)

> [OPTIONAL: skip the script for a small effort; see section 3.1 of this report for the lighter grep check]

## 5. Procedures   [OPTIONAL]

> Step lists for evidence that cannot be a unit test: real-device/simulator run, visual evidence capture, real-service/real-data runs, owner acceptance. State what is recorded and where, and that an unrun procedure is listed **unexecuted**. (≤ 15 lines each)

## 6. Done rules

> Slice done = gate green with `--require-slice <ID>` and recorded, listed evidence exists. What is *not* a gate (coverage, mutation). A **Never** list: never mark a skipped lane passed; never weaken a golden to make a test pass; never change a recorded baseline; never mock inside the system under test. (≤ 10 lines)
````

---

# 3. Single-doc template (3-6 parallel agents, about a week)

This template is derived by cutting the multi-doc set down and keeping the parts that make fan-out work; the test-id form `S-n/Tk` and the merged section 10 are
**[added]**. Use when: at most about 6 parallel agents, at most about 12 slices, one repo and toolchain, one orchestrator session that will not be compacted, and the plan
fits in one read (aim for 250-500 lines, <= 600). The repo already has this shape for small work: `docs/plans/address-suggestions-list/01-plan-and-test-spec.md`
(219 lines: In plain terms / What the code does today / Decisions / Design / Rules / Test spec / Slices / Gates, owner checks, risks / Plan review answered).
That file lacks what a *parallel* fleet needs: per-slice **Owns**, **Needs** edges, a frozen **contracts** section and a **conflict** table. Those are added below.

````markdown
# <FEATURE> — plan (decisions, contracts, slices, tests)

**Status:** <draft / reviewed / building>. **Branch:** `<branch>` off `<base>` at `<commit>`. Related: <links>.
IDs: decisions `D-n`, slices `S-n`, tests `S-n/Tk` (the test id carries its slice), contracts `C-n`. IDs never change once building starts; new ones are appended.

> Header: status, branch/base commit, ID forms, links to bug report/spec/design. (4-6 lines)

## 1. Goal and scope

> What exists after this work, in plain words; the one observable success check; non-goals; hard constraints (platforms, deadlines, things that must not change). This replaces the separate high-level plan. (10-20 lines)

## 2. What exists today (checked at `<commit>`)   [OPTIONAL: skip if greenfield]

> Only the facts that change what a slice builds, each with `path:line`; correct wrong assumptions here (e.g. "the bug report says X; the code does Y"). (5-30 lines)

## 3. Decisions

| D | Decision | Reason | Rejected |
|---|---|---|---|

> One row per decision, 1-2 sentences each; close every open design choice, with a default if the owner could still overrule it. Below the table: **Deliberate, not to re-flag** (bullets) for choices reviewers should not reopen. (8-25 rows)

## 4. Modules and ownership

| Module / dir | Purpose | May depend on | Owner (lane or slice) |
|---|---|---|---|

> One row per directory or file group that changes; mark **shared files with a single owner** (manifests/lockfiles, config, route/navigation registry, store/index files, shared test setup and factories). Add the forbidden edges as bullets. (8-25 rows)

## 5. Contracts   (frozen by slice S-0 before lanes start)

| C | Contract (type / interface / schema / event / file format) | Signature or shape | Producer | Consumers | Fake / golden |
|---|---|---|---|---|---|

> Every surface two slices share, at signature level, plus its fake or example data so consumers can start immediately. If the plan has no cross-slice surface, write "none: slices touch disjoint files" and say why. (3-15 rows)

## 6. Behaviour (design)

> Only the rules agents could implement differently: state tables with precedence, error-to-outcome mapping, data layout and who may write it, async/cancellation rules, UI states (empty/loading/error/denied), platform-specific behaviour **[OPTIONAL: mobile: permissions, background/offline, OS versions, native modules]**. Tables over prose; no function bodies. (40-150 lines total)

## 7. Slices

### 7.1 Lanes and order

| Lane | Owns (exclusive) | Slices in order |
|---|---|---|

> Dependencies in one line each ("S-3 needs S-0, S-2") plus **ready now** (list), **critical path**, and the dispatch order if agents are fewer than ready slices. (≤ 15 lines)

### 7.2 Cards

| Slice | Goal | Owns (exact paths incl. tests/fixtures) | Needs | ∥ safe | Implements | Exit (observable) | Tests |
|---|---|---|---|---|---|---|---|

> One row per slice, 3-8 lines of cell text. S-0 is the contract/skeleton slice: it creates every new module and index entry empty, the shared test setup and fakes, and nothing else. Every file any slice edits appears in exactly one Owns cell. (≤ 12 rows)

## 8. Tests

> One short paragraph of rules: what "red" means, no silent re-blessing, an unrun check is *unexecuted*, never passed; the gate command per slice and for the whole change.

| Test | Where (file `::` behavioural title) | Proves | Decision / contract |
|---|---|---|---|

> One row per test; id is `S-n/Tk`; "Where" is enough for a reviewer or a grep to find it. 30-80 rows. Manual / device checks go in a second table (check, steps, expected, who runs it, evidence).

## 9. Conflict rules

| Shared thing | Owner | How others change it |
|---|---|---|

> Same table as the multi-doc plan, ≤ 8 rows, plus the contract-proposal rule in one line.

## 10. Gates, risks, open questions

> **Gates** (exact commands; what an agent runs per change vs before pushing), **Resource lanes** (anything only one agent may use at a time, and who grants it), **Risks / not verified** (≤ 8 bullets, each says what could not be checked), **Open questions** table `Q | question | default taken` (≤ 8 rows; end "No question blocks the build." or say which does).

## 11. Corrections found while building   [append during the build]

> Dated rows: found in slice / the plan said / what is true / text corrected. Correct the plan in place as well. (0-10 rows)
````

## 3.1 What the single-doc drops, and why that is safe at this size

| Multi-doc element | Single-doc treatment | Why it is safe for 3-6 agents / ~1 week |
|---|---|---|
| Three files plus errata file plus separate high-level plan | One file; goal/scope folded in as section 1; corrections as section 11 | The whole plan is ~10-15k tokens: the orchestrator and every agent can read it all, so random-access addressing (`§7.8`) is unnecessary |
| Authority order, citation-prefix table | One line in the header; `path:line` inline | One or two sources |
| ID table with six ID families | `D-n`, `S-n`, `S-n/Tk`, `C-n` | A test id that carries its slice removes the registry's `Slice` column and the need for a sync checker |
| Ground-truth section (~50 facts) | Section 2, <= 30 lines, only facts that change a build | Fewer integrations with existing code |
| Pins, copy manifest | One stack line (or none); no manifest | No foundation slice to bootstrap a toolchain |
| Upstream-change specs plus equivalence method | Dropped (keep as one section in 6 only if modifying legacy behaviour) | Behaviour-preservation is argued per change, not as a standing method |
| Eight subsystem specs (~1,000 lines) | One Behaviour section, only non-obvious rules | Fewer lanes means fewer inter-lane contracts to pre-specify; the orchestrator can answer a question by message |
| Contract freeze as two slices (external and internal) | One slice S-0 | One boundary, one repo |
| Dependency graph, critical path essay | One line per slice plus "ready now" | <= 12 slices |
| Coverage tables (decision to slice) | Dropped; the "Implements" cell is checked by eye | <= 25 decisions |
| Milestones, 21-unit review table, branch model | Dropped; team default (one PR per slice or one per lane, one final review) | At most two reviewers |
| 360-row registry with Kind/Gate/Layer/Fixture/Location | <= 80 rows: test / where / proves / decision | Layers and gates collapse to one gate command |
| Registry checker script, "landed = evidence README exists" | Optional grep check (every `Where` exists; every slice has >= 1 test); PR description records gate output | A script costs more than it saves under ~100 tests |
| Per-slice evidence README, "Invariants for a successor" | PR description / short note | Agents are rarely rotated inside a week |
| Risks and owner Q&A as separate sections | Merged into section 10 | Short lists |

**Never dropped, at any size:** per-slice **Owns** with disjoint file sets; contracts frozen **before** fan-out (even if only S-0 stubs and fakes); falsifiable **Exit**
plus test rows each slice's brief can cite; decisions with **Rejected**; explicit **Needs** edges; a default for every owner question; "unexecuted is not passed".

**Graduate to the multi-doc set when:** more than 8 agents are parallel; more than 20 slices or 6 lanes; the work spans more than 2 weeks or an orchestrator
compaction/rotation; two toolchains or repos; the plan passes ~600 lines; you modify an existing system and need an equivalence method; or the first review round
returns contradictions between sections.

---

# 4. Slice brief template

The briefs in `docs/briefs/slices/` are consistent: 34 of the 36 files start `# Slice brief — <ID>, <title>` (the other two are a fix-round brief and a continuation
note) and open "You are the implementer for this slice. Read `docs/process/implementer.md` first; it points to everything else." Then a two-column table (rows seen, by
frequency: Slice 30, Decisions 30, Repo/base/branch 31, Tests 31, Report 31, PR 31, Seat 34, Model/GPU lane 34, Standing rules 35, Read first 17, Gate 11), then
`## Things this slice must get right` (about 11 briefs), `## Decisions already taken` (about 6), `## Owed before ...` (2), `## Do not` (2), and a closing reply cap. 18-44 lines.
They **copy no text** from the plan; they carry paths.

````markdown
# Slice brief — <SLICE>, <title>

You are the implementer for this slice. Read `<implementer role brief path>` first; it points to everything else.

| | |
|---|---|
| Slice | **<ID>**. The card is the "<ID>" heading of `<plan path>` (lane <LANE>) |
| Repo, base, branch | <repo path>, base `<lane branch>` (<predecessors> merged), branch `slice/<ID>` |
| Worktree / seat | <path>, already on `slice/<ID>` cut from `origin/<lane>` |
| Decisions | the card's "Implements" line (<AD ids>) and the architecture sections they cite: <§ list> |
| Tests | <id range> in `<test spec path>`; the gate is <test spec §> |
| Needs / read first | <predecessor slice evidence>: `docs/evidence/<pred>/README.md`, sections "Invariants for a successor" and "Where a successor starts"; <contract artifacts, fakes, example data> |
| The contract you build on | <paths to frozen types / schemas / fakes; "read, do not change"> |
| Standing rules | `<project instructions file>`: <3-5 headline rules, e.g. comments only the why; no process ids in code; never touch <protected apps/data>; no stash; commit conventions> |
| Resource lane | <e.g. device/simulator/GPU/API lane: granted / not granted; what that allows and forbids> |
| Gate | `<exact command incl. --require-slice <ID>>` |
| Report | `docs/evidence/<ID>/README.md` |
| PR | **none.** Push `slice/<ID>` and reply. (or: open against `<base>`, never merge) |

## Things this slice must get right

> 3-6 bullets: invariants, traps and boundaries that are not obvious from the card (what this slice must NOT do because another owns it; interface facts a predecessor learned; the one place a past defect lives). Each should point at the card line, `AD-n`, erratum or evidence section it comes from.

## Decisions already taken (apply them)

> Numbered answers to questions a predecessor or the orchestrator already settled, so the implementer does not stop to ask. One line each; say "the plan text is being corrected" where relevant.

## Owed before you rely on it   [OPTIONAL]

> Checks the planner could not make (a library's behaviour at the pinned version, a tool's flag, a platform limit). Record each result in the report; if one fails, write a contract proposal and continue with what does not depend on it.

## Granted additions outside the card's Owns   [OPTIONAL]

> File, reason, who granted it. Anything not listed here and not in Owns is a contract proposal.

## Do not

> Files not yours, applications or data not to touch, runs not to start, PRs not to open.

Reply in 15 lines at most (1,500 characters); each decision one line with your recommended answer; everything else in the report.
````

**Standing-order text that makes the brief work** (from `implementer.md` and the agent definition, to be copied into the project's implementer role brief, not into each slice brief):
read order after any restart; work only in your seat and branch; edit only files the card owns; refute wrong briefs with `file:line`; strict TDD with the red quoted in the
commit body; contract proposals instead of duplicate types; `SEAM` markers for unconnected spots (removed before merge); two-part report (full report committed; reply
<= 15 lines / 1,500 characters with refutations in full); fix rounds via the `receiving-code-review` skill, one commit per finding, one PR comment mapping finding to commit.

## 4.1 Variants seen in `docs/briefs/slices/`

````markdown
# Fix-round brief — <SLICE>, <unit>, round <k>          (C1-fix-1, A1-fix-1, DT-fix-1)

You are the fixer for <PR>. <Fresh implementer? say why: previous agent retired for context.> Read `<implementer role brief>` §Fix rounds first (invoke the receiving-code-review skill before acting and say so in your report).

| | |
|---|---|
| Review | aggregate path: counts; which finding ids are yours and which belong to the orchestrator |
| Repo, branch, seat | <repo>; branch `unit/<n>` (PR head `<sha>`); seat <path>; push to `origin unit/<n>`; do not merge |
| Learn the work from | the slice's evidence README, the contracts/docs it changed, the original slice brief and card, errata rows |
| Gate | exact command; resource lane status |
| Reports | `docs/evidence/<SLICE>/fix-round-<k>.md`; one PR comment mapping finding id → commit → proving test |

## Decisions already taken (the aggregate asks for a decision; here it is)
## Ordering (from the aggregate)     > e.g. schema-byte changes first, then re-bless once, then pin hashes

Reply in under 20 lines: new head SHA, comment URL, report path, any hash/contract that changed, refutations that need a decision.
````

````markdown
# Continuation note — you are taking over a seat from a builder that was stopped part-way          (continuation.md)

1. Look before you touch: `git status`, `git log --oneline origin/<base>..HEAD`, `git diff`; read every commit and every uncommitted hunk.
2. Never destroy it: no reset --hard, clean, checkout ., stash drop, branch switch/delete in the seat; undo by new commit or edit.
3. Existing commits were made to the same brief: keep, re-verify with their tests, push as soon as the first verified batch is green.
4. Uncommitted edits are unvetted: keep what a test you saw fail first proves; finish or drop the rest.
5. Then carry on with the original brief exactly; say in the report what you inherited and what you changed.
````

````markdown
# Review brief — <PR/unit>, round <k>          (written by the review orchestrator; paths only)

| | |
|---|---|
| Under review | PR URL, head SHA, base, read-only checkout path, the files/diff |
| Must satisfy | owner decisions, planning brief, high-level plan, project rules (by path) |
| Reviewer focus | table: reviewer / one-paragraph focus (e.g. A ground truth and accuracy; B architecture and contracts; C plan-fit: ownership, registry, process) |
| Gate runner | exactly one reviewer runs the full gate; others read-only |
| Output | `<reviewer>-round-<k>.md`; aggregator writes `aggregate-round-<k>.md` + leftovers |
| Finding format | `### <id> [blocker|major|minor] [defect|quality] <title>` with Where / Claim / Evidence / Direction; below ~80% confidence → "Could not verify" with the probe |
| Rules | read-only; no builds unless named; verify before claiming; reply in ≤ 20 lines |
Delta rounds: resume only the reviewers the aggregate marks `yes`, new brief names the fix comment, new head and settled disputes.
````

**Rules of thumb for writing briefs** (observed): paths not text; written to disk and committed before the agent is spawned; the spawn prompt is one line with the
brief's path; every "Decisions already taken" item removes a reason to stop and ask; reply caps protect the orchestrator's context; the brief names the *report path*
so the next brief can say "read it first".

---

# 5. Recommendations

## 5.1 How to package this as a skill

- One skill, three outputs chosen by size: `multi-doc` (the three files), `single-doc` (one file), plus `slice-brief` generation. SKILL.md holds the decision rule from section 3
  (agents, slices, weeks, repos) and a short interview for the inputs the docs assume: owner decisions, constraints, existing-code facts, the resource lanes (device/simulator/network/API quota).
- Ship templates as files: `multi-doc/{01-architecture,02-sliced-plan,03-test-spec}.md`, `single-doc/plan.md`, `slice-brief.md` (+ `fix-round.md`, `continuation.md`, `review-brief.md`),
  `plan-lint.md` (5.3), `id-conventions.md` (the section 1.4 table), and optionally `planner-brief.md` and `00-high-level-plan.md` (5.8).
- Keep the skill about **producing the docs**. Process (worktrees, review fan-out, handoff, rotation) is covered by the existing `agent-fleet-orchestration`,
  `react-native-code-review`, `react-native-plan-review` and `defect-fanout` skills; point to them instead of copying process into the plan (which is what bloated plan s6 in the source).
- Make the **plan review a step in the skill**: run `/react-native-plan-review` (architect, quality and reality-check lanes) before any fan-out. Those three lanes map onto the source's A (ground truth), B (architecture/contracts), C (plan-fit) lanes.
  The source's round 1 found 2 blockers and 20 majors; fan-out on an unreviewed plan would have built them.

## 5.2 Changes I recommend over the source's practice **[added; not observed]**

1. **One source of truth for Owns:** cards own exact paths; the lane table lists directory roots only; a 20-line script (or the lint) checks that no two slices that can run concurrently overlap.
2. **A contract inventory table** in the architecture, so the freeze slice has one checklist (the source scatters contracts across s4.2, s6.2, s7.2, s7.8, s8, s11).
3. **Prefixes that cannot collide** (`AD`, `GT`, `CS`, `RK`, `Q`, `E`; slices as lane letters); keep "IDs never change once building starts".
4. **Generate coverage tables**, do not hand-write them.
5. **Freeze contracts as executable artifacts** (schemas, type files, golden examples) and have the prose cite them; every prose/contract drift in the errata (E11, E13, E14, E17, E18, E21) came from restating.
6. **Pins:** policy plus version-sensitive pins marked `verified`/`owed`; manifests become authority when the foundation slice lands.
7. **Slice size against agent context:** the source's M/L slices used 400-820k tokens, and each fix round on a retired agent costs a fresh agent about 100k to ramp up. Aim for slices that finish in about 500k; require the evidence README to end with "Invariants for a successor" and "Where a successor starts".
8. **History and process out of the plan:** milestone waivers, branch model, review-unit tables go in the process doc and `state.md`.
9. **Add a reading map** to the plan header so no agent reads the whole set.
10. **Describe each test method once**, in the test spec.
11. **Split the architecture per subsystem** past ~800 lines (index file keeps decisions, contracts, conventions).

## 5.3 Plan-lint checklist to run before fan-out (derived from the round-1 findings and the errata)

1. Every card's **Owns** lists every file it edits, including tests, fixtures, goldens, test-support, manifest/index lines (AGG-r1-19, -47; E12, E16, E22).
2. No two slices that may run concurrently own the same path; every shared file has exactly one owner and a change path (AGG-r1-48, -49).
3. Every module a card names is created by the skeleton slice or by that card; the skeleton slice's Exit says "lane modules exist and are empty".
4. Every interface two lanes share has a signature-level definition, a freeze slice and a fake (AGG-r1-12; E17, E18, E21).
5. Every `AD-n` is implemented by at least one slice and every slice implements at least one (AGG-r1-20).
6. Every Exit clause has a test that would fail if it were false (AGG-r1-57); every test is in exactly one slice; every slice has at least one test.
7. Dependency graph, critical path and "ready on day one" are re-derived from the cards' Needs (AGG-r1-21, -46); a dispatch order exists when agents < ready slices (-45).
8. **Run the gate on a clean checkout at the point each slice merges**: no step may depend on an unbuilt slice (AGG-r1-52; E4); each gate lane's filter selects at least one test (AGG-r1-18).
9. Every external/library/tool assumption is verified or marked `owed` with an owning slice (E1-E10; the `rmcp` check).
10. Every fact about existing code carries a citation; reviewers sample them.
11. A rule appears once; grep for the same sentence in two docs (equivalence method, offsets example in section 1.5).
12. Manual-only criteria are registered as `manual` with an evidence path; unexecuted lanes are labelled as such.
13. Every resource-constrained lane (device, simulator, GPU, paid API, shared port) is named and has a grantor (AGG-r1-09).
14. The branch/merge model covers the foundation phases and cross-lane use without waiting on a review (AGG-r1-22, -44).
15. Every owner question has a default; nothing blocks on a human.

## 5.4 When the three-doc set is too much (and when the single doc is too little)

See section 3.1 for graduation triggers. Common failure at small scale: copying the multi-doc *shape* (milestones, review units, registry columns) into a 3-agent job.
Common failure at large scale: one long document with no lane table, no contract inventory and no stable section numbers, so briefs cannot point anywhere.

## 5.5 Risks of reuse that no template fixes

- The source's enforcement came from **scripts** (registry checker, copy manifest, unsafe inventory, gate script), not from the docs. Docs alone give conventions; they do not stop drift. Decide per project which two or three checks are worth scripting (suggested: Owns-overlap, registry sync, gate runs on a clean checkout).
- Dense tables with 400+ character cells hid contradictions between rows. Keep one fact per cell where a reviewer must compare rows.
- The source's plan still needed 25 errata. Budget for an errata loop and for rotating agents; do not treat the plan as frozen text.

## 5.6 Adapting to this React Native / Expo repo (the next project)

What already exists here: plan sets under `docs/plans/<feature>/` named `01-...-architecture.md`, `02-...-implementation-plan.md`, `03-...-test-spec.md`
(`byo-supabase-provisioning` 492/462/436 lines; `ai-pipeline-refactor` 877/1,015/1,585 lines), and a single-doc plan (`address-suggestions-list/01-plan-and-test-spec.md`, 219 lines).
The `react-native-typescript-pro` agent is written to read an "implementation plan and architecture document" at paths of that form, and the repo has plan-review and
fleet-orchestration skills. So: keep the `docs/plans/<feature>/` location; decide whether doc 2 keeps the repo's "implementation-plan" file name or the new "sliced-plan" name (owner call; either works if the agents are told). The existing implementation plans use phases plus appendices (file manifest, "existing files modified"); the template's delta is **per-slice Owns, Needs edges, lanes, a contract-freeze phase, the conflict table and the registry sync**.

Mapping the template's ownership ideas onto this repo (from `CLAUDE.md`):

| Template concept | RN/Expo analogue |
|---|---|
| Lane = directory roots | `src/features/<feature>/` (already isolated; callback isolation rule: features never import the store), `app/(form)/*.tsx` route wrappers, `src/lib/store` slices, `src/lib/services` persistence, case-management SQLite layer, PDF/export |
| Coordinator-owned shared files (single owner, serial changes) | `package.json` + lockfile, `app.config.js` (native deps need a dev build), the SQLite schema/migration list and `DATABASE_VERSION` (one writer at a time), the store root/slice registry, `constants/Routes.ts` and `app/(form)/_layout.tsx`, every feature `index.ts` barrel (additive lines only), `jest.setup.js` and root `__mocks__/`, test factories such as `createMockCase` (update the factory first) |
| Skeleton slice (create modules empty) | S-0: new feature dir + barrel, store slice stub, route stub, `Case`-style type additions, factory/fixture updates, mocks |
| A slice's Owns for a vertical change | enumerate the layers the repo already lists in "Adding a Field to the Case Entity / a Location" (type, SQLite + mappers, cloud sync push mapper **and the second row mapper**, factory, UI/PDF); a card that omits one will silently drift, exactly like errata E22 |
| Gates | `npx tsc --noEmit` and `npm test -- <pattern> --silent --forceExit` per change; `npm run check:all` before a push |
| Resource lanes | iOS simulator (one at a time), Metro port, EAS builds, real device for capture surfaces; register device checks as `manual` rows with an evidence path |
| Standing rules row in briefs | point to `CLAUDE.md` (worktree rules: no `git stash` with live worktrees, never `rm -rf` a junction, `npm ci` not `npm install`; Co-Authored-By and Claude-Session trailers; subagents commit) |
| Contract inventory | route params, store slice shape, persisted `formData` JSON shape, sync row types, Zod schemas, error classes |

**Conflict to resolve first:** the source keys its test registry on ids embedded in test function names (`fn se004_…`). This repo's `CLAUDE.md` forbids plan, ledger and
test-spec ids in code comments, JSDoc and **test titles**, and the address plan states "test titles carry no ids". Options: (a) the registry's `Location` is
`path :: behavioural title` and the checker matches on that (simple Jest title grep, or `jest --listTests` plus a regex over the file); (b) a documented exception in
`CLAUDE.md` for registry ids; (c) skip the checker at single-doc scale. I recommend (a) for multi-doc and (c) for single-doc. The templates above already allow a `Title` column.

## 5.7 Open uncertainties in this analysis

- Round-1 review numbers come from the aggregate; I did not re-verify them against the review lanes' files.
- Errata categories (10 / 8 / 7) are my classification and some rows fit two categories.
- Token figures for the docs and agents are estimates from measured samples and the repo's own ledgers.
- I could not see whether lane Owns conflicts persisted after approval beyond what the errata record; the 22 per-slice fix rounds and review findings were not read.

## 5.8 Optional: the two inputs the multi-doc set assumes

**Planner brief** (derived from `docs/briefs/fable-planning-brief.md`, 122 lines): job and output paths; read order (owner decisions, high-level plan, fact maps, source code,
a prior plan in the same format); what each document must contain (the section lists in 2.1-2.3); rules (sync: every slice >= 1 test, every test in one slice, every
`AD-n` referenced; decide don't defer with defaults; facts carry `path:line`, design is labelled; no implementation code; tables over prose; read-only outside the docs;
reviewed adversarially against the code); git/PR shape; reply cap (<= 30 lines).

**High-level plan** (derived from `docs/plan/00-high-level-plan.md`, 219 lines; the architecture closes its open items): 1 Mission / 2 Repos and components / 3 Settled decisions (summary;
the owner file is authoritative) / 4 Facts the design must respect / 5 System shape (components, data and files, UI surfaces, automation surface) / 6 Changes to existing
systems / 7 Non-functional requirements / 8 Testing strategy / 9 Delivery shape (contract-first, lanes, per-slice fields) / 10 Out of scope, doors left open / 11 Open items with defaults.
