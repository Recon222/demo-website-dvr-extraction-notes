# W1 wave — carrying W0's fix round in

**Seat:** `dt-integrator` (Opus 5, xhigh) · **Branch:** `feat/uiparity-w1` · **Worktree:** `worktrees/w1-wave`
**Merge commit:** `b56b358` — `origin/feat/uiparity-u0` @ `15e5a6f` into wave head `e3bc01c`
**Merge base:** `7099e54` (the W0 gated head)

`e3bc01c` = W0 gated head + U1.1 (glass tiers) + U1.4 (header tier). The incoming branch is W0
fix round 1 (F1–F10) as integrated at `5e2768e`. Second integration pass of the same round; the
first is `docs/code-reviews/ui-parity/w0/INTEGRATION-r1.md`.

---

## 1. Conflicts — 3 files, 5 hunks

| # | File | Hunks | Class | Resolution |
|---|------|-------|-------|------------|
| 1 | `.design-sync/check-rn-parity.mjs` | 2 | modify/modify, both inside one docblock | **union** |
| 2 | `features/demo/ui/inputs/__tests__/rn-token-parity.test.ts` | 2 | modify/modify, same logical block | **union** |
| 3 | `features/demo/ui/glass-tokens.ts` | 1 | modify/modify, same line | **winner (U1.1)** |

All three are the predicted class: two seats widening the same table from two directions.
**Zero keep-both.**

### 1.1 `.design-sync/check-rn-parity.mjs` — union, and the body had already unioned itself

U1.1 added `webTierScope` and 48 tier rows on top of a 33-row table. W0's F2 (`4c2a4fa`)
independently re-derived the palette side from 15 keys to **all 32**, replaced the hand-typed
`anchors.length` with a derived expression, and pinned MEMBERSHIP from the test. W0's F4
(`4f834f9`) comment-stripped `region()` and made a missed `before` throw instead of widening the
slice to EOF.

The **executable body auto-merged into a correct union** — the palette loop (F2's 32 keys × 2),
U1.1's tier loop (24 keys × 2, through `rnTierScope`/`webTierScope`), the two CTA stops and
`touchFloor` — and `anchors.length` was already derived. Both conflict markers landed in
`PALETTE_KEYS`' docblock:

- **hunk 1** — kept U1.1's whole `webTierScope` export **and** took F2's framing line
  (*"EVERY key in the demo's palette, anchored in both scheme halves"*), which is what the list
  now is.
- **hunk 2** — F2's `REVIEW W0/F2` paragraph wins outright. U1.1's side was an edit to the
  **pre-F2 15-key stage list** (`U0.4 … 15 palette keys … -> ~44 keys at the end`), a list F2 had
  already deleted and replaced with the corrected schedule sitting directly below the conflict.
  Keeping it would have left the file stating two different key counts four lines apart.

**Result: 115 anchor rows / 56 keys** — 32 palette + 24 tier, each in both halves, + the 2 dark
CTA gradient stops + `touchFloor`. Guard exit 0, all 115 `OK`.

> The brief said *"115 rows / 59 keys"*. 115 is right; **59 is the END-STATE key count** from F2's
> corrected schedule (`+successLight`/`+warningLight` at U3.1, `+gridSubtle` at U8.2). Today's
> table is **56 keys**, and the schedule block now says so.

The count is **derived, never typed**: `anchors.length` comes from the two key lists, and the
success line composes its own description from `PALETTE_KEYS.length` and
`TIER_KEYS.length * TIER_PARTS.length`.

### 1.2 `rn-token-parity.test.ts` — union, and one hand-typed number killed on both sides

**hunk 1.** U1.1 had `expect(PALETTE_KEYS.length).toBe(15)` and `expect(anchors.length).toBe(81)`;
F2 had the membership pin plus a derived cardinality. F2's side wins the assertion, but its
reasoning extends to U1.1's number too:

> F2's own PROBE H evidence: `PALETTE_KEYS.length === 15` **SURVIVED** swapping `'link'` for
> `'card'` — every count and every loop stayed green because they all iterate the list itself.

`.toBe(81)` is the same defect with a bigger number, so it is gone as well. What stands:

```ts
expect([...PALETTE_KEYS].sort(), 'the guard must anchor exactly the palette tokens').toEqual(
  Object.keys(palette.dark).sort(),
)
expect(
  anchors.length,
  'every palette key AND every tier key in both halves, + 2 gradient stops + touchFloor',
).toBe(PALETTE_KEYS.length * 2 + TIER_ANCHOR_KEYS.length * 2 + 3)
```

= 32·2 + 24·2 + 3 = **115**, with no literal to edit. U1.1's two new `it()` blocks (the 24-tier
both-halves pin and the web three-level-scope pin) are kept **whole** — they were only inside the
marker because the merge swallowed the enclosing brace.

