# Lane: web — W3

## Round 2 (riders)

**Seat:** `web-reviewer` (warm) · **PR #43** · **Range read:** `git diff c304a8c..3084065`, head `3084065`
· worktree `w3-wave`, READ-ONLY. **Scope:** my round-1 items only — F77, F79, F80.

**Diagnostics:** `npx vitest run --silent=true features/demo/ui/screens/map features/demo/ui/__tests__ features/demo/ui/primitives features/demo/ui/screens/__tests__` → **129 files / 1727 passed + 2 todo, exit 0.**

### Per-item status

| ID | Status |
|---|---|
| **F77** (NEW-1, live-region chatter) | **FIXED** — counts unreachable by construction, both announcement paths still fire |
| **F79** (border prose claim unmeasured) | **FIXED** — row 48, two-sided, inverse negative; render half reads the constant on all four sides |
| **F80** (`isConnected` guard weaker than its docblock) | **FIXED** — single-use capture; plain path verified intact, and it turned out to close a live defect |

**F77 — FIXED, and the fix is structural rather than editorial.** `ProximityAnnouncement`'s signature
went from `{ active, summary }` to `{ active, radiusKm: RadiusPreset }` (`MapControls.tsx:530`), so the
counts are not merely omitted from the string — **the component can no longer see them**. That is the
right shape: a later edit cannot re-introduce the chatter by appending to a string, only by adding a
prop, which is a reviewable act. The counts stay where they are read rather than heard (the visible
chip, pinned at `MapControls.test.tsx:262` as `1 km · 1 of 9`, and the sheet's subtitle).

Both announcement paths still fire, and both are pinned:
- **Activation** — `:223` *"announces activation, because the region is EMPTY before it (R-7a, F73)"*, and `:282` empties it on deactivation so the second activation is a change again. The always-mounted-empty design F73 introduced is untouched.
- **Radius** — covered as a pair rather than a mutation: `:243` asserts `'Proximity filter on, 2 km'` at `proximityRadius={2}` while `renderControls`' default is `1` (`:33`), so a hardcoded radius reds one of the two.

**The byte-identical-across-count-change pin holds, and the matcher upgrade is what makes it hold.**
`:254` renders at `locationCount 9 / filteredCount 5`, captures `textContent`, re-renders at
`filteredCount 1` with the **same** radius (default `1` vs the explicit `proximityRadius={1}` — I
checked, so the comparison isolates the counts and does not accidentally compare two radii), and
asserts `toBe(before)`. The previous pin used `toHaveTextContent`, which is a **substring** test and
therefore stayed green over the pre-F77 string that appended `showing 5 of 9`; the rider replaced it
with `.textContent).toBe(...)`. I did not probe this one: with an exact-equality assertion over two
renders whose only difference is the count, any string carrying `filteredCount` differs by
construction, so the kill is analytic rather than empirical.

**F79 — FIXED, and the negative is genuinely the inverse of 46/47's.** `MAP_PICKER_SELECTED_BORDER`
is exported (`CaseMapPicker.tsx:107-124`) with the measurement written into its docblock, and row 48
bounds it three ways:

- `worst(MAP_PICKER_SELECTED_BORDER, nestedCard-over-background) >= AA_NON_TEXT` — the ratio, at the constant (3.09 dark / 8.29 light, re-measured here, unchanged by the rider).
- `toBe(palette[scheme].primary)` — the **inverse** of rows 46/47's negative. Those assert `primary` FAILS as text; this asserts the border must STAY on it, so a well-meaning sweep re-pointing every `primary` in the file onto `link` reds. That is the correct asymmetry for a surface where one token moved and its neighbour deliberately did not.
- `not.toBe(MAP_PICKER_SELECTED_TITLE)` — the two must stay apart.

**The render half reads the constant on all four sides** (`CaseMapPicker.tsx:200-206`:
`borderTopColor` / `borderRightColor` / `borderBottomColor` / `borderLeftColor`, all
`MAP_PICKER_SELECTED_BORDER`), and `CaseMapPicker.test.tsx:109-120` now loops all four rather than
spot-checking two, with `borderWidth: '2px'` and a `not.toBe(MAP_PICKER_SELECTED_TITLE)` beside it. The
conditional-longhand form is unchanged, so it is still the lit-edge ruling's self-healing cell on
deselect.

**F80 — FIXED, and the plain single-overlay path is intact.** `activationOrigin = null` lands
immediately after the capture into the local `captured` (`useOpenerFocusReturn.ts:112-113`), so the
guard now matches the docblock instead of overclaiming.

I traced the plain path specifically, since that is what a single-use capture could break:
pointerdown sets the global → the overlay's mount effect reads it into `captured`, nulls the global,
and computes `opener` from the **local** → unmount calls `opener.focus()`. Nothing re-reads the global
between capture and use, so a lone overlay still returns focus to its opener. Pinned at
`useOpenerFocusReturn.test.tsx:95` (*"still returns focus to an opener that lost it before the layer
mounted"*), which is the U4.3 self-disabling-opener case the hook exists for. Under React 19
StrictMode's double-invoke the answer is also unchanged: effect1 nulls the global, cleanup1 focuses the
opener, effect2 falls back to `document.activeElement` — which cleanup1 just made the opener.

The rider found more than my finding claimed. My LOW called the consequence "mild"; the fix's docblock
documents a live defect it closes — `DemoExperience` renders `AlertDialog` after every other overlay,
so an alert raised over an open confirmation used to capture the *same* button, and dismissing the
alert yanked focus out of the still-open confirmation to a control behind its scrim. Now the alert
falls back to the confirmation's own panel. `:43` and `:74` pin both halves, and the hook got its first
direct test file in the process.

### Round 2 summary

CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0
Prior findings: **F77 FIXED · F79 FIXED · F80 FIXED.** Both round-1 LOWs are closed — the border's
1.4.11 prose claim is now measured by row 48, and the `isConnected` guard is now single-use.
No fix-introduced regressions in the blast radius.
Verdict: **APPROVE**

Two nits, deliberately not filed as findings: row 48's fourth line
(`expect(AA_NON_TEXT).toBeLessThan(AA_TEXT)`) is a tripwire on the file's own two threshold constants,
which is fine, but its comment says it *"keeps a later edit from quietly collapsing this row into
46/47's bound"* — collapsing the row would mean editing the row, not the constants, so the stated
reason is not what the line protects. And the radius→announcement link is covered by a pair of
single-value assertions rather than one change-detecting rerender; adequate, since a hardcoded radius
reds one of them.

Out-of-lane: F76's `SAMPLE_NOTICE` adoption touches two inline-style sites in my territory
(`ImportModal.tsx:279,295`, `OcrCaptureScreen.tsx:132`). Both write a `border` shorthand into an object
with no spread and no border longhands, so the lit-edge rule is unaffected.

---

# Lane: web — W3

## Round 1 (fix delta)

**Seat:** `web-reviewer` (warm) · **PR #43** · **Range read:** `git diff 7d0bf57..3dc8676`, head `eb98295`
(fix-merge `3dc8676`), worktree `w3-wave`, READ-ONLY. **Authority:** the fix-mapping comment on PR #43.
**Mine per that mapping:** F52 (HIGH), F59, F60, F72, F73, F74. Blast-radius sweep: F64, and F58/F62
because they land in my surfaces.

**Diagnostics:** `npx vitest run --silent=true features/demo/ui/screens/{map,settings} features/demo/ui/__tests__ features/demo/ui/{chrome,controls}` → **92 files / 1280 passed + 2 todo, exit 0.**
All ratios below re-measured at the merged head with the same calibrated helper as round 0 (it
reproduces the repo's own published figures to ±0.02).

### Per-finding status

| ID | Status | Evidence |
|---|---|---|
| **F52** [HIGH] | **FIXED** | all three sites re-measured at head — table below |
| **F59** [MEDIUM] | **FIXED** (4/4, incl. the site I missed) | table below |
| **F60** [MEDIUM] | **FIXED**, and F58's refutation verified at source | below |
| **F72** [LOW] | **FIXED** | `MapControls.tsx` — the dead `paddingLeft: 12` is gone; `chipBody`'s new docblock names the tripwire class and cites `vitest.setup.ts:27-69`, which is more than the fix needed to do |
| **F73** [LOW] | **FIXED**, with one regression | NEW-1 below |
| **F74** [LOW] | **FIXED** | `OverlayHeader.tsx` — the discriminated pair, exactly the shape proposed, and the `onBack?: undefined` arm is present, which is what stops width subtyping from re-opening the hole |

**F52 — FIXED, all three, and the split is right.** Re-measured on the grounds each site paints on:

| Site | Was | Now | Constant |
|---|---|---|---|
| `LocationDetailCard.tsx` contact rows (nested tier over the map sheet's two opaque stops) | **2.88** | **7.02** | `MAP_CONTACT_ROW` |
| `CaseMapPicker.tsx` selected title (nested tier over `background`) | **3.09** | **7.54** | `MAP_PICKER_SELECTED_TITLE` |
| `_pane-chrome.tsx:117` readout (`modalSheet` = `colors.background`) | **3.94** | **9.60** (6.90 worst across `DARK_GROUNDS`) | `PANE_VALUE_TINT` |

The **text-vs-border split is correct**, not a half-fix. `CaseMapPicker`'s selected row keeps
`colors.primary` on its 2px border: a border is a non-text mark, so 1.4.11's 3:1 governs (measured
**3.09** dark, **8.29** light) rather than 1.4.3's 4.5, and D4's *"selection is the border's weight and
colour, evenly"* is a geometry ruling the fix correctly declined to disturb. The weight change
(1px to 2px) is also an independent non-chromatic carrier, so 1.4.1 holds on its own.
`CaseMapPicker.tsx:91-104`'s new docblock states that reasoning rather than leaving it inferable.

**The §C.1 rows bound it two-sided, at the constant.** `palette-contrast.test.ts` rows 46/47 assert
`worst(...) >= AA_TEXT` AND `MAP_CONTACT_ROW.color === palette[scheme].link` /
`MAP_PICKER_SELECTED_TITLE === palette[scheme].link` AND the negative
`worst(palette[scheme].primary, SHEET_NESTED_GROUNDS) < AA_TEXT`. The pane row does the same plus two
exact figures (`contrast(primary, DARK_BG) === 3.94`, `contrast(PANE_VALUE_TINT, DARK_BG) === 9.6`).
That is W2/F27's shape discharged properly: the ratio bound alone would have stayed green through a
re-point back to `primary` — the identity lines are what red on that edit. I checked the grounds are
built from `palette[scheme]` / `GLASS_TIER[scheme]` rather than a named half, so the rows survive D2's
light flip, and `SHEET_NESTED_GROUNDS` is derived correctly from U5.1's R1 ruling (the map sheet's
opaque stops, not a glass tier).

Ledger **§89's residue** is ruled at the aggregator's desk (StoryRail D12-frozen, SplashScreen x3 to
U8.1) rather than left open, which is the disposition the trigger needed. `_pane-chrome.tsx:98-112`
writes the §89 citation and the met condition into the constant's docblock, so the next reader finds
the ruling at the code.

**F59 — FIXED, four of four.** Every name now contains its visible text:

| Site | Visible | Name now |
|---|---|---|
| `MapFiltersSheet.tsx` Done | `Done` | `Done, apply filters and close` OK |
| `MapFiltersSheet.tsx` radius chips | `0.5 km` | `0.5 km radius` OK |
| `MapControls.tsx` chip body | `2 km · 5 of 9` | `Proximity filter, 2 km, showing 5 of 9 locations` OK (both tokens present; the separator is outside 2.5.3 per F96) |
| `MapFiltersSheet.tsx` proximity `Toggle` | `Filter by radius` | `Filter by radius` OK |

The fourth is one **I missed in round 0** — I read the `label={active ? 'Deactivate…' : 'Activate…'}`
ternary, accepted its "the name carries the DIRECTION" docblock, and never checked it against the
visible `<span>Filter by radius</span>` beside it. U5.3 found it, and the fix is better than
name-matching: the direction duplicated what `role="switch"` + `aria-checked` already announces
(`_shared.tsx:869-877`), so removing it drops a redundant state-baked accname rather than losing
information. Pinned relationally (`toHaveAttribute('aria-label', span.textContent)`), which is stronger
than a literal.

**F60 — FIXED, and the F58 refutation checks out at source.** `MAP_FILTER_HINT_TEXT` is exported on
`colors.textSecondary` — **5.82** worst on `SHEET_GROUNDS`, up from 4.23 — bounded two-sided (row 45b
asserts `>= AA_TEXT`, `worst(textTertiary) < AA_TEXT`, and `not.toBe(textTertiary)`).

I sanity-checked the F58 refutation as instructed and **all four clauses hold at source**:
`MapCanvas.tsx:273` is `const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN` and `:616-626` returns
`[data-map-fallback]` from that same expression, so `canPlaceRing` reads the identical fact rather than
a proxy; `getCenter()` (`:303-306`) is `mapRef.current?.getCenter?.()`, null while the ref is unset;
`mapRef.current = map` (`:337`) is assigned AFTER `await Promise.all([import('mapbox-gl'), import('…/mapCluster')])` inside `void (async () => {…})`, so it is genuinely null for the first frames
of EVERY mount, token or not — discriminating on it would have told a visitor with a working map that
the map was unavailable; and `new mapboxgl.Map({ center: [DEFAULT_MAP_CENTER[0], DEFAULT_MAP_CENTER[1]] })` (`:331-336`) reads the same constant from the same module, so in that window the
default centre really IS the current view. Reading the env var inside the component rather than at
module scope is right for the reason stated — `vi.stubEnv` drives the token-less path, and a
module-level capture would freeze it. One fact, two consumers, which is what stops hint and notice
disagreeing.

### New findings in the fix's blast radius

[MEDIUM] F73's hoisted live region now announces on every search keystroke that changes the count
File: `features/demo/ui/screens/map/MapControls.tsx:233-252` (`ProximityAnnouncement`), with `features/demo/ui/screens/map/MapScreen.tsx:246-247`

Issue: F73 correctly moved the region out of the `proximityActive &&` gate so it is always mounted and
empty when off — that fixes the never-announces bug, and doing it without state or an effect is better
than the sibling idiom. But its content is `Proximity filter on, ${summary}`, and `summary` embeds
`${filteredCount} of ${locationCount}`. Both counts derive from `applyMapFilters(mapData, filters)`,
and `filters.searchText` is edited by the search input IN THIS SAME COMPONENT, three nodes above the
region. So with proximity running, typing `m` then `ma` then `mac` mutates a polite live region on
every keystroke that changes the match count, queueing an announcement each time. Before the fix the
region announced nothing ever; after it, it announces during text entry — the live-region-chatter
anti-pattern, on the one field where a screen-reader user most needs quiet.

Evidence: the sibling region two files away is structurally protected from exactly this and says so —
`MapFiltersSheet.tsx:250-256`: *"while it is open it is the ONLY place a filter can be changed — the
scrim covers the search field — so its subtitle reflects every reachable change."* `MapControls`'
region has no scrim and shares its component with the search input, so that argument does not
transfer. The flow is `MapScreen.tsx:246-247` (`locationCount` from `countLocations(filtered.items)`)
into `summary` at `MapControls.tsx:334`.

Fix: announce the fact this region exists for and drop the volatile half — the activation and the
radius (`Proximity filter on, ${proximityRadius} km`), which change only on a deliberate toggle,
long-press or chip tap. The counts are already in the visible chip, and `MapFiltersSheet`'s subtitle
owns count announcements while it is open. One string change, no state.

---

[LOW] F52's own 1.4.11 claim is the one value the fix left unmeasured — the selection border sits 0.09 above the floor
File: `features/demo/ui/screens/map/CaseMapPicker.tsx:91-104` and `:196-203`

Issue: the fix's new docblock asserts *"a border is a non-text mark, so §C.3 rule 2's carve-out and
1.4.11's 3:1 govern it"* — a claim about a ratio — and then does not measure it, in the same commit
that exported three neighbouring constants precisely so their ratios could be bounded. Measured:
`colors.primary` on the nested tier over `background` is **3.09** dark (8.29 light), 0.09 above
1.4.11's 3.0. `CaseMapPicker.test.tsx:112-114` pins the border's VALUE (`toBe(colors.primary)`) but no
`palette-contrast.test.ts` row bounds its RATIO, so a re-tint of `nestedCard`'s stops or of `primary`
walks the picker's colour cue below the floor with every suite green. Not urgent — the 2px weight is an
independent carrier and I can name no scheduled re-tint (U8.1 re-bases the SPLASH ground, not this one)
— but it is the last unbounded number on the surface this finding opened.

Evidence: the same file's `MAP_PICKER_SELECTED_TITLE` docblock states the rule the border needs
(*"EXPORTED so §C.1 pins the ratio at the constant this component paints"*), and
`palette-contrast.test.ts:376-390` is the in-repo precedent for bounding a selection mark at
`AA_NON_TEXT` — `UNCHECKED_MARK_EDGE`, whose docblock reads *"an unchecked box has no fill, no glyph
and no label: the ring IS the control."*

Fix: one row beside 46/47 — export the border tint as `MAP_PICKER_SELECTED_BORDER` and assert
`worst(..., nestedCard-over-background) >= AA_NON_TEXT`.

---

[LOW] F64's `activationOrigin` is module-global and its staleness guard is weaker than its own docblock
File: `features/demo/ui/primitives/useOpenerFocusReturn.ts:42, 96-98`

Issue: the hook's comment says *"The captured value is connectivity-checked HERE as well as at restore
time, so a stale origin left by an earlier interaction can never become this one's opener."* The check
is `activationOrigin?.isConnected`, which establishes only that the element still exists — not that the
gesture raised THIS overlay. An overlay opened without a gesture (a finished pipeline, a store change)
inherits the last-clicked control as its opener and hands focus back there on close, which is exactly
the case the `document.activeElement` fallback below it was written to serve. The consequence is mild —
focus lands on a still-present control rather than staying put — but the comment claims an invariant
the code does not hold, which is the comment-over-half-an-idiom class.

Evidence: `:96-98` is the whole guard, and `:57-66` never clears `activationOrigin` after a consumer
reads it, so one gesture can seed any number of later mounts.

Fix: null `activationOrigin` after the mount effect captures it (one line at `:96`) so a second
non-gesture overlay falls through to the `activeElement` branch the docblock already describes; or
soften the comment to what `isConnected` actually proves.

NOT a leak: the two capture-phase `document` listeners installed at module load (`:76`) are
process-lifetime by design, idempotent behind `tracking`, SSR-guarded by
`typeof document === 'undefined'`, and match `CentredDialog`'s original shape.

### Round 1 summary

CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 2
Prior findings: **F52 FIXED · F59 FIXED (4/4) · F60 FIXED · F72 FIXED · F73 FIXED (one regression, NEW-1) · F74 FIXED**
Verdict: **APPROVE with comments**

Marketing-to-demo isolation: preserved · Bundle impact: none · Browser-resource cleanup: complete (F64's module listeners are deliberate and guarded) · Accessibility: the three F52 sites and all four F59 names now clear their floors; one new chatter regression (NEW-1) · Style-convention adherence: correct half

Out-of-lane observations: F62's `proximityActive={proximityFiltering}` split means the on-map chip no longer appears during the Turf chunk-load window while the sheet's switch still reflects the tap. I read both call sites (`MapScreen.tsx:104-120`) and the split is coherent and honest; whether two booleans beat a three-state union is `typescript-reviewer`'s call.

---

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
