# Parity phase review — p1-r2 (PR #30) — FIX-DELTA ROUND 2 — AGGREGATED

- **Phase:** p1-r2 (round-2 fix set for the p1 fix-delta review)
- **Mode:** fix-delta — re-review of the three-branch round-2 fix set merged into `feat/parity-p1` after review commit `3d03bbb` (`parity/p1-fix2-terminal`, `parity/p1-fix2-pdfsave`, `parity/p1-fix2-logbus`); round-2 delta `3d03bbb..feat/parity-p1` — 12 files, +329/−59, 8 non-merge commits (`6a0891b` R-44 · `2bbfa7e` R-37 · `7249809` R-35 · `28cf5c7` R-36 · `ca0df27` R-38+R-39 · `ee2e5d9` R-40+R-41 · `819bd12` R-42 · `f6e2202` R-43)
- **Date:** p1-r2 (phase id — no timestamps)
- **Diff:** `git diff master...feat/parity-p1` (full PR); round-2 delta as above
- **Prior vetted doc:** `docs/code-reviews/parity/p1/p1-review-fixdelta.md` (R-35…R-44: 0 BLOCKER · 1 MAJOR · 9 MINOR, plus carried PARTIALs R-25/R-27)
- **Inputs:** five round-2 lane files (inventory at the bottom); binding contracts `features/demo/CLAUDE.md` and the parity plan §4; `docs/code-reviews/deferred.md` §33–§36 incl. the R-39 writer-inventory addendum; the orchestrator's deliberate-choices list (honored — nothing on it is re-flagged below)
- **Gates (re-run in-worktree, consistent across lanes):** `tsc --noEmit` / `pnpm typecheck` clean (4 lanes independently; the R-44 script verified to actually compile the pins via `--listFilesOnly`) · `vitest run` full suite **132 files / 1078 tests green** (tests lane ran it twice; typescript and web once each) — zero flakes, zero `act()` warnings · `next build` clean, `/demo` **1.24 kB / 107 kB First Load JS — identical to the pre-fix build**, marketing routes unchanged, marketing↔demo wall intact
- **Aggregator spot-checks (all confirmed in source):** R-35's fix (`runHadSampleFallback` at `ImportTerminalProgress.tsx:124-126` with the two-scope docstring; wired to `ctaView` at `:451-454`) ✓ · R-36/R-37 (`PdfPreview.tsx:50-80`: `canDetect` probe, deferred verdict, listener removed on throw/sync/deferred exits; `finally` holds only `saveBtnRef.current?.focus()`) ✓ · R-38/R-39 (tally hoisted with the in-code R-38 comment at `:579-581`; `finishImport` pins `stage: 'progress'` at `:521` with the R-39 rationale) ✓ · R-40 (`ImportErrorDetails.stage: ImportRealStageId`, `run-import.ts:86`) ✓ · R-41 (`RunFailure` requires `code`/`details`, `DemoExperience.tsx:463-467`) ✓ · R-44 (`package.json:10` `"typecheck": "tsc --noEmit"`) ✓. New-finding mechanisms independently re-verified: `lastRealStageRef` written at `:404/:586/:619`, read at `:558`, **no reset site anywhere** (grep-complete) ✓ · the backstop's single synthetic row (`filename: 'import'`, `:554-559`) against the tally-summing denominators (`ImportModal.tsx:120-121`, `:272`; `ImportTerminalProgress.tsx:390`) ✓ · the `setTimeout(0)` verdict + in-timer listener removal against the component's own frame-load-deferral comment (`PdfPreview.tsx:47-49`, `:76-80`) ✓ · the capability-probe test's missing positive assertion (`PdfPreview.test.tsx:148-158` — `win.print = vi.fn()` never asserted) ✓ · the `:587` mis-indent (visible at 6 columns inside an 8-column loop body) ✓.

## Verdict

**APPROVE** — 0 BLOCKER · 0 MAJOR · 7 MINOR (new, fix-introduced; all opportunistic or deferrable with a `deferred.md` entry).