**hunk 2.** U1.1 swept `[...PALETTE_KEYS, ...TIER_ANCHOR_KEYS]` asserting light ≠ dark; F2 added
`SCHEME_INVARIANT = new Set(['onPrimary', 'onError'])` and filtered. Unioned to the sweep over
both lists **with** the named exclusion — and the two have to meet, because it is precisely F2's
widening to 32 keys that first brought `onPrimary`/`onError` into a sweep U1.1 wrote against 15.
None of U1.1's 24 tier keys is scheme-invariant, so none is excluded. **54 keys swept** (32+24−2).

### 1.3 `features/demo/ui/glass-tokens.ts` — winner, U1.1

The one line where the two rounds gave opposite instructions:

- W0/F8 (`824df2a`) rewrote the comment to say *"hand-written for one more wave: plan U1.1
  DERIVES this token … **Do not hand-derive it here in the meantime**"* and kept the literal.
- U1.1 **is** that package, and it landed: ``borderSoft: `1px solid ${tier.card.border}` ``.

F8's comment is obsolete **by its own terms**, so U1.1's derivation stands and F8's text is
dropped rather than merged. F1's glow hoist and F7's
`ACCENT_FROM = '#1F6B99' satisfies typeof colors.primaryDark` sat outside the hunk, auto-merged,
and are both verified present at `glass-tokens.ts:48`.

