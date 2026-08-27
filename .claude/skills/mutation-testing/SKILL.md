---
name: mutation-testing
description: Use when writing or reviewing a test that claims to pin a contract, when a review fix adds a pin test, when adjudicating a disputed test claim, or when a suite is suspected of passing for the wrong reasons. Verifies that tests actually fail when the behavior they guard breaks. Falsifiability over coverage.
---

# Mutation Testing

A test that cannot fail is not a test. Coverage measures execution; mutation measures **protection**.
This is the manual, surgical form — targeted probes, not an exhaustive tooling run.

**Core principle:** for every pin test, name the production change that would make it fail. If you
cannot name one, the test asserts nothing. If you can, prove it.

---

## When a probe is mandatory

1. **Every test added to close a review finding.** The most common review error is rubber-stamping a
   test that passes via a different path than it claims.
2. **Every replacement pin.** When a fix swaps one assertion for another, the replacement must itself
   be verified — otherwise you have exchanged one unfalsifiable assertion for another.
3. **Every refutation of a review-suggested fix shape.** Evidence means a probe: show the suggested pin
   misses the bug class, or that yours catches one theirs does not.
4. **Any test whose subject has guard-heavy control flow** — early returns, clamps, defaults, setup
   shims. These are the false-coverage traps where inputs silently route around the branch under test.

## The probe cycle

1. **NAME** the mutation: the specific production change this test must catch.
2. **APPLY** it — in a probe-dedicated worktree. Never a shared tree.
3. **RUN** only the test(s) claiming to pin this behaviour.
4. **VERDICT**, taken from the runner's **exit code**:
   - Test fails with a message about the mutated behaviour → **KILLED**. The pin is real.
   - Test passes → **SURVIVED**. The test does not pin what it claims. Trace the input by hand through
     every conditional to find which guard, clamp, shim, or default it actually took. Fix the *test* or
     the *claim* — never the mutation.
   - Test errors unrelatedly → the probe is invalid. Pick a cleaner mutation.
5. **RESTORE** and **prove the restore**: the test is green again AND `git diff` against the probe base
   is empty.

**A probe derives its verdict from the runner's exit code, never from the presence or contents of a
report file. A missing report is an ERROR, not a result.** A harness that infers SURVIVED from a stale
file is not reporting a weak test — it is reporting the *opposite of the truth* about the one signal
mutation testing exists to produce. This has happened twice in one milestone, in two independent
packages. Any runner that writes a report file can do it.

A scripted restore asserts its own success or it did not happen. A silent no-op restore plus a report
claiming "restored" is how a live mutant ships.

## Isolation

- **Probes run in their own worktree**: `git worktree add <scratch>/mutation-probe-<topic> -b probe/<topic> <head>`.
  Concurrent probes in a shared tree corrupt each other's runs and leave live mutations across round
  boundaries.
- **Never blind-restore on a shared tree** to undo a probe. Inside your own probe worktree, restores
  are fine — that is what it is for.
- A green count from a shared tree is trustworthy only if no source mtime moved mid-run.
- Probes are never committed. Prune the worktree when the round ends.

Full hazard rules: `.claude/skills/fleet-orchestration/hazard-playbook.md`.

## Choosing mutations — highest yield first

- **Boundary condition** — flip `>` and `>=`, off-by-one the limit, swap min and max
- **Guard or early return** — delete the guard; invert its condition
- **Error handling** — make the happy path throw; make the error arm return success
- **Discriminated switch** — route one variant to another's arm; delete a case
- **Default or fallback** — return the fallback unconditionally
- **Cleanup or teardown** — delete the cleanup call
- **Numeric logic** — negate a term; replace a computed value with a constant
- **State transition** — skip a transition; allow an illegal one

**One mutation per probe.** A probe with two mutations that gets killed tells you nothing about which
one the test caught.

## Report format

```
MUTATION PROBE: <short title>
Target: <production file:line — function/branch>
Claimed pin: <test file:line — test name>
Mutation applied: <exact change, 1-2 lines>
Result: KILLED | SURVIVED        (from exit code <n>)
  If KILLED: <the failure message proving the right assertion fired>
  If SURVIVED: <the path the input actually took — file:line trace>
Restore: verified byte-identical (<command used>)
```

**SURVIVED results are findings, not embarrassments.** A survived probe caught the exact class of
defect the whole pipeline exists to catch: a suite that lies. Each is a HIGH-severity finding, and the
most valuable output this system produces.

Zero survivors is a valid and valuable result. Say so plainly.

## Anti-patterns

- **The string-presence trap** — grep-style assertions on scripts, prompts, or config counterfeit
  falsifiability. The observable is behaviour, never text. A test asserting a source file *contains* a
  pattern stays green over a dead import.
- **The change-detector trap** — a snapshot or constant assertion can fail on any change and still
  protect nothing. Mutation-check it: does it fail on the *meaningful* change?
- **Coverage as proof** — 100% line coverage with zero killed mutants is decoration.
- **Widening tolerances to make probes pass** — if a precision tolerance has to drop for the suite to
  survive an honest mutation, the assertion was the problem.


---

# Project hazards — THIS REPO

Everything above is architecture-agnostic. Everything below is specific to this codebase and was
learned by breaking things. It moved here when the standalone `dt-mutation-tester` seat was retired
and probing became the job of whoever is already reading the code — which means **you**, if you hold
Bash and are about to run a probe.

## Rust probes need four junctions before they can build

