# Parity phase review — p1 (PR #30) — FIX-DELTA — AGGREGATED

- **Phase:** p1 (P1.1 fonts · P1.2 picker/paste · P1.3 log bus · P1.4 live terminal · P1.5 dwell + error enrichment · P1.6 real PDF saves · P0 rider minors)
- **Mode:** fix-delta (re-review of the six-branch fix round merged into `feat/parity-p1` after review commit `4a1f807`; fix delta `4a1f807..feat/parity-p1` — 27 files, +1067/−252, 32 non-merge commits)
- **Date:** p1 (phase id — no timestamps)
- **Diff:** `git diff master...feat/parity-p1` (full PR); fix delta as above
- **Prior vetted doc:** `docs/code-reviews/parity/p1/p1-review.md` (R-1…R-34: 0 BLOCKER · 6 MAJOR · 28 MINOR)
- **Inputs:** five fix-delta lane files (inventory at the bottom); binding contracts `features/demo/CLAUDE.md` and the parity plan §4; `docs/code-reviews/deferred.md` §33–§36; the orchestrator's deliberate-choices list (honored — nothing on it is re-flagged below)
- **Gates (re-run in-worktree, consistent across lanes):** `tsc --noEmit` clean (4 lanes independently) · `vitest run` full suite **131 files / 1071 tests green, twice**, zero flakes, zero `act()` warnings · coverage **97.26 / 89.07 / 98.90 / 98.49** vs 80% thresholds (relocated `import-flow-mode.ts` + `import-log.ts` at 100/100/100/100) · `next build` clean, `/demo` **1.24 kB / 107 kB First Load JS (unchanged)**, marketing↔demo wall intact
- **Aggregator spot-checks:** the single new MAJOR (R-35) independently re-verified line-by-line against `ImportTerminalProgress.tsx` (`deriveTrust` `:101-108`, `trust`→`ctaView` wiring `:433-435`, `reviewSub` `:343-347`), `DemoExperience.tsx` (`FILE` emit `:561`, `onCancel`→`blankImport` `:916-921`), and the R-25 test (no `FILE` markers — single-segment only). **Confirmed.** All six prior MAJOR fixes spot-checked in source: R-1 segment-scoped `deriveTrust` ✓ · R-2 `tabIndex`/`role="log"`/`aria-live="off"`/`onKeyDown` wiring ✓ · R-3 CTA has no `aria-label`, sibling `aria-describedby="terminal-cta-desc"` span ✓ · R-4 `onReviewImport(): void` required, no `?? (() => undefined)` ✓ · R-5 test at `PickerStage.test.tsx:44` ✓ · R-6 E2E amber-batch test at `DemoExperience.sandbox.test.tsx:707` ✓. The backstop-residual mechanisms (R-38/R-39/R-40) verified against `guardImportRun` (`DemoExperience.tsx:521-539`: `activeStage: 'error'` + `result` written, no `stage` write, `details.stage` read from `s.activeStage` whose type `RunStageId | null` admits `'error'`, tally local to the guarded closure) ✓.

## Verdict

**APPROVE-WITH-FIXES** — 0 BLOCKER · 1 MAJOR · 9 MINOR (new, fix-introduced).

**Prior findings: 32 of 34 FIXED, 2 PARTIAL (R-25, R-27), 0 UNFIXED.** All six prior MAJORs are genuinely closed with falsifiable tests. The one new MAJOR (R-35) is an interaction between two fixes authored on different branches (R-1 × R-25) — a ~3-line additive fix plus one test, no re-architecture. It gates the merge. The nine MINORs are opportunistic or deferrable with a `deferred.md` entry.

## Prior-finding status (R-1…R-34)

