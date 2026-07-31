# Parity P2 — WEB lane review (PR #31)

**Lane:** `web-reviewer` (render + bundle performance, browser-API correctness, resource leaks,
accessibility, CSS/style discipline, marketing↔demo isolation).
**Branch:** `feat/parity-p2` @ `9f5c01a` · **Base:** `master` · **Diff:** `git diff master...feat/parity-p2`
**Round:** 1 (initial). This file is the lane's persistent state — the fix-delta pass resumes from it.

**Verdict:** 3 MAJOR · 2 MEDIUM · 3 MINOR · 0 BLOCKER.
No bundle-boundary, chrome-scope, hydration, or leak breach. Every MAJOR is accessibility, and
each has an in-repo correct pattern that this PR itself established (AlertDialog's focus contract,
GpsCaptureControl's own sibling live regions, PickerStage's R-17 focus handling) — so all three are
"apply the idiom you just wrote next door", not new design.

---

## WEB-1 [MAJOR] features/demo/ui/screens/NotesScreen.tsx:96-156

**Claim.** `NotesScreen`'s local `ConfirmDialog` is a second, weaker blocking-dialog implementation
shipped in the same PR that introduced the shared `AlertDialog` primitive. It carries
`role="alertdialog"` + `aria-modal="true"` but (a) never moves focus into itself, (b) never returns
focus, and (c) associates only the *title* (`aria-label={title}`) — the body copy, which is where the
destructive consequence is stated, is not exposed at all. All six Notes confirmations (reset section,
restore section, restore-all ×2, scrap-all) route through it.

**Evidence.**

`NotesScreen.tsx:121-129` — the dialog element and its labelling:

```tsx
<div
  role="alertdialog"
  aria-modal="true"
  aria-label={title}
  onClick={(e) => e.stopPropagation()}
  ...
>
  <div style={{ fontSize: 16, fontWeight: 700, ... }}>{title}</div>
  <div style={{ fontSize: 13, lineHeight: 1.5, ... }}>{body}</div>
```

There is no `tabIndex={-1}`, no `aria-describedby`, and no focus effect anywhere in the component
(the only `useEffect` is the Escape listener at :107-113).

The bar this PR set, `features/demo/ui/controls/AlertDialog.tsx:41-61`:

```tsx
const uid = useId(); const titleId = `${uid}-title`; const bodyId = `${uid}-body`
...
aria-labelledby={titleId} aria-describedby={bodyId} tabIndex={-1}
...
useEffect(() => {
  const opener = document.activeElement
  dialogRef.current?.focus()
  return () => { if (opener instanceof HTMLElement && opener.isConnected) opener.focus() }
}, [])
```

with its own docblock stating the reason ("so a screen reader hears title AND body, not just the
first button"), and four tests pinning it (`controls/__tests__/AlertDialog.test.tsx` — described-by
body, focus on mount, focus return on close). `docs/code-reviews/deferred.md:939-943` records the same
contract as the P2.6 resolution of §39.1.

**Concrete failure mode.** Notes screen, screen-reader + keyboard user, "Write my own notes…" →
`ConfirmDialog` mounts in a portal, focus stays on the now-obscured trigger. Because
`aria-modal="true"` marks everything outside the dialog inert to AT, the user is left focused on an
element the AT is being told to ignore, with no announcement that a dialog opened. Arrowing to the
dialog they reach the title only; the sentence that matters — *"Auto-generation stops for every
section"* (:397), *"sections you rewrote will be replaced"* (:388), *"keeping Additional Notes may
repeat the restored sections"* (:378) — is never associated with the dialog. The two buttons on offer
are "Start from current notes" and "Start blank"; the second wipes all seven sections
(`create-store.ts:563-586`, `scrapAllNotes('blank')`).

This is **not** the deferred item at `deferred.md:164-167` (that defers a full focus *trap* + return
for `WizardDrawer`/`ModalShell`, both of which at least announce their own name). Missing focus
*entry* and a missing describedby on a brand-new destructive dialog is a different, larger gap — and
the primitive that fixes it landed in this same branch.

**Secondary (same component, same fix).** `ConfirmDialog`'s Escape effect is keyed on `onCancel`
(:107-113), and every call site passes a fresh inline `() => setDialog(null)` (:360, :369, :383, :390,
:402) — so the `document` keydown listener is torn down and re-added on every `NotesScreen` render.
That is the exact anti-pattern this PR calls out twice in its own comments
(`DemoExperience.tsx:356-358`, `TimeOffsetScreen.tsx:64-66`) and solves with `useCallback`.

