# Lane: type-design — phase review `p1` (PR #30)

**Mode:** INITIAL (full review of the diff)
**Diff under review:** `master...feat/parity-p1` (58 files, +4427/−329)
**Lane definition:** `.claude/agents/type-design-analyzer.md`
**Binding contract read:** `features/demo/CLAUDE.md`; also `docs/code-reviews/deferred.md` (§4, §5, §16, §27 tracked gaps; §33/§34/§35 this phase's deliberate non-ports)
**Pre-flight:** `npx tsc --noEmit --incremental false` → clean (exit 0)

## Type surface reviewed

New/changed types, all read with their producers *and* consumers:

| Type | Home |
|---|---|
| `ImportLogLevel`, `ImportLogLine`, `ImportLogEvent`, `ImportLogListener`, `ImportLogEmitter`, `ImportLogBus` | `features/demo/engine/logic/import-log.ts` |
| `ImportLogView`, `PendingBatch` | `features/demo/ui/import/useImportLog.ts` |
| `ImportErrorCode`, `ImportErrorDetails`, `ImportPartialData`, extended `ImportRunResult` | `features/demo/ui/import/run-import.ts` |
| `ImportUiStage`, `ImportFlowInputs`, `computeImportStage` | `features/demo/ui/screens/import/import-flow-mode.ts` |
| `TerminalOutcome`, `TerminalTrust`, `CtaView`, `ImportTerminalProgressProps`, `STAGE_VIEW`, `TRUST_LINE` | `features/demo/ui/screens/import/ImportTerminalProgress.tsx` |
| `TerminalLineProps`, `LEVEL_ACCENT`, `TERM_ROW` | `features/demo/ui/screens/import/TerminalLine.tsx` |
| `PickerStageProps`, `PICKER_COPY`; `PasteStageProps`, `PASTE_COPY` | `features/demo/ui/screens/import/{PickerStage,PasteStage}.tsx` |
| `ImportResult`, `ImportModalProps`, `ERROR_MESSAGES`, `deriveTerminalOutcome` | `features/demo/ui/screens/ImportModal.tsx` |
| `ImportState`, `RunFailure`, `ImportTally` | `features/demo/ui/DemoExperience.tsx` |
| `ImportTransform.occurrenceNumber` | `features/demo/engine/logic/import-normalize.ts` |
| `PdfPreviewProps` (lost `onSave`), `ModalShell` props (`onBack`/`backLabel`), `FullShapeIn` / `persistedStateSchema` annotation | `chrome/PdfPreview.tsx`, `screens/_shared.tsx`, `engine/store/persistence.ts` |

**Things checked and found clean** (stated so the next pass doesn't re-derive them):

- `TerminalOutcome` is a well-formed discriminated union with payload only on the arms that carry it, and `ctaView` (`ImportTerminalProgress.tsx:335-338`) closes it with the `const exhaustive: never` arm — the `FallbackMode` precedent, followed. `emitFallback` (`run-import.ts:119-122`) does the same for `Exclude<FallbackMode,'none'>`.
- `STAGE_VIEW: Record<Exclude<RunStageId,'error'>, …>` and `LEVEL_ACCENT: Record<ImportLogLevel, …>` and `TRUST_LINE: Record<TerminalTrust, …>` are registry↔union-linked — an added `ImportLogLevel`/`ImportStageId` variant is a compile error. That is the deferred §4 direction applied correctly to new registries.
- `ImportRunResult` / `ExtractClientResult` boolean-tag discrimination preserved; `runPdfImport`'s `{ ...result, filename }` spread distributes over the union correctly (tsc clean).
- No presentational component reaches `engine/store/*` (grepped `features/demo/ui/screens/import`, `ui/import/*`) — the store-bridge rule holds. `useImportLog`'s bus subscription is *not* a violation: the bus lives in `engine/logic/`, the contract's binding clause is store-specific, and `bus?: ImportLogBus` mirrors the established `DemoExperienceProps.store?` injectable-seam precedent.
- No `Date.now()`/`Math.random()` introduced in `ui/` (the one `Date.now()` at `run-import.ts:166` is pre-existing on master); `import-log.ts` keeps the injected-clock seam.
- `PdfPreviewProps` dropping the no-op `onSave` is a type-honesty *improvement*.
- Boundary honesty: `parseAiJson`'s `as Partial<ExtractedFields>` cast over `JSON.parse` (`engine/logic/import.ts:153`) is an over-assertion, but it is **pre-existing on master** and this diff does not widen it (a non-string field still degrades to a caught `MODEL_OUTPUT_UNPARSEABLE`). Not filed.
- `deferred.md` §4 / §16 / §27 triggers did **not** fire (`engine/content/screens.ts` and `ExploreItem` untouched); §5's `updateField(path: string)` surface untouched.
- Deliberate choices listed by the orchestrator (§33/§34/§35, the T+seconds gutter, no virtualization, the trust-line non-copy, the R-34 duplicate guards, the dwell test migrations) were **not** re-flagged.

---

## TYPE-DESIGN-1 [MAJOR] features/demo/ui/screens/ImportModal.tsx:86

**Claim.** `onReviewImport?(): void` is still declared optional, and its doc comment still says omission is safe — but P1.5 (landed in *this same diff*) made it the dwell's only exit. The type now permits constructing an `ImportModal` whose terminal CTA is a dead button, and the comment actively tells the next author that's fine.

**Evidence.**

- `ImportModal.tsx:81-86`:
  ```ts
  /**
   * Fired by the terminal's outcome CTA. Pre-P1.5 the auto-flip to results still
   * runs (an outcome never shows while stage is 'progress'), so this stays no-op-safe;
   * P1.5's dwell makes it load-bearing.
   */
  onReviewImport?(): void
  ```
  P1.5 *is* in this branch (`03c54bb`, merged at `c1ccee6`): `DemoExperience.tsx:485-488` deliberately stops setting `stage: 'result'` in `finishImport` (it now writes only `{ ...s, result, lastLocId }`), and `DemoExperience.tsx:838` renders `stage={computeImportStage(imp)}`. `computeImportStage` (`import-flow-mode.ts:31-35`) leaves a finished run on `'progress'` until `acknowledged`, and the only writer of `acknowledged` is `onReviewImport` (`DemoExperience.tsx:845`). So the premise the comment rests on ("an outcome never shows while stage is 'progress'") is now false.
- `ImportModal.tsx:210` swallows the omission: `onReview={props.onReviewImport ?? (() => undefined)}`. A caller that omits the prop renders the outcome CTA (`ImportTerminalProgress.tsx:519-538`) wired to a no-op — the visitor can click it forever and never reach the result view; the only escape is the modal's close, which routes to `onCancel` → `setImp(blankImport)` (`DemoExperience.tsx:861-869`) and discards the review card entirely.
- The omission is not hypothetical: `features/demo/ui/screens/__tests__/modals.test.tsx:64-74` defines the shared `cb` prop bag **without** `onReviewImport`, and `:104` renders `<ImportModal stage="progress" … {...cb} />` with it absent. It happens to be harmless there only because `result={null}`.
- Same staleness, same root cause, one screen up: `ImportModal.tsx:93-100` (`deriveTerminalOutcome`'s docstring) still asserts "the modal flips to 'result' the moment a result exists, so the terminal only ever sees null here — the derivation becomes live when P1.5 holds the progress stage". P1.5 shipped; the derivation is live now.

**Suggested fix.** Make it required — `onReviewImport(): void` — drop the `?? (() => undefined)` fallback at `:210`, add `onReviewImport: vi.fn()` to the `cb` bag in `modals.test.tsx:64`, and rewrite both doc comments in the present tense (the P1.4-era "pre-P1.5" framing is now misleading). This is the lane's optional-vs-required calculus: `foo?: T` must mean "may legitimately not be set", and after P1.5 there is no legitimate caller that can omit this.

**Confidence.** High — the type, the two falsified comments, and a real omitting call site are all in the diff.

---

## TYPE-DESIGN-2 [MINOR] features/demo/ui/screens/ImportModal.tsx:55

**Claim.** `ERROR_MESSAGES: Record<string, string>` keys a finite id space (`ImportErrorCode`) with bare `string`. A typo'd or renamed key compiles and silently never matches, and the type asserts a `string` result for codes the map deliberately does *not* carry.

**Evidence.**

- `ImportModal.tsx:55-58`:
  ```ts
  export const ERROR_MESSAGES: Record<string, string> = {
    PDF_READ_FAILED: '…',
    MODEL_OUTPUT_UNPARSEABLE: '…',
  }
  ```
  The union exists two modules away and is already imported into this file: `ImportErrorCode` (`run-import.ts:66-71`), imported at `ImportModal.tsx:14`.
- Consumer `ImportModal.tsx:225`: `{(result.code && ERROR_MESSAGES[result.code]) || result.error}`. `tsconfig.json` sets neither `noUncheckedIndexedAccess` nor `noPropertyAccessFromIndexSignature`, so `ERROR_MESSAGES[result.code]` is typed `string` — the type claims a hit for `PDF_SCANNED`/`NO_FIELDS_FOUND`, which §35 item 2 says must *miss*. The deliberate-absence contract is invisible to the compiler and enforced only by `modals.test.tsx:214-215`.
- This is a self-inconsistency inside the same diff: the three sibling records added alongside it are all keyed by their union — `STAGE_VIEW: Record<Exclude<RunStageId,'error'>, …>` (`ImportTerminalProgress.tsx:113`), `TRUST_LINE: Record<TerminalTrust, string>` (`:94`), `LEVEL_ACCENT: Record<ImportLogLevel, string>` (`TerminalLine.tsx:35`). The repo's in-tree precedent for a partial id-keyed lookup is `MODAL_IDS: Record<ModalId, true>` (`engine/store/persistence.ts:308`), and precedent M1 (`DemoState.visited` keyed by `AppView | ModalId`, "so registry typos are compile errors").

**Suggested fix.** `export const ERROR_MESSAGES: Partial<Record<ImportErrorCode, string>> = { … }`. Key typos become compile errors, the lookup honestly types as `string | undefined`, the `|| result.error` fallback reads as live rather than dead, and a future `ImportErrorCode` variant shows up as an unmapped key rather than a silent pass-through.

**Confidence.** High.

---

## TYPE-DESIGN-3 [MINOR] features/demo/ui/import/run-import.ts:93-95

**Claim.** On `ImportRunResult`'s `ok: false` arm, `code?` and `details?` are declared optional but **every** producer in the module sets both. The optional calculus is inverted: a future failure path that forgets them compiles silently and quietly drops the row-79 enrichment this PR shipped.

**Evidence.**

- Declaration `run-import.ts:87-98` — `code?: ImportErrorCode`, `details?: ImportErrorDetails`.
- All three failure constructions set both:
  - `:180-188` — `code: 'NO_FIELDS_FOUND'`, `details: { stage: 'normalizing', … }`
  - `:196-203` — `code: 'MODEL_OUTPUT_UNPARSEABLE'`, `details: { stage: 'normalizing', detail }`
  - `:225-233` — `code: scanned ? 'PDF_SCANNED' : 'PDF_READ_FAILED'`, `details: { stage: 'extracting_text', detail: raw }`
- Consumers then write defensive guards for a state the producer can't produce: `DemoExperience.tsx:514`/`:543` copy `res.code`/`res.details` through unconditionally, and `ImportModal.tsx:225`/`:227` guard with `result.code &&` / `result.details &&`. Because the failure card's "Technical Details" block is `{result.details && <TechnicalDetails …/>}`, a new `return { ok: false, error, warnings, fallbackMode }` anywhere in `run-import.ts` renders a card with no code mapping and no technical block, with no compiler push-back — a silent regression of the enrichment.
- Note the distinction: `ImportResult` in `ImportModal.tsx:33-43` keeps these genuinely optional and that is *correct* there, because `DemoExperience` builds three code-less failures at `:495`, `:525`/`:531` (the pre-pipeline guards) and `:483` (the multi-file aggregate). The finding is specific to `ImportRunResult`, whose only producer is `run-import.ts`.

**Suggested fix.** Make `code: ImportErrorCode` and `details: ImportErrorDetails` **required** on the `ok: false` arm of `ImportRunResult` (leaving `partialData?` and `filename?` optional — those are honestly conditional). This is precedent #3 applied properly: "payload belongs only to the arm that has it", and this arm always has it. `ImportModal.ImportResult` stays as-is.

**Confidence.** High — three producers, zero exceptions, verified by reading the whole module.

---

## TYPE-DESIGN-4 [MINOR] features/demo/ui/import/run-import.ts:81

**Claim.** `ImportPartialData.businessName` has no producer and is structurally unreachable — the only path that builds `partialData` is gated on `fieldCount === 0`, which by construction means `businessName` is empty. The render branch that consumes it is dead.

**Evidence.**

- `run-import.ts:79-82`:
  ```ts
  export interface ImportPartialData {
    caseNumber?: string
    businessName?: string
  }
  ```
- Only construction site, `run-import.ts:179`: `const partialData = occurrenceNumber ? { caseNumber: occurrenceNumber } : undefined`. It sits inside `if (fallbackMode === 'none' && fieldCount === 0 && timeFrameCount === 0)` (`:174`).
- `fieldCount` (`import-normalize.ts:276-282`) counts `patch.businessName` in its `flat` array. So `fieldCount === 0` ⇒ `patch.businessName === ''`. There is no reachable state in which the demo pipeline knows a business name *and* takes the `NO_FIELDS_FOUND` branch. The other two failure returns (`:196`, `:225`) set no `partialData` at all.
- Consumer `ImportModal.tsx:160` renders `{partial.businessName && <div>Business: {partial.businessName}</div>}` — unreachable. No test constructs it (`grep partialData` shows only `{ caseNumber: … }` and `{}`).

**Suggested fix.** Either drop `businessName` from `ImportPartialData` and the `DataFoundCard` branch, or — if the phone's two-row block is the parity target — have `parseNormalizeMap` surface `businessName` the way `e297ffd` surfaced `occurrenceNumber` and populate it from a path where it *can* be non-empty. As written the type promises a row the pipeline can never fill. Whichever way it lands, record it in §35 so the next reviewer doesn't re-derive this.

**Confidence.** High — traced producer → gate → consumer.

---

## TYPE-DESIGN-5 [MINOR] features/demo/ui/screens/import/import-flow-mode.ts:20

**Claim.** The diff adds a **third** independent declaration of the `'picker' | 'paste' | 'progress' | 'result'` id space. Two already existed; nothing links them.

**Evidence.**

- `import-flow-mode.ts:20` — `export type ImportUiStage = 'picker' | 'paste' | 'progress' | 'result'` (new in this diff)
- `ImportModal.tsx:60` — `export type ImportStageId = 'picker' | 'paste' | 'progress' | 'result'` (pre-existing)
- `DemoExperience.tsx:95` — `stage: 'picker' | 'paste' | 'progress' | 'result'` inline in `ImportState` (pre-existing)

They compose only structurally: `computeImportStage(imp)` (`DemoExperience.tsx:838`) accepts `ImportState` because its inline literal happens to equal `ImportUiStage`, and its `ImportUiStage` return happens to equal `ImportModalProps.stage`'s `ImportStageId`. Adding a fifth stage to `ImportStageId` alone (say a `'confirm'` sub-step) yields a dead branch in `ImportModal` with no compile error, and the `ImportErrorCode`-adjacent naming collision (`ImportStageId` in `ImportModal.tsx` vs the *pipeline* `ImportStageId` in `run-import.ts:30`, aliased `RunStageId` at three import sites) is already costing readers a double-take.

I checked the other drift directions and TS does catch them (adding to `ImportUiStage` or to `ImportState.stage` alone breaks the `computeImportStage` call or the `stage=` prop), which is why this is MINOR rather than MAJOR.

**Suggested fix.** Declare the union once — `import-flow-mode.ts` is the natural home (it is the pure module that owns the machine) — and have `ImportModalProps.stage` and `ImportState.stage` both use `ImportUiStage`. Consider renaming `ImportModal`'s re-export away from `ImportStageId` to end the collision with the pipeline stage union.

**Confidence.** High on the facts; MINOR on impact because most drift directions already fail the build.

---

## TYPE-DESIGN-6 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:81

**Claim.** `deriveTrust` reconstructs a value the pipeline already has as a typed union (`FallbackMode`) by prefix-matching log *prose*. The contract between the emit site and the consumer is a string literal duplicated in two modules, with no type or shared constant linking them.

**Evidence.**

- Emit site, `run-import.ts:108-124`: `emitFallback` writes `emitter.log('NORM', "sample fallback: …")` for each of `'sample' | 'unavailable' | 'error'`.
- Consumer, `ImportTerminalProgress.tsx:81-86`:
  ```ts
  export function deriveTrust(lines: readonly ImportLogLine[]): TerminalTrust {
    for (const line of lines) {
      if (line.level === 'NORM' && line.text.startsWith('sample fallback:')) return 'sample'
    }
    return 'cloud'
  }
  ```
- The prefix is a bare literal in both places; nothing shared. `ImportLogLine` (`import-log.ts:39-48`) carries no structured marker.
- Test coverage does **not** close the loop for two of the three modes: `ImportTerminalProgress.test.tsx:140-146` re-declares the three sentences as its own literals (so it keeps passing after a copy edit), and `terminal-integration.test.tsx:56-57` exercises the real pipeline for `'sample'` only (`live: false`). Re-word `emitFallback`'s `'unavailable'` / `'error'` lines, update the copy assertions in `run-import-log.test.ts:46,55`, and `deriveTrust` silently reverts to `'cloud'` with a green suite.
- **Why this is MINOR and not MAJOR:** the failure direction is the safe one by the file's own stated rule (`:79` — "overclaiming exposure is safe; underclaiming never is"), and the sample substitution is disclosed twice more independently (the `sample fallback:` line is still *in* the log, and the result card carries `notice` + the per-card `isSample` badge from the typed `fallbackMode`).

**Suggested fix.** Give the marker a type instead of a prefix. Cheapest form that keeps the bus generic: add an optional structured tag to `ImportLogLine` (e.g. `mark?: 'sample-fallback'`), set it in `emitFallback`, and match on `line.mark === 'sample-fallback'` in `deriveTrust`. Alternative if you'd rather not widen the line type: export the prefix as a shared `const SAMPLE_FALLBACK_PREFIX` from `run-import.ts` and use it on both sides, so a copy edit that drops it is a compile error at the emit site.

**Confidence.** High on the coupling; medium on severity (safe-direction failure, redundant disclosure).

---

## TYPE-DESIGN-7 [MINOR] features/demo/ui/DemoExperience.tsx:94-107

**Claim.** `ImportState` is a flat record whose fields are correlated — `acknowledged` is only meaningful when `stage === 'progress' && result !== null`, and `stage === 'result'` is only meaningful when `result !== null`. This diff *adds* the correlated field rather than moving the shape to the house union pattern; `computeImportStage` exists precisely because the flat type can't express the machine.

**Evidence.**

- `DemoExperience.tsx:94-107` — `{ stage; text; result: ImportResult | null; lastLocId; activeStage; batch; acknowledged: boolean }`.
- `{ stage: 'result', result: null }` type-checks and renders a **blank modal body**: `ImportModal.tsx:191/201/203/215` gate every branch, and the `'result'` branch is `stage === 'result' && result && (…)`. Nothing renders inside `ModalShell`.
- `{ stage: 'picker', acknowledged: true }` type-checks and is meaningless.
- The repo's own precedent for exactly this is `RetentionView` (`engine/logic/retention.ts`): "the union makes 'no total ⇒ no scopes' unrepresentable otherwise."

**Refutation attempted (why MINOR, not MAJOR).** I traced every `setImp` writer and neither invalid state is currently reachable: the only `stage: 'result'` writers (`DemoExperience.tsx:495`, `:525`, `:531`) always attach a result; `onRetry` (`:852-856`) and `blankImport` (`:108`) clear `result` and `stage` together; and the `acknowledged` setter is explicitly guarded — `setImp((s) => (s.stage === 'progress' && s.result !== null ? { …s, acknowledged: true } : s))` (`:845`). So the invariant is enforced by discipline across five call sites plus `computeImportStage`, not by the type. That is the rubric's defense-in-depth gap, not a shipped defect.

**Suggested fix.** Model the run half as a union and leave the persistent fields flat, e.g.
```ts
type ImportRun =
  | { stage: 'picker' | 'paste' }
  | { stage: 'progress'; activeStage: RunStageId; batch: Batch | null; result: ImportResult | null; acknowledged: boolean }
  | { stage: 'result'; result: ImportResult }
```
`computeImportStage` then narrows instead of re-deriving, and the `s.stage === 'progress' && s.result !== null` guard at `:848` becomes a narrowing rather than a hand-written precondition. If you'd rather defer, log it in `deferred.md` with the `computeImportStage` guard named as the accepted runtime enforcement — the §27 "test/runtime-over-type" precedent covers that choice explicitly.

**Confidence.** High on the facts; MINOR because no invalid state is reachable today.

---

## TYPE-DESIGN-8 [MINOR] features/demo/engine/logic/import-log.ts:39-48, 85

**Claim.** `ImportLogLine`'s fields are mutable and `getLines()` returns `ImportLogLine[]`, yet the bus hands the **same object identity** to the retained ring, to every live subscriber, and into React state. One consumer mutation corrupts the retained run for every other subscriber and for the replay path.

**Evidence.**

- `import-log.ts:39-48` — all four fields (`seq`, `elapsedMs`, `level`, `text`, `detail?`) are mutable.
- `import-log.ts:123-126` — the *same* `line` object is pushed into `lines` and broadcast: `lines.push(line); … broadcast({ kind: 'line', line })`. `subscribe` (`:135`) replays those identical objects to every new listener.
- `import-log.ts:85` — `getLines(): ImportLogLine[]`. The array is a fresh copy (`:140`), so array-level mutation is harmless; the **elements** are shared.
- The author already reached for readonly one level up — `ImportLogView.lines: readonly ImportLogLine[]` (`useImportLog.ts:33`) and `deriveTrust(lines: readonly ImportLogLine[])` (`ImportTerminalProgress.tsx:81`) — so the intent is present, just not carried to the element type. This is the same shape as the PR #8 shared-catalog finding that produced the repo's `readonly` discipline (precedent #7), one level down.
- No consumer mutates today (checked `useImportLog.ts`, `TerminalLine.tsx`, and all five test files that call `getLines()`), so this is defense-in-depth.

**Suggested fix.** `readonly` on all `ImportLogLine` fields and `getLines(): readonly ImportLogLine[]`. Verified non-breaking: the bus constructs lines with an object literal (`:123`), `useImportLog` only spreads/slices, `TerminalLine` only reads, and the tests use `.map`/`.find`/`.slice`/`[0]!` — no mutation anywhere.

**Confidence.** High on the shape; MINOR because no mutation exists today.

---

## Type Design Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 7 |

- **Canonical homes preserved (no parallel entity declarations):** yes for domain entities; **no** for one UI id space — see TYPE-DESIGN-5 (three declarations of the 4-member import-stage union).
- **Discriminated unions well-formed:** yes (`TerminalOutcome`, `ImportRunResult`, `ImportLogEvent`, `ExtractClientResult`).
- **Exhaustiveness enforced (never-checked switches):** yes — `ctaView` (`ImportTerminalProgress.tsx:335`) and `emitFallback` (`run-import.ts:119`) both carry the `const exhaustive: never` arm.
- **Correlated state modelled as a union:** partial — flat shape found in `ImportState` (TYPE-DESIGN-7); enforced at runtime by `computeImportStage` + guarded setters.
- **Id spaces typed (no bare-string registries/keys):** one regression — `ERROR_MESSAGES: Record<string, string>` (TYPE-DESIGN-2); the three sibling registries in the same diff are correctly union-keyed.
- **readonly discipline on shared data:** gap at the element level of the shared log line (TYPE-DESIGN-8); module-level catalogs (`PICKER_COPY`, `PASTE_COPY`, `TERM_ROW`, `TERM_CHROME`, `C`) are all `as const`.
- **Boundary types honest about untrusted input:** yes for what this diff adds — `ImportTransform.occurrenceNumber: string` is genuinely always a string (`coerceField`, `import-normalize.ts:52-55, 235`), the picker validates `File[]` before handing it up (`PickerStage.tsx:163-166`), and the clipboard read is guarded for unavailable/denied/empty (`:174-198`). The pre-existing `parseAiJson` cast is unchanged and deliberately not re-filed.

**Verdict:** REVISE — TYPE-DESIGN-1 only. The rest are opportunistic.
