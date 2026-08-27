# W2 — U2 assembly

**Seat:** `dt-integrator` (Opus 5, xhigh) · **Branch:** `feat/uiparity-u2` · **Worktree:** `worktrees/u2-phase`
**Merge commit:** `e11d3a4` — `origin/uiparity/u2.buttons` @ `957a74b` into phase head `b9124b8`
**Merge base:** `28e7993`

Phase head carried U2.3 (switches, `402c991`) and U2.1 (`fieldInput`). The incoming branch is
U2.2 — `controls/button-recipe.ts` as a seam, `glassBtnPrimary`/`glassBtnSecondary` deleted,
~45 adoptions, and the guard's closing act anchoring the LIGHT CTA stops (117 rows).

Dependencies were not installed in this worktree; `pnpm install --prefer-offline` first, exit 0,
13.9 s off a warm store.

---

## 1. The conflict — one file, one hunk, and the resolution is neither side

`features/demo/ui/screens/TimeOffsetScreen.tsx`, the import block. That is the entire textual
conflict — U2.3's `Toggle` swap and U2.2's three button adoptions live in different parts of the
body and auto-merged. But the import block is where all three of this merge's decisions land, and
**taking either side verbatim ships a defect**.

```ts
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { GLASS, glassCard } from '@/features/demo/ui/glass-tokens'
```

| Symbol | Decision | Why |
|--------|----------|-----|
| `buttonStyle` | **kept** (from U2.2) | Three live consumers: `:82` *Use Current Time* and `:90` *Capture from DVR* as `variant: 'outline'`, `:83` *Calculate* as `buttonStyle({ disabled: !canCalc })`. |
| `glassBtnPrimary` | **dropped** | Taking HEAD's line verbatim **would not compile** — U2.2 deleted the export, and the merged body has no consumer. |
| `colors` | **dropped** | The one a mechanical *"take theirs"* gets wrong. |

**On `colors`.** U2.2 never edited that line — `git diff base..MERGE_HEAD` on this file shows two
import changes and three button changes, and `colors` is in none of them. It was untouched
**context** pulled into the hunk because HEAD deleted it on the adjacent line. Its only consumer
was the hand-rolled DST switch's `colors.border`, which U2.3 deleted in favour of `Toggle`. So the
import is dead in the merged tree even though it is live on both parents — the classic
merge-created orphan, and one no gate in this phase's set would have caught (§4, probe N3).

Both sides' work is intact in the body: U2.3's `<Toggle label="DVR Applies DST" …>` (the
`role="switch"` track, its `switchKeyDown` handler and the row's own `padding: '12px 4px'` /
`marginTop: 6` all gone with it), and U2.2's three adoptions — including the OCR button's
`stroke="currentColor"` glyph and unstyled `<span>`, which inherit from the button rather than
restating `colors.link` the way the phone must.

`switchKeyDown` is still exported from `_shared.tsx` and still used by `Toggle` itself at `:576`,
so removing it from *this file's* import is correct rather than lossy.

---

## 2. Read past the markers

- **`features/demo/ui/screens/_shared.tsx`** — the other file both sides touched (U2.2 −13/+9;
  U2.1+U2.3 −31/+94), auto-merged. Checked for the doubling class: 11 imports, no duplicate
  export, one `Toggle` (`:498`), one `fieldInputStyle` consumer (`:257`).
- **Repo-wide `glassBtnPrimary` / `glassBtnSecondary`**: five hits, every one prose — two
  docblocks in `glass-tokens.ts`, one in `button-recipe.ts`, one comment in `RowActions.tsx`, one
  history note in `glass-tokens.test.ts`. **Zero live references.** The deletion is complete.
- One stale doc line found, **not** merge-caused, so reported rather than silently fixed:
  `features/demo/ui/glass-tokens.ts:23` still lists *"`glassCard` / `glassCardNested` /
  `glassBtnPrimary` / `glassBtnSecondary` are spreadable style fragments"* in its Conventions
  block, while `:182` correctly records that the two button fragments *"LIVED HERE until U2.2"*.
  The file contradicts itself twelve lines apart. It is U2.2's own file and U2.2's own miss — the
  phase side never opened it — so it belongs to that seat's fix-delta lane, not to this merge.