**Suggested fix.** Render the Notes confirmations through `AlertDialog` (it already supports
`style: 'cancel' | 'destructive'` and an actions array; the only visual delta is the row-vs-stack
button layout and the implicit Cancel, both cheap to add as a prop). If the stacked layout must
stay, port the six lines: `useId` + `aria-labelledby`/`aria-describedby`, `tabIndex={-1}` + the
focus-in/focus-restore effect, and wrap the `onCancel` closures in `useCallback`.

**Confidence.** High — read in full context (component, both call paths, the primitive, its tests,
and the ledger entries that could have excused it).

**Fix-delta check.** Dialog exposes both title and body to AT; focus enters on mount and returns to
the opener on close; Escape listener identity stable. Re-read `NotesScreen.tsx:96-156` and the
`setDialog` call sites.

---

## WEB-2 [MAJOR] features/demo/ui/inputs/CoordinateDisplay.tsx:84-134

**Claim.** The whole coordinate card is a single `<button aria-label="...">`, and the copy
confirmation/failure live region plus the accuracy/source/rating metadata are rendered **inside** it.
Per ARIA, `button` has *children presentational: true*, so its descendants are not exposed as
separate accessibility objects; combined with the `aria-label` overriding the name computation, an
assistive-tech user gets neither the measured accuracy nor any signal that the copy failed.

**Evidence.** `CoordinateDisplay.tsx:85-133`:

```tsx
<button type="button" onClick={copy} style={card}
        aria-label={`GPS coordinates: ${coordinates}. Copy to clipboard.`}>
  ...
  <span data-testid="coordinate-display-accuracy" ...>{formatAccuracy(accuracyM)}</span>
  <span data-testid="coordinate-display-source"  ...>{sourceLabel}</span>
  <span data-testid="coordinate-display-rating"  ...>{rating.label}</span>
  ...
  {copied !== 'idle' && (
    <div role="status" ...>{copied === 'ok' ? COPY_LABELS.success : COPY_LABELS.failure}</div>
  )}
</button>
```

The correct in-repo pattern is 40 lines away, in the sibling this PR added:
`GpsCaptureControl.tsx:162-173` places `role="status"` (progress) and `role="alert"` (failure)
as **siblings outside** the button, not inside it.

**Concrete failure mode.** Submission screen, VoiceOver/NVDA user captures a fix and activates the
coordinate card. The card announces "GPS coordinates: 43.653226, -79.383184. Copy to clipboard,
button" and then nothing — a denied/unavailable clipboard (`defaultWriteClipboard` throws at :35-38
on any non-secure origin or Firefox without `dom.events.asyncClipboard.clipboardItem`) renders
"Unable to copy coordinates to clipboard" that the user never hears. The component's own comment at
:76-78 says the point is that a blocked clipboard "must not look like a successful copy" — for AT it
looks like nothing at all. Separately, `±8m · GPS · Good` — the forensic quality signal, whose tone
is otherwise carried only by colour (`TONE_COLOR`, :22-26) — is unreachable, because a `button`'s
inner text is not a separate stop for a screen reader and the `aria-label` replaces the name.

**Suggested fix.** Move the `role="status"` block out of the `<button>` (sibling below it, as
`GpsCaptureControl` does), and fold the metadata into the accessible name, e.g.
`aria-label={`GPS coordinates: ${coordinates}${rating ? `, accuracy ${formatAccuracy(accuracyM)}, ${rating.label}` : ''}${sourceLabel ? `, source ${sourceLabel}` : ''}. Copy to clipboard.`}`.

**Confidence.** High on the live region (spec-level children-presentational, and support for live
regions nested in presentational-children roles is inconsistent across AT even where it works);
High on the metadata being absent from the accessible name.

**Fix-delta check.** `role="status"` node is a DOM sibling of the button, not a descendant; accuracy
+ rating + source appear in the accessible name. Re-read `CoordinateDisplay.tsx:84-134`.

---

## WEB-3 [MAJOR] features/demo/ui/inputs/GpsCaptureControl.tsx:131-141

**Claim.** The capture button disables itself for the entire duration of a capture, which blurs the
just-activated control and drops keyboard focus to `<body>` — for up to 30 s on the default config
and 120 s with `PRECISE_GPS_CONFIG`. On failure the `role="alert"` message then announces with focus
nowhere. The repo has an explicit, commented, tested idiom for exactly this scenario and it is not
applied here.

