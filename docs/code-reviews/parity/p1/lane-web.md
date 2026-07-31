# Parity P1 — Web lane findings

- **Lane:** web (React/Next browser-platform: render + bundle perf, browser-API correctness, resource leaks, accessibility, inline-style discipline, marketing↔demo isolation)
- **Mode:** INITIAL (full review of the diff)
- **Repo:** `/private/tmp/claude-501/-Users-fvadev-Developer-extraction-notes-DVR-Extraction-Notes-ReactNative/7423d8f5-e7f4-4135-a726-296308b62d4d/scratchpad/worktrees/parity-p1`
- **Diff:** `master...feat/parity-p1` (PR #30 — P1.1 fonts, P1.2 picker/paste, P1.3 log bus, P1.4 live terminal, P1.5 dwell + error enrichment, P1.6 real PDF saves, + 10 P0 rider minors) — 58 files, +4427/−329
- **Contracts read:** `.claude/agents/web-reviewer.md`, `features/demo/CLAUDE.md`, `docs/code-reviews/deferred.md` (incl. the new §33/§34/§35)
- **Gates run in-worktree:** `npx tsc --noEmit` → clean · `pnpm vitest run` → 131 files / 1048 tests passing · `pnpm build` → compiles; route table below.

## Gates / sweeps that came back clean (recorded so they are not re-checked)

| Check | Result |
|---|---|
| Marketing↔demo wall (`grep -rn "features/demo" components app/(default) lib`) | Only the documented comment in `components/marketing/phone-frame.tsx:7` + the guard test itself. **Preserved.** |
| Heavy deps still lazy | `mapbox-gl` (`MapCanvas.tsx:122`) and `pdfjs-dist` (`pdf-extract.ts:21`) remain `await import(...)`. No new static heavy import. |
| Dependencies / build config | `package.json`, `pnpm-lock.yaml`, `next.config.js`, `postcss.config.js`, `app/css/**` **untouched** by this diff. No bundle-boundary change. |
| Bundle | `/demo` 1.24 kB / 107 kB First Load JS; shared 106 kB; marketing routes unchanged in shape. All new P1 code lands inside the `ssr:false` demo chunk. |
| P1.1 font migration | `demo.css` no longer `@import`s Google Fonts; every `'Share Tech Mono'` / `'JetBrains Mono'` stack across `features/**`, `app/**`, `components/**`, `lib/**` is now `var(--font-stmono)…` / `var(--font-jbmono)…` (verified by grep over `.ts`/`.tsx`/`.css`, not just the `.tsx` the new `fonts.test.ts` scans). `app/layout.tsx` already sets both vars on `<body>`; `/demo` is under the root layout so it inherits them. Render-blocking runtime `@import` removed — a real perf win. |
| Styling half | Zero `className` in `features/demo/ui/screens/import/**`, `features/demo/ui/import/**`, `chrome/PdfPreview.tsx`. Inline `CSSProperties` throughout, `demo.css` additions are keyframes only. Device math (`404 = 378 + 13×2`, `minHeight: 786`) untouched. |
| New keyframes | `termCursorBlink` / `termFadeIn` do not duplicate an existing keyframe in `demo.css` or `style.css`. |
| Resource cleanup | `useImportLog` cancels its rAF/timer and unsubscribes on unmount (`useImportLog.ts:98-103`); `PdfPreview` and `ModalShell` remove their `document` keydown listeners; no `createObjectURL`, no new `setInterval`, no new manual `addEventListener` without teardown. The `importLogBus` singleton is ring-capped at 400 lines with emit-site detail clipping (1200/1400 chars) — bounded retention, not a leak. |
| Browser globals | `navigator` is read inside `defaultReadClipboardText()` behind `typeof navigator === 'undefined' \|\| !navigator.clipboard?.readText` (`PickerStage.tsx:56-61`), never at module scope. `window.print` is reached through `frameRef.current?.contentWindow` with a `typeof … !== 'function'` guard and a try/catch that surfaces an honest notice. No SSR hazard. |
| Render perf | Log lines flow bus → `useImportLog` → `ImportTerminalProgress` only; `DemoExperience`'s `setImp` fires once per file, not per line, so the phone subtree does not re-render per log line. `TerminalLine` is `memo`'d with stable `line`/`expanded`/`onToggleDetail` identities, so appends mount new rows without re-rendering history. The no-virtualization decision at the 400-row cap is reasoned in the file header (and is a stated deliberate choice). |
| Store-bridge rule | `useImportLog` subscribes to the bus, not the Zustand store; no new component under `ui/` imports the store. |

---

## WEB-1 [MAJOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:420

### Claim
The terminal log's pin/unpin state — and therefore the entire `jump-to-latest-pill` control — is reachable **only** by `wheel` or `touchmove`. A keyboard-only visitor can never unpin, so (a) the tail effect drags them back to the bottom on every new line for the whole duration of a run, and (b) the jump-to-latest button is never rendered for them at all. This is a WCAG 2.1.1 (Keyboard, Level A) failure on a brand-new interactive control.

### Evidence
`handleScroll` hard-gates on a flag that only pointer gestures set:

```tsx
// ImportTerminalProgress.tsx:417-427
const markUserScroll = useCallback(() => { userScrollRef.current = true }, [])
const handleScroll = useCallback(() => {
  if (!userScrollRef.current) return // programmatic tail scroll — never flips the pin
  userScrollRef.current = false
  ...
  setPinned(isNearBottom({ ... }))
}, [])
```

and the only two producers of that flag are pointer events (`:484-486`):

```tsx
onScroll={handleScroll}
onWheel={markUserScroll}
onTouchMove={markUserScroll}
```

Consequences, all verifiable in the same file:
- `pinned` is initialised `true` (`:353`) and can only ever be set `false` inside `handleScroll`. Arrow-key / PageUp / Home scrolling fires `scroll` but **not** `wheel`, so `handleScroll` early-returns and `pinned` stays `true` forever.
- The pill is gated on `!pinned` (`:509`), so it is never mounted for a keyboard user — an interactive control with zero keyboard reachability.
- While pinned, the tail effect re-yanks on every commit: `if (pinnedRef.current) el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight)` (`:414`).
- Scrollbar-drag is not an escape hatch: `demo.css:53-61` hides scrollbars for everything under `[data-phone='frame']`, and `PhoneOverlayPortal` mounts the modal inside that subtree (`phone-overlay.tsx:8-13`, `PhoneFrame.tsx:33`).
- Chrome's "keyboard focusable scrollers" does not save this either: it only auto-focuses scrollers with **no** focusable descendants, and this log contains `<button>` rows (`TerminalLine.tsx:152-160`).
- The existing tests confirm the gap is untested rather than intentional-and-covered: every pin assertion in `screens/import/__tests__/ImportTerminalProgress.test.tsx:212/239/243/255/280` drives `fireEvent.wheel`; there is no keyboard case.

The lane contract requires this: *"Keyboard reachability of custom widgets — the repo has combobox/listbox/option, menu/menuitemradio, checkbox roles in the pickers; new ones must be arrow-key navigable and Escape-dismissible."*

### Suggested fix
Two small additions on the log container (`:480-487`), no change to the phone-parity pin semantics:

1. Make the scroller a first-class keyboard target and name it: `tabIndex={0}` plus `role="log"` and `aria-label="Import log"` (keeps it out of the auto-announced live-region path — the `terminal-status` headline stays the polite region).
2. Treat scroll keys as user intent, exactly like wheel/touch:
   ```tsx
   onKeyDown={(e) => {
     if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key)) markUserScroll()
   }}
   ```
   `markUserScroll` already exists; this reuses it verbatim so the "programmatic tail scroll never flips the pin" invariant is untouched.

Add a keyboard twin of the existing `fireEvent.wheel` pin test.

### Confidence
High — mechanism traced end to end in source; the "no scrollbar to drag" and "Chrome scroller focus doesn't apply" refutations were both checked and fail.

---

## WEB-2 [MAJOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:522

### Claim
`aria-label={cta.a11y}` on the outcome CTA **overrides** the button's visible text as its accessible name. Screen-reader users therefore never hear the batch counts that are the whole point of the success/partial treatment, and the control fails WCAG 2.5.3 (Label in Name, Level A). It also directly contradicts the rule this same PR wrote into `deferred.md §33`.

### Evidence
```tsx
// ImportTerminalProgress.tsx:519-536
<button type="button" data-testid="terminal-review-cta" aria-label={cta.a11y} onClick={onReview} …>
  {cta.icon}
  <span …>
    <span style={{ ...badgeTitleStyle, color: cta.titleColor }}>{cta.title}</span>
    <span style={badgeSubStyle}>{cta.sub}</span>
  </span>
```

With `aria-label` present, accname resolution stops at step 2C — the inner text is never used. Concretely (`ctaView`, `:294-334`):

| Visible text | Announced instead |
|---|---|
| `Batch complete — 2 of 3 locations` + `Review import →` | "Review the import before it saves" |
| `Batch partially failed — 2 of 3, 1 needs attention` + `Review import →` | "Review the import — some files failed" |
| `Import failed` + `See error details →` | "See error details" |

- The counts are not recoverable elsewhere on this surface: the polite live region (`:447`) renders `cta.headline`, which is the count-free `'Batch complete'` / `'Batch partially failed'` (`:303/:318`). On a forensic surface, "2 of 3 succeeded, 1 needs attention" is the load-bearing fact.
- Label in Name: `"Review import"` is not a substring of `"Review the import before it saves"`, so voice-control users cannot activate the button by speaking its visible label.
- The team already ruled on exactly this, in this PR: `docs/code-reviews/deferred.md` §33 — *"Phone `accessibilityLabel`s not mirrored as `aria-label`s on the cards/submit. On the web an aria-label **overrides** the visible text as the accessible name; the phone's labels … don't start with the visible text, which is the WCAG label-in-name anti-pattern."* The picker followed that rule; the terminal CTA does not.
- The sibling control in the same file gets it right — `aria-label="Jump to latest log line"` with visible text `latest` (`:510-512`) — so this is an inconsistency, not a house style.

### Suggested fix
Drop `aria-label` from the CTA and let the visible `cta.title` + `cta.sub` be the accessible name (that is the richer string anyway). If the extra framing in `cta.a11y` is worth keeping, attach it with `aria-describedby` pointing at a visually-hidden span, so it supplements rather than replaces the name. Keep `cta.a11y` as the phone-parity record if the port table needs it, but stop wiring it to `aria-label`.

### Confidence
High — accname precedence is unambiguous; the count-loss and the §33 contradiction are both grounded in files in this diff.

---

## WEB-3 [MINOR] features/demo/ui/screens/import/PickerStage.tsx:95

### Claim
Two **new** infinite `spin` rotation animations are added with no `prefers-reduced-motion` gate, in the same feature where the two other new animations (`termCursorBlink`, `termFadeIn`) *are* gated — an internal inconsistency, and the exact case the demo's reduced-motion contract covers (the demo's inline-styled motion is gated in JS because `style.css`'s `prefers-reduced-motion` block is class-matched only).

### Evidence
```tsx
// PickerStage.tsx:93-99
<svg … style={{ animation: 'spin 0.9s linear infinite' }}>
// ImportTerminalProgress.tsx:268-274
<svg … style={{ animation: 'spin 0.9s linear infinite', flexShrink: 0 }}>
```
versus the gated siblings in the same component:
```tsx
// ImportTerminalProgress.tsx:500
animation: reduce ? undefined : 'termCursorBlink 1s step-end infinite',
// ImportTerminalProgress.tsx:529
animation: reduce ? undefined : 'termFadeIn 350ms ease both',
```
`reduce` is already in scope in `ImportTerminalProgress` (`:348`), so the terminal spinner is a one-token fix.

**Completeness sweep (fold into one fix):** the pre-existing sibling `features/demo/ui/screens/SyncStatusCard.tsx:59` uses the same ungated `spin`. That is the precedent this diff followed; fixing all three together is the clean outcome (a shared `<Spinner reduce>` or a `reduce`-aware style helper).

### Suggested fix
Thread the existing `reduce` flag into both new spinners (`animation: reduce ? undefined : 'spin 0.9s linear infinite'`, with the SVG still visible as a static glyph, or swap to a non-rotating "busy" treatment). Sweep `SyncStatusCard.tsx:59` in the same commit.

### Confidence
High on the facts; MINOR because an ungated spinner is the repo's existing precedent and the blast radius is one small glyph.

---

## WEB-4 [MINOR] features/demo/ui/screens/import/TerminalLine.tsx:171

### Claim
The expanded detail block is `aria-hidden` whenever it exceeds 120 chars, so for a screen-reader user the disclosure button toggles `aria-expanded` while nothing appears in the accessibility tree — and `aria-controls` points at a node that is hidden from AT. The phone's rationale (don't flood the reader) doesn't transfer: nothing here auto-announces the detail, and the user opted in by activating the button.

