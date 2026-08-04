# Parity phase review — p1 (PR #30) — AGGREGATED

- **Phase:** p1 (P1.1 fonts · P1.2 picker/paste · P1.3 log bus · P1.4 live terminal · P1.5 dwell + error enrichment · P1.6 real PDF saves · P0 rider minors)
- **Mode:** initial
- **Date:** p1 (phase id — no timestamps)
- **Diff:** `git diff master...feat/parity-p1` — 58 files, +4427/−329
- **Inputs:** five lane files (inventory at the bottom); binding contracts `features/demo/CLAUDE.md` and the parity plan §4; `docs/code-reviews/deferred.md` §33/§34/§35 (this phase's deliberate non-ports, honored — nothing on the orchestrator's deliberate-choices list is re-flagged below)
- **Gates (reported consistently by 3 lanes, run in-worktree):** `tsc --noEmit` clean · `vitest run` 131 files / 1048 tests, all passing · coverage 97.25 / 88.99 / 98.90 / 98.49 vs 80% thresholds (`import-log.ts` at 100/100/100/100) · `pnpm build` clean, `/demo` First Load JS 107 kB, marketing↔demo wall intact
- **Aggregator spot-checks:** all six MAJORs independently re-verified against source in this worktree (`ImportTerminalProgress.tsx`, `ImportModal.tsx`, `DemoExperience.tsx`, `demo.css`, `deferred.md`, plus greps for the two test-lane MAJOR absence claims). All held. No BLOCKERs were claimed by any lane; none found.

## Verdict

**APPROVE-WITH-FIXES** — 0 BLOCKER · 6 MAJOR · 28 MINOR.

All six MAJORs are small, contained fixes (a scoping change to one derivation, two a11y attribute/wiring fixes, one prop made required, two added tests). No re-architecture. The MAJORs gate the merge; the MINORs are opportunistic or deferrable with a `deferred.md` entry.

## Findings table

| ID | Sev | File:line | Claim (one line) | Lenses |
|---|---|---|---|---|
| R-1 | MAJOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:81 | `deriveTrust` latches `sample` for the whole batch run — files after a fallback are labeled "in-browser" while going to the cloud | silent-failures |
| R-2 | MAJOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:420 | Pin/unpin is armed only by wheel/touchmove — keyboard users can never unpin; jump-to-latest pill unreachable (WCAG 2.1.1 A) | web, typescript |
| R-3 | MAJOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:522 | `aria-label={cta.a11y}` overrides the CTA's visible text — batch counts never announced; violates §33 rule + WCAG 2.5.3 | web |
| R-4 | MAJOR | features/demo/ui/screens/ImportModal.tsx:86 | `onReviewImport?()` still optional + doc comment says omission is safe, but P1.5 made it the dwell's only exit | type-design |
| R-5 | MAJOR | features/demo/ui/screens/import/__tests__/PickerStage.test.tsx:52 | "Pick File" card→hidden-input wiring is never exercised — its primary affordance can go dead with a green suite | tests |
| R-6 | MAJOR | features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:367 | No end-to-end partial-batch test — the amber "Batch partially failed" honesty path is never produced through the real pipeline | tests |
| R-7 | MINOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:13 | `TERM_ROW` imported but never used — dead import | typescript, web |
| R-8 | MINOR | features/demo/ui/screens/ImportModal.tsx:55 | `ERROR_MESSAGES: Record<string, string>` unties the copy map from `ImportErrorCode` — typos/renames compile clean | typescript, type-design |
| R-9 | MINOR | features/demo/engine/store/persistence.ts:419 | R-32 rewrite rehydrates a dangling `currentCaseId` when the open location's `caseId` has no matching case | typescript, silent-failures |
| R-10 | MINOR | features/demo/engine/index.ts:46 | Eleven new import-log barrel re-exports have zero consumers (all importers use the internal path) | typescript |
| R-11 | MINOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:371 | Freeze-last-stage keys off last *rendered* stage; React batching means a normalize failure freezes the bar at 15% | typescript |
| R-12 | MINOR | features/demo/ui/chrome/PdfPreview.tsx:28 | `printDocument`'s blocked-print detection has two holes: probe outside the `try`, and silent-ignore counts as success (clearing a prior notice) | typescript, silent-failures |
| R-13 | MINOR | features/demo/ui/screens/import/TerminalLine.tsx:132 | `as string` assertion where a `const` local would narrow without one | typescript |
| R-14 | MINOR | features/demo/ui/screens/import/PickerStage.tsx:95 | Two new infinite `spin` animations lack the `prefers-reduced-motion` gate their sibling keyframes have | web |
| R-15 | MINOR | features/demo/ui/screens/import/TerminalLine.tsx:171 | Expanded detail block is `aria-hidden` for >120-char dumps — disclosure toggles `aria-expanded` over AT-invisible content | web |
| R-16 | MINOR | features/demo/ui/chrome/PdfPreview.tsx:35 | `win.focus()` strands focus in the sandboxed iframe — Escape-to-close dead after "Save as PDF" | web |
| R-17 | MINOR | features/demo/ui/screens/import/PickerStage.tsx:201 | Large-batch confirm unmounts the focused button; no focus management into the confirm | web |
| R-18 | MINOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:12 | Uses the marketing `use-reduced-motion` hook, not the demo's `motion/react` one — first-frame flash for reduced-motion visitors | web |
| R-19 | MINOR | features/demo/ui/import/__tests__/useImportLog.test.ts:103 | Unmount-cancels-flush test asserts only `not.toThrow()` — cannot fail under either mutation | tests |
| R-20 | MINOR | features/demo/ui/screens/__tests__/modals.test.tsx:94 | `vi.waitFor` (not act-wrapped) → intermittent act() warning in full-suite runs | tests |
| R-21 | MINOR | features/demo/ui/screens/import/import-flow-mode.ts:31 | Pure P1 helpers (`computeImportStage`, `deriveTerminalOutcome`) live outside the coverage gate while sibling `import-log.ts` is inside | tests |
| R-22 | MINOR | features/demo/ui/screens/import/__tests__/PickerStage.test.tsx:52 | PickerStage's catch/finally failure backstop entirely unexercised (clipboard twin is pinned) | tests |
| R-23 | MINOR | features/demo/ui/screens/import/PickerStage.tsx:145 | The same catch is unreachable in production (stage flip unmounts PickerStage) and breadcrumb-free; a pipeline throw would hang the dwell forever | silent-failures |
| R-24 | MINOR | features/demo/ui/DemoExperience.tsx:382 | `onImportStage` is the only import callback with no generation-token check — a cancelled run's late stages drive a newer run's terminal | silent-failures |
| R-25 | MINOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:294 | Outcome CTA carries no sample attribution — dwell + Escape can dismiss a sample-substituted import without the notice ever rendering | silent-failures |
| R-26 | MINOR | features/demo/engine/store/selectors.ts:77 | R-33 relocation comment claims boundary coverage it doesn't have — scope-row edits after an offset warn nowhere | silent-failures |
| R-27 | MINOR | features/demo/ui/screens/import/__tests__/TerminalLine.test.tsx:110 | Memoization test asserts `$$typeof`, not the no-re-render behaviour that justifies shipping no virtualization | tests |
| R-28 | MINOR | features/demo/ui/__tests__/fonts.test.ts:15 | P1.1 font guard: misses `.ts` files under `ui/` and the PDF-template `<style>` path; false-fails on a space after the comma | tests |
| R-29 | MINOR | features/demo/ui/import/run-import.ts:93 | `code?`/`details?` optional on `ImportRunResult`'s `ok:false` arm though every producer sets both — future failure path silently drops enrichment | type-design |
| R-30 | MINOR | features/demo/ui/import/run-import.ts:81 | `ImportPartialData.businessName` is structurally unreachable (gated on `fieldCount === 0`); its render branch is dead | type-design |
| R-31 | MINOR | features/demo/ui/screens/import/import-flow-mode.ts:20 | Third independent declaration of the `'picker'|'paste'|'progress'|'result'` union — nothing links the three | type-design |
| R-32 | MINOR | features/demo/ui/screens/import/ImportTerminalProgress.tsx:81 | `deriveTrust` couples to log *prose* (`'sample fallback:'` literal duplicated in two modules) instead of a typed marker | type-design |
| R-33 | MINOR | features/demo/ui/DemoExperience.tsx:94 | `ImportState` stays a flat record as P1.5 adds another correlated field (`acknowledged`) — invalid pairings type-check | type-design |
| R-34 | MINOR | features/demo/engine/logic/import-log.ts:39 | `ImportLogLine` fields mutable while the same object identity is shared across ring, subscribers, and React state | type-design |

