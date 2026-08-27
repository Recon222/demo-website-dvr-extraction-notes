# Lane: web — W3 (U5 map + U6 wizard/settings + U7 import/OCR/media)

**Seat:** `web-reviewer` · **Mode:** code review · **Scope:** `git diff master...13827de` (167 files) in
`D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\w3-wave` @ `13827de`.

**Lane question:** does this change introduce a browser-specific performance problem, a resource leak,
a browser-API misuse, an accessibility regression, or a styling/bundle-boundary breach that a pure
type reviewer would miss?

## Diagnostics run

| Check | Result |
|---|---|
| `npx vitest run --silent=true features/demo/ui/screens/{map,settings,import} features/demo/ui/__tests__` | **82 files / 1062 passed + 2 todo, exit 0** |
| THE WALL — `grep -rn "features/demo" components app/(default) lib` | one **comment** in `components/marketing/phone-frame.tsx:7`; no import form. **Preserved.** |
| Heavy deps still lazy | `MapCanvas.tsx:5` is `import type` (erased); `:8` is the pre-existing `mapbox-gl.css` side-effect import, unchanged by W3. `pdfjs-dist` untouched. **No static-import regression.** |
| New effects / listeners / timers in the diff | exactly **one** (`MapFiltersSheet.tsx:265-267`), no subscription, no teardown needed. A diff grep for `addEventListener|setInterval|setTimeout|createObjectURL|ResizeObserver|AbortController` returns nothing new. |
| `DemoExperience.tsx` diff | copy-only (A93 em-dash sweep). **No new state on the bridge.** |
| Lit-edge sweep — every object literal in the 81 changed sources that spreads anything AND writes a border shorthand | 15 hits, **0 violations** (script + per-site read; breakdown in Notes) |
| Shorthand-vs-longhand collision sweep across the same 81 files | 5 hits, 4 benign (longhand after shorthand, only the longhand dynamic — the ruling's OK cell), 1 dead key → LOW-1 |
| Contrast helper calibration | my WCAG + `flattenOver` reimplementation reproduces the repo's own published figures: `textTertiary` 3.81 worst vs the pinned 3.79; `primary` **2.87** on `nestedCard` = `SettingsNavBar.tsx:66-68`'s own number; **2.91** on `elevated`; **3.94** on `background` = ledger §89's; `link` **6.90**. Every ratio below comes from that calibrated helper. |

---

## HIGH

[HIGH] Accent-as-text: U5.4 moved the map detail card's tap-to-call/email rows from 5.07:1 to 2.88:1, and ledger §89's un-defer trigger has now fired unmet
File: `features/demo/ui/screens/map/LocationDetailCard.tsx:88`
Same-family touch-points: `features/demo/ui/screens/map/CaseMapPicker.tsx:178` · `features/demo/ui/screens/settings/panes/_pane-chrome.tsx:117` · `features/demo/ui/screens/SplashScreen.tsx:61,63,96` · `features/demo/ui/StoryRail.tsx:75`

Issue: `tapRow` — the phone-number and e-mail rows in `LocationDetailCard`, the *only* call/e-mail
affordance on that surface — was re-painted from `MAP_PIN_COLORS.working` (`#00BFFF`) to
`colors.primary` (`#2B8CC1`) at 14px/600. Measured against its own ground (the `nestedCard` stops of
`infoCard`, over the map sheet's opaque `#002853`/`#0e3965` gradient) that is a **PASS to FAIL
regression: 5.07:1 → 2.88:1** against WCAG 1.4.3 AA's 4.5:1 floor for sub-18.66px text.
`colors.link` measures **7.02:1** on the identical stack. `CaseMapPicker.tsx:178` is the same edit on
the *selected* case title: `#4BA3D4` 4.12 → `colors.primary` **3.09**. `_pane-chrome.tsx:117` renders
the settings sheet's one live readout (Photo Quality's `85%`) at 16/700 `colors.primary` directly on
`modalSheet`'s `colors.background` — **3.94:1**, ledger §89's exact figure, at a weight/size that is
NOT WCAG "large text" (large starts at 18.66px bold).

TRIGGER-LAPSED — ledger §89. Its trigger reads: *"the package that lands matrix row A66 (U2) and the
**U6** adoption re-measure these fourteen sites as their closing act. Any site still measuring < 4.5
after U6 merges reopens this at HIGH — observable as `grep -rn "#2B8CC1" features/demo/ui
--include=*.tsx` returning a `color:` site outside the token modules."* U6.1–U6.4b all land in this
wave, so the U6 clause is closed. The named grep still returns four `color:` sites outside the token
modules — `SplashScreen.tsx:61,63,96` and `StoryRail.tsx:75`, all at **3.94:1** — and no U6 report
contains the re-measure (a grep for `§89` across `reports/u6.*.md` returns nothing). The condition
§89 names has occurred; per the reviewer contract §4 this is the mechanism to reopen it, and §89
itself sets the severity at HIGH.

Evidence:
1. Matrix A27 / A66 / DEF-UI-018 / §C.3 rule 1, quoted in the matrix at `:95`: *"Under DEF-UI-018,
   `link` is the accent-**as-text** token and `primary` is a FILL. Dark `#2B8CC1` as 16px semibold
   measures 2.87:1; `link` measures 6.86. The highest-value contrast row in the port."*
2. The correct pattern is in this same wave, in this same diff. `SettingsNavBar.tsx:56-78` declines
   the phone's `colors.primary` for `BACK_TINT = colors.link` and writes the arithmetic into its
   docblock (*"`colors.primary` on the top stop measures 2.91:1 … `colors.link` measures 7.10:1 …
   this is A27/A66's rule applied at a site the phone identified and did not close"*).
   `CompletionScreen.tsx:172-174` does the same for the outline CTA.
3. A sibling package in this same wave did exactly this measurement and reached the opposite
   conclusion from U5.4. Commit `d30a426` (`feat(u6.4b): stop the Time Offset output signalling with
   colour alone`) measured `primaryLight` at **3.82 / 3.88 / 4.24 / 4.35** on its four glass stops,
   called it *"under AA 4.5 at every one"*, and moved the calibration verdict and both corrected
   timestamps off it. U5.4 moved a contact row ONTO a value worse than every one of those four
   numbers, on grounds it never measured — the U5.4 report's tapRow entry (`:215`) records the swap
   with no ratio at all.
4. D5's amendment is the house precedent for declining a phone value that fails the contract — it is
   why `MAP_FILTER_BADGE_FILL` is `primaryDark` (5.80) and not the phone's `primary` (3.73), one file
   away in the same package (`MapControls.tsx:86-105`).
5. The value is test-pinned at `screens/map/__tests__/LocationDetailCard.test.tsx:253-259`, so this
   is a ratified decision rather than an oversight — and the pin two cases below it (`:262-270`)
   reasons explicitly about the `textSecondary`/`textTertiary` AA ceiling, so the contrast question
   was live at that exact site.

Fix: re-point `tapRow`'s `color` and `CaseMapPicker`'s selected-title arm to `colors.link` (7.02 and
7.54 respectively on their own grounds), updating the two pins and their docblocks; do the same for
`_pane-chrome.tsx:117`'s `settingValue`. `SplashScreen`/`StoryRail`'s four literals are §89's residue
and need either the same re-point or an explicit owner ruling that closes §89 — leaving the trigger
fired and unanswered is the one outcome the ledger's bar forbids.

---

## MEDIUM

[MEDIUM] WCAG 2.5.3 Label in Name — three new map controls are unreachable by voice input
File: `features/demo/ui/screens/map/MapFiltersSheet.tsx:303-311` and `:372-383` · `features/demo/ui/screens/map/MapControls.tsx:415-424`

Issue: three controls added by U5.2/U5.3 carry an `aria-label` that does NOT contain their visible
text, so the accessible name overrides it and speech-input users (Voice Control, Voice Access,
Dragon) cannot address them by what they read on screen:

| Site | Visible text | Accessible name | Contains? |
|---|---|---|---|
| `MapFiltersSheet.tsx:303` | `Done` | `Apply filters and close` | **no** |
| `MapFiltersSheet.tsx:372` | `0.5 km` (x4 presets) | `0.5 kilometre radius` | **no** — `0.5 kilometre` breaks the `km` token |
| `MapControls.tsx:419` | `0.5 km · 5 of 9` | `Proximity filter, 0.5 kilometre radius, showing 5 of 9 locations` | **no** |

Both `aria-label`s are demo inventions (no phone counterpart — `aria-label` is web-only) and both are
pinned as literals (`MapFiltersSheet.test.tsx:242`, `MapControls.test.tsx:232`), so the divergence is
locked in. The sheet's sibling controls get it right (`Clear all filters` contains `Clear All`
case-insensitively, per F96), which is what makes these three read as oversight rather than policy.
Saying "click Done" or "click 2 km" does nothing; the only route left is tab-traversal of a sheet
whose Done button is the last control.

Evidence: WCAG 2.1 SC 2.5.3 Label in Name (Level A). The repo already states this rule in tree, in
this same wave's territory — `ImportTerminalProgress.tsx:618-622`: *"Accessible name = the VISIBLE
title + sub (R-3): the batch counts are the load-bearing fact and must be announced; an aria-label
would replace them (accname override) and **break Label-in-Name for voice control**."* That surface
solved it with `aria-describedby` on a visually-hidden sibling rather than an `aria-label`; it is the
in-repo pattern this one needs.

Fix: keep the visible string inside the name — "Done, apply filters", "{preset} km radius",
"Proximity filter, {radius} km, showing {n} of {m} locations" — or drop the `aria-label` and hang the
extra words on `aria-describedby` at an `srOnly` sibling, which `MapFiltersSheet` already has a
constant for (`:205-215`) and `ImportTerminalProgress.tsx:645-648` already does.

---

[MEDIUM] `MapFiltersSheet` adds NEW `textTertiary` body text at 4.23:1 — D5's rider, contradicted by the component's own docblock
File: `features/demo/ui/screens/map/MapFiltersSheet.tsx:186-187` (constant) and `:388` (render site)

Issue: `const hintText = { fontSize: 12, lineHeight: '16px', color: colors.textTertiary }` paints
"Long-press the map to place or move the proximity ring." — the only place that instruction appears
anywhere in the map UI. Measured on this sheet's own ground (`GLASS_TIER.dark.sheet` stops over
`#002853`, i.e. the `SHEET_GROUNDS` stack `palette-contrast.test.ts:803` builds for row 45) it is
**5.31 / 4.23**, worst **4.23:1**, under AA's 4.5 for 12px text. This is a brand-new file, so it is
ADDED text, not a re-point: I checked every `+ … textTertiary` line in the wave and every other one
is the same value re-spelled through the token (`DvrInfoScreen` `#7a9fc4` → `colors.textTertiary`,
`SettingsCategoryList.tsx:132` `#46607e` → the token, `TimeOffsetScreen` x8 — `d30a426`'s message
says so explicitly).

