# Lane: tests — parity P1 (PR #30) — FIX-DELTA

**Mode:** FIX-DELTA (re-review of the six-branch fix round merged into `feat/parity-p1` after review commit `4a1f807`)
**Diff under review:** `git diff master...feat/parity-p1` — 65 files, +7054/−345 (fix round alone: `git diff 4a1f807 HEAD` — 27 files, +1067/−252)
**Lane definition:** `.claude/agents/test-analyzer.md`
**Binding contracts re-read:** `features/demo/CLAUDE.md`, `vitest.config.mts`, `vitest.setup.ts`
**Prior artefacts read:** `docs/code-reviews/parity/p1/p1-review.md` (aggregated), this file's previous revision (TESTS-1…8 → R-5, R-6, R-19, R-20, R-21, R-22, R-27, R-28)

## Gates (re-run in this worktree)

| Gate | Result |
|---|---|
| `vitest run` (full, twice) | **131 files / 1071 tests, all passing.** No failures, no skips, no flakes observed across both runs |
| `vitest run --coverage` | **97.26 / 89.07 / 98.90 / 98.49** vs the 80% thresholds on `lib/**` + `features/demo/engine/**` — gate met with room |
| New/moved engine modules | `import-flow-mode.ts` + `import-log.ts` measured together: **100 / 100 / 100 / 100** (43 stmts · 14 branches · 13 fns · 37 lines). The `text` reporter hides fully-covered rows, which is why neither appears in the table |
| `tsc --noEmit` | **clean (exit 0)** — so the two new `@ts-expect-error` pins in `import-log.test.ts:148,150` are currently satisfied (see TESTS-11 for their enforcement path) |
| `act()` warnings | **zero** occurrences of `not wrapped in act(...)` in the full run (one existed pre-fix — R-20). The pre-existing `MapCanvas` / shorthand-style warnings the previous pass reported are also absent now |
| Residual stderr | 22× jsdom `Not implemented: Window's focus() method`, all from `PdfPreview.tsx:57-58` — see Observations |

Verification method for this pass: read every changed test file and its paired production file in full; traced each "pin the contract" test's inputs through production by hand; ran one out-of-repo probe (scratchpad only, no repo files touched) to settle the R-27 question empirically.

---

# Fix-delta — prior lane findings

| Prior ID | Aggregated ID | Sev | Status | Fix commit |
|---|---|---|---|---|
| TESTS-1 | R-5 | MAJOR | **FIXED** | `8b70d38` |
| TESTS-2 | R-6 | MAJOR | **FIXED** | `685114f` |
| TESTS-3 | R-19 | MINOR | **FIXED** | `b39f23c` |
| TESTS-4 | R-20 | MINOR | **FIXED** | `011625d` |
| TESTS-5 | R-21 | MINOR | **FIXED** (via the annotate-the-remainder option the finding offered) | `d0a67e7` |
| TESTS-6 | R-22 | MINOR | **FIXED** | `cd8bd2a` |
| TESTS-7 | R-27 | MINOR | **PARTIAL** — see TESTS-9 | `e10b681` |
| TESTS-8 | R-28 | MINOR | **FIXED** | `c2ee770` |

## TESTS-1 / R-5 [MAJOR] — FIXED

`features/demo/ui/screens/import/__tests__/PickerStage.test.tsx:44-50` now clicks the card and asserts the hidden input received exactly one click.

Falsifiability re-traced by hand, not assumed: `PickerStage.tsx:340` is `onClick={() => fileInputRef.current?.click()}` and `:313` is `ref={fileInputRef}`. Drop either and `fileInputRef.current` is `null`, `?.click()` no-ops, and `clickSpy` is never called. The assertion also cannot pass by accident — the hidden input (`:305-314`) is a *sibling* of the cards, not an ancestor, so a click on the card cannot bubble into it; the only way its listener fires is a direct `HTMLElement.click()` dispatch.

## TESTS-2 / R-6 [MAJOR] — FIXED (both halves)