---

## R-1 [MAJOR] — `deriveTrust` is run-scoped and sticky; mid-batch it underclaims data exposure

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:81-86` (+ `DemoExperience.tsx:502,507-515`, badge at `:549-552`)
**Lenses:** silent-failures. Spot-checked by the aggregator: **confirmed.**

**Claim.** The first `sample fallback:` line anywhere in a run latches the trust line to `sample` for the rest of the run. The bus is one run per *batch* (`importLogBus.beginRun` is called once, outside the file loop — `DemoExperience.tsx:502`, comment "a batch is ONE run, like the phone"), so after file 1 falls back, files 2..N are labeled `sample import · in-browser` in the title bar (`:474-476`) **and in the per-file processing badge** (`:549-552` composes `File ${batch.current} of ${batch.total} · sample import · in-browser`) while their extracted text is POSTed to `/api/extract` and forwarded to a cloud model. That is an underclaim of exposure — the exact direction the function's own docstring (`:79`) says is never safe. No test covers a multi-file trust sequence.

**Adversarial sequence.** 3 PDFs; file 1's `/api/extract` returns 502 → `fallbackMode='error'` → NORM `sample fallback: …` line. Files 2–3 succeed live (`run-import.ts:145` emits `AI Request → /api/extract`; text leaves the browser). Badge reads "File 2 of 3 · sample import · in-browser" throughout.

**Conflict settlement.** The typescript lane examined an *adjacent* mechanism (ring-cap eviction flipping sample→cloud) and refuted it; it did not contradict this finding. The orchestrator's deliberate-choices list covers the trust-line *wording*, not its batch scoping. Defect stands.

**Suggested fix.** Segment-scope the derivation on the `FILE` markers already emitted per file (`DemoExperience.tsx:510`):

```ts
export function deriveTrust(lines: readonly ImportLogLine[]): TerminalTrust {
  let trust: TerminalTrust = 'cloud'
  for (const line of lines) {
    if (line.level === 'FILE') trust = 'cloud'
    else if (line.level === 'NORM' && line.text.startsWith('sample fallback:')) trust = 'sample'
  }
  return trust
}
```

Single-file/paste behaviour is byte-identical (existing pins hold). Add a batch unit case: FILE → sample fallback → FILE → AI Request must read `cloud`. Pairs naturally with R-32's typed-marker fix.

**Suggested owner:** P1.4 (live terminal) authoring agent.

---

## R-2 [MAJOR] — keyboard users can never unpin the log; the jump-to-latest pill is unreachable

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:417-427, 480-487, 509` (+ `demo.css:53-61`)
**Lenses:** web (MAJOR) + typescript (filed the same gate as MINOR TS-6). Spot-checked: **confirmed.**