Evidence: plan §5 D5's rider, verbatim: *"Rider: do not **add** new `textTertiary` text."*
`palette.ts:65-67` repeats it at the token. Two sibling packages in this same wave route AWAY from it
and cite the rider while doing so — `_pane-chrome.tsx:82-84` (*"The help line moves off
`textTertiary` onto `textSecondary` … D5's rider says do not ADD text to it; this REMOVES eight lines
from it"*) and `_shared.tsx:549-552` (*"`textTertiary`, which D5's rider bars from NEW text (3.81
worst vs 5.24)"*). Sharpest of all, this file's own `MAP_FILTER_SECTION_LABEL` docblock at `:96-99`
exports the section-label constant precisely so a pin can catch *"re-pointing this label at
`textTertiary`, which measures **below AA on the sheet tier**"* — and then `:187` paints the hint at
exactly that value on exactly that tier.

Fix: `colors.textSecondary` on this sheet measures **5.82** worst (`#99badd` over the same two stops)
and is the token `_pane-chrome`/`_shared` moved their equivalents to. If the phone-verbatim
`textTertiary` is to be kept, it needs a named D5 inheritance in the report plus a ledger row, not
silence.

---

## LOW

[LOW] `MapControls.chipBody` declares `paddingLeft` and then the `padding` shorthand in one object
File: `features/demo/ui/screens/map/MapControls.tsx:246-257`

