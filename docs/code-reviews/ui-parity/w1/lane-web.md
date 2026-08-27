# Lane: web — W1 (phase U1), PR #40 / fix rounds PR #41

## Round 2 (fix delta — targeted rider round)

Head: `feat/uiparity-w1` @ `d91ab76`, diff `044578a..d91ab76`, shared worktree read-only. Authority:
the rider-round mapping on PR #41. Read: the ruling (`partner-lit-edge-ruling.md` §3–§4 + Appendix A,
from `master`), `7a0c505`, `7fc126b`, `38cb47c`, and the four defect sites at head.

**Probe:** `probe/w1d2-web-litedge` @ `d91ab76`, cut + installed (4.8 s), one test file added and
deleted, `git status --short` empty at teardown, removed via `tools/worktree-remove.ps1` —
*"unlinked 549 junction(s) in 2 pass(es) · .pnpm 240 → 240 · OK"*. jsdom, react-dom 19.2, motion-ON.
**Zero React `conflicting property` warnings fired in any arm** — which, with the new guard, is
itself the pass condition.

### 1. The ruled shape holds — re-probed at this head

```
                       border-top-color            right/bottom/left        width  style
glassCard      p1      rgba(184, 212, 240, 0.08)   rgb(1, 1, 1)             1px    solid
  + sides      p2      rgba(184, 212, 240, 0.08)   rgb(2, 2, 2)             1px    solid   <- real toggle
  (tint)       p3      rgba(184, 212, 240, 0.08)   rgb(1, 1, 1)             1px    solid
conditional    lit     rgba(184, 212, 240, 0.08)   rgb(9, 9, 9)             1px    solid
  ...(lit&&X)  collapse rgba(184, 212, 240, 0.08)  rgba(28, 78, 132, 0.5)   1px    solid   <- SELF-HEAL
```

The lit edge survives p1, a real `borderColor`-equivalent toggle at p2, and the return at p3. On
conditional collapse the sides fall back to the fragment's own `tier.card.border`
(`rgba(28,78,132,0.5)`) — **not** `currentColor` and not empty, exactly as the ruling's A2 row
predicts and as the old `border`-shorthand shape did *not* do. My round-0 finding and my round-1
withdrawal both land where the ruling puts them; nothing further from me on the rule.

### 2. Rendered-value parity of the longhand fragments — IDENTICAL at `scheme='dark'`

Rendered the new longhand fragment beside a reconstruction of the exact pre-rider shorthand form and
compared all six border longhands:

```
glassCard        new == old   rgba(184,212,240,0.08) | rgba(28,78,132,0.5)  x3 | 1px | solid
glassCardNested  new == old   rgba(184,212,240,0.2)  | rgba(43,140,193,0.45) x3 | 1px | solid
```

Byte-identical on both fragments — the split is a refactor, not a restyle. `borderWidth: 1` as a
number resolves to `1px` (React unit-appends it), and nothing sets `border-image`, so the shorthand's
one extra reset is a no-op difference. **No pixel moved.**

### 3. The four live defects the guard caught — all four render correctly, none moved another pixel

| Site | Before | After (probed at head) |
|---|---|---|
| `_shared.tsx:264` `Field` | error cleared → border GONE | error `1px solid rgb(255, 71, 87)` → cleared **`1px solid rgb(28, 78, 132)`** |
| `NewCaseModal.tsx:86` / `IncidentLocationFields.tsx:134` (the two copies) | same class | same fix, same base (`GLASS.border`), same shape |
| `CompletionScreen.tsx:66` | review form had NO top padding | success **`60px 16px 16px`** → review **`padding:16px`, `paddingTop:16px`** |

Both fixes are value-preserving in the state that already rendered correctly: the error border was
`1px solid #ff4757` before (the base supplied width+style to the `borderColor` longhand) and is
`1px solid #ff4757` now; the success view's box was 60/16/16/16 and is 60/16/16/16. The only changed
pixels are the two that were WRONG — a border that had vanished and a 60px gap that had collapsed to
0. Confirmed on the real `CompletionScreen` across the real `Review / Export again` transition, which
is the reconciliation that produced the defect.

### 4. Blast radius of the repo-wide guard

`vitest.setup.ts`'s promotion of React's detector to a test failure is a global change, so I ran the
demo UI suite at the probe head: **161 files, 2035 passed, 10 todo, 0 failed** (49 s). No collateral
reds. Turning a warning nobody reads into a failing test is the right shape, and it has already paid
for itself four times in one round.

