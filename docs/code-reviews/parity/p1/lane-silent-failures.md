# Lane: silent-failures — parity P1 (PR #30) — FIX-DELTA

- **Lane:** silent-failures (`.claude/agents/silent-failure-hunter.md`)
- **Mode:** FIX-DELTA (re-review of the six-branch fix round merged after review commit `4a1f807`)
- **Diff under review:** `git diff master...feat/parity-p1`; fix delta = `git diff 4a1f807..feat/parity-p1`
  (27 files, +1067/−252)
- **Refs read:** `.claude/agents/silent-failure-hunter.md`, `features/demo/CLAUDE.md`,
  `docs/code-reviews/parity/p1/p1-review.md` (aggregated), my prior
  `docs/code-reviews/parity/p1/lane-silent-failures.md`, `docs/code-reviews/deferred.md`
  (incl. the new §15 residual, §35 addendum, §36)
- **Fix commits verified (mine):** `a32b929` (R-1/R-32) · `acd8af9` (R-24/R-11) · `b94809a` (R-25) ·
  `087e56b` (R-23a) · `d8af20d` (R-23b) · `0bf7c9e` + `6dbffdf` (R-12/R-16) · `fe1614c` (R-26) ·
  `77949ca` (R-9)
- **Files re-read in full (not just hunks):** `ui/screens/import/ImportTerminalProgress.tsx`,
  `ui/screens/import/PickerStage.tsx`, `ui/screens/import/TerminalLine.tsx`,
  `ui/DemoExperience.tsx`, `ui/import/run-import.ts`, `ui/import/useImportLog.ts`,
  `ui/screens/ImportModal.tsx`, `ui/chrome/PdfPreview.tsx`, `engine/logic/import-log.ts`,
  `engine/logic/import-flow-mode.ts`, `engine/store/persistence.ts`, `engine/store/selectors.ts`,
  `engine/store/create-store.ts` (`applyImport` / `generateExtractedScopes`), `engine/index.ts`
- **Gate run in-worktree:** `npx tsc --noEmit` — clean (no output). Test runs left to the test lane
  (known flake class under contention).

**Explicitly not re-flagged** (orchestrator's deliberate-choice list + deferred.md): trust-line
*wording* (`'sample import · in-browser'` after a post-POST fallback — the underclaim there is the
accepted wording, not the scoping), the dwell semantics, D5 adaptations, the html2pdf non-ship,
§35 non-ports, §36's flat `ImportState`, the picker-vs-terminal reduced-motion asymmetry (both
commit bodies justify it), the `import-flow-mode.ts` move (a rename), pre-existing §15
(`roundTo5Min` half) / §18 / §28.

---

## Fix-delta: every prior finding from this lane

| Prior | Aggregated | Verdict | Fix commit |
|---|---|---|---|
| SILENT-FAILURES-1 | R-1 (MAJOR) | **FIXED** | `a32b929` |
| SILENT-FAILURES-2 | R-24 | **FIXED** | `acd8af9` |
| SILENT-FAILURES-3 | R-25 | **PARTIAL** — single-file/last-file closed, mixed batch open (→ new SILENT-FAILURES-1) | `b94809a` |
| SILENT-FAILURES-4 | R-23 | **FIXED** (both halves) | `087e56b` + `d8af20d` |
| SILENT-FAILURES-5 | R-12 | **FIXED** (both holes) | `0bf7c9e` |
| SILENT-FAILURES-6 | R-26 | **FIXED** (option (a), with ledger entry) | `fe1614c` |
| SILENT-FAILURES-7 | R-9 | **FIXED** | `77949ca` |

### SF-1 / R-1 — `deriveTrust` sticky latch mid-batch — **FIXED**

`ImportTerminalProgress.tsx:101-108` is now the accumulator form, resetting at every `FILE` marker:

```ts
export function deriveTrust(lines: readonly ImportLogLine[]): TerminalTrust {
  let trust: TerminalTrust = 'cloud'
  for (const line of lines) {
    if (line.level === 'FILE') trust = 'cloud'
    else if (line.level === 'NORM' && line.text.startsWith(SAMPLE_FALLBACK_PREFIX)) trust = 'sample'
  }
  return trust
}
```

