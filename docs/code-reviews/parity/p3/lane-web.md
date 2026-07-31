# Parity P3 — WEB lane review (PR #32)

**Lane:** `web-reviewer` (render + bundle performance, browser-API correctness, resource leaks,
accessibility, CSS/style discipline, marketing↔demo isolation).
**Branch:** `feat/parity-p3` · **Base:** `master` · **Round 1 (initial) @ `4e60680`.**
**Counts:** 0 BLOCKER · 1 MAJOR · 4 MEDIUM · 3 MINOR.

Scope read: full `git diff master...feat/parity-p3` (91 files, +11321/−317), plus the render
parents of every changed surface (`DemoExperience.tsx`, `PhoneFrame.tsx`, `phone-overlay.tsx`,
`_shared.tsx`) and the pre-existing siblings each new component claims parity with
(`GpsCaptureControl`, `LocationFields`, `AlertDialog`, `PdfPreview`).

**Three findings below are empirically proven**, not reasoned: WEB-1, WEB-2 and WEB-5 were each
reproduced with a throwaway vitest probe against the real components in this worktree. The probe
files were deleted; the tree is clean apart from this document. Each finding quotes its probe.

---

## Structural gates (all clean)

| Gate | Result |
|---|---|
| **Marketing↔demo wall** | **Preserved.** `grep -rn "features/demo" components app/\(default\) lib` returns exactly one hit — the documented comment in `components/marketing/phone-frame.tsx:7`. No import form anywhere. |
| **Chrome scope** | Untouched — `app/layout.tsx` and `app/(default)/layout.tsx` are not in the diff. |
| **Bundle** | **No impact.** `git diff --stat` over `package.json`, `pnpm-lock.yaml`, `next.config.js`, `postcss.config.js`, `app/`, `components/`, `lib/` is **empty**. No new dependency, no import-shape change, no lazy→static conversion. `mapbox-gl` / `pdfjs-dist` remain `await import`ed inside their effects/functions. `pnpm build` deliberately not run — the lane rule scopes it to dependency or import-shape changes, and there are none. |
| **Browser-resource cleanup** | **Complete.** Every new listener/observer/timer in the diff tears down: `useLongPress` (`clearTimeout` on the `enabled` flip *and* on unmount, `useLongPress.ts:82-85`); `CaseActionsSheet`'s `ResizeObserver` (`ro.disconnect()`, `CaseActionsSheet.tsx:125`, with a `typeof ResizeObserver === 'undefined'` capability guard at `:121`); `ModalShell` / `DeleteConfirmationModal` Escape listeners (both `removeEventListener` in cleanup); `DemoNotification`'s auto-dismiss `setTimeout` (pre-existing, cleared). `useGpsCapture`'s abort ref covers the 50 new per-camera capture controls — no listener or timer is created at mount, so a 50-row camera list adds no standing browser resources. |
| **Browser globals** | No module-scope `window`/`document`/`navigator` reads added. `CameraGpsCapture`'s `Spinner` reads `window.matchMedia` in render behind `typeof window !== 'undefined'` + `?.` — identical to the accepted `GpsCaptureControl` precedent (P1.2 R-14), and the demo is `ssr: false`. Not flagged. |
| **Store-subscription discipline** | Every new `useStore` call in the bridge is single-selector (`DemoExperience.tsx:292-301`). No whole-state subscription, no selector returning a fresh object/array. |

---

## WEB-1 — [MAJOR] The unified `useLongPress` lost P3.2's touch double-fire latch: a touch long-press on a Cases row opens the tray and immediately closes it again

**File:** `features/demo/ui/primitives/useLongPress.ts:114-120` (consumers:
`features/demo/ui/screens/CasesScreen.tsx:129` and `:210`)

### Issue

On touch, one long-press gesture raises **two** signals: our own 500 ms `setTimeout`, and the
OS/browser `contextmenu` that the same hold produces a moment later. The merged hook's
`onContextMenu` fires the callback unconditionally:

```ts
onContextMenu: (e) => {
  if (!enabled) return
  e.preventDefault() // and with it the touch-hold menu that would cover the tray
  clear()
  // No swallow flag: a context-menu gesture produces no follow-up click to eat.
  cb.current()
},
```

