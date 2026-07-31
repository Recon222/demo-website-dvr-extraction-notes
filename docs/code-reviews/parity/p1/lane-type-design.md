# Lane: type-design — phase review `p1` (PR #30)

**Mode:** FIX-DELTA (re-review of the six-branch fix round merged into `feat/parity-p1` after review commit `4a1f807`)
**Diff under review:** `master...feat/parity-p1`; fix delta read as `4a1f807..HEAD` (27 files, +1067/−252)
**Refs read:** `.claude/agents/type-design-analyzer.md` (lane definition) · `features/demo/CLAUDE.md` (binding contract) · `docs/code-reviews/parity/p1/p1-review.md` (vetted aggregate) · the prior version of this lane file · `docs/code-reviews/deferred.md` (§4/§5/§16/§27 tracked gaps; §33/§34/§35 + the new §36)
**Lane's prior findings:** TD-1→R-4 (MAJOR) · TD-2→R-8 · TD-3→R-29 · TD-4→R-30 · TD-5→R-31 · TD-6→R-32 · TD-7→R-33 · TD-8→R-34 (all MINOR)
**Pre-flight (re-run in this worktree):** `npx tsc --noEmit --incremental false` → clean (exit 0)

---

# Fix-delta

| Prior | Final ID | Verdict | Fix commit |
|---|---|---|---|
| TD-1 (MAJOR) | R-4 | **FIXED** | `f0ddcc2` |
| TD-2 | R-8 | **FIXED** | `a0d3ad6` |
| TD-3 | R-29 | **FIXED** | `05c1229` |
| TD-4 | R-30 | **FIXED** | `2c633b6` |
| TD-5 | R-31 | **FIXED** | `d0a67e7` (file rename — judged as such) |
| TD-6 | R-32 | **FIXED** | `a32b929` |
| TD-7 | R-33 | **FIXED as accepted-deferral** | `b6ad036` (deferred.md §36) |
| TD-8 | R-34 | **FIXED** | `4ceaacd` |

### R-4 (TD-1, the lane's only MAJOR) — FIXED

`ImportModal.tsx:98` now declares `onReviewImport(): void` — required, no `?`. The swallow is gone: `ImportModal.tsx:228` passes `onReview={props.onReviewImport}` with no `?? (() => undefined)`. Both falsified doc comments were rewritten in the present tense — the prop doc (`:92-97`) now says "the dwell's ONLY exit … REQUIRED for exactly that reason", and `deriveTerminalOutcome`'s docstring (`:105-116`) now reads "LIVE since the P1.5 dwell" instead of the pre-P1.5 premise. The omitting call site is closed: `modals.test.tsx` supplies `onReviewImport` in its shared `cb` bag (commit `f0ddcc2` touches exactly `ImportModal.tsx` + `modals.test.tsx`). No remaining caller omits it (`ImportModal` importers: `DemoExperience.tsx:30`, `terminal-integration.test.tsx:3`, `modals.test.tsx:5` — all pass it, and `tsc` is clean, which is now the enforcement).

### R-8 (TD-2) — FIXED

`ImportModal.tsx:61`: `export const ERROR_MESSAGES: Partial<Record<ImportErrorCode, string>> = { … }`. `ImportErrorCode` was already imported at `:15`. The read at `:243` (`(result.code && ERROR_MESSAGES[result.code]) || result.error`) now types `string | undefined`, so the `|| result.error` fallback for the deliberately-unmapped `PDF_SCANNED`/`NO_FIELDS_FOUND` (§35) is honest to the compiler rather than dead-looking. Matches the three union-keyed sibling registries (`STAGE_VIEW`, `TRUST_LINE`, `LEVEL_ACCENT`) and precedent M1.

### R-29 (TD-3) — FIXED

`run-import.ts:108-110`: `code: ImportErrorCode` and `details: ImportErrorDetails` are now required on the `ok: false` arm; `partialData?`/`filename?` correctly stay optional. All three producers still set both (`:204-212`, `:220-227`, `:249-257`). The distinction the finding drew was honoured — the modal-level `ImportResult` (`ImportModal.tsx:35-45`) deliberately keeps its optionality for DemoExperience's code-less pre-pipeline guard failures (`DemoExperience.tsx:545`, `:577`, `:583`) and for the new R-23b backstop (`:529-537`). See TYPE-DESIGN-N4 below for the one layer the tightening did not reach.

### R-30 (TD-4) — FIXED

