# Lane: typescript — parity P1 (PR #30) — FIX-DELTA

- **Lane:** typescript (`.claude/agents/typescript-reviewer.md`)
- **Mode:** FIX-DELTA (re-review of the six-branch fix round merged into `feat/parity-p1` after review commit `4a1f807`)
- **Fix-round diff:** `git diff 4a1f807..feat/parity-p1` — 27 files, +1067/−252 · 32 non-merge commits
- **Refs read:** `docs/code-reviews/parity/p1/p1-review.md` (aggregated), the prior `lane-typescript.md` (TS-1…TS-8), `features/demo/CLAUDE.md` (binding), root `CLAUDE.md`, `.claude/agents/typescript-reviewer.md`
- **Prior lane findings in scope:** TS-1→R-7 · TS-2→R-8 · TS-3→R-10 · TS-4→R-9 · TS-5→R-11 · TS-6→R-2 (merged, settled MAJOR) · TS-7→R-12 · TS-8→R-13
- **Gates re-run in this worktree:**
  - `pnpm exec tsc --noEmit` → **clean** (exit 0, no diagnostics)
  - `pnpm exec vitest run features/demo/ui/chrome/__tests__/PdfPreview.test.tsx features/demo/ui/screens/import features/demo/engine/logic/__tests__ features/demo/ui/import/__tests__` → **26 files / 314 tests passed**
  - `pnpm exec vitest run features/demo/ui/__tests__ features/demo/ui/screens/__tests__ features/demo/engine/store/__tests__ features/demo/engine/__tests__` → **44 files / 375 tests passed**
- **Verdict:** all 8 prior lane findings **FIXED**. 0 BLOCKER, 0 MAJOR, 3 MINOR new (fix-introduced).

---

## Fix-delta — prior findings

| Prior | Final ID | Sev | Status | Fix commit |
|---|---|---|---|---|
| TS-1 | R-7 | MINOR | **FIXED** | `bd68a0d` |
| TS-2 | R-8 | MINOR | **FIXED** | `a0d3ad6` |
| TS-3 | R-10 | MINOR | **FIXED** | `e6d5f20` |
| TS-4 | R-9 | MINOR | **FIXED** | `77949ca` |
| TS-5 | R-11 | MINOR | **FIXED** | `acd8af9` |
| TS-6 | R-2 | MAJOR | **FIXED** | `a7497ed` |
| TS-7 | R-12 | MINOR | **FIXED** | `0bf7c9e` |
| TS-8 | R-13 | MINOR | **FIXED** | `8d52011` |

### TS-1 / R-7 — dead `TERM_ROW` import — **FIXED**

`features/demo/ui/screens/import/ImportTerminalProgress.tsx:17` is now
`import { TerminalLine } from '@/features/demo/ui/screens/import/TerminalLine'` — `TERM_ROW` is gone from the import list. A scripted unused-identifier sweep over all seven changed source files (`ImportTerminalProgress.tsx`, `TerminalLine.tsx`, `ImportModal.tsx`, `PdfPreview.tsx`, `PickerStage.tsx`, `DemoExperience.tsx`, `run-import.ts`) reports **zero** unused imports, so the fix did not trade one dead binding for another.

### TS-2 / R-8 — `ERROR_MESSAGES` untied from `ImportErrorCode` — **FIXED**

`ImportModal.tsx:61` is now `export const ERROR_MESSAGES: Partial<Record<ImportErrorCode, string>>` — exactly the suggested shape. A typo'd/renamed code is now a compile error, and the read at `:243` (`(result.code && ERROR_MESSAGES[result.code]) || result.error`) honestly types `string | undefined`, so the load-bearing `|| result.error` fallback for the deliberately-unmapped `PDF_SCANNED` / `NO_FIELDS_FOUND` codes is visible to the compiler. Doc comment updated in place (`:57-59`).

### TS-3 / R-10 — consumer-less engine-barrel re-exports — **FIXED**

