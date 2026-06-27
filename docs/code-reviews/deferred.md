# Deferred code-review items

The running backup log of deferred review items, so nothing consciously parked is lost.
Each entry needs a real reason to wait **and** a concrete un-defer trigger — this is not a
general TODO dump. Add to it whenever a review finding is deliberately deferred.

---

## 1. `FeatureNav` strip is mounted site-wide (decide placement later)

**Source:** PR #8 review (`feat/feature-nav-strip`).

**What:** `FeatureNav` is mounted in the root layout (`app/layout.tsx`), so the second-row
feature strip renders on **every** route — `/`, `/beta`, `/privacy`, `/features`, and
`/features/[slug]`. On the homepage this duplicates the `FeatureGrid` (the same features
appear once as the strip and once as the grid lower down); on `/beta` and `/privacy` it is
arguably just noise.

**Why deferred:** The overall navigation approach is being reconsidered. No point moving
the strip until that direction is settled. It is not a bug — it works as written and the
placement is intentional for now.

**Options when revisited:**
- Keep it in the root layout → strip stays global.
- Move it to a nested `app/(default)/features/layout.tsx` → strip only on `/features` and
  `/features/[slug]`, and the homepage stops listing features twice.

**Trigger:** When the navigation/IA approach is finalized.

---

## 2. Transient coordination comments in `lib/content/features.ts`

**Source:** PR #8 review (comment-rot risk).

**What:** The catalog file carries in-flight working notes: `navLabel` "(provided by Kris)",
the `STATUS NOTES (per Kris)` block, and the `PLACEHOLDER` / `PROVISIONAL` markers on the
`notes` and `reports` entries.

**Why deferred:** These are live coordination notes for copy that is actively being written.
They are useful right now. Removing them prematurely would strip in-flight context.

**Trigger:** Remove each marker in the same edit that finalizes the copy it refers to (i.e.
when the `notes` `draft` flag is dropped and when `reports` copy is signed off). The `draft`
flag on the type now tracks the unfinished state in code, so these comments are belt-and-
suspenders until then.

---

## 3. `parseAiJson` / `mapAiToForm` give no blank-vs-garbage signal

**Source:** PR #9 fixes-review (M-1, silent-failure lane).

**What:** The AI-import types are now honest (`parseAiJson` returns `Partial`), but at
runtime a malformed payload maps to an all-blank `MappedImport` indistinguishable from a
legitimate "no fields found" result — no recognized-field count, validated flag, or
throw-on-zero-known-fields. Noted inline on `mapAiToForm` (`lib/demo/logic/import.ts`).

**Why deferred:** Latent. The demo never calls a live model — the import chapter resolves
to `SAMPLE_EXTRACTION` — so a garbage payload cannot occur today. Adding a signal now is
speculative API for a path with no caller (YAGNI).

**Trigger:** When a real on-device model is wired into the import chapter (Milestone 2+),
add a recognized-field signal (count / validated flag / throw on zero known fields).

---

## 4. Milestone-2 engine refinements (parked during M1)

**Source:** PR #9 review + fixes-review (type-design · simplification · test lanes).
Justified deferrals — behaviour-preserving hardening with no active defect, best done when
M2 gives these paths live callers.

- **Registry exhaustiveness** — replace the `0`/`null` sentinels in `content/screens.ts`
  with a `Record<ChapterId, number> satisfies …` so a screen added without registering is a
  compile error (today it silently returns `0`/`null`).
- **`LocationForm.media` ↔ `MediaKind`** — link via a mapped type so a new media kind can't
  be silently omitted.
- **Math simplification helpers** — extract `parseAsUtc` / `formatUtc` (shared by
  `applyTimeOffset` + `roundTo5Min`) and `resolveDashParts` (the duplicated DD-MM block);
  reconcile `nowStamp` vs `getCurrentFormattedTime`. Deferred so the safety-critical ported
  math isn't refactored until it has live callers exercising the strengthened quadrant tests.
- **Seed-entity field immutability** — `isSeed` is `readonly`; the rest of the seed entity
  fields remain mutable (Advisory).
- **TZ-pinned DST test** — the signed-shift test proves the direction is *consistently
  applied*, not *correct* for a DST zone. Add a `TZ=America/Toronto` CI step or a fixed-offset
  fixture to cover the DST-true branch.
- **OCR assumptions surfaced in M2 UI** — the dash parser's MM-DD default (H-4) and the
  time-only → today default (M-3) are inline-noted in `lib/demo/logic/ocr.ts`; the M2 OCR
  chapter must let a reviewer confirm/correct both.

**Trigger:** Milestone 2 (when the store / director / UI consume these surfaces).
