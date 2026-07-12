# PR #9 Review — interactive demo, Milestone 1 (pure engine logic core)

- **PR:** #9 — `feat(demo): interactive demo — Milestone 1 (pure engine logic core)`
- **Branch:** `feat/interactive-demo` → `master`
- **Reviewed:** 2026-06-27
- **Scope:** 8 commits, 25 files, **+3460 / −0** — adds `lib/demo/**` (pure logic) + planning docs only. No UI, no route, no state store (those are Milestones 2–5).
- **Method:** six specialised review passes (code-review · comment-accuracy · test-quality · silent-failure · type-design · simplification) plus manual verification of every reported finding and all build/test claims.

## Topology & validation

PR #8 is now merged into `master` (`master` tip = `1d8b4fe Merge pull request #8`), so this PR is genuinely **additive** on top of it — the diff is purely the demo engine; no existing files are touched.

| Check | PR claims | Verified |
|---|---|---|
| Vitest | 125 pass / 20 files | ✅ 125 passed (20 files) |
| `tsc --noEmit` | clean | ✅ exit 0 |
| `next build` | green, output unchanged | ✅ green; no `/demo` route; existing site routes identical |
| Coverage gate (`lib/**`) | stmts 97 / branches 84 / fns 98 / lines 98 | plausible; branch gaps noted below |

> Note: one review pass reported "99 tests / 14 files" — **discarded**. A direct `pnpm test` run shows **125 / 20**, and the PR's count is accurate (it is the full post-merge suite, which legitimately includes the merged PR #8 tests).

Findings are deduped across the six passes and filtered to **confidence ≥ 80**.

---

## 🔴 Critical

**None.** This is pure, well-tested logic with **no live callers yet** (the store/UI are Milestones 2+). The findings below are real but latent until something consumes them — which is precisely why they are worth fixing now, before M2 is built on top of this engine.

---

## 🟠 Important

### 1. `ocrImageDataUrl` interpolated into a `src="..."` attribute without escaping
`lib/demo/logic/pdf/time-offset.ts:115` — flagged independently by three passes.

```ts
`<img src="${d.ocrImageDataUrl}" alt="..." />`   // the sole unescaped dynamic field
```

Every other dynamic field in both PDF generators is wrapped in `e()` (`escapeHtml`); this one is not. A value containing `"` breaks out of the attribute (e.g. `onerror=…`) — an HTML-injection vector in a document described as court-admissible and rendered in a browser. In the demo the data URL is controlled, but it is a one-character fix that restores the invariant.
- **Fix:** `src="${e(d.ocrImageDataUrl)}"`. Valid `data:` URLs contain none of `&<>"`, so escaping is a no-op for good input.

### 2. `applyTimeOffset` silently emits `"NaN-NaN-NaN NaN:NaN:NaN"` on invalid/empty input
`lib/demo/logic/time.ts:50-58` (called from `calculateCorrectedTimeRange` :69-70 and `calculateDSTAdjustedTimeRange` :102-103).

`calculateTimeDifference` guards with `if (isNaN(...)) throw`, but `applyTimeOffset` does **not** — and `roundTo5Min` *returns its input unchanged* on an invalid parse, so a bad/empty scope time flows through the offset math into `formatDocDate` (which passes `"NaN-…"` through verbatim) and onto the printed forensic document.
- **Fix:** validate in `applyTimeOffset` (throw on `isNaN`, consistent with `calculateTimeDifference`), or reject in the two callers. The forensic output should fail loud, not print `NaN`.

### 3. Offset-direction logic is only ⅛ tested — the most safety-critical math in the PR
`lib/demo/logic/__tests__/time.test.ts`.

`calculateCorrectedTimeRange`'s `shouldAdd = (isActualTime && isDvrAhead) || (!isActualTime && !isDvrAhead)` has four input quadrants: only **Q1** has pinned arithmetic, **Q4** asserts only the flag, and **Q2 / Q3 have no test at all**. A sign flip in `applyTimeOffset` would ship undetected. Separately, `calculateDSTAdjustedTimeRange`'s test is **vacuous** — `expect([1, -1]).toContain(out.adjustmentApplied)` passes for either direction, so the ±1h direction is entirely unverified.
- **Fix:** add Q2/Q3 (and Q4 arithmetic) with concrete expected strings; replace the `toContain` assertion with a real direction + arithmetic check.

### 4. `SAMPLE_EXTRACTION` timestamps are not in the parseable/canonical format
`lib/demo/logic/import.ts:210-211` — `'11:45 PM on March 8 2025'` / `'1:30 AM on March 9 2025'`.

`mapAiToForm` copies these verbatim into `ImportTimeFrame.startDateTime`, but none of the parser's formats match a natural-language date, and the offset math expects `YYYY-MM-DD HH:MM:SS`. This is the **canonical showcase dataset** Milestone 2 will render and (likely) feed into the time math → `NaN` (see finding #2). The `mapAiToForm` test uses a correctly-formatted fixture, masking it.
- **Fix:** normalize the sample to `2025-03-08 23:45:00` / `2025-03-09 01:30:00`, **or** explicitly document that import time-frames are free-text the visitor normalizes before they become a `ScopeEntry`. Decide the contract now so M2 is not built on an ambiguous one.

---

## 🟡 Advisory

