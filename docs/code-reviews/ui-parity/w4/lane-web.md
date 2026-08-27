# Lane: web — W4 (U8.1 splash/boot · U8.2 ambient · U8.3 tab bar · U8.4 previews)

**Seat:** `web-reviewer` (warm) · **Mode:** code review · **Scope:** `git diff master...def2aec`,
worktree `w4-wave`, READ-ONLY.

**Source surface is small:** 9 non-test files (`scanner-hud-colors.ts` new, `SplashScreen`,
`BootSequence`, `boot.ts`, `PhoneFrame`, `TabBar`, `glass-tokens`, `palette`, `DashboardScreen`);
everything else is `.design-sync/` previews, reports and tests.

## Diagnostics

| Check | Result |
|---|---|
| `npx vitest run --silent=true features/demo/ui/{__tests__,screens/__tests__,controls/__tests__,tokens}` | **125 files / 1736 passed + 2 todo, exit 0** |
| THE WALL | one comment in `components/marketing/phone-frame.tsx:7`; no import form. **Preserved.** |
| `.design-sync/` reachable from app code? | `grep -rn "design-sync" features app lib components` → **four comment references only**, no import/require. U8.4's preview tree stays out of every bundle. |
| Heavy deps | untouched; no new dependency, no import-shape change. |
| New effects / listeners / timers | **none** in the whole diff. |
| Contrast helper | reproduces every figure in `scanner-hud-colors.ts`'s own table to **0.00** (7.30 / 7.29 / 3.94 / 5.19 / 4.80 / 1.02 / 2.07 / 6.17 / 1.87). All ratios below are mine, independently measured. |

## Beat-by-beat verification (all clean)

**The boot disclosure's pin is genuinely two-sided, and the rendered value is 5.19 — disclosed, not
5.27, and correctly so.** The old `alpha >= 0.65` floor is gone; the claim now splits, and each half
asserts what its mechanism can enforce. `SplashScreen.test.tsx` owns the **paint**
(`boot-disclosure`'s `style.color` `toBe(asJsdom(SCANNER_DISCLOSURE_TEXT))` — the constant, not a
hand-typed near-miss), and `palette-contrast.test.ts` owns the **ratio**, measured against
`SCANNER_GROUND` imported from the module the gate paints from. Two-sided: `>= AA_TEXT` (floor) **and**
`< contrast(SCANNER_COLORS.idle.text, ground)` (the subordination ceiling — the half R-6's reasoning
needed and an alpha floor could never express). I re-measured every arm: `textSecondary@0.80` = **5.19**,
the retired `@0.70` on the new ground = **4.31** (so the alpha move was necessary, not cosmetic), and
`@0.65` = 3.92, which matches U8.1's P1a probe kill message exactly. The plan's *"hold the 5.27:1 v1
recorded"* is not met at 5.19 — but 5.27 was a ratio on `#000314`, ~0.815 alpha would reproduce it, and
the report says both of those things outright at `u8.1:159-161`. Disclosed deviation with sound
reasoning; no finding.

**The skip pill's `overlay` deviation is sound, and the plan's row would have shipped a regression.**
Measured, label over fill over frame: `scrim` 0.32 → **1.02**, the shipped `rgba(4,8,14,0.55)` → 2.07,
`overlay` 0.9 → **4.80** white / **6.50** black / 6.17 over the gate. Plan §5's U8.1 row asked for
`scrim`; taking it literally would have made the pill's label *less* legible than the literal it
replaced, on a control floating over an intro video of unknown content. The deviation is the same one
U4.4 already carved for `MEDIA_CLOSE_CHIP` / `PDF_LOADING_SCRIM`, at `overlay`'s exact value, and it is
pinned two-sided (`fill !== palette.dark.scrim` plus the negative that `scrim` measures under AA).
The 1.87 border is a decorative edge on a control whose label carries 6.17 — ledger §118's family,
correctly cited rather than silently spent.

**The SCANNER trio clears its floors in every state, including the new green.** On `SCANNER_GROUND`:
`idle`/`scanning` text (`textSecondary`) **7.30**; `authorized` text and mark (`success #10d177`)
**7.29**; `idle`/`scanning` mark (`primary`) **3.94**. Pinned per state with an anti-vacuity guard on
the state list, both floors asserted separately (`text >= AA_TEXT`, `primary >= AA_NON_TEXT`), plus the
negative that `primary` as text is **< AA_TEXT** — which is deferred §89 / W3 F52's ruling turned into
an assertion instead of a narration. The old `#30D158` fifth green is gone. `authorized.primary !==
idle.primary` is pinned as the discriminating assertion, so a trio that always resolved to `idle` reds.

