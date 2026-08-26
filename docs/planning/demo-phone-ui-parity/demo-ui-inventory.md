# Demo UI Inventory — where every visual value lives today

**Effort:** Demo↔Phone UI Parity v2 · demo-side recon
**Repo:** `demo-website-dvr-extraction-notes` (Next.js 15 / React 19 web replica)
**Worktree:** `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\demo-ui-parity-planning`
**Branch / HEAD:** `docs/ui-parity-planning` @ `5cf88fe` — every `file:line` below is at this commit
**Scan root:** `features/demo/` (plus `app/demo/`, `app/css/style.css`, `.design-sync/`)
**Written:** 2026-08-26

## Purpose and how to use this

The demo reached full **screen/logic** parity with the phone between 2026-07-30 and 2026-08-01
(nine phases, 265 files, 3,475 tests). Since then the PHONE ran a UI-consistency campaign — tokens
unified, eight card families collapsed to one, teal purged, stale navy swept, the shared component
library cleaned, map chrome redesigned. **The demo has received none of it.**

A sibling agent is inventorying the phone-side delta. A matrix-writer will join the two. This
document is the **demo side of that join**: for every phone token, recipe, or surface that changed,
this tells the writer *exactly which demo file and lines carry the current value*, so the matrix can
be written **without re-reading the demo repo**.

Read order for a restyle planner:
- **§0** — what a restyle may NOT touch. Read first; it constrains everything else.
- **§1** — the token modules. The leverage tier: change these, many consumers follow.
- **§2** — the literal census. The sprawl tier: ~1,144 colour occurrences across 136 files, only a
  fraction of which route through a token.
- **§3** — per-component recipe map. The join table.
- **§4** — shared chrome, with consumer lists. The "mutate the recipe, not the consumer" tier.
- **§5** — the drift guard: **it is broken right now, and it is masking four real drifts.**
- **§6** — the tests a restyle will redden.
- **§7** — demo-only surfaces (matrix = N/A) and phone surfaces the v1 matrix ruled out.
- **§8** — the design-sync bundle's re-run obligations.

### Confidence per section

| § | Confidence | Basis |
|---|---|---|
| §0 | **High** | `features/demo/CLAUDE.md` read in full; corroborated by `vitest.config.mts`, `vitest.setup.ts`, `glass-tokens.test.ts`. |
| §1 | **High** | Every token module opened and transcribed line-by-line. |
| §2 | **High** | Machine census (script included, re-runnable, zero deps). Line numbers are generated, not typed. |
| §3 | **High** | Every listed component opened by a reader agent with `file:line` discipline. See the caveat below. |
| §4 | **High** | `_shared.tsx` fully enumerated; consumer lists produced by real `grep`, not inference. |
| §5 | **High** | Guard executed; phone repo read directly for the moved constants. |
| §6 | **High** | Machine grep over `features/demo/**/__tests__`. |
| §7 | **Med** | Demo-only list is High. The "matrix ruled OUT-OF-SCOPE" list is from the **v1** matrix, whose status column is now stale (see §7.3). |
| §8 | **High** | `config.json` parsed; `.gitignore` and `git ls-files` checked. |

> **§3 caveat.** The per-component blocks were produced by six parallel reader agents, each of which
> opened its assigned files and cited real line numbers. I verified the token modules, `_shared.tsx`,
> the census, and every §5/§6/§8 claim myself. Individual `file:line` ranges inside §3 are as-reported
> by the readers and were not independently re-opened; treat them as high-confidence anchors, not as
> byte-exact pins. Where a §3 claim contradicts §1/§2/§4, trust §1/§2/§4.

---

## §0 — Binding constraints on any restyle

Extracted from `features/demo/CLAUDE.md` (the feature-scoped contract, which explicitly overrides
most root-`CLAUDE.md` conventions), plus the v1 conventions the guard tests enforce.

### §0.1 The one architectural rule — the store bridge

`features/demo/ui/DemoExperience.tsx` is the **ONLY** component that touches the Zustand store.
Every screen, modal, control and chrome component below it is **purely presentational** — data in via
props, intent out via callbacks. They must never import `@/features/demo/engine/store/*` or
`useStore`.

**Restyle implication:** a restyle is a pure-props change everywhere below `DemoExperience`. If a
port needs new visual state (a theme flag, a density mode), it arrives as a **prop threaded from
`DemoExperience`** — never as a new store subscription in a screen. `DemoExperience` is 3,141 lines
and holds only **six** `style={{` blocks (see §3.0), so the bridge is not a styling surface.

### §0.2 Inline `CSSProperties`, not Tailwind

> "UI components style with `CSSProperties` objects lifted verbatim from the source prototype
> (`DVR Extraction Notes Tour.dc.html`). `ui/demo.css` holds only globals + keyframes. Do not
> Tailwind-ify these…" — `features/demo/CLAUDE.md`

`.design-sync/NOTES.md:51-54` corroborates: "the demo is inline-styled, NOT Tailwind (44 of 50 files
use `style={{`, 2 use `className`)". Today the census scans **136** source files under `ui/`.

**Restyle implication:** there is no CSS cascade to lean on. Every value is either (a) in a token
module (§1), (b) inline in a component (§2/§3), or (c) in `demo.css`'s keyframes/globals. A "change
one variable" restyle is only possible for values already in (a) — which is a minority (see §2.4).

### §0.3 The frame math is load-bearing

> "the 404 = 378 + 13×2 math and `box-sizing: border-box` (scoped to `[data-demo-root]`) are
> load-bearing." — `features/demo/CLAUDE.md`

Verified at source:
- `PhoneFrame.tsx:42` — outer frame `width: 404`
- `PhoneFrame.tsx:43` — `padding: 13`
- `PhoneFrame.tsx:55` — inner screen `width: 378` (378 + 13×2 = 404)
- `PhoneFrame.tsx:56` — inner screen `height: 786` (13 + 786 + 13 = 812)
- `usePhoneScale.ts:8` — default `frameHeight = 812, margin = 28`; `scale = min(1, (innerHeight - margin) / frameHeight)`
- `demo.css:14-17` — `[data-demo-root], [data-demo-root] * { box-sizing: border-box }`

**Do not change:** 404, 378, 786, 812, 13, or the `border-box` scope. Downstream, `MapBottomSheet`'s
detents `SHEET_HEIGHTS = [116, 340, 560]` (`MapBottomSheet.tsx:43`) are explicitly tuned to the
378×786 viewport, and `MapCanvas.toContainerPoint` (`MapCanvas.tsx:237-245`) does CSS-transform-aware
pixel math **because** `PhoneFrame` applies `transform: scale()`.

### §0.4 Do not restyle the lifted rules

> "`demo.css` — globals + keyframe library, **scoped under `[data-demo-root]`**. Imported once by
> `DemoExperience`. Lifted verbatim from the prototype; **do not restyle the lifted rules.**"

`demo.css` is 144 lines: the `border-box` shim, the Case-File page backdrop, the phone scrollbar
hide, and **17 keyframes**. See §1.4 for the full enumeration. A restyle that changes a keyframe's
motion changes behaviour the reduced-motion tests pin (§6).

### §0.5 Overlays must portal

> "Modals/drawers/sheets render through `PhoneOverlayPortal` (`ui/phone-overlay.tsx`) so they pin to
> the scaled phone viewport; rendering inline re-introduces the scroll-lift bug (a dev-only
> `console.warn` fires if the portal root is missing)."

The portal root is the div at `PhoneFrame.tsx:173` (`position:absolute, inset:0, zIndex:40,
pointerEvents:'none'`). Portal consumers: `ModalShell`, `AlertDialog`, `PdfPreview`, `WizardDrawer`,
`PickerSheet`, `ExportActionSheet`, `ExportModal`, `DeleteConfirmationModal`, `MediaLibrarySheet`,
`SettingsModal`.
**Exception, deliberate:** `ExitDialog` is `position: fixed, zIndex: 100` (`ExitDialog.tsx:47`) —
"Page-level overlay — NOT inside the phone" (`ExitDialog.tsx:21`). Do not "fix" it into the portal.

### §0.6 Determinism — no `Date.now()` / `Math.random()`

> "Use module-level monotonic counters for ids and React keys (`uiSeq` in `DemoExperience`;
> `seq`/`nextId` in the store)."

Time is read through the injectable `clock` seam (`ui/inputs/clock.ts`), and only on user action —
e.g. `DateField.handleOpen` (`DateField.tsx:45-52`) reads the clock **on open**, never at render;
`AboutPane.tsx:33` reads the copyright year once in a lazy `useState` initializer. A restyle must not
introduce a render-time clock read for, say, a relative timestamp.

### §0.7 `'use client'` everywhere under `ui/`; `engine/` stays framework-agnostic

Every file under `ui/` is client-only. `engine/` is plain TS with no React. **Status colours,
however, partly live in the engine** — `recorderStatusColor` / `levelFillColor`
(`engine/logic/media`, pinned by `engine/logic/media/__tests__/audio-levels.test.ts` with `#ffd93d`,
`#ff4757`, `#5a7a9a`). A colour restyle must therefore touch the engine in that one place, and the
80% engine coverage gate applies there.

### §0.8 Test conventions the restyle inherits

- **Vitest + jsdom + React Testing Library.** Config `vitest.config.mts`, setup `vitest.setup.ts`.
  Tests co-located in `__tests__/` dirs. `vitest.config.mts:32` — `include: ['**/*.{test,spec}.{ts,tsx}']`.
- **Coverage gate is logic-only.** `vitest.config.mts:37` — `include: ['lib/**/*.{ts,tsx}',
  'features/demo/engine/**/*.{ts,tsx}']` at 80% lines/functions/branches/statements. `features/demo/ui/**`
  is **not** counted — UI is validated behaviourally.
- **The injected-store seam.** Pass a store to `DemoExperience` via the `store` prop to drive
  component tests deterministically.
