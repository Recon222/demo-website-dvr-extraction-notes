# PR #14 Fixes Review — demo picker parity (round 2)

- **PR:** [#14](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/14) — `feat(demo): custom date/time pickers + dropdown (phone-app parity)`
- **Branch:** `feat/demo-picker-parity` → `master`
- **Reviewed:** 2026-06-28 (follow-up to `pr-14-demo-picker-parity-review.md`)
- **Scope since round 1:** the PR grew from 26 → **39 files / +2694 / −62**. Two tracks: (a) the round-1 review fixes (6 commits), and (b) substantial new feature work — a **DVR-retention math engine** (`engine/logic/retention.ts`) + retention UI on `DvrInfoScreen`, the **Dropdown rewritten** to reuse `PickerSheet` as a slide-up bottom sheet, a **scroll-anchor portal** (`PhoneFrame` overlay node + `phone-overlay.ts`), and **shared Resolution/FPS dropdown options**.
- **Method:** six specialised passes (code-review · comment-accuracy · pr-test-analyzer · silent-failure · type-design · simplification), cross-checked against the author's [fix comment](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/14) commit↔finding map. Findings deduped and filtered to **confidence ≥ 80**.
- **Gate verified:** `pnpm test` → ✅ **56 files / 370 passed** (exit 0), matching the fix comment's claim.

## Round-1 fixes — verified

All round-1 findings were re-checked against the working tree, not just the fix comment:

| Round-1 finding | Status | Evidence |
|---|---|---|
| Important #1 — `Dropdown` missing `aria-expanded` | ✅ **Fixed** (`01bde07`) | `Dropdown.tsx:67` has `aria-expanded={open}`; role corrected to `menu`/`menuitemradio` + `aria-haspopup="menu"`, which also retires the broken listbox-keyboard advisory. |
| Important #2 — overlay mis-positions on scroll | ✅ **Fixed** (`953434e`, `c56f954`) | `PickerSheet` now `createPortal`s into a `PhoneOverlayContext` node mounted by `PhoneFrame:165` **outside** the scroll container (`zIndex:40`, `pointerEvents:none` with `auto` children). Scrim/Escape/✕ all still wired. |
| Important #3 — 5 behavioral test gaps | ✅ **Fixed** (`33d9f45`) | Year-wrap (`DateField.test.tsx`), scrim-click (`PickerSheet.test.tsx` via `[data-sheet-scrim]`), TimeField cancel-reseed, Calendar leading-blank (April-2025 → 2 blanks). The 6th (Dropdown bespoke close button) is genuinely **obsolete** — Dropdown delegates closing to `PickerSheet`, whose paths are tested. |
| Advisory — parser range-guard | ✅ **Fixed** (`665d588`) | `parsePartsLoose` now range-checks `mo 1–12 · d 1–31 · h≤23 · mi/s≤59` → `null` + dev-warn. |
| Advisory — `clock.ts` / `mergeTime` / `TimeField` comments | ✅ **Fixed** (`af5a87c`) | `clock.ts` reframed accurately (rule 71007 fires at the boundary but the serialization concern doesn't apply here); the "ms stripped" wording is gone. |
| Advisory — `DateField` redundant per-render parse | ✅ **Fixed** (`af5a87c`) | Lazy `useState` initializer. |
| Advisory — `YMD`/`Hms` naming; Dropdown `{label,value}` | ⏸️ **Deferred / declined** (`119f3fa`, `deferred.md #10`) | Reasonable; logged with an un-defer trigger. |

The math is correct and well-seamed: retention day-diffs are computed in UTC (`Date.UTC`) symmetrically on both sides, so they're timezone/DST-stable; the only clock read is the injected `now()`.

---

## New findings (from the expanded feature work)

### 🔴 Critical
None.

### 🟠 Important

#### 1. Guided tour no longer shows DVR retention — and the showcase PDF drops the row
**Lane:** code-reviewer. **Files:** `engine/director/beats.ts:82-85`, `engine/content/seed.ts:47`, `ui/DemoExperience.tsx:228-239`, `engine/logic/pdf/case-notes.ts:178`.

The `dvrInfo` beat's old `{ kind:'type', field:'form.dvr.totalDvrRetention', value:'35 days' }` step was removed when retention became **derived** from `firstRecordedDate`. But `firstRecordedDate` is never set — by any beat or seed (`grep` confirms it appears only as `firstRecordedDate: ''` in `seed.ts`). So in the guided tour:

- `buildRetentionView` → `{ totalRetention: null, scopes: [] }`, and `DvrInfoScreen` renders the italic empty state *"Pick the first recorded date to calculate total retention…"* — the very feature this PR adds is **invisible in the marquee showcase**.
- The write-back guard (`if (str && …)`) never fires, so `totalDvrRetention` stays `''`, and `case-notes.ts:178` (`row('Total DVR Retention:', dvr.totalDvrRetention)`) **omits the row** from the generated Case Notes PDF. (Round 1's showcase had "35 days" here.)

→ **Fix options:**
- **Minimal:** add a `firstRecordedDate` step to the `dvrInfo` beat (e.g. `'2025-03-08 00:00:00'`). The retention UI then renders, but the day-count won't read "35 days" (it's computed against real `new Date()`, so ~480+ days by mid-2026).
- **Narrative-accurate:** thread a `now` seam into `DemoExperience` (optional `clock?: () => Date`, default `() => new Date()`) and, in guided mode, pin it to the suite's fixed date (`new Date(2025,3,12)`) so a beat date of `2025-03-08` reproduces a sensible window. This also makes the retention bridge testable (see #3).

#### 2. Stale `totalDvrRetention` in the store/PDF when the date is cleared or set to the future
**Lanes:** silent-failure (F1) + type-design (F3) — **convergent**. **File:** `ui/DemoExperience.tsx:235-238`.

```ts
const str = view.totalRetention != null ? `${view.totalRetention} days` : ''
if (str && currentLocation && str !== currentLocation.form.dvr.totalDvrRetention) {
  store.getState().updateField('form.dvr.totalDvrRetention', str)
}
```

When the user enters a valid date (store written `"40 days"`) and then **clears** `firstRecordedDate` — or enters a **future** date (`calculateTotalRetention` returns `null` for both) — `str` becomes `''`, the guard is false, and the stale `"40 days"` is **left in the store**. The retention card correctly disappears from the UI, but `case-notes.ts:178` reads the store field directly, so the **exported PDF still shows the stale value**. (The import path at `import.ts:180` also writes this field directly, bypassing derivation.)

→ **Fix (minimal):** drop `str &&` from the guard so an empty derivation clears the field:
```ts
if (currentLocation && str !== currentLocation.form.dvr.totalDvrRetention) {
  store.getState().updateField('form.dvr.totalDvrRetention', str)
}
```
→ **Fix (structural, recommended):** stop persisting a derived value. Remove `totalDvrRetention` from `DvrInformation` and pass the derived `number | null` to the PDF generator, formatting `"N days"` at that boundary. Eliminates the desync class, the stale-import path, and the string round-trip risk.

#### 3. Test gaps in the new code
**Lane:** pr-test-analyzer.

- **`getRetentionStatus` boundary values untested** (coverage-gated). `retention.test.ts` probes only `0/2/5/30`; the band edges `3, 4, 7, 8` are dark. An off-by-one (`<= 3` → `< 3`) passes today but silently mis-bands a 3-day-left scope from CRITICAL to WARNING — a forensic "is this footage safe?" signal. Add the four edge assertions.
- **The `DemoExperience` retention bridge is entirely untested.** No `DemoExperience*.test.tsx` references `firstRecordedDate` / `totalDvrRetention` / `retentionView`. The write-back feeds the PDF; a regression there ships blank retention silently. Add a sandbox test: set `firstRecordedDate` on `dvrInfo` → assert `form.dvr.totalDvrRetention` matches `/^\d+ days$/`.
- **`DvrInfoScreen` "Already overwritten" (0-day) branch untested** (`DvrInfoScreen.tsx:70`) — the worst-case status with distinct text + badge. Render a 0-day scope and assert.
- **`PickerSheet` portal branch never exercised** — all tests render without a `PhoneOverlayContext`, so only the inline fallback runs; `createPortal` is dark. Add one test wrapping in `PhoneOverlayContext.Provider value={overlayDiv}` and assert the dialog lands in the overlay node.

### 🔵 Advisory

- **Stale comment** — `PickerSheet.tsx:19-23` still says the sheet "renders INSIDE the phone screen (like ModalShell…)", but it now **portals outside** the scroll container. Contradicts the (correct) inline comment at line 113 and the reason the portal exists. Drop the "(like ModalShell)" framing. _(comment-analyzer; all other round-1 comment fixes verified accurate.)_
- **Future-date is indistinguishable from no-date** (`retention.ts:33`) — both return `null`, so a user who fat-fingers a future first-recorded-date gets the same blank panel as "not entered yet," with no signal. Consider a discriminated result (`empty | future | ok`) so the UI can show an inline "date is in the future" hint (and so #2's clear path can fire). _(silent-failure F2.)_
- **Malformed non-empty `scopeStart` renders as OVERWRITTEN** (`retention.ts:38-39,82`) — `buildRetentionView` skips only **empty** starts; a non-empty unparseable value flows to `daysUntilOverwritten → 0 → 'OVERWRITTEN'` with an empty `overwrittenDate`. Guard with `parsePartsLoose` inside `buildRetentionView` and skip on null. Low probability with the pickers; reachable via the AI-import path. _(silent-failure F3.)_
- **Type honesty in the retention shapes** _(type-design):_
  - `RetentionView` lets `{ totalRetention: null, scopes: [non-empty] }` be constructed though the builder never does — tighten to a discriminated union `{ totalRetention: null; scopes: [] } | { totalRetention: number; scopes: ScopeRetention[] }`.
  - `ScopeRetention.status` is fully derivable from `daysUntilOverwritten` (via the exported `getRetentionStatus`) yet stored alongside it — invites desync. Drop `status` and derive it at the one render site.
- **Retention effect double-runs per edit** (`DemoExperience.tsx:228-239`) — writing back into the store changes `currentLocation` (an effect dep), so the effect fires a second time before converging (guard then blocks the re-write). No infinite loop, but `setRetentionView` re-runs on every unrelated location edit. Optional: gate the write behind a ref, or memoize the view. _(code-reviewer advisory.)_
- **Simplifications** _(code-simplifier, all behavior-preserving):_
  - `retention.ts:32,40` — extract `dayDiff(a,b)` for the repeated `Math.floor((utcDay(x)-utcDay(y))/MS_PER_DAY)`.
  - `retention.ts:83-88` — `buildRetentionView` parses + `addDays` **twice per scope** (once via `calculateDaysUntilOverwritten`, once via `calculateOverwrittenDate`); fold into one private `buildScopeEntry` helper.
  - `Dropdown.tsx:15,30,57` — the `required` prop is never forwarded by `SelectField` (its only caller); dead. Remove it (or wire it through if intended).
  - `DvrInfoScreen.tsx:12-13` — `CRITICAL` and `OVERWRITTEN` repeat identical `color/bg/border`; extract a `dangerPill` const within the file.

---

## Suggested order

1. **#1 guided-tour retention** — decide minimal vs. narrative-accurate (the `now`-seam route also unlocks #3's bridge test).
2. **#2 stale `totalDvrRetention`** — one-line guard fix now, or the structural "don't persist derived" fix.
3. **#3 the four test additions** (status edges, bridge, 0-day branch, portal path).
4. Advisory: the `PickerSheet` stale comment + the `retention.ts` `dayDiff`/`buildScopeEntry` dedup are quick, safe wins.

The retention **engine** is correct and the portal/a11y/test fixes from round 1 all landed cleanly — the open items are about how the derived value is wired into the store, the guided showcase, and the exported PDF.
