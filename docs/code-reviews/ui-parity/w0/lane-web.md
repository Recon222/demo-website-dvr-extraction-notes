# Lane: web — W0 (phase U0), PR #39

## Round 1 (fix delta)

Head reviewed: feat/uiparity-u0 @ 15e5a6f (fix diff 10553c8..15e5a6f), shared worktree
worktrees/u0-phase, read-only. Authority: the fix-mapping comment on PR #39. Read this round: the
mapping table; 8f876b9 (F1) in full; 7c245fe/001627e (F6) as F1's blast radius, because LIT_GLOW
calls withAlpha at module scope; 824df2a (F8) and 92eb61e (F10) for my MEDIUM/LOW; glass-tokens.ts,
input-theme.ts, scale.ts:84-150 and ledger §89/§93 at head. Contrast re-measured in a per-lane
scratchpad subdir (scratchpad/lane-web-r1/); no probe worktree needed — no mutation was required to
settle anything this round.

**Capture provenance, and it matters:** _captures/w0/DIFF.md:6 names the AFTER set as
feat/uiparity-u0 @ **7099e54** — the PRE-fix head (after/06-media/12-s4-library-tabs.png is stamped
00:52; 8f876b9 landed 01:29). **The verification seat has NOT re-run at the merged head**, so the
AFTER captures still show the DEFECT, not the fix, and nothing below is claimed off them. The same
applies to assembly-gates.log.build — the 107 kB First Load figure is 7099e54's.

---

### F1 (my round-0 HIGH) — six accent-as-mark sites -> colors.link · commit 8f876b9 · **FIXED**

All six sites read at head, not from memory:

| Site | Head | Value |
|---|---|---|
| active-tab underline | MediaLibrarySheet.tsx:225 | `2px solid ${isActive ? colors.link : 'transparent'}` |
| active tab label | MediaLibrarySheet.tsx:226 | `isActive ? colors.link : '#7a9fc4'` |
| tab badge numeral | MediaLibrarySheet.tsx:245 | `isActive ? colors.link : '#7a9fc4'` |
| selected-row rule | MediaLibrarySheet.tsx:576 | `2px solid ${selected ? colors.link : 'transparent'}` |
| spinner arc | ExportModal.tsx:161 | `borderTopColor: colors.link` |
| lit card outline + glow | ExportCaseCard.tsx:49, 131-132 | `border: 1px solid ${colors.link}`; `LIT_GLOW = withAlpha(colors.link, 0.35)` |

Re-measured at 15e5a6f (WCAG 2.1, source-over composited, my own implementation):

```
surface                         master  same-ground pre-U0.3   U0.3    FIXED(link)   floor
tab label / colors.background     5.92          5.01           2.54       9.60        4.5
badge numeral / 0.16 wash         4.83          4.06           2.05       7.78        4.5
spinner arc / its 0.25 track      4.79          3.58           1.81       6.86        3.0
lit outline / gradientPanel       4.90          4.81           2.44       9.23        3.0
```

Every site clears its floor with room. grep at head confirms the structural claim in the commit
message: GLASS.accentFrom now has **zero** foreground consumers — the only live references left are
gradientAccent (the CTA fill), T.accentFrom/T.accentTo, and the @theme mirror pin. So U0.3's
5.80/8.32 measurement is once again true of every site that spends the token.

**Blast radius, checked:** LIT_GLOW is evaluated at module load, and F6 (7c245fe) added a
warnUnparseable dev-console arm to withAlpha in the same round. #b8d4f0 takes the 6-digit hex branch
of parseColor, so the arm is not reached and the returned string is byte-identical to the pre-F6
result — no import-time console noise, no changed value. The two moved pins (ExportHub.test.tsx,
ExportModal.reduced-motion.test.tsx) moved WITH the value and are the tests lane's to judge.

**Ruling on the refutation — arithmetic ACCEPTED, conclusion PARTLY REJECTED.**
The author's same-ground figures reproduce exactly on my independent implementation: **5.01 / 4.06 /
3.58**. They are the right way to isolate U0.3's own contribution, and I accept them as such. But
they do not support *"the inversion was latent before U0.3"* for three of the four surfaces: on the
post-U0.1 ground with the OLD accent, the tab label (5.01 >= 4.5), the spinner arc (3.58 >= 3.0) and
the lit outline (4.81 >= 3.0) all still CLEARED their floors. U0.3 is the sole cause at those three.
The claim holds for exactly one site — the badge numeral, already at 4.06 < 4.5 same-ground, which
U0.1's lighter ground broke (4.83 -> 4.06) before U0.3 drove it to 2.05.
My round-0 pairs (5.92 -> 2.54 etc.) are master -> 7099e54, i.e. what the PR as a whole did to the
shipped pixels, which is the number the before/after captures show and the one a user would have
experienced. Both framings are correct and answer different questions; neither changes the fix, and
the fix is right either way.

### MEDIUM 1 — #2B8CC1-as-text crossed the AA line when the ground lightened — **FIXED as filed**

I asked for a ledger entry, not a sweep. docs/code-reviews/deferred.md **§89** carries all fourteen
sites, the measured pair (4.66 -> 3.94, plus the 4.35 -> 4.25 glass ceiling), the D3 reason, and a
concrete trigger: matrix **A66 (U2)** + **U6** re-measure as their closing act, with any site still
below 4.5 after U6 reopening at HIGH, and a grep-observable violation condition. That is the format's
bar met.

