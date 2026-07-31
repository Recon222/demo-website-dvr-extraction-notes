# Lane: typescript — parity P1 (PR #30)

- **Lane:** typescript (`.claude/agents/typescript-reviewer.md`)
- **Mode:** INITIAL (full review of the diff)
- **Diff:** `git diff master...feat/parity-p1` — 58 files, +4427/−329
- **Contracts read:** root `CLAUDE.md`, `features/demo/CLAUDE.md` (binding), `.claude/agents/typescript-reviewer.md`, `docs/code-reviews/deferred.md` §18/§29–§35
- **Gates run in the worktree:**
  - `pnpm exec tsc --noEmit` → **clean** (exit 0, no diagnostics)
  - `pnpm test` → **131 files / 1048 tests passed**
- **Verdict:** no BLOCKER, no MAJOR. 8 MINOR findings below.

## Architecture sweeps (all clean)

| Rule | Sweep | Result |
|---|---|---|
| Store bridge | `grep -rn "useStore" features/demo/ui` | only `DemoExperience.tsx`. `useImportLog` subscribes to the **bus**, not the store — bus is engine-owned pipeline state, same shape as the existing `onStage` callback. ✓ |
| Engine purity | `features/demo/engine/logic/import-log.ts` read in full | no React import, no `'use client'`, no module-scope `window`/`document`. ✓ |
| Marketing ↔ demo wall | `grep -rn "features/demo" components app/(default) lib` | only the guard test + a comment reference. ✓ |
| Deep-barrel imports from `app/`/`lib/`/`components/` | grep | `app/api/extract/route.ts` (pre-existing on master) and `app/demo/__tests__/error.test.tsx` (test-only, justified inline). No new runtime breach. ✓ |
| Registry-derived ordering | `WIZARD_SCREENS` used via `includes()` in the R-35 guard and `loadSnapshot`; no hand-typed step numbers added | ✓ |
| Determinism seam | grep of added lines for `Date.now`/`Math.random` | zero hits outside comments. The bus takes an injected `now: () => number`; `DemoExperience.logClock` reads through the existing `clock` seam at event scope. ✓ |
| `any` / `as any` / `@ts-` | grep of added lines | zero hits. ✓ |
| `console.log` | grep of added lines | zero. New `console.warn`s (`applyImport` breadcrumb, `error.tsx` R-31) match the established operator-breadcrumb convention. ✓ |
| `isolatedModules` | new barrel re-exports use inline `type` modifiers | ✓ |
| Async generation tokens | `processPdfFiles` / `runTextImportFlow` / `applySuccess` | every `await` is followed by an `importGen` check before any store or `setImp` write; the log emitter carries its own `runToken`. ✓ |
| Exhaustive unions | `emitFallback`, `fallbackNotice`, `ctaView` | all three close with `const exhaustive: never = …`. ✓ |
| Silent-`catch` | R-33 removal in `selectAdjustedScopes` | compensated: `adjustedScopesPartial` (selectors.ts:234) still surfaces the condition into the PDF (case-notes.ts:135-139), and the two event-scope warns exist. ✓ |

Deliberate choices listed by the orchestrator (D5 honesty adaptations, the html2pdf non-ship, the P1.5 non-ports, `T+seconds.xx`, no web virtualization, the trust-line wording, the R-34 duplication, the dwell test migrations, the merge-integration fixes, and all P0-era decisions) were treated as settled and are not re-flagged.

---

## TYPESCRIPT-1 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:13

**Claim:** `TERM_ROW` is imported but never used in this file — dead import.

**Evidence:**
```ts
// ImportTerminalProgress.tsx:13
import { TerminalLine, TERM_ROW } from '@/features/demo/ui/screens/import/TerminalLine'
```
`grep -rn "TERM_ROW" features app lib components` returns hits only inside `TerminalLine.tsx` itself, `TerminalLine.test.tsx`, and this import line. The file's own palette lives in the local `TERM_CHROME`/`C` objects (lines 140-160). Nothing here reads `TERM_ROW`.

`tsconfig.json` does not set `noUnusedLocals`, and there is no ESLint config file in the repo, so neither gate catches it — it survives to the bundle as a live binding on the `TerminalLine` module (harmless, but it falsely implies a coupling that does not exist).

**Suggested fix:** `import { TerminalLine } from '@/features/demo/ui/screens/import/TerminalLine'`.

**Confidence:** High — verified by grep over the whole repo.

---

