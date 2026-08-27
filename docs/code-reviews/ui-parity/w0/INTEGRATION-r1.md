# W0 fix round 1 — INTEGRATION report

**Seat:** `dt-integrator` (Opus 5, xhigh) · **Branch:** `feat/uiparity-u0` · **Worktree:** `worktrees/u0-phase`
**Merge commit:** `5e2768e` — `origin/uiparity/u0-fix-foundation` @ `7f28fef` into phase head `0e35d12`
**Merge base:** `10553c8` (`docs(review): W0 vetted r1`)

The phase head already carried `uiparity/u0-fix-guard` (F2, F4) and `uiparity/u0-fix-contrast`
(F3, F5, F6 clause 2). This merge brings implementer A's `uiparity/u0-fix-foundation`
(F1, F6 clauses 1/3/4, F7, F8, F9, F10). W0 fix round 1 is now whole on one branch.

---

## 1. Conflicts — 1 file, 1 logical block, 0 kept-both

| # | File | Class | Resolution |
|---|------|-------|------------|
| 1 | `features/demo/ui/__tests__/palette-contrast.test.ts` — `flatten()` | modify/modify, ONE logical block | **union** |

**Nothing else conflicted, and nothing else could have.** `git merge-base 0e35d12 7f28fef` is
`10553c8`; the two sides' change sets intersect in exactly one path:

```
comm -12 <(git diff --name-only 10553c8 HEAD) <(git diff --name-only 10553c8 MERGE_HEAD)
  features/demo/ui/__tests__/palette-contrast.test.ts
```

The other nine files in the merge changed on **one side only**, so the "silently doubled hunk"
class — an import both sides added differently, a pin both sides moved — was not available to
this merge. Checked anyway, see §2.

### 1.1 The conflict, and why keep-both was wrong

Two seats rewrote the same eight-line function for two different reasons in the same round:

- **A's `7c245fe` (F6 clause 1)** made `flattenOver`'s ground required by signature. That broke
  the existing call `flattenOver(top, ...grounds)` with `TS2556: A spread argument must either
  have a tuple type or be passed to a rest parameter` at `:101` — a compile error, not a style
  choice, so the call site had to move with the signature. A therefore reached **out of its
  territory** (declared in its report under *"Touched outside my territory, and why"*), replaced
  the spread with a `[top, ground, ...rest]` destructure, added a one-entry-stack arm, and left a
  comment naming where clause (2) would land.
- **The U0.5 seat's `001627e` (F6 clause 2)** turned `stack.forEach(parse)` into
  `stack.map(parse)` and added the opaque-bottom-ground guard, reading the alpha off the parse
  the function had already performed.

Keep-both here yields two `flatten()` bodies in one file — the dominant integration defect, and
in this case it would not even compile. Reconciled to **one implementation carrying both
behaviours**, in the order the two guards must run:

```ts
function flatten(stack: string[]): Rgba {
  const parsed = stack.map(parse)                       // F3-era buried-layer guard, reused
  const bottom = parsed[parsed.length - 1]              // F6 clause (2)
  if (bottom[3] !== 1) {
    throw new Error(
      `palette-contrast: the bottom ground must be opaque, got ${stack[stack.length - 1]}`,
    )
  }
  const [top, ground, ...rest] = stack                  // F6 clause (1) — ground now required
  return ground === undefined ? parsed[0] : parse(flattenOver(top, ground, ...rest))
}
```

Three things the resolution had to get right, none of them visible in the markers:

1. **Neither guard subsumes the other** — the U0.5 report states this explicitly at
   `u0.5-implementation-report.md:696-697` (*"Neither subsumes the other; do not collapse them"*).
   The `map` parses **every** layer, so a buried `color-mix()` still throws (`flattenOver` would
   have returned `top` uncomposited); the bottom check catches a layer that parses perfectly well
   but is translucent. Probes P1 and P2 below prove both survive the union independently.
