# Parity P1 — Web lane findings (fix-delta)

- **Lane:** web (React/Next browser-platform: render + bundle perf, browser-API correctness, resource leaks, accessibility, inline-style discipline, marketing↔demo isolation)
- **Mode:** FIX-DELTA (re-review of the six fix branches merged after review commit `4a1f807`)
- **Repo:** `/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/7423d8f5-e7f4-4135-a726-296308b62d4d/scratchpad/worktrees/parity-p1`
- **Diff under review:** `master...feat/parity-p1` (PR #30); fix delta `4a1f807..HEAD` — 27 files, +1067/−252
- **Refs read:** `.claude/agents/web-reviewer.md`, `features/demo/CLAUDE.md`, `docs/code-reviews/parity/p1/p1-review.md` (R-2/R-3/R-7/R-14/R-15/R-16/R-17/R-18 are this lane's), the prior `lane-web.md` (WEB-1…WEB-8), `docs/code-reviews/deferred.md` §33–§36
- **Gates re-run in-worktree:** `npx tsc --noEmit` → clean · `npx vitest run features/demo/ui/screens/import features/demo/ui/chrome/__tests__/PdfPreview.test.tsx features/demo/ui/import` → 12 files / 133 tests passing · `npx next build` → clean, `/demo` **1.24 kB / 107 kB First Load JS (unchanged)**, marketing routes unchanged (`/` 121 kB, `/beta` 111 kB, shared 106 kB)

**Verdict: APPROVE.** All eight prior web-lane findings are genuinely fixed — the two MAJORs (R-2 keyboard-unreachable pin/pill, R-3 accname override) with tests that would fail on a revert. One new MINOR from the R-12 fix's blast radius (WEB-9). No BLOCKER, no MAJOR, no regression to the bundle boundary, resource lifetimes, styling half, or SSR posture.

---

# Fix-delta — per prior finding

| Prior | Aggregated | Sev | Verdict | Fix commit |
|---|---|---|---|---|
| WEB-1 | R-2 | MAJOR | **FIXED** | `a7497ed` |
| WEB-2 | R-3 | MAJOR | **FIXED** | `82b490c` |
| WEB-3 | R-14 | MINOR | **FIXED** (both halves) | `6dcfba7` (picker) + `c5412af` (terminal) |
| WEB-4 | R-15 | MINOR | **FIXED** | `8d52011` |
| WEB-5 | R-16 | MINOR | **FIXED** | `6dbffdf` |
| WEB-6 | R-17 | MINOR | **FIXED** | `a941d79` |
| WEB-7 | R-7 | MINOR | **FIXED** | `bd68a0d` |
| WEB-8 | R-18 | MINOR | **FIXED** | `91d0113` |

## WEB-1 / R-2 — keyboard users could never unpin the log — **FIXED**

`features/demo/ui/screens/import/ImportTerminalProgress.tsx:549-564` now makes the log a first-class keyboard target and treats scroll keys as user intent:

```tsx
tabIndex={0} role="log" aria-live="off" aria-label="Import log"
onScroll={handleScroll} onWheel={markUserScroll} onTouchMove={markUserScroll}
onPointerDown={markUserScroll} onKeyDown={handleKeyDown}
```

`handleKeyDown` (`:483-488`) reuses `markUserScroll` verbatim through `SCROLL_KEYS` (`:401` — Arrow/Page/Home/End/Space), so the "programmatic tail scroll never flips the pin" invariant at `:490` is untouched. `aria-live="off"` is present, per the aggregator's own correction (`role="log"` is implicitly polite) — `terminal-status` (`:516`) remains the sole polite region. Pinned in `__tests__/ImportTerminalProgress.test.tsx:292-323`: attribute assertions plus ArrowUp→unpin→pill-appears→tail-does-not-yank, PageDown→re-pin, and a negative case (`key: 'a'` must not arm the gate).

Re-verified downstream of the fix: the jump-pill sits after the log container in DOM (`:587`), i.e. behind the per-line disclosure buttons in tab order — but `End`/`PageDown` re-pins directly (asserted in the test), so keyboard users have a first-class equivalent and there is no dead end. Not a residual.

## WEB-2 / R-3 — `aria-label` suppressed the CTA's batch counts — **FIXED**

`aria-label` is gone; the accessible name is now the visible `cta.title` + `cta.sub`, and `cta.a11y` supplements via `aria-describedby="terminal-cta-desc"` on a **sibling** (not child) visually-hidden span (`:600-626`, `visuallyHidden` at `:279-286`). The sibling placement is the right call — inside the button it would have joined the accname. Tests assert the counts are in the name: `getByRole('button', { name: /Batch partially failed — 2 of 3, 1 needs attention/ })` + `toHaveAccessibleDescription(...)` (`__tests__/ImportTerminalProgress.test.tsx:436-437, 459-461, 481`). Label-in-Name (WCAG 2.5.3) now holds: the spoken label contains the visible text. §33's rule is satisfied.

## WEB-3 / R-14 — two new ungated `spin` animations — **FIXED (both halves)**

- Terminal: `Spinner({ reduce })` at `ImportTerminalProgress.tsx:300-316` — `animation: reduce ? undefined : 'spin 0.9s linear infinite'`, `reduce` threaded from the component (`:405`, `:632`). Asserted both ways (`test:241-253`).
- Picker: `PickerStage.tsx:98-120` gates on a per-render `prefersReducedMotion()` read, capability-guarded with `window.matchMedia?.(…)` (optional chaining short-circuits the whole chain, so a missing `matchMedia` yields `undefined`, never a throw) and `typeof window !== 'undefined'`. The deliberate asymmetry with the terminal (module-global caching in motion/react defeats per-test overrides) is documented at the call site and is on the orchestrator's do-not-re-flag list — not re-flagged.

Residual (pre-existing, explicitly optional in R-14, not taken): `features/demo/ui/screens/SyncStatusCard.tsx:59` still runs an ungated `spin`, as do `PhoneFrame.tsx:67`, `SplashScreen.tsx:38/51/59-61`, `_shared.tsx:71`, `PickerSheet.tsx:62`. All pre-date this PR and are outside the fix blast radius; noted, not filed.

## WEB-4 / R-15 — expanded dump was `aria-hidden` — **FIXED**

`TerminalLine.tsx:169-175` renders the expanded block with no `aria-hidden`; `DETAIL_AT_HIDE_THRESHOLD`/`isDump` are deleted and replaced by a comment (`:26-31`) that states why the phone's flood rationale doesn't transfer (collapsed-by-default disclosure + `aria-live="off"` log). The disclosure's `aria-expanded`/`aria-controls` now point at a node that genuinely exists in the a11y tree when open.

## WEB-5 / R-16 — focus stranded inside the sandboxed print frame — **FIXED**

`PdfPreview.tsx:52-60`: a `finally` around `win.focus(); win.print()` runs `window.focus()` then `saveBtnRef.current?.focus()` (ref wired at `:121`), so focus returns to parent chrome on every path — dialog shown, silently ignored, or thrown. Two tests pin it, including the throw path, and one drives `Escape` after a save to prove the document listener is live again (`__tests__/PdfPreview.test.tsx:131-155`).

## WEB-6 / R-17 — large-batch confirm unmounted the focused button — **FIXED**

`PickerStage.tsx:176-192` adds the focus choreography: the confirm container takes focus on mount (`tabIndex={-1}` + `ref`, `:265-273`), cancelling hands focus back to the "Pick File" card via `confirmWasOpen`, and a failed clipboard read restores focus to the clipboard card once it is re-enabled (`clipboardErrored` + the `isReadingClipboard` effect). `role="alertdialog"` without `aria-modal` is the documented deliberate choice (no focus trap exists) — not re-flagged.

Residual (pre-existing shape, not fix-introduced): on the **Continue** path the effect fires while `isLoading` is already true, so `fileCardRef.current?.focus()` targets a disabled button and focus lands on `<body>` — exactly what the ordinary (<25-file) path has always done when the stage flips to `progress`. This is the generic "no focus management across import stage transitions" gap, outside this fix's blast radius; noted, not filed.

## WEB-7 / R-7 — dead `TERM_ROW` import — **FIXED**

`ImportTerminalProgress.tsx:17` now imports `{ TerminalLine }` only.

## WEB-8 / R-18 — wrong reduced-motion hook for the demo half — **FIXED**

`ImportTerminalProgress.tsx:16` imports `useReducedMotion` from `motion/react`, matching `ScreenStage` / `WizardDrawer` / `ExploreChecklist`, with a header comment explaining the first-frame difference. Verified against the installed source rather than the docs: `framer-motion@12.42.0` `dist/framer-motion.dev.js:16057-16069` seeds `useState(prefersReducedMotion.current)` in the render body, and `initPrefersReducedMotion` (`:6798-6811`) is capability-guarded (`if (window.matchMedia)`) and uses `addEventListener('change', …)`, not the deprecated `addListener` — so no jsdom or SSR hazard from the swap. The test mocks the hook and states that reverting to the marketing hook would bypass the mock and fail (`test:4-12`).

---

# New findings introduced by the fix round

## WEB-9 [MINOR] features/demo/ui/chrome/PdfPreview.tsx:44-61

### Claim
The R-12 fix replaces "absence of a throw" with `beforeprint` as the **sole** success signal, but never feature-detects it. In a browser that prints fine yet does not implement the print events, `dialogOpened` stays `false` and the component asserts the opposite of the truth — *"Your browser blocked the print dialog for this preview — no PDF was saved"* — immediately after a print dialog opened and the visitor saved the PDF. The fix that exists to prevent a fake success now produces a fake failure on the same surface.

### Evidence
```tsx
// PdfPreview.tsx:44-61
let dialogOpened = false
const markOpened = () => { dialogOpened = true }
win.addEventListener('beforeprint', markOpened)
try { win.focus(); win.print() } finally { … }
setPrintNotice(dialogOpened ? null : PRINT_BLOCKED_NOTICE)
```
There is no `'onbeforeprint' in win` probe anywhere in the file, and the test suite models only the supported world — `stubDialogPrint` dispatches `beforeprint` from the `print` stub (`__tests__/PdfPreview.test.tsx:16-24`), so the unsupported-browser path is untested by construction.

Refutation work (why this is MINOR, not MAJOR):
- I checked the three engines that matter and they all fire it **synchronously inside `print()`**, so no modern browser hits this: Chromium and WebKit block on the print dialog; Gecko no longer blocks but dispatches the print events around the static clone (the "afterprint fires early" behaviour of bugzilla 1685011), i.e. still before `print()` returns. `beforeprint` also fires at the *printed* document's global — the iframe's window — which is what the code listens on.
- Safari **does** support the events from Safari 13 / iOS Safari 13 (caniuse `beforeafterprint`; mdn/browser-compat-data#5313).
- Residual exposure is the ~6.9% of caniuse global usage without support — Safari/iOS Safari ≤12, Opera Mini, legacy Android Browser / Samsung Internet / UC. Several of those cannot open a print dialog at all, so the honest-notice text is arguably right there anyway.

What keeps it on the list: the surface's stated contract is *"never a fake success"* (`PRINT_BLOCKED_NOTICE`, `:14-16`), the demo is a public marketing-site surface, and the guard is one line — this is precisely the lane's "capability check missing — feature-detect before calling" rule.

### Suggested fix
Probe for the signal and only claim "blocked" when the signal is trustworthy:
```tsx
const canDetect = 'onbeforeprint' in win        // the caniuse detection method
…
setPrintNotice(!canDetect || dialogOpened ? null : PRINT_BLOCKED_NOTICE)
```
(or keep the notice but soften its wording on the undetectable path). Add the mirror test to the two R-12 cases: a `print` stub that does **not** dispatch `beforeprint`, on a window where `onbeforeprint` is absent, must not show the blocked notice.

### Confidence
High on the mechanism and on the compat data; the severity is deliberately MINOR because every browser that can realistically reach this screen fires the event.

---

# Re-checked and NOT filed (recorded so they are not re-litigated)

| Check | Result |
|---|---|
| Marketing↔demo wall | `grep -rn "features/demo" components app/(default) lib` → only the documented comment in `components/marketing/phone-frame.tsx:7`. **Preserved.** |
| Bundle shape after the fixes | `ImportTerminalProgress` now takes a **value** import (`SAMPLE_FALLBACK_PREFIX`) from `ui/import/run-import.ts`, upgrading a type-only edge to a runtime one. No cost: `DemoExperience` already statically imports `runImport`/`runPdfImport` from that module, and `pdfjs-dist` remains behind `await import` in `pdf-extract.ts:21`. `next build` confirms `/demo` unchanged at 1.24 kB / 107 kB. |
| `package.json` / lockfile / `next.config.js` / `postcss.config.js` / `app/css/**` | Untouched by the fix round. |
| Styling half | Zero `className` in any touched demo file; all additions are inline `CSSProperties`. `demo.css` untouched by the fix round (still no Google-Fonts `@import`; only the guard comment at `:10`). Device math untouched. |
| Resource cleanup | New listener in `PdfPreview` (`beforeprint`) is removed in a `finally` on every path; `PickerStage`'s two new effects hold no subscriptions; `useImportLog`'s rAF/unsubscribe teardown (`useImportLog.ts:98-103`) is unchanged. No new timers, no `createObjectURL`. |
| Render perf | The fixes are net-negative work: the terminal **removed** an effect (`lastViewRef`) in favour of the bridge-tracked `lastRealStage` prop, and `TerminalLine` dropped the `isDump` computation. `importStageFor(myGen)` allocates once per run, not per render. `lastRealStage` rides the existing `setImp` updaters — no added commits. `TerminalLine` stays `memo`'d with the same prop identities. |
| Spurious unpin via the new `' '` key entry | Considered: Space on a line's disclosure button bubbles to the log's `onKeyDown` and arms `userScrollRef` without scrolling. Traced every consumer — the flag is only read inside `handleScroll`, and every path that can then fire a scroll (tail scroll, scroll anchoring) recomputes `isNearBottom` from live metrics, so the pin lands on the truth. Not a defect. |
| `aria-controls` on a collapsed row | `TerminalLine.tsx:161` references `detailId` while the block is only rendered when expanded. Pre-existing (the conditional render predates the fix) and ignored by AT; out of the fix blast radius. |
| Deliberate choices honoured | picker-vs-terminal reduced-motion asymmetry, `alertdialog` without `aria-modal`, flat `ImportState` (§36), dropped `businessName` (§35), no virtualization at the 400-line cap, dwell semantics, trust-line wording — none re-flagged. |
| Known flake class | Not filed. (If the team wants it closed, the actionable version is extending R-6-style explicit `waitFor` timeouts to the picker-suite trio — a tests-lane MINOR at most.) |

# Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 1 |

- **Prior findings:** 8/8 FIXED (2 MAJOR, 6 MINOR) — each with a code-level fix and, for all but the dead-import cleanup, a test that fails on revert.
- **Marketing↔demo isolation:** preserved. **Bundle impact:** none (`/demo` 107 kB First Load JS, identical to the pre-fix build).
- **Browser-resource cleanup:** complete. **Accessibility:** the two MAJOR a11y gaps are closed; no new gaps.
- **Style-convention adherence:** correct half throughout; lifted pixel rules and device math untouched.
