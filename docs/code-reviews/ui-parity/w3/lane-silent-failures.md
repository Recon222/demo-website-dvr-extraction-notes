# Lane — silent failures (W3)

## Round 2 (riders)

**Head:** `feat/uiparity-w3` @ `3084065` · **Rider diff read:** `c304a8c..3084065`
**Scope:** my item **F76** (`SAMPLE_NOTICE`), plus **F80** (`activationOrigin` consumption) on request.
**Probe worktree:** `C:\Users\kriss\AppData\Local\Temp\claude\probe-w3r2-sfh`, cut at `3084065`,
detached, own `pnpm install`. **Torn down and verified:** `unlinked 549 junction(s) in 2 pass(es)` ·
main checkout `.pnpm` 240 → 240 · exit 0. Tree restored between probes, `git status` empty before
teardown. Regression sweep at this head, post-restore: **142 files / 1,966 passed + 2 todo, 0 failed.**

| Item | Status | Evidence |
|---|---|---|
| **F76** — FallbackMode notice unguarded | **FIXED** | Both notice-family probes KILL on the new member; both `ImportModal` sites import it; badge unregressed |
| **F80** — single-use gesture origin | **Sound, swallows nothing** | Reverting the one line KILLS 2 of the 3 new cases |

---

### F76 — FIXED

`SAMPLE_NOTICE` landed as a separate member and both `ImportModal` sites (`:279`, `:295`) now import
it. Values unchanged, so zero rendered bytes moved.

**The separate-member call is right, and for the reason given.** A 9px uppercase chip and a 12.5px
paragraph are different recipes at different alphas (`0.12`/`0.3` vs `0.1`/`0.28`); collapsing them
would have moved rendered bytes at four sites for a tidiness D12 never asked for. What D12 constrains
is the HUE and the ROLE, and both members are now held to the same five cases. The three
non-provenance ambers (`MediaCaptureScreen`, `MediaLibrarySheet`, `PdfPreview`) are correctly left
out with a stated reason — they are cautions, not provenance claims, and the freeze-and-defend arm of
D12 does not reach them. I agree with that line and am not re-filing them.

**Probes — my r1 notice-family pair, run verbatim against BOTH members, one mutation each, tree
restored between (canonical source `features/demo/ui/controls/sample-badge.ts`):**

| Mutation | Verdict |
|---|---|
| `SAMPLE_NOTICE.background = 'rgba(125,95,16,0.1)'` (warningLight at the notice own alpha) | **KILLED** — `SAMPLE_NOTICE: is not a warning token wearing an alpha — the HUE identity` |
| `SAMPLE_NOTICE.background = 'rgba(0,0,0,0)'` (paints nothing) | **KILLED** — `SAMPLE_NOTICE: PAINTS — the fill is visibly present on its own ground` |
| `SAMPLE_BADGE.background = 'rgba(125,95,16,0.12)'` (no-regression control) | **KILLED x2** — the original describe and the MARKS row both red |
| `SAMPLE_BADGE.background = 'rgba(0,0,0,0)'` (no-regression control) | **KILLED x2** — same pair |

The badge keeps its own stricter describe alongside the table (`:1100` and `:1179`), so nothing the
r1 fix bought was traded away for the generalisation.

**Does the MARKS-table shape keep the defence honest for a third surface?** Structurally yes — the
row is a `[name, mark, ground]` tuple under `as const`, so a third surface cannot join without naming
a ground, and all five cases fan out over it via `it.each`. That is the right shape and it is better
than the two-copy alternative. Two caveats, filed together below.

---

#### [LOW] The MARKS table takes each row ground on trust, and the first row added under it names a tier its component does not render on

**File:** `features/demo/ui/__tests__/palette-contrast.test.ts:1180-1187`

**Code:**
```ts
const ELEVATED = [GLASS_TIER.dark.elevated.gradient[0], palette.dark.background]
const MARKS = [
  ['SAMPLE_BADGE',  SAMPLE_BADGE,  NESTED],
  ['SAMPLE_NOTICE', SAMPLE_NOTICE, ELEVATED],
] as const
```

**Touch-point 1 — the ground is wrong.** The docblock says *"the notice renders on ModalShell
elevated tier"*. It does not. `elevated` is the modal HEADER BAR only (`_shared.tsx:180`,
`modalHeaderBar`); the body the notice renders in is `modalSheet`, whose `background` is
`colors.background` flat (`_shared.tsx:117`). So all five `SAMPLE_NOTICE` cases composite over a
stack the component never paints.

Measured both ways at this head:

```
ASSERTED (elevated):          presence 12.24 (>3) · vs warning 67.18 (>10) · legibility 6.22 (>4.5)
REAL (colors.background):     presence 13.78 (>3) · vs warning 68.58 (>10) · legibility 8.39 (>4.5)
```

**No verdict flips, and the error is conservative** — the asserted ground is the stricter of the two
on all three metrics. That is why this is LOW and not higher: nothing is green today that should be
red. What is wrong is the shape, and the shape is what the table exists to hand to the next author:
nothing ties a row ground to the real render, and the very first row added under the new mechanism
got it wrong while its docblock asserted the opposite. A third surface inherits both the empty slot
and the wrong precedent.

**Touch-point 2 — the presence floor quietly moved 5 to 3.** The badge-only describe bounds presence
at `> 5` (`:1136`); the shared table bounds it at `> 3` (`:1198`), with no note saying why. It was
not needed: measured, `SAMPLE_BADGE` scores **14.90** and `SAMPLE_NOTICE` **12.24** on their own
grounds, so both clear 5 by more than 2x. The looser bound only ever applies to a future member — at
`> 3` a third mark could ship the same amber at alpha **0.03** (ΔE 3.78) and pass, where `> 5` stops
it at 0.04 (5.01). Both are essentially invisible washes, and 3 is above the 2.3 JND so it is
defensible, but an unexplained loosening in the guard a later surface inherits is the wrong direction
for a freeze-and-defend arm.

