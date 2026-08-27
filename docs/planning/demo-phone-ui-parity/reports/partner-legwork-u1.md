# Partner legwork — W1 briefs (U1.1 glass-tier module · U1.2–U1.4 adoption)

**Produced:** 2026-08-27 · seat: PARTNER (`dt-partner`, Opus)
**Demo repo:** `demo-website-dvr-extraction-notes`
 · `master` @ **`337dc52`**
 · `feat/uiparity-u0` @ **`155efea`** ("Merge uiparity/u0.foundation into feat/uiparity-u0 — U0.0 un-red, U0.1 palette (both halves), U0.2 scales, U0.3 primary gradient"), read via `git show` only.
**Phone repo:** `extraction_case_notes_react_native_expo` @ **`dd5551ec`** — READ-ONLY. No edit/commit/stash/checkout/install.
**Not read:** `worktrees/u0-*` (per dispatch).

**Evidence grades**
- **verified** — file opened at the named commit; quoted text is byte-copied.
- **measured** — produced by a command; the command is given.
- **inferred** — drawn from verified/measured facts plus the plan/matrix; marked inline.

**Probe hygiene note (a real incident, recorded because it nearly produced a false finding).**
The first `readField` probe was written with a Git-Bash heredoc and **silently lost one backslash
level** — `\\b`/`\\s` arrived as `\b`/`s`, so the compiled regex was `borders*:s*…` and *every* probe
reported THROW. That is the exact hazard plan §4.7 records for `census.mjs`. The probe was rewritten
via a file-write tool (no shell quoting) and re-run; §4 below quotes the **corrected** run. Any probe
in this repo that types a regex through a heredoc must print `re.source` before trusting a verdict.

---

## 0. Corrections — the load-bearing ones

| # | Plan says | Reality | Impact |
|---|---|---|---|
| C1 | U1.1 owns A30, `card.border rgba(30,58,95,0.5) → rgba(28,78,132,0.5)` | **Already landed by U0.1.** `glass-tokens.ts:52` on `feat/uiparity-u0` is `borderSoft: '1px solid rgba(28,78,132,0.5)'`, and its three pins moved with it (`test:40`, `:91`, `:101`). | U1.1 must **not** redo it. Its job for A30 is only to make `borderSoft` *derive* from `GLASS_TIER.card.border`. |
| C2 | `readField` with `{ after: 'card: {', before: '}' }` "reaches every one, ~12 lines of guard code, not a new mechanism" | **False on two counts** (measured, §4). `after:'card: {'` lands on the **LIGHT** tier, and `readField` **cannot read `gradient` at all** (array literal). | The tier anchors need three-level scoping **and a new `readTuple` reader**. 18 of 24 parts work with scoping alone; the **12 gradient stops** do not. |
| C3 | "the existing ~40 importers keep working" | **54** non-test importers of `glass-tokens.ts` (55 with the test). | Sizing only, but the brief should say 54. |
| C4 | U1.2 "before" = `glassCard {borderRadius:12, …}` | On u0 it is `borderRadius: radius.lg` (`glass-tokens.ts:60`), `border: GLASS.borderSoft` (already the new value), `background: GLASS.gradientCard`. | U1.2's diff is smaller than the row implies. |
| C5 | A43/U1.2: "move the four `borderRadius:16` card sites to 12", citing `AlertDialog.tsx:141` | **`AlertDialog`'s 16 is the CENTRED-DIALOG shell**, and U4.3's own recipe keeps `borderRadius:16` for it. Moving it to 12 in U1.2 would be undone by U4.3. | Drop `AlertDialog` from U1.2's list — it is **three** card sites, not four. |
| C6 | A43's four cited line numbers | Three of four were **already wrong on `master`**: `DashboardScreen:113`→**119**, `ExportCaseCard:47`→**49**, `AlertDialog:141`→**147**. Only `CasesScreen:142` was right. | Corrected u0 numbers in §5.3. |
| C7 | §6.1's `glass-tokens.ts` serialise chain is "U0.1 → U0.2 → U0.3 → U1.1 → U1.2" | **U1.3 also edits it** (`GLASS.borderAccent` 0.3 → 0.25). | Extend the chain to `… → U1.2 → U1.3`. |

---

## 1. U1.1 tier values — 24/24 DARK parts byte-exact, zero mismatches

