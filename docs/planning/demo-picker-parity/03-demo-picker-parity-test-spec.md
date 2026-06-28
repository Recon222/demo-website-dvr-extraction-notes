# Demo Picker Parity — Test Specification

## Purpose

This document defines every test that must be written **before implementation begins**. Tests are organized by the implementation phase they validate; write them all as **red-line tests** (designed to fail first), then implement the phase until they pass.

- The **Implementation Plan** (`02-demo-picker-parity-implementation-plan.md`) is the single source of truth for file paths and signatures.
- The **Architecture Document** (`01-demo-picker-parity-architecture.md`) defines the value contract and data flow.

## Test stack & conventions (demo reality)

- **Vitest 4 + jsdom + @testing-library/react** (+ `@testing-library/user-event`, `jest-dom`). Config: `vitest.config.mts`; setup: `vitest.setup.ts`.
- **Co-located** `__tests__/` next to each source file. Discovery glob is `**/*.{test,spec}.{ts,tsx}` (auto-found).
- **Coverage gate** (`coverage.include`) is `lib/**` + `features/demo/engine/**` — so `datetime-parts.ts` is gated; UI components run but aren't gated (behavioral tests).
- **No store mocking** — every component is callback-isolated (props in, `vi.fn()` callbacks out).
- **No TanStack Query / API / network** — this is a pure-UI feature; there is nothing to mock at a network boundary.

## Test File Location Table

| Test File | Phase(s) |
|-----------|----------|
| `features/demo/engine/logic/__tests__/datetime-parts.test.ts` | 1 |
| `features/demo/ui/inputs/__tests__/PickerSheet.test.tsx` | 2 |
| `features/demo/ui/inputs/__tests__/Dropdown.test.tsx` | 3 |
| `features/demo/ui/inputs/__tests__/Calendar.test.tsx` | 4 |
| `features/demo/ui/inputs/__tests__/DateField.test.tsx` | 5 |
| `features/demo/ui/inputs/__tests__/TimeWheel.test.tsx` | 6 |
| `features/demo/ui/inputs/__tests__/TimeField.test.tsx` | 7 |
| `features/demo/ui/inputs/__tests__/DateTimeField.test.tsx` | 8 |
| `features/demo/ui/screens/__tests__/_shared-inputs.test.tsx` | 9 |
| `features/demo/ui/inputs/__tests__/guided-integration.test.tsx` | 10 |

## Shared Mock Infrastructure

Define once, in `features/demo/ui/inputs/__tests__/test-utils.ts`:

```typescript
// Deterministic clock — passed as the `now` prop everywhere a picker reads "now".
export const FIXED_NOW = () => new Date(2025, 2, 8, 12, 5, 30) // 2025-03-08 12:05:30 (local)
export const fixedNowString = '2025-03-08 12:05:30'

export function makeParts(o: Partial<DateParts> = {}): DateParts {
  return { y: 2025, mo: 3, d: 8, h: 12, mi: 5, s: 30, ...o }
}
```

- **Clock:** never rely on the real clock. Pass `now={FIXED_NOW}` to `DateField`/`TimeField`/`DateTimeField`; for `datetime-parts` call `nowParts(FIXED_NOW)`/`mergeX(..., FIXED_NOW)`.
- **Sheet/modal rendering:** the overlays render **inline** (not React portals), so `render()` + `screen` queries find them; no special container.
- **Scroll in jsdom:** jsdom has no layout. `TimeWheel` must export a pure helper `indexFromScrollTop(scrollTop: number, rowH: number, count: number): number` for direct unit testing; component tests stub `element.scrollTop` then `fireEvent.scroll(column)` and assert the resulting `onChange`.
- **`user-event`:** prefer `userEvent.setup()` for clicks/keyboard; use `fireEvent.scroll` for wheel settle.

---

## Phase 1 Tests — Pure date/time parts

**Test file:** `features/demo/engine/logic/__tests__/datetime-parts.test.ts`
**Setup:** import all exports from `../datetime-parts`; use `FIXED_NOW`.

1. `describe('parsePartsLoose')` →
   - `it('parses a canonical "YYYY-MM-DD HH:MM:SS" into parts')` — assert the full `DateParts`.
   - `it('accepts a "T" separator')` — `'2025-03-08T12:05:30'` → same parts.
   - `it('returns null for empty string')`.
   - `it('returns null for a malformed string')` — e.g. `'not-a-date'`.

2. `describe('daysInMonth')` →
   - `it('returns 28 for non-leap February')` — `daysInMonth(2025, 2) === 28`.
   - `it('returns 29 for leap February')` — `daysInMonth(2024, 2) === 29`.
   - `it('returns 30 and 31 for April and January')`.

3. `describe('clampDay')` →
   - `it('clamps day 31 to 28 in non-leap February')`.
   - `it('leaves an in-range day unchanged')`.

4. `describe('formatStored / formatDate / formatTime')` →
   - `it('formatStored round-trips parsePartsLoose')` — parse→format equals input.
   - `it('formatStored applies clampDay')` — parts with `mo:2,d:31` → `...-02-28 ...`.
   - `it('formatDate/formatTime return em-dash for null')`.
   - `it('zero-pads single digits')` — `formatTime(makeParts({h:1,mi:2,s:3})) === '01:02:03'`.