**Fix.** One line each: point the `SAMPLE_NOTICE` row at `[palette.dark.background]` (or import
`modalSheet.background`, which makes the row red if the shell ground ever moves), and either restore
the floor to 5 or keep 3 and say why in one sentence. Correcting the docblock sentence about the
elevated tier goes with it.

---

### F80 — sound; swallows nothing

Consuming the capture (`activationOrigin = null` immediately after the connectivity check) is the
right guard, and the comment states the real reason correctly: `isConnected` proves the element still
EXISTS, not that the gesture which set it raised *this* overlay. Traced for swallowing:

- **It cannot consume when it should not.** The `if (!enabled) return` sits above it, so a gated
  mount neither reads nor clears the origin.
- **Nothing else reads `activationOrigin`.** The module exports only `trackDialogActivationOrigin`,
  and consuming does not disarm tracking — the next pointerdown/keydown re-arms it.
- **No StrictMode double-invoke in this app** (grepped: the only `StrictMode` import under `app/` and
  `features/demo` is inside one `ExploreChecklist` test), so the mount-cleanup-mount path that would
  consume the origin before the real mount does not run in production or in the suite.
- **The one degradation I went looking for is not reachable and is not a lie.** Two overlays mounting
  in the SAME commit from one gesture would have the child consume and the parent fall back to
  `document.activeElement`; the parent opener would then likely be disconnected at unmount, and
  `canTakeFocus` leaves focus where it is. That is the documented non-error outcome, not a wrong
  jump — and all four call sites (`CentredDialog`, `ExportActionSheet`, `MediaLibrarySheet`,
  `PdfPreview`) mount from distinct commits, so it does not occur today.
- **The stacked case the comment claims to fix is real and now correct:** an `AlertDialog` raised over
  an open `CentredDialog` used to inherit the same button and yank focus out from behind the scrim;
  it now falls back to the confirmation own panel.

**Probe:** deleting the single `activationOrigin = null` line **KILLS 2 of the 3** new cases (the
second-overlay case and the live-focus fallback case). The fix is pinned, not merely written.

---

### Round 2 summary
F76 **FIXED** (4/4 probes KILLED — both members, plus badge no-regression controls) · F80 **sound, nothing swallowed** (revert probe KILLS 2 of 3).
New findings: **1 LOW**, two touch-points, both in the MARKS table (the `SAMPLE_NOTICE` row ground is `elevated` where the component renders on `colors.background`; presence floor loosened 5 to 3 unremarked). Neither changes a verdict today — measured, the wrong ground is the stricter one.
Fix-introduced regressions: **none.** 142 files / 1,966 passed, 0 failed at this head after restore.
Verdict: **APPROVE with comments.**

---
---

## Round 1 (fix delta)

**Head:** `feat/uiparity-w3` @ `eb98295` (fix-merge `3dc8676`) · **Fix diff read:** `7d0bf57..3dc8676`
**Authority:** the fix-mapping comment on PR #43. My r1 findings map to **F51 (HIGH)**, **F56**, **F57**,
**F58** (MEDIUM) and **F66** (LOW); F64 checked on request.
**Probe worktree:** `C:\Users\kriss\AppData\Local\Temp\claude\probe-w3d-sfh-fixes`, cut at `eb98295`,
detached, own `pnpm install`. **Torn down and verified:** `unlinked 549 junction(s) in 2 pass(es)` ·
main checkout `.pnpm` 240 → 240 · exit 0. Tree restored between every probe; `git status` and
`git diff` both empty before teardown. Regression sweep at the fixed head, post-restore:
**148 files / 2,092 passed + 2 todo, 0 failed.**

Warm seat: I re-read only the fix diff for these five files plus `primitives/useOpenerFocusReturn.ts`
(new), not the r1 artefact. Nothing was confirmed from memory — every verdict below is a probe or a
line I opened at the current SHA.

| Finding | r1 severity | Status | Evidence |
|---|---|---|---|
| **F51** — D12 badge defence vacuous | HIGH | **FIXED — better than prescribed** | Both r1 survivors now KILL; every numeric claim in the rewrite re-measured and exact |
| **F56** — stripConsoleCalls fails open on an unbalanced paren | MEDIUM | **FIXED** | r1 escape KILLED |
| **F57** — FROZEN exemption applied per LINE | MEDIUM | **FIXED** | r1 escape KILLED |
| **F58** — token-less mount promises a map that is not there | MEDIUM | **FIXED — refutation accepted** | Both halves probed; the refutation is correct at source |
| **F66** — settings ALLOWED keyed by hex | LOW | **FIXED** | r1 escape KILLED, now names the file |

---

### F51 — FIXED, and the fix corrects a false claim rather than only the metric

**Probes re-run verbatim on the canonical source (`features/demo/ui/controls/sample-badge.ts`),
one mutation each, tree restored between:**

| r1 probe | Mutation | r1 | Now |
|---|---|---|---|
| **B** | `background: 'rgba(125,95,16,0.12)'` — warningLight at the badge own alpha | SURVIVED | **KILLED** — *"SAMPLE_BADGE.background is `warningLight` under an alpha — D12 freezes it as its own value: expected [125,95,16] to not deeply equal [125,95,16]"* |
| **C** | `background: 'rgba(0,0,0,0)'` — the fill deleted | SURVIVED | **KILLED** — *"expected 0 to be greater than 5"* (the new presence floor) |

