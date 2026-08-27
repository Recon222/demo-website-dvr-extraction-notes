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