**verified** — `src/constants/Colors.ts` at `dd5551ec`, `GlassColors.dark` = `:345-438`.

| Tier | Part | Phone value @ `main` | file:line | Plan U1.1 cell |
|---|---|---|---|---|
| `card` | gradient | `['rgba(14, 57, 101, 0.85)', 'rgba(23, 65, 110, 0.92)']` | `:347` | ✓ |
| `card` | border | `rgba(28, 78, 132, 0.5)` | `:348` | ✓ |
| `card` | highlightTop | `rgba(184, 212, 240, 0.08)` | `:349` | ✓ |
| `card` | innerShadow | `rgba(0, 0, 0, 0.2)` | `:350` | ✓ |
| `nestedCard` | gradient | `['rgba(23, 65, 110, 0.7)', 'rgba(14, 57, 101, 0.6)']` | `:380` | ✓ (stops swapped, as the plan says) |
| `nestedCard` | border | `rgba(43, 140, 193, 0.45)` | `:381` | ✓ |
| `nestedCard` | highlightTop | `rgba(184, 212, 240, 0.2)` | `:382` | ✓ |
| `nestedCard` | innerShadow | `rgba(0, 0, 0, 0.15)` | `:383` | ✓ |
| `elevated` | gradient | `['rgba(23, 65, 110, 0.88)', 'rgba(14, 57, 101, 0.95)']` | `:386` | ✓ |
| `elevated` | border | `rgba(43, 140, 193, 0.25)` | `:387` | ✓ |
| `elevated` | highlightTop | `rgba(184, 212, 240, 0.12)` | `:388` | ✓ |
| `elevated` | innerShadow | `rgba(0, 0, 0, 0.25)` | `:389` | ✓ |
| `header` | gradient | `['rgba(0, 38, 80, 0.95)', 'rgba(2, 46, 89, 0.98)']` | `:392` | ✓ |
| `header` | border | `rgba(28, 78, 132, 0.6)` | `:393` | ✓ |
| `header` | highlightTop | `rgba(153, 186, 221, 0.1)` | `:394` | ✓ |
| `header` | innerShadow | `rgba(0, 0, 0, 0.15)` | `:395` | ✓ |
| `sheet` | gradient | `['rgba(0, 40, 83, 0.98)', 'rgba(14, 57, 101, 1)']` | `:401` | ✓ |
| `sheet` | border | `rgba(28, 78, 132, 0.6)` | `:402` | ✓ |
| `sheet` | highlightTop | `rgba(184, 212, 240, 0.14)` | `:403` | ✓ |
| `sheet` | innerShadow | `rgba(0, 0, 0, 0.3)` | `:404` | ✓ |
| `recessed` | gradient | `['rgba(0, 24, 50, 0.6)', 'rgba(0, 32, 64, 0.5)']` | `:434` | ✓ |
| `recessed` | border | `rgba(0, 14, 30, 0.75)` | `:435` | ✓ |
| `recessed` | highlightTop | `rgba(0, 12, 26, 0.55)` | `:436` | ✓ |
| `recessed` | innerShadow | `rgba(0, 0, 0, 0.45)` | `:437` | ✓ |

**Zero value mismatches.** The plan's U1.1 Recipes cell is correct as written.

**The one difference, and it matters for the drift guard only:** the phone spells its `rgba()` with
spaces (`rgba(14, 57, 101, 0.85)`); the demo convention is unspaced. That is precisely what U0.4's
`norm()` whitespace fix exists for. **U1.1 must not "fix" the demo's spacing to match the phone** — the
demo's byte-exact shape pins in `glass-tokens.test.ts` would redden for a formatting change.

**Tier declaration line numbers, for the brief:** `dark:` `:345` · `card` `:346-351` · `nestedCard`
`:379-384` · `elevated` `:385-390` · `header` `:391-396` · `sheet` `:397-405` (values `:401-404`;
`:398-400` is the "what `sheet` replaced" comment) · `recessed` `:433-438` (values `:434-437`;
`:406-432` is the ΔE derivation comment). `GlassColors` closes at `:440`.

---

## 2. `GLASS` importers — 54 non-test files (measured)

`git grep -l "from '@/features/demo/ui/glass-tokens'" master -- 'features/demo/**' | grep -v __tests__ | wc -l` → **54**.
Plus `features/demo/ui/__tests__/glass-tokens.test.ts` = 55 total.