1. **End-to-end amber path** — `features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:707-733`. One `okRun` + one `PDF_SCANNED` failure through the real bridge (`processPdfFiles` → `finishImport` → `deriveTerminalOutcome`); only `runPdfImport` is stubbed, so exactly the seam the finding named is live. It asserts the counted CTA via the **visible** accessible name (`/Batch partially failed — 1 of 2, 1 needs attention/`, correctly re-based on the R-3 fix), pins the amber border *and* the absence of the success green (`:727-728`), clicks through the dwell, and asserts `Imported 1 of 2 requests` + the failed filename + `locations.length === 1`. The mutation from the original finding (`failures: []` at `DemoExperience.tsx:484`) now fails at `:723` and again at `:732`.
2. **Mixed-run DONE detail** — `features/demo/ui/__tests__/DemoExperience.import-log.test.tsx:138-152` drives the *real* pipeline (only pdf.js / `/api/extract` / geocode stubbed) with one good and one throwing extraction and pins `/^success: 1 · failed: 1 · \d+ms$/`. The previously-only-`failed: 0` assertion at `:135` is retained alongside it.

## TESTS-3 / R-19 [MINOR] — FIXED

`features/demo/ui/import/__tests__/useImportLog.test.ts:103-132`. Both cleanup lines in `useImportLog.ts:98-103` are now individually falsifiable:

- drop `cancelFrameRef.current?.()` → `cancelAnimationFrame` is never called with the captured pending id → fails at `:129`. The id is captured from the rAF spy's own last return value (`:125`), so it is the *actual* pending frame, not a guess.
- drop `unsubscribe()` → the wrapping bus's instrumented release never runs → fails at `:131`.

The `spyBus` spread (`:112-121`) is safe: `createImportLogBus` returns closure-bound methods with no `this` usage (`import-log.ts:120-147`), so `{...bus}` preserves behaviour. The test's own comment correctly documents why my previously-suggested post-unmount-emit probe would *not* have been diagnostic — the `pendingRef` clear makes a leaked listener early-return silently. Better than the fix I proposed.

## TESTS-4 / R-20 [MINOR] — FIXED

`features/demo/ui/screens/__tests__/modals.test.tsx:2` now imports `waitFor` from `@testing-library/react` and `:101` uses it instead of `vi.waitFor`. Two consecutive full-suite runs produced **zero** `not wrapped in act(...)` output (grep count 0 over the captured run log). No `vi.waitFor` remains anywhere in the suite.

## TESTS-5 / R-21 [MINOR] — FIXED

`computeImportStage` moved (a true `git` rename, `d0a67e7`) to `features/demo/engine/logic/import-flow-mode.ts:37` — inside `coverage.include`, and measured at 100% on all four metrics. Its test moved with it (`features/demo/engine/logic/__tests__/import-flow-mode.test.ts`, 7 cases, all input combinations). `deriveTerminalOutcome` deliberately stayed at `ImportModal.tsx:117` with the out-of-gate rationale written at `:113-115` — that is precisely option B in the original finding ("leave them where they are and note in each file's header that they're deliberately outside the gate"), so the finding is discharged, not deferred. Bonus: the module is now the single declaration of `ImportUiStage` (`:26`), consumed by `ImportModal.tsx:20,72` and `DemoExperience.tsx:31,96` (R-31).

## TESTS-6 / R-22 [MINOR] — FIXED

`PickerStage.test.tsx:169-185` (PDF path) and `:187-203` (clipboard path). Each rejects the parent handler, asserts the phone-verbatim backstop copy in the `role="alert"` banner, and asserts all three cards are re-enabled. Mutation check: removing either `finally { setIsReadingFile(false) }` (`PickerStage.tsx:209-211`) or `finally { setIsReadingClipboard(false) }` (`:257-259`) leaves `isLoading` true, every card `disabled`, and the assertions at `:176-178` / `:196-198` fail. The tests additionally pin the R-23a breadcrumb (`console.error('[demo/import] import run threw', …)`), which is the *only* signal on the production path where the stage unmounts first — a good pairing of the two findings.

## TESTS-7 / R-27 [MINOR] — PARTIAL

The `$$typeof` assertion was supplemented (not replaced) with a behavioural test at `ImportTerminalProgress.test.tsx:89-112`, which is what my previous fix suggestion literally asked for. Having now verified that suggestion empirically, **it does not discriminate the invariant** — full write-up as TESTS-9 below. The residual is unchanged in severity (MINOR) and the fix commit is honest about what it pins ("no-remount"); what remains wrong is the *claim*, at `TerminalLine.test.tsx:110` and in the production comment at `ImportTerminalProgress.tsx:44-45`.

