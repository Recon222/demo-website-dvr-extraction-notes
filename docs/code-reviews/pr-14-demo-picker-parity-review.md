# PR #14 Review — demo picker parity (custom date/time pickers + dropdown)

- **PR:** [#14](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/14) — `feat(demo): custom date/time pickers + dropdown (phone-app parity)`
- **Branch:** `feat/demo-picker-parity` → `master`
- **Reviewed:** 2026-06-28
- **Scope:** 26 files, **+2396 / −48** — a new self-contained `features/demo/ui/inputs/` module (10 components/helpers + co-located tests), one pure engine helper (`engine/logic/datetime-parts.ts`), a `sheetUp` keyframe in `demo.css`, and the swap of `SelectField`/`DateTimeField` in `ui/screens/_shared.tsx` from native `<select>`/`datetime-local` to the custom components. Presentational-only: no store, screen, director, or config changes; no new dependencies.
- **Method:** six specialised review passes (code-review · comment-accuracy · pr-test-analyzer · silent-failure · type-design · simplification) plus manual verification of the headline findings against the source. Findings deduped across passes and filtered to **confidence ≥ 80**.

## Topology & validation

The change is additive behind the two shared `_shared.tsx` helpers; the `"YYYY-MM-DD HH:MM:SS"` value contract and every call-site are unchanged.

| Gate | PR claims | Verified |
|---|---|---|
| `pnpm test` | 55 files / **353** passing (was 46 / 284; +69) | ✅ **55 files / 353 passed** (exit 0, 9.5s) |
| `pnpm test:coverage` | all layers ≥80% (`datetime-parts` 100/91/100/100) | ◻️ not re-run |
| `pnpm build` / `tsc --noEmit` | green; 19 routes incl. `/demo` | ◻️ not re-run |

The findings below are **code-level**, verified by reading the source on the PR branch (the working tree is `feat/demo-picker-parity`).

---

## Verdict

A solid, well-tested presentational refactor. The value contract is genuinely preserved, the determinism rules are respected, and the store-bridge architecture is honored. **No critical / data-loss bug is reachable in the demo's closed value world.** Two functional issues are worth fixing before merge (one accessibility, one overlay positioning), plus a handful of meaningful behavioral test gaps. Everything else is advisory.

**Verified-correct (not just asserted):**

- The `clock.now` seam is read **only** inside event handlers / on picker-open — never at module or render scope (`DateField.handleOpen`, `TimeField.handleOpen`).
- No `Date.now()` / `Math.random()` anywhere in the new code; the two `new Date(...)` calls (`Calendar.tsx:40`, `clock.ts:10`) use explicit args or live behind the seam (deterministic / SSR-safe).
- Every `ui/` file carries `'use client'`; **no input imports the store** (store-bridge rule intact).
- `TimeWheel`'s `lastEmitted` ref correctly prevents a programmatic `scrollTop` write from being re-read as a user scroll — traced through mount, prop-update, and rapid-scroll; no feedback loop.
- `daysInMonth` leap-year math (incl. 1900 → 28, 2000 → 29) and `clampDay` are correct.
- The canonical `"YYYY-MM-DD HH:MM:SS"` round-trip holds end-to-end: seconds always emitted, milliseconds never present; date edits preserve time and vice-versa (`mergeDate`/`mergeTime`, and verified through the composed `DateTimeField`).
- The two assertions dropped from `shared.test.tsx` are correctly retired — they tested native `datetime-local` quirks (`:00` seconds appending, clear-to-empty) that no longer exist.

---

## 🔴 Critical

**None reachable.** The silent-replacement and out-of-range paths in the Advisory section are gated behind already-malformed stored data, which the demo never produces — so they are defensive hardening, not live bugs.

---

## 🟠 Important

### 1. `Dropdown` trigger declares `aria-haspopup` but omits `aria-expanded`
**Lane:** code-reviewer. **File:** `ui/inputs/Dropdown.tsx:70-73`.

The selector button sets `aria-haspopup="listbox"` (declaring it controls a popup) but never exposes `aria-expanded`. A screen-reader user focusing the button cannot tell whether the list is open or closed — the ARIA combobox/listbox pattern requires the controlling element to carry expanded state.

→ **Fix:** add `aria-expanded={open}` to the trigger button. One line.

### 2. Picker overlays mis-position when the wizard screen is scrolled
**Lane:** code-reviewer. **Files:** `ui/inputs/PickerSheet.tsx:33-59`, `ui/inputs/Dropdown.tsx:118-129`.

The pickers render as descendants of `data-phone-screen`, which is **both** the positioned ancestor and the scroll container (`position:absolute; inset:0; overflowY:auto` — verified in `PhoneFrame.tsx:128-143`). Wizard screens such as `RequestedScopeScreen` use `minHeight:786` (= the visible screen height) and grow past one screenful when the visitor adds rows. Once `scrollTop > 0`:

- the `PickerSheet` scrim (`position:absolute; inset:0`) no longer covers the visible bottom of the phone;
- the bottom-sheet (`bottom:0`) floats mid-screen instead of anchoring to the bottom;
- the `Dropdown` centered modal drifts toward the top in proportion to the scroll offset.

**Repro (sandbox mode):** add a second scope/arrival/extracted-scope row, scroll down, then tap "Set date" / "Set time" or open a dropdown. The picker still functions, but is visibly detached.

This is the first time these overlays are used inside a list-growth screen — the pre-existing `ModalShell` is only triggered from non-scrolling screens, so it never hit this.

→ **Fix:** render the overlay as a sibling of `data-phone-screen` (inside the non-scrolling phone-frame container) rather than a descendant of the scroll area.

### 3. Behavioral test gaps — real branches that would survive a regression
**Lane:** pr-test-analyzer. The suite is genuinely behavioral and the clock seam is stubbed consistently, but these paths are untested:

- **`DateField` month-wrap year boundary** (`DateField.tsx:41-42`) — the `y-1` / `y+1` branches never execute; all tests sit on March 2025. Swapping `+`/`-` would still pass green.
- **Scrim-click dismissal** for both `PickerSheet` and `Dropdown` — the primary mobile dismiss gesture. Existing tests click *inside* the dialog (exercising `stopPropagation`), never the scrim's own `onClick`.
- **`Dropdown` "Close picker" header button** — a distinct close path from Escape, untested.
- **`TimeField` cancel-then-reopen discards the edit** — the invariant that `handleOpen` re-seeds `temp` from the stored value is unverified; a refactor could silently break it while the existing "Cancel doesn't call onChange" test stays green.
- **`Calendar` leading-blank offset** (`Calendar.tsx:40-41`) — an off-by-one in `viewMonth-1` would misalign the whole grid and every current test (which counts only `[data-cell="day"]` buttons) would still pass.

→ **Fix:** add the five targeted tests above (each is a few lines; suggestions in the PR thread).

---

## 🔵 Advisory

### Robustness — out-of-range / malformed values _(convergent: flagged independently by the silent-failure and type-design passes)_

- `parsePartsLoose` validates structure (`\d{2}`) but not ranges, so `"2024-13-00 …"` parses to `{ mo:13, d:0 }`. `daysInMonth` then hits `table[mo-1] ?? 31` and silently returns 31; `Calendar.tsx:56` renders `MONTHS[-1]` → a blank month header with a misaligned grid, no error.
- `mergeDate`/`mergeTime` use `parsePartsLoose(value) ?? nowParts(now)` (`datetime-parts.ts:105,118`). The JSDoc says `now()` seeds "when empty," but a **non-empty malformed** value also falls through and silently replaces the untouched half with the wall clock.

Both share one root cause (the parser accepts/returns silently). **Practically unreachable today** — the store only ever holds canonical strings — so this is hardening, not a live bug.

→ **Fix:** range-check after the regex in `parsePartsLoose` (return `null` + the existing dev-warn) for `mo ∉ 1..12`, `d ∉ 1..31`, `h > 23`, `mi/s > 59`. This also closes the silent-replacement path.

### Comment accuracy
**Lane:** comment-analyzer.

- `ui/inputs/clock.ts:7` — "Next.js disallows non-serializable function props on 'use client' components" is **factually wrong**: that serialization restriction only applies across the **server → client** boundary, and the entire call chain here is client-side (every component from the screens down is `'use client'`). The real rationale (prop-drilling avoidance + test-spyability) is already stated in the next sentence; drop the incorrect parenthetical. _(Note: the PR description repeats this same claim as "rule 71007" — worth correcting there too.)_
- `engine/logic/datetime-parts.ts:109-110` (`mergeTime` JSDoc) and `ui/inputs/TimeField.tsx:19` — "milliseconds dropped / ms stripped" implies `mergeTime` performs a strip step, but its `time` arg is `{ h, mi, s }` with no ms present; the drop actually happens upstream in `nowParts` (which never reads `getMilliseconds()`). Reword to avoid implying an active strip.

### Type design
**Lane:** type-design-analyzer.

- Export named `YMD = { y, mo, d }` and `Hms = { h, mi, s }` from `datetime-parts.ts` and use them in `CalendarProps` (`selected`/`today`), `DateField`'s `useState`, `TimeWheelProps` (`value`/`onChange`), and the `mergeDate`/`mergeTime` signatures. These shapes are written inline 4× and 3× across the engine/ui boundary and are compatible only by structural accident; `TimeField` already defines a local (unexported) `Hms`. Naming them makes a field rename surface as a type error at every call site.
- `Dropdown` `options: string[]` (label === value) keeps that invariant only in a comment — low priority, but if a label ever needs to differ from its stored value it's a breaking signature change. Consider `Array<{ label: string; value: string }>` now while all callers pass trivial `string[]`.

### Simplification — all behavior-preserving
**Lane:** code-simplifier.

- `DateField.tsx:24` — `const initial = parsePartsLoose(value)` is recomputed every render but consumed only by the `useState` initializer (and `handleOpen` overwrites `view` before `Calendar` ever renders). Move to a lazy initializer and delete the redundant parse.
- Extract the three pure duplicates shared by `PickerSheet` / `Dropdown`: the `dot` style const, the scrim `<div>`, and the Escape-key `useEffect` (→ a `useEscapeKey(fn, enabled)` hook).
- `_shared.tsx:124,152` inline the literal gradient `linear-gradient(180deg,#35A0D6,#2580AD)` while `DateField`/`TimeField` use `${T.accentFrom},${T.accentTo}` for the identical value — import `T` for consistency.

### Accessibility — lower priority
**Lane:** code-reviewer.

- `Dropdown` commits to `role="listbox"` / `role="option"` but implements no arrow-key navigation or `aria-activedescendant`, so a keyboard user who focuses the list can't move between or select options (Escape works; selection does not). Either implement the listbox keyboard pattern, or switch to `role="menu"` / `role="menuitem"`, which doesn't mandate managed focus and matches the click-only behavior actually implemented.

---

## Suggested order

1. `aria-expanded` one-liner (Important #1)
2. Overlay-positioning fix (Important #2)
3. The five behavioral tests (Important #3)
4. Parser range-guard (Advisory — closes both robustness paths)
5. Comment corrections (clock.ts + the two "ms stripped" docstrings, and the PR body)

The type-naming (`YMD`/`Hms`) and the simplifications are safe cleanups to fold in whenever convenient.
