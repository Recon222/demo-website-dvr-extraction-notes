# P2 — "emergent gate ↔ import integration bug" on `feat/parity-p2` @ 749446c

**Verdict: there is no integration bug.** The two red tests are a **load-induced flake in the
RTL wait budget**, latent in the suite since long before either P2 branch. Fixed by raising
`asyncUtilTimeout`; both branches' code is correct as merged and neither was changed.

Investigated on `parity/p2-fix-gate-import` off `feat/parity-p2` @ `749446c`.

---

## 1. The reported symptom did not hold still

The brief named two failing tests. Reproducing on the merge commit produced a **different pair
each run**, and one of them was in a **different test file**:

| Run | Failing test(s) |
|---|---|
| sandbox file, run 1 | `import (PDF batch): two files create two locations…` + `a pre-seed throw… (R-45)` |
| sandbox file, run 2 | `a pre-seed throw… (R-45)` |
| sandbox file, runs 3–4 | none |
| sandbox file × 8 | none |
| full suite, run 1 | `a real sample-mode PDF run emits the pinned line sequence…` (**`DemoExperience.import-log.test.tsx`**) + `a pre-seed throw… (R-45)` |
| full suite, run 2 | none |

The batch test passes **8/8 in isolation**. A failure set that moves between runs, crosses test
files, and vanishes when the box is quiet is not a state interaction — it is a race.

## 2. Root cause, measured

Every observed failure is the same shape: a `findBy*` for an import-terminal element reports
"unable to find", i.e. **the runner stopped waiting**. React Testing Library's
`asyncUtilTimeout` — the budget for every `findBy*`/`waitFor` — defaults to **1000 ms**.

A probe measured one such wait (the dwell CTA after a 2-file batch, driven through the real
bridge) with nothing else changed but machine load:

| Condition | Latency |
|---|---|
| Idle | **35 ms** |
| Under full-suite CPU contention | **561 ms · 674 ms · 1093 ms · 1770 ms** |

**Two of four loaded samples exceed the 1000 ms default.** The element always appears; on a
6-core box running ~5 vitest workers of heavy jsdom rendering, a single worker can stall past
the budget. Whichever test is scheduled in the worst contention window is the one that fails —
exactly the shifting set in §1.

This is the **missing half of the R-6 fix**: `DemoExperience.sandbox.test.tsx` already raised
its per-**test** timeout to 20 000 ms citing "CPU contention… observed 5.8s on a loaded
runner" — but a per-test timeout is not what fires on a `findBy`. The waits that raise was
meant to protect were still on a 1-second leash.

## 3. Why it is not the gate ↔ rider interaction

- **No cost regression from the gate.** Median runtime of the sandbox import tests:
  **1.14 s** on the merge vs **1.17 s** on `26cd3fe` (rider only, no gate), n=8 each. The gate's
  per-render `safeParse` is not on the import path's critical timing.
- **The gate's effects cannot perturb the import flow.** All three new effects settle to a
  no-op: `setGateErrors` uses `dropGateErrors`, which returns the *same* array reference when
  already empty, so React bails out; `setAlert(null)` when `alert` is already `null` likewise.
  Neither the gate state nor the `AlertDialog` portal is mounted during an import.
- **The rider's `unaccounted` tally and `lastRealStageRef` clears are untouched by the gate** —
  different state, different call sites, no shared identity.
- **The flake is reachable without the gate branch at all** — it is a property of the wait
  budget versus loaded latency, both of which pre-date P2.

The only way the merge moved the dial is arithmetic: it adds ~37 tests / 3 files, so the suite
does more concurrent work and contention windows get slightly likelier. Any branch that adds
tests does that. `26cd3fe` went 6/6 green and the merge 1-in-2 red in sampling — well inside
noise at these rates, and not a mechanism.

## 4. Fix

`vitest.setup.ts`: `configure({ asyncUtilTimeout: 5000 })`.

Sized against the measured distribution — ~3× the worst loaded sample (1770 ms), and
deliberately well under the 20 000 ms per-test timeout so a genuine hang still fails as a hang
with budget left to report it. Individual call sites that pass their own timeout are unaffected.

Pinned by `__tests__/async-util-timeout.test.ts`, which reads the live RTL config: **red at the
1000 ms default** (`expected 1000 to be greater than or equal to 5000`), green after. That guard
is the regression test — the two originally-red tests cannot serve as one, because they do not
fail deterministically.

## 5. Verification

| Check | Result |
|---|---|
| `pnpm test --silent` × 4 | **1121/1121 green, 4/4 runs** |
| sandbox + import-log × 3, run *concurrently with* a full suite (the loaded arm) | **63/63 green, 3/3 runs** |
| `pnpm exec tsc --noEmit` | clean |

## 6. Note for the phase record

The suite has other `findBy`/`waitFor` sites in full-experience component tests. This fix is
global, so they all gain the same headroom. If a wait ever needs *more* than 5 s, that is a
signal about the code under test, not the budget — raise it at the call site with a reason,
not here.