5. `describe('nowParts')` →
   - `it('reads parts from the injected clock')` — `nowParts(FIXED_NOW)` equals `makeParts()`.

6. `describe('mergeDate')` →
   - `it('sets the date and preserves the time')` — `mergeDate('2025-03-08 10:20:30', {y:2026,mo:7,d:4}, FIXED_NOW) === '2026-07-04 10:20:30'`.
   - `it('clamps the day to the target month length')` — from `2025-01-31 …` picking Feb → `2025-02-28 …`.
   - `it('seeds the time from now() when the value is empty')` — `mergeDate('', {y:2025,mo:3,d:8}, FIXED_NOW)` → `'2025-03-08 12:05:30'`.

7. `describe('mergeTime')` →
   - `it('sets the time and preserves the date')` — `mergeTime('2025-03-08 10:20:30', {h:23,mi:59,s:1}, FIXED_NOW) === '2025-03-08 23:59:01'`.
   - `it('seeds the date from now() when the value is empty')`.
   - `it('always emits seconds (HH:MM:SS), never milliseconds')`.

---

## Phase 2 Tests — PickerSheet

**Test file:** `features/demo/ui/inputs/__tests__/PickerSheet.test.tsx`
**Setup:** `userEvent.setup()`; render with `title`, `children`, optional `footer`, `onClose: vi.fn()`.

1. `describe('PickerSheet')` →
   - `it('renders the title, children, and footer')`.
   - `it('has role="dialog" and aria-label set to the title')`.
   - `it('calls onClose when the scrim is clicked')`.
   - `it('calls onClose when the close (✕) button is clicked')`.
   - `it('calls onClose on Escape keydown')`.
   - `it('does not call onClose when the sheet body is clicked')` — stopPropagation.

---

## Phase 3 Tests — Dropdown

**Test file:** `features/demo/ui/inputs/__tests__/Dropdown.test.tsx`
**Setup:** `options = ['7','10','15','24','30','Other']`; `onChange: vi.fn()`.

1. `describe('Dropdown selector')` →
   - `it('shows the placeholder when value is empty')`.
   - `it('shows the selected option label when value is set')`.
   - `it('is closed by default (no option list in the DOM)')`.

2. `describe('Dropdown open/select')` →
   - `it('opens the option list when the selector is clicked')` — all options visible.
   - `it('calls onChange with the option value and closes when an option is clicked')`.
   - `it('marks the currently-selected option (checkmark/selected state)')`.
   - `it('closes via Escape / scrim / ✕ without calling onChange')`.

3. `describe('Dropdown a11y')` →
   - `it('exposes the options as buttons reachable by keyboard')` — Tab/Enter selects.

---

## Phase 4 Tests — Calendar

**Test file:** `features/demo/ui/inputs/__tests__/Calendar.test.tsx`
**Setup:** callbacks as `vi.fn()`; `today = {y:2025,mo:3,d:8}`.

1. `describe('Calendar grid')` →
   - `it('renders one cell per day of the viewed month')` — Feb 2025 → 28 day cells; Jan → 31.
   - `it('marks the selected day when it is in the viewed month')`.
   - `it('does not mark a selected day from another month')`.
   - `it('marks today with the ring treatment when today is not the selected day')`.

2. `describe('Calendar navigation & selection')` →
   - `it('calls onPrevMonth / onNextMonth when the arrows are clicked')`.
   - `it('calls onSelectDay with the clicked day number')`.
   - `it('renders the "MonthName YYYY" header for the viewed month')`.

---

## Phase 5 Tests — DateField

**Test file:** `features/demo/ui/inputs/__tests__/DateField.test.tsx`
**Setup:** `now={FIXED_NOW}`; `onChange: vi.fn()`.

1. `describe('DateField button')` →
   - `it('shows the formatted date for a value')` — `'2025-03-08 10:20:30'` → button shows `2025-03-08`.
   - `it('shows an em-dash for an empty value')`.

2. `describe('DateField interaction')` →
   - `it('opens the calendar sheet when the Date button is clicked')`.
   - `it('auto-populates today (preserving/seeding time) on open when value is empty')` — assert `onChange` called once with `mergeDate('', today, FIXED_NOW)`.
   - `it('calls onChange with the date set and time preserved when a day is picked')` — value `'2025-03-08 10:20:30'`, pick day 15 → `'2025-03-15 10:20:30'`.
   - `it('does not call onChange when only navigating months')`.
   - `it('closes the sheet on Done/close')`.

---

## Phase 6 Tests — TimeWheel

**Test file:** `features/demo/ui/inputs/__tests__/TimeWheel.test.tsx`
**Setup:** `value = {h:12,mi:5,s:30}`; `onChange: vi.fn()`; stub `scrollTop` + `fireEvent.scroll`.

1. `describe('indexFromScrollTop (pure)')` →
   - `it('rounds scrollTop/rowH to the nearest index')`.
   - `it('clamps below 0 and above count-1')`.

