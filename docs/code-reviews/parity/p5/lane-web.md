# P5 — WEB lane (platform / a11y / perf)

**PR:** #34 `master..feat/parity-p5` — Export surfaces (engine port, 4th tab, modals, real case-map download)
**Reviewer:** web-reviewer (render + bundle perf, a11y, browser-API correctness, CSS discipline, marketing↔demo isolation)
**Worktree:** `scratchpad/worktrees/parity-p5` · deps installed
**Gates run by this lane:** `pnpm build` (exit 0) · 9 export-related suites solo (101 tests, 9 files, all green)

Context read first, as instructed: PR #34 body (DO-NOT-RE-FLAG list), `docs/code-reviews/deferred.md`
§§70–74, `features/demo/CLAUDE.md`, plus the repo-wide a11y precedents (§67c, R-8, R-9, R-17).

---

## Gate results (measured, not asserted)

| Gate | Result |
|---|---|
| `pnpm build` | ✅ exit 0, `tsc` clean through the Next type-check step |
| `/demo` First Load JS | **107 kB — unmoved.** Matches the PR body's claim exactly. |
| Case-map lazy chunk | `.next/static/chunks/225.432f8a2b6ecf035e.js` = **92,113 B raw / 22,381 B gzip**. Contains `__CASE_META__`/`CASE_GEOJSON`. |
| Chunk is genuinely lazy | `.next/server/app/demo.html` references 7 chunks; **225 is not among them**. |
| Static importers of `logic/case-map` | Zero outside the module. Only `await import()` at `DemoExperience.tsx:1275`. Not re-exported from `engine/index.ts` or `logic/export/index.ts`. |
| Marketing↔demo wall | **Preserved.** The one `features/demo` hit under `components/` is the pixel-constant *comment* in `phone-frame.tsx:7`, not an import. |
| Chrome scope | Untouched — no change to `app/layout.tsx` or `app/(default)/`. |
| `package.json` / `next.config.js` / `postcss.config.js` | Unchanged. No new dependency. |

**Bundle verdict: none.** The 85 kB template is correctly quarantined behind a dynamic import, the
generated `template.ts` carries a "never import this from a First-Load module" banner, and the port
script asserts the token contract at generation time. This is the right shape.

**Exported artifact (`case-map.template.html`, extracted and inspected):** no `<meta http-equiv="Content-Security-Policy">`,
so nothing in the downloaded file is CSP-gated. Two `<script type="application/json">` data tags at
`:600-601` and one inline `<script>` at `:708-1543`; the only external script is Mapbox GL from CDN
(`:10`), which is §71f's disclosed-by-construction network dependency. **The `</script>` escape holds** —
`encodeJsonForScriptTag` (`build.ts:63-65`) replaces `<` with `<`, which also forecloses the
`<!--` script-data-escaped state, and `<title>` goes through `escapeHtml` (`shared.ts:5-7`, covers
`& < > "`). `__MAPBOX_TOKEN__` lands raw inside a single-quoted JS literal but is site-owner env, not
visitor input — not a finding.

---

## Findings

### [HIGH] The one genuinely-real export reports success from "the click didn't throw"

**File:** `features/demo/ui/inputs/download-file.ts:99-108` · `features/demo/ui/DemoExperience.tsx:1294-1306`

**Issue:** `saveTextFile` returns `{ ok: true }` whenever `clickDownloadAnchor` returns without
throwing. `HTMLAnchorElement.click()` is fire-and-forget in **every** browser — there is no
completion signal, no error event, and a suppressed download throws nothing. So every reason a
browser refuses the save (Safari's download settings, an extension, a hardened/enterprise profile,
a private-window restriction, a lost user-activation window — see the MEDIUM below) produces
`ok: true`, and the demo prints **"Success — Case Map exported successfully."** over an empty
Downloads folder. This is a fake success on the one artifact the whole phase advertises as real
(D4, §71, `exportNotices.ts:63-72`), i.e. the exact failure mode the honesty machinery exists to
prevent.