Issue: key order is `… paddingLeft: 12, height, border, background, cursor, fontFamily, padding: '0 0 0 12px'`. The shorthand lands last and wins, so `paddingLeft` is dead. Harmless today because the
object is a module constant that never updates — but it is the shape the lit-edge ruling bans and
`vitest.setup.ts:79`'s `/conflicting property/` tripwire exists to catch: the moment anyone makes
`chipBody` state-dependent and only one of the two keys changes, React writes the changed key alone
and the suite reds repo-wide.

Evidence: `reports/partner-lit-edge-ruling.md` §3 — every measured update-clobber cell fired React's
`conflicting property` error, and `vitest.setup.ts:31,79` turns that error into a test failure.

Fix: delete `paddingLeft: 12` (the `padding` shorthand already spells left-12 / rest-0), or delete
the shorthand and keep four longhands.

---

[LOW] The proximity chip's `role="status"` mounts already populated, so it announces nothing — U5.2's D-5 is now half-closed
File: `features/demo/ui/screens/map/MapControls.tsx:456-467`

Issue: `ProximitySummary` renders `<span role="status">{text}</span>` with its text present in the
same commit the region mounts in. A live region only announces mutations that happen AFTER it is
registered, so the first (and most important) reading — the one that fires when proximity activates —
is silent. U5.3 hit the identical problem and solved it correctly two files away
(`MapFiltersSheet.tsx:249-267`: mount empty, set on the next tick, reset on close, citing
`ExportModal.tsx:124-139`'s *"an aria-live region only announces what changes AFTER it mounts"*), and
its docblock at `:260-262` names *"the inconsistency D-5 recorded against the proximity chip"* — but
D-5 is still only a report-level proposal, so nothing in the ledger holds it.

Evidence: the two sibling implementations disagree inside one package pair; `ExportModal.tsx:124-139`
is the repo's stated idiom.

Fix: apply `MapFiltersSheet`'s empty-then-set idiom here, or have the aggregator write D-5 into
`deferred.md` with a trigger so the surviving half does not evaporate with the report.

---

[LOW] `OverlayHeader` can render an unnamed icon-only button; the requirement is prose-only
File: `features/demo/ui/chrome/OverlayHeader.tsx:85-101, 149-152`

Issue: `backLabel?: string` is documented as *"REQUIRED whenever `onBack` is given"* but the two props
are independently optional, so `<OverlayHeader variant="glass" onBack={fn} />` type-checks and renders
`<button aria-label={undefined}>` around an `aria-hidden` `<svg>` — a control with no accessible name
at all (WCAG 4.1.2). All four current callers pass it (`AudioPreviewScreen:123`,
`AudioRecorderScreen:179`, `MediaCaptureScreen:523`; `OcrCaptureScreen:397` has no `onBack`), so
nothing ships broken today; this is about a brand-new shared seam whose only guard is a comment.

Evidence: the repo enforces exactly this class by type elsewhere — `PaneSelect`'s required
`a11yLabel` (`_pane-chrome.tsx:349-359`), `PaneSlider`'s required `valueText` (*"Required rather than
optional so a second slider cannot repeat it"*), `MapScreen`'s required `onEditIncident`
(`MapScreen.tsx:58-70`).

Fix: make the pair a discriminated union on the props type
(`{ onBack(): void; backLabel: string } | { onBack?: undefined; backLabel?: undefined }`), the shape
`SettingsNavBarProps` in this same wave already uses.

---

## Pre-declared candidates — verdicts

**U5.4 §11 defect 2 — `LocationRow`'s paint-free `selected`, at the merged head after U5.3 added host
state. NOT REPRODUCED; the invariant is intact.** `MapScreen` now has four write sites for the
`(selectedId, sheetMode)` pair and all four keep them coupled: `selectItem` `:306-307` writes
`(id, 'detail')`, `back` `:313-314` writes `(null, 'list')`, the case-switch effect `:220-221` writes
both, and U5.3's `filtersVisible` (`:152`, `openFilters`/`closeFilters` `:160-161`, the reset at
`:226`) touches NEITHER, exactly as its docblock at `:139-151` promises. `contentMode` (`:289`) is
`'detail'` iff `sheetMode === 'detail' && selectedItem`, so the one residual state — a selection
filtered out of `display.items` while `sheetMode === 'detail'` — falls back to the list with the
selected row ABSENT from `items`, and no rendered row can carry an unpainted `data-selected`. The
report's worry ("a filters sheet that clears `sheetMode` without clearing `selectedId`") did not
happen. Note for the aggregator: `LocationRow.tsx:36-39`'s docblock still cites the pre-U5.3 line
numbers (`:264-265`, `:197-198`, `:272-273`); the claim is still true, the citations are stale.

