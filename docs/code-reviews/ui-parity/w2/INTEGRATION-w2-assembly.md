# Wave 2 assembly — U2 + U3 + U4

**Seat:** `dt-integrator` (Opus 5, xhigh) · **Branch:** `feat/uiparity-w2` · **Worktree:** `worktrees/w2-wave`
**Base:** `28e7993` · Three `--no-ff` merges in plan §6.2 order.

| Step | Merge | Incoming | Conflicts |
|---|---|---|---|
| 1 | `ef7359c` | `feat/uiparity-u2` @ `231ccf3` — fieldInput / buttons / Toggle / choice-controls + its W1 carry | **0** |
| 2 | `1bd7906` | `feat/uiparity-u3` @ `0b35726` — status tokens, EmptyState, Banner, severity + its W1 carry | **3** files / 3 hunks |
| 3 | `7bcb553` | `feat/uiparity-u4` @ `af77ddd` — GlassBottomSheet, scrims, ModalShell, CentredDialog + its W1 carry | **7** files / 9 hunks |

**12 hunks total. 11 unions, 1 split. Zero keep-both, zero winner-takes-all.**

---

## 1. One cause behind ten of the twelve hunks

U3 and U4 were both cut **before U2.2 deleted `glassBtnPrimary` / `glassBtnSecondary`**. Every
import block they touch still names at least one of those exports, so **taking the incoming side
verbatim does not compile** — in ten separate hunks. Each union is *what the merged body actually
references*, established by a body-only grep (imports excluded) and then proved by the cold
typecheck rather than by eye.

The inverse case appeared once and is the reason a blanket "keep both sides' imports" rule would
also have failed: **`controls/WizardDrawer.tsx`**, where U4 *deletes* the `withAlpha` import while
the merged body still calls it four times. There HEAD's line is the one that survives.

### Step 2 — U3 (3 hunks, all import blocks)