## TYPESCRIPT-2 [MINOR] features/demo/ui/screens/ImportModal.tsx:55

**Claim:** `ERROR_MESSAGES` is typed `Record<string, string>`, which unties the friendly-copy map from the `ImportErrorCode` union it is supposed to key. A renamed or misspelled code compiles clean and silently stops mapping, and reads are typed `string` when they are `undefined` at runtime.

**Evidence:**
```ts
// ImportModal.tsx:55-58
export const ERROR_MESSAGES: Record<string, string> = {
  PDF_READ_FAILED: 'This PDF could not be read. It may be corrupted or password-protected.',
  MODEL_OUTPUT_UNPARSEABLE: "The model's reply couldn't be read as form data. Please try the import again.",
}
// :225
{(result.code && ERROR_MESSAGES[result.code]) || result.error}
```
Failure scenario: rename `PDF_READ_FAILED` → `PDF_UNREADABLE` in `run-import.ts:66-71` (the `ImportErrorCode` union) and update `runPdfImport`'s `code:` literals. `tsc --noEmit` passes — the map key is just an unconstrained string — and the failure card silently degrades from *"This PDF could not be read. It may be corrupted or password-protected."* to the raw pipeline string *"Could not read this PDF."*. The existing test only asserts the current key (`modals.test.tsx:206`), so it would also stay green if the union member were renamed without touching the map.

Secondary: with `Record<string, string>`, `ERROR_MESSAGES[result.code]` is typed `string` but is `undefined` for `PDF_SCANNED`/`NO_FIELDS_FOUND` — `modals.test.tsx:214-215` asserts `toBeUndefined()` against a value the type system claims is a `string`. The `|| result.error` fallback is load-bearing but the type says it can never fire.

This is the same class of guard-drift the branch already fixed twice (R-34's satisfiable-by-comment token check, R-39's `FullShapeIn`-alone gap).

**Suggested fix:**
```ts
export const ERROR_MESSAGES: Partial<Record<ImportErrorCode, string>> = { … }
```
Keeps the map deliberately partial (the §5.7.8 precedent for unmapped codes), makes a typo'd/stale key a compile error, and types the read as `string | undefined` so the `|| result.error` fallback is honest.

**Confidence:** High for the type hole; the concrete breakage is latent (requires a future rename), hence MINOR.

---

## TYPESCRIPT-3 [MINOR] features/demo/engine/index.ts:46-57

**Claim:** The eleven new import-log re-exports on the engine's internal barrel have **no consumer** — every real importer reaches the module by its aliased internal path.

**Evidence:**
```ts
// engine/index.ts:46-57
export {
  createImportLogBus, importLogBus, clipDetail, IMPORT_LOG_MAX_LINES,
  type ImportLogBus, type ImportLogEmitter, type ImportLogEvent,
  type ImportLogLevel, type ImportLogLine, type ImportLogListener,
} from '@/features/demo/engine/logic/import-log'
```
`grep -rn "from '@/features/demo/engine'"` over `features app lib components` returns exactly two hits: the barrel's own header comment and `engine/__tests__/barrel.test.ts`. Every actual consumer imports `@/features/demo/engine/logic/import-log` directly — `run-import.ts:26`, `useImportLog.ts:29`, `DemoExperience.tsx:62`, `ImportModal.tsx:18`, `ImportTerminalProgress.tsx:9`, `TerminalLine.tsx:5`. `barrel.test.ts` does not assert any of the new names, so the block is not even pinned by a test.

The reviewer contract lists "a new export on `engine/index.ts` with no consumer" as a finding; the practical cost is that the barrel now advertises a surface (including the mutable module singleton `importLogBus`) that nothing consumes through it.

**Suggested fix:** either drop the block, or pick one and route the UI imports through the barrel so the surface is real. If it is intentionally forward-looking, say so in a comment next to it so a future dead-export sweep does not delete it.

**Confidence:** High.

---

## TYPESCRIPT-4 [MINOR] features/demo/engine/store/persistence.ts:419-426

**Claim:** The R-32 pair-coherence rewrite derives `currentCaseId` from the open location **without** validating that the location's `caseId` resolves to a case in the snapshot — the one id in the rehydrated selection that is no longer checked against the entity set.