2. `describe('TimeWheel')` →
   - `it('renders three columns with H/M/S ranges')` — hours 0-23, minutes/seconds 0-59 present.
   - `it('reflects the controlled value as the initial scroll position')` — assert each column `scrollTop === index * rowH` after layout effect.
   - `it('calls onChange with the snapped value after a scroll settles')` — set hours column `scrollTop` to index 13, scroll → `onChange({h:13,mi:5,s:30})`.
   - `it('clamps to the column range')` — over-scroll seconds beyond 59 → stays 59.
   - `it('re-syncs scroll position when the value prop changes')`.

---

## Phase 7 Tests — TimeField

**Test file:** `features/demo/ui/inputs/__tests__/TimeField.test.tsx`
**Setup:** `now={FIXED_NOW}`; `onChange: vi.fn()`.

1. `describe('TimeField button')` →
   - `it('shows the formatted time for a value')` — `'2025-03-08 10:20:30'` → `10:20:30`.
   - `it('shows an em-dash for an empty value')`.

2. `describe('TimeField interaction')` →
   - `it('opens the wheel sheet on click and seeds temp from the value')`.
   - `it('seeds temp from now() when value is empty')`.
   - `it('Confirm calls onChange with the time set and date preserved')` — value `'2025-03-08 10:20:30'`, set wheel to 23:59:01 → `onChange('2025-03-08 23:59:01')`.
   - `it('Cancel closes without calling onChange')`.
   - `it('closes on Escape/scrim without calling onChange')`.

---

## Phase 8 Tests — DateTimeField

**Test file:** `features/demo/ui/inputs/__tests__/DateTimeField.test.tsx`
**Setup:** `now={FIXED_NOW}`; `onChange: vi.fn()`.

1. `describe('DateTimeField')` →
   - `it('renders the label and both a Date and a Time button')`.
   - `it('shows the formatted date and time for a value')`.
   - `it('editing the date preserves the time portion')` — pick a day → onChange keeps `HH:MM:SS`.
   - `it('editing the time preserves the date portion')` — confirm wheel → onChange keeps `YYYY-MM-DD`.

---

## Phase 9 Tests — `_shared` swap regression *(modifies existing)*

**Test file:** `features/demo/ui/screens/__tests__/_shared-inputs.test.tsx`
**Setup:** render `SelectField` and `DateTimeField` from `_shared`; `onChange: vi.fn()`.

1. `describe('_shared.SelectField')` →
   - `it('renders the custom Dropdown, not a native <select>')` — assert no `<select>` in the DOM; selector present.
   - `it('passes options through and emits the chosen value')`.

2. `describe('_shared.DateTimeField')` →
   - `it('renders two buttons (Date/Time), not a datetime-local input')` — assert no `input[type="datetime-local"]`.
   - `it('keeps the existing { label, value, onChange } contract')`.

3. `describe('screen integration (smoke)')` →
   - `it('RequestedScopeScreen renders Date/Time buttons for each scope')` — render with a seeded scope; assert buttons exist; no native datetime input.
   - `it('DvrInfoScreen renders custom dropdowns for Resolution/Recording FPS')`.

> The existing screen test suites must continue to pass **unchanged**. If a screen test asserted on `input[type="datetime-local"]` or a native `<select>`, that is a legitimate update (note it in the PR); otherwise no edits.

---

## Phase 10 Tests — Guided-mode integration

**Test file:** `features/demo/ui/inputs/__tests__/guided-integration.test.tsx`
**Setup:** render `DemoExperience` with an injected store (the existing test seam) — guided vs sandbox.

1. `describe('guided mode')` →
   - `it('renders seeded date/time values in the field buttons')` — store seeded → buttons show formatted values.
   - `it('does not open a picker sheet during the guided tour')` — phone is pointer-locked; no `role="dialog"` from a picker appears on chapter enter.

2. `describe('sandbox mode')` →
   - `it('opens a picker sheet when a Date/Time button is clicked')` — interactive; clicking opens the sheet.

> These are heavier integration tests; keep them few and high-value. Lower-level behavior is already covered in Phases 5-8.

---

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| `datetime-parts.ts` (engine) | 90%+ | Pure logic, highest ROI, under the existing coverage gate |
| Input components (`ui/inputs/*`) | 75%+ | User-visible behavior (open/select/confirm/cancel), not pixel styling |
| `_shared` swap + screen smoke | Key paths | Prove the drop-in replacement and no native inputs remain |
| Guided/sandbox integration | Key paths | Director compatibility only |

## Quality Checklist

- [ ] Every implementation phase (1-10) has a matching test block above.
- [ ] `datetime-parts` covers every function with happy path + edge (empty, malformed, month overflow, leap year, ms-strip).
- [ ] Each interactive component tests open, select/confirm, **and** cancel/close-without-change.
- [ ] The clock is always injected (`FIXED_NOW`) — no test reads the real time.
- [ ] No `<select>` or `input[type="datetime-local"]` remains after Phase 9 (asserted).
- [ ] Tests are independent and isolated (no shared mutable state; `vi.fn()` per render).