---

## 3. Gates — cold cache at `e11d3a4`

`tsconfig.tsbuildinfo`, `.next/`, `node_modules/.vite`, `node_modules/.cache` deleted first. Exit
codes captured directly, never grepped from output.

| Gate | Exit | Result |
|------|------|--------|
| `pnpm exec tsc --noEmit --incremental false` | **0** | — |
| `pnpm test --silent` | **0** | 277 files · **3620 passed \| 8 todo (3628)** |
| `node .design-sync/check-rn-parity.mjs` | **0** | **117/117** — 32 palette + 24 tier keys × both halves, **+ 4 CTA gradient stops (both halves now)** + touchFloor |
| `pnpm build` | **0** | **`/demo` First Load 107 kB** ✓ |
| Both sides' pin suites together | **0** | 52 files · **748 passed** — `button-recipe`, `field-input-recipe`, and the whole `screens/__tests__` directory (`Toggle`, `one-switch-renderer`, `shared`) |

The guard is 117, not 115: U2.2's closing act anchors the **light** CTA pair, which had no
web-side token until this package created it (§6.6 gate 1 satisfied at the moment of anchoring).

### Seams — 24 markers, all wired

Three are new this wave, each with live consumers:
`SEAM(U2.1)` `tokens/field-input.ts` · `SEAM(U2.2)` `controls/button-recipe.ts` ·
`SEAM(U2.3)` the one switch renderer in `screens/_shared.tsx`.

---

## 4. Probes — 6 run, 5 KILLED, 1 SURVIVED (a real gap)

Fix committed first (`e11d3a4`); probes in `worktrees/probe-u2-asm` at `e11d3a4`, `node_modules`
junctioned from `u2-phase`, junction removed with `cmd /c rmdir` **before** `git worktree remove`
(33 entries before and after). Every mutation asserted its own pattern matched and that the file
changed; all three mutated files restored **byte-identically**.

| Probe | Origin | Mutation | Exit | Evidence |
|-------|--------|----------|------|----------|
| **U2.2-P2b** | U2.2 | the §4.3 duplicate-key escape hatch re-introduced into the recipe (`borderColor` before the longhands) | **1 · KILLED** | `3 failed` — the object-shape pin `to deeply equal {…(19)}` **and** `primary/false: expected […] to not include 'borderColor'` |
| **U2.2-out** | U2.2 | `TimeOffsetScreen:82` abandons `buttonStyle({variant:'outline'})` for a literal border | **0 · SURVIVED** | see §5 |
| **U2.3-coll** | U2.3 | a hand-rolled `role="switch"` re-inlined in `TimeOffsetScreen` | **1 · KILLED** | `3 failed` — the collapse scan (`` import `Toggle` from screens/_shared instead ``) **and** the BANNED literal scan |
| **U2.3-kbd** | U2.3 | `Toggle` loses `onKeyDown: switchKeyDown(activate)` | **1 · KILLED** | `expected "vi.fn()" to be called 2 times, but got 0` |
| **U2.1-copy** | U2.1 | `fieldInputStyle(…)` severed at its one consumer, replaced by literals | **1 · KILLED** | `8 failed` — `expected '10px' to be '8px'`, `expected '' to be 'none'` |
| **N3** | **NEW (integrator)** | the dead `colors` import restored | **0 · SURVIVED** | vitest 0, **tsc 0** — see §5 |

---

## 5. Findings

### I-4 — [MEDIUM] U2.2's ~45 adoptions have no adoption scan; the recipe is pinned, the call sites are not

**U2.2-out survived**, and it is not a mis-specified probe. Reverting `TimeOffsetScreen:82` from
`buttonStyle({ variant: 'outline' })` to
`{ padding: 11, borderRadius: 10, border: '1px solid #2B8CC1', background: 'transparent', color: '#4BA3D4' }`
— exactly the literal U2.2 deleted — leaves the whole suite green, **754 passed**.

Two independent reasons, and both are load-bearing:

1. **The BANNED literal scan deliberately exempts those two hexes.**
   `glass-tokens.test.ts:85-86` states it in as many words: *"The unchanged tokens (`#2B8CC1` 26
   files, `#f0f4f8` 50, `#7a9fc4` 44, … `#4BA3D4` 20) are deliberately NOT here: banning [them]
   would be too noisy."* That decision is defensible on its own terms and predates U2.2 — but it
   means the outline variant's two colours are precisely the ones the scan cannot see.
