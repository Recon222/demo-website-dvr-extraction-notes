# Demo Picker Parity — Architecture & Design

**Sibling documents (read in order):**
- `01-demo-picker-parity-architecture.md` ← you are here (the *what* and *why*)
- `02-demo-picker-parity-implementation-plan.md` (the *how*)
- `03-demo-picker-parity-test-spec.md` (the *prove it*)

## 1. Purpose

Bring the demo's wizard form inputs to visual + behavioral parity with the real phone app by replacing the browser-native `datetime-local` field and `<select>` dropdown with custom components: a **date field** (opens a bottom-sheet month calendar), a **separate time field** (opens an HH:MM:SS scroll-snap wheel), and a **custom dropdown** (opens a glass modal option list). It is a presentational-only feature — no store shape, data flow, or screen API changes.

## 2. System Architecture

The demo is a client-only React island; there is **no API, no server state, no data layer**. These are pure UI components that read a string and emit a string. Nothing below the screen layer touches the Zustand store (the demo's callback-isolation rule — see `features/demo/CLAUDE.md`).

```
┌─────────────────────────────────────────────────────────────────────┐
│ DemoExperience.tsx  (the ONLY store-touching component / bridge)     │
│   reads store strings  ──►  passes value + onChange down as props     │
└───────────────┬─────────────────────────────────────────────────────┘
                │ props: value:"YYYY-MM-DD HH:MM:SS" | options:string[]
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Wizard screens (features/demo/ui/screens/*)  — presentational         │
│   RequestedScope · ArrivalDeparture · TimeOffset · ExtractedScope     │
│   DvrInfo · Cameras · ExportInfo                                       │
│   render via the shared helpers in screens/_shared.tsx:               │
│     <DateTimeField/>  and  <SelectField/>   (← reimplemented here)     │
└───────────────┬───────────────────────────────────┬─────────────────┘
                ▼                                     ▼
┌───────────────────────────────┐   ┌─────────────────────────────────┐
│ features/demo/ui/inputs/       │   │ features/demo/ui/inputs/         │
│  DateTimeField → DateField +   │   │  Dropdown.tsx                    │
│                  TimeField     │   │   selector + glass modal list    │
│  DateField → Calendar (sheet)  │   └─────────────────────────────────┘
│  TimeField → TimeWheel (sheet) │
│  PickerSheet (bottom-sheet)    │            ▲ all components are
└───────────────┬───────────────┘            │ inline-styled, 'use client',
                ▼                             │ props-in / callbacks-out
┌─────────────────────────────────────────────────────────────────────┐
│ features/demo/engine/logic/datetime-parts.ts  (PURE, unit-tested)     │
│   "YYYY-MM-DD HH:MM:SS"  ⇄  { y, mo, d, h, mi, s }                     │
│   clampDay · daysInMonth · mergeDate · mergeTime · format helpers      │
└─────────────────────────────────────────────────────────────────────┘
```

The components are mounted inside the existing on-screen phone (`PhoneFrame`, 378×786 screen) and their sheets/modals render **inside that frame**, exactly like the existing `ModalShell`, `PdfPreview`, and `WizardDrawer` overlays.

## 3. Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Time wheel implementation | **Hand-rolled** CSS `scroll-snap` columns + gradient mask overlay | The phone uses `react-native-timer-picker` (RN-only; no DOM build). No web wheel library reliably supports an **HH:MM:SS** (seconds) drum with this glass look. Hand-rolling gives exact visual control and zero new deps. (Considered & rejected: porting the RN lib — impossible on React-DOM; generic web wheel libs — most omit seconds and can't match the drum/gradient.) |
| Calendar implementation | **Hand-rolled** month grid in a bottom-sheet | The phone uses `react-native-ui-datepicker` (RN-only). A month grid is trivial DOM; hand-rolling matches the demo's inline-style aesthetic and avoids a dep + its theming surface. |
| Dropdown implementation | **Hand-rolled** glass modal list | The phone's `Picker` is already a hand-rolled `Modal`+`FlatList`. We mirror it 1:1 in the DOM. |
| Date & time as **separate fields** | Two side-by-side buttons ("Date" / "Time"), each with its own picker | Mirrors the phone's `DateTimePickerInput` `datetime` mode exactly — the parity behavior the user called out. |
| Value contract | Keep the store's `"YYYY-MM-DD HH:MM:SS"` string | Zero store/screen changes; the components parse/emit the same string the current `datetime-local` field does. |
| Pure date math location | `features/demo/engine/logic/datetime-parts.ts` | Engine = pure, framework-free logic under the 80% coverage gate (per `vitest.config.mts`). Keeps string↔parts math testable and isolated from JSX. |
| UI component location | `features/demo/ui/inputs/` | New sibling of `screens/`, `controls/`, `chrome/` — presentational layer, consistent with the demo's structure. |
| Styling | **Inline `CSSProperties`** + a shared `inputTheme` token object | The demo bans Tailwind here and styles inline (see CLAUDE.md). One token object keeps the palette DRY across the new components. |
| Bottom-sheet chrome | New `PickerSheet` (extracted from `ModalShell`'s pattern) | Calendar/wheel want an **auto-height sheet anchored to the bottom**, not the full-height `ModalShell`. Same scrim + `screenIn` slide + rounded top + grid backdrop. |
| New dependencies | **None** | Everything is DOM + CSS. A hard requirement: keep the demo's bundle and dep list unchanged. |
| "Open empty → now" | Compute `now` **inside the open handler**, injectable for tests | Mirrors the phone's auto-populate. The demo bans `Date.now()`/`Math.random()` at module/render scope for SSR determinism, but the existing time-capture handlers already read real time in event handlers — same pattern, and tests inject a fixed clock. |

## 4. Data Flow

```
1. Screen renders <DateTimeField value={sc.startDateTime} onChange={...} />.
2. DateTimeField parses value → { y, mo, d, h, mi, s } via parsePartsLoose() (empty → null).
3. Displays two buttons: "Date" = formatDate(parts) | "—", "Time" = formatTime(parts) | "—".
4a. User taps "Date" → CalendarSheet opens at parts.date ?? today. Pick a day →
    mergeDate(value, picked) (keeps existing HH:MM:SS) → onChange(newString).
4b. User taps "Time" → TimeWheel opens at parts.time ?? now. Scroll H/M/S, Confirm →
    mergeTime(value, {h,mi,s}) (keeps existing date, strips ms) → onChange(newString).
5. onChange flows up to the screen → DemoExperience → store.updateField(...). Same path
   the current datetime-local field uses today. No new store wiring.

Dropdown:
1. Screen renders <Dropdown value={dvr.resolution} options={RES} onChange={...} />.
2. Selector shows the selected label (or placeholder) + chevron.
3. Tap → modal list opens; tap an option → onChange(value), close. Same onChange path.
```

## 5. Error Handling & Edge Cases

- **Empty value** (`""`): fields show an em-dash / placeholder; opening a picker seeds from `now`/`today` (the phone's behavior). No throw.
- **Malformed string**: `parsePartsLoose` returns `null` (treated as empty) rather than throwing; `__DEV__` `console.warn`.
- **Month overflow** (e.g. day 31 → February): `clampDay`/`mergeDate` clamp the day to `daysInMonth(y, mo)` so the date never rolls into the next month (the phone guards this with `setDate(1)` first).
- **Seconds**: always emitted (`HH:MM:SS`); milliseconds never appear — matches the demo's "canonical seconds" parity fix and the phone's forensic ms-stripping.
- **Cancel**: closing a sheet without confirming leaves the value untouched.
- **Guided (director) mode**: the phone is pointer-locked in guided mode; beats type values directly into the store, so the pickers never need to open during the tour. The components must render the seeded value correctly read-only-ish (pointer-events gated by `PhoneFrame`).

## 6. Rollout / Integration Plan

Internal refactor of presentational inputs — no flags, no data migration.

1. Build the new components + pure helpers behind their own files (no screen sees them yet).
2. Reimplement `_shared.tsx`'s `DateTimeField` and `SelectField` to render the new components, keeping their **exact prop signatures** (`DateTimeField({label,value,onChange})`, `SelectField({label,value,onChange,options})`). Every screen updates automatically with zero per-screen edits.
3. Delete the old `datetime-local` / `<select>` internals.
4. Verify against the phone app screen-by-screen; full `pnpm test` + `pnpm build` stay green.

**Rollback:** revert the `_shared.tsx` swap commit; the old fields return instantly (the new files are inert until `_shared` references them).

## 7. Open Questions

*(All must be resolved in the Implementation Plan's Architecture Decisions table.)*

1. Does `DateTimeField` keep the single-component "Date | Time two-button" shape (matching the phone's `datetime` mode), or expose separate `DateField`/`TimeField` to screens? → **Resolved (plan):** keep one `DateTimeField` (two buttons inside) so screen call-sites are unchanged; `DateField`/`TimeField` exist as internal building blocks.
2. Wheel input model — native scroll-snap vs. pointer-drag? → **Resolved (plan):** native `scroll-snap` + snap settle handler (works with mouse wheel, trackpad, touch, and keyboard); no custom drag physics.
3. Where do the dropdown option lists live? → **Resolved:** unchanged — they stay inline in each screen (`RES`, `FPS`, …) and are passed as `options`.

## 8. Dependencies

| Package | Status |
|---------|--------|
| (none) | **No new dependencies.** Pure React + DOM + CSS. RN libraries (`react-native-timer-picker`, `react-native-ui-datepicker`, `@gorhom/bottom-sheet`) are intentionally **not** ported — they cannot run on the React-DOM demo. |

## 9. Component Module Location

```
features/demo/
├── engine/
│   └── logic/
│       ├── datetime-parts.ts        # NEW — pure string⇄parts math (coverage-gated)
│       └── __tests__/datetime-parts.test.ts
└── ui/
    ├── inputs/                       # NEW directory
    │   ├── PickerSheet.tsx           # bottom-sheet chrome for pickers
    │   ├── Dropdown.tsx              # custom select (replaces native <select>)
    │   ├── Calendar.tsx              # month grid
    │   ├── DateField.tsx             # "Date" button + Calendar sheet
    │   ├── TimeWheel.tsx             # HH:MM:SS scroll-snap drum
    │   ├── TimeField.tsx             # "Time" button + TimeWheel sheet
    │   ├── DateTimeField.tsx         # composes DateField + TimeField (two buttons)
    │   ├── input-theme.ts            # shared inline-style tokens
    │   └── __tests__/                # co-located component tests
    └── screens/
        └── _shared.tsx               # MODIFIED — DateTimeField/SelectField now delegate
```

## 10. Scope Boundaries

**In scope (Phase set below):** date field + bottom-sheet calendar, separate time field + HH:MM:SS wheel, custom dropdown, swap into all wizard screens via `_shared`.

**Out of scope (future):**
- Range/multi-date calendar mode (phone declares it but the demo never uses it).
- 12-hour time format / AM-PM (demo is 24h `HH:MM:SS`).
- Haptics (no web equivalent; press-state visual feedback only).
- The media-capture / audio screens (still deferred fast-follows; no date/time/dropdown fields).
- Theming/light mode (the demo is dark-only).

## 11. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-28 | Initial architecture |