- **`vitest.setup.ts` contracts a restyle must respect:**
  - `:40-44` — `ResizeObserver` and `IntersectionObserver` are **no-op stubs**. Anything that
    measures (e.g. `CaseActionsSheet`'s `reportScrollGate`, `CaseActionsSheet.tsx:45-52`) sees zero
    callbacks in tests.
  - `:47-59` — `window.matchMedia` is stubbed. This is what makes `useReducedMotion` testable, and
    what `PickerStage`'s deliberate per-render `matchMedia` read (`PickerStage.tsx:98-99`) depends on.
  - `:70-71` — `Element.prototype.scrollIntoView` is a no-op stub (`ExploreChecklist`, terminal tail-scroll).
  - **`navigator.mediaDevices` is left `undefined` on purpose** so media tests take the sample path.
- **jsdom renders no CSS.** Every style assertion in §6 reads the **inline** `element.style`, so any
  value moved out of an inline object into a class or a CSS variable silently un-pins its test.

### §0.9 The two token guard tests (these are the enforcement teeth)

1. `features/demo/ui/__tests__/glass-tokens.test.ts` — **anti-re-drift**: ten exact literal strings
   (the card/diag/panel/accent gradients, the grid overlay, and the five border shorthands) are
   **banned** from appearing anywhere under `features/demo/ui/**` outside `glass-tokens.ts` itself.
   It also **shape-pins** the token values byte-for-byte, and (R-25/R-34) pins the `@theme` mirrors
   in `app/css/style.css` against `GLASS.accentFrom`/`accentTo`/error.
   **A restyle must edit this test in the same commit as the token change — it will otherwise fail
   twice: once on the changed value, once if the new literal appears in a consumer.**
2. `features/demo/ui/inputs/__tests__/rn-token-parity.test.ts` — the RN↔web drift guard. See §5.
   `it.skipIf(!rnAvailable())` — it **skips silently** when the sibling RN repo is absent.

### §0.10 Summary — the "may not change" list

| Frozen | Where | Why |
|---|---|---|
| 404 / 378 / 786 / 812 / 13 | `PhoneFrame.tsx:42,43,55,56`, `usePhoneScale.ts:8` | Prototype-lifted device geometry |
| `box-sizing: border-box` scope | `demo.css:14-17` | The pixel dimensions depend on it |
| `demo.css` lifted rules | `demo.css` (all 144 lines) | CLAUDE.md: "do not restyle the lifted rules" |
| The store-bridge boundary | `DemoExperience.tsx` only | The one architectural rule |
| Portal-or-fixed overlay placement | `phone-overlay.tsx` + `ExitDialog.tsx:47` | Scroll-lift bug regression |
| `SHEET_HEIGHTS = [116,340,560]` | `MapBottomSheet.tsx:43` | Tuned to the 786px viewport |
| `STRIP_TOP` / `STRIP_SIDE` | `OcrCaptureScreen.tsx:103-104` | Derived from the engine's real crop fractions — the box must show the actual crop |
| `LONG_PRESS_MS = 500` | `useLongPress.ts:80` | "THE one definition"; matches the phone's beat |
| `TAB_BAR_HEIGHT = 50` | `TabBar.tsx:10` | Single source; overlays sit flush above it |

---

## §1 — Styling architecture: where every visual value lives

There are **six** places a visual value can live in this codebase. In rough order of leverage:

| Tier | Module | Values | Importers |
|---|---|---|---|
| 1 | `ui/glass-tokens.ts` | 12 tokens + 3 spreadable fragments | ~40 files |
| 2 | `ui/inputs/input-theme.ts` (`T`) | 16 tokens | **7 files** (all in `inputs/`) |
| 3 | `ui/screens/map/mapTokens.ts` | 8 groups, ~40 values | 9 map files |
| 4 | `ui/screens/screenData.ts` | 2 status-theme maps | Cases / Dashboard / Export |
| 5 | `ui/demo.css` | 17 keyframes + 4 global rules | Imported once by `DemoExperience` |
| 6 | **Inline literals in 136 component files** | **1,144 colour occurrences, 278 distinct** | — |

Tier 6 is the problem. See §2.

### §1.1 `GLASS` — `features/demo/ui/glass-tokens.ts` (67 lines)

The P0.5 / matrix-G6 extraction. Its own docblock (`:6-10`): *"Before this module the same
gradient/border/radius literals were copy-pasted across ~25 files; they are extracted here so a
future restyle is a one-file change. This is DEDUPLICATION, not restyling."*

**Module constants:**

| Const | Value | Line |
|---|---|---|
| `ACCENT_FROM` | `#35A0D6` | `:23` |
| `ACCENT_TO` | `#2580AD` | `:24` |

**`GLASS` (`:26-44`):**

| Key | Value | Line |
|---|---|---|
| `accentFrom` | `#35A0D6` | `:28` |
| `accentTo` | `#2580AD` | `:29` |
| `gradientCard` | `linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))` | `:31` |
| `gradientCardDiag` | `linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))` | `:32` |
| `gradientPanel` | `linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))` | `:33` |
| `gradientAccent` | `linear-gradient(180deg,#35A0D6,#2580AD)` | `:34` |
| `gridOverlay` | `repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)` | `:36-37` |
| `border` | `1px solid #1e3a5f` | `:39` |
| `borderSoft` | `1px solid rgba(30,58,95,0.5)` | `:40` |
| `borderBtn` | `1px solid #2a4a6f` | `:41` |
| `borderAccent` | `1px solid rgba(43,140,193,0.3)` | `:42` |
| `borderError` | `1px solid rgba(255,71,87,0.3)` | `:43` |

**Spreadable fragments:**

| Fragment | Recipe | Line |
|---|---|---|
| `glassCard` | `borderRadius: 12` · `border: GLASS.borderSoft` · `background: GLASS.gradientCard` | `:47-51` |
| `glassBtnPrimary` | `borderRadius: 10` · `border: 'none'` · `background: GLASS.gradientAccent` · `color: '#fff'` | `:54-59` |
| `glassBtnSecondary` | `borderRadius: 10` · `border: GLASS.borderBtn` · `background: '#132236'` · `color: '#99badd'` | `:62-67` |

> **Note the shape.** `GLASS.*` string tokens are **full CSS values** — the border tokens include
> `1px solid`. This is why several call sites keep a bare hex: a shorthand token cannot slot into a
> `borderColor:` property or a ternary branch. Deferral §31 (`docs/code-reviews/deferred.md:657-684`)
> records exactly which call sites those are, and names **"any actual demo restyle"** as its
> un-defer trigger. **This port IS that trigger.**

**Importers of `glass-tokens` (~40 files).** Notable **non**-importers that hand-roll equivalents:
`SplashScreen.tsx` (zero shared tokens at all), `ImportTerminalProgress.tsx` + `TerminalLine.tsx`
(their own `TERM_CHROME`/`C`/`LEVEL_ACCENT`/`TERM_ROW` palettes), `PdfPreview.tsx` (its own neutral
PDF-viewer greys), `DateDisambiguationWarning.tsx`, `ImportResultBody.tsx`, `CallConfirmSheet.tsx`,
`DemoNotification.tsx`, `ExportLocationRow.tsx`, `SettingsGearButton.tsx`, `settings-icons.tsx`,
`TabBar.tsx`, `StoryRail.tsx`.

### §1.2 `T` — `features/demo/ui/inputs/input-theme.ts` (37 lines)

> "This object keeps the palette + key dimensions DRY across Dropdown, Calendar, DateField, TimeWheel,
> and TimeField." — `:6-10`

| Key | Value | Line | RN counterpart (per `.design-sync/NOTES.md:166-172`) |
|---|---|---|---|
| `bg` | `#0d1b2a` | `:14` | `Colors.dark.background` |
| `raised` | `#0f2035` | `:15` | — |
| `border` | `#1e3a5f` | `:16` | `Colors.dark.border` |
| `borderSoft` | `rgba(30,58,95,0.5)` | `:17` | `GlassColors.dark.card.border` |
| `text` | `#f0f4f8` | `:19` | `Colors.dark.text` |
| `textDim` | `#cdd9e6` | `:20` | — |
| `textMute` | `#99badd` | `:21` | `Colors.dark.textSecondary` |
| `textFaint` | `#7a9fc4` | `:22` | `Colors.dark.textTertiary` |
| `primary` | `#2B8CC1` | `:24` | `Colors.dark.primary` |
| `accentFrom` | `GLASS.accentFrom` (`#35A0D6`) | `:25` | `Button PRIMARY_GRADIENT.dark[0]` |
| `accentTo` | `GLASS.accentTo` (`#2580AD`) | `:26` | `Button PRIMARY_GRADIENT.dark[1]` |
| `primarySoft` | `rgba(43,140,193,0.08)` | `:27` | — |
| `primaryEdge` | `rgba(43,140,193,0.25)` | `:28` | — |
| `topHighlight` | `rgba(184,212,240,0.25)` | `:30` | — |
| `scrim` | `rgba(4,8,14,0.55)` | `:31` | — |
| `error` | `#ff4757` | `:33` | `Colors.dark.error` |
| `radius` | `12` | `:35` | — |
| `rowH` | `44` | `:36` | `Layout.touchTarget.min` |

**Importers of `T` — exactly 7, all inside `ui/inputs/`:** `PickerSheet.tsx`, `Dropdown.tsx`,
`DateField.tsx`, `TimeField.tsx`, `TimeWheel.tsx`, `Calendar.tsx`, `DateTimeField.tsx`.

> **This is the single most important fact in §1.** `T` names the demo's core palette and is imported
> by **7 of 136** files. The other **129 files hardcode the same hexes inline.** `.design-sync/NOTES.md:172`
> already flagged this at 15 screens; the census (§2) now measures it across the whole grown tree:
> `#f0f4f8` (= `T.text`) appears **100×** in **54 files**; `#2B8CC1` (= `T.primary`) **58×** in
> **35 files**; `#7a9fc4` (= `T.textFaint`) **110×** in **47 files**. Only one occurrence of each is
> the token definition.

Notably, `AddressAutocomplete.tsx` and `IncidentLocationFields.tsx` live **inside `inputs/`** yet do
**not** import `T` — they use `GLASS` plus their own copies of `fieldInput` (see §4.1).

### §1.3 Map tokens — `features/demo/ui/screens/map/mapTokens.ts` (152 lines)

The most disciplined module in the codebase: every value carries a phone-source citation, and the
map components are almost literal-free as a result.

| Group | Line | Values |
|---|---|---|
| `DEFAULT_MAP_CENTER` | `:19` | `[-79.65, 43.61]` (frozen) |
| `MAP_PIN_COLORS` | `:26-31` | `started #FF9500` · `working #00BFFF` · `complete #34C759` · `incident #e53935` |
| `STATUS_LABEL` | `:33-37` | `Started` / `Working` / `Complete` |
| `MAP_GLASS_COLORS` | `:44-61` | `containerBg rgba(13,27,42,0.65)` · `inputBg rgba(19,34,54,0.55)` · `border rgba(30,58,95,0.35)` · `shadow rgba(0,0,0,0.35)` · `text #f0f4f8` · `textSecondary #99badd` · `textTertiary #7a9fc4` · `primary #2B8CC1` · `primaryLight #4BA3D4` · `clearActiveBg rgba(43,140,193,0.20)` |
| `PROXIMITY_COLORS` | `:64-71` | `accent #00BFFF` · `fillLight rgba(0,191,255,0.15)` · `fillMedium rgba(0,191,255,0.2)` |
| `CLUSTER_COLORS` | `:78-83` | `circle rgba(13,27,42,0.65)` · `text #FFFFFF` · `halo rgba(0,0,0,0.5)` |
| `clusterRadiusFor` | `:93-97` | `>=50 → 28` · `>=10 → 22` · else `16` |
| `clusterFontSizeFor` | `:100-104` | `>=50 → 16` · `>=10 → 14` · else `12` |
| `PROXIMITY_PRESETS` / default | `:114-116` | `[0.5, 1, 2, 5]`, default `1` |
| `CAMERA_MARKER` | `:119-131` | `glyphSize 30` · `iconSize 18` · `glyphColor #111111` · `baseColor #ffffff` · `baseBorder rgba(13,27,42,0.55)` · `calloutBg rgba(13,27,42,0.95)` · `calloutBorder rgba(30,58,95,0.6)` · `calloutText #ffffff` · `calloutTextDim rgba(255,255,255,0.7)` |
| `MAP_SURFACE_COLORS` | `:134-137` | `overlayMedium rgba(13,27,42,0.85)` |
| `SHEET_COLORS` | `:140-152` | `background rgb(10,22,36)` · `border rgba(30,58,95,0.55)` · `handle rgba(255,255,255,0.20)` · `divider rgba(30,58,95,0.50)` · `rowBg rgba(19,34,54,0.78)` · `rowBorder rgba(30,58,95,0.45)` · `infoBg rgba(255,255,255,0.04)` · `text #e7eef6` · `textDim #9fb6d0` · `textFaint #7a9fc4` · `accent #1a8fc2` |

**Importers:** `MapScreen`, `MapCanvas`, `MapControls`, `MapBottomSheet`, `LocationList`,
`LocationDetailCard`, `LocationRow`, `SheetHandle`, `markerElements`, `buildMarkers`, `mapCluster`.
`mapTokens.ts:41` explicitly notes: *"Only the DARK variants exist here: the phone keeps light ones
because the app theme is switchable, while the demo's phone frame is always dark."*

**Note the split-brain:** `SHEET_COLORS.text` is `#e7eef6` while `MAP_GLASS_COLORS.text` is
`#f0f4f8`. Two "primary text" whites coexist inside one feature directory.

### §1.4 Status-colour maps — the fourth token tier

Status colours are **not** centralised. Four independent owners:

| Owner | Line | Values |
|---|---|---|
| `screens/screenData.ts` `caseStatusTheme` | `:17-26` | `complete #10d177` / `rgba(16,209,119,0.12)` / `rgba(16,209,119,0.3)`; `archived #7a9fc4` / `rgba(122,159,196,0.12)` / `rgba(122,159,196,0.3)`; `draft #ffd93d` / `rgba(255,217,61,0.12)` / `rgba(255,217,61,0.3)` |
| `screens/screenData.ts` `locationStatusTheme` | `:34-43` | `complete #34C759`; `working #00BFFF`; `started #FF9500` — **pinned by test to equal `MAP_PIN_COLORS`** ("don't retheme one without the other") |
| `screens/DvrInfoScreen.tsx` `STATUS` | `:20-26` | `SAFE #10d177`; `WARNING #ffd93d`; `CRITICAL`/`OVERWRITTEN` share `#ff7a85` / `rgba(255,71,87,0.14)` / `rgba(255,71,87,0.35)` — **local, not from `screenData`** |
| `screens/export/ExportHub.tsx` `ARTIFACT_COLOR` | `:98-102` | `full-case #10d177`; `single-location #99badd`; `subset #ffd93d` |
| `settings/panes/_pane-chrome.tsx` `NOTE_TONE` | `:68-72` | `info #4BA3D4` / `rgba(75,163,212,0.35)` / `rgba(75,163,212,0.10)`; `warning #ffd93d` / `.35` / `.09`; `success #10d177` / `.35` / `.09` |
| `inputs/CoordinateDisplay.tsx` `TONE_COLOR` | `:23-27` | `success #10d177`; `warning #ffd93d`; `error #ff4757` |
| `controls/WizardDrawer.tsx` `DOT` / `SAVE_STATUS_COLOR` | `:77-81`, `:89-94` | `complete #10d177` + glow; `partial #ffd93d` + glow; `saved/pending #5d7a9a`; `unavailable/failed #c9a227` |
| `engine/logic/media` `recorderStatusColor` / `levelFillColor` | (engine) | `#ffd93d`, `#ff4757`, `#5a7a9a`, `#2B8CC1` — pinned by `audio-levels.test.ts` |

**Two greens mean "done":** `#10d177` (cases, sync, import, drawer, notes, checklist) and `#34C759`
(locations, map pins). Plus `#30D158` in `SplashScreen.tsx:63` for "authorized". Three greens, three
owners.

### §1.5 Terminal / scanner palettes — the parallel token set

`ImportTerminalProgress.tsx` + `TerminalLine.tsx` carry a **complete, deliberately non-shared dark
palette**, on the stated grounds that the terminal must stay dark regardless of site theme.

| Module | Line | Values |
|---|---|---|
| `ImportTerminalProgress.tsx` `TERM_CHROME` | `:179-188` | title bar `#0a0f18`; panel `#060a12`; hairline `#141c28`; chrome dots `#242a31`; title text `#55606b`; trust line `#4a7c76`; live dot `#4ECDC4` |
| `ImportTerminalProgress.tsx` `C` | `:191-199` | `primary #2B8CC1` · `border #1e3a5f` · `text #f0f4f8` · `textMute #99badd` · `success #10d177` · `warning #ffd93d` · `error #ff4757` · `accentLight #4BA3D4` |
| `TerminalLine.tsx` `LEVEL_ACCENT` | `:39-50` | `INIT`/`PDF` `#99badd` · `FILE` `#e0a878` · `AI`/`CASE` `#4BA3D4` · `VERB` `#4ECDC4` · `NORM` `#ffd93d` · `OK`/`DONE` `#10d177` · `ERR` `#ff4757` |
| `TerminalLine.tsx` `TERM_ROW` | `:53-60` | `time #3a475a` · `body #c6d2df` · `error #ff4757` · `blockBg #080b11` · `blockBorder #1c2733` · `blockText #6f8296` |
| `NotesScreen.tsx` (forced-dark notes panel) | `:49-55` | `PANEL_BG #060a12` · `PANEL_BORDER #141c28` · `TEXT #dfe9f3` · `DIM #7a93ad` · `PRIMARY #4BA3D4` · `WARNING #ffd93d` |
| `SplashScreen.tsx` (HUD) | `:22,61-78,110,112` | `#2B8CC1` brackets/sweep/title; `#30D158` authorized; `rgba(48,209,88,0.7)`; `rgba(153,186,221,0.70)` disclosure |
| `chrome/PdfPreview.tsx` (neutral viewer chrome) | `:136,137,151` | `#11151c` · `#2a3340` · `#3a3f47` |

`C.*` and `TERM_ROW.*` largely **re-express values that already exist in `GLASS`/`T` under new
names**. This is the single largest consolidation opportunity — gated on the explicit
"must stay dark" requirement, which a themed restyle must resolve deliberately, not accidentally.

### §1.6 `demo.css` — `features/demo/ui/demo.css` (144 lines), scoped to `[data-demo-root]`

**Global rules (4):**

| Rule | Line | Content |
|---|---|---|
| Border-box shim | `:14-17` | `[data-demo-root], [data-demo-root] * { box-sizing: border-box }` |
| Case-File backdrop | `:29-39` | `--demo-glow-alpha: 0.16`; `--demo-glow-left: 444px`; `background-color: #04070d`; two 46px `repeating-linear-gradient`s at `rgba(153,186,221,0.035)` |
| Spotlight | `:40-50` | `::before`, `height: 260px`, `z-index: -1`, `radial-gradient(550px 260px at 50% 0%, rgba(43,140,193, var(--demo-glow-alpha)), transparent 70%)` |
| Scrollbar hide | `:53-61` | `[data-phone='frame'] *` — webkit width/height 0, `scrollbar-width: none` |
| Accordion marker | `:142-144` | `.demo-accordion > summary { list-style: none }`; `::-webkit-details-marker { display:none }`; `[open] .demo-accordion-chevron { transform: rotate(180deg) }` |

**Keyframes (17)** — the animation library every inline `animation:` string references:

| Keyframe | Line | Motion | Used by |
|---|---|---|---|
| `scanSweep` | `:63-66` | `translateY(-60px → 760px)` | `PhoneFrame.tsx:64-77` |
| `hudScan` | `:67-72` | `translateY(6 → 196px)` + fade | `SplashScreen.tsx:112` |
| `flicker` | `:73-79` | opacity flicker at 92-97% | `SplashScreen.tsx:96` |
| `blinkDot` | `:80-84` | opacity 0.15 → 1 → 0.15 | `AudioRecorderScreen`, `MediaCaptureScreen.tsx:494`, `SplashScreen` |
| `spin` | `:85-87` | `rotate(360deg)` | `ExportModal.tsx:163`, `SyncStatusCard.tsx:59`, `GpsCaptureControl`, `CameraGpsCapture`, `PickerStage.tsx:135`, `ImportTerminalProgress` |
| `glowPulse` | `:88-91` | opacity 0.35 ↔ 0.7 | — |
| `screenIn` | `:92-95` | fade + `translateY(8px)` | `ModalShell` (`_shared.tsx:131`), `AlertDialog.tsx:156`, `DeleteConfirmationModal.tsx:121`, `ExportModal.tsx:268`, `PdfPreview.tsx:136`, `SettingsModal.tsx:87` |
| `slideFwd` | `:96-99` | fade + `translateX(28px)` | `SettingsModal.tsx:161` |
| `slideBack` | `:100-103` | fade + `translateX(-28px)` | `SettingsModal.tsx:162`, `DashboardScreen.tsx:102` (staggered row entrance) |
| `railIn` | `:104-107` | fade + `translateY(7px)` | `StoryRail` |
| `fillFlash` | `:108-112` | background flash `rgba(43,140,193,0 → 0.22 → 0)` | — |
| `sheetUp` | `:115-118` | `translateY(100% → 0)` | `PickerSheet.tsx:74`, `ExportActionSheet.tsx:174` |
| `exportFooterRise` | `:123-126` | `translateY(12px → 0)` (mirrors phone `ExportHub.tsx:150-158`, 220ms) | `ExportHub.tsx:192` |
| `termCursorBlink` | `:131-134` | opacity step-end blink | `ImportTerminalProgress.tsx` cursor |
| `termFadeIn` | `:135-138` | opacity 0 → 1 (mirrors phone Reanimated `FadeIn.duration(350)`) | `ImportTerminalProgress` CTA morph |

**Fonts.** `demo.css:7-10` documents that Share Tech Mono + JetBrains Mono are **self-hosted via
`next/font` in `app/layout.tsx`**, which sets `--font-stmono` / `--font-jbmono` on `<body>`; `/demo`
inherits them. There is **no runtime Google-Fonts `@import`** — guarded by `ui/__tests__/fonts.test.ts`.
(`.design-sync/NOTES.md:66` and `:158` still describe the old `@import`; **those two NOTES lines are
stale.**)

Font variables wired at `app/layout.tsx:10,20,26,53,70`: `--font-inter`, `--font-stmono`,
`--font-jbmono`, `--font-nacelle`. Inline styles consume them with the family as fallback:
- Share Tech Mono — `"var(--font-stmono),'Share Tech Mono',monospace"` (BootSequence, SplashScreen,
  OcrCaptureScreen aim caption, ImportTerminalProgress, TerminalLine, StoryRail eyebrow, PasteStage-adjacent)
- JetBrains Mono — `"var(--font-jbmono),'JetBrains Mono',monospace"` (evidentiary values, notes panel,
  export artifact lines, PasteStage textarea, `_pane-chrome`'s stub eyebrow, `DemoErrorBoundary` detail)
- Nacelle — `StoryRail.tsx:78` heading only (marketing voice)

**Two mono families coexist and are not interchangeable** — `OcrCaptureScreen.tsx` uses both in one
file (`:109` jbmono for values, `:496` stmono for the AIM caption).

### §1.7 The `@theme` mirrors — `app/css/style.css`

`app/css/style.css:41-48` declares three Tailwind `@theme` tokens that **mirror** demo tokens for the
`/demo` route error page (`app/demo/error.tsx`, which styles with Tailwind and sits outside the
demo's guard-test scan root):

```
--color-demo-accent-from: #35a0d6;   /* = GLASS.accentFrom */
--color-demo-accent-to:   #2580ad;   /* = GLASS.accentTo   */
--color-demo-error:       #ff4757;   /* = the borderError red / T.error */
```

Consumed at `app/demo/error.tsx:29,37,45` (`border-demo-error/30`, `bg-demo-error/6`,
`from-demo-accent-from to-demo-accent-to`). `glass-tokens.test.ts` (R-25/R-34) pins these three
values against `GLASS`. **Restyle both together or the suite fails** — which is the intended
behaviour.

`app/css/style.css:84-85` also notes the Case-File ambient keyframes are **copied** from
`features/demo/ui/demo.css` (the demo and marketing never import each other — duplication by
convention).

### §1.8 Motion tokens — `features/demo/ui/motion.ts` (76 lines)

> "This module is the single source of truth for the transition values and DOUBLES as the port
> template for the React Native app." — `:6-11`

| Token | Value | Line |
|---|---|---|
| `DUR.screen` | `0.34` | `:50` |
| `DUR.drawer` | `0.3` | `:50` |
| `EASE_STANDARD` | `[0.32, 0.72, 0, 1]` (iOS decelerate) | `:52` |
| `DRAWER_W` | `300` | `:53` |
| `DRAWER_PUSH` | `-72` | `:55` |
| `screenVariants` | enter `100%` / `-28%`; exit `-28%` / `100%` | `:66-76` |

The same cubic-bezier appears hand-typed in `MapBottomSheet.tsx:130`, `CaseMapPicker.tsx:95`, and
`demo.css:124` — three literal copies of `EASE_STANDARD`.

---

## §2 — Inline-hex / literal census

### §2.1 The script

Committed at **`docs/planning/demo-phone-ui-parity/census.mjs`**. Zero dependencies, no
`node_modules` needed. Run from the repo root:

```sh
node docs/planning/demo-phone-ui-parity/census.mjs .
node docs/planning/demo-phone-ui-parity/census.mjs . > census.txt
```

It walks `features/demo/ui/**/*.{ts,tsx}`, skips `__tests__/` dirs and whole-line comments, and
groups every match by **value**, printing `file:line,line,line` per file so a restyler can see
"`#2B8CC1` appears 58× in these 35 files" at a glance.

> **Do not re-type it into `node -e '…'` under Git Bash.** `.design-sync/NOTES.md:181-182` records
> that Git Bash eats a backslash, so `"\\s"` reaches JS as literal `s` and the check silently
> passes/fails wrong. That bug bit this census on the first attempt. Run the file.

```js
// Inline-style literal census over features/demo/ui/**/*.{ts,tsx} (excluding __tests__).
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.argv[2] ?? process.cwd()
const SCAN = join(ROOT, 'features/demo/ui')

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) {
      if (e !== '__tests__') walk(p, out)
    } else if (/\.tsx?$/.test(p)) {
      out.push(p)
    }
  }
  return out
}

const buckets = new Map()
const add = (cat, value, file, line) => {
  const key = cat + ' ' + value
  if (!buckets.has(key)) buckets.set(key, new Map())
  const m = buckets.get(key)
  if (!m.has(file)) m.set(file, [])
  m.get(file).push(line)
}

const PATTERNS = [
  ['color', /#[0-9a-fA-F]{3,8}\b/g],
  ['color', /\brgba?\([^)]*\)/g],
  ['color', /\b(?:transparent|currentColor)\b/g],
  ['borderRadius', /\bborderRadius:\s*([0-9.]+|'[^']*'|"[^"]*")/g],
  ['fontSize', /\bfontSize:\s*([0-9.]+|'[^']*'|"[^"]*")/g],
  ['fontWeight', /\bfontWeight:\s*([0-9]+|'[^']*'|"[^"]*")/g],
  ['letterSpacing', /\bletterSpacing:\s*(-?[0-9.]+|'[^']*'|"[^"]*")/g],
  ['boxShadow', /\bboxShadow:\s*('[^']*'|"[^"]*"|`[^`]*`)/g],
  ['padding', /\bpadding(?:Top|Right|Bottom|Left)?:\s*([0-9.]+|'[^']*'|"[^"]*")/g],
  ['gap', /\bgap:\s*([0-9.]+|'[^']*'|"[^"]*")/g],
  ['margin', /\bmargin(?:Top|Right|Bottom|Left)?:\s*(-?[0-9.]+|'[^']*'|"[^"]*")/g],
  ['zIndex', /\bzIndex:\s*(-?[0-9]+)/g],
]

const files = walk(SCAN)
for (const f of files) {
  const rel = relative(ROOT, f).split(sep).join('/')
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  lines.forEach((text, i) => {
    if (/^\s*(\/\/|\*|\/\*)/.test(text)) return
    for (const [cat, re] of PATTERNS) {
      re.lastIndex = 0
      let m
      while ((m = re.exec(text))) add(cat, (m[1] ?? m[0]).trim(), rel, i + 1)
    }
  })
}

const rows = [...buckets.entries()].map(([key, m]) => {
  const [cat, value] = key.split(' ')
  const total = [...m.values()].reduce((a, b) => a + b.length, 0)
  return { cat, value, total, files: m }
})

const CATS = ['color','borderRadius','fontSize','fontWeight','letterSpacing','boxShadow','padding','gap','margin','zIndex']
for (const cat of CATS) {
  const set = rows.filter((r) => r.cat === cat)
    .sort((a, b) => b.total - a.total || a.value.localeCompare(b.value))
  const occ = set.reduce((a, b) => a + b.total, 0)
  console.log(`\n===== ${cat.toUpperCase()} — ${set.length} distinct values, ${occ} occurrences =====`)
  for (const r of set) {
    const locs = [...r.files.entries()].map(([f, ls]) => `${f}:${ls.join(',')}`).join('  ')
    console.log(`${String(r.total).padStart(4)}x  ${r.value}`)
    console.log(`        ${locs}`)
  }
}
console.log(`\nFILES SCANNED: ${files.length}`)
```

**Known limits (state them when quoting the numbers):** it is a line-regex, not an AST walk. It
counts a hex inside a `linear-gradient(…)` string as one colour occurrence; it skips whole-line
comments but not trailing ones; it does not resolve `${T.primary}` template references (which is the
point — those are the *good* call sites and correctly do not appear); `borderColor:`/`background:`
hexes are counted under `color`, not under a property bucket.

### §2.2 Headline totals (at `5cf88fe`, 136 files scanned)

| Category | Distinct values | Occurrences |
|---|---|---|
| **color** | **278** | **1,144** |
| padding | 146 | 388 |
| margin | 55 | 375 |
| borderRadius | 31 | 222 |
| fontSize | 27 | 504 |
| zIndex | 23 | 48 |
| boxShadow | 22 | 26 |
| letterSpacing | 20 | 56 |
| gap | 14 | 145 |
| fontWeight | 5 | 256 |

### §2.3 Colours — the top of the distribution, with locations

Format: `count` · value · files:lines. **Bold = duplicates a `T`/`GLASS`/`mapTokens` value** and is
therefore a tokenizing candidate.

**`110x` `#7a9fc4`** — *= `T.textFaint` (`input-theme.ts:22`) and `MAP_GLASS_COLORS.textTertiary` (`mapTokens.ts:54`) and `SHEET_COLORS.textFaint` (`mapTokens.ts:150`)*
> `controls/ExitDialog.tsx:70` · `controls/ExploreChecklist.tsx:60,84` · `inputs/AddressAutocomplete.tsx:202` · `inputs/CameraGpsCapture.tsx:158` · `inputs/CoordinateDisplay.tsx:106,146` · `inputs/GpsCaptureControl.tsx:169,181,188` · `inputs/IncidentLocationFields.tsx:297` · `inputs/input-theme.ts:22` · `inputs/MetadataForm.tsx:84` · `screens/ArrivalDepartureScreen.tsx:33` · `screens/AudioPreviewScreen.tsx:262,265` · `screens/AudioRecorderScreen.tsx:197,245,278,310` · `screens/CamerasScreen.tsx:83,121` · `screens/CaseActionsSheet.tsx:136,212` · `screens/CasesScreen.tsx:84,157,204` · `screens/CompletionScreen.tsx:54,100` · `screens/DashboardScreen.tsx:56,60,144,155,181,186,204` · `screens/DateDisambiguationWarning.tsx:76,82,83` · `screens/DeleteConfirmationModal.tsx:61` · `screens/DvrInfoScreen.tsx:180,182,195,211` · `screens/export/ExportCaseCard.tsx:153,187,190,211` · `screens/export/ExportHub.tsx:159` · `screens/export/ExportLocationRow.tsx:74` · `screens/ExportActionSheet.tsx:227` · `screens/ExportModal.tsx:175` · `screens/ExtractedScopeScreen.tsx:27` · `screens/map/CaseMapPicker.tsx:54,71` · `screens/map/MapCanvas.tsx:618` · `screens/map/mapTokens.ts:54,150` · `screens/MediaCaptureScreen.tsx:173,533,752` · `screens/MediaLibrarySheet.tsx:222,240,478,484,501,606,624,703` · `screens/NewCaseModal.tsx:48,279` · `screens/OcrCaptureScreen.tsx:108,373,426,599` · `screens/RowActions.tsx:72` · `screens/screenData.ts:22` · `screens/settings/panes/AboutPane.tsx:100,115` · `screens/settings/panes/ExportSecurityPane.tsx:150` · `screens/settings/panes/FormFieldsPane.tsx:115,123,194,209,244,290` · `screens/settings/panes/_pane-chrome.tsx:57,150,221,320` · `screens/settings/SettingsCategoryList.tsx:26,145,150` · `screens/settings/UserProfileModal.tsx:46` · `screens/SyncStatusCard.tsx:28,56,79` · `screens/TimeOffsetScreen.tsx:88,99,100,101,103,104,105,122,125` · `screens/_shared.tsx:306,318,553` · `StoryRail.tsx:88`

**`100x` `#f0f4f8`** — *= `T.text` (`input-theme.ts:19`), `MAP_GLASS_COLORS.text` (`mapTokens.ts:50`)*
> `chrome/DemoErrorBoundary.tsx:116` · `chrome/PdfPreview.tsx:138` · `controls/AlertDialog.tsx:157` · `controls/ExitDialog.tsx:59` · `controls/WizardDrawer.tsx:345,376` · `inputs/AddressAutocomplete.tsx:40` · `inputs/CoordinateDisplay.tsx:132` · `inputs/GpsCaptureControl.tsx:45` · `inputs/IncidentLocationFields.tsx:92` · `inputs/input-theme.ts:19` · `PhoneFrame.tsx:112,120,126,130,131,132` · `screens/ArrivalDepartureScreen.tsx:37` · `screens/AudioPreviewScreen.tsx:109` · `screens/AudioRecorderScreen.tsx:122,164,292` · `screens/CamerasScreen.tsx:87` · `screens/CaseActionsSheet.tsx:134,201,218,229` · `screens/CasesScreen.tsx:70,150,244` · `screens/CompletionScreen.tsx:70,95` · `screens/DashboardScreen.tsx:51,128,156,168,202` · `screens/DateDisambiguationWarning.tsx:68,77` · `screens/DeleteConfirmationModal.tsx:62,132,156,159` · `screens/DvrInfoScreen.tsx:145,181,194` · `screens/export/ExportCaseCard.tsx:174` · `screens/export/ExportHub.tsx:210` · `screens/export/ExportLocationRow.tsx:81` · `screens/ExportActionSheet.tsx:178,221` · `screens/ExportModal.tsx:166,285,307,308` · `screens/ExtractedScopeScreen.tsx:32` · `screens/import/ImportTerminalProgress.tsx:193` · `screens/import/PickerStage.tsx:154,276` · `screens/ImportModal.tsx:183,262,276` · `screens/ImportResultAccordion.tsx:38` · `screens/ImportResultBody.tsx:32` · `screens/map/MapCanvas.tsx:117,126` · `screens/map/mapTokens.ts:50` · `screens/MediaCaptureScreen.tsx:832` · `screens/MediaLibrarySheet.tsx:475,584` · `screens/NewCaseModal.tsx:57` · `screens/OcrCaptureScreen.tsx:351,356` · `screens/RequestedScopeScreen.tsx:44` · `screens/RowActions.tsx:72` · `screens/settings/panes/AboutPane.tsx:64,132` · `screens/settings/panes/FormFieldsPane.tsx:108,208,361` · `screens/settings/panes/UserProfilePane.tsx:71` · `screens/settings/panes/_pane-chrome.tsx:54,226` · `screens/settings/SettingsCategoryList.tsx:123` · `screens/settings/SettingsNavBar.tsx:64,107` · `screens/SubmissionScreen.tsx:147` · `screens/SyncStatusCard.tsx:29,53` · `screens/TimeOffsetScreen.tsx:89,95,98,100,101,120` · `screens/_shared.tsx:144,191,402,424,551`

**`82x` `transparent`** — 50 files. Structural, not a palette value; ignore for tokenizing.

**`58x` `#2B8CC1`** — *= `T.primary` (`input-theme.ts:24`), `MAP_GLASS_COLORS.primary` (`mapTokens.ts:56`), `C.primary` (`ImportTerminalProgress.tsx:192`)*
> `controls/ExploreChecklist.tsx:79` · `controls/WizardDrawer.tsx:375` · `inputs/GpsCaptureControl.tsx:179` · `inputs/input-theme.ts:24` · `screens/AudioPreviewScreen.tsx:175` · `screens/AudioRecorderScreen.tsx:153,211` · `screens/CasesScreen.tsx:75` · `screens/CompletionScreen.tsx:123` · `screens/DvrInfoScreen.tsx:143,152,152` · `screens/export/ExportCaseCard.tsx:152,153,154` · `screens/export/ExportLocationRow.tsx:73,74` · `screens/import/ImportTerminalProgress.tsx:192` · `screens/map/LocationDetailCard.tsx:85,86,89,89` · `screens/map/mapTokens.ts:56` · `screens/OcrCaptureScreen.tsx:411` · `screens/RequestedScopeScreen.tsx:24` · `screens/settings/panes/AboutPane.tsx:88,95` · `screens/settings/panes/FormFieldsPane.tsx:186,225,227` · `screens/settings/panes/UserProfilePane.tsx:78` · `screens/settings/panes/_pane-chrome.tsx:55,171,221,224,318` · `screens/settings/SettingsCategoryList.tsx:111` · `screens/settings/SettingsNavBar.tsx:47,90,93` · `screens/SettingsGearButton.tsx:25` · `screens/SplashScreen.tsx:61,63,96,106×4,107×2,108×2,109×2,112` · `screens/TimeOffsetScreen.tsx:74,77,121` · `screens/_shared.tsx:552` · `StoryRail.tsx:75`

**`47x` `#99badd`** — *= `T.textMute` (`:21`), `glassBtnSecondary.color` (`glass-tokens.ts:66`), `MAP_GLASS_COLORS.textSecondary` (`mapTokens.ts:52`)*
> `chrome/PdfPreview.tsx:140` · `controls/ExitDialog.tsx:87` · `controls/WizardDrawer.tsx:104,347,359,362` · `glass-tokens.ts:66` · `inputs/input-theme.ts:21` · `screens/AudioPreviewScreen.tsx:119` · `screens/AudioRecorderScreen.tsx:148,346` · `screens/CasesScreen.tsx:151,245` · `screens/DashboardScreen.tsx:150,162,193` · `screens/DuplicateLocationModal.tsx:61,146` · `screens/export/ExportCaseCard.tsx:180` · `screens/export/ExportHub.tsx:83,100,211,222` · `screens/export/ExportLocationRow.tsx:87` · `screens/import/ImportTerminalProgress.tsx:194` · `screens/import/TerminalLine.tsx:40,42` · `screens/ImportModal.tsx:154,155,182` · `screens/map/mapTokens.ts:52` · `screens/NotesScreen.tsx:423` · `screens/RequestedScopeScreen.tsx:24` · `screens/settings/panes/AboutPane.tsx:65,73,131` · `screens/settings/panes/ExportSecurityPane.tsx:128` · `screens/settings/panes/FormFieldsPane.tsx:238` · `screens/settings/panes/UserProfilePane.tsx:72` · `screens/settings/panes/_pane-chrome.tsx:22` · `screens/settings/SettingsCategoryList.tsx:137` · `screens/settings/SettingsNavBar.tsx:73` · `screens/_shared.tsx:138,146,153,400,405`

**`40x` `#4BA3D4`** — *= `MAP_GLASS_COLORS.primaryLight` (`mapTokens.ts:58`) only. **Not in `T` or `GLASS`.** The de-facto "accent light" across 22 files.*
> `controls/TabBar.tsx:97` · `inputs/CameraGpsCapture.tsx:70,73,89` · `inputs/GpsCaptureControl.tsx:66,69,85` · `screens/AudioRecorderScreen.tsx:512` · `screens/CompletionScreen.tsx:101,123,124` · `screens/ExportActionSheet.tsx:185` · `screens/import/ImportTerminalProgress.tsx:183` · `screens/import/TerminalLine.tsx:43,46` · `screens/map/mapTokens.ts:58` · `screens/NotesScreen.tsx:53` · `screens/OcrCaptureScreen.tsx:127,413,530×2,531×2,532×2,533×2,597` · `screens/settings/panes/UserProfilePane.tsx:80` · `screens/settings/panes/_pane-chrome.tsx:69` · `screens/SyncStatusCard.tsx:29,59` · `screens/TimeOffsetScreen.tsx:74,78,79,90,102,103,104` · `screens/_shared.tsx:562`

**`37x` `#cdd9e6`** — *= `T.textDim` (`:20`)* — `chrome/DemoErrorBoundary.tsx:50` · `controls/AlertDialog.tsx:162` · `controls/WizardDrawer.tsx:153,239,376` · `inputs/AddressAutocomplete.tsx:171` · `inputs/IncidentLocationFields.tsx:118` · `inputs/input-theme.ts:20` · `inputs/MetadataForm.tsx:88` · `screens/AudioRecorderScreen.tsx:130` · `screens/CompletionScreen.tsx:55,114` · `screens/DvrInfoScreen.tsx:124,145,169,188` · `screens/import/PickerStage.tsx:277` · `screens/ImportModal.tsx:194` · `screens/map/CallConfirmSheet.tsx:28` · `screens/map/CaseMapPicker.tsx:62` · `screens/map/MapCanvas.tsx:90` · `screens/map/MapScreen.tsx:99,352` · `screens/MediaCaptureScreen.tsx:839` · `screens/MediaLibrarySheet.tsx:719` · `screens/NewCaseModal.tsx:76` · `screens/OcrCaptureScreen.tsx:478,604` · `screens/RequestedScopeScreen.tsx:53` · `screens/settings/panes/FormFieldsPane.tsx:227,320` · `screens/settings/panes/_pane-chrome.tsx:156` · `screens/settings/UserProfileModal.tsx:45` · `screens/SubmissionScreen.tsx:146` · `screens/_shared.tsx:269,316` · `StoryRail.tsx:95`

**`33x` `#fff`** — 26 files. Structural (button text on accent, marker halo). Note `#FFFFFF` appears separately 4× (`mapTokens.ts:81`, `CAMERA_MARKER`) — same colour, two spellings.

**`21x` `#9fc0db`** — **not a token.** Body-copy blue used in 15 files: `chrome/DemoErrorBoundary.tsx:117` · `screens/AudioPreviewScreen.tsx:200` · `screens/AudioRecorderScreen.tsx:123` · `screens/CompletionScreen.tsx:71` · `screens/DateDisambiguationWarning.tsx:71` · `screens/ExportModal.tsx:170,288,322` · `screens/ExtractedScopeScreen.tsx:23` · `screens/import/PasteStage.tsx:61` · `screens/import/PickerStage.tsx:155` · `screens/ImportModal.tsx:277` · `screens/ImportResultBody.tsx:34,73,81,84` · `screens/OcrCaptureScreen.tsx:391,478,548` · `screens/SyncStatusCard.tsx:58,80`

**`21x` `#ff4757`** — *= `T.error` (`:33`); also the colour inside `GLASS.borderError`*
> `chrome/DemoErrorBoundary.tsx:112` · `inputs/AddressAutocomplete.tsx:173` · `inputs/CameraGpsCapture.tsx:164` · `inputs/CoordinateDisplay.tsx:26,169` · `inputs/GpsCaptureControl.tsx:194` · `inputs/IncidentLocationFields.tsx:133` · `inputs/input-theme.ts:33` · `screens/AudioRecorderScreen.tsx:298,414` · `screens/DeleteConfirmationModal.tsx:65` · `screens/EditIncidentLocationModal.tsx:58` · `screens/import/ImportTerminalProgress.tsx:198` · `screens/import/PickerStage.tsx:318` · `screens/import/TerminalLine.tsx:49,56` · `screens/ImportModal.tsx:246` · `screens/NewCaseModal.tsx:85` · `screens/RowActions.tsx:40` · `screens/_shared.tsx:262,271`

**`18x` `#10d177`** — success green #1. `controls/ExploreChecklist.tsx:63,90` · `controls/WizardDrawer.tsx:79` · `inputs/CoordinateDisplay.tsx:24,169` · `screens/AudioRecorderScreen.tsx:294` · `screens/CompletionScreen.tsx:68` · `screens/DvrInfoScreen.tsx:22` · `screens/export/ExportHub.tsx:99` · `screens/import/ImportTerminalProgress.tsx:196` · `screens/import/TerminalLine.tsx:47,48` · `screens/ImportModal.tsx:260` · `screens/ImportResultAccordion.tsx:36` · `screens/map/CaseMapPicker.tsx:70` · `screens/screenData.ts:20` · `screens/settings/panes/_pane-chrome.tsx:71` · `screens/SyncStatusCard.tsx:65`

**`17x` `#1e3a5f`** — *= `T.border` (`:16`) and the colour inside `GLASS.border` (`:39`)*
> `glass-tokens.ts:39` · `inputs/GpsCaptureControl.tsx:179` · `inputs/input-theme.ts:16` · `screens/CaseActionsSheet.tsx:193` · `screens/CasesScreen.tsx:189` · `screens/DashboardScreen.tsx:110` · `screens/DvrInfoScreen.tsx:143` · `screens/export/ExportCaseCard.tsx:198` · `screens/ExportActionSheet.tsx:238` · `screens/import/ImportTerminalProgress.tsx:195` · `screens/map/CaseMapPicker.tsx:132` · `screens/settings/panes/FormFieldsPane.tsx:186,225` · `screens/settings/panes/_pane-chrome.tsx:171` · `screens/settings/SettingsCategoryList.tsx:158` · `screens/TimeOffsetScreen.tsx:121` · `screens/_shared.tsx:552`
> *These 15 non-token sites are exactly the "shorthand token can't slot into `borderColor`/a ternary" cases from deferral §31.*

**`16x` `#ffd07a`** — amber #1 ("sample data" badges). `chrome/PdfPreview.tsx:167` · `screens/AudioPreviewScreen.tsx:197` · `screens/ImportModal.tsx:266,282` · `screens/ImportResultAccordion.tsx:42` · `screens/ImportResultBody.tsx:65` · `screens/MediaCaptureScreen.tsx:523,525,723,887,897,902` · `screens/MediaLibrarySheet.tsx:451,730` · `screens/OcrCaptureScreen.tsx:365,591`

**`15x` `#ffd93d`** — amber #2 ("warning"). `controls/WizardDrawer.tsx:80` · `inputs/CoordinateDisplay.tsx:25` · `inputs/LocationFields.tsx:266` · `screens/AudioRecorderScreen.tsx:164` · `screens/DateDisambiguationWarning.tsx:6` · `screens/DeleteConfirmationModal.tsx:66` · `screens/DvrInfoScreen.tsx:23` · `screens/export/ExportHub.tsx:101` · `screens/import/ImportTerminalProgress.tsx:197` · `screens/import/TerminalLine.tsx:45` · `screens/NotesScreen.tsx:54` · `screens/screenData.ts:24` · `screens/settings/panes/_pane-chrome.tsx:70` · `screens/TimeOffsetScreen.tsx:48` · `StoryRail.tsx:106`

**`14x` `#0d1b2a`** — *= `T.bg` (`:14`)* — `inputs/AddressAutocomplete.tsx:39` · `inputs/IncidentLocationFields.tsx:91` · `inputs/input-theme.ts:14` · `PhoneFrame.tsx:59` · `screens/DvrInfoScreen.tsx:144` · `screens/map/MapCanvas.tsx:92,100` · `screens/MediaCaptureScreen.tsx:444` · `screens/NewCaseModal.tsx:56` · `screens/OcrCaptureScreen.tsx:494` · `screens/settings/SettingsModal.tsx:81` · `screens/SubmissionScreen.tsx:147` · `screens/_shared.tsx:125,190`

**`13x` `#ff8a93`** — error text #2. `screens/AudioPreviewScreen.tsx:213` · `screens/AudioRecorderScreen.tsx:259,270` · `screens/import/PickerStage.tsx:322` · `screens/ImportModal.tsx:192,248` · `screens/MediaCaptureScreen.tsx:510,758` · `screens/OcrCaptureScreen.tsx:390,477,542,578,589`

**`12x` `#9fd4ee`** — accent-light #3. `screens/AudioPreviewScreen.tsx:207` · `screens/AudioRecorderScreen.tsx:127,252,260,514` · `screens/MediaCaptureScreen.tsx:515` · `screens/OcrCaptureScreen.tsx:129,496,575,583,597,638`

**`10x` `#5d7a9a`** — muted #2. `controls/ExploreChecklist.tsx:63` · `controls/TabBar.tsx:97` · `controls/WizardDrawer.tsx:90,91,398` · `DemoExperience.tsx:387,397` · `screens/import/PickerStage.tsx:91` · `screens/settings/panes/FormFieldsPane.tsx:366` · `StoryRail.tsx:37`

**`8x` `#05080d`** — the full-bleed overlay black. `PhoneFrame.tsx:60` · `screens/AudioPreviewScreen.tsx:106` · `screens/AudioRecorderScreen.tsx:337` · `screens/MediaCaptureScreen.tsx:94,444` · `screens/OcrCaptureScreen.tsx:350,493,494`

**`8x` `#0a1320`** — the "media well" navy. `screens/import/PasteStage.tsx:42` · `screens/MediaCaptureScreen.tsx:851,859` · `screens/MediaLibrarySheet.tsx:417,428` · `screens/OcrCaptureScreen.tsx:354,508` · `screens/SyncStatusCard.tsx:49`

**`8x` `#e7eef6`** — *= `SHEET_COLORS.text` (`mapTokens.ts:148`)* — `DemoExperience.tsx:2979` · `screens/map/CaseMapPicker.tsx:35,52,116,138` · `screens/map/DemoNotification.tsx:22` · `screens/map/mapTokens.ts:148` · `StoryRail.tsx:32`

**`8x` `rgba(43,140,193,0.08)`** — *= `T.primarySoft` (`:27`)* — `inputs/Dropdown.tsx:76` · `inputs/input-theme.ts:27` · `screens/AudioPreviewScreen.tsx:207` · `screens/AudioRecorderScreen.tsx:252` · `screens/DvrInfoScreen.tsx:179` · `screens/MediaLibrarySheet.tsx:569` · `screens/settings/panes/_pane-chrome.tsx:140,172`

**`8x` `rgba(43,140,193,0.14)`** — **not a token**, but the most-used accent tint. `screens/AudioRecorderScreen.tsx:513` · `screens/DvrInfoScreen.tsx:144` · `screens/map/LocationDetailCard.tsx:33` · `screens/map/LocationList.tsx:68` · `screens/OcrCaptureScreen.tsx:128,597` · `screens/settings/panes/FormFieldsPane.tsx:226` · `screens/SplashScreen.tsx:110`

**`7x` `rgba(4,8,14,0.55)`** — *= `T.scrim` (`:31`)* — `controls/WizardDrawer.tsx:308` · `inputs/input-theme.ts:31` · `screens/BootSequence.tsx:37` · `screens/ExportActionSheet.tsx:91` · `screens/map/CallConfirmSheet.tsx:15` · `screens/settings/SettingsModal.tsx:68` · `screens/_shared.tsx:110`

**`6x` `#46607e`** — footer/ordinal grey. `controls/ExitDialog.tsx:69` · `controls/ExploreChecklist.tsx:81` · `controls/WizardDrawer.tsx:405` · `screens/settings/panes/AboutPane.tsx:121,122` · `screens/settings/SettingsCategoryList.tsx:72`

**`6x` `#4ecdc4`** — **the teal.** *The phone campaign purged teal; the demo still has it.*
`controls/ExitDialog.tsx:56` · `controls/ExploreChecklist.tsx:81` · `screens/DashboardScreen.tsx:157` · `StoryRail.tsx:42,48,94`
Plus the uppercase spelling `#4ECDC4` at `screens/import/ImportTerminalProgress.tsx:187` (live dot)
and `screens/import/TerminalLine.tsx:44` (`VERB` level accent), and `rgba(78,205,196,…)` at
`PhoneFrame.tsx:71` (scan sweep gradient + glow) and `StoryRail.tsx:47`.
**Total teal footprint: 6 + 2 + 3 = 11 sites across 7 files.**

**`6x` `#9fb6d0`** — *= `SHEET_COLORS.textDim`* — `screens/map/CaseMapPicker.tsx:36,53,109,115` · `screens/map/MapScreen.tsx:114` · `screens/map/mapTokens.ts:149`

**`6x` `#ff6b78`** — error text #3 (`_shared.tsx` `Field` error line, `NewCaseModal`, `NewLocationModal`, `IncidentLocationFields`, `DuplicateLocationModal`).
**`5x` `#ff6b7a`** — error text #4 (`AlertDialog` destructive, `ExportActionSheet`, `ExportModal`).
**`5x` `#ff7a85`** — error text #5 (Remove links: `ArrivalDeparture`, `Cameras`, `ExtractedScope`, `RequestedScope`; `DvrInfoScreen` critical).

**`5x` `rgba(30,58,95,0.6)`** — near-miss of `GLASS.borderSoft`'s `0.5`.

### §2.4 The tokenizing verdict

Splitting the 1,144 colour occurrences by whether they duplicate an existing token:

| Bucket | Approx. occurrences | Note |
|---|---|---|
| **Duplicates a `T` value** | ~350 | `#7a9fc4` 110, `#f0f4f8` 100, `#2B8CC1` 58, `#99badd` 47, `#cdd9e6` 37, `#ff4757` 21, `#1e3a5f` 17, `#0d1b2a` 14, `rgba(43,140,193,0.08)` 8, `rgba(4,8,14,0.55)` 7 — **minus 16 token-definition lines** |
| Structural (`transparent`, `currentColor`, `#fff`, `#000`) | ~135 | Not palette |
| Map-token-driven (already correct) | ~60 | The `map/` dir is near-clean |
| **Unique / near-miss / one-off** | ~600 | 258 of the 278 distinct values occur ≤4× |

**Read:** roughly **one in three colour occurrences is a hand-typed copy of a value that already has
a token name three directories away.** That is the port's mechanical bulk. The other ~600 are
judgment calls — near-misses (`rgba(30,58,95,0.6)` vs `borderSoft`'s `0.5`), one-off gradients, and
the deliberate parallel palettes of §1.5.

### §2.5 Scalars

**`borderRadius` — 31 distinct, 222 occurrences.** A clear ladder with a long tail:
`10` (51×) · `12` (32×) · `8` (28×) · `16` (16×) · `20` (13×) · `14` (12×) · `6` (12×) · `4` (10×) ·
`3` (7×) · `5` (6×) · `11` (5×) · `18` (3×) · `2` (3×) · `999` (3×) · `9999` (3×) · `1` (2×) ·
`'0 2px 2px 0'` (2×) · then singletons `9, 15, 19, 21, 24, 32, 34, 36, 40, 42, 45, 46, 58, 2.5`.
Note **`999` and `9999` both mean "pill"** (3× each) — two spellings of one intent.
`GLASS`/`glassCard` own `12` and `10`; the other 29 values are ad hoc.

**`fontSize` — 27 distinct, 504 occurrences.** `13` (107×) · `12` (74×) · `15` (64×) · `14` (60×) ·
`11` (55×) · `10` (26×) · `12.5` (26×) · `16` (16×) · `20` (11×) · `14.5` (9×) · `17` (9×) · `9` (8×) ·
`18` (7×) · `22` (5×) · `13.5` (4×) · `10.5` (3×) · `11.5` (3×) · `24` (3×) · `30` (3×) · `19` (2×) ·
`21` (2×) · `9.5` (2×) · then `8, 15.5, 23, 34, 42`.
**Half-point sizes (`9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5`) account for 48 occurrences** — a type
scale would have to either adopt them or deliberately round them.

**`fontWeight` — 5 distinct, 256 occurrences.** `600` (140×) · `700` (67×) · `500` (47×) · `300` (1×,
`LocationRow.tsx:30` chevron) · `400` (1×, `MapControls.tsx:97`). Effectively a 3-step scale already.

**`letterSpacing` — 20 distinct, 56 occurrences.** `0.5` (10×) · `2` (7×) · `0.8` (5×) · `1.5` (5×) ·
`0.3` (4×) · `0.4` (4×) · `1` (4×) · `0.6` (3×) · `1.2` (2×) · `1.4` (2×) · singletons
`-0.2, -0.3, '-0.5px', '0.3px', 0.1, 0.2, 3, 5, 6, 8`. Note **two are strings with units** while the
rest are unitless numbers — React treats bare numbers as `px` here, so they're equivalent, but a
codemod must handle both spellings.

**`gap` — 14 distinct, 145 occurrences.** `8` (53×) · `10` (24×) · `12` (23×) · `6` (19×) · `14` (8×) ·
`4` (6×) · `9` (3×) · `5`/`7` (2× each) · `1, 2, 3, 11, 13` (1× each).

**`boxShadow` — 22 distinct, 26 occurrences.** Almost every shadow is a one-off:

| Count | Value | Owner |
|---|---|---|
| 3× | `0 24px 60px rgba(0,0,0,0.55)` | `AlertDialog:156`, `DeleteConfirmationModal:121`, `ExportModal:268` — **the centred-dialog shadow, already de-facto shared** |
| 3× | `` `0 1px 4px ${MAP_GLASS_COLORS.shadow}` `` | `MapControls` pills |
| 1× | `-24px 0 60px rgba(0,0,0,0.5)` | `WizardDrawer:329` |
| 1× | `0 -10px 40px rgba(0,0,0,0.5)` | `ExportActionSheet:171` |
| 1× | `0 -16px 40px -8px rgba(0,0,0,0.6)` | `PickerSheet` |
| 1× | `0 -6px 18px rgba(0,0,0,0.28)` | `TabBar` |
| 1× | `0 -8px 24px rgba(0,0,0,0.45)` | `MapBottomSheet` |
| 1× | `0 0 0 2px #05080d inset` | `PhoneFrame:60` |
| 1× | `0 0 12px rgba(78,205,196,0.6)` | `PhoneFrame:71` — **teal** |
| 1× | `0 0 22px rgba(43,140,193,0.12)` | `CompletionScreen` summary |
| 1× | `0 0 48px 8px rgba(43,140,193,0.30)` | `SplashScreen:110` HUD glow |
| 1× | `0 0 6px rgba(16,209,119,0.6)` | `ImportResultAccordion:36` |
| 1× | `0 0 7px rgba(16,209,119,0.6)` | `WizardDrawer:79` / `ExploreChecklist:90` — **`6px` vs `7px`, same intent** |
| 1× | `0 0 7px rgba(255,217,61,0.55)` | `WizardDrawer:80` |
| 1× | `0 12px 30px rgba(0,0,0,0.5)` | `AddressAutocomplete:191` |
| 1× | `0 40px 90px rgba(0,0,0,0.6)` | `ExitDialog:252` |
| 1× | `0 4px 16px rgba(26,143,194,0.35)` | `LocationList:91` |
| 1× | `0 6px 18px rgba(37,128,173,0.35)` | `_shared.tsx:414` `WizardNext` — **hand-duplicated at `CompletionScreen.tsx:147`** |
| 1× | `0 8px 24px rgba(0,0,0,0.5)` | `DemoNotification:26` |
| 1× | `0 8px 30px rgba(0,0,0,0.5)` | (near-miss of the above) |
| 1× | `inset 0 4px 12px rgba(0,0,0,0.35)` | `MediaLibrarySheet:276` recessed preview |
| 1× | `` `0 0 6px ${color}88` `` | `LocationRow:26` status dot |

Plus the frame's stacked shadow at `PhoneFrame.tsx:46-49` (three layers).

### §2.6 z-index — 23 distinct values, 48 occurrences, **five competing schemes**

The full census output, verbatim:

| z | Sites |
|---|---|
| 40 (8×) | `PhoneFrame.tsx:173` (portal root) · `AudioPreviewScreen.tsx:106` · `AudioRecorderScreen.tsx:337` · `ExportModal.tsx:82` · `MediaCaptureScreen.tsx:93` · `MediaLibrarySheet.tsx:359` · `OcrCaptureScreen.tsx:350,493` |
| 2 (6×) | `BootSequence.tsx:33` · `OcrCaptureScreen.tsx:495,510,573` · `SettingsNavBar.tsx:88` · `SplashScreen.tsx:112` |
| 30 (3×) | `PhoneFrame.tsx:89` (dynamic island) · `ExportActionSheet.tsx:90` · `CaseMapPicker.tsx:90` |
| 41 (3×) | `WizardDrawer.tsx:308` · `ExportModal.tsx:141,259` |
| 60 (3×) | `AlertDialog.tsx:131` · `DeleteConfirmationModal.tsx:96` · `DemoNotification.tsx:17` |
| 1 (2×) | `PhoneFrame.tsx:75` (scan sweep) · `DashboardScreen.tsx:108` |
| 16 (2×) | `MapScreen.tsx:94` · `_shared.tsx:397` (`WizardHeader` sticky) |
| 20 (2×) | `PhoneFrame.tsx:104` (status bar) · `MapBottomSheet.tsx:122` |
| 25 (2×) | `PhoneFrame.tsx:168` (home indicator) · `MapCanvas.tsx:108` (error overlay) |
| 4 (2×) | `MediaCaptureScreen.tsx:106,132` |
| 5 (2×) | `MapCanvas.tsx:98` (loading cover) · `MediaCaptureScreen.tsx:473` |
| 61 (2×) | `AlertDialog.tsx:146` · `DeleteConfirmationModal.tsx:111` |
| 0 | `PhoneFrame.tsx:14` |
| 3 | `OcrCaptureScreen.tsx:594` |
| 10 | `PhoneFrame.tsx:149` (screen content) |
| 15 | `MapControls.tsx:60` |
| 18 | `TabBar.tsx:74` |
| 31 | `ExportActionSheet.tsx:167` |
| 42 | `WizardDrawer.tsx:326` |
| 43 | `PdfPreview.tsx:136` |
| 48 | `CallConfirmSheet.tsx:14` |
| 50 | `AddressAutocomplete.tsx:191` |
| 100 | `ExitDialog.tsx:47` |

Plus the **named** constants, which the census can't see because they're identifiers:
`MODAL_SCRIM_Z = 21` / `MODAL_SHEET_Z = 22` (`_shared.tsx:45-46`), `MODAL_LAYER = {base:0, overSheet:4}`
(`_shared.tsx:35-36`), `PICKER_SHEET_Z = 31` (`PickerSheet.tsx:25`), `SETTINGS_SHEET_Z`
(`SettingsModal.tsx:62`), `TAB_BAR_HEIGHT = 50` (`TabBar.tsx:10`).

**The five schemes:**
1. **PhoneFrame internal** — grid 0, sweep 1, screen 10, MapControls 15/16, TabBar 18, status bar 20, home indicator 25, island 30, portal root 40.
2. **`_shared.tsx` named** — scrim 21 / sheet 22, `+ MODAL_LAYER.overSheet` (4) → up to 25/26.
3. **PickerSheet named** — 31/32, "upper bound of the modal-over-modal ordering".
4. **WizardDrawer / PdfPreview** — 41/42, 43.
5. **Ad-hoc high** — `AlertDialog` 60/61, `DeleteConfirmationModal` 60/61 (a second, unshared copy),
   `DemoNotification` 60, `CallConfirmSheet` 48, `AddressAutocomplete` 50, `ExitDialog` 100 (page-level).

Deferral §20 (`docs/code-reviews/deferred.md:413`) already records "z-index inversion if a PickerSheet
and the WizardDrawer are open together". **A restyle that reorders any overlay must reconcile these
five schemes into one, or explicitly leave them alone.**

### §2.7 padding / margin

146 distinct padding values and 55 distinct margins across 763 occurrences — too long-tailed to
tabulate usefully here. Run the script and read the `PADDING` / `MARGIN` sections. The shape:
- Padding clusters at `16` / `14` / `12` / `18` for card and sheet bodies, `'11px 12px'` for the
  shared input recipe (three copies, §4.1), `'54px …'` / `'56px …'` / `'50px …'` for full-bleed
  overlays clearing the status bar, and `'0 12px'`-family for rows.
- Margin is dominated by `marginBottom: 14` (the `Field` wrapper rhythm, `_shared.tsx:199`) and its
  copies, plus `marginTop: 4/5/6/8/10` for helper lines.

---

## §3 — Per-surface map

One block per demo component: what phone surface it replicates, which shared chrome it consumes,
which visual recipes it **hand-rolls locally** (with `file:line` ranges and the actual values), and
which literals duplicate a token.

**How to read a block.** "Shared chrome used" tells the matrix-writer what changes *for free* when
§4's recipes change. "Recipes hand-rolled" is the work list — each bullet is a place a phone-side
recipe change has to be applied by hand. "Hardcoded literals worth noting" feeds §2's tokenizing pass.

Paths below are relative to `features/demo/ui/`. All line numbers at `5cf88fe`.

### §3.0 `DemoExperience.tsx` (3,141 lines) — the store bridge, near-zero styling

Despite being the largest file in the feature, it holds only **six** `style={{` blocks:

| Line | Surface | Values |
|---|---|---|
| `:387` | `placeholder()` — the fall-through for unbuilt views | `minHeight:786, padding:40, textAlign:center, color:'#5d7a9a', fontSize:14, lineHeight:1.6` |
| `:397` | "No location open" empty state | same shell |
| `:398` | its body line | `marginBottom:18` |
| `:399` | its CTA | `padding:'12px 22px', ...glassBtnSecondary, fontSize:14, fontWeight:600` |
| `:2974-2979` | the page shell (phone column + rail) | `color:'#e7eef6'` |
| `:2983` | the sticky phone column | `padding:'28px 20px 28px 40px'` |

**Restyle implication:** the bridge is not a styling surface. Do not look for recipes here; look for
the props it threads.

### §3.1 Wizard, case and audio screens (A–D)

### `screens/ArrivalDepartureScreen.tsx` (49 lines)
- **Replicates**: On-site visit arrival/departure wizard step (chain-of-custody visits array).
- **Shared chrome used**: `AddRowButton`, `DateTimeField`, `WizardHeader`, `WizardNext` from `_shared`; `glassCard`.
- **Recipes hand-rolled**:
  - `card (visit row)` — `:35-42` — spreads `glassCard` + `padding:16, marginBottom:14`; header row `fontSize:15, fontWeight:700, color:'#f0f4f8'`; Remove link `color:'#ff7a85', fontSize:13`, transparent/borderless.
  - `empty state` — `:33` — `fontSize:13, color:'#7a9fc4', fontStyle:italic, textAlign:center, padding:'8px 0 14px'`.
- **Hardcoded literals**: `#f0f4f8` (= `T.text`), `#7a9fc4` (= `T.textFaint`), `#ff7a85` (error-red #5).
- **Notes**: `isFieldVisible` gates both date/time fields (P7.3 form-profile). No motion.

### `screens/AudioPreviewScreen.tsx` (265 lines)
- **Replicates**: phone `AudioPreview.tsx` — "a player card with a 72px play control, a seekable progress bar, elapsed/total times and a file-info row, then Record Again / Save Audio."
- **Shared chrome used**: `GLASS`, `glassBtnPrimary`, `glassBtnSecondary`, `glassCard`; `MetadataForm`.
- **Recipes hand-rolled**:
  - `full-screen sheet shell` — `:106` — `position:absolute, inset:0, zIndex:40, background:'#05080d', padding:'54px 20px 22px', overflowY:auto`.
  - `header bar` — `:107-123` — title `fontSize:20, fontWeight:700, color:'#f0f4f8'`; transparent close icon button.
  - `card (player)` — `:125` — `glassCard` + `padding:'20px 16px 14px', marginBottom:14`.
  - `circular play button` — `:141-158` — `72×72, borderRadius:36, border:none, background:GLASS.gradientAccent`.
  - `range/progress input` — `:165-176` — native `<input type=range>`, `accentColor:'#2B8CC1'`.
  - `time text` — `:259-263` — jbmono, `fontSize:11, color:'#7a9fc4'`.
  - `info row + divider` — `:187-192` — `borderTop:'1px solid rgba(30,58,95,0.4)'`; `infoText` `:265` `fontSize:11, color:'#7a9fc4'`.
  - `chip/badge (Sample)` — `:197-199` — `fontSize:9, fontWeight:700, letterSpacing:0.8, uppercase, color:'#ffd07a', background:'rgba(255,200,90,0.12)', border:'1px solid rgba(255,200,90,0.3)', borderRadius:6, padding:'1px 6px'`.
  - `notice banner` — `:207-209` — `borderRadius:12, border:GLASS.borderAccent, background:'rgba(43,140,193,0.08)', padding:'12px 14px', fontSize:12, color:'#9fd4ee'`.
  - `alert banner` — `:213-215` — `borderRadius:12, border:GLASS.borderError, background:'rgba(255,71,87,0.06)', padding:'12px 14px', fontSize:12, color:'#ff8a93'`.
  - `button row` — `:227-254` — Record Again `glassBtnSecondary`; Save Audio `glassBtnPrimary` with `aria-disabled` + `opacity 0.5`.
- **Hardcoded literals**: `#05080d` (`:106`); the sample-badge gold family (not in any token); `rgba(30,58,95,0.4)` (`:187`) — a **near-miss** of `T.borderSoft`'s `0.5`; `rgba(43,140,193,0.08)` = `T.primarySoft`.
- **Notes**: `END_TOLERANCE_SEC = 0.1` (`:39`) is seek logic. Deliberately no auto-reset on playback end (documented `:15-35`) — do not "fix" the full progress bar at end of playback.

### `screens/AudioRecorderScreen.tsx` (553 lines)
- **Replicates**: phone `RecorderScreen.tsx` composition — "CRT overlay · header badge · timer card · waveform panel · level meter · morphing record button + glass pills."
- **Shared chrome used**: `GLASS`, `glassCard`. **No `_shared.tsx` imports** — fully bespoke recorder chrome.
- **Recipes hand-rolled**:
  - `full-screen shell + CRT scanline` — `:335-352` — `background:'#05080d'`; overlay `opacity:0.03, backgroundImage:'repeating-linear-gradient(180deg,#99badd 0 1px,transparent 1px 4px)'`.
  - `header bar` — `:141-156` — circular icon button `40×40, borderRadius:20, background:'rgba(19,34,54,0.85)', border:GLASS.borderSoft`; mono label `fontSize:10, letterSpacing:1.5, color:'#5a7a9a'`.
  - `card (timer)` — `:159-202` — `glassCard` + `borderRadius:16, padding:'20px 20px 14px'`; top highlight hairline `rgba(153,186,221,0.25)`; timer `fontSize:42, fontWeight:700, letterSpacing:2`; status dot `8×8, borderRadius:4`; footer divider `1px solid rgba(30,58,95,0.3)`.
  - `card (waveform monitor)` — `:205-233` — `glassCard` + `borderRadius:16`; label `fontSize:9, letterSpacing:2`; centre line `rgba(43,140,193,0.2)` / `rgba(153,186,221,0.08)`; `Bar` (`:356-395`) uses `scaleY`, colours `rgba(153,186,221,0.2)` idle / `rgba(255,217,61,0.45)` paused / `rgba(43,140,193,0.65)` live.
  - `progress/level bar` — `:239-244` — track `height:4, borderRadius:2, background:'rgba(30,58,95,0.5)'` (= `T.borderSoft`); fill colour from `levelFillColor()` (**engine**).
  - `notice / alert banners` — `:252-264` — identical to `AudioPreviewScreen`'s pair.
  - `record button (morphing)` — `:399-446` — outer `90×90, borderRadius:45, border:GLASS.borderSoft, background:'linear-gradient(180deg,rgba(26,45,68,0.6),rgba(19,34,54,0.8))'`; inner morphs idle circle `#e8edf2` 64px → recording square `#ff4757` 30px/r7 → paused circle `#ff4757` 64px/r32.
  - `pill button` — `:450-496` — `height:42, padding:'0 22px', borderRadius:21, background:GLASS.gradientCard`.
  - `pill button (denied)` — `:498-506` — `padding:'11px 26px', borderRadius:10, border:GLASS.borderBtn, background:transparent`.
  - `CTA (sample / enable mic)` — `:508-518` — `border:'1px solid #4BA3D4', background:'rgba(43,140,193,0.14)', color:'#9fd4ee'`.
  - `empty/denied state` — `:117-135` — `MicOffIcon`; title `fontSize:19, fontWeight:600`; body `fontSize:13, color:'#9fc0db', lineHeight:1.55`.
- **Hardcoded literals**: `MUTED = '#5a7a9a'` (`:104`) — one-off; `#e8edf2` (`:415`) idle fill; `rgba(153,186,221,0.25)` (`:160`) — **near-miss** of `T.topHighlight`'s `rgba(184,212,240,0.25)` (different RGB, same alpha).
- **Notes**: Status colours come from `recorderStatusColor(phase)` / `levelFillColor(level)` in `engine/logic/media` — **trace those for the full map, and note the engine coverage gate applies**. `reduceMotion` gates every `animation`/`transition`. `Bar` uses `scaleY` not `height`, deliberately for perf (`:372-376`) — preserve. `BAR_WIDTH=4`, `BAR_GAP=3` (`:105-106`) are waveform geometry.

### `screens/AudioRecordingFlow.tsx` (280 lines)
- **Replicates**: phone `AudioRecordingFlow` orchestration (recorder → review).
- **Recipes hand-rolled**: **none** — zero JSX styling; a pure state/capability controller. Skip for restyle except as prop plumbing.

### `screens/BootSequence.tsx` (306 lines)
- **Replicates**: the demo's answer to the phone's `AuthenticatedSplashScreen` — the boot state machine (idle → scanning → authorized → video → fading → done). Composes `SplashScreen` for the HUD.
- **Shared chrome used**: none.
- **Recipes hand-rolled**:
  - `skip button (pill)` — `:28-43` — `position:absolute, top:60, right:16, padding:'6px 13px', borderRadius:999, border:'1px solid rgba(43,140,193,0.45)', background:'rgba(4,8,14,0.55)', color:'rgba(153,186,221,0.9)', stmono, fontSize:11, letterSpacing:3`.
  - `full-bleed video layer` — `:60-67`, `:279-296` — `position:absolute, inset:0, objectFit:cover`; opacity crossfade.
  - `root shell + fade` — `:258-278` — `background:'#000314'` (phone splash bg verbatim, comment `:271`); `transition:opacity ${FADE_MS}ms linear` gated by `reduceMotion`.
- **Hardcoded literals**: `#000314` (`:272`) — one-off, not in any token; `rgba(4,8,14,0.55)` (`:37`) — **exactly `T.scrim`**, not imported.
- **Notes**: `MONO` is `var(--font-stmono)` (`:26`) — the **Share Tech Mono** family, not JetBrains; do not conflate. `useReducedMotion` collapses the whole sequence to instant-complete (`:99`, `:132-135`). `VIDEO_CEILING_MS` / `VIDEO_OVERRUN_MS` (`:55`, `:58`) are behavioural. Skip button `zIndex:2` (`:33`) — local, outside the `MODAL_LAYER` scheme.

### `screens/CamerasScreen.tsx` (129 lines)
- **Replicates**: phone Cameras array wizard screen (`app/(form)/cameras.tsx`); cites "Phone `ArrayFieldManager` cap for this screen (`app/(form)/cameras.tsx:174`, ui-mapping 07:126)".
- **Shared chrome used**: `AddRowButton`, `Field`, `SelectField`, `WizardHeader`, `WizardNext`; `glassCard`; `CameraGpsCapture`.
- **Recipes hand-rolled**:
  - `card (camera row)` — `:85-114` — `glassCard` + `padding:16, marginBottom:14`; header row **identical to `ArrivalDepartureScreen`** (`fontSize:15, fontWeight:700, '#f0f4f8'`; Remove `#ff7a85`, `fontSize:13`).
  - `empty state` — `:83` — same recipe as `ArrivalDepartureScreen:33`.
  - `max-items notice` — `:121-123` — `fontSize:13, color:'#7a9fc4', textAlign:center, padding:'10px 0', marginBottom:14`.
- **Notes**: `MAX_CAMERAS = 50` (`:15`); the Add button **hides** at cap rather than disabling (`:116-124`, phone parity). Per-camera custom-resolution state keyed by `CameraEntry.id`, not index (`:39-45`) — deliberate divergence.

### `screens/CaseActionsSheet.tsx` (239 lines)
- **Replicates**: "Web port of the phone's `src/features/case-management/components/CaseActionsSheet.tsx`."
- **Shared chrome used**: `ModalShell` (with the P3.2 `subtitle`/`footer`/`fillBody` extensions); `GLASS`, `glassBtnPrimary`, `glassBtnSecondary`.
- **Recipes hand-rolled**:
  - `grid button (footer actions)` — `:74-82` + `:145-169` — `flexBasis:'48%', flexGrow:1, padding:12, fontSize:14.5, fontWeight:600` over `glassBtnPrimary`/`Secondary`.
  - `bordered report panel` — `:175-189` — `borderRadius:12, border:GLASS.border, background:'rgba(13,27,42,0.6)'`, conditional `overflowY`/`maxHeight` from the measured gate.
  - `section header` — `:195-206` — `fontSize:11, fontWeight:600, letterSpacing:0.5, uppercase, color:'#f0f4f8'`.
  - `divider` — `:193` — `height:1, background:'#1e3a5f', opacity:0.6, margin:'12px 0'`.
  - `list row (label/value)` — `:207-227` — label `flex:'0 0 42%', fontSize:13, color:'#7a9fc4'`; value `flex:'0 0 58%'`, mono when `row.mono`.
- **Hardcoded literals**: `#1e3a5f` (`:193`) — the colour inside `GLASS.border`, used bare.
- **Notes**: `reportScrollGate()` (`:45-52`) is ResizeObserver-driven measured-overflow math; **`vitest.setup.ts` stubs `ResizeObserver` as a no-op**, so tests see the un-measured branch. Footer buttons vary by case status via `actionsForStatus` (engine).

### `screens/CasesScreen.tsx` (270 lines)
- **Replicates**: phone Cases list (`CaseList.tsx` / `SwipeableCaseCard.tsx` / `MainHeader.tsx`); swipe-to-delete replaced by long-press row actions.
- **Shared chrome used**: `GLASS`, `glassBtnPrimary`, `glassBtnSecondary`; `RowActionsTray`/`RowActionsTrigger`; `SettingsGearButton`; `LONG_PRESS_SURFACE_STYLE` + `useLongPress`.
- **Recipes hand-rolled**:
  - `header bar` — `:69-81` — title `fontSize:30, fontWeight:700, color:'#f0f4f8'`; transparent icon buttons.
  - `card (case row)` — `:142-164` — `borderRadius:16, border:GLASS.borderSoft, background:GLASS.gradientCardDiag, overflow:hidden`; case number mono `fontSize:17, fontWeight:600`; status chip `padding:'3px 9px', borderRadius:20, border:1px solid status.border, background:status.bg`.
  - `empty state` — `:84` — `fontSize:14, color:'#7a9fc4', fontStyle:italic`.
  - `divider` — `:189` — `height:1, background:'#1e3a5f', marginBottom:12`.
  - `button row (Import / Add Location)` — `:206-209` — `flex:1, padding:10`, `glassBtnSecondary`/`Primary`, `fontSize:13, fontWeight:600`.
  - `card (location row, nested)` — `:239-250` — `borderRadius:8, border:GLASS.borderSoft, background:GLASS.gradientCardDiag`; name `fontSize:14, fontWeight:600`; pill `padding:'3px 8px', borderRadius:12, background:loc.status.bg`.
  - `empty state (no locations)` — `:204` — `fontSize:13, color:'#7a9fc4', fontStyle:italic, padding:'6px 0 14px'`.
- **Notes**: Status colours are data-driven from `screenData.ts` (`caseStatusTheme` / `locationStatusTheme`, §1.4). Single-open row-actions state + focus-return-to-trigger on close (`:175-181`, `:262-264`) is behavioural — preserve.

### `screens/CompletionScreen.tsx` (154 lines)
- **Replicates**: phone Completion & Review (`app/(form)/completion.tsx`).
- **Shared chrome used**: `DateTimeField`, `Field`, `SectionCard`, `WizardHeader`; `GLASS`, `glassBtnPrimary`, `glassBtnSecondary`.
- **Recipes hand-rolled**:
  - `success state (Location Complete)` — `:66-75` — check badge `84×84, borderRadius:42, background:'rgba(16,209,119,0.13)', border:'1px solid rgba(16,209,119,0.35)'`; title `fontSize:24, fontWeight:700`; body `fontSize:14, color:'#9fc0db', maxWidth:280`.
  - `button stack (3 CTAs)` — `:72-74` — full-width, `padding:14, fontSize:15, fontWeight:600`.
  - `alert banner (validation errors)` — `:87-92` — `borderRadius:12, border:GLASS.borderError, background:'rgba(255,71,87,0.06)', padding:16`; title `fontSize:14, fontWeight:700, color:'#ff6b7a'`; rows `fontSize:13, color:'#ff9aa5'`.
  - `card (summary, accent)` — `:94-106` — `borderRadius:14, border:GLASS.borderAccent, background:'linear-gradient(180deg,rgba(26,45,68,0.9),rgba(19,34,54,0.96))', boxShadow:'0 0 22px rgba(43,140,193,0.12)'`; OCC mono `fontSize:18, fontWeight:700`.
  - `list row (Row helper)` — `:51-58` — label `fontSize:13, color:'#7a9fc4'`; value `fontSize:13, color:'#cdd9e6', maxWidth:'62%'`.
  - `outline button (Preview/Export PDF)` — `:123-126` — `border:'1px solid #2B8CC1', background:transparent, color:'#4BA3D4', borderRadius:10, padding:13`.
  - `secondary button (Export Zip, offset preview)` — `:128`, `:132-141` — `glassBtnSecondary`, disabled `opacity:0.45, cursor:not-allowed`.
  - `primary CTA (Complete & Save)` — `:142-150` — `glassBtnPrimary, padding:15, fontWeight:700`, conditional `boxShadow:'0 6px 18px rgba(37,128,173,0.35)'`.
- **Hardcoded literals**: the `boxShadow` at `:147` **duplicates `WizardNext`'s at `_shared.tsx:414` byte-for-byte** (§4.1). Its gradient at `:96` is a **near-miss** of `GLASS.gradientPanel` (0.9/0.96 vs 0.88/0.95) — one of the exact "near-miss variants" deferral §31 names.
- **Notes**: Uses the HTML `disabled` attribute (`:135`, `:145`) where the rest of the codebase uses `aria-disabled` — an inconsistency worth resolving in the port. `p.isComplete` branches to a wholly different layout.

### `screens/DashboardScreen.tsx` (214 lines)
- **Replicates**: phone Dashboard "Recent Activity" timeline (`app/(tabs)/home.tsx`, `DashboardCaseCard.tsx`, `TimelineItem`).
- **Shared chrome used**: `GLASS`; `SettingsGearButton`; `LONG_PRESS_SURFACE_STYLE` + `useLongPress`.
- **Recipes hand-rolled**:
  - `header bar` — `:50-55` — title `fontSize:30, fontWeight:700`.
  - `section header` — `:56-58` — mono uppercase `fontSize:11, color:'#7a9fc4', letterSpacing:1.5`.
  - `timeline marker + connector` — `:105-110` — glow dot `16×16, borderRadius:8, background:status.color, opacity:0.4, filter:blur(3px)` behind a `12×12` ring `border:2px solid status.color`; connector `width:2, background:'#1e3a5f'`.
  - `card (case, diagonal)` — `:113-125` — `borderRadius:16, border:GLASS.borderSoft, background:GLASS.gradientCardDiag, padding:16` + `LONG_PRESS_SURFACE_STYLE`.
  - `status chip` — `:130-132` — `padding:'4px 10px', borderRadius:20, border:1px solid status.border, background:status.bg`.
  - `icon button (⋯)` — `:137-147` — transparent circle.
  - `chip (personnel)` — `:154-158` — `padding:'6px 10px', background:'#1a2d44', borderRadius:8`.
  - `pill (location)` — `:166-169` — `padding:'7px 12px', borderRadius:20, border:GLASS.borderAccent, background:'rgba(43,140,193,0.10)'`.
  - `pill (+N more)` — `:174-182` — `borderRadius:20, border:none, background:'#1a2d44'`.
  - `expanded list row` — `:195-207` — `borderRadius:8, border:GLASS.borderSoft, background:GLASS.gradientCardDiag, padding:'10px 12px'`; badge `padding:'3px 8px', borderRadius:12`.
  - `divider` — `:192` — `borderTop:GLASS.border`.
- **Hardcoded literals**: `#1a2d44` (`:154`, `:179`) — un-tokenized navy; `rgba(43,140,193,0.10)` — a **third** alpha of the accent alongside `0.08` (token) and `0.14`.
- **Notes**: `DASHBOARD_CASE_LIMIT = 5`, `VISIBLE_LOCATION_COUNT = 1` (`:18`, `:21`). `slideBack` staggered entrance (`:102`, `animationDelay: 100 + index*100ms`), gated by `useReducedMotion`.

### `screens/DateDisambiguationWarning.tsx` (88 lines)
- **Replicates**: phone `src/features/ocr-time-capture/components/DateDisambiguationWarning.tsx` (ui-mapping 06) — same render order, copy, and early return on `'high'` confidence.
- **Shared chrome used**: **none** — no `_shared`/`glass-tokens`/`input-theme` imports at all.
- **Recipes hand-rolled**:
  - `alert/warning card` — `:36-46` — `borderRadius:12, border:'2px solid #ffd93d', borderLeftWidth:4, background:'rgba(255,217,61,0.06)', padding:16`.
  - `icon badge` — `:48-64` — `28×28, borderRadius:14, border:2px solid WARNING, color:WARNING, fontSize:18, fontWeight:700`.
  - `nested inset box` — `:70-72` — `padding:10, borderRadius:4, background:'rgba(13,27,42,0.7)'`.
  - `two-column comparison rows` — `:74-85` — labels `fontSize:11, color:'#7a9fc4'`; values `fontSize:13, fontWeight:500`.
- **Hardcoded literals**: `WARNING = '#ffd93d'` (`:6`), documented as "Phone dark-theme `colors.warning`".
- **Notes**: **The asymmetric border** (`borderLeftWidth: 4` over a `2px` base) is easy to lose in a restyle. `:27-28` explicitly deviates from the phone's `Card` in favour of "the demo's inline glass idiom" while keeping the yellow verbatim.

### `screens/DeleteConfirmationModal.tsx` (211 lines)
- **Replicates**: phone `DeleteConfirmationModal` (ui-mapping 11) — a **centred fade-in overlay card**, deliberately NOT `ModalShell`'s bottom sheet and NOT `AlertDialog` (rationale at `:8-38`: different scrim-dismiss behaviour, structured non-string body).
- **Shared chrome used**: `PhoneOverlayPortal`; `GLASS`, `glassBtnSecondary`.
- **Recipes hand-rolled**:
  - `dialog shell (centred card)` — `:98-121` — `position:absolute, left/right:24, top:50%, transform:translateY(-50%), borderRadius:16, border:GLASS.borderSoft, background:GLASS.gradientPanel, boxShadow:'0 24px 60px rgba(0,0,0,0.55)', padding:'20px 20px 16px', animation:'screenIn 0.2s ease'`.
  - `scrim` — `:93-97` — `inset:0, background:'rgba(4,8,14,0.66)'` (**darker than `ModalShell`'s `0.55`**).
  - `icon (trash)` — `:124-129` — 48px, `stroke:ERROR`.
  - `title` — `:132-134` — `fontSize:19, fontWeight:700, textAlign:center`.
  - `detail label/value` — `:61-62` — label `fontSize:12, fontWeight:600, color:'#7a9fc4'`; value `fontSize:14.5, color:'#f0f4f8'`.
  - `scrollable bullet list` — `:150-162` — `maxHeight:150, overflowY:auto, background:'#132236', borderRadius:10, padding:12`.
  - `button row` — `:189-206` — Cancel `glassBtnSecondary`; **Confirm is a hand-rolled destructive button** `borderRadius:10, border:none, background:'#ff4757', color:'#fff'` — there is no shared danger-button recipe.
- **Hardcoded literals**: `ERROR='#ff4757'` (`:65`) = `T.error`, redeclared; `WARNING='#ffd93d'` (`:66`) — the third file to redeclare it; `#132236` (`:152`) = **`glassBtnSecondary.background` exactly** (`glass-tokens.ts:65`), hardcoded.
- **Notes**: **`zIndex: 60/61`** (`:96`, `:111`) — a second, unshared copy of `AlertDialog`'s numbers, outside the `MODAL_*` scheme. Its focus trap/return is a **hand-rolled second implementation** of `ModalShell`'s (`:73-87`) — a "modal shell" rolled a second, centred way. `isDeleting` deliberately not ported (`:31-35`).

### `screens/DuplicateLocationModal.tsx` (209 lines)
- **Replicates**: phone `DuplicateLocationModal` (ui-mapping 02 + 11) — the location action chooser.
- **Shared chrome used**: `Field`, `ModalShell`; `GLASS`, `glassBtnPrimary`, `glassBtnSecondary`.
- **Recipes hand-rolled**:
  - `stacked action button` — `:49-56` + `:78-107` — `width:100%, padding:13, fontSize:15, fontWeight:600` over the glass button bases; `aria-disabled` dim `opacity:0.45, cursor:not-allowed`.
  - `section caption + divider` — `:58-63`, `:110-117` — `marginTop:8, paddingTop:16, borderTop:GLASS.border`; caption `fontSize:13, fontWeight:500, color:'#99badd'`.
  - `live-region error text` — `:165-171` — `fontSize:12, color:'#ff6b78'`.
- **Hardcoded literals**: `#ff6b78` — error-red #3.
- **Notes**: `newLocationBlock()` (engine, shared with `NewLocationModal` via `new-location-gate.ts`) drives which buttons are disabled. Deliberately no autofocus (`:20-22`).

### `screens/DvrInfoScreen.tsx` (224 lines)
- **Replicates**: phone DVR Information wizard screen (`app/(form)/dvr-information.tsx`).
- **Shared chrome used**: `Field`, `SectionCard`, `SelectField`, `WizardHeader`, `WizardNext`; `GLASS`; `DateField`.
- **Recipes hand-rolled**:
  - `checkbox pill (recording schedule)` — `:126-157` — `role="checkbox"`, `flex:1, padding:'11px 12px', borderRadius:8`; on `#2B8CC1` / `rgba(43,140,193,0.14)`, off `#1e3a5f` / `#0d1b2a`; glyph box `16×16, borderRadius:4`.
  - `stat card (Total DVR Retention)` — `:179-183` — `borderRadius:10, border:GLASS.borderAccent, background:'rgba(43,140,193,0.08)', padding:14`; number `fontSize:24, fontWeight:700, fontVariantNumeric:'tabular-nums'`.
  - `list row (retention scope + badge)` — `:192-200` — `borderRadius:10, border:GLASS.borderSoft, background:'rgba(13,27,42,0.6)'`; badge `fontSize:11, fontWeight:700, uppercase, borderRadius:6, padding:'3px 8px'` with `st.color/bg/border`.
  - `empty state` — `:211-215` — `fontSize:12, color:'#7a9fc4', fontStyle:italic, padding:'4px 2px'`.
- **Hardcoded literals**: the local `STATUS` map (`:20-26`) — **a fourth status-colour owner** (§1.4). `#2B8CC1`, `#1e3a5f`, `#0d1b2a` all bare where `T` names them.
- **Notes**: Three `SectionCard`s each render only if ≥1 contained field is visible (`:84-86`) — **hide the whole card, not just the fields** (rationale `:66-68`, R-8 note `:207-210`); preserve.

### §3.2 Modal, export, notes and splash screens (E–Z)

### `screens/EditIncidentLocationModal.tsx` (89 lines)
- **Replicates**: phone `EditIncidentLocationModal` (ui-mapping 03:269-300 and 11:165-207); v1 matrix row **23**.
- **Shared chrome used**: `ModalActions`, `ModalShell`; `IncidentLocationFields`.
- **Recipes hand-rolled**: `banner` — `:55-64` — `padding:12, borderRadius:10, border:'1px solid #ff4757', background:'rgba(255,71,87,0.12)', color:'#ff8a94', fontSize:13, fontWeight:500, marginBottom:14`.
- **Hardcoded literals**: `#ff4757`/`rgba(255,71,87,0.12)` (`:58-59`) — `T.error` family, not imported; `#ff8a94` is error-red #6.
- **Notes**: The banner has a single trigger (reverse-geocode failure) vs the phone's two.

### `screens/ExportActionSheet.tsx` (248 lines)
- **Replicates**: phone `src/components/export/ExportActionSheet.tsx` (P5.3, v1 matrix row **27**). Reached only from Completion, not the Export tab.
- **Shared chrome used**: `GLASS` (`gradientPanel`, `border`, `borderSoft`); `PhoneOverlayPortal`. **Does NOT use `ModalShell`** — a bespoke bottom sheet.
- **Recipes hand-rolled**:
  - `scrim` — `:87-93` — `inset:0, zIndex:30, background:'rgba(4,8,14,0.55)'`.
  - `sheet shell` — `:161-175` — `left/right:12, bottom:12, zIndex:31, borderRadius:16, border:GLASS.borderSoft, background:GLASS.gradientPanel, boxShadow:'0 -10px 40px rgba(0,0,0,0.5)', animation:'sheetUp 0.28s ease'`.
  - `sheet header bar` — `:177-179` — `padding:'14px 18px', borderBottom:GLASS.border`; title `fontSize:16, fontWeight:600, color:'#f0f4f8'` centred.
  - `menu row` — `:196-213` — `minHeight:58, padding:'12px 18px'`, transparent; cancel row `marginTop:4, borderTop:GLASS.border`.
  - `row label + description` — `:216-230` — label `fontSize:15, fontWeight:600` (`#ff6b7a` tinted or `#f0f4f8`); description `fontSize:12.5, color:'#7a9fc4', marginTop:2`.
  - `divider` — `:236-239` — `height:1, background:'#1e3a5f', opacity:0.6, marginLeft:52`.
  - `icon (3 SVG variants)` — `:48-85` — `22×22, strokeWidth:1.8`, colour `#ff6b7a` or `#4BA3D4`.
- **Notes**: Hand-rolled roving `role="menu"` arrow traversal (`:131-141`); focus-trap mirrors the `AlertDialog` idiom. Its `zIndex 30/31` **collides numerically with `PICKER_SHEET_Z = 31`**.

### `screens/ExportInfoScreen.tsx` (41 lines)
- **Replicates**: phone Export Info wizard screen.
- **Shared chrome used**: `Field`, `SectionCard`, `SelectField`, `Toggle`, `WizardHeader`, `WizardNext`.
- **Recipes hand-rolled**: **none** — 100% shared-chrome composition. Only `minHeight:786, paddingBottom:40` + `padding:16` (`:25`, `:27`), the standard wizard shell.
- **Notes**: **This is the target shape.** Every wizard screen could look like this if the recipes it needs existed in `_shared`.

### `screens/ExportModal.tsx` (390 lines)
- **Replicates**: phone's unified `src/components/export/ExportModal.tsx` — progress + validation in one container (RN can't run two `Modal`s). P5.3, v1 matrix row **25**.
- **Shared chrome used**: `GLASS` (`accentFrom`, `borderSoft`, `gradientPanel`, `border`, `borderError`), `glassBtnPrimary`, `glassBtnSecondary`; `PhoneOverlayPortal`.
- **Recipes hand-rolled**:
  - `srOnly` — `:67-77` — `width:1, height:1, margin:-1, clip:'rect(0 0 0 0)'`.
  - `scrim` — `:79-85` — `inset:0, zIndex:40, background:'rgba(4,8,14,0.66)'`.
  - `progress overlay` — `:138-148` — `inset:0, zIndex:41`, centred column, `padding:24`.
  - `spinner` — `:150-165` — `40×40, borderRadius:20, border:'3px solid rgba(43,140,193,0.25)', borderTopColor:GLASS.accentFrom, animation:'spin 0.9s linear infinite'` gated by `useReducedMotion`.
  - `progress text stack` — `:166-178` — stage `fontSize:17, fontWeight:600, '#f0f4f8'`; label `fontSize:14, '#9fc0db'`; location `fontSize:13, '#7a9fc4', italic`.
  - `alertdialog shell` — `:253-268` — centred card `left/right:16, top:'50%', translateY(-50%), borderRadius:16, border:GLASS.borderSoft, background:GLASS.gradientPanel, boxShadow:'0 24px 60px rgba(0,0,0,0.55)', padding:'20px 18px 16px', animation:'screenIn 0.2s ease'` — **the third copy of this exact dialog shell** (with `AlertDialog`, `DeleteConfirmationModal`).
  - `status icon` — `:272-283` — 44×44, `#ff6b7a` or `#f5a623`.
  - `title/description` — `:285-290` — `fontSize:17, fontWeight:700`; `fontSize:13, '#9fc0db', lineHeight:1.5`.
  - `nested scroll card` — `:291-303` — `maxHeight:200, overflowY:auto, borderRadius:12, border:GLASS.border, background:'rgba(13,27,42,0.6)', padding:14`.
  - `list row (invalid location)` — `:305-317` — bullet; name `fontSize:13, fontWeight:600`; error line `fontSize:12, '#ff9aa5', marginLeft:22`.
  - `dual button row` — `:326-361` — `flex:1, padding:12, fontSize:14.5, fontWeight:600`; disabled `opacity:0.5`.
- **Hardcoded literals**: `#f5a623` (`:272-283`) — a **third amber**, one-off; `rgba(43,140,193,0.25)` (`:157`) = `T.primaryEdge`, hardcoded.
- **Notes**: Progress mode is deliberately non-dismissible; validation mode's Escape/scrim gated on `!isExporting`. Both use the "announce on next tick" live-region idiom.

### `screens/ExtractedScopeScreen.tsx` (47 lines)
- **Shared chrome used**: `DateTimeField`, `Field`, `WizardHeader`, `WizardNext`; `glassCard`, `glassBtnSecondary`.
- **Recipes hand-rolled**:
  - `info banner` — `:23-25` — `fontSize:13, color:'#9fc0db', lineHeight:1.5, padding:12, borderRadius:10, border:'1px solid rgba(43,140,193,0.25)', background:'rgba(43,140,193,0.07)'`; strong `#cfe6f5`.
  - `empty state` — `:27` — `fontSize:13, '#7a9fc4', italic, textAlign:center, padding:'14px 0'`.
  - `card header row (title + Remove)` — `:31-36` — title `fontSize:15, fontWeight:700, '#f0f4f8'`; Remove `'#ff7a85', fontSize:13`.
  - `secondary full-width button` — `:42` — `glassBtnSecondary, padding:12, fontSize:14, fontWeight:600`.
- **Hardcoded literals**: `rgba(43,140,193,0.25)` = `T.primaryEdge`; `rgba(43,140,193,0.07)` a **near-miss** of `T.primarySoft`'s `0.08`. Both are the exact pair deferral §31 names ("`1px solid rgba(43,140,193,0.25)` — ImportModal picker card + ExtractedScope info banner, 2×").
- **Notes**: The card + Remove header pattern is near-identical to `RequestedScopeScreen.tsx:43-48`.

### `screens/ImportModal.tsx` (295 lines)
- **Replicates**: phone `ImportFlowModal.tsx` (multi-stage: picker → paste → progress → result), rebuilt over the demo's real failure modes per owner decision D5.
- **Shared chrome used**: `ModalShell`; `PickerStage`, `PasteStage`, `ImportResultBody`, `ImportResultAccordion`, `ImportTerminalProgress`; `GLASS`, `glassBtnPrimary`, `glassBtnSecondary`.
- **Recipes hand-rolled**:
  - `secondaryBtn`/`primaryBtn` — `:133-134` — glass base + `fontSize:15, fontWeight:600`.
  - `collapsible disclosure (Technical Details)` — `:143-170` — toggle `fontSize:13, fontWeight:600, '#99badd'`; chevron rotates 180°; `<pre>` `background:'#0a1626', border:GLASS.borderSoft, stmono, fontSize:11, lineHeight:16px, color:'#8aa3bd'`.
  - `nested card (Data Found)` — `:181-185` — `borderRadius:10, border:GLASS.borderSoft, background:'rgba(26,45,68,0.45)', padding:'10px 12px'`.
  - `error card (Failures)` — `:190-197` — `borderRadius:10, border:GLASS.borderError, background:'rgba(255,71,87,0.08)', padding:'10px 12px'`; heading `fontSize:12, fontWeight:700, '#ff8a93'`.
  - `failure icon + message` — `:245-250` — 42×42 red circle-alert, `stroke:'#ff4757'`; message `fontSize:15, '#ff8a93', lineHeight:1.5`.
  - `success badge` — `:258-263` — 38×38 circle `background:'rgba(16,209,119,0.13)', border:'1px solid rgba(16,209,119,0.3)'`, check `stroke:'#10d177'`; title `fontSize:18, fontWeight:700`.
  - `notice banner (sample fallback)` — `:266`, `:282` — `fontSize:12.5, color:'#ffd07a', background:'rgba(255,200,90,0.1)', border:'1px solid rgba(255,200,90,0.28)', borderRadius:8, padding:'8px 12px'`.
  - `two-button footer` — `:268-271`.
- **Hardcoded literals**: `#0a1626` and `#8aa3bd` are one-offs; the sample-amber family `rgba(255,200,90, 0.1/0.12/0.28/0.3)` — **four alphas of one un-tokenized colour** across this file and the media screens.
- **Notes**: `openIndex` single-open accordion resets on new result (H1 fix). `ERROR_MESSAGES` is a friendly-copy map keyed by `ImportErrorCode`.

### `screens/ImportResultAccordion.tsx` (64 lines)
- **Shared chrome used**: `ImportResultBody`; `glassBtnPrimary`.
- **Recipes hand-rolled**:
  - `accordion wrap` — `:16-22` — `border:'1px solid rgba(43,140,193,0.2)', borderRadius:12, background:'rgba(13,27,42,0.5)', marginBottom:10, overflow:hidden`.
  - `accordion header button` — `:29-49` — `padding:'12px 14px'`, transparent; status dot `9×9, borderRadius:5, background:'#10d177', boxShadow:'0 0 6px rgba(16,209,119,0.6)'`; title `fontSize:14, fontWeight:600` ellipsised; subtitle mono `fontSize:12, '#7fa8cc'`.
  - `sample-data chip` — `:41-45` — `fontSize:10, fontWeight:700, letterSpacing:0.8, uppercase, '#ffd07a', background:'rgba(255,200,90,0.12)', border:'1px solid rgba(255,200,90,0.3)', borderRadius:6, padding:'2px 7px'`.
  - `chevron` — `:46-48` — rotates 180° on open, `transition:'transform 0.2s'`.
  - `expand panel + primary button` — `:50-60`.
- **Hardcoded literals**: `#7fa8cc` — one-off; the dot glow `0 0 6px rgba(16,209,119,0.6)` is a **1px near-miss** of `WizardDrawer.tsx:79`/`ExploreChecklist.tsx:90`'s `0 0 7px`.

### `screens/ImportResultBody.tsx` (93 lines)
- **Shared chrome used**: **none** — no `_shared`/`glass-tokens`/`input-theme` imports; entirely local constants.
- **Recipes hand-rolled**:
  - `card (section wrapper)` — `:6-13` — `borderRadius:12, border:'1px solid rgba(43,140,193,0.18)', background:'linear-gradient(180deg,rgba(26,45,68,0.6),rgba(19,34,54,0.7))', padding:'12px 14px', marginBottom:10`.
  - `heading` — `:14-21` — `fontSize:11, fontWeight:700, letterSpacing:0.5, uppercase, '#7fa8cc'`.
  - `list row` — `:43-46` — flex space-between, hairline `borderTop:'rgba(255,255,255,0.05)'`, mono value for a `MONO_LABELS` set.
  - `header block` — `:31-37` — title `fontSize:15, fontWeight:600`; case number mono `fontSize:13, '#7fa8cc'`; counts `fontSize:12, '#9fc0db'`.
  - `scope row` — `:55-74` — label `fontSize:11, fontWeight:700, '#cfe6f5'`; time-domain pill `fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:4` green `#7fe3b4`/`rgba(16,209,119,0.12)` or amber `#ffd07a`/`rgba(255,200,90,0.12)`; range mono `fontSize:12.5`.
  - `disclosure (warnings)` — `:80-90` — native `<details>`; summary `fontSize:13, '#9fc0db'`; list `fontSize:12.5, lineHeight:1.5`.
- **Hardcoded literals**: the card gradient at `:6-13` is a **near-miss re-derivation of `GLASS.gradientCard`** — same shape, different stops (`0.6→0.7` vs `0.85→0.92`). Deferral §31 names this exact one ("ImportResultBody 0.6/0.7 card"). `#7fe3b4` is a **fourth** green.
- **Notes**: `MONO_LABELS` (a `Set`) drives conditional `fontFamily` per row — the only logic-driven style in the file. Deferral §17 records the string-coupling with the builder.

### `screens/NewCaseModal.tsx` (313 lines)
- **Replicates**: phone `NewCaseModal.tsx`, discriminated on `mode: 'create' | 'edit'` exactly as the phone types it.
- **Shared chrome used**: `Accordion`, `Field`, `ModalActions`, `ModalShell`; `AlertDialog`; `AddressAutocomplete`; `GLASS.border`, `GLASS.borderError`.
- **Recipes hand-rolled**:
  - `sectionLabel` — `:43-50` — `fontSize:12, fontWeight:700, letterSpacing:0.4, uppercase, '#7a9fc4', margin:'2px 0 10px'`.
  - **`coordInput`** — `:52-61` — `borderRadius:8, border:GLASS.border, background:'#0d1b2a', color:'#f0f4f8', fontSize:15, padding:'11px 12px'` — **a byte-identical re-derivation of `_shared.tsx`'s private `fieldInput` (`:186-195`)**. See §4.1.
  - `coordinate field` — `:64-90` — error state `borderColor:'#ff4757'`, error text `fontSize:12, '#ff6b78'`.
  - `submit-error banner` — `:201-208` — `borderRadius:10, border:GLASS.borderError, background:'rgba(255,71,87,0.08)', padding:'10px 12px', fontSize:13, fontWeight:500, '#ff6b78'`.
  - `coordinate chip` — `:275-281` — mono coordinate `fontWeight:600`; source label `'#7a9fc4'`.
  - `two-column coordinate row` — `:255-274` — `display:flex, gap:12`.
- **Notes**: `AlertDialog` used for the immutable-case-number confirmation. `submitBlocked` on `ModalActions` deliberately unguarded so verbatim phone error copy can render. Edit mode locks case number via `readOnly`.

### `screens/NewLocationModal.tsx` (227 lines)
- **Replicates**: phone `NewLocationModal.tsx` (ui-mapping 11:64-112).
- **Shared chrome used**: `Field`, `ModalActions`, `ModalShell`; `LocationFields`; engine `newLocationBlock`/`NEW_LOCATION_BLOCK_MESSAGES`.
- **Recipes hand-rolled**: `blocked-reason live region` — `:204-210` — `role="status", fontSize:12, color:'#ff6b78'`; the wrapper renders unconditionally so the region exists before content.
- **Notes**: **The thinnest hand-rolled modal surface in the set** — almost pure composition. Another target shape.

### `screens/NotesScreen.tsx` (432 lines)
- **Replicates**: phone's seven-section Notes editor (P2.1, ui-mapping 08).
- **Shared chrome used**: `WizardHeader`, `WizardNext`; `AlertDialog` (**four distinct confirmation flows**: reset / restoreSection / restoreAll / scrapAll).
- **Recipes hand-rolled**:
  - Forced-dark palette — `:49-55` — `PANEL_BG '#060a12'`, `PANEL_BORDER '1px solid #141c28'`, `TEXT '#dfe9f3'`, `DIM '#7a93ad'`, `PRIMARY '#4BA3D4'`, `WARNING '#ffd93d'`, `MONO` (JetBrains).
  - `bodyText` (borderless auto-grow textarea) — `:57-69` — `border:none, outline:none, resize:none, background:transparent, color:TEXT, fontSize:13, lineHeight:24px, fontFamily:MONO`.
  - `linkBtn` — `:71-80` — `fontSize:12.5, fontWeight:600, color:PRIMARY`, transparent.
  - `terminal panel shell` — `:385` — `borderRadius:12, border:PANEL_BORDER, background:PANEL_BG, height:500, overflowY:auto, padding:14`.
  - `taken-over banner` — `:387-392` — `borderRadius:10, border:'1px solid rgba(30,58,95,0.6)', background:'rgba(13,27,42,0.7)', padding:'9px 12px'`.
  - `manually-edited rail` — `:185-190` — `borderLeft:'3px solid rgba(255,217,61,0.9)'` (stale) or `'rgba(75,163,212,0.55)'` (edited), `paddingLeft:10`.
  - `stale preview card` — `:210-220` — `borderRadius:10, border:'1px solid rgba(255,217,61,0.25)', background:'rgba(255,217,61,0.06)', padding:'10px 12px'`; label `fontSize:9.5, letterSpacing:1.2, color:WARNING`.
  - `restore row` — `:167-179` — mono uppercase section label + status + Restore link.
  - `addendum sub-input` — `:144-161` — `fontSize:12.5, color:'#a9c2d8', borderLeft:'2px solid rgba(122,147,173,0.4)', paddingLeft:10, marginTop:6`.
  - `+ add note ghost link` — `:225-231` — `color:DIM, opacity:0.5, fontWeight:500`.
  - `sticky footer row` — `:419-426` — `padding:'2px 4px 12px'`.
- **Hardcoded literals**: **an intentional divergence, not drift.** The forced-dark terminal palette (`#060a12`/`#141c28`/`#dfe9f3`) deliberately does not reuse `T.bg`/`T.text`. `WARNING '#ffd93d'` matches `TimeOffsetScreen.tsx:48`'s constant exactly — two independent declarations.
- **Notes**: Heaviest screen in the set. Auto-grow hook, commit-on-blur-and-unmount with ref-mirrored flush closures, memoised `SectionBlock` to avoid full re-render per keystroke. A restyle must not break the memo boundary.

### `screens/RequestedScopeScreen.tsx` (68 lines)
- **Shared chrome used**: `AddRowButton`, `DateTimeField`, `Field`, `WizardHeader`, `WizardNext`; `GLASS.borderBtn`, `glassCard`.
- **Recipes hand-rolled**:
  - `TimeTypeButton (segmented toggle)` — `:19-29` — `flex:1, padding:10, borderRadius:8`; active `border:none, background:'#2B8CC1', color:'#fff'`; inactive `border:GLASS.borderBtn, background:transparent, color:'#99badd'`.
  - `card header row` — `:43-48` — **identical to `ExtractedScopeScreen.tsx:31-36`**.
- **Hardcoded literals**: `#2B8CC1` = `T.primary`; `#ff7a85` duplicates `ExtractedScopeScreen`'s exactly.

### `screens/RowActions.tsx` (121 lines)
- **Replicates**: a **web adaptation, not a gesture port**, of the phone's `SwipeDeleteAction`/`ReanimatedSwipeable` — hold-to-reveal tray + always-visible trigger (parity plan §5 P3.1).
- **Shared chrome used**: `GLASS.borderBtn`, `glassBtnSecondary`.
- **Recipes hand-rolled**:
  - `icon button (kebab)` — `:57-81` — `padding:'0 12px'`, transparent; colour `open ? '#f0f4f8' : '#7a9fc4'`; 18×18 SVG.
  - `action tray` — `:84-90` — `role="group", display:flex, gap:8, padding:'8px 12px 12px'`.
  - `danger button` — `:106-108` — `borderRadius:10, border:none, background:'#ff4757', color:'#fff'`; non-danger falls back to `glassBtnSecondary` + `GLASS.borderBtn`.
  - `delete icon` — `:111-115` — 15×15, `strokeWidth:1.9`.
- **Hardcoded literals**: `ERROR='#ff4757'` (`:40`) — `T.error`, redeclared. **This and `DeleteConfirmationModal.tsx:202` are the two danger-button implementations; neither is shared.**
- **Notes**: Long-press (500ms) reveals the tray **in flow below the row**, not as an overlay. Single-open state lives in the caller (`CasesScreen`).

### `screens/SettingsGearButton.tsx` (31 lines)
- **Replicates**: phone `MainHeader` settings affordance (`src/components/layout/MainHeader.tsx:64-73`).
- **Shared chrome used**: none.
- **Recipes hand-rolled**: `icon button` — `:16-23` — `padding:2`, transparent. `gear icon` — `:25-28` — 24×24, `stroke:'#2B8CC1', strokeWidth:1.7` (Ionicons `settings-outline` at the phone's size/colour).

### `screens/SplashScreen.tsx` (170 lines)
- **Replicates**: the **simulated** biometric-lock boot splash (v1 matrix rows **1-2**, decision D7); phone `BiometricScannerHUD` / `scanner-hud-constants.ts`.
- **Shared chrome used**: **none whatsoever** — the one full outlier; it predates and bypasses the entire token system.
- **Recipes hand-rolled**:
  - `bracket()` corner-frame — `:22` — `position:absolute, 38×38` + per-corner border sides, `4px solid #2B8CC1`, applied 4× at `:106-109`.
  - `status text` — `:23` — stmono, `fontSize:23, letterSpacing:6`.
  - `HUD glow disc` — `:110` — `inset:26, borderRadius:16, background:'rgba(43,140,193,0.14)', boxShadow:'0 0 48px 8px rgba(43,140,193,0.30)'`.
  - `scan sweep line` — `:112` — `height:2, background:'linear-gradient(90deg,transparent,#2B8CC1,transparent)', animation:'hudScan 2s linear infinite'`, gated by `!reduceMotion`.
  - `title` — `:91-101` — stmono, `fontSize:18, letterSpacing:8, color:'#2B8CC1', uppercase, animation:'flicker 8s infinite'`.
  - `status body (3-state record)` — `:61-78` — idle `#2B8CC1`; scanning + 3 staggered `blinkDot 1.2s` dots; authorized `#30D158` + `ACCESS GRANTED` `rgba(48,209,88,0.7)`.
  - `disclosure caption` — `:133-144` — `fontSize:11, lineHeight:1.5, letterSpacing:0.3, color:'rgba(153,186,221,0.70)'` (alpha tuned to 0.70 for AA per in-code comment).
  - `full-bleed tap target` — `:149-166` — `inset:0`, transparent, `aria-disabled` once scanning (stays mounted).
- **Hardcoded literals**: `#2B8CC1` used **12×** as a bare literal (`:61,63,96,106×4,107×2,108×2,109×2,112`); `#30D158` is a **fifth** green, unique to this file.
- **Notes**: `statusBody` is a total `Record<AuthState, ReactNode>` (R-9) so a new HUD state is a compile error. The **standing "simulated scan" disclosure line is load-bearing for the demo's honesty rule** — do not restyle it out of legibility.

### `screens/SubmissionScreen.tsx` (167 lines)
- **Replicates**: phone wizard step 1 `app/(form)/submission.tsx` (ui-mapping 05).
- **Shared chrome used**: `Field`, `SectionCard`, `WizardHeader`, `WizardNext`; `LocationFields`; `GLASS.border`.
- **Recipes hand-rolled**: `read-only case-number display` — `:147` — `borderRadius:8, border:GLASS.border, background:'#0d1b2a', color:'#f0f4f8', fontSize:15, padding:'11px 12px', opacity:0.6` — **the fourth copy of `fieldInput`'s values**, this one with `opacity` for the read-only look.
- **Notes**: `showRequester` hides the whole Requester `SectionCard` when all five fields are gated off (P7.3) — a section-level visibility derived from field-level gates.

### `screens/SyncStatusCard.tsx` (87 lines)
- **Replicates**: phone `SyncStatusCard` — NTP status / method / server / offset / uncertainty / delay / calibrated-at / traceability chain.
- **Shared chrome used**: `GLASS.border` (one use).
- **Recipes hand-rolled**:
  - `card` — `:44-51` — `padding:14, borderRadius:10`; synced `border:'rgba(16,209,119,0.3)', background:'rgba(16,209,119,0.06)'`; syncing `border:'#2a4a6f', background:'#0a1320'`.
  - `Row` — `:25-32` — `minHeight:22`; label `fontSize:12, '#7a9fc4'`; value mono, accent `'#4BA3D4', fontWeight:700` vs default `'#f0f4f8', fontWeight:500`.
  - `status line` — `:55-67` — spinner `14×14, stroke:'#4BA3D4', animation:'spin 0.9s linear infinite'`; synced `'#10d177', fontWeight:600`.
  - `traceability footer` — `:77-82` — `marginTop:8, paddingTop:8, borderTop:GLASS.border`; label `fontSize:10, '#7a9fc4'`; value `fontSize:10.5, '#9fc0db', italic`.
- **Hardcoded literals**: `#2a4a6f` (`:49`) is the colour inside `GLASS.borderBtn`, kept bare **because it sits inside a template conditional** — deferral §31 names this exact call site.
- **Notes**: Renders `null` entirely when neither syncing nor a result exists — no empty state.

### `screens/TimeOffsetScreen.tsx` (168 lines)
- **Replicates**: phone time-offset wizard screen (`app/(form)/time-offset.tsx`).
- **Shared chrome used**: `DateTimeField`, `SectionCard`, `switchKeyDown`, `WizardHeader`, `WizardNext`; `SyncStatusCard`; `AlertDialog`; `GLASS.borderAccent`, `GLASS.gradientPanel`, `glassCard`, `glassBtnPrimary`.
- **Recipes hand-rolled**:
  - `cell()` — `:45` — `fontSize:12.5, fontFamily:JetBrains`, colour parameterised.
  - `secondary outline button` — `:74` — `borderRadius:10, border:'1px solid #2B8CC1', background:transparent, color:'#4BA3D4'`.
  - `primary button (Calculate)` — `:75` — `glassBtnPrimary`, disabled `opacity:0.45`.
  - `outline icon button (Capture from DVR)` — `:77-80` — `border:'1px solid #2B8CC1', background:transparent, borderRadius:10, padding:12`.
  - `result hero card` — `:87-91` — `borderRadius:12, border:GLASS.borderAccent, background:GLASS.gradientPanel, padding:20, textAlign:center`; number `fontSize:34, fontWeight:700, JetBrains`.
  - `adjusted-scope card` — `:97-106` — `glassCard`; labels uppercase `fontSize:11, fontWeight:700, letterSpacing:0.5`, requested `'#7a9fc4'`, adjusted `'#4BA3D4'`.
  - **`custom switch (DST)`** — `:111-124` — hand-rolled `role="switch"`, `46×28` track `background: on?'#2B8CC1':'#1e3a5f'`, thumb `22×22`. **This duplicates `_shared.tsx`'s `Toggle` track (`:552-553`) verbatim** rather than reusing it.
  - `advisory banner (DST)` — `:129-136` — `padding:12, borderRadius:10, border:'1px dashed #ffd93d', background:'rgba(255,217,61,0.07)', fontStyle:italic, textAlign:center, color:'#ffd93d'` — **the only dashed border in the codebase besides `AddRowButton`'s**.
- **Notes**: `confirmRecalc` shows an `AlertDialog` only when `hasExtractedScopes` (destructive-regenerate guard).

### View-model / copy modules (no JSX, no styling except where noted)

| Module | Lines | Styling content |
|---|---|---|
| `screens/screenData.ts` | 213 | **Yes** — `caseStatusTheme` `:17-26` and `locationStatusTheme` `:34-43`. See §1.4. The canonical status source for case/location badges; `locationStatusTheme` is **test-pinned to equal `MAP_PIN_COLORS`**. |
| `screens/caseFormData.ts` | 134 | None. |
| `screens/exportNotices.ts` | 179 | None — pure copy tables for `AlertDialog`. |
| `screens/importResultData.ts` | 106 | None. `isSample: fallbackMode !== 'none'` is what drives the amber "Sample data" chip. |
| `screens/field-options.ts` | 7 | None — a re-export barrel over `engine/content/form-options`. |

### §3.3 Media, OCR and import-terminal screens (the big, self-palette files)

### `screens/MediaCaptureScreen.tsx` (952 lines)
- **Replicates**: phone `MediaCaptureFlow` + `VisionCameraScreen` + `PermissionsView` + `ModeToggle` + `CaptureButton` + `RecordingIndicator` + `PhotoPreview` + `VideoPreview` (`:24-26`, "parity P4.3, matrix rows 49–55, ui-mapping 09").
- **Shared chrome used**: `glassBtnPrimary`, `glassBtnSecondary`; `MetadataForm`; `useMediaCapture`. **No `_shared.tsx`** — a full-bleed camera overlay, not a modal.
- **Recipes hand-rolled**:
  - `full-bleed shell` — `:90-96` — `position:absolute, inset:0, zIndex:40, background:'#05080d'`.
  - `top controls row` — `:98-107` — absolute `top:44, padding:'0 16px', zIndex:4`.
  - `control button (48px circle scrim)` — `:110-123` — `48×48, borderRadius:24, background:'rgba(0,0,0,0.4)', color:'#fff', fontSize:20`.
  - `bottom gradient scrim bar` — `:125-133` — `padding:'18px 20px 26px', background:'linear-gradient(0deg,rgba(0,0,0,0.88),transparent)'`.
  - `mode toggle pill (segmented)` — `:144-162` — pill `background:'rgba(0,0,0,0.5)', borderRadius:20, padding:4`; option `padding:'8px 20px', borderRadius:16, background: active?'rgba(255,255,255,0.2)':'transparent', color: active?'#fff':'rgba(255,255,255,0.5)', fontSize:16, fontWeight:600`.
  - `permission/empty panel text` — `:164-172` — title `fontSize:22, fontWeight:600, '#fff'`; body `fontSize:15, 'rgba(255,255,255,0.7)', lineHeight:1.5, maxWidth:300`; notice `fontSize:12, lineHeight:1.45`.
  - `unavailable-camera panel` — `:434-450` — `background:'radial-gradient(ellipse at center,#0d1b2a,#05080d)'`.
  - `recording indicator badge` — `:469-499` — pill `background:'rgba(0,0,0,0.6)', borderRadius:20, padding:'8px 16px'`; blink dot `12×12, borderRadius:6, background:'#FF3B30', animation:'blinkDot 1s ease-in-out infinite'` (reduced-motion gated); timer `fontSize:16, fontWeight:600, fontVariantNumeric:'tabular-nums'`.
  - `failure / notice lines` — `:508-536` — `#ff8a93` failure, `#ffd07a` degraded, `#7a9fc4` blocked reason.
  - `shutter button` — `:637-666` — outer `80×80` circle `border:4px solid` (`#CCCCCC` photo / `#FFFFFF` video), `background: photo?#FFFFFF:transparent`; inner disc `video&&recording ? 32px/r6 : 64px/half`, `background: photo?#FFFFFF:#FF3B30`.
  - `switch-camera control` — `:570-582` — reuses `controlButton`, `opacity: isRecording?0.5:1`.
  - `permission stage shell` — `:691-778` — centred column `maxWidth:300`; status dot `10×10, borderRadius:5, background: denied?#FF3B30:#ffd07a`; primary `glassBtnPrimary, padding:'8px 16px', fontSize:14, fontWeight:600`.
  - `review stage header` — `:822-843` — `overflowY:auto, padding:'44px 20px 24px'`; title `fontSize:20, fontWeight:700, '#f0f4f8'`.
  - `photo/video preview frame` — `:848-861` — photo `aspectRatio:'4 / 3'`, video `'16 / 9'`, both `background:'#0a1320', borderRadius:10`, `objectFit:'contain'/'cover'`.
  - `"Sample data" badge + container` — `:870-899` — badge `fontSize:9, fontWeight:700, letterSpacing:0.8, uppercase, '#ffd07a', background:'rgba(255,200,90,0.12)', border:'1px solid rgba(255,200,90,0.3)', borderRadius:6, padding:'1px 6px'`; container `border:'1px solid rgba(255,200,90,0.3)', background:'rgba(255,200,90,0.08)', borderRadius:10, padding:12`.
  - `review action row` — `:916-949` — `glassBtnSecondary`/`Primary`, `padding:14, fontSize:15, fontWeight:600`.
- **Hardcoded literals**: `#05080d` ×3; `#0d1b2a` (`:444`) = `T.bg`, bare; **`#FF3B30`** — iOS system red, deliberately *not* the demo's `#ff4757`; `#0a1320` (see below); **four distinct black-scrim alphas** `rgba(0,0,0, 0.4/0.5/0.6/0.88)`, none tokenized.
- **Notes**: **The camera chrome is a separate palette by design** — phone-camera-native (iOS red, black scrims, white) rather than glass navy/cyan. A themed restyle must decide whether the camera surfaces follow the theme or stay native. `innerSize` (`:635`, `:659-661`) is load-bearing shutter-morph math. `aria-disabled` + `role="status"` idiom throughout explains the many `opacity: blocked?0.5:1` patterns.

### `screens/MediaLibrarySheet.tsx` (735 lines)
- **Replicates**: phone `MediaLibrarySheet` (ui-mapping 09; v1 matrix rows **57–66**) — tabs, list, inline preview, fullscreen, delete confirm.
- **Shared chrome used**: `ModalShell` (`:101`, with `fillBody`); `GLASS.border`/`GLASS.accentFrom`; `AlertDialog`; `PhoneOverlayPortal`; `useLongPress`/`LONG_PRESS_SURFACE_STYLE`.
- **Recipes hand-rolled**:
  - `tab bar (segmented, role=group)` — `:198-249` — `borderBottom:GLASS.border`; per-tab `padding:'11px 6px', borderBottom:'2px solid (accent|transparent)', color: active?GLASS.accentFrom:'#7a9fc4', fontSize:13, fontWeight: active?700:500`.
  - `tab count badge` — `:231-245` — `minWidth:20, borderRadius:10, padding:'1px 6px', fontSize:10, fontWeight:700, background: active?'rgba(43,140,193,0.16)':'rgba(255,255,255,0.06)'`.
  - `inline preview card (recessed inset)` — `:269-306` — `margin:'10px 10px 0', padding:8, borderRadius:12, border:'1px solid rgba(0,0,0,0.5)', background:'rgba(10,20,34,0.85)', boxShadow:'inset 0 4px 12px rgba(0,0,0,0.35)'` — the only inset shadow in the codebase.
  - `preview action buttons (glass 3D)` — `:708-721` — `32×32, borderRadius:16, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', borderTopColor:'rgba(255,255,255,0.14)', borderBottomColor:'rgba(0,0,0,0.3)', color:'#cdd9e6'`.
  - `media content frames` — `:409-439` — photo `4/3`, video `16/9`, `background:'#0a1320', borderRadius:8`; audio wrapped `padding:'18px 6px 10px'`.
  - `expired-media notice` — `:447-456` — `padding:'22px 16px', fontSize:12, lineHeight:1.55, color:'#ffd07a', background:'rgba(255,200,90,0.06)', border:'1px solid rgba(255,200,90,0.25)', borderRadius:8`.
  - `item-info panel` — `:468-490` — filename `fontSize:13, fontWeight:600, '#f0f4f8', wordBreak:'break-all'`; meta `fontSize:11, '#7a9fc4'`; caption `fontSize:12, italic, '#7a9fc4', minHeight:16`.
  - `fullscreen overlay` — `:336-404` — `inset:0, zIndex:40, background:'#000'`; close `40×40, borderRadius:20, background:'rgba(0,0,0,0.5)'`.
  - `empty state` — `:494-505` — `padding:'48px 32px'`; message `fontSize:16, fontWeight:500, '#7a9fc4'`; hint `fontSize:13, '#5d81a6'`.
  - `list row` — `:553-632` — `padding:'10px 14px'`; selected `background:'rgba(43,140,193,0.08)', borderLeft:'2px solid accent'`; filename `fontSize:13, fontWeight: selected?700:500`; delete icon `padding:'0 14px', '#7a9fc4'`.
  - `56×34 thumbnail card` — `:640-666` — `borderRadius:6, border:'1px solid rgba(255,255,255,0.04)', background:'rgba(0,0,0,0.35)'`.
  - `kind glyph SVGs` — `:669-694` — `stroke:'#5d81a6', strokeWidth:1.9`.
  - `sample badge` — `:723-735` — identical shape to `MediaCaptureScreen.tsx:880-893`.
- **Hardcoded literals**: `#0a1320` (see the cross-file note); `#5d81a6` — a **fourth** muted blue-grey alongside `#7a9fc4`, `#5d7a9a`, `#99badd`; `rgba(43,140,193, 0.08/0.12/0.16)` — three alpha steps of `T.primary`, only `0.08` tokenized.
- **Notes**: `useLongPress` gates delete-by-hold with `contextMenu:false` opt-out (destructive). `MediaPreview` is `key`-ed by item id to force remount on row switch (load-bearing, `:110-113`). Focus-restore mirrors `AlertDialog`'s shape verbatim.

### `screens/OcrCaptureScreen.tsx` (644 lines)
- **Replicates**: phone `CameraPermissions`/`CameraInstructions`/`BoundingBoxOverlay` aim stage + the OCR confirm screen (`app/(form)/ocr-capture.tsx`); owner directive P4.7 (`:79`), inline citations to `CameraInstructions.tsx:20` and `ocr-capture.tsx:282-317`.
- **Shared chrome used**: `GLASS`, `glassBtnPrimary`, `glassBtnSecondary`; `AlertDialog`; `DateTimeField`; `DateDisambiguationWarning`.
- **Recipes hand-rolled**:
  - `confirm-stage shell` — `:350` — `inset:0, zIndex:40, background:'#05080d', padding:'54px 22px 24px'`.
  - `parsed-time result card` — `:354-381` — `borderRadius:12, border:'1px solid rgba(30,58,95,0.6)', background:'#0a1320', padding:16`; value `fontSize:22, fontWeight:700, mono`.
  - `"Sample" confidence badge` — `:365-368` — the same amber badge shape as the media screens.
  - `assumed-date warning card (role=alert)` — `:389-423` — `border:GLASS.borderError, background:'rgba(255,71,87,0.06)'`; title `'#ff8a93'`; inline confirm `border:'1px solid #2B8CC1', color:'#4BA3D4'`.
  - `commit-blocked status + action row` — `:434-451` — `role="status"` + Retake (`glassBtnSecondary`) / Commit (`glassBtnPrimary`), `padding:14, fontSize:15, fontWeight:600`.
  - `failure card` — `:476-479` — same red-alert shape.
  - `aim-stage shell + vignette` — `:493-494` — `background:'radial-gradient(ellipse at center,#0d1b2a,#05080d)'`.
  - `header caption "AIM AT THE DVR CLOCK"` — `:495-496` — **stmono**, `fontSize:13, letterSpacing:2, color:'#9fd4ee'`.
  - `landscape viewfinder frame` — `:501-570` — `aspectRatio:16/9, borderRadius:12, background:'#0a1320', border:'1px solid rgba(30,58,95,0.6)'`.
  - `bounding-box overlay` — `:110`, `:525-534` — scrim `rgba(0,0,0,0.6)`; guide `border:1px dashed rgba(255,255,255,0.85)`; four `corner()` accents `14×14, border:3px solid #4BA3D4` per side-pair.
  - `instructional caption over viewfinder` — `:536` — `fontSize:10, color:'#fff', textShadow:'0 1px 3px rgba(0,0,0,0.9)'` — the only `textShadow` in the codebase.
  - `viewfinder panel button` — `:112-133` — `padding:'10px 18px', borderRadius:10, border:'1px solid #4BA3D4', background:'rgba(43,140,193,0.14)', color:'#9fd4ee', fontSize:13, fontWeight:600`.
  - `bottom control bar` — `:594-630` — `linear-gradient(0deg,rgba(0,0,0,0.88),transparent)`; shutter `68×68, borderRadius:34, border:4px solid #fff, background:'rgba(255,255,255,0.22)'`.
  - `sample text links` — `:635-644` — `fontSize:12, fontWeight:600, color:'#9fd4ee', textDecoration:'underline'`.
- **Hardcoded literals**: **two mono families in one file** — jbmono (`:109`) for evidentiary values, stmono (`:496`) for the AIM caption; `#4BA3D4` ×11; `#9fd4ee` and `#9fc0db` used near-interchangeably.
- **Notes**: **`STRIP_TOP`/`STRIP_SIDE` (`:103-104`) are computed from the engine's `OCR_BOX_HEIGHT_FRACTION`/`OCR_BOX_WIDTH_FRACTION`** — the visual box must show the actual crop region. **Do not restyle the box independently of `ocr-crop.ts`.** No `useReducedMotion` in this file (nothing animates).

### `screens/import/ImportTerminalProgress.tsx` (665 lines)
- **Replicates**: phone `src/features/import/pdf-import/components/ImportTerminalProgress.tsx` (`:21-24`, "parity P1.4, matrix row 74").
- **Shared chrome used**: **none** — defines its own `TERM_CHROME` (`:179-188`) and `C` (`:191-199`) palettes; see §1.5. Stated design choice: "dark in both themes by design."
- **Recipes hand-rolled**:
  - `root layout` — `:201-206` — `height:'100%', flexDirection:column, gap:8`.
  - `headline (live region)` — `:208-217` — stmono, `fontSize:12, fontWeight:600, letterSpacing:1, '#f0f4f8'`.
  - `progress track` — `:219-225`, `:548` — `height:3, borderRadius:9999, background:'#1e3a5f'`; fill `'#2B8CC1'`.
  - `terminal panel shell` — `:226-236` — `minHeight:260, borderRadius:12, border:'1px solid #141c28', background:'#060a12'`.
  - `title bar` — `:238-246`, `:553-565` — `padding:'8px 12px', background:'#0a0f18', borderBottom:'1px solid #141c28'`; three chrome dots `8×8, borderRadius:4, background:'#242a31'`; title `fontSize:10, letterSpacing:0.5, '#55606b'`; trust line `fontSize:9.5, '#4a7c76'`; live dot `5×5, borderRadius:3, '#4ECDC4'`.
  - `log viewport + cursor` — `:248-253`, `:568-604` — `padding:12, overflowY:auto`; cursor `▌ color:'#4BA3D4', animation:'termCursorBlink 1s step-end infinite'` (reduced-motion gated).
  - `jump-to-latest pill` — `:254-267`, `:606-611` — `bottom:10, left:'50%', borderRadius:9999, background:'#2B8CC1'`.
  - `fixed-height badge slot` — `:268-279` — `BADGE_SLOT_HEIGHT = 60`; `height:60, borderRadius:12, padding:'0 13px'`.
  - `badge title/sub` — `:280-294` — title `fontSize:14, fontWeight:700`; sub `fontSize:12, '#99badd'`.
  - `visually-hidden span` — `:296-303` — clip-path offscreen.
  - `icon wrapper` — `:307-314` — parameterised size, `strokeWidth:2`.
  - `spinner` — `:317-333` — `stroke:'#2B8CC1', strokeWidth:2.5, animation:'spin 0.9s linear infinite'` (gated).
  - `CTA colour sets` — `:362-412` — success `title '#7fe6b6', border 'rgba(16,209,119,0.32)', bg 'rgba(16,209,119,0.10)'`; partial `'#ffd93d' / 'rgba(255,217,61,0.36)' / 'rgba(255,217,61,0.10)'`; failure `'#ff4757' / 'rgba(255,71,87,0.32)' / 'rgba(255,71,87,0.10)'`.
  - `processing badge` — `:647-661` — `badgeBase` + `border:'1px solid rgba(43,140,193,0.32)', background:'rgba(26,45,68,0.55)'`.
- **Hardcoded literals**: **the entire `TERM_CHROME` + `C` block** re-expresses `GLASS`/`T` values under new names (`C.primary` = `T.primary`, `C.border` = `GLASS.border`'s colour, `C.text` = `T.text`, …). **This is the single largest token-consolidation opportunity in the codebase**, gated on the explicit must-stay-dark requirement.
- **Notes**: `useReducedMotion` gates spinner + cursor + the CTA `termFadeIn 350ms` morph. `NEAR_BOTTOM_THRESHOLD = 80` auto-follow logic is coupled to `logStyle`'s `overflowY:auto` — preserve the `logRef` measurement contract. `STAGE_VIEW` percent bands (0/15/55/80/100) are phone-parity numbers, pinned by tests (§6). `#7fe6b6` is a **sixth** green.

### `screens/import/TerminalLine.tsx` (178 lines)
- **Replicates**: phone `src/features/import/pdf-import/components/TerminalLine.tsx` (`:9-24`) — time gutter · level tag · message · optional detail block. **Collapsed-by-default is a documented demo deviation** from the phone's always-open blocks.
- **Shared chrome used**: **none** — stmono literal (`:62`) plus its own `LEVEL_ACCENT` (`:39-50`) and `TERM_ROW` (`:53-60`) palettes (§1.5).
- **Recipes hand-rolled**:
  - `row layout` — `:66-94` — row `flex, gap:8, marginTop:5`; time mono `fontSize:10, width:44`; tag mono `fontSize:10, fontWeight:600, width:38`; message mono `fontSize:10, lineHeight:15px, flex:1, overflowWrap:'anywhere'`.
  - `detail disclosure block` — `:98-115` — `marginLeft:52, padding:'6px 9px', background:'#080b11', borderLeft:'2px solid #1c2733', borderTopRightRadius:4, borderBottomRightRadius:4`; text `fontSize:9, lineHeight:15px, '#6f8296', whiteSpace:'pre-wrap'`.
  - `disclosure glyph (▸/▾)` — `:119-125`, `:144-150` — `fontSize:10, lineHeight:15px, '#6f8296'`.
  - `row-as-button variant` — `:154-168` — strips native chrome: `background:transparent, border:none, padding:0, font:'inherit'`.
- **Notes**: **`memo()`-wrapped for append-only render discipline** (`:17-18`: history rows must never re-render on new appends). A restyle that adds a non-stable style object to the row props breaks that. Both `#ffd93d` (here) and `#ffd07a` (media) read as "warning amber" — two hexes, one role.

### `screens/import/PasteStage.tsx` (94 lines)
- **Replicates**: phone `ImportPickerModal.tsx` step 2 (paste-text body), citing phone lines `:652, 646, 704-707, 722, 735, 746`; v1 matrix row **72**.
- **Shared chrome used**: `GLASS.borderBtn`, `glassBtnPrimary`. Back-chevron/title/close chrome lives in `ModalShell`.
- **Recipes hand-rolled**:
  - `bounded textarea` — `:31-49` — `minHeight:240, maxHeight:320, overflowY:auto, resize:none, borderRadius:10, border:GLASS.borderBtn, background:'#0a1320', color:'#dfe9f3', fontSize:12.5, lineHeight:1.5, padding:12, fontFamily: jbmono`.
  - `submit button` — `:76-91` — `padding:13, glassBtnPrimary, fontSize:15, fontWeight:600, opacity: blank?0.55:1`.
  - `hint text` — `:61` — `fontSize:13, '#9fc0db', lineHeight:1.5`.
- **Hardcoded literals**: `#dfe9f3` (= `NotesScreen`'s `TEXT`, a **near-miss** of `T.text`'s `#f0f4f8`); `PASTE_INPUT_MIN_HEIGHT = 240` / `MAX_HEIGHT = 320` are named exports and phone-parity constants ("never remove the cap").
- **Notes**: The simplest file in the import set. `autoCorrect`/`spellCheck`/`autoCapitalize` off (`:71-73`) is forensic-integrity behaviour.

### `screens/import/PickerStage.tsx` (383 lines)
- **Replicates**: phone `src/features/import/json-import/components/ImportPickerModal.tsx` step 1 (`:8-16`); v1 matrix row **71**, copy adapted per owner decision D5 (the demo has no JSON import).
- **Shared chrome used**: `GLASS.borderAccent`, `GLASS.borderError`, `GLASS.gradientPanel`, `glassBtnPrimary`, `glassBtnSecondary`.
- **Recipes hand-rolled**:
  - `glass action card` — `:75-88` — `minHeight:180, borderRadius:14, border:GLASS.borderAccent, background:GLASS.gradientPanel, padding:22, gap:9`.
  - `card title/description` — `:154-155` — title `fontSize:17, fontWeight:600, color: disabled?'#5d7a9a':'#f0f4f8'`; description `fontSize:13, color: disabled?'#5d7a9a':'#9fc0db', lineHeight:1.45`.
  - `busy spinner` — `:101-119` — `stroke:'#5AB4E6', strokeWidth:2.5, animation:'spin 0.9s linear infinite'`.
  - `icon stroke pair` — `:90-91` — `ICON_STROKE '#5AB4E6'`, `DISABLED_STROKE '#5d7a9a'`.
  - `error banner (role=alert)` — `:317-323` — `borderRadius:10, border:GLASS.borderError, background:'rgba(255,71,87,0.08)', padding:'10px 12px'`; text `fontSize:13, '#ff8a93', lineHeight:1.45`.
  - `large-batch confirm dialog (replaces the card list in place)` — `:265-300` — `borderRadius:14, border:GLASS.borderAccent, background:GLASS.gradientPanel, padding:22, gap:10`; title `fontSize:17, fontWeight:700`; message `fontSize:13, '#cdd9e6', lineHeight:1.5`; button row `padding:13, fontSize:15, fontWeight:600`.
  - `hidden native file input` — `:305-314` — `display:none` + `aria-hidden` + `tabIndex:-1`.
  - `bottom cancel button` — `:374-380` — full-width `glassBtnSecondary, padding:13`.
  - `three feature-card icon SVGs` — `:326-333`, `:343-350`, `:360-366` — `48×48, strokeWidth:1.5`.
- **Hardcoded literals**: **`#5AB4E6`** — a *third* light blue alongside `#4BA3D4` and `GLASS.accentFrom #35A0D6`; `#5d7a9a` as the disabled tone (a fifth muted blue-grey).
- **Notes**: **`prefersReducedMotion()` (`:98-99`) is a deliberate per-render `matchMedia` read**, *not* `motion/react`'s cached hook, with a documented rationale (avoids first-frame flash + honours per-test overrides). **Do not "normalise" it toward the other files.** The confirm dialog **replaces** the card list rather than overlaying it — load-bearing structure.

### §3.4 Map and export screens

### `screens/map/MapScreen.tsx` (415 lines)
- **Replicates**: "The map orchestrator (the demo's analog of the phone's MapHost)" (`:120-124`), mirroring `MapHost.tsx:248-268`'s projection pipeline; v1 matrix rows 22→23.
- **Shared chrome used**: `DEFAULT_MAP_CENTER`, `DEFAULT_PROXIMITY_RADIUS`, `RadiusPreset` from `mapTokens`. **No `glass-tokens`/`_shared`.**
- **Recipes hand-rolled**:
  - `floating pill (Change Case)` — `:90-103` — `top:58, right:12, zIndex:16, borderRadius:999, border:'1px solid rgba(40,69,107,0.9)', background:'rgba(13,27,42,0.82)', color:'#cdd9e6', fontSize:12, fontWeight:600, padding:'7px 12px'`.
  - `empty state (no case)` — `:105-117`, `:350-354` — `inset:0`, centred column, `padding:32, color:'#9fb6d0', fontSize:14, lineHeight:1.6`; heading `'#cdd9e6', fontWeight:600, marginBottom:6`.
- **Hardcoded literals**: root background `#0a1422` (`:349`) — a one-off not in `SHEET_COLORS`; `#cdd9e6`/`#9fb6d0` duplicate token values without importing.
- **Notes**: Pure orchestration — all chrome delegated. `FLY_ZOOM = 16` (`:25`). Deliberately drops the phone's GPS-fallback step in `handleProximityToggle` (`:298-323`) for privacy/honesty.

### `screens/map/MapCanvas.tsx` (667 lines)
- **Replicates**: "the Mapbox GL JS canvas — the web analog of the phone's native MapView" (`:256-263`); phone `CaseMapView.tsx:835-875` (clustering), `:189-199` (cover fade timings), and the `ProximityRing` layer paint values (`:508-509`).
- **Shared chrome used**: `DEFAULT_MAP_CENTER`, `MAP_SURFACE_COLORS`, `PROXIMITY_COLORS`, `SHEET_COLORS`; `LONG_PRESS_MOVE_TOLERANCE_PX`/`LONG_PRESS_MS`; the DOM marker builders from `markerElements.ts`.
- **Recipes hand-rolled**:
  - `fallback tile (no Mapbox token)` — `:81-93`, `:614-623` — `inset:0`, centred column, `padding:24, color:'#cdd9e6', fontSize:14, background:'linear-gradient(160deg,#0d1b2a,#0a1422)'`; sub-line `fontSize:12, '#7a9fc4', marginTop:6`.
  - `loading cover (scrim)` — `:95-103` — `inset:0, zIndex:5, background:'#0d1b2a'`, opacity 0→1, `transition:'opacity 600ms ease'` (`COVER_FADE_DURATION_MS=600`, `COVER_FAILSAFE_MS=4000`, `:65-66`).
  - `error overlay` — `:105-119`, `:638-656` — `inset:0, zIndex:25`, centred column `gap:14, padding:24, background:MAP_SURFACE_COLORS.overlayMedium, color:'#f0f4f8', fontSize:14`.
  - `retry button` — `:121-131` — `padding:'9px 22px', borderRadius:10, border:none, background:SHEET_COLORS.accent, color:'#f0f4f8', fontSize:14, fontWeight:600`.
  - `proximity ring (map LAYER paint, not DOM)` — `:526-537` — fill `PROXIMITY_COLORS.fillLight` @ opacity 1; line `PROXIMITY_COLORS.accent`, width 2, opacity 0.85.
- **Hardcoded literals**: `#0d1b2a`/`#0a1422` gradient stops (`:92`); `#cdd9e6`, `#7a9fc4`, `#f0f4f8` bare.
- **Notes**: **mapbox-gl-specific.** `MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'` (`:59`), `DEFAULT_ZOOM=10`, `SINGLE_ZOOM=15` (`:60-61`). `fitToPoints` (`:187-203`) uses `padding:{top:90,bottom:300,left:40,right:40}, maxZoom:16`. **`toContainerPoint` (`:237-245`) does CSS-transform-aware pixel math required because `PhoneFrame` applies `transform: scale()` — read the comment before touching it.** Markers are built imperatively (`document.createElement`) because Mapbox `Marker` takes a raw DOM element; the long-press gesture is hand-rolled but reuses `useLongPress`'s constants intentionally.

### `screens/map/MapControls.tsx` (286 lines)
- **Replicates**: phone `MapControls.tsx:111-303`, cross-checked against ui-mapping 03:112-134. **`:48-54` documents a deliberate row-stacking layout divergence** (same controls, different geometry, because of the 378px width).
- **Shared chrome used**: `MAP_GLASS_COLORS`, `MAP_PIN_COLORS`, `PROXIMITY_COLORS`, `PROXIMITY_PRESETS`, `STATUS_LABEL`, `RadiusPreset`; `MAP_FILTER_STATUSES`/`MapFilterState`.
- **Recipes hand-rolled**:
  - `container` — `:55-66` — `top:92, left:0, right:0, zIndex:15, padding:'0 10px'`, column `gap:6`, `pointerEvents:'none'`.
  - `row` — `:68` — flex row `gap:6, flexWrap:wrap`.
  - `floating control pill (base)` — `:70-87` — `padding:'6px 12px', borderRadius:20, borderWidth:1 solid, fontSize:12, fontWeight:500, lineHeight:1.2, boxShadow:'0 1px 4px ' + MAP_GLASS_COLORS.shadow, pointerEvents:'auto'`.
  - `count badge pill` — `:89-100` — `padding:'3px 10px', borderRadius:20, border:1px solid MAP_GLASS_COLORS.border, background:containerBg, fontSize:11, fontWeight:400, color:textTertiary`.
  - `search pill` — `:102-114` — `flex:1, minWidth:120, height:36, padding:'0 12px', borderRadius:20, border:1px solid border, background:inputBg`.
  - `search input` — `:116-126` — `height:34, border:none, background:transparent, color:text, fontSize:14`.
  - `status dot` — `:128` — `7×7, borderRadius:4`.
  - `status filter chip (active/inactive)` — `:175-196` — active border/bg from `MAP_PIN_COLORS[status]` + `${color}22`; inactive from `MAP_GLASS_COLORS`.
  - `clear-filters pill` — `:225-238` — active `primary`/`primaryLight`/`clearActiveBg`; inactive `border`/`inputBg`/`textSecondary`.
  - `proximity toggle pill` — `:243-258` — active `PROXIMITY_COLORS.accent` + `fillLight`, `fontWeight:600`; inactive `fontWeight:500`.
  - `radius preset pill` — `:260-282` — selected `accent` + `fillMedium`.
- **Hardcoded literals**: **none.** This file is fully token-driven. **It is the model the rest of the codebase should look like.**

### `screens/map/MapBottomSheet.tsx` (162 lines)
- **Replicates**: the phone's draggable bottom-sheet detents; the forwarded-prop contract at `:26-39` cites phone `MapBottomSheet.tsx:66-70`.
- **Shared chrome used**: `SHEET_COLORS`, `StatusCounts`; `TAB_BAR_HEIGHT` (= 50, `TabBar.tsx:10`).
- **Recipes hand-rolled**:
  - `sheet` — `:116-132` — `left/right:0, bottom:TAB_BAR_HEIGHT`, height from drag state, `zIndex:20, background:SHEET_COLORS.background, borderTopLeft/RightRadius:20, borderTop:1px solid SHEET_COLORS.border, boxShadow:'0 -8px 24px rgba(0,0,0,0.45)', transition: isDragging?'none':'height 0.26s cubic-bezier(0.32,0.72,0,1)'`.
  - `drag zone` — `:136-149` — `touchAction:'none', userSelect:'none', cursor: isDragging?'grabbing':'grab'`.
- **Hardcoded literals**: **`SHEET_HEIGHTS = [116, 340, 560]` (`:43`) and `DRAG_THRESHOLD = 40` (`:44`) are tuned to the 378×786 frame (comment `:42`)** — see §0.10. The cubic-bezier at `:130` is a hand-typed copy of `motion.ts`'s `EASE_STANDARD`.

### `screens/map/LocationList.tsx` (184 lines)
- **Replicates**: phone `LocationList.tsx:67, 71-83, 114-132`; ui-mapping 03:182 (export footer gating).
- **Shared chrome used**: `SHEET_COLORS`; renders `LocationRow`.
- **Recipes hand-rolled**:
  - `list container` — `:61` — `padding:'4px 14px 18px'`.
  - `empty state` — `:62`, `:159-172` — `padding:'24px 16px', textAlign:center, color:SHEET_COLORS.textFaint, fontSize:13, lineHeight:1.6`.
  - `clear-filters chip` — `:63-74` — `padding:'7px 16px', borderRadius:16, border:1px solid SHEET_COLORS.rowBorder, background:'rgba(43,140,193,0.14)', color:'#4ba3d4', fontSize:13, fontWeight:600`.
  - `export CTA button` — `:82-101` — `height:50, borderRadius:14, border:none, background:'linear-gradient(135deg,#1a8fc2,#0f6f9e)', color:'#fff', fontSize:15, fontWeight:700, letterSpacing:-0.2, boxShadow:'0 4px 16px rgba(26,143,194,0.35)'`; disabled `opacity:0.55`.
  - `footer wrapper` — `:82` — `padding:'8px 14px 20px'`.
- **Hardcoded literals**: **the export gradient `#1a8fc2→#0f6f9e` + its shadow are duplicated verbatim at `LocationDetailCard.tsx:40`** — one recipe, two hand-rolled copies. Note `#4ba3d4` **lowercase** here vs `#4BA3D4` elsewhere — same colour, two spellings, which a naive find-and-replace will miss.

### `screens/map/LocationDetailCard.tsx` (229 lines)
- **Replicates**: phone `LocationDetailCard.tsx:503-540` (cameras toggle placement), `IncidentDetailCard` (ui-mapping 03:250-262), `:509` (camera-count gating).
- **Shared chrome used**: `MAP_PIN_COLORS`, `STATUS_LABEL`, `SHEET_COLORS`.
- **Recipes hand-rolled**:
  - `container` — `:32` — `padding:'14px 16px 24px'`.
  - `back button` — `:33` — `padding:'6px 12px', borderRadius:16, background:'rgba(43,140,193,0.14)', color:'#4ba3d4', fontSize:13, fontWeight:600, marginBottom:14`.
  - `heading` — `:34-35` — `fontSize:21, fontWeight:700, color:SHEET_COLORS.text, letterSpacing:-0.3`.
  - `nested info card` — `:36` — `background:SHEET_COLORS.infoBg, border:1px solid SHEET_COLORS.divider, borderRadius:12, padding:13, marginBottom:12`.
  - `card label` — `:37` — `fontSize:10, fontWeight:700, letterSpacing:0.5, uppercase, color:SHEET_COLORS.textFaint`.
  - `row text` — `:38` — `fontSize:14, fontWeight:500, color:SHEET_COLORS.text, padding:'6px 0'`.
  - `tap row (call/email)` — `:39` — `color:MAP_PIN_COLORS.working, fontSize:14, fontWeight:600`.
  - `primary CTA` — `:40` — `height:48, borderRadius:14, background:'linear-gradient(135deg,#1a8fc2,#0f6f9e)', color:'#fff', fontSize:15, fontWeight:700`.
  - `status chip` — `:43` — `fontSize:11, fontWeight:700, uppercase, letterSpacing:0.4, padding:'4px 10px', borderRadius:10, background:${color}25`.
  - `cameras toggle card (active/inactive)` — `:47-63` — `padding:'11px 13px', borderRadius:12`; active `border:'1px solid rgba(43,140,193,0.5)', background:'rgba(43,140,193,0.12)'`; inactive `SHEET_COLORS.divider`/`infoBg`.
- **Hardcoded literals**: the `rgba(43,140,193,…)` family at **0.08 / 0.12 / 0.14 / 0.25 / 0.5** — five alphas of one accent, only two tokenized (`T.primarySoft` 0.08, `T.primaryEdge` 0.25).
- **Notes**: `CamcorderGlyph` (`:76-92`) is a hand-drawn SVG standing in for Ionicons `videocam`.

### `screens/map/LocationRow.tsx` (62 lines)
- **Shared chrome used**: `MAP_PIN_COLORS`, `SHEET_COLORS`.
- **Recipes hand-rolled**:
  - `list row` — `:13-25` — `padding:'13px 14px', margin:'0 0 8px', borderRadius:12`; selected `border:1px solid ${color}50, background:${color}14`; unselected `SHEET_COLORS.rowBorder`/`rowBg`.
  - `status dot` — `:26` — `10×10, borderRadius:5, boxShadow:'0 0 6px ${color}88'`.
  - `name` — `:27` — `fontSize:14, fontWeight:700`. `business subtext` — `:28` — `fontSize:11, textFaint, italic`. `address subtext` — `:29` — `fontSize:11, textDim`.
  - `chevron` — `:30` — `fontSize:20, textDim, fontWeight:300` (the codebase's only `fontWeight:300`).
  - `incident chip` — `:31` — `fontSize:10, fontWeight:700, MAP_PIN_COLORS.incident, uppercase, letterSpacing:0.4`.
- **Hardcoded literals**: none beyond alpha-suffixed token colours (`${color}50/14/88/25`) — **a hex-alpha-suffix idiom** used across `map/`; a restyler moving to `rgb()`/`color-mix()` must handle it.

### `screens/map/CallConfirmSheet.tsx` (50 lines)
- **Replicates**: the iOS action-sheet call-confirm pattern (`:33`) — a mock; calling is unavailable in the demo.
- **Shared chrome used**: **none**.
- **Recipes hand-rolled**:
  - `scrim` — `:11-21` — `inset:0, zIndex:48, background:'rgba(4,8,14,0.55)'`, `justifyContent:flex-end, padding:12, gap:8`.
  - `action sheet` — `:22-27` — `background:'rgba(28,32,40,0.96)', borderRadius:14, overflow:hidden, textAlign:center`.
  - `message row` — `:28` — `padding:'16px 18px 14px', color:'#cdd9e6', fontSize:13, borderBottom:'1px solid rgba(255,255,255,0.12)'`.
  - `call button` — `:29` — `padding:'15px 0', color:'#34c759', fontSize:18, fontWeight:600`.
  - `cancel sheet + button` — `:30-31` — `background:'rgba(28,32,40,0.96)', borderRadius:14`; `padding:'15px 0', color:'#4ba3d4', fontSize:18, fontWeight:700`.
- **Hardcoded literals**: fully hardcoded. `rgba(4,8,14,0.55)` = `T.scrim`; `#34c759` = `MAP_PIN_COLORS.complete` in **lowercase** spelling; `rgba(28,32,40,0.96)` is an iOS-native grey found nowhere else.
- **Notes**: `zIndex:48` (`:14`) — a standalone magic number outside every named scheme.

### `screens/map/DemoNotification.tsx` (59 lines)
- **Replicates**: "A top iOS-style banner that auto-dismisses" (`:30`) — a general toast pattern, no direct phone file.
- **Shared chrome used**: **none**.
- **Recipes hand-rolled**: `toast banner` — `:12-27` — `top:56, left:16, right:16, zIndex:60, padding:'12px 16px', borderRadius:12, background:'rgba(20,30,46,0.96)', border:'1px solid rgba(75,163,212,0.4)', color:'#e7eef6', fontSize:13, fontWeight:600, textAlign:center, boxShadow:'0 8px 24px rgba(0,0,0,0.5)'`.
- **Notes**: `role="status"` live region (`:55`). `zIndex:60` collides numerically with `AlertDialog`'s scrim.

### `screens/map/SheetHandle.tsx` (69 lines)
- **Shared chrome used**: `MAP_PIN_COLORS`, `STATUS_LABEL`, `SHEET_COLORS`, `StatusCounts`.
- **Recipes hand-rolled**:
  - `sheet handle (drag pill)` — `:15-17` — container `paddingTop:8`; pill row `justifyContent:center, paddingBottom:10`; pill `38×4, borderRadius:2, background:SHEET_COLORS.handle`.
  - `summary text` — `:18-19` — `padding:'0 18px 10px'`; count `fontSize:16, fontWeight:700, SHEET_COLORS.text`.
  - `status badge` — `:22-33` — `padding:'2px 7px', borderRadius:8, border:1px solid ${color}55, background:${color}1e, fontSize:11, fontWeight:700`.
  - `badge dot` — `:34` — `6×6, borderRadius:3`.
- **Hardcoded literals**: **none** — fully token-driven.

### `screens/map/CaseMapPicker.tsx` (157 lines)
- **Replicates**: the phone's `CaseSelectionSheet` — "a `pageSheet` modal, not a bottom sheet" (`:77-78`).
- **Shared chrome used**: `GLASS.border`, `GLASS.borderBtn`; `TAB_BAR_HEIGHT`.
- **Recipes hand-rolled**:
  - `full-screen sheet` — `:84-96` — `top/left/right:0, bottom:TAB_BAR_HEIGHT, zIndex:30, background:'#0a1422', transform:'translateY(0|100%)', transition:'transform 0.3s cubic-bezier(0.32,0.72,0,1)'`.
  - `header bar` — `:30-34` — `padding:'54px 18px 14px', borderBottom:GLASS.border, background:'linear-gradient(180deg,#13243a,#0e1d30)'`.
  - `title` — `:35` — `fontSize:22, fontWeight:700, '#e7eef6'`. `subtitle` — `:36` — `fontSize:13, '#9fb6d0', marginTop:4`.
  - `list row (case)` — `:38-54`, `:130-134` — `padding:'14px 16px', marginBottom:10, borderRadius:10, border:GLASS.border, background:'rgba(19,34,54,0.6)'`; selected `borderColor:accent, borderLeft:'4px solid accent'`.
  - `disabled placeholder row` — `:51` — same base + `opacity:0.5, cursor:default`.
  - `row text tiers` — `:52-54` — `fontSize:15/13/11`, `#e7eef6`/`#9fb6d0`/`#7a9fc4`.
  - `footer + cancel` — `:55-66` — footer `padding:16, borderTop:GLASS.border`; cancel `padding:'13px 0', borderRadius:12, border:GLASS.borderBtn, background:'rgba(19,34,54,0.85)', color:'#cdd9e6', fontSize:15, fontWeight:600`.
  - `empty state` — `:116-118` — centred, `'#9fb6d0'`.
- **Hardcoded literals**: `accent = '#4ba3d4'` (`:28`) — a standalone const **equal to `MAP_GLASS_COLORS.primaryLight`** but not imported; `borderColor: selected ? accent : '#1e3a5f'` (`:132`) is the exact call site deferral §31 names as un-tokenizable-in-place.
- **Notes**: The entrance is a mounted-state `transform` transition (`:81-82`), not a CSS keyframe. The cubic-bezier at `:95` is another hand-typed `EASE_STANDARD` copy.

### `screens/map/markerElements.ts` (180 lines)
- **Replicates**: phone `CLUSTER_CIRCLE_STYLE`/`ClusterBadge` (constants/index.ts:179-195, ClusterBadge.tsx:36-60), `CameraMarker.tsx:70-88` (callout content), a MaterialCommunityIcons `cctv` glyph approximation (`:93-96`).
- **Shared chrome used**: `CAMERA_MARKER`, `CLUSTER_COLORS`, `clusterFontSizeFor`, `clusterRadiusFor`.
- **Recipes hand-rolled** — **all imperative DOM style strings, not `CSSProperties`**:
  - `marker/pin (location dot)` — `:39-46` — `16×16, border-radius:50%, background:d.color, border:'2px solid #fff', box-shadow:'0 0 0 1px rgba(0,0,0,0.35), 0 2px 5px rgba(0,0,0,0.45)'`.
  - `marker/pin (incident teardrop SVG)` — `:32-38` — `22×30` path, `fill:d.color, stroke:#fff, stroke-width:1.5`, white centre dot r=4.
  - `cluster bubble` — `:61-86` — size `clusterRadiusFor(count)*2`, `border-radius:50%, background:CLUSTER_COLORS.circle, color:.text, font-size:clusterFontSizeFor(count), font-weight:600, text-shadow:'0 0 1px halo, 0 0 2px halo'`.
  - `camera marker base` — `:140-157` — `30×30, border-radius:50%, background:CAMERA_MARKER.baseColor, border:'1.5px solid baseBorder', box-shadow:'0 1px 2px rgba(0,0,0,0.3)'`.
  - `camera glyph SVG` — `:158-162` — `18×18, fill:CAMERA_MARKER.glyphColor (#111111)`.
  - `callout bubble` — `:110-124` — `display:none` (toggled), `bottom:${glyphSize+4}px, min-width:120px, max-width:220px, padding:'8px 12px', border-radius:8px, border:1px solid calloutBorder, background:calloutBg, text-align:center, pointer-events:none`.
  - `callout text lines` — `:126-137` — name `13px/600`; resolution `11px, calloutTextDim`; coord `11px monospace`; accuracy `11px, calloutTextDim`.
- **Notes**: **This is the only file where styles are strings assigned to `style.cssText`/`innerHTML`** — a restyle codemod that only understands JSX `style={{}}` will miss it entirely. `escapeHtml()` (`:178-180`) guards interpolated camera names. The callout click handler toggles `display:none/block` + `aria-expanded` directly on the DOM (`:164-170`) — real interaction logic inside a styling file.

### `screens/map/buildMarkers.ts` (52 lines)
- Pure data transformation (`MarkerDescriptor` projection). **No styles.** Included so the writer marks it N/A.

### `screens/export/ExportHub.tsx` (251 lines)
- **Replicates**: phone `src/features/case-management/export-hub/components/ExportHub.tsx`, citing phone `:6-9` (layer roles), `:139-143` (artifact colour keying), `:145-159` (footer rise), `:148` (footer null-gate), `:184` (empty copy), `:203-209` (armed-case echo), `:260` (isExporting disables checkboxes). v1 matrix row **24**.
- **Shared chrome used**: `GLASS`, `glassBtnPrimary`; `TAB_BAR_HEIGHT`; `useReducedMotion`.
- **Recipes hand-rolled**:
  - `root layout` — `:57-66` — `top/left/right:0, bottom:TAB_BAR_HEIGHT`, flex column.
  - `list area` — `:68-74` — `flex:1, minHeight:0, overflowY:auto, overscrollBehavior:contain, padding:'58px 16px 16px'`.
  - `empty area` — `:76-85` — centred, `padding:24, fontSize:16, color:'#99badd'`.
  - `footer bar` — `:87-92` — `background:GLASS.gradientPanel, borderTop:GLASS.border, padding:'12px 16px 14px'`; entrance `animation:'exportFooterRise 220ms cubic-bezier(0.32,0.72,0,1)'` gated at `:192`.
  - `armed-case echo (mono)` — `:153-164` — jbmono, `fontSize:11, letterSpacing:0.6, color:'#7a9fc4'`.
  - `footer artifact line` — `:195-208` — same mono, `fontSize:11, letterSpacing:0.6, color:ARTIFACT_COLOR[plan.kind]`, `whiteSpace:nowrap, overflow:hidden, textOverflow:ellipsis`.
  - `footer case-number + detail row` — `:209-230` — number `fontSize:13, fontWeight:600, '#f0f4f8'`; detail `flex:1, fontSize:11, '#99badd'`; Clear `padding:'6px 10px', '#99badd', fontSize:13, fontWeight:600`.
  - `primary CTA` — `:231-246` — `glassBtnPrimary, padding:12, fontSize:14, fontWeight:700`; disabled `opacity:0.6, cursor:'default'`.
- **Hardcoded literals**: `ARTIFACT_COLOR` (`:98-102`) — the fourth status-colour owner (§1.4).
- **Notes**: The footer `animation` is `undefined` under reduced motion — proper gating, pinned by test (§6).

### `screens/export/ExportCaseCard.tsx` (219 lines)
- **Replicates**: phone `ExportCaseCard.tsx`, citing `:139-142` (checkbox-sibling structure), `:5-10`/`:43-44`/`:133-137`/`:243-252` (the "lit-follows-open" emphasis rule), `:148`/`:187`, `:173` (plain glyph chevrons), `:195` (empty-case copy).
- **Shared chrome used**: `GLASS.gradientPanel`, `.gradientCardDiag`, `.accentFrom`, `.borderSoft`.
- **Recipes hand-rolled**:
  - `card wrapper (lit vs idle)` — `:47-51`, `:119-129` — `borderRadius:16, overflow:hidden`; expanded `background:GLASS.gradientPanel, border:'1px solid GLASS.accentFrom', boxShadow:'0 4px 12px rgba(53,160,214,0.35)'`; idle `background:GLASS.gradientCardDiag, border:GLASS.borderSoft, boxShadow:'0 4px 8px rgba(0,0,0,0.15)'`; dimmed `opacity:0.5`.
  - `header button` — `:53-65` — `padding:'16px 16px 16px 8px'`, transparent, `textAlign:left`.
  - `tri-state checkbox` — `:68-82`, `:148-159` — `20×20, borderRadius:5, borderWidth:2`; all `background:'#2B8CC1', color:'#fff'`; some/none transparent, `borderColor: none?'#7a9fc4':'#2B8CC1'`.
  - `case number (mono)` — `:168-178` — jbmono, `fontSize:17, fontWeight:600, '#f0f4f8'`.
  - `display name subtext` — `:180` — `fontSize:13, '#99badd', marginTop:4`.
  - `status chip` — `:184-186` — `padding:'3px 9px', borderRadius:20, border:1px solid card.status.border, background:card.status.bg`; text `fontSize:10, fontWeight:600, letterSpacing:0.5`.
  - `location-count subtext` — `:187` — `fontSize:11, '#7a9fc4'`.
  - `chevron glyph` — `:190-192` — `width:16, textAlign:center, fontSize:12, '#7a9fc4'`, plain `▾`/`▸` **characters**, not SVG.
  - `expanded body divider` — `:198` — `height:1, background:'#1e3a5f', marginBottom:4`.
  - `empty-locations copy` — `:211` — `fontSize:13, italic, '#7a9fc4', textAlign:center, padding:'12px 0'`.
- **Hardcoded literals**: `#2B8CC1` ×3 (`:152-154`) where `T.primary` names it; `#1e3a5f` (`:198`) = `GLASS.border`'s colour, bare.
- **Notes**: The checkbox is structurally a **sibling `<button>`** of the expand button inside one flex row (`:130-194`) — load-bearing a11y DOM, called out in the file header. `boxShadow:'0 4px 12px rgba(53,160,214,0.35)'` is a **test-pinned** value (§6).

### `screens/export/ExportLocationRow.tsx` (104 lines)
- **Replicates**: phone `ExportLocationRow.tsx`, citing `:5-12` (single accessible control), `:54-57`, `:105-106` (hairline separator), `:117-123` (indicator geometry), `:77` (1-line address truncation), `:28-29`/`:41`.
- **Shared chrome used**: **none** — fully hardcoded.
- **Recipes hand-rolled**:
  - `list row (checkbox button)` — `:27-39`, `:67` — `minHeight:44, padding:'8px 0'`, transparent, `borderBottom:'1px solid rgba(30,58,95,0.6)', textAlign:left`; disabled `opacity:0.5`.
  - `circular indicator` — `:42-56`, `:69-79` — `22×22, borderRadius:11, borderWidth:2`; selected `background/borderColor '#2B8CC1'`; unselected transparent + `'#7a9fc4'`; check `✓ '#fff', fontSize:13, fontWeight:700`.
  - `location name` — `:81` — `fontSize:14, fontWeight:600, '#f0f4f8'`.
  - `address subtext (1-line clamp)` — `:82-97` — `fontSize:12, '#99badd', marginTop:2, overflow:hidden, textOverflow:ellipsis, whiteSpace:nowrap`.
  - `status chip` — `:99-101` — `padding:'3px 8px', borderRadius:12, background:row.status.bg`; text `fontSize:10, fontWeight:600`.
- **Hardcoded literals**: `#2B8CC1`, `#7a9fc4` (`:73-75`) bare; `rgba(30,58,95,0.6)` (`:33`) — a near-miss of `T.borderSoft`'s `0.5`. **`minHeight:44` equals `T.rowH`** — the RN 44pt touch floor, hardcoded here.
- **Notes**: The **row** is the single accessible control (`role="checkbox"` on the outer button); the circle is `aria-hidden`. `row.status` comes from `screenData.ts`.

### §3.5 Settings

### `screens/settings/SettingsModal.tsx` (200 lines)
- **Replicates**: phone `SettingsModal` master/detail navigator (P7.1, v1 matrix row **81**, decision D6). `:17-25` documents why it **does not reuse `ModalShell`**: the phone has two header variants that swap with the pane.
- **Shared chrome used**: `MODAL_SCRIM_Z`, `MODAL_SHEET_Z` — **reused BY VALUE, not by component** (`:24-25`); `PhoneOverlayPortal`.
- **Recipes hand-rolled**:
  - `modal shell (scrim + sheet)` — `:64-96` — scrim `inset:0, zIndex:MODAL_SCRIM_Z(21), background:'rgba(4,8,14,0.55)'`; sheet `left/right:0, top:34, bottom:0, zIndex:SETTINGS_SHEET_Z(22), borderTopLeft/RightRadius:24, background:'#0d1b2a', overflow:hidden, animation:'screenIn 0.3s ease'`. **This is byte-identical to `ModalShell`'s own scrim/sheet (`_shared.tsx:110, 116-131`)** — a second copy of the sheet recipe.
  - `pane container` — `:89-96` — `position:relative, flex:1, minHeight:0, outline:none`.
  - `pane transition classes` — `:161-162` — enter `animation:'slideFwd 0.22s ease'`, exit `'slideBack 0.22s ease'`, gated by `useReducedMotion` (`:5`, `:106`).
- **Hardcoded literals**: `'#0d1b2a'` = `T.bg`; `'rgba(4,8,14,0.55)'` = `T.scrim`. Both bare.
- **Notes**: `SETTINGS_SHEET_Z` (`:62`) is exported so `UserProfileModal`'s `elevation={MODAL_LAYER.overSheet}` can be checked against it (modal-over-modal ordering) — **and it is test-pinned** (§6).

### `screens/settings/SettingsCategoryList.tsx` (163 lines)
- **Replicates**: "The Settings master pane: grouped inset glass cards of tappable rows, iOS-Settings style (phone `SettingsCategoryList.tsx` + `SettingsCategoryRow.tsx`)" (`:10-11`). Row a11y name cites `SettingsCategoryRow.tsx:60`; footer cites `SettingsCategoryList.tsx:74`; padlock cites `SettingsCategoryRow.tsx:73-75`.
- **Shared chrome used**: `GLASS`, `glassCard`; `SettingsIcon`.
- **Recipes hand-rolled**:
  - `section label` — `:23-30` — `fontSize:11.5, fontWeight:600, '#7a9fc4', uppercase, letterSpacing:0.6, padding:'0 4px 8px'`.
  - `card list row (rowBase)` — `:32-44` — `position:relative, flex, gap:14, width:100%, minHeight:56, padding:'0 14px'`, transparent/borderless; wrapped per section in `{...glassCard, overflow:'hidden'}` (`:60`).
  - `icon chip` — `:100-115` — `36×36, borderRadius:9, border:GLASS.borderAccent, background:'rgba(43,140,193,0.16)', color:'#2B8CC1'`.
  - `row title` — `:117-131` — `flex:1, minWidth:0, fontSize:15, fontWeight:500, '#f0f4f8', letterSpacing:0.1`, ellipsised.
  - `preview value` — `:134-140` — `fontSize:13, '#99badd'`, ellipsised.
  - `padlock` — `:142-148` — 13×13, `stroke:'#7a9fc4'`. `chevron` — `:150-152` — 17×17, same stroke.
  - `row separator` — `:47`, `:155-160` — **`SEPARATOR_INSET = 64` (chip 36 + gap 14 + row padding 14)**; `left:64, right:0, bottom:0, height:1, background:'#1e3a5f'`.
  - `footer version line` — `:72` — `textAlign:center, fontSize:11, '#46607e', paddingTop:4`.
  - `list container` — `:56` — `flex:1, minHeight:0, overflowY:auto, overscrollBehavior:contain, padding:16`.
- **Hardcoded literals**: `#1e3a5f` (`:158`) bare; `#46607e` (`:72`) — unique to this file and `AboutPane`.
- **Notes**: **`SEPARATOR_INSET` is derived arithmetic** — change the icon-chip size or gap and it must follow. Rows are real `<button>`s so `SettingsModal`'s back-focus-restore `data-settings-row` query works (`:15-16`).

### `screens/settings/SettingsNavBar.tsx` (116 lines)
- **Replicates**: phone `src/features/settings/components/SettingsNavBar.tsx`, both variants (`:6-19`). Back label is the literal "Settings" per phone parity (`SettingsNavBar.tsx:65`). The opaque background is deliberate, citing phone `:5-10`.
- **Shared chrome used**: `GLASS.border`, `GLASS.gradientPanel`.
- **Recipes hand-rolled**:
  - `nav bar (barBase)` — `:22-32` — `position:relative, flex:'0 0 auto', minHeight:52, justifyContent:space-between, padding:'12px 16px', borderBottom:GLASS.border, background:GLASS.gradientPanel`.
  - `icon button (iconBtn)` — `:34-42` — transparent, `padding:4`.
  - `master title` — `:64` — `fontSize:22, fontWeight:700, '#f0f4f8', letterSpacing:0.2`.
  - `close chip (master)` — `:71` — `30×30, borderRadius:15, background:'rgba(255,255,255,0.06)'`.
  - `back button (detail)` — `:83-94` — `iconBtn` + `gap:1, marginLeft:-6, padding:'4px 4px 4px 0', zIndex:2`; label `fontSize:16, fontWeight:500, '#2B8CC1'`.
  - `centred detail title` — `:97-110` — absolutely positioned overlay `inset:0, pointerEvents:none`; title `fontSize:16, fontWeight:600, '#f0f4f8'`, `role="heading" aria-level={2}`.
  - `right spacer (detail)` — `:113` — `width:92` (balances the back button; phone `rightSpacer` width 92).
  - `GearIcon` — `:45-52` — 20×20, `stroke:'#2B8CC1', strokeWidth:1.8`.
- **Notes**: **`width:92` is a hand-balanced magic number** — a restyle changing the back-button type size must retune it or the title goes off-centre.

### `screens/settings/UserProfileModal.tsx` (159 lines)
- **Replicates**: phone `UserProfileModal` (P7.2, v1 matrix row **86**); field order/labels/placeholders cite `UserProfileModal.tsx:164-243` / ui-mapping 12. "No Cancel button", Save-only footer per phone parity (`:31-32`).
- **Shared chrome used**: `Field`, `MODAL_LAYER`, `ModalShell`; `glassBtnPrimary`; `DateField`; `clock`.
- **Recipes hand-rolled**:
  - `career date field wrapper` — `:52-84` — label line (`:45`) `fontSize:13, fontWeight:500, '#cdd9e6', marginBottom:6`; duration line (`:46`) `fontSize:12.5, '#7a9fc4', marginTop:6`; `role="group"`.
  - `save footer button` — `:101-109` — `width:100%, textAlign:center, padding:13, glassBtnPrimary, fontSize:15, fontWeight:600` — **the same recipe as `ModalActions`'s submit, hand-rolled here** because there's no cancel.
- **Notes**: `elevation={MODAL_LAYER.overSheet}` (`:100`) — the demo's **only** modal-over-modal. `clock` read once at mount (`:91`).

### `screens/settings/settings-icons.tsx` (102 lines)
- **Replicates**: "The web equivalents of the ten Ionicons glyphs the phone's Settings rows draw (`settings-catalog.tsx:177-265`)" (`:7-8`).
- **Recipes hand-rolled**: `icon svg wrapper` — `:85-101` — `viewBox="0 0 24 24", fill:none, stroke:currentColor, strokeWidth:1.7, strokeLinecap/Join:round`, default `size=19`. **`stroke="currentColor"` deliberately, so tint is owned by the calling chip** (`:12-13`). `GLYPHS` table `:16-82` — 10 glyphs.
- **Notes**: Colour-agnostic by design. **This is the right pattern** and worth generalising.

### `screens/settings/settingsData.ts` (60 lines)
- View-model mapper only (`toSettingsSections`, `findSettingsRow`). **No styling.**

### `screens/settings/panes/_pane-chrome.tsx` (326 lines) — **the settings leverage point**

> "the demo's equivalent of the styles every `*SettingsSection.tsx` on the phone repeats
> (`description` / `settingGroup` / `settingLabel` / `settingHelp` / `infoBox` / `warningNote` /
> `successNote`)" — `:9-13`. Note tone colours cite phone dark `colors.info`/`.warning`/`.success`
> (`src/constants/Colors.ts:99-103`, comment at `:67`).

**Imports:** `SelectField` from `_shared` (`:5`), `GLASS` (`:6`).

**Full export enumeration with consumer lists:**

| Export | Lines | Recipe | Consumers |
|---|---|---|---|
| **`PaneDescription`** | `:21-23` | `<p>` · `margin:'0 0 18px', fontSize:13, lineHeight:1.55, color:'#99badd'` | **7** — CloudSync `:48-51`, ExportSecurity `:73-76`, FormFields `:353`, Location `:47-49`, MediaCapture `:57-60`, Security `:42-45`, TimeSync `:35-38` |
| **`PaneGroup`** | `:40-61` | `role="group"`; outer `marginBottom:20`; header row `flex, alignItems:center, justifyContent:space-between, gap:10`; label `fontSize:15, fontWeight:600, '#f0f4f8'`; optional right `value` `fontSize:15, fontWeight:700, '#2B8CC1'`; optional `help` `fontSize:12.5, lineHeight:1.45, '#7a9fc4', margin:'4px 0 10px'` | **7 panes, 18 call sites** — Appearance `:39,54`; CloudSync `:53`; ExportSecurity `:104,114,127`; Location `:51,63,72`; MediaCapture `:62,83,95,107,127,138,154`; Security `:47,58,69`; TimeSync `:40` |
| `PaneNoteTone` (type) | `:65` | `'info' \| 'warning' \| 'success'` | — |
| `NOTE_TONE` (internal) | `:68-72` | info `fg #4BA3D4 / border rgba(75,163,212,0.35) / bg rgba(75,163,212,0.10)`; warning `#ffd93d / .35 / .09`; success `#10d177 / .35 / .09` | — |
| **`PaneNote`** | `:81-117` | `padding:13, marginTop:10, borderRadius:10, border:'1px solid ${t.border}', background:t.bg, fontSize:12.5, lineHeight:1.5, color:t.fg`; `data-pane-note={tone}`; optional `id`/`role="status"` | **6 panes, 8 sites** — Appearance `:49`, CloudSync `:63`, ExportSecurity `:159,166`, MediaCapture `:121,148` (both `role="status"`), Security `:80`, TimeSync `:52` |
| **`PaneStubNote`** | `:131-159` | The D6 honesty box. Outer `data-testid="settings-pane-stub-note"`, `padding:14, marginBottom:18, borderRadius:10, border:GLASS.borderAccent, background:'rgba(43,140,193,0.08)'`. Eyebrow jbmono `fontSize:10.5, fontWeight:600, letterSpacing:1.4, uppercase, '#7a9fc4', marginBottom:7`, text "In the demo". Body `fontSize:12.5, lineHeight:1.55, '#cdd9e6'` | **9** — every pane except `FormFieldsPane`: About `:38-43`, Appearance `:32-37`, CloudSync `:40-46`, ExportSecurity `:64-71`, Location `:39-45`, MediaCapture `:49-55`, Security `:33-40`, TimeSync `:28-33`, UserProfile `:140-144` |
| `radioOption` (internal) | `:163-175` | `flex, alignItems:center, gap:12, width:100%, padding:'12px 14px', marginBottom:8, borderRadius:10, border:'1px solid ${selected?"#2B8CC1":"#1e3a5f"}', background: selected?'rgba(43,140,193,0.08)':'transparent', textAlign:left` | — |
| **`PaneRadioGroup<T>`** | `:182-232` | `role="radiogroup"`; ring `20×20, borderRadius:10, border:'2px solid ${selected?"#2B8CC1":"#7a9fc4"}'`; dot `10×10, borderRadius:5, background:'#2B8CC1'`; label `fontSize:13.5, fontWeight:500, '#f0f4f8'` | **1 pane, 2 sites** — ExportSecurity `:105`, `:118` |
| **`PaneSelect<T>`** | `:246-268` | Typed wrapper over `SelectField` — **no own visual style**; defers to `Dropdown` | **3 panes, 6 sites** — Location `:55,64`; MediaCapture `:87,99,111`; TimeSync `:44` |
| **`PaneSlider`** | `:282-326` | Native `<input type="range">`, `width:100%, accentColor:'#2B8CC1', cursor:pointer`; min/max row `flex, justifyContent:space-between, fontSize:11, '#7a9fc4'` | **1** — MediaCapture `:67` (Photo Quality) |

- **Hardcoded literals**: `#2B8CC1` appears redundantly in `PaneGroup`'s value colour, `PaneSlider`'s `accentColor`, and `radioOption`/`PaneRadioGroup`'s ring+dot — **no `T` import in this file**; likewise `#f0f4f8`/`#cdd9e6`/`#7a9fc4`/`#99badd`/`#1e3a5f`.
- **Notes**: `PaneNote`'s `role="status"` is used **only** for notes that appear in response to user action; a static always-present note omits it. No motion in this module.

### The panes

| Pane | Lines | v1 row | `_pane-chrome` exports used | Hand-rolled recipes |
|---|---|---|---|---|
| `AboutPane.tsx` | 135 | **93** | `PaneStubNote` | app icon chip `:46-63` (`72×72, borderRadius:18, background:GLASS.gradientAccent`, inner `stroke:'#fff'`); name/version `:64-65` (`fontSize:20/700`, `14/'#99badd'`); `InfoRow` `:128-134` (label `13/500/'#99badd'`, value `13/600/'#f0f4f8'`), wrapper `:68` (`paddingTop:14, borderTop:GLASS.border, gap:8`); body `:73-76` (`margin:'18px 0', fontSize:13, lineHeight:1.6, '#99badd', center`); support link row `:78-103` (`gap:10, padding:14, borderRadius:10, border:GLASS.borderBtn, color:'#2B8CC1', fontSize:14, fontWeight:500`); address fallback `:113-118` (`fontSize:12, '#7a9fc4', userSelect:'text'`); copyright `:120-123` (`paddingTop:18, gap:4, fontSize:11, '#46607e'`) |
| `AppearancePane.tsx` | 63 | **87** | `PaneGroup`, `PaneNote`, `PaneStubNote` + `Toggle` | **none** — 100% composition |
| `CloudSyncPane.tsx` | 70 | **92** | `PaneDescription`, `PaneGroup`, `PaneNote`, `PaneStubNote` + `Toggle` | **none** |
| `ExportSecurityPane.tsx` | 174 | **91** | `PaneDescription`, `PaneGroup`, `PaneNote`, `PaneRadioGroup`, `PaneStubNote` + `Toggle`, `GLASS` | inert "Set Default Password" button `:131-158` (`gap:8, marginTop:10, padding:'10px 14px', borderRadius:10, border:GLASS.borderBtn, background:transparent, color:'#7a9fc4', fontSize:13, fontWeight:500, cursor:'not-allowed', opacity:0.6`, `aria-disabled`, focusable); password status line `:128-130` (`fontSize:13, '#99badd'`); disclosure wrappers `:85,93` (`marginBottom:16/20`) |
| `LocationPane.tsx` | 81 | **89** | `PaneDescription`, `PaneGroup`, `PaneSelect`, `PaneStubNote` + `Toggle` | **none** |
| `MediaCapturePane.tsx` | 166 | **88** | `PaneDescription`, `PaneGroup`, `PaneNote`, `PaneSelect`, `PaneSlider`, `PaneStubNote` + `Toggle` — **all six** | **none** — the best-composed pane |
| `SecurityPane.tsx` | 86 | A1 (appendix) | `PaneDescription`, `PaneGroup`, `PaneNote`, `PaneStubNote` + `Toggle` | **none** |
| `TimeSyncPane.tsx` | 59 | **90** | `PaneDescription`, `PaneGroup`, `PaneNote`, `PaneSelect`, `PaneStubNote` | **none** — the smallest pane |
| `UserProfilePane.tsx` | 184 | **85** | `PaneStubNote` only | summary line `:71` (`fontSize:14, lineHeight:1.5, '#f0f4f8', marginBottom:6`); empty line `:72` (same, `'#99badd'`); **edit button `:74-84`** (`marginTop:12, padding:'9px 16px', borderRadius:8, border:'1px solid #2B8CC1', background:transparent, color:'#4BA3D4', fontSize:13.5, fontWeight:600`) — **border `#2B8CC1` but text `#4BA3D4`; every other accent-outline control in the package pairs them as the same hex** |
| `panes/index.tsx` | 78 | — | pane registry | — |
| `panes/pane-props.ts` | 18 | — | types | — |

### `screens/settings/panes/FormFieldsPane.tsx` (369 lines) — the one non-stub pane
- **Replicates**: v1 matrix row **A2** (owner decision D9) — phone `FormCustomizationSection` + `FormCustomizationProfilePicker`. **Explicitly REAL, not stubbed** (`:19-21`). Row shape cites phone `FormCustomizationSection.tsx:96-142`.
- **Shared chrome used**: `GLASS.borderSoft` only; `switchKeyDown` from `_shared`; `PaneDescription` — **the only `_pane-chrome` export it uses**. **It does NOT use `Toggle`**: `_shared`'s `Toggle` prints the label *inside* the control, which double-labels a grid row that already draws its own label (rationale `:139-144`).
- **Recipes hand-rolled** (its own mini design system):
  - `accordion group wrapper` — `:82-87` — `border:GLASS.borderSoft, borderRadius:10, marginBottom:8, overflow:hidden`.
  - `row shell` — `:89-95` — `flex, alignItems:center, gap:8, padding:'0 12px', minHeight:48`.
  - `chevron trigger button` — `:97-109` — `flex:1, minWidth:0, gap:8, padding:'12px 0'`, transparent, `textAlign:left, color:'#f0f4f8'`; chevron is a **text glyph** `▾`/`▸` (`:290-292`).
  - `"Always on" lock pill` — `:111-120`, `:131-137` — `flex:'0 0 auto', fontSize:10.5, fontWeight:600, '#7a9fc4', border:GLASS.borderSoft, borderRadius:999, padding:'2px 8px', whiteSpace:nowrap`.
  - `expanded body / note` — `:122-123` — body `padding:'2px 12px 12px 30px'`; note `fontSize:12, lineHeight:1.5, '#7a9fc4'`.
  - **`RowSwitch`** — `:151-198` — `role="switch"`; track `46×28, borderRadius:14, background: on?'#2B8CC1':'#1e3a5f'`; thumb `top:3, [on?right:left]:3, 22×22, borderRadius:11, background: on?'#fff':'#7a9fc4'`. **Byte-identical geometry to `_shared.tsx`'s `Toggle` (`:552-553`)** — re-implemented to drop the inline label.
  - `profile picker (segmented)` — `:200-251` — `role="radiogroup", flex, gap:8`; chip `flex:1, padding:'10px 12px', borderRadius:10, border:'1px solid ${active?"#2B8CC1":"#1e3a5f"}', background: active?'rgba(43,140,193,0.14)':'transparent', color: active?'#2B8CC1':'#cdd9e6', fontSize:13.5, fontWeight:600`; blurb `fontSize:12.5, '#99badd', marginTop:10`; reduction line `fontSize:11.5, '#7a9fc4', marginTop:3`.
  - `field row` — `:319-332` — `flex, alignItems:center, gap:8, padding:'3px 0'`; label ellipsised `fontSize:13, '#cdd9e6'`.
  - `section footnote` — `:366` — `fontSize:11.5, lineHeight:1.5, color:'#5d7a9a', marginTop:14`.
  - `additive-tools header` — `:361` — `fontSize:12.5, fontWeight:600, '#f0f4f8', margin:'16px 0 8px'`.
- **Hardcoded literals**: `#5d7a9a` (`:366`) unique in this package; `rgba(43,140,193,0.14)` — a third accent alpha.
- **Notes**: **The clearest consolidation win in the settings package**: `RowSwitch` and `Toggle` are one recipe with two renderers — give `Toggle` a `hideLabel` prop and delete `RowSwitch`. Uses `useId()` per `ScreenRow` to namespace lock-pill `aria-describedby` across ~12 steps × ~50 fields (`:264-268`).

## §4 — Shared chrome & primitives (the leverage points)

These are the "mutate the recipe, not the consumer" modules. Consumer lists below were produced by
real `grep`, not inference.

### §4.1 `screens/_shared.tsx` (566 lines) — the single most valuable file in the port

**Full export enumeration.**

#### `switchKeyDown` — `:12-19`
Pure keydown-handler factory: Enter/Space → `preventDefault()` + `activate()`. **No styling.**
**Consumers:** `inputs/GpsCaptureControl.tsx`, `screens/map/MapCanvas.tsx`,
`screens/settings/panes/FormFieldsPane.tsx`, `screens/TimeOffsetScreen.tsx`. *(Also re-implemented
inline inside `Toggle` and `GpsCaptureControl`'s own switch.)*

#### `MODAL_LAYER` — `:35-36`
`{ base: 0, overSheet: 4 }` + a derived union type. Offsets added to `ModalShell`'s 21/22.
**Consumers:** `screens/settings/UserProfileModal.tsx` (the only modal-over-modal).

#### `MODAL_SCRIM_Z` — `:45` = `21` · `MODAL_SHEET_Z` — `:46` = `22`
**Consumers:** `screens/settings/SettingsModal.tsx` (bounds its own z-indices against them).

#### `grid` (module-local, not exported) — `:48-53`
`position:'absolute', inset:0, backgroundImage: GLASS.gridOverlay, pointerEvents:'none'`.
Used only inside `ModalShell`.

#### **`ModalShell`** — `:64-184` — **the highest-leverage recipe in the codebase**
| Part | Values |
|---|---|
| scrim | `position:absolute, inset:0, zIndex: MODAL_SCRIM_Z + elevation, background:'rgba(4,8,14,0.55)'` |
| sheet panel | `position:absolute, left:0, right:0, top:34, bottom:0, zIndex: MODAL_SHEET_Z + elevation, borderTopLeftRadius:24, borderTopRightRadius:24, background:'#0d1b2a', overflow:hidden, display:flex, flexDirection:column, animation:'screenIn 0.3s ease'` |
| header row | `padding:18, borderBottom:GLASS.border, display:flex, alignItems:center, justifyContent:space-between` |
| back chevron | transparent/borderless button, SVG `stroke:'#99badd', strokeWidth:2` |
| title | `fontSize:22, fontWeight:700, color:'#f0f4f8'` |
| subtitle | `fontSize:13, color:'#99badd', marginTop:4` |
| close | SVG `26×26, stroke:'#99badd'` |
| body (default) | `position:relative, flex:1, overflowY:auto, overscrollBehavior:contain, padding:18` |
| body (`fillBody`) | `flex:1, minHeight:0, overflow:hidden, padding:18, display:flex, flexDirection:column` |
| footer | `padding:18, borderTop:GLASS.border` |
| grid overlay | the `grid` const above |

Renders through `PhoneOverlayPortal`.
**Consumers (8 real importers):** `CaseActionsSheet.tsx`, `DuplicateLocationModal.tsx`,
`EditIncidentLocationModal.tsx`, `ImportModal.tsx`, `MediaLibrarySheet.tsx`, `NewCaseModal.tsx`,
`NewLocationModal.tsx`, `settings/UserProfileModal.tsx`.
*(`PdfPreview.tsx`, `AlertDialog.tsx`, `phone-overlay.tsx`, `BootSequence.tsx`,
`DeleteConfirmationModal.tsx`, `import/PasteStage.tsx`, `import/PickerStage.tsx`,
`settings/SettingsModal.tsx` only mention it in comments — they do not import it.)*

> **`SettingsModal.tsx:64-96` is a byte-identical second copy** of the scrim + sheet recipe, built
> from the same z-index constants but not from the component. Change `ModalShell`'s sheet look and
> Settings will silently diverge.

#### `fieldInput` (module-local, **not exported**) — `:186-195`
`width:'100%', borderRadius:8, border:GLASS.border, background:'#0d1b2a', color:'#f0f4f8', fontSize:15, padding:'11px 12px', outline:'none'`.

> **The single worst duplication in the codebase.** These exact values are re-declared, unimported,
> in **three** other files:
> - `inputs/AddressAutocomplete.tsx:35-44` (`inputStyle`)
> - `inputs/IncidentLocationFields.tsx:87-96` (`coordInput`)
> - `screens/NewCaseModal.tsx:52-61` (`coordInput`)
>
> …plus a fourth inline copy at `screens/SubmissionScreen.tsx:147` (with `opacity:0.6` added).
> **Exporting `fieldInput` and replacing those four is the cheapest high-value fix in the port.**

#### **`Field`** — `:198-310`
| Part | Values |
|---|---|
| wrapper | `marginBottom:14` (or `opacity:0.6` when `readOnly`) |
| label row | `fontSize:13, fontWeight:500, color:'#cdd9e6', marginBottom:6` |
| required asterisk | `color:'#ff4757'` |
| input/textarea | `fieldInput` base; error overrides `borderColor:'#ff4757'` |
| textarea extras | `minHeight:76, resize:vertical, fontFamily:inherit, lineHeight:1.5`, `rows=3` |
| error line | `fontSize:12, color:'#ff6b78', marginTop:5, role="alert"` |
| hint line | `fontSize:12, color:'#7a9fc4', marginTop:5` |

**Consumers (15):** `inputs/LocationFields.tsx`, `inputs/IncidentLocationFields.tsx`,
`inputs/MetadataForm.tsx`, `CamerasScreen.tsx`, `CompletionScreen.tsx`, `DuplicateLocationModal.tsx`,
`DvrInfoScreen.tsx`, `ExportInfoScreen.tsx`, `ExtractedScopeScreen.tsx`, `NewCaseModal.tsx`,
`NewLocationModal.tsx`, `RequestedScopeScreen.tsx`, `settings/panes/FormFieldsPane.tsx`,
`settings/UserProfileModal.tsx`, `SubmissionScreen.tsx`.

#### `Accordion` — `:313-325`
Native `<details>` with class `demo-accordion` (marker-hiding + chevron rotation live in
`demo.css:142-144`): `marginBottom:14, borderRadius:10, border:GLASS.border, background:'rgba(13,27,42,0.4)', overflow:hidden`;
`<summary>` `cursor:pointer, padding:'12px 14px', fontSize:14, fontWeight:600, color:'#cdd9e6', display:flex, alignItems:center, justifyContent:space-between`;
chevron SVG class `demo-accordion-chevron`, `stroke:'#7a9fc4'`, `transition:'transform 0.2s'`; body `padding:'2px 14px 4px'`.
**Consumers (1):** `NewCaseModal.tsx`.

#### `ModalActions` — `:328-391`
Row `display:flex, gap:12`; cancel `flex:1, textAlign:center, padding:13, ...glassBtnSecondary, fontSize:15, fontWeight:600`;
submit `flex:1, padding:13, ...glassBtnPrimary, fontSize:15, fontWeight:600`, blocked → `aria-disabled, cursor:'not-allowed', opacity:0.45`.
**Consumers (6):** `DuplicateLocationModal.tsx`, `EditIncidentLocationModal.tsx`, `NewCaseModal.tsx`,
`NewLocationModal.tsx`, `settings/panes/FormFieldsPane.tsx`, `SplashScreen.tsx`.
*(`settings/UserProfileModal.tsx:101-109` hand-rolls the submit half because it has no cancel.)*

#### **`WizardHeader`** — `:394-409`
Bar `display:flex, alignItems:center, justifyContent:space-between, position:sticky, top:0, zIndex:16, background:'linear-gradient(180deg,#1b2e48,#15273b)', padding:'56px 12px 11px', borderBottom:GLASS.border`;
local `iconBtn` `cursor:pointer, display:flex, padding:4, background:transparent, border:none`;
back SVG `22×22, stroke:'#99badd'`; title `fontSize:20, fontWeight:700, color:'#f0f4f8'`; hamburger SVG `22×22, stroke:'#99badd'`.
**Consumers (10):** `ArrivalDepartureScreen`, `CamerasScreen`, `CompletionScreen`, `DvrInfoScreen`,
`ExportInfoScreen`, `ExtractedScopeScreen`, `NotesScreen`, `RequestedScopeScreen`, `SubmissionScreen`,
`TimeOffsetScreen`.

#### **`WizardNext`** — `:412-418`
`width:'100%', textAlign:center, padding:14, ...glassBtnPrimary, fontSize:15, fontWeight:600, cursor:pointer, boxShadow:'0 6px 18px rgba(37,128,173,0.35)'`.
**Consumers:** the same wizard screens as `WizardHeader`.
*(Its `boxShadow` is hand-duplicated at `CompletionScreen.tsx:147`.)*

#### **`SectionCard`** — `:421-428`
`marginBottom:18, ...glassCard, padding:16`; title `fontSize:17, fontWeight:600, color:'#f0f4f8', paddingBottom:10, marginBottom:14, borderBottom:GLASS.border`.
**Consumers (5):** `CompletionScreen`, `DvrInfoScreen`, `ExportInfoScreen`, `SubmissionScreen`, `TimeOffsetScreen`.

#### `DateTimeField` — `:432-434`
Thin re-export of `inputs/DateTimeField.tsx`'s impl; no own styling.
**Consumers (6):** `ArrivalDepartureScreen`, `CompletionScreen`, `ExtractedScopeScreen`,
`OcrCaptureScreen`, `RequestedScopeScreen`, `TimeOffsetScreen`.

#### `SelectField` — `:449-451`
Thin wrapper over `Dropdown` with `placeholder="Select…"`; no own styling.
**Consumers (4):** `CamerasScreen`, `DvrInfoScreen`, `ExportInfoScreen`, `settings/panes/_pane-chrome.tsx`.
`SelectFieldName` / `SelectFieldProps` — `:466-476` — type-only (discriminated union for labelled vs a11y-only pickers).

#### **`Toggle`** — `:479-557`
Row `display:flex, alignItems:center, justifyContent:space-between, cursor: pointer|not-allowed, padding:'4px 0', opacity: disabled?0.55:1`;
label `fontSize:14, color:'#f0f4f8'`;
**track `width:46, height:28, borderRadius:14, background: on?'#2B8CC1':'#1e3a5f'`**;
**thumb `position:absolute, top:3, [on?right:left]:3, width:22, height:22, borderRadius:11, background: on?'#fff':'#7a9fc4'`**.
`role="switch"`, keyboard via `switchKeyDown`.
**Consumers (7):** `ExportInfoScreen.tsx`, `settings/panes/AppearancePane.tsx`, `CloudSyncPane.tsx`,
`ExportSecurityPane.tsx`, `LocationPane.tsx`, `MediaCapturePane.tsx`, `SecurityPane.tsx`.

> **The switch track is re-implemented verbatim in three other places** and none of them import
> `Toggle`:
> - `settings/panes/FormFieldsPane.tsx:151-198` (`RowSwitch` — to drop the inline label)
> - `screens/TimeOffsetScreen.tsx:111-124` (the DST switch)
> - `inputs/GpsCaptureControl.tsx:179` (the reverse-geocode toggle)
>
> **Four renderers, one recipe.** Adding a `hideLabel` prop to `Toggle` collapses at least three of them.

#### `AddRowButton` — `:560-566`
`width:'100%', textAlign:center, padding:12, borderRadius:10, border:'1px dashed #2a4a6f', background:'transparent', color:'#4BA3D4', fontSize:14, fontWeight:600, cursor:pointer, marginBottom:14`.
**Consumers (3):** `ArrivalDepartureScreen`, `CamerasScreen`, `RequestedScopeScreen`.

### §4.2 `ui/controls/`

#### `controls/AlertDialog.tsx` (196 lines) — the blocking-dialog primitive
- **Replicates**: RN `Alert.alert(title, message, buttons)` — "an OS-level blocking dialog on the device" (`:80-82`).
- **Shared chrome used**: `PhoneOverlayPortal`; `GLASS`, `glassBtnPrimary`, `glassBtnSecondary`.
- **Recipe**:
  - scrim `:130-133` — `position:absolute, inset:0, zIndex:60, background:'rgba(4,8,14,0.66)'`
  - dialog panel `:141-156` — `position:absolute, left:24, right:24, top:'50%', transform:translateY(-50%), zIndex:61, borderRadius:16, border:GLASS.borderSoft, background:GLASS.gradientPanel, boxShadow:'0 24px 60px rgba(0,0,0,0.55)', padding:'20px 20px 16px', animation:'screenIn 0.2s ease'`
  - title `:158` — `fontSize:17, fontWeight:700, '#f0f4f8', marginBottom:8`
  - body `:161-165` — `fontSize:13.5, lineHeight:1.55, '#cdd9e6', whiteSpace:'pre-line', marginBottom:16`
  - button row `:170` — `display:flex, gap:8`, becomes `flexDirection:'column'` when `actions.length > 2`
  - action button `:176-186` — `flex:1, padding:12, fontSize:14.5, fontWeight:600`; **destructive** → `{...glassBtnSecondary, border:GLASS.borderError, color:'#ff6b7a'}`; **cancel** → `glassBtnSecondary`; default → `glassBtnPrimary`
- **Consumers:** `NotesScreen` (4 flows), `NewCaseModal`, `TimeOffsetScreen`, `OcrCaptureScreen`, `MediaLibrarySheet`, plus the export/case-map notice copy in `exportNotices.ts`.
- **Notes**: A module-scope `activationOrigin`/`tracking` singleton (`:40-41`, installed eagerly at `:77`) captures the pointerdown/keydown origin in the **capture phase**, so focus restoration targets the real activating element rather than `document.activeElement` at mount (which can be `<body>` if the opener disabled itself). `FOCUSABLE` selector at `:45`. **The scrim deliberately does NOT dismiss** (blocking semantics); Escape does.
- **Restyle note**: its dialog panel is **one of three byte-identical copies** (with `DeleteConfirmationModal.tsx:98-121` and `ExportModal.tsx:253-268`) and its scrim alpha `0.66` differs from `ModalShell`'s `0.55`. Consolidating "centred dialog" into one exported recipe fixes all three.

#### `controls/ExitDialog.tsx` (95 lines) — **demo-only**
- Not a phone surface. Page-level "before you go" gate on the Back-to-site link. **`position:fixed`, NOT the phone portal** (`:21`).
- **Recipe**: backdrop `:47` — `position:fixed, inset:0, zIndex:100, background:'rgba(4,8,14,0.72)', display:flex, alignItems:center, justifyContent:center, padding:24`; dialog card `:52` — `width:460, maxWidth:'100%', borderRadius:16, border:'1px solid rgba(30,58,95,0.6)', background:'#0b1626', boxShadow:'0 40px 90px rgba(0,0,0,0.6)', padding:'26px 26px 22px'`; eyebrow `:56` — jbmono, `fontSize:11, letterSpacing:2, color:'#4ecdc4', uppercase`; heading `fontSize:20, fontWeight:700, '#f0f4f8'`; body `fontSize:14, lineHeight:1.55, '#bcccde'`; unseen row `:65` — `gap:10, padding:'6px 10px', borderRadius:8, border:'1px solid rgba(30,58,95,0.45)', background:'rgba(10,20,34,0.5)'`; row number jbmono `fontSize:10, '#46607e'`; unlit dot `8×8, borderRadius:4, border:GLASS.borderBtn`; "Keep exploring" `flex:1, padding:13, glassBtnPrimary, fontSize:14, fontWeight:600` + `autoFocus`; "Leave anyway" `padding:'0 18px', borderRadius:10, border:GLASS.borderBtn, color:'#99badd', fontSize:14, fontWeight:600, textDecoration:'none'`; unseen-list `maxHeight:264`.
- **Hardcoded literals**: `rgba(4,8,14,0.72)` — a **third scrim darkness** (0.55 / 0.66 / 0.72); `rgba(30,58,95,0.6)` — near-miss of `borderSoft`'s `0.5`; **`#4ecdc4` teal**.
- **Notes**: Its Escape handler calls `e.stopPropagation()` (`:34`) because `BootSequence` also listens on `window` — the app's only pair of live simultaneous Escape listeners.

#### `controls/ExploreChecklist.tsx` (99 lines) — **demo-only**
- The rail's numbered manifest rows. **Shared chrome:** `GLASS.borderBtn` only.
- **Recipe**: `row` `:19-31` — `position:relative, flex, alignItems:center, gap:10, padding:'7px 12px', borderRadius:8, border:'1px solid rgba(30,58,95,0.45)', width:'100%', textAlign:left, scrollMarginTop:24`; header `:53` — jbmono, `fontSize:11, letterSpacing:1.5, '#7a9fc4', uppercase`, counter `done?'#10d177':'#5d7a9a'`; active row bg `rgba(26,53,80,0.45)` vs inactive `rgba(10,20,34,0.5)`; active left rail `position:absolute, left:0, top:6, bottom:6, width:3, borderRadius:'0 2px 2px 0', background:'#2B8CC1'`; row number jbmono `fontSize:10, visited?'#4ecdc4':'#46607e'`; label `fontSize:12.5, visited?'#cfe0f2':'#7a9fc4'`, ellipsised; **LED dot** `8×8, borderRadius:4, background: visited?'#10d177':'transparent', border: visited?'none':GLASS.borderBtn, boxShadow: visited?'0 0 7px rgba(16,209,119,0.6)':'none'`.
- **Hardcoded literals**: the LED green + glow is **duplicated verbatim in `WizardDrawer.tsx:79`** (`DOT.complete`); `#4ecdc4` teal.
- **Notes**: `useReducedMotion` gates `scrollIntoView` behaviour (`'smooth'` vs `'auto'`, `:41-50`); the effect fires only on active-row *change*, guarded by a `prevActiveId` ref (StrictMode-safe).

#### `controls/TabBar.tsx` (102 lines)
- **Replicates**: the phone's bottom tab bar; `TAB_ICONS` cites `app/(tabs)/_layout.tsx:33,44,55,66`.
- **Shared chrome used**: **none** — fully self-contained styling. Imports `TAB_LABELS`/`TAB_VIEWS` from the engine registry (order-derived, never hand-listed).
- **Recipe**: `TAB_BAR_HEIGHT = 50` (`:10`, exported — "single source of truth… overlays sit flush above it"); bar `:61-75` — `position:absolute, left:0, right:0, bottom:0, height:50, boxSizing:'border-box', zIndex:18, background:'linear-gradient(180deg,#1e3450,#16283c)', borderTop:'1px solid #28456b', padding:'8px 0 12px', display:flex, alignItems:'stretch', boxShadow:'0 -6px 18px rgba(0,0,0,0.28)'`; `tab` `:12-22` — `flex:1, column, alignItems:center, gap:3, padding:'2px 0'`, transparent; icon stroke/width dynamic — active `#4BA3D4`/1.9, inactive `#5d7a9a`/1.8 (`:97`).
- **Notes**: `aria-current="page"` instead of hue-only active signalling (WCAG 1.4.1/4.1.2 fix, `:82-86`).

#### `controls/WizardDrawer.tsx` (412 lines)
- **Replicates**: phone `CustomDrawerContent.tsx:265-400`; the Media accordion is "THE entry point to every media surface", copy/labels/hints lifted verbatim (`:194-199`).
- **Shared chrome used**: `PhoneOverlayPortal`; `drawerTransition`, `DRAWER_W` from `ui/motion`; `GLASS.borderSoft`, `.gradientCard`, `.border`.
- **Recipes hand-rolled**:
  - `itemButton` `:58-71` — `position:relative, flex, alignItems:center, justifyContent:space-between, margin:'0 10px 8px', padding:'13px 15px', borderRadius:10, border:GLASS.borderSoft, background:GLASS.gradientCard, width:'calc(100% - 20px)', textAlign:left`.
  - `dotBase`/`DOT` `:77-81` — `11×11` circle; `complete: background:'#10d177', boxShadow:'0 0 7px rgba(16,209,119,0.6)'`; `partial: background:'#ffd93d', boxShadow:'0 0 7px rgba(255,217,61,0.55)'`.
  - `SAVE_STATUS_COLOR` `:89-94` — `saved`/`pending` `#5d7a9a`; `unavailable`/`failed` `#c9a227`.
  - `mediaSubItem` `:139-154` — `flex, gap:10, margin:'0 10px 6px 24px', padding:'10px 13px', borderRadius:10, border:GLASS.borderSoft, background:GLASS.gradientCard, width:'calc(100% - 34px)', fontSize:14, fontWeight:500, color:'#cdd9e6'`.
  - drawer header `:333-341` — `padding:'54px 18px 14px', borderBottom:GLASS.border, background:'linear-gradient(180deg,rgba(26,45,68,0.6),rgba(13,27,42,0.2))'`.
  - backdrop `:305-308` — `zIndex:41, background:'rgba(4,8,14,0.55)'`.
  - panel `:319-330` — `zIndex:42, width:DRAWER_W(300), background:'#0b1626', boxShadow:'-24px 0 60px rgba(0,0,0,0.5)'`.
  - "Back to Cases" row `:354` — `background:'#101f33'`.
  - footer `:389` — `padding:'14px 18px', borderTop:GLASS.border, background:'linear-gradient(0deg,rgba(26,45,68,0.6),rgba(13,27,42,0.2))'`.
- **Hardcoded literals**: `#c9a227` — a **fourth amber**, distinct from `#ffd93d`/`#ffd07a`/`#f5a623`; `#101f33` and `#0b1626` one-offs.
- **Notes**: **z-index 41/42** — above `PickerSheet`'s 31/32 and `ModalShell`'s 21/22(+4), below `AlertDialog`'s 60/61 and `PdfPreview`'s 43. `AnimatePresence` with two separately-keyed motion children so rapid open/close can't strand one (`:267-270`). `useReducedMotion` collapses drawer slide, chevron rotate, and the accordion height/opacity reveal to `{duration:0}`. Media sub-rows are **unmounted** while collapsed, not clipped — a deliberate deviation from the phone's measured-height approach (`:210-221`). `TOOL_ROWS` is a total `Record<AdditiveFormStepId, …>` so a new capture tool is a compile error if unwired.
- **Deferral §23** records that the complete/partial dot distinction is **colour-only** — a non-colour ring was built and then reverted at the owner's request. **A restyle that touches these dots should re-raise it.**

### §4.3 `ui/chrome/`

#### `chrome/PdfPreview.tsx` (176 lines)
- **Replicates**: the demo's export/print flow; no 1:1 phone screen ("the demo's 'export'", `:19`).
- **Shared chrome used**: `PhoneOverlayPortal`; `glassBtnPrimary`, `glassBtnSecondary`. **No `GLASS.*` tokens** — its own neutral chrome.
- **Recipe**: overlay `:136` — `position:absolute, inset:0, zIndex:43, background:'#11151c', flexDirection:column, animation:'screenIn 0.3s ease'`; header `:137` — `padding:'50px 16px 14px', borderBottom:'1px solid #2a3340'`; title `fontSize:16, fontWeight:700, '#f0f4f8'`; backdrop `:151` — `flex:1, overflow:hidden, padding:14, background:'#3a3f47'`; iframe `:164` — `width/height:100%, border:none, borderRadius:3, background:'#fff', boxShadow:'0 8px 30px rgba(0,0,0,0.5)'`, `sandbox="allow-modals allow-same-origin"` (**test-pinned**); print-blocked notice `:167` — `role="status", fontSize:12.5, color:'#ffd07a', background:'rgba(255,200,90,0.1)', border:'1px solid rgba(255,200,90,0.28)', borderRadius:8, padding:'8px 12px'`; footer `:169` — `padding:'14px 18px 24px', borderTop:'1px solid #2a3340', display:flex, gap:10`.
- **Hardcoded literals**: the whole `#11151c` / `#2a3340` / `#3a3f47` palette is unique to this file — **deliberately a neutral PDF-viewer chrome, not the app's glass**. A themed restyle should probably leave it alone.
- **Notes**: `zIndex:43`. An elaborate `beforeprint`-listener state machine (R-12/R-36/R-47) distinguishes "dialog opened" / "blocked" / "no signal available" — a **positive-signal detector**; absence of a throw is never treated as success. Deferral §21 (Escape/backdrop dismiss) is marked ✅ RESOLVED.

#### `chrome/DemoErrorBoundary.tsx` (135 lines)
- **Replicates**: the phone's route-level `ErrorFallback` copy for `ocr`/`mediaCapture`/`audioRecording` (verbatim quotes cited to `app/(form)/ocr-capture.tsx`, `media-capture.tsx`, `audio-recording.tsx`, ui-mapping 06/09/10 — `:8-9`); every other view gets demo-voiced generic copy.
- **Shared chrome used**: `GLASS.borderError`, `GLASS.gradientCardDiag`; `glassBtnPrimary`.
- **Recipe**: `wrap` `:23-30` — `position:absolute, inset:0, centred, padding:'54px 22px 40px'`; `card` `:31-41` — `width:'100%', borderRadius:16, border:GLASS.borderError, background:GLASS.gradientCardDiag, padding:'26px 20px', column, alignItems:center, textAlign:center`; `detail` `:42-54` — `width:'100%', borderRadius:10, border:GLASS.borderError, background:'rgba(255,71,87,0.06)', padding:'10px 12px', fontSize:12, lineHeight:1.5, '#cdd9e6', jbmono, overflowWrap:'break-word', marginBottom:16`; error icon `42×42, stroke:'#ff4757'`; heading `fontSize:20, fontWeight:700, '#f0f4f8'`; body `fontSize:13, '#9fc0db', lineHeight:1.5`; recovery button `width:'100%', padding:13, glassBtnPrimary, fontSize:15, fontWeight:600`.
- **Notes**: **The only class component in the feature** (error boundaries require it). Reset strategy is `getDerivedStateFromProps` clearing on `view` change, **not a `key` remount** — remounting would kill `ScreenStage`'s `AnimatePresence` cross-slide. `autoFocus` on the recovery button (R-8, citing `ExitDialog` as the in-repo idiom). `FALLBACK_COPY` is `Partial<Record<AppView,string>>` with a `GENERIC_COPY` fallback.

### §4.4 `ui/primitives/`

| File | Lines | Styling content |
|---|---|---|
| `TypewriterText.tsx` | 29 | **None** — pure `<span>{shown}</span>`; styling delegated to the caller via `style`/`className`. "No per-keystroke caret (per the spec)" (`:15`). |
| `useTypewriter.ts` | 30 | **None** — interval-driven substring reveal. Default `perCharMs = 45` (`:10`). |
| `useLongPress.ts` | 264 | **One export**: `LONG_PRESS_SURFACE_STYLE` — `:106` — `{ userSelect: 'none' }` (`as const satisfies CSSProperties`), spread into a long-press surface's own `style`. Constants: `LONG_PRESS_MS = 500` (`:80`, "THE one definition" — three duplicates were consolidated here), `LONG_PRESS_MOVE_TOLERANCE_PX = 10` (`:90`), `NESTED_CONTROL_SELECTOR = 'button, a, input, select, textarea, [role="button"]'` (`:96`). Documents a "reset-first, guard-second" gesture-latch protocol; `onClickCapture` swallows the trailing click of a fired hold, but keyboard clicks (`detail===0`) are never swallowed. |

### §4.5 Top-level shell

#### `PhoneFrame.tsx` (179 lines) — the device shell
> "lifted verbatim from the prototype (404 frame · 378×786 screen · status bar · dynamic island · scan sweep · home indicator)" (`:29-31`)

| Part | Line | Values |
|---|---|---|
| outer frame | `:40-50` | `width:404, padding:13, borderRadius:58, background:'linear-gradient(150deg,#4a4f57 0%,#23272e 42%,#191c22 58%,#3c4148 100%)', boxShadow:'0 60px 100px -34px rgba(0,0,0,0.85), 0 0 0 1.5px rgba(255,255,255,0.05) inset, 0 2px 3px rgba(255,255,255,0.10) inset', transform:scale(scale), transformOrigin:'top center'` |
| inner screen | `:52-61` | `width:378, height:786, borderRadius:46, overflow:hidden, background:'#0d1b2a', boxShadow:'0 0 0 2px #05080d inset'` |
| scan sweep | `:64-77` | `height:2, background:'linear-gradient(90deg,transparent,rgba(78,205,196,0.35),transparent)', boxShadow:'0 0 12px rgba(78,205,196,0.6)', animation:'scanSweep 7s linear infinite', zIndex:1` — **teal** |
| dynamic island | `:79-91` | `top:11, width:112, height:33, background:'#04060a', borderRadius:18, zIndex:30` |
| status bar | `:93-135` | `height:50, padding:'14px 30px 0', zIndex:20, pointerEvents:'none'`; clock `fontSize:15, fontWeight:600, color:'#f0f4f8', letterSpacing:'0.3px', fontVariantNumeric:'tabular-nums'`, reads **"9:41"** |
| screen-content slot | `:138-153` | `zIndex:10, overflow:hidden, pointerEvents:auto, tabIndex={-1}` |
| home indicator | `:158-169` | `bottom:9, width:134, height:5, borderRadius:3, background:'rgba(240,244,248,0.45)', zIndex:25` |
| overlay root | `:173` | `position:absolute, inset:0, zIndex:40, pointerEvents:'none'` — **the portal target** |

- **Load-bearing math**: 404 = 378 + 13×2; 812 = 13 + 786 + 13 (matching `usePhoneScale.ts:8`'s default `frameHeight`). See §0.3.
- **Internal z scheme**: grid 0 (implicit) → sweep 1 → screen 10 → status bar 20 → home indicator 25 → island 30 → overlay root 40. Everything portalled sits above 40 via its own z-index (§2.6).
- **Hardcoded literals**: the titanium gradient + three-layer shadow stack are one-offs, not tokenized. `rgba(78,205,196,…)` is the teal.

#### `StoryRail.tsx` (114 lines) — **demo-only**
- No phone surface. "Marketing voice (7C garnish)" (`:9`). Uses `--font-stmono` / `--font-nacelle`.
- **Shared chrome used**: `ExploreChecklist` only. **No `GLASS`/`T`** — its own marketing palette.
- **Recipe**: container `:32` — `flex:'1 1 auto', minWidth:420, maxWidth:680, padding:'52px 56px 80px 36px', color:'#e7eef6'`; back-to-site link `:37` — jbmono, `fontSize:11, letterSpacing:1.5, '#5d7a9a', uppercase, textDecoration:none`; eyebrow `:42` — stmono, `fontSize:11, letterSpacing:2, '#4ecdc4', uppercase`; "You're driving" callout `:47` — `flex, gap:13, padding:'16px 18px', borderRadius:12, border:'1px solid rgba(78,205,196,0.28)', background:'rgba(78,205,196,0.06)'`; narration eyebrow `:75` — `'#2B8CC1'`; heading `:78` — **nacelle**, `fontSize:30, fontWeight:700, lineHeight:1.12, '#f4f8fc', letterSpacing:'-0.5px'`; paragraph `fontSize:15.5, lineHeight:1.6, '#bcccde'`; bullet dot `6×6, borderRadius:3, '#4ecdc4'`; tip box `:105` — `padding:'14px 16px', borderRadius:12, border:'1px solid rgba(255,217,61,0.3)', background:'rgba(255,217,61,0.07)'`.
- **Hardcoded literals**: `#4ecdc4` (teal) ×3 + `rgba(78,205,196,…)` ×2; `#f4f8fc`, `#bcccde`, `#5d7a9a` — a separate rail text ramp from `T`'s.

#### `ScreenStage.tsx` (63 lines)
- Web-only cross-slide mechanism approximating React Navigation stack transitions.
- **Shared chrome used**: `screenVariants`, `screenTransition`, `drawerTransition`, `DRAWER_PUSH`, `SlideDirection` from `ui/motion`.
- **Recipe**: `screenStyle` `:13-19` — `position:absolute, inset:0, overflowY:auto, overflowX:hidden, overscrollBehavior:contain`.
- **Notes**: `useReducedMotion` short-circuits `slide` to `{}` — instant, no transforms. Each screen is absolutely positioned and self-scrolling so incoming/outgoing overlay during `AnimatePresence mode="sync"`. The outer `motion.div` applies `x: drawerOpen ? DRAWER_PUSH(-72) : 0`, pushing the whole stack while `WizardDrawer` slides in — **the two are one connected system**.

#### `phone-overlay.tsx` (35 lines)
- No styling — pure context + portal logic. `PhoneOverlayContext` defaults to `null` (isolated tests render inline). `PhoneOverlayPortal` `console.warn`s in dev when no context root is found — the guard against a future overlay silently reintroducing the scroll-lift bug.

#### `usePhoneScale.ts` (22 lines)
- `scale = min(1, (window.innerHeight - margin) / frameHeight)`, recomputed on `resize`. Defaults `frameHeight = 812, margin = 28` (`:8`). Consumed at `PhoneFrame.tsx:33,48`.

### §4.6 `ui/inputs/` — the picker library (the only `T` consumers)

`T` values for reference: `bg #0d1b2a · raised #0f2035 · border #1e3a5f · borderSoft rgba(30,58,95,0.5) · text #f0f4f8 · textDim #cdd9e6 · textMute #99badd · textFaint #7a9fc4 · primary #2B8CC1 · primarySoft rgba(43,140,193,0.08) · primaryEdge rgba(43,140,193,0.25) · topHighlight rgba(184,212,240,0.25) · scrim rgba(4,8,14,0.55) · error #ff4757 · radius 12 · rowH 44`

#### `inputs/PickerSheet.tsx` (123 lines) — the shared picker bottom sheet
- **Shared chrome used**: `T`; `PhoneOverlayPortal`.
- **Recipe**: `PICKER_SHEET_Z = 31` (`:25`, exported — "upper bound of the modal-over-modal ordering"); `dot` `:27` — `6×6, borderRadius:3, background:T.primary`; scrim `:49` — `zIndex:PICKER_SHEET_Z, background:T.scrim`; sheet panel `:56-74` — `zIndex:PICKER_SHEET_Z+1, maxHeight:'92%', background:T.raised, borderTopLeftRadius:18, borderTopRightRadius:18, border:1px solid T.primaryEdge, borderTop:2px solid T.topHighlight, boxShadow:'0 -16px 40px -8px rgba(0,0,0,0.6)', animation:'sheetUp 0.28s ease'`; header `:77-85` — `padding:'14px 18px', background:'linear-gradient(180deg,rgba(25,48,72,0.8),rgba(15,32,53,0.4))', borderBottom:1px solid T.border`; title `fontSize:14, fontWeight:700, letterSpacing:0.3, uppercase, color:T.textDim`; body `overflowY:auto, padding:16`; footer `padding:16, borderTop:1px solid T.border`.
- **Consumers:** `Dropdown`, `DateField`, `TimeField` (and, transitively, `SelectField`/`PaneSelect`).
- **Notes**: `31/32` sits strictly above `ModalShell`'s `21/22 + elevation≤4` — the ordering invariant `MODAL_LAYER`'s comment asserts, and **`UserProfilePane.test.tsx:315-316` pins it** (§6). Escape + scrim click + ✕ all dismiss. Falls back to inline render outside `PhoneFrame`.
- **Deferral §19 / §20** both concern this sheet's interaction with `ModalShell` and `WizardDrawer`.

#### `inputs/Dropdown.tsx` (175 lines)
- **Replicates**: "Custom dropdown matching the phone app's `Picker`: a selector pill with a chevron in a right 'indicator zone', opening a slide-up bottom sheet" (`:33-37`).
- **Recipe**: trigger `:94-105` — `flex, alignItems:stretch, width:100%, minHeight:44, borderRadius:8, border:1px solid T.border, background:T.bg, overflow:hidden`; value `:107` — `flex:1, padding:'11px 12px', fontSize:14, color: value?T.text:T.textFaint`; **indicator zone** `:110-118` — `width:40, borderLeft:'1px solid rgba(255,255,255,0.04)', background:'rgba(43,140,193,0.06)'`; chevron `stroke:T.textMute`; option row `:68-79` — `padding:'11px 12px', borderRadius:10, border:'1px solid transparent', background: selected?'rgba(43,140,193,0.08)':'transparent'`; selection dot `:135-143` — `8×8, borderRadius:4, background: selected?T.primary:'transparent', border: selected?'none':'1.5px solid rgba(153,186,221,0.2)', boxShadow: selected?'0 0 5px T.primary':'none'`; checkmark badge `:150-159` — `22×22, borderRadius:6, border:'1px solid rgba(43,140,193,0.2)', background:'rgba(43,140,193,0.15)'`.
- **Hardcoded literals**: `rgba(43,140,193, 0.06 / 0.08 / 0.15 / 0.2)` — **four alpha steps** of the primary accent in one file, only `0.08` tokenized.
- **Notes**: R-9/R-10/FD-4 — the label is optional for phone-parity settings pickers, enforced by the `SelectFieldName` union in `_shared.tsx`. `aria-labelledby` composes label+value ids rather than `aria-label`, so the selected value (including "Other (Custom)") stays in the accessible name.

#### `inputs/DateField.tsx` (108 lines)
- **Shared chrome used**: `T`; `PickerSheet`; `Calendar`; `glassBtnPrimary`; `clock`.
- **Recipe**: trigger `:64-73` — `width:100%, textAlign:left, borderRadius:8, border:1px solid T.border, background:T.bg, padding:'8px 12px', minHeight:48`; label caption `:75` — `fontSize:11, fontWeight:600, uppercase, color:T.textFaint, marginBottom:2` (reads "Date"); value `fontSize:15, fontWeight:500, color: parts?T.text:T.textFaint`; footer Done `:86-92` — `width:100%, padding:13, glassBtnPrimary, fontSize:15, fontWeight:600`.
- **Notes**: Opening with an empty value auto-populates today (`:45-52`) — **the clock is read on open, never at render**, so a closed field stays deterministic. `emptyLabel` lets `UserProfileModal` override the em-dash with the phone's literal "No date".

#### `inputs/TimeField.tsx` (79 lines)
- **Recipe**: trigger `:48-57` — **identical shape to `DateField`'s**; label caption "Time"; footer `:39-40` — `ghostBtn {flex:1, padding:13, glassBtnSecondary, fontSize:15, fontWeight:600}` and `primaryBtn` the same with `glassBtnPrimary`.
- **Notes**: Confirm writes back via `mergeTime` (preserves date); Cancel discards `temp` entirely.

#### `inputs/TimeWheel.tsx` (143 lines)
- **Recipe**: `ROW = T.rowH (44)`, `VISIBLE = 5`, `PAD = ((VISIBLE-1)/2)*ROW = 88` (`:8-10`); column `:56-63` — `height: VISIBLE*ROW (220), width:64, overflowY:scroll, scrollSnapType:'y mandatory', paddingTop/Bottom:PAD`; row cell `:68-79` — `height:ROW, scrollSnapAlign:'center', fontSize:24, fontWeight:600, letterSpacing:1, fontVariantNumeric:'tabular-nums', color: i===value?'#e8f0f8':T.text`; column label `:86` — `position:absolute, right:2, fontSize:11, fontWeight:600, color:'rgba(153,186,221,0.5)'`; drum wrapper `:103-115` — `border:'1px solid rgba(0,0,0,0.4)', background:T.raised, padding:'0 10px'`; **centre selection band** `:122-131` — `height:ROW, background:T.primarySoft, borderTop/Bottom:1px solid T.primaryEdge`; **curvature fade** `:133-139` — `linear-gradient(180deg, T.raised 0%, rgba(15,32,53,0) 42%, rgba(15,32,53,0) 58%, T.raised 100%)`.
- **Hardcoded literals**: `#e8f0f8` selected-row highlight — a one-off brighter white than `T.text`.
- **Notes**: `indexFromScrollTop` (`:13-15`) is pure and unit-tested. `WheelColumn` reflects the controlled `value` as `scrollTop` via `useLayoutEffect`, guarded by a `lastEmitted` ref so it never fights an in-progress user scroll. **`ROW`/`VISIBLE`/`PAD` are coupled arithmetic** — changing the row height changes the drum height and both padding values.

#### `inputs/Calendar.tsx` (107 lines)
- **Recipe**: `arrowBtn` `:24-34` — `34×34, borderRadius:8, border:none, background:transparent`; header `:51` — month/year `fontSize:16, fontWeight:600, color:T.textDim`; weekday row `:64-68` — `display:grid, gridTemplateColumns:'repeat(7,1fr)'`, cell `fontSize:11, color:T.textFaint`; day cell `:86-97` — `36×36, borderRadius:18, border: today?'1.5px solid T.primaryEdge':'1.5px solid transparent', background: selected?T.primary:'transparent', color: selected?'#fff':T.text, fontSize:14, fontWeight: selected?700:500, fontVariantNumeric:'tabular-nums'`.
- **Notes**: Pure presentational — all view/selection state lives in `DateField`. `firstWeekday` uses explicit-args `Date` construction only (never argless), for determinism.

#### `inputs/DateTimeField.tsx` (33 lines)
- **Recipe**: wrapper `:20-30` — `marginBottom:14`; label `fontSize:13, fontWeight:500, color:T.textDim, marginBottom:6`; row `display:flex, gap:8`, each half `flex:1`.
- **Notes**: Both halves bound to one `value`; date edits preserve time (`mergeDate`), time edits preserve date (`mergeTime`). This is what `_shared.tsx`'s `DateTimeField` export thinly re-wraps.

#### `inputs/AddressAutocomplete.tsx` (210 lines)
- **Replicates**: the phone's street-address autocomplete (Mapbox Search Box); the accuracy-estimate rule cites `mapbox-service.ts:246-247` (`:22-26`).
- **Shared chrome used**: `GLASS.border`, `GLASS.borderBtn` — **NOT `T`**, despite living in `inputs/`.
- **Recipe**: **`inputStyle` `:35-44` — a byte-for-byte re-declaration of `_shared.tsx`'s `fieldInput`**; label `:171` — `fontSize:13, fontWeight:500, '#cdd9e6', marginBottom:6`; suggestion list `:191` — `position:absolute, zIndex:50, background:'#0b1626', border:GLASS.borderBtn, borderRadius:8, boxShadow:'0 12px 30px rgba(0,0,0,0.5)', maxHeight:220`; suggestion row `:199` — `padding:'9px 10px', borderRadius:6, color:'#e6eef6', fontSize:13`; detail line `fontSize:11, '#7a9fc4'`.
- **Hardcoded literals**: `zIndex:50` (`:191`) is a one-off outside every named scheme — though it's a **local stacking context inside a form, not a portal**, so there's no real collision risk; still worth normalising. `#e6eef6` is yet another near-white.
- **Notes**: Degrades to a plain text input when `NEXT_PUBLIC_MAPBOX_TOKEN` is absent. A `seq` ref discards stale async responses; `skipNext` prevents re-querying right after a selection.

#### `inputs/LocationFields.tsx` (282 lines)
- **Replicates**: phone `src/features/location/components/LocationForm.tsx` — render order and field ownership quoted verbatim against phone line numbers (`:14-27`).
- **Shared chrome used**: `Field`; `AddressAutocomplete`; `CoordinateDisplay`; `GpsCaptureControl`. **Almost no inline styling of its own.**
- **Recipes hand-rolled**: lookup-notice line `:266` — `role="status", fontSize:12, color:'#ffd93d', marginTop:-8, marginBottom:14`.
- **Notes**: Extensive write-guard machinery (`canWriteFor`, `openLocation`/`mounted` refs, R-1/R-32/R-17/R-39) prevents a stale async reverse-geocode landing on a *different* location after a switch. `showGps` gates the entire GPS/coordinate block **as a unit** (P7.3) — including suppressing coordinate stamping from an address pick when off, not just hiding it visually (an explicit anti-dishonesty rule, R-2b).

#### `inputs/IncidentLocationFields.tsx` (312 lines)
- **Replicates**: phone `IncidentLocationForm.tsx` — render order quoted verbatim (`:20-27`); **deliberately drops the phone's GPS capture control** (`:32-40`, citing deferral §53).
- **Shared chrome used**: `Field`; `AddressAutocomplete`; `CoordinateDisplay`; `GLASS.border`.
- **Recipes hand-rolled**: **`coordInput` `:87-96` — the third independent copy of `fieldInput`**; `CoordinateField` label `:118` — `fontSize:13, fontWeight:500, '#cdd9e6', marginBottom:6`; error line `:136` — `role="alert", fontSize:12, '#ff6b78', marginTop:5` (identical to `Field`'s, re-declared); lat/lng row `:277` — `display:flex, gap:12, marginBottom:4`; lookup status `:297` — `role="status", fontSize:12, '#7a9fc4', margin:'8px 0 4px'`.
- **Notes**: Blur-triggered reverse-geocode with a monotonic `requestSeq` and a `lastGeocoded` ref, both ported verbatim from cited phone lines. `abandonLookups()` retires in-flight requests when an address pick supersedes manual entry — **a guard the phone itself is missing** (`:244-248`).

#### `inputs/MetadataForm.tsx` (131 lines)
- **Replicates**: phone `src/features/media/shared/components/MetadataForm.tsx` (P4.4, v1 matrix row **56**) — filename + caption, shared across photo/video/audio review and the library.
- **Shared chrome used**: `Field` exclusively.
- **Recipes hand-rolled**: `savingAsLabel` `:84` — `fontSize:12, '#7a9fc4'`; `savingAsValue` `:85-90` — jbmono, `fontSize:13, '#cdd9e6', wordBreak:'break-all'`.
- **Notes**: Deliberately does NOT port the phone's `onValidChange` mount-effect (validity is a pure predicate the parent calls — removes a mount-order hazard, `:31-36`), and deliberately **improves** on the phone's silent-refusal UX by showing a real `FILENAME_REQUIRED_MESSAGE` where the phone shows none (`:38-41`).

#### `inputs/CoordinateDisplay.tsx` (176 lines)
- **Replicates**: phone `CoordinateDisplay.tsx`; the accuracy/rating colour mapping cites phone `:140-166` (`:11-16`).
- **Shared chrome used**: `GLASS.border` only.
- **Recipe**: `TONE_COLOR` `:23-27` — `success '#10d177', warning '#ffd93d', error '#ff4757'` (the same triple as `caseStatusTheme`, per the comment); `card` `:48-57` — `borderRadius:12, border:GLASS.border, background:'rgba(13,27,42,0.55)', padding:12, textAlign:left, display:block`; coordinate text `:130-135` — `fontSize:14, fontWeight:600, fontFamily:'var(--font-jbmono, monospace)', '#f0f4f8'`; metadata row `:138` — `flex, gap:6, marginLeft:22`; accuracy/rating `fontSize:12, fontWeight:500, color:TONE_COLOR[tone]`; source `fontSize:12, fontWeight:500, '#7a9fc4'`; copy-status `:166-172` — `role="status", fontSize:12, marginTop:6, marginLeft:22, color: copied==='ok'?'#10d177':'#ff4757'`.
- **Hardcoded literals**: **`📍` emoji glyph (`:128`) as the marker icon** rather than an SVG — the one emoji-as-icon in the codebase, and something a design pass will likely want to replace.
- **Notes**: `COPY_RESET_MS = 1600` exported, matching `NotesScreen`'s "Copy all" timing. The `aria-label` assembles a full accessible-name string because button descendants are children-presentational (R-6); the copy live region is a **sibling** of the button, not nested, for the same reason.

#### `inputs/GpsCaptureControl.tsx` (200 lines)
- **Replicates**: phone `GpsCaptureControl.tsx` — copy quoted verbatim against phone `:71`, `:111-120`, `:156` (`:11-32`).
- **Shared chrome used**: `GLASS.borderBtn`, `GLASS.gradientCardDiag`; `switchKeyDown`.
- **Recipe**: `button` `:34-50` — `flex:1, centred, gap:8, padding:'12px 16px', minHeight:60, borderRadius:10, border:GLASS.borderBtn, background:GLASS.gradientCardDiag, color:'#f0f4f8', fontSize:14, fontWeight:500`; `LocateIcon` `stroke:'#4BA3D4'`; `Spinner` `animation:'spin 0.9s linear infinite'` (reduced-motion → `undefined`), `stroke:'#4BA3D4'`; geocode toggle label `:169` — `fontSize:11, fontWeight:600, uppercase, letterSpacing:0.3, '#7a9fc4'`; **toggle track `:179` — `width:46, height:28, borderRadius:14, background: on?'#2B8CC1':'#1e3a5f'`** (a verbatim re-declaration of `Toggle`'s track); progress line `fontSize:12, '#7a9fc4', marginTop:5`; error line `role="alert", fontSize:12, '#ff4757', marginTop:4`.
- **Notes**: `minHeight:60` is fixed — "no layout bump between states". `aria-disabled` (never `disabled`) on the capture button, specifically to avoid stranding keyboard focus during a 30–120s capture.

#### `inputs/CameraGpsCapture.tsx` (170 lines)
- **Replicates**: phone `src/features/location/camera-gps/components/CameraGpsCapture.tsx` — icon/copy verbatim against `camera-gps/constants.ts:8-17` (`:16-33`).
- **Shared chrome used**: `CoordinateDisplay`; `GPS_CONTROL_LABELS` (from `GpsCaptureControl`); `GLASS.borderBtn`, `GLASS.gradientCardDiag`.
- **Recipe**: `iconButton` `:53-65` — `44×44, flex:'none', borderRadius:10, border:GLASS.borderBtn, background:GLASS.gradientCardDiag, padding:0` (exported `CAMERA_GPS_BUTTON_SIZE = 44`); `CrosshairIcon` `stroke:'#4BA3D4'`, fills its centre circle when `filled`; `Spinner` — **a byte-identical duplicate of `GpsCaptureControl`'s own local `Spinner`**. Two files, one component, no shared module.
- **Notes**: Forces `PRECISE_GPS_CONFIG` unconditionally (phone's `CAMERA_ACCURACY_OVERRIDE='precise'`) — per-camera positions need metre-level separation. `CAMERA_GPS_BUTTON_SIZE = 44` is another hardcoded `T.rowH`.

### §4.7 The top five leverage points, ranked

| # | Recipe | Where | Consumers fixed | Why it's #N |
|---|---|---|---|---|
| **1** | **`fieldInput`** | `_shared.tsx:186-195` (unexported) | `Field` (15 screens) + 4 hand-rolled copies (`AddressAutocomplete:35-44`, `IncidentLocationFields:87-96`, `NewCaseModal:52-61`, `SubmissionScreen:147`) | Every text input in the product. Exporting it and deleting the copies is a ~20-line diff that de-duplicates the most-touched surface. |
| **2** | **`ModalShell`** | `_shared.tsx:64-184` | 8 importers + the byte-identical copy at `SettingsModal.tsx:64-96` | Every sheet in the product: the scrim alpha, the `top:34` inset, the 24px top radii, the header type scale, the body padding. |
| **3** | **The centred-dialog shell** (**does not exist yet**) | 3 copies: `AlertDialog.tsx:141-156`, `DeleteConfirmationModal.tsx:98-121`, `ExportModal.tsx:253-268` | 3 files today, and every future confirm | Byte-identical `borderRadius:16 / borderSoft / gradientPanel / 0 24px 60px rgba(0,0,0,0.55) / screenIn 0.2s`, plus two hand-rolled focus traps. Extracting it is the biggest structural win. |
| **4** | **`Toggle`'s switch track** | `_shared.tsx:479-557` | 7 `Toggle` consumers + 3 verbatim re-implementations (`FormFieldsPane:151-198`, `TimeOffsetScreen:111-124`, `GpsCaptureControl:179`) | One `hideLabel` prop collapses four renderers into one. |
| **5** | **`_pane-chrome.tsx`** | `settings/panes/_pane-chrome.tsx` (326 lines) | 10 panes; `PaneStubNote` alone has 9 consumers, `PaneGroup` 18 call sites | The entire Settings package changes from one file — and it is already the right shape; it just needs to source from `T`/`GLASS` instead of bare hexes. |

**Runners-up:** `WizardHeader` + `WizardNext` (10 wizard screens each, and `WizardNext`'s shadow is
already hand-duplicated once); `glassCard` / `glassBtnPrimary` / `glassBtnSecondary` (the widest
reach of anything, but already tokenized — their *values* are the lever, not their call sites);
`mapTokens.ts` (9 map files, already fully token-driven — the model to copy).

## §5 — The drift guard

### §5.1 What it is

Two files:
- **`.design-sync/check-rn-parity.mjs`** (109 lines) — parses nine shared anchors **live** from both
  repos and asserts equality. No hardcoded expectations, so it never goes stale on a legitimate
  synchronized change — only on drift. Standalone: `node .design-sync/check-rn-parity.mjs`.
- **`features/demo/ui/inputs/__tests__/rn-token-parity.test.ts`** (16 lines) — imports `checkParity`
  and asserts `drift` is empty, with a readable per-anchor failure message. **`it.skipIf(!rnAvailable())`**
  — it skips silently when the sibling RN repo is not checked out.

It resolves the phone repo as `resolve(WEB, '..', '..', 'extraction_case_notes_react_native_expo')`
(`check-rn-parity.mjs:28`). From this worktree that is
`D:\Work Coding Projects\CCTV Recovery Notes App\extraction_case_notes_react_native_expo` — correct,
and present.

### §5.2 The nine anchors

| # | Label | RN read | Web read |
|---|---|---|---|
| 1 | `primary` | `Colors.ts` `dark.primary` | `input-theme.ts` `T.primary` |
| 2 | `background` | `Colors.ts` `dark.background` | `T.bg` |
| 3 | `border` | `Colors.ts` `dark.border` | `T.border` |
| 4 | `text` | `Colors.ts` `dark.text` | `T.text` |
| 5 | `textMute` | `Colors.ts` `dark.textSecondary` | `T.textMute` |
| 6 | `error` | `Colors.ts` `dark.error` | `T.error` |
| 7 | `gradientTop` | `Button.tsx` `PRIMARY_GRADIENT.dark[0]` | `glass-tokens.ts` `ACCENT_FROM` |
| 8 | `gradientBot` | `Button.tsx` `PRIMARY_GRADIENT.dark[1]` | `glass-tokens.ts` `ACCENT_TO` |
| 9 | `touchFloor` | `Layout.ts` `touchTarget.min` | `T.rowH` |

Anchors 1–6 and 9 use `readField` (regex for `key: 'value'` inside a sliced region); 7–8 use
`readConst` because `T` only re-exports `GLASS.accentFrom` and `readField` "matches literals, not
identifier references" (`:54-56`).

### §5.3 **It is broken right now — and the break is masking four real drifts**

Run from the worktree root at `5cf88fe`:

```
$ node .design-sync/check-rn-parity.mjs
.../check-rn-parity.mjs:75
  if (!gradDark) throw new Error('Button PRIMARY_GRADIENT.dark not found')
                       ^
Error: Button PRIMARY_GRADIENT.dark not found
    at checkParity (.../check-rn-parity.mjs:75:24)
EXIT=1
```

**It throws before building the anchor list**, so `drift` is never computed and the Vitest wrapper
fails with a thrown error rather than a drift report. **Nobody currently knows what has drifted.**

#### Why it throws — the phone moved the constant

`check-rn-parity.mjs:74` matches:
```js
const gradDark = button.match(/dark:\s*\{\s*colors:\s*\[\s*'([^']+)'\s*,\s*'([^']+)'/)
```
against `src/components/common/Button.tsx`. In the phone repo at `dd5551ec`:

- `PRIMARY_GRADIENT` **no longer exists anywhere in `src/`** — the only surviving mention is prose in
  `src/components/README.md:238`.
- It was **renamed to `PrimaryButtonGradient` and moved out of `Button.tsx` into
  `src/constants/Colors.ts`**:
  ```js
  // src/constants/Colors.ts:471-474
  export const PrimaryButtonGradient = {
    light: ['#2563eb', '#1d3584'],
    dark: [Colors.dark.primaryDark, '#17527A'],
  } as const
  ```
- `Button.tsx:16` now imports it (`import { DangerFill, ElevatedEdges, PrimaryButtonGradient } from '@/constants/Colors'`)
  and consumes it at `:280-281` (`colors={[...PrimaryButtonGradient[colorScheme]]}`).
- **The dark first stop is an identifier reference, not a literal** — `Colors.dark.primaryDark`
  (= `#1F6B99`, `Colors.ts:132`). So even a corrected regex pointed at the new file has to resolve
  one reference; `readConst`/`readField` cannot.

#### What the anchors *actually* say once you read both sides by hand

| # | Anchor | RN (`dd5551ec`) | Web (`5cf88fe`) | |
|---|---|---|---|---|
| 1 | `primary` | `#2B8CC1` (`Colors.ts:130`) | `#2B8CC1` (`input-theme.ts:24`) | **OK** |
| 2 | `background` | **`#002853`** (`Colors.ts:135`, "Badge-blue base") | `#0d1b2a` (`input-theme.ts:14`) | **DRIFT** |
| 3 | `border` | **`#1c4e84`** (`Colors.ts:153`) | `#1e3a5f` (`input-theme.ts:16`) | **DRIFT** |
| 4 | `text` | `#f0f4f8` (`Colors.ts:140`) | `#f0f4f8` (`input-theme.ts:19`) | **OK** |
| 5 | `textMute` | `#99badd` (`Colors.ts:141`) | `#99badd` (`input-theme.ts:21`) | **OK** |
| 6 | `error` | `#ff4757` (`Colors.ts:169`) | `#ff4757` (`input-theme.ts:33`) | **OK** |
| 7 | `gradientTop` | **`#1F6B99`** (`Colors.ts:473` → `:132`) | `#35A0D6` (`glass-tokens.ts:23`) | **DRIFT** |
| 8 | `gradientBot` | **`#17527A`** (`Colors.ts:473`) | `#2580AD` (`glass-tokens.ts:24`) | **DRIFT** |
| 9 | `touchFloor` | `44` (`Layout.ts:55`) | `44` (`input-theme.ts:36`) | **OK** |

**Four of nine anchors have drifted.** The two that matter most:

- **`background`: `#0d1b2a` → `#002853`.** The phone moved to a "PRP badge-blue ramp (oklch 28% /
  0.09 / hue 253 base)" with a documented elevation ladder (`backgroundSecondary #0e3965`,
  `backgroundTertiary #17416e`). The demo's entire navy surface family — `T.bg`, every
  `rgba(19,34,54,…)` / `rgba(26,45,68,…)` gradient stop in `GLASS`, `#0a1320`, `#0a1422`, `#132236`,
  `#1a2d44` — is derived from the OLD base. **This is the single largest item in the port.**
- **`border`: `#1e3a5f` → `#1c4e84`.** With it, `GLASS.border`, `GLASS.borderSoft`
  (`rgba(30,58,95,0.5)` = `#1e3a5f` at 50%), `T.border`, and every one of the **17** bare `#1e3a5f`
  sites in §2.3.
- **The primary button gradient inverted in character**: the demo's `#35A0D6 → #2580AD` is
  *lighter-to-mid*; the phone's `#1F6B99 → #17527A` is *mid-to-dark*. Every `glassBtnPrimary` and
  every `GLASS.gradientAccent` surface reads differently.

*(The phone-side agent's inventory is authoritative on what else changed; the four rows above are
only what the nine existing anchors can see.)*

### §5.4 Fixing the guard, and what to pin after the port

**Minimum fix (must land with the port):**
1. Read `PrimaryButtonGradient` from `src/constants/Colors.ts`, not `PRIMARY_GRADIENT` from
   `Button.tsx`.
2. Teach it to resolve a one-level identifier reference (`Colors.dark.primaryDark` → look up
   `primaryDark` in the `dark:` region). A ~6-line helper.
3. **Make a parse failure a drift, not a throw.** Today a renamed constant on the phone side crashes
   the whole check and silently disables all nine anchors. Each anchor should resolve
   independently and report `PARSE-FAILED` as a distinct failure state, so one moved constant cannot
   mask eight working ones. **This is the actual defect** — the four drifts above have been
   invisible for however long the rename has been in.

**Proposed extended anchor set (post-port).** The current nine cover only what `T` happens to name.
Add these, grouped by what a future campaign is most likely to move:

*Surface ramp (new — the phone now has an explicit elevation ladder the demo has no equivalent for):*
| Anchor | RN source | Web target |
|---|---|---|
| `backgroundSecondary` | `Colors.dark.backgroundSecondary` (`#0e3965`) | a new `T.raised` (currently `#0f2035`, unpinned) |
| `backgroundTertiary` | `Colors.dark.backgroundTertiary` (`#17416e`) | a new `T.raisedHigh` (does not exist) |
| `borderLight` | `Colors.dark.borderLight` (`#2e5f97`) | a new `T.borderLight` (the demo's `#2a4a6f` is the nearest, inside `GLASS.borderBtn`) |

*Text ramp (only 2 of 3 tiers are pinned today):*
| Anchor | RN source | Web target |
|---|---|---|
| `textTertiary` | `Colors.dark.textTertiary` (`#7a9fc4`) | `T.textFaint` — **110 occurrences depend on it and nothing guards it** |
| `textInverse` | `Colors.dark.textInverse` (`#002853`) | none today; needed if buttons ever get inverse text |

*Status colours (zero coverage today, and the demo has 8 independent owners — §1.4):*
| Anchor | RN source | Web target |
|---|---|---|
| `success` | `Colors.dark.success` (`#10d177`) | a single demo success token (today: `#10d177` **and** `#34C759` **and** `#30D158` **and** `#7fe3b4` **and** `#7fe6b6`) |
| `successLight` | `Colors.dark.successLight` (`#0f6b42`) | the success *background* tone |
| `warning` | `Colors.dark.warning` (`#ffd93d`) | today: `#ffd93d` **and** `#ffd07a` **and** `#f5a623` **and** `#c9a227` |
| `warningLight` | `Colors.dark.warningLight` (`#7d5f10`) | — |
| `errorLight` | `Colors.dark.errorLight` (`#b72136`) | — |
| `primaryLight` | `Colors.dark.primaryLight` (`#4BA3D4`) | **`MAP_GLASS_COLORS.primaryLight`** — already correct in `map/`, but 40 bare copies elsewhere |
| `primaryDark` | `Colors.dark.primaryDark` (`#1F6B99`) | new — it is now the gradient's top stop |

*Grid / ambient (the demo duplicates these into `demo.css` and `GLASS.gridOverlay` by convention):*
| Anchor | RN source | Web target |
|---|---|---|
| `gridSubtle` | `Colors.dark.gridSubtle` (`rgba(153,186,221,0.11)`) | `demo.css:37-38` uses `0.035`; `GLASS.gridOverlay` uses `0.05` — **three values, no guard** |

*Geometry:*
| Anchor | RN source | Web target |
|---|---|---|
| `touchMedium` / `touchComfortable` | `Layout.touchTarget.medium` (46) / `.comfortable` (48) | the demo's `minHeight:48` trigger and `44` row floor both appear bare |
| `borderRadius.lg` | `Layout.borderRadius.lg` | the demo's `borderRadius:12` (`glassCard`) / `16` (cards) split |

**Recommended target: ~22 anchors** (the existing 9, corrected, plus the 13 above). Two structural
asks that matter more than the count:
1. **Per-anchor independence** — one unresolvable anchor must not disable the rest.
2. **A companion "no bare hex" guard.** The existing `glass-tokens.test.ts` already bans ten literal
   *strings* from re-appearing in `ui/`. Extend the same mechanism to the top ~10 palette hexes once
   they are tokenized, so the census in §2 cannot regrow. Without this, the port de-duplicates once
   and the sprawl returns.

---

## §6 — Tests that pin style values

A restyle will redden these. Every assertion reads **inline** `element.style` (jsdom renders no CSS),
so any value moved out of an inline object into a class or CSS variable also un-pins its test
silently — which is worse than a red test.

### §6.1 Token-value pins (fail on a token change, by design)

| File:line | Pins |
|---|---|
| `ui/__tests__/glass-tokens.test.ts` (whole file) | **(a)** Ten exact literal strings BANNED from `features/demo/ui/**` outside `glass-tokens.ts`: the card / diag-card / panel / accent gradients, the grid overlay, and `1px solid #1e3a5f` / `rgba(30,58,95,0.5)` / `#2a4a6f` / `rgba(43,140,193,0.3)` / `rgba(255,71,87,0.3)`. **(b)** Byte-for-byte shape pins on every `GLASS` value and the three fragments. **(c)** R-25/R-34: the `@theme` mirrors in `app/css/style.css` must equal `GLASS.accentFrom` / `accentTo` / the error red. |
| `ui/inputs/__tests__/rn-token-parity.test.ts:10-15` | The nine RN anchors (§5). Currently **throws**, not fails. |
| `ui/screens/__tests__/screenData.test.ts` | `caseStatusTheme` / `locationStatusTheme` values, incl. `#10d177`; and the pin that `locationStatusTheme` equals `MAP_PIN_COLORS`. |
| `engine/logic/media/__tests__/audio-levels.test.ts` | `#ffd93d`, `#ff4757`, `#5a7a9a` — the engine's `recorderStatusColor` / `levelFillColor` maps. **This one is inside the 80% coverage gate.** |

### §6.2 Colour assertions

| File:line | Pins |
|---|---|
| `ui/inputs/__tests__/CoordinateDisplay.test.tsx:23-24` | accuracy colour **equals** rating colour; and equals `rgb(255, 71, 87)` (`#ff4757`) |
| `ui/screens/import/__tests__/TerminalLine.test.tsx:47` | every `LEVEL_ACCENT` tag colour, per level, via `hexToJsdomRgb` |
| `…TerminalLine.test.tsx:54,56` | `TERM_ROW.body`, `TERM_ROW.error` |
| `…TerminalLine.test.tsx:91-92` | `TERM_ROW.blockBg`; `borderLeft` = `2px solid ${TERM_ROW.blockBorder}` |
| `ui/screens/import/__tests__/ImportTerminalProgress.test.tsx:443` | CTA border contains `rgba(16, 209, 119, 0.32)` (success) |
| `…ImportTerminalProgress.test.tsx:444` | success title text = `rgb(127, 230, 182)` (`#7fe6b6`) |
| `…ImportTerminalProgress.test.tsx:466-467` | partial CTA border `rgba(255, 217, 61, 0.36)`, background `rgba(255, 217, 61, 0.1)` — asserted as **"amber, not green"** |
| `…ImportTerminalProgress.test.tsx:485` | failure CTA border `rgba(255, 71, 87, 0.32)` |
| `…ImportTerminalProgress.test.tsx:501,522` | "sample import — review →" colour = `rgb(255, 217, 61)` — **"amber, not muted"** |
| `ui/screens/__tests__/AudioRecorderScreen.test.tsx:169,172` | level fill `background: '#ff4757'` (clipping) vs `'#2B8CC1'` (normal) |
| `ui/screens/__tests__/ExportHub.test.tsx:116-118` | lit card border **contains** `rgb(53, 160, 214)` (`GLASS.accentFrom`); idle card must **not** |
| `…ExportHub.test.tsx:117` | lit card `boxShadow` contains `rgba(53,160,214,0.35)` |
| `…ExportHub.test.tsx:220,223` | artifact line colours `#10d177` (case ZIP) and `#99badd` (location ZIP) |
| `ui/screens/map/__tests__/markerElements.test.ts:32` | marker background contains `rgb(0, 191, 255)` (`MAP_PIN_COLORS.working`) |
| `ui/screens/map/__tests__/MapCanvas.test.tsx` | `#00BFFF`, `rgba(0, 191, 255, …)`, `#e53935` (proximity ring paint + incident pin) |
| `ui/screens/map/__tests__/mapCluster.test.ts` | `#00BFFF`, `#e53935` |
| `ui/screens/__tests__/SplashScreen.test.tsx:45` | `boot-disclosure` colour — **an explicit contrast-alpha pin** (`rgba(153,186,221,0.70)`) |
| `…SplashScreen.test.tsx` | `#000314` |
| `ui/screens/__tests__/OcrCaptureScreen.live.test.tsx` | `#10d177` |
| `ui/screens/__tests__/marquee.test.tsx` | `#10d177` |
| `ui/controls/__tests__/controls.test.tsx` | `#4BA3D4` / `#5d7a9a` (TabBar active vs inactive) |
| `ui/controls/__tests__/AlertDialog.test.tsx:168` | destructive action colour **≠** cancel action colour (a relational pin, not a value pin — survives a restyle) |
| `ui/__tests__/DemoExperience.sandbox.test.tsx:762-763` | terminal CTA border contains `rgba(255, 217, 61, 0.36)` and **must not** contain `rgba(16, 209, 119` |
| `ui/screens/__tests__/ExportModal.reduced-motion.test.tsx:45,52` | `#35A0D6` (spinner `borderTopColor`) |

### §6.3 Geometry / dimension assertions

| File:line | Pins |
|---|---|
| `ui/__tests__/PhoneFrame.test.tsx:24-25` | `transform` contains `scale(0.70…)`; `transformOrigin: 'top center'` |
| `…PhoneFrame.test.tsx:45,56,61` | `scale(1)` at large viewports; `scale(0.70…)` at small — **the `usePhoneScale` contract** |
| `ui/screens/import/__tests__/PasteStage.test.tsx:34-37` | `minHeight:'240px'`, `maxHeight:'320px'`, `overflowY:'auto'`, `resize:'none'` |
| `ui/screens/import/__tests__/PickerStage.test.tsx:40` | every action card `minHeight:'180px'` |
| `ui/screens/import/__tests__/ImportTerminalProgress.test.tsx:410,413` | processing badge and CTA both `height:'60px'` — **the `BADGE_SLOT_HEIGHT` no-reflow contract** |
| `…ImportTerminalProgress.test.tsx:120,144,445,488,740` | progress fill `width` = `'0%' / '55%' / '100%'` — the `STAGE_VIEW` bands |
| `ui/screens/import/__tests__/TerminalLine.test.tsx:63-66` | time gutter `width:'44px'`, `fontSize:'10px'`; tag `width:'38px'`, `fontWeight:'600'` |
| `…TerminalLine.test.tsx:90` | detail block `marginLeft:'52px'` (= 44 + 8 gutter arithmetic) |
| `ui/screens/map/__tests__/markerElements.test.ts:63-65` | cluster `width` `'32px'` / `'44px'` / `'56px'` — **`clusterRadiusFor` × 2** |
| `ui/screens/__tests__/AudioRecorderScreen.test.tsx:147` | level fill `width:'50%'` |
| `…AudioRecorderScreen.test.tsx:205-207` | waveform bar `transform:'scaleY(0.46)'`, `transformOrigin:'bottom'`, `height:'100%'` — **the transform-not-height contract** |
| `ui/screens/__tests__/MediaLibrarySheet.test.tsx:588` | preview caption `minHeight:'16px'` (the no-reflow reserve) |
| `ui/screens/__tests__/ExportModal.test.tsx:131` | `srOnly` region `position:'absolute', width:'1px'` |
| `ui/screens/__tests__/CaseActionsSheet.test.tsx:173` | report panel `overflowY:'hidden'` (the un-measured branch — see the `ResizeObserver` stub, §0.8) |
| `ui/controls/__tests__/AlertDialog.test.tsx:22` | body `whiteSpace:'pre-line'` |
| `…AlertDialog.test.tsx:178,181` | button row `flexDirection:'column'` **iff** `actions.length > 2` |

### §6.4 z-index / layering assertions

| File:line | Pins |
|---|---|
| `ui/screens/settings/__tests__/UserProfilePane.test.tsx:306` | the User Profile dialog's `zIndex` = the computed editor z (`MODAL_SHEET_Z + MODAL_LAYER.overSheet`) |
| `…UserProfilePane.test.tsx:315` | the date picker dialog's `zIndex` = `PICKER_SHEET_Z + 1` |
| `…UserProfilePane.test.tsx:316` | the sheet scrim's `zIndex` = `PICKER_SHEET_Z` |

**These three encode the modal-over-modal ordering invariant.** Any renumbering of §2.6's five
schemes must update them deliberately.

### §6.5 Animation / reduced-motion assertions

| File:line | Pins |
|---|---|
| `ui/screens/import/__tests__/ImportTerminalProgress.test.tsx:237` | cursor `animation` contains `termCursorBlink` |
| `…:245,246,248` | under reduced motion, cursor / spinner / review-CTA `animation` all `''` (`:246` is R-14: "processing spinner gated too") |
| `…:253` | spinner `animation` contains `spin` |
| `…:414` | CTA `animation` contains `termFadeIn 350ms` |
| `ui/screens/import/__tests__/PickerStage.test.tsx:135,162` | clipboard spinner `animation` contains `spin`; under reduced motion `''` |
| `ui/screens/__tests__/AudioRecorderScreen.test.tsx:186-189` | reduced motion: status dot / live dot `animation` `''`; level fill and bar `transition` `''` |
| `…:195-197` | motion on: both dots contain `blinkDot`; bar `transition` contains `transform` |
| `ui/screens/__tests__/ExportHub.test.tsx:230,237` | footer `animation` contains `exportFooterRise`; `''` under reduced motion |
| `ui/screens/__tests__/ExportModal.reduced-motion.test.tsx:45` | spinner `animation` `''` |
| `ui/screens/__tests__/BootSequence.test.tsx:105-126` | video `opacity` `'0'` → `'1'` across the phase machine |
| `…BootSequence.test.tsx:393` | reduced motion: root `transition` `''` |
| `ui/screens/map/__tests__/MapCanvas.test.tsx:167,552,571,585,596` | loading cover reaches `opacity: '0'` |
| `ui/screens/map/__tests__/MapScreen.test.tsx:440` | same |

### §6.6 DOM-marker style assertions (imperative, not JSX)

| File:line | Pins |
|---|---|
| `ui/screens/map/__tests__/markerElements.test.ts:81,95,98` | camera callout `display` `'none'` → `'block'` → `'none'` |
| `ui/screens/map/__tests__/MapCanvas.test.tsx:293,305,315` | the same, through the canvas |

### §6.7 Non-style assertions a restyle can still break

| File:line | Pins |
|---|---|
| `ui/__tests__/DemoExperience.test.tsx:24`, `PhoneFrame.test.tsx:35` | the phone screen subtree `pointerEvents` **must not** be `'none'` — the "screen is always interactive" contract |
| `app/(default)/__tests__/chrome-scope.test.tsx` | `/demo` must stay chrome-free (root `CLAUDE.md`) |
| `ui/__tests__/fonts.test.ts` | no runtime Google-Fonts `@import` in `demo.css` |
| `chrome/PdfPreview` tests | the iframe `sandbox="allow-modals allow-same-origin"` attribute |

**Counted:** **~95 individual style-pinning assertions across 22 test files.** The heaviest are
`ImportTerminalProgress.test.tsx` (~18), `AudioRecorderScreen.test.tsx` (~12),
`ExportHub.test.tsx` (~10), `TerminalLine.test.tsx` (~8), `PhoneFrame.test.tsx` (~6).

**No snapshots.** `grep` for `toMatchSnapshot` / `toMatchInlineSnapshot` across `features/demo/**`
returns nothing. Every pin is an explicit assertion — good news: a restyle produces readable
failures, not a wall of snapshot diffs.

---

## §7 — Scope boundaries

### §7.1 Demo-only surfaces — the matrix marks these **N/A**

These have no phone counterpart. A phone-side change can never map onto them; they need an
independent design decision (usually "follow the new palette" or "leave alone").

| Surface | File:lines | Note |
|---|---|---|
| **StoryRail** | `ui/StoryRail.tsx` (114) | The narration panel beside the phone. "Marketing voice (7C garnish)" (`:9`). Its own palette (`#4ecdc4`, `#f4f8fc`, `#bcccde`, `#5d7a9a`) and the only `nacelle` font use (`:78`). |
| **ExploreChecklist** | `ui/controls/ExploreChecklist.tsx` (99) | The rail's numbered manifest with unseen LEDs. Registry: `engine/content/explore.ts`. |
| **ExitDialog** | `ui/controls/ExitDialog.tsx` (95) | "Before you go" gate. **`position:fixed, zIndex:100`** — the only page-level (non-phone) overlay. |
| **AI / PDF import** | `ui/import/*` (5 files), `ui/screens/import/*` (4 files), `ui/screens/ImportModal.tsx` | The *terminal* replicates phone row 74; the **AI extraction path itself is demo-only** (owner decision D5 — the phone does JSON import, the demo does PDF + paste + a model proxy). |
| **FallbackMode / "Sample data" badges** | `ImportResultAccordion.tsx:41-45`, `ImportResultBody.tsx:65`, `MediaCaptureScreen.tsx:870-899`, `MediaLibrarySheet.tsx:723-735`, `OcrCaptureScreen.tsx:365-368`, `AudioPreviewScreen.tsx:197-199`, `PdfPreview.tsx:167`, `ImportModal.tsx:266,282` | **Demo-only honesty machinery** — the phone has no "this is sample data" state. **The amber family (`#ffd07a` / `rgba(255,200,90,*)`) exists solely for these.** A restyle must keep them visually distinct from real data; this is a correctness constraint, not a style preference. |
| **Marketing phone frame** | `ui/PhoneFrame.tsx` (179) | The 404×812 titanium device shell. No phone counterpart (the phone *is* the phone). |
| **`_pane-chrome`'s `PaneStubNote`** | `settings/panes/_pane-chrome.tsx:131-159` | The D6 "In the demo" honesty box on 9 of 10 settings panes. Demo-only. |
| **`DemoNotification`** | `ui/screens/map/DemoNotification.tsx` (59) | The auto-dismissing toast standing in for real device actions (call/email/etc. are simulated). |
| **`CallConfirmSheet`** | `ui/screens/map/CallConfirmSheet.tsx` (50) | A mock of the iOS call action sheet — calling is unavailable in the demo. |
| **`SplashScreen` (simulated)** | `ui/screens/SplashScreen.tsx` (170) | v1 rows 1-2 exist on the phone, but the demo's is explicitly **simulated** (decision D7) and carries a standing disclosure line the phone does not have. |
| **`DemoErrorBoundary`** | `ui/chrome/DemoErrorBoundary.tsx` (135) | Copy is ported from the phone's route-level fallbacks; the boundary itself is a web construct. |
| **`ScreenStage` / `motion.ts`** | `ui/ScreenStage.tsx`, `ui/motion.ts` | The web re-expression of React Navigation transitions. `motion.ts` doubles as the **port template back to RN**. |
| **`phone-overlay.tsx` / `usePhoneScale.ts`** | — | Pure web mechanics. No visual values (beyond `PhoneFrame`'s). |
| **`RowActions`** | `ui/screens/RowActions.tsx` (121) | A **web adaptation** (hold-to-reveal tray) of a phone *gesture* (swipe). The intent maps; the chrome does not. |

### §7.2 Phone surfaces the **v1** matrix ruled out — do not chase them

From `docs/planning/demo-phone-parity/00-surface-parity-matrix.md`. Marked **OUT-OF-SCOPE** by owner
decision:

| v1 row | Surface | Ruling |
|---|---|---|
| 4 | Biometrics Unavailable Screen | "No browser analog." |
| 16 | Settings Modal (entry from Cases/Home) | "Owner: skip Settings." *(Exception noted; §7.3.)* |
| 81 | Settings Modal (master/detail shell) | "Needed only as the host for #85/#86 — see decision D6." |
| 82 | Settings Nav Bar | — |
| 83 | Settings Category List | — |
| 84 | Settings Category Row | — |
| 87 | Detail Pane: Appearance | "Demo is dark-only by design." |
| 88 | Detail Pane: Media Capture | — |
| 89 | Detail Pane: Location | "GPS accuracy/timeout presets." |
| 90 | Detail Pane: Time Sync | "Demo hardcodes `time.nrc.ca`." |
| 91 | Detail Pane: Export Security | "Would gate #26." |
| 92 | Detail Pane: Cloud Sync | "Owner: cloud is out entirely." |
| 93 | Detail Pane: About | — |
| **94** | **Detail Pane: Developer (`__DEV__`)** | **"Owner: out."** — this one is genuinely never built. |

Marked **OPTIONAL**:

| v1 row | Surface | Ruling |
|---|---|---|
| 2 | BiometricScannerHUD | "Only worth building if #1/#3 are built." |
| 3 | Lock Screen (foreground re-auth) | "A simulated version is a flourish; real auth is out of scope." |
| 5 | Init Failure Screen | "The demo has no init that can throw (in-memory store)." |
| 75 | ImportFlowModal — Progress (Single JSON) | "The demo has no JSON import path at all." |
| 76 | ImportFlowModal — Progress (Batch JSON) | "Same. See D5." |

Also permanently out per the matrix header (`:38`): **cloud sync / agency-cloud / Supabase /
canvas-hub**, **real biometric auth**, and **the developer pane**.

> ### §7.3 ⚠ The v1 matrix's status column is STALE — read this before using it
>
> `00-surface-parity-matrix.md` was written **before** the nine-phase parity effort. Its status
> column (`MISSING` / `PARTIAL` / `OUT-OF-SCOPE`) describes the demo as of 2026-07-30, **not today**.
> Concretely:
>
> - Rows **81–93** are marked `OUT-OF-SCOPE`, but **P7.1 built the Settings shell and all ten panes
>   anyway** (decision D6 reversed the ruling in favour of stub panes with honesty notes). They exist
>   at `ui/screens/settings/**` and are inventoried in §3.5. Only **row 94 (Developer pane)** is
>   genuinely absent.
> - Rows **49–68** (media capture, media library, audio recorder) are all marked `MISSING`; **P4 built
>   every one** — see §3.3.
> - Rows **24–28** (Export hub, modals, action sheet, alerts) are marked `MISSING`; **P5 built them**
>   — except **row 26 (Password Modal / AES)**, which is still absent (deferral §34 records the
>   `html2pdf.js` spike verdict and D4).
> - Rows **6, 9, 12, 14, 15, 23, 39, 40** are marked `MISSING`; all now exist.
>
> **Use the matrix for its row IDs and its ui-mapping doc numbers (the join key), not its status
> column.** The authoritative "what exists now" list is §3 of this document.

### §7.4 Open styling deferrals — the port's un-defer triggers

From `docs/code-reviews/deferred.md` (6,240 lines; 83 entries). The styling-relevant open ones:

| # | Line | What | Trigger |
|---|---|---|---|
| **31** | `:657-684` | **The P0.5 glass-token residuals.** Names the exact call sites that kept bare literals: `SyncStatusCard.tsx`'s `#2a4a6f` inside a template conditional; `CaseMapPicker.tsx:131`'s `borderColor: selected ? accent : '#1e3a5f'`; the two `1px solid rgba(43,140,193,0.25)` sites (ImportModal picker card + ExtractedScope banner); and "every one-off gradient (WizardHeader/TabBar bars, PhoneFrame titanium + scan sweep, Splash HUD, map canvas, OCR scrim, drawer fades, ImportResultBody 0.6/0.7 card, Completion 0.9/0.96 summary panel)". | **"any actual demo restyle (the tokens' whole purpose) — normalize the near-miss variants into the token set then, with a side-by-side check"**. **This port IS the trigger.** |
| **23** | `:482-500` | Drawer completion dots distinguish complete/partial **by colour only** (filled green vs filled amber). A non-colour ring was built and then **reverted at the owner's request**. | "if a strict-a11y bar applies or before any production use". A restyle touching `WizardDrawer.tsx:77-81` should re-raise it — but note the owner already ruled once. |
| **19** | `:396-412` | Double-Escape closes both a `ModalShell` modal and a picker opened inside it. | Interaction, not style — but it is in the same overlay-layering territory as §2.6. |
| **20** | `:413-427` | **z-index inversion if a `PickerSheet` and the `WizardDrawer` are open together** (31/32 vs 41/42). | Directly relevant: any renumbering of the five z schemes must resolve this. |
| **30** | `:639-656` | Select placeholder copy diverges from the phone. | Copy, not style — but it lives in `SelectField`/`Dropdown`, which the port touches. |

Deferral **21** (PdfPreview Escape/backdrop) and **22** (drawer completion dots) are marked
✅ RESOLVED; **25** (Mapbox autocomplete) and **38** (address joins) likewise.

---

## §8 — The design-sync bundle: what the port must re-run

### §8.1 What it is

`.design-sync/` syncs `features/demo/ui/` to a Claude Design project
(`e89f59b7-5369-410f-a867-5196e61aebc4`, "DVR Extraction Notes Demo — Web UI", KC account) as a
component bundle with authored previews, so a design agent can iterate on real components.

`.design-sync/config.json` at HEAD:

| Field | Value |
|---|---|
| `srcDir` | `features/demo/ui` |
| `cssEntry` | `features/demo/ui/demo.css` — **not** the Tailwind output; the demo is inline-styled |
| `componentSrcMap` | **37 keys** — 33 pinned components + **4 explicit `null` exclusions**: `DemoExperience` (the store bridge), `PhoneOverlayContext` (a context, not a component), `MapCanvas` / `MapScreen` (need mapbox-gl + a live token + network) |
| `overrides` | 33 — `{cardMode:'column'}` for 32, `{cardMode:'single', primaryStory:'ManyUnseen'}` for `ExitDialog` (a `position:fixed` overlay can't sit in a grid cell) |
| `dtsPropsFor` | 33 — generated from source by `gen-dts-props.mjs` |

### §8.2 Tracked vs generated

| Path | Status |
|---|---|
| `ds-bundle/` | **gitignored** (`.gitignore:57`). `git ls-files ds-bundle` → **0 files**. Purely generated. |
| `ds-bundle-marketing/` | gitignored (`.gitignore:61`) |
| `.ds-sync/` | gitignored (`.gitignore:56`) — the Playwright/toolchain sandbox |
| `.design-sync/node_modules` | gitignored (`.gitignore:60`) — a symlink to `.ds-sync/node_modules` |
| `.design-sync/.cache/`, `.design-sync/learnings/` | gitignored (`:58-59`) |
| `.design-sync/config.json`, `ds-entry.ts`, `previews/*`, `shims/*`, the `*.mjs` scripts, `NOTES.md`, `conventions.md`, `fonts/` | **tracked** |

**Read:** the bundle output is disposable; the *config and previews* are the artefact. A restyle
changes what the previews render but not, usually, the previews themselves.

### §8.3 What the port must re-run — and when

| Trigger | Command | Why |
|---|---|---|
| **Any component prop change** | `node .design-sync/gen-dts-props.mjs` | Rewrites `config.json`'s `dtsPropsFor` in place from the real source via ts-morph. "**Re-run it after ANY component prop change**" (`NOTES.md:76`). A restyle that adds e.g. a `variant`/`tone`/`hideLabel` prop (see §4.7 #4) **requires this**. It preserves hand-written entries (they win over generated ones). |
| **Any change to `componentSrcMap`** (a component added, renamed, or removed) | `node .design-sync/gen-entry.mjs` | Regenerates `.design-sync/ds-entry.ts`, the bundle entry. **"ALWAYS after config edits"** (`NOTES.md:188`). A component added to the map without this is **bundled-but-unreachable — the card fails at runtime, not build time** (`NOTES.md:162-165`). |
| **A full re-sync** | the three-command recipe at `NOTES.md:186-192` (`ln -sfn` the node_modules symlink on a fresh clone, then `package-build.mjs`, then `package-validate.mjs`, both with `NODE_PATH=.ds-sync/node_modules`) | The render check needs the pinned Playwright (1.61.1 / chromium-1228) in `.ds-sync/`. |
| **Before any re-sync** | `get_project` on the pinned `projectId` | `NOTES.md:15-20`: the design login switched accounts mid-session (Kris → KC); if a project 404s, **do not recreate blindly** — check `list_projects` owner first. |

### §8.4 Implications for the restyle specifically

1. **A restyle alone does not require a re-run.** Changing values inside existing components leaves
   `componentSrcMap` and the prop contracts untouched. Only **new props** or **new/renamed
   components** do.
2. **If the port adds shared recipes** (the §4.7 list — an exported `fieldInput`, a centred-dialog
   component, `Toggle`'s `hideLabel`), then:
   - a new *component* ⇒ add to `componentSrcMap`, add a `{cardMode:'column'}` override (expect a
     `[GRID_OVERFLOW]` warn otherwise — it's presentation-only, `NOTES.md:143-150`), author a preview,
     **and re-run `gen-entry.mjs`**;
   - a new *prop* on an existing component ⇒ **re-run `gen-dts-props.mjs`**.
3. **Previews must keep their wrapper.** Every preview wraps in `<div data-demo-root>` with a dark
   navy background (`#0d1b2a`) because `demo.css` scopes every rule — including `box-sizing` — to
   `[data-demo-root]` (`NOTES.md:128`). **If the port changes the base background away from
   `#0d1b2a`** (which §5.3's `background` drift implies it should), **all 33 previews' hardcoded
   backdrop goes stale.** That is a real, mechanical follow-up: `grep -l '#0d1b2a' .design-sync/previews/`.
4. **Do not let the converter fall back to its own synth-entry.** It does `export * from` every file
   under `srcDir`, dragging in `mapbox-gl` and the Zustand store: the bundle went 4,460 KB → **530 KB**
   once the generated entry replaced it (`NOTES.md:41-45`).
5. **Two `NOTES.md` lines are already stale** and should be corrected while the port is in flight:
   `:66` and `:158` still describe `demo.css` pulling Share Tech Mono + JetBrains Mono via a Google
   Fonts `@import` and warn about a `[FONT_REMOTE]` validation notice. **That `@import` no longer
   exists** — `demo.css:7-10` documents the switch to self-hosted `next/font`, and
   `ui/__tests__/fonts.test.ts` guards against its return.
6. **`NOTES.md:166-178` is the direct ancestor of this document.** It already recorded the inline-hex
   sprawl ("`T` is imported by only the **7 input components** — the **15 screens hardcode the same
   hexes inline** (39× `#f0f4f8`, 22× `#2B8CC1`, 19× `#99badd`, 13× `#1e3a5f`, 6× `#0d1b2a`, 3×
   `#ff4757`)") and closed with: *"It does NOT cover the screens' inline hexes vs `T` — only RN-source
   vs `T`; **the inline-hex sprawl is still a manual risk**."* One year of feature work later, §2
   measures the same sprawl at **100× / 58× / 47× / 17× / 14× / 21×** across 136 files. **The risk
   compounded exactly as predicted, and closing it is what this port is for.**

---

## Appendix A — Running the census yourself

```sh
cd "D:/Work Coding Projects/CCTV Recovery Notes App/worktrees/demo-ui-parity-planning"
node docs/planning/demo-phone-ui-parity/census.mjs . > census.txt
```

Section offsets in the generated `census.txt` at `5cf88fe` (1,264 lines):

| Line | Section |
|---|---|
| 2 | COLOR — 278 distinct, 1,144 occurrences |
| 560 | BORDERRADIUS — 31 / 222 |
| 624 | FONTSIZE — 27 / 504 |
| 680 | FONTWEIGHT — 5 / 256 |
| 692 | LETTERSPACING — 20 / 56 |
| 734 | BOXSHADOW — 22 / 26 |
| 780 | PADDING — 146 / 388 |
| 1074 | GAP — 14 / 145 |
| 1104 | MARGIN — 55 / 375 |
| 1216 | ZINDEX — 23 / 48 |
| 1264 | `FILES SCANNED: 136` |

## Appendix B — Things I could not verify

1. **§3 line ranges** were produced by six parallel reader agents (see the §3 caveat at the top). I
   verified the token modules, `_shared.tsx`, `mapTokens.ts`, `demo.css`, `motion.ts`, the census,
   §5, §6, §7 and §8 directly. Individual `file:line` ranges inside §3 blocks were not independently
   re-opened.
2. **Whether the phone's `#002853` / `#1c4e84` / `PrimaryButtonGradient` changes are the *whole*
   token delta.** I read the phone repo only for the nine existing anchors, per the brief. The
   phone-side agent's inventory is authoritative on everything else — including the eight collapsed
   card families, the teal purge, the stale-navy sweep and the map-chrome redesign, none of which the
   nine anchors can see.
3. **When the guard broke.** I did not bisect the phone repo to find which commit renamed
   `PRIMARY_GRADIENT` → `PrimaryButtonGradient`, so I cannot say how long the four drifts have been
   invisible. `it.skipIf(!rnAvailable())` means CI without the sibling repo would report green
   regardless.
4. **The `ds-bundle` render state.** I did not run the design-sync build (`NOTES.md` requires
   `NODE_PATH=.ds-sync/node_modules` and a pinned Playwright; the worktree has no `node_modules`, and
   the brief forbade `pnpm install`). §8's claims come from `config.json`, `.gitignore`, `git ls-files`
   and `NOTES.md`, all read directly.
5. **The test suite was not run** (per the brief). §6's list is a machine grep over
   `features/demo/**/__tests__`; I did not confirm each assertion currently passes.
6. **Padding/margin distributions** (§2.7) are summarised rather than enumerated — 201 distinct
   values across 763 occurrences did not compress into anything a reader could use. Run the script.
