# Lane: web — W1 (phase U1), PR #40 / fix round PR #41

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