**Evidence:**
```ts
// download-file.ts:99-105
try {
  url = registry.create(io.toBlob(input.content, input.mimeType))
  io.clickDownloadAnchor(url, input.filename)
  return { ok: true, filename: input.filename }   // <- "did not throw" ≠ "saved"
} catch (e) { … return { ok: false, reason: 'failed' } }
```
`clickDownloadAnchor` (`:48-61`) does `createElement` → `href`/`download` → `appendChild` →
`click()` → `remove()`. None of those throws on a refused download. Contrast the repo's own
standard for this exact situation — `71f`/`caseMapExportedNotice` already qualifies the banner with
what it *cannot* guarantee ("Without a Mapbox token its basemap stays blank"), so the pattern of
saying only what is known is established here.

**Fix:** the outcome cannot be verified — so the copy must stop claiming it. Change the success
string from a completion claim to a request claim, e.g.
`'Case Map ready — your browser was asked to save <filename>. Check your downloads.'`, and keep the
two existing caveats. Optionally rename `SaveFileOutcome.ok` to something like `requested` so the
type stops implying a verified write. (No code change to the save path is needed or possible.)

---

### [HIGH] The export progress overlay is silent to assistive tech — `role="progressbar"` prunes its own content

**File:** `features/demo/ui/screens/ExportModal.tsx:93-135`

**Issue:** Two independent defects stack on the same node:

1. **`progressbar` is a presentational-children role** (ARIA 1.2 §"Presentational Children":
   `button, checkbox, img, math, menuitemcheckbox, menuitemradio, meter, option, progressbar,
   radio, scrollbar, separator, slider, switch, tab`). Every descendant of the `role="progressbar"`
   div is therefore pruned from the accessibility tree — the stage line, `"Location 2 of 3"`, and
   the quoted location name are **not exposed at all**. The only thing a screen reader can get is
   the accessible name, `aria-label={view.stageMessage}`.
2. **The live region ships pre-populated.** `aria-live="polite"` is on the same node, which mounts
   with its content already in place; and thereafter what changes is an *attribute*
   (`aria-label`), not DOM text inside the region. Live-region announcements are driven by text
   mutation inside an already-present region — attribute churn on a presentational-children node
   is the worst case for this.

The file **documents this exact rule 40 lines later and obeys it** in the sibling:
```ts
// ExportModal.tsx:166-171
// Live regions only announce content that CHANGES after they mount, so the announcement is
// written on the next tick rather than rendered inline — otherwise the region ships with its
// text already in place and most screen readers say nothing.
const [announcement, setAnnouncement] = useState('')
useEffect(() => { setAnnouncement(prompt.announcement) }, [prompt.announcement])
```

**Concrete scenario:** `/demo` → Export tab → arm a case → **Export Full Case ZIP**. The CTA
immediately gains `disabled` (`ExportHub.tsx:234`), which drops focus to `<body>`; the
non-dismissible overlay then holds the screen for ~2.2 s (`EXPORT_STEP_MS = 550` × N+1) while
announcing nothing. A screen-reader user activates the tab's primary CTA and hears **silence**
until the terminal `AlertDialog` mounts and grabs focus. WCAG 2.2 **4.1.3 Status Messages (AA)**.

**Evidence of the correct in-repo pattern:** `ExportModal.tsx:198-200` (sr-only
`role="status" aria-live="assertive"` fed from an effect), `DemoNotification.tsx:55` (`role="status"`,
review R-9), and the existing test at `__tests__/ExportModal.test.tsx:63-67` only asserts the
*attribute shape* (`toHaveAttribute('aria-live','polite')`), which is why the gap is green today.

**Fix:** keep `role="progressbar"` for the widget semantics but stop relying on it to speak — add a
sibling sr-only live region using the pattern already in this file:
```tsx
<div role="status" aria-live="polite" style={srOnly}>{spoken}</div>
// spoken = [view.stageMessage, view.progressLabel, view.locationLabel].filter(Boolean).join(', ')
// written via useEffect on the composed string, exactly like ValidationContent
```
and give the progressbar `aria-valuemin/max/now` (or leave `aria-valuenow` off to keep it
indeterminate during `validating`/`zipping`) plus `aria-valuetext` for the composed line.

---

### [HIGH] `ExportActionSheet` is a new overlay with no focus management, and its `role="menu"` arrow keys are unreachable from the state it opens in

**File:** `features/demo/ui/screens/ExportActionSheet.tsx:97-134`

**Issue:** The sheet mounts with **no focus move into itself and no restore on close**. The `role="menu"`
container carries no `tabIndex`, so nothing in the sheet is focused when it opens.