`clear()` only clears the *pending* timer. If the timer has already fired (`timer.current === null`),
`clear()` is a no-op and `cb.current()` runs a **second** time for the same gesture. Both consumers
pass a **toggle** — `toggleActions = (key) => setOpenActionsKey(prev => prev === key ? null : key)`
(`CasesScreen.tsx:50`) — so the two fires are open-then-close. The visitor holds the row for half a
second and nothing happens.

The comment quoted above is answering the wrong question: it reasons about the trailing *click*
(correctly — there is none), not about the callback firing twice.

### Evidence

**1. In-repo proof that the timer-first ordering is real.** `DashboardScreen.tsx:46-48` states it as
observed fact and carries a latch specifically for it:

```ts
// A touch hold fires our timer at 500ms AND raises the OS `contextmenu` a moment later.
// Without this latch that one gesture would open the sheet twice.
const firedRef = useRef(false)
```

Shipped by commit `048ee1f`, *"fix(demo): measure the report's CONTENT box, and **latch the touch
double-fire**"*, and pinned by `DashboardScreen.test.tsx` — *"a touch hold that also raises
contextmenu opens the sheet ONCE"*. So the phase already found this bug once and fixed it — in the
copy that did not need it most.

**2. Why the merged hook does not have it.** `deferred.md §56f` enumerates the union exactly:

> Merged at P3.1's path … as a genuine union: P3.1's `enabled` gate and capture-phase swallow,
> P3.5's context-menu gesture, movement tolerance and keyboard-safe `detail === 0` exemption.

There were **three** long-press hooks in this PR, not two. §56f reconciled P3.1 ∪ P3.5;
`DashboardScreen`'s private third copy — the only one carrying the latch — was never in scope, so
the latch never crossed. `useLongPress.test.tsx` inherited P3.5's suite, which has no
touch-double-fire arm, so nothing caught it.

**3. Reproduced.** Probe against the real hook, and against the CasesScreen toggle shape:

```
× counts the callback fires for ONE touch hold gesture
  AssertionError: expected "vi.fn()" to be called 1 times, but got 2 times

× CasesScreen shape: does the tray stay open after a touch hold?
  >>> tray present after trailing contextmenu: false
```

### Failure scenario