### MEDIUM 2 — two hand-typed rgba(28,78,132,0.5) copies of colors.border — **PARTIAL, accepted**

T.borderSoft is gone (F8 824df2a) — it was dead, which is a better outcome than deriving it.
GLASS.borderSoft (glass-tokens.ts:59-63) stays hand-typed, now with a disclosed reason I accept on
the merits: **U1.1 derives this token from GLASS_TIER.dark.card** along with gradientCard,
gradientPanel and borderAccent, so hand-deriving it now would be the same edit twice in the file U1.1
opens. One residual, and it is why this is PARTIAL not FIXED: that deferral lives **only in a code
comment**, with no ledger row and therefore no expiring trigger (§93 covers the unchanged
high-frequency hexes, not this). The repo's own rule is "Log every deferral there before merging."
Also note the comment's second reason — "this string is pinned byte-exactly" — is circular; the U1.1
argument carries it alone. One ledger row with U1.1 as the trigger closes this.

### LOW — marketing shell's copied backdrop — **FIXED** · commit 92eb61e (F10)

components/marketing/phone-frame.tsx:6-14 now says the **geometry** is copied and the colours are
marketing's own and deliberately do not track the demo, naming the #002853 re-base explicitly;
:52-53 carries the matching inline note. That is the second of the two options I offered, and the
better one — marketing is not a parity target.

### LOW — withAlpha per render in ExportCaseCard — **FIXED**, folded into F1

Now the module const LIT_GLOW (ExportCaseCard.tsx:49-51), citing the repo's hoist convention, and
still derived from the same token as the outline it haloes.

---

### New finding this round

```
[LOW] The source guard that would keep GLASS.accentFrom fill-only was proposed by F1 and then
      landed by nobody — the two seats each deferred to the other on one file
File: features/demo/ui/__tests__/glass-tokens.test.ts (absent; F1 proposal in 8f876b9's message)
Issue: F1's commit message says the guard "belongs in glass-tokens.test.ts, which another seat is
  editing this round (F3) — proposed in the report instead of taken, to keep one writer per file."
  F3 (696f3bb) then edited that file for the literal scans and did not add it. At head the file
  references accentFrom only in the @theme mirror pin, the shape pin and the T alias pin — none of
  which observes WHERE the token is spent. So the invariant F1 establishes ("zero foreground
  consumers") is currently held by nothing but the commit message.
Evidence: grep of accentFrom in glass-tokens.test.ts at 15e5a6f returns lines 132, 157, 195, 197
  only. The one-writer-per-file convention is sound; what failed is that the handoff had no owner.
Fix: one source scan in glass-tokens.test.ts asserting no file under features/demo/ui/** spells
  GLASS.accentFrom / T.accentFrom in a color:, borderTopColor:, borderLeft: or borderBottom:
  position — or, if that is judged too brittle, a ledger row with U1.1 as the trigger. Either is
  fine; the current state (neither) is not.
```

**On the coordinator's residual — four of six F1 sites carry no style pin: not mine.** Whether each
re-pointed site needs its own rendered-value assertion is test-analyzer's call under the contract,
and I decline to file it. The web-lane half of that concern is the token-level guard above, which is
the one that prevents recurrence rather than detecting it site by site.

---

## Web Summary (Round 1 fix delta)

CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 1
Round-0 findings: HIGH 1 **FIXED** · MEDIUM 1 **FIXED** · MEDIUM 1 **PARTIAL (accepted)** · LOW 2 **FIXED**
Verdict: APPROVE with comments

Marketing<->demo isolation: **preserved.** The only marketing file in the fix diff is
components/marketing/phone-frame.tsx, comments only. No import of @/features/demo or ui/tokens/* from
components/, lib/ or app/(default)/.

Bundle impact: **none in the fix diff; unverified at the merged head.** No dependency, no import
shape, no lazy->static change; the only new imports are `colors` into two files the demo already
loads. The 107 kB figure in assembly-gates.log.build is 7099e54's and should be re-cut with the
captures.

Browser-resource cleanup: **n/a** — no effects, listeners, timers or observers touched.

Accessibility: **round-0 gaps closed.** The four re-measured surfaces clear their WCAG floors at the
merged head (9.60 / 7.78 / 6.86 / 9.23), and the selected tab is now the most legible mark in its
control (link 9.60 vs the inactive #7a9fc4 at 5.31) rather than the least. primaryLight was correctly
refused: 5.24 is below the inactive tabs' 5.31, which would have preserved the visible half of the
defect — I withdraw it as an alternative.

Style-convention adherence: **correct half.** Inline CSSProperties throughout; no Tailwind entered
features/demo/ui/**; no lifted pixel value, frame math or keyframe touched; no new animation.

Out-of-lane observations:
- The AFTER captures and the build log are pre-fix (7099e54); the verification seat should re-cut at
  15e5a6f before merge. Two things want eyes in that run, both unverified by me: the lit
  ExportCaseCard outline and its halo are now a pale near-white (#b8d4f0 at 0.35) where they were a
  saturated blue — correct by the token rule and by the numbers, but a real change in the Export
  Hub's character; and the Media Library tab strip should now show the selected tab clearly brightest.
- parseColor at head accepts 4- and 8-digit hex, so withAlpha('#rrggbbaa', a) now REPLACES the input's
  own alpha rather than returning it unchanged. Documented and intended (U5.4's four sites), and no
  current caller passes one — noting it for U5.4, not filing it.