### 2.1 Key usage counts (measured, non-test, `master`)

| Key | Occurrences | Files |
|---|---|---|
| `GLASS.border` | 84 | 43 |
| `GLASS.borderSoft` | 19 | 13 |
| `GLASS.borderBtn` | 14 | 13 |
| `GLASS.borderError` | 12 | 10 |
| `GLASS.borderAccent` | 10 | 9 |
| `GLASS.gradientPanel` | 10 | 9 |
| `GLASS.gradientCardDiag` | 8 | 6 |
| `GLASS.accentFrom` | 7 | 4 |
| `GLASS.gradientCard` (exact, `\b`) | 4 | — |
| `GLASS.gradientAccent` | 3 | 3 |
| `GLASS.gridOverlay` | 2 | 2 |
| `GLASS.accentTo` | 1 | 1 |

### 2.2 Importers and what each pulls (`master`; the import line is the cite)

`GLASS` only (33): `PhoneFrame.tsx:7` · `controls/ExploreChecklist.tsx:7` · `controls/WizardDrawer.tsx:12` ·
`inputs/AddressAutocomplete.tsx:5` · `inputs/CameraGpsCapture.tsx:13` · `inputs/CoordinateDisplay.tsx:8` ·
`inputs/GpsCaptureControl.tsx:6` · `inputs/IncidentLocationFields.tsx:17` · `inputs/input-theme.ts:1` ·
`screens/DashboardScreen.tsx:6` · `screens/DvrInfoScreen.tsx:18` · `screens/ExportActionSheet.tsx:7` ·
`screens/MediaLibrarySheet.tsx:27` · `screens/NewCaseModal.tsx:11` · `screens/SubmissionScreen.tsx:7` ·
`screens/SyncStatusCard.tsx:4` · `screens/export/ExportCaseCard.tsx:6` · `screens/map/CaseMapPicker.tsx:6` ·
`screens/settings/SettingsNavBar.tsx:4` · `screens/settings/panes/AboutPane.tsx:6` ·
`screens/settings/panes/ExportSecurityPane.tsx:5` · `screens/settings/panes/FormFieldsPane.tsx:14` ·
`screens/settings/panes/_pane-chrome.tsx:6`  (+ the mixed importers below)

Mixed / fragment-only importers:
`DemoExperience.tsx:152` (`glassBtnSecondary`) · `chrome/DemoErrorBoundary.tsx:4` (`GLASS`,`glassBtnPrimary`) ·
`chrome/PdfPreview.tsx:5` (both btns) · `controls/AlertDialog.tsx:5` (`GLASS`,both btns) ·
`controls/ExitDialog.tsx:4` (`GLASS`,`glassBtnPrimary`) · `inputs/DateField.tsx:9` (`glassBtnPrimary`) ·
`inputs/TimeField.tsx:9` (both btns) · `screens/ArrivalDepartureScreen.tsx:5` (`glassCard`) ·
`screens/AudioPreviewScreen.tsx:12` (`GLASS`,both btns,`glassCard`) · `screens/AudioRecorderScreen.tsx:14` (`GLASS`,`glassCard`) ·
`screens/CamerasScreen.tsx:9` (`glassCard`) · `screens/CaseActionsSheet.tsx:8` (`GLASS`,both btns) ·
`screens/CasesScreen.tsx:5` (`GLASS`,both btns) · `screens/CompletionScreen.tsx:5` (`GLASS`,both btns) ·
`screens/DeleteConfirmationModal.tsx:6` (`GLASS`,`glassBtnSecondary`) · `screens/DuplicateLocationModal.tsx:6` (`GLASS`,both btns) ·
`screens/ExportModal.tsx:16` (`GLASS`,both btns) · `screens/ExtractedScopeScreen.tsx:5` (`glassCard`,`glassBtnSecondary`) ·
`screens/ImportModal.tsx:21` (`GLASS`,both btns) · `screens/ImportResultAccordion.tsx:7` (`glassBtnPrimary`) ·
`screens/MediaCaptureScreen.tsx:18` (both btns) · `screens/OcrCaptureScreen.tsx:4` (`GLASS`,both btns) ·
`screens/RequestedScopeScreen.tsx:5` (`GLASS`,`glassCard`) · `screens/RowActions.tsx:4` (`GLASS`,`glassBtnSecondary`) ·
`screens/TimeOffsetScreen.tsx:8` (`GLASS`,`glassCard`,`glassBtnPrimary`) · `screens/_shared.tsx:9` (`GLASS`,`glassCard`,both btns) ·
`screens/export/ExportHub.tsx:7` (`GLASS`,`glassBtnPrimary`) · `screens/import/PasteStage.tsx:4` (`GLASS`,`glassBtnPrimary`) ·
`screens/import/PickerStage.tsx:5` (`GLASS`,both btns) · `screens/settings/SettingsCategoryList.tsx:6` (`GLASS`,`glassCard`) ·
`screens/settings/UserProfileModal.tsx:10` (`glassBtnPrimary`)