Verified the segment markers exist on the only path that needs them: `DemoExperience.tsx:561` emits
`FILE` **before** `runPdfImport` for every batch file, and `runTextImportFlow` emits no `FILE` at all
(`:590`), so paste/single-file behaviour is byte-identical. The R-32 half landed with it —
`SAMPLE_FALLBACK_PREFIX` (`run-import.ts:124`) is the single typed contract feeding `emitFallback`'s
three lines (`:135/138/141`), `deriveTrust` (`:105`), and the tests. Batch unit case + a component
mid-batch re-label case are pinned (`ImportTerminalProgress.test.tsx`, `a32b929`).

Adversarial re-trace: 3 PDFs, file 1 → 502 → `sample fallback:` NORM; file 2 → live. Badge at file 2
now reads `File 2 of 3 · cloud model via server proxy`. The underclaim is gone.
Ring-cap interaction re-checked: eviction can only drop an *older* `FILE`/fallback line, which
degrades to the `cloud` default — the overclaim direction the docstring calls safe.

### SF-2 / R-24 — un-tokened `onImportStage` — **FIXED**

`DemoExperience.tsx:399-403` replaces the bare setter with a per-run forwarder:

```ts
const importStageFor = (myGen: number) => (st: RunStageId) =>
  setImp((s) => {
    if (importGen.current !== myGen) return s // stale run — display writes drop too
    return { ...s, activeStage: st, lastRealStage: st === 'error' ? s.lastRealStage : st }
  })
```

