# Partner legwork — W3 briefs (U5 map chrome · U6 wizard/settings/export · U7 import/OCR/audio/media)

**Produced:** 2026-08-27 · seat: PARTNER (`dt-partner`, Opus)
**Demo base:** `feat/uiparity-w1` @ **`d91ab76`** ("Merge uiparity/u1-fix2-cards into feat/uiparity-w1 — W1 rider: fragments to longhands (lit-edge ruling), vitest.setup conflicting-property guard (+4 live defects it caught), docblocks").
**Phone:** `extraction_case_notes_react_native_expo` @ **`dd5551ec`** — READ-ONLY, reads only.
**Method:** `git archive d91ab76 features/demo | tar -x` into session scratch; phone read in place. No worktree cut; no seat worktree touched; nothing written to either repo.
**Scope note:** the dispatch asked for SUBSTANCE, not a shift table. Line numbers below are given because a mismatch needs one, not as an exhaustive re-shift — W2 will move them again.

**Evidence grades** — **verified** (opened at the named commit, text byte-copied) · **measured** (command given) · **inferred** (marked inline). Everything is verified or measured unless marked.

---

## 0. Corrections that change a W3 brief

| # | Plan says | Reality | Consequence |
|---|---|---|---|
| **W3-C1** | U4.1's `GlassBottomSheet` contract names the prop **`closeAccessibilityLabel`**, and plan §5/U4.2/matrix A82's header text agree; A82's body and U5.3's row say `closeLabel` | **Both names exist on the phone, on different components.** `GlassBottomSheet.tsx:106` declares **`closeLabel?: string`**, optional, defaulting to `'Close'` (`:157`) — it labels the **dismiss scrim**. `ModalHeader.tsx:38` declares **`closeAccessibilityLabel: string`**, **required** — it labels the **✕ button**. `grep -rn closeAccessibilityLabel src/ app/` returns ModalHeader and its six callers only. | **The sheet seam must be `closeLabel`; the modal-header seam must be `closeAccessibilityLabel`.** U4.2 is right; U4.1's contract is wrong. **This also refutes my own `partner-legwork-w2.md` §3.1 recommendation** ("pick `closeAccessibilityLabel`, fix A82's prose") — I had it inverted, and A82/U5.3 were phone-faithful all along. `MapFiltersSheet.tsx:106` ships `closeLabel="Close map filters"`. |
| **W3-C2** | §4.7: *"No `.env.local` exists"*; §6.3: *"copy `.env.local` from the main checkout if one exists (**there is none** — map/AI degrade by design)"*; §4.6: for U5's captures, *"read it read-only from the phone repo's `.env`"* | **`.env.local` exists in the main checkout right now** and carries `OLLAMA_API_KEY`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `OLLAMA_TIMEOUT_MS` and a live **`NEXT_PUBLIC_MAPBOX_TOKEN=pk.…`** (measured by key-name grep; the value was not read or printed). | **All three plan statements are stale.** U5's Playwright captures do not need to mine the phone repo's `.env` at all, and §6.3's worktree step should now say *copy it*. The AI import path will also take the live route rather than the deterministic sample — **U7's import captures change behaviour**, which is a verification finding, not a styling one. |
| **W3-C3** | U5.2: *"the stale `paddingTop: 28` (Mapbox scale-bar clearance) is gone"* | **That is the PHONE's history, not the demo's.** `MapControls.tsx:244-248` on the phone records *"A previous 28pt paddingTop cleared the native Mapbox scale-bar ornament … the clearance was stale."* The demo's container has **no `paddingTop` at all** — it is `top: 92`, `padding: '0 10px'`, `gap: 6`, `zIndex: 15` (`MapControls.tsx:55-66`). | U5.2's implementer will hunt a literal that does not exist. Re-word to *"the demo's `top: 92` absolute container becomes the phone's `paddingHorizontal 12 / paddingTop spacing.sm / gap spacing.sm` inner row."* |
| **W3-C4** | U5.2 cites `MapScreen.tsx:90-103` for "delete the Change Case pill" | The pill is **two** places: the style const `changeCasePill` at **`MapScreen.tsx:90`** *and* the JSX that renders it at **`:367-369`**. | The cite covers only the const. Both must go, or the build breaks on an unused const / a dangling render. |
| **W3-C5** | D17: *"port only (i) `PermissionsView`'s `#007AFF` → `primaryDark` … the demo's equivalent is any invented system blue in the permission stage"* | **`#007AFF` does not exist anywhere in `features/demo/`** (measured, case-insensitive, whole feature tree → zero hits). | **D17 item (i) is a no-op for the demo.** U7.2's row should say so explicitly, or a reviewer will file "the system blue was not ported". Only item (ii) — the `CameraControls` scrim → `overlay` 90% — is real work. |
| **W3-C6** | A91/D17: *"tokenise the **four** black-scrim alphas into one named block"* | **Six distinct black alphas** in the camera subtree (measured): `MediaCaptureScreen.tsx:115` `rgba(0,0,0,0.4)`, `:132` a `rgba(0,0,0,0.88)` gradient stop, `:147` `rgba(0,0,0,0.5)`, `:481` `rgba(0,0,0,0.6)`; `OcrCaptureScreen.tsx:111` `rgba(0,0,0,0.6)`, `:537` `rgba(0,0,0,0.9)`, `:595` `rgba(0,0,0,0.88)`. | The named block has **six** members, not four, and one of them is a gradient stop rather than a flat fill. Size U7.2 accordingly. |
| **W3-C7** | U1.2 closed A43's card-radius sweep (three sites) | **Two more card surfaces still paint radius 16**, and U1.2 could not have caught them because they are *spread* overrides, not literals in a card const: `AudioRecorderScreen.tsx:159` and `:205`, both `{ ...glassCard, …, borderRadius: 16, overflow: 'hidden' }`. | These are **U7.2's** (its row already says *"`TimerCard`'s hand-rolled glass → the card recipe at radius `lg` 12 (was `xl` 16)"*) — but the work is now *deleting an override*, not re-rolling glass, because U1.2 already put `glassCard` under them. Smaller diff than the row implies. |
| **W3-C8** | U5.1 re-points `mapTokens.ts`; the matrix treats the map as partly swept | **`mapTokens.ts` is byte-untouched by U0 and U1** — no `palette` import, `MAP_GLASS_COLORS.containerBg` still `rgba(13, 27, 42, 0.65)`, `inputBg` still present, `SHEET_COLORS.text` still `#e7eef6`, `primaryLight: '#4BA3D4'` still a bare literal owner (`:58`). | **The whole `screens/map/` subtree is the single largest surviving pre-campaign island.** That is where D18's accepted mixed-palette `/demo` is concentrated, and it means U5.1 inherits exactly the state `partner-legwork-u0.md` described — nothing was pre-empted. |
| **W3-C9** | U7.1 creates `ui/screens/import/terminal-palette.ts` | `glass-tokens.test.ts` now carries **two** allow-lists: `TOKEN_MODULES` (`:47-52`, four entries) and **`SCHEME_DECLARERS`** (`:62-65`, two entries, deliberately different — its docblock at `:57-61` records review r1 F18: exempting `glass-tokens.ts` from the scheme scan would have left half the live exposure uncovered). | U7.1 must append `screens/import/terminal-palette.ts` to **`TOKEN_MODULES` only**. Adding it to `SCHEME_DECLARERS` would be wrong — the terminal palette is always-dark and declares no scheme half. |
| **W3-C10** | U5.3's chip dots take `STATUS_SEVERITY` | The phone's rule is **two-state** (`MapFiltersSheet.tsx:139`): `const dotColor = isActive ? colors[`${severity}OnLight`] : colors[STATUS_ACCENT[status]]`. | U5.3's row states only half of it. An implementer painting every dot from `STATUS_ACCENT` loses the active/inactive distinction the chip depends on. |