### Findings this round

**None.** F14/F19 remain FIXED; the rider supersedes both with a stronger, measured rule and fixes
four live defects that my round-0 and round-1 probes did not reach because I probed the fragment, not
its consumers. That is the gap worth naming: my probes tested the *rule*, the guard tested the
*codebase*, and only the second found the bugs.

---

## Web Summary (Round 2 — rider round, current)

CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0
Round-0: HIGH 1 FIXED · MEDIUM 1 FIXED. Round-1: no new. Round-2: no new.
Verdict: APPROVE

Marketing<->demo isolation: preserved — no `components/`, `lib/` or `app/(default)/` file in the
rider diff.
Bundle impact: none in the diff (no dependency, import-shape or lazy->static change). Still not
independently verified: I have seen no W1 build log in any of the three rounds.
Browser-resource cleanup: n/a.
Accessibility: no change — the fragments are byte-identical at `scheme='dark'`, and the two repaired
defects both RESTORE a missing affordance (an input border that had disappeared when its error
cleared, and 60px of top padding).
Style-convention adherence: correct half; lifted rules intact.

Out-of-lane observations:
- Captures: `_captures/w1/after-riders` was not present when I read; `after-fixed` never appeared
  either. Across three rounds this wave has had no pixel-level verification I could read — every
  claim in my sections is arithmetic and probes. The fresh verification seat is still the first look.
- Probe trees not mine, still registered: `probe-u2.2-recipe`, `probe-w1d-tests`. Left alone.

---

## Round 1 (fix delta)

Head reviewed: `feat/uiparity-w1` @ `044578a` (fix diff `fc75577..044578a`), shared worktree
`worktrees/w1-wave`, read-only. Authority: the fix-mapping comment on PR #41. Read this round: the
mapping table; `3c1eac3` (F14) in full including its commit body; `7ba1825` + `a5af4b2` (F19);
`glass-tokens.ts` and `controls/header-chrome.ts` at head; and all 22 fragment consumers re-grepped
for a shorthand after the spread.

**Probe:** `probe/w1d-web-litedge` @ `044578a`, cut + installed (9.9 s), one test file added and
deleted; `git status --short` empty at teardown; removed with `tools/worktree-remove.ps1` —
*"unlinked 549 junction(s) in 2 pass(es) · .pnpm 240 → 240 · OK"*. jsdom, React 19.2, motion-ON
(default; no animation involved).

**Leftover probe trees, not mine:** `probe-u2.2-recipe` and `probe-w1d-tests` are registered and on
disk. Neither is in my `probe-w1d-web-*` namespace and `probe-w1d-tests` may be live under another
seat, so I did not touch either. Flagging for the orchestrator.

---

### F14 (my round-0 HIGH) — the lit-edge escape hatch · commit `3c1eac3` · **FIXED**

**The author's refutation of my prescribed fix is CORRECT, and I withdraw it.** I re-ran my own
probe at the merged head against all four forms. Values are `borderTopColor` as jsdom reads it back;
the highlight is `rgba(184, 212, 240, 0.08)`:

```
form                                          first paint                  after update
SHIPPED  {...glassCard, borderRight/Bottom/LeftColor}
                                              rgba(184, 212, 240, 0.08)    rgba(184, 212, 240, 0.08)   PASS
MINE     destructure, both keys every render  rgba(184, 212, 240, 0.08)    rgb(2, 2, 2)                FAIL on update
MINE     borderTop: '1px solid <h>'           rgba(184, 212, 240, 0.08)    rgb(2, 2, 2)                FAIL on update
OLD      docblock form (round-0 finding)      rgb(1, 1, 1)                 rgb(2, 2, 2)                FAIL on first paint
```

Both of my arms emit React's own dev warning on the update — *"Updating a style property during
rerender (borderColor) when a conflicting property is set (borderTopColor)"* and the `borderTop`
variant of it. My round-0 remedy fixed first paint and left the update path broken; the commit body's
diagnosis is exactly right — **re-declaring an unchanged longhand is not enough, because React writes
only the keys that CHANGED**, so the unchanged edge is skipped while the changed shorthand is written
and erases it. The shipped form is the only one of the four with no shorthand in it at all, and it is
the only one that survives both paints. The probe also confirms it still does its job: all three
sides read `rgb(2, 2, 2)` after the update while the top holds the highlight.

