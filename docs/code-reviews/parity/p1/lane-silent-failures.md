# Lane: silent-failures — parity P1 (PR #30) — FIX-DELTA ROUND 2

- **Lane:** silent-failures (`.claude/agents/silent-failure-hunter.md`)
- **Mode:** FIX-DELTA **round 2** — re-review of the round-2 fix round only
  (three branches merged after review commit `3d03bbb`; delta = `git diff 3d03bbb..feat/parity-p1`,
  12 files, +329/−59). R-1…R-34 are CLOSED and were not re-litigated.
- **Prior vetted doc:** `docs/code-reviews/parity/p1/p1-review-fixdelta.md` (R-35…R-44)
- **Prior lane file:** this file's round-1 version (SILENT-FAILURES-1 → R-35, SILENT-FAILURES-2 → R-38,
  secondary folded into R-39; PARTIALs carried in: R-25)
- **Refs read:** `.claude/agents/silent-failure-hunter.md`, `features/demo/CLAUDE.md`,
  `docs/code-reviews/deferred.md` (§15/§18/§28/§33–§36 incl. the new R-39 writer-inventory addendum),
  the orchestrator's deliberate-choices list (honored — nothing on it is re-flagged below)
- **Round-2 fix commits verified (mine + adjacent honesty surface):** `7249809` (R-35) ·
  `ca0df27` (R-38 + R-39) · `ee2e5d9` (R-40 + R-41) · `28cf5c7` (R-36) · `2bbfa7e` (R-37) ·
  `f6e2202` (R-43, paste-route backstop pin)
- **Files re-read in full (not just hunks):** `ui/DemoExperience.tsx`,
  `ui/screens/import/ImportTerminalProgress.tsx`, `ui/screens/ImportModal.tsx`,
  `ui/import/run-import.ts`, `ui/chrome/PdfPreview.tsx`,
  `engine/logic/import-flow-mode.ts`, plus the round-2 test additions
- **Gates run in-worktree (mine):** `npx tsc --noEmit` → clean (exit 0) ·
  `vitest run PdfPreview.test.tsx` 23/23 · `ImportTerminalProgress{,.memo}.test.tsx` 35/35 ·
  `DemoExperience.sandbox.test.tsx` 53/53 — all green.