2. **The one-entry arm has to keep the bottom check in front of it.** A one-entry stack IS its own
   bottom ground, so ordering the destructure first and short-circuiting would have let
   `flatten(['rgba(0,0,0,0.1)'])` through un-guarded. Guard first, arm second.
3. **`parsed[0]` replaces A's `parse(top)`** in the one-entry arm — identical value, one fewer
   parse, and consistent with the U0.5 seat's stated reason for `forEach → map` (reuse the parse
   already performed). Verified equivalent by probe P4, which reds when the arm is removed.

### 1.2 One thing the markers hid

The docblock above `flatten()` did not conflict, because only the U0.5 side touched it — and that
side **appended a third bullet to a list introduced as "Two seams … both deliberate"**
(`001627e` diff, `palette-contrast.test.ts:90`). Corrected in the same commit to *"Three seams …
all deliberate"*. Prose-only, no behaviour, but it is exactly the kind of thing an auto-merge
leaves wrong and nobody re-reads.

---

## 2. Read past the markers — the nine auto-merged files

Each was inspected as a diff against the phase head, not assumed clean.

| File | Side | Checked for | Result |
|------|------|-------------|--------|
| `screens/__tests__/ExportHub.test.tsx` | A only (F1) | pin doubling; F3 neighbours | Three assertions **re-pointed in place** (`rgb(31, 107, 153)` → `rgb(184, 212, 240)`), not added alongside. The phase side never opened this file. |
| `screens/__tests__/ExportModal.reduced-motion.test.tsx` | A only (F1) | same | One assertion re-pointed in place (`borderTopColor: '#1F6B99'` → `'#b8d4f0'`). Phase side never opened it. |
| `ui/glass-tokens.ts` | A only (F8, F7) | keys deleted here vs pinned on the phase side | F8 deleted `T.borderSoft` / `T.radius` from `inputs/input-theme.ts`, **not** from `GLASS`. The phase side's F5 pins in `__tests__/glass-tokens.test.ts` assert `GLASS` and `T.accentFrom`/`T.accentTo` — no overlap with the deleted keys. Suite green confirms. |
| `ui/inputs/input-theme.ts` | A only (F9, F8) | vs phase side's `inputs/__tests__/rn-token-parity.test.ts` (F4) | `T.rowH` now aliases `touchTarget.min`; the F4-widened parity test asserts the touch floor from the same source. Guard 67/67, suite green. |
| `ui/tokens/scale.ts` | A only (F6) | vs phase side's widened `.design-sync/check-rn-parity.mjs` (F2) and the F3 literal scans | A's new `#rrggbbaa` / `#rgba` parse arms introduce no palette literals; the F3 `norm()` scans in `glass-tokens.test.ts` exempt `tokens/scale.ts` as a token module (`:50`). Guard exit 0. |
| `ui/tokens/__tests__/scale.test.ts` | A only (F6) | new literals tripping the F3 scans | `'#2B8CC125'`, `'#ffffff80'`, `'rgba(1, 2, 3, 0.5)'` are probe values, not retired palette colours; test files are excluded from the source scan by design (`glass-tokens.test.ts:9-12`). |
| `screens/ExportModal.tsx`, `screens/MediaLibrarySheet.tsx`, `screens/export/ExportCaseCard.tsx` | A only (F1) | `GLASS.accentFrom` left behind at a re-pointed site | All six F1 sites moved to `colors.link`; `grep` finds no surviving foreground `accentFrom`. Coverage gap on four of them — §6, finding I-1. |
| `components/marketing/phone-frame.tsx` | A only (F10) | marketing↔demo isolation | Comment-only (F10 remedy 2). No import added; the `chrome-scope` / `phone-frame` isolation guards stay green. |
| `reports/u0-foundation-implementation-report.md` | A only | — | Doc. Merged whole. |

---

## 3. Both sides' pinning tests, re-run against the reconciled `flatten()`