**`glassCard` consumers = 9 files** (excluding `glass-tokens.ts` itself): `ArrivalDepartureScreen`,
`AudioPreviewScreen`, `AudioRecorderScreen`, `CamerasScreen`, `ExtractedScopeScreen`,
`RequestedScopeScreen`, `TimeOffsetScreen`, `_shared`, `settings/SettingsCategoryList`.
**The plan's "~9" is exactly right.**

### 2.3 Shapes that would break a derived getter — NONE FOUND (measured)

```
git grep -n -E "\.\.\.GLASS|Object\.(keys|values|entries|assign)\(GLASS" master -- 'features/demo/**'   -> no output
git grep -n "typeof GLASS\|keyof typeof GLASS" master -- 'features/demo/**'                            -> no output
git grep -n -E "GLASS\.(gradientCard|gradientPanel|borderSoft|borderAccent)\b[^,;)}\`]*\+"             -> no output
```

No object spread of `GLASS`, no reflective enumeration, no type-level dependency on its literal types,
no string concatenation of the four derived keys. **Every one of the 54 importers reads a key as a
plain value into an inline style.** So a derivation is safe.

### 2.4 The derivation shape to use — already proven in-tree by U0

**Do not use getters.** Use plain values evaluated at module init, which is what `gradientAccent`
has always done (`master:glass-tokens.ts:34` — `` `linear-gradient(180deg,${ACCENT_FROM},${ACCENT_TO})` ``)
and what U0.1 extended to the borders on `feat/uiparity-u0`:

```ts
// feat/uiparity-u0:features/demo/ui/glass-tokens.ts
border: `1px solid ${colors.border}`,          // :50
borderBtn: `1px solid ${colors.borderLight}`,  // :53
} as const                                      // :56  <- still `as const`, still typechecks
```

`as const` over a template literal with non-literal substitutions widens the property to `string`;
`satisfies CSSProperties` accepts that, and U0 has already shipped and gated it. The same holds for
the fragments — `borderRadius: radius.lg` (`:60`), `background: colors.backgroundSecondary` (`:77`).

**One ordering hazard to state in the brief:** `glass-tokens.ts` must import `glass-tiers.ts`, never
the reverse. A cycle would evaluate the template literals against `undefined` at module init and the
byte-exact shape pins would fail with `linear-gradient(180deg,undefined,undefined)`.

**And one thing U1.1 must NOT tidy:** `ACCENT_FROM`/`ACCENT_TO` stay **spelled literals**
(`feat/uiparity-u0:glass-tokens.ts:34-35`), with the docblock at `:26-33` explaining why — drift-guard
anchors 7/8 read them with `readConst`, which matches literals, not identifier references.

---

## 3. `glass-tokens.test.ts` — what U1.1/U1.2/U1.3 redden

**State on `feat/uiparity-u0` (verified):** U0 already rewrote 14 lines. `BANNED` entries **#4 accent
gradient**, **#6 hard border**, **#7 soft border** and **#8 button border** are done; the `GLASS` shape
pin and the fragment pin moved with them. That supersedes rows 6/7/8 of `partner-legwork-u0.md` §3.3.

### 3.1 `BANNED` rewrites still owed (`:33-44` on u0)