**U8.2's reduced-motion refutation is TRUE on all three clauses — I checked each at source.** (1) The
sweep is inline-styled: `PhoneFrame.tsx:91` `animation: 'scanSweep 7s linear infinite'`, no class.
(2) `PhoneFrame.tsx` contains **zero** references to `useReducedMotion` / `reduceMotion` (grep count 0)
and never has. (3) `features/demo/ui/demo.css` has **no `prefers-reduced-motion` block at all**, so
nothing local catches it either — and the marketing block at `app/css/style.css:248` is class-matched,
which an inline `animation` is out of reach of by construction. The gap is genuinely pre-existing
(master carries the identical animation line) and W4 changes colour only. The deferral is honest about
the facts; its **scope and trigger** are the finding below.

**Tab bar a11y holds.** `aria-current="page"` kept and pinned; icons 25 → **24** on all four (pinned by
sweep, not by name); the active/inactive tints are pinned at `colors.primary` / `colors.textSecondary`.
Real `<button type="button">` with `aria-label` from the registry. The comment's own admission —
*"it swapped WHICH two hues are indistinguishable, so the announcement is still the only non-visual
cue"* — is accurate and honest (measured active-vs-inactive separation 1.59 → 1.85, still nowhere near
a usable cue), and 1.4.1 is answered for AT by `aria-current`. See the second finding for the half that
is not covered.

**Grid / Proposal C: SOUND, no finding.** A10 is ported in BOTH halves — dark `gridSubtle`
`rgba(153, 186, 221, 0.11)` and light `rgba(30, 58, 138, 0.06)`, derived from light's `primary` per the
phone's own comment — and `GLASS.gridOverlay` composes both of its repeating gradients from
`colors.gridSubtle`, so the flip moves it. What is deferred is **A11/A12 (`grid`, `gridLight`)**, not
A10, and the reasoning holds: neither has a web consumer, the demo has never rendered a second grid
weight, A12's own matrix row records the demo side as "None", and `PALETTE_KEYS`' membership pin would
force a drift-guard anchor per key — i.e. two guard rows over values no pixel reads, which plan §6.6
gate 1 forbids and D3 points away from. The 0.11 line measures 1.24 against the ground (0.05 was 1.10);
it is decorative, carries nothing, and no floor applies. I would have made the same call.

---

## MEDIUM

[MEDIUM] Proposal B's trigger is already spent, and it names one of three ungated inline animations
File: `reports/u8.2-implementation-report.md:248-262` · code: `features/demo/ui/PhoneFrame.tsx:91`, `features/demo/ui/screens/SyncStatusCard.tsx:116`, `features/demo/ui/screens/ExportActionSheet.tsx:178`

Issue: the refutation is correct and the "why deferred" is fair, but the row this proposal produces
cannot un-defer and does not cover the class. **Its named trigger is `U8.4` — which is in this same
wave and did not take it** (`PhoneFrame.tsx`'s only W4 change is the scan line's colour), so the
primary arm lapsed on arrival. The fallback arm is *"the next package that touches `PhoneFrame.tsx`'s
animation at all"*, and U8 is the campaign's last phase — there is no next package. A ledger row
written from this proposal is a permanent suppression, which is the one outcome the ledger's bar
exists to prevent.

Second, the scope. I swept every inline `animation:` under `features/demo/ui/**` and **three** are
ungated, not one:

| Site | Animation | Gated? |
|---|---|---|
| `PhoneFrame.tsx:91` | `scanSweep 7s linear infinite` | **no** — Proposal B |
| `SyncStatusCard.tsx:116` | `spin 0.9s linear infinite` | **no** — file has zero reduced-motion references |
| `ExportActionSheet.tsx:178` | `sheetUp 0.28s ease` | **no** — and `_shared.tsx:137`'s `modalSheetEnter` is the sibling that IS spread conditionally, so this is a hand-rolled copy that missed the treatment |

(`SplashScreen`'s `hudScan` is fine — `:133` gates it behind `!reduceMotion`; `GlassBottomSheet` routes
through its own `animation()` helper.) A row written against `PhoneFrame` alone closes one third of the
family and leaves the two nobody named — the partial-finding shape the completeness sweep exists for,
and the same "the record that forgets to enrol is the one that drifts" lesson U8.1's own docblock cites.

Evidence: `features/demo/CLAUDE.md` states the convention all three violate (the demo gates its own
inline-styled motion via `useReducedMotion`), and `app/css/style.css:244-247`'s comment asserts it as
fact — which U8.2 correctly identifies as false. The two-line shape is already used five times here
(`SplashScreen.tsx:77-79,114,133`, `AudioRecorderScreen.tsx:253`, `ImportTerminalProgress.tsx:598,635`),
so "not free" overstates the cost for the spinner and the one-shot; it is a fair argument only for the
frame's ambient sweep, which is the genuine visual-design call.

