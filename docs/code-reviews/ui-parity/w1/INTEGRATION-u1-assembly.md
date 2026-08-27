# W1 wave — U1 card/tier assembly

**Seat:** `dt-integrator` (Opus 5, xhigh) · **Branch:** `feat/uiparity-w1` · **Worktree:** `worktrees/w1-wave`
**Merge commit:** `28e7993` — `origin/uiparity/u1.cards` @ `f72a1b7` into wave head `43e78c0`
**Merge base:** `22f5a00`

Third integration pass on this branch. The incoming branch is U1.2 (card recipe, `74855c1`),
U1.3 (nested/elevated tier, `9c70828`) and its probe fix (`97ca9eb`). The wave head already
carries W0's fix round as merged at `b56b358` — see `INTEGRATION-w0-carry.md` for that pass, and
`../w0/INTEGRATION-r1.md` for the round itself.

**Filed as a separate report rather than a section of `INTEGRATION-w0-carry.md`:** that document is
about carrying one review round into the wave, and this merge is a different event — a package
assembly. Titles that describe their contents are what make these findable in a fix-delta pass.

---

## 1. Conflicts — 2 files, 2 hunks, both unions, zero keep-both

| # | File | Class | Resolution |
|---|------|-------|------------|
| 1 | `features/demo/ui/screens/ExportModal.tsx` | modify/modify, the import line | **union** |
| 2 | `features/demo/ui/screens/export/ExportCaseCard.tsx` | modify/modify, one logical block (two ternaries) | **union** |

`git merge-base` overlap is four paths; two conflicted, two auto-merged (§2.2).

### 1.1 `ExportModal.tsx` — the import both sides added differently

The archetypal hidden-hunk case, and here it was in the markers. W0's F1 added
`import { colors } from '@/features/demo/ui/tokens/palette'` because the progress spinner's arc
became `colors.link` (`:166`); U1.3 added `glassCardNested` to the existing `glass-tokens` import
because the modal's inner panel adopts the nested tier (`:304`). Both consumers are live in the
merged file, so both imports stand, neither doubled:

```ts
import { GLASS, glassBtnPrimary, glassBtnSecondary, glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
```

### 1.2 `ExportCaseCard.tsx` — two edits on different arms of the same two ternaries

This is the shape that makes keep-both tempting and wrong: both seats rewrote the same four lines,
but they were changing **different arms**.

- **W0/F1 (`8f876b9`)** made the lit outline an accent **MARK**: `colors.link` for the border, and
  a hoisted `LIT_GLOW = \`0 4px 12px ${withAlpha(colors.link, 0.35)}\`` for the halo.
  `GLASS.accentFrom` measures **2.44** against this panel where WCAG 1.4.11 wants 3.0; `link`
  measures **9.23**.
- **U1.3** re-pointed the **idle** shadow at the card recipe's `GLASS.shadowCard`, and separately
  (outside the hunk) took A43's `borderRadius: radius.lg`.

Resolved to:

```ts
border: expanded ? `1px solid ${colors.link}` : GLASS.borderSoft,
boxShadow: expanded ? LIT_GLOW : GLASS.shadowCard,
```

Two things worth stating, because a mechanical union would have got them wrong:

1. **U1.3's `withAlpha(GLASS.accentFrom, 0.35)` glow is superseded, not dropped.** U1.3's comment
   defends a property — *"Derived, not transcribed … `withAlpha` makes it follow the stop it is
   supposed to be a glow OF"* — and `LIT_GLOW` is the identical derivation taken off the token F1
   moved the mark to. The property survives; only the source token changed, which is exactly what
   F1 is. Keeping U1.3's line as well would have re-introduced the 2.44 border it replaces.
2. **`GLASS.shadowCard` is byte-identical to the literal it replaces** (`0 4px 8px
   rgba(0,0,0,0.15)`, `glass-tokens.ts:104`), so the idle arm is a pure re-point with no visual
   delta — and probe **N2** below shows it is not a cosmetic one.