`businessName` is gone from `ImportPartialData` (`run-import.ts:88-90`, now a one-field interface with a doc comment explaining the structural unreachability), and the dead render branch is gone from `DataFoundCard` (`ImportModal.tsx:172-180` — the early return is now `if (!partial.caseNumber) return null` and the `Business:` row is deleted). The choice is recorded as the §35 addendum in `deferred.md` with an explicit re-add trigger ("only if a producer outside that gate ever surfaces a business name on failure"), exactly as the finding asked.

### R-31 (TD-5) — FIXED

Three declarations → one. `ImportUiStage` is declared once, at `features/demo/engine/logic/import-flow-mode.ts:26` (the module was *renamed* out of `ui/screens/import/` — `git show --stat d0a67e7` shows the rename, and the old path no longer exists). Both consumers import it: `ImportModal.tsx:20,72` and `DemoExperience.tsx:31,97`. `ImportModal`'s colliding local `export type ImportStageId` is deleted (repo grep confirms no external consumer ever used it; `run-import`'s pipeline union is still aliased `RunStageId` at its three import sites). Adding a fifth stage anywhere is now a compile error at every consumer. Engine purity holds — the moved module has no React, no `'use client'`, no store import.

### R-32 (TD-6) — FIXED

`run-import.ts:124` exports `SAMPLE_FALLBACK_PREFIX = 'sample fallback:'`, used at all three `emitFallback` emit sites (`:135`, `:138`, `:141`) and at the single consumer (`ImportTerminalProgress.tsx:105`). The loop is genuinely closed in both directions: a copy edit *after* the prefix can no longer break the derivation (both sides compile against the constant), and dropping the prefix from an emit site fails the pipeline-level literal assertions (`run-import-log.test.ts:37,46,55`, `terminal-integration.test.tsx:57`, `DemoExperience.import-log.test.tsx:91`) rather than only the terminal unit tests. The orchestrator's disjointness call (constant lives in `run-import.ts`, not `import-log.ts`) is respected and does not weaken the contract — `deriveTrust` already imports from `run-import`.

### R-33 (TD-7) — FIXED as an accepted deferral

`ImportState` remains flat (`DemoExperience.tsx:95-118`), which is the disposition the finding explicitly offered as the alternative ("or log the accepted runtime-enforcement choice in deferred.md — the §27 precedent covers that"). `deferred.md §36` is a complete entry: it states the invalid pairing (`{ stage: 'result', result: null }` renders a blank modal body), records that no invalid state is reachable today, names the enforcement (`computeImportStage` + guarded setters), gives the reason not to remodel mid-fix-round, and sets a concrete un-defer trigger ("the next field whose validity depends on `stage`/`result` pairings … or any bug traced to an incoherent `ImportState` pairing"). One caveat: the fix round added a *new* `result` writer that §36's writer inventory predates — see TYPE-DESIGN-N2.

### R-34 (TD-8) — FIXED

All five `ImportLogLine` fields are `readonly` (`import-log.ts:44-53`) and `getLines(): readonly ImportLogLine[]` (`:90`). Verified non-breaking as predicted: the bus still constructs with an object literal (`:128`), `useImportLog` only spreads/slices (`useImportLog.ts:72-73`), `TerminalLine` only reads. The immutability is now *pinned at compile time* rather than merely asserted — `import-log.test.ts` carries `@ts-expect-error` compile pins for both a `snapshot.push(…)` and a `snapshot[0]!.text = …`, in a never-executed closure, with a comment stating why runtime assertions cannot express this. That is a stronger fix than the finding asked for.

---

# New findings (fix-introduced only)

## TYPE-DESIGN-N1 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:101