### Evidence
```tsx
// TerminalLine.tsx:130-176
const isDump = hasDetail && (line.detail as string).length > DETAIL_AT_HIDE_THRESHOLD
…
<button type="button" onClick={() => onToggleDetail(line.seq)} aria-expanded={expanded} aria-controls={detailId} …>
…
{hasDetail && expanded && (
  <div id={detailId} data-testid={detailId} aria-hidden={isDump || undefined} style={blockStyle}>
    <pre style={blockTextStyle}>{line.detail}</pre>
  </div>
)}
```
The log container is not a live region (the polite region is the separate `terminal-status` headline, `ImportTerminalProgress.tsx:447`), so an expanded `<pre>` would only be read when the user navigates to it — which they can skip. The flooding risk the phone guards against does not exist on this surface; the cost (a disclosure control that is a no-op for AT) does.

### Suggested fix
Drop `aria-hidden` from the expanded block and let the `<pre>` be readable. If verbosity is still a concern, keep the dump reachable but non-verbose by leaving it out of the *live* region only, or add a short visible summary line above it ("prompt · 1,247 chars"). If the current behaviour is genuinely intended, at minimum remove `aria-controls` (it must not reference an AT-hidden node) and add `aria-disabled`-style honesty so the toggle isn't advertised to AT.