**U5.4 §11 defect 1 — the frozen 116px peek detent vs the wider badge row. NOT REPRODUCED at the
shipped label set, and it cannot be.** `STATUS_LABEL` (`mapTokens.ts:36-40`) is a closed three-entry
record — `Started` / `Working` / `Complete`. Badge width = 2x`spacing.xsm` (12) + 2x1px border + 5px
dot + `spacing.xs` gap + label, so at 12px/700 the three run ~82/82/88 px; with two `spacing.sm` gaps
that is ~268 px against the `summary` row's 378 − 2x`spacing.lg` = **330 px**. Even at two-digit
counts and a generous 7.5 px/char metric the row lands ~310 < 330. It does not wrap. And if a future
label ever did wrap, the handle would not clip: the sheet is `display:flex; flexDirection:column`, the
handle wrapper carries the default `min-height:auto` so it cannot shrink below its content, and the
list below it is `flex: 1; overflowY: auto` (`MapBottomSheet.tsx:169`) — the list gets squeezed, the
badges stay visible.

**INTEGRATION §5.1 — `_pane-chrome.tsx` structurally pinned but visually unasserted. Largely
discharged; no finding.** `pane-chrome.test.tsx:106-178`'s drift guard is not structural only:
`declared()` walks `element.style` key by key and asserts `PaneNote`'s box `toEqual`
`<Banner style={{ marginTop: spacing.xs }}>`'s, its message `toEqual` Banner's `messageStyle`, and its
`<svg>` `innerHTML` `toBe` Banner's for ALL THREE tones. Both sides derive from one `severityTone(tone)`
call, so the one tone the box comparison renders (`warning`) generalises. I read the composed geometry
rather than rendering it: `PaneGroup`'s `gap: spacing.xs` (4) plus `PaneNote`'s `marginTop: spacing.xs`
(4) = the phone's 8 between a control and its note, which is what the docblock at `:88-92` claims.

