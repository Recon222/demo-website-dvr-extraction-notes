# Demo Picker Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan phase-by-phase (TDD: write the red-line tests from `03-demo-picker-parity-test-spec.md` first). Steps use checkbox (`- [ ]`) syntax.

**Prerequisite:** Read the Architecture & Design Document (`01-demo-picker-parity-architecture.md`) for the component tree, data flow, and design rationale. The Test Specification is `03-demo-picker-parity-test-spec.md`.

## Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Time wheel | Hand-rolled CSS `scroll-snap` + gradient mask | RN lib has no DOM build; no web lib does HH:MM:SS with this look |
| Calendar | Hand-rolled month grid in a bottom-sheet | RN lib has no DOM build; trivial DOM |
| Dropdown | Hand-rolled glass modal list | Mirrors the phone's own hand-rolled `Picker` |
| Date+time | Two separate buttons inside one `DateTimeField` | Matches phone `datetime` mode; screen call-sites unchanged |
| Value contract | `"YYYY-MM-DD HH:MM:SS"` string | No store/screen changes |
| Pure math | `engine/logic/datetime-parts.ts` | Coverage-gated, JSX-free |
| Components | `ui/inputs/` | Presentational layer |
| Styling | Inline `CSSProperties` + `input-theme.ts` tokens | Demo convention (no Tailwind) |
| Sheet chrome | New `PickerSheet` (bottom-anchored) | Calendar/wheel need auto-height, not full-height `ModalShell` |
| Wheel input | Native scroll-snap + settle handler | Works with wheel/trackpad/touch/keyboard; no drag physics |
| Now source | Injected `now()` (default `() => new Date()`), called only in handlers | Mirrors phone auto-populate; deterministic in tests; respects "no Date.now() at render" |
| New deps | None | Pure DOM/CSS |

## Tooling

| Tool | Version |
|------|---------|
| React | 19.x |
| Next.js | 15.x (App Router, client island) |
| Zustand | 5.x |
| Vitest | 4.x + jsdom + Testing Library |
| TypeScript | 5.7 (strict) |

## Global Constraints

- **Inline styles only** (no Tailwind); import palette from `input-theme.ts`. Do not add CSS classes except keyframes in `demo.css`.
- **`'use client'`** on every component file under `ui/inputs/`. The pure `datetime-parts.ts` has no directive (it is framework-free).
- **No `Date.now()` / `Math.random()` at module or render scope.** Time reads happen inside event handlers via an injected `now()` (default `() => new Date()`).
- **Callback isolation:** none of these components import the store. Props in, callbacks out.
- Value strings are always canonical `YYYY-MM-DD HH:MM:SS` (seconds always present, milliseconds never).
- All overlays render **inside** the phone screen (absolute within the `[data-phone-screen]` subtree), like `ModalShell`/`PdfPreview`.

---

## Milestone 1: Foundations + Dropdown

**Observable result:** The Resolution / Recording-FPS dropdowns on DVR Info, Cameras, and Export Info open a custom glass modal list (accent-dot header, options with a selected dot + checkmark pill) instead of the browser `<select>`. Pure date/time math is in place and tested.

### Phases: 1, 2, 3

### Phase 1 — Pure date/time parts

**Goal:** Provide tested, framework-free conversion between the store string and date/time parts.

#### 1A: `features/demo/engine/logic/datetime-parts.ts`