The merged `flatten()` is code **neither seat ever ran** — A tested its half without the guard,
U0.5 tested its half without the arity change. Green is not evidence here; falsifiability is.
Probed per `.claude/skills/mutation-testing/SKILL.md`: fix committed **first** (`5e2768e`), probes
run in a **throwaway worktree** (`worktrees/probe-u0-integ` at `5e2768e`, `node_modules` junctioned
from `u0-phase`, torn down after — junction removed with `cmd /c rmdir` **before**
`git worktree remove` so the removal could not follow it into the real dependency tree; verified
`u0-phase/node_modules` unchanged, 33 entries before and after).

Every mutation asserted its own pattern matched *and* that the replacement landed and changed the
file; the tree was restored byte-identically after each (`git status --porcelain` empty at the end).

**Baseline at `5e2768e`:** `palette-contrast.test.ts` — 4 passed | 15 todo (19), **EXIT 0**.

| Probe | Origin | Mutation | Result | Killer output |
|-------|--------|----------|--------|---------------|
| **P1** | U0.5 probe A | delete the opaque-bottom guard | **EXIT 1 · KILLED** | `AssertionError: expected [Function] to throw an error` |
| **P2** | U0.5 probe B | `stack.map(parse)` → `[parse(stack[len-1])]` (parse only the bottom) | **EXIT 1 · KILLED** | `AssertionError: expected [Function] to throw an error` — the buried unparseable-layer pin, still live under `map` |
| **P3** | U0.5 probe C | `parsed[parsed.length - 1]` → `parsed[0]` | **EXIT 1 · KILLED** | `Error: palette-contrast: the bottom ground must be opaque, got #000000` — reproduces the expected text exactly |
| **P4** | **NEW (integrator)** | delete A's one-entry-stack arm | **EXIT 1 · KILLED** | `TypeError: Cannot read properties of undefined (reading 'match')` |
| **P5** | A probe C (F6 cl. 1) | inject a zero-ground `flattenOver('#002853')` into `scale.test.ts` | **EXIT 2 · KILLED** | `scale.test.ts(21,16): error TS2555: Expected at least 2 arguments, but got 1.` |
| **P6** | **NEW (integrator)** | break the **production** fold: `mixOver`'s `top[i]*a + bottom[i]*(1-a)` → `top[i]` | **EXIT 1 · KILLED** | `AssertionError: expected [ 255, 255, 255, 1 ] to deeply equal [ 128, 128, 128, 1 ]` |

**P4** answers the question A's own report left open: the cross-territory one-entry arm is not
dead defensive code — `worst('#ffffff', [['#000000'], ['#ffffff']])` really does drive it, and
removing it reds. **P6** is the seam test: it proves `palette-contrast.test.ts` composites through
the **real** `SEAM(U0.2)` helper and not a private copy that drifted — which is the whole reason
the plan forbade a local `over()` here.

Not re-run: A's probes D/E/F/G (rgb `$` anchor, the two `withAlpha` dev-warn arms, the `{4}`/`{8}`
hex alternation). All four live entirely inside `tokens/scale.ts`, which the merge did not touch on
the phase side, and all four were KILLED at `7f28fef` with the identical file bytes. Stated rather
than silently skipped.

---

## 4. Seams

`grep -rn "SEAM(" features/demo` — **11 markers, 11 wired, 0 waiting, 0 needing a ledger row.**