**Evidence.** `GpsCaptureControl.tsx:131-141`:

```tsx
<button type="button" onClick={onClick} disabled={busy || disabled} aria-busy={busy} ...>
```

with `busy = isCapturing || reverseGeocoding` (:119). Budgets: `buildGpsConfig()` →
`timeoutMs = 30_000` (`engine/logic/gps.ts:128-138`); `PRECISE_GPS_CONFIG.timeoutMs = 120_000`
(:142-147), which the docblock at :17-19 says P3.7 will mount. Failure surfaces at :169-173.

The established pattern, `features/demo/ui/screens/import/PickerStage.tsx:171-192`:

```
// R-17 focus management. ... The clipboard card is disabled while its read is in
// flight — a failure re-enables it, and focus returns to it so a keyboard user isn't
// stranded on <body> while the role="alert" banner announces.
useEffect(() => {
  if (!isReadingClipboard && clipboardErrored.current) {
    clipboardErrored.current = false
    clipboardCardRef.current?.focus()
  }
}, [isReadingClipboard])
```

**Concrete failure mode.** Submission screen, keyboard-only user tabs to "Use Current Location" and
presses Enter. The button disables → browsers blur the disabled element and focus falls to `<body>`.
The user's place in a ~12-field form is lost; resuming means tabbing from the top of the document.
If the capture then fails (permission denied is the common case), the `role="alert"` fires while
focus is on `<body>`, so a screen-reader user hears the message but has no route back to the control
that produced it. `aria-busy` does not mitigate either half — it annotates a node the user is no
longer on.

**Suggested fix.** Keep a ref on the button and re-focus it when `isCapturing` goes false with a
`failure` present (the PickerStage effect, verbatim). Optionally prefer `aria-disabled` + an early
return in `onClick` over the `disabled` attribute so focus is never lost in the first place — that is
the stronger fix, but the PickerStage-shaped one is the in-repo precedent.

**Confidence.** High — behaviour is uniform across Chrome/Firefox/Safari, the code path is
unconditional, and no test pins the current focus behaviour as deliberate
(`screens/__tests__/submission-gps.test.tsx` covers capture/geocode/failure copy, not focus).

**Fix-delta check.** Focus returns to the capture button when a capture ends in failure; ideally
focus is never dropped during the busy window. Re-read `GpsCaptureControl.tsx:107-176`.

---

## WEB-4 [MEDIUM] features/demo/ui/screens/NotesScreen.tsx:171,421-431 + DemoExperience.tsx:1113-1130

**Claim.** `SectionBlock`'s `memo` is inert: every prop it receives is a fresh identity on every
render, so the stated optimisation ("Memo'd — free-text keystrokes re-render the parent editor",
:168-170) never engages. Separately, the Notes view-model is rebuilt from scratch on every bridge
render while the screen is open, unlike every neighbouring derivation in `DemoExperience`, which is
memoised.

**Evidence.** `NotesScreen.tsx:421-431` — a new arrow per render for the memoised child:

```tsx
{sections.map((meta) => (
  <SectionBlock
    key={meta.id}
    meta={meta}
    onCommitSection={onCommitSection}
    onCommitAddendum={onCommitAddendum}
    onRequestReset={(id, label, deleted) =>          // ← new identity every render
      setDialog(deleted ? { kind: 'restoreSection', id, label } : { kind: 'reset', id, label })
    }
  />
))}
```

and `DemoExperience.tsx:1121-1126` — `onCommitSection` / `onCommitAddendum` are themselves inline
arrows recreated on every bridge render, so even the two forwarded props never hold identity.

`DemoExperience.tsx:1114-1120` — unmemoised derivation in the render body:

```tsx
sections={buildNotesSectionMeta(currentLocation)}
copyAllText={currentLocation ? assembleNotesString(currentLocation.form.notesSections, currentLocation.form.notesFreeText) : ''}
```

`buildNotesSectionMeta` runs all seven formatters (via `freshSectionContent` for the staleness
baseline) and `assembleNotesString` re-concatenates the whole document. Compare the same file's
`caseCards` (:331), `mapViewerCase`/`mapData` (:334-338) and `gateOutcome` (:349-352), all `useMemo`d.