---

## Web Summary

CRITICAL: 0 · HIGH: 1 · MEDIUM: 2 · LOW: 3
Verdict: **REVISE**

Marketing-to-demo isolation: **preserved** (only a comment reference, `components/marketing/phone-frame.tsx:7`)
Bundle impact: **none** — no dependency change, no static import of `mapbox-gl`/`pdfjs-dist`, no `'use client'` added to a marketing surface, no chrome hoisted into `app/layout.tsx`
Browser-resource cleanup: **complete** — the wave adds exactly one effect (`MapFiltersSheet.tsx:265`), which subscribes to nothing; `GlassBottomSheet` returns `null` at `phase === 'closed'` (`:324`), so the newly-mounted filters sheet leaves no hidden tab stops, and its Escape listener installs only while visible (`:249-255`)
Accessibility: **gaps found** — one AA contrast regression on interactive text (HIGH), three Label-in-Name failures (MEDIUM), one new sub-AA hint (MEDIUM), one silent live region and one unnameable-by-type control (LOW). The wave's a11y ADDITIONS are sound: `aria-pressed` on the status/radius chips is the right web substitute for RN's `accessibilityState.selected`; `FieldError`'s `role="alert"` + `aria-describedby` pairing (`_shared.tsx:384-416, 480-547`) is correct and its optional-`role` split for notes already inside a `role="status"` region avoids nesting assertive in polite; `CompletionScreen`'s `aria-disabled` + `aria-describedby={NO_CASE_BANNER_ID}` IDREF resolves exactly when the banner renders (`:111-112` vs `:213-214`); `MapFiltersSheet`'s live region uses the empty-mount-then-set idiom correctly
Style-convention adherence: **correct half** — inline `CSSProperties` throughout `features/demo/ui/**`, no Tailwind leakage, no marketing `style={{}}`; the lit-edge rule holds at all 15 spread-plus-border sites (`LocationRow.tsx:41-42` and `CaseMapPicker.tsx:160-169` state and follow it, and `CaseMapPicker`'s conditional side longhands are the ruling's self-healing cell); the device-frame math and `SHEET_HEIGHTS` are untouched

