# P7 review — WEB lane (platform / a11y / perf)

**PR:** #36 · `master..feat/parity-p7` · reviewed at `1505c00`
**Worktree:** `scratchpad/worktrees/parity-p7` (deps installed; `pnpm build` and targeted `vitest` runs executed here)
**Lane contract:** `.claude/agents/web-reviewer.md` — browser-platform concerns only. TS correctness, missing tests, swallowed errors and type design are other lanes.

Context read before flagging: PR #36's body (the "Deliberate choices — DO NOT RE-FLAG" list), `docs/code-reviews/deferred.md` §§7, 80 (a–g), 81 (a–e), 82 (a–i), 83 (a–c), `features/demo/CLAUDE.md`, and the render parents (`ui/DemoExperience.tsx`, `ui/screens/_shared.tsx`, `ui/inputs/Dropdown.tsx`, `ui/controls/AlertDialog.tsx`, `ui/phone-overlay.tsx`).

Severity vocabulary is the orchestrator's (**blocker / major / minor**); the lane rubric's own CRITICAL / HIGH / MEDIUM / LOW is given alongside so the mapping is auditable.

## Gates run in this worktree

| Gate | Result |
|---|---|
| `pnpm build` | ✅ clean, 19/19 static pages, exit 0 |
| `/demo` First Load JS | **107 kB — matches the PR claim exactly** |
| Marketing route First Load | `/` 121 kB · `/beta` 111 kB · `/features` 110 kB · `/privacy` 106 kB · shared 106 kB — **unmoved from the P6 table** |
| New dependencies | **none** (`git diff master...HEAD -- package.json pnpm-lock.yaml` is empty) |
| Marketing↔demo wall (`grep -rn "features/demo" components app/\(default\) lib app/layout.tsx`) | **intact** — only the doc comment in `components/marketing/phone-frame.tsx:7` and the guard test itself |
| Heavy deps still lazy | `mapbox-gl` / `pdfjs-dist` untouched by this diff; no new static import of either |
| New browser globals in production code | one `document.addEventListener('keydown')` in `SettingsModal`, **with cleanup**; no `localStorage`, no `createObjectURL`, no timers, no observers, no module-scope `window`/`document` |
| `pnpm vitest run features/demo/ui/screens/settings … field-visibility a11y` | 9 files / **164 passed** (3 consecutive clean runs + `panes.test.tsx` solo: 27 passed) |

**One flake, recorded not filed.** The *first* of my four runs of that command reported `2 failed / 7 passed (9 files)`, `7 failed / 157 passed (164 tests)`, with `panes.test.tsx:288` receiving `["about","form-customization","user-profile"]` from `[...BRIDGE_PANE_IDS]` — an array that is a two-element `as const` in source. That run overlapped the tail of `next build` writing into the Vite/Next caches in the same worktree; three back-to-back re-runs and a solo re-run of the failing file are all green, and the received value is not producible from the source. I am recording it rather than filing it — test isolation is `test-analyzer`'s lane, and if that lane sees the same shape from a *cold* worktree it has a real one.

---

## Findings

### [MAJOR · lane-MEDIUM] W-1 — `aria-disabled` shipped without its `aria-describedby` half: every inert control announces "dimmed" and never the reason