| Line | Entry | Current on u0 | Rewrite to | Owner |
|---|---|---|---|---|
| `:34` | `card gradient` | `linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))` | `linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))` | **U1.1** |
| `:35` | `diagonal card gradient` | `linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))` | `linear-gradient(135deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))` | **U1.1** (D11 keeps the 135° variant, re-based) |
| `:36` | `panel gradient` | `linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))` | `linear-gradient(180deg,rgba(23,65,110,0.88),rgba(14,57,101,0.95))` | **U1.1** |
| `:42` | `accent border` | `1px solid rgba(43,140,193,0.3)` | `1px solid rgba(43,140,193,0.25)` | **U1.3** |
| `:38` | `grid overlay` | `…rgba(153,186,221,0.05)…` | `…rgba(153,186,221,0.11)…` | U8.2 (not W1) |
| `:37`,`:39`,`:40`,`:41`,`:43` | accent gradient · hard/soft/button border · error border | — | **no change owed in W1** (`:37/:39/:40/:41` done by U0; `:43` never changes) | — |

### 3.2 Shape pin `:80-96` — the new expected strings

```ts
it('pins the GLASS token values (an edit here restyles ~60 call sites)', () => {
  expect(GLASS).toEqual({
    accentFrom: '#1F6B99',                                                             // :82  unchanged (U0)
    accentTo: '#17527A',                                                               // :83  unchanged (U0)
    gradientCard: 'linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))', // :84  U1.1
    gradientCardDiag: 'linear-gradient(135deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))', // :85  U1.1
    gradientPanel: 'linear-gradient(180deg,rgba(23,65,110,0.88),rgba(14,57,101,0.95))', // :86  U1.1
    gradientAccent: 'linear-gradient(180deg,#1F6B99,#17527A)',                          // :87  unchanged (U0)
    gridOverlay: '…0.05…',                                                              // :88-89 unchanged until U8.2
    border: '1px solid #1c4e84',                                                        // :90  unchanged (U0)
    borderSoft: '1px solid rgba(28,78,132,0.5)',                                        // :91  unchanged (U0 — see C1)
    borderBtn: '1px solid #2e5f97',                                                     // :92  unchanged (U0)
    borderAccent: '1px solid rgba(43,140,193,0.25)',                                    // :93  U1.3
    borderError: '1px solid rgba(255,71,87,0.3)',                                       // :94  never changes
  })
})
```

**Three lines move in U1.1 (`:84`, `:85`, `:86`); one moves in U1.3 (`:93`).**

### 3.3 Fragment pin `:98-116` — `glassCard` gains two keys

```ts
expect(glassCard).toEqual({
  borderRadius: 12,                                                                     // :100 unchanged (radius.lg)
  border: '1px solid rgba(28,78,132,0.5)',                                              // :101 unchanged (U0)
  background: 'linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))',      // :102 U1.2 (moves with U1.1)
  borderTopColor: 'rgba(184,212,240,0.08)',                                             // NEW, U1.2
  boxShadow: 'inset 0 1px 0 rgba(0,0,0,0.2), 0 4px 8px rgba(0,0,0,0.15)',               // NEW, U1.2
})
```

`glassBtnPrimary` (`:104-109`) and `glassBtnSecondary` (`:110-115`) are **untouched by W1** — U0
already moved them and U2.2 owns their next move.

**Trap, stated because `toEqual` is exact:** adding `borderTopColor`/`boxShadow` to `glassCard` reddens
`:99-103` on the *shape of the object*, not just a value. The commit body must record that red line
too, or a reviewer reads a two-key addition as an accidental widening.

### 3.4 The relational pin `:118-123` must NOT move

`expect(T.accentFrom).toBe(GLASS.accentFrom)` etc. is relational. If it reddens during W1, something
structural changed — treat it like the `UserProfilePane` z-index pins, not a pin to update.

### 3.5 The `TOKEN_MODULES` allow-list

U1.1 creates `ui/tokens/glass-tiers.ts`, which the walk at `:19-30` scans. Once U1.1 rewrites the three
gradient entries, that file **is** an offender. Append its path to the allow-list U0.5 installed (or,
if U0.5 has not landed, U1.1 must add the module to the existing skip — check before writing).

---

## 4. Tier anchors for the drift guard — MEASURED, and the plan is wrong

Probe: a faithful copy of `check-rn-parity.mjs:35-52` (`norm` + `readField`) run against the phone's
`Colors.ts` at `dd5551ec`. Sanity arm first, to prove the copy is faithful:

```
LIVE primary {after:'dark: {', before:'} as const'}  => "#2b8cc1"      <- matches the live anchor
```

### 4.1 `after: 'card: {'` lands on the LIGHT tier