U1.2's other two edits to this file (the `radius` import, `borderRadius: radius.lg`) sat outside
the hunk, auto-merged, and are verified present. The `background` line belongs to neither side and
is untouched.

---

## 2. Read past the markers

### 2.1 Nothing silently doubled

- `ExportCaseCard.tsx` imports: `radius, withAlpha` (U1.2 widened the existing scale import) and
  `colors` (F1's addition) — one copy of each. `withAlpha` remains used by `LIT_GLOW`, so dropping
  U1.3's glow line did not orphan an import.
- Both sides' full change sets were diffed against the merge base and confirmed present in the
  merged file, line for line.

### 2.2 The two files both sides touched that did **not** conflict

- **`features/demo/ui/glass-tokens.ts`** — the wave side carries U1.1's derivations + W0's F7/F8;
  the incoming side adds `shadowCard`, `glassCard`'s four-part composition and `glassCardNested`.
  Scanned for the doubling class: **5 exports**, no duplicate key inside any fragment (and `tsc`
  would refuse one), the `GLASS` object intact.
- **`features/demo/ui/__tests__/glass-tokens.test.ts`** — one copy of every helper, including F3's
  `norm()`. U1.2/U1.3's new `BANNED` entries applied on top of it cleanly, which N2 below proves
  is doing real work.

---

## 3. Both sides' pins, re-run against the merged head

Green together, in one run: **44 assertions across 4 files, EXIT 0** —
`screens/__tests__/ExportHub.test.tsx` and `screens/__tests__/ExportModal.reduced-motion.test.tsx`
(F1's two moved pins — the first of which pins *this card's* border) plus
`__tests__/glass-card-recipe.test.tsx` and `__tests__/glass-tokens.test.ts` (U1.2/U1.3's recipe,
nested and elevated pins).

Green is not evidence, so the resolved lines were probed. Fix committed first (`28e7993`); probes
in a throwaway worktree (`worktrees/probe-u1-asm` at `28e7993`, `node_modules` junctioned from
`w1-wave`, junction removed with `cmd /c rmdir` **before** `git worktree remove`;
`w1-wave/node_modules` verified 33 entries before and after). Every mutation asserted its own
pattern matched and that the file changed; both mutated files restored **byte-identically**.

| Probe | Origin | Mutation | Exit | Killer |
|-------|--------|----------|------|--------|
| **P5r** | U1.2 | `GLASS.gradientCard` → the `nestedCard` tier (the card LOCATOR) | **1 · KILLED** | `expected [] to have a length of 2` |
| **P11r** | U1.3 | `glassCardNested.background` → the CARD tier | **1 · KILLED** | `expected 'linear-gradient(180deg, rgba(14, 57, …' to be '… rgba(23, 65, …'` |
| **P13r** | U1.3 | nested stops written in the CARD's order (A33 undone) | **1 · KILLED** | same pin, transposed stops |
| **F1r** | W0 / F1 | this card's lit border reverted to the CTA fill shade | **1 · KILLED** | `expected '1px solid rgb(31, 107, 153)' to contain 'rgb(184, 212, 240)'` |
| **N2** | **NEW (integrator)** | the idle shadow severed back to its own literal | **1 · KILLED** | `import the token instead — GLASS / the fragments from ui/glass-tokens.ts` |

**P11r/P13r/P5r are the three that mattered.** They are the re-probes U1.3 added at `97ca9eb`
after mutation testing caught its first pins as tautologies (`NESTED_GRADIENT` was read off the
very object under test). They still kill at the merged head, so the fix survived assembly.

**F1r is the arm this merge could most easily have lost.** Reverting the border to
`GLASS.accentFrom` — precisely what a naive "U1.3 is newer, take theirs" resolution would have
shipped — reddens `ExportHub.test.tsx`. The union is pinned from both directions.

**N2 is new, and it answers a residual risk raised in the previous report.** `INTEGRATION-w0-carry.md`
§6.1 and U1.1's P4b flagged the *severed derivation* class: replacing a derived value with its own
identical literal is invisible to a byte-exact shape pin. For `GLASS.shadowCard` it is **not**
invisible — U1.2 added the literal to `BANNED`, so the `norm()`-scanned source sweep catches it.
That is the pattern the class wants, applied here.

Not re-run: U1.2/U1.3's P1–P17 and F1's probe H. All live in files this merge did not touch on the
opposing side, all were KILLED on their own branch against identical bytes, and the full suite is
green. Stated rather than silently skipped.

---

## 4. Seams

`grep -rn "SEAM(" features/demo .design-sync` — **19 markers, 18 wired, 1 legitimately waiting.**

The wait is **`SEAM(U6.4b)` at `features/demo/ui/screens/CompletionScreen.tsx`** — the `techGlow`
`boxShadow` that M1(a) removes when U6.4b lands. It needs no ledger row, because it is **pinned,
not merely commented**: `__tests__/glass-card-recipe.test.tsx` carries a matching
`SEAM(U6.4b)` assertion that the techGlow *"is still here"*, so the wait reddens the moment U6.4b
removes it. A seam whose absence has a test is the honest form of waiting.

New this merge and wired: `SEAM(U1.1)`'s consumer list grows to U1.2/U1.3/U1.4 — `glass-tiers.ts`'s
own marker names U1.2/U1.3/U1.4/U2.4/U4.1/U5.1 as the packages that index into it, and three of
those six have now landed.

---

## 5. Gates — cold cache at `28e7993`

`tsconfig.tsbuildinfo`, `.next/`, `node_modules/.vite`, `node_modules/.cache` deleted first. Exit
codes captured directly, never grepped from output.

| Gate | Exit | Result |
|------|------|--------|
| `pnpm exec tsc --noEmit --incremental false` | **0** | — |
| `pnpm test --silent` | **0** | 272 files · **3562 passed \| 10 todo (3572)** |
| `node .design-sync/check-rn-parity.mjs` | **0** | **115/115** anchor rows, 0 DRIFT, 0 PARSE-FAILED |
| `pnpm build` | **0** | **`/demo` First Load 107 kB** ✓ · shared 106 kB |

Counts reconcile with the previous pass (271 files / 3542 / 10 at `b56b358`): U1.2/U1.3 add one
test file and 20 assertions, and no todo moved.

---

## 6. Residual risk

1. **`GLASS.shadowCard` is now spent at two levels** — inside `glassCard`'s composed `boxShadow`
   and directly by `ExportCaseCard`'s idle arm. Both are correct, but a consumer that spreads
   `glassCard` **and** sets `boxShadow` after it silently wipes the A44 inset half, which is the
   same trap `glass-tokens.ts:127-128` documents for `border`/`borderColor`. U1.2's loop pin covers
   the spreading consumers; `ExportCaseCard` does not spread the fragment, so it is out of that
   pin's scope and correct by inspection only.
2. **The accent-as-mark rule now has two enforcement styles in one file.** `ExportCaseCard`'s
   border is pinned behaviourally (F1r kills); `MediaLibrarySheet`'s four F1 sites are still
   unpinned (W0 integration finding I-1, ledger row proposed with trigger U7.2). Unchanged by this
   merge, restated because this is the merge that made `colors.link` load-bearing in a second file.
3. **No schema collision, again.** The two sides shared four files and no type, registry or
   serialized shape; both conflicts were style objects.

## 7. Ledger

**No new deferral rows proposed.** The two standing rows from `../w0/INTEGRATION-r1.md` (A's PR-3 →
trigger U7.2; A's PR-1 → trigger U2.2) are unaffected.

---

*Integrator: `dt-integrator` (Opus 5, xhigh). Gates quoted from a cold cache at `28e7993`.*