2. **Nothing renders this screen's buttons.** `screens/__tests__/time-offset-advisories.test.tsx`
   exists and contains **zero** `style` / `toHaveStyle` assertions; no other test mounts
   `TimeOffsetScreen`.

The asymmetry is the finding. **Two of the three U2 seams guard their adoptions with a source
scan** — U2.3's `one-switch-renderer.test.ts` (*"import `Toggle` from screens/_shared instead"*,
which killed U2.3-coll) and U2.1's copy scan. **The button recipe, which has by far the most
adoptions (~45), has neither a scan nor per-site render pins.** Its own internals are pinned
thoroughly (P1–P5, P2b) — what is unguarded is the *adoption*, and an adoption that silently
regresses is exactly what a ~45-site sweep exists to prevent.

The cheap fix is the one U2.3 already wrote: a source scan asserting that no file under
`screens/` sets `border` + `background: 'transparent'` on a `<button>` without spreading
`buttonStyle`. **Proposed ledger row in §6.**

### I-5 — [LOW] A merge-orphaned import is invisible to this phase's entire gate set

**N3 survived**: restoring the dead `import { colors }` leaves vitest at 0 **and tsc at 0** — this
repo's `tsconfig.json` sets no `noUnusedLocals`.

I also ran `next lint` on the file and it exited 1, but **that result is inconclusive and must not
be quoted as coverage**: ESLint is not configured in this worktree, so `next lint` drops into its
interactive *"How would you like to configure ESLint?"* setup prompt and exits 1 on the
**unmutated** file too. Verified against the clean baseline before drawing any conclusion.

So the dead import was caught by reading the diff, and by nothing else. Not worth a rule of its
own — but it is the reason §1 spends three paragraphs on one deleted line, and it is worth the
orchestrator knowing that `pnpm lint` is absent from the phase gate set *and* currently
unrunnable here.

### I-6 — [INFO] `glass-tokens.ts` contradicts itself about the deleted fragments

`:23` vs `:182`, see §2. U2.2's file, U2.2's miss, flagged for that seat's fix-delta lane.

---

## 6. Proposed deferral-ledger row — for `dt-review-aggregator` to decide and write

Per the hazard playbook I do not write `docs/code-reviews/deferred.md`; I propose.

**Proposed §N — the button recipe's ~45 adoptions have no adoption scan (integration I-4)**
- **Source:** W2 integration `e11d3a4`, probe **U2.2-out** (SURVIVED, 754 passed);
  `glass-tokens.test.ts:85-86`; `screens/__tests__/time-offset-advisories.test.tsx` (0 style
  assertions).
- **What:** a consumer that abandons `buttonStyle` and re-inlines the outline variant's literals
  is invisible to every gate. The two hexes involved (`#2B8CC1`, `#4BA3D4`) are deliberately
  exempt from the BANNED scan as too common, and no test renders the affected buttons. U2.3 and
  U2.1 both ship adoption scans for their seams; U2.2, with the most adoptions, does not.
- **Why deferred:** the scan wants a predicate over `<button>` style objects rather than a literal
  needle, which is a different shape from the three existing scans, and U2.4 opens the same file
  set. Writing it now against `buttonStyle`'s current five variants risks rewriting it one package
  later.
- **Trigger:** **U2.4**, the next package to touch the button call sites — or, sooner, the first
  review finding that reports a button drifting off the recipe.

---

## 7. Residual risk for the reviewers

1. **I-4 is the one to aim at.** The recipe's internals are among the best-pinned code in this
   wave; its adoptions are among the least.
2. **`TimeOffsetScreen` is now a three-package file** (U2.1's `DateTimeField`, U2.2's buttons,
   U2.3's `Toggle`) with no render test of its own. Any further packaging of it should bring one.
3. **No schema collision.** The two sides shared two files and no type, registry or serialized
   shape; the whole conflict was an import list.

---

*Integrator: `dt-integrator` (Opus 5, xhigh). Gates quoted from a cold cache at `e11d3a4`.*
