# Lane: typescript — parity P1 (PR #30) — FIX-DELTA ROUND 2

- **Lane:** typescript (`.claude/agents/typescript-reviewer.md`)
- **Mode:** FIX-DELTA round 2 — re-review of the round-2 fix commits ONLY (everything after the
  review commit `3d03bbb`; three branches, zero conflicts)
- **Fix-round diff:** `git diff 3d03bbb..feat/parity-p1` — 12 files, +329/−59 · 8 non-merge commits
  (`6a0891b` R-44 · `2bbfa7e` R-37 · `7249809` R-35 · `28cf5c7` R-36 · `ca0df27` R-38+R-39 ·
  `ee2e5d9` R-40+R-41 · `819bd12` R-42 · `f6e2202` R-43)
- **Refs read:** `docs/code-reviews/parity/p1/p1-review-fixdelta.md` (aggregated, R-35…R-44), my prior
  `lane-typescript.md` (TS-1…TS-8 → R-7/R-8/R-10/R-9/R-11/R-2/R-12/R-13, all FIXED and CLOSED;
  TYPESCRIPT-1/2/3 → R-35/R-36/R-37), `features/demo/CLAUDE.md` (binding), root `CLAUDE.md`,
  `.claude/agents/typescript-reviewer.md`, `docs/code-reviews/deferred.md` §36
- **Prior findings attributed to this lane (this round):** **R-35** (TYPESCRIPT-1, merged with
  SILENT-FAILURES-1 + TYPE-DESIGN-N1, settled MAJOR) · **R-36** (TYPESCRIPT-2, merged with WEB-9) ·
  **R-37** (TYPESCRIPT-3). R-1…R-34 are CLOSED and were not re-litigated.
- **Gates re-run in this worktree:**
  - `pnpm typecheck` (the new R-44 script) → **clean**, exit 0. Verified it actually covers the
    compile pins: `tsc --noEmit --listFilesOnly | grep -c import-log.test` → 3 (tsconfig
    `include: ["**/*.ts", "**/*.tsx"]`, `exclude: ["node_modules"]`).
  - `pnpm exec vitest run features/demo/ui/chrome/__tests__/PdfPreview.test.tsx
    features/demo/ui/screens/import features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx
    features/demo/engine/logic/__tests__/import-log.test.ts` → **9 files / 162 tests passed**
  - `pnpm exec vitest run` (full) → **132 files / 1078 tests passed**
- **Verdict:** all 3 prior lane findings **FIXED**. 0 BLOCKER · 0 MAJOR · 3 MINOR new (fix-introduced,
  all inside the round-2 blast radius).

---

## Fix-delta — prior findings

| Prior | Sev | Status | Fix commit | One-line evidence |
|---|---|---|---|---|
| R-35 (TYPESCRIPT-1) | MAJOR | **FIXED** | `7249809` | Run-scoped `runHadSampleFallback` added and wired to `ctaView`; segment-scoped `deriveTrust` untouched for the live surfaces; mixed-batch pin added |
| R-36 (TYPESCRIPT-2 half) | MINOR | **FIXED** | `28cf5c7` | `'onbeforeprint' in win` capability probe + one-macrotask deferred verdict + listener removed on all three exits |
| R-37 (TYPESCRIPT-3) | MINOR | **FIXED** | `2bbfa7e` | The dead `window.focus()` is gone; the load-bearing `win.focus()` stays |

### R-35 — mixed-batch sample substitution unmarked on the dwell surface — **FIXED**