**Files:**
- `features/demo/ui/screens/_shared.tsx:421-467` (`Toggle`'s new `disabled` prop; the claim is in the doc at `:429-437`)
- `features/demo/ui/screens/settings/panes/FormFieldsPane.tsx:140-183` (`RowSwitch`; the same claim at `:133-139`)
- `features/demo/ui/screens/settings/panes/ExportSecurityPane.tsx:110-136` (`Set Default Password`)

**Consumers affected:** `AppearancePane.tsx:36-43` (Dark Mode), `CloudSyncPane.tsx:48-55` (Cloud Sync), and every locked row in the grid — the 7 always-on fields and each must-stay screen (`FormFieldsPane.tsx:268`, `:293`).

**Issue.** Both new switch implementations write `aria-disabled` and stop there:

```tsx
// _shared.tsx:444-451
role="switch"
aria-checked={on}
aria-disabled={disabled || undefined}
aria-label={label}
tabIndex={0}
```

The doc comment immediately above it names the rule it is following — *"the house rule (`ModalActions.submitBlocked`, the GPS capture button's §45a precedent) is that a control stays focusable so a keyboard visitor can reach it and hear WHY it is unavailable from the copy beside it"* — and `RowSwitch`'s doc repeats it verbatim ("hears the 'Always on' pill beside it"). But "the copy beside it" is not programmatically associated with anything. `aria-disabled` alone announces a *state* ("dimmed" / "unavailable"); it carries no reason. In focus mode a screen reader reads only the focused node's name, role, state — not its unlabelled siblings.

The cited precedent does both halves:

```tsx
// _shared.tsx:346-347  (ModalActions — the rule being cited)
aria-disabled={submitBlocked}
aria-describedby={submitBlocked ? submitDescribedBy : undefined}
```

and so does every other inert control in this feature: `DuplicateLocationModal.tsx:95`, `OcrCaptureScreen.tsx:445`, `MediaCaptureScreen.tsx:737`. P7 is the first `aria-disabled` in the repo that ships without a description.

**Concrete failure.** `/demo` → Dashboard → gear → **Form Fields** → expand *Submission Details* → Tab to the **Case Number** row's switch. NVDA/VoiceOver announce "Case Number, switch, on, dimmed". Enter and Space do nothing. Nothing tells the visitor the field is always-on; the "Always on" pill (`FormFieldsPane.tsx:125-131`) is an unlabelled `<span>` two nodes away and is never read at that moment. Same on **Appearance → Dark Mode** and **Cloud Sync → Enable cloud sync**, where the reason lives in a `PaneStubNote` at the top of a scrolled pane — announced when the visitor passed it, not when they reach the control that needs it. A screen-reader user cannot distinguish "deliberately locked" from "broken".

**Fix.**
1. `LockPill` takes an id (`useId()` at the `ScreenRow`/field-row level), and `RowSwitch` gains `describedBy?: string` → `aria-describedby={disabled ? describedBy : undefined}`, wired to that pill. That makes the pill's own text ("Always on") the description, so nothing new is written.
2. `Toggle` gains the same optional `describedBy`. `AppearancePane` / `CloudSyncPane` give `PaneStubNote` an id (it already renders a single wrapper at `_pane-chrome.tsx:108-136`) and pass it — or, tighter, add a one-line `PaneNote` beside each inert switch and point at that.
3. `ExportSecurityPane`'s `Set Default Password` points `aria-describedby` at the `PaneNote` already sitting directly under it (`:136-140`).

---

### [MAJOR · lane-MEDIUM] W-2 — The Photo Quality slider announces a number the pane never shows

**File:** `features/demo/ui/screens/settings/panes/_pane-chrome.tsx:236-250`
**Caller:** `features/demo/ui/screens/settings/panes/MediaCapturePane.tsx:61-79`

**Issue.** The range input is bound to the raw quality scalar and carries no `aria-valuetext`:

```tsx
// _pane-chrome.tsx:239-250
<input
  id={uid}
  type="range"
  aria-label={label}
  value={value}          // 0.5 … 1.0, step 0.05
  min={min} max={max} step={step}
```

while the pane's visible readout is a percentage computed from the same value (`MediaCapturePane.tsx:63` → `photoQualityPercent(settings.photoQuality)` → `85%`), and the two end captions read `50% (Smallest)` / `100% (Best)` (`_pane-chrome.tsx:251-254`) as plain, unassociated text.

**Concrete failure.** Focus the slider and press Right. The screen shows `Photo Quality  85%`. AT announces the raw scalar — `0.85` in Chrome/NVDA — and for a range whose `min` is not 0 several AT/browser pairs announce percent-*of-range* instead (`(0.85−0.5)/(1−0.5) = 70%`). Either way the announced number contradicts the number on screen, on the one control in this surface whose whole purpose is a number (WCAG 4.1.2 — name, role, **value**).

Secondary, same block: `const uid = useId()` (`:236`) feeds `id={uid}` (`:240`) and nothing references it — there is no `<label htmlFor>`. Dead id; `aria-label` is doing the naming.

**Fix.** Add `valueText?: string` to `PaneSlider` → `aria-valuetext={valueText}`, and pass `` `${photoQualityPercent(settings.photoQuality)}%` `` from `MediaCapturePane` (the value it already computes for the group header). Drop the unused `useId`/`id` pair, or promote it into a real `<label htmlFor={uid}>` and delete the `aria-label`.

---

### [MAJOR · lane-MEDIUM] W-3 — Six settings pickers open a bottom sheet named "Select an option", with no indication of which setting is being chosen

**Files:** `features/demo/ui/screens/_shared.tsx:409-418` (`SelectField`'s `label` made optional) → `features/demo/ui/inputs/Dropdown.tsx:110-112`
**Call sites:** `MediaCapturePane.tsx:83`, `:94`, `:105` · `LocationPane.tsx:54`, `:62` · `TimeSyncPane.tsx:44`

**Issue.** Omitting `label` is a deliberate, well-argued phone-parity choice, and `PaneGroup`'s `role="group" aria-label` (`_pane-chrome.tsx:52`) genuinely restores the *trigger*'s context. What the group boundary cannot reach is the sheet that opens on top of it:

```tsx
// Dropdown.tsx:110-112
<PickerSheet title={label || 'Select an option'} onClose={() => setOpen(false)}>
  <div role="menu" aria-label={label || 'Select an option'}>
```

With `label` undefined, the dialog's accessible name **and** the menu's accessible name both collapse to the placeholder literal.

**Concrete failure.** `/demo` → gear → **Media Capture**. Three pickers sit within one scroll (`Video Quality`, `Video Codec`, `Maximum Video Duration`). Open any of them: the overlay announces "Select an option, dialog", the list announces "Select an option, menu", and the options are bare values (`1920x1080 (1080p)`, `H.265 (HEVC)`, `5 minutes`). Nothing on the opened surface identifies which of the three settings is being changed; the visitor has to have remembered. That is the dialog-naming idiom the repo's own `a11y.test.tsx` pins everywhere else, unwound by an optional prop.

**Fix.** Give `Dropdown` (and `SelectField`) an `a11yLabel?: string` that names the sheet and the menu without rendering the visible label line:

```tsx
<PickerSheet title={label || a11yLabel || 'Select an option'} …>
  <div role="menu" aria-label={label || a11yLabel || 'Select an option'}>
```

and pass the pane's own `PaneGroup` label at the six call sites. Visual parity is untouched; only the two accessible names change.

---

### [MAJOR · lane-MEDIUM] W-4 — `aria-labelledby` on a role-less `<div>`: the detail pane's name is prohibited, not merely unusual

**File:** `features/demo/ui/screens/settings/SettingsModal.tsx:164`

```tsx
<div key={active.id} ref={detailRef} tabIndex={-1} aria-labelledby={titleId} style={{ ...pane, ...enter }}>
```

**Issue.** The doc at `:123-137` states the intent precisely — *"focus the detail container (the `AlertDialog` idiom: `tabIndex={-1}` + `aria-labelledby` the pane title), so a screen reader hears WHICH pane opened"*. But the `AlertDialog` idiom is `role="alertdialog"` **plus** `aria-labelledby` (`AlertDialog.tsx:136-139`), and the role is the load-bearing half. A `<div>` with no role maps to ARIA `generic`, whose name-from is **prohibited** (ARIA 1.2 §5.3.2). The name is discarded by the accessibility tree, `axe-core`'s `aria-prohibited-attr` rule flags it as *serious*, and the announcement the comment promises does not happen — what AT actually reads on a programmatic focus of a role-less container is browser-dependent (NVDA reads the subtree, VoiceOver typically says nothing).

This is the only `aria-labelledby` in the feature that sits on a role-less node. Every other one has an explicit role: `DeleteConfirmationModal.tsx:103` (`role="dialog"`), `ExportModal.tsx:250` (`role="dialog"`), `AlertDialog.tsx:137` (`role="alertdialog"`), `Dropdown.tsx:75` (`<button>`).

**Concrete failure.** Settings sheet → tap **Export Security**. Focus is moved to the detail container as designed, but the container has no name in the a11y tree, so the pushed-pane transition is announced as an unnamed focus move. The `role="heading" aria-level={2}` title (`SettingsNavBar.tsx:107`) is inside the container and is reachable by browse-mode navigation, but the intended focus-time announcement never fires.

**Fix.** One word: `role="group"` on that div (`role="region"` also works but adds a landmark inside a dialog, which is noisier). The existing `aria-labelledby` then resolves and the comment becomes true.

---

### [MINOR · lane-MEDIUM] W-5 — The screen-row expander bakes its state into its accessible name, against the rule this repo's own accordion states

**File:** `features/demo/ui/screens/settings/panes/FormFieldsPane.tsx:255-256`

```tsx
aria-expanded={expanded}
aria-label={`${step.label}, ${expanded ? 'expanded' : 'collapsed'}`}
```

**Issue.** `aria-expanded` already carries the state; putting it in the name too makes AT announce it twice ("Submission Details collapsed, button, collapsed"). It also overrides the button's own visible text content with a string that is no longer the visible label.

The repo has already decided this, in a comment, on the analogous control:

```tsx
// WizardDrawer.tsx:180-184  (MediaAccordion)
aria-label="Media section"
aria-expanded={expanded}
// The phone's accessibilityHint, verbatim. On the web `aria-expanded` already carries
// the STATE, so this rides as the tooltip — the closest native analog to a hint.
title={expanded ? 'Collapse media options' : 'Expand media options'}
```

None of the repo's other eight `aria-expanded` sites (`RowActions.tsx:62`, `ImportResultAccordion.tsx:32`, `DashboardScreen.tsx:177`, `ImportModal.tsx:150`, `ExportCaseCard.tsx:163`, `TerminalLine.tsx:160`, `Dropdown.tsx:77`, `AddressAutocomplete.tsx:183`) puts state in the name. This is the only one, ×12 rows.

**Fix.** `aria-label={step.label}` — or drop `aria-label` entirely and let the button's text content name it, which is what the other eight do. Optionally add `aria-controls={bodyId}` pointing at the `fc-body-${step.id}` container (`:279`), which currently has a testid but no id.

---

### [MINOR · lane-MEDIUM] W-6 — The first modal-over-modal stacks two `aria-modal="true"` dialogs with no background suppression

**Files:** `features/demo/ui/screens/_shared.tsx:82-94` (`ModalShell`, `elevation` 4) and `features/demo/ui/screens/settings/SettingsModal.tsx:154-162`, both portalled into the same `PhoneOverlayContext` root (`phone-overlay.tsx:24-38`).

**The elevation mechanics themselves are sound — verified.** I walked the whole overlay stack:

| Surface | z (scrim / panel) |
|---|---|
| `SettingsModal` | 21 / 22 |
| `ModalShell` `elevation={4}` (profile editor) | 25 / 26 |
| `PickerSheet` (the editor's two `DateField`s) | 31 / 32 |
| `AlertDialog` (the "Apply profile?" confirm) | 60 / 61 |

The editor lands above the sheet; the sheet's scrim (`SettingsModal.tsx:154`, `onClick={onClose}`) is fully covered by the editor's own scrim at 25, so a backdrop click while the editor is open dismisses only the editor; the date pickers still land on top of the editor; and the profile-switch confirm raised from inside the sheet (`DemoExperience.tsx:703-712`) renders at 61, well clear. Pointer-events are correct at every layer. The `elevation` prop is a good, minimal device and its default of `0` leaves the eight existing callers byte-identical.

**What is not covered.** Both dialogs assert `aria-modal="true"` simultaneously, as DOM siblings, and neither marks the other `inert` or `aria-hidden`. `aria-modal` is a *hint* that AT should suppress everything outside the node; with two peers asserting it and nothing else distinguishing them, a virtual-cursor user can browse straight out of the profile editor into the Settings master/detail content underneath it and back, with no boundary. That is exactly the failure mode the W3C APG warns about for `aria-modal` and the reason it recommends `inert` on background content for stacked dialogs.

The pre-existing §7 gap (no focus trap, and `ModalShell` never moves focus into itself on mount) makes it concrete rather than theoretical: activating **Edit Profile** (`UserProfilePane.tsx:102-109`) leaves focus on that button — *inside the lower dialog* — while the upper dialog paints over it. I am **not** filing the missing focus-move (that is §7, explicitly deferred, and §80g adds this surface to its inventory); I am filing the nested-`aria-modal` shape, which §7 / §80g / §81d do not mention and which is new with this PR.

**Fix.** While `elevation > 0`, mark the lower surface inert. Cheapest local version: `UserProfilePane` wraps its own summary block in a container it sets `inert` on while `editing` is true; the structural version is for `ModalShell` to accept the node it should suppress, or for the overlay root to gain the stack §81d already routes to §80g. Either belongs with that keyboard pass rather than as a one-off here — but it should be *in* that pass's inventory, which today it is not.

---

### [MINOR · lane-MEDIUM] W-7 — The 22-field settings record sits in the bridge with exactly one consumer; every settings change re-renders the whole phone subtree

**File:** `features/demo/ui/DemoExperience.tsx:655-659` (`useState<DemoSettings>(DEFAULT_SETTINGS)` + `patchSettings`), consumed only at `:2754` (`renderSettingsPane(id, { settings, onChange: patchSettings })`) and `:714-726` (the `settingsSections` memo).

**Issue.** §80c settles *store vs bridge* for this record and I am not re-litigating that — the reasoning (cosmetic, un-persisted, dies with the tab) is right. What §80c does not address is *bridge vs sheet*. `DemoExperience` is the single store bridge and the render parent of the entire phone: the active screen (`activeScreen()`), the TabBar, the WizardDrawer, the StoryRail and the active modal all re-render on any state change here. `settings` has one consumer — the Settings sheet, which is itself a modal that only exists while it is open — and 22 fields, one of which is a continuously-dragged slider.

**Concrete failure.** `/demo` → gear → **Media Capture** → drag the **Photo Quality** slider. `<input type="range">` fires `onChange` on every pointer step (10 discrete steps across the range, more input events than that during a drag). Each one runs `patchSettings` → `setSettings` → a full `DemoExperience` render: `activeScreen()`'s switch re-evaluates and returns a fresh screen element, `activeModal()` re-evaluates, `renderPane` is re-created, and React reconciles the still-mounted screen beneath the sheet plus the drawer and rail. This is precisely the "new state lifted into `DemoExperience` with a single consumer" pattern the lane contract asks me to flag; the render cost is bounded (one screen subtree, not a list) which is why it is MEDIUM and not HIGH.

**Fix (not urgent, and cheap to defer).** Move `settings` + `patchSettings` into `SettingsModal`, which already owns `activeId` local state for the same reason, and invert the pane resolution: `SettingsModal` calls `renderSettingsPane(id, { settings, onChange })` itself and `renderPane` narrows to a bridge-ids-only override (`(id: BridgePaneId) => ReactNode`). The `BRIDGE_PANE_IDS` / `StubPaneId` partition from §83b already expresses exactly that split, so the type work is done. `settingsSections` still needs `settings` for the row previews — pass the derived `SettingsSectionView[]` down as today, or let the sheet build them from the catalog. If the fix round would rather leave it, it is a legitimate defer: log it, don't silently keep it.

---

### [MINOR · lane-LOW] W-8 — Disclosure reveals in the settings panes are silent to AT

**Files:** `ExportSecurityPane.tsx:71-84` (the two switches) → `:86` (`export-security-shared-config`, which appears/disappears with them); `MediaCapturePane.tsx:110-114` and `:135-137` (the two conditional `PaneNote`s).

Flipping **Encrypt ZIP exports** on inserts a whole configuration region below it — two radio groups, a password status line, an inert button and two notes — and the switch carries no `aria-controls` and the region no live-region semantics. AT announces "on" and nothing else. The two conditional warning notes (`Unlimited` recording, silent capture) behave the same way after a picker/switch change. A browse-mode user will find the new content immediately after the control in DOM order, which is why this is LOW rather than higher; a focus-mode user gets no signal that anything appeared.

**Fix.** Give the revealed container an id and `role="region" aria-label="Encryption options"`, and either `aria-controls` from the two switches or `aria-live="polite"` on the container (the repo already uses `role="status"` + `aria-live` for async status — `MediaCaptureScreen.tsx:530`'s comment describes the idiom).

---

### [MINOR · lane-LOW] W-9 — A second instance of the §81d Escape family: the "Apply profile?" confirm

`AlertDialog.tsx:104-109` and `SettingsModal.tsx:113-121` both register document-level `keydown`. With the profile-switch confirm open over the Settings sheet (`DemoExperience.tsx:703-712`), one Escape dismisses the alert **and** pops the Settings detail back to the master list.

Identical mechanism and identical disposition to §81d — I am not filing it as a defect. Recording it because §81d names only the profile editor, and §80g's inventory should carry both instances (and `PickerSheet`-inside-`ModalShell`, which §81d already notes) when the overlay-stack pass happens.

---

### [MINOR · lane-LOW] W-10 — The sheet restores focus row↔detail but never back to the gear

`SettingsModal.tsx:138-147` restores focus to `[data-settings-row]` when a detail pops — a genuinely careful piece of work, correctly using a post-commit effect and a DOM query rather than a ref into an unmounted list. What has no counterpart is the outer close: dismissing the sheet (× at `SettingsNavBar.tsx:66-76`, the scrim at `SettingsModal.tsx:154`, or Escape from the master list) unmounts everything and drops focus to `<body>`; `SettingsGearButton` is never re-focused.

§7 explicitly defers "focus restored to the trigger on close", so this is **covered** and I am not filing it. Recording it because §80g's summary of this surface reads *"it moves focus into the detail pane on open and back to the opening ROW on close"*, which a reader could take as "focus handling here is complete". It is complete inside the sheet and absent at its boundary.

---

## Verified clean (so the fix round does not re-derive it)

- **Bundle / boundary.** No new dependency, no barrel-star import, no `'use client'` added to a marketing file, no chrome hoisted into `app/layout.tsx`, wall intact, `/demo` First Load unmoved at 107 kB and every marketing route byte-identical to the P6 table. All ten settings panes, both new modals and the icon table land in the lazy `/demo` chunk.
- **Resource cleanup.** The single new listener (`SettingsModal.tsx:113-121`) is removed in its cleanup and correctly re-registers on `activeId` change. No timers, intervals, observers, `AbortController`s, object URLs or retained dynamic imports anywhere in the diff. `AboutPane.tsx:33` and `UserProfileModal.tsx:91` read the clock once via lazy `useState` initialisers through the injectable `clock` seam — no render-scope `new Date()`, no module-scope browser global.
- **Reduced motion.** The only new animation is the master/detail push, and it is gated: `SettingsModal.tsx:149-150` reads `useReducedMotion()` from `motion/react` (the demo half's correct hook) and drops both `slideFwd`/`slideBack` to `{}`. Both keyframes exist in `demo.css:96-103`. The sheet's own `screenIn` entrance (`:73`) is ungated, but that is `ModalShell`'s pre-existing repo-wide idiom copied verbatim, not a new gap.
- **Styling half.** Every new file is `features/demo/ui/**` and uses inline `CSSProperties`; no Tailwind `className` anywhere in the diff, no new global CSS, no keyframe added, no lifted pixel value or device-frame math touched. `GLASS`/`glassCard` tokens reused rather than re-rolled.
- **Render identity.** `settingsSections` is memoised on `[settings, profile, userProfile.name]`; `isFormStepVisible`/`isFormFieldVisible` are memoised on `[store, profile, formOverrides]` with a *documented* `exhaustive-deps` disable that is correct (the deps are the resolver's real inputs, read through `getState()` to avoid the object-returning-selector trap). `renderPane` and `mediaTools` are fresh per render but flow into non-memoised children, so no memo is defeated. `ScreenRow`'s per-row `expanded` state survives grid re-renders — the element tree shape is positionally stable.
- **Store subscriptions.** The three new bridge subscriptions (`profile`, `formOverrides`, `userProfile` at `DemoExperience.tsx:445-453`) are all selective single-slice selectors returning stored references, not derived objects. No `useStore(store)` whole-state read added.
- **Icon-only controls.** `SettingsGearButton` (`aria-label="Open settings"` + `aria-haspopup="dialog"`), the sheet close (`aria-label="Close settings"`), the detail back (`aria-label="Back to settings"`), and every decorative SVG in the new surfaces carries `aria-hidden="true"` — including the ten-glyph `SettingsIcon` table.
- **Real controls, not `div onClick`.** The 12 screen expanders, 50 grid switches, both radio groups, the master rows and both gears are real `<button>`s or properly-roled `role="switch"`/`role="radio"` nodes with `switchKeyDown` Enter/Space handling. The master rows being real buttons is what makes W-4's focus restore possible at all.
- **`mailto:`.** `AboutPane.tsx:77-102` — a plain `<a href="mailto:…">` with a URL-encoded subject, real text content, `aria-hidden` decoration, no `target`/`rel` needed, and the address is the site's already-published contact (`app-info.ts` documents the deliberate divergence from the phone's). Colour contrast of the link text `#2B8CC1` on `#0d1b2a` measures 4.66:1 at 14 px — passes AA.
- **Contrast spot-checks.** `#7a9fc4` on the pane background = 6.85:1; the `PaneNote` info tone `#4BA3D4` on its own tinted box = 5.80:1; the disabled `Toggle` label at `opacity 0.55` = 5.56:1. The two sub-threshold values I found (`#46607e` version lines ≈ 2.7:1, `#5d7a9a` grid footnote ≈ 3.9:1) are pre-existing tokens reused verbatim from `WizardDrawer`, and the dimmed switch track (2.3:1) falls under WCAG 1.4.11's inactive-component exception. Not filed.
- **Deliberate choices honoured.** I did not flag: the inert Dark Mode switch as a capability gap (D6's no-op arm — W-1 is about how it *announces*, not that it exists), the absent Developer pane, the absent password inputs, the 50-of-58 switch count, the section-card collapse, the missing Reset control, the `limited` blurb, `STORE_CONNECTED_PANE_IDS`'s removal, the §81d Escape residual, or the phone-parity omission of `accessibilityHint` on the master rows.

---

## Web Reviewer Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 7 |
| LOW | 3 |

Marketing↔demo isolation: **preserved**
Bundle impact: **none** — `/demo` First Load 107 kB verified by `pnpm build`; no new dependency; all ten panes in the lazy demo chunk
Browser-resource cleanup: **complete**
Accessibility: **gaps found** — seven, all cheap and all in the "the code says it does this and doesn't" category rather than the "nobody thought about it" category
Style-convention adherence: **correct half** — inline `CSSProperties` throughout, no lifted rules altered

**Verdict: APPROVE with comments.**

Notes: nothing here blocks a flow or a bundle; the recurring shape is a doc comment that names the right a11y idiom (`aria-describedby` beside `aria-disabled`, the `AlertDialog` role+label pairing, `aria-expanded` carrying its own state) while the code ships only half of it. W-1, W-2, W-4 and W-5 are one-to-four-line fixes each; W-3 is a prop threaded to six call sites; W-6 and W-7 are legitimate defers if the round would rather log them than build them.