**Evidence:**
```ts
// persistence.ts:418-426
const caseIds = new Set(d.cases.map((c) => c.id))
const openLocation =
  d.currentLocationId !== null ? d.locations.find((l) => l.id === d.currentLocationId) : undefined
const currentLocationId = openLocation ? openLocation.id : null
const currentCaseId = openLocation
  ? openLocation.caseId            // ← never checked against caseIds
  : d.currentCaseId !== null && caseIds.has(d.currentCaseId)
    ? d.currentCaseId
    : null
```
Before this change (master), `currentCaseId` was always `null` or a member of `caseIds`. Now a snapshot whose open location carries a `caseId` that is absent from `d.cases` rehydrates a dangling `currentCaseId`. The schema does no cross-entity referential check (`demoLocationSchema.caseId` is a bare `z.string()`, persistence.ts:258).

Failure scenario: hand-edited/partially-truncated `sessionStorage` snapshot (same threat model the file already defends against — see the R-7 `hasOwnProperty` note at :305-309) with `currentLocationId: 'l1'`, `locations: [{ id: 'l1', caseId: 'c9', … }]`, `cases: []`. On boot, `currentLocation` is non-null so the R-35 no-location notice does **not** fire (`DemoExperience.tsx:622`) — the visitor gets a live wizard — while `currentCase` resolves to `null` (`DemoExperience.tsx:289`). Consequence: `SubmissionScreen` renders `occNumber=''` (:656), the generated court document header gets `occNumber: '—'` (:776), and "Complete & Save" calls `completeCase(loc.caseId)` against a case that does not exist — the location's `completed` flag flips but no case card turns green (a silent half-write). The old code could not produce that state.

**Suggested fix:** apply the same law to the location itself — drop the open location when its owning case is missing, so the pair is either fully coherent or fully empty (and the existing wizard→`cases` fallback at :430-433 then fires):
```ts
const openLocation =
  d.currentLocationId !== null
    ? d.locations.find((l) => l.id === d.currentLocationId && caseIds.has(l.caseId))
    : undefined
```

**Confidence:** High on the code path; the trigger requires a snapshot the engine cannot itself produce today (there is no case-delete action), hence MINOR.

---

## TYPESCRIPT-5 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:371-376

**Claim:** The "freeze the last real stage" behaviour keys off the last **rendered** stage, not the last **reached** stage. Because the pipeline fires `onStage('normalizing')` and the following `onStage('done'|'error')` inside the same microtask, React auto-batching collapses them into one render — so the 55% normalize band never appears in production, and a normalize-stage failure freezes the progress bar at 15% while the log says it failed at normalizing.

**Evidence:**
```ts
// ImportTerminalProgress.tsx:371-376
const lastViewRef = useRef<{ message: string; percent: number } | null>(null)
const stageView = stage && stage !== 'error' ? STAGE_VIEW[stage] : null
useEffect(() => {
  if (stageView) lastViewRef.current = stageView   // ← only stages that actually RENDER are recorded
}, [stageView])
const running = stageView ?? lastViewRef.current ?? PREPARING
```
The pipeline side (`run-import.ts:162-203`) runs, after the `await requestExtraction(...)` resolves:
```
onStage('normalizing')          // :162
… parseNormalizeMap (synchronous) …
onStage('error')                // :195  (catch branch)   — or onStage('done') at :190
```
Both `setImp` calls land in the same promise continuation, so React batches them into a single commit whose `activeStage` is already `'error'`/`'done'`. The intermediate `'normalizing'` view is never committed, the `useEffect` never runs for it, and `lastViewRef.current` still holds `reading_model` (15%).

The branch's own integration test demonstrates the collapse — `terminal-integration.test.tsx:19-29` captures `lastStage` and it is already `'done'` when `runImport` returns. The unit test that pins the freeze (`ImportTerminalProgress.test.tsx`, `"stage 'error' freezes the last real stage's headline and percent"`) passes only because it *manually* rerenders with `stage: 'normalizing'` first — a sequence production never produces.

Failure scenario: a live model reply that is not JSON → `MODEL_OUTPUT_UNPARSEABLE`. The terminal log shows `✗ failed at normalizing` (ERR), but the frozen progress track reads 15% (`Extracting fields from document...`), i.e. it reports a stop point the pipeline had already passed. Secondary: with no `NEXT_PUBLIC_MAPBOX_TOKEN`, `forwardGeocode` resolves without yielding to a macrotask, so a *successful* run's bar goes 0 → 15 → 100 and the 55%/80% bands are never seen either.