### Correctness / silent fallbacks (latent until M2 wires live data)
- **`getCurrentFormattedTime(0)` returns *now*, not the epoch** — truthiness guard `timestamp ? … : new Date()` (`time.ts:109`). Use `timestamp != null`. Add no-arg + `0` tests (neither branch is currently exercised).
- **`parseAiJson` does `JSON.parse(...) as ExtractedFields` with no shape validation** (`import.ts:141`) — the return type claims a guarantee it cannot provide (note `mapAiToForm` already honestly takes `Partial<ExtractedFields>`). Return `Partial<…>` or a discriminated `{ ok, … }`. Latent (the demo uses `SAMPLE_EXTRACTION`, never a live model).
- **`timePeriodType` → `isActualTime`** (`import.ts:172`): only the exact string `'DVR Time'` yields `false`; any variant (`''`, `'dvr time'`, …) silently becomes actual-time, inverting the offset direction. Normalize case-insensitively. Latent until live AI.
- **DD-MM vs MM-DD ambiguity** (`ocr.ts:107-116`): when both parts ≤ 12, the parser assumes MM-DD. Defensible for a North-American forensic tool (seed data is Peel Police), but worth surfacing an "assumed MM-DD" flag when M2 shows OCR results.
- **Time-only OCR → today's date** (`ocr.ts:131-137`) and **exactly-zero / sub-second `direction`** (`time.ts:37-47`, formats `BEHIND` and passes `isDvrTimeCorrect` for 1–999 ms): document or flag; both are caller-gated today.

### Test gaps (beyond #3)
- Confidence-tier exact boundaries `0.8 / 0.6 / 0.4` (`>=` could regress to `>` undetected).
- `parseAiJson` `JSON.parse` throw path (e.g. `'{"k":[}'` — passes the brace guards, throws in `JSON.parse`).
- `roundTo5Min` `isNaN` passthrough branch (non-empty unparseable string).
- `isInDST` DST-true branch is dead in a UTC runner — pin one run with `TZ=America/New_York`.
- `MODAL_NARRATION` has no completeness check (only `NARRATION` is iterated).

### Type design
- Replace the `0` / `null` sentinels in `screens.ts` with a `Record<ChapterId, number> satisfies …` so adding a screen without registering it is a **compile error** (today it silently returns `0`/`null`).
- Extract a shared `GpsCoordinates` type — two divergent inline GPS shapes (`types/index.ts:89,174`).
- Link `LocationForm.media` to the `MediaKind` union (e.g. a mapped type) so a new kind can't be omitted.
- Mark `isSeed` `readonly` (the "seed and user data never mix" promise is documentary, not structural).

### Simplification (behavior-preserving; ported math intact)
- Extract `parseAsUtc` — four identical `new Date(s.replace(' ','T')+'Z')` sites in `time.ts` (leave `isInDST`'s intentional local-time parse alone).
- Extract `formatUtc` — shared by `applyTimeOffset` and `roundTo5Min`, differing only in the seconds field.
- `resolveDashParts` helper for the duplicated DD-MM/MM-DD block in `ocr.ts`.
- `nowStamp` (`pdf/shared.ts`) duplicates `getCurrentFormattedTime` (note the cross-module import tradeoff if `pdf/` should stay a leaf).

### Comments / copy
- "**six** timestamp formats" in `ocr.ts:4` and the **visitor-facing** `narration.ts:220` is imprecise — there are 8 parser branches / ~5 format families. Reword.
- The "ported **verbatim**" claims (`time.ts`, `ocr.ts`, `import.ts`, `pdf/case-notes.ts`) are unverifiable in this repo — soften to "modelled after" so they cannot silently become false if the app diverges.

---

## ✅ Strengths
- PR-description claims are honest and verified (125/20, tsc clean, build green, output unchanged). The "two prototype bugs fixed" claims hold: nav numbers are position-derived (`chapterNumber`/`wizardNumber` via `indexOf + 1`), `LAUNCHABLE` screens are genuinely absent from `WIZARD_SCREENS`/`TOUR_CHAPTERS`, and seed data is tagged `isSeed`.
- `calculateTimeDifference` is well-tested (ahead / behind / zero / cross-DST invariance / throw). `screens.test.ts` pins the exact registry invariants that caused the prototype's nav-numbering bug. `escapeHtml` is fully covered. `parseAiJson` tests both fenced and prose-wrapped inputs.
- Clean module boundaries: the barrel exports only public symbols (private `pad`/`applyTimeOffset`/`formatMsToHMS` stay internal); `occurrenceNumber` is correctly *not* mapped (the case owns it).

---

## Recommendation
**Approve with changes.** The engine is solid, honestly described, and genuinely additive. Before M2 starts consuming it, address the Important tier — they are cheap and they harden the exact surfaces the UI will sit on:

1. **#1** — escape `ocrImageDataUrl` (one char).
2. **#2** — make `applyTimeOffset` fail loud on invalid input (no `NaN` in court docs).
3. **#3** — close the offset-direction test holes (Q2/Q3 + the vacuous DST assertion); this is the most safety-critical logic in the PR.
4. **#4** — decide the import-timestamp contract and fix `SAMPLE_EXTRACTION` accordingly.

The Advisory items (especially the `parseAiJson` / `timePeriodType` validation and the `Record`-based screen registry) are worth folding in as M2 lands, but none block this merge.
