# Lane: type-design — phase review `p1` (PR #30) — FIX-DELTA ROUND 2

**Mode:** FIX-DELTA round 2 — re-review of the round-2 fix commits ONLY (everything after the review commit `3d03bbb`; three branches: `parity/p1-fix2-terminal`, `parity/p1-fix2-pdfsave`, `parity/p1-fix2-logbus`).
**Diff under review:** `git diff master...feat/parity-p1` (full PR); round-2 delta read as `3d03bbb..feat/parity-p1` — 12 files, +329/−59.
**Refs read:** `.claude/agents/type-design-analyzer.md` (lane definition) · `features/demo/CLAUDE.md` (binding contract) · `docs/code-reviews/parity/p1/p1-review-fixdelta.md` (prior vetted aggregate, R-35…R-44) · the prior version of this lane file (TYPE-DESIGN-N1…N4) · `docs/code-reviews/deferred.md` (§4/§5/§16/§27 tracked gaps; §33–§36) · the orchestrator's deliberate-choices list (honored — nothing on it is re-flagged).
**Lane's prior findings (round 1 of the fix-delta):** TYPE-DESIGN-N1 → **R-35** (merged, settled MAJOR) · N2 → **R-39** · N3 → **R-40** · N4 → **R-41**.
**Pre-flight (re-run in this worktree):** `npx tsc --noEmit --incremental false` → clean (exit 0). `npx vitest run features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx features/demo/ui/screens/import` → 7 files / 126 tests green.
**Scope discipline:** R-1…R-34 are CLOSED and are not re-litigated. New findings are confined to the round-2 fix commits' blast radius.

---

# Fix-delta (prior findings attributed to this lane)