---

## 1. U5 — map chrome

### 1.1 What the demo already carries vs misses (verified at `d91ab76`)

`screens/map/` is 18 files / 3,401 lines. Against PR #127:

| Phone #127 change | Demo state | Verdict |
|---|---|---|
| `MapControls` collapsed to **one row** (`MapControls.tsx`, 357 lines on the phone) | **Three wrapping rows of pills**, 286 lines: status toggles + count pill (`:181-202`), search pill + Clear (`:212-229`), proximity toggle + four radius presets (`:245-269`) | **MISSES** — full rewrite, as A81 says |
| `MapFiltersSheet.tsx` (**NEW**, 291 lines) | **Nothing.** No file, no host state | **MISSES** — the one genuinely new surface |
| The "Change Case" pill retired into the search bar's `[← close]` | Still present: const `MapScreen.tsx:90`, render `:367-369` | **MISSES** (deletion) |
| Filter-count badge on the filters button | No badge anywhere; the count lives in a `map-location-count` pill (`MapControls.tsx:202`) | **MISSES** |
| `GlassBottomSheet` as the shared sheet | `MapBottomSheet.tsx` is a bespoke 162-line sheet with its own `SHEET_HEIGHTS`/`DRAG_THRESHOLD` | **MISSES** (U4.1 is the prerequisite) |
| Map view fully theme-aware (D3(a) superseded by `1740f226`) | Dark-only by construction (`mapTokens.ts:41`) | **N/A** — D2 makes this inert |
| `PIN_COLORS` re-derived but theme-invariant | `MAP_PIN_COLORS` `:26-31` unchanged, test-pinned | **ALREADY CORRECT** — do not touch |
| `LocationList`'s export CTA loses its `map-outline` icon (P1 D-4) | Not re-verified this pass | open |
| Selection: uniform four-sided border, **no** 4px accent (`7df5148b` reverses D1(a)) | `CaseMapPicker.tsx` still carries the `borderLeft: '4px solid accent'` idiom; `accent = '#4ba3d4'` at `:29` | **MISSES** — U5.4's D4 half |

