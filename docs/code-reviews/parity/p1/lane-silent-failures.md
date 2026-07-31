# Lane: silent-failures — parity P1 (PR #30)

- **Lane:** silent-failures (`.claude/agents/silent-failure-hunter.md`)
- **Mode:** INITIAL (full review of the diff)
- **Diff under review:** `git diff master...feat/parity-p1` — 58 files, +4427/−329
- **Refs read:** `.claude/agents/silent-failure-hunter.md`, `features/demo/CLAUDE.md`,
  `docs/code-reviews/deferred.md` (incl. new §33/§34/§35), `docs/planning/demo-phone-parity/demo-inventory.md`
- **Files traced in full (not just hunks):**
  `engine/logic/import-log.ts`, `engine/logic/import-normalize.ts`, `engine/store/create-store.ts`,
  `engine/store/persistence.ts`, `engine/store/selectors.ts`, `engine/logic/time.ts`,
  `ui/DemoExperience.tsx`, `ui/import/run-import.ts`, `ui/import/useImportLog.ts`,
  `ui/import/extract-client.ts`, `ui/import/pdf-extract.ts`, `ui/chrome/PdfPreview.tsx`,
  `ui/screens/ImportModal.tsx`, `ui/screens/_shared.tsx`,
  `ui/screens/import/{ImportTerminalProgress,TerminalLine,PickerStage,PasteStage,import-flow-mode}.tsx|ts`,
  `app/demo/error.tsx`, `ui/demo.css` + the font-var mechanical changes.