### Confidence
Medium-high — the code is unambiguous; the judgement call on whether to expose dumps is the team's, so this is filed MINOR.

---

## WEB-5 [MINOR] features/demo/ui/chrome/PdfPreview.tsx:35

### Claim
`win.focus()` moves focus into the sandboxed `srcDoc` iframe. Keydown events inside that separate document do not reach the parent's `document` listener, so the Escape-to-close affordance added by this very commit stops working after the visitor clicks "Save as PDF".

### Evidence
```tsx
// PdfPreview.tsx:28-41
const printDocument = () => {
  const win = frameRef.current?.contentWindow
  …
  win.focus() // some browsers print the focused frame's parent otherwise
  win.print()
```
```tsx
// PdfPreview.tsx:44-50  — the newly added dismissal, bound to the PARENT document
useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [onClose])
```
The iframe is `sandbox="allow-modals allow-same-origin"` (`:90`) with `allow-scripts` off, so its document has no focusable content and no script to forward keys; after the print dialog is dismissed, focus sits in a document whose keydowns the parent never sees. `deferred.md §21` is marked RESOLVED on the strength of that Escape handler, so this quietly reopens part of it on the print path. (The visible "Close" button remains, which is why this is MINOR not MAJOR.)

### Suggested fix
Return focus to the parent after printing:
```tsx
const saveBtnRef = useRef<HTMLButtonElement | null>(null)
…
win.focus()
win.print()
saveBtnRef.current?.focus()   // print() blocks until the dialog closes in Chrome/Firefox
```
plus a `window.focus()` fallback for browsers where `print()` resolves asynchronously.

