# Vetted Review — W1 (phase U1, PR #41 `feat/uiparity-w1`) — Round 2: rider round + CLOSING @ `d91ab76`

**Verdict:** APPROVE with comments — F23 FIXED; two new items (F24 MEDIUM, F25 LOW), both one-line, both recommended as a final rider before merge (no rendered change), with a two-lane targeted delta
**Rider diff:** `044578a..d91ab76` — F23 `69dbd34` · lit-edge ruling `7a0c505` (fragments → longhands) · `7fc126b` (repo-wide conflicting-property tripwire + 4 root fixes) · `38cb47c` (docblocks) · mapping = the "rider round" comment on PR #41 · ruling doc `reports/partner-lit-edge-ruling.md` (master)
**Lanes read (Round 2):** typescript F23 FIXED, riders sound, 6/6 probes, APPROVE · web F14/F19 stay FIXED, ruled shape holds p1/p2/p3 + self-heal, longhand fragments byte-identical at dark, four fixes render right, APPROVE · tests F23 FIXED + generalised (E1–E4), re-cut pins sound, tripwire load-bearing (G3: 8 tests / 5 files), 1 new LOW, APPROVE-wc · silent-failures F23 FIXED, tripwire swallows nothing, 1 new MEDIUM, APPROVE-wc · type-design F23 FIXED, 0 new (type-level shorthand guard filed as a PROPOSAL under §27 precedent — concur), APPROVE
**Aggregator:** warm (`a0a927cee97a72c8d`), ~540k tokens consumed this campaign; retiring after the W2 boundary — SUCCESSOR BRIEF in Pipeline notes.

Cold gates at `d91ab76` (mapping; reproduced by ts, tests): tsc 0 · 272 files / 3,576 passed | 10 todo · guard 115/115 · `/demo` 107 kB. Demo UI suite under the new repo-wide tripwire: 161 files / 2,035 passed / 0 failed (web).

## Unsettled — for the operator

None verdict-bearing. The r1-delta UNSETTLED (U4.1's contradiction with F14's fragment shape) is **RESOLVED by the Fable partner's measured ruling** (40 form × consumer cells × 3 paints, jsdom AND Chromium, zero disagreement): fragments carry only longhands; consumers re-tint with colour longhands. It supersedes F14's shape and U4.1's, and it landed in this rider.

## Rider round — my verification (the floor), then the lanes'

| Item | Commit | Status | Evidence |
|---|---|---|---|
| **F23** (MEDIUM, r1-delta) — direct-half scan hand-typed roster | `69dbd34` | **FIXED — generalised past the prescription** | `SCHEME_HALF` is now two wildcard-identifier forms (dot/bracket + destructure); the record roster is DELETED; the only exemption is the file set. `SHADOW_CARD`'s docblock points at the scan. All three forms killed by ts (probe 1a/b/c), tests (E1–E3), sf (a/b), td (three mutations); `typeof` carve-out re-verified load-bearing under the widened wildcard (ts probe 2); zero false red measured on the clean tree and under an adversarial comment/typeof file (tests E4). Exactly the shape I prescribed in r1-delta and pre-verified in-memory. |
| Ruling — fragments → longhands | `7a0c505` | **SOUND** | `glassCard`/`glassCardNested` now `borderStyle`/`borderWidth`/three side colour longhands/`borderTopColor`, no shorthand key; `as const satisfies` chain intact (ts); a stale reader of `.border` is TS2339 (ts probe 3); the old key-ORDER pin replaced by a no-shorthand-key pin plus p1/p2/p3/self-heal cells and two negative controls (tests P1: reintroducing `border` reds both the shape pin and the negative control). Web: all six border longhands byte-identical to the pre-rider shorthand at `scheme='dark'` — a refactor, not a restyle; conditional collapse self-heals to `tier.card.border`, not `currentColor`. |
| Ruling — repo-wide tripwire | `7fc126b` | **SOUND, and already paid for** | `vitest.setup.ts` collects `/conflicting property/` on `console.error`, forwards EVERY call unconditionally (ts, sf: nothing swallowed, downgraded or re-levelled), throws in `afterEach` after `cleanup()`. Narrow by design (blanket console.error ban rejected — correct). Load-bearing: reverting `_shared.tsx:264` reds 8 tests in 5 files none of which were written for it (ts probe 4, tests G3); the padding fix reds 4 tests (tests G4b, after its own scoping error was corrected and recorded). Ordinary `console.error` calls do not fail (tests G2). Caught FOUR live defects on first run — `Field`'s error-clear erased the input border (15 consumers, root-fixed at `_shared.tsx:264` + two copies) and `CompletionScreen:66`'s review form lost its top padding after "Export again" — both visitor-visible, both previously signalled only by a console error nobody read. Web probed all four at head: the only pixels that moved are the two that were WRONG. |
| Ruling — docblocks | `38cb47c` | **SOUND** | Module header and `glassCard` docblock rewritten to the rule; `glassBtnPrimary/Secondary` scoped out with the right reason (no per-side longhand to clobber; U2.2 deletes them). |

