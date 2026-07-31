# Lane: tests — parity P1 (PR #30)

**Mode:** INITIAL (full review of the diff)
**Diff under review:** `git diff master...feat/parity-p1` — 58 files, +4427/−329
**Lane definition:** `.claude/agents/test-analyzer.md` (test-quality reviewer, Vitest 4 + jsdom + RTL)
**Binding contract read:** `features/demo/CLAUDE.md`, root `vitest.config.mts`, `vitest.setup.ts`

## Pre-flight (run locally in the worktree)

- `vitest run` — **131 files / 1048 tests, all passing.** No failures, no skips.
- `vitest run --coverage` — gate **met with room**: statements 97.25 / branches 88.99 / functions 98.90 / lines 98.49 against the 80% thresholds on `lib/**` + `features/demo/engine/**`.
- The new engine module `features/demo/engine/logic/import-log.ts` is **100 / 100 / 100 / 100** (34 lines, 12 functions, 8 branches — confirmed via `json-summary`; the `text` reporter hides fully-covered rows, which is why it doesn't appear in the table).
- Non-blocking stderr observed: pre-existing `MapCanvas` act warnings in `DemoExperience.map.test.tsx` (not in this diff), pre-existing shorthand-style React warnings, and **one new act warning** — see TESTS-4.

## Files reviewed (both sides)

Read in full: `import-log.ts` + `import-log.test.ts`; `useImportLog.ts` + `useImportLog.test.ts`; `run-import.ts` + `run-import.test.ts` + `run-import-log.test.ts`; `import-flow-mode.ts` + its test; `PickerStage.tsx`/`PasteStage.tsx`/`TerminalLine.tsx`/`ImportTerminalProgress.tsx` + their tests; `ImportModal.tsx` + `modals.test.tsx` + `terminal-integration.test.tsx`; `PdfPreview.tsx` + `PdfPreview.test.tsx` + `hardwareFinale.test.tsx`; `DemoExperience.tsx` (import lifecycle, dwell, cancel) + `DemoExperience.import-log.test.tsx` + `DemoExperience.sandbox.test.tsx`; `_shared.tsx`/`ModalShell.test.tsx`; `persistence.ts`/`selectors.ts`/`create-store.ts` + their tests; `fonts.test.ts`, `glass-tokens.test.ts`, `app/demo/error.tsx` + `error.test.tsx`; `deferred.md` §33–§35.

**Overall:** this is a strong test posture. Mocks sit at the true IO edge (`extract-client`, `pdf-extract`, `geocode`), the engine is never mocked, the log bus is clock-injected everywhere it matters, both arms of every `ok:true`/`ok:false` union in `run-import` are exercised, all ten `ImportLogLevel`s and all three `TerminalOutcome` variants are pinned, and the `deriveTrust` / `TRUST_LINE` / `TERMINAL_TITLE` honesty guards actively assert the absence of the phone's `on-device` / `nothing leaves this phone` copy. The dwell migrations in `DemoExperience.sandbox.test.tsx` converted assertions rather than deleting them. Findings below are gaps, not rot.

Things I checked and **refuted** (recording so they aren't re-raised):

- *Clock leak in the log tests.* `runImport` reads the real `Date.now()` for `currentTimeMs`. I traced it: for the SAMPLE path (`DemoExperience.import-log.test.tsx:72-88`'s exact 15-level array) `SAMPLE_REQUEST_DOC` states "March 8 2025" / "March 9 2025" within the ±150-char window, so `disambiguateHallucinatedYear` hits the cold-case guard (`year-disambiguation.ts:156-170`) and returns `ai_year_plausible` — no extra NORM warning line, forever, regardless of today's date. The live-path RAW_MESSY assertions in `run-import-log.test.ts:58-76` are all count-*relative* (`warnings.length`, `r.warnings.length`), so a year-correction warning can appear or disappear without breaking them. Not a flake.
- *`import-log.ts` escaping the coverage gate.* It does not — measured at 100% on all four metrics.
- *jsdom swallowing `scrollTop` writes* (which would make the auto-follow assertions vacuous). It does not: `ImportTerminalProgress.test.tsx:198` asserts `scrollTop === 800` and passes, so the discriminating assertions at :195 and :218 are real.
- *`applyImport`'s R-33 breadcrumb over-counting pre-existing scopes.* It cannot — the breadcrumb only runs when `patch._import.timeFrames.length` is truthy, and that same condition makes `applyImport` **replace** `form.scopes` wholesale (`create-store.ts:432-441`), so `loc.form.scopes` at the count site is exactly the imported frames. The message label is accurate.
- *R-34 duplicated across two suites* — per the phase brief this is disclosed; the duplication is 3 token assertions in 2 files. No real maintenance harm, not filed.

---

## TESTS-1 [MAJOR] features/demo/ui/screens/import/__tests__/PickerStage.test.tsx:52

**Claim:** The "Pick File" card's only job — opening the hidden file input — is never exercised. Every test in the repo reaches the picker by firing `change` directly on `input[type="file"]`, so the card→input wiring could be deleted and the suite stays green while the picker's primary affordance goes dead in the browser.

**Evidence:**
- Production wiring: `features/demo/ui/screens/import/PickerStage.tsx:242` (`ref={fileInputRef}`) and `:267` (`onClick={() => fileInputRef.current?.click()}`).
- Every test bypasses it: `PickerStage.test.tsx:17` (`const fileInput = () => utils.container.querySelector('input[type="file"]')`) then `:55, :63, :69, :76, :83/:85, :138, :150, :159`; `features/demo/ui/screens/__tests__/modals.test.tsx:91-93`; `features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:340-341, 357, 375-376, 393, 519-521, 617, 631`; `features/demo/ui/__tests__/DemoExperience.import-log.test.tsx:47-50`.
- `grep -rn "Pick File" features app` returns only presence assertions (`PickerStage.test.tsx:25,38,126,131,153`, `modals.test.tsx:82`, `DemoExperience.sandbox.test.tsx:725`) — no `fireEvent.click` on that card anywhere.

**Failure scenario:** Drop `ref={fileInputRef}` (or change `onClick` to a no-op) — `fileInputRef.current` is `null`, `?.click()` silently no-ops, tapping "Pick File" does nothing for a visitor, and **all 1048 tests still pass**. Same for a regression that moves the ref onto the wrong element.

**Suggested fix:** In `PickerStage.test.tsx`, add a test that clicks the card and asserts the hidden input received the click:

```ts
it('the Pick File card opens the hidden file input', () => {
  const { fileInput } = renderStage()
  const clicked = vi.fn()
  fileInput().addEventListener('click', clicked)
  fireEvent.click(screen.getByText('Pick File'))
  expect(clicked).toHaveBeenCalledTimes(1)
})
```

**Confidence:** High — verified by grep over `features/` and `app/`, and by reading both the component and every call site.

---

## TESTS-2 [MAJOR] features/demo/ui/__tests__/DemoExperience.sandbox.test.tsx:367

**Claim:** No test drives the bridge to a **partial batch** (some files succeed, some fail). `finishImport`'s partial `ImportResult` and the amber "Batch partially failed" CTA — the specific honesty affordance P1.4 was built for — are never produced end-to-end. The three pieces are each unit-tested in isolation, but nothing asserts `DemoExperience` can produce a partial result at all.

**Evidence:**
- Production: `features/demo/ui/DemoExperience.tsx:479-484` — `t.locations.length === 0 ? …failure… : { ok: true, locations: t.locations, failures: t.failures, notice: t.notice }`; and `:472` — `emitter.log('DONE', 'batch complete', \`success: … · failed: ${t.failures.length} · …\`)`.
- Consumer: `features/demo/ui/screens/ImportModal.tsx:101-108` `deriveTerminalOutcome` → `partial` only when `result.failures.length > 0` on an `ok: true` result.
- Batch integration tests are **all-success only**: `DemoExperience.sandbox.test.tsx:367` (2 files, both `okRun`), `:508` (2 files, both `okRun`, one sample-flavoured), `DemoExperience.import-log.test.tsx:119` (2 files, both succeed — and its DONE assertion at `:135` pins `/^success: 2 · failed: 0 · \d+ms$/`, i.e. the `failed: 0` case only). Failure tests are single-file: `sandbox:385`, `import-log:138`.
- The isolated coverage that masks the gap: `modals.test.tsx:104-116` (`deriveTerminalOutcome` partial arm), `ImportTerminalProgress.test.tsx:349-364` (`ctaView` partial), `modals.test.tsx:147-151` (partial result view).

**Failure scenario:** Change `DemoExperience.tsx:484` to `{ ok: true, locations: t.locations, failures: [], notice: t.notice }` (or make `recordSuccess` swallow the failure tally). A 2-file run where one PDF is a scan then renders the **green** `Batch complete — 1 of 1 locations` CTA and a "Imported 1 of 1 requests" result — a clean-success lie about a run that dropped evidence — and the entire suite stays green, because `deriveTerminalOutcome` is only ever tested with hand-built inputs.

**Suggested fix:** One sandbox test:

```ts
it('a partially failed batch reads amber end-to-end — never a clean success', async () => {
  runPdf
    .mockResolvedValueOnce(okRun({ filename: 'good.pdf' }))
    .mockResolvedValueOnce({ ok: false, error: 'scanned', code: 'PDF_SCANNED', filename: 'scan.pdf', warnings: [], fallbackMode: 'none' })
  // …open import, pick two PDFs…
  const cta = await screen.findByRole('button', { name: 'Review the import — some files failed' })
  expect(cta).toHaveTextContent('Batch partially failed — 1 of 2, 1 needs attention')
  fireEvent.click(cta)
  expect(await screen.findByText(/Imported 1 of 2/)).toBeInTheDocument()
  expect(screen.getByText(/scan\.pdf/)).toBeInTheDocument()
})
```

and tighten `DemoExperience.import-log.test.tsx` to also cover a `success: 1 · failed: 1` DONE detail.

**Confidence:** High — enumerated every `it()` in both integration suites and read `finishImport` line by line.

---

## TESTS-3 [MINOR] features/demo/ui/import/__tests__/useImportLog.test.ts:103

**Claim:** `'unmount cancels the pending flush — a buffered burst cannot commit into a dead hook'` cannot fail. It asserts only `not.toThrow()`, and both the guarded and the unguarded variants of the production code are throw-free, so it pins nothing.

**Evidence:**
- Test: `useImportLog.test.ts:103-109` — the only assertion is `expect(() => act(() => void vi.advanceTimersToNextFrame())).not.toThrow()`.
- Production cleanup: `features/demo/ui/import/useImportLog.ts:98-103` — `unsubscribe(); cancelFrameRef.current?.(); cancelFrameRef.current = null; pendingRef.current = null`.
- Remove `cancelFrameRef.current?.()`: the rAF still fires, `flush()` runs, reads `pendingRef.current` (now `null`), and returns at the `if (!batch || …) return` guard on `:68` — no `setView`, no throw.
- Remove `pendingRef.current = null` too: `setView` on an unmounted component is a silent no-op in React 19 (the "state update on an unmounted component" warning was deleted in React 18) — still no throw.
- The suite has precedent for doing this properly: the `useReducedMotion` unmount test asserts the *exact registered handler* is the one removed.

**Suggested fix:** Assert the cancel, not the absence of an exception — e.g. `const cancel = vi.spyOn(globalThis, 'cancelAnimationFrame')` before unmount and `expect(cancel).toHaveBeenCalled()`; or drive the negative directly (`const seen: unknown[] = []; bus.subscribe(e => seen.push(e))` before unmount, emit after unmount, and assert the hook's listener is gone via a listener-count probe on the bus).

**Confidence:** High — traced both mutations by hand through `flush`.

---

## TESTS-4 [MINOR] features/demo/ui/screens/__tests__/modals.test.tsx:94

**Claim:** `await vi.waitFor(...)` is not act-wrapped, so `PickerStage`'s post-await `setIsReadingFile(false)` commits outside `act` — the full-suite run prints `An update to PickerStage inside a test was not wrapped in act(...)`.

**Evidence:**
- Test: `modals.test.tsx:88-95` — `fireEvent.change(input, …)` then `await vi.waitFor(() => expect(onPdfFilesSelected).toHaveBeenCalledWith([file]))`.
- Production: `PickerStage.tsx:145-156` — `setIsReadingFile(true)` runs inside the (act-wrapped) event dispatch, but `await props.onPdfFilesSelected(files)` yields a microtask and the `finally { setIsReadingFile(false) }` lands after `act` has closed.
- Observed in `vitest run` (full suite) stderr: `features/demo/ui/screens/__tests__/modals.test.tsx > ImportModal > picker: a PDF selection reaches onPdfFilesSelected through the stage seam / An update to PickerStage inside a test was not wrapped in act(...)`. It does **not** reproduce when the file runs alone (3/3 clean runs) — timing-dependent, which is exactly the signature of an unwrapped async commit under load.
- The contrasting control: `PickerStage.test.tsx:56` does the same thing with RTL's `waitFor` (whose `asyncWrapper` installs the act environment) and produces **no** warning in any run.

**Suggested fix:** Import `waitFor` from `@testing-library/react` in `modals.test.tsx` and use it instead of `vi.waitFor` (the file already imports from that module on line 2).

**Confidence:** High — reproduced in the full-suite run and diagnosed against the identical-but-clean sibling test.

---

## TESTS-5 [MINOR] features/demo/ui/screens/import/import-flow-mode.ts:31

**Claim:** Two pure, React-free state derivations added by P1 live in `ui/`, i.e. **outside** `coverage.include` (`lib/**` + `features/demo/engine/**`). They are fully branch-covered today, so nothing is lost right now, but the gate that would catch thin coverage on a future edit does not apply to them — while their P1 sibling `import-log.ts` (equally pure) went into `engine/logic/` and is measured.

**Evidence:**
- `features/demo/ui/screens/import/import-flow-mode.ts:31-35` — `computeImportStage`, no React import, no `'use client'`, consumed by `DemoExperience.tsx:838`. Tested exhaustively at `features/demo/ui/screens/import/__tests__/import-flow-mode.test.ts:4-33` (all 7 input combinations).
- `features/demo/ui/screens/ImportModal.tsx:101-108` — `deriveTerminalOutcome`, also pure; tested at `modals.test.tsx:104-116`.
- Gate scope: `vitest.config.mts:29` (`include: ['lib/**/*.{ts,tsx}', 'features/demo/engine/**/*.{ts,tsx}']`).
- Contract: `features/demo/CLAUDE.md` — "`engine/` — pure state/logic core (no React, no `'use client'`) … `logic/` — pure functions".

**Suggested fix:** Either move `computeImportStage` (and, if you agree it qualifies, `deriveTerminalOutcome`) to `features/demo/engine/logic/` and re-point the two imports, or leave them where they are and note in each file's header that they're deliberately outside the gate (the `ui/screens/screenData.ts` and `ui/import/run-import.ts` precedent). No test changes needed either way — the existing tests move with the module.

**Confidence:** Medium — precedent for pure helpers in `ui/` exists in this repo, so this is a consistency call rather than a contract breach.

---

## TESTS-6 [MINOR] features/demo/ui/screens/import/__tests__/PickerStage.test.tsx:52

**Claim:** `PickerStage`'s PDF failure backstop is entirely unexercised — neither the error copy nor, more importantly, the `finally` that re-enables the cards. The clipboard equivalent *is* pinned, which makes the asymmetry the tell.

**Evidence:**
- Production: `PickerStage.tsx:145-156` — `setIsReadingFile(true)` / `catch { setError(PICKER_COPY.fileReadFailed) }` / `finally { setIsReadingFile(false) }`; and `:189-194` — `catch { setError(PICKER_COPY.textImportFailed) }`.
- No test makes `onPdfFilesSelected` or `onClipboardText` reject: every `renderStage()` uses `vi.fn()` returning `undefined` (`PickerStage.test.tsx:10-11`), and `modals.test.tsx:73-74` / `DemoExperience` pass resolving handlers.
- Contrast: the clipboard busy/un-busy cycle IS pinned at `PickerStage.test.tsx:120-133` (`aria-busy`, all three cards disabled, then re-enabled).
- Note `deferred.md` §33 deliberately declines a *paste-stage* error banner; it does not cover these picker-local catches, which are implemented.

**Failure scenario:** Drop `finally { setIsReadingFile(false) }` (or move it inside the `try`). A parent that rejects — the exact case `fileReadFailed` exists for — leaves all three cards permanently `disabled` with no route forward and no error visible, and no test notices.

**Suggested fix:** One test per catch, mirroring the clipboard pattern:

```ts
it('a rejecting parent shows the read-failed banner and re-enables the cards', async () => {
  const { props } = renderStage({ onPdfFilesSelected: vi.fn().mockRejectedValue(new Error('boom')) })
  fireEvent.change(fileInput(), { target: { files: [pdf()] } })
  expect(await screen.findByRole('alert')).toHaveTextContent(PICKER_COPY.fileReadFailed)
  expect(screen.getByText('Pick File').closest('button')!).not.toBeDisabled()
})
```

and the `onClipboardText` rejection twin asserting `PICKER_COPY.textImportFailed`.

**Confidence:** High.

---

## TESTS-7 [MINOR] features/demo/ui/screens/import/__tests__/TerminalLine.test.tsx:110

**Claim:** `'is memoized so appends never re-render existing rows (keyed by seq in the parent)'` asserts a React internal shape (`$$typeof === Symbol.for('react.memo')`), not the behaviour in its own name. `memo()` alone does not deliver that guarantee — it also requires the parent's `onToggleDetail` to be referentially stable and `expanded` to be a per-seq boolean. The claim is load-bearing: `ImportTerminalProgress.tsx:37-44` cites exactly this as the reason it ships **no virtualization** at the 400-line cap.

**Evidence:**
- Test: `TerminalLine.test.tsx:110-112` — single assertion on `$$typeof`.
- The two collaborators the assertion doesn't cover: `ImportTerminalProgress.tsx:433-440` (`toggleDetail` is a `useCallback` with `[]`) and `:489` (`expanded={expandedSeqs.has(line.seq)}`). Replace the `useCallback` with an inline arrow and every row re-renders on every append — `memo` is still in place and this test still passes.

**Suggested fix:** Replace (or supplement) the shape check with a render-count test in `ImportTerminalProgress.test.tsx`: wrap `TerminalLine` usage indirectly by emitting 3 lines, recording `document.querySelectorAll('[data-testid^="terminal-line-"]')` node identities, appending a 4th line, and asserting the first three DOM nodes are the *same* element instances (a re-render that recreates them would fail). That pins the observable consequence without reaching into React internals.

**Confidence:** Medium-high — the `$$typeof` assertion is factually true; the finding is that it does not cover the stated invariant.

---

## TESTS-8 [MINOR] features/demo/ui/__tests__/fonts.test.ts:15

**Claim:** The new P1.1 structural guard has two scope holes and one over-strict pattern. It is a legitimate source-reading guard (the house idiom), but as written a font stack can escape it entirely, and a valid formatting variant false-fails it.

**Evidence:**
- `fonts.test.ts:15-18` — `uiSources()` filters `f.endsWith('.tsx')` under `features/demo/ui` only. A stack declared in a `.ts` module under `ui/` (e.g. a future `styles.ts`, alongside the existing `ui/glass-tokens.ts` pattern) is invisible to the guard. I verified the current state is clean — `grep -rn "Share Tech Mono\|JetBrains Mono"` finds all demo stacks in `.tsx` — so this is a latent hole, not a live miss.
- `fonts.test.ts:34-37` — the `@import` check reads only `demo.css`. The document generators in `features/demo/engine/logic/pdf/*.ts` inject their own `<style>` block into the print iframe (P1.6's real print path); a Google `@import` added there would re-fetch at runtime and this guard would not see it. (Currently clean: those templates use `Arial` / `'Courier New'` only.)
- `fonts.test.ts:21-31` — `bareOccurrences` requires the preceding text to end with exactly `var(--font-stmono),` (no space). `fontFamily: "var(--font-stmono), 'Share Tech Mono', monospace"` — valid CSS, and the form a formatter may produce — is counted as a bare occurrence and fails the test.

**Suggested fix:** Widen the file filter to `/\.tsx?$/` and add `features/demo/engine/logic/pdf` to the `@import` / `fonts.googleapis.com` scan; relax the prefix test to a regex allowing optional whitespace after the comma (e.g. match `var\(--font-stmono\),\s*'Share Tech Mono'` and count quoted occurrences not preceded by it).

**Confidence:** High — read the helper line by line and confirmed the current-state cleanliness by grep.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 2 |
| MINOR | 6 |

- **Behaviourally meaningful coverage:** strong. The new surfaces are tested against observable behaviour (rendered rows, bus contents, store state, emitted callbacks), not mechanism, and the honesty invariants (trust line, absence of `on-device` / `nothing leaves this phone`, sample-fallback visibility, failure-run never claiming 100%) are explicitly pinned.
- **Engine coverage gate (80% on `lib/**` + `engine/**`):** met — 97.25 / 88.99 / 98.90 / 98.49; `import-log.ts` at 100% on all four.
- **Mock strategy:** at the IO edge (`extract-client`, `pdf-extract`, `geocode`); engine never mocked; the real Zustand store is injected, never mocked.
- **Factory usage:** canonical — `RAW_MESSY`/`RAW_NO_JSON`/`RAW_NULLS` fixtures, `freshStore()`/`storeWithLocation()`/`newCaseInput()`/`newLocationInput()`, `okRun()` reused throughout.
- **Setup-shim traps:** none. The one reduced-motion test correctly overrides `window.matchMedia` before render; no test claims a live camera/canvas path.
- **Determinism (clock/entropy injected):** yes for the log bus (`beginRun(now)` everywhere, `expect(Date.now).not.toHaveBeenCalled()` asserted at `import-log.test.ts:34`); the real-clock reads inside `runImport` are provably non-load-bearing for the assertions made (see the refutation note above).