| Marker | Where | State |
|--------|-------|-------|
| `SEAM(U0.1)` | `ui/tokens/palette.ts:2` | **Wired** — module exists, consumed by `glass-tokens.ts`, both test suites, and all 67 parity-guard rows. |
| `SEAM(U0.2)` | `ui/tokens/scale.ts:2` | **Wired** — `withAlpha` / `flattenOver` both have production callers and pinned tests. |
| `SEAM(U0.2)` | `ui/__tests__/palette-contrast.test.ts:84` | **Wired, and proven live by probe P6** — the contrast file consumes the production helper; breaking the helper's fold reds the contrast file. |
| `SEAM(P5.2)` | `ui/DemoExperience.tsx:2382` | Pre-existing, wired (P5 shipped) — a boundary note on `requestExportFlow`, not a stub. |
| `SEAM(P5.3)` | `ui/__tests__/DemoExperience.export-tab.test.tsx:13` | Pre-existing, wired — the handoff has a live test. |
| `SEAM(P6.1)` ×2 | `screens/map/MapBottomSheet.tsx:32`, `screens/map/MapScreen.tsx:78` | Pre-existing, wired — prop-forwarding boundary notes; the props exist and are forwarded. |
| `SEAM(P7.2)` / `SEAM(P7.3)` ×4 | `screens/settings/SettingsModal.tsx:51`, `settings/__tests__/panes.test.tsx:454`, `engine/content/__tests__/settings-values.test.ts:235`, `ui/__tests__/DemoExperience.settings.test.tsx:191` | Pre-existing, wired — two of the four are `it(...)` rows asserting the panes are bridge-owned rather than stubs. |

None of these is dishonest UI: every one names a package boundary whose backing capability has
already shipped. **W0 introduced no unwired seam.**

The work legitimately still waiting is expressed as **15 `it.todo` rows** in
`palette-contrast.test.ts`, each naming its owning package in the title (U1.1 dominant, then U2.2,
U3.1, U4.4, U5.2) — the file's own stated convention at `:37`: *"a row that would need a constant
this port has not created yet is `it.todo` with its owning package named in the title … A row
measured against a partial stack is green and lying; a todo is loud."* That is the correct
mechanism and needs no ledger row. There are **zero** `it.todo`/`test.todo` anywhere else under
`features/demo`.

---

## 5. Gates — cold cache, merged head `5e2768e`

Caches deleted first: `tsconfig.tsbuildinfo`, `.next/`, `node_modules/.vite`, `node_modules/.cache`.
Exit codes captured directly, never grepped from output.

| Gate | Exit | Result |
|------|------|--------|
| `pnpm exec tsc --noEmit --incremental false` | **0** | — |
| `pnpm test --silent` | **0** | 269 files · **3520 passed \| 15 todo (3535)** |
| `node .design-sync/check-rn-parity.mjs` | **0** | 67/67 anchor rows (32 palette keys × both halves + 2 dark CTA stops + touch floor) |
| `pnpm build` | **0** | 20/20 static pages · **`/demo` First Load 107 kB** ✓ (target met exactly), `/` 121 kB, shared 106 kB |
| `pnpm exec vitest run palette-contrast.test.ts scale.test.ts` | **0** | 23 passed \| 15 todo (38) — both sides' owning files |

The suite count reconciles: the U0.5 seat measured 3,513 passed / 3,528 at `001627e`; A's branch
adds 7 assertions, giving 3,520 / 3,535. No test was lost to the merge.

`pnpm build` is the load-bearing one here — it is the only gate that runs Next's own type-check
over the app graph and produces the shipped artifact, and `/demo`'s First Load is the number that
would move if F1's re-points had dragged a new module into the demo chunk. It did not.

---

## 6. Findings and residual risk for the fix-delta lanes

### I-1 — [MEDIUM] Four of F1's six accent-as-mark sites ship with no style pin (A's PR-3, confirmed at the merged head)

`features/demo/ui/screens/MediaLibrarySheet.tsx` lines ~225, 226, 245, 576 — the media-library tab
strip (`borderBottom` + `color`), the segmented-control label, and the selected-row rail — all moved
`GLASS.accentFrom → colors.link` in F1. `features/demo/ui/screens/__tests__/MediaLibrarySheet.test.tsx`
contains **one** `.style`/`toHaveStyle` assertion in the whole file and **zero** references to
`colors.link` / `#b8d4f0` / `rgb(184, 212, 240)`. Two of the four carry TEXT, which is the arm of
F1 with an AA claim behind it (accentFrom 2.05–2.54 vs link 7.78–9.60, measured in A's diff
comments). A re-point back to a fill shade at any of the four is invisible to the suite today.