Two new cases carry them, and they are the right two: an **RGB identity check under the alpha**
(the only thing that can see probe B form, since a translucent warning token passes every perceptual
bound) and a **two-sided presence floor** against the bare card (probe C form). The bound is now
two-sided in plan §9 clause 2 own shape — far from the warning surface *and* near enough to nothing —
with the tautology control written out explicitly (`a fill that paints nothing must FAIL`).

**On the honesty question the coordinator raises — is the new docblock claim true?** Yes, and I
measured all of it rather than reading it. From the module own helpers at the fixed head:

```
MATCHED-ALPHA (docblock claims 3.6-6.2):  warning 3.92 · warningDark 3.56 · warningLight 6.16 · warningAccent 3.56
AS-RENDERED fill vs a warning surface:    65.31   (bound > 10)
PRESENCE, badge vs bare card:             14.90   (bound > 5)
severityTone(warning).background:         #7d5f10 (opaque, as the docblock says)
```

So the rewrite is right on both counts, and this is the part worth recording: **D12 own prediction
was wrong and the fix says so out loud.** D12 asserts the two "will not collide" because they are
"a fill and a foreground of different families"; at matched alpha they are ΔE 3.56–6.16 apart — one
hue family. The fix does not paper over that. It re-states the real separation (a translucent tint
under an amber label vs an opaque ground under a near-white `warningOnLight` label), pins the pair
**as rendered**, and adds the identity check for the hue underneath the alpha. That is a correction to
a ruling stated rationale, evidenced, in the docblock — the right way to close a finding of this
class, not the easy way.

The comparison target also moved from the raw `palette.dark.warningLight` to
`severityTone(warning).background`, which is what a Banner actually paints. Correct, and it is the
seam-consuming form W2/F26 asks for.

I withdraw my r1 "pin error/info too" suggestion: measured, the badge sits ΔE 20.0 from an info
surface, 48.6 from success and 77.2 from error. D12 scopes the constraint to the warning family and
there is no near miss elsewhere to guard.

**Consumer side (the second F51 commit) — verified, not taken on trust.** All five sites now import
`SAMPLE_BADGE`: `ImportResultAccordion`, `OcrCaptureScreen`, `MediaLibrarySheet`, `MediaCaptureScreen`,
`AudioPreviewScreen`. Zero surviving byte-copies of the trio. The docblock also corrects its own
"two surfaces" census to five and marks it as having been false when written.

**Bounded residual (recorded, not filed).** The identity check is exact-RGB, so
`rgba(126,95,16,0.12)` — warningLight with one channel moved by 1 — SURVIVES all six D12 cases
(probed). Not worth a row: the realistic drift vector is `withAlpha(colors.warningX, alpha)`, which is
exact identity and now reds, and nobody hand-types a one-off warning hex. Noted so a later reader does
not rediscover it as a hole.

---

### F56 — FIXED

`stripConsoleCalls` now tracks quote state and backslash escapes, so parens inside a string literal
are data and cannot move `depth`. My r1 escape re-run verbatim on
`features/demo/ui/screens/map/MapScreen.tsx` — the planted em-dash violation plus an unbalanced open
paren in the console string above it — is **KILLED** (`+ "file": "screens/map/MapScreen.tsx"`,
1 failed / 6 passed). Two regression cases shipped with it, including the escaped-quote arm, which is
the second door into the same fail-open and was not in my prescription.

I probed the new scanner for a fresh escape and found none worth filing: comments are stripped before
it runs, so neither comment form can open a phantom quote; an apostrophe inside a double-quoted
argument and a double quote inside a template literal are both correctly ignored; and an unterminated
quote (the only way the quote state could stay open to EOF) is a compile error the pre-flight catches.

---

### F57 — FIXED

The frozen exemption is now checked at the OCCURRENCE via `coversOccurrence`, which walks every
instance of the frozen string on the line rather than the first. My r1 escape re-run verbatim on
`features/demo/ui/screens/import/PickerStage.tsx:31` — a second, demo-originated em-dashed string
appended to the frozen line — is **KILLED** (`+ "file": "screens/import/PickerStage.tsx"`). The
committed unit case pins both directions (the frozen dash covered, its line-mate not), and the comment
names the class lineage (F32 file-for-role, F33 line-for-arm, F57 line-for-string) so the next scan
author inherits it.

---

### F58 — FIXED, and the refutation of my option 2 is correct at source

The fix took option (a) — a required `canPlaceRing` prop driving **both** the sheet hint and the
anchor notice — and explicitly refused my option (b) (discriminate on whether `getCenter()` returned).
**The refutation holds, and it is a better answer than mine.** Verified at source:

- `MapCanvas.tsx:335` opens the map with `center: [DEFAULT_MAP_CENTER[0], DEFAULT_MAP_CENTER[1]]` —
  the same frozen constant the anchor chain falls through to. So when a token exists,
  `DEFAULT_MAP_CENTER` genuinely **is** the current view, and "centred on the current view" is true.
- `mapRef.current` is assigned inside an async IIFE after two dynamic imports (`MapCanvas.tsx:315-338`),
  so `getCenter()` is null for the first frames of **every** mount, token or not. My option (b) would
  have told a visitor with a working map that the map was unavailable, in precisely the window they
  are most likely to be pressing things. That is a new lie in place of the old one.

**Probe, both halves, at the fixed head (jsdom render, canonical sources):**

- **Token-less** — `[data-map-fallback]` present; `filter-hint` reads *"The live map is unavailable,
  so the proximity ring cannot be moved."*; the long-press sentence **absent**; the toggle fires
  *"Nothing is plotted and the live map is unavailable, so proximity is centred on the demo default
  location."*; the "current view" sentence **absent**.