Everything the demo has that the phone deleted is a **deletion** row, and the plan's B-tier "pill-chrome
deletion (MISSING as a deletion)" is the right classification: the count pill, Clear-(N), the proximity
toggle and the four radius presets all move into the sheet, so U5.2 deletes ~9 controls and U5.3 rebuilds
them. **U5.2's PR body must state the deleted-test count** — every `data-testid` in the list above
(`status-toggle-*`, `map-location-count`, `clear-filters-button`, `proximity-toggle-button`,
`radius-preset-*`) has assertions behind it.

### 1.2 `mapTokens.ts` state (W3-C8) — nothing was pre-empted

Verified at `d91ab76`, 152 lines, **identical to `master`**: no `palette` import; `MAP_GLASS_COLORS`
`:44-61` with `containerBg 'rgba(13, 27, 42, 0.65)'` `:45`, `inputBg 'rgba(19, 34, 54, 0.55)'` `:46`,
`primaryLight '#4BA3D4'` `:58`; `MAP_SURFACE_COLORS.overlayMedium 'rgba(13, 27, 42, 0.85)'` `:136`;
`SHEET_COLORS` `:140-152` still `background 'rgb(10, 22, 36)'`, `text '#e7eef6'`, `textDim '#9fb6d0'`,
`accent '#1a8fc2'`. So U5.1's re-base list from the plan is accurate line-for-line, and
`partner-legwork-u0.md` §7-8's `primaryLight` single-owner recommendation is still un-actioned and still
lands in U5.1.

### 1.3 The badge colour — the phone really does ship 3.73

Verified: `MapControls.tsx:101` `const primaryAccent = isDark ? Colors.dark.primary : Colors.light.primary`;
`:181` `style={[styles.badge, { backgroundColor: primaryAccent }]}`; `:328` `badgeText.color = Colors.dark.onPrimary`.
So the phone paints `#ffffff` on `#2B8CC1` under a **numeral** — 3.73:1. **D5's amendment (take
`primaryDark` `#1F6B99`, 5.80) is a deliberate, documented divergence from the phone**, not a
transcription. U5.2's PR body should say that in those words, because a reviewer diffing against the
phone will otherwise read it as drift.

### 1.4 What a verification pass CAN see

- `MapCanvas.tsx:617` renders `<div data-map-fallback style={fallbackStyle}>`. **`data-map-fallback` is a
  bare attribute, not a `data-testid`** — Playwright must select `[data-map-fallback]`, which is exactly
  what the plan writes. It is reachable with **no** Mapbox token.
- **With the token (which now exists — W3-C2), the real map renders**, so clustering, the proximity ring
  and long-press *are* observable and `04-map.js` / `09-p56-map-depth.js` can drive them. The plan's
  fallback-only contingency is no longer the expected path.
- Drivers present in `docs/planning/demo-phone-ui-parity/verification/`: `01-10`, `12-15` (**no `11`**),
  plus `lib.js`, `flows.js`, `probe.js`, `README.md`, four `*-side-by-side-findings.md`, and the
  macOS-only shell/Swift tools.

---

## 2. U6 — wizard, settings, export

### 2.1 The six D19 Banner hand-backs — all six located, all six owned

| Site | Line at `d91ab76` | Current recipe | Owner per plan |
|---|---|---|---|
| `TimeOffsetScreen.tsx` | **`:133`** | `1px dashed ${WARNING}` advisory | **U6.4b** |
| `NewCaseModal.tsx` | **`:205-206`** | `role="alert"`, `GLASS.borderError` + `rgba(255,71,87,0.08)` | **U6.4a** |
| `AudioRecorderScreen.tsx` | **`:252`** (status) and **`:258`** (alert) — **two**, not one | two notices | **U7.2** |
| `CompletionScreen.tsx` | **`:93`** | `role="alert"`, `GLASS.borderError` | **U6.4b** |
| `OcrCaptureScreen.tsx` | **`:390`** | `role="alert"`, assumed-date warning | **U7.3** |
| `_pane-chrome.tsx` | `PaneNote` **`:82-98`**, `NOTE_TONE` **`:69`** | tone-driven note | **U6.2** |

**One addition:** `AudioPreviewScreen.tsx:207` (status) and `:213` (alert) carry the same pair, and the
plan's U7.2 row names `AudioPreviewScreen` only for its overlay header. **U7.2 owns four notices, not
two** — worth stating in its brief so it does not leave a matched pair half-converted.

### 2.2 `CompletionScreen` — the `SEAM(U6.4b)` half is landed and self-documenting

`CompletionScreen.tsx:102-105` at `d91ab76` carries U1.3's comment verbatim: *"SEAM(U6.4b): the `techGlow`
boxShadow on this line is M1(a)'s to REMOVE and is deliberately untouched here — one line, two packages.
U1.3 lands first; do not revert the gradient when the glow goes."* The gradient is now
`GLASS.gradientPanel` (`:105`) and the glow `boxShadow: '0 0 22px rgba(43,140,193,0.12)'` is still on the
same line. **The one-line/two-package hazard is handled in-tree; U6.4b just deletes the shadow.**