**This also resolves refutation R-1 from the W0 integration report.** There I declined to write
A's PR-2 relation pin (`GLASS.borderSoft === '1px solid ' + withAlpha(colors.border, 0.5)`) on the
grounds that U1.1 derives the token from `GLASS_TIER.dark.card`, not from `colors.border`, so the
pin would encode a coincidence. The merged tree confirms it: the derivation is `tier.card.border`,
and U1.1 shipped its own derivation pin (*"keeps the four legacy composites DERIVED from
GLASS_TIER"*) instead. **No ledger row is owed for PR-2 — U1.1 closed it.**

---

## 2. Read past the markers

### 2.1 Prose the auto-merge left false — five repairs, all in `check-rn-parity.mjs`

Every one was true on its own branch and made false **by this merge**. A text merge cannot see
any of them.

| # | Was | Now |
|---|-----|-----|
| 1 | *"the rule still binds … the six glass tiers (U1.1, +24 keys) … **stay out until their package creates them**"* | U1.1 created them; the sentence now names only U3.1's and U8.2's keys and records that the tiers landed. |
| 2 | The SCHEDULE's `U1.1  +48 rows` row, future tense, no current total | `U1.1 (LANDED)` + `-> 115 rows / 56 keys HERE, which is what this table produces today` |
| 3 | *"this table is where it earns its keep — **67 rows**"* (hand-typed) | 115 rows |
| 4 | *"`T` only carries 8 of **this stage's 15 keys**"* | *"8 of the 32"* — a pre-existing F2 miss carried **identically on both sides** (verified with `git show :2:` / `:3:`), so no conflict flagged it; now doubly stale, so fixed here. |
| 5 | The success line said `${PALETTE_KEYS.length} palette keys x both halves, + …` | Names both key groups, both derived. The 48 tier rows were **invisible in the one sentence a human reads** — the guard printed `115` and then explained 67 of them. |

### 2.2 The two other files both sides touched — auto-merged, inspected anyway

`git merge-base` overlap is five paths; three conflicted, two did not.

- **`features/demo/ui/__tests__/glass-tokens.test.ts`** — U1.1 rewrote `BANNED`; F3 added `norm()`
  and re-pointed the scan through it. Checked for the classic doubling: **one** `norm` (`:45`),
  **one** `BANNED` (`:82`), one scan loop. F3's change applied cleanly on top of U1.1's rewritten
  entries, and F3's own comment had already anticipated U1.1 (*"U1.1's 24 tier values are all
  spaced rgba transcribed from `Colors.ts`"*).
- **`features/demo/ui/__tests__/palette-contrast.test.ts`** — see §3; this is the interesting one.

---

## 3. The join this merge creates — and it holds

The W0 integration report flagged that `flatten()` was new code neither seat had run. This merge
puts that reconciled function under **U1.1's real tier ground stacks for the first time**, which
is exactly the event the U0.5 seat wrote F6 clause (2) for:

> *"the invariant is asserted here instead of left in prose … and **U1.1 is the package that will
> first test it**"* — `palette-contrast.test.ts:99-103`

Two arms of W0's reconciliation are exercised for the first time by U1.1's code:

1. **The opaque-bottom guard** now runs against `DARK_GROUNDS` (nine stacks bottoming out on
   `palette.dark.background`) and `LIGHT_GROUNDS`. It does not throw — U1.1's stacks obey the rule
   its own docblock states (*"both stacks bottom out at `background` and never at a glass stop"*).
2. **The one-entry-stack arm** — implementer A's unavoidable cross-territory edit, which A could
   not point at a real caller for — is now genuinely driven: `LIGHT_GROUNDS` contains
   `...stops(GLASS_TIER.light.card)` with **no** `under`, because *"light's tiers are opaque"*, so
   `flatten()` receives single-element stacks from production data rather than from a sanity pair.

U1.1 also un-todo'd the tier contrast rows (15 todo → 10), so the rows that were the honest
placeholder in the W0 report are now live assertions.

---

## 4. Both sides' pins, re-run against the merged head

Fix committed first (`b56b358`); probes in a throwaway worktree (`worktrees/probe-w1-carry` at
`b56b358`, `node_modules` junctioned from `w1-wave`, junction removed with `cmd /c rmdir`
**before** `git worktree remove` so the removal could not follow it — `w1-wave/node_modules`
verified 33 entries before and after). Every mutation asserted its own pattern matched and that
the file changed; all three mutated files restored **byte-identically**.

**Baseline:** `rn-token-parity.test.ts` — 13 passed, **0 skipped** (the sibling phone repo resolves
from the probe worktree, so the `skipIf` cases really ran), EXIT 0.

| Probe | Origin | Mutation | vitest | guard | Killer |
|-------|--------|----------|--------|-------|--------|
| **H** | U0.4 / F2 | `PALETTE_KEYS` `'link'` → `'card'` | **1 · KILLED** | 0 | `card must be pinned in both halves: expected ['dark','dark','light','light']` |
| **I** | U0.4 / F2 | `palette.ts` dark `overlay` → black scrim | **1 · KILLED** | 1 | `overlay.dark: RN=rgba(0,40,83,0.9) web=rgba(0,0,0,0.9)` |
| **J** | U0.4 / F2 | drop `'linkHover'` from `PALETTE_KEYS` | **1 · KILLED** | **0** | `the guard must anchor exactly the palette tokens: expected [… (30)] to deeply equal [… (31)]` |
| **K** | U0.4 / F4 | re-base dark `text`, old value in a `//` comment above | **1 · KILLED** | 1 | `text.dark: RN=#f0f4f8 web=#e7eef6` |
| **P4d** | U1.1 | `borderSoft` derivation source `card` → `header` | **1 · KILLED** | 0 | shape pin + `glassCard` fragment both red |
| **P14b′** | U1.1 (corrected — see §4.1) | `webTierScope` loses the SCHEME level | **1 · KILLED** | 1 | `the two halves of GLASS_TIER.card.border must not read as one` + 48 tier drift rows |
| **N1′** | **NEW (integrator)** | the `touchFloor` anchor row deleted outright | **1 · KILLED** | 0 | `every palette key AND every tier key … + touchFloor: expected 114 to be 115` |

**Probe J is the one that matters most for this merge**, and it reproduces F2's finding exactly:
under that mutation `node check-rn-parity.mjs` **still exits 0** and every other case in the file
stays green. The membership pin is the only thing that sees it — and the union preserved it while
also preserving U1.1's rows.

**N1′ is new** and it exists because I changed the cardinality expression. `+3` covers what
membership cannot: deletion of the three anchors that belong to neither key list. It reds at
114 ≠ 115, so making the table derived did not cost that coverage.

**P4d proves the winner-takes-all in §1.3 is pinned** — the derivation is not decorative;
re-sourcing it reddens two independent assertions.

Not re-run: U1.1's P1–P3b, P5–P13 and F2's probes A–G. All live inside files this merge did not
touch on the incoming side, all were KILLED on their own branch against identical bytes, and the
full suite is green. Stated rather than silently skipped.

### 4.1 One SURVIVED that was my mistake, and what it revealed anyway

My first attempt at P14b dropped `'export const GLASS_TIER'` from `webTierScope`'s marker list —
which **SURVIVED, exit 0**. That is a mis-specified mutation, not a regression: U1.1's P14/P14b
collapse the **scheme** level, and re-run correctly (P14b′ above) it is comfortably KILLED.

But the survival is a true statement about the merged tree and is worth recording. On the RN side
the module marker is load-bearing and the docblock proves it — `'GlassColors'` alone hits a
**comment** at `Colors.ts:25`. On the web side it is currently **inert**: `glass-tiers.ts` has no
`light: {` or `dark: {` before `export const GLASS_TIER` at `:64`, and the only earlier mention of
the name (`:27`) is inside a **block** comment, which `region()` does not strip — it strips line
comments only. So the marker is correct, defensive, and **not falsifiable today**.

No action now. It becomes load-bearing the moment `glass-tiers.ts` gains a second
`light: {`/`dark: {` literal — U3.1's status tiers are the first candidate — and a block comment
above `GLASS_TIER` that spelled out `export const GLASS_TIER` would defeat it silently. Residual
risk, §6.

---

## 5. Seams and gates

### Seams — `grep -rn "SEAM(" features/demo .design-sync`: **16 markers, 16 wired, 0 waiting**

New this wave, both wired with live consumers:

| Marker | Module | Consumers |
|--------|--------|-----------|
| `SEAM(U1.1)` | `features/demo/ui/tokens/glass-tiers.ts` | 8 + the drift guard: `glass-tokens.ts`, `tokens/palette.ts`, `controls/header-chrome.ts`, `palette-contrast.test.ts`, `glass-tokens.test.ts`, `glass-tiers.test.ts`, `header-chrome.test.tsx`, `rn-token-parity.test.ts`, `.design-sync/check-rn-parity.mjs` |
| `SEAM(U1.4)` | `features/demo/ui/controls/header-chrome.ts` | `WizardDrawer.tsx`, `screens/_shared.tsx`, `screens/map/CaseMapPicker.tsx`, `header-chrome.test.tsx` |

The W0 markers (`SEAM(U0.1)`, `SEAM(U0.2)` ×2) and the prior effort's P5/P6/P7 markers are
unchanged and still wired. Work still ahead is **10 `it.todo` rows** in `palette-contrast.test.ts`
(down from 15 — U1.1 un-todo'd five), each naming its owning package.

### Gates — cold cache at `b56b358`

`tsconfig.tsbuildinfo`, `.next/`, `node_modules/.vite`, `node_modules/.cache` deleted first.
Dependencies installed into `w1-wave` for this pass (`pnpm install --prefer-offline`, exit 0,
4.5 s warm store). Exit codes captured directly, never grepped from output.

| Gate | Exit | Result |
|------|------|--------|
| `pnpm exec tsc --noEmit --incremental false` | **0** | — |
| `pnpm test --silent` | **0** | 271 files · **3542 passed \| 10 todo (3552)** |
| `node .design-sync/check-rn-parity.mjs` | **0** | **115/115** anchor rows, 0 DRIFT, 0 PARSE-FAILED |
| `pnpm build` | **0** | 20/20 static pages · **`/demo` First Load 107 kB** ✓ · `/` 121 kB · shared 106 kB |

Counts reconcile: W0 at `5e2768e` was 269 files / 3520 passed / 15 todo; the wave adds U1.1's and
U1.4's files and their assertions, and moves five todos to live rows → 271 / 3542 / 10.

---

## 6. Residual risk for the reviewers

1. **`webTierScope`'s module marker is untested on the web side** (§4.1). Correct and defensive,
   but nothing would catch its removal today. Trigger: the first package that puts a second
   `light: {`/`dark: {` literal in `tokens/glass-tiers.ts` (U3.1 is the candidate) — at that point
   the marker becomes load-bearing and wants a pin like the RN side's.
2. **The F3 whitespace-stripped scan now runs over U1.1's 24 spaced-`rgba` tier values.** Green
   today, and F3's comment anticipated exactly this. The shape to watch is the inverse of what F3
   fixed: `norm()` strips **all** whitespace from whole file text before `includes`, so a banned
   literal could in principle be matched across a line break that was never a re-inline. No
   offender today; worth a lane's eye because the two changes met for the first time here.
3. **`GLASS.borderAccent` is still the only underived key of the `elevated` tier** — U1.1 left it
   at the demo's near-miss `0.3` deliberately, pinned as a negative, so U1.3 is forced to complete
   the derivation when it lands `0.25`. Unchanged by this merge; restated because F8's deleted
   comment was one of the two places that said so.
4. **Nothing in this merge is a schema collision.** No type, registry or serialized shape was
   touched by both sides, so there is no version to unify — the two overlaps were both *tables*,
   and both are now derived from their own key lists rather than from a number.

## 7. Ledger

**No new deferral rows proposed.** The two rows proposed in the W0 integration report (A's PR-3 →
trigger U7.2; A's PR-1 → trigger U2.2) are unaffected and still stand. The third item raised there
(A's PR-2, refuted as R-1) is now **closed by U1.1**, not deferred — see §1.3.

---

**Next merge on this branch:** `INTEGRATION-u1-assembly.md` — U1.2/U1.3 (`28e7993`).

---

*Integrator: `dt-integrator` (Opus 5, xhigh). Gates quoted from a cold cache at `b56b358`.*