| Prior | Sev | Status | Fix commit | Note |
|---|---|---|---|---|
| R-1 | MAJOR | **FIXED** | `a32b929` | Segment-scoped `deriveTrust`; live badge/title now truthful mid-batch. Its interaction with R-25's fix spawned R-35 |
| R-2 | MAJOR | **FIXED** | `a7497ed` | Keyboard pin control + `aria-live="off"`; pinned incl. negative case |
| R-3 | MAJOR | **FIXED** | `82b490c` | Accname = visible text; `cta.a11y` supplements via sibling `aria-describedby` |
| R-4 | MAJOR | **FIXED** | `f0ddcc2` | Prop required, swallow deleted, both stale doc comments rewritten |
| R-5 | MAJOR | **FIXED** | `8b70d38` | Card→hidden-input wiring pinned; cannot pass by accident (input is a sibling) |
| R-6 | MAJOR | **FIXED** | `685114f` | E2E amber partial-batch through the real bridge + mixed-run DONE detail |
| R-7 | MINOR | **FIXED** | `bd68a0d` | Dead import gone; scripted sweep found no replacement dead bindings |
| R-8 | MINOR | **FIXED** | `a0d3ad6` | `Partial<Record<ImportErrorCode, string>>` |
| R-9 | MINOR | **FIXED** | `77949ca` | Pair law applied to the location lookup; red-first test |
| R-10 | MINOR | **FIXED** | `e6d5f20` | Re-exports removed; `barrel.test.ts` pins the absence |
| R-11 | MINOR | **FIXED** | `acd8af9` | `lastRealStage` tracked in the bridge's functional updater; freeze at 55% pinned |
| R-12 | MINOR | **FIXED** | `0bf7c9e` | Probe inside `try`; positive `beforeprint` signal. Two residuals in the new code → R-36, R-37 |
| R-13 | MINOR | **FIXED** | `8d52011` | `const` local narrowing; assertion gone |
| R-14 | MINOR | **FIXED** | `6dcfba7` + `c5412af` | Both spinners gated; asserted both ways |
| R-15 | MINOR | **FIXED** | `8d52011` | `aria-hidden` gone; `DETAIL_AT_HIDE_THRESHOLD`/`isDump` deleted with rationale |
| R-16 | MINOR | **FIXED** | `6dbffdf` | Focus returned on every path incl. throw; Escape-after-save pinned. One dead line → R-37 |
| R-17 | MINOR | **FIXED** | `a941d79` | Confirm takes focus on mount; cancel and clipboard-failure restores wired |
| R-18 | MINOR | **FIXED** | `91d0113` | `motion/react` hook; verified against installed source (seeds first render, no jsdom hazard) |
| R-19 | MINOR | **FIXED** | `b39f23c` | Both cleanup lines individually falsifiable |
| R-20 | MINOR | **FIXED** | `011625d` | RTL `waitFor`; zero act() warnings across two full runs |
| R-21 | MINOR | **FIXED** | `d0a67e7` | True rename into `engine/logic/` (inside the gate, 100% covered); `deriveTerminalOutcome` stays out via the finding's own option B, documented in-file |
| R-22 | MINOR | **FIXED** | `cd8bd2a` | Both rejection backstops pinned; mutation-checked by the lane |
| R-23 | MINOR | **FIXED** | `087e56b` + `d8af20d` | Breadcrumbs added; `guardImportRun` wraps both flows. Residuals in the new backstop → R-38, R-39, R-40, R-43 |
| R-24 | MINOR | **FIXED** | `acd8af9` | `importStageFor` token guard; stale branch returns same state object (React bails out) |
| R-25 | MINOR | **PARTIAL** | `b94809a` | Single-file/paste closed exactly as suggested. Mixed batch reopened by the R-1 interaction → **R-35** |
| R-26 | MINOR | **FIXED** | `fe1614c` | Comment narrowed to the two true boundaries; third carried in deferred §15 with an un-defer trigger |
| R-27 | MINOR | **PARTIAL** | `e10b681` | Supplemented test pins no-*remount*, not no-*re-render* — empirically shown non-discriminating → **R-42** |
| R-28 | MINOR | **FIXED** | `c2ee770` | All three sub-claims (`.tsx?` filter, PDF-template scan, `\s*` prefix) |
| R-29 | MINOR | **FIXED** | `05c1229` | Required on the pipeline arm; modal-level optionality correctly preserved. One layer left loose → R-41 |
| R-30 | MINOR | **FIXED** | `2c633b6` | Field + dead branch removed; §35 addendum with re-add trigger |
| R-31 | MINOR | **FIXED** | `d0a67e7` | One `ImportUiStage` declaration in `engine/logic/import-flow-mode.ts`; colliding local alias deleted |
| R-32 | MINOR | **FIXED** | `a32b929` | `SAMPLE_FALLBACK_PREFIX` typed contract, both directions enforced by tests |
| R-33 | MINOR | **FIXED** (accepted deferral) | `b6ad036` | Flat shape logged as deferred §36 with a complete entry + un-defer trigger. §36's writer inventory is now one writer stale → note in R-39 |
| R-34 | MINOR | **FIXED** | `4ceaacd` | `readonly` fields + `readonly` return; compile-pinned. Enforcement-path gap → R-44 |