**Prior findings: 10 of 10 FIXED (R-35…R-44), 0 PARTIAL, 0 UNFIXED.** The round-1 carried PARTIALs are both closed: R-25 by the R-35 fix, R-27 by the R-42 fix. The one MAJOR of the previous round (R-35) is genuinely fixed — stronger than the minimum asked (distinct types for the two scopes, not just distinct arguments) — and pinned both component-level and unit-level. All seven new MINORs live inside the round-2 blast radius; five of the seven sit in the throw backstop whose own premise is "no callee throws today" (defense-in-depth honesty, not shipped defects), and none blocks the merge.

## Prior-finding status (R-35…R-44 + carried PARTIALs)

| Prior | Sev | Status | Fix commit | Evidence (aggregator-checked unless noted) |
|---|---|---|---|---|
| R-35 | MAJOR | **FIXED** | `7249809` | Run-scoped `runHadSampleFallback(lines): boolean` added as a separate derivation (deliberately not a second `TerminalTrust`); CTA consumes it, live surfaces keep segment-scoped `deriveTrust`. Mixed batch pinned both ways (`ImportTerminalProgress.test.tsx:504-521` component, `:522-537` unit — the disagreement IS the assertion). Ring-cap caveat carried in the docstring. All three co-lens lanes signed off. |
| R-36 | MINOR | **FIXED** | `28cf5c7` | Both merged mechanisms: `'onbeforeprint' in win` probe + one-macrotask deferred verdict. Listener removed on every exit — including the sync-success path the review's own sketch would have leaked (web lane traced all four exits). Both mirror tests present and falsifiable. Residual filed as R-47. |
| R-37 | MINOR | **FIXED** | `2bbfa7e` | Dead `window.focus()` gone; load-bearing `win.focus()` (`:57`) kept; `finally` holds only `saveBtnRef.current?.focus()` with the why-comment. Note: the jsdom `Not implemented` noise is **halved, not eliminated** (~12-13 lines/run from the kept call) — the round-1 doc over-attributed it; both TS and web lanes correct the record. |
| R-38 | MINOR | **FIXED** | `ca0df27` | Tally hoisted out of the guarded closure and passed into `guardImportRun`; the catch pushes a synthetic row and reports through `finishImport` — landed locations are no longer denied. Pinned end-to-end through the real bridge (`DemoExperience.sandbox.test.tsx:735-760`). Residual in its own hunk → R-46. |
| R-39 | MINOR | **FIXED** | `ca0df27` | `finishImport` pins `stage: 'progress'` in its own updater (`:521`) — the nowhere-pairing is unconstructable at the write site, not merely unreached. Full `setImp` writer re-enumeration by type-design lane confirms all four pairings render. §36's writer inventory updated in the same commit. Resurrection hazard checked (token bumps precede clears) — none. |
| R-40 | MINOR | **FIXED** | `ee2e5d9` | `ImportErrorDetails.stage: ImportRealStageId` (`run-import.ts:86`); the backstop reads `lastRealStageRef.current ?? 'extracting_text'` typed `ImportRealStageId \| null` — `'error'` structurally impossible at every construction site; three pipeline producers satisfy the narrowing unchanged. The new ref's lifecycle gap → R-45; its missing test pin → R-49. |
| R-41 | MINOR | **FIXED** | `ee2e5d9` | `RunFailure.code`/`details` required (`DemoExperience.tsx:463-467`), `partialData?` correctly optional; all three push sites supply both; modal-level optionality (genuinely code-less pre-pipeline guards) correctly preserved. |
| R-42 | MINOR | **FIXED** | `819bd12` | New `ImportTerminalProgress.memo.test.tsx` counts renders through a `memo`-wrapped delegate with default shallow-compare — kills the inline-`onToggleDetail` mutation the original R-27 named (traced by the tests lane through all three row props). No false-pass path (an unapplied mock fails loudly). The old node-identity test kept, honestly renamed to no-*remount*. Closes R-27's carried PARTIAL. |
| R-43 | MINOR | **FIXED** | `f6e2202` | Text-path backstop pinned through the real bridge (`DemoExperience.sandbox.test.tsx:788-812`), falsifiability hand-traced (unwrapping the guard times out the CTA query). The optional stale-token-arm extension was not taken — re-filed as R-50 rather than silently dropped. |
| R-44 | MINOR | **FIXED** | `6a0891b` | `"typecheck": "tsc --noEmit"` exists, runs clean, and its program provably contains the pinned test file; the tests lane's out-of-repo tsc probe confirms dropping `readonly` yields two `TS2578` errors, exit 2. With no CI in this repo, a script is the complete available answer. |
| R-25 (carried PARTIAL) | MINOR | **CLOSED** | `7249809` | The round-1 remainder *was* R-35; single-file, paste, and mixed-batch cases all now carry the attribution at the CTA moment. |
| R-27 (carried PARTIAL) | MINOR | **CLOSED** | `819bd12` | Closed by R-42 — the render-counting test kills the mutation the earlier supplement could not. |

