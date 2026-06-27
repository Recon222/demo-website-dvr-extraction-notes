# Deferred code-review items

Findings from code review that are intentionally **not** being actioned yet, with the
reason and the trigger that should bring them back. Keep this list short — an item lands
here only when there is a real reason to wait, not as a general backlog.

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