## New findings table

| ID | Sev | File:line | Claim (one line) | Lenses |
|---|---|---|---|---|
| R-35 | MAJOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:433 | Segment-scoped `trust` (R-1) feeds the run-scoped CTA attribution (R-25): a mixed batch's sample substitution is unmarked everywhere on the dwell surface — worse than pre-fix for this case | silent-failures, typescript, type-design |
| R-36 | MINOR | features/demo/ui/chrome/PdfPreview.tsx:44-61 | The `beforeprint` success signal assumes synchronous dispatch AND is never feature-detected — two paths to a fake "blocked" notice over a print that happens | typescript, web |
| R-37 | MINOR | features/demo/ui/chrome/PdfPreview.tsx:58 | `window.focus()` does nothing for R-16's purpose (the next line does the work) and emits 20+ jsdom `Not implemented` lines per run | typescript |
| R-38 | MINOR | features/demo/ui/DemoExperience.tsx:529 | `guardImportRun`'s catch replaces a partial batch's report with a total-failure card while the already-imported locations persist — and `Try again` would duplicate them | silent-failures |
| R-39 | MINOR | features/demo/ui/DemoExperience.tsx:529 | The backstop writes `result` without `stage`: a throw landing before the first stage flip yields `{ stage: 'picker'\|'paste', result: failure }`, which `computeImportStage` renders nowhere; §36's writer inventory is now stale | type-design, silent-failures |
| R-40 | MINOR | features/demo/ui/import/run-import.ts:77 | `ImportErrorDetails.stage: ImportStageId` admits `'error'`; the backstop reads `s.activeStage` — Technical Details can say `"stage": "error"`, the one value R-11 established as uninformative | type-design |
| R-41 | MINOR | features/demo/ui/DemoExperience.tsx:455 | `RunFailure` keeps `code?`/`details?` optional — R-29's compiler guarantee is dropped at the only layer that carries it | type-design |
| R-42 | MINOR | features/demo/ui/screens/import/__tests__/ImportTerminalProgress.test.tsx:89 | R-27's replacement test pins no-remount, not no-re-render — the original mutation (inline `onToggleDetail`) still passes the whole suite (empirically executed) | tests |
| R-43 | MINOR | features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:735 | The R-23b backstop is pinned on the PDF path only — unwrapping `runTextImportFlow` re-opens the forever-spinning dwell with a green suite | tests |
| R-44 | MINOR | features/demo/engine/logic/__tests__/import-log.test.ts:147 | R-34's `@ts-expect-error` compile pins are enforced by no scripted command (`vitest` doesn't type-check; no `typecheck` script exists) | tests |

---