`features/demo/engine/index.ts:46-49` replaces the eleven re-exports with an explicit NOTE that the module is internal-path-only and that the barrel must not advertise the mutable `importLogBus` singleton. `barrel.test.ts:14` now pins the absence (`importLogBus`, `createImportLogBus` added to the "should no longer be exported" list). Verified no consumer regressed: every importer still uses `@/features/demo/engine/logic/import-log` and `tsc` is clean. Consistency check: the newly-relocated `engine/logic/import-flow-mode.ts` is likewise *not* re-exported from the barrel — same convention.

### TS-4 / R-9 — dangling `currentCaseId` on rehydration — **FIXED**

`features/demo/engine/store/persistence.ts:422-425` now applies the pair law to the location itself:

```ts
const openLocation =
  d.currentLocationId !== null
    ? d.locations.find((l) => l.id === d.currentLocationId && caseIds.has(l.caseId))
    : undefined
```

Byte-for-byte the suggested one-condition fix. `currentCaseId` is therefore again always `null` or a member of `caseIds`, and an orphaned open location falls through to the existing wizard→`'cases'` fallback at `:432-436`. The comment block at `:412-421` states the widened invariant. Store/persistence suites green (375 tests).

### TS-5 / R-11 — freeze-the-bar keyed off the last *rendered* stage — **FIXED**

The component-side `lastViewRef` + effect is gone. `ImportTerminalProgress.tsx:430-431` now reads:

```ts
const effectiveStage = stage === 'error' ? lastRealStage : stage
const running = effectiveStage ? STAGE_VIEW[effectiveStage] : PREPARING
```

and the truth is tracked in the bridge's **functional updater**, which sees states that never commit — `DemoExperience.tsx:399-403`:

```ts
const importStageFor = (myGen: number) => (st: RunStageId) =>
  setImp((s) => {
    if (importGen.current !== myGen) return s
    return { ...s, activeStage: st, lastRealStage: st === 'error' ? s.lastRealStage : st }
  })
```

This is the exact fix the finding proposed, and it lands R-24's token guard in the same updater. Type hygiene is real, not nominal: `ImportRealStageId = Exclude<ImportStageId, 'error'>` (`run-import.ts:33`) is the same union `STAGE_VIEW` is keyed by (`Exclude<RunStageId,'error'>`), so a future stage addition breaks the build rather than the bar. Traced the batch loop: `lastRealStage` is re-seeded to `'extracting_text'` at each file head (`DemoExperience.tsx:560`) and to `'reading_model'` on the paste path (`:591`), and cleared on Retry (`:910`) — no cross-file leakage. Normalize-failure now freezes at 55%, pinned by `ImportTerminalProgress.test.tsx` (`terminal-progress-fill` = `'55%'`).

### TS-6 / R-2 — keyboard users could never unpin the log — **FIXED**

`ImportTerminalProgress.tsx:556-564` makes the log a first-class keyboard target and arms the pin from keyboard + pointer:

```tsx
tabIndex={0}
role="log"
aria-live="off"
aria-label="Import log"
onScroll={handleScroll}
onWheel={markUserScroll}
onTouchMove={markUserScroll}
onPointerDown={markUserScroll}
onKeyDown={handleKeyDown}
```

`SCROLL_KEYS` (`:401`) is the aggregator's list verbatim plus `' '`, and `aria-live="off"` is applied per the aggregator's own correction to WEB-1 (so `terminal-status` stays the sole polite region). The optional `onPointerDown` arming from TS-6 was taken too.

I re-traced the "programmatic tail scroll never flips the pin" invariant against the two new arming paths and it holds: `handleScroll` still hard-gates on `userScrollRef` and consumes it (`:489-496`), and the only ways the new arming can be spuriously set (Space on a disclosure button, pointerdown on a row) are followed either by no `scroll` event at all, or by a scroll that lands near the bottom and re-pins — never by a spurious *unpin*. No regression.

### TS-7 / R-12 — blocked-print probe outside the `try` (+ SF's false-success half) — **FIXED**

