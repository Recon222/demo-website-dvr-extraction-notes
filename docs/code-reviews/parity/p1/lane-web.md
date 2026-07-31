# Parity P1 — Web lane findings (fix-delta ROUND 2)

- **Lane:** web (React/Next browser-platform: render + bundle perf, browser-API correctness, resource leaks, accessibility, inline-style discipline, marketing↔demo isolation)
- **Mode:** FIX-DELTA round 2 — re-review of the **round-2 fixes only** (three branches merged after review commit `3d03bbb`: `parity/p1-fix2-terminal`, `parity/p1-fix2-pdfsave`, `parity/p1-fix2-logbus`). Delta = `3d03bbb..feat/parity-p1`, 12 files, +329/−59 (6 non-doc production/test files).
- **Repo:** `/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/7423d8f5-e7f4-4135-a726-296308b62d4d/scratchpad/worktrees/parity-p1`
- **Diff under review:** `master...feat/parity-p1` (PR #30)
- **Refs read:** `.claude/agents/web-reviewer.md`, `features/demo/CLAUDE.md`, `docs/code-reviews/parity/p1/p1-review-fixdelta.md` (R-35…R-44; **R-36 is this lane's**, merged from my prior WEB-9), my prior `lane-web.md` (WEB-1…WEB-9), `docs/code-reviews/deferred.md` §33–§36 + the round-2 §36 addendum.
- **Gates re-run in-worktree (this round):** `npx tsc --noEmit` → **clean** · `npx vitest run` full suite → **132 files / 1078 tests passed**, zero `act()` warnings · targeted `PdfPreview` + `screens/import` suites → 7 files / 96 tests passed · `npx next build` → clean, **`/demo` 1.24 kB / 107 kB First Load JS — identical to the pre-fix build**; marketing unchanged (`/` 121 kB, `/beta` 111 kB, `/features/[slug]` 119 kB, shared 106 kB).
- **Deliberate choices honoured (not re-flagged):** run-scoped `runHadSampleFallback` deliberately distinct from segment-scoped `deriveTrust`; the synthetic `UNEXPECTED_ERROR` row being bridge-only and unmapped; `win.focus()` on the frame kept while `window.focus()` on the parent was dropped; deferred §§29–36; D5 adaptations; dwell semantics; trust-line wording; the known 5s-timeout load-flake class.

**Verdict: APPROVE.** My lane's one prior finding (R-36, both merged mechanisms) is genuinely **FIXED**, and the fix hardens beyond the prescribed sketch (which itself leaked the listener on the synchronous-success path). Every previously-closed web fix (R-2, R-3, R-14, R-15, R-16, R-17, R-7, R-18) is still in place and still test-pinned. No bundle, boundary, SSR, styling-half, resource-lifetime or accessibility regression was introduced by the round-2 fixes. One new MINOR (WEB-10) — a residual of my own R-36 fix: the one-macrotask grace does not span the deferral window its own comment names, and the late signal is discarded instead of retracting a wrong notice.

---

# Fix-delta — per prior finding

| Prior (aggregated) | Lane(s) | Sev | Verdict | Fix commit |
|---|---|---|---|---|
| **R-36** (my WEB-9 + typescript's deferred-dispatch half) | web + typescript | MINOR | **FIXED** (residual → WEB-10) | `28cf5c7` |
| R-37 (typescript; same file, web-visible focus behaviour) | typescript | MINOR | **FIXED** — spot-checked, no focus regression | `2bbfa7e` |
| R-35 (silent-failures/TS/type-design; web-visible CTA surface) | other lanes | MAJOR | **FIXED** — spot-checked for a11y / render-perf blast radius only | `7249809` |
| R-38 · R-39 · R-40 · R-41 · R-42 · R-43 · R-44 | other lanes | MINOR | not my lane — swept for web regressions only (none found) | `ca0df27`, `ee2e5d9`, `819bd12`, `f6e2202`, `6a0891b` |

## R-36 — no capability probe (web half) + synchronous-dispatch assumption (TS half) — **FIXED**

**Fix commit:** `28cf5c7` "fix(demo): harden the beforeprint success signal — capability probe + one-macrotask grace".

Both mechanisms are addressed at `features/demo/ui/chrome/PdfPreview.tsx:50-80`:

```tsx
const canDetect = 'onbeforeprint' in win                       // :50  ← my WEB-9 half
let dialogOpened = false
const markOpened = () => { dialogOpened = true }
win.addEventListener('beforeprint', markOpened)                // :55
try { win.focus(); win.print() }                               // :56-58
catch (err) { win.removeEventListener('beforeprint', markOpened); throw err }  // :59-61
finally { saveBtnRef.current?.focus() }                        // :62-71  (R-16 preserved)
if (!canDetect || dialogOpened) {                              // :72
  win.removeEventListener('beforeprint', markOpened); setPrintNotice(null)
} else {
  window.setTimeout(() => {                                    // :76  ← TS half (grace)
    win.removeEventListener('beforeprint', markOpened)
    setPrintNotice(dialogOpened ? null : PRINT_BLOCKED_NOTICE)
  }, 0)
}
```

- **Capability half (mine).** `'onbeforeprint' in win` is the caniuse-documented detection method for `beforeafterprint`, evaluated against the **frame's** window — the global the printing steps fire at, and the one the listener is attached to. On an engine without the print events the component degrades to absence-of-throw instead of branding every successful save "blocked", exactly as suggested. Falsifiably pinned at `__tests__/PdfPreview.test.tsx:148` (deletes `win.onbeforeprint`, stubs a silent `print`, asserts **no** `role="status"` node) — delete the probe and the deferred branch paints the notice, failing the test.
- **Timing half.** The verdict is deferred one macrotask (`:76-79`), pinned at `__tests__/PdfPreview.test.tsx:160` with a `print` stub that dispatches `beforeprint` from its own `setTimeout(0)` (registered before the component's verdict timer, so the ordering is deterministic). Judge synchronously again and the test fails.
- **Beyond the prescribed sketch (verified).** The review's suggested snippet left the listener attached on the *synchronous success* path — it removed it only inside the deferred timer. The shipped code removes it on **all four** exits: early return before attachment (`:35-38`), throw (`:60`), sync verdict (`:73`), deferred verdict (`:77`). I traced every exit of `printDocument`; no listener survives a print attempt.
- **R-12's core property survives.** Absence-of-throw is still not success on a detecting engine (`__tests__/PdfPreview.test.tsx:137`, now `await findByRole`), and "a silently-ignored retry must not clear a prior failure notice" still passes with the deferred flush (`:198`).

**Residual → WEB-10:** the one-macrotask grace is narrower than the deferral window mechanism (b) names, and the late signal is thrown away rather than used to retract a wrong notice.

## R-37 — dead `window.focus()` in the print `finally` — **FIXED** (cross-lane spot-check)

`2bbfa7e` deleted the line; `PdfPreview.tsx:62-71` now runs only `saveBtnRef.current?.focus()` in the `finally`, with a comment recording why that is the load-bearing call. **No web regression:** focusing an element in the parent document runs the focusing steps against the top-level traversable and implicitly blurs the frame's focused area, so R-16's guarantee (the parent document's Escape `keydown` listener reachable after a save — deferred §21) holds without `window.focus()`. The load-bearing `win.focus()` at `:57` is untouched, as the doc required. R-16's two tests (including the throw path) and the Escape-after-save test still pass.

*Accuracy note on the finding's secondary claim:* the jsdom `Not implemented: Window's focus() method` noise is **reduced, not eliminated** — 12 lines still emit from the kept `win.focus()` at `:57` during the `PdfPreview` suite. Expected (jsdom implements `focus()` on no Window), not a residual of the fix.

## R-35 — run-scoped CTA sample attribution — **FIXED** (web-surface spot-check only)

Not my lane's finding; checked only for accessibility and render-performance blast radius on the dwell surface:

- `runHadSampleFallback` (`ImportTerminalProgress.tsx:123`) is a second `useMemo`-guarded O(n) scan of `lines` alongside `deriveTrust` (`:451-452`). At the 400-line ring cap, rAF-batched, that is a few hundred string comparisons per commit — immaterial; folding both into one pass would be speculative micro-optimisation, which this lane's false-positive list rules out.
- The attribution is **not colour-only** (deferred §23's class): the amber `sample import — review →` is literal text inside the CTA, and since R-3 the accessible name *is* the visible title + sub — so a screen-reader user hears the substitution disclosure, not just a colour change (`:620-641`). WCAG 2.5.3 Label-in-Name still holds.
- No new prop, state, effect, listener or timer; `cta` was already rebuilt per render. No re-render change, and nothing new was lifted into the store bridge.

## Regression sweep of the already-closed web fixes (R-1…R-34)

| Closed item | Still in place? | Evidence |
|---|---|---|
| R-2 keyboard-first-class log | ✓ | `ImportTerminalProgress.tsx:575-582` (`tabIndex={0}`, `role="log"`, `aria-live="off"`, `aria-label`, `onKeyDown`) — untouched by round 2 |
| R-3 CTA accname = visible text | ✓ | `:620-641` — no `aria-label` on the CTA; sibling `#terminal-cta-desc` describedby span intact |
| R-14 reduced-motion gates | ✓ | `Spinner reduce={reduce}`, cursor `animation: reduce ? undefined : …` (`:597`), CTA fade (`:632`); `PickerStage.tsx:98-104` probe intact; no new animation added this round |
| R-15 expanded dump AT-readable | ✓ | `TerminalLine.tsx` untouched except a test rename |
| R-16 focus returned after print | ✓ | `PdfPreview.tsx:70` + tests (incl. the throw path) |
| R-17 picker focus choreography | ✓ | `PickerStage.tsx:183-190` untouched |
| R-7 dead import | ✓ | no re-introduction |
| R-18 `motion/react` reduced-motion hook | ✓ | `ImportTerminalProgress.tsx:16` |
| Marketing↔demo wall | ✓ | `grep -rn "features/demo" components app/(default) lib` → only the documented comment in `components/marketing/phone-frame.tsx:7` and the guard test itself |

---

# New findings introduced by the round-2 fixes

## WEB-10 [MINOR] features/demo/ui/chrome/PdfPreview.tsx:72-80

### Claim
R-36's mechanism (b) is documented as covering engines that *"postpone the printing steps (and the beforeprint they fire) **while the frame is still loading**"* (`:47-49`), but the grace implemented is a single `setTimeout(…, 0)` and the listener is **torn down when that timer fires** (`:77`). Frame-load deferral is not bounded by one macrotask — it ends at the frame's `load`, which for this component's `srcDoc` document can be several tasks out (the time-offset report embeds an `<img src="data:…">` of the OCR capture — `features/demo/engine/logic/pdf/time-offset.ts:113-117`). A "Save as PDF" click inside that window therefore still produces the definitive amber *"Your browser blocked the print dialog for this preview — no PDF was saved"* over a print that then opens and succeeds — the mirror fake-failure R-36 exists to prevent — and because `markOpened` is unsubscribed at T+0, the late signal that *proves* the print happened can no longer clear the wrong notice. The pending timer is also never cleared when the overlay unmounts, so the verdict closure fires against a detached frame (harmless today — React 19 no-ops the state write — but it is the one untorn-down timer in a component that otherwise cleans up every listener).

### Evidence
```tsx
// PdfPreview.tsx:72-80
if (!canDetect || dialogOpened) {
  win.removeEventListener('beforeprint', markOpened)
  setPrintNotice(null)
} else {
  window.setTimeout(() => {
    win.removeEventListener('beforeprint', markOpened)          // ← a late signal can no longer land
    setPrintNotice(dialogOpened ? null : PRINT_BLOCKED_NOTICE)  // ← verdict becomes final
  }, 0)
}
```
The component's own comment at `:47-49` names load-time postponement as the mechanism being defended against; a 0 ms macrotask does not span it. The round-2 test that pins the grace (`__tests__/PdfPreview.test.tsx:160`) demonstrates the exact boundary — it passes only because its stub's dispatch timer is registered *before* the component's verdict timer; move the dispatch to a `load` handler (the real deferral shape) and the notice reappears. No test covers beyond-one-task dispatch, by construction.

Refutation work (why MINOR, not MAJOR):
- Reachability is low: the visitor must click "Save as PDF" before the `srcDoc` frame finishes loading. The overlay animates in over `screenIn 0.3s` (`:105`) and the document is self-contained (no network fetches; the only embedded resource is a data URL), so load typically completes well before a deliberate click.
- The failure is a wrong notice in the honest direction (claims failure over a success), not data loss, and the visitor's own print dialog contradicts it immediately.
- Everything the prior review prescribed *is* implemented; this is the residual the prescription itself carried.

### Suggested fix
Let a late signal win instead of freezing the verdict, and tear the listener down with the component rather than with the timer — ~4 lines:
```tsx
const markOpened = () => {
  dialogOpened = true
  setPrintNotice(null)   // a beforeprint at ANY time proves the dialog opened
}
// keep the listener alive until the next attempt or unmount:
listenerCleanupRef.current?.()
listenerCleanupRef.current = () => win.removeEventListener('beforeprint', markOpened)
// …and in an effect: return () => { listenerCleanupRef.current?.(); clearTimeout(verdictTimerRef.current) }
```
Keep the `setTimeout(0)` verdict as-is (it is the honest "no signal yet" moment); the difference is that a later `beforeprint` retracts the notice. Add one test: dispatch `beforeprint` two macrotasks after `print()` returns and assert the `role="status"` notice is gone.

### Confidence
High on the mechanism and the code path (both cited from the shipped file and its own comment); deliberately MINOR on severity because the click-during-load window is narrow and the outcome is a retractable notice, not lost work.

---

# Re-checked and NOT filed (recorded so they are not re-litigated)

| Check | Result |
|---|---|
| `!canDetect` clears a prior genuine failure notice (`:72-74`) | **Not a defect.** On an engine with no print events there is no positive signal to distinguish a swallowed retry from a successful one; the degrade to absence-of-throw is what the review prescribed, is disclosed in the adjacent comment (clause (a), `:45-46`), and is test-pinned at `PdfPreview.test.tsx:148`. Preserving the stale notice instead would be the opposite lie. |
| Deferred-verdict state write after unmount | No warning in React 19 and no listener leak (the timer's own callback removes it). Folded into WEB-10's suggested cleanup rather than filed separately. |
| `role="status"` notice inserted together with its content | Pre-existing conditional render (`:135-137`), unchanged by round 2 — R-36 only moved *when* the same insertion happens. Out of the fix blast radius. |
| Double-click / interleaved verdicts in `PdfPreview` | Traced: each attempt owns its own `dialogOpened` + `markOpened` closure, and a 0 ms timer always settles before the next user task. No cross-talk. |
| `win` identity across `html`/`title` prop changes | Same-origin `srcDoc` navigation preserves the `WindowProxy`, so a deferred `removeEventListener` still targets the right global. |
| Bridge re-render shape after R-38/R-39/R-40 | `importStageFor` (`DemoExperience.tsx:402-406`) now returns **before** calling `setImp` on a stale token (previously it returned the same state object from inside the updater) — strictly fewer updates, and React's bail-out is no longer relied upon. The catch's two `setImp` calls are auto-batched (React 19 batches post-`await` updates). `lastRealStageRef` is written in event scope only (`:404`, `:586`, `:619`), never during render. No new state was lifted into the bridge, and no new store subscription was added. |
| `finishImport` now pinning `stage: 'progress'` (R-39) | Checked for a resurrect-the-dwell regression: every call site sits behind an `importGen` token check, and the picker rejects an empty selection (`PickerStage.tsx:217`), so the zero-file path cannot reach it. No overlay state is re-opened after cancel/Escape. |
| Synthetic failure row's `filename: 'import'` (`DemoExperience.tsx:555`) rendered by `FailuresCard` (`ImportModal.tsx:188`) | Copy/UX nit on another lane's fix (it reads `import — The import failed unexpectedly…` beside real filenames). Deliberate per the round-2 design; not a browser-platform defect. Not filed. |
| Styling half | Zero `className` in any round-2-touched demo file; every addition is inline `CSSProperties`. `demo.css`, `app/css/**`, `postcss.config.js`, `next.config.js` untouched this round. Device math and lifted pixel rules untouched. |
| Bundle / boundary | `package.json` gained only `"typecheck": "tsc --noEmit"` — no dependency, no import-shape change. `mapbox-gl` and `pdfjs-dist` remain behind `await import`. `next build` re-run: `/demo` 1.24 kB / 107 kB First Load JS, identical to the pre-fix build; marketing routes unchanged. |
| New animations / reduced-motion gaps | None added in round 2. |
| Browser globals at module scope | None added; `'onbeforeprint' in win` and `window.setTimeout` both live inside the click handler. |
| Unvirtualized log at the 400-line cap | R-42's new counting test (`ImportTerminalProgress.memo.test.tsx`) makes the no-re-render invariant that justifies shipping without virtualization falsifiable — the perf claim this lane cares about is now better pinned, not worse. |

# Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 1 |

- **Prior lane finding (R-36):** FIXED — both merged mechanisms, leak-free teardown on all four exits, two falsifiable tests. One residual filed as WEB-10.
- **Marketing↔demo isolation:** preserved. **Bundle impact:** none (`/demo` 107 kB First Load JS, unchanged).
- **Browser-resource cleanup:** complete except WEB-10's uncleared verdict timer (no leak today). **Accessibility:** no regressions; the R-35 CTA change strengthens the disclosure for AT users.
- **Style-convention adherence:** correct half throughout; lifted rules and device math untouched.