### 2.3 `_pane-chrome.tsx` — what is left for U6.2 after U2.4 and U3.2

327 lines at `d91ab76` (unchanged by W1). Three packages, three regions:
- **U3.2** takes `NOTE_TONE` `:69-73` (+ its consumer at `:98`).
- **U2.4** takes `radioOption` `:164` and `PaneRadioGroup` `:183`.
- **U6.2 keeps everything else**: `PaneNote` `:82-98` (the Banner adoption handed back by D19),
  `PaneStubNote` `:132` (demo-only, D12-frozen), `PaneGroup`, `PaneSlider`, `PaneSelect`, and the
  palette-sourcing sweep the row describes. **No region overlaps another** — the three-way collision
  §6.1 flags is real but textually separable, exactly as `partner-legwork-w2.md` §2.5 measured.

Settings, other files: `SettingsCategoryList.tsx` 164 lines — `sectionLabel` `:24`, `rowBase` `:33`,
**`SEPARATOR_INSET = 64` `:48`** (A78's derived arithmetic), consumer `:159`. `SettingsNavBar.tsx` 116
lines — the hand-balanced **`width: 92` at `:113`** (A82/B.7 row 82's magic number; retune it if the back
label's type size moves).

### 2.4 Export surfaces after U1.3 / U4.2 / U4.3

`ExportHub.tsx` — `ARTIFACT_COLOR` `:98` untouched; the armed-case echo row D16 deletes is still present
(its props docblock at `:37` and `:46-47` documents the footer gate). `ExportCaseCard.tsx` inherits
U1's `radius.lg`, `colors.link` lit border, `LIT_GLOW` const and `GLASS.shadowCard` (see
`partner-legwork-w2.md` R3) — **U6.3's row still says "lit border + `boxShadow rgba(53,160,214,0.35)` move
with A50", which is now DONE**; re-word it or U6.3 re-does W1's work.

---

## 3. U7 — import, OCR, audio, media

### 3.1 The terminal palette (U7.1)

Four parallel palettes confirmed at `d91ab76`: `ImportTerminalProgress.tsx` `TERM_CHROME` **`:180`** and
`C` **`:192`**; `TerminalLine.tsx` `LEVEL_ACCENT` **`:39`** and `TERM_ROW` **`:53`**. `TERM_CHROME` is
consumed at `:231-232`, `:244-245`, `:597`; `TERM_ROW` at `:78`, `:102-103`, `:111`, `:124`;
`LEVEL_ACCENT` at `:144`. There is **no `TERMINAL_FONT_SIZE` const** — the four sizes are loose literals,
which is what A86 says. `screens/import/terminal-palette.ts` **does not exist**; U7.1 creates it and
appends it to `TOKEN_MODULES` only (W3-C9).

### 3.2 `MediaLibrarySheet`'s `ElevatedEdges` copy

Verified: `MediaLibrarySheet.tsx:723-724` — `borderTopColor: 'rgba(255,255,255,0.14)'` /
`borderBottomColor: 'rgba(0,0,0,0.3)'`, **byte-identical to the phone's `ElevatedEdges.dark`**
(`Colors.ts:489`). A51's claim holds exactly. U2.2 creates the token; **U7.2 imports it** — and because
these are two *longhand* border colours, the §4.3 shorthand-after-longhand rule applies: whatever spreads
them must not set `border:` afterwards.

### 3.3 Camera chrome under D17

- `#007AFF`: **absent from the whole demo** (W3-C5) — item (i) is a no-op.
- iOS system red `#FF3B30` survives at `MediaCaptureScreen.tsx:491` (recording dot) — **D17 freezes it**;
  do not converge it on `colors.error`.
- Black scrims: **six alphas** (W3-C6), across `MediaCaptureScreen.tsx:115,132,147,481` and
  `OcrCaptureScreen.tsx:111,537,595`.
- The only real value change is the `CameraControls`-equivalent scrim → `overlay` at 90%.

### 3.4 What U7's verification can and cannot see

- **`mky4m.swift` is present; there is no `dvrclock.y4m`** (measured — `find … -name '*.y4m'` → empty).
  `mky4m.swift` is macOS-only, so **the live-OCR capture cannot run on this box**. The sample path is the
  tested contract (`vitest.setup.ts` leaves `navigator.mediaDevices` undefined on purpose), so U7's OCR
  evidence is the sample flow plus the confirm-stage surfaces. Say so in the PR body rather than leaving
  a silent gap.
- **The AI import path now has a live key** (W3-C2): `03-import.js` / `05-import-p1.js` will exercise the
  real `/api/extract` proxy rather than the deterministic `seed.ts` fallback. That is a behaviour change
  in the harness, not in the product — **pin the captures to the sample path, or the "before" and "after"
  shots differ for a non-styling reason.**

---

## 4. Cross-phase contention for W3

**U5 ∥ U6 is genuinely independent** — I re-checked every file in both package lists at `d91ab76` and
found **no shared file**. U5 is entirely `screens/map/*` plus `MapScreen`; U6 is `_shared`, `settings/*`,
`export/*`, and the wizard screens. The plan's claim holds.

**U7 shares with U6 and with W2:**

| File | Packages | Note |
|---|---|---|
| `screens/AudioRecorderScreen.tsx` | **U2.2** (`sampleButton` `:508`), **U7.2** (whole file: header, `TimerCard` `:159`, waveform `:205`, notices `:252`/`:258`) | U2.2 → U7.2, cross-phase; §6.1 does not list it |
| `screens/OcrCaptureScreen.tsx` | **U2.2** (`panelButton` `:125`), **U7.3** (whole file) | same shape, also unlisted |
| `screens/MediaLibrarySheet.tsx` | **U4.4** (`MEDIA_CLOSE_CHIP`), **U7.2** (whole file) | §6.1 **does** list this one — serialise U4.4 → U7.2 |
| `screens/export/ExportCaseCard.tsx` | **U2.4**, **U3.4**, **U6.3** | three packages, three phases; §6.1 lists only the U2/U3 pair |
| `screens/settings/panes/_pane-chrome.tsx` | **U2.4**, **U3.2**, **U6.2** | §6.1 lists it correctly |
| `screens/_shared.tsx` | **U2.1**, **U2.3**, **U4.2**, **U4.3**, **U6.1** | five packages; §6.1 lists it and says "coordinate at the orchestrator, not by rebasing" |

**Two additions to §6.1 (inferred):** `AudioRecorderScreen.tsx` and `OcrCaptureScreen.tsx`, both
U2.2 → U7.x across a phase boundary. Both are "U2.2 edits one const, U7.x rewrites the file", so
**merge order U2 before U7 is sufficient** — but it must be written down, because W2 and W3 are separate
waves and nothing else enforces it.

### 4.1 What the W2 seams change about W3's rows

| Seam | Effect on W3 |
|---|---|
| `fieldInputStyle()` (U2.1) | U6.4a's `NewCaseModal`/`NewLocationModal`/`EditIncidentLocationModal` rows become *"call the seam"* instead of *"adopt A72"* — their `coordInput` copies are U2.1's to delete, not U6's |
| Button variants (U2.2) | U5.3's footer (`outline` Clear All + `primary` Done), U5.4's three map CTAs dropping to medium, U6.1's `AddRowButton`, U7.2's pill button all consume it. **U5.3 cannot start before U2.2** — its row lists U2.2 as a dep; U5.4's does not and should |
| `Toggle` + `hideLabel` (U2.3) | U5.3's "Filter by radius" row is a `Toggle` consumer — the row says so; U6.2's panes already consume `Toggle` |
| `GlassBottomSheet` (U4.1) | U5.3 mounts it; U7.2 folds `MediaLibrarySheet` onto it. **Both are hard deps and both cross a wave boundary** |
| `CentredDialog` (U4.3) | No W3 consumer — U7's surfaces use `AlertDialog`, which U4.3 rewrites internally. Nothing for W3 to do |
| `Banner` (U3.3) | Six W3 adoptions (§2.1) plus `AudioPreviewScreen`'s pair — **eight**, not six |
| `EmptyState` (U3.4) | U7.2's `MediaLibrarySheet` empty state is inside U3.4's A80 sweep; the sweep opens the file for that block only, then U7.2 opens it for everything else. Serialise U3.4 → U7.2 |
| `STATUS_SEVERITY` / `STATUS_ACCENT` (U3.2) | U5.3's chips and U5.4's dots consume both; W3-C10's two-state dot rule is the contract |

---

## 5. Open items for the orchestrator

1. **Settle the two close-label prop names** (W3-C1) — `closeLabel` for the sheet, `closeAccessibilityLabel` for the modal header. Fix plan §5/U4.1, and strike my own inverted recommendation in `partner-legwork-w2.md` §3.1.
2. **Update the three stale `.env.local` statements** (W3-C2) and decide whether U7's import captures pin the sample path.
3. **Re-word U5.2's `paddingTop: 28` clause** (W3-C3) and extend its `MapScreen` cite to `:367-369` (W3-C4).
4. **D17 item (i) is a no-op; the scrim block has six members** (W3-C5, C6) — re-size U7.2.
5. **Two more radius-16 card sites survive into U7.2** (W3-C7).
6. **U7.1 appends to `TOKEN_MODULES` only, never `SCHEME_DECLARERS`** (W3-C9).
7. **U5.3's dot rule is two-state** (W3-C10).
8. **Add `AudioRecorderScreen.tsx` and `OcrCaptureScreen.tsx` to §6.1** (§4), and give U5.4 an explicit U2.2 dependency.
9. **U7.2 owns four notices, not two** (§2.1) and **U6.3's lit-border row is already done by W1** (§2.4).

---

# § re-verified on `7bcb553` (W2 assembled)

**Base moved:** `feat/uiparity-w1` `d91ab76` → **`feat/uiparity-w2` `7bcb553`** ("Merge feat/uiparity-u4
into feat/uiparity-w2 — wave 2 assembly, step 3 of 3 (§6.2 order)"). Read by
`git archive 7bcb553 features/demo | tar -x` into session scratch; no seat worktree touched.
All **verified** at `7bcb553` unless marked.

## S1. The nine new W2 seams W3 composes with

| Module | Lines | The exports W3 needs |
|---|---|---|
| `controls/GlassBottomSheet.tsx` | 412 | `GlassBottomSheet` `:210`, `GlassBottomSheetProps` `:115`, `PICKER_SHEET_Z` `:41`, `shouldDismissSheet` `:85`, `DISMISS_DISTANCE_RATIO` `:51`, `DISMISS_VELOCITY` `:53` |
| `controls/sheet-chrome.ts` | 276 | `sheetSurface` `:108`, `sheetScrim` `:135`, `sheetHandle` `:163`, `sheetHeaderBand` `:182`, `sheetTitle` `:222`, `sheetSubtitle` `:238`, `sheetAccentDot` `:208`, `sheetAccentStrip` `:257`, `sheetBody` `:270`, `sheetBodyFill` `:273`, `sheetFooter` `:276`, `SHEET_SHADOW` `:74`, `SHEET_ENTER_MS`/`SHEET_EXIT_MS` `:81-82` |
| `controls/CentredDialog.tsx` | 327 | `CentredDialog` `:240`, `dialogSurface` `:76`, `dialogScrim` `:108`, `DIALOG_SHADOW` `:60`, `trackDialogActivationOrigin` `:163` |
| `controls/Banner.tsx` | 198 | `Banner` `:146`, `BannerSeverity` `:68`, `BannerProps` `:103` |
| `controls/EmptyState.tsx` | 86 | `EmptyState` `:79`, `EmptyStateProps` `:49` |
| `controls/button-recipe.ts` | 260 | `buttonStyle` `:221`, `ButtonVariant` `:116`, `ButtonSize` `:118`, **`SAMPLE_TINT` `:113`**, `PrimaryButtonGradient` `:69`, **`ElevatedEdges` `:83`**, `DangerFill` `:99` |
| `controls/choice-controls.tsx` | 195 | `RadioOption` `:78`, `CheckboxBox` `:171`, `CheckboxChecked` `:140` |
| `tokens/status.ts` | 189 | `STATUS_SEVERITY` `:54`, `STATUS_ACCENT` `:89`, `severityTone` `:118`, `statusBadgeStyle` `:172`, `neutralTone` `:136`, `SEVERITIES` `:45` |
| `tokens/field-input.ts` | 80 | `fieldInputStyle` `:65`, `FieldInputState` `:56` |

**`GlassBottomSheet`'s close prop is `closeLabel`** (props block `:115-209`, docblock quoting phone
`:105`) — W3-C1 was acted on correctly, and the sheet/modal-header split is now live in-tree:
`MediaLibrarySheet.tsx` passes **`closeAccessibilityLabel="Close media library"`** to `ModalShell`.

## S2. W3 rows already done, or changed in kind, by W2

| Row | Status at `7bcb553` | What W3 should now do |
|---|---|---|
| **U6.3** — *"`ARTIFACT_COLOR` → the status seam (A69)"* | **REFUTED IN-TREE.** `ExportHub.tsx:103` docblock: *"**NOT a `STATUS_SEVERITY` consumer, and not a badge.** The phone spells these as three direct tokens."* The map survives at `:112`, consumed `:215`. | Strike the row, or re-word it to "leave `ARTIFACT_COLOR` as three direct tokens and record why". |
| **U6.2** — `NOTE_TONE` → `Banner` (D19 hand-back) | **HALF DONE, deliberately.** `_pane-chrome.tsx` (321L) adopted **`RadioOption`** (`:6`, `:216`) for U2.4, and `PaneNote` `:89` took Banner's severity **tone pairs** but **not the component**: `:74-79` records that adopting `<Banner>` would move padding 13→12 and radius 10→8, i.e. geometry, so it was declined and documented. | U6.2's Banner half is a *ruling to ratify*, not work to do. Its remaining scope is `PaneGroup` `:44`, `PaneSelect` `:241`, `PaneSlider` `:277`, `PaneStubNote` `:145`, `PaneDescription` `:25` and the row/card geometry (A78/A79). |
| **U7.2** — `MEDIA_CLOSE_CHIP` splits out at `rgba(0,40,83,0.9)` | **DONE by U4.4.** `MediaLibrarySheet.tsx` now **exports** `MEDIA_CLOSE_CHIP = 'rgba(0, 40, 83, 0.9)'` with a long anti-resync docblock (records the 3.95:1 measurement on a daylight still that motivated it) and paints the chip with `colors.text`. | Delete the row's chip half; U7.2 inherits it. |
| **U7.2** — recorder engine tones (A69's engine owner) | **DONE by U3.2.** `engine/logic/media` now exports `recorderStatusTone`/`levelFillBand` (tones and bands, not colours); `AudioRecorderScreen.tsx` holds `STATUS_TONE_COLOR` and `LEVEL_BAND_COLOR`, and **D-1's `#5a7a9a` → `colors.textSecondary` landed** with the reason in-file. | U7.2 no longer touches the engine. Its `:169,:172` pin-move is spent. |
| **U7.2 / U7.3** — the six A66 outline sites | **The tinted-fill pair is done, and my own W2 census was short.** U2.2 converted `OcrCaptureScreen`'s `panelButton`, `AudioRecorderScreen`'s `sampleButton` **and a third inline site** (`OcrCaptureScreen`'s sample picker) to `buttonStyle({ variant: 'outline' }) + SAMPLE_TINT`. Its docblock refutes A66 at source: *"matrix A66 counted it as one and it is not … neither that wash nor `#9fd4ee` returns a single hit anywhere in the phone's `src/` at `dd5551ec`."* | **Correction to `partner-legwork-w2.md` C3: three sites, not two.** W3 inherits the recipe; nothing left to convert. |
| **U7.2** — every button in `MediaCaptureScreen` / `OcrCaptureScreen` / `AudioPreviewScreen` | **DONE.** All now `buttonStyle(...)`; `glassBtnPrimary`/`glassBtnSecondary` are gone from those three files. | U7.2/U7.3 keep only the header, card, notice and palette halves. |
| **U5.4** — A57 "map rows are nested ROWS at radius 8" | **REFUTED IN-TREE by U3.4.** `map/LocationRow.tsx` comment: *"the phone's own `location/map-view/components/LocationRow.tsx:287` is `Layout.borderRadius.lg` = 12 at `dd5551ec`. A map sheet row is a nested CARD in D13(a)'s depth tier, not a nested row."* Left at 12, now `radius.lg`. | **U5.4 must not move it to 8.** Update A57's row. |
| **U5 (A46)** — `MapBottomSheet`'s shadow | **DONE by U4.1.** `MapBottomSheet.tsx` imports `SHEET_SHADOW`; the comment scopes the rest: *"The GROUND (`SHEET_COLORS.background`) and the radius stay U5.1's; only the shadow is U4.1's row."* | U5.1 keeps the ground + radius; the shadow is spent. |
| **U4.4 in map** | `CallConfirmSheet.tsx` scrim → `colors.scrim`, with a new test pinning it. | Nothing owed. |
| **U6.4a** — the modal `coordInput` copies | **DONE by U2.1.** `fieldInputStyle` has 8 consumers incl. `NewCaseModal`, `IncidentLocationFields`, `AddressAutocomplete`, `SubmissionScreen`. | U6.4a's A72 half is spent; only its residuals remain. |
| **U3.4 in map** | `screens/map/` has **no** `EmptyState` / `statusBadgeStyle` / `STATUS_ACCENT` consumer yet (measured). | Confirms W2-C7: `LocationList`/`MapScreen` carry no italic empty state; **U5.3/U5.4 will be `map/`'s first `STATUS_ACCENT` consumers.** |

## S3. First-package facts

**U5.1 — the map island is intact.** `screens/map/mapTokens.ts` is **152 lines with zero `palette`
references** (measured) — byte-unchanged since before U0. Every value `partner-legwork-w3.md` §1.2 listed
still reads exactly as quoted: `containerBg 'rgba(13, 27, 42, 0.65)'` `:45`, `inputBg` `:46`,
`primaryLight '#4BA3D4'` `:58`, `overlayMedium 'rgba(13, 27, 42, 0.85)'` `:136`, `SHEET_COLORS` `:140-152`
with `background 'rgb(10, 22, 36)'`, `text '#e7eef6'`, `accent '#1a8fc2'`. **W2 made exactly three
surgical edits inside `map/`** — the three in S2 above — and touched no token. So U5.1's re-point list is
still accurate line-for-line, and `partner-legwork-u0.md`'s `primaryLight` single-owner recommendation is
still un-actioned and still lands here.

**U6.1 — the plan's first U6 package is `_shared` wizard chrome, and its row moved.** `_shared.tsx` grew
+290/−86 in W2 (`fieldInputStyle`, `Toggle`'s `hideLabel`, `ModalShell`'s required close label,
`GlassBottomSheet` composition). Its U6.1 targets survive but are no longer where the row says:
`Field` `:200`→**re-check**, `WizardNext`/`SectionCard`/`AddRowButton` all shifted by roughly +200.
**Do not paste U6.1's line numbers from the plan** — grep by export name. The row's `AddRowButton`
`#2a4a6f`/`#4BA3D4` half is likely already spent by U2.2's `buttonStyle` sweep; verify before briefing.

**U7.1 — unchanged and still owed.** `screens/import/` still holds exactly four files
(`ImportTerminalProgress.tsx` 666L, `TerminalLine.tsx` 178L, `PasteStage.tsx`, `PickerStage.tsx`);
**`terminal-palette.ts` does not exist.** The four parallel palettes are where W3 left them:
`TERM_CHROME` `ImportTerminalProgress.tsx:180`, `C` `:192`, `LEVEL_ACCENT` `TerminalLine.tsx:39`,
`TERM_ROW` `:53`. **`TOKEN_MODULES` is still the same four entries** (`glass-tokens.test.ts:47-52`) —
`glass-tokens.ts`, `tokens/palette.ts`, `tokens/glass-tiers.ts`, `tokens/scale.ts`. The walk now takes a
`skip` parameter (`:56-60`) defaulting to `TOKEN_MODULES`, with the scheme-half scan passing an **empty**
set. **U7.1 appends `screens/import/terminal-palette.ts` to `TOKEN_MODULES` and to nothing else** —
W3-C9 stands verbatim.

## S4. Shifted W3 cites (`d91ab76` → `7bcb553`)

**Unchanged:** `MapScreen.tsx:90` (`changeCasePill` const) and `:367` (its render) · `MapControls.tsx:55`
(`container`) · `SettingsCategoryList.tsx:48` (`SEPARATOR_INSET = 64`) · `SettingsNavBar.tsx:113`
(`width: 92`) · `ImportTerminalProgress.tsx:180`, `:192` · `TerminalLine.tsx:39`, `:53` ·
`mapTokens.ts` (all).

| Cite | `d91ab76` | **`7bcb553`** | Δ |
|---|---|---|---|
| `TimeOffsetScreen.tsx` dashed advisory | `:133` | **`:130`** | −3 |
| `NewCaseModal.tsx` submit-error banner | `:205` | **`:202`** | −3 |
| `CompletionScreen.tsx` error card | `:93` | **`:94`** | +1 |
| `CompletionScreen.tsx` `techGlow` (`SEAM(U6.4b)`) | `:105` | **`:106`** | +1 |
| `OcrCaptureScreen.tsx` assumed-date banner | `:390` | **`:396`** | +6 |
| `AudioRecorderScreen.tsx` notices | `:252` / `:258` | **`:281` / `:287`** | +29 |
| `AudioPreviewScreen.tsx` notices | `:207` / `:213` | **`:208` / `:214`** | +1 |
| `AudioRecorderScreen.tsx` radius-16 card sites | `:159` / `:205` | **`:188` / `:234`** | +29 |
| `MediaLibrarySheet.tsx` `ElevatedEdges` pair | `:723-724` | **`:750-751`** | +27 |
| `ExportHub.tsx` `ARTIFACT_COLOR` | `:98` | **`:112`** | +14 |
| `MediaCaptureScreen.tsx` black scrims | `:115,132,147,481` | **`:116,133,148,482`** | +1 |
| `OcrCaptureScreen.tsx` black scrims | `:111,537,595` | **`:112,543,601`** | +1 / +6 |
| `_pane-chrome.tsx` `PaneNote` | `:82` | **`:89`** | +7 |
| `_pane-chrome.tsx` `PaneStubNote` | `:132` | **`:145`** | +13 |

`_pane-chrome.tsx`'s `NOTE_TONE` and module-local `radioOption` are **gone** — replaced by Banner's tone
pairs inside `PaneNote` and by the shared `RadioOption`.

## S5. U5 ∥ U6 ∥ U7 disjointness — HOLDS at `7bcb553`

Measured: `grep -rln "screens/map/" screens/settings screens/export screens/import screens/_shared.tsx
screens/OcrCaptureScreen.tsx screens/AudioRecorderScreen.tsx screens/MediaLibrarySheet.tsx` returns
**nothing**. No U6 or U7 target imports from `screens/map/`, and no `map/` file imports a U6/U7 target.
The three lanes remain file-disjoint.

The W2-era cross-phase pairs `partner-legwork-w3.md` §4 flagged are now **spent, not pending**: U2.2 →
U7.2 on `AudioRecorderScreen.tsx` and U2.2 → U7.3 on `OcrCaptureScreen.tsx` both already landed in W2, so
W3 opens those files with W2's work already in them rather than racing it. `MediaLibrarySheet.tsx`'s
U4.4 → U7.2 serialisation likewise resolved in W2's favour.

## S6. What changed in the W3 corrections

- **W3-C1 CLOSED** — `closeLabel` on the sheet, `closeAccessibilityLabel` on `ModalShell`; both live.
- **W3-C7 partly spent** — the two radius-16 spread sites survive (now `:188`/`:234`) and are still U7.2's.
- **W3-C5, C6, C8, C9, C10 all stand.** `#007AFF` still absent; six black alphas still six (shifted +1/+6);
  `mapTokens.ts` still untouched; `TOKEN_MODULES` still four; `MapFiltersSheet` still absent.
- **W3-C2 unchanged and still unfixed in the plan** — `.env.local` still present with a live
  `NEXT_PUBLIC_MAPBOX_TOKEN`.
- **New:** `partner-legwork-w2.md` C3 undercounted the tinted-fill recipe (three sites, not two); U2.2
  found the third and refuted A66's classification at source. Recorded here rather than editing the W2
  report, per the append-only rule.