**Impact (stated honestly).** Modest: ~7 small subtrees re-reconciled per keystroke in the free-text
box, and one full notes rebuild per store commit while the Notes view is active. `useAutoGrow`'s
effect is dep-guarded on `value`, so there is no layout thrash — this is wasted reconciliation and a
dead optimisation, not a jank report. Flagged because the memo's own comment documents an intent the
code does not deliver, and because the cost grows with the section content (cameras/scopes lists).

**Suggested fix.** `useCallback` the `onRequestReset` arrow in `NotesScreen` (it only closes over
`setDialog`), hoist the three bridge callbacks to stable identities (`useCallback` over `store`),
and wrap the two derivations in `useMemo` keyed on `currentLocation`.

**Confidence.** High on the memo being defeated (mechanical); Medium on the derivation being worth
memoising (correct-by-convention, low measured cost today).

**Fix-delta check.** `SectionBlock` no longer re-renders when only `freeDraft` changes.

---

## WEB-5 [MEDIUM] features/demo/ui/screens/NotesScreen.tsx:343-351

**Claim.** The "Copy all" status timer has no teardown and no stacking guard.

**Evidence.**

```tsx
const copyAll = async () => {
  try { await navigator.clipboard.writeText(copyAllText); setCopied('done') }
  catch { setCopied('failed') }
  setTimeout(() => setCopied('idle'), 1600)     // never cleared, never tracked
}
```

The in-repo reference for a tracked one-shot is `DemoExperience.tsx:284-290` (`syncTimer` ref +
`clearTimeout` on unmount) and `PdfPreview.tsx:28-33 / 105-110` (this PR's own R-47 work, which
tracks and cancels its verdict timer).

**Concrete failure mode.** Two, both small: (1) "Copy all" then "Continue →" inside 1.6 s leaves a
timer that fires `setCopied` on an unmounted tree — a no-op under React 18, but an untracked timer in
a file whose siblings all track theirs; (2) repeated clicks stack timers, so the confirmation label
reverts to "Copy all" 1.6 s after the *first* click regardless of later ones — the visitor can see the
"Copied ✓" flicker off mid-interaction.

**Suggested fix.** Hold the handle in a ref, `clearTimeout` before re-arming and in an unmount
effect (the `syncTimer` shape).

**Confidence.** High on the mechanics; Medium on user-visible impact (the stacking case is real but
cosmetic).

**Fix-delta check.** Timer handle cleared on re-arm and on unmount.

---

## WEB-6 [MINOR] features/demo/ui/inputs/GpsCaptureControl.tsx:165

**Claim.** The live sample readout hard-codes the attempt ceiling instead of reading the config the
capture actually used.

**Evidence.**

```tsx
{`Sample ${progress.samplesTaken} of ${config?.maxAttempts ?? 10} · best ${formatAccuracy(progress.bestAccuracyM)}`}
```

The default path (`config` undefined) resolves to `buildGpsConfig()` →
`GPS_CONFIG_STATIC.maxAttempts` (`engine/logic/gps.ts:111`), which is `10` today — so the number is
correct **now**. It is a second copy of a constant the engine owns, in a component whose docblock
promises "Every number on that line is measured, never simulated" (:26-28). If
`GPS_CONFIG_STATIC.maxAttempts` ever moves, this line silently misstates the ceiling to the visitor
(e.g. "Sample 5 of 10" on a loop that stops at 5) with no test to catch it —
`submission-gps.test.tsx:219-...` asserts the counter, not the denominator's provenance.

**Suggested fix.** `(config ?? buildGpsConfig()).maxAttempts`, or have `useGpsCapture` return the
resolved config.

**Confidence.** High (latent-drift, not a live defect — severity set accordingly).

---

## WEB-7 [MINOR] features/demo/ui/screens/OcrCaptureScreen.tsx:122-130

**Claim.** The two reasons the commit CTA is blocked are plain, unassociated, non-live text next to a
`disabled` button — so the reason is undiscoverable by keyboard (a disabled button is not focusable)
and unannounced when it appears.

**Evidence.**

```tsx
{!dvrDraft && <div style={{ ...label12, marginBottom: 10 }}>DVR Time Required — please enter the DVR timestamp before continuing.</div>}
{dateNeedsConfirming && <div style={{ ...label12, marginBottom: 10 }}>Confirm or correct the assumed date before continuing.</div>}
...
<button type="button" onClick={onConfirm} disabled={!canCommit} ...>Use this &amp; calculate</button>
```

Both lines appear/disappear reactively as the operator edits `dvrDraft`. The repo's idiom for exactly
this — a blocking-validation message — is `role="alert"`, used in this same PR at
`CompletionScreen.tsx:77` for the gate's "Required Fields Missing" card and at
`OcrCaptureScreen.tsx:89` for the unreadable-frame notice.