## R-35 [MAJOR] — mixed-batch sample substitution is unmarked on the entire dwell surface (R-1 × R-25 interaction)

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:433-435` (derivation `:101-108`, `reviewSub` `:343-347`, trust line `:511/:543-545`; bridge `DemoExperience.tsx:561, 916-921`)
**Lenses:** silent-failures (filed MAJOR) + typescript + type-design (each filed the same defect as MINOR). Spot-checked by the aggregator: **confirmed** at every cited line.

**Claim.** R-1's fix made `deriveTrust` segment-scoped (resets to `cloud` at every `FILE` marker — correct for the live title bar and per-file badge). R-25's fix, authored on a different branch, wired the CTA's sample attribution to that same single `trust` value — but the CTA is a **run-scoped** summary. In a batch whose substitution happened on any file but the last, the dwell now carries **no substitution signal at all**: the title bar reads `cloud model via server proxy`, the CTA reads the muted `Review import →` under a green "Batch complete — N of N locations", and the amber `sample fallback:` log line has scrolled above the fold of the tail-pinned `minHeight: 260` panel. One `trust` value serves two scopes whose safe-failure directions are opposite: for the exposure label `'cloud'` is the safe overclaim; for the substitution attribution `'cloud'` is the unsafe under-disclosure.

**Adversarial sequence (verified against the emit sites).** Visitor picks `a.pdf` + `b.pdf`. `a.pdf`'s `/api/extract` returns 502 → `fallbackMode: 'error'` → `NORM sample fallback: …` (`run-import.ts:141`) → `applySuccess` writes a location built from the **fictional SAMPLE document** (business name, address, phone, DVR model, time frames). `b.pdf` succeeds live. The log ends on `b.pdf`'s segment, so `deriveTrust` returns `'cloud'` at the CTA moment. The visitor presses Escape during the dwell → `onCancel` → `setImp(blankImport)` (`DemoExperience.tsx:916-921`) discards the result view — so the `notice` and per-card `isSample` badge that `finishImport` did build never paint. Two locations are in the case; one is entirely fictional and nothing on screen ever said so.

**Severity settlement (the round's one real conflict).** Silent-failures filed MAJOR; typescript and type-design filed MINOR, type-design explicitly offering escalation "if the aggregator weighs the Escape path more heavily than R-25 did". Settled **MAJOR**, for four reasons grounded in the code and the prior review's own precedent:
1. R-25 was MINOR *because* two signals (amber log line + `sample import` trust line) were still on screen at the CTA moment — "prominence regressed, not existence". In the mixed-batch case **both** are gone: existence, not prominence, is what regressed.
2. The fix round's own comment (`:336-341`) states the fix's purpose: "Escape during the dwell used to discard a sample-substituted import with the substitution never marked on this surface." That is *exactly* the state a mixed batch is in now — the fix's own contract fails for batches.
3. It is strictly worse than pre-fix for this case: before `a32b929` the sticky latch kept the title bar reading `sample import · in-browser` at the CTA moment — wrongly attributed per-file (that was R-1), but present as a run-level signal.
4. The prior review settled R-1 MAJOR on the docstring's rule that under-disclosure is never safe, on this same surface. Fictional evidence data persisting unmarked is the same direction with higher stakes than a mislabeled badge.

Neither test covers the interaction: the R-25 pin uses a run with no `FILE` markers (single-segment by construction — verified at `ImportTerminalProgress.test.tsx:490-501`); the R-1 batch tests never render a CTA; the R-6 e2e batch uses two `fallbackMode: 'none'` files.

**Suggested fix.** Keep `deriveTrust` segment-scoped for the live surfaces (that is R-1's point) and give the CTA a run-scoped derivation — 3 additive lines:

```ts
const runHadSample = useMemo(
  () => lines.some((l) => l.level === 'NORM' && l.text.startsWith(SAMPLE_FALLBACK_PREFIX)),
  [lines],
)
const cta = outcome === null ? null : ctaView(outcome, isBatchRun, runHadSample ? 'sample' : 'cloud')
```

Ring-cap note (from the typescript lane's eviction analysis): FIFO eviction can only drop *older* lines, so a wholly-evicted fallback line degrades toward `'cloud'` — the overclaim direction for the label but the under-disclosure direction for the CTA; at the 400-line cap with ~15 lines/file this needs a ~27-file batch to matter, far beyond the 25-file confirm gate. Alternative (b), immune to prose scanning entirely: pass the bridge's run-scoped truth down (`ImportModal` already holds `result`; `runHadSample={result?.ok === true && result.notice !== undefined}`). Either way, add the missing batch case to the R-25 pin: `FILE → sample fallback → FILE → AI Request`, outcome `success`, assert the amber `sample import — review →` while the trust line reads `cloud`. If option one is taken, consider distinct types (`SegmentTrust` / `RunTrust`) per the type-design lane so a consumer cannot silently take the wrong scope again.

**Suggested owner:** P1.4 (live terminal) authoring agent — the fix lands wholly in `ImportTerminalProgress.tsx`; coordinate with P1.5 (dwell) only if option (b) is chosen.

---

## R-36 [MINOR] — `beforeprint` success signal: sync-dispatch assumption + no feature detection (merged finding)

**File:** `features/demo/ui/chrome/PdfPreview.tsx:44-61` · **Lenses:** typescript (deferred-dispatch half) + web (feature-detect half) — two mechanisms, one 6-line detection, one combined fix (same merge shape as the prior R-12).

Both mechanisms produce the same wrong outcome — a definitive *"no PDF was saved"* notice for a print that does happen, the mirror of the fake success R-12 removed:

(a) **Deferred dispatch (typescript).** The listener is removed in a **synchronous** `finally` and the decision read on the next statement, so the signal only survives if the browser dispatches `beforeprint` synchronously inside `print()`. Blink defers printing (and the event) when the frame is still loading (`should_print_when_finished_loading_`), and this component prints a `srcDoc` frame that begins loading at mount — a click during that window returns without firing the event, the notice claims a blocked print, and the dialog then opens anyway. WebKit carries the same `isLoading()` deferral. The tests model dispatch as synchronous by construction (`stubDialogPrint` dispatches inside the stubbed `print`), so no test can catch it.

(b) **No capability probe (web).** There is no `'onbeforeprint' in win` check. In a browser without the print events (~6.9% caniuse global — Safari/iOS ≤12, Opera Mini, legacy Android/UC), `dialogOpened` stays `false` forever and every successful save is reported as blocked. All three modern engines fire the event synchronously inside `print()` (Chromium/WebKit block on the dialog; Gecko dispatches around the static clone), which is why this is MINOR, not MAJOR.

**Suggested fix (covers both).** Probe support, and downgrade only after a macrotask so a deferred dispatch still lands:

```ts
const canDetect = 'onbeforeprint' in win
win.addEventListener('beforeprint', markOpened)
try { win.focus(); win.print() } finally { window.focus(); saveBtnRef.current?.focus() }
if (!canDetect || dialogOpened) setPrintNotice(null)
else setTimeout(() => {
  win.removeEventListener('beforeprint', markOpened)
  setPrintNotice(dialogOpened ? null : PRINT_BLOCKED_NOTICE)
}, 0)
```

Add the two mirror tests: a `print` stub that never dispatches on a window without `onbeforeprint` must not show the notice; a stub that dispatches on a `setTimeout(0)` must also not show it. The "silent ignore is not success" property (R-12's point) is preserved on the detectable path.

**Suggested owner:** P1.6 (real PDF saves) authoring agent.

## R-37 [MINOR] — dead `window.focus()` line in the print `finally`

**File:** `features/demo/ui/chrome/PdfPreview.tsx:58` · **Lenses:** typescript (tests lane independently recorded the same jsdom noise, deliberately unfiled from its own lane)

`window.focus()` requests top-level browser-window activation; it does not move DOM focus out of the iframe — `saveBtnRef.current?.focus()` on the next line is what actually restores the Escape listener's reachability (focusing a parent-document element implicitly blurs the frame). Both R-16 tests assert only `document.activeElement === saveBtn` and pass identically without `:58`. Cost: jsdom doesn't implement `Window.focus`, so the line emits `Not implemented: Window's focus() method` — 20+ stderr lines per full-suite run. (The `win.focus()` at `:50` is load-bearing — it makes the right document print — and stays.)