Fix-introduced regressions: none (five lanes; the tripwire's blast radius across the whole demo UI suite is 0 failed).

## New findings (append-only)

### F24 [MEDIUM] The scan exempts `tokens/palette.ts`, which is not only a declarer but the home of the ONE consumed-scheme switch — so `palette.ts:189` regressing to `palette.dark` is invisible to the scan and to its only pin; the exemption is unnecessary, and the lane's one-token fix is a tautology
Lanes: silent-failures — original label: MEDIUM (probe: `:189` `palette[scheme] → palette.dark` SURVIVED, 74 passed; negative control in a non-exempt file KILLED)
File: `features/demo/ui/__tests__/glass-tokens.test.ts:62-70` (`SCHEME_DECLARERS = {'tokens/palette.ts', 'tokens/glass-tiers.ts'}`); `features/demo/ui/tokens/palette.ts:189` (`export const colors = palette[scheme]` — plan §9 clause 12's single site); `features/demo/ui/tokens/__tests__/palette.test.ts:144-146` (`expect(colors).toBe(palette.dark)`)
Issue: the lane's diagnosis is right and its prescription is wrong. AGGREGATOR PROBE (in-memory, tree untouched, shipped `SCHEME_HALF` forms, comment-stripped): (1) with the exemption REMOVED, `tokens/palette.ts` and `tokens/glass-tiers.ts` produce **zero** offenders on the clean tree — both declarers name their halves as object KEYS (`light: {`, `dark: {`), never as member access, so "a declaring file must be able to name its own halves" is not actually true of these files and the exemption exempts nothing legitimate; (2) with the exemption removed, `:189` regressed to `palette.dark` is **CAUGHT** (`form0: "palette.dark"`); (3) the prescribed pin `expect(colors).toBe(palette[scheme])` **PASSES on the regressed line** — `palette.dark` and `palette[scheme]` are the same object while `scheme === 'dark'`, the identical blindness F18 established for every behavioural pin of this class. The current `toBe(palette.dark)` is equally tautological; neither spelling can red. Only the source scan can see this line, and it is the one file the scan was told not to read.
Fix: delete the exemption — `SCHEME_DECLARERS` becomes empty (or the scan passes an explicit empty set; do NOT fall back to the `TOKEN_MODULES` default, which re-exempts `glass-tokens.ts`), with the docblock rewritten to say WHY nothing is exempt (declarers name halves as keys, measured zero matches). Re-run sf's `:189` probe and confirm the kill; keep it as the recorded negative control. `palette.test.ts:146` may stay as a value identity, but its comment should say the scan is the guard — optional, A's file, not load-bearing. PRESCRIPTION-UNVERIFIED only as to running the real suite after the deletion (my probe used the shipped regexes over the real files, so the false-red question is answered).
Owner: `a9f135565ce43133b` (U1.4 seat — `glass-tokens.test.ts`). Not A: the `palette.test.ts` token change is not the fix.

### F25 [LOW] The repo-wide tripwire's message is border-specific, but the tripwire fires on any shorthand/longhand family — it mis-directs the next non-border trip
Lanes: tests — original label: LOW (probe G4b: the padding collision at `CompletionScreen:66` trips it; the message says "re-tint with colour LONGHANDS … see glass-tokens.ts")
File: `vitest.setup.ts:66-72` (the thrown message); the docblock above it
Issue: React's own text is appended via `${seen}` so the property IS named, but the lead sentence is wrong for every non-border member of the class and this guard outlives W1. Touch-point (tests' caveat, same docblock): the tripwire is now the SOLE guard for the four root fixes (no dedicated regression pins were added; coverage is transitive via existing consumer suites) — that is a reasonable trade but must be a stated property of the guard, not an accident.
Fix: one string — property-agnostic lead ("A style object wrote a SHORTHAND over a conflicting longhand on an update; the painted result is wrong from this render on. Re-declare the whole shorthand in both branches, or use longhands only — `partner-lit-edge-ruling.md` §4.3"), border kept as the example; one docblock sentence recording that the four `7fc126b` root fixes are pinned only by this tripwire.
Owner: `aec4149c990c8d0ef` (U1.2/U1.3 seat — `vitest.setup.ts`'s author this round)

## Dropped / demoted / not filed

| Item | Source | Disposition |
|---|---|---|
| Type-level `NoBorderShorthand` guard on the fragments | type-design · PROPOSAL | Not filed — concur with the lane's own ruling: it guards the half that already fails loudly (the declaration, pinned twice at runtime) and cannot guard the half that shipped silently (consumers), which the tripwire now covers; `deferred.md` §27 precedent, trigger unfired. |
| Wildcard scan's false-positive surface (a future non-scheme `light`/`dark` key) | type-design residual | Not filed, no row — the failure is a loud, legible red in the safe direction and is its own trigger; a docblock line already states the measured zero cost. |
| Tripwire blind inside tests that spy `console.error` (~12 sites) | typescript observation; sf route 2 | Not filed — coverage bound, not masking; sf verified every spy restores per-case. The cheap closer (re-install the interceptor in `beforeEach`) is available if anyone wants the bound closed. |
| `INVARIANT` hand-sorted | type-design residual (carried) | Not filed. |
| Verification re-cut at `d91ab76` (`_captures/w1/after-riders`) | in flight | Pending, not blocking. Expected deltas for the seat: none on the longhand fragments (byte-identical at dark); exactly two state-specific repairs — an input border that previously VANISHED when its error cleared, and `CompletionScreen`'s review form regaining its 60px top padding after "Export again". Anything else is a regression to file. |

## Final status, F14–F25

| F | Sev | Final | Closed by |
|---|---|---|---|
| F14 | HIGH | FIXED — superseded by the measured ruling (`7a0c505`, `38cb47c`) | `3c1eac3` → ruling rider |
| F15 | MEDIUM | FIXED | `8d65308` |
| F16 | MEDIUM | FIXED (+ integrator relocation into the ungated describe) | `3c31600` + `e56c0f1` + `044578a` |
| F17 | MEDIUM | FIXED | `47a7f90` |
| F18 | MEDIUM | FIXED (PARTIAL closed by F23) | `c0458b6` + `69dbd34` |
| F19 | MEDIUM | FIXED | `7ba1825` + `a5af4b2` |
| F20 | LOW | FIXED | `700ce2b` |
| F21 | LOW | FIXED | `f1491b9` |
| F22 | LOW | FIXED | `d65a2c9` |
| F23 | MEDIUM | FIXED | `69dbd34` |
| F24 | MEDIUM | OPEN — one-line rider (exemption deletion) | — |
| F25 | LOW | OPEN — one-string rider | — |

## Owner routing (final rider) and lanes to resume

| Owner | Finding | File |
|---|---|---|
| `a9f135565ce43133b` — U1.4 seat | F24 | `features/demo/ui/__tests__/glass-tokens.test.ts` |
| `aec4149c990c8d0ef` — U1.2/U1.3 seat | F25 | `vitest.setup.ts` |

Resume for the targeted delta: **silent-failures** (F24 author — re-run the `:189` probe) and **tests** (F25 author). Not a resume-nobody round (F24 is MEDIUM), but two lanes suffice: both riders are test-infrastructure one-liners with no rendered change; typescript/web/type-design have nothing to re-check.

## Ledger interaction (closing)

Triggers this diff satisfies: none. Trigger-lapsed findings: none. Rows written this round: **none** — F24/F25 are fixes; the td false-positive ceiling is self-announcing. W1's five rows (§94 `colors.modal` → U4.2 · §95 hand-ported shadows → U4 · §96 diagonal card variant → U3.3 / D1 checkpoint 1 · §97 `nestedCard.border` ban → U8.1 · §98 `flattenOver` rounding → threshold / U2.4) stand with unexpired triggers. W0's §89–§93 unchanged.

## State of W1 — for the PR #41 merge

1. The glass layer is in: `ui/tokens/glass-tiers.ts` (six tiers × four parts × both halves, type-enforced both ways), the four legacy `GLASS` composites derived from it, `SHADOW_CARD` both halves via `[scheme]`, the header tier's one recipe (`controls/header-chrome.ts`, three fragments, `as const satisfies`), the card recipe with the lit top edge / inset / elevation on every `glassCard` consumer and the nested tier at its five sites. The W0 depth inversion is closed and the primary/secondary button separation is back (verification seat, measured off pixels).
2. The gates grew with it and hold on every box: guard 115/115 with `stuck` detection at BOTH entry points, tier membership pinned against the module in the ungated describe, `readStop` closed, the scheme-half scan name- and form-agnostic with the one exemption to delete (F24); `norm`-ed literal scans with the header-tier bans; contrast contract at 10 todos with the tier rows live.
3. The lit-edge composition rule is RULED by measurement, not argued: fragments carry only longhands; consumers re-tint with colour longhands; React's conflicting-property warning is a repo-wide test failure — and that tripwire found four live, visitor-visible defects that no reviewer had.
4. Known and recorded, not open: §94–§98 (modal token adopter, unanchored shadows, diagonal card variant on the two entry screens, the nested border ban, the rounding seam). The owner's D1 device pass is DIFF.md §5's eight checkpoints; checkpoint 3 (header/body ≈4 RGB) is the thinnest margin.
5. Plan corrections owed at merge: the three U1 reports' §9 refutations (plan §4.3 border wording; matrix row 82/A37 `SettingsNavBar` reads `elevated`); U0.5 P-2 closed by U1.4 §9(5); add §94–§98's triggers to the U4.2 / U4 / U3.3 / U8.1 / U2.4 rows; the lit-edge ruling supersedes F14's docblock language wherever the plan quotes it (U2.4 / U4.1 / U5.1 briefs).

## Agent IDs

Unchanged from `w1/VETTED-r1.md`; aggregator `a0a927cee97a72c8d` (retiring after W2 boundary).

## Pipeline notes

- **Round quality:** F23 is the third consecutive fix in this campaign to ship stronger than its finding (F16 derived parts set, F18 `SCHEME_DECLARERS`, F23 roster deletion) — the fixing seats are reading past the finding to the class. The rider round's tripwire is the campaign's best single mechanism so far: a gate found bugs reviewers had not.
- **Lane calibration this round:** silent-failures' new MEDIUM had the right diagnosis and a tautological remedy — the lane did not probe its own prescription (which would have passed on the regressed line). PRESCRIPTION-UNVERIFIED exists for exactly this; the fix owner should treat every `Fix:` line as a claim until re-probed.
- **Verification:** three rounds with no pixel-level look at W1's fixes (no `after-fixed/`; `after-riders/` in flight). The riders changed no rendered value except the two repairs above; a re-cut at `d91ab76` is the wave's first and last needed.
- **Housekeeping:** `probe-u2.2-recipe` still registered (a W2 seat's?); `probe-w1d-tests` is gone (tests lane confirmed). No W1 build log at the brief's path in any round — the mapping's cold `pnpm build` is the record.
- **Aggregator seat:** ~540k tokens consumed across W0 r1 / r1-delta / closing and W1 r1 / r1-delta / r2. Retire after the W2 boundary; the brief below is precedent, not state — state is in `w0/VETTED-*.md`, `w1/VETTED-*.md` and `deferred.md` §89–§98. F-numbering is at **F25**; the next § is **99**.

### SUCCESSOR BRIEF — adjudication rulings and precedent (read this before your first W2 round)

1. **Silent vs loud sets the grade, not the probe verdict alone.** A silent SURVIVED on the load-bearing assertion of a HIGH fix, on the default box, is HIGH (W0 F11). A loud compile-time break of a scheduled-day contract with a one-token fix is MEDIUM (W1 F15). A survivor only on the SECONDARY entry point while the primary gate (`pnpm test`) kills it is MEDIUM (F17). Silent-failures grades survivors HIGH by contract default — expect to demote one per round with this reasoning; typescript grades contract violations HIGH even when loud — same.
2. **Hand-typed cardinality vs membership:** on a list with LIVE unanchored keys it is HIGH (W0 F2: 17 of 32); on a fully-anchored list it is MEDIUM (W1 F16). The class has recurred three times (F2, F16, F23) and the fix that ends it is DELETING the roster (wildcard + file exemption), not lengthening it — prescribe that shape.
3. **Behavioural pins cannot see scheme-half hard-coding while `scheme === 'dark'`** — `X.dark`, `X['dark']`, `palette[scheme]`, `colors` are the same object, so `toBe(...)` between any two is a tautology (F18, F23, F24). Only a source scan can; and the file you exempt from the scan is the file it cannot protect (F24). Check any proposed "one-token pin" for this before accepting it.
4. **Phone SOURCE beats inventory prose and matrix silence** (F19: `Colors.ts:376-378` settled the nested-shadow dispute against the web lane's §2.A reading). Read the phone repo yourself when two lanes cite different documents; it is read-only but readable.
5. **A proposed deferral whose trigger fires inside the same PR is a finding, not a row** (W1 F18, F22 from U1.4's D-1/D-2). Plan-SCHEDULED work is never a ledger row (W0 F8: U1.1 derives `borderSoft` — hold at LOW, no row). Rows only for boundaries the plan does NOT own (§92, §94, §96) or measured seams a later row must inherit (§89, §98). Five rows per wave has been the honest count; refuse anything without a greppable trigger.
6. **Cross-seat handoffs and "covered by X" claims in a mapping comment are PRESCRIPTION-UNVERIFIED until the receiving commit lands and someone probes it** (F23: "Q7 covered by F18's scan" was false). Ask the orchestrator for an "asks of another seat" column; read integrator reports for ledger claims sceptically (W1's cited two W0 rows that were never written).
7. **Integrators relocate correctly; verify anyway.** Both W1 carries resolved conflicts non-textually (F16's pins moved to F11's ungated describe) and were right. Your floor is still to open the merge commit's resolution and read the function that neither seat ran (W0 `flatten()`, W1 `rn-token-parity.test.ts`).
8. **One writer per file decides owner routing in fix rounds**, over authorship: W1 F15 (W0 seat A's F7) went to the U1.2/3 seat because it held `glass-tokens.ts` that round. Say so in the Owner line.
9. **Verdict discipline:** UNSETTLED never moves the verdict (the F14/U4.1 contradiction rode beside APPROVE-wc and was resolved by the partner's harness, not by a grade). APPROVE-with-comments with a one-line MEDIUM rider before merge is a legitimate closing shape; do not inflate a MEDIUM to force a round the orchestrator is already running.