`ImportTerminalProgress.tsx:123-125` adds the run-scoped derivation as a **separate boolean**, not a
second `TerminalTrust` (the type-design lane's suggestion, taken):

```ts
export function runHadSampleFallback(lines: readonly ImportLogLine[]): boolean {
  return lines.some((l) => l.level === 'NORM' && l.text.startsWith(SAMPLE_FALLBACK_PREFIX))
}
```

and the CTA consumes it instead of `trust` (`:452-454`):

```ts
const trust = useMemo(() => deriveTrust(lines), [lines])              // live title bar + per-file badge
const runHadSample = useMemo(() => runHadSampleFallback(lines), [lines])
const cta = outcome === null ? null : ctaView(outcome, isBatchRun, runHadSample)
```

`ctaView`'s third parameter is now `runHadSample: boolean` (`:362`), so the two scopes can no longer be
confused by position: passing the `TerminalTrust` union where a boolean is expected is a compile error.
`reviewSub` is spread into both the `success` and `partial` arms (`:378`, `:391`), so the amber
attribution survives a partially-failed batch as well as a clean one. The exhaustive
`const exhaustive: never = outcome` default (`:407-410`) is intact.

Traced the adversarial sequence from the prior doc against the current code: `FILE ▸ file 1/2` →
`NORM sample fallback: …` → `FILE ▸ file 2/2` → `AI Request` now yields `deriveTrust === 'cloud'`
(honest for the current file) **and** `runHadSampleFallback === true` (honest for the run), which is
exactly the deliberate disagreement the orchestrator declared. Pinned both ways at
`ImportTerminalProgress.test.tsx:504-521` (rendered mixed batch: trust line `cloud`, CTA
`sample import — review →` in `rgb(255, 217, 61)`) and `:522-535` (unit: `runHadSampleFallback(mixed)
=== true` while `deriveTrust(mixed) === 'cloud'`, plus the empty and non-fallback-`NORM` negatives).
The ring-cap caveat from my prior writeup is carried in the function's own docstring (`:119-121`) with
the ~27-file arithmetic and the 25-file confirm gate — accepted in-code rather than silently dropped.

### R-36 — `beforeprint` success signal: sync-dispatch assumption + no feature detection — **FIXED**

`PdfPreview.tsx:50-80` implements both halves and, as the orchestrator noted, hardens past the sketch
in the prior doc — which itself leaked the listener on the synchronous-success path:

```ts
const canDetect = 'onbeforeprint' in win            // :50 — (b) capability probe
...
try { win.focus(); win.print() }
catch (err) { win.removeEventListener('beforeprint', markOpened); throw err }   // :59-61
finally { saveBtnRef.current?.focus() }                                         // :62-71 (R-16 intact)
if (!canDetect || dialogOpened) {
  win.removeEventListener('beforeprint', markOpened)
  setPrintNotice(null)
} else {
  window.setTimeout(() => {                          // :76-79 — (a) one-macrotask grace
    win.removeEventListener('beforeprint', markOpened)
    setPrintNotice(dialogOpened ? null : PRINT_BLOCKED_NOTICE)
  }, 0)
}
```

I re-derived the teardown matrix: **every** exit removes the listener exactly once — throw (`:60`),
undetectable-or-detected-success (`:73`), deferred verdict (`:77`). No path leaks it, including the
sync-success path the prior doc's snippet would have leaked. R-12's load-bearing property survives on
detectable engines: the deferred branch writes `PRINT_BLOCKED_NOTICE`, never `null`, so a second
silently-ignored attempt still cannot clear a prior notice (pinned at `PdfPreview.test.tsx:198-210`,
now with the macrotask flush). The `!canDetect` degrade to absence-of-throw is exactly what R-36
prescribed and is pinned at `:151-161`; the deferred-dispatch case at `:163-175`. `'onbeforeprint' in
win` sits inside the outer `try`, so a cross-origin `SecurityError` from the `in` operator still lands
on the honest notice rather than escaping — the R-12 property that motivated moving the probe inside.

### R-37 — dead `window.focus()` in the print `finally` — **FIXED**

`PdfPreview.tsx:62-71`: the `finally` now contains only `saveBtnRef.current?.focus()`, with the comment
rewritten to state *why* the parent-window call was not the mechanism ("Focusing a parent element is
what restores it (and implicitly blurs the frame) — `window.focus()` requests top-level browser-window
activation, moves no DOM focus"). The load-bearing `win.focus()` at `:57` is kept, as the finding asked.
Both R-16 assertions still pass (`PdfPreview.test.tsx:177-195`).

**Honesty note on my own prior evidence:** the "20+ jsdom `Not implemented: Window's focus()` lines per
run" cost I attached to this finding was *over-attributed*. `win.focus()` at `:57` is the same jsdom
not-implemented sink, so the noise is halved, not eliminated — my targeted run still prints **13**
`Not implemented: Window's focus() method` lines. That does not change the disposition (the finding's
primary claim was that the line is dead for R-16's purpose, and it is gone), but the residual stderr
noise is not removable without dropping the load-bearing call, and no one should chase it expecting
silence.

---

## New findings (fix-introduced, round-2 blast radius)

## TYPESCRIPT-1 [MINOR] features/demo/ui/DemoExperience.tsx:401

**Claim:** `lastRealStageRef` — the R-40 fix's replacement for the backstop's old
`s.activeStage` read — is **never reset when a run starts or when the import state is cleared**, so a
throw landing in the pre-seed window attributes the failure to the *previous* run's stage. The state
twin it mirrors (`imp.lastRealStage`) is reset in three places; the ref is reset in none. Pre-fix the
same read degraded to the honest `'extracting_text'` default, so this is a small regression in the one
thing the field exists to say.

**Evidence:**

The ref is declared at `:401` and written in exactly three places — all *inside* a live run:

```
:404   if (st !== 'error') lastRealStageRef.current = st     // importStageFor, after the token check
:586   lastRealStageRef.current = 'extracting_text'          // per-file seed (PDF batch)
:619   lastRealStageRef.current = 'reading_model'            // paste/clipboard seed
```

and read in exactly one place — the backstop (`:558`):

```ts
details: { stage: lastRealStageRef.current ?? 'extracting_text', detail },
```

The three sites that clear the state twin do **not** clear the ref (verified by
`grep -n "lastRealStageRef\|lastRealStage" features/demo/ui/DemoExperience.tsx`):

```
:369   setImp(blankImport)                                            // openImport — lastRealStage: null
:938   setImp((s) => ({ ...s, …, lastRealStage: null, … }))           // onRetry
:949   setImp(blankImport)                                            // onCancel (also bumps importGen)
```

**Failure scenario.** Visitor imports a PDF; the pipeline reaches `onStage('done')` →
`lastRealStageRef.current = 'done'`. They acknowledge, close the modal (`onCancel` → `blankImport`,
`importGen++`), and reopen Import. The new run enters `guardImportRun` and throws in the pre-seed
window — the `emitter.log('INIT', …)` call at `:582-583` (PDF) or `:618` (paste), which is precisely
the window R-39 was filed about and the one this backstop exists to cover. The catch is token-valid,
so it publishes `details: { stage: 'done', detail }` and the failure card's Technical Details block
renders `"stage": "done"` for a run that never started a stage — pointing the reader at the previous
run. The round-1 code read `s.activeStage ?? 'extracting_text'`, and `activeStage` *is* null-reset by
all three clears, so it degraded to the honest default instead.

Reachability is the same defense-in-depth class as R-38/R-39/R-40 (I re-verified no callee throws
today: `forwardGeocode` soft-fails to `null` with a `console.warn`, `geocode.ts:39-45`; `runImport` /
`runPdfImport` catch internally) — hence MINOR, not MAJOR.

**Suggested fix:** clear the mirror where the token is bumped, so the ref's lifetime is the run's:

```ts
const myGen = ++importGen.current
lastRealStageRef.current = null        // ← at :573 (processPdfFiles) and :614 (runTextImportFlow)
```

(One line each; `?? 'extracting_text'` at `:558` then produces the same honest default the round-1
code did. Clearing it in `onCancel`/`onRetry` instead also works but leaves `openImport` uncovered.)

**Confidence:** High — mechanism verified line-by-line against every write, read and reset site; the
window is the same one the fix round's own R-39 writeup enumerates.

---

## TYPESCRIPT-2 [MINOR] features/demo/ui/DemoExperience.tsx:554-561

**Claim:** The R-38 rework reports a mid-batch throw as **one** synthetic failure row, but every count
on the outcome surface is derived from the tally — so the files the aborted loop never attempted
disappear from the run's arithmetic, and the row cannot name the file that threw. A 3-file batch that
throws on file 2 tells the visitor "1 of 2" on a forensic surface whose own log says "batch import ·
3 files". R-38's headline claim (landed files are no longer denied) is genuinely fixed; this is the
residual in its own hunk.

**Evidence:**

The catch pushes exactly one row, with a placeholder filename, and hands the tally to `finishImport`
(`:554-561`):

```ts
tally.failures.push({
  filename: 'import',                                   // ← not the file that threw
  error: 'The import failed unexpectedly. Please try again.',
  code: 'UNEXPECTED_ERROR',
  details: { stage: lastRealStageRef.current ?? 'extracting_text', detail },
})
setImp((s) => ({ ...s, activeStage: 'error' }))
finishImport(tally, emitter, totalFiles)
```

Every downstream count is `locations.length + failures.length`, never `totalFiles`:

- `ImportModal.tsx:120-123` — `deriveTerminalOutcome`: `totalFiles = successCount + result.failures.length`
- `ImportModal.tsx:272` — result card: `Imported {locations.length} of {locations.length + failures.length} requests.`
- `ImportTerminalProgress.tsx:390` — CTA title: `Batch partially failed — ${successCount} of ${outcome.totalFiles}, …`

**Failure scenario (3 PDFs, `runPdfImport` throws on file 2).** File 1 lands; the loop aborts, so file 3
is never attempted and never recorded. The terminal CTA reads **"Batch partially failed — 1 of 2, 1
needs attention"**, and the result view reads **"Imported 1 of 2 requests."** — while the same terminal
panel still holds `INIT batch import · 3 files` (`:582`) and the component's own `batch` prop says
`{ current: 2, total: 3 }` (`ImportTerminalProgress.tsx:453` uses it for `isBatchRun`). The failures
card then lists a row named `import` rather than `bad.pdf` (`ImportModal.tsx:188`). The existing pin
(`DemoExperience.sandbox.test.tsx:735-761`) uses a **2**-file batch, where "1 of 2" happens to be
right, so the count gap is invisible to the suite. Same defense-in-depth reachability as TYPESCRIPT-1
→ MINOR.

**Suggested fix:** mirror the loop position into a ref beside `lastRealStageRef` (same seam, already
established this round) so the catch can tell the whole truth:

```ts
const runFileRef = useRef<{ index: number; name: string } | null>(null)   // set at :586-588
...
const attempted = tally.locations.length + tally.failures.length
tally.failures.push({ filename: runFileRef.current?.name ?? 'import', … })
for (let i = attempted + 1; i < totalFiles; i++)
  tally.failures.push({ filename: files-name-or-'not attempted', error: 'Not attempted — the run stopped.', … })
```

Cheapest alternative if the extra rows are unwanted: keep one row but word it so it covers the
remainder ("the run stopped after file 2 of 3 — the remaining files were not imported"), and extend the
sandbox pin to a 3-file batch so the arithmetic is falsifiable.

**Confidence:** High on the mechanism (three derivation sites read line-by-line, confirmed by the
2-file test's own expected string). Medium on whether the team wants extra rows vs. copy — hence the
two options.

---

## TYPESCRIPT-3 [MINOR] features/demo/ui/DemoExperience.tsx:587

**Claim:** Cosmetic, but introduced by this round: `ca0df27` inserted the `lastRealStageRef` seed above
the per-file `setImp` and left that `setImp` de-indented two columns out of the `for` body. There is no
formatter in this repo (no `.prettierrc`, no `format` script, `next lint` doesn't check indentation),
so nothing will catch it automatically.

**Evidence:** leading-space counts in the loop body (`awk` over `:584-596`) — every statement is at 8
except `:587`:

```
584[6]  for (let i = 0; i < total; i++) {
585[8]    if (importGen.current !== myGen) return
586[8]    lastRealStageRef.current = 'extracting_text'
587[6]  setImp((s) => ({ ...s, stage: 'progress', batch: { current: i + 1, total }, … }))
588[8]    emitter.log('FILE', …)
```

**Suggested fix:** re-indent `:587` to 8 spaces. Fold into whichever commit next touches the bridge.

**Confidence:** High — mechanical.

---

## Architecture re-sweeps over the round-2 delta (all clean)

| Rule | Sweep | Result |
|---|---|---|
| Store bridge | `grep -rn "useStore" features/demo/ui` | zero hits outside `DemoExperience.tsx` ✓ |
| Engine purity | round-2 delta touches `engine/` only in `logic/__tests__/import-log.test.ts` (a comment) | ✓ |
| Single barrel / marketing↔demo wall | no `features/demo/index.ts` change; no new `features/demo` import in `app/`, `components/`, `lib/` | ✓ |
| Determinism seam | `git diff 3d03bbb..HEAD -U0 \| grep '^+' \| grep -E "Date\.now\|Math\.random"` | zero hits ✓ |
| `any` / `as any` / `@ts-ignore` | same sweep | zero (the only `@ts-` hit is the R-44 test *comment*) ✓ |
| `console.log` / `key={index}` | same sweep | zero ✓ |
| `isolatedModules` | `ImportRealStageId`, `ImportErrorCode`, `ImportErrorDetails` all imported/exported with inline `type` (`DemoExperience.tsx:11-18`, `ImportModal.tsx:12-18`, `ImportTerminalProgress.tsx:11`) | ✓ |
| Exhaustive unions | `ctaView` (`:407-410`), `fallbackNotice` (`:421-424`), `emitFallback` (`run-import.ts:152-155`) still close on `const exhaustive: never` | ✓ |
| Union widening (`UNEXPECTED_ERROR`) | every consumer of `ImportErrorCode` re-checked: only `ERROR_MESSAGES: Partial<Record<…>>` (`ImportModal.tsx:61`) and the `(result.code && ERROR_MESSAGES[result.code]) \|\| result.error` read (`:243`) — no switch, no exhaustive map, so the deliberate non-mapping renders the backstop's own string ✓ |
| `ImportRealStageId` narrowing (R-40) | all four producers satisfy it: `run-import.ts:219, 235, 265` (literals) and `DemoExperience.tsx:558` (`ImportRealStageId \| null` ref) — `pnpm typecheck` clean ✓ |
| `RunFailure` required `code`/`details` (R-41) | all three push sites supply both: `:554` (synthetic), `:592`, `:624` (post-R-29 failure arm) ✓ |
| R-44 enforcement | `pnpm typecheck` exists, runs clean, and its program **contains** `import-log.test.ts` (verified with `--listFilesOnly`) — the pins are genuinely enforced by a scripted command now ✓ |

## Checked and deliberately NOT filed

- **`importStageFor`'s token check moved out of the functional updater** (`:402-406`). I traced this for
  a stale-write regression and it is safe *and* strictly better: the updater is now pure (the old one
  read `importGen.current` inside, which React may invoke twice under StrictMode), and the only
  invalidator reachable during a run — `onCancel` (`:944-951`) — enqueues `setImp(blankImport)` *after*
  any already-enqueued stage write, so React applies the clear last. The stale branch no longer calls
  `setImp` at all, which is a superset of the old same-object bail-out.
- **`finishImport` pinning `stage: 'progress'` (R-39)** (`:521`). Checked every caller for a path where
  forcing `'progress'` would be wrong: both closures reach it only after their token checks, the
  backstop token-checks first, and the two pre-pipeline guards (`:569`, `:604/:610`) write
  `stage: 'result'` and never call it. The `files.length === 0` path that would newly render a bogus
  "0 imports failed" dwell is unreachable — `PickerStage.tsx:217` returns on an empty selection.
  deferred.md §36's amended writer inventory is accurate as written.
- **`runHadSampleFallback` as a second full pass over `lines`** — O(n) at a 400-line cap, memoized on
  the same dep; perf is `web-reviewer`'s lane and there is no measured problem.
- **The uncancelled `window.setTimeout` in `PdfPreview.printDocument`** (`:76`) — an unmount before it
  fires leaves a `setPrintNotice` on an unmounted component, which React 19 silently no-ops (no
  warning, no leak: the listener is removed inside the same callback and `win` is captured). Not worth
  a cleanup ref.
- **The tally/store synchronisation window inside `recordSuccess`** — a throw between
  `applySuccess`'s `store.getState().addLocation` (`:448`) and `tally.locations.push` (`:483`) would
  still under-report a landed location. Residual of R-38 rather than a new defect, and the only awaited
  call in that window (`forwardGeocode`) provably cannot reject (`geocode.ts:39-45`). Noted, not filed.
- **Deliberate choices honored (not re-flagged):** the segment-scoped `deriveTrust` vs run-scoped
  `runHadSampleFallback` disagreeing on mixed batches (the design); `UNEXPECTED_ERROR` being
  bridge-synthesized and deliberately unmapped in `ERROR_MESSAGES`; the `win.focus()` at
  `PdfPreview.tsx:57` staying; deferred §§29–36; D5 adaptations; dwell semantics; trust-line wording;
  the known 5s-timeout load-flake class (not observed — 1078 tests green in one full run plus 162 in
  the targeted run).