The concrete consequence: keyboard/SR visitor on Completion presses **Export Zip**
(`CompletionScreen.tsx:120-129`, `onExportZip` at `:122`). That button is *not* disabled at this point
(`canExport = !!currentLocation && !exportBusy`, `DemoExperience.tsx:2380`), so focus stays on it —
behind the scrim, in a subtree that is now visually obscured. Tab order then walks **the rest of the
Completion form and the whole tab bar** before reaching the sheet's menu items, because the overlay
root is the *last* child of the phone frame (`PhoneFrame.tsx:145 → :147 → :164`). This is verbatim the
harm R-8 already fixed once, and documented in-repo:

> "…leaving focus on the 'View fullscreen' button that opened it stranded a keyboard or
> screen-reader visitor OUTSIDE the only thing they could still perceive — Tab then walked every
> hidden control behind the layer before reaching Close."
> — `MediaLibrarySheet.tsx:323-335`

The established two-effect idiom exists in **four** places (`AlertDialog.tsx:55-61`,
`MediaLibrarySheet.tsx:340-346`, `DeleteConfirmationModal.tsx`, `PdfPreview.tsx`) and the sibling
component added by this same PR uses it (`ExportModal.tsx:181-187`). The sheet is the only new
overlay in P5 that omits it.

**Second half — the arrow-key affordance is dead on the primary entry path.** The component's own
comment claims `// role="menu" promises arrow-key traversal, so it is implemented rather than
claimed` (`:107`), but `onListKeyDown` is a React `onKeyDown` on the container: in a real browser a
keydown is dispatched at `document.activeElement` and bubbles, so with focus still on **Export Zip**
(outside the portal) the handler never fires. The test that pins it fires the event *directly on the
container*, which the browser will never do:
```tsx
// __tests__/ExportActionSheet.test.tsx:114-118
const sheet = screen.getByRole('menu')
fireEvent.keyDown(sheet, { key: 'ArrowDown' })
expect(location).toHaveFocus()
```
Escape does work (`:99-105`), so the visitor is not trapped — this is a friction/announcement
failure, not a dead end.

**Fix:** add the AlertDialog two-effect block plus `tabIndex={-1}` on the `role="menu"` container
(focus it on mount so the first ArrowDown lands, restore to the opener on unmount, guarded by
`isConnected`); and change the keyboard test to focus a menuitem first, so it pins reachability
rather than the handler in isolation.

---

### [MEDIUM] The Case-Map download click is separated from the user gesture by a network-backed dynamic import, with no pending affordance and no re-press guard

**File:** `features/demo/ui/DemoExperience.tsx:1260-1307` (`await import` at `:1275`, click at `:1294`) ·
`features/demo/ui/screens/map/LocationList.tsx:36-56`

**Issue:** `exportCaseMap` `await`s `import('@/features/demo/engine/logic/case-map')` (a 22.4 kB
gzip network fetch on first press) **before** `saveTextFile` reaches `anchor.click()`. Transient user
activation has a 5 s lifetime; a first press on a slow/flaky connection can outlive it, at which
point the click is an un-activated programmatic download and subject to the browser's
automatic-download blocking. Combined with the HIGH above, the visitor then sees a success banner.

Two smaller consequences of the same shape:
- **No pending state.** `Export Map` (`LocationList.tsx:40-56`) has no `disabled`/spinner while the
  chunk is in flight, so on a slow connection the button appears dead. Every other async surface in
  this repo shows a spinner (`GpsCaptureControl.tsx:87`, `PickerStage.tsx:115`,
  `ImportTerminalProgress.tsx:328`).
- **No re-press guard.** `exportCaseMap` bypasses `requestExportFlow` entirely and consults no
  `isExporting`, so N presses start N independent IIFEs and produce N downloads
  (`Case-Map.html`, `Case-Map (1).html`, …). The phone gates this behind `isExporting`.

**Fix:** either prefetch the chunk when the map sheet's list mode mounts (or on
`onPointerEnter`/`onFocus` of the button) so the click is synchronous with the gesture, **or** build
the HTML first and defer only the save. Add a `busy` ref/state that disables the button for the
duration and drives a spinner, matching the four existing spinner call sites.

---

### [MEDIUM] New infinite spinner is not gated on `prefers-reduced-motion`

**File:** `features/demo/ui/screens/ExportModal.tsx:110-121`