Notes: the lit-edge sweep's 15 hits break down as — 5 where the spread base carries no border key at
all (`ExportCaseCard.tsx:165` `wrapper`; `ImportTerminalProgress.tsx:630,658` `badgeBase`;
`ExportLocationRow.tsx:111` `indicatorBase`, which has width/style but no colour longhands), 3 where
the spread is last and border-free (`CasesScreen.tsx:163,264`, `MediaLibrarySheet.tsx:718` —
`LONG_PRESS_SURFACE_STYLE`), 2 where the base's `border` is a shorthand with no longhand to erase
(`TerminalLine.tsx:141` over `rowStyle`, which has no border; `AudioRecorderScreen.tsx:158` over
`pillButton`'s `border: GLASS.borderBtn`), 2 that are data keys and not CSS
(`ImportTerminalProgress.tsx:370,385` — the CTA config record's `border`/`bg` fields), 1 docblock
quote (`field-input.ts:20`), and 2 pre-existing spinner/divider forms unchanged by W3
(`ExportModal.tsx:172`, `MediaLibrarySheet.tsx:312`).

Also verified: **`TerminalLine`'s memo boundary survives U7.1.** The package moved `LEVEL_ACCENT` /
`TERM_ROW` to module-level constants in `terminal-palette.ts` rather than adding the phone's `term`
prop, and says so at `TerminalLine.tsx:34-39`; `ImportTerminalProgress.tsx:587` still passes only
`line` (stable per-line identity), `expanded` (a boolean derived from a `Set`), and `toggleDetail`
(`useCallback(…, [])` at `:522-529`), so an append re-renders no existing row and the 400-line cap
stays cheap. `MediaLibrarySheet`'s `hitTarget()` arithmetic is exact rather than approximate: at
`PREVIEW_ACTION_SIZE = 36` the pad is 4, so two adjacent targets abut across the `spacing.sm` gap
without overlapping, as its comment claims.

Out-of-lane observations:
- `_pane-chrome.tsx:82-84`'s docblock cites the `textTertiary` ceiling as "4.23:1 on `card`"; my calibrated helper reads 4.41 on the card stops and 4.23 on the sheet stops. Doc drift, not a code defect.
- `CompletionScreen.tsx:151` `aria-label="Export options"` over a button reading "Export Zip" is the same Label-in-Name class as MEDIUM-1, but it is pre-existing on `master` and outside this diff, so I did not fold it in.