- **With `NEXT_PUBLIC_MAPBOX_TOKEN` stubbed** — the phone hint and the "current view" notice both
  come back.

**2 passed.** Three anchor provenances now produce three outcomes, which is what the finding asked
for: a plotted row is silent, a real map says "current view", the constant says it is a constant.
`canPlaceRing` is read inside the component from the same expression `MapCanvas` decides on, not
captured at module scope — which is why the honest branch is testable at all.

**Fix-introduced regression check on the same commit (F62, not my finding but in the blast radius).**
`MapControls` now receives `proximityActive={proximityFiltering}` (`proximityResult !== null`) instead
of the raw request, so the on-map chip no longer claims a filtered count while the Turf chunk is still
loading. That is a real silent-failure fix in my lane and I confirm it is sound. One consequence,
traced and accepted: during a hung (not failed) chunk load the chip and its dismiss control do not
render, so the on-map escape hatch is briefly absent — but the sheet Toggle deliberately keeps reading
the request (`proximityActive`), so there is always a route to turn it off, and the failure path still
reverts the toggle and fires `PROXIMITY_UNAVAILABLE`. No finding.

**Residual (recorded, not filed).** `canPlaceRing` is token *presence*, not map *health*. With a token
and a terminal map failure, the hint still names a long-press. Reaching it requires the sheet to be
open already, because the error overlay (z 25) covers the filters button (z 15) — and that overlay is
an alert region that names the failure, so the visitor is not misled about the map itself.

---

### F66 — FIXED