**⚠ THIS REPO: a fresh worktree cannot build Rust until you junction four gitignored paths in.**
`git worktree add` checks out tracked files only, and the Rust build requires
`src-tauri/binaries/` and `src-tauri/resources/`, neither of which is tracked. Symptom: a probe
against any Rust pin fails to build and looks like a mutation result. **It is not a result — it is a
broken harness, and reporting SURVIVED or "cannot verify" off it is the exact
opposite-of-the-truth failure this file warns about twice below.** Before the first Rust probe, from
your worktree root, junction all four (Windows, no elevation needed):

```bash
cmd //c mklink //J "src-tauri\\binaries"           "<MAIN_CHECKOUT>\\src-tauri\\binaries"
cmd //c mklink //J "src-tauri\\resources"          "<MAIN_CHECKOUT>\\src-tauri\\resources"
cmd //c mklink //J "node_modules"                  "<MAIN_CHECKOUT>\\node_modules"
cmd //c mklink //J "src-tauri\\sidecar\\node_modules" "<MAIN_CHECKOUT>\\src-tauri\\sidecar\\node_modules"
```

Then prove the baseline builds before mutating anything — `cd src-tauri && cargo check --tests`,
exit code 0. **Junctions are shared, not copies:** never run `npm install`, `npm ci`, or anything
that writes into `binaries/` from a probe worktree — you would be mutating the main checkout through
the link. Read and build only. Background: `docs/tasks-todo/task-x-worktree-cannot-build-rust.md`.
Rust probes also cannot use bare `cargo test` here (`STATUS_ENTRYPOINT_NOT_FOUND`) — drive
`cargo test --test <binary>` against the integration binaries under `src-tauri/tests/`.

## Mirror-homed pins: mutating canonical is structurally unkillable

**⚠ MIRROR-HOMED PINS: mutating canonical is STRUCTURALLY UNKILLABLE — do not do it.**
This repo mirrors pure functions into `src-tauri/tests/*.rs` as duplicated copies, because the
agent-shell lib cannot be unit-tested on Windows (WebView2, `STATUS_ENTRYPOINT_NOT_FOUND`). A mirror
test exercises **its own duplicate**, never the canonical source. So mutating canonical
(`agentshell.rs`, `services/mod.rs`, the serde enum) and running `cargo test --test <mirror>` yields
a green suite and a **SURVIVED verdict every single time, for every mirror pin** — and nothing else
reds either, because `AGENTS.md` states the canonical↔mirror sync contract is comment convention with
**no automated enforcement**. That SURVIVED is narrowly true (the pin really does not guard the
canonical file) and completely misleading: it is a property of the pattern, not a defect in the test.
An implementer handed it will chase a non-bug or "fix" it by weakening something.

**Protocol for a mirror-homed pin — both halves, same pass:**

1. **Mutate the mirror's own duplicated copy** inside the test file. That is the only mutation the
   suite can observe, and killing it proves what a probe can honestly prove here: the assertion
   discriminates.
2. **Prove the canonical linkage separately** with a byte-compare of the duplicated functions against
   canonical (one `diff`/`git diff --no-index` on the extracted bodies). The link is convention-only
   and otherwise unverified, so a probe that skips this reports on a copy that may already have
   drifted from the code that ships.
3. **Report a canonical-mutation SURVIVED as `mirror-pattern scope, not a finding`** — never as a
   surviving mutant. If your brief names a canonical file as the mutation target for a mirror-homed
   pin, that brief is wrong; say so and probe per (1)+(2).

Known mirror-homed pins in the current plan: **#27** (serde `Result` variant — the mirror duplicates
the whole tagged enum), **#34** (agentshell ensure), **#41** (binary resolver), **#44** (twin
staging guard).

## Teardown order — getting this wrong destroys the main checkout

**☠ REMOVING A JUNCTIONED WORKTREE DESTROYS THE MAIN CHECKOUT'S BUILD ARTIFACTS. Delete the junctions
FIRST.** `git worktree remove --force` (and `rm -rf`, and `Remove-Item -Recurse`) **follow junctions
and delete the TARGET contents** — so pruning a worktree that still has the four junctions in wipes
`src-tauri/binaries/` and `src-tauri/resources/` **in the main checkout**, for every other agent and
for the operator. This is not hypothetical: the orchestrator did exactly this on 2026-08-14 and
destroyed the bundled Node binary, the staged voice-engine, the SDK runtime and the entire vendored
drawio webapp. Everything was gitignored build output and recoverable, but recovery cost a `npm ci`,
a `sidecar:prepare`, a voice-engine restage and a 49 MB drawio re-download.

**Correct teardown, in this order:**

```bash
cmd //c rmdir "<worktree>\src-tauri\binaries"                  # rmdir removes the LINK, not the target
cmd //c rmdir "<worktree>\src-tauri\resources"
cmd //c rmdir "<worktree>\node_modules"
cmd //c rmdir "<worktree>\src-tauri\sidecar\node_modules"
git worktree remove <worktree>                                 # only now, and prefer without --force
```

**Verify before and after:** `ls src-tauri/binaries/` in the MAIN checkout should list the node and
voice-engine executables plus `sidecar-resources/` both times. If it is empty afterwards you have
destroyed them — say so immediately and loudly; they are all regenerable
(`npm ci` in `src-tauri/sidecar`, `npm run sidecar:prepare`, `npm run sidecar:build-voice`,
`npm run drawio:prepare`) but silence turns a 20-minute recovery into someone else's baffling
build failure.