**Suggested fix.** Give the two hint lines `role="status"` (or `role="alert"`) and reference them
from the CTA with `aria-describedby`; alternatively use `aria-disabled` + a no-op handler so the
button stays focusable and can carry its own reason.

**Confidence.** Medium-High. Filed MINOR because the same information is also stated inside the
`role="alert"` assumed-date panel above (:100-104) for the assumed-date branch — only the empty-draft
branch is fully silent.

---

## WEB-8 [MINOR — cross-lane routing note] features/demo/ui/DemoExperience.tsx:811-827

**Not a web-platform finding; recorded here so it is not lost between lanes** (belongs to the
flow/silent-failure lane).

**Claim.** P2.5 added a confirmation before a recalculation that wipes edited extracted scopes, but
it guards only the `Calculate` button. The OCR commit path reaches the same destructive action with
no confirmation.

**Evidence.** `TimeOffsetScreen.tsx:52-58` gates `onCalculate` behind `AlertDialog` when
`hasExtractedScopes`, with the rationale "the demo's `generateExtractedScopes` replaces the list the
same way, and its Extracted-Scope screen is editable — so the guard is load-bearing here, not
ceremony." But `confirmOcr` (`DemoExperience.tsx:824`) calls `calcOffset()`, which is
`store.calculateOffset(); store.generateExtractedScopes()` (:762-765) — regenerating the list
wholesale with no prompt. Reachable: generate scopes → edit them on the Extracted Scope screen →
re-capture OCR → "Use this & calculate" → edits gone.

**Suggested action.** Verify against the phone (does its OCR confirm re-run the generator, and does
it prompt?) and either route this path through the same confirm or record the divergence in the
ledger.

**Confidence.** High on the demo-internal inconsistency; unverified against phone source (not
available in this worktree).

---

## Checked and clean (inventory for the fix-delta pass)

**Bundle & boundary — CRITICAL bucket, all clear.**
- The wall holds: `grep -rn "features/demo" components app/\(default\) lib app/layout.tsx` returns
  only the guard test and a comment reference in `components/marketing/phone-frame.tsx:7`. No file
  under `app/` or `components/` is touched by this diff at all (`git diff --stat`), so
  `phone-frame.test.tsx` and `chrome-scope.test.tsx` cannot have regressed.
- `package.json` is unchanged — no new dependency, no bundle rationale needed.
- Heavy deps stay lazy: `mapbox-gl` only via `await import` inside the effect
  (`MapCanvas.tsx:122`), `pdfjs-dist` via `await import` (`ui/import/pdf-extract.ts:21`). Neither is
  touched by this PR.
- `reverse-geocode.ts` statically imports `@mapbox/search-js-core` — the *existing* shape for this
  dep (`AddressAutocomplete.tsx:13`, `ui/import/geocode.ts:3`), so it adds nothing to the demo chunk.
- `app/demo/page.tsx` still mounts through `next/dynamic(..., { ssr: false })`; unchanged.
- No `'use client'` added to a marketing layout or server component (marketing untouched).

**Resource leaks — all new listeners/timers torn down.** Full sweep of the changed UI files for
`setTimeout|setInterval|addEventListener|createObjectURL|requestAnimationFrame`:
`AlertDialog.tsx:51` (removed in cleanup), `PdfPreview.tsx:75/105/122` (the R-47 rework tracks and
cancels the armed listener + verdict timer on supersede *and* unmount — verified correct),
`DemoExperience.tsx:299` (pagehide, removed) and `:771` (`syncTimer`, cleared at :288-290),
`capture-gps.ts:68` (a bounded retry `setTimeout` whose only continuation is abort-checked at the
loop head — worst case one 500 ms orphan promise, no state write). The one gap is WEB-5. No
`createObjectURL` anywhere. No new `Map`/marker creation.

**Browser-API correctness — all clear.**
- No browser global at module scope: `readBrowserGeolocation()` reads `navigator` at call time and
  says so (`capture-gps.ts:37-41`); `defaultWriteClipboard` capability-checks
  `navigator.clipboard?.writeText` (`CoordinateDisplay.tsx:34-39`); `reverseGeocode` reads
  `process.env.NEXT_PUBLIC_MAPBOX_TOKEN` inside the function and returns `null` without it;
  `usePhoneScale`'s pattern is untouched.