```
border  {after:'card: {', before:'}'}        => "rgba(148, 163, 184, 0.45)"   <- LIGHT card border
highlightTop {after:'card: {', before:'}'}   => "rgba(148, 163, 184, 0.45)"   <- LIGHT
```

First-occurrence ordering in `Colors.ts` (measured, `grep -n -F`):

| Marker | LIGHT hit | DARK hit |
|---|---|---|
| `card: {` | **275** | 346 |
| `nestedCard: {` | **301** | 379 |
| `elevated: {` | **313** | 385 |
| `header: {` | **320** | 391 |
| `sheet: {` | **326** | 397 |
| `recessed: {` | **334** | 433 |

Worse: `dark: {` alone is **not** enough either — `Colors.dark` opens at `:128`, long before
`GlassColors.dark` at `:345`. `GlassColors` itself is declared at `:273`.

**So the tier anchors need a THREE-level scope: `export const GlassColors` → `dark: {` → `<tier>: {`.**

### 4.2 With three-level scoping, 18 of 24 parts read correctly

```
3-level card.border        => "rgba(28, 78, 132, 0.5)"     3-level header.border        => "rgba(28, 78, 132, 0.6)"
3-level card.highlightTop  => "rgba(184, 212, 240, 0.08)"  3-level header.highlightTop  => "rgba(153, 186, 221, 0.1)"
3-level card.innerShadow   => "rgba(0, 0, 0, 0.2)"         3-level header.innerShadow   => "rgba(0, 0, 0, 0.15)"
3-level nestedCard.border  => "rgba(43, 140, 193, 0.45)"   3-level sheet.border         => "rgba(28, 78, 132, 0.6)"
3-level nestedCard.hlTop   => "rgba(184, 212, 240, 0.2)"   3-level sheet.highlightTop   => "rgba(184, 212, 240, 0.14)"
3-level nestedCard.innerSh => "rgba(0, 0, 0, 0.15)"        3-level sheet.innerShadow    => "rgba(0, 0, 0, 0.3)"
3-level elevated.border    => "rgba(43, 140, 193, 0.25)"   3-level recessed.border      => "rgba(0, 14, 30, 0.75)"
3-level elevated.hlTop     => "rgba(184, 212, 240, 0.12)"  3-level recessed.highlightTop=> "rgba(0, 12, 26, 0.55)"
3-level elevated.innerSh   => "rgba(0, 0, 0, 0.25)"        3-level recessed.innerShadow => "rgba(0, 0, 0, 0.45)"
```

