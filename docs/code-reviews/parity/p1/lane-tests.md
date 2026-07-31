# Lane: tests — parity P1 (PR #30) — FIX-DELTA ROUND 2

**Mode:** FIX-DELTA round 2 (re-review of the three-branch round-2 fix set merged into `feat/parity-p1` after review commit `3d03bbb`)
**Diff under review:** `git diff master...feat/parity-p1` — 68 files, +7232/−343 (round-2 delta alone: `git diff 3d03bbb..HEAD` — 12 files, +329/−59)
**Round-2 fix commits:** `6a0891b` (R-44) · `2bbfa7e` (R-37) · `7249809` (R-35) · `28cf5c7` (R-36) · `ca0df27` (R-38, R-39) · `ee2e5d9` (R-40, R-41) · `819bd12` (R-42) · `f6e2202` (R-43)
**Lane definition:** `.claude/agents/test-analyzer.md`
**Binding contracts re-read:** `features/demo/CLAUDE.md`, `vitest.config.mts`, `vitest.setup.ts`, `tsconfig.json`
**Prior artefacts read:** `docs/code-reviews/parity/p1/p1-review-fixdelta.md` (aggregated, R-35…R-44), this file's previous revision (TESTS-1…TESTS-11 → R-5, R-6, R-19, R-20, R-21, R-22, R-27, R-28, R-42, R-43, R-44)
**Scope note:** R-1…R-34 are CLOSED per the orchestrator and are not re-litigated. The deliberate choices listed in the phase brief (run-scoped-vs-segment-scoped disagreement by design; `UNEXPECTED_ERROR` deliberately unmapped; `win.focus()` kept; deferred §§29–36; the 5s-timeout load-flake class) are honored — none is re-flagged.

## Gates (re-run in this worktree)

| Gate | Result |
|---|---|
| `vitest run` (full, twice) | **132 files / 1078 tests, all passing**, both runs. No failures, skips, or flakes; run 1 128.6s, run 2 53.1s (CPU contention, not instability) |
| `not wrapped in act(...)` | **0 occurrences** across the captured full run |
| Other warnings on stderr | **0** beyond jsdom `Not implemented: Window's focus() method` — now **13 per run, down from 22** (R-37 removed the second `focus()` call; the load-bearing `win.focus()` at `PdfPreview.tsx:57` remains, as the doc intends) |
| `tsc --noEmit` | **clean (exit 0)** — the round's compile-only fixes (R-40 `ImportRealStageId`, R-41 required `RunFailure` fields, R-34's `@ts-expect-error` pins) all hold |
| `pnpm typecheck` mechanism | Verified end-to-end (see TESTS-11 below): the script exists at `package.json:10`, `tsconfig.json` `include: ["**/*.ts", "**/*.tsx"]` covers `__tests__/`, and an out-of-repo tsc probe confirms dropping `readonly` turns both pins into `TS2578 Unused '@ts-expect-error' directive` (exit 2) |
| Targeted re-run | `PdfPreview.test.tsx` + `ImportTerminalProgress.test.tsx` + `ImportTerminalProgress.memo.test.tsx` — 3 files / 58 tests green in 1.4s |

Verification method: read every changed test and paired production file in full; traced each new "pin the contract" test's inputs through production by hand; ran one out-of-repo `tsc` probe (scratchpad only — no repo file touched) to settle the R-44 enforcement question empirically. Repo left read-only apart from this file.

---

# Fix-delta — prior findings attributed to this lane

| Prior ID | Aggregated ID | Sev | Status | Fix commit |
|---|---|---|---|---|
| TESTS-9 | R-42 (residual of R-27) | MINOR | **FIXED** | `819bd12` |
| TESTS-10 | R-43 | MINOR | **FIXED** (primary claim; the optional token-arm extension not taken → TESTS-14) | `f6e2202` |
| TESTS-11 | R-44 | MINOR | **FIXED** | `6a0891b` |

Round-1 lane findings TESTS-1…TESTS-8 (R-5, R-6, R-19, R-20, R-21, R-22, R-27, R-28) were signed off FIXED last pass and are **untouched by the round-2 delta** — `git diff 3d03bbb..HEAD --stat` does not list any of their test or production files except `TerminalLine.test.tsx` (rename only) and `import-log.test.ts` (comment only). Both remain green. R-27's carried PARTIAL is now closed by R-42 below.

## TESTS-9 / R-42 [MINOR] — FIXED (and fixed better than my suggestion)