**Suggested fix.** Delete line 58. If browser-window activation is genuinely wanted, gate it and document why.
**Suggested owner:** P1.6.

## R-38 [MINOR] — the throw backstop denies a partial batch's landed locations

**File:** `features/demo/ui/DemoExperience.tsx:529-537` (tally at `:557`, store writes at `:445-449`) · **Lenses:** silent-failures. Mechanism aggregator-verified: the tally is local to the closure passed *into* `guardImportRun` and unreachable from its catch.

The catch builds a **total-failure** result consulting nothing: files that already succeeded were committed to the store by `applySuccess` before the throw, yet the card says "The import failed unexpectedly" with no `FailuresCard` and no location rows — and `Try again` re-runs from the picker, duplicating the locations that did land. The backstop that exists to make a throw honest is itself the un-honest surface for a partial batch. Reachability is low (the lane verified no callee throws today — same latency caveat the backstop itself is built on) — hence MINOR.

**Suggested fix.** Hoist the tally so the catch can tell the truth (pass it into `guardImportRun` and have the catch call `finishImport` after pushing a synthetic failure row), or cheapest: word the copy so it cannot deny landed locations ("some files may already have been imported — check the case"). Add a test: two files, second `runPdfImport` rejects, assert the first location is still reported.
**Suggested owner:** P1.4 (the backstop is its R-23b hunk).

