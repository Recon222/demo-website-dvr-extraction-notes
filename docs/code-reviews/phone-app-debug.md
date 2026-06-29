# Phone-app bugs found while building the demo

A running log of defects discovered in the **phone app** (`extraction_case_notes_react_native_expo`)
while porting its logic into this demo. These were ported in faithfully, then a demo code review
caught them — so the demo fix is *ahead* of the source. Port each fix back to the phone app.

---

## 1. `sourceContainsFullDate` — substring false-positive trusts a hallucinated year

**Phone file:** `src/features/import/pdf-import/normalization/year-disambiguation.ts`
(function `sourceContainsFullDate`).
**Found via:** demo PR #16 review (H1 — 3-lane convergence: typescript · silent-failure · pr-test).

**Bug:** the cold-case guard builds candidate date strings — including the **unpadded** forms
`` `${m}/${d}/${y}` `` and `` `${d}/${m}/${y}` `` — and matches them with `sourceText.includes(candidate)`,
with **no boundary check**. So for AI date `2024-01-05`, the candidate `"1/5/2024"` is a substring of
a source containing `"11/5/2024"` (November 5) → the guard reports the source "explicitly states this
date" when it does not → `disambiguateHallucinatedYear` returns `{ confidence:'high',
reason:'ai_year_plausible' }` and **trusts the AI's year, skipping proximity correction, with no
warning.** In a forensic tool that's a silently-wrong date wearing a high-confidence label.

(The sibling `windowContainsYear` already guards correctly with `(?<![#\w/])${year}(?![/\w-])`;
`sourceContainsFullDate` has no equivalent.)

**Repro:** `sourceContainsFullDate("recovered 11/5/2024 footage", 2024, 1, 5)` returns `true`
(should be `false`).

**Fix (applied in the demo):** boundary-guard each candidate with lookarounds — require a
non-digit / non-`/` / non-`-` on both sides — instead of a raw `includes`. See the demo's
`features/demo/engine/logic/year-disambiguation.ts`.

**Status:** fixed in demo (PR #16 fixes). ⬜ Port back to the phone app.

---

## 2. `findYearTokenNear` — only inspects the first occurrence of the date fragment

**Phone file:** `src/features/import/pdf-import/normalization/year-disambiguation.ts`
(function `findYearTokenNear`).
**Found via:** demo PR #16 review (M1 — typescript).

**Bug:** `const idx = sourceText.indexOf(dateFragment)` finds only the **first** occurrence of the
fragment. If a document mentions the date twice — first year-less, then again with the correct year
within ±150 chars — the guard anchors on the first (year-less) occurrence, misses the year, and
proximity wrongly "corrects" an already-correct year.

**Repro:** source `"re Feb 5 … [200 chars] … incident on Feb 5, 2024"` with AI date `2024-02-05`:
the guard misses the `2024` near the second mention.

**Fix (applied in the demo):** scan **all** occurrences of the fragment (loop `indexOf` from the
last hit) and return `true` if any ±150-char window contains the year.

**Status:** fixed in demo (PR #16 fixes). ⬜ Port back to the phone app.