The docblock now carries that one form at both sites (`:25-45`, `:143-152`), names the two that look
right and are not, adds the `boxShadow` compose-don't-replace clause (A32's inset would otherwise be
dropped), and states that a new consumer must be added to `CONSUMERS` in the pin file or it is
unobserved. The two broken forms are kept as **negative controls** rather than deleted, which is the
right call: they are tripwires on the two platform behaviours the rule rests on.

**Blast radius, checked:** no consumer changed, and re-grepping all 22 spread sites at head finds no
`border` / `borderColor` / `boxShadow` written after a spread — the only post-spread border-family key
anywhere is `borderRadius` (AudioRecorderScreen:159,205; DvrInfoScreen:195; ImportModal:184), which
does not touch border colour. F20's `as const satisfies CSSProperties` on the three header fragments
leaves `glassWizardHeaderBar`'s `inset 0 1px 0` intact.

### F19 (my round-0 MEDIUM) — the nested-shadow reconciliation · `7ba1825` + `a5af4b2` · **FIXED**, refutation ACCEPTED

I asked for the reconciliation to be written down and named §2.A's recipe as the source the docblock
was ignoring. The author went to the phone source instead and found the governing sentence, which is
better evidence than either source I cited — `Colors.ts:376-378`, quoted verbatim in the docblock:
*"A defined border plus a genuinely lit top edge is how a raised panel is drawn without a shadow,
which matters here because the iOS shadow on this component is dead ... and repairing it is held."*

That settles both halves of my finding at once, and it settles them against me: the nested tier's
absence of a shadow is the phone's explicit intent, not the matrix's silence, and the dead-iOS-shadow
fact I raised as a counter-example is the phone's own stated *reason* for the design. The second half
is answered too — `SHADOW_CARD`'s docblock at `:99-101` now states that A44/A54 port the phone's
**intended** shadow, that its iOS rendering is dead, and that the web has no equivalent defect. I
accept that: a rendering bug on one platform is not a reason to omit a ratified value on another.

F19 also went further than my finding asked, correctly: `SHADOW_CARD` now ships **both scheme halves**
(`light: '0 3px 8px rgba(30,58,138,0.18)'` — tinted, not black, and a pixel shorter), which D2-amended
requires and which I did not catch. Dark resolves to `'0 4px 8px rgba(0,0,0,0.15)'`, byte-identical to
what shipped before, so `glassCard.boxShadow` and `ExportCaseCard`'s idle shadow are unchanged in the
scheme the demo renders — no visual regression from this fix.

---

### New findings this round

None. Neither fix introduced a regression in its blast radius, and nothing else in
`fc75577..044578a` touches my territory: the remaining commits are drift-guard and pin work (F16,
F17, F21, F18, F22), a type-level scheme binding (F15), `as const satisfies` on fragments (F20), and
docs.

---

## Web Summary (Round 1 fix delta)

CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0
Round-0 findings: HIGH 1 **FIXED** (my prescribed remedy refuted on evidence and correctly
replaced) · MEDIUM 1 **FIXED** (refutation accepted at phone source)
Verdict: APPROVE

Marketing<->demo isolation: **preserved** — the fix diff contains no `components/`, `lib/` or
`app/(default)/` file.

Bundle impact: **none in the fix diff; still unverified at the head.** No dependency, no import
shape, no lazy->static change. I have not seen a W1 build log in either round — the path named in
round 0 (`_captures/w1-assembly-gates.log.build`) does not exist, and the re-cut set at
`_captures/w1/after-fixed` was not present when I read.

Browser-resource cleanup: **n/a** — no effects, listeners, timers or observers touched.

Accessibility: **no change.** No colour value moved in the shipped scheme; `SHADOW_CARD.dark` is
byte-identical to the literal it replaced, so every ground measured in round 0 still holds.

Style-convention adherence: **correct half; lifted rules intact.** Inline `CSSProperties`
throughout; the lifted `borderRadius: 16` at `AudioRecorderScreen:159,205` and `10` at the two
nested adopters survive; frame math untouched.

Out-of-lane observations:
- Two probe worktrees are registered and on disk that are not mine — `probe-u2.2-recipe` and
  `probe-w1d-tests`. I left both alone (`probe-w1d-tests` may be live under the tests seat). If they
  are orphans, they need `tools/worktree-remove.ps1`, not `git worktree remove`.
- No W1 verification captures exist that I could read in either round (no `before/`, 6 of 9
  `after/` groups at round 0, no `after-fixed/` now). Every visual claim in both my rounds rests on
  arithmetic and probes, not on pixels — the fresh verification seat should be treated as the first
  pixel-level look at this wave.