## R-39 [MINOR] — the backstop writes `result` without `stage`; §36's writer inventory is stale

**File:** `features/demo/ui/DemoExperience.tsx:529-537` (`computeImportStage` at `engine/logic/import-flow-mode.ts:37-41`) · **Lenses:** type-design + silent-failures (both lanes filed the same secondary mechanism; merged here)

`guardImportRun` is the first `result` writer whose correctness depends on ordering rather than the guarded setters deferred §36 enumerated: it writes `activeStage: 'error'` + `result` but not `stage`. A throw landing before the first `stage: 'progress'` flip (`runTextImportFlow` logs INIT at `:590` *before* the flip at `:591`; `processPdfFiles` likewise `:555-560`, and skips the flip entirely for an empty `files` array) yields `{ stage: 'picker' | 'paste', result: failure }` — a pairing `computeImportStage` returns unchanged, so the failure renders nowhere and the console breadcrumb is the only signal. The window is one `emitter.log` call wide — defense-in-depth, not a shipped defect — but §36's acceptance rests on "every `setImp` writer traced", and that inventory is now one writer short.

**Suggested fix.** Add `stage: 'progress'` to the backstop's updater (one token — the backstop's own doc promise, "releases the dwell through the normal CTA path", then holds regardless of where the throw landed). Optionally reorder `runTextImportFlow` so the flip precedes the first log. Update §36's writer inventory either way.
**Suggested owner:** P1.4.

## R-40 [MINOR] — `ImportErrorDetails.stage` admits `'error'`, and the backstop can now supply it

**File:** `features/demo/ui/import/run-import.ts:76-79` (construction `DemoExperience.tsx:535`) · **Lenses:** type-design