`PdfPreview.tsx:29-65`: the `contentWindow` / `typeof win.print` probe is now the first statement **inside** the `try` (`:34-38`), and success is a positive `beforeprint` signal rather than absence-of-throw (`:44-61`). Both halves of the merged finding are addressed, and both are pinned by new tests (cross-origin getter throw → notice; `print()` that returns without firing `beforeprint` → notice; a silently-ignored retry does not clear a prior notice). See **TYPESCRIPT-2** and **TYPESCRIPT-3** below for two residuals the new code introduces.

### TS-8 / R-13 — `as string` assertion in `TerminalLine` — **FIXED**

`TerminalLine.tsx:135-137`:

```ts
// const local so the narrowing carries (no assertion needed — p1-review R-13).
const detail = line.detail
const hasDetail = detail !== undefined
```

The assertion is gone, `{detail}` is rendered from the narrowed local (`:173`), and the `DETAIL_AT_HIDE_THRESHOLD` / `isDump` machinery it existed for was removed wholesale by the R-15 fix. `tsc` clean.

---

## Architecture re-sweeps (post-fix — all clean)

| Rule | Sweep | Result |
|---|---|---|
| Store bridge | `grep -rn "useStore" features/demo/ui` | zero hits outside `DemoExperience.tsx` ✓ |
| Engine purity | `grep` for `from 'react'` / `'use client'` / `window.` / `document.` under `features/demo/engine` (non-test) | only two doc-comment mentions of `window.sessionStorage` in `persistence.ts`; the relocated `engine/logic/import-flow-mode.ts` is pure, React-free, no `'use client'` ✓ |
| Marketing ↔ demo wall | `grep -rn "features/demo" components lib "app/(default)"` | guard test + one comment only ✓ |
| Deep-barrel from `app/`/`lib/`/`components/` | grep | unchanged from master (`app/api/extract/route.ts`, test-only `app/demo/__tests__/error.test.tsx`) ✓ |
| Registry-derived ordering | no step literals added; `WIZARD_SCREENS` still consulted via `includes()` | ✓ |
| Determinism seam | grep of all `+` lines in `4a1f807..HEAD` for `Date.now` / `Math.random` | zero hits ✓ |
| `any` / `as any` / `@ts-` | grep of added lines | only two `@ts-expect-error` **compile pins** in `import-log.test.ts` (deliberate R-34 readonly proofs) ✓ |
| `console.log` / `key={index}` | grep of added lines | zero ✓ |
| `isolatedModules` | new type re-exports/imports all carry inline `type` | ✓ |
| Single-declaration unions | `ImportUiStage` now declared once (`engine/logic/import-flow-mode.ts:26`), consumed by `ImportModal.tsx:72` and `DemoExperience.tsx:97`; pipeline `ImportStageId` consistently aliased `RunStageId` at all four sites | ✓ (R-31) |
| Async generation tokens | `importStageFor`, `guardImportRun`, `processPdfFiles`, `runTextImportFlow`, `applySuccess` | every post-`await` write is token-checked; `onImportStage` was the last hole and is now closed ✓ |
| Exhaustive unions | `emitFallback`, `fallbackNotice`, `ctaView` | all still close with `const exhaustive: never` ✓ |

The file **rename** `ui/screens/import/import-flow-mode.ts` → `engine/logic/import-flow-mode.ts` (R-21/R-31) was judged as a rename: the body is unchanged apart from the doc block, no consumer was left dangling (`grep` for `import-flow-mode` returns only the new path), and the module stays outside the engine barrel by the same convention as `import-log`.

---

## TYPESCRIPT-1 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:435

**Claim:** R-1's segment-scoped `deriveTrust` and R-25's sample-attributed CTA landed in the same fix round and now contradict each other. The CTA is a **whole-run summary** (its counts say so) but it is fed the **current-file** trust value. In a mixed batch whose *last* file went to the cloud, the sample substitution is no longer marked anywhere on the dwell surface — the exact hole R-25 was opened to close, reopened for batches.