## New findings table

IDs continue the phase's stable sequence (R-1…R-44 in the prior docs).

| ID | Sev | File:line | Claim (one line) | Lenses |
|---|---|---|---|---|
| R-45 | MINOR | features/demo/ui/DemoExperience.tsx:401 | `lastRealStageRef` is never reset at any run boundary, so a pre-seed throw attributes the failure to the *previous* run's stage — strictly more stale-prone than the `activeStage` read it replaced | typescript, silent-failures, type-design |
| R-46 | MINOR | features/demo/ui/DemoExperience.tsx:554-561 (+ ImportModal.tsx:121) | A mid-batch throw's report derives its denominator from an incomplete-by-construction tally: unattempted files vanish from every count and the synthetic row cannot name the file that threw | typescript, silent-failures, type-design |
| R-47 | MINOR | features/demo/ui/chrome/PdfPreview.tsx:72-80 | The one-macrotask grace does not span the frame-load deferral its own comment names, the late signal is discarded instead of retracting a wrong notice, and the verdict timer has no unmount cleanup | web |
| R-48 | MINOR | features/demo/ui/chrome/__tests__/PdfPreview.test.tsx:148 | The capability-probe test asserts only notice-absence — a refactor that skips `win.print()` entirely on non-detecting engines stays green while the Save button becomes a silent no-op | tests |
| R-49 | MINOR | features/demo/ui/DemoExperience.tsx:404 | R-40's runtime half — the `lastRealStageRef` mirror — is pinned by no test: deleting the forwarder write leaves `tsc` and all 1078 tests green while Technical Details silently degrades | tests |
| R-50 | MINOR | features/demo/ui/DemoExperience.tsx:553 | `guardImportRun`'s stale-token arm is still unexercised, and the round-2 rework made that line protect materially more state (a stale run's late throw would publish the old tally over a live run) | tests |
| R-51 | MINOR | features/demo/ui/DemoExperience.tsx:587 | The per-file `setImp` was left de-indented two columns out of the `for` body by `ca0df27`; no formatter in the repo will catch it | typescript |

---

## R-45 [MINOR] — `lastRealStageRef` is never reset at a run boundary (merged finding)

**File:** `features/demo/ui/DemoExperience.tsx:401` (writes `:404`, `:586`, `:619`; sole read `:558`) · **Lenses:** typescript (TYPESCRIPT-1) + silent-failures (SILENT-FAILURES-2) + type-design (TYPE-DESIGN-2) — the same defect found independently through three lenses (regression-vs-replaced-code / stale-diagnostic honesty / duplicated-state-with-divergent-lifecycles). Aggregator-verified: grep for `lastRealStageRef` returns exactly `401, 404, 558, 586, 619` — three writes, one read, zero resets.