**Claim.** `handleScroll` hard-gates on `userScrollRef`, whose only producers are `onWheel`/`onTouchMove` (`:484-486`). Arrow/PageUp/Home scrolling fires `scroll` but not `wheel`, so `pinned` (init `true`, `:353`) can never flip for a keyboard user; the tail effect re-yanks them to the bottom on every appended line (`:414`), and the jump-to-latest pill — gated on `!pinned` (`:509`) — never mounts for them at all. Scrollbar drag is not an escape hatch: `demo.css:53-61` hides scrollbars for everything under `[data-phone='frame']`, and the modal mounts inside that subtree. Chrome's keyboard-focusable-scrollers heuristic doesn't apply (the log contains `<button>` rows). WCAG 2.1.1 (Keyboard, Level A) on a brand-new interactive control; the web lane's contract explicitly requires keyboard reachability of new widgets. Every existing pin test drives `fireEvent.wheel` — the gap is untested, not intentional.

**Severity settlement.** The typescript lane filed this MINOR ("UX-only") citing scrollbar-drag as one of two uncovered paths; the aggregator verified scrollbars are *hidden* inside the phone frame, leaving keyboard as the only alternative input — fully dead — and a Level-A failure under the binding lane contract. **Settled MAJOR.**

**Suggested fix.** On the log container: make it a first-class keyboard target (`tabIndex={0}` plus an accessible name; if `role="log"` is used, note it is implicitly `aria-live="polite"` — add `aria-live="off"` so the `terminal-status` headline stays the sole polite region), and treat scroll keys as user intent, reusing `markUserScroll` verbatim:

```tsx
onKeyDown={(e) => {
  if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) markUserScroll()
}}
```

Optionally also `onPointerDown={markUserScroll}` (covers any future visible-scrollbar surface). Add a keyboard twin of the existing wheel pin test. The "programmatic tail scroll never flips the pin" invariant is untouched.

**Suggested owner:** P1.4 (live terminal) authoring agent.

---

## R-3 [MAJOR] — `aria-label` on the outcome CTA suppresses the visible batch counts (accname override)

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:519-536` (`ctaView` strings `:294-334`)
**Lenses:** web. Spot-checked: **confirmed** (including the §33 text at `deferred.md:711-712`).

**Claim.** `aria-label={cta.a11y}` (`:522`) replaces the button's visible `cta.title` + `cta.sub` as its accessible name. Screen-reader users hear "Review the import — some files failed" instead of "Batch partially failed — 2 of 3, 1 needs attention" — the counts are not recoverable elsewhere (the polite region renders the count-free `cta.headline`). On a forensic surface those counts are the load-bearing fact. Also WCAG 2.5.3 (Label in Name, Level A): "Review import" is not a substring of the aria-label, so voice-control activation fails. This PR's own `deferred.md §33` states the exact rule being violated, and the sibling pill in the same file does it correctly.

**Suggested fix.** Drop `aria-label` from the CTA and let the visible text be the name. If `cta.a11y`'s framing is worth keeping, attach it via `aria-describedby` on a visually-hidden span so it supplements rather than replaces. Keep `cta.a11y` in `ctaView` if the parity table wants the record — just stop wiring it to `aria-label`.

**Suggested owner:** P1.4 (live terminal) authoring agent.

---

## R-4 [MAJOR] — `onReviewImport` is optional (with a comment saying that's safe) after P1.5 made it the dwell's only exit

**File:** `features/demo/ui/screens/ImportModal.tsx:81-86, 210` (+ `DemoExperience.tsx:485-488, 843-845`, `import-flow-mode.ts:31-35`)
**Lenses:** type-design. Spot-checked: **confirmed.**

**Claim.** `onReviewImport?(): void` is declared optional and its doc comment still reasons from the pre-P1.5 world ("an outcome never shows while stage is 'progress', so this stays no-op-safe"). P1.5 — in this same diff — made that premise false: `finishImport` no longer flips to `'result'` (`DemoExperience.tsx:485-488`), `computeImportStage` holds `'progress'` until `acknowledged`, and the only writer of `acknowledged` is `onReviewImport` (`:845`). `ImportModal.tsx:210` swallows omission with `?? (() => undefined)`: a caller that omits the prop gets an outcome CTA wired to a no-op — clicking forever does nothing; the only escape discards the result via `onCancel`. The omission is real, not hypothetical: `modals.test.tsx:64-74`'s shared prop bag omits it. Same staleness in `deriveTerminalOutcome`'s docstring (`:93-100`), which still speaks of the derivation "becoming live when P1.5 holds the stage" — it is live now.

**Suggested fix.** Make it required (`onReviewImport(): void`), delete the `?? (() => undefined)` fallback at `:210`, add `onReviewImport: vi.fn()` to the `cb` bag in `modals.test.tsx`, and rewrite both doc comments in the present tense.

**Suggested owner:** P1.5 (dwell + error enrichment) authoring agent.

---

## R-5 [MAJOR] — the "Pick File" card's only job is never exercised by any test

**File:** `features/demo/ui/screens/import/__tests__/PickerStage.test.tsx` (production wiring `PickerStage.tsx:242, 267`)
**Lenses:** tests. Spot-checked: **confirmed** — `grep` finds no `fireEvent.click` on "Pick File" anywhere in `features/` or `app/`; every suite fires `change` directly on `input[type="file"]`.

**Claim.** The card→hidden-input wiring (`ref={fileInputRef}` + `onClick={() => fileInputRef.current?.click()}`) is the picker's primary affordance, and it is bypassed by every test. Drop the ref (or no-op the onClick) and `?.click()` silently no-ops — tapping "Pick File" does nothing for a visitor — while all 1048 tests stay green.

**Suggested fix.** One test: click the card and assert the hidden input received a `click` (attach a listener to the input, `fireEvent.click(screen.getByText('Pick File'))`, expect it called once).

**Suggested owner:** P1.2 (picker/paste) authoring agent.

---

## R-6 [MAJOR] — no end-to-end partial-batch test; the amber honesty path is never produced by the real pipeline

**File:** `features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx` / `DemoExperience.import-log.test.tsx` (production `DemoExperience.tsx:479-484`, `ImportModal.tsx:101-108`)
**Lenses:** tests. Spot-checked: **confirmed** — "Batch partially failed" appears only in `ImportTerminalProgress.test.tsx` with hand-built `TerminalOutcome` inputs; both batch integration tests are all-success; failure integration tests are single-file.

**Claim.** `finishImport`'s partial `ImportResult` arm and `deriveTerminalOutcome`'s `partial` derivation are each unit-tested in isolation, but nothing drives the bridge end-to-end. Mutate `DemoExperience.tsx:484` to `failures: []` (or let `recordSuccess` swallow the tally) and a mixed 2-file run renders the green "Batch complete" CTA — a clean-success lie about a run that dropped evidence — with the entire suite green. For a demo whose differentiator is forensic honesty, this is the one integration seam that must be pinned.

**Suggested fix.** One sandbox test: mock `runPdfImport` to resolve ok once and `PDF_SCANNED`-fail once, pick two PDFs, assert the amber CTA text ("Batch partially failed — 1 of 2, 1 needs attention"), click through, assert "Imported 1 of 2" + the failed filename. Also tighten the import-log DONE assertion to cover a `success: 1 · failed: 1` detail. (Note: after R-3's fix, assert on visible text, not the old aria-label.)

**Suggested owner:** P1.4 (live terminal) authoring agent, coordinating with P1.5 for the dwell click-through assertions.

---

## R-7 [MINOR] — dead import `TERM_ROW`

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:13` · **Lenses:** typescript + web (identical finding, deduped)