`features/demo/ui/screens/import/__tests__/ImportTerminalProgress.memo.test.tsx` (new, 61 lines) takes the render-counting option: the row module is replaced by a `memo`-wrapped counting delegate with **default shallow-compare semantics**, so the mock's bail-out behaviour is identical to the real `TerminalLine`'s.

Discrimination re-traced by hand through the production render, not assumed. The three props at `ImportTerminalProgress.tsx:567` are `line` (the same object identity across snapshots — `import-log.ts` `getLines()` returns `[...ring]`, a fresh array of the *same* line objects), `expanded` (a per-seq boolean off `expandedSeqs`), and `onToggleDetail` (`useCallback([])` at `:502-509`). All three must stay stable for the assertion `{1:1, 2:1, 3:1, 4:1}` at `memo.test.tsx:59` to hold. The exact mutation the original R-27 finding named — an inline `onToggleDetail` — breaks shallow-compare on every existing row and turns the map into `{1:2, 2:2, 3:2, 4:1}`. So does a per-render `expanded` object, and so does a re-created `line` view-model. That is strictly more than the node-identity test could kill, and it is the invariant the no-virtualization rationale (`ImportTerminalProgress.tsx:44-45`) actually claims.

Two supporting details verified:
- **No false-pass path.** If the `vi.mock` failed to apply (alias vs. relative specifier), `renderCounts` stays empty and `Object.fromEntries(renderCounts)` is `{}` — the test fails loudly rather than passing vacuously.
- **The structural half is preserved, not lost.** Mocking the row module means this file no longer proves the *real* `TerminalLine` is memoized; `TerminalLine.test.tsx:110` still pins `$$typeof === Symbol.for('react.memo')` and was renamed (`f6e2202`… `819bd12`) to *"is wrapped in React.memo (structural pin — the no-re-render BEHAVIOUR is counted in ImportTerminalProgress.memo.test)"*, which removes the over-claim my finding named. The two files together cover both halves.
- The dedicated-file choice is correct and documented (`memo.test.tsx:12`): `vi.mock` is module-wide and would otherwise silently replace the row in the 40+ tests of the main terminal suite.

The node-identity test (`ImportTerminalProgress.test.tsx:89-112`) was **kept** alongside it, with its comment rewritten to claim only no-*remount*. That is honest — it still kills a shifted key scheme and a re-created subtree type — and is no longer carrying the behavioural claim.

## TESTS-10 / R-43 [MINOR] — FIXED (primary claim)

`features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:788-812` drives the **text** path: `runText.mockRejectedValue(...)` → Paste Text → type → Import with AI → `See error details` CTA → friendly copy → Technical Details containing `boom from the text pipeline` → breadcrumb → `locations.length === 0`.

Falsifiability traced by hand: unwrapping `runTextImportFlow`'s `guardImportRun` (`DemoExperience.tsx:616`) makes the rejection an unhandled promise rejection, `finishImport` never runs, `result` stays `null`, `computeImportStage` holds `'progress'`, and `findByRole({ name: /See error details/ })` times out. The assertions are positive (CTA name, exact card copy, exact detail text, breadcrumb args), so none can pass by absence. The mock-reset discipline is intact — `runText.mockReset()` / `runPdf.mockReset()` in the file's `beforeEach` (`:39-42`) — so the non-`Once` `mockRejectedValue` here cannot leak into a later test.