## TESTS-8 / R-28 [MINOR] — FIXED (all three sub-claims)

`features/demo/ui/__tests__/fonts.test.ts`:
- (a) file filter widened to `/\.tsx?$/` (`:21`) — a stack in a future `.ts` style module under `ui/` is now scanned.
- (b) the `@import` / `fonts.googleapis.com` scan now covers `features/demo/engine/logic/pdf` alongside `demo.css` (`:16`, `:38-43`) — the print-iframe templates, the one other document that could re-fetch a family.
- (c) the prefix match is now `var\(--font-x\),\s*` (`:27`) — a formatter-inserted space no longer false-fails.

Re-verified the guard is not vacuous: `sources()` excludes `__tests__` and returns `{file, text}` pairs used in the per-file assertion message, and the current tree is clean (suite green).

---

# New findings (fix-introduced / fix-adjacent)

## TESTS-9 [MINOR] features/demo/ui/screens/import/__tests__/ImportTerminalProgress.test.tsx:89

**Claim.** The R-27 replacement test pins *no remount*, not *no re-render* — and no-re-render is the invariant the production code cites as its reason to ship no virtualization. DOM-node identity plus a foreign sentinel attribute both survive a re-render, so the exact mutation the original finding named (an inline `onToggleDetail` instead of the `useCallback`) still leaves the whole suite green. The test name at `TerminalLine.test.tsx:110` ("is memoized so appends never re-render existing rows") continues to over-claim.