```typescript
export interface DateParts { y: number; mo: number; d: number; h: number; mi: number; s: number } // mo: 1-12

export function pad2(n: number): string                     // 5 -> "05"
export function daysInMonth(y: number, mo: number): number  // mo 1-12; Feb leap-aware
export function clampDay(y: number, mo: number, d: number): number // min(d, daysInMonth)

/** "YYYY-MM-DD HH:MM:SS" -> parts. Returns null for empty/malformed (dev-warns). Accepts "T" separator. */
export function parsePartsLoose(value: string): DateParts | null

export function formatStored(p: DateParts): string  // -> "YYYY-MM-DD HH:MM:SS" (clampDay applied)
export function formatDate(p: DateParts | null): string // "YYYY-MM-DD" | "—"
export function formatTime(p: DateParts | null): string // "HH:MM:SS" | "—"

export function nowParts(now: () => Date): DateParts

/** Keep existing time; set y/mo/d (clamped). Empty value seeds time from now(). */
export function mergeDate(value: string, date: { y: number; mo: number; d: number }, now: () => Date): string
/** Keep existing date; set h/mi/s (ms dropped). Empty value seeds date from now(). */
export function mergeTime(value: string, time: { h: number; mi: number; s: number }, now: () => Date): string
```

Implementation notes: pure string/number math — do **not** route through `Date` for parsing/formatting (avoids TZ drift); `Date` is used only inside `nowParts`. `mergeDate` clamps the day to the target month length (the phone's month-overflow guard).

- [ ] Write red-line tests (`03` Phase 1) → implement → green → commit.

### Phase 2 — Theme tokens + sheet chrome

**Goal:** Shared style tokens and a reusable bottom-sheet shell for the calendar and wheel.

#### 2A: `features/demo/ui/inputs/input-theme.ts`

```typescript
export const T = {
  bg: '#0d1b2a', raised: '#0f2035', border: '#1e3a5f', borderSoft: 'rgba(30,58,95,0.5)',
  text: '#f0f4f8', textDim: '#cdd9e6', textMute: '#99badd', textFaint: '#7a9fc4',
  primary: '#2B8CC1', accentFrom: '#35A0D6', accentTo: '#2580AD',
  topHighlight: 'rgba(184,212,240,0.25)', scrim: 'rgba(4,8,14,0.55)', error: '#ff4757',
  radius: 12, rowH: 44,
} as const
```

#### 2B: `features/demo/ui/inputs/PickerSheet.tsx`

```typescript
export interface PickerSheetProps { title: string; onClose(): void; children: ReactNode; footer?: ReactNode }
export function PickerSheet(props: PickerSheetProps): React.JSX.Element
```

Bottom-anchored sheet inside the phone frame: scrim (`onClose` on click), sheet `position:absolute; left:0; right:0; bottom:0`, `borderTopLeftRadius/RightRadius:18`, 2px top-highlight border (`T.topHighlight`), `background:T.raised`, deep shadow; header row (accent dot + `title` + close ✕); scrollable body; optional sticky `footer`. Slide-up via a new `sheetUp` keyframe. `Escape` closes (mirror `ModalShell`'s key handler).

#### 2C: `features/demo/ui/demo.css` (MODIFY)

Add:
```css
@keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
```
(Scope stays under `[data-demo-root]`; reuse existing `screenIn` if preferred — but a dedicated bottom-anchored slide reads better for sheets.)

- [ ] Tests (`03` Phase 2: PickerSheet open/close/escape/footer) → implement → green → commit.

### Phase 3 — Dropdown + swap `SelectField`

**Goal:** A custom dropdown that visually matches the phone's `Picker`, wired into every screen via `_shared`.

#### 3A: `features/demo/ui/inputs/Dropdown.tsx`

```typescript
export interface DropdownProps {
  label?: string
  value: string
  onChange(value: string): void
  options: string[]               // demo passes string[]; label === value
  placeholder?: string            // default "Select an option"
  required?: boolean
}
export function Dropdown(props: DropdownProps): React.JSX.Element
```

Selector pill: value/placeholder text + a 40px right "indicator zone" (left border) holding a chevron-down svg. Tap → centered modal (NOT a bottom sheet — the phone's dropdown is centered): scrim + glass card (85% width, maxHeight 70%, top-highlight border), gradient header (accent dot + UPPERCASE title + ✕), 2px accent strip, then a scrollable options list. Each option: glowing dot (filled when selected) + label + checkmark-in-pill when selected; selected row tinted. `Escape`/scrim/✕ close; selecting calls `onChange` and closes. Keyboard: options are buttons (Tab/Enter).

#### 3B: `features/demo/ui/screens/_shared.tsx` (MODIFY)

Replace the native-`<select>` body of `SelectField` with a delegation (keep the exact existing signature so all screens are untouched):

```typescript
import { Dropdown } from '@/features/demo/ui/inputs/Dropdown'
export function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange(v: string): void; options: string[] }) {
  return <div style={{ marginBottom: 14 }}><Dropdown label={label} value={value} onChange={onChange} options={options} placeholder="Select…" /></div>
}
```
(Or fold the margin into `Dropdown`; keep one wrapper. Delete the old `<select>` JSX.)

- [ ] Tests (`03` Phase 3) → implement → swap → `pnpm test` + manual check on DVR/Cameras/Export → commit.

---

## Milestone 2: Date field + bottom-sheet calendar

**Observable result:** A `DateField`, mounted with a value, opens a bottom-sheet month calendar (circular cells, primary-filled selected day, today ring), navigates months, and selecting a day updates the date portion while preserving the time portion. (Verified by tests + an isolated manual mount; goes live in Milestone 4.)

### Phases: 4, 5

### Phase 4 — Calendar grid

**Goal:** A pure presentational month grid.

#### 4A: `features/demo/ui/inputs/Calendar.tsx`

```typescript
export interface CalendarProps {
  viewYear: number
  viewMonth: number                       // 1-12
  selected: { y: number; mo: number; d: number } | null
  today: { y: number; mo: number; d: number }
  onPrevMonth(): void
  onNextMonth(): void
  onSelectDay(day: number): void
}
export function Calendar(props: CalendarProps): React.JSX.Element
```

Header: ‹ prev | `MonthName YYYY` | next ›. Weekday row `Su Mo Tu We Th Fr Sa`. A 7-col grid of cells using `daysInMonth(viewYear, viewMonth)` and the first-of-month weekday for the leading blanks; ~36px circular cells. Selected day = `T.primary` fill, white text; today (when not selected) = 1.5px primary ring; other days = `T.text`. Leading/trailing blanks render empty (or faded outside-days — blanks are fine for v1). Pure: all state lives in `DateField`.

- [ ] Tests (`03` Phase 4) → implement → green → commit.

### Phase 5 — DateField

**Goal:** The "Date" button + calendar sheet that edits the date portion.

#### 5A: `features/demo/ui/inputs/DateField.tsx`

```typescript
export interface DateFieldProps {
  value: string                  // "YYYY-MM-DD HH:MM:SS" | ""
  onChange(value: string): void
  now?: () => Date               // default () => new Date()  (test seam)
}
export function DateField(props: DateFieldProps): React.JSX.Element
```

Renders a button with an uppercase "DATE" caption + `formatDate(parsePartsLoose(value))` (or "—"). On open: seed `view{Year,Month}` from the parsed value, else from `now()`; if `value === ""`, immediately `onChange(mergeDate(value, todayParts, now))` so the field populates on open (phone behavior). Sheet = `PickerSheet title="Select Date"` containing `<Calendar/>` + a footer "Done" button. `onSelectDay(day)` → `onChange(mergeDate(value, { y: viewYear, mo: viewMonth, d: day }, now))` (live; sheet stays open, mirroring the phone's iOS modal). "Done"/close dismisses. Month nav updates local view state only.

- [ ] Tests (`03` Phase 5) → implement → green → commit.

---

## Milestone 3: Time field + HH:MM:SS wheel

**Observable result:** A `TimeField`, mounted with a value, opens a 3-column scroll-snap wheel (HH / MM / SS) with a center selection band and edge gradient fade; Confirm writes back the time portion (preserving the date, stripping ms); Cancel discards. (Verified by tests + manual mount; live in Milestone 4.)

### Phases: 6, 7

### Phase 6 — TimeWheel

**Goal:** The scroll-snap drum.

#### 6A: `features/demo/ui/inputs/TimeWheel.tsx`

```typescript
export interface TimeWheelProps {
  value: { h: number; mi: number; s: number }
  onChange(next: { h: number; mi: number; s: number }): void
}
export function TimeWheel(props: TimeWheelProps): React.JSX.Element
```

Three `WheelColumn`s (H: 0-23, M: 0-59, S: 0-59). Each column:
- scrollable div, height `5 * T.rowH` (5 visible rows), `scrollSnapType:'y mandatory'`, `paddingBlock: 2 * T.rowH` (so first/last rows can center), `scrollbarWidth:'none'`.
- rows: `height: T.rowH`, `scrollSnapAlign:'center'`, 24px tabular-nums (`fontVariantNumeric:'tabular-nums'`).
- center **selection band**: an absolute, `pointerEvents:'none'` strip at the vertical center (1 `rowH` tall, subtle cyan tint + top/bottom hairlines).
- **gradient mask**: an absolute, `pointerEvents:'none'` overlay, `linear-gradient` from `T.raised` (top, opaque) → transparent (center) → `T.raised` (bottom), reproducing the drum fade.
- settle handler: on `scroll`, debounce (~120ms via `requestAnimationFrame`/timeout cleared on unmount — no `Date.now()`), compute `index = Math.round(scrollTop / rowH)`, clamp to range, and if changed call `onChange`. On mount/value change, programmatically `scrollTop = index * rowH` (no smooth) to reflect the controlled value.

Initial scroll position must be set in a `useLayoutEffect` from the incoming `value`.

- [ ] Tests (`03` Phase 6: index math via scroll events on a jsdom-mocked scroll, range clamp, controlled re-sync) → implement → green → commit.

### Phase 7 — TimeField

**Goal:** The "Time" button + wheel sheet with Confirm/Cancel.

#### 7A: `features/demo/ui/inputs/TimeField.tsx`

```typescript
export interface TimeFieldProps {
  value: string
  onChange(value: string): void
  now?: () => Date
}
export function TimeField(props: TimeFieldProps): React.JSX.Element
```

Button with uppercase "TIME" caption + `formatTime(parsePartsLoose(value))` (or "—"). On open: local `temp` = parsed time ?? `nowParts(now)`. Sheet = `PickerSheet title="Select Time"` with `<TimeWheel value={temp} onChange={setTemp}/>` and a footer of two buttons (Cancel ghost / Confirm primary, matching `ModalActions`). Confirm → `onChange(mergeTime(value, temp, now))` + close. Cancel/scrim/Escape → close (discard `temp`).

- [ ] Tests (`03` Phase 7) → implement → green → commit.

---

## Milestone 4: Compose + go live

**Observable result:** Every datetime field across Requested Scope, Arrival/Departure, Time Offset, and Extracted Scope renders as two buttons ("Date" | "Time") that open the calendar and wheel; dropdowns (from M1) are already live. The browser-native `datetime-local`/`<select>` are gone. Guided tour and all tests still pass.

### Phases: 8, 9, 10

### Phase 8 — DateTimeField (compose)

**Goal:** One field that lays out the label + the two buttons.

#### 8A: `features/demo/ui/inputs/DateTimeField.tsx`

```typescript
export interface DateTimeFieldProps {
  label: string
  value: string
  onChange(value: string): void
  now?: () => Date
}
export function DateTimeField(props: DateTimeFieldProps): React.JSX.Element
```

Renders the `label` row, then a flex row (`gap:8`) of `<DateField value onChange now/>` and `<TimeField value onChange now/>` (both bound to the **same** `value`/`onChange` — date edits preserve time, time edits preserve date, via `mergeDate`/`mergeTime`). Each child renders its own captioned button + sheet.

- [ ] Tests (`03` Phase 8: both buttons present; date edit preserves time and vice-versa) → implement → green → commit.

### Phase 9 — Swap `_shared.DateTimeField` + retire native inputs *(MODIFIES EXISTING)*

**Goal:** Route every screen through the new field; delete the old internals.

#### 9A: `features/demo/ui/screens/_shared.tsx` (MODIFY)

Replace the existing `datetime-local`-based `DateTimeField` body with a re-export/delegation to `@/features/demo/ui/inputs/DateTimeField` (signature already identical: `{ label, value, onChange }`). Delete the old `<input type="datetime-local">` JSX. Confirm `SelectField` (Phase 3) is also delegating. No other screen edits.

**Integration placement:** all four datetime screens (`RequestedScopeScreen`, `ArrivalDepartureScreen`, `TimeOffsetScreen`, `ExtractedScopeScreen`) import `DateTimeField` from `_shared` — the swap is transparent to them.

- [ ] Run full `pnpm test` (no screen test should need editing); fix only true regressions → commit.

### Phase 10 — Guided-tour compat, polish, parity pass

**Goal:** Confirm director/guided mode and finish the look.

- Guided mode: the director's beats write values into the **store** (`kind:'field'`/`'type'`), not into the picker DOM — so no `beats.ts` change is required. Verify the seeded values render correctly in the buttons while the phone is pointer-locked (`PhoneFrame interactive={false}`), and that sheets don't open during the tour.
- Polish: press-state feedback on buttons/options (scale/opacity), focus-visible outlines, `aria` labels on buttons (`Set date`/`Set time`), `role="dialog"` on sheets/modal.
- Parity pass: screenshot each screen beside the phone app; tune spacing/gradient stops on the wheel and the calendar cell sizing.

- [ ] Manual `pnpm dev` walk of all 7 screens (guided + `?mode=sandbox`); `pnpm build` + `pnpm lint` green → commit.

---

## Error Handling Patterns

- `parsePartsLoose` never throws — returns `null` on bad input (dev-warns); callers treat `null` as empty.
- `mergeDate`/`mergeTime` clamp (day-in-month) and strip ms; they always return a canonical string.
- Picker open with empty value seeds from `now()` inside the handler; never at render.
- Cancel/close = no mutation. Confirm/select = single `onChange` with the merged string.

## Appendix A: File Manifest (new files)

| File | Phase | Purpose |
|------|-------|---------|
| `features/demo/engine/logic/datetime-parts.ts` | 1A | Pure string⇄parts math |
| `features/demo/engine/logic/__tests__/datetime-parts.test.ts` | 1 | Unit tests (coverage-gated) |
| `features/demo/ui/inputs/input-theme.ts` | 2A | Shared inline-style tokens |
| `features/demo/ui/inputs/PickerSheet.tsx` | 2B | Bottom-sheet chrome |
| `features/demo/ui/inputs/Dropdown.tsx` | 3A | Custom select |
| `features/demo/ui/inputs/Calendar.tsx` | 4A | Month grid |
| `features/demo/ui/inputs/DateField.tsx` | 5A | Date button + calendar sheet |
| `features/demo/ui/inputs/TimeWheel.tsx` | 6A | HH:MM:SS scroll-snap drum |
| `features/demo/ui/inputs/TimeField.tsx` | 7A | Time button + wheel sheet |
| `features/demo/ui/inputs/DateTimeField.tsx` | 8A | Composes Date + Time |
| `features/demo/ui/inputs/__tests__/*.test.tsx` | 2-8 | Co-located component tests |

## Appendix B: Modified Existing Files (high-risk)

| File | Phase | Modification |
|------|-------|-------------|
| `features/demo/ui/screens/_shared.tsx` | 3B, 9A | `SelectField` → `Dropdown`; `DateTimeField` → new `DateTimeField`; delete native `<select>` / `datetime-local` |
| `features/demo/ui/demo.css` | 2C | Add `sheetUp` keyframe (under `[data-demo-root]`) |

> No changes to: the store, screen components, `DemoExperience.tsx`, the director/`beats.ts`, `vitest.config.mts` (the new pure helper is already covered by the existing `features/demo/engine/**` glob), or any dependency.