`/demo` on any touch device (the demo's own framing calls the hold the phone-parity gesture).
Cases tab → hold a case card or a location row for 500 ms → the tray flickers open and closes; the
Delete / `Duplicate…` actions are unreachable by the documented gesture. Desktop mouse is
unaffected (a left-button hold raises no `contextmenu`), which is why every existing test passes.
The always-visible ⋯ trigger still works, so this is a broken accelerator rather than a dead end —
but it is the affordance `RowActions.tsx:13-15` and `deferred.md §48a` are both written around.

### Fix

Port `DashboardScreen`'s latch into the shared hook — set a `firedRef` when the timer fires, and
have `onContextMenu` consume-and-return instead of calling `cb.current()` when it is set. Reset it
on `pointerdown` alongside `swallowNextClick` (see WEB-2 for the reset's own trap). Then add the
missing arm to `useLongPress.test.tsx`, mirroring
`DashboardScreen.test.tsx`'s *"a touch hold that also raises contextmenu opens the sheet ONCE"*.

---

## WEB-2 — [MEDIUM] Third long-press hook still lives in `DashboardScreen`, and its latch is left armed by a desktop mouse hold — eating the next right-click

**File:** `features/demo/ui/screens/DashboardScreen.tsx:44-83`

### Issue

The assembly's stated outcome was **one** hook (`useLongPress.ts:14-19`, "ONE HOOK (P3 assembly)").
`DashboardScreen` still defines its own, with divergent semantics: it has the `firedRef` latch and a
nested-control bail that the shared hook lacks; it lacks the shared hook's movement tolerance,
`enabled` gate and capture-phase swallow.

Its latch has the mirror-image defect of WEB-1. `firedRef` is only reset inside `onPointerDown`,
which returns early for non-primary buttons (`if (e.button !== 0) return`, `:60`). A **desktop mouse**
hold fires the timer and sets `firedRef = true`, and no `contextmenu` ever follows to consume it. The
flag stays armed for the life of the card. The visitor's *next* right-click on that card is then
swallowed — and because `onContextMenu` calls `e.preventDefault()` before checking the latch, they
get neither the actions sheet nor the browser's own menu.

```ts
onContextMenu: (e) => {
  e.preventDefault()
  clear()
  if (firedRef.current) {
    firedRef.current = false // the hold already opened it — swallow the trailing event
    return
  }
  onLongPress()
},
```

### Evidence

Reproduced against the real `DashboardScreen`:

```
>>> right-click after a mouse hold — sheet opened? 0 | browser menu suppressed? true
```

This is the same defect class the phase already fixed once for the *other* hook — commit `2b18a0a`,
*"fix(demo): a long-press released off the row must not eat the next tap"* — whose fix was to reset
the flag at the **start of every new gesture** (`useLongPress.ts:95`). That reset is exactly what
`DashboardScreen`'s copy cannot do, because the gesture that consumes its flag (right-click) never
reaches `onPointerDown`.

`DashboardScreen.test.tsx`'s *"…and the latch does not swallow a genuine right-click afterwards"*
does not cover this: it exercises `contextmenu` #1 as the touch-trailing event and #2 as the genuine
one. In the mouse path, #1 *is* the genuine one.

### Failure scenario

`/demo` dashboard on a desktop pointer. Hold a case card → sheet opens (the documented mouse path,
`DashboardScreen.tsx:36-38`). Close it. Right-click the same card expecting the same menu → nothing
happens at all. A second right-click works. Recoverable, one wasted interaction, hence MEDIUM.

### Fix

Delete the private hook and consume `@/features/demo/ui/primitives/useLongPress` once WEB-1's latch
lands there, moving the nested-control bail (`e.target.closest('button')`, `:61`) into the shared hook
— `CasesScreen` needs it too (its wrapper spans the row button *and* the ⋯ trigger). Reset the latch
on `pointerdown` **and** at the point the context-menu path consumes it, so a mouse-only hold cannot
leave it standing.

---

## WEB-3 — [MEDIUM] `DuplicateLocationModal` uses the hard `disabled` attribute the assembly explicitly rejected — and its empty-name arm gives no reason at all

**File:** `features/demo/ui/screens/DuplicateLocationModal.tsx:63-89` (`ActionButton`), used at
`:138-143`; gate at `:111-113`

### Issue

`deferred.md §56d` reconciled three spellings of the submit gate and named the loser:

> Three spellings landed in parallel — P3.4's `submitDisabled` …, P3.3's `submitBlocked` …,
> **P3.5's `submitDisabled` (the hard `disabled` attribute)**. The union keeps BOTH live semantics:
> the button dims and reads `aria-disabled` …

and `_shared.tsx:280-283` states the house rule:

> Never the `disabled` attribute: it drops keyboard focus to `<body>`, and a gate that flips on a
> keystroke would strand the visitor mid-form (the R-7/R-15 house choice, and §45a's
> `aria-disabled`-over-`disabled` precedent on the GPS capture button).

The reconciliation covered `ModalActions`. P3.5's **own** `ActionButton` was not part of it and still
renders `disabled={disabled}` (`:76`) off a gate that recomputes on every keystroke
(`isNameEmpty || isNameTaken`, `:111-113`).

Two consequences, one of them not merely stylistic:

1. **The two duplicate actions leave the tab order and the actionable a11y tree** while the name is
   empty or colliding. A keyboard/screen-reader visitor tabbing the chooser finds the "Copy info to a
   new address" and "Export this location" sections but no duplicate buttons — the chooser silently
   changes shape.
2. **On the empty-name arm there is no message anywhere.** `error={isNameTaken ? NAME_TAKEN_ERROR : undefined}`
   (`:134`) — a *collision* announces via the `Field`'s `role="alert"`, but clearing the name produces
   a chooser with two vanished primary actions and nothing said about why.

The sibling modal three files away handles the same predicate correctly:
`NewLocationModal.tsx:204-224` renders `newLocationBlock`'s reason in a `role="status"` region,
marks the button `aria-disabled`, and points `aria-describedby` at the reason — including an
`emptyName` arm with real copy.

### Fix

Give `ActionButton` the house treatment: `aria-disabled` + a guarded `onClick` (the guard already
exists at `:117-120`) + `aria-describedby` pointed at a reason node, and add the empty-name message
so both blocked arms say why. `NewLocationModal.tsx:200-224` is the in-repo shape to copy.

---

## WEB-4 — [MEDIUM] The demo's toast is not a live region, and P3.5 made it the only feedback for three actions

**Files:** `features/demo/ui/screens/map/DemoNotification.tsx:38-42`;
`features/demo/ui/DemoExperience.tsx:1811-1815` (six new messages at `:185-202`)

### Issue

`DemoNotification` renders a plain `<div>` — no `role="status"`, no `aria-live` — and auto-dismisses
after 2600 ms:

```tsx
return (
  <div data-testid="demo-notification" style={banner}>
    {message}
  </div>
)
```

It was previously the map's honest-notice idiom (Call/Email), where the visitor had just pressed a
row and the notice was a courtesy. P3.5 routes **six** new messages through it, and for three of them
the banner is the **entire** outcome of the interaction:

| Message | The only feedback for |
|---|---|
| `EXPORT_ZIP_NOTICE` / `EXPORT_GEOJSON_NOTICE` (`:201-202`) | pressing Export ZIP / Export GeoJSON — the chooser closes and nothing else changes |
| `LOCATION_NOT_FOUND_NOTICE` (`:185`) | a long-press / ⋯ on a location whose source no longer resolves — no modal opens at all |
| `DUPLICATION_FAILED_NOTICE` (`:189`), `NEW_ADDRESS_FAILED_NOTICE` (`:194`) | a refused duplicate / create |

For a screen-reader visitor, pressing "Export ZIP" is: the dialog disappears, focus lands on `<body>`
(see WEB-5), and **nothing is announced**. That is indistinguishable from a broken button — which is
precisely what the demo's honesty convention exists to prevent (`deferred.md §52.2`: "tells the truth
on press instead of faking a download"). The truth is being told to sighted visitors only.

The lane's own rule: *"New async status that only appears visually is a finding."* The repo already
holds the correct idiom in eight places — `role="status"` on `GpsCaptureControl`'s progress,
`LocationFields`' lookup notice, `NewLocationModal`'s blocked reason, `CameraGpsCapture`'s progress,
`IncidentLocationFields`' lookup status.

**Not a re-file of `deferred.md §52.6.** That entry documents the *two-line-Toast → one-line-banner*
copy compromise and the portalling; it says nothing about the live region, and its trigger ("if a
package builds a real toast component") does not cover this.

### Fix

Add `role="status"` to the banner element in `DemoNotification` (one attribute; it is already
rendered conditionally from a parent, which is the announcement-on-insert shape `role="status"`
handles well for short-lived banners — or wrap it in a permanently-mounted `role="status"` region,
matching `NewLocationModal.tsx:204`'s stated reasoning). Both call sites (`DemoExperience` and
`MapScreen.tsx:141`) inherit it.

---

## WEB-5 — [MEDIUM] The delete dialog's documented focus-return is a no-op at its only real call path — focus lands on `<body>`

**Files:** `features/demo/ui/screens/DeleteConfirmationModal.tsx:81-87`;
call path `features/demo/ui/screens/CasesScreen.tsx:158` and `:236`

### Issue

The component's header (`:28-29`) and `deferred.md §48c` both claim:

> focus moved onto the dialog on mount and handed back to the opener on unmount

The implementation reads the opener at mount:

```ts
useEffect(() => {
  const opener = document.activeElement
  dialogRef.current?.focus()
  return () => {
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
  }
}, [])
```

At the only path that opens it, the opener has **already been unmounted in the same handler**:

```tsx
actions={[{ label: 'Delete', tone: 'danger', onSelect: () => { onCloseActions(); onDeleteCase(c.id) } }]}
```

`onCloseActions()` and `onDeleteCase()` are both `setState` calls in one event — React batches them,
so by the time the dialog's mount effect runs the tray (and its Delete button) is detached and
`document.activeElement` is `<body>`. `body.isConnected` is `true` and `body instanceof HTMLElement`
is `true`, so the guard passes and the cleanup calls `document.body.focus()` — a no-op on a
non-tabbable body. The visitor lands nowhere and must Tab from the top of the document.

### Evidence

Probe wiring the real `CasesScreen` tray to the real `DeleteConfirmationModal` through the bridge's
own handler shape:

```
× where does focus land after Cancel?
  AssertionError: expected <body>…</body> not to be <body>…</body>
```

i.e. `document.activeElement === document.body` after Cancel.

**Not a re-file of `deferred.md §7`.** §7 defers ModalShell's *focus trap and focus return* as a
known gap. This is the opposite situation: a component that deliberately implemented focus return,
whose implementation cannot fire at its shipped call path, and whose header + `§48c` assert the
behaviour as a settled fact a future reviewer will trust.

### Fix

Capture the opener above the unmount — e.g. have `CasesScreen` remember the ⋯ trigger (or the row) and
have the bridge pass a `returnFocusTo` ref, or defer `onCloseActions()` so the tray outlives the
dialog's mount effect. Simplest in-repo shape: keep the tray mounted while `pendingDelete` is armed and
close it on the dialog's unmount instead of on the click. Then pin it — no current test asserts focus
return (`DeleteConfirmationModal.test.tsx:92` only asserts focus **on mount**).

---

## WEB-6 — [MINOR] `IncidentLocationFields`' coordinate errors are unassociated and unannounced, while the shared `Field` gained exactly that treatment in the same diff

**File:** `features/demo/ui/inputs/IncidentLocationFields.tsx:100-132`

`CoordinateField` renders its validation message as a bare `<div>` with no `id`, no
`aria-describedby` from the input, and no `role="alert"` — only `aria-invalid`:

```tsx
aria-invalid={error !== undefined}
…
{error && <div style={{ fontSize: 12, color: '#ff6b78', marginTop: 5 }}>{error}</div>}
```

A screen-reader visitor blurring Latitude with `999` hears "invalid entry" and never hears *why*
(`parseCoordinate`'s "Latitude must be between -90 and 90"). This diff's own `Field`
(`_shared.tsx:202-243`, `deferred.md §56e`) does the correct thing for the same class of message —
`errorId` + `aria-describedby` + `role="alert"` — and this new component sits directly beside it,
using `Field` for three of its five inputs and re-rolling the other two.

`NewCaseModal`'s local `CoordinateField` (`:61-87`) has the same gap but is **pre-existing**
(present at `master`), so it is not this diff's; folding it in when the shared fix lands is the
completeness sweep.

**Fix:** thread `useId()` + `aria-describedby` + `role="alert"` through `CoordinateField`, or extract
one coordinate input both modals use.

---

## WEB-7 — [MINOR] `NewCaseModal` marks the primary action `aria-disabled` with no `submitDescribedBy`

**File:** `features/demo/ui/screens/NewCaseModal.tsx:276`

```tsx
<ModalActions submitLabel={…} onCancel={onCancel} onSubmit={handleSubmit} submitBlocked={blocked} />
```

`ModalActions` only sets `aria-describedby` when `submitDescribedBy` is supplied
(`_shared.tsx:310`), so a keyboard visitor landing on a dimmed "Create Case" hears
"Create Case, dimmed" with no reason. `NewLocationModal.tsx:223` — the sibling adopter of the same
unified API — passes it.

Mitigated by design, which is why this is MINOR: `§50a`/`§56d` deliberately let the click through so
`validateRequired`'s verbatim phone messages fire as `role="alert"` on the fields. The reason is
reachable, just only *after* activating a control that reads as unavailable. Either point
`submitDescribedBy` at a rendered hint, or add a note at the call site recording that the omission is
deliberate so a future sweep does not "fix" it into a swallow.

---

## WEB-8 — [MINOR] Long-press on Cases rows selects text mid-hold; the dashboard card guards against it and the rows do not

**Files:** `features/demo/ui/screens/CasesScreen.tsx:133`, `:214` (vs `DashboardScreen.tsx:161`)

`DashboardScreen`'s card sets `userSelect: 'none'` with a stated reason — *"A hold that selects the
card's text reads as a broken gesture, not a menu."* The `CasesScreen` rows that took the same
gesture in P3.1 do not, so a desktop hold on a case number or a location name begins a text
selection under the tray it opens. Cosmetic; the 10 px movement tolerance already cancels the hold if
the pointer actually drags.

**Fix:** add `userSelect: 'none'` to the two `{...longPress}` wrappers, or move it into the hook's
returned style contract so future adopters inherit it.

---

## Considered and deliberately NOT flagged

| Item | Why |
|---|---|
| **Long-press as an accelerator; ⋯ as the real control** | Phase context — `deferred.md §48a`, PR body. Correct design, and better than the phone's a11y-only parallel path. |
| **Honest export / fallback notices** | Phase context, `§52.2`. |
| **`DeleteConfirmationModal`'s dismissing scrim vs `AlertDialog`'s inert one** | Deliberate, `§48`. |
| **No GPS capture on the incident form** | Deliberate, `§53a`. |
| **Inline `CSSProperties` everywhere in `features/demo/ui/**`** | That *is* the convention. All new components comply; no Tailwind `className` appears in the diff. |
| **`ModalShell` has no focus trap / focus return** | Pre-existing, tracked at `§7` with a stated trigger. WEB-5 is a distinct defect (a return that *is* implemented and cannot fire), not a re-file. |
| **`screenIn` animation ungated by reduced motion on `DeleteConfirmationModal`** | Established pattern — `ModalShell:89`, `AlertDialog:92`, `PdfPreview:136` all do the same and are unflagged. The new `slideBack` timeline animation *is* correctly gated (`DashboardScreen.tsx:139`, `useReducedMotion` from `motion/react`). Re-filing the modal family here would be noise; fold it into the next motion sweep. |
| **`role="status"` regions mounted together with their content** (`CameraGpsCapture.tsx:157`, `IncidentLocationFields.tsx:286`) | Both mirror `GpsCaptureControl.tsx:187`, the reviewed P1.2/P2 precedent. `NewLocationModal`'s unconditional-wrapper note was a targeted R-15 fix for the blocked-reason region, not a general rule. |
| **New bridge state with a single consumer** (`dupName`, `incidentForm`, `newAddrState`) | The store-bridge rule (`features/demo/CLAUDE.md`) requires modal working values to live in `DemoExperience`; `caseForm`/`locForm` set the precedent. Flagging it would re-litigate the architecture. |
| **⋯ trigger is ~42 px wide** (`RowActions.tsx:57-66`: 18 px glyph + 12 px padding each side) | Passes WCAG 2.2 AA 2.5.8 (24×24); 2 px shy of AAA 2.5.5. Height is inherited from the stretched row (~50–70 px). Not worth a finding. |
| **`CaseActionsSheet` measure loop** | `useLayoutEffect` + `ResizeObserver` with a reference-preserving `setMetrics` and a `disconnect()` cleanup; the observed node is the *uncapped* content wrapper, so the `maxHeight` it feeds cannot drive the observation. Measured before first paint, so no unscrolled flash. Correct. |
| **50 `useGpsCapture` instances on a full camera list** | The hook creates no listener, timer or subscription at mount — four `useState`, three `useRef`, two effects. No standing cost. |

---

## Web Reviewer Summary

| Severity | Count |
|---|---|
| BLOCKER / CRITICAL | 0 |
| MAJOR / HIGH | 1 |
| MEDIUM | 4 |
| MINOR / LOW | 3 |

Marketing↔demo isolation: **preserved**
Bundle impact: **none** (no dependency, config, or import-shape change; wall re-grepped clean)
Browser-resource cleanup: **complete**
Accessibility: **gaps found** (WEB-3, WEB-4, WEB-5, WEB-6, WEB-7)
Style-convention adherence: **correct half** — inline `CSSProperties` throughout, lifted rules and
device math untouched, no new global CSS, no keyframe duplication

**Verdict: REVISE**

**Notes:** The P3 assembly reconciled three parallel spellings each of the submit gate, `Field.error`
and the long-press hook (`§56d`–`§56f`) — and the three MAJOR/MEDIUM findings here are all the same
shape: a semantic that *one* package got right and the union dropped or never saw (WEB-1's touch
latch, WEB-2's third hook, WEB-3's hard `disabled`). A fix round should treat the consolidation
itself as the unit of work rather than patching the three sites independently.