**Evidence:**

One `trust` value now serves two different scopes:

```ts
// ImportTerminalProgress.tsx:433-435
const trust = useMemo(() => deriveTrust(lines), [lines])          // segment-scoped (R-1)
const isBatchRun = batch !== null && batch.total > 1
const cta = outcome === null ? null : ctaView(outcome, isBatchRun, trust)   // run-scoped consumer
```

`deriveTrust` resets on every `FILE` marker (`:101-108`, R-1 — correct for the live title bar and processing badge). `ctaView` uses that same value for the run summary (`:344-347`):

```ts
const reviewSub =
  trust === 'sample'
    ? { sub: 'sample import — review →', subColor: C.warning }
    : { sub: 'Review import →', subColor: C.textSecondary }
```

**Failure scenario (3-PDF batch, transient proxy failure on file 1):**
`DemoExperience.tsx:561` emits `FILE ▸ file 1/3` → file 1's `/api/extract` returns 502 → `emitFallback` emits `NORM sample fallback: couldn't reach the live model…` (`run-import.ts:141`) → trust = `sample`. `DemoExperience.tsx:561` then emits `FILE ▸ file 2/3` → trust resets to `cloud`; files 2–3 succeed live and emit no fallback line. Final `lines` end on a `cloud` segment, so at the CTA moment:

- title bar (`:543`) reads `cloud model via server proxy`
- CTA sub (`:618`) reads `Review import →` in muted grey, **not** the amber `sample import — review →`
- the only remaining trace is file 1's `sample fallback:` log line, ~38 lines above the tail in a `minHeight: 260` panel that auto-tails while pinned (`:469`) — off-screen

Escape during the dwell then discards the result (`DemoExperience.tsx:917-918` → `blankImport`), so the `notice` and per-card `isSample` badge that `finishImport` did build (`:472`, `buildImportedLocationView(fallbackMode)`) never paint. Net: a sample-substituted location's substitution is unmarked on the whole dwell surface.

This is strictly *worse than pre-fix* for this case: before `a32b929`, the run-scoped latch meant the title bar still read `sample import · in-browser` at the CTA moment. Neither test covers it — the R-1 batch tests (`ImportTerminalProgress.test.tsx:194-228`) assert only the live badge/title, and the R-25 CTA test (`:490-501`) uses a run with no `FILE` markers at all.

**Suggested fix:** keep the segment-scoped value for the live surfaces and give the run summary its own run-scoped derivation:

```ts
const trust = useMemo(() => deriveTrust(lines), [lines])                   // title bar + processing badge
const runHadSample = useMemo(
  () => lines.some((l) => l.level === 'NORM' && l.text.startsWith(SAMPLE_FALLBACK_PREFIX)),
  [lines],
)
const cta = outcome === null ? null : ctaView(outcome, isBatchRun, runHadSample ? 'sample' : 'cloud')
```

(Single-file and paste runs are unchanged — one segment means the two values coincide, so every existing pin holds.) Add the missing batch case to the R-25 test: `FILE → sample fallback → FILE → AI Request`, outcome `success`, expect the amber sub.

**Confidence:** High — mechanism verified line-by-line against `deriveTrust`, `ctaView`, the batch emit sites in `DemoExperience.processPdfFiles`, and both suites' coverage gaps.

---

## TYPESCRIPT-2 [MINOR] features/demo/ui/chrome/PdfPreview.tsx:48-61

**Claim:** The new positive success signal is torn down in a **synchronous** `finally` and read on the very next statement, so it can only ever be observed if the browser dispatches `beforeprint` synchronously inside `print()`. Any browser or state where printing is deferred yields a definitive *"no PDF was saved"* notice for a print that does happen — a fake **failure**, the mirror of the fake success R-12 removed.

**Evidence:**

```ts
// PdfPreview.tsx:44-61
let dialogOpened = false
const markOpened = () => { dialogOpened = true }
win.addEventListener('beforeprint', markOpened)
try {
  win.focus()
  win.print()
} finally {
  win.removeEventListener('beforeprint', markOpened)   // ← listener gone before print can defer
  window.focus()
  saveBtnRef.current?.focus()
}
setPrintNotice(dialogOpened ? null : PRINT_BLOCKED_NOTICE)   // ← decided synchronously
```

The listener's lifetime is exactly the synchronous extent of `print()`. Two concrete deferral paths exist in shipping engines:

- **Blink** (`LocalDOMWindow::print`) early-returns with `should_print_when_finished_loading_ = true` when the frame is still loading, then prints on load completion. This component prints a `srcDoc` frame (`:114`) that begins loading at mount, so a click during that window returns without firing `beforeprint`; the notice claims a blocked print, and the dialog then opens anyway. (Narrow — human click latency usually clears the load — but it is a real ordering, not a hypothetical.)
- **WebKit** dispatches `beforeprint` from its print-begin path rather than inline in `DOMWindow::print()`, and carries the same `isLoading()` deferral. Ordering relative to `print()` returning is not guaranteed by the HTML spec text the fix relies on.

The new tests model dispatch as synchronous by construction (`stubDialogPrint` calls `win.dispatchEvent(new Event('beforeprint'))` *inside* the stubbed `print`, `PdfPreview.test.tsx:20-27`), so no test can catch this.

**Suggested fix:** keep the listener alive past the synchronous window and only downgrade after a macrotask — preserving the "silent ignore is not success" property while removing the sync-dispatch assumption:

```ts
win.addEventListener('beforeprint', markOpened)
try { win.focus(); win.print() } finally { window.focus(); saveBtnRef.current?.focus() }
if (dialogOpened) setPrintNotice(null)
else setTimeout(() => {
  win.removeEventListener('beforeprint', markOpened)
  setPrintNotice(dialogOpened ? null : PRINT_BLOCKED_NOTICE)
}, 0)
```

**Confidence:** High on the code shape and on the fact that the signal cannot survive a deferred dispatch (the listener is provably removed first). Medium on which shipping browser hits it — hence MINOR, not MAJOR.

---

## TYPESCRIPT-3 [MINOR] features/demo/ui/chrome/PdfPreview.tsx:58

**Claim:** The R-16 fix's `window.focus()` does nothing for the stated purpose (it does not move DOM focus out of the iframe) and is a jsdom `Not implemented` emitter — the very next line, `saveBtnRef.current?.focus()`, is what actually satisfies the finding.

**Evidence:**

```ts
} finally {
  win.removeEventListener('beforeprint', markOpened)
  // R-16: win.focus() moved keyboard focus INTO the sandboxed frame …
  window.focus()                    // :58 — top-level window activation, not DOM focus
  saveBtnRef.current?.focus()       // :59 — this is what returns focus to the parent chrome
}
```

Focusing a parent-document element implicitly blurs the frame, so `:59` alone restores the Escape listener's reachability. `window.focus()` on the top-level window requests browser-window activation; it changes nothing about `document.activeElement`. The R-16 tests assert only `document.activeElement === saveBtn` (`PdfPreview.test.tsx`, both R-16 cases), so they pass identically without `:58`.

Cost: jsdom does not implement `Window.focus`, so every print-path test now prints `Not implemented: Window's focus() method` to the virtual console — **20 lines** in the targeted `PdfPreview.test.tsx` + import-screens run, and it leaks into the demo-UI run too. (The pre-existing `win.focus()` at `:50` is load-bearing — it makes the right document print — so only `:58` is removable.)