| Prior | Sev | Verdict | Fix commit |
|---|---|---|---|
| R-35 (this lane's N1, merged & escalated) | MAJOR | **FIXED** | `7249809` |
| R-39 (N2) | MINOR | **FIXED** | `ca0df27` |
| R-40 (N3) | MINOR | **FIXED** | `ee2e5d9` |
| R-41 (N4) | MINOR | **FIXED** | `ee2e5d9` |

### R-35 — FIXED (`7249809`)

The two scopes are now two functions with two different types, which is the stronger half of the fix the merged finding offered ("option (a) … give the scopes distinct types so a consumer cannot silently take the wrong one").

- `deriveTrust(lines): TerminalTrust` is untouched and still segment-scoped (`ImportTerminalProgress.tsx:101-108`, `FILE` still resets to `'cloud'`) — R-1's pins hold; the title bar (`:562-564`) and the processing badge (`:656-659`) still read the CURRENT file's exposure.
- The new run-scoped sibling is `runHadSampleFallback(lines): boolean` (`:123-125`) — `lines.some(NORM && startsWith(SAMPLE_FALLBACK_PREFIX))`, no `FILE` reset, keyed off the same R-32 constant so the emit-site contract still compiles on both sides.
- The CTA now consumes the run-scoped value only: `const runHadSample = useMemo(() => runHadSampleFallback(lines), [lines])` (`:452`) → `ctaView(outcome, isBatchRun, runHadSample)` (`:454`), and `ctaView`'s `reviewSub` gates on `runHadSample` (`:363-365`). `trust` now feeds only the two live surfaces (`:530`, `:658`).
- The scope split is a *type* split, not just a naming one (`TerminalTrust` vs `boolean`), so the mix-up that produced R-35 cannot recur silently — this is what the finding's closing sentence asked for.
- The missing case is pinned exactly as specified: `ImportTerminalProgress.test.tsx:504-521` renders `FILE → sample fallback → FILE → AI`, then an outcome, and asserts the trust line reads `TRUST_LINE.cloud` **while** the CTA carries the amber `sample import — review →`; `:523-537` pins the two derivations deliberately disagreeing on the same line array. The ring-cap eviction direction and the ~27-file bound are documented at the derivation (`:119-121`) rather than silently inherited.
- Deliberate-choice check: the orchestrator states the two derivations disagreeing on mixed batches IS the design. Verified that is what the code and tests say, and that the disagreement is confined to surfaces with opposite safe-failure directions (exposure label vs. substitution summary). No re-flag.

### R-39 — FIXED (`ca0df27`)

The nowhere-state is now unconstructable at the write site rather than merely unreached.

- `finishImport` pins the stage in its own updater: `setImp((s) => ({ ...s, stage: 'progress', result, lastLocId: t.lastLocId }))` (`DemoExperience.tsx:521`), with the rationale in-comment (`:518-520`).
- The backstop no longer writes `result` at all — it pushes a synthetic row and reports through `finishImport` (`:554-561`), so there is no second `result` writer to trace.
- Full re-enumeration of `setImp` writers in the current file (`:369, :405, :521, :560, :569, :587, :604, :610, :620, :928, :931, :932, :934, :938, :949`): every writer that sets a non-null `result` sets `stage` to `'progress'` (`:521`) or `'result'` (`:569`, `:604`, `:610`); every writer that clears `result` sets `'picker'` (`:938`) or `blankImport` (`:369`, `:949`). `computeImportStage` (`engine/logic/import-flow-mode.ts:37-41`) renders all four pairings. The `picker|paste + result` pairing my finding named is gone, including on the empty-`files` path (`total === 0` skips the loop's flip but `finishImport` now supplies `'progress'` itself).
- The second claim (stale §36 inventory) is discharged: `deferred.md` §36 carries a "Writer inventory update (fix-delta R-39)" paragraph naming the backstop rework and the pin.

### R-40 — FIXED (`ee2e5d9`)

- `ImportErrorDetails.stage` is now `ImportRealStageId` (`run-import.ts:86`), with the doc comment stating why `'error'` is not a stage anything failed AT (`:80-84`).
- The one producer that could have supplied `'error'` no longer reads `activeStage`: the backstop reads `lastRealStageRef.current ?? 'extracting_text'` (`DemoExperience.tsx:558`), typed `ImportRealStageId | null`, so `'error'` is now structurally impossible at every construction site.
- The three pipeline producers satisfy the narrower type unchanged (`run-import.ts:219`, `:235`, `:265` — `'normalizing'`, `'normalizing'`, `'extracting_text'`), and the only other consumers (`ImportModal.tsx:42`, `:137` → `JSON.stringify`) are unaffected. `tsc` clean confirms no site was widened to compensate.

### R-41 — FIXED (`ee2e5d9`)

- `RunFailure` now declares `code: ImportErrorCode` and `details: ImportErrorDetails` as required (`DemoExperience.tsx:466-467`), with `partialData?` correctly left optional; the rationale names the future-bare-push break (`:456-462`).
- All three push sites satisfy it: `:592` (batch), `:624` (text) — both sourced from the post-R-29 required failure arm — and the new synthetic backstop row `:554-559`. The single-failure unwrap at `:512` now reads `single.code`/`single.details` as non-optional, so the friendly-copy mapping and the Technical Details block can no longer be silently dropped by a new failure source.
- The layer distinction the original R-29 drew is still honoured: the modal-level `ImportResult` keeps `code?`/`details?` (`ImportModal.tsx:40-42`) for DemoExperience's genuinely code-less pre-pipeline guard failures (`:569`, `:604`, `:610`).

### Regression spot-check on this lane's CLOSED round-1 findings (the round-2 commits touch their files)

Not re-litigated, just confirmed intact after the round-2 edits to `run-import.ts` / `DemoExperience.tsx` / `ImportTerminalProgress.tsx`:

- **R-8** — `ERROR_MESSAGES: Partial<Record<ImportErrorCode, string>>` (`ImportModal.tsx:61`) still union-keyed; the new `'UNEXPECTED_ERROR'` member is deliberately unmapped (orchestrator's list) and the `|| result.error` fallback (`:243`) renders the backstop's own friendly string. No compile-silent hole introduced.
- **R-29** — the failure arm's `code`/`details` are still required (`run-import.ts:117-119`); adding a union member did not relax it.
- **R-31** — `ImportUiStage` still declared exactly once (`engine/logic/import-flow-mode.ts:26`); no round-2 commit re-introduced a local alias.
- **R-32** — `SAMPLE_FALLBACK_PREFIX` is still the single contract; the new `runHadSampleFallback` compiles against the same constant (`ImportTerminalProgress.tsx:124`) rather than re-spelling the prose.
- **R-34** — `readonly` fields + `readonly getLines()` unchanged (`import-log.ts:44-53`, `:90`); the `@ts-expect-error` pins now have a scripted enforcement path (`package.json:10` `"typecheck": "tsc --noEmit"`, R-44) and the test comment points at it.
- **Engine purity / store-bridge rule** (`features/demo/CLAUDE.md`): re-swept the round-2 diff — no `engine/store/*` or `useStore` import appears in `ui/screens/import/*`, `ui/import/*`, or `ui/chrome/*`; nothing React-flavoured entered `engine/`.

---

# New findings (fix-introduced only)

## TYPE-DESIGN-1 [MINOR] features/demo/ui/screens/ImportModal.tsx:121

**Claim.** The R-38 rework made the throw backstop *report counts* for the first time, but the run's file total is **derived** from the tally (`successCount + failures.length`) rather than stored — and the backstop is the first path that can report a tally that is **incomplete by construction**. In a batch of ≥3 files, a throw before the last file makes the dwell and the result view state a denominator smaller than the batch the visitor selected, and the un-attempted files disappear from the report entirely.

**Evidence.**

- The derivation: `deriveTerminalOutcome` (`ImportModal.tsx:117-124`) computes `const successCount = result.locations.length; const totalFiles = successCount + result.failures.length`. It is sound only while the tally accounts for every file in the run.
- Until this round it always did: the loop either recorded a success or pushed a failure per file (`DemoExperience.tsx:591-592`), and the only early exits (`:585`, `:590`, `:594`) return **without** reporting.
- The backstop now reports mid-loop: the catch pushes **exactly one** synthetic row and calls `finishImport` (`DemoExperience.tsx:554-561`). Files `i+1..n` were never attempted, so they are in neither `locations` nor `failures`.
- Consequence at both surfaces. 3 PDFs; file 1 lands; something throws while file 2 is processing → tally = 1 location + 1 synthetic failure → `deriveTerminalOutcome` yields `{ status: 'partial', successCount: 1, totalFiles: 2 }` → the CTA reads `Batch partially failed — 1 of 2, 1 needs attention` (`ImportTerminalProgress.tsx:390`) and the result view reads `Imported 1 of 2 requests.` (`ImportModal.tsx:272`). The visitor selected 3. The all-failed variant is the same shape: `${t.failures.length} imports failed.` (`DemoExperience.tsx:513`) counts the attempted files only.
- The run's true size is *right there* and unshadowed: `imp.batch.total` (written at `DemoExperience.tsx:587`, passed down at `:924`), which the very same terminal renders as `File 2 of 3` in the processing badge (`ImportTerminalProgress.tsx:657`) moments before the CTA says `1 of 2`. Two representations of one fact, now able to disagree on the same surface — and `finishImport` even receives the authoritative `totalFiles` (`DemoExperience.tsx:496`, `:561`) but does not put it in the result.
- Not covered: the R-38 pin uses exactly two files with the throw on the last one (`DemoExperience.sandbox.test.tsx:735-758`), the one arity where derived and real totals coincide.
- Direction check (why this is the honesty-relevant direction): the fix's own commit message is "the throw backstop reports the whole truth — tally-aware". For ≥3-file batches it reports a partial truth with a *shrunken* denominator, which reads as a smaller batch rather than as an interrupted one.

**Suggested fix.** Stop deriving the run size from a tally that is no longer guaranteed complete — carry it. `finishImport` already takes `totalFiles`: put it on the result (`ImportResult` success arm gains `totalFiles: number`; the aggregate failure arm likewise) and have `deriveTerminalOutcome` read it instead of summing (`ImportModal.tsx:121`), with the result view's `Imported X of Y` (`:272`) following. That also makes the "some files were never attempted" case expressible: `successCount + failures.length < totalFiles`. Cheaper alternative if the type change is unwanted this round: in the catch, compute `const attempted = tally.locations.length + tally.failures.length` **before** pushing and pad `tally.failures` with `totalFiles - attempted - 1` rows worded "not processed — the import stopped here", so the denominator stays truthful. Either way add the missing arity to the R-38 pin: 3 files, throw on file 2, assert the reported total is 3.

**Related, not filed separately (LOW):** the synthetic row uses `filename: 'import'` (`DemoExperience.tsx:555`) — a non-filename sentinel in a field typed `filename: string` (`ImportModal.tsx:24`), rendered verbatim as a filename in `FailuresCard` (`:188`) and used in its React key (`:187`). Harmless today, but if the padding option above is taken, the rows would benefit from `filename: string | null` (precedent #8's distinct-absence semantics) so "not a file" is representable rather than spelled.

**Confidence.** High on the mechanism (derivation, catch, and both render sites read end-to-end; the 2-file test arity verified). **MINOR**, on the same premise the backstop itself is built on — no callee throws today (`requestExtraction` catches everything, `extract-client.ts:31-34`; `forwardGeocode` catches, `geocode.ts:39-45`; `runPdfImport`/`runImport` catch their own stages), so this is defense-in-depth honesty, not a shipped defect. Cross-lane note for the aggregator: silent-failures may see the same hunk as an under-reporting claim (R-38 residual); it is one defect, best merged.

---

## TYPE-DESIGN-2 [MINOR] features/demo/ui/DemoExperience.tsx:401

**Claim.** The R-38/R-40 rework introduced `lastRealStageRef` — a **second** representation of `lastRealStage`, run-scoped in meaning but mount-scoped in lifetime. Its state twin is reset on every run boundary; the ref is reset **nowhere**. Nothing in the type says the ref belongs to the current run, so the backstop's diagnostic can attribute a *previous* run's stage to this run's failure.

**Evidence.**

- Declaration: `const lastRealStageRef = useRef<ImportRealStageId | null>(null)` (`DemoExperience.tsx:401`). Written at `:404` (inside the token-guarded forwarder), `:586` (per PDF file), `:619` (paste run). Read at exactly one place — the backstop's synthetic row: `details: { stage: lastRealStageRef.current ?? 'extracting_text', detail }` (`:558`).
- The state twin `ImportState.lastRealStage` (`:110`) is reset at every run boundary: `blankImport` (`:119`, applied on open/close `:369`, `:949`), `onRetry` (`:938`), and re-seeded at each run's first stage flip (`:587`, `:620`). The ref is in none of those resets — `grep -n lastRealStageRef` returns only `401, 404, 558, 586, 619`.
- Reachable divergence: run 1 (PDF) reaches `normalizing` → ref = `'normalizing'`. Visitor closes the modal → `onCancel` bumps the token, resets the bus, and applies `blankImport` (`:945-949`) — state twin `null`, ref still `'normalizing'`. Visitor reopens and pastes text; run 2's guarded closure throws on its first statement (`emitter.log('INIT', …)`, `:618`) — i.e. before the ref is re-seeded at `:619`. The catch pushes `details.stage: 'normalizing'`, and the collapsible Technical Details block (`ImportModal.tsx:159`) prints a stage belonging to a run the visitor already cancelled. Same window exists in `processPdfFiles` between `:582-583` and `:586`, and for the whole `total === 0` path where `:586` never runs at all.
- This is the failure direction R-40 was filed to remove, one notch worse: R-40's complaint was an *uninformative* `"stage": "error"`; a stale ref is an *affirmatively wrong* stage that reads as authoritative.
- Type framing: the fact "the last real stage of THIS run" now lives in two mutable cells with different lifecycles and no type-level link between them (precedent #4 — a value duplicated beside its source is a drift surface). The ref's type (`ImportRealStageId | null`) makes the empty case representable but cannot express "belongs to run N".

**Suggested fix.** Reset the mirror where the run takes its token — one line each, no behaviour change on the happy path (both flows re-seed the ref before any real work): add `lastRealStageRef.current = null` immediately after `const myGen = ++importGen.current` at `:573` and `:614` (and, belt-and-braces, in `onCancel` beside `importGen.current++` at `:945`). Then a pre-seed throw reports the honest `'extracting_text'` default instead of a foreign run's stage. If the duplication itself is unwanted, the alternative is to keep the single state cell and have the catch read it through a functional `setImp` that both records `activeStage: 'error'` and captures `s.lastRealStage` — but that re-introduces the impure-updater read the author deliberately avoided, so the reset is the better trade.

**Confidence.** High on the type/lifecycle gap and on the fix; **low on reachability** — the divergence window is one `emitter.log` call wide and the log bus does not throw today (`import-log.ts` `log` only pushes to a ring and broadcasts). MINOR, graded the same way R-39 was.

---

## Checked and found clean (stated so the next pass doesn't re-derive)

- **`'UNEXPECTED_ERROR'` placed in `run-import.ts`'s `ImportErrorCode`** (`:69-77`) even though that module never produces it: on the orchestrator's deliberate-choices list (bridge-only, phone `UNKNOWN_ERROR` parity, deliberately unmapped in `ERROR_MESSAGES`). The constraint is carried in the doc comment at the member and re-stated at the push site (`DemoExperience.tsx:557`). Not filed.
- **`ctaView(outcome, isBatchRun, runHadSample)`** (`ImportTerminalProgress.tsx:362`) now takes two adjacent same-typed booleans — a transposition would compile. Module-private with a single call site (`:454`), and the tests do discriminate a swap (the R-25 single-file pin at `:490-501` has `isBatchRun=false, runHadSample=true`, so swapping flips both the title and the sub). No reachable invalid state → not filed.
- **`guardImportRun(myGen, emitter, tally, totalFiles, run)`** (`:540-546`): two `number` params, but non-adjacent and only two call sites (`:581`, `:617`), both verified correct. Not filed.
- **`ImportTally` now mutated by two owners** (the guarded closure and the catch): the type is a plain mutable record with no invariant the second writer can violate; `finishImport` recomputes everything from it. Fine.
- **Exhaustiveness** survives the round at all three `never`-checked switches: `ctaView` (`ImportTerminalProgress.tsx:407-410`), `emitFallback` (`run-import.ts:152-155`), `fallbackNotice` (`DemoExperience.tsx:423-426`). The `ctaView` signature change did not weaken its switch.
- **Registry↔union linkage** intact: `STAGE_VIEW: Record<Exclude<RunStageId,'error'>, …>`, `TRUST_LINE: Record<TerminalTrust, string>`, `LEVEL_ACCENT: Record<ImportLogLevel, string>`, `ERROR_MESSAGES: Partial<Record<ImportErrorCode, string>>`.
- **No new `any` / `as` in production code**: the round-2 added-line scan turns up only test-local casts (`as HTMLInputElement`, `as { onbeforeprint?: unknown }`, `as const`).
- **`PdfPreview` R-36/R-37** (`chrome/PdfPreview.tsx:50-83`): nothing type-shaped to flag — `canDetect` is a plain capability boolean, the notice stays `string | null`, and the `catch (err) { … throw err }` + `finally` split keeps the listener teardown on all three paths without widening a type. Behavioural review belongs to the web/typescript lanes.
- **R-42's mocked row module** (`ImportTerminalProgress.memo.test.tsx:16-27`) declares a local narrowed `Props` rather than importing `TerminalLine`'s props: not parallel *entity* drift (`ImportLogLine` is not re-declared; the mock reads `seq`/`text` only) and a prop rename would fail the test at runtime. Not filed.
- **Tracked gaps not fired:** deferred §4 / §5 / §16 / §27 triggers untouched by this round (`engine/content/screens.ts`, `ExploreItem`, `updateField(path: string)` all unchanged). §35's addendum and §36 (now with its writer-inventory update) remain accurate.
- **Deliberate choices honored:** the segment-vs-run trust disagreement, the unmapped `UNEXPECTED_ERROR`, dwell semantics, trust-line wording, §§29–36 deferrals, D5 adaptations, and the known 5s-timeout load-flake class — none re-flagged.

## Type Design Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 2 |

- **Prior lane findings:** 4/4 **FIXED** (R-35 MAJOR, R-39, R-40, R-41) — zero partial, zero unfixed. R-35's fix is stronger than the minimum asked for (distinct types, not just distinct call arguments); R-39's fix moved the invariant from "traced by review" to "unconstructable at the write site".
- **Canonical homes preserved:** yes — no entity shape re-declared; `ImportUiStage` still single-declaration.
- **Discriminated unions well-formed:** yes — `ImportRunResult`'s failure arm and now `RunFailure` both carry their required payload.
- **Exhaustiveness enforced:** yes — all three `never` checks survive.
- **Correlated state modelled as a union:** flat `ImportState` still accepted (§36), and its coherence is now enforced at the writer rather than by inventory.
- **Id spaces typed:** yes — `ImportErrorDetails.stage` tightened to `ImportRealStageId`; no bare-`string` key introduced.
- **readonly discipline on shared data:** yes — unchanged, and now script-enforced.
- **Boundary types honest about untrusted input:** yes. The two residual honesty gaps are in the *report* shape, not the boundary: a derived run-total that can under-count (TYPE-DESIGN-1) and a stage mirror with no run scope (TYPE-DESIGN-2).

**Verdict:** APPROVE — the round-2 fixes are clean from this lane's perspective. Both new items are MINOR, both live inside the throw backstop whose own premise is "nothing here throws today", and both are one-to-three-line changes that can land opportunistically or be deferred with a `deferred.md` entry.