**Claim.** The R-40 fix introduced `lastRealStageRef` so the backstop can report a real stage — but the ref is run-scoped in *meaning* and mount-scoped in *lifetime*. Its state twin (`imp.lastRealStage`) is reset at every run boundary (`blankImport` on open `:369` and cancel `:949`; `onRetry` `:938`); the ref is reset nowhere. A throw landing in a new run's pre-seed window — before `:586` (PDF, i.e. during the `emitter.log('INIT', …)` at `:582-583`) or before `:619` (paste, during `:618`) — publishes `details: { stage: <previous run's stage>, detail }`. The pre-fix code read `s.activeStage`, which every clear nulls, so it degraded to the honest `'extracting_text'` default; the ref is strictly more stale-prone than what it replaced. As type-design frames it: R-40's complaint was an *uninformative* `"stage": "error"`; a stale ref is an *affirmatively wrong* stage that reads as authoritative.

**Adversarial sequence (silent-failures' writeup, verified).** Run 1 (PDF) reaches `normalizing` → ref = `'normalizing'`. Visitor closes the modal (`onCancel` bumps the token, applies `blankImport` — state twin `null`, ref still `'normalizing'`). Visitor reopens and pastes text; run 2's guarded closure throws on its first statement, before `:619` re-seeds. The catch is token-valid and pushes `details.stage: 'normalizing'` — Technical Details prints a stage belonging to a run the visitor already cancelled. Cross-run corruption from *concurrency* is correctly excluded (`:404` is token-guarded); only staleness bites.

**Reachability (why MINOR):** the divergence window is one-to-two statements wide and no callee in it throws today (`emitter.log` only pushes to a ring and broadcasts; re-verified by two lanes) — the same latency premise the backstop itself is built on. Same grade the round-1 backstop findings carried.

**Suggested fix (all three lanes converge on the same line).** Clear the mirror where the run takes its token — `lastRealStageRef.current = null` immediately after `const myGen = ++importGen.current` at `:573` (processPdfFiles) and `:614` (runTextImportFlow); belt-and-braces, also beside `importGen.current++` in `onCancel` (`:945`). The `?? 'extracting_text'` at `:558` then reproduces exactly the pre-fix honest default for a pre-seed throw. Clearing only in `onCancel`/`onRetry` would leave `openImport` uncovered — prefer the token-bump sites. See R-49 for the companion test pin.

**Suggested owner:** P1.4 (live terminal) authoring agent — the backstop and both run entries are its R-23b/R-38 hunks in `DemoExperience.tsx`.

---

## R-46 [MINOR] — the mid-batch throw report under-counts the run and cannot name the file that threw (merged finding, R-38 residual)

**File:** `features/demo/ui/DemoExperience.tsx:554-561` (derivations `ImportModal.tsx:120-121`, `:272`; `ImportTerminalProgress.tsx:390`; DONE line `DemoExperience.tsx:502-503`) · **Lenses:** typescript (TYPESCRIPT-2) + silent-failures (SILENT-FAILURES-1) + type-design (TYPE-DESIGN-1) — one defect; type-design's own cross-lane note requested the merge. Aggregator-verified at every cited line.

**Claim.** The R-38 rework made the throw backstop report through the tally — genuinely fixing the headline claim (landed files are no longer denied) — but every downstream count is derived as `locations.length + failures.length`, a sum that is sound only while the tally accounts for every file in the run. The backstop is the first reporter that can hand over a tally that is **incomplete by construction**: the catch pushes exactly **one** synthetic row (`filename: 'import'`) and the files the aborted loop never attempted are in neither array. The authoritative total is in scope and unused — `finishImport` receives `totalFiles` (`:561`) but does not put it on the result, and the same terminal's own record contradicts the summary (`INIT batch import · 3 files`; the processing badge's `File 2 of 3` from `imp.batch.total`).

**Adversarial sequence (3 PDFs, throw on file 2).** `a.pdf` lands; the loop aborts; `c.pdf` is never attempted and never recorded. The CTA reads **"Batch partially failed — 1 of 2, 1 needs attention"** (`ImportTerminalProgress.tsx:390`), the result view reads **"Imported 1 of 2 requests."** (`ImportModal.tsx:272`), the DONE line reads `success: 1 · failed: 1` — the visitor selected 3, and nothing tells them `b.pdf` was the casualty or that `c.pdf` was skipped. The `FailuresCard` row is named `import` (`ImportModal.tsx:188`). The existing pin (`DemoExperience.sandbox.test.tsx:735-761`) uses a 2-file batch with the throw on the *last* file — the one arity where derived and real totals coincide — so the gap is invisible to the suite.

**Reachability (why MINOR):** same class as R-45 — no callee throws today (`requestExtraction`, `forwardGeocode`, `runImport`/`runPdfImport` all catch internally; re-verified by three lanes). Defense-in-depth honesty, not a shipped defect. Direction check: the fix's own commit message says "reports the whole truth"; for ≥3-file batches it reports a partial truth with a shrunken denominator.

**Suggested fix (two coherent options; the lanes converge).**
- *(a) Carry the total (type-design's preferred, structural):* `finishImport` already takes `totalFiles` — put it on the `ImportResult` arms and have `deriveTerminalOutcome` (`ImportModal.tsx:121`) and the result view (`:272`) read it instead of summing. Makes "some files were never attempted" expressible (`successCount + failures.length < totalFiles`).
- *(b) Pad the tally (cheapest, catch-local):* mirror the loop position into a ref beside `lastRealStageRef` (same seam, established this round) so the synthetic row can name the file that threw, and push "not attempted — the run stopped" rows for the remainder so the denominator stays truthful. (`runTextImportFlow` passes `totalFiles: 1`, so the paste path is unchanged either way.)

Either way, extend the R-38 pin to the missing arity: 3 files, throw on file 2, assert the reported total is 3 (and, if (b), a row naming the unattempted file). *Folded secondary (type-design):* if padding is taken, `filename: string | null` would make "not a file" representable rather than spelled as the sentinel `'import'`.

**Suggested owner:** P1.4 (the catch and `finishImport` are its hunks); coordinate with P1.5 (dwell + error enrichment) if option (a)'s `ImportResult` type change is taken — that type is P1.5's per the R-29/R-30 precedent.

---

## R-47 [MINOR] — the print verdict's grace window is narrower than the deferral it names, and a late signal cannot retract the wrong notice

**File:** `features/demo/ui/chrome/PdfPreview.tsx:72-80` (comment `:47-49`; timer `:76-80`) · **Lenses:** web (WEB-10) — the residual the R-36 prescription itself carried. Aggregator-verified: the comment names load-time postponement; the implementation is a single `setTimeout(0)` that removes the listener when it fires.

**Claim.** The in-code rationale says mechanism (b) covers engines that postpone the printing steps "while the frame is still loading" — but frame-load deferral ends at the frame's `load`, not at the next macrotask, and this component's `srcDoc` document can take several tasks to finish (the time-offset report embeds a data-URI image of the OCR capture — `engine/logic/pdf/time-offset.ts:113-117`). A "Save as PDF" click inside that window still produces the definitive amber "no PDF was saved" over a print that then opens — the mirror fake-failure R-36 exists to prevent — and because `markOpened` is unsubscribed at T+0, the late `beforeprint` that *proves* the print happened can no longer clear the wrong notice. Secondarily, the pending verdict timer is never cleared on unmount — harmless today (React 19 no-ops the state write; the listener is removed inside the callback), but it is the one untorn-down timer in a component that otherwise cleans up every listener.

**Why MINOR (web lane's refutation work, accepted):** the click-during-load window is narrow (the overlay animates in over 0.3s and the document is self-contained — no network fetches), the failure direction is the honest overclaim (a failure notice over a success, immediately contradicted by the visitor's own print dialog), and everything the prior review prescribed *is* implemented.

**Settlement note (the round's one lane disagreement).** The silent-failures and typescript lanes both considered this residual and declined to file it ("the accepted shape of the finding's own suggested fix; the direction is the safe overclaim" / "not worth a cleanup ref"). The web lane filed it. **Kept as filed, MINOR.** The declines are charter-consistent (not a silent failure; not a TS-level defect), not contradictions — and the web lane grounds something the declines don't reach: the code's *own comment* claims coverage of a window the implementation does not span, and the discarded late signal is a retraction the component could make for free. A comment-vs-mechanism mismatch in reviewed code is exactly what a next maintainer will trust and be misled by. The decline rationale is retained here as the severity ceiling: this must not escalate, and "fix" options that preserve a stale notice would be the opposite lie (see the web lane's not-filed table).

**Suggested fix (web lane's, ~4 lines).** Let a late signal win instead of freezing the verdict: have `markOpened` also call `setPrintNotice(null)`, keep the listener alive until the next attempt or unmount (a cleanup ref torn down in an effect, which also clears the pending verdict timer). Keep the `setTimeout(0)` verdict as the honest "no signal yet" moment. Add one test: dispatch `beforeprint` two macrotasks after `print()` returns and assert the `role="status"` notice is gone.

**Suggested owner:** P1.6 (real PDF saves) authoring agent.

---

## R-48 [MINOR] — the capability-probe test never asserts the print was attempted

**File:** `features/demo/ui/chrome/__tests__/PdfPreview.test.tsx:148-158` (production `PdfPreview.tsx:50`, `:72`) · **Lenses:** tests (TESTS-12). Aggregator-verified: `win.print = vi.fn()` is assigned, never captured, never asserted; the only assertion is `queryByRole('status')` absence.

**Claim.** The R-36 no-print-events test is assertion-negative end to end: it proves the notice does not appear, not that the save still happens. A plausible refactor — hoisting `if (!canDetect) { setPrintNotice(null); return }` above the print attempt ("don't instrument what we can't read") — satisfies every assertion in the test while turning the Save button into a silent no-op on non-detecting engines: the worst of both failure directions R-12 and R-36 were filed to prevent, with the suite staying 1078/1078 green. The sibling deferred-dispatch test (`:160-172`) does not share the gap (its stub *is* the dispatch source, so a skipped print fails it); only `:148` is vulnerable. The lane verified the test is not otherwise vacuous — the probe branch genuinely executes, and a failed `delete` fails loudly.

**Suggested fix.** One line in the same test: capture the stub (`const print = vi.fn(); win.print = print`) and add `expect(print).toHaveBeenCalledTimes(1)`.

**Suggested owner:** P1.6.

---

## R-49 [MINOR] — R-40's runtime half (the stage mirror) is pinned by no test

**File:** `features/demo/ui/DemoExperience.tsx:404` (sole reader `:558`; tests `DemoExperience.sandbox.test.tsx:762-812`, `:840-870`) · **Lenses:** tests (TESTS-13). Companion to R-45 — same mechanism, distinct claim: R-45 is a production lifecycle defect (fix: reset the ref); this is a coverage gap (fix: assert the stage value). Fixing one does not close the other.

**Claim.** R-40's fix has a type half (`ImportErrorDetails.stage: ImportRealStageId` — enforced by `tsc`) and a runtime half (the `lastRealStageRef` forwarder write at `:404` — enforced by nothing). Deleting `:404` leaves `tsc` clean and all 1078 tests green while the backstop's Technical Details silently reverts to the coarse entry-stage seed — a wrong-but-plausible diagnostic, the defect class R-40 exists to prevent. Grep-complete evidence: every assertion on the rendered Technical Details block checks `detail` strings only, never `stage`; the only `stage` assertion in the suite is a hand-built `ImportModal` prop, not the bridge's construction; and neither backstop test advances a stage before throwing, so the ref's forwarder write is dead weight in every existing test.

**Suggested fix (two lines).** Extend the existing R-23b test: make the stub advance first (`runPdf.mockImplementation(async (_f, o) => { o?.onStage?.('normalizing'); throw new Error('boom from the pipeline') })`) and assert `toHaveTextContent('"stage": "normalizing"')` on `import-technical-details`. The `?? 'extracting_text'` fallback stays covered by the untouched R-43 test. If R-45's reset lands in the same pass, its suggested cross-run case (reject `runText` immediately after a completed PDF run, assert the default stage — not the previous run's) pins both at once.

**Suggested owner:** P1.4.

---

## R-50 [MINOR] — `guardImportRun`'s stale-token arm is unexercised, and round 2 made it load-bearing for more state

**File:** `features/demo/ui/DemoExperience.tsx:553` (tests inventory: `DemoExperience.sandbox.test.tsx:675-705`, `:735`, `:762`, `:788`) · **Lenses:** tests (TESTS-14) — the re-filed optional half of R-43, made non-optional by the R-38 rework.

**Claim.** `if (importGen.current !== myGen) return` in the catch is the only thing preventing a superseded run's late throw from publishing state — and since `ca0df27` that state is no longer a self-contained failure object but the old run's **tally** pushed through `finishImport` (writing `stage`, `result`, `lastLocId` over a live newer run: an amber "Batch partially failed — 1 of 2" CTA and a result card listing locations the visitor already superseded). No test starts a second run while a first run's rejection is in flight: the three backstop tests all throw inside a current run, and the R-24 cross-run test exercises the *stage forwarder's* token guard, not the catch's. Dropping `:553` leaves the suite green. The guard is present and correct today — this is a missing regression pin, not a live defect.

**Suggested fix.** One sandbox test on the shape the R-24 test already establishes: hold `runPdf` on a deferred rejection, start a second run (or cancel) to bump `importGen`, then reject the first; assert the live run's terminal shows its own state and `result` was not written by the stale run.

**Suggested owner:** P1.4.

---

## R-51 [MINOR] — mis-indented `setImp` in the PDF loop body

**File:** `features/demo/ui/DemoExperience.tsx:587` · **Lenses:** typescript (TYPESCRIPT-3). Aggregator-verified in the source hunk (6 columns inside an 8-column `for` body).

**Claim.** `ca0df27` inserted the `lastRealStageRef` seed above the per-file `setImp` and left that `setImp` de-indented two columns out of the loop body. Cosmetic, but there is no formatter in this repo (no `.prettierrc`, no `format` script, `next lint` doesn't check indentation), so nothing will ever catch it automatically.

**Suggested fix.** Re-indent `:587` to 8 spaces; fold into whichever commit next touches the bridge (R-45/R-46 touch adjacent lines — natural host).

**Suggested owner:** P1.4.

---

## Dropped / Demoted appendix

Nothing was dropped outright and no severity was demoted or escalated — all eleven raw lane findings survive, compressed by two three-way merges into seven. Dispositions that changed shape, plus the conflicts settled:

| Lane finding(s) | Disposition | Rationale |
|---|---|---|
| TYPESCRIPT-1 + SILENT-FAILURES-2 + TYPE-DESIGN-2 | **Merged → R-45** | Same defect (the unreset ref) found through three lenses. SF's adversarial sequence kept as the spine (clearest cross-run narrative); TS contributes the strictly-worse-than-replaced-code framing and the openImport-coverage argument for the fix site; TD contributes the duplicated-state/divergent-lifecycle framing (precedent #4). All three converge on the identical one-line-per-site fix. |
| TYPESCRIPT-2 + SILENT-FAILURES-1 + TYPE-DESIGN-1 | **Merged → R-46** | One defect (tally-derived denominator + unnamed synthetic row) filed three ways; type-design's own cross-lane note asked for the merge. TD's writeup is the spine (names all derivation sites, the in-scope-but-unused `totalFiles`, and the two-representations-of-one-fact contradiction on the same surface); SF's 3-file adversarial sequence and TS's fix sketch folded in. TD's `filename: string \| null` secondary carried as a folded note, not a separate finding. |
| Web lane's "not filed: `filename: 'import'` copy nit — deliberate per the round-2 design" vs three lanes filing the filename inside R-46 | **Settled: the filename half stays in R-46** | The orchestrator's deliberate-choices list covers the synthetic row's *existence* and its *unmapped code* (`UNEXPECTED_ERROR` bridge-only) — not the report's arithmetic or the row's naming. The web decline is charter-scoped ("not a browser-platform defect" — true) and does not contradict R-46, which claims the under-count, with the naming as a component. No lane claims the under-count itself is deliberate. |
| WEB-10 vs the SF and TS lanes' explicit declines of the same residual | **Settled: filed → R-47, MINOR (ceiling)** | Charter-consistent split, not a contradiction: SF declined because the failure direction is the safe overclaim (correct for its lane); TS declined the timer cleanup as not worth a ref (correct in isolation). Web grounds what the declines don't reach — the code's own comment (`:47-49`) claims a coverage window the single-macrotask implementation does not span, and the discarded late signal is a free retraction. Kept MINOR with the decline rationale recorded as the severity ceiling; the web lane's own not-filed table (the `!canDetect` degrade is NOT a defect — preserving a stale notice would be the opposite lie) binds the fix shape. |
| TESTS-13 kept separate from R-45 (same mechanism) | **Two findings (R-45, R-49), cross-referenced** | Distinct claims with disjoint fixes: resetting the ref (R-45) does not create the missing happy-path stage assertion (R-49), and adding the assertion does not fix the stale lifecycle. Same precedent as the prior round's R-38/R-39 split over one hunk. |
| Tests lane's "not filed": the R-36 stale-verdict clobber (attempt 1's timer re-asserting over attempt 2's success) | **Accepted, not filed** | Reachable only by two clicks in one task — possible in jsdom, not by a user; the ≥1 ms timer clamp drains between real clicks. Recorded here so it isn't re-derived; R-47's suggested cleanup ref incidentally removes the jsdom-only shape too. |
| Typescript lane's honesty note on its own R-37 evidence (jsdom noise halved, not eliminated) | **Recorded in the R-37 status row** | Both TS (13 lines) and web (12 lines) independently corrected the round-1 doc's "20+ lines eliminated" implication. The counts differ by one across suites/runs — immaterial; the shared substance (residual noise is the load-bearing `win.focus()`, not removable) is what matters. Disposition of R-37 unaffected. |
| Both lanes' recorded residual: `recordSuccess`'s store-write-vs-tally window | **Not filed (agreed by TS + SF)** | A throw between `addLocation` and `tally.locations.push` would under-report a landed location — but the only awaited call in the window provably cannot reject (`geocode.ts:39-45`), it predates round 2 (R-38 residual, not fix-introduced), and both lanes independently declined it. Recorded so it isn't re-derived. |

## Raw lane-file inventory

| Lane file | Self-reported (new) | Prior-finding verdicts | New findings → final IDs |
|---|---|---|---|
| `docs/code-reviews/parity/p1/lane-typescript.md` | 0 B / 0 M / 3 m | 3/3 FIXED (R-35, R-36, R-37) | TYPESCRIPT-1→R-45 (merged) · TYPESCRIPT-2→R-46 (merged) · TYPESCRIPT-3→R-51 |
| `docs/code-reviews/parity/p1/lane-web.md` | 0 B / 0 M / 1 m | R-36 FIXED (own); R-35/R-37 spot-checked FIXED; R-1…R-34 web fixes regression-swept intact | WEB-10→R-47 |
| `docs/code-reviews/parity/p1/lane-tests.md` | 0 B / 0 M / 3 m | 3/3 FIXED (R-42, R-43, R-44); R-27's carried PARTIAL closed by R-42 | TESTS-12→R-48 · TESTS-13→R-49 · TESTS-14→R-50 |
| `docs/code-reviews/parity/p1/lane-silent-failures.md` | 0 B / 0 M / 2 m | R-35, R-38, R-39 FIXED; R-25's carried PARTIAL CLOSED; adjacent R-36/R-37/R-40/R-41 verified FIXED | SILENT-FAILURES-1→R-46 (merged) · SILENT-FAILURES-2→R-45 (merged) |
| `docs/code-reviews/parity/p1/lane-type-design.md` | 0 B / 0 M / 2 m | 4/4 FIXED (R-35, R-39, R-40, R-41) | TYPE-DESIGN-1→R-46 (merged, spine) · TYPE-DESIGN-2→R-45 (merged) |

Lane self-reported new-finding totals: 0 blockers, 0 majors, 11 minors → after dedupe (3→1 into R-45, 3→1 into R-46): **0 BLOCKER · 0 MAJOR · 7 MINOR.** Every lane independently verdicted APPROVE. Each lane's verified-clean inventories (architecture re-sweeps, token-discipline traces, exhaustiveness nets, deliberate-choices honored, gates) remain in the lane files and were not contradicted by any other lane.