### Confidence
Medium-high — mechanism is standard cross-document event scoping; not reproducible in jsdom (which logs `Not implemented: Window's focus() method` in the current suite), so verification is by inspection rather than by test.

---

## WEB-6 [MINOR] features/demo/ui/screens/import/PickerStage.tsx:201

### Claim
The large-batch confirm replaces the card list in place, unmounting the button the visitor just activated. Focus drops to `<body>`, and `ModalShell` has no focus trap, so a keyboard user must Tab from the top of the page to reach "Continue" / "Cancel" — a confirm dialog they cannot reach without leaving the modal.

### Evidence
```tsx
// PickerStage.tsx:167-170
if (files.length > BATCH_SIZE_WARNING_THRESHOLD) { setPendingFiles(files); return }
…
// PickerStage.tsx:201-230 — early return replaces the whole card list
if (pendingFiles) {
  return (
    <div role="group" aria-label={PICKER_COPY.largeBatchTitle} …>
```
`fileInputRef.current?.click()` (`:267`) is programmatic, so focus remains on the "Pick File" `ActionCard` button across the native file dialog; `setPendingFiles` then unmounts that button. Nothing in this component or `ModalShell` (`_shared.tsx:31-98` — Escape only, no focus trap, no initial focus) moves focus into the replacement content. The repo's own a11y idiom requires the opposite: *"a modal/sheet/drawer that opens must move focus into itself … focus must not be left on an unmounted node."*

A milder version of the same shape exists on the clipboard path: `setIsReadingClipboard(true)` disables the card that was just activated (`ActionCard` `disabled={isLoading}`, `:266/280/295`), blurring it; when the read fails, the `role="alert"` banner announces but focus is on `<body>`.