`TERM_ROW` is imported and never read (repo-wide grep: hits only in `TerminalLine.tsx`, its test, and this import line; the file's palette is the local `TERM_CHROME`/`C`). Neither `noUnusedLocals` nor ESLint exists to catch it. Fix: `import { TerminalLine } from '…/TerminalLine'`.
**Suggested owner:** P1.4.

## R-8 [MINOR] — `ERROR_MESSAGES: Record<string, string>` unties the copy map from `ImportErrorCode`

**File:** `features/demo/ui/screens/ImportModal.tsx:55-58, 225` · **Lenses:** typescript + type-design (identical finding, deduped)

The map keys a finite id space (`ImportErrorCode`, already imported into the file) with bare `string`: a renamed/typo'd code compiles clean and silently stops mapping (friendly copy degrades to the raw pipeline string with a green suite — `modals.test.tsx` only pins the current keys), and reads are typed `string` though `PDF_SCANNED`/`NO_FIELDS_FOUND` deliberately miss (§35), making the load-bearing `|| result.error` fallback look dead to the compiler. The three sibling registries added in this same diff (`STAGE_VIEW`, `TRUST_LINE`, `LEVEL_ACCENT`) are all union-keyed. Fix: `Partial<Record<ImportErrorCode, string>>` — typos become compile errors, the read honestly types `string | undefined`.
**Suggested owner:** P1.5.

## R-9 [MINOR] — R-32 pair-coherence rewrite rehydrates a dangling `currentCaseId`

**File:** `features/demo/engine/store/persistence.ts:418-426` · **Lenses:** typescript + silent-failures (identical finding, deduped)

`currentCaseId` now derives from `openLocation.caseId` without the `caseIds.has(...)` validation the pre-rewrite code applied to every id (the check survives only on the no-location branch). A tampered/truncated sessionStorage snapshot (`currentLocationId: 'l1'`, location's `caseId: 'c9'`, `cases: []`) rehydrates a live wizard whose `currentCase` is `null`: the R-35 no-location notice doesn't fire, `occNumber` renders empty, the PDF header gets `'—'`, and "Complete & Save" stamps the location while matching no case — a silent half-write the old code could not produce. Reachability is low (the engine has no case-delete action; both lanes were honest about this) — hence MINOR, but it is exactly the "state the engine didn't produce" path the file's own comment says rehydration must defend. Fix (one condition): `d.locations.find((l) => l.id === d.currentLocationId && caseIds.has(l.caseId))` — the pair is then fully coherent or fully empty, and the existing `'cases'` fallback fires.
**Suggested owner:** P0-riders authoring agent (this is the R-32 rider's hunk).

## R-10 [MINOR] — eleven new engine-barrel re-exports with zero consumers

**File:** `features/demo/engine/index.ts:46-57` · **Lenses:** typescript

Every real importer of the import-log module uses the internal path (`run-import.ts`, `useImportLog.ts`, `DemoExperience.tsx`, `ImportModal.tsx`, `ImportTerminalProgress.tsx`, `TerminalLine.tsx`); `barrel.test.ts` doesn't assert the new names. The barrel now advertises unused surface, including the mutable singleton `importLogBus`. Fix: drop the block, or route the UI imports through the barrel, or annotate it as deliberately forward-looking.
**Suggested owner:** P1.3 (log bus).

## R-11 [MINOR] — freeze-the-bar keys off the last *rendered* stage; batching hides `normalizing`

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:371-376` (pipeline `run-import.ts:162-203`) · **Lenses:** typescript

`onStage('normalizing')` and the following `onStage('done'|'error')` land in the same promise continuation; React batches them into one commit, so the `'normalizing'` view never renders, the effect never records it, and a normalize-stage failure freezes the bar at 15% ("Extracting fields…") while the log truthfully says it failed at normalizing. The branch's own `terminal-integration.test.tsx` `lastStage` capture demonstrates the collapse; the unit test passes only by manually rerendering a sequence production never produces. Fix: carry `lastRealStage` in the `setImp` functional updater (sees batched intermediate states) and freeze on that; or assign the ref during render (cheaper, still can't recover a never-rendered stage).
**Suggested owner:** P1.4 (with the `onImportStage` touch coordinated with R-24's token fix).

## R-12 [MINOR] — `printDocument`'s blocked-print detection has two holes (merged finding)

**File:** `features/demo/ui/chrome/PdfPreview.tsx:28-41` · **Lenses:** typescript (probe outside `try`) + silent-failures (false success clears the notice) — two defects, one function, one fix

(a) The `contentWindow`/`win.print` probe sits *outside* the `try`: the cross-origin `SecurityError` the file's own sandbox comment documents (`:79-89`) would escape as an uncaught throw instead of rendering `PRINT_BLOCKED_NOTICE`. Latent today (sandbox includes `allow-same-origin`, pinned by test). (b) A browser that silently ignores `print()` (the exact behaviour the same comment describes) *returns normally*, which the success branch rewards with `setPrintNotice(null)` — a blocked click 1 followed by a silently-ignored click 2 leaves the visitor with **no** notice after two failed saves, and `PRINT_BLOCKED_NOTICE`'s "never a fake success" claim is unhonoured. Fix: move the probe inside the `try`, and use a positive signal (`beforeprint` listener on the framed window) instead of absence-of-throw; at minimum stop clearing the notice on the unverified-success branch.
**Suggested owner:** P1.6 (real PDF saves).

## R-13 [MINOR] — `as string` where a `const` local narrows

**File:** `features/demo/ui/screens/import/TerminalLine.tsx:131-132` · **Lenses:** typescript

`hasDetail && (line.detail as string).length` — the aliased condition over a mutable property doesn't narrow, hence the assertion; it would survive silently if `detail` were widened. Fix: `const detail = line.detail; const hasDetail = detail !== undefined; …detail.length…` (and render `{detail}`).
**Suggested owner:** P1.4.

## R-14 [MINOR] — two new spinners ungated for `prefers-reduced-motion`

**File:** `features/demo/ui/screens/import/PickerStage.tsx:93-99` + `ImportTerminalProgress.tsx:268-274` · **Lenses:** web

Both new `spin 0.9s linear infinite` animations skip the `reduce` gate their sibling keyframes in the same component honour (`termCursorBlink`/`termFadeIn` at `:500/:529`); the demo's inline-styled motion must be gated in JS because `style.css`'s reduced-motion block is class-matched only. `reduce` is already in scope in the terminal — a one-token fix there. Sweep the pre-existing `SyncStatusCard.tsx:59` precedent in the same commit if desired.
**Suggested owner:** P1.2 (PickerStage) with the terminal token by P1.4 — trivially one commit.

## R-15 [MINOR] — expanded detail dump is `aria-hidden`; disclosure is a no-op for AT

**File:** `features/demo/ui/screens/import/TerminalLine.tsx:130-176` · **Lenses:** web

For >120-char details, the button toggles `aria-expanded` while the revealed block is `aria-hidden` — and `aria-controls` points at an AT-hidden node. The phone's flood rationale doesn't transfer: the log is not a live region, so nothing auto-announces; the user opted in. Fix: drop `aria-hidden` from the expanded block; or if hiding is genuinely intended, remove `aria-controls` and stop advertising the toggle to AT.
**Suggested owner:** P1.4.

## R-16 [MINOR] — `win.focus()` strands focus in the sandboxed iframe; Escape-to-close dies after printing

**File:** `features/demo/ui/chrome/PdfPreview.tsx:35, 44-50` · **Lenses:** web

After "Save as PDF", focus sits inside the `srcDoc` document (no `allow-scripts`, nothing to forward keys); the parent-document keydown listener — the same commit's Escape affordance, on the strength of which deferred §21 is marked RESOLVED — never sees another keystroke. Visible Close button remains → MINOR. Fix: refocus a parent control after `win.print()` returns (`saveBtnRef.current?.focus()`, plus a `window.focus()` fallback).
**Suggested owner:** P1.6.

## R-17 [MINOR] — large-batch confirm unmounts the focused button with no focus management

**File:** `features/demo/ui/screens/import/PickerStage.tsx:167-170, 201-230` · **Lenses:** web

`setPendingFiles` replaces the card list in place, unmounting the just-activated "Pick File" card; focus drops to `<body>` and `ModalShell` has no trap or initial focus, so a keyboard user must Tab from the top of the page to reach Continue/Cancel. Milder sibling on the clipboard path (card disabled-under-focus, `role="alert"` announces while focus is on `<body>`). Fix: `confirmRef.current?.focus()` on mount (`tabIndex={-1}`), consider `role="alertdialog"` + `aria-modal`; restore focus to the card after a clipboard failure.
**Suggested owner:** P1.2.

## R-18 [MINOR] — wrong reduced-motion hook for the demo half (one-frame flash)

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:12` · **Lenses:** web

First `ui/**` component to use `@/lib/hooks/use-reduced-motion` (marketing hook: `useState(false)` + effect → one committed frame with animations armed for a reduced-motion visitor) instead of the demo's established `motion/react` hook (seeds correctly on first render; used by `ScreenStage`, `WizardDrawer`, `ExploreChecklist`). Fix: switch to `motion/react`, or document the deliberate split in the header + deferred.md.
**Suggested owner:** P1.4.

## R-19 [MINOR] — unfalsifiable unmount test in `useImportLog`

**File:** `features/demo/ui/import/__tests__/useImportLog.test.ts:103-109` · **Lenses:** tests

The only assertion is `not.toThrow()`; both mutations (drop the rAF cancel, drop the pending clear) are throw-free — the `flush` guard returns early, and React 19 silently no-ops unmounted `setState`. Fix: spy `cancelAnimationFrame` and assert it was called, or probe the bus listener count after unmount.
**Suggested owner:** P1.3.

## R-20 [MINOR] — `vi.waitFor` without act wrapping → intermittent act() warning

**File:** `features/demo/ui/screens/__tests__/modals.test.tsx:88-95` · **Lenses:** tests

`PickerStage`'s post-await `setIsReadingFile(false)` commits outside `act`; the warning reproduces in full-suite runs (not solo — the timing signature of an unwrapped async commit). The identical sibling in `PickerStage.test.tsx:56` uses RTL's `waitFor` and is clean. Fix: use `waitFor` from `@testing-library/react` (already imported in the file).
**Suggested owner:** P1.2.

## R-21 [MINOR] — pure P1 helpers live outside the coverage gate

**File:** `features/demo/ui/screens/import/import-flow-mode.ts:31` (+ `deriveTerminalOutcome`, `ImportModal.tsx:101-108`) · **Lenses:** tests

Both are React-free derivations, fully covered today, but outside `coverage.include` (`lib/**` + `engine/**`) — while their equally-pure P1 sibling `import-log.ts` went into `engine/logic/` and is measured. Consistency call, not a breach (`screenData.ts`/`run-import.ts` precedent exists). Fix: move to `engine/logic/` and re-point two imports, or annotate the files as deliberately outside the gate.
**Suggested owner:** P1.5.

## R-22 [MINOR] — PickerStage's failure backstop untested (catch + finally)

**File:** `features/demo/ui/screens/import/__tests__/PickerStage.test.tsx` (production `PickerStage.tsx:145-156, 189-194`) · **Lenses:** tests

No test rejects `onPdfFilesSelected`/`onClipboardText`, so neither `fileReadFailed`/`textImportFailed` copy nor the `finally` that re-enables the cards is pinned (the clipboard busy-cycle twin *is* pinned — the asymmetry is the tell). Drop the `finally` and a rejecting parent leaves all three cards permanently disabled, suite green. Note the interplay with R-23: in a unit test the mocked parent keeps the stage mounted, so the catch genuinely runs and the proposed tests are valid — R-23's unreachability is about the *real* parent unmounting the stage first. Fix: one rejection test per catch, mirroring the clipboard pattern.
**Suggested owner:** P1.2.

## R-23 [MINOR] — the same catch is unreachable in production and breadcrumb-free; a pipeline throw hangs the dwell

**File:** `features/demo/ui/screens/import/PickerStage.tsx:145-156` (+ `DemoExperience.tsx:492-518`) · **Lenses:** silent-failures

The parent flips stage to `'progress'` on the first `setImp` (unmounting `PickerStage`), so a later throw from `processPdfFiles` lands in a catch whose `setError` React discards — no banner, no console line — and since `processPdfFiles` has no try and `finishImport` is `result`'s only writer, the terminal would spin forever with zero signal. Nothing throws *today* (all callees internally guarded — deferred §18's latency claim re-verified), but the new handling looks like it closed §18 when it did not. Fix: (a) `console.error('[demo/import] import run threw', e)` in the PickerStage catch; (b) wrap `processPdfFiles`/`runTextImportFlow` bodies in a try/catch that sets a failure result — which also releases the dwell. Or annotate §18 that the catch is decorative.
**Suggested owner:** P1.2 for (a); P1.4 for (b) — the pipeline backstop lives in `DemoExperience`.

## R-24 [MINOR] — `onImportStage` is the one un-tokened import callback

**File:** `features/demo/ui/DemoExperience.tsx:382` · **Lenses:** silent-failures. (Aggregator verified the bare `setImp` and that every sibling checkpoint is tokened.)

Cancellation doesn't abort the in-flight pipeline; a superseded run's late `onStage('normalizing'|'done')` writes `activeStage` into the *new* run's state — driving the new terminal's headline/bar, and (post-P1.5) corrupting the frozen-bar-on-failure stage. Display-only (store writes and results remain token-guarded) → MINOR. Fix: `const importStageFor = (myGen) => (st) => setImp((s) => (importGen.current === myGen ? { ...s, activeStage: st } : s))`, passed at `:511`/`:539`. Coordinates naturally with R-11's `lastRealStage` change.
**Suggested owner:** P1.4.

## R-25 [MINOR] — outcome CTA carries no sample attribution; the dwell can eat the notice

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:294-310` (+ `DemoExperience.tsx:485-488, 861-869`) · **Lenses:** silent-failures

Pre-P1.5 the modal auto-flipped to results, so `fallbackNotice` + the `isSample` badge always painted at least once; now both live behind the CTA tap, and Escape during the dwell discards the result (`onCancel` → `blankImport`) — a sample-substituted location persists with nothing persistent marking it. MINOR because the dwell terminal itself announces twice (amber `sample fallback:` line + `sample import · in-browser` trust line, both on screen at the CTA moment) — prominence regressed, not existence. Fix: thread `trust` into `ctaView`; when `'sample'`, render the success/partial `sub` as e.g. `'sample import — review →'` (amber palette).
**Suggested owner:** P1.5.

## R-26 [MINOR] — R-33 relocation comment overstates its boundary coverage

**File:** `features/demo/engine/store/selectors.ts:77-84` (+ `create-store.ts:356-358, 442-461`) · **Lenses:** silent-failures

The now-silent catch cites coverage at "the boundaries that create the condition" — but only Calculate/Regenerate and import-after-offset warn. The third boundary — adding/editing a requested-scope row *after* an offset exists (`DemoExperience.tsx:666` → `updateField`) — warns nowhere; `selectAdjustedScopes` drops the unparseable row silently. Visitor surface intact (`adjustedScopesPartial` still annotates the PDF) — operator-observability gap only. Fix: narrow the comment + log in deferred §15, or emit the same dev-warn from the scope-write path when an offset is present.
**Suggested owner:** P0-riders authoring agent (R-33 rider's hunk).

## R-27 [MINOR] — memoization test pins a React internal, not the no-re-render invariant

**File:** `features/demo/ui/screens/import/__tests__/TerminalLine.test.tsx:110-112` · **Lenses:** tests

`$$typeof === Symbol.for('react.memo')` stays true even if the parent breaks the invariant (inline `onToggleDetail`, non-per-seq `expanded`) — and the claim is load-bearing: it is the stated reason the terminal ships no virtualization at the 400-line cap. Fix: render-count/node-identity test — append a 4th line, assert the first three DOM nodes are the same element instances.
**Suggested owner:** P1.4.

## R-28 [MINOR] — P1.1 font guard: two scope holes, one over-strict pattern

**File:** `features/demo/ui/__tests__/fonts.test.ts:15-37` · **Lenses:** tests

(a) Scans only `.tsx` under `ui/` — a stack in a future `.ts` style module escapes; (b) the `@import` check reads only `demo.css` — the PDF templates (`engine/logic/pdf/*.ts`) inject their own `<style>` into the print iframe (P1.6's live path) and are unscanned; (c) `bareOccurrences` requires no space after the comma — `var(--font-stmono), 'Share Tech Mono'` (formatter-plausible, valid CSS) false-fails. Current state verified clean by grep — all latent. Fix: widen to `/\.tsx?$/`, add the pdf dir to the `@import`/googleapis scan, allow `\s*` after the comma.
**Suggested owner:** P1.1 (fonts).

## R-29 [MINOR] — `code?`/`details?` optional on `ImportRunResult`'s failure arm though every producer sets both

**File:** `features/demo/ui/import/run-import.ts:87-98` · **Lenses:** type-design

All three failure constructions set both fields; consumers then guard for a state the producer can't produce, and a future `return { ok: false, error, … }` without them compiles silently — quietly dropping this PR's row-79 enrichment (no code mapping, no Technical Details block). The distinction is real: `ImportModal.ImportResult`'s optionality is *correct* (DemoExperience builds code-less pre-pipeline failures); the finding is specific to `ImportRunResult`. Fix: make `code`/`details` required on the `ok: false` arm (leave `partialData?`/`filename?` optional).
**Suggested owner:** P1.5.

## R-30 [MINOR] — `ImportPartialData.businessName` is structurally unreachable

**File:** `features/demo/ui/import/run-import.ts:79-82, 174-179` (+ consumer `ImportModal.tsx:160`) · **Lenses:** type-design

The only `partialData` construction sits inside the `fieldCount === 0` gate, and `fieldCount` counts `businessName` — so `businessName` is provably empty on that path; the `Business:` render branch is dead and no test constructs it. Fix: drop the field + branch, or make `parseNormalizeMap` surface it the way `occurrenceNumber` was surfaced; record the choice in §35.
**Suggested owner:** P1.5.

## R-31 [MINOR] — third independent declaration of the import-stage union

**File:** `features/demo/ui/screens/import/import-flow-mode.ts:20` (vs `ImportModal.tsx:60`, `DemoExperience.tsx:95`) · **Lenses:** type-design

`'picker' | 'paste' | 'progress' | 'result'` now exists three times, linked only structurally; adding a stage to `ImportModal.ImportStageId` alone yields a dead branch with no compile error, and `ImportModal.ImportStageId` collides in name with the *pipeline* stage union in `run-import.ts` (aliased `RunStageId` at three sites). Most other drift directions do fail the build → MINOR. Fix: declare once in `import-flow-mode.ts` (it owns the machine), consume everywhere; consider renaming away from the colliding `ImportStageId`.
**Suggested owner:** P1.5.

## R-32 [MINOR] — `deriveTrust` couples to log prose across two modules

**File:** `features/demo/ui/screens/import/ImportTerminalProgress.tsx:81-86` (emit: `run-import.ts:108-124`) · **Lenses:** type-design

The `'sample fallback:'` prefix is a bare literal at both the emit site and the consumer; the tests re-declare the sentences as their own literals, so a copy edit to the `'unavailable'`/`'error'` lines silently reverts trust to `'cloud'` with a green suite. Failure direction is the safe one by the file's own rule, and the substitution is disclosed twice more (log line, result card) → MINOR. Fix: structured marker on `ImportLogLine` (`mark?: 'sample-fallback'`) set by `emitFallback` and matched by `deriveTrust` — fold into the R-1 rewrite; or a shared exported `SAMPLE_FALLBACK_PREFIX` const.
**Suggested owner:** P1.4 (with R-1).

## R-33 [MINOR] — `ImportState` stays flat as P1.5 adds another correlated field

**File:** `features/demo/ui/DemoExperience.tsx:94-107` · **Lenses:** type-design

`acknowledged` is meaningful only when `stage === 'progress' && result !== null`; `{ stage: 'result', result: null }` type-checks and renders a blank modal body. The lane traced every `setImp` writer and confirmed no invalid state is reachable today — enforced by discipline across five call sites plus `computeImportStage`, not by the type (`RetentionView` is the house precedent for the union shape). Fix: model the run half as a union (`picker/paste` | `progress` payload | `result` payload) so `computeImportStage` narrows instead of re-deriving; or log the accepted runtime-enforcement choice in deferred.md (§27 precedent).
**Suggested owner:** P1.5.

## R-34 [MINOR] — `ImportLogLine` mutable while the same object identity is shared everywhere

**File:** `features/demo/engine/logic/import-log.ts:39-48, 85, 123-126` · **Lenses:** type-design

The same line object is pushed into the retained ring, broadcast to every subscriber, replayed to new subscribers, and held in React state; `getLines()` copies the array but shares the elements. One consumer mutation corrupts the run for everyone. The author reached for `readonly` one level up (`ImportLogView.lines`, `deriveTrust`'s param) — the intent exists, uncarried. No mutation today (verified) → defense-in-depth. Fix: `readonly` on all fields + `getLines(): readonly ImportLogLine[]` (verified non-breaking by the lane against all consumers and tests).
**Suggested owner:** P1.3.

---

## Dropped / Demoted appendix

Nothing was dropped outright — every lane finding survives, either standalone or merged. Dispositions that changed shape:

| Lane finding | Disposition | Rationale |
|---|---|---|
| TYPESCRIPT-1 + WEB-7 | **Merged** → R-7 | Identical dead-import finding, verified by both lanes' greps. Web writeup's bundle note folded in. |
| TYPESCRIPT-2 + TYPE-DESIGN-2 | **Merged** → R-8 | Identical `ERROR_MESSAGES` typing finding; type-design's registry-precedent evidence kept as the richer writeup. |
| TYPESCRIPT-4 + SILENT-FAILURES-7 | **Merged** → R-9 | Identical persistence finding, same suggested one-condition fix; both lanes' honesty about low reachability preserved (stays MINOR). |
| TYPESCRIPT-6 | **Merged into R-2 and settled MAJOR** (was MINOR) | Same pin-gate defect as WEB-1. Severity conflict settled by the aggregator opening the code: `demo.css:53-61` hides scrollbars inside the phone frame, so the TS lane's "scrollbar drag" alternative path does not exist on this surface — keyboard is the only non-wheel input and it is fully dead, on a new interactive control, against a lane contract that explicitly requires keyboard reachability (WCAG 2.1.1 Level A). TS-6's `onPointerDown` arming suggestion retained as an optional part of the fix. |
| TYPESCRIPT-7 + SILENT-FAILURES-5 | **Merged** → R-12 | Two distinct holes (uncaught-throw path; false-success path) in the same 14-line function with one combined rewrite as the fix. Reported as one finding with both mechanisms so the P1.6 owner fixes them together. Severity stays MINOR (both latent/conditional). |
| SILENT-FAILURES-1 vs typescript's "deriveTrust — not filed" note | **No conflict — R-1 stands as MAJOR** | The TS lane refuted a *different* mechanism (ring-cap eviction flipping sample→cloud, the safe direction). SF-1 is the sticky latch flipping cloud→sample per-file mid-batch, the unsafe direction by the file's own docstring. The orchestrator's deliberate-choices list covers trust-line *wording*, not batch scoping. |
| TESTS-6 vs SILENT-FAILURES-4 | **Kept separate** (R-22, R-23), cross-referenced | Superficially in tension (test the catch vs the catch is unreachable). Resolved: in a unit test the mocked parent keeps `PickerStage` mounted so the catch runs and is testable (R-22 valid); in production the real parent unmounts the stage first (R-23 valid). Different fixes, different owners. |
| WEB-1's `role="log"` fix detail | **Corrected in R-2** | The lane suggested `role="log"` "keeps it out of the auto-announced live-region path" — `role="log"` is implicitly `aria-live="polite"`. R-2's fix notes `aria-live="off"` is needed if that role is used, so the headline stays the sole polite region. |

No severities were demoted. No BLOCKER claims existed to verify. All six MAJORs were independently spot-checked against source and confirmed (see header).

## Raw lane-file inventory

| Lane file | Self-reported | Findings → final IDs |
|---|---|---|
| `docs/code-reviews/parity/p1/lane-typescript.md` | 0 B / 0 M / 8 m | TS-1→R-7 · TS-2→R-8 · TS-3→R-10 · TS-4→R-9 · TS-5→R-11 · TS-6→R-2 (merged, MAJOR) · TS-7→R-12 · TS-8→R-13 |
| `docs/code-reviews/parity/p1/lane-web.md` | 0 B / 2 M / 6 m | WEB-1→R-2 · WEB-2→R-3 · WEB-3→R-14 · WEB-4→R-15 · WEB-5→R-16 · WEB-6→R-17 · WEB-7→R-7 · WEB-8→R-18 |
| `docs/code-reviews/parity/p1/lane-tests.md` | 0 B / 2 M / 6 m | TESTS-1→R-5 · TESTS-2→R-6 · TESTS-3→R-19 · TESTS-4→R-20 · TESTS-5→R-21 · TESTS-6→R-22 · TESTS-7→R-27 · TESTS-8→R-28 |
| `docs/code-reviews/parity/p1/lane-silent-failures.md` | 0 B / 1 M / 6 m | SF-1→R-1 · SF-2→R-24 · SF-3→R-25 · SF-4→R-23 · SF-5→R-12 · SF-6→R-26 · SF-7→R-9 |
| `docs/code-reviews/parity/p1/lane-type-design.md` | 0 B / 1 M / 7 m | TD-1→R-4 · TD-2→R-8 · TD-3→R-29 · TD-4→R-30 · TD-5→R-31 · TD-6→R-32 · TD-7→R-33 · TD-8→R-34 |

Lane self-reported totals: 0 blockers, 6 majors, 33 minors → after dedupe (5 merges, one absorbed into a MAJOR): **0 blockers, 6 majors, 28 minors**. Each lane also recorded substantial verified-clean inventories (architecture sweeps, refuted hypotheses, gates); those remain in the lane files and were not contradicted by any other lane.