**Claim.** `TerminalTrust` is now a **segment**-scoped value (R-1's fix) but is still consumed as a **run**-scoped one by the CTA's sample attribution (R-25's fix, authored on a different branch). The two consumers want opposite safe-failure directions, and the type cannot tell them apart — so in a mixed batch the R-25 attribution silently never fires.

**Evidence.**

- `deriveTrust` (`:101-108`) is now segment-scoped: `if (line.level === 'FILE') trust = 'cloud'`. Correct for the title bar / processing badge, which describe the *current file* (`:511`, `:543-545`, `:637-640`) — that is exactly what R-1 asked for, and it is well tested (`ImportTerminalProgress.test.tsx:194-227`).
- The same single value feeds the CTA: `const cta = outcome === null ? null : ctaView(outcome, isBatchRun, trust)` (`:435`), and `ctaView`'s `reviewSub` (`:344-347`) renders the amber `'sample import — review →'` only when `trust === 'sample'`.
- The CTA is a **run**-level statement — `batch` is not cleared by `finishImport` (`DemoExperience.tsx:509` writes only `result`/`lastLocId`), so the same button reads e.g. "Batch complete — 2 of 2 locations" while its sub-label describes only the last file's data path.
- Concrete sequence (the R-1 adversarial batch, run to completion): 2 PDFs; file 1's `/api/extract` returns 502 → `fallbackMode: 'error'` → `NORM sample fallback: …` (`run-import.ts:141`), and `applySuccess` creates a location from the **SAMPLE** document; file 2 succeeds live. The log ends `FILE(2) … AI …`, so `deriveTrust` returns `'cloud'` and the CTA shows the plain grey `'Review import →'`. Escape during the dwell → `onCancel` → `setImp(blankImport)` (`DemoExperience.tsx:915-921`) discards the result view, and the sample-substituted location persists with no substitution marker having been on screen: the trust line says "cloud model via server proxy" and file 1's `sample fallback:` line has scrolled out of the tail-pinned log.
- R-25's stated justification for the CTA change was "the notice + per-card badge only paint AFTER the CTA tap — Escape during the dwell used to discard a sample-substituted import with the substitution never marked on this surface" (`:337-341`). That is precisely the state a mixed batch is now in. Note the direction asymmetry the single type hides: for the exposure label, `'cloud'` is the *safe* (overclaiming) default the docstring at `:92` mandates; for the substitution attribution, `'cloud'` is the *unsafe* (under-disclosing) default.
- No test covers the interaction — the R-25 test (`ImportTerminalProgress.test.tsx:490-501`) uses a single-file run with no `FILE` markers, so segment scoping never engages; the R-1 tests never render a CTA.

**Suggested fix.** Separate the two questions in the type, not just in the call: keep `deriveTrust(lines): TerminalTrust` as the current-segment label for the title bar/badge, and add a run-scoped sibling (e.g. `runUsedSample(lines): boolean` — any `SAMPLE_FALLBACK_PREFIX` line anywhere, no `FILE` reset) for `ctaView`'s `reviewSub`. If you prefer one function, give the scopes distinct types (`SegmentTrust` / `RunTrust`) so a consumer cannot silently take the wrong one. Add the missing test: FILE → sample fallback → FILE → live, then an outcome, and assert the CTA still carries the amber attribution while the trust line reads `cloud`.

**Confidence.** High on the mechanism (both fix hunks read, sequence traced end-to-end through `DemoExperience.processPdfFiles`). MINOR rather than MAJOR because the binding M1/M2 disclosures survive — tapping the CTA (the primary exit) still shows `tally.notice` and the per-card `isSample` badge; only the CTA-moment prominence R-25 added is void, and only for mixed batches. Escalate if the aggregator weighs the Escape path more heavily than R-25 did.

---

## TYPE-DESIGN-N2 [MINOR] features/demo/ui/DemoExperience.tsx:529

**Claim.** The R-23b backstop adds a **new `result` writer that does not write `stage`** — the first one whose correctness depends on ordering rather than on the guarded setters §36 enumerated. `ImportState`'s flat shape lets it produce `{ stage: 'picker' | 'paste', result: <failure> }`, a pairing `computeImportStage` discards silently.

**Evidence.**

- `guardImportRun` (`:521-539`) writes `setImp((s) => ({ ...s, activeStage: 'error', result: { ok: false, … } }))` — no `stage`.
- `computeImportStage` (`engine/logic/import-flow-mode.ts:37-41`) returns `i.stage` unchanged whenever `stage !== 'progress'`. So a failure result written while the stored stage is still `'picker'`/`'paste'` renders nothing: the modal shows the picker again, with no error, no CTA, and no breadcrumb visible to the visitor (the `console.error` at `:525` is operator-only).
- The window is real in both flows: `runTextImportFlow` calls `emitter.log('INIT', …)` at `:590` *before* the stage flip at `:591`; `processPdfFiles` logs INIT at `:555-556` before the loop's flip at `:560` (and skips the flip entirely for an empty `files` array, where `finishImport` then writes `{ ok: false, error: '0 imports failed.' }` into a `'picker'` stage).
- §36 (`deferred.md`) accepts the flat shape on the strength of "the review lane traced every `setImp` writer and confirmed no invalid state is reachable today". That inventory is now one writer short — and its trigger clause ("any bug traced to an incoherent `ImportState` pairing") is the one this would fire.

**Suggested fix.** One token, no remodelling: add `stage: 'progress'` to the backstop's updater (`:529-537`), so the backstop's own promise — "a failure result … which also releases the dwell through the normal CTA path" (`:517`) — holds regardless of where the throw landed. Optionally reorder `runTextImportFlow` so the stage flip precedes the first `emitter.log`. Either way, add the new writer to §36's inventory so the next reader doesn't inherit a stale "every writer traced" claim.

**Confidence.** High on the type gap and the fix; **low on reachability** — every callee between run start and the stage flip is internally guarded, so this is a defense-in-depth gap (the rubric's MEDIUM → this review's MINOR), not a shipped defect.

---

## TYPE-DESIGN-N3 [MINOR] features/demo/ui/import/run-import.ts:77

**Claim.** `ImportErrorDetails.stage: ImportStageId` admits `'error'` — a marker, not a stage anything failed *at*. Until this round no producer could supply it; the new backstop can, and it does so by reading the one field the same round declared uninformative for exactly this reason.

**Evidence.**

- `ImportErrorDetails` (`:76-79`): `stage: ImportStageId`, where `ImportStageId` (`:30`) includes `'error'`. All three pipeline producers pass real stages (`'normalizing'` at `:210` and `:226`, `'extracting_text'` at `:256`).
- The same fix round introduced the honest union: `export type ImportRealStageId = Exclude<ImportStageId, 'error'>` (`:33`), specifically because `activeStage === 'error'` says nothing about where the pipeline actually was — that is R-11's entire rationale, documented at `DemoExperience.tsx:102-109` and `ImportTerminalProgress.tsx:64-70`.
- The new backstop nonetheless keys off `activeStage`: `details: { stage: s.activeStage ?? 'extracting_text', detail }` (`DemoExperience.tsx:535`). Reachable when a throw lands while `activeStage` is `'error'` (e.g. a mid-batch file already failed, or a throw out of `finishImport` after an all-failed run). The rendered "Technical Details" block (`ImportModal.tsx:153-161`, `JSON.stringify(details, null, 2)`) then reads `"stage": "error"` — the operator-facing diagnostic loses the only thing it was there to say.
- `s.lastRealStage` — the field added this round precisely to answer "where was the pipeline really?" — is in scope in that same updater and is unused by it.

**Suggested fix.** Narrow the field to the union that now exists: `stage: ImportRealStageId`. That is a compile error at `DemoExperience.tsx:535`, which routes the author to the correct value (`s.lastRealStage ?? 'extracting_text'`); the three pipeline producers already satisfy it unchanged.

**Confidence.** High on the type and the construction site; impact is operator-diagnostic only, hence MINOR.

---

## TYPE-DESIGN-N4 [MINOR] features/demo/ui/DemoExperience.tsx:455

**Claim.** R-29's guarantee is dropped one line after it is produced. `RunFailure` — the transport type between `ImportRunResult` and the failure card — still declares `code?`/`details?` optional, so the invariant the fix just made compiler-enforced at the producer is unenforced at the only place it is carried.

**Evidence.**

- `RunFailure` (`:454-458`): `code?: ImportErrorCode`, `details?: ImportErrorDetails`, `partialData?: ImportPartialData`.
- Both construction sites now provably set `code` and `details`, because `res` is `Extract<ImportRunResult, { ok: false }>` and R-29 made them required: `:565` (batch) and `:596` (text).
- `finishImport` (`:499-505`) reads them back as `ImportErrorCode | undefined` / `ImportErrorDetails | undefined` and hands them to the modal-level `ImportResult`, whose optionality is correct and deliberate. The consequence of the loose middle: a future `tally.failures.push({ filename, error })` (a synthesized, non-pipeline failure) compiles, and the single-failure card silently renders with no friendly-copy mapping and **no Technical Details block** (`ImportModal.tsx:245` gates on `result.details &&`) — the exact downstream break R-29 was filed to prevent, one layer up.

**Suggested fix.** Make `code`/`details` required on `RunFailure` (leave `partialData?` optional — it is honestly conditional). Both existing pushes already satisfy it; the change is type-only. Opportunistic — fold into whichever commit next touches this bridge section.

**Confidence.** High on the facts; MINOR and explicitly opportunistic, since no current construction site can violate it.

---

## Checked and found clean (stated so the next pass doesn't re-derive)

- **`ImportRealStageId` plumbing** (`run-import.ts:33` → `ImportModal.tsx:77` → `ImportTerminalProgress.tsx:71` → `ImportState.lastRealStage`, `DemoExperience.tsx:110`): the union is correct, the narrowing at `importStageFor` (`:399-403`, `st === 'error' ? s.lastRealStage : st`) type-checks without an assertion, and `effectiveStage` (`ImportTerminalProgress.tsx:430`) narrows cleanly into `STAGE_VIEW`. No new `as`.
- **Exhaustiveness** still enforced at both new-union consumers: `ctaView`'s `const exhaustive: never = outcome` (`:390`) and `emitFallback`'s (`run-import.ts:144`). `ctaView` gaining a third parameter did not weaken the switch.
- **Registry↔union linkage** intact after the round: `STAGE_VIEW: Record<Exclude<RunStageId,'error'>, …>`, `TRUST_LINE: Record<TerminalTrust, string>`, `LEVEL_ACCENT: Record<ImportLogLevel, string>`, and now `ERROR_MESSAGES: Partial<Record<ImportErrorCode, string>>`.
- **Store-bridge rule** (`features/demo/CLAUDE.md`) holds through the round: no `engine/store/*` import appears in `ui/screens/import/*` or `ui/import/*`; `import-flow-mode.ts`'s move *into* `engine/logic/` keeps the engine React-free and `'use client'`-free.
- **Engine barrel** (`engine/index.ts:46-49`): R-10 replaced eleven consumer-less re-exports with a NOTE, and `barrel.test.ts:14` now pins `importLogBus`/`createImportLogBus` as absent. `import-flow-mode` is likewise internal-path-only, consistent with that note.
- **PickerStage's new props** (`ref?: Ref<HTMLButtonElement>`, `busyTestId?: string`): React 19 ref-as-prop is idiomatic; `busyTestId`'s `??` default is unreachable today (only the two busy-capable cards pass it, and `Spinner` renders only when `busy`) but permits no invalid state — not filed.
- **The deliberate reduced-motion asymmetry** (`motion/react`'s `useReducedMotion` in the terminal vs the local `prefersReducedMotion()` in `PickerStage.tsx:97-99`) is on the orchestrator's deliberate-choices list and documented in both files — not re-flagged, including the resulting `boolean | null` vs `boolean` split.
- **`ImportFlowInputs.result: { ok: boolean } | null`** (`import-flow-mode.ts:32`) is deliberately structural so the pure module needn't import the UI result type; documented at `:31`. Fine.
- **Tracked gaps not fired:** deferred §4 / §16 / §27 triggers still untouched (`engine/content/screens.ts`, `ExploreItem` unchanged); §5's `updateField(path: string)` surface unchanged. §35's addendum and the new §36 are correctly scoped.
- **Known flake class** (5s-timeout `userEvent`/`waitFor` failures under multi-agent contention) not filed, per the orchestrator.

## Type Design Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 4 |

- **Prior lane findings:** 8/8 resolved — 7 fixed in code, 1 (R-33) accepted with a complete `deferred.md §36` entry and an un-defer trigger. Zero partial, zero unfixed.
- **Canonical homes preserved:** yes — and improved: the import-stage union collapsed from three declarations to one (`engine/logic/import-flow-mode.ts`).
- **Discriminated unions well-formed:** yes (`ImportRunResult` failure arm now carries its required payload; `TerminalOutcome`, `ImportLogEvent`, `ExtractClientResult` unchanged).
- **Exhaustiveness enforced:** yes — both `never`-checked switches survive the round.
- **Correlated state modelled as a union:** flat shape accepted and logged (§36); one new writer now sits outside its enumerated inventory (TYPE-DESIGN-N2).
- **Id spaces typed:** yes — the one bare-`string` registry is gone.
- **readonly discipline on shared data:** yes — `ImportLogLine` + `getLines()`, with `@ts-expect-error` compile pins.
- **Boundary types honest about untrusted input:** yes; `ImportPartialData` got *more* honest (dead field removed). The one over-assertion in `ImportErrorDetails` is TYPE-DESIGN-N3.

**Verdict:** APPROVE — the fix round is clean from this lane's perspective. The four new items are all MINOR; TYPE-DESIGN-N1 is the only one worth landing before merge if the owner wants R-25's guarantee to actually hold for batches.