### Suggested fix
Give the confirm container a ref and `useEffect(() => confirmRef.current?.focus(), [])` with `tabIndex={-1}` (or focus the "Continue" button directly), and consider promoting it from `role="group"` to `role="alertdialog"` + `aria-modal` since it is a blocking confirm. For the clipboard path, restore focus to the card after `setIsReadingClipboard(false)`.

### Confidence
Medium-high — the unmount-under-focus is structural; the practical reachability cost depends on how far the modal is from the document start.

---

## WEB-7 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:13

### Claim
`TERM_ROW` is imported and never used.

### Evidence
```tsx
// ImportTerminalProgress.tsx:13
import { TerminalLine, TERM_ROW } from '@/features/demo/ui/screens/import/TerminalLine'
```
`grep -n "TERM_ROW" features/demo/ui/screens/import/ImportTerminalProgress.tsx` returns line 13 only. `tsconfig.json` sets neither `noUnusedLocals` nor `noUnusedParameters`, and the repo has no ESLint config, so nothing catches it. No bundle cost (`TerminalLine` is imported from the same module anyway) — it's dead surface that implies a colour dependency that doesn't exist.

### Suggested fix
`import { TerminalLine } from '@/features/demo/ui/screens/import/TerminalLine'`.

### Confidence
High.

---

## WEB-8 [MINOR] features/demo/ui/screens/import/ImportTerminalProgress.tsx:12

### Claim
This is the first component under `features/demo/ui/**` to use the **marketing** reduced-motion hook (`@/lib/hooks/use-reduced-motion`) instead of the demo's established `useReducedMotion` from `motion/react`. Beyond the convention drift, the two hooks differ on first paint: the lib hook returns `false` during the first render and flips in an effect, so a reduced-motion visitor gets one committed frame with `termFadeIn`/`termCursorBlink` armed before they are suppressed.

### Evidence
```tsx
// ImportTerminalProgress.tsx:12
import { useReducedMotion } from '@/lib/hooks/use-reduced-motion'
```
Every other demo consumer uses the motion package:
- `features/demo/ui/ScreenStage.tsx:3`
- `features/demo/ui/controls/WizardDrawer.tsx:4`
- `features/demo/ui/controls/ExploreChecklist.tsx:4`

Behavioural difference, verified against the installed sources:
- `lib/hooks/use-reduced-motion.ts:12-33` — `useState(false)`, then `matchMedia` read inside `useEffect`. First render is always `false`.
- `framer-motion@12.42.0` `useReducedMotion` (dist `framer-motion.dev.js:16057-16068`) — `initPrefersReducedMotion()` runs in the render body and `useState(prefersReducedMotion.current)` seeds the *correct* value on the first render (it does not track later changes).

So under the demo's own hook the CTA fade never starts for a reduced-motion visitor; under the lib hook it starts and is cut off. (The lib hook is better on live preference changes — hence MINOR, not a defect claim in one direction. What matters is that the demo half should pick one.)

### Suggested fix
Use `import { useReducedMotion } from 'motion/react'` in `ImportTerminalProgress` to match the rest of `features/demo/ui/**`. If the lib hook's live-change tracking is genuinely wanted here, say so in the component header so the split is deliberate rather than accidental, and note it in `deferred.md` alongside the existing "two different hooks, both correct" framing.

### Confidence
High on the mechanism; MINOR because both hooks are functionally acceptable and the visible cost is one frame.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 2 |
| MINOR | 6 |

- **Marketing↔demo isolation:** preserved (wall grep clean; `app/demo/error.tsx` reaches the barrel only through an `await import` in the click handler).
- **Bundle impact:** none — no dependency, config, or import-shape change; `mapbox-gl` / `pdfjs-dist` stay lazy; `/demo` First Load JS 107 kB. P1.1 is a net win (render-blocking Google-Fonts `@import` removed in favour of self-hosted `next/font` vars).
- **Browser-resource cleanup:** complete — rAF/timer cancelled, bus unsubscribed, keydown listeners removed, log retention ring-capped.
- **Accessibility:** two gaps worth fixing before merge (WEB-1 keyboard-unreachable pin/pill, WEB-2 aria-label suppressing the outcome counts), four contained ones.
- **Style-convention adherence:** correct half throughout; lifted pixel rules and device math untouched; `demo.css` additions are keyframes only.

**Verdict:** REVISE — fix WEB-1 and WEB-2; take WEB-3/4/5/6/7/8 opportunistically. No BLOCKERs; nothing in this diff threatens the bundle boundary, SSR, or resource lifetimes.