The optional half of my prior finding (the guard's stale-token arm) was not taken; the round-2 rework made that line load-bearing for materially more state, so it is re-filed below as TESTS-14 rather than silently dropped.

## TESTS-11 / R-44 [MINOR] — FIXED

`package.json:10` now carries `"typecheck": "tsc --noEmit"`, and `import-log.test.ts:145-148` names it in the pin's comment ("enforced by `pnpm typecheck` … vitest itself does NOT type-check — review R-44 … If ImportLogLine loses readonly, these become unused-'@ts-expect-error' failures").

I did not take this on trust. Three-part verification:
1. `tsconfig.json:26` — `include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]`, `exclude: ["node_modules"]`. `features/demo/engine/logic/__tests__/import-log.test.ts` is in scope, so `pnpm typecheck` really does compile the pin.
2. `npx tsc --noEmit` in this worktree exits 0 — the pins are satisfied today.
3. Out-of-repo probe (scratchpad, repo untouched), using **this worktree's** `node_modules/.bin/tsc`: the current shape (`readonly` fields + `readonly` array) compiles clean; the mutated shape (both `readonly`s dropped) yields
   `error TS2578: Unused '@ts-expect-error' directive.` twice, exit 2.
   So the R-34 contract is now genuinely enforced by a scripted command, exactly as the finding asked.

Scope note recorded, not filed: the repo has **no CI** (`ls .github` → nothing; no husky/lint-staged in `package.json`), so *every* gate here — `pnpm test` included — is human-invoked. Adding a script is therefore the complete available answer, not a partial one.

---

# New findings (round-2 fix-introduced / fix-adjacent)

## TESTS-12 [MINOR] features/demo/ui/chrome/__tests__/PdfPreview.test.tsx:148

**Claim.** The R-36 capability-probe test asserts only the *absence* of the blocked notice and never that a print was attempted. A regression that skips `win.print()` entirely on a non-detecting engine — the exact shape a "probe first, then decide" refactor invites — leaves the test green while the button silently does nothing at all.

**Evidence.**
- Test body (`PdfPreview.test.tsx:151-157`): `delete (win as {…}).onbeforeprint` → `win.print = vi.fn()` → click → `await settlePrintVerdict()` → `expect(screen.queryByRole('status')).not.toBeInTheDocument()`. The `vi.fn()` is never captured and never asserted on.
- Production (`PdfPreview.tsx:50-80`): `const canDetect = 'onbeforeprint' in win` is read *before* the print attempt, and the only branch keyed off it (`:72`) runs *after* it. Hoisting a `if (!canDetect) { setPrintNotice(null); return }` to `:51` — a plausible "don't bother instrumenting what we can't read" simplification — satisfies every assertion in this test while removing the save.
- The sibling test at `:160-172` does **not** share the gap: its stub is what dispatches the deferred `beforeprint`, so a skipped `print()` means no dispatch, which means the deferred verdict fires the notice and the test fails. Only `:148` is assertion-negative end to end.
- Verified the test is not otherwise vacuous: `'onbeforeprint' in win` is true by default in this jsdom (if it weren't, the R-12 silent-ignore test at `:137-146` could never see its notice — it does, and passes), and a failed `delete` would surface the notice and fail this test loudly rather than pass it silently. So the probe branch really is exercised — the gap is only the missing positive assertion.

**Failure scenario.** Ship the hoisted early return. On Safari/iOS ≤12-era engines the Save as PDF button becomes a no-op with no notice and no dialog — the *worst* of both failure directions R-12 and R-36 were filed to prevent — and the suite stays 1078/1078 green.

**Suggested fix.** One line, same test:
```ts
const print = vi.fn()
win.print = print
…
expect(print).toHaveBeenCalledTimes(1) // degraded verdict, but the save was still attempted
```

**Confidence:** High — both branches read in full; the discriminating gap is a missing assertion, not a disputed mechanism.

## TESTS-13 [MINOR] features/demo/ui/DemoExperience.tsx:404

**Claim.** R-40's fix has two halves — a type narrowing (`ImportErrorDetails.stage: ImportRealStageId`) and a **new runtime mechanism**, the `lastRealStageRef` mirror. The type half is enforced by `tsc`; the runtime half is pinned by nothing. Deleting the mirror leaves `tsc` clean and all 1078 tests green while the backstop's Technical Details silently reverts to the coarse entry stage — a wrong-but-plausible diagnostic, which is the defect class R-40 exists to prevent.

**Evidence.**
- The mirror: `DemoExperience.tsx:401` (`const lastRealStageRef = useRef<ImportRealStageId | null>(null)`) and `:404` (`if (st !== 'error') lastRealStageRef.current = st`), introduced by `ee2e5d9`.
- Its **only** reader is the backstop at `:558` — `details: { stage: lastRealStageRef.current ?? 'extracting_text', detail }`. Repo-wide grep for `lastRealStageRef` returns exactly `:401`, `:404`, `:558`, `:586`, `:619`; `:586`/`:619` are the two flow-entry seeds (`'extracting_text'` / `'reading_model'`), which survive the mutation.
- No test asserts a `stage` value on that path. The three assertions on the rendered block are `import-technical-details` `toHaveTextContent('boom from the pipeline')` (`sandbox:780`), `('boom from the text pipeline')` (`sandbox:806`), and `('No JSON object found in AI response')` (`sandbox:864`) — all `detail`, never `stage`. The only `stage` assertion anywhere (`modals.test.tsx:225`) is a hand-built `ImportModal` prop, not the bridge's construction. The block renders `JSON.stringify(details, null, 2)` (`ImportModal.tsx:133-157`), so a wrong `stage` cannot perturb a `detail`-only `toHaveTextContent`.
- Neither backstop test even advances a stage before throwing: `sandbox:765` uses `runPdf.mockRejectedValue(...)` (no `onStage` call at all), so `lastRealStageRef` still holds the loop seed and the assertion would read identically if the ref were permanently `null`.

**Failure scenario.** A future refactor folds the stage forwarder back into a single `setImp` updater and drops `:404`. A run that fails during normalization now reports `"stage": "extracting_text"` in Technical Details — pointing an investigator at the wrong pipeline phase — with no test, no type error, and no review signal. This is the same "the diagnostic loses the only thing it exists to say" outcome R-40 was filed for, reached through the value instead of the type.

**Suggested fix.** Extend the existing R-23b test (`sandbox:762`) so its stub advances first: `runPdf.mockImplementation(async (_f, o) => { o?.onStage?.('normalizing'); throw new Error('boom from the pipeline') })`, then add `expect(screen.getByTestId('import-technical-details')).toHaveTextContent('"stage": "normalizing"')`. That pins the mirror, the `?? 'extracting_text'` fallback stays covered by the untouched R-43 test, and it costs two lines.

**Confidence:** High — the call graph is closed (one writer, one reader) and the absence of any `stage` assertion on that reader is grep-complete.

## TESTS-14 [MINOR] features/demo/ui/DemoExperience.tsx:553

**Claim.** `guardImportRun`'s stale-token arm is still unexercised — and the round-2 rework (`ca0df27`) made that one line protect materially more state than it did when I first noted it as an optional extension. Post-rework the catch no longer writes a self-contained failure object; it mutates the run's **tally** and calls `finishImport`, which writes `stage`, `result` and `lastLocId`. Dropping `:553` therefore lets a superseded run's late throw publish the *old* run's tally over a live newer run.

**Evidence.**
- Production: `DemoExperience.tsx:553` — `if (importGen.current !== myGen) return` — followed by `tally.failures.push({…})` (`:554-559`), `setImp((s) => ({ ...s, activeStage: 'error' }))` (`:560`) and `finishImport(tally, emitter, totalFiles)` (`:561`). Pre-rework the catch wrote one `setImp` with a literal failure result; now it publishes an accumulated tally through the shared result writer.
- Test inventory: the file's three backstop tests (`sandbox:735`, `:762`, `:788`) all throw inside a run that is still current. The R-24 cross-run test (`:675-705`) exercises the *stage forwarder's* token guard, not the catch's. No test starts a second run while a first run's rejection is in flight.
- Consequence if `:553` is dropped: the newer run's terminal flips to the older run's outcome — for a partial older batch, an amber "Batch partially failed — 1 of 2" CTA and a result card listing locations from a run the visitor already superseded. Fully display-visible, and the suite stays green.

**Suggested fix.** One sandbox test on the shape the R-24 test already establishes: hold `runPdf` on a deferred rejection, start a second run (or cancel) to bump `importGen`, then reject the first; assert the live run's terminal still shows its own stage and that `result` was not written by the stale run.

**Confidence:** High for the inventory (grep-complete over `features/demo/ui/**/__tests__/`); the severity stays MINOR because the guard *is* present and correct today — this is a missing regression pin, not a live defect.

---

# Verified and NOT filed (recorded so they are not re-raised)

- **R-35's `runHadSampleFallback` lives in `ui/`, outside the 80% engine gate.** Deliberate and already settled: it is a sibling of `deriveTrust` in the same module, whose out-of-gate placement was discharged by R-21 via the finding's own option B, with the in-file rationale at `ImportModal.tsx:113-115`. It is also directly unit-tested (`ImportTerminalProgress.test.tsx:521-536`) including the empty-run and non-fallback-NORM negatives. Re-filing would re-litigate a closed finding.
- **The R-35 tests are genuinely discriminating.** The mixed-batch test (`ImportTerminalProgress.test.tsx:504-520`) emits `FILE → NORM(sample fallback) → FILE → AI`, then asserts the trust line reads `TRUST_LINE.cloud` **and** the CTA carries the amber `sample import — review →`. Reverting `ctaView`'s third argument to the segment-scoped `trust` makes the CTA read `Review import →` and the test fails on the positive assertion. The prose coupling both derivations depend on is pinned in *both* directions: consumer side at `:178-192` (`SAMPLE_FALLBACK_PREFIX` toBe `'sample fallback:'`, plus a NORM-but-not-fallback negative), producer side at `run-import-log.test.ts:47,55` (`fallback?.level` toBe `'NORM'` on both the 503 and the network-failure wordings). A producer changing the level would break the emit-side tests, not silently blind the derivation.
- **`UNEXPECTED_ERROR` is absent from `modals.test.tsx:218-219`'s deliberately-unmapped enumeration.** Not a gap: the contract is pinned end-to-end instead — both backstop tests assert the exact string `'The import failed unexpectedly. Please try again.'`, which is what `(result.code && ERROR_MESSAGES[result.code]) || result.error` (`ImportModal.tsx:243`) renders *only while the code stays unmapped*. Adding a mapping fails those two tests.
- **The R-36 deferred verdict can be clobbered by a stale attempt.** Mechanism is real: attempt 1 silently ignored schedules `window.setTimeout(…, 0)` (`PdfPreview.tsx:76-79`) closing over attempt 1's `dialogOpened`; if attempt 2 succeeds *before* that timer drains, the stale callback re-asserts `PRINT_BLOCKED_NOTICE` over a save that happened. No test covers it. **Not filed:** the race window is sub-millisecond and closes at the first task boundary — in a real browser two clicks are always separate tasks with the ≥1 ms timer draining between them, so it is reachable in jsdom (two synchronous `fireEvent.click`s) but not by a user. If anyone wants belt-and-braces, an attempt token (or `clearTimeout` of the previous verdict at the top of `printDocument`) plus a two-click test is the one-liner.
- **The deferred verdict has no unmount cleanup.** Closing the preview between the click and the timer leaves a pending `setPrintNotice` on an unmounted tree — a React 19 no-op, no warning, no cross-test pollution (the detached frame window still accepts `removeEventListener`). Confirmed against the full run: zero `act()` warnings, zero stray stderr. Not a test-quality defect.
- **`stage: 'progress'` pinned in `finishImport` (R-39) is not directly testable through the UI seam.** The scenario it defends — a throw landing before the first stage flip — requires `emitter.log('INIT', …)` itself to throw, and `importLogBus` is a module singleton created outside the component with no injection point on `DemoExperience`. The adjacent reachable case, `processPdfFiles([])`, is unreachable from the UI: `PickerStage.tsx:217` returns on `files.length === 0`. Defense-in-depth without a test seam — correctly not tested.
- **`ImportTerminalProgress.memo.test.tsx` does not weaken the main suite.** `vi.mock` is file-scoped; the main terminal suite still renders the real `TerminalLine` (its row-content assertions at `:70-77` would fail against the counting stub, which renders only `line.text`), so the two files genuinely cover different halves.
- **Mock-reset and factory discipline held across all round-2 tests.** `runText`/`runPdf` reset in `beforeEach` (`sandbox:39-42`); the new tests reuse `okRun()`, `createDemoStore()`, `setup()`/`rerenderWith()`, `nextFrame()`; no new inline `DemoCase`/`DemoLocation` literals; no `Date.now()`/`Math.random()`; the new PdfPreview waits use real timers with deterministic FIFO ordering (the stub's dispatch timer is always scheduled *before* the component's verdict timer, inside `win.print()`), not a sleep-and-hope.
- **jsdom `Not implemented: Window's focus()` noise dropped 22 → 13 per run** as a side effect of R-37. Still not a finding (no clean-stderr gate; the remaining source is the load-bearing `win.focus()` at `PdfPreview.tsx:57`).
- **The 5s-timeout load-flake class named in the phase brief.** Two more full runs in this worktree: 1078/1078 green both times, no timeout failures in any suite. Per the brief this is not a finding, and I could not reproduce it in any case.

# Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 3 |

**Prior lane findings: 3 of 3 FIXED (R-42, R-43, R-44) · 0 PARTIAL · 0 UNFIXED.** R-27's carried PARTIAL is closed by R-42 — the render-counting test kills the mutation my previous suggestion could not, and the over-claiming test name was corrected rather than left standing.

- **Behaviourally meaningful coverage:** strong. The round added the mixed-batch CTA attribution pin, the run-scoped/segment-scoped disagreement unit pin, a counted no-re-render invariant, the partial-batch-throw honesty path through the real bridge, the text-path backstop, and two mirror tests for the print capability/timing halves. Every one of them is falsifiable against the mutation it names.
- **Engine coverage gate:** unchanged and met — round 2 added no engine logic (the one new pure function is a documented sibling of the already-discharged `deriveTrust`).
- **Mock strategy:** at the IO edge, plus one new *deliberate* subject-adjacent mock (the counting `TerminalLine` delegate) that is correct because it preserves `memo` semantics and lives in its own file.
- **Setup-shim traps:** none. The one shim-adjacent move — `delete win.onbeforeprint` — was checked in both directions and cannot pass vacuously.
- **Determinism:** yes. No new real-clock dependence; the new real-timer waits are ordering-deterministic by construction.

**Verdict: APPROVE** (three MINORs — one missing positive assertion, two missing regression pins on mechanisms this round introduced or made load-bearing; all opportunistic).