`stage: ImportStageId` includes `'error'` — a marker, not a stage anything failed *at*. Until this round no producer could supply it; the new backstop reads `details: { stage: s.activeStage ?? 'extracting_text', detail }`, and `activeStage` (verified type `RunStageId | null`) is `'error'` whenever a mid-batch file already failed or a throw escapes `finishImport` after an all-failed run. Technical Details then reads `"stage": "error"` — the diagnostic loses the only thing it exists to say. The same fix round created the honest union (`ImportRealStageId = Exclude<ImportStageId, 'error'>`, R-11's rationale) and the right value (`s.lastRealStage`) is in scope in that same updater, unused.

**Suggested fix.** Narrow the field to `stage: ImportRealStageId` — a compile error at `DemoExperience.tsx:535` routes the author to `s.lastRealStage ?? 'extracting_text'`; the three pipeline producers already satisfy it unchanged.
**Suggested owner:** P1.5 (owns `run-import.ts` types per R-29/R-30), with the one-line construction change coordinated with P1.4.

## R-41 [MINOR] — `RunFailure` drops R-29's guarantee one layer up

**File:** `features/demo/ui/DemoExperience.tsx:454-458` · **Lenses:** type-design

`RunFailure` — the transport between `ImportRunResult` and the failure card — still declares `code?`/`details?` optional, though both pushes (`:565`, `:596`) now provably set them (their source is `Extract<ImportRunResult, { ok: false }>`, required since R-29). A future synthesized `tally.failures.push({ filename, error })` compiles and silently renders the single-failure card with no friendly-copy mapping and no Technical Details block — the exact downstream break R-29 was filed to prevent. Type-only change; no current site can violate it.

**Suggested fix.** Make `code`/`details` required on `RunFailure` (leave `partialData?` optional — honestly conditional). Fold into whichever commit next touches the bridge.
**Suggested owner:** P1.5.

## R-42 [MINOR] — the R-27 replacement test pins no-remount, not no-re-render (R-27 residual)

**File:** `features/demo/ui/screens/import/__tests__/ImportTerminalProgress.test.tsx:89-112` (claim sites `ImportTerminalProgress.tsx:44-45`, `TerminalLine.test.tsx:110`) · **Lenses:** tests

The tests lane **executed** the discrimination check rather than reasoning it: a parent passing a deliberately unstable callback to a `memo`'d, keyed child re-renders every existing row on append while every DOM node keeps its identity *and* its externally-set `data-render-sentinel` (React reconciliation: same type + same key ⇒ in-place update). So both assertions the new test relies on pass while the invariant — the stated reason the terminal ships no virtualization at the 400-line cap — is broken by the exact mutation the original finding named (inline `onToggleDetail` instead of the `useCallback`). What the test does kill (re-created subtree type, shifted keys) is real but narrow. The name at `TerminalLine.test.tsx:110` ("appends never re-render existing rows") still over-claims.

**Suggested fix.** Count renders: mock the row module with a `memo`-wrapped counting delegate and assert only the appended seq rendered (lane writeup has the ready-made snippet). Cheaper: capture `onToggleDetail` across two appends and assert reference equality — it is the single collaborator the memo depends on. Rename the `TerminalLine` test to "is wrapped in React.memo".
**Suggested owner:** P1.4.

## R-43 [MINOR] — the pipeline-throw backstop is pinned on the PDF path only

**File:** `features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:735-758` (production `DemoExperience.tsx:521, 553, 589`) · **Lenses:** tests

`guardImportRun` wraps both flows, but the only throw-path bridge test rejects `runPdfImport`; repo-wide grep confirms no `runText` rejection anywhere (`PickerStage.test.tsx:192` rejects the *prop* — the component-local catch, not the bridge guard). Unwrap `runTextImportFlow` (paste + clipboard entry points — not a minor branch) and a pipeline throw re-opens exactly what R-23b closed: an unhandled rejection, `result` stays `null`, the dwell spins forever — suite green. The guard's stale-token arm (`:530`) is likewise unexercised.

**Suggested fix.** One sandbox test mirroring `:735` on the paste route (`runText.mockRejectedValue` → `See error details` → friendly copy). Optionally extend to the token arm using the R-24 test's shape.
**Suggested owner:** P1.4.

## R-44 [MINOR] — R-34's compile pins are enforced by no scripted command

**File:** `features/demo/engine/logic/__tests__/import-log.test.ts:147-153` (`package.json:10`) · **Lenses:** tests

The two `@ts-expect-error` pins live in a never-invoked closure; `vitest` transpiles with esbuild (no type checking), `package.json` has no `typecheck` script, and `vitest.config.mts` doesn't enable `test.typecheck` — so dropping `readonly` from `ImportLogLine` breaks nothing any scripted command runs. The runtime half (fresh-array-per-`getLines()`) is still covered. Practical risk is low — the review workflow runs `tsc --noEmit` every pass — hence MINOR.

**Suggested fix.** Add `"typecheck": "tsc --noEmit"` to `package.json` and reference it in the test comment; alternative: enable `test.typecheck` for `.test-d`-style assertions.
**Suggested owner:** P1.3 (log bus owns `import-log`; the script line is shared infrastructure — trivial either way).

---

## Dropped / Demoted appendix

Nothing was dropped outright; no severity was demoted. Dispositions that changed shape:

| Lane finding(s) | Disposition | Rationale |
|---|---|---|
| SILENT-FAILURES-1 (MAJOR) + TYPESCRIPT-1 (MINOR) + TYPE-DESIGN-N1 (MINOR) | **Merged → R-35, settled MAJOR** | Same underlying defect found independently through three lenses (honesty surface / derivation-scope contradiction / type-scope contradiction). SF's writeup kept as the spine (clearest adversarial sequence); TS's ring-cap-eviction analysis and TD's `SegmentTrust`/`RunTrust` type suggestion folded in. Severity conflict settled MAJOR by the aggregator against the code: the mitigation that justified R-25's original MINOR (two on-screen signals at the CTA moment) does not exist in the mixed-batch case; the fix's own in-code rationale (`:336-341`) fails for batches; the state is strictly worse than pre-fix; and the prior review's R-1 precedent treats under-disclosure on this surface as MAJOR. TD explicitly offered this escalation ("escalate if the aggregator weighs the Escape path more heavily than R-25 did"). |
| TYPESCRIPT-2 + WEB-9 | **Merged → R-36** | Two distinct mechanisms (sync-dispatch teardown; missing capability probe) in the same 6-line detection with one combined fix — the same merge shape the initial review used for R-12. Both lanes' refutation work (engine-by-engine dispatch timing; caniuse data) preserved; severity MINOR per both lanes. |
| SILENT-FAILURES-2's secondary note ("sets `result` without touching `stage`") | **Folded into R-39** | Identical mechanism to TYPE-DESIGN-N2, reported as a completeness note by SF and as a standalone finding by TD. TD's writeup is the richer one (names the §36 staleness and the empty-files edge); SF credited as co-lens. SF-2's *primary* claim (tally drop) is distinct and stands alone as R-38. |
| Tests lane's decision *not* to file the jsdom focus noise vs TYPESCRIPT-3 filing `:58` | **No conflict — R-37 stands** | The tests lane declined it as a *test-quality* defect (correct — no clean-stderr gate exists); the TS lane filed the *production dead line*, with the noise as cost evidence. Different claims about the same line; the production claim is verified (both R-16 tests pass without `:58`). |
| SF-5's "residual risk, not filed" (sync `beforeprint` assumption) vs TYPESCRIPT-2 filing it | **Superseded by R-36** | SF declined to file for lack of a groundable file:line defect; TS then grounded it (listener provably removed in a synchronous `finally` before any deferred dispatch can land, plus named engine deferral paths). SF's instinct that the failure direction is the "safe" overclaim is noted in R-36's severity; the TS evidence is why it is filed at all. |
| R-21's disposition ("FIXED via option B") | **Accepted as FIXED, not PARTIAL** | The original finding explicitly offered "annotate as deliberately outside the gate" as a discharge path; `deriveTerminalOutcome`'s in-file rationale (`ImportModal.tsx:113-115`) plus the `computeImportStage` relocation take exactly that option. Discharged, not deferred. |
| R-33's disposition ("FIXED as accepted deferral") | **Accepted as FIXED** | The finding offered the deferred.md route by name (§27 precedent); §36 is a complete entry with an un-defer trigger. Its writer-inventory staleness is carried forward as part of R-39, not as an R-33 reopen. |

## Raw lane-file inventory

| Lane file | Self-reported (new) | Prior-finding verdicts | New findings → final IDs |
|---|---|---|---|
| `docs/code-reviews/parity/p1/lane-typescript.md` | 0 B / 0 M / 3 m | 8/8 FIXED (TS-1…TS-8 → R-7, R-8, R-10, R-9, R-11, R-2, R-12, R-13) | TYPESCRIPT-1→R-35 (merged) · TYPESCRIPT-2→R-36 (merged) · TYPESCRIPT-3→R-37 |
| `docs/code-reviews/parity/p1/lane-web.md` | 0 B / 0 M / 1 m | 8/8 FIXED (WEB-1…WEB-8 → R-2, R-3, R-14, R-15, R-16, R-17, R-7, R-18) | WEB-9→R-36 (merged) |
| `docs/code-reviews/parity/p1/lane-tests.md` | 0 B / 0 M / 3 m | 7 FIXED, 1 PARTIAL (R-27) (TESTS-1…TESTS-8 → R-5, R-6, R-19, R-20, R-21, R-22, R-27, R-28) | TESTS-9→R-42 · TESTS-10→R-43 · TESTS-11→R-44 |
| `docs/code-reviews/parity/p1/lane-silent-failures.md` | 0 B / 1 M / 1 m | 6 FIXED, 1 PARTIAL (R-25) (SF-1…SF-7 → R-1, R-24, R-25, R-23, R-12, R-26, R-9) | SILENT-FAILURES-1→R-35 (kept as spine) · SILENT-FAILURES-2→R-38 (secondary folded into R-39) |
| `docs/code-reviews/parity/p1/lane-type-design.md` | 0 B / 0 M / 4 m | 8/8 FIXED (TD-1…TD-8 → R-4, R-8, R-29, R-30, R-31, R-32, R-33, R-34) | TYPE-DESIGN-N1→R-35 (merged) · TYPE-DESIGN-N2→R-39 · TYPE-DESIGN-N3→R-40 · TYPE-DESIGN-N4→R-41 |

Lane self-reported new-finding totals: 0 blockers, 1 major, 11 minors (12 raw findings + 1 folded secondary) → after dedupe (3→1 into R-35, 2→1 into R-36, one secondary folded into R-39): **0 BLOCKER · 1 MAJOR · 9 MINOR.** Each lane's verified-clean inventories (architecture re-sweeps, refuted hypotheses, deliberate-choices honored, gates) remain in the lane files and were not contradicted by any other lane.