Fix: give the proposal a trigger that can fire — a named owner (a W4 rider, or an explicit
post-campaign row) rather than a package that has already shipped — and enumerate all three sites in
its **What** so the row closes the class. Splitting the visual-design question (does the frame keep any
ambient motion under `reduce`?) from the two mechanical ones would let the mechanical two land now.

---

[MEDIUM] The tab bar's active icon is now the dimmest of the four, at 3.14 — row 48's shape, one wave later, unpinned
File: `features/demo/ui/controls/TabBar.tsx:118` (the tint ternary) and `:93` (the new flat fill)

Issue: U8.3 moved the bar to a flat `colors.card` fill with the phone's `tabBarActiveTintColor`
(`colors.primary`) / `tabBarInactiveTintColor` (`colors.textSecondary`). Measured on `#0e3965`:

| | Before | After |
|---|---|---|
| **active** icon | `#4BA3D4` — 4.51 | `colors.primary` — **3.14** |
| **inactive** icons | `#5d7a9a` — 2.84 | `colors.textSecondary` — **5.82** |

The inactive half is a clear win (2.84 was under 1.4.11's 3.0). The active half is a problem twice.
**(a) The selected tab is now the least prominent element in the bar** — one icon at 3.14 among three
at 5.82 — which inverts what selection should look like, and this bar renders icons only (no labels),
so nothing else carries it. **(b) 3.14 sits 0.14 above 1.4.11's floor and nothing measures it**:
`palette-contrast.test.ts` has no tab-bar row at all, so a re-tint of `card` or `primary` walks the
active tab's only cue under the floor with every suite green.

This is exactly the shape W3's rider round closed one wave ago. F79 produced row 48 and exported
`MAP_PICKER_SELECTED_BORDER` because *"that margin survives no re-tint — a palette move of a couple of
units in the wrong direction drops the only mark distinguishing a selected case from an unselected one
below the floor, invisibly, with every other pin in the repo still green"* — that was 3.09 with 0.09 of
margin. This is 3.14 with 0.14, on a control present on every screen, and it shipped without the row.

Evidence: measured with the helper calibrated against this repo's own published figures.
`controls.test.tsx:37-47` pins the tint VALUES but no ratio; `palette-contrast.test.ts` gained scanner
rows this wave and no tab-bar rows. Precedent and wording: row 48 and `CaseMapPicker.tsx`'s
`MAP_PICKER_SELECTED_BORDER` docblock.

Fix: export the two tints as constants from `TabBar.tsx` and add one §C.1 row bounding both at
`AA_NON_TEXT` over `colors.card`, two-sided in row 48's shape (ratio floor + `toBe` identity) — four
lines, and it closes (b). (a) is an owner call: the pairing is phone-verbatim, so either it is accepted
and recorded as a documented inversion, or the active tint takes `colors.link` (7.02 on this fill) the
way `SettingsNavBar`'s `BACK_TINT` and `SyncStatusCard`'s spinner already do. I am not asking for the
re-tint; I am asking that 3.14 stop being an unmeasured number.

---

## Web Reviewer Summary

CRITICAL: 0 · HIGH: 0 · MEDIUM: 2 · LOW: 0
Verdict: **APPROVE with comments**

Marketing-to-demo isolation: **preserved**
Bundle impact: **none** — `.design-sync/` is referenced only in comments; no dependency, no import-shape change
Browser-resource cleanup: **n/a** — the diff adds no effect, listener, timer or object URL
Accessibility: the scanner trio, the disclosure and the skip pill all clear their floors with two-sided pins; `aria-current` and the 24px icons are kept and pinned; two gaps found (the reduced-motion deferral's scope and trigger; the unmeasured active-tab margin)
Style-convention adherence: **correct half** — inline `CSSProperties` throughout, the teal purge is derived rather than re-spelled, `backgroundColor` chosen over the `background` shorthand so flatness is structural, and D9's frozen keyframes and `demo.css` are untouched

Notes: I did not drive Chromium. Every claim is arithmetic over inline values that jsdom and the
browser resolve identically (no gradients, no alpha stacks beyond `flattenOver`'s own), and the one
render-dependent claim — that the active tab is visibly the dimmest of four — follows directly from
3.14 vs 5.82 against a shared ground. No dev server was started; port 3009 was never opened.

Out-of-lane observations:
- `DashboardScreen.tsx:82`'s badge going to `colors.text` (9.50) rather than `colors.primary`, with the phone's own ruling quoted, is W3/F52's lesson applied pre-emptively. Worth recording as the wave doing the right thing unprompted.
- `boot.ts`'s docblock DELETING the `#000314` literal rather than updating it (so it stops being a fifth place to mine the retired value from) is the right treatment of plan §8's doc-mining hazard; whether the comment still reads correctly is `typescript-reviewer`'s call.