`ALLOWED` is re-keyed as `file:hex` with a template-literal `Site` type, so the path is inside what
tsc checks and inside what the inventory case compares. My r1 escape — `#5d7a9a` planted in
`settings/SettingsNavBar.tsx` — is **KILLED**, and the failure message names the new file
(`+ "SettingsNavBar.tsx:#5d7a9a"`) plus the reason (*"an exemption granted to one file no longer
excuses the same hex in another (F66)"*). This is W2/F32 remedy with the axes swapped, and the comment
says so.

---

### F64 (`useOpenerFocusReturn`) — error paths checked, sound

Not my finding; checked on request. The paths that could swallow:

- `canTakeFocus` returns false for a disconnected or disabled opener and the cleanup then leaves focus
  where it is rather than forcing it somewhere arbitrary. That is the correct call, and the docblock
  says why — a destructive action legitimately removes its own opener.
- The captured origin is connectivity-checked **twice** (at mount and at restore), so a stale
  `activationOrigin` left by an earlier gesture cannot become this overlay opener.
- The failure mode I went looking for — an always-mounted, `visible`-gated sheet where the hook would
  capture an opener at mount, focus nothing, and never hand back on close — **does not exist here**.
  All four call sites (`CentredDialog`, `ExportActionSheet`, `MediaLibrarySheet`, `PdfPreview`) are
  conditionally mounted by their hosts, so mount is open and unmount is close. The `enabled` gate is
  unused at every site and defaults true, which is consistent.
- The three sites that pass a `focusRef` all put `tabIndex={-1}` on the target element, so
  `focusRef.current.focus()` is not a silent no-op. `PdfPreview` deliberately passes no ref
  (restore-only), which the docblock justifies.
- `trackDialogActivationOrigin()` is idempotent, guards for a missing `document`, and its listeners are
  intentionally permanent. No finding.

---

### New finding

#### [MEDIUM] The FallbackMode notice — the other half of the demo provenance machinery — carries the D12 amber by hand at two sites, guarded by nothing

**File:** `features/demo/ui/screens/ImportModal.tsx:278` and `:294` (also `chrome/PdfPreview.tsx:170`,
`screens/MediaLibrarySheet.tsx:585`, `screens/MediaCaptureScreen.tsx:891-892` — same hue, three
further alphas)

**Code:**
```tsx
{result.notice && (
  <div style={{ fontSize: 12.5, color: '#ffd07a', background: 'rgba(255,200,90,0.1)', border: '1px solid rgba(255,200,90,0.28)', ... }}>{result.notice}</div>
)}
```

**Issue.** `result.notice` is `fallbackNotice(res.fallbackMode)` — *"Live model not configured.
Imported the sample request instead."* It is the same provenance claim the Sample data badge makes,
on the surface that matters more, and it is the one D12 own ruling names first. The F51 fix gave the
badge chip a module, a role-based rationale and a two-sided measured pin; these sites got none of it.
They spell `#ffd07a` on `rgba(255,200,90,0.1)` inline, at an alpha that matches no other site, and
**no test pins either value** (grepped: zero hits for `255,200,90,0.1` and `,0.28` across every
`*.test.ts` / `*.test.tsx`). `banner.test.tsx` deliberately excludes `ImportModal.tsx` from both
`ADOPTED` and `HANDED_BACK` on the U3.3 refutation that "D12 defends the FallbackMode amber" — but
nothing subsequently *built* that defence, so the exclusion currently points at an empty room.

**Adversarial input / sequence.** The same one F51 was filed for, one surface over: a later package
re-derives this notice from the ported warning family (or a designer nudges the amber), and a
"we substituted sample data for your document" banner becomes indistinguishable from an ordinary
warning. Every guard in the repo stays green.

**Why now and not in r1.** The fix commit own corrected census (five byte-identical badge sites) is
accurate as scoped to the chip trio; these four are the same hue at different alphas, so they fell
outside it. The finding is that F51 built exactly the mechanism these sites need and stopped at the
chip — a blast-radius observation about this fix round, not a re-open of F51.

**Fix.** Cheapest correct version: add a second frozen block beside `SAMPLE_BADGE` (a `SAMPLE_NOTICE`,
or a second key on the same module) for the notice alphas, point the two `ImportModal` sites at it,
and extend the existing D12 describe with the same three cases the badge now has (as-rendered
separation, presence floor, hue identity). The other three amber surfaces are a different question
(they are not provenance claims) and can be left alone or handed to U8.2.

---

### Round 1 summary
Findings re-judged: F51 **FIXED** · F56 **FIXED** · F57 **FIXED** · F58 **FIXED** · F66 **FIXED** — 5/5, zero PARTIAL, zero UNFIXED.
New findings: **1 MEDIUM** (FallbackMode notice amber, the unguarded twin of F51).
Fix-introduced regressions: **none.** Regression sweep 148 files / 2,092 passed, 0 failed at the fixed head after restore.
Probes this round: 8 (F51 x3, F56 x1, F57 x1, F58 x2, F66 x1) — 5 KILLED as intended, 1 SURVIVED (the recorded exact-RGB residual), 2 confirmatory renders.
Verdict: **APPROVE with comments** (the one new MEDIUM is the aggregator to place).

---
---
## Round 0 (initial review) — silent failures (W3: U5 map · U6 wizard/settings · U7 import/OCR/media)

**Agent:** `silent-failure-hunter` · **Mode:** code review (round 1)
**Scope:** `git diff master...13827de` in `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\w3-wave`
(81 changed source files, 12 packages) · **Base contract:** `.claude/skills/fleet-orchestration/reviewer-contract.md`
**Probe worktree:** `C:\Users\kriss\AppData\Local\Temp\claude\probe-w3r-sfh-guards` (cut at `13827de`, detached,
own `pnpm install`). **Torn down and verified:** `unlinked 549 junction(s) in 2 pass(es)` · main checkout
`.pnpm` 240 → 240 · exit 0. Every probe restored before the next; tree diff empty and the four guard files
green again after the last restore (43 passed | 2 todo).

Every KILLED/SURVIVED below was mutated in the **canonical source** in that probe worktree (no mirrored
copies involved), one mutation per probe, motion mode irrelevant (all source/style scans plus one jsdom
render probe under the suite's default `vitest.setup.ts`).

---

## CRITICAL

None.

---

## HIGH

### [HIGH] D12's freeze-and-DEFEND guard cannot fail for the reason D12 names — the badge FILL test is one-sided and passes on *no fill at all*

**File:** `features/demo/ui/__tests__/palette-contrast.test.ts:980-991` (the test) · `features/demo/ui/controls/sample-badge.ts:30-36` (the constant it guards)

**Code:**
```ts
const CARD = [GLASS_TIER.dark.nestedCard.gradient[0], palette.dark.background]
const badgeFill   = flatten([SAMPLE_BADGE.background, ...CARD])   // rgba(255,200,90,0.12) COMPOSITED
const warningFill = flatten([palette.dark.warningLight, ...CARD]) // #7d5f10 — OPAQUE, so this is just #7d5f10
expect(round(deltaE(badgeFill, warningFill))).toBeGreaterThan(10)
```

**Issue.** D12's third arm makes the "Sample data" amber a *correctness* constraint — it is the demo's
provenance mark, the same family as `FallbackMode` and `isSample`. The plan's U7.3 row requires "a test
must prove it stays visually distinct from the ported warning family", and the test's own docblock says
the claim "is measured here, not asserted". It is not measured. The badge fill is composited at **12%
alpha over a dark navy nested card**; the comparison target is the **opaque** `#7d5f10`. The alpha
dominates the deltaE entirely and the hue is irrelevant, so the test's value is a near-constant ~65-78
against a threshold of 10 no matter what colour the badge is.

**Adversarial input / sequence.** A later package "tokenises" the badge — `withAlpha(colors.warningLight, 0.12)`,
which is precisely the idiom this same wave introduces two files over (`ImportResultBody.tsx:79`,
`background: withAlpha(tone, 0.16)`). The badge stops being amber; the guard stays green.

**Probe (canonical source, `features/demo/ui/controls/sample-badge.ts`):**

| # | Mutation | Verdict |
|---|---|---|
| A | `background: 'rgba(125,95,16,0.92)'` (warningLight, near-opaque) | **KILLED** — but by the *legibility* case (`:1005`, 4.43 < 4.5), not by the separation case |
| B | `background: 'rgba(125,95,16,0.12)'` — **`palette.dark.warningLight` at the badge's own alpha** | **SURVIVED** (4 passed) |
| C | `background: 'rgba(0,0,0,0)'` — **the fill deleted entirely** | **SURVIVED** (4 passed) |

Measured deltaE against `warningFill`, printed from the test's own helpers in the probe tree:

```
SHIPPED   rgba(255,200,90,0.12) -> composited 45,75,100  dE = 65.31
warningLt rgba(125,95,16,0.12)  -> composited 29,62,92   dE = 68.94   (PASSES — "more distinct" than shipped)
warning   rgba(255,217,61,0.12) -> composited 45,77,97   dE = 62.64   (PASSES)
NO FILL   rgba(0,0,0,0)         -> composited 16,58,102  dE = 77.62   (PASSES — the HIGHEST score of all)
red       rgba(255,0,0,0.12)    -> composited 45,51,90   dE = 72.56   (PASSES)
```

Nothing else in the suite pins the value: a grep for `255,200,90` / `ffd07a` over every `*.test.ts(x)`
returns only text assertions on the words "Sample data". So B and C survive the **whole** suite.

**Evidence.** The correct shape is 300 lines above in the same file — row 33's `recessed` case
(`:651-670`) composites **both** sides against the same ground (`flatten([stop, ...under])` vs
`flatten(under)`) and bounds two-sided. The D12 case composites one side and compares it to a raw opaque
token, which is the inversion of the failure its own docblock claims to close ("an uncomposited comparison
of two rgba() strings would pass over a fill that vanishes into its parent") — here a fill that vanishes
into its parent scores **higher** than the shipped one.

The other three D12 cases are sound and do bite: the foreground separation (`:993`) compares two opaque
values, legibility (`:1003`) killed probe A, and the non-identity structural pin (`:1008`) catches a
literal re-point at `palette.dark[token]` (but not a `withAlpha(...)` of one).

**Fix.** Composite both sides, and compare the badge against what it actually has to stay distinct from —
the ported warning *chip* as it renders, i.e. `flatten([severityTone('warning').background, ...CARD])`
(and the same for error/info while you are there, which is the completeness half: a badge that drifts
onto the info blue is the same provenance lie). Keep the >10 bound, and add the tautology control the
file already uses elsewhere: assert that a fully transparent fill **fails** the bound, so a badge that
disappears cannot pass.

---

## MEDIUM

### [MEDIUM] The A93 em-dash guard fails OPEN on one unbalanced paren inside a console string — everything after it in that file is silently exempt

**File:** `features/demo/ui/__tests__/copy-rules.test.ts:139-159`

**Code:**
```ts
for (let i = m.index + m[0].length - 1; i < chars.length; i++) {
  if (chars[i] === '(') depth++
  else if (chars[i] === ')') { depth--; if (depth === 0) break }
  if (chars[i] !== '\n') chars[i] = ' '
}
```

**Issue.** The paren matcher is string-blind. A `(` inside a console argument's string literal pushes
`depth` to 2, so the call's own `)` only returns it to 1 and the blanker keeps running — erasing every
character until the next unmatched `)` in the file. Every user-facing string inside that window is
silently removed from the scan. The docblock argues paren-matching is *safer* than a line heuristic; in
this direction it is strictly less safe, because a line heuristic over-scans (loud) and this under-scans
(silent).

**Adversarial input / sequence.** An author adds
`console.warn('[demo/map] proximity load failed (see the network tab:', err)` — a shape this repo writes
constantly (26 console calls live under `ui/`) — and any rendered string between it and the next stray
`)` stops being covered.

**Probe (canonical source, `features/demo/ui/screens/map/MapScreen.tsx`):**

- **Control** — planted a real violation inside the `loadProximity` catch:
  `const PROBE_MSG = 'Proximity unavailable — try again later.'`
  → **KILLED**: `FAIL … carries none anywhere under 'ui/'`, with `+ "file": "screens/map/MapScreen.tsx"`.
- **Mutation** — same planted violation, plus one character changed in the console string above it
  (`failed to load — proximity stays off:` becomes `failed to load (proximity stays off:`)
  → **SURVIVED**: `Tests 4 passed (4)`.

The control satisfies all four clauses (the planted string exists in shipped-shaped source, is
non-equivalent, is covered by the case that ran, and executes on the arm that ran).

**Note:** no such string exists today (a grep for a paren inside a console string literal under `ui/`
returns zero), so this is latent, not live — that is why it is MEDIUM and not HIGH.

**Fix.** Skip string and template literals while scanning for the parens (track quote state and
backslash escapes), or blank from the match to the end of the line the call arguments end on using a
scan that treats a quoted run as opaque. Either way, add a case to the existing
"blanks console calls whole" test that plants a `(` inside a console string and proves a rendered string
after it still reds.

---

### [MEDIUM] The FROZEN em-dash exemption is applied per LINE, so a NEW violation sharing a line with a frozen phone-verbatim string is silently excused

**File:** `features/demo/ui/__tests__/copy-rules.test.ts:187`

**Code:**
```ts
if (frozen.some(([text]) => line.includes(text))) continue
```

**Issue.** `FROZEN_PHONE_VERBATIM` is keyed by file **and by the exact string** — the docblock's whole
argument for that keying is that "the list cannot rot into a blanket exemption for a file". The check
then throws the string key away and skips **every** em dash on any line that contains it. This is the
same class W2 ruled on twice in one wave (F32 — file-keyed exemption for a role-scoped ruling; F33 —
whole-line drop for an arm-scoped ruling), now third wave running, on a scan shipped after both rulings.

**Adversarial input / sequence.** Any new demo-originated string authored on the same source line as one
of the five frozen strings.

**Probe (canonical source, `features/demo/ui/screens/import/PickerStage.tsx:31`):** appended a second,
demo-originated key to the frozen string's line —
`pasteTextDescription: 'Paste a request email or notes — AI fills the form', pasteHint: 'Fast — usually under a second',`
→ **SURVIVED**: `Tests 4 passed (4)`. The same planted string on its own line reds; that is the control
from the finding above, which killed on a different file through the identical mechanism.

Blast radius: 5 lines across 5 files (`PickerStage.tsx`, `PasteStage.tsx`, `NotesScreen.tsx` x2,
`FormFieldsPane.tsx`, `CloudSyncPane.tsx`).

**Fix.** One line: match at the occurrence index, not the line content —
`frozen.some(([text]) => { const s = line.indexOf(text); return s !== -1 && at >= s && at < s + text.length })`.

---

### [MEDIUM] On the token-less mount the NEW filters sheet tells the visitor to long-press a map that is not rendered, and the host announces a "current view" that is a hardcoded constant

**File:** `features/demo/ui/screens/map/MapFiltersSheet.tsx:388` · `features/demo/ui/screens/map/MapScreen.tsx:41,381-388`

**Code:**
```tsx
// MapFiltersSheet.tsx:388 — rendered unconditionally
<div style={hintText}>Long-press the map to place or move the proximity ring.</div>
```
```ts
// MapScreen.tsx:381-388
const plotted = filtered.items[0]?.coord
const anchor  = plotted ?? mapRef.current?.getCenter() ?? DEFAULT_MAP_CENTER   // [-79.65, 43.61], frozen
if (!plotted) setNotice(PROXIMITY_CENTRED_ON_VIEW)   // 'Proximity centred on the current view. Long-press the map to move it.'
```

**Issue.** Without `NEXT_PUBLIC_MAPBOX_TOKEN`, `MapCanvas` returns `[data-map-fallback]` before the
`[data-map-canvas]` surface (`MapCanvas.tsx:618-627`), so `mapRef.current` is null and there is no
pointer surface to long-press. U5.2 deleted the on-map proximity toggle and U5.3's sheet Toggle is the
route back — the sheet's own comment (`MapScreen.tsx:496-499`) says so, "including on a token-less mount
where there is no canvas to long-press". Three distinct anchor provenances (a row the visitor can see /
the live map centre / a frozen globe constant) collapse into two notices, and the weakest one — no map at
all — inherits copy that names **both** a view and a gesture that do not exist. The demo's honesty rule is
that a degraded surface announces itself; the Mapbox fallback panel does (it names the missing env var by
hand), and then the sheet mounted over it contradicts it.

The *data* is honest — the counts are real arithmetic on real items and the list really is filtered — so
this is a cause-collapse, not substituted data. Hence MEDIUM.

**Probe (render, jsdom, canonical sources, no env stub — the token-less path):** `MapScreen` mounted with
a case whose one location has no GPS. Asserted in one pass, all present simultaneously:
`[data-map-fallback]` present · `[data-map-canvas]` absent · "Map preview unavailable" rendered ·
"Long-press the map to place or move the proximity ring." rendered in the open sheet ·
"Proximity centred on the current view. Long-press the map to move it." fired after clicking
`filter-proximity`. **1 passed** — the contradiction reproduces on the shipped code with no mutation at
all. The existing suite covers the *reachability* of this path (`MapScreen.test.tsx:708`,
"is reachable with NO Mapbox token") but asserts nothing about what the copy claims.

**Fix.** Two cheap options, either alone closes it: (a) give `MapFiltersSheet` the fact it is missing —
a `canPlaceRing` (or `mapInteractive`) boolean from the host, and swap the hint for one that says the
ring is centred on the case locations when it is false; (b) in `handleProximityToggle`, split the
`!plotted` arm on whether `mapRef.current?.getCenter()` returned a value, and give the
`DEFAULT_MAP_CENTER` arm its own sentence that promises neither a view nor a gesture.

---

## LOW

### [LOW] settings-palette-sweep ALLOWED is keyed by HEX for a reason written per FILE

**File:** `features/demo/ui/screens/settings/__tests__/settings-palette-sweep.test.ts:32-43`

**Issue.** The single row reads "FormFieldsPane footnote tone", but the key is the bare literal
`'#5d7a9a'`, so the exemption excuses that hex anywhere in the ~20-file settings subtree. Same shape as
W2/F32 (exemption broader than the reason beside it), but the blast radius is genuinely small: the row
governs only the *inventory* case, and the sweep real ban (`:79-94`, "spells no hex the palette already
owns") carries **no exemption mechanism at all**.

**Probe:** planted `const PROBE_HEX = '#5d7a9a'` in `settings/SettingsNavBar.tsx` → **SURVIVED**
(3 passed). Negative control, same file, `'#f0f4f8'` (a live palette hex) → **KILLED** (2 failed, both
the ban case and the inventory case). The guard teeth are intact where it matters.

**Fix.** Key the row as `path:hex`, matching W2/F32 role-keyed remedy. Not urgent.

---

## Verified clean — checked and NOT flagged

Recorded so the aggregator can tell "not looked at" from "looked at and sound".

**Honesty machinery (unchanged where it counts).**
- `run-import.ts` `emitFallback` keeps all four arms and the `const exhaustive: never = mode` default
  (`:141-157`); `DemoExperience.tsx:1708-1722` `fallbackNotice` keeps its `never` arm and four distinct
  visitor strings. Only the em dashes moved.
- The `NO_FIELDS_FOUND` rejection (deferred §3 closure) is byte-intact — `ok:false`, the `partialData`
  OCC# carry-through, and the `fallbackMode === 'none'` precondition (`run-import.ts:205-218`).
- `importGen` cancellation: both post-await re-checks survive verbatim (`DemoExperience.tsx:1741` after
  the geocode round trip, `:1786` before the store write). No new async store write anywhere in the diff.
- `SAMPLE_BADGE` extraction moved zero rendered bytes; both sites (`ImportResultAccordion.tsx:43`,
  `OcrCaptureScreen.tsx:411`) consume the module. The `isSample` and `confidence.measured` gating is
  untouched.
- OCR failure arm still renders `result.rawText` beside the Banner (`OcrCaptureScreen.tsx:534-536`); the
  "No camera available here" line and the assumed-date blocker survive the Banner adoption at
  `severity="error"` (Banner is `role="alert"`, so the announcement got louder, not quieter).
- `LocationList` three-reason `SheetEmptyReason` discrimination and the filters-only Clear button survive
  the `EmptyState` adoption (`LocationList.tsx:156-172`).

**Operator breadcrumbs.** Zero `console.*` lines removed anywhere in the source diff; the count under
`features/demo/ui` excluding tests is **29 at master and 29 at 13827de**. The `MapCanvas`
before/after-load split (console.error terminal, console.warn transient), the `loadProximity` catch warn,
the `extract-client` 503-vs-everything-else split and the `geocode.ts` L2 warn are all untouched.

**Guards that fail LOUD and CLOSED (one probe per family).**
- Mono policy (`fonts.test.ts:170-181`): planted a Share Tech Mono stack in `screens/NotesScreen.tsx`
  → **KILLED** (the scan result gained `screens/NotesScreen.tsx` and the toEqual reddened). That toEqual
  is simultaneously the dead-exemption test, so a SCANNER_ONLY file losing the face also reds.
- Settings palette sweep: a real palette hex → **KILLED** (control pair under the LOW above).
- Banner adoption ledger (`banner.test.tsx:344-376`): `existsSync` per row means a rename reds rather
  than empties the list, and `rendersBanner` is compared against a fixed ten-entry toEqual, so a broken
  predicate cannot pass silently. Read, not probed — the integration report 25/25 re-run covers it.
- `field-recipe-sweep.test.tsx:128-139` carries the anti-vacuity control (a file count floor of 30 plus a
  `statSync` isFile check per SWEPT_FILES row) and an empty ALLOWED with a live dead-exemption case.
- Every walker in the wave (copy-rules, banner, settings-palette-sweep, field-recipe-sweep) uses
  `readdirSync`, which **throws** on a missing root rather than returning an empty list — no
  ENOENT-to-empty silent pass in any of them.

**Filter state (U5.3).**
- The badge derivation is well pinned: regressing it from a per-status count to `activeFilterCount`
  → **KILLED**, 2 failures in `MapScreen.test.tsx` (the badge case and the Clear-All case).
- No stale count is reachable: the badge is derived per render from the filter values and
  `proximityActive`, never cached; the case-switch effect resets `filtersVisible` alongside the filter
  values (`MapScreen.tsx:210-227`); and the `MapFiltersSheet` announcement effect keys on visible plus
  subtitle and clears to empty on close, so it cannot re-announce a stale count on the next open.
- `handleClearAllFilters` (filters plus proximity) and `handleClearFilters` (filters only, offered from
  the empty state) are correctly kept distinct — clearing proximity from the empty-state button would
  undo something the visitor did not ask about.
- The cleared-vs-empty distinction survives: the `emptyReason` precondition requiring a non-zero
  pre-filter total and a non-zero active-filter count (MR-3) is untouched, so a case with nothing
  plottable still gets the no-data sentence rather than a Clear button that can restore nothing.

**Scheme seam (F33 masking).** `maskOwnHalfArms` is unchanged at `glass-tokens.test.ts:195-200` and still
line-anchored to a leading light/dark key — the mask did **not** widen at the merge. Scanned all 81
changed source files for member-access half reads: **every hit is inside a comment** (`mapTokens.ts` x8
citing phone Colors values, `NotesScreen.tsx` x1). No new value-position half read.

**Other traced and dismissed.**
- `SyncStatusCard` drops the ok-tinted card ground for a uniform `glassCardNested`, which looked like it
  would make unsynced indistinguishable from synced — it does not: `:82` returns null when there is
  neither a sync nor a sync in flight, so the Synchronized arm is only reachable with a real sync.
- `CompletionScreen:111-128` newly gates the validation-errors Banner behind the no-location banner. The
  hidden case is "no location AND stale gate errors", where the superseding banner is the more honest
  one; the phone makes the same exclusion for the stated a11y reason.
- `TERMINAL_PALETTE.accent` is declared `satisfies Record<ImportLogLevel, string>`, so `TerminalLine`
  cannot resolve an undefined colour for a new level.
- The `NewCaseModal` `CoordinateField` fix renders: `aria-invalid`, `aria-describedby` pointing at the
  error id, and a `FieldError` with `role="alert"` are all wired (`:79-84,92-96`), matching its
  `IncidentLocationFields` twin. The consolidation swallowed no per-field rendering — `FieldError` keeps
  `role` optional precisely so the two blocked-reason lines already inside a status region are not
  nested assertive regions.
- `pdf-extract.ts`, `ocr-recognize.ts` and `ImportModal.tsx` changes are copy and font only; the
  `PdfExtractionError` narrowing and the deliberate teardown swallow are untouched.

**Ledger.** No TRIGGER-LAPSED claim. §15 (`selectors.ts` / `time.ts`) — neither file is in the diff.
§18 (`onFilesPicked` / `runPasteImport` top-level catch) — `DemoExperience.tsx` is in the diff but only
for copy constants and the `fallbackNotice` strings; no awaited call became capable of throwing, so the
trigger has **not** fired. §28 unaffected.

**No deferral rows proposed.**

---

## Silent-Failure Summary
CRITICAL: 0 · HIGH: 1 · MEDIUM: 3 · LOW: 1
Verdict: **REVISE**

Fallback honesty (every substitution announced): **yes for the data; no for the map-degradation copy** (MEDIUM-3)
Failure-cause distinctions preserved: **yes** — FallbackMode, the extract-client 503 split, terminal levels and the empty-reason discrimination all intact
Partial results flagged (not silently short): **n/a** — no new partial-result path in this wave
Async cancellation / stale-write safety: **yes** — importGen re-checks intact, no new post-await store write, badge and announcement derived not cached
Operator breadcrumbs intact: **yes** — 29 to 29, zero removals
Guards fail loud and closed: **3 of 5 families probed KILLED; 2 SURVIVED** (copy-rules, MEDIUM-1 and MEDIUM-2) **plus the D12 defence vacuous** (HIGH)

Out-of-lane observations:
- `MapFiltersSheet.tsx:205-215` duplicates the `ExportModal.tsx` sr-only constant, disclosed in its own comment as a proposed deferral — a type-design / web lane call, not mine.
- The TimeOffsetScreen DST advisory moved from a polite status region to Banner assertive alert; louder, not quieter, so not a silent failure — noted for the web lane in case the politeness was deliberate.