| File | Union |
|---|---|
| `screens/ExtractedScopeScreen.tsx` | `EmptyState` + `Banner` (U3) + `glassCard`. **Both sides were wrong here:** `glassBtnSecondary` has 0 body refs (U2.2 converted the button) and so does `GLASS` — HEAD's own side carried a dead import that U2.2's conversion had orphaned. |
| `screens/import/PickerStage.tsx` | `buttonStyle` + `GLASS` (U2.2 — 3 and 4 body refs) + `Banner` (U3). `glassBtnPrimary`/`glassBtnSecondary` dropped. |
| `settings/panes/_pane-chrome.tsx` | `colors` + `severityTone` (U3.2's NOTE_TONE) + `spacing` (U2.4). The one hunk where the union really is just both sides. |

### Step 3 — U4 (9 hunks)

| File | Resolution |
|---|---|
| `__tests__/palette-contrast.test.ts` | both: U3's status tone imports + U4's `MEDIA_CLOSE_CHIP`. |
| `controls/WizardDrawer.tsx` | **HEAD's line kept** — see above. |
| `screens/_shared.tsx` (×2) | `useState` (U2.1's Field focus) + `useReducedMotion` (U4); then `GLASS`/`glassCard` + `GLASS_TIER` + `colors,scheme` + `iconSize,spacing` + `fieldInputStyle`. |
| `screens/ExportModal.tsx` | `buttonStyle` + `CentredDialog` + `PhoneOverlayPortal` + `GLASS,glassCardNested`. |
| `screens/DeleteConfirmationModal.tsx` | `CentredDialog` + `buttonStyle` **only** — see §2. |
| `screens/EditIncidentLocationModal.tsx` | U4's `closeAccessibilityLabel` **and** U3.3's Banner note — two different lines of one JSX open tag. |
| `controls/AlertDialog.tsx` (×2) | **the split** — see §3. |

`EditIncidentLocationModal` is worth one line of warning: the U3.3 note is a **JSX comment**, and
placing it before `<ModalShell>` rather than inside makes it an expression with no parent
(`TS2657`). The first attempt did exactly that and the typecheck caught it.

---

## 2. `DeleteConfirmationModal` — the verification the brief asked for

The ruling was *"U4.3 wins the file; verify U2.2's button styling survived INSIDE the adoption."*
It did, and the merged body proves it without any intervention: **`CentredDialog` ×3 and
`buttonStyle` ×2**. Because U4.3's whole-file adoption and U2.2's button conversion touched
different lines, git merged them, and the *only* thing that needed deciding was the import block —
where `PhoneOverlayPortal`, `GLASS` and `glassBtnSecondary` had all lost their last reference and
go.

---

## 3. `AlertDialog` — the one split, and the claim behind it

The single body hunk. U4.3 replaces the hand-rolled dialog (own scrim, own positioned panel, own
Escape listener, own focus capture/restore) with `<CentredDialog>`. HEAD carries U2.2's button
recipe. **Resolved as a split: U4.3's `CentredDialog` wins the structure, U2.2's recipe keeps the
buttons.**

Taking U4's structure *drops two `useEffect`s*, so that was checked at source before it was
allowed. `controls/CentredDialog.tsx:254-281` carries:

- the identical Escape handler, behind an **LIFO stack** so only the last-mounted dialog answers;
- the identical `activationOrigin?.isConnected` capture with `document.activeElement` fallback;
- the same `canTakeFocus` restore and `tabIndex={-1}` panel focus.

Its own docblock at `:228` says *"Focus, in one place for all three callers."* Nothing is lost, and
`useEffect` / `useRef` / `PhoneOverlayPortal` leave AlertDialog with it. **Probes W2-1 and W2-2
turn that reading into evidence** (§5).

But U4's button block still spends `glassBtnPrimary` / `glassBtnSecondary`. Those arms are
re-pointed onto U2.2's `buttonStyle({ variant })` plus the file's own `destructiveTint` — which is
**four border longhands on purpose**, because W1 proved the documented *"re-set the longhand
after"* escape hatch does not survive a spread. A `border` shorthand there would erase it silently.

**Neither branch's version of these lines could have shipped alone**: U4's does not compile, HEAD's
does not use the shell the wave standardises on.

---

## 4. The anchor table — unioned three ways, verified at each step

The brief predicted this as the three-way conflict. It **never conflicted textually** — which is
precisely when to check rather than relax. Verified after step 2 and again after step 3:

| Step | Palette keys | Tier keys | Rows |
|---|---|---|---|
| after U2 | 32 | 24 | 117 |
| after U3 | **40** (+8 status, folded into `PALETTE_KEYS`) | 24 | **133** |
| after U4 | **41** (+`scrim`) | 24 | **135** |

```
41 palette + 24 tier = 65 keys x 2 halves = 130, + 4 CTA gradient stops + touchFloor = 135
node .design-sync/check-rn-parity.mjs  ->  ✓ all 135 anchor rows match, EXIT 0
```

**Nothing is hand-typed.** `rn-token-parity.test.ts:214` still reads
`PALETTE_KEYS.length * 2 + TIER_ANCHOR_KEYS.length * 2 + 5`, and the membership pins remain in the
**ungated** `local invariants` describe (W0/F11's relocation, extended to the tier lists at the W1
carry), so all 65 keys are pinned against their own modules on a box with no phone repo. Probe
W2-4 confirms the union covers U4's new key.

### The three W1 carries deduped cleanly

U2, U3 and U4 each carried the same master commits, arriving three times. Git deduped them as
expected — and the one thing that could not be assumed **was** checked: the clause-12 scan repair
made in U2's carry (`48eaae3`, the `light:`/`dark:` record-arm skip) survives against U3's and
U4's unrepaired copies of `glass-tokens.test.ts`. Verified present after step 2 and at the wave
head.

---

## 5. Probes — 4 run, 4 KILLED

Merges committed first; probes in `worktrees/probe-w2` at `7bcb553`, `node_modules` junctioned
from `w2-wave`, junction removed with `cmd /c rmdir` **before** `git worktree remove` (33 entries
before and after). All three mutated files restored **byte-identically**.

| Probe | Target | Mutation | Exit | Evidence |
|---|---|---|---|---|
| **W2-1** | §3's claim | `CentredDialog`'s focus **restore** deleted | **1 · KILLED** | **10 failed** — `expected <body><div>…</div></body> to be <button …>` |
| **W2-2** | §3's claim | `CentredDialog`'s **Escape** handler deleted | **1 · KILLED** | **12 failed** — `expected "vi.fn()" to be called 1 times, but got 0` |
| **W2-3** | §3's split | AlertDialog's `destructiveTint` neutralised | **1 · KILLED** | `expected 'rgb(240, 244, 248)' not to be 'rgb(240, 244, 248)'` |
| **W2-4** | §4's union | a key dropped from the unioned `PALETTE_KEYS` | **1 · KILLED** | `the guard must anchor exactly the palette tokens: expected […(39)] to deeply equal […(40)]` |

**W2-1 and W2-2 are the load-bearing pair.** Reading `CentredDialog` said it subsumes AlertDialog's
two effects; 10 and 12 red tests say the code that subsumes them is genuinely exercised. Had either
survived, taking U4.3's structure would have silently dropped an accessibility behaviour.

**W2-3** shows U2.2's destructive treatment still bites *through* U4.3's shell — the split works in
both directions.

`WizardDrawer`'s `withAlpha` needed no probe: removing it is a compile error, which is the
strongest pin available.

---

## 6. Wave 2 gates — cold cache at `7bcb553`

`tsconfig.tsbuildinfo`, `.next/`, `node_modules/.vite`, `node_modules/.cache` deleted first. Exit
codes captured directly, never grepped from output.

| Gate | Exit | Result |
|---|---|---|
| `pnpm exec tsc --noEmit --incremental false` | **0** | — |
| `pnpm test --silent` | **0** | **290 files · 3881 passed \| 4 todo (3885)** |
| `node .design-sync/check-rn-parity.mjs` | **0** | **135/135** anchor rows, 0 DRIFT, 0 PARSE-FAILED |
| `pnpm build` | **0** | **`/demo` First Load 107 kB** ✓ · shared 106 kB |

Progression: `231ccf3` (U2 alone) 280 / 3677 → step 2 286 / 3745 → wave head 290 / 3881. Todos fall
15 → 4 across the wave as U3 and U4 un-todo their contrast rows.

### Seams — 50 markers across 20 packages, one wait

Every marker names a package that has **landed**, with exactly one exception:
`SEAM(U6.4b)` at `CompletionScreen.tsx:103`. It is **pinned, not merely commented** —
`glass-card-recipe.test.tsx:503` asserts the techGlow is still there, so the wait reds the moment
U6.4b removes it. **No unwired seam ships.**

---

## 7. Residual risk for the wave review

1. **`AlertDialog` is the file to read first.** It is the only place in the wave where two packages'
   work was interleaved by hand rather than by git, and the resolution rests on a
   subsumption claim about a third file. §3 and probes W2-1/W2-2 are the evidence; a reviewer who
   disagrees should aim there.
2. **Ten hunks turned on "does the merged body still reference this?"** That question was answered
   by grep + typecheck, which is sound for *removal* — but an import kept for a reference that is
   itself dead code would not be caught. `tsconfig.json` sets no `noUnusedLocals` and ESLint is not
   configured in these worktrees, so nothing else would catch it either (carried forward from
   `§ U2 assembly` I-5).
3. **`ExtractedScopeScreen` shows the shape to watch:** a *pre-existing* dead import on the HEAD
   side, orphaned by U2.2's conversion two merges earlier and invisible until this hunk forced
   someone to enumerate the file's real dependencies.
4. **Open ledger rows carried into the wave review:** A's PR-3 (trigger U7.2), A's PR-1 (trigger
   U2.2 — landed without it), and I-7, the conflicting-property tripwire that never drives the
   `Field` error path (trigger U6.1). I-4 was withdrawn, resolved by U2.4.

---

---

# § fix round 1 — F36

**Branch:** `uiparity/w2-fix-integration` off `feat/uiparity-w2` @ `addd03f` · **Commit:** `4391f77`

**F36 [MEDIUM] — five merge-orphaned bindings surviving only inside comments.** Mine, and the
finding is right about the shape of the miss. The wave-2 assembly resolved ten import hunks by
asking *"does the merged body still reference this?"* — a body-only grep that excluded `^import`
lines but **not comments**. At `_pane-chrome.tsx` the census counted `colors.` once and kept the
binding; that single hit was inside a comment. §7.2 of this report had already recorded the class
(*"an import kept for a reference that is itself dead code would not be caught"*) — recorded and
then not applied, which is worse than not noticing.

| File | Binding |
|---|---|
| `__tests__/palette-contrast.test.ts:7` | `GLASS` |
| `controls/AlertDialog.tsx:6` | `GLASS` |
| `screens/ExportModal.tsx:11` | `type ExportModalMode` |
| `screens/ExportModal.tsx:18` | `GLASS` (narrowed to `glassCardNested`) |
| `settings/panes/_pane-chrome.tsx:8` | `colors` |

**RED**, observed on `addd03f`: `tsc --noEmit --incremental false --noUnusedLocals` EXIT **2**,
naming exactly those five `TS6133`s — no more and no fewer. **GREEN**: the same command names none
of them afterwards. The comments stay; they are the useful part.

**Not taken, deliberately — the root-cause fix.** `noUnusedLocals` in `tsconfig.json` is one line
and would kill the class permanently, but it reds **15 bindings across 13 files**, ten of them in
files owned by other seats this round (`MediaCapturePane`, `LocationPane`, `TimeSyncPane`,
`create-store.ts`, five test files). Flipping it would redden nine concurrent fix branches and
break one-writer-per-file. **Proposed ledger row** below instead.

### Proposed deferral-ledger row — for `dt-review-aggregator`

**Proposed §N — enable `noUnusedLocals` once the last ten orphans clear (F36's root cause)**
- **Source:** W2 review r1 F36; integration report §7.2 (I-5); measured at `addd03f` — 15 `TS6133`
  across 13 files, 5 fixed here, 10 in other seats' files.
- **What:** the repo has no gate for an unused binding at all. F36 is the second time the class has
  cost a finding (the first was `§ U2 assembly` I-5), and a grep census cannot see it.
- **Why deferred:** the flag is repo-wide and cannot land while nine fix branches hold the other
  ten files; it is a one-line change whose blast radius is entirely other seats' territory.
- **Trigger:** the W2 fix-merge, at which point the other ten are either fixed or known — run
  `tsc --noUnusedLocals` at the merged head and flip the flag if it is clean.

**Gates**, cold: `tsc` **0** · `pnpm test --silent` **0** (290 files, 3881 passed | 4 todo) ·
`check-rn-parity.mjs` **0** (135/135).

*Integrator: `dt-integrator` (Opus 5, xhigh). Three merges: `ef7359c`, `1bd7906`, `7bcb553`. Gates
quoted from a cold cache at the wave head.*