**Suggested fix:** carry the last non-error stage in the state that already survives batching, rather than inferring it from render history — e.g. in `DemoExperience.onImportStage` (`DemoExperience.tsx:382`):
```ts
const onImportStage = (st: RunStageId) =>
  setImp((s) => ({ ...s, activeStage: st, lastRealStage: st === 'error' ? s.lastRealStage : st }))
```
(the functional updater sees the queued `'normalizing'` even when the commits are batched) and have the terminal freeze on `lastRealStage`. Alternatively assign `lastViewRef.current = stageView` during render instead of in an effect — cheaper, but it still cannot recover a stage that was never rendered.

**Confidence:** High on the mechanism (React 18/19 auto-batching of promise-continuation updates, confirmed by the branch's own `lastStage` capture). Presentational impact only → MINOR.

---

## TYPESCRIPT-6 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:417-427, 484-486

**Claim:** The "only user scrolls may unpin" gate is armed exclusively by `onWheel`/`onTouchMove`, so a scrollbar drag or a keyboard-driven scroll cannot unpin the tail — the next appended line yanks the reader back to the bottom.

**Evidence:**
```tsx
// :484-486
onScroll={handleScroll}
onWheel={markUserScroll}
onTouchMove={markUserScroll}
// :420-427
const handleScroll = useCallback(() => {
  if (!userScrollRef.current) return // programmatic tail scroll — never flips the pin
  …
}, [])
```
`markUserScroll` is the only writer of `userScrollRef.current = true` (:417-419). A mouse user dragging the log panel's scrollbar thumb fires `scroll` but no `wheel`/`touchmove`, so `handleScroll` returns before ever calling `setPinned(false)`; `pinnedRef.current` stays `true` and the tail effect (:414) resets `scrollTop` to the bottom on the next committed line. Same for focus-driven scrolling when a detail-row disclosure button (`TerminalLine.tsx:152`) is reached by Tab and the browser scrolls it into view.

The phone original gated on RN drag gestures, which cover *all* user scrolling on a touch surface; the web translation leaves two input paths uncovered. The jump-to-latest pill (:509) also never appears in these cases, because it renders on `!pinned`.

**Suggested fix:** also arm the flag from pointer/keyboard input on the log container, e.g. `onPointerDown={markUserScroll}` (fires for scrollbar-thumb presses) and `onKeyDown={markUserScroll}`, keeping `onWheel`/`onTouchMove`. (Flagged here because it is event-wiring logic; if the orchestrator prefers, it belongs equally to the web lane.)

**Confidence:** High on the code path; UX-only impact → MINOR.

---

## TYPESCRIPT-7 [MINOR] features/demo/ui/chrome/PdfPreview.tsx:29-33

**Claim:** The guard that is supposed to produce the honest "print was blocked" notice sits **outside** the `try` that is meant to catch the exact exception the file documents — a cross-origin `SecurityError` on `contentWindow.print` would escape as an uncaught error in the click handler instead of rendering `PRINT_BLOCKED_NOTICE`.

**Evidence:**
```ts
// PdfPreview.tsx:28-41
const printDocument = () => {
  const win = frameRef.current?.contentWindow
  if (!win || typeof win.print !== 'function') {   // ← property access is OUTSIDE the try
    setPrintNotice(PRINT_BLOCKED_NOTICE)
    return
  }
  try {
    win.focus()
    win.print()
    …
  } catch { setPrintNotice(PRINT_BLOCKED_NOTICE) }
}
```
The component's own sandbox comment (:79-89) states the failure mode precisely: *"a fully-sandboxed `srcDoc` frame is an opaque origin, so the parent touching `contentWindow.print` throws a cross-origin SecurityError"*. Reading `win.print` on an opaque-origin window is that access. So the one scenario the notice exists for is the one scenario the notice cannot cover — the visitor gets an unhandled throw (caught only by `DemoErrorBoundary` if it propagates) rather than *"Your browser blocked the print dialog for this preview — no PDF was saved."*

Not reachable today: the sandbox value is `allow-modals allow-same-origin` and is pinned by `PdfPreview.test.tsx`. This is a robustness gap in the honesty path, not a live defect.

**Suggested fix:** move the whole probe inside the `try`:
```ts
try {
  const win = frameRef.current?.contentWindow
  if (!win || typeof win.print !== 'function') throw new Error('print unavailable')
  win.focus(); win.print(); setPrintNotice(null)
} catch { setPrintNotice(PRINT_BLOCKED_NOTICE) }
```

**Confidence:** High on the code shape; latent → MINOR.

---

## TYPESCRIPT-8 [MINOR] features/demo/ui/screens/import/TerminalLine.tsx:132

**Claim:** A `as string` assertion is used where a local narrowing constant would give the compiler the same information without an assertion.

**Evidence:**
```ts
// TerminalLine.tsx:131-132
const hasDetail = line.detail !== undefined
const isDump = hasDetail && (line.detail as string).length > DETAIL_AT_HIDE_THRESHOLD
```
`hasDetail` is an aliased condition over a **mutable** property of a non-`const`-narrowable reference, so TS 5.7's aliased-condition analysis does not narrow `line.detail` — hence the assertion. It is safe today, but it is an unchecked assertion in a strict codebase whose house rule is "fix the type instead", and it would survive silently if `ImportLogLine.detail` were ever widened (e.g. to `string | string[]`).

**Suggested fix:**
```ts
const detail = line.detail
const hasDetail = detail !== undefined
const isDump = hasDetail && detail.length > DETAIL_AT_HIDE_THRESHOLD
```
(`detail` is a `const` local, so the truthiness check narrows it and the assertion disappears; the JSX below can render `{detail}` too.)

**Confidence:** High.

---

## Things checked and deliberately NOT filed

- **`useImportLog` rAF coalescer** (`ui/import/useImportLog.ts`) — traced reset/append/eviction interleavings; batch object is swapped before `setView`, updater is pure, element identity is preserved across commits so `TerminalLine`'s `memo` holds. No stale-commit path found.
- **Import log bus run isolation** (`engine/logic/import-log.ts`) — `runToken`/`epoch` are bumped together in `clearRun`, emitters capture their token, `subscribe` iterates a copy. Late lines from a cancelled run are provably dropped (pinned by `DemoExperience.import-log.test.tsx`).
- **Generation-token discipline** in `processPdfFiles`/`runTextImportFlow`/`applySuccess` — every `await` is followed by an `importGen` re-check before any store or `setImp` write, including the geocode round-trip. Matches the documented H1/H2 pattern.
- **Async handlers without a top-level `.catch()`** (`onRun` → `runPasteImport`) — already tracked as deferred §18, and `PickerStage` now wraps its two entry points in `try/catch` anyway. Not re-filed.
- **`deriveTrust` over a 400-line ring** — considered whether cap eviction could drop the `sample fallback:` line and flip the trust line back to `cloud`. `emitFallback` fires per file, and a single run emits ~15 lines, so the retained window always contains a recent fallback line when one applies. Not reachable.
- **`create-store.applyImport` R-27 breadcrumb** (`create-store.ts:446-462`) — dev-gated, counts and surfaces, mirrors the `generateExtractedScopes` pattern; the `loc.form.scopes` access narrows via the `off = loc?.…` aliased condition (tsc clean).
- **`selectAdjustedScopes` now-empty `catch`** (`selectors.ts:78-84`) — verified the condition is still surfaced through `adjustedScopesPartial` (`selectors.ts:234` → `pdf/case-notes.ts:135-139`) plus the two event-scope warns. Correctly compensated.
- **`persistedStateSchema` device-1 annotation** (`persistence.ts:314`) — the `z.ZodType<PersistedState, z.ZodTypeDef, unknown>` annotation still permits `.safeParse`, no `ZodObject`-only method is used downstream, and the `satisfies FullShapeIn<…>` device is preserved.
- **`PdfPreview` iframe** — `srcDoc` + `sandbox="allow-modals allow-same-origin"` with `allow-scripts` OFF; document generators (`engine/logic/pdf/*`) are untouched by this diff, so the escape helper's coverage is unchanged.
- **P1.1 font migration** — every `'Share Tech Mono'` / `'JetBrains Mono'` occurrence under `features/demo/ui` now leads with the correct `var(--font-stmono)` / `var(--font-jbmono)`; the root layout supplies both variables and `/demo` sits inside it. (`fonts.test.ts` only scans `.tsx`; no `.ts` file under `ui/` carries a font stack today, so the gap is latent — noted, not filed.)
- **R-35 no-location notice** (`DemoExperience.tsx:619-624`) — registry-derived membership test, `completion` exemption is explicit, and `setView('cases')` keeps `currentChapter` coherent (`create-store.ts:286-291`).
- **Reopening the import modal with stale `imp` state** — refuted: `openImport` (`DemoExperience.tsx:355-359`) already calls `setImp(blankImport)` on every open.