Both call sites pass it (`:562`, `:592`). The R-11 `lastRealStage` rides the same updater, so the
frozen-bar-on-failure stage is now sourced from the bridge (`ImportTerminalProgress.tsx:430`) instead
of a never-rendered component ref. The cancel→newer-run scenario I traced is pinned end-to-end
(`DemoExperience.sandbox.test.tsx`, "a cancelled run's late onStage cannot drive a newer run's
terminal"). No stage checkpoint is left un-tokened: `:440`, `:559`, `:563`, `:567`, `:593`, `:597`,
plus the new `:528`.

### SF-3 / R-25 — outcome CTA carried no sample attribution — **PARTIAL**

`ctaView` now takes `trust` and, on `'sample'`, renders the success/partial sub as
`'sample import — review →'` in amber (`ImportTerminalProgress.tsx:343-347, 618`). That closes the
single-file and paste cases exactly as suggested, and is pinned.

**It does not close the batch case, and the R-1 fix is why:** `trust` is now the *current segment's*
mode, so a run whose substitution happened on any file other than the last derives `'cloud'` at CTA
time and the attribution silently disappears. Filed below as SILENT-FAILURES-1 (the R-25 fix and the
R-1 fix each verified in isolation; the interaction is what leaks).

### SF-4 / R-23 — unreachable, breadcrumb-free PickerStage catch + hangable dwell — **FIXED**

(a) Both `PickerStage` catches now breadcrumb before the (production-discarded) `setError`:
`PickerStage.tsx:207` and `:253` — `console.error('[demo/import] import run threw', e)`. The
comments state plainly that the console line is the *only* signal once the stage flip unmounts them.

(b) `guardImportRun` (`DemoExperience.tsx:521-539`) wraps both run bodies (`:553`, `:589`):
breadcrumb → `ERR` log line (no-op if superseded) → token check → a failure `result`, which releases
the dwell through the normal `See error details →` path. Pinned with a *rejecting* `runPdfImport`
(`DemoExperience.sandbox.test.tsx`, "an unexpected pipeline THROW cannot hang the dwell"), asserting
the breadcrumb, the friendly copy, the raw throw under Technical Details, and zero locations created.
Residual (new, minor) about what the backstop does to a *partially successful* batch is filed below
as SILENT-FAILURES-2.

### SF-5 / R-12 — blocked-print detection — **FIXED** (both holes)

`PdfPreview.tsx:29-65`. The `contentWindow`/`print` probe is inside the `try` (`:34-38`), so the
cross-origin `SecurityError` the sandbox comment documents renders the honest notice instead of
escaping. Success is now a **positive** signal: a `beforeprint` listener on the framed window
(`:44-48`), with `setPrintNotice(dialogOpened ? null : PRINT_BLOCKED_NOTICE)` at `:61` — a
silently-ignored `print()` no longer clears a prior notice. The "two failed saves leave no notice"
regression is pinned (`PdfPreview.test.tsx`, "notice must survive"), as is the silent-ignore case and
the cross-origin probe. R-16's focus return sits in the inner `finally` (`:52-60`) so it runs on the
dialog, throw, and silent-ignore branches alike.

*Residual risk, not filed as a finding (no file:line defect I can ground):* the detection now depends
on `beforeprint` firing **synchronously on the framed window**. That is what the HTML printing steps
specify and what the stub models, but if some engine fires it on the top-level window or
asynchronously, a *successful* save would render the blocked notice. That is the safe (overclaim)
direction, and a one-line widening (`window.addEventListener('beforeprint', markOpened)` alongside
the frame listener) would absorb it if a browser matrix ever shows it.

### SF-6 / R-26 — relocation comment overstated its coverage — **FIXED**

`selectors.ts:74-84` now names the two covered boundaries and states that the third (scope-row
edit/add after an offset) deliberately does not warn, with the reason (per-keystroke `updateField`
writes would reproduce the spam R-33 removed). `deferred.md` §15 carries the residual with a concrete
un-defer trigger (P2.4/G8, when scope writes gain a commit boundary). Option (a) of my suggested fix,
taken cleanly; the visitor surface (`adjustedScopesPartial`) is untouched.

### SF-7 / R-9 — rehydrated dangling `currentCaseId` — **FIXED**

`persistence.ts:419-422` — the open-location lookup now also requires the owning case:

```ts
const openLocation =
  d.currentLocationId !== null
    ? d.locations.find((l) => l.id === d.currentLocationId && caseIds.has(l.caseId))
    : undefined
```

Exactly the one-condition fix. An orphaned open location drops whole, the `currentLocationId === null`
branch (`:434-437`) restores the view to `'cases'`, and the location DATA still survives. Red-first
test added in `persistence.test.ts`.

---

## New findings (fix-introduced only)

## SILENT-FAILURES-1 [MAJOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:433

**Claim.** The R-1 fix made `trust` **segment-scoped** and the R-25 fix wired the CTA's sample
attribution to that same `trust`. In a batch whose substitution happened on any file but the last,
the dwell now carries **no substitution signal at all**: the title-bar trust line reads
`cloud model via server proxy`, the CTA reads the muted `Review import →` over a green
"Batch complete — 2 of 2 locations", and the amber `sample fallback:` line has scrolled above the
fold. Before this fix round the sticky latch kept the title bar reading `sample import · in-browser`
in exactly this case — wrongly attributed per-file (that was R-1), but *present*. The run-level
"something was substituted" signal at the dwell was lost as a side effect of fixing R-1.

**Evidence.**

- `ImportTerminalProgress.tsx:433` — one derivation feeds both surfaces:
  ```ts
  const trust = useMemo(() => deriveTrust(lines), [lines])   // :433 — segment-scoped since R-1
  const cta = outcome === null ? null : ctaView(outcome, isBatchRun, trust)  // :435
  const trustLine = TRUST_LINE[trust]                        // :511 → title bar :543-545
  ```
- `deriveTrust` resets on every `FILE` line (`:104`); `DemoExperience.tsx:561` emits one `FILE` per
  batch file. So after the last file's marker, an earlier file's fallback is invisible to the
  derivation.
- `ctaView`'s attribution is gated on that value (`:344-347`), so the amber
  `'sample import — review →'` sub simply doesn't render.
- The bridge already holds the run-scoped truth and does not pass it down:
  `DemoExperience.tsx:473` — `tally.notice = tally.notice ?? fallbackNotice(res.fallbackMode)` — so
  `result.notice` is set for the run, but the notice only paints **after** the CTA tap
  (`ImportModal.tsx:259-261, 275-277`).
- The close path discards the result view while the location persists: `onCancel` →
  `setImp(blankImport)` (`DemoExperience.tsx:916-923`); the sample-substituted location was already
  written by `applySuccess` (`:445-449`). `ModalShell` closes on Escape (`_shared.tsx`), so one
  keystroke is enough. `DemoLocation` still has no sample flag (`grep isSample` → only
  `importResultData.ts:40,104` and `ImportResultAccordion.tsx:41`, all ephemeral).
- Uncovered by tests: the R-25 pin (`ImportTerminalProgress.test.tsx`, "a sample-substituted run
  marks the CTA itself") emits a bare `NORM` fallback line with **no `FILE` markers**, i.e. only the
  single-segment shape. The R-6 e2e partial-batch test uses two `fallbackMode:'none'` files.

**Adversarial sequence.** Visitor picks `a.pdf` + `b.pdf`. `a.pdf`'s `/api/extract` returns 502 →
`fallbackMode='error'` → the fictional SAMPLE request is imported as a location. `b.pdf` succeeds
live. At the dwell the visitor sees: headline "Batch complete", title bar
"cloud model via server proxy", a green CTA "Batch complete — 2 of 2 locations / Review import →",
and a log tail showing `b.pdf`'s ~15 lines + `DONE batch complete` (the 260px panel cannot also show
`a.pdf`'s fallback line). They press Escape. Two locations are in the case; one is entirely fictional
(business name, address, phone, DVR model, time frames) and nothing ever said so.

**Suggested fix.** Keep `deriveTrust` segment-scoped for the live per-file labels (that is R-1's
point) and give the CTA a **run-scoped** signal. Either:

```ts
// (a) in ImportTerminalProgress — sibling of deriveTrust, no FILE reset
export function runHadSampleFallback(lines: readonly ImportLogLine[]): boolean {
  return lines.some((l) => l.level === 'NORM' && l.text.startsWith(SAMPLE_FALLBACK_PREFIX))
}
const cta = outcome === null ? null : ctaView(outcome, isBatchRun, runHadSampleFallback(lines) ? 'sample' : 'cloud')
```

or (b), avoiding a second prose scan entirely: pass the bridge's own run-scoped truth down —
`ImportModal` already has `result`, so `runHadSample={result?.ok === true && result.notice !== undefined}`
into the terminal. Add a batch case to the R-25 pin (FILE → fallback → FILE → live → success outcome
must still read `sample import — review →`).

**Confidence.** High — derivation, emit ordering, and both consumer sites are all in-file; the only
soft edge is "the amber line has scrolled off", which depends on row height (the panel is
`minHeight: 260` and a live file emits ~15 lines).

## SILENT-FAILURES-2 [MINOR] features/demo/ui/DemoExperience.tsx:529

**Claim.** `guardImportRun`'s catch replaces the whole result with a **total-failure** card, but the
run's `tally` is local to the closure it aborted — so any files that already succeeded are dropped
from the report while their locations remain written in the store. The visitor is told "Import
failed" and the case silently gains locations they were told did not import. The backstop that exists
to make a throw honest is itself the un-honest surface for a partial batch.

**Evidence.**

- `DemoExperience.tsx:529-537` — the catch builds a failure result with no `locations`/`failures`
  and never consults the run's tally:
  ```ts
  setImp((s) => ({ ...s, activeStage: 'error',
    result: { ok: false, error: 'The import failed unexpectedly. Please try again.',
              details: { stage: s.activeStage ?? 'extracting_text', detail } } }))
  ```
- The tally is created *inside* the guarded body (`:557`) and is unreachable from the catch; the
  successes it holds were already committed to the store by `applySuccess`
  (`store.getState().addLocation(...)` + `applyImport(...)`, `:445-449`) before the throw.
- Downstream the card renders the aggregate failure only (`ImportModal.tsx:235-249`) — no
  `FailuresCard`, no location rows — and `Try again` re-runs from the picker, so a second pass would
  duplicate the locations that did land.
- **Reachability is low and I want to be honest about it:** no callee throws today. I re-verified the
  new-code neighbours — `applyImport`'s dev probe is fully try-wrapped (`create-store.ts:451-459`),
  `generateExtractedScopes` isolates per entry (`:337-356`), `forwardGeocode` returns `null`,
  `emitter.log` cannot throw (`import-log.ts:126-132`). This is the same latency caveat the backstop
  itself is built on.
- Secondary, same catch: it sets `result` without touching `stage`, so a throw landing *before* the
  first `stage:'progress'` write (`:560` / `:591`) would leave `computeImportStage` returning
  `'picker'` and the failure result rendered nowhere — the console breadcrumb would be the only
  signal. The window is one `emitter.log` call wide, so this is a completeness note, not a live path.

**Suggested fix.** Hoist the tally so the backstop can tell the truth about a partial run — e.g. move
the `try/catch` inside each run body around the loop, or pass the tally into `guardImportRun` and
have the catch call `finishImport(tally, emitter, total)` after pushing a synthetic failure row for
the file that threw. Cheapest alternative if the shape is not worth changing: have the catch fall
back to `stage: s.stage === 'progress' ? s.stage : 'result'` and word the copy so it cannot deny
locations that landed ("The import failed unexpectedly — some files may already have been imported;
check the case."). Add a test: two files, second `runPdfImport` rejects, assert the first location is
still reported (and not silently orphaned).

**Confidence.** High on the mechanism and the store-write ordering; low on reachability (stated
above) — hence MINOR.

---

## Verified clean in the fix delta (recording so a later pass doesn't re-open them)

- **No breadcrumb was removed.** The delta only *adds* `console.error` lines
  (`PickerStage.tsx:207,253`, `DemoExperience.tsx:525`). `extract-client.ts`'s 503-vs-everything-else
  split and its three warns are untouched (the file is not in the delta at all); `pdf-extract.ts` is
  untouched.
- **The exhaustive fallback machinery survives every fix.** `fallbackNotice`'s `never` arm
  (`DemoExperience.tsx:408-423`), `emitFallback`'s `never` arm (`run-import.ts:132-148`), and
  `ctaView`'s `never` arm (`ImportTerminalProgress.tsx:389-393`) are all intact; the R-25 change
  threads a value through `ctaView` without touching its exhaustiveness.
- **R-29's required `code`/`details`** (`run-import.ts:100-113`) is honoured by all three failure
  producers (`:204-212`, `:220-227`, `:249-257`); `runPdfImport`'s `{ ...result, filename }` spread
  preserves them. `ERROR_MESSAGES` is now `Partial<Record<ImportErrorCode, string>>`
  (`ImportModal.tsx:61`) and the load-bearing `|| result.error` fallback (`:243`) still renders the
  deliberately-unmapped `PDF_SCANNED` / `NO_FIELDS_FOUND` strings verbatim.
- **R-30's `businessName` removal** did not disturb the honest partial path: `partialData` is still
  built from the model-read OCC# (`run-import.ts:203`) and `DataFoundCard` still renders it
  (`ImportModal.tsx:172-180`).
- **The blank-record guard (deferred §3)** survives untouched: `run-import.ts:198-213`
  (`fallbackMode === 'none' && fieldCount === 0 && timeFrameCount === 0` → `ok:false`).
- **R-11's `lastRealStage`** cannot lie in the freeze direction: it is only ever written to a
  non-`'error'` stage (`DemoExperience.tsx:402`), and `effectiveStage`
  (`ImportTerminalProgress.tsx:430`) falls to `PREPARING` rather than a stale band when it is null.
- **R-2's new pin arming** (`onPointerDown` / `onKeyDown`, `ImportTerminalProgress.tsx:563-564`)
  cannot flip the pin from a programmatic tail scroll: an armed flag is only consumed by the next
  `scroll` event, and every sequence I traced (expand-detail while pinned / while scrolled up /
  jump-pill) settles to the same pin value the user already had.
- **R-34's `readonly`** (`import-log.ts:44-53`) did not weaken the run-token isolation
  (`:127`, `:134`) or the `getLines()` copy (`:145`); `useImportLog`'s coalescer is unchanged and
  still cancels its frame on unmount (`useImportLog.ts:98-103`).
- **R-10's barrel removal** left no dangling importer (every consumer uses the internal path;
  `barrel.test.ts` now pins `importLogBus`/`createImportLogBus` *off* the surface).
- `npx tsc --noEmit` clean in-worktree.

## Silent Failure Hunter Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 1 |

- **Prior findings:** 6 of 7 FIXED, 1 PARTIAL (R-25 — the mixed-batch remainder is SILENT-FAILURES-1).
- **Fallback honesty (every substitution announced):** *at the dwell*, no for the mixed batch
  (SILENT-FAILURES-1); yes on every other path — the notice switch, `result.notice`, the per-card
  `isSample` badge and the amber log line all survive.
- **Failure-cause distinctions preserved:** yes — required `code`/`details`, union-keyed
  `ERROR_MESSAGES`, the 503/non-503 split, and the typed `SAMPLE_FALLBACK_PREFIX` all strictly add
  cause information.
- **Partial results flagged (not silently short):** one gap, throw-conditional
  (SILENT-FAILURES-2); `extractedScopesPartial` / `adjustedScopesPartial` untouched.
- **Async cancellation / stale-write safety:** complete — the last un-tokened callback (`onStage`)
  is now guarded, and the new backstop is token-checked too.
- **Operator breadcrumbs intact:** yes, plus three added by this round.

**Verdict: APPROVE-WITH-FIXES** — SILENT-FAILURES-1 is a 3-line additive fix and should land before
merge (it is the honesty bar on the demo's marquee surface); SILENT-FAILURES-2 is opportunistic or a
`deferred.md` line.