A flagged this itself (probe H had to borrow `ExportModal` because these four are unpinnable
without a fixture). Not a merge defect — it arrived from the branch — but the merged head is where
it becomes W0's residual, so it is raised here rather than left in one seat's report.
**Proposed ledger row in §7.**

### I-2 — [LOW] No arm exercises the F1 join end-to-end

F1's claim is a *cross-file* one: "the accent as a mark is `colors.link` everywhere, and
`GLASS.accentFrom` has zero foreground consumers left". Three files were re-pointed
(`ExportModal.tsx`, `MediaLibrarySheet.tsx`, `export/ExportCaseCard.tsx`) and two of them gained
pins — but each pin asserts its own component in isolation, and **nothing asserts the invariant
that ties them together**. The suite would stay green if a fourth site re-inlined `#1F6B99`
tomorrow: `glass-tokens.test.ts`'s `BANNED` scan bans the *retired* `#35A0D6`, not the live
`accentFrom`, and it exempts nothing about foreground use.

This is the "join nobody tested" shape — each side's suite covers its own arm, no arm runs the
join. A named the same gap from the other end as its PR-1. Cheap and correct fix, when a package
next opens the file: a source scan in `glass-tokens.test.ts` asserting `GLASS.accentFrom` /
`ACCENT_FROM` appear only in `gradientAccent` and `T`. **Proposed ledger row in §7.**

### I-3 — [INFO] `flatten()` still throws a `TypeError`, not a message, on an empty stack

`flatten([])` dies at `bottom[3]` with `Cannot read properties of undefined`. Both pre-merge
implementations had the same hole and no caller can produce it — `contrast()` and `worst()` always
pass a non-empty stack. Not worth a guard (`ponytail`: the throw is already loud and the input is
unreachable), recorded so the next reader does not mistake it for an oversight.

---

## 7. Proposed deferral-ledger rows — for `dt-review-aggregator` to decide and write

Per the hazard playbook I do not write `docs/code-reviews/deferred.md`. Both rows below are
carried forward from implementer A's report; both already have concrete triggers.

**Proposed §N — F1's MediaLibrarySheet sites are unpinned (A's PR-3)**
- **Source:** W0 review r1 F1; `u0-foundation-implementation-report.md` §"Proposals", PR-3;
  integration r1 finding I-1.
- **What:** four of F1's six accent-as-mark re-points (`MediaLibrarySheet.tsx:225, 226, 245, 576`),
  two of which carry text, have no style assertion. A re-point back to a fill shade is invisible.
- **Why deferred:** pinning them today means inventing a fixture for the media-library tab strip
  and the segmented control, in a file scheduled for a full rewrite. The fixture would be thrown
  away by the package that makes the pin cheap.
- **Trigger:** **U7.2**, which rewrites `MediaLibrarySheet.tsx` and is the first package able to
  pin the tabs behaviourally without a bespoke fixture.