**Explicitly not re-flagged** (orchestrator's deliberate-choice list + deferred.md): the deliberate
run-scoped-vs-segment-scoped disagreement between `runHadSampleFallback` and `deriveTrust` on mixed
batches (that *is* R-35's design); `UNEXPECTED_ERROR` being bridge-only and deliberately unmapped in
`ERROR_MESSAGES`; the R-36 capability-probe degrade (no print events ⇒ absence-of-throw, i.e. the
pre-R-12 behaviour on ~7% of engines) — the finding itself specified it; the dwell semantics; the
trust-line wording; D5 adaptations; §§29–36; the 5s-timeout load-flake class; pre-existing §15
(`roundTo5Min`) / §18 / §28.

---

## Fix-delta: every round-1 finding attributed to this lane

| Prior | Sev | Lens owner | Verdict | Fix commit |
|---|---|---|---|---|
| R-35 (was SILENT-FAILURES-1) | MAJOR | mine (spine) | **FIXED** | `7249809` |
| R-38 (was SILENT-FAILURES-2) | MINOR | mine | **FIXED** (with a residual → SILENT-FAILURES-1 below) | `ca0df27` |
| R-39 (SF secondary, folded into TD's writeup) | MINOR | co-lens | **FIXED** | `ca0df27` |
| R-25 → carried PARTIAL from round 1 | MINOR | mine | **CLOSED** by the R-35 fix | `7249809` |
| R-36 (SF-5's declined residual, grounded by TS/web) | MINOR | adjacent | **FIXED** | `28cf5c7` |
| R-37 (dead `window.focus()`) | MINOR | adjacent | **FIXED** | `2bbfa7e` |
| R-40 / R-41 (type-design; honesty-relevant) | MINOR | adjacent | **FIXED** | `ee2e5d9` |

### R-35 — mixed-batch substitution unmarked on the dwell surface — **FIXED** (`7249809`)

Option (a) of my suggested fix, taken as written and typed as a boolean rather than a second
`TerminalTrust` (the type-design lane's scope-confusion guard):

```ts
// ImportTerminalProgress.tsx:123-125 — NO FILE reset, unlike deriveTrust
export function runHadSampleFallback(lines: readonly ImportLogLine[]): boolean {
  return lines.some((l) => l.level === 'NORM' && l.text.startsWith(SAMPLE_FALLBACK_PREFIX))
}
```

Both consumers are now scope-correct at the single derivation site — `:451` `trust` (segment) feeds
`TRUST_LINE`/the title bar, `:452` `runHadSample` (run) feeds `:454` `ctaView`, and `ctaView`'s
`reviewSub` (`:363-365`) is spread into **both** the `success` and `partial` arms, so a mixed batch
that ends amber discloses too. The docstring (`:110-122`) records the two-scope rule and the ring-cap
eviction direction, so a future consumer cannot take the wrong scope by accident.

Adversarial re-trace of the exact sequence I filed: `a.pdf` 502 → `NORM sample fallback: …` →
fictional SAMPLE location written; `b.pdf` live; log ends on `b.pdf`'s segment. Title bar still reads
`cloud model via server proxy` (correct — file 2's exposure), and the CTA now reads
**`sample import — review →` in amber** (`C.warning`). Escape during the dwell therefore can no
longer discard a substituted import with nothing on screen having said so.

Pinned two ways, both mutation-sensitive: the component-level mixed-batch case
(`ImportTerminalProgress.test.tsx:504-523` — asserts `TRUST_LINE.cloud` on the trust line *and* the
amber CTA in the same render) and the unit contract
(`:525-538` — `runHadSampleFallback(mixed) === true` while `deriveTrust(mixed) === 'cloud'`, i.e. the
disagreement is the assertion). Reverting `:454` to `trust` fails the first; deleting the `FILE`-less
scan fails the second.

Failure-arm check (I looked for a new hole): `ctaView`'s `failure` arm carries no attribution, but a
failure **with** a substitution is unreachable — `emitFallback` only fires on
`fallbackMode !== 'none'`, and every fallback path parses `SAMPLE_RAW`, which always yields fields
(the `NO_FIELDS_FOUND` guard is gated on `fallbackMode === 'none'`, `run-import.ts:207`). No gap.

### R-38 — the throw backstop denied a partial batch's landed locations — **FIXED** (`ca0df27`)

The tally is hoisted out of the guarded closure (`DemoExperience.tsx:580`, `:616`) and passed into
`guardImportRun` (`:581`, `:617`); the catch now pushes a synthetic row and reports through the
normal reporter instead of fabricating a total failure:

```ts
// DemoExperience.tsx:554-561
tally.failures.push({ filename: 'import', error: 'The import failed unexpectedly. Please try again.',
  code: 'UNEXPECTED_ERROR', details: { stage: lastRealStageRef.current ?? 'extracting_text', detail } })
setImp((s) => ({ ...s, activeStage: 'error' }))
finishImport(tally, emitter, totalFiles)
```

Traced end to end for the 2-file case: file 1 lands → `tally.locations.length === 1` → `finishImport`
takes the `ok: true` arm → `deriveTerminalOutcome` (`ImportModal.tsx:117-124`) returns `partial` →
amber CTA "Batch partially failed — 1 of 2, 1 needs attention" → the result view renders the landed
location's accordion **plus** the `FailuresCard` row. The locations that landed are no longer denied,
and "Try again" is no longer offered as the only action over a case that already gained a location.
Pinned end-to-end through the real bridge at `DemoExperience.sandbox.test.tsx:735-760` (green in my
run), including `store.getState().locations.length === 1`.

Residual (new, MINOR, filed below as SILENT-FAILURES-1): the report's denominator is derived from the
tally arrays, so for **3+ files** the files the loop never reached vanish from the count, and the
synthetic row is named `import` rather than the file that threw.

Store-write-vs-tally ordering re-checked: `applySuccess` writes the location (`:448-452`) before
`recordSuccess` pushes the view row, so a throw *inside* that window still yields an unreported
location. Unchanged by this fix and inherently unknowable from the catch — recorded here, not filed
(no callee in that window can throw today: `applyImport`'s dev probe is fully try-wrapped,
`forwardGeocode` returns `null`, `emitter.log` cannot throw).

### R-39 — backstop wrote `result` without `stage` — **FIXED** (`ca0df27`)

`finishImport` now pins the pairing itself — `setImp((s) => ({ ...s, stage: 'progress', result, … }))`
(`DemoExperience.tsx:521`) — so every result write (normal completion *and* backstop) lands in a
pairing `computeImportStage` renders (`import-flow-mode.ts:37-41`), regardless of where the throw
landed relative to the first stage flip. §36's writer inventory was updated in the same commit
(`deferred.md:815-820`).

I checked the pin for a resurrection hazard, since `stage: 'progress'` is now written
unconditionally: `onCancel` bumps `importGen.current` **before** `setImp(blankImport)`
(`DemoExperience.tsx:943-950`), and every `finishImport` call site is behind a token check
(`:594`, `:625`, and the catch's own `:553`), so a cancelled run can never re-open the terminal over
a closed modal. The pre-pipeline guard writes (`stage: 'result'`, "Select a case first." /
"Paste the request text first.") never reach `finishImport` and are untouched.

### R-25 (carried PARTIAL) — **CLOSED**

The round-1 remainder *was* R-35; with `7249809` the single-file, paste **and** mixed-batch cases all
carry the attribution at the CTA moment. Nothing of R-25 is left open.

### R-36 / R-37 — print-honesty machinery — **FIXED** (`28cf5c7`, `2bbfa7e`)

Adjacent lanes own these; I verified them against my own charter (fake success / fake failure on the
PDF-save surface) and found the fix strictly honest:

- Capability probe `const canDetect = 'onbeforeprint' in win` (`PdfPreview.tsx:50`) and a deferred
  verdict (`:72-80`): a detectable engine that never fires the event still gets
  `PRINT_BLOCKED_NOTICE` one macrotask later — **R-12's "silent ignore is not success" property is
  intact on every engine that can be measured** (`PdfPreview.test.tsx:137-145`, and the
  notice-survives-a-second-failure pin at `:198-210`, both green in my run).
- Teardown is leak-free on all four paths: early return (no listener yet), throw (inner
  `catch` removes then rethrows, `:59-61`), immediate verdict (`:73`), deferred verdict (`:77`).
  The prior review's own sketch leaked on sync success; this doesn't.
- `window.focus()` deleted; the load-bearing `win.focus()` (`:57`) kept. Focus return still runs in
  the `finally` on the dialog / throw / silent-ignore branches alike.

Residual, considered and **not** filed: a dispatch deferred by *more* than one macrotask still yields
a false "blocked" notice. That is the accepted shape of the finding's own suggested fix, and the
direction is the safe overclaim (a failure notice over a save that happened), never a hidden failure.

### R-40 / R-41 — **FIXED** (`ee2e5d9`)

`ImportErrorDetails.stage` is now `ImportRealStageId` (`run-import.ts:86`), and all three pipeline
producers pass literals (`:219`, `:235`, `:265`) — no producer was forced into a lie by the
narrowing. `RunFailure.code`/`details` are required (`DemoExperience.tsx:463-465`), so a future bare
`tally.failures.push({ filename, error })` is a compile error rather than a silently un-enriched
failure card. `ERROR_MESSAGES` stays `Partial`, so the new `UNEXPECTED_ERROR` renders the backstop's
own friendly string via the load-bearing `|| result.error` (`ImportModal.tsx:243`) — verified live in
the R-43 paste-route test.

---

## New findings (fix-introduced only)

## SILENT-FAILURES-1 [MINOR] features/demo/ui/DemoExperience.tsx:554

**Claim.** The R-38 backstop reports through the tally, and the report's **denominator is derived
from the tally arrays** — so a batch throw that happens before the last file silently drops every
file the loop never reached, and the one synthetic row it does push is named `import` instead of the
file that threw. A 3-file batch whose second file throws tells the visitor "Imported **1 of 2**
requests" — the third file is not listed as failed, not listed as skipped, and not counted. This is
the "partial result without a count/flag" pattern, introduced by the fix that closed R-38 (before it,
the same throw produced a total-failure card — the R-38 defect).

**Evidence.**

- `DemoExperience.tsx:554-561` — the catch pushes exactly **one** row and never consults how many
  files were attempted, even though the honest count is in scope as the `totalFiles` parameter
  (`:544`), used only for the DONE-line branch and the `single` selection:
  ```ts
  tally.failures.push({ filename: 'import', error: 'The import failed unexpectedly. Please try again.', … })
  finishImport(tally, emitter, totalFiles)   // totalFiles = 3 here, and is not reflected in the result
  ```
- `ImportModal.tsx:121` — `const totalFiles = successCount + result.failures.length` → `2`, not `3`.
  The CTA therefore reads "Batch partially failed — 1 of 2, 1 needs attention"
  (`ImportTerminalProgress.tsx:390`).
- `ImportModal.tsx:272` — the result view reads `Imported 1 of 2 requests.`; `FailuresCard`
  (`:183-192`) lists one row, `import — The import failed unexpectedly.`
- `finishImport`'s DONE line under-reports the same way: `success: 1 · failed: 1` for a 3-file run
  (`DemoExperience.tsx:502-503`).
- Contradicted by the surface's own earlier output: the processing badge showed "File 2 of 3" and the
  log still carries `INIT batch import · 3 files` — so the run's own record disagrees with the
  summary the visitor is left with (and the log is gone once the CTA is tapped).
- Normal (non-throw) runs are unaffected: every file yields either a location or a failure row, so
  `locations.length + failures.length === total` by construction (`:591-592`).

**Adversarial sequence.** Visitor picks `a.pdf`, `b.pdf`, `c.pdf`. `a.pdf` imports. `b.pdf`'s
`runPdfImport` **throws** (as opposed to returning `ok:false`). The loop aborts; `c.pdf` is never
read. Visitor sees an amber "1 of 2" everywhere, taps through, gets one location plus one failure row
named `import`, and has no way to learn that `c.pdf` was never attempted or that `b.pdf` was the
casualty. **Reachability is low and I want to be honest about it:** no callee throws today (re-verified
for the round-2 code — `applyImport`'s dev probe is try-wrapped, `emitter.log` cannot throw,
`forwardGeocode` returns `null`), which is the same latency caveat the backstop itself is built on —
hence MINOR, same grade as R-38.

**Suggested fix.** The catch already has both the true `totalFiles` and the tally; pad and name:

```ts
// hoisted beside the tally, set at the top of each iteration:
//   let inFlight: { index: number; name: string } | null = null
tally.failures.push({ filename: inFlight?.name ?? 'import', error: 'The import failed unexpectedly. Please try again.', … })
for (let j = (inFlight?.index ?? -1) + 1; j < totalFiles; j++)
  tally.failures.push({ filename: files[j].name, error: 'Not imported — the run stopped after an unexpected error.',
    code: 'UNEXPECTED_ERROR', details: { stage: lastRealStageRef.current ?? 'extracting_text', detail } })
```

(`runTextImportFlow` passes `totalFiles: 1`, so its behaviour is unchanged and `single` still selects
the enriched one-file card.) Extend the R-38 test to three files with the **second** rejecting and
assert "1 of 3" plus a row naming `c.pdf`.

**Confidence.** High on the mechanism and the rendered strings (all three derivations read directly);
low on reachability, as stated.

## SILENT-FAILURES-2 [MINOR] features/demo/ui/DemoExperience.tsx:401

**Claim.** `lastRealStageRef` — introduced by the R-40 fix so the backstop can report a real stage —
is **component-scoped and never reset at run start**, so it survives across runs and across
modal open/close (`blankImport` resets `imp`, not the ref). A throw that lands in a new run *before*
that run's first stage assignment makes Technical Details print the **previous** run's stage. R-40
removed `"stage": "error"` (a marker, not a stage) and this replaces it with a value that is a real
stage — of a different import.

**Evidence.**

- `DemoExperience.tsx:401` — `const lastRealStageRef = useRef<ImportRealStageId | null>(null)`;
  the only writes are `:404` (token-guarded forwarder), `:586` and `:619` (run bodies). Neither
  `openImport` (`:367-371`) nor `onCancel` (`:943-950`) nor `onRetry` (`:935-939`) clears it, and
  none of them is on the ref's write path.
- `DemoExperience.tsx:558` — the backstop reads it: `stage: lastRealStageRef.current ?? 'extracting_text'`.
- The un-assigned window: `processPdfFiles` assigns at `:586`, **inside** the loop, so the window is
  `:582-585` (`emitter.log('INIT', …)` + loop entry) — and for `files.length === 0` the assignment
  never happens at all; `runTextImportFlow` assigns at `:619`, one `emitter.log` after entry (`:618`).
- The pre-fix code read `s.activeStage`, which `blankImport` (`:119`) nulls on every modal open — so
  it degraded to the `'extracting_text'` default rather than to another run's stage. The ref is
  strictly more stale-prone than what it replaced.
- Cross-run corruption from *concurrency* is correctly excluded: `:404` is token-guarded and `:586`
  sits after the loop's token check, so a superseded run cannot write the ref. Only staleness bites.

**Adversarial sequence.** Import #1 (paste) completes → forwarder leaves `lastRealStageRef.current =
'done'`. Modal closed, reopened, import #2 (PDF) started; a throw lands before `:586` executes →
Technical Details reads `{"stage": "done", "detail": "…"}` for a run that never got past INIT. Same
unreachable-throw class as the backstop itself (nothing in that 1–2 statement window can throw
today), which is why this is MINOR and not higher.

**Suggested fix.** One line at each run's token bump, next to `++importGen.current`
(`:573` and `:614`): `lastRealStageRef.current = null` — the `?? 'extracting_text'` default then
applies to a stage-less throw, exactly as the pre-fix code did. Optionally assert it in the R-43
paste test by rejecting `runText` immediately after a completed PDF run.

**Confidence.** High on the mechanism (ref lifetime is three lines); low on reachability, stated above.

---

## Verified clean in the round-2 delta (recording so a later pass doesn't re-open them)

- **No breadcrumb removed.** The delta only preserves/adds: `console.error('[demo/import] import run
  threw unexpectedly', …)` (`:550`) survives the backstop rewrite and is asserted in both throw tests;
  `PickerStage.tsx:207,253` untouched. `extract-client.ts`, `pdf-extract.ts`, `geocode.ts` are not in
  the round-2 delta at all — the 503-vs-everything-else split and its three warns are intact.
- **Every exhaustiveness net survives.** `fallbackNotice`'s `never` arm (`DemoExperience.tsx:421-424`),
  `emitFallback`'s (`run-import.ts:152-155`), `ctaView`'s (`ImportTerminalProgress.tsx:407-410`) —
  the R-35 change threads a boolean through `ctaView` without touching its switch.
- **Adding `UNEXPECTED_ERROR` to `ImportErrorCode` widened no silent default.** `ERROR_MESSAGES` is
  `Partial<Record<…>>` by design (R-8) and the `|| result.error` fallback renders the backstop's own
  honest copy — exercised live by the R-43 paste test; no `Record<ImportErrorCode, …>` switch exists
  that could fall through (`tsc --noEmit` clean).
- **The blank-record guard (deferred §3) is untouched** — `run-import.ts:207-224`.
- **Token discipline is unchanged in substance.** Moving the check in `importStageFor` from *inside*
  the updater to before the dispatch (`:403`) is equivalent-or-better: `onCancel` bumps the token
  synchronously in the same handler, so a late callback can never observe a valid token and land a
  write after a cancel; and the stale path now dispatches nothing at all instead of returning `s`.
- **`stage: 'progress'` in `finishImport` cannot resurrect a closed modal** — traced above under R-39.
- **The `!canDetect` degrade in `PdfPreview` clears rather than preserves an existing notice**
  (`:72-74`). Considered as a fake-success candidate and **dropped**: reaching it needs a first
  attempt that *threw* followed by one that is *silently ignored* on an engine with no print events —
  a contrived mixed-mechanism sequence on a legacy engine, and the degrade itself is the review's
  accepted trade.
- **Fallback honesty end-to-end re-traced** for the mixed batch: amber log line → run-scoped amber CTA
  → `result.notice` (first fallback wins, `:482`) → per-card `isSample`. Every hop announces.

## Silent Failure Hunter Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 2 |

- **Prior findings (this lane):** R-35 **FIXED**, R-38 **FIXED**, R-39 **FIXED**, R-25 (carried
  PARTIAL) **CLOSED**; adjacent honesty-surface fixes R-36/R-37/R-40/R-41 verified **FIXED**.
  0 UNFIXED, 0 PARTIAL.
- **Fallback honesty (every substitution announced):** yes — including the mixed batch, which was the
  round-1 MAJOR.
- **Failure-cause distinctions preserved:** yes — required `code`/`details`, real-stage-only
  `details.stage`, and a distinct synthetic code for the bridge-only throw.
- **Partial results flagged (not silently short):** one throw-conditional gap
  (SILENT-FAILURES-1: unattempted files uncounted, failing file unnamed).
- **Async cancellation / stale-write safety:** complete; one non-cancellation staleness nit
  (SILENT-FAILURES-2).
- **Operator breadcrumbs intact:** yes.

**Verdict: APPROVE** — both findings are MINOR, throw-conditional, and opportunistic (or a
`deferred.md` line). Nothing in this round blocks the merge.
