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


# Project hazards — THIS REPO (Next.js demo, Vitest + jsdom)

Everything above is architecture-agnostic. Everything below is specific to this codebase and was
verified against it. It lives here because the standalone `dt-mutation-tester` seat was retired and
probing became the job of whoever is already reading the code — which means **you**, if you hold Bash
and are about to run a probe.

## Probe worktrees are cheap here — cut one, never probe in place

There are no junctions in this repo and there never should be. `pnpm` uses a content-addressed shared
store, so a probe worktree installs in seconds rather than minutes:

```bash
git worktree add <scratch>/probe-<topic> -b probe/<topic> <head>
cd <scratch>/probe-<topic>
pnpm install --prefer-offline
```

Scratch base: your session scratchpad, or `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\`
(where this campaign's worktrees already live). Teardown is a plain `git worktree remove <path>` —
nothing is linked, so nothing outside the worktree can be destroyed by it. **Do not create junctions
to share `node_modules`.** A junctioned `node_modules` makes `git worktree remove` follow the link and
delete the main checkout's dependencies, which is the failure mode this rule exists to prevent.

`pnpm install` in a worktree is safe (shared store, per-worktree symlink farm) but **never** run it in
a tree another agent is live in — a concurrent install broke typecheck under a running agent twice on
the previous campaign.

## jsdom shares ONE window per test file — `sessionStorage` couples mounts

`DemoExperience` persists to `sessionStorage`, and every test file gets one jsdom window for all of
its cases. A non-injected `DemoExperience` mount therefore reads whatever a previous case in the same
file wrote. The v1 rule is `docs/planning/demo-phone-parity/HANDOFF.md:128` (store territory, item 3):
*"jsdom shares one window per test file — non-injected `DemoExperience` mounts need
`sessionStorage.clear()` hygiene or tests couple through the snapshot."*

The hygiene it names, verbatim, is
`features/demo/ui/__tests__/DemoExperience.persistence.test.tsx:15-16` —
`beforeEach(() => window.sessionStorage.clear())` **and** the matching `afterEach`. Both halves: the
`beforeEach` protects this file from itself, the `afterEach` protects the next mount in the same file
from the snapshot this one left behind.

**Why a probe cares:** a mutation to persistence code can be "killed" by state a *sibling* case wrote,
or "survive" because the assertion read a stale snapshot instead of the mutated write path. If your
probe target touches persistence, confirm the pin's file clears `sessionStorage` on BOTH hooks before
you trust either verdict.

## Style pins are the weakest pins in this repo — probe every one

Two independent traps, both measured:

1. **Stylesheets are not processed at all.** `vitest.config.mts:31` sets `css: false`. Class names
   resolve to nothing; only *inline* styles are readable. A pin asserting a computed colour on a
   Tailwind- or token-classed element is asserting over an empty declaration, and it will keep passing
   after the token it claims to guard is deleted.
2. **jsdom REWRITES the inline values it does accept.** Measured on this repo's jsdom (29.1.1) —
   `el.style.backgroundColor = '#002853'` reads back as `rgb(0, 40, 83)`; a gradient's hex stops are
   rewritten the same way; and `color-mix(in srgb, red 50%, blue)` reads back as
   `color-mix(in srgb, red, blue)` — **the 50% is silently dropped**. So a string-equality pin can
   compare against jsdom's normalisation rather than the value the component wrote, and a pin over a
   `color-mix()` percentage cannot observe that percentage at all.

**Protocol for any style pin: mutate the value to a literal `rgba()` that differs, run the pin, and
confirm it reds.** If it stays green, the pin is reading a normalised string, an empty declaration, or
a dropped component of the value — that is a SURVIVED finding, not a formatting quibble. This matters
more in this campaign than any previous one, because a token/recipe port is almost entirely style
pins.

## `navigator.mediaDevices` is deliberately undefined — defining it mutates the harness

`vitest.setup.ts:74-75`: *"navigator.mediaDevices is intentionally left undefined so camera/mic
screens take the sample-fallback path; individual tests opt into a getUserMedia mock for the live
path."*

**The sample-fallback path is the contract**, not a gap. A probe that defines `navigator.mediaDevices`
globally has mutated the *harness*, not the production code — every verdict from that run is invalid,
in both directions. If you need the live path, mock `getUserMedia` inside the single test, as the
setup comment prescribes.

## A skipped test is not a killed mutant — check the RN guard resolved

`features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:10` runs under
`it.skipIf(!rnAvailable())(...)`, and `rnAvailable()`
(`.design-sync/check-rn-parity.mjs:31`) returns false unless the sibling phone repo is checked out at
`.design-sync/check-rn-parity.mjs:28` —
`D:\Work Coding Projects\CCTV Recovery Notes App\extraction_case_notes_react_native_expo`.

Vitest reports a skipped test inside a green run with exit code 0. **A drift-guard verdict quoted off
a run where the guard skipped is the opposite-of-the-truth failure this file warns about twice above.**
Before quoting anything from this test, print `rnAvailable()` or the reporter's skip count and confirm
the guard actually executed. Same rule for any future `skipIf` guard.

## State the motion mode every probe ran under

All demo motion gates on `useReducedMotion` (`lib/hooks/use-reduced-motion.ts`), which returns `false`
during SSR and whenever `matchMedia` is unavailable. `vitest.setup.ts:47-60` installs a `matchMedia`
stub whose `matches` is hard-coded `false`, so **the default test mode is motion-ON**. v1 lost a full
campaign's worth of gate coverage to the mirror of this: its Playwright driver defaulted to
reduced-motion since P0, so every earlier verification run silently skipped the gate
(`docs/planning/demo-phone-parity/HANDOFF.md:5`).

A probe against animated or transition-gated code reports the motion mode it ran under, or the verdict
is unusable. Probe BOTH modes when the mutation lives on either side of the gate.

## Re-run unexplained failures solo

Parallel agents saturate this box, and this suite is already tuned around that: `asyncUtilTimeout` is
raised to 5000ms (`vitest.setup.ts:24`) and `testTimeout` to 20000ms (`vitest.config.mts:28`), both
with comments recording measured contention flakes (one wait sampled 35ms idle and up to 1770ms
loaded; five concurrent lanes produced 29–40 spurious timeouts each). **A timeout-class failure during
a fleet run is not a mutation result.** Re-run the single file solo before recording any verdict, and
never widen a tolerance to make a probe look clean.

## Commands

```bash
pnpm exec vitest run <path>            # scoped — what a probe runs
pnpm test --silent                     # full suite
rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false
pnpm build                             # the artifact gate
```

Delete `tsconfig.tsbuildinfo` **before** the typecheck — an incremental cache can return exit 0 over a
broken tree. Run the full three at phase boundaries only; probes use the scoped form.