**Issue:** `animation: 'spin 0.9s linear infinite'` runs unconditionally on the export progress
overlay. The repo's established shape for this exact keyframe is `reduce ? undefined : 'spin …'`, in
**four** places:
`ui/screens/import/ImportTerminalProgress.tsx:328`, `ui/screens/import/PickerStage.tsx:115`,
`ui/inputs/GpsCaptureControl.tsx:87`, `ui/inputs/CameraGpsCapture.tsx:91`.
The demo's motion is gated in JS by design — `app/css/style.css`'s `prefers-reduced-motion` block is
class-matched and does not reach inline-styled demo animations (feature contract). `ExportHub.tsx:140,192`
in this same PR correctly calls `useReducedMotion()` for its footer rise, so this is an inconsistency
inside the diff, not a convention question. (The one-shot `screenIn`/`sheetUp` entrances on
`ValidationContent` and `ExportActionSheet` match the ungated precedent of `AlertDialog.tsx:92` /
`PickerSheet.tsx:62` — not flagged.)

`SyncStatusCard.tsx:59` is the one pre-existing ungated `spin`; worth folding into the same fix
round but it is not this PR's.

**Fix:** `const reduce = useReducedMotion()` in `ProgressContent`, then
`animation: reduce ? undefined : 'spin 0.9s linear infinite'`.

---

### [MEDIUM] The tab bar signals the active tab by colour alone — now across four destinations

**File:** `features/demo/ui/controls/TabBar.tsx:83-87`

**Issue:** Each tab is a `<button aria-label={TAB_LABELS[id]}>` whose only "I am current" signal is
stroke colour (`#4BA3D4` vs `#5d7a9a`) and a 0.1 px stroke-width bump. There is no `aria-selected`,
`aria-current`, `aria-pressed`, or `role="tab"` — a screen-reader user hears "Dashboard, button /
Cases, button / Map, button / **Export, button**" with no indication which one they are on, and a
low-vision user gets a hue-only cue (WCAG **1.4.1 Use of Color**, **4.1.2 Name, Role, Value**).

This is a pre-existing shape that the diff **carries forward and extends from 3 destinations to 4** —
I am flagging it because P5 is the change that rewrote these exact lines from hand-listed buttons to
a registry map, making the fix a one-line addition inside the `map()`, and because the phone does
not have this gap: React Navigation's tab item sets `'aria-selected': focused` on every tab
(`node_modules/@react-navigation/bottom-tabs/lib/module/views/BottomTabItem.js:136-141`, whose own
comment explains why they use button role rather than `role="tab"` — the same conclusion §67c
reached for the media-library tabs).

**Fix:** in the `TAB_VIEWS.map()` at `:83`, add `aria-current={active === id ? 'page' : undefined}`
(or `aria-pressed={active === id}`, matching §67c's `role="group"` + `aria-pressed` ruling for the
media tabs — pick one and use it for both surfaces). Zero visual change.

---

### [LOW] `showTabs` is now dead **and** stale

**File:** `features/demo/ui/DemoExperience.tsx:2126`

`const showTabs = view === 'dashboard' || view === 'cases' || view === 'map'` survived the switch to
`tabView = isTabView(view)` and has no remaining reader. It is not merely dead — it encodes the
**pre-P5 rule** (no `'export'`), so the next person who reuses it silently reintroduces a tab bar
that vanishes on the Export tab. Delete it; the registry (`isTabView`) is the rule now.

### [LOW] The flow's `case-map` terminal copy is stale within its own PR

**File:** `features/demo/ui/screens/exportNotices.ts:67-73`

The `case-map` arm still says *"That one IS reproducible here and is being built; it just is not
wired to this button yet. Nothing was generated."* — §74f's interim, written when P5.4 had not
merged. P5.4 **did** land in this PR, but via a separate path: nothing dispatches
`{ type: 'case-map' }` through `requestExportFlow` (verified — the only `'case-map'` references
outside the engine are the type union, the `startExportRun` early-return at
`DemoExperience.tsx:1967`, and this notice). So the arm is unreachable and the visible consequence is
zero today — but the PR body's line *"the case-map dispatch arm in the flow awaits P5.4's builder
(same PR — wired)"* is not accurate, and the string is a lie waiting for its first caller. Either
delete the arm from the union or repoint it at `exportCaseMap`. Flagged from this lane only because
it is user-facing copy; the dead-branch question belongs to the TS lane.

---

## Checked and cleared (so the fix round doesn't re-derive them)