**Suggested fix:** delete line 58; keep `win.focus()` at `:50` and `saveBtnRef.current?.focus()` at `:59`. If the browser-window activation is genuinely wanted, gate it so tests don't trip it, and say why in the comment.

**Confidence:** High — verified by reading both R-16 test assertions and by observing the console output across two independent vitest runs in this worktree.

---

## Checked and deliberately NOT filed

- **`guardImportRun` backstop** (`DemoExperience.tsx:519-536`) — traced every throw site inside both `run` closures. The catch is token-checked before its `setImp`, `emitter.log` self-invalidates on a superseded run, `details.stage` reads the *pre-update* `s.activeStage` correctly, and the failure result releases the dwell through the normal CTA path (`computeImportStage` sees `stage: 'progress'` + non-null result + `acknowledged: false`). The only pre-`stage:'progress'` throw sites are `emitter.log` calls, which cannot throw. Sound.
- **`importStageFor` token guard (R-24)** — the stale branch returns the *same* state object, so React bails out of the re-render rather than committing a no-op. Correct shape.
- **One-frame trust lag mid-batch** — `setImp` (batch counter) commits in a microtask while the `FILE` log line commits on the next rAF (`useImportLog.scheduleFrame`), so the badge can read `File 2 of 3 · sample import · in-browser` for ≤1 frame. Sub-frame transient, and strictly better than the pre-fix permanent mislabel. Not a defect.
- **Ring-cap eviction vs. segment scoping** — eviction is FIFO, so a segment's `FILE` marker can never be evicted while a later line of that same segment survives. `deriveTrust` cannot be desynchronised by the 400-line cap.
- **`motion/react` `useReducedMotion` adoption (R-18)** — read the installed implementation (`framer-motion@12.42.0/.../use-reduced-motion.mjs` + `motion-dom/.../reduced-motion/index.mjs`): `initPrefersReducedMotion()` runs *before* `useState(prefersReducedMotion.current)`, so it genuinely seeds on the first render (no armed-animation flash). The module-global `hasReducedMotionListener` cache is exactly the property PickerStage documented as its reason to refuse the hook — the asymmetry is coherent, not accidental. Deliberate per the orchestrator; not re-flagged.
- **`ActionCard`'s `ref` prop** (`PickerStage.tsx:131, 142`) — React 19 ref-as-prop on a function component; typed `Ref<HTMLButtonElement>`, `tsc` clean, and both R-17 focus restores are behaviourally pinned (`PickerStage.test.tsx:226, 236`).
- **`prefersReducedMotion()` render-scope `matchMedia` read** (`PickerStage.tsx:98-99`) — a browser-global read at render scope, but not a determinism-seam violation (the rule names `Date.now`/`Math.random`), guarded by `typeof window !== 'undefined'`, and the demo is `ssr: false`. Deliberate and documented.
- **`SAMPLE_FALLBACK_PREFIX` living in `run-import.ts` rather than `import-log.ts`** — orchestrator-declared deliberate (disjointness across fix branches). No import cycle introduced; `pdfjs-dist` stays behind a dynamic `import()` in `pdf-extract.ts`, so the terminal's new value import adds no module-graph weight.
- **`ImportRunResult` required `code`/`details` (R-29)** — verified all three failure constructions set both, and that the modal-level `ImportResult` keeps its optionality for `DemoExperience`'s code-less pre-pipeline guards (`processPdfFiles:546`, `runTextImportFlow:583/589`, `guardImportRun:529`). `tsc` proves no producer was missed.
- **`ImportPartialData.businessName` removal (R-30)** — the `Business:` render branch is gone from `DataFoundCard` (`ImportModal.tsx:172-180`); no other consumer referenced it.
- **`ImportLogLine` readonly (R-34)** — `getLines(): readonly ImportLogLine[]` plus readonly fields; checked every consumer (`deriveTrust`, `useImportLog` flush, `TerminalLine`) — all read-only already, and the two `@ts-expect-error` pins in `import-log.test.ts` are compile proofs, not suppressions.
- **`selectAdjustedScopes` R-26 comment narrowing** — the comment now names two of three boundaries and points at deferred §15 for the third. Accurate against the code.
- **Known flake class** (5s userEvent/waitFor timeouts under multi-agent contention) — not observed in either of my runs (689 tests green across two invocations); not filed, per the orchestrator.