**Proposed §N+1 — `GLASS.accentFrom` has no "fill-only" pin (A's PR-1 / integration I-2)**
- **Source:** W0 review r1 F1; `u0-foundation-implementation-report.md` §"Proposals", PR-1;
  integration r1 finding I-2.
- **What:** F1 leaves `GLASS.accentFrom` with zero foreground consumers — the fact that makes
  U0.3's contrast measurement true again — and nothing keeps it that way. A source pin belongs in
  `glass-tokens.test.ts` (`GLASS.accentFrom` / `ACCENT_FROM` appear only in `gradientAccent` and `T`).
- **Why deferred:** the file was owned by the concurrent F3/F5 seat this round (one writer per
  shared file), and the pin's precise shape depends on the tier tokens U1.1 introduces — written
  now against `GLASS`, it would need rewriting against `GLASS_TIER` one wave later.
- **Trigger:** the next package that spends `GLASS.accentFrom` outside a fill — **U2.2**, which
  rewrites every button variant, is the first candidate.

---

## 8. Refutations

**R-1 — A's PR-2 (the `GLASS.borderSoft` relation pin) is now *writable* but should still NOT be
written. Refuting my own mandate to wire what the merge unblocked.**

A declined F8's optional relation pin because it needed whitespace normalisation the F3 seat was
adding. That normalisation now exists in the merged tree —
`features/demo/ui/__tests__/glass-tokens.test.ts:45`, `const norm = (s: string): string =>
s.toLowerCase().replace(/\s+/g, '')` — so `expect(norm(GLASS.borderSoft)).toBe(norm('1px solid ' +
withAlpha(colors.border, 0.5)))` would pass today. I did not take it, because the merged source
itself forbids the relation it would encode: `features/demo/ui/glass-tokens.ts:59-62` (A's own F8
rewrite) says U1.1 derives this token **from `GLASS_TIER.dark.card`**, not from
`withAlpha(colors.border, 0.5)`. That the two agree at `rgba(28,78,132,0.5)` today is arithmetic
coincidence, not the intended derivation. Pinning it now would encode a relation U1.1 must delete —
a test that is green, true, and pointing at the wrong source. **Recommend: no ledger row; the
correct home is U1.1's own Tests column, where the derivation actually lands.** Raised for the
aggregator to overrule if it disagrees.

**R-2 — the merge message's staged `Claude-Session` trailer had a typo; I used the repo's value.**

`.git/MERGE_MSG` (and the dispatch brief) carried
`https://claude.ai/code/session_01UtQCSnhF3oHi92Lu3bSv4`. Every commit already on this branch —
`0e35d12`, `46fbf50`, `001627e`, `07aa552`, `5c71cc0`, `bb34125` — and my own session identifier
carry `…Lu3mBSv4` (one character, `m`, before `BSv4`). A one-character-wrong link is a dead link, so
`5e2768e` uses `…Lu3mBSv4`, matching history. The `Co-Authored-By` was likewise corrected from the
staged `Claude Fable 5` to **`Opus 5`**, this seat's own model, per the playbook's
*"commit trailers carry your own model name"*. **Orchestrator: check your own brief template — the
typo is in the source, not in one message.**

**R-3 — no cross-territory edit list was refuted on the merits.** A filed exactly one
cross-territory edit (the `flatten()` call site), it was correct and unavoidable, and it is applied
as specified — the arity change genuinely does not compile without it (probe P5). A's PR-1/PR-2/PR-3
are proposals to seats whose round had already closed, not edit lists binding on me; all three are
dispositioned above (§7 ×2, §8 R-1 ×1) rather than dropped.

---

## 9. What the fix-delta reviewers should aim at

1. **`flatten()` is new code, not either seat's code.** Neither implementer's fix-delta pass has
   seen this body. Read it as a fresh implementation and judge whether the guard/arm ordering in
   §1.1 is right — specifically that the bottom check runs **before** the one-entry short-circuit.
2. **F1's honesty at the four unpinned MediaLibrarySheet sites** (I-1) — the only place in W0 where
   a claim with an AA number behind it has no test under it.
3. **The F6 clause split across two branches** — clauses 1/3/4 were probed on A's branch and clause
   2 on U0.5's; only P1–P6 above have exercised them *together*. If a lane wants a seventh probe,
   the untested combination left is a translucent bottom on a **one-entry** stack
   (`flatten(['rgba(0,0,0,0.1)'])`), which the guard ordering is what catches.
4. **Not a concern:** the widening/exhaustiveness class that usually bites at merge time. The two
   sides shared exactly one file and no type, no schema, and no registry was touched by both — there
   is no unified version bump in this merge because there was no schema collision to unify.

---

*Integrator: `dt-integrator` (Opus 5, xhigh). Gates quoted from a cold cache at `5e2768e`.*