**Explicitly not re-flagged** (orchestrator's deliberate-choice list + deferred.md): the D5 honesty
adaptations (§33), the html2pdf non-ship and print-only save (§34), the P1.5 non-ports — dry-run,
unmapped `PDF_SCANNED`/`NO_FIELDS_FOUND`, single-failure card, proxy 503/network absent from the
failure map (§35), the `T+seconds.xx` gutter, the deliberate no-virtualization decision, the
"nothing leaves this phone" omission, the dwell itself, R-34's duplicated value-guards, the dwell
test migrations, and pre-existing tracked §15 (`roundTo5Min` half) / §18 / §28.

**Verified-clean highlights** (checked and found sound — recording so a later pass doesn't re-open them):

- `FallbackMode` notice switch (`DemoExperience.tsx:387-402`) is still `never`-guarded and exhaustive;
  the new `emitFallback` switch (`run-import.ts:108-124`) is exhaustive by the same construction, and
  *every* sample substitution emits a `sample fallback:` NORM line before the result is built.
- `extract-client.ts`'s 503-vs-everything-else split and all three `console.warn` breadcrumbs are intact.
- `pdf-extract.ts`'s deliberate teardown swallow is untouched; `runPdfImport` still narrows on
  `PdfExtractionError` and now additionally preserves the raw message in `details.detail`.
- The blank-record guard (`fieldCount === 0 && timeFrameCount === 0` → `ok:false`, deferred §3) survives
  and gained honest `partialData`; `occurrenceNumber` is deliberately excluded from `fieldCount`.
- Generation-token discipline on the *store-writing* path is complete: `applySuccess` re-checks after the
  geocode await (`DemoExperience.tsx:419`), the batch loop re-checks before each file and after each file
  (`:508`, `:512`, `:516`), and `finishImport` is unreachable from an invalidated run. `importLogBus`
  carries its own equivalent `runToken` (`import-log.ts:99,122`) so a cancelled run's late lines drop.
- `useImportLog`'s rAF coalescer is correct under interleaved `reset`/`line` batches, replaces the pending
  batch before `setView` (no lost lines), and cancels the pending frame on unmount.
- `openImport` resets `imp` before opening (`DemoExperience.tsx:358`), so the stale-result-on-reopen hazard
  the new `onCancel` reset targets is closed on *all* modal-open paths.
- Font migration is complete — no bare `'JetBrains Mono'` / `'Share Tech Mono'` families remain under
  `features/demo/`, and `--font-jbmono` / `--font-stmono` are both defined in `app/layout.tsx`.
- `app/demo/error.tsx`'s R-31 breadcrumb is ungated and carries the cause. Correct.

---

## SILENT-FAILURES-1 [MAJOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:81-86

**Claim.** `deriveTrust` is **run-scoped and sticky**: the first `sample fallback:` line anywhere in the
run latches the trust line to `sample` for the rest of the run. In a *batch* import that means every
file processed **after** the first fallback is described to the visitor as `sample import · in-browser`
while its extracted document text is in fact being POSTed to `/api/extract` and forwarded to a cloud
model. This is an **underclaim of data exposure** — the exact direction the function's own docstring
says is never safe.

**Evidence.**

- `ImportTerminalProgress.tsx:81-86` — the derivation returns on the first match and never resets:
  ```ts
  export function deriveTrust(lines: readonly ImportLogLine[]): TerminalTrust {
    for (const line of lines) {
      if (line.level === 'NORM' && line.text.startsWith('sample fallback:')) return 'sample'
    }
    return 'cloud'
  }
  ```
- `ImportTerminalProgress.tsx:74-79` states the rule it is violating: *"overclaiming exposure is safe;
  underclaiming never is."*
- The bus is **one run per batch**, not per file — `DemoExperience.tsx:502` (`importLogBus.beginRun`) is
  called once, outside the `for` loop at `:507-515`, and the comment at `:500-501` says so explicitly
  ("a batch is ONE run, like the phone"). So file 1's fallback line stays in `lines` for files 2..N.
- The stale value is rendered in two places: the terminal title bar (`:474-476`) and — worse — the
  per-file processing badge (`:549-552`), which composes it as
  `File ${batch.current} of ${batch.total} · sample import · in-browser`. That is a per-file claim about
  a file that is going to the cloud.
- No test covers it: `__tests__/ImportTerminalProgress.test.tsx:137-148` only exercises single-line inputs.

**Adversarial sequence.** Visitor selects 3 PDFs. File 1's `/api/extract` call returns 502 (or the fetch
rejects) → `run-import.ts:157-158` sets `fallbackMode='error'` → `emitFallback` emits
`NORM "sample fallback: couldn't reach the live model — importing the sample request"`. Files 2 and 3
then succeed live (`run-import.ts:145` emits `AI Request → /api/extract`, the document text leaves the
browser). Throughout files 2 and 3 the badge reads **"File 2 of 3 · sample import · in-browser"** and the
title bar reads **"sample import · in-browser"**.

**Suggested fix.** Make the derivation **segment-scoped**, matching how the log is already segmented: scan
only the lines at/after the last `FILE`-level marker (emitted at `DemoExperience.tsx:510` for every file),
or equivalently reset the latch on each `FILE` line. Minimal patch:

```ts
export function deriveTrust(lines: readonly ImportLogLine[]): TerminalTrust {
  let trust: TerminalTrust = 'cloud'
  for (const line of lines) {
    if (line.level === 'FILE') trust = 'cloud'          // new file → back to the live path
    else if (line.level === 'NORM' && line.text.startsWith('sample fallback:')) trust = 'sample'
  }
  return trust
}
```
Add a batch case to the `deriveTrust` unit test (FILE → sample fallback → FILE → AI Request must read
`cloud`). Note this also keeps the single-file behaviour byte-identical, so the existing pins hold.

**Confidence.** High — grounded in the emit ordering in `DemoExperience.tsx:502/507-515` and
`run-import.ts:145/157-158`, and in the component's own stated invariant.

---

## SILENT-FAILURES-2 [MINOR] features/demo/ui/DemoExperience.tsx:382

**Claim.** `onImportStage` is the one import-pipeline callback with **no generation-token re-check**. A
cancelled/superseded run's late `onStage` still writes `activeStage` into the live `imp` state, so a
stale run can drive a newer run's terminal headline and progress bar. With P1.5 this got more
load-bearing: `activeStage` is now retained through the dwell and is what freezes the bar on a failure —
and the code states the invariant it can break ("failure keeps the bar where the pipeline stopped — a
full bar on a failed run would be a lie", `ImportTerminalProgress.tsx:382-384`).

**Evidence.**

- `DemoExperience.tsx:382` — no token, no guard:
  ```ts
  const onImportStage = (st: RunStageId) => setImp((s) => ({ ...s, activeStage: st }))
  ```
- The same callback instance is handed to every run (`:511`, `:539`), and cancellation does **not** abort
  the in-flight pipeline — `onCancel` (`:861-868`) only bumps `importGen` and resets the bus. `runImport`
  keeps calling `onStage?.('normalizing')` / `('done')` / `('error')` (`run-import.ts:162,190,195`) after
  the fetch settles.
- Every *other* post-await write is guarded (`:419`, `:508`, `:512`, `:516`, `:540`, `:544`) — this is the
  one omission, so it reads as an oversight rather than a decision.

**Adversarial sequence.** Run A (paste import) is waiting on `/api/extract` (proxy timeout is 30 s).
Visitor hits ✕, reopens Import, starts run B on a PDF. Run B is at `extracting_text` (headline
"Extracting text from PDF…", bar 0 %). Run A's fetch settles and fires `onStage('normalizing')` then
`onStage('done')` → run B's terminal jumps to "Normalizing extracted data… 55 %" then
"Saving to case… 80 %" while run B is still reading the PDF. If run B then fails, the "frozen" bar is
frozen at run A's stage, not run B's.

**Suggested fix.** Bind the callback to the run's generation, mirroring every other checkpoint:

```ts
const importStageFor = (myGen: number) => (st: RunStageId) =>
  setImp((s) => (importGen.current === myGen ? { ...s, activeStage: st } : s))
// …and pass `onStage: importStageFor(myGen)` at :511 and :539.
```

**Confidence.** High on the mechanism; medium on visitor impact (display-only — no store write and no
result is affected, both of those remain token-guarded).

---

## SILENT-FAILURES-3 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:294-310

**Claim.** The outcome CTA carries **no sample attribution**. Combined with P1.5's dwell, a
sample-substituted import can now complete, write a location into the visitor's case, and be dismissed
without the `fallbackNotice` copy or the `isSample` badge ever rendering — the two loudest pieces of the
honesty machinery both live behind the CTA tap. Pre-P1.5 the modal auto-flipped to the result view, so
the notice was always painted at least once.

**Evidence.**

- `ImportTerminalProgress.tsx:294-310` — the success CTA is a green check with
  `headline/title: 'Import ready for review'`, `sub: 'Review import →'`. Nothing about the substitution.
- `finishImport` (`DemoExperience.tsx:485-488`) deliberately leaves `stage:'progress'`, so the notice
  (`ImportModal.tsx:241-243`) and the `isSample` badge (`ImportResultAccordion.tsx:41`) render only after
  `onReviewImport` (`DemoExperience.tsx:845`).
- Closing during the dwell discards the result outright: `onCancel` → `setImp(blankImport)`
  (`DemoExperience.tsx:866`). `ModalShell` also closes on Escape (`_shared.tsx:44-50`), so one keystroke
  is enough.
- Nothing persistent marks the created location: `grep isSample` returns only `importResultData.ts:40,104`
  and `ImportResultAccordion.tsx:41` — all in the ephemeral result view. `DemoLocation` has no sample flag,
  so after dismissal the fictional business name / address / phone / DVR model / time frames are
  indistinguishable from a real extraction.
- Mitigating (why this is MINOR, not MAJOR): the dwell terminal *does* announce it twice — the amber
  `NORM "sample fallback: …"` log line and the `sample import · in-browser` trust line. Both are on screen
  at the moment of the CTA. The announcement exists; only its prominence regressed.

**Suggested fix.** Put the attribution on the one element the visitor must look at to leave the dwell.
`ImportTerminalProgress` already computes `trust`; thread it into `ctaView` and, when `trust === 'sample'`,
render the success/partial `sub` as e.g. `'sample import — review →'` (and keep the amber `partial`
palette for `success` + `sample`). Cheap, additive, and it keeps the notice honest on the close path.

**Confidence.** High on the mechanism and the trace; the severity call reflects that the terminal's own
two signals are genuinely present.

---

## SILENT-FAILURES-4 [MINOR] features/demo/ui/screens/import/PickerStage.tsx:145-156

**Claim.** `startPdfImport`'s catch is **unreachable in practice and breadcrumb-free**. The parent flips
the stage to `'progress'` on its first `setImp`, which unmounts `PickerStage`; any later throw from
`processPdfFiles` lands in a catch whose `setError` is discarded by React on an unmounted component, with
no `console` line. The dwell makes the consequence worse than before: `stage` stays `'progress'` and
`result` stays `null` forever, so the terminal spins indefinitely with **zero** signal to visitor or
operator.

**Evidence.**

- `PickerStage.tsx:145-156`:
  ```ts
  const startPdfImport = async (files: File[]) => {
    setIsReadingFile(true)
    try { await props.onPdfFilesSelected(files) }
    catch { setError(PICKER_COPY.fileReadFailed) }   // no console breadcrumb
    finally { setIsReadingFile(false) }
  }
  ```
- The unmount happens inside the awaited call, before anything that could realistically throw:
  `DemoExperience.tsx:509` sets `stage:'progress'` on the first loop iteration; `ImportModal.tsx:191-199`
  renders `PickerStage` only while `stage === 'picker'`.
- No other surface catches it: `processPdfFiles` (`:492-518`) has no `try`, and the terminal has no
  timeout/failsafe — `finishImport` is the only writer of `result`.
- This is deferred §18's shape ("async handlers with no top-level `.catch()`"), and I re-verified its
  latency claim still holds — `extractPdfText`, `requestExtraction` (incl. its `JSON.stringify`),
  `parseNormalizeMap`, `forwardGeocode` and the new dev-only `calculateCorrectedTimeRange` probe in
  `applyImport` are all internally guarded, so nothing throws **today**. The finding is that the new
  handling *looks* like it closed §18 when it did not.

**Suggested fix.** Two lines, no refactor: (a) add `console.error('[demo/import] import run threw', e)` in
the `PickerStage` catch so the operator gets a breadcrumb even after unmount; (b) wrap the body of
`processPdfFiles` / `runTextImportFlow` in a `try/catch` that sets a failure result
(`setImp(s => ({ ...s, result: { ok:false, error: 'Import failed unexpectedly.' } }))`) — that also
releases the dwell instead of hanging it. Alternatively, note in §18 that the catch is decorative and the
trigger has not fired.

**Confidence.** High on the unreachability and the missing breadcrumb; the "would hang forever" outcome is
conditional on a throw that no current call site can produce.

---

## SILENT-FAILURES-5 [MINOR] features/demo/ui/chrome/PdfPreview.tsx:28-41

**Claim.** `printDocument` treats *"`win.print()` returned normally"* as success and clears any prior
notice — but a browser that refuses to open the print dialog **returns normally too**. The file's own
sandbox comment documents exactly that behaviour ("a sandboxed document without [`allow-modals`] silently
ignores `print()` — 'Ignored call to `print()`' in Chromium"), so the honest-failure path is built on a
signal that the known failure mode does not produce.

**Evidence.**

- `PdfPreview.tsx:28-41`:
  ```ts
  if (!win || typeof win.print !== 'function') { setPrintNotice(PRINT_BLOCKED_NOTICE); return }
  try { win.focus(); win.print(); setPrintNotice(null) } catch { setPrintNotice(PRINT_BLOCKED_NOTICE) }
  ```
  The only detected failures are a missing `contentWindow` and a **thrown** exception.
- `PdfPreview.tsx:79-89` — the sandbox comment states the silent-ignore semantics as the reason
  `allow-modals` is present. That is the same class of failure the notice is supposed to cover.
- Secondary, concrete regression: `setPrintNotice(null)` on the "success" branch **clears** the notice. If
  click 1 is blocked (notice shown) and click 2 is silently ignored (no throw), the visitor ends up with
  *no* error message at all after two failed saves. This is the "worse the second time" shape.
- `PRINT_BLOCKED_NOTICE` (`:14-16`) claims "never a fake success" — the code cannot currently honour that
  claim for the documented failure mode.

**Suggested fix.** Use a positive signal instead of the absence of a throw. `window.print()` fires
`beforeprint` on the framed window in every engine that actually opens the dialog:

```ts
let opened = false
const onBefore = () => { opened = true }
win.addEventListener('beforeprint', onBefore)
try { win.focus(); win.print() } catch { /* fall through to the notice */ }
win.removeEventListener('beforeprint', onBefore)
setPrintNotice(opened ? null : PRINT_BLOCKED_NOTICE)
```
At minimum, stop clearing the notice on the unverified-success branch (leave the previous notice standing).

**Confidence.** High that the detection is incomplete-by-construction and that the second-click clear is a
real downgrade; medium on how often a real browser silently ignores `print()` with `allow-modals` set
(I could not exercise a browser matrix here).

---

## SILENT-FAILURES-6 [MINOR] features/demo/engine/store/selectors.ts:77-84

**Claim.** R-33 moved the non-canonical-scope breadcrumb from the render-scoped selector to "the
boundaries that create the condition", naming two (`generateExtractedScopes`, `applyImport`). There is a
**third** boundary it doesn't cover — adding or editing a requested-scope row *after* the offset exists —
and on that path no warn fires anywhere. The comment's coverage claim is therefore stronger than the code.

**Evidence.**

- `selectors.ts:77-84` — the catch is now deliberately silent, citing coverage at the two event boundaries.
- `create-store.ts:442-461` — the `applyImport` warn is gated on `off && patch._import.timeFrames.length`,
  i.e. **import-after-offset** only.
- `create-store.ts:356-358` — the `generateExtractedScopes` warn fires only on Calculate/Regenerate
  (`DemoExperience.tsx:551-554`, `:724`).
- The uncovered path: `DemoExperience.tsx:666` `onAdd={() => sc.add(blankScope())}` writes a scope row with
  empty `startDateTime`/`endDateTime` through `updateField`. With an offset already committed,
  `calculateCorrectedTimeRange` throws for that row (`time.ts:50-54` fails loud on an unparseable date) →
  `selectAdjustedScopes` drops it silently. `generateExtractedScopes` is not re-run, and `applyImport` is
  not involved.
- Visitor-facing surface is intact: the adjusted column stays blank and
  `selectors.ts:234` (`adjustedScopesPartial`) still annotates the generated document — this is an
  *operator observability* gap only, hence MINOR.

**Suggested fix.** Either (a) narrow the comment in `selectors.ts:77-84` to say which boundaries are
covered and log the gap in deferred.md §15 alongside the still-open `roundTo5Min` half, or (b) emit the
same dev-warn from the scope-list write path (the `updateField('form.scopes', …)` branch in
`create-store.ts`) when an offset is present, keeping it event-scoped as R-33 intends.

**Confidence.** High on the uncovered path; low-to-medium on impact (a freshly added, still-empty row is
self-evidently blank to the visitor).

---

## SILENT-FAILURES-7 [MINOR] features/demo/engine/store/persistence.ts:419-426

**Claim.** R-32's pair-coherence repair derives `currentCaseId` from `openLocation.caseId` **without the
`caseIds.has(...)` validation the previous code applied**. A snapshot whose open location points at a case
that isn't in `cases` now rehydrates a *dangling* `currentCaseId` where it used to rehydrate `null`. The
comment frames rehydration as "the one construction path that ingests state the engine didn't produce",
which is exactly the posture that argues for validating it.

**Evidence.**

- `persistence.ts:418-426`:
  ```ts
  const caseIds = new Set(d.cases.map((c) => c.id))
  const openLocation = d.currentLocationId !== null ? d.locations.find(...) : undefined
  const currentLocationId = openLocation ? openLocation.id : null
  const currentCaseId = openLocation
    ? openLocation.caseId                                   // ← never checked against caseIds
    : d.currentCaseId !== null && caseIds.has(d.currentCaseId) ? d.currentCaseId : null
  ```
  `caseIds` is now consulted only on the *no-location* branch. The pre-R-32 code validated both.
- `persistedStateSchema` (`:311+`) is a shape guard only — it does not enforce referential integrity
  between `locations[].caseId` and `cases[].id`, and `loadSnapshot` has no other filter for dangling
  `caseId`s.
- Downstream, a dangling `currentCaseId` makes `selectCurrentCase` return `null` while a location is open,
  and `completeCase(loc.caseId)` (`create-store.ts:227-237`) stamps the location but silently matches no
  case — a "Complete & Save" that half-lands.
- **Reachability is low and I want to be honest about it:** the engine has no `deleteCase`/`deleteLocation`
  action (grep returns nothing), so engine-produced snapshots always satisfy the invariant. This is a
  hand-tampered / corrupted-sessionStorage path only, i.e. a defensive-hardening gap, not a live defect.

**Suggested fix.** One condition:

```ts
const openLocation =
  d.currentLocationId !== null
    ? d.locations.find((l) => l.id === d.currentLocationId && caseIds.has(l.caseId))
    : undefined
```
That keeps the R-32 law ("the open location owns the case") and restores the R-15 dangling-id drop for the
case half — a location whose owner is missing simply isn't reopened, which the existing
`currentLocationId === null` branch (`:430-433`) already handles by restoring to `'cases'`.

**Confidence.** High that the validation was dropped; low on reachability (documented above).

---

## Silent Failure Hunter Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 6 |

- **Fallback honesty (every substitution announced):** yes for the *result* path (notice switch, per-card
  `isSample`, every `FallbackMode` transition emits a log line) — but the terminal's trust line
  **inverts** the claim mid-batch (SILENT-FAILURES-1) and the CTA carries no attribution
  (SILENT-FAILURES-3).
- **Failure-cause distinctions preserved:** yes. `ImportErrorCode` + `details.detail` + `partialData`
  strictly *add* cause information; the 503/non-503 split and all `extract-client` breadcrumbs survive.
- **Partial results flagged (not silently short):** yes. `extractedScopesPartial` / `adjustedScopesPartial`
  are intact; the new `applyImport` counter follows the `generateExtractedScopes` model-citizen pattern.
- **Async cancellation / stale-write safety:** one gap — `onImportStage` (SILENT-FAILURES-2). Every
  store-writing checkpoint is correctly tokened, and the log bus carries its own `runToken`.
- **Operator breadcrumbs intact:** yes, with one relocation (R-33, SILENT-FAILURES-6) and one missing new
  breadcrumb (SILENT-FAILURES-4). No prior-review breadcrumb was deleted; R-31 and R-38 *added* honest ones.

**Verdict: REVISE** — fix SILENT-FAILURES-1 before merge; the six MINORs are opportunistic.