- Geolocation is the newly-arrived API and is handled to the lane's standard: permission denial is
  terminal and surfaced verbatim, `UNSUPPORTED` (jsdom / insecure origin / hardened browser) is a
  named, visible failure, `maximumAge: 0` so no cached fix can be passed off as a capture, and there
  is deliberately **no** fabricated-coordinate fallback. `vitest.setup.ts` still leaves
  `navigator.geolocation` undefined, so `UNSUPPORTED` is the default tested contract.
- `useGpsCapture` gets the unmount contract right: `abortedRef` guards every post-await write, a
  separate `runningRef` is the real re-entry mutex (state can't be), and `capture` keeps a stable
  identity by reading options through a ref.
- Hydration: not applicable — the whole subtree is `ssr: false`. `GpsCaptureControl`'s render-time
  `window.matchMedia` read (:72) is safe for that reason and matches the PickerStage/R-14 precedent.
- `localStorage` still appears nowhere; sessionStorage access stays behind `sessionStorageOrNull()`.
  Snapshot key/version bumped together (`SNAPSHOT_VERSION = 4`, `dvr-demo-state-v4`) so v2/v3
  snapshots are discarded rather than mis-parsed.
- `reverseGeocode`'s fetch has no `AbortController`, matching its sibling `ui/import/geocode.ts`;
  it soft-fails to `null`, warns once, and its only post-await writes are React state on a possibly
  unmounted tree (no-op). Not filed — established pattern, no new user-visible failure.

**Render performance.** No new state added to the `DemoExperience` bridge with a single consumer —
`gateErrors`/`alert` are Completion-scoped and read by the screen + the alert host; `geocodeEnabled`
and the notes drafts correctly live in the leaf components. Every store read is a selective
`useStore(store, selector)`; no whole-store subscription. No selector returns a fresh object/array.
`gateOutcome`, `caseCards`, `mapData`, `explore` are memoised. Findings WEB-4 is the only render-path
issue.

**Accessibility — what's right.** `AlertDialog` (labelledby + describedby + focus in/out + Escape,
all tested); `role="switch"` + `aria-checked` + `switchKeyDown` on the Geocode toggle; `aria-busy`
on the capture button; `role="status"` for GPS progress and the reverse-geocode notice; `role="alert"`
for GPS failure, the completion gate card, the disambiguation warning, the no-date panel; `aria-label`
on the icon-only capture control and on every new textarea; decorative SVGs `aria-hidden`; the
`required` marker added to the address field. Findings WEB-1/2/3/7 are the gaps.

**CSS & style discipline — all clear.** No `className` anywhere in the changed `features/demo/ui`
files (inline `CSSProperties` throughout, per the inverted convention). `demo.css` untouched — no new
global, no new keyframe; `spin` (used by the new `Spinner`) and `screenIn` (used by `AlertDialog`)
both already exist under `[data-demo-root]` (`demo.css:85`, `:92`). Device-frame math untouched. The
`Spinner` gates its animation on `prefers-reduced-motion` in JS, matching the demo's JS-gating
convention; `AlertDialog`'s 0.2 s `screenIn` is ungated but identical in kind to the four existing
overlays (ModalShell/ExitDialog/PdfPreview/PickerSheet) — a sweep-level item, not a new gap, so not
filed.

**Next.js idioms.** No route handler, `generateMetadata`, `next/image` or `next/font` surface
touched. No new dynamic route.

**Deliberate choices honoured (not re-flagged).** D10 DVR-passthrough (§39.5); the §M13 2σ
refutation; `asyncUtilTimeout: 5000` with its measured evidence; `AlertDialog`'s non-dismissing scrim;
`aria-modal` without a focus trap (the repo-wide deferral at `deferred.md:164-167`, and the
PickerStage confirm's deliberate *omission* of `aria-modal` at `PickerStage.tsx:262-268`); phone bugs
not copied; snapshot v4 union; the orchestrator merge-integration commits; the OCR today-guess gate;
ledger §29-§42. The drawer's colour-only completion dots (`deferred §23`) were also not re-filed;
no *new* colour-only state signal was introduced (WEB-2's rating carries a text label — its problem
is exposure, not colour).

**Not run.** `pnpm build` — skipped deliberately: `package.json` is unchanged, no import shape moved
between static and lazy, and no marketing file is in the diff, so the route table and per-route First
Load JS cannot have moved. Re-run it in the fix-delta pass only if a fix introduces an import.