All 18 correct. `before: '}'` is safe for every tier — no `}` appears inside a tier body before its
closing brace (the gradient uses `[ ]`, and `rgba()` uses parens). And `indexOf('card: {')` inside the
`GlassColors.dark` slice cannot collide with `nestedCard: {`, because that spells `Card: {` with a
capital C (checked: the hit's context is `"dark: {\r\n    card: {\r\n"`).

### 4.3 `gradient` cannot be read at all — all six tiers THROW

```
3-level card.gradient      => THROW: field not found: gradient
3-level nestedCard.gradient=> THROW: field not found: gradient
3-level elevated.gradient  => THROW: field not found: gradient
3-level header.gradient    => THROW: field not found: gradient
3-level sheet.gradient     => THROW: field not found: gradient
3-level recessed.gradient  => THROW: field not found: gradient
```

`readField`'s regex is `\bkey\s*:\s*(?:'…'|"…"|[0-9.]+)`. After `gradient:` comes `[`, which matches
none of the three alternatives. **The 12 gradient stops — the ones the plan calls "the 12 that
matter" — are exactly the ones `readField` cannot see.** Per `partner-legwork-u0.md` §0.2 this is a
*throw*, so pre-U0.4 it would blank every anchor; post-U0.4 it becomes 12 `PARSE-FAILED` rows, which
is a permanently red gate.

### 4.4 The minimal fix — two small additions, not a new mechanism

```js
// 1) let `after` be a list of successive markers (3 changed lines in readField/readConst)
if (after) {
  for (const marker of [after].flat()) {
    const i = region.indexOf(marker)
    if (i === -1) throw new Error(`region marker not found: ${marker}`)
    region = region.slice(i)
  }
}

// 2) a sibling reader for the two-element tuple (5 lines)
function readTuple(text, key, opts) {
  const region = scope(text, opts)                       // same slicing as readField
  const m = region.match(new RegExp(`\\b${key}\\s*:\\s*\\[\\s*'([^']*)'\\s*,\\s*'([^']*)'`))
  if (!m) throw new Error(`tuple not found: ${key}`)
  return [norm(m[1]), norm(m[2])]
}

// usage
const TIER = (t) => ({ after: ['export const GlassColors', 'dark: {', `${t}: {`], before: '}' })
readTuple(colors, 'gradient', TIER('card'))   // -> ['rgba(14, 57, 101, 0.85)', 'rgba(23, 65, 110, 0.92)']
readField(colors, 'border',   TIER('card'))   // -> 'rgba(28, 78, 132, 0.5)'
```

**`norm()`'s whitespace fix (U0.4 defect 5) is a hard prerequisite** — every value above comes back
spaced (`rgba(28, 78, 132, 0.5)`) and every demo value is unspaced. Without it all 24 tier anchors
compare unequal forever. Confirm U0.4 landed it before U1.1 adds a single anchor.

**Recommended anchor count for U1.1:** 24 (6 tiers × gradient[0], gradient[1], border, highlightTop)
or 18 if `innerShadow` is dropped as unchanged-by-design. The plan says "+12"; say which 12, or take
24 and say so in §9's total.

---

## 5. U1.2–U1.4 consumer line ranges — `master` vs `feat/uiparity-u0`

### 5.1 What U0.1 did to these files

U0.1 inserted **exactly one import line near the top** of four of the twelve W1 files, so everything
below shifts **+1**. Hunk headers (measured, `git diff master feat/uiparity-u0`):

| File | Top hunk | Shift below it |
|---|---|---|
| `screens/CaseActionsSheet.tsx` | `@@ -6,6 +6,7 @@` | +1 |
| `screens/DvrInfoScreen.tsx` | `@@ -16,6 +16,7 @@` | +1 |
| `screens/_shared.tsx` | `@@ -7,6 +7,7 @@` | +1 |
| `screens/map/CaseMapPicker.tsx` | `@@ -4,6 +4,7 @@` | +1 |
| `screens/CasesScreen.tsx` | `@@ -6,6 +6,7 @@` | +1 |
| `screens/DashboardScreen.tsx` | `@@ -6,6 +6,7 @@` | +1 |
| `screens/export/ExportCaseCard.tsx` | `@@ -6,6 +6,8 @@` | **+2** |
| `ImportResultBody` · `ImportModal` · `ExportModal` · `CompletionScreen` · `TabBar` · `SettingsNavBar` · `WizardDrawer` · `AlertDialog` | — | **untouched by U0** |

### 5.2 U1.3 — the five nested-card re-derivations plus `CompletionScreen`

| Plan cite (`master`) | Correct on `feat/uiparity-u0` | Verdict |
|---|---|---|
| `ImportResultBody.tsx:6-13` | **`:6-13`** — `const card`, gradient `rgba(26,45,68,0.6)→rgba(19,34,54,0.7)` at `:9` | ✓ exact |
| `ImportModal.tsx:181-185` | **`:181-185`** — flat `background: 'rgba(26,45,68,0.45)'` at `:181` | ✓ exact (it is a flat fill, not a gradient — the plan says so) |
| `CaseActionsSheet.tsx:175-189` | **`:176-190`** — styled div `:176-190`, `background: 'rgba(13,27,42,0.6)'` at **`:184`** | **+1** |
| `DvrInfoScreen.tsx:192-200` | **`:193-201`** — row div at `:193`, `background: 'rgba(13,27,42,0.6)'` inline | **+1** |
| `ExportModal.tsx:291-303` | **`:291-303`** — `background: 'rgba(13,27,42,0.6)'` at `:299` | ✓ exact |
| `CompletionScreen.tsx:94-106` | **`:94-106`** — gradient `0.9/0.96` **and** the `techGlow` `boxShadow: '0 0 22px rgba(43,140,193,0.12)'` both on `:94` | ✓ exact |

Note for the U1.3 brief: `CompletionScreen.tsx:94` carries the `techGlow` M1(a) removes **on the same
line** as the gradient. U6.4b owns the glow removal; U1.3 owns the gradient. Two packages, one line —
land U1.3 first and say so in both PR bodies, or the second one silently reverts the first.

### 5.3 U1.2 — the `borderRadius: 16` card sites (A43)

| Plan cite | Truth on `master` | Truth on `feat/uiparity-u0` |
|---|---|---|
| `CasesScreen.tsx:142` | `:142` ✓ | **`:143`** |
| `DashboardScreen.tsx:113` | **`:119`** ✗ (plan wrong by 6 at master) | **`:120`** |
| `ExportCaseCard.tsx:47` | **`:49`** ✗ (wrong by 2) | **`:51`** |
| `AlertDialog.tsx:141` | **`:147`** ✗ (wrong by 6; `:141` is the style block's opening) | `:147` (untouched by U0) |

**And `AlertDialog` should be dropped from U1.2 entirely (C5):** its `borderRadius: 16` is the
**centred-dialog shell**, and U4.3's own recipe keeps `borderRadius: 16` for that shell. U1.2 moving it
to 12 would be reverted by U4.3 two phases later. U1.2's A43 sweep is **three** card sites:
`CasesScreen:143`, `DashboardScreen:120`, `ExportCaseCard:51`.

**There are 16 `borderRadius: 16` sites under `features/demo/ui/**` on u0**, not four. The other
thirteen are **not cards** and U1.2 must leave every one alone:
`chrome/DemoErrorBoundary.tsx:33` · `controls/AlertDialog.tsx:147` · `controls/ExitDialog.tsx:54` ·
`screens/AudioRecorderScreen.tsx:159,205` (spread of `glassCard`, radius comes from the fragment) ·
`screens/DeleteConfirmationModal.tsx:112` · `screens/ExportActionSheet.tsx:169` ·
`screens/ExportModal.tsx:260` · `screens/MediaCaptureScreen.tsx:155` ·
`screens/MediaLibrarySheet.tsx:711` · `screens/SplashScreen.tsx:110` ·
`screens/map/LocationDetailCard.tsx:33` (a back *button*) · `screens/map/LocationList.tsx:66`.
Dialogs stay 16 (A45/U4.3), sheets go to 22 (A38/U4.1), the rest are not cards at all.

### 5.4 U1.4 — the five header gradients

| Plan cite (`master`) | Correct on `feat/uiparity-u0` | Verdict |
|---|---|---|
| `_shared.tsx:397` gradient, `WizardHeader` declared `:394` | **`:398`** gradient; `WizardHeader` declared **`:395`**; JSDoc `:394`; local `iconBtn` `:396` | **+1** |
| `TabBar.tsx:75` bar (borderTop `:76`, padding `:77`, boxShadow `:80`) | **unchanged** — `:75/:76/:77/:80` | ✓ exact |
| `SettingsNavBar.tsx:22-32` | **unchanged** — `:22-32` | ✓ exact |
| `CaseMapPicker.tsx:30-34` | **`:31-35`** — `const header` at `:31`, `borderBottom: GLASS.border` `:33`, `background: 'linear-gradient(180deg,#13243a,#0e1d30)'` **`:34`** | **+1** |
| `WizardDrawer.tsx:333-341` + `:389` | **unchanged** — `:333-341`, `:389` | ✓ exact |

Incidental, for the U1.4 brief: `CaseMapPicker.tsx:29` is `const accent = '#4ba3d4'` — the **lowercase**
`primaryLight` literal flagged in `partner-legwork-u0.md`. U1.4 opens this file; if the orchestrator
wants that literal collapsed onto the palette, U1.4 is the cheapest place, but it is **U5.2/U5.4's row**
and doing it here without a note would read as scope creep.

---

## 6. Residual open items

1. **`norm()`'s whitespace fix is a hard prerequisite for every tier anchor** (§4.4). Confirm U0.4
   landed it before U1.1 adds one.
2. **Say which 12** the plan's "+12 tier anchors" means, or take 24 and update §9's ~32 total.
3. **`glass-tokens.ts` contention chain omits U1.3** (§6.1 of the plan) — extend it.
4. **`CompletionScreen.tsx:94` is shared between U1.3 (gradient) and U6.4b (`techGlow`)** — one line,
   two packages, two phases (§5.2).
5. **A30 is done** — U1.1's row should be re-worded from "re-base `borderSoft`" to "derive `borderSoft`
   from `GLASS_TIER.card.border` (value already correct since U0.1)".
6. **`AlertDialog` leaves U1.2's A43 list** (C5) — and A43's own matrix row should record that dialogs
   keep 16 per A45, or the same conflict resurfaces at U4.3's review.