- **Object-URL lifecycle** — `saveTextFile` mints through `createObjectUrlRegistry`, revokes in a
  `finally` via a deferred `setTimeout(…, 0)`, and the registry is per-call so nothing accumulates
  across repeated exports. Revoking in the click's own tick would cancel the download in some
  browsers and the code says so (`download-file.ts:32-37`). The 85 kB blob is far too small for the
  revoke-race that bites multi-MB blobs. **No leak.**
- **Firefox detached-anchor rule** — handled: the anchor is appended to `document.body` before
  `click()` and removed in a `finally` (`:53-60`).
- **Timer teardown** — `exportTimer` is cleared on unmount (`DemoExperience.tsx:766-769`) and
  cleared belt-and-braces at the top of `runZipPipeline` (`:1938`). Matches the `syncTimer` pattern.
- **Browser globals** — every `document`/`Blob`/`URL` read is behind `readBrowserDownloadIo()` /
  `readBrowserObjectUrls()`, called at call time, never at module scope. SSR-safe; `/demo` is
  `ssr:false` regardless.
- **Lazy-chunk failure** — the `await import()` is wrapped and produces
  `CASE_MAP_MODULE_FAILED_NOTICE` rather than an unhandled rejection. Correct, and pinned by a
  separate suite file (§71j's isolation note).
- **Render perf** — `exportFlow` ticks 4× over ~2.2 s for a 3-location case; nothing in the phone
  subtree is `React.memo`'d, so no memo is defeated, and `exportCases` is memoized while
  `pruneSelection` is reference-stable when nothing changed. Not a re-render storm. New bridge state
  (`exportSelection`, `exportFlow`) is on the PR's DO-NOT-RE-FLAG list under §70a/§73 and is
  correctly scoped there anyway (`exportFlow` has four consumers).
- **Unvirtualized list** — the hub's list is bounded by the cases the visitor created in-session and
  each row is light. Not a virtualization case.
- **Animated properties** — `exportFooterRise` is transform-only and reduced-motion gated
  (`ExportHub.tsx:192`, `demo.css:120-126` — keyframe at `:123`). No layout-thrashing animation added.
- **Styling half** — everything new under `features/demo/ui/**` is inline `CSSProperties`; the two
  new keyframes live in `demo.css` alongside the existing ones; no Tailwind leaked in; the lifted
  device math is untouched.
- **Tri-state checkbox** — `<button role="checkbox" aria-checked={true|'mixed'|false}>` is correct
  (`mixed` is supported on `checkbox`, unlike `switch`), the visual box is `aria-hidden`, and native
  button gives Space/Enter for free. `aria-label`s are phone-verbatim
  (`ExportCaseCard.tsx:149,156`, `ExportLocationRow.tsx:54-56` on the phone). **Correct.**
- **Dialog contract** — `ValidationContent` has `role="alertdialog"` + `aria-modal` +
  `aria-labelledby`/`aria-describedby` + Escape + scrim-cancel + focus in/out, all gated on
  `!isExporting` per the phone. Matches `screens/__tests__/a11y.test.tsx`'s pinned idiom.
- **Escape collisions** — no new §19/§63e-class double-close: every dispatcher closes its own modal
  (`closeLocationActions()` / `closeModal()`) in the same handler *before* the flow's own
  document-level listener mounts, so cleanups run first within the commit.
- **§74j (a run follows the visitor across screens)** and **§73g (Clear stays live during a run)** —
  both explicitly ruled, not re-filed. Noted only that the non-dismissible scrim blocks pointers but
  not keyboard (no `inert`), which is the same repo-wide modality gap PickerSheet/ModalShell already
  have; not new here.

---

## Web Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 3 |
| MEDIUM | 3 |
| LOW | 2 |

Marketing↔demo isolation: **preserved** (verified by grep; no import-form hit)
Bundle impact: **none** — `/demo` First Load JS 107 kB unmoved; case-map is a 92,113 B raw / 22,381 B
gzip chunk absent from `/demo`'s HTML manifest (measured with `pnpm build`)
Browser-resource cleanup: **complete** — object URLs registry-scoped and revoked, timers torn down on
unmount, no listener/observer leak found
Accessibility: **gaps found** — silent progress overlay (4.1.3), unmanaged focus on the new action
sheet, colour-only tab state (1.4.1/4.1.2)
Style-convention adherence: **correct half** — inline `CSSProperties` throughout the demo, keyframes
scoped to `demo.css`, lifted rules untouched

**Verdict: REVISE**

Notes: The bundle work and the object-URL discipline are exemplary — the case-map quarantine, the
port-script token assertions and the `</script>` escape are all better than the phone they were
ported from. Every HIGH is a small, local fix (one sr-only live region, one two-effect focus block,
one copy string), and each has a correct implementation elsewhere in this same diff to copy from.

---
---

# Fix-delta r1

**Diff reviewed:** `3aab581..6cf026f` (four package merges + 19 fix commits) · worktree `parity-p5` at
`6cf026f`, `feat/parity-p5`
**Gates re-run by this lane:** `pnpm build` **exit 0** · cold-cache `tsc --noEmit` **exit 0** ·
109 UI test files / 1284 tests green (`features/demo/ui/**/__tests__`)

## Disposition of this lane's round-0 findings — 8 of 8 FIXED

| # | Round-0 finding | Fix | Verdict |
|---|---|---|---|
| HIGH-1 | Download reports success from "the click didn't throw" | R-2 `a59c73f` + R-9/R-14 | **FIXED** |
| HIGH-2 | Progress overlay inaudible to AT | R-6 `48a78ad` | **FIXED** |
| HIGH-3 | Action sheet: no focus management; arrow keys unreachable | R-7 `732a051` | **FIXED** |
| MED-1 | Download click separated from gesture; no pending / no re-press guard | R-8 `7f049c4` | **FIXED** |
| MED-2 | Infinite spinner not reduced-motion gated | R-18 `48a78ad` | **FIXED** |
| MED-3 | Tab bar signals active tab by colour only | R-19 `825d459` | **FIXED** |
| LOW-1 | Dead + stale `showTabs` | R-20 `a29ec92` | **FIXED** |
| LOW-2 | Stale `case-map` terminal copy | R-14 (`SimulatedExportRun`) | **FIXED** |

### HIGH-1 — FIXED, and the wording is honest for every drop class I enumerated

`SaveFileOutcome` is now `{ requested: true, filename } | { requested: false, reason }`
(`download-file.ts:100-104`), and the terminal reads **"Your browser was asked to save <filename>.
Check your downloads."** (`exportNotices.ts:130-131`). Checked against each class I named:
Chrome automatic-download blocking, a blocking extension, a hardened/enterprise profile, Safari's
download settings, expired transient activation — all return normally from `.click()`, all now land
in `requested: true`, and the sentence claims only the request. **No residue.** Two bonuses beyond
the ask: `save-unavailable` and `save-failed` get distinct, cause-specific copy
(`exportNotices.ts:146-160`), and the honest banner became a blocking `AlertDialog`
(`DemoExperience.tsx:2040`) rather than an auto-dismissing `role="status"` toast — consistent with
§74a's "the one honest sentence must not time out unread".

### HIGH-2 — FIXED; and §77b's indeterminate ruling is **endorsed**

Both halves are closed exactly as prescribed: a sibling sr-only `role="status" aria-live="polite"`
region written on the next tick from the composed `stage — counter — "location"` string
(`ExportModal.tsx:114-121, 129-131`), plus `aria-valuetext` on the bar itself
(`ExportModal.tsx:139`). The `aria-live` is off the presentational-children node, so nothing depends
on the pruned subtree any more.

**On §77b's deliberate non-change (no `aria-valuenow`): correct, and I would have insisted on it.**
ARIA 1.2 defines an omitted `aria-valuenow` on `progressbar` as exactly "indeterminate", so this is
the spec-sanctioned encoding rather than an omission; `aria-valuemin`/`aria-valuemax` are not
required alongside it. And the substantive argument holds — the k-of-n counter covers only the PDF
pass, so `zipping` has no share of the total and any percentage would be a fabricated number, which
is the one thing this feature forbids. One spec nuance, non-blocking: `aria-valuetext` is defined as
the readable alternative *to* `aria-valuenow`, so a few AT implementations ignore it when
`aria-valuenow` is absent. That is precisely why the sr-only region carries the same string, so the
belt is already there. No change wanted.

### HIGH-3 — FIXED, including the half that mattered more

Two-effect focus in/restore + `tabIndex={-1}` + `outline: 'none'` (`ExportActionSheet.tsx:112-129,
:157-159`), `isConnected`-guarded. Critically the **tests were re-pointed to fire from
`document.activeElement`** rather than at the container
(`__tests__/ExportActionSheet.test.tsx:117-124`), so the suite now pins reachability instead of the
handler in isolation — which was the actual defect. Three new focus arms including the
opener-removed-from-DOM case.

### MED-1 — FIXED by prefetch, which is the better of the two shapes I offered

The chunk is fetched on `view === 'map'` (`DemoExperience.tsx:816-832`) and the press-to-download
path is now fully synchronous inside the click handler (`startExportRun`'s `case-map` arm,
`DemoExperience.tsx:1960-1976` → `buildCaseMapDownload`). User activation is preserved end-to-end,
the pending affordance exists, and the re-press window is gone by construction rather than by a
second guard. §78c's own framing of this ("the guard is not what fixes this") is the accurate one.
The failure arm re-arms the fetch (`setCaseMapModule(null)`), so the "try again" copy is truthful.

### MED-2 / MED-3 / LOW-1 / LOW-2 — FIXED

`...(reduceMotion ? {} : { animation: 'spin …' })` with a dedicated
`ExportModal.reduced-motion.test.tsx`; `aria-current={active === id ? 'page' : undefined}` with the
§67c distinction argued correctly in the comment (`aria-pressed` stays with the media library's
*filter* strip; a tab bar *navigates*, so `page` is right); `showTabs` deleted; and the stale
terminal sentence made **unconstructible** via `SimulatedExportRun = Exclude<ExportRun, { type: 'case-map' }>`
— a stronger close than the deletion I asked for.

---

## Bundle re-verification (measured at stable HEAD)

| Metric | Round 0 | After r1 | Δ |
|---|---|---|---|
| `/demo` First Load JS | 107 kB | **107 kB** | unmoved |
| Case-map chunk (raw) | 92,113 B | 92,456 B | +343 B (`summariseCaseMapCoverage`) |
| Case-map chunk (gzip) | 22,381 B | **22,539 B** | +158 B |
| Case-map template in any `/demo` First Load chunk | no | **no** | — |

The one bundle risk this round introduced was `exportNotices.ts:4-6`'s
`import type { CaseMapCoverage } from '@/features/demo/engine/logic/case-map'` — `exportNotices` **is**
in the First Load graph, so a value import there would have dragged the 85 kB template in. Verified
erased: no chunk referenced by `.next/server/app/demo.html` contains `__CASE_META__`. The wall,
chrome scope, `package.json` and `next.config.js` are all still untouched.

---

## New findings from the fix round's blast radius

### [MEDIUM] Disabling a control on activation drops focus, and the terminal dialog then "restores" it to `<body>`

**File:** `features/demo/ui/screens/map/LocationList.tsx:84` · wired at
`features/demo/ui/DemoExperience.tsx:2493` (`exportMapBlocked={alert !== null}`) ·
same shape pre-existing at `features/demo/ui/screens/export/ExportHub.tsx:234`

**Issue:** R-8's belt (`disabled={pending || blocked}`) makes the Export Map button non-focusable in
the *same commit* that mounts the terminal `AlertDialog`. Per the HTML spec's **focus fixup rule**, a
focused element that becomes non-focusable hands focus back to the viewport — so `document.activeElement`
is `<body>` by the time React runs passive effects. `AlertDialog`'s opener capture is a passive effect
(`AlertDialog.tsx:55-61`), so it records `<body>` as the opener and, on dismiss, calls
`document.body.focus()`.

**Concrete scenario:** `/demo` → Map tab → sheet list → Tab to **Export Map** → Enter. The file is
requested and "Case Map Ready" opens (correctly focused). Press Enter on OK. Focus is now at the
document start — the visitor must Tab through the narration rail and the whole map screen to get back
to the button they just used. Before this round the same path kept focus, because the button was not
disabled and the outcome was a non-blocking banner. So this is a regression introduced by an
otherwise-correct fix, not a pre-existing gap. The identical shape already exists on the Export tab's
CTA (`disabled={isExporting}`), which is why one fix should cover both.

**Fix (one of):**
- Capture the opener in `AlertDialog` from a document-level `pointerdown`/`keydown` **capture**
  listener into a ref, instead of reading `document.activeElement` in the mount effect — fixes every
  caller at once, including the hub CTA.
- Or on the footer button, swap `disabled` for `aria-disabled={disabled}` + an early return in
  `onExportMap`, keeping it focusable (the APG "disabled but discoverable" shape). The `blocked` case
  already has no engine guard behind it, so the handler needs the explicit `if (alert) return` either
  way.

### [LOW] `aria-busy` on a `disabled` button cannot reach anyone

**File:** `features/demo/ui/screens/map/LocationList.tsx:84-86`

`aria-busy={pending || undefined}` sits on a control that `disabled` has just removed from the tab
order, and the label still reads "Export Map" with no spinner. A screen-reader user cannot land on it
to hear the busy state, and nothing else announces it. Impact is small **because** R-8 moved the fetch
to map-open, so `pending` is normally already false — but the comment's claim that `aria-busy` "says
why to anyone who cannot see the state" overstates what it can do. If the pending window is worth
announcing at all, it wants an sr-only `role="status"` line (the pattern R-6 just added next door);
otherwise the comment should be trimmed to what is true.

### [LOW] A vanished case is reported as a builder failure, and needlessly discards the loaded module

**File:** `features/demo/ui/DemoExperience.tsx:1317-1321` · `:1973-1975`

`buildCaseMapDownload` returns `{ kind: 'builder-unavailable' }` both when the chunk never arrived
**and** when `st.cases.find(...)` misses. The second cause then prints *"The Case Map builder could
not be loaded… check your connection and try again"* for a deleted case, and `startExportRun`'s
`if (outcome.kind === 'builder-unavailable') setCaseMapModule(null)` throws away a perfectly good
loaded module, forcing a pointless refetch. Unreachable from the UI today (the footer only renders
inside a picked viewer case) and §78d records the engine-side `noCaseSelectedForMap` alert as the
ported-but-unreachable counterpart — so this is a copy/side-effect nit, not a live bug. Fix: a fourth
`CaseMapOutcome` arm (`case-unavailable`) that does **not** re-arm the fetch.

### [LOW / process] `tsc --noEmit` is not a trustworthy gate in this repo without clearing its cache

**File:** `tsconfig.json:16` (`"incremental": true`)

Hit directly while verifying this round: `npx tsc --noEmit` exited **0** against a tree whose
`next build` type-check **failed**, because a stale `tsconfig.tsbuildinfo` short-circuited the run.
Any lane or fix round quoting "tsc clean" should run `rm -f tsconfig.tsbuildinfo && npx tsc --noEmit`
(or `--incremental false`). Cold-cache re-run at `6cf026f` **is** clean, and `next build` is exit 0 —
so nothing is wrong with the code; the gate is what is unreliable.

**Recorded so nobody chases it:** my first rebuild of this round raced the merge sequence (it started
between `c9a4cbc` and `6cf026f`) and failed with
`DemoExperience.tsx:693 — Argument of type '"case-map"' is not assignable to parameter of type 'never'`.
That error does **not** exist at `6cf026f` — `ExportSelectionPlan.dispatch` is
`Extract<ExportType, 'case' | 'location' | 'case-subset'>` (`selection.ts:222`), landed in `47d8ab8`.
Re-run at stable HEAD is exit 0. It is nonetheless a real illustration of the hazard R-3 and R-14
straddle: `assertNever` over a union one branch widens is a merge-order landmine, and only the
combined tree proves it defused.

---

## Fix-delta Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 3 |

Round-0 findings: **8 of 8 FIXED**, 0 PARTIAL, 0 UNFIXED
§77b indeterminate-progressbar ruling: **endorsed**
Marketing↔demo isolation: **preserved**
Bundle impact: **none** — `/demo` 107 kB unmoved; type-only case-map import verified erased
Browser-resource cleanup: **complete** — R-21's 40 s revoke window is `pagehide`-backstopped, the
listener is `{ once: true }` plus an explicit `removeEventListener` on the timer path, and the
registry makes the double-call a no-op
Accessibility: **round-0 gaps closed; one new focus-continuity regression (MEDIUM)**
Style-convention adherence: **correct half**

**Verdict: APPROVE with comments**

Notes: The three HIGHs were fixed at the level the finding pointed at rather than at the symptom —
`requested` instead of a softened string, an sr-only region instead of more ARIA on the pruned node,
and re-pointed tests instead of only the component. The one new MEDIUM is the cost of R-8's belt and
is a single change inside `AlertDialog` that also retires the same shape on the Export tab's CTA.