**Evidence.**
- Production claim: `features/demo/ui/screens/import/ImportTerminalProgress.tsx:44-45` — "appends only MOUNT new rows (memoized TerminalLine keyed by seq — **history never re-renders**)". The collaborators that make that true are `toggleDetail` (`:502-509`, `useCallback` with `[]`) and the per-seq boolean `expanded={expandedSeqs.has(line.seq)}` (`:567`); `memo` alone does not deliver it.
- The new test (`ImportTerminalProgress.test.tsx:102-110`) asserts `expect(el).toBe(before[i])` and that `data-render-sentinel` survived.
- **Empirically verified** (scratchpad-only harness — repo untouched — React 19.2.3 / Vitest 4.1.7 from this worktree's `node_modules`): a parent that passes a deliberately unstable callback to a `memo`'d, keyed child re-renders **every** existing row on append (`renders === [1,2,3,4]`) while every existing DOM node stays the *same instance* and keeps the externally-set `data-render-sentinel`. Both assertions the R-27 fix relies on pass while the invariant is broken. (This is just React reconciliation: same element type + same key ⇒ in-place update; identity only changes on unmount/remount.)
- What the new test *does* still kill: a re-created subtree type (component defined inside render) and a key scheme that shifts nodes. Real, but narrow — and not the failure mode the original finding named.

**Suggested fix.** Count renders instead of node identity, keeping memo semantics intact — in `ImportTerminalProgress.test.tsx`, mock the row module with a `memo`-wrapped counting delegate:

```ts
const rendered = vi.hoisted(() => ({ seqs: [] as number[] }))
vi.mock('@/features/demo/ui/screens/import/TerminalLine', async (orig) => {
  const actual = await orig<typeof import('@/features/demo/ui/screens/import/TerminalLine')>()
  const Counting = memo((p: TerminalLineProps) => { rendered.seqs.push(p.line.seq); return <actual.TerminalLine {...p} /> })
  return { ...actual, TerminalLine: Counting }
})
// …emit 3 lines, clear rendered.seqs, emit a 4th…
expect(rendered.seqs).toEqual([4]) // history did not re-render
```

Cheaper alternative if the mock feels heavy: capture the `onToggleDetail` prop across two appends and assert it is the same function reference (that is the single collaborator the memo depends on). Either way, rename `TerminalLine.test.tsx:110` to what it actually asserts ("is wrapped in React.memo") so the structural pin stops carrying the behavioural claim.

**Confidence:** High — the discriminating power gap is not reasoned, it is executed.

---

## TESTS-10 [MINOR] features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:735

**Claim.** The R-23b pipeline backstop is pinned on the PDF path only. `guardImportRun` wraps both run flows, but no test drives a throw through the **text** path — so unwrapping `runTextImportFlow` (the paste + clipboard entry points) re-opens the exact defect R-23b closed — a dwell that spins forever with no result writer — with the whole suite green.

**Evidence.**
- Production: `features/demo/ui/DemoExperience.tsx:521` (`guardImportRun`), applied at `:553` (`processPdfFiles`) **and** `:589` (`runTextImportFlow`). `runTextImportFlow` serves both the paste stage and the picker's clipboard card, so it is not a minor branch.
- Only throw-path bridge test: `DemoExperience.sandbox.test.tsx:735-758`, which stubs `runPdf.mockRejectedValue(...)` (`:738`). Repo-wide grep for `mockRejected` across `features/demo/ui/__tests__/`, `features/demo/ui/screens/`, `features/demo/ui/import/__tests__/` returns no `runText` rejection anywhere — `PickerStage.test.tsx:192` rejects the *prop*, which exercises the component-local catch (R-22), not the bridge guard.
- The stale-token arm inside the guard (`DemoExperience.tsx:530`, `if (importGen.current !== myGen) return`) is likewise unexercised — a superseded run's throw clobbering a live run's state is display-visible ("The import failed unexpectedly" over a healthy run).

**Failure scenario.** Delete `await guardImportRun(myGen, emitter, …)` from `runTextImportFlow` (or let a future refactor drop the `await`): a throw from `runTextImport` escapes into an unhandled rejection, `finishImport` never runs, `result` stays `null`, `computeImportStage` holds `'progress'` forever, and the visitor is stuck on a spinning terminal whose only exit discards the run. Suite stays green.

**Suggested fix.** One sandbox test mirroring `:735`, on the paste route (the file already drives it in the R-11 test at `:651-673`):

```ts
runText.mockRejectedValue(new Error('boom from the text pipeline'))
// …open import → Paste Text → type → Import with AI…
const cta = await screen.findByRole('button', { name: /See error details/ })
fireEvent.click(cta)
expect(await screen.findByText('The import failed unexpectedly. Please try again.')).toBeInTheDocument()
```

Optionally extend it to the token arm: start a second run before resolving the first's rejection and assert the newer run's terminal is untouched (the R-24 test at `:673-704` is the ready-made shape).

**Confidence:** High — call sites and test inventory both enumerated by grep and by reading the bridge.

---

## TESTS-11 [MINOR] features/demo/engine/logic/__tests__/import-log.test.ts:147

**Claim.** R-34's field-level immutability contract is pinned only by two `@ts-expect-error` directives inside a function that is never invoked — and nothing in the runnable test surface type-checks. `pnpm test` transpiles with esbuild (no type checking) and `package.json` has no `typecheck` script, so dropping `readonly` from `ImportLogLine` breaks nothing any scripted command runs.

**Evidence.**
- Test: `import-log.test.ts:147-153` — `const compileTimePins = () => { /* @ts-expect-error ×2 */ }` … `void compileTimePins`. The comment is honest that it is "never executed at runtime".
- Production contract: `features/demo/engine/logic/import-log.ts:44-53` (`readonly` fields) and `:90` (`getLines(): readonly ImportLogLine[]`).
- Runner: `package.json:10` — `"test": "vitest run"`; `:5-12` contains no `typecheck` entry; `vitest.config.mts` has no type-checking config (`test.typecheck` is not enabled).
- The runtime half of the protection *is* still covered: `import-log.test.ts:141-142` asserts each `getLines()` call returns a fresh array (`not.toBe` + `toEqual`), which kills the "return the live ring" mutation. The gap is only the field-level `readonly`, which is by nature compile-only.
- Manually running `npx tsc --noEmit` in this worktree exits 0, so the pins are satisfied *today* — this is about whether anything re-checks them tomorrow.

**Suggested fix.** Add `"typecheck": "tsc --noEmit"` to `package.json` scripts so the pin is a runnable gate (the phase gate already runs `tsc --noEmit` by hand — this just makes it addressable), and reference it in the test comment: "enforced by `pnpm typecheck`, not by `pnpm test`". Alternative, if a script is unwanted: enable `test.typecheck` in `vitest.config.mts` so `.test-d`-style assertions run inside the suite.

**Confidence:** High for the mechanism; the practical risk is low because the review workflow runs `tsc --noEmit` every pass — hence MINOR.

---

# Verified and NOT filed (recorded so they aren't re-raised)

- **jsdom `Not implemented: Window's focus() method` × 22 per full run.** Sole source is `features/demo/ui/chrome/PdfPreview.tsx:57-58` (`win.focus()` — pre-existing; `window.focus()` — added by the R-16 fix, and now unconditional because it sits in a `finally`). It is jsdom virtual-console noise, fails nothing, and the repo has no clean-stderr gate. If anyone wants the run silent, `vi.spyOn(window, 'focus').mockImplementation(() => {})` in `PdfPreview.test.tsx` is the one-liner. Not a test-quality defect; deliberately not filed.
- **`window.focus()` itself is unpinned** (only `saveBtnRef.current?.focus()` is asserted, `PdfPreview.test.tsx:150`). Asserting a call on `window.focus` would be a mechanism assertion with no behavioural consequence in jsdom — dropping it is invisible to a real user too, since focusing the parent's button already moves focus out of the frame. Not filed.
- **The `motion/react` module mock in `ImportTerminalProgress.test.tsx:8-12`.** It replaces a third-party hook rather than the true IO edge (`matchMedia`), so no test exercises the terminal's reduced-motion path against a real media query. Verified the mock's own defence claim holds (reverting to the marketing hook bypasses the mock and fails `:241-248`). The asymmetry with `PickerStage`'s direct `matchMedia` read is on the orchestrator's deliberate-choices list — not re-flagged.
- **R-34 test strength did not regress.** The old runtime `snapshot.push(...)` assertion was replaced by `expect(bus.getLines()).not.toBe(snapshot)`; that still kills the "return the live ring array" mutation (identical references would fail `not.toBe`).
- **`terminal-integration.test.tsx:36` hardcodes `lastRealStage="done"`** while `activeStage` varies. Harmless — the prop is only read when `stage === 'error'`, which that test never reaches. Not a false pin.
- **R-30's `expect(block).not.toHaveTextContent('Business:')` (`modals.test.tsx:253`) is now trivially true** (the render branch was deleted). Kept deliberately as a re-introduction guard, with the reason written in the test. Not a finding.
- **Flake class named in the phase brief.** Two full runs in this worktree: 1071/1071 green both times, no 5s-timeout failures in any suite. I could not reproduce the DateTimeField/TimeField/shared/Calendar/marketing-hero timeouts, so per lane discipline I am not filing them. If the orchestrator wants the belt-and-braces, the R-6-style `describe(..., { timeout: 20000 }, …)` used by `DemoExperience.sandbox.test.tsx:69` and `DemoExperience.import-log.test.tsx:60` is the pattern to copy onto the picker-suite trio — a one-line-per-file change, MINOR at most.

# Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 3 |

**Prior findings:** 6 FIXED · 1 FIXED-via-documented-alternative (R-21) · 1 PARTIAL (R-27 → TESTS-9) · 0 UNFIXED. Both MAJORs are genuinely closed and their fixes are falsifiable, not decorative.

- **Behaviourally meaningful coverage:** strong, and materially stronger than the initial pass — the fix round added end-to-end pins for the partial-batch honesty path, the batched-stage freeze, cross-run stage isolation, the pipeline-throw backstop, both picker failure backstops, keyboard pin control, the print success/blocked signals, and orphaned-pair rehydration.
- **Engine coverage gate:** met — 97.26 / 89.07 / 98.90 / 98.49; the relocated `import-flow-mode.ts` is now inside the gate at 100%.
- **Mock strategy:** at the IO edge, with one documented exception (`motion/react`'s `useReducedMotion`, justified in-file and on the deliberate-choices list). Engine never mocked; the real Zustand store injected, never mocked.
- **Factory usage:** canonical — `okRun()`, `freshStore()`/`workedStore()`, `RAW_*` fixtures, `renderStage()`, `setup()` reused throughout the new tests.
- **Setup-shim traps:** none. The two reduced-motion tests override the right seam for the hook each component actually uses.
- **Determinism:** yes — injected clocks on the bus, fake timers driving the rAF coalescer, no `Date.now()`/`Math.random()` in test files.

**Verdict: APPROVE** (three MINORs, all opportunistic).
