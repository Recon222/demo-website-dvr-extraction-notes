# Vetted Review — W0 (phase U0, PR #39 `feat/uiparity-u0`) — Round 1 FIX-DELTA @ `15e5a6f`

**Verdict:** REVISE
**Fix diff:** `10553c8..15e5a6f` (13 fix/merge commits + reports) · authority: the mapping comment on PR #39 · integrator report `INTEGRATION-r1.md` (one union-resolved `flatten()` conflict, 6/6 probes killed) · cold gates at the merged head: tsc 0 · 269 files / 3,520 passed | 15 todo · guard 67/67 · `/demo` 107 kB
**Lanes read (delta sections):** typescript 5/5 FIXED, 0 new, APPROVE · web F1 FIXED (re-measured 9.60 / 7.78 / 6.86 / 9.23), 1 new LOW, APPROVE-wc · tests 5/5 FIXED, 9/10 probes killed, 1 new MEDIUM, APPROVE-wc · silent-failures 4/4 FIXED, 1 new LOW, APPROVE · type-design 4/4 FIXED, 1 new HIGH + 1 new LOW, REVISE
**Prior findings:** 9 FIXED · 1 PARTIAL (F2 — remainder tracked as F11) · 0 UNFIXED
**New this round:** 0 critical · 1 high · 1 medium · 1 low  (F11–F13; one lane LOW folded into F11, one lane LOW dropped)
**Unsettled (operator escalation):** 0
**Aggregator:** warm — same seat as r1 (`a0a927cee97a72c8d`). Skeleton written to disk first, then this document.

## Unsettled — for the operator (never affects the verdict)

None. Three disputes this round, all settled at source: (1) integrator vs tests lane on whether the MediaLibrarySheet sites can be pinned now — the fixture exists, so FIX (F12); (2) web lane's request for a ledger row on `GLASS.borderSoft` — refused, the plan's U1.1 row and matrix A30 already own it; (3) the fill-only source guard proposed by F1's author, filed LOW by web and proposed as a ledger row by the integrator — neither, see Dropped.

## Prior findings — status (aggregator's own verification of each fix commit, then the lane's re-check)

| F-ID | r1 sev | Lane(s) — original label(s) | Fix commit(s) | Status | Evidence (mine, then lanes') |
|---|---|---|---|---|---|
| F1 | HIGH | web HIGH (+ web LOW hoist, folded) | `8f876b9` | **FIXED** | All six sites read at head: `MediaLibrarySheet.tsx:225,226,245,576`, `ExportModal.tsx:161`, `ExportCaseCard.tsx:131` → `colors.link`; glow hoisted to module const `LIT_GLOW` (`:49`) derived from the same token. `grep accentFrom` under `features/demo`: zero foreground consumers remain (fills `gradientAccent`, `T.accentFrom` re-export only). Pins moved WITH the value, not deleted: `ExportHub.test.tsx:115-117` (×3), `ExportModal.reduced-motion.test.tsx:53`. Web lane re-measured at head: 9.60 / 7.78 / 6.86 / 9.23, all floors cleared; `primaryLight` correctly refused (5.24 < inactive 5.31). Residual: four of the six sites have no value pin → **F12**. |
| F2 | HIGH | ts HIGH + ts MEDIUM + tests HIGH (+ tests LOW "35 rows", folded) | `4c2a4fa` | **PARTIAL** → remainder is **F11** | Anchoring half FIXED: `PALETTE_KEYS` carries all 32 keys (`check-rn-parity.mjs:263-296`), 67 rows / 0 drift / 0 PARSE-FAILED, `SCHEME_INVARIANT = {onPrimary, onError}` excluded by name from the light≠dark pin, docblock rewritten with the corrected schedule (59 keys / 123 rows at end), `:353` reads 67. Membership pin landed in the stronger shape (`[...PALETTE_KEYS].sort()` vs `Object.keys(palette.dark).sort()`, `rn-token-parity.test.ts:123-125`) and `anchors.length` is now derived — my r1 PRESCRIPTION-UNVERIFIED mark is discharged: ts probes 1–2, tests probe D3, sf probes (a)/(b) all KILLED, including the exact `link→card` swap that survived r1. **But** that pin sits inside `it.skipIf(!rnAvailable())` (`:111`) though it compares two local lists — type-design probe B: with the phone repo absent the same mutation SURVIVED (5 passed / 6 skipped, exit 0). F2's point — the list is checked against something outside itself — holds only on a phone-present box. |
| F3 | HIGH | tests HIGH + sf MEDIUM | `696f3bb` | **FIXED** | `norm = s.toLowerCase().replace(/\s+/g,'')` applied to needle AND haystack in both scans (`glass-tokens.test.ts:43,142-146`; `palette.test.ts:44,152-154`); demo literals not re-spaced (byte-exact pins intact). Tests probe D1 (spaced re-inline at `AlertDialog.tsx:148`) KILLED — was SURVIVED; sf's uppercase-needle probe KILLED. |
| F4 | MEDIUM | tests MEDIUM + sf LOW (+ ts out-of-lane) | `4f834f9` | **FIXED** | `region()` strips `//` comments before slicing (`:114-124`) and throws `region end marker not found` on a missed `before` (`:131-137`) → PARSE-FAILED row. Two UNGATED unit cases added (`rn-token-parity.test.ts:69-90`). Tests probe D4 (old value in a comment above) KILLED — was SURVIVED. The "no `//` inside a string in the five sliced files" invariant was independently re-grepped by ts and sf: zero hits. Guard 67/67 after the strip. |
| F5 | MEDIUM | tests MEDIUM | `6221250` | **FIXED** | Structural source pin `\b<tKey>:\s*colors\.<paletteKey>\b` over comment-stripped `input-theme.ts` beside the value pin (`palette.test.ts:174-194`). My PRESCRIPTION-UNVERIFIED mark discharged: tests probe D5 (`textMute` de-alias) KILLED — was SURVIVED; D6 (de-alias with a leftover satisfying comment) also KILLED — the author closed the F4 class one file over without being asked. |
| F6 | MEDIUM | td MEDIUM + sf MEDIUM + ts LOW (+ web out-of-lane `$`) | `7c245fe` + `001627e`, reconciled at `5e2768e` | **FIXED** | All four clauses at head: (1) `flattenOver(top, ground, ...rest)` — zero-ground is TS2555 (ts probe 3, tests D9, integrator P5 all KILLED at compile time); (2) contrast test's `flatten()` parses every layer once and throws `bottom ground must be opaque` on a translucent last layer, pinned at `:281` with td's exact r1 input — my PRESCRIPTION-UNVERIFIED mark discharged (td confirms; tests D7, integrator P1 KILLED); (3) `warnUnparseable` dev-warn on both silent arms (`scale.ts:105-115`, `:142-145`, `:180-186`), call-count-pinned in `scale.test.ts`; (4) rgb regex `$`-anchored, 4/8-digit hex parse their alpha (`withAlpha('#2B8CC125', 0.5)` → `rgba(43, 140, 193, 0.5)`, pinned). The merged `flatten()` is code neither seat ran: I read it — guard ordering is right (opaque-bottom check runs BEFORE the one-entry short-circuit, so `flatten(['rgba(0,0,0,0.1)'])` throws); integrator P1–P6 and tests D7–D9 exercised both halves together. Residual: the `looksLikeColour` gate → **F13**. |
| F7 | MEDIUM | td MEDIUM | `627ac63` | **FIXED** | `const ACCENT_FROM = '#1F6B99' satisfies typeof colors.primaryDark` (`glass-tokens.ts:42`); comment extended with the `satisfies`-not-`=` reason and a §91 cite. ts probe 4: one-sided `primaryDark` mutation KILLED at compile time (TS1360); guard still reads 67/67 through the new form. |
| F8 | LOW | td LOW + ts/web/sf MEDIUM (demoted r1) | `824df2a` | **FIXED** (as scoped) | `T.borderSoft` / `T.radius` deleted (0 readers re-confirmed by ts and td; tsc 0). `glass-tokens.ts:59-62` comment now names U1.1 as the deriving package (`GLASS_TIER.dark.card`) — ts opened the plan's U1.1 row and confirms the claim; sf confirms matrix A30 assigns the token to U1. **Web lane marks PARTIAL** wanting a ledger row for the interim literal — **overruled**: the plan's U1.1 row IS the record with a named package; a ledger row duplicating a scheduled plan row is a suppression that cannot expire on its own. The optional relation pin (A's PR-2) is correctly NOT taken (integrator R-1, concur): it would encode `withAlpha(colors.border, 0.5)` as the source when U1.1's source is the tier. |
| F9 | LOW | disclosed; U0.4 P-1 refused r1 | `9dbca61` | **FIXED** | `rowH: touchTarget.min` (`input-theme.ts:43`), literal type preserved by `as const`, `TimeWheel.tsx:8` unchanged; pinned in SOURCE and VALUE at `scale.test.ts:35-41` (the F5 idiom). Deferral withdrawn by the author. |
| F10 | LOW | web LOW | `92eb61e` | **FIXED** | Remedy 2 taken: docblock (`phone-frame.tsx:6-14`) and inline note (`:52-53`) state geometry is mirrored, colour is marketing's own and deliberately does not track the demo. Comment-only; marketing↔demo isolation re-swept clean by ts and web. |

**Fix-introduced regressions in the blast radius:** one (F11, below). Everything else was hunted and cleared by at least two lanes — `LIT_GLOW` evaluating `withAlpha` at module scope does not reach the new warn arm (6-digit hex branch); F4's strip applies to every reader and threw no false PARSE-FAILED; F2's first non-hex anchors (`overlay`, `overlayLight`) are the first live exercise of `norm` and read OK; no engine file, no `useStore`, no new deep import, no new dependency; `/demo` First Load unchanged at 107 kB.

## New findings (append-only)

### F11 [HIGH] F2's membership pin — the one assertion that makes the anchor table non-tautological — is gated behind `it.skipIf(!rnAvailable())` though it needs nothing from the phone repo
Lanes: type-design — original label: HIGH ("fix-introduced, in F2's blast radius"); type-design LOW ("`SCHEME_INVARIANT` stringly typed") folded in as a touch-point
File: `features/demo/ui/inputs/__tests__/rn-token-parity.test.ts:111` (the `it.skipIf` case "pins every palette key in BOTH scheme halves") containing `:123-125` (the membership `expect`); `:154-155` (`SCHEME_INVARIANT`); the guard's docblock at `.design-sync/check-rn-parity.mjs:243-249` delegates enforcement to that pin
Issue: both sides of `expect([...PALETTE_KEYS].sort()).toEqual(Object.keys(palette.dark).sort())` are local — a `.mjs` array and a TS module in this repo — yet the assertion lives in a case skipped whenever the sibling phone checkout is absent. Type-design probe A (phone present): `link→card` KILLED. Probe B (same single mutation, RN path pointed at a non-existent sibling — declared): **SURVIVED, exit 0**, "5 passed | 6 skipped"; negative control with a clean list gives the byte-identical outcome, so the skip, not chance, hides it. Confirmed at source: the hunk in `4c2a4fa` places the new `expect` inside the pre-existing `it.skipIf(...)` block. The correct pattern is three describes up in the SAME commit series — F4's `region()` cases sit in an ungated describe at `:69-70` with the comment "pure string work — no sibling repo, so they run everywhere, which matters for a guard whose every other case is skipIf". The membership pin is exactly that kind of case; F2's point (the list is compared to something outside itself) is not held on the configuration ledger §91 documents. Severity held at HIGH rather than MEDIUM: the probe survived under a documented deployment condition, the fix is a cut-and-paste, and this is the load-bearing assertion of the round's F2 fix — a fix that satisfies the letter and misses the point on the default contributor/CI box.
Fix: move the membership `expect` into an ungated describe (its own, or F4's `region()` one). The derived `anchors.length` line STAYS gated — `anchors` comes from `checkParity()`, which reads the phone files. While there: `new Set<PaletteToken>(['onPrimary', 'onError'])` so a typo'd exclusion is a compile error instead of a misleading runtime red (`palette` is already imported at `:6`; `PaletteToken` is exported from the same module). No new test prescribed; type-design's probe B is the verification — re-run it (phone absent) and confirm the kill.
Owner: `adff9eb9a7670742f` (U0.4 — guard)

### F12 [MEDIUM] Four of F1's six re-pointed sites carry no value pin — reverting the active tab label to the 2.54:1 fill shade is invisible to every suite that renders it (SURVIVED)
Lanes: tests — original label: MEDIUM (ruling requested by the integrator; integrator I-1 MEDIUM + A's PR-3 proposed deferral → REFUTED, see below)
File: `features/demo/ui/screens/MediaLibrarySheet.tsx:225` (active-tab underline), `:226` (active tab label, text), `:245` (badge numeral, text), `:576` (selected-row rail) — pins to land in `features/demo/ui/screens/__tests__/MediaLibrarySheet.test.tsx`
Issue: tests probe R1 reverted `:226` to `color: isActive ? GLASS.accentFrom : '#7a9fc4'` (the exact pre-F1 code, 2.54:1 against an AA-text floor of 4.5) — **SURVIVED** across the six suites that render the component (83 passed, exit 0). No assertion reads an inline style on this subtree; `palette-contrast.test.ts` measures tokens, not which token a site spends; the BANNED scan cannot see a TOKEN re-point. Two thirds of a HIGH fix has no falsifiable pin, and the AA numbers justifying it exist only as comments. The integrator's proposed deferral to U7.2 rests on "pinning them today means inventing a fixture" — **false, checked at source**: `MediaLibrarySheet.test.tsx` already renders the sheet with tabs and has a `tab(name)` accessor and an active-tab case at `:87-91` (`aria-pressed`), a badge-numeral case at `:101` (`within(tab('Photos tab, 2 items')).getByText('2')`), and a selected-row case at `:218-222` (`aria-current`). Every one of the four sites is reachable from an existing case; the deferral's reason does not survive the file.
Fix: add value assertions in those existing cases, in the exact idiom `ExportHub.test.tsx:115-118` already uses (jsdom normalises hex to `rgb()`): `expect(tab('Photos tab, 1 items').style.color).toBe('rgb(184, 212, 240)')` and `expect(tab(...).style.borderBottom).toContain('rgb(184, 212, 240)')` in the `:87` case (kills `:225`/`:226` together); one assertion on the badge span's `color` in the `:101` case; one on the selected row's `borderLeft` in the `:218` case. PRESCRIPTION-UNVERIFIED — no lane executed these pins (the fixtures are proven present; the idiom is proven at ExportHub). Re-run tests probe R1 after adding them and confirm the kill.
Owner: `ae5f52b4da850cd08` (U0 implementer A — F1's author)

### F13 [LOW] `looksLikeColour` silences the `withAlpha` dev-warn for exactly the CSS-function inputs this module's own docblock bans
Lanes: silent-failures — original label: LOW (fix-introduced)
File: `features/demo/ui/tokens/scale.ts:117-118` (the predicate `/^(#|rgba?\()/i`) and `:142-145` (the arm it gates)
Issue: the noise argument is right for `transparent` / `currentColor` / named colours (documented-safe inputs) and wrong for `color-mix(`, `hsl(`, `hsla(`, `linear-gradient(` — none is documented-safe, all four return unchanged with the requested alpha silently dropped, and `color-mix()` is the one value form the docblock at `:106-109` bans inside `features/demo/**`. So the fix breadcrumbs the malformed-hex case and stays silent on the case that motivated the ban; the sibling arm in `flattenOver` warns unconditionally and is correct. LOW: no such value exists under `features/demo/**` today and the contrast gate rejects `color-mix()` on anything reaching a ground stack.
Fix: one line — invert to an allow-list of the documented-safe words (`transparent`, `currentColor`, `inherit`, `none`) and warn on everything else, or widen the pattern to any function notation `/^(#|[a-z-]+\()/i`. No behaviour change on any current caller; the existing `scale.test.ts` warn case still passes.
Owner: `ae5f52b4da850cd08` (U0 implementer A — U0.2 territory)

## Dropped / demoted lane findings (this round)

| Lane item | Lane · label | Disposition | Reason |
|---|---|---|---|
| Fill-only source guard for `GLASS.accentFrom` "landed nowhere" | web · LOW (+ integrator I-2 LOW, + A's PR-1 proposed ledger row) | DROPPED — no finding, no ledger row | After F12 lands, every one of the six foreground sites carries a VALUE pin on `link`, so a re-point back to `accentFrom` at any of them is caught; a source scan for the token in `color:`/`border*` positions guards only against NEW code spending the token as a mark — which is reviewed code — and the web lane itself calls the scan "brittle" as an alternative. The repo's guard philosophy is literal-level (BANNED/RETIRED), not usage-level. Speculative; if a second accent-as-mark regression ever appears, U2.2 (the button rewrite) is where a usage-level guard would earn its keep. The orchestrator's suggested routing to U0.5 is therefore not taken. |
| `SCHEME_INVARIANT` typed `Set<string>` | type-design · LOW | folded into F11 as a touch-point | Same file, same owner, one type argument; the lane itself notes the failure direction is loud. |
| F8 marked PARTIAL — wants a ledger row for the interim `GLASS.borderSoft` literal | web · (status dissent) | OVERRULED → F8 FIXED | Plan U1.1 row + matrix A30 own the derivation with a named package; sf and ts both verified the premise at source. A ledger row duplicating a scheduled plan row would be a suppression with no independent trigger. |
| `flatten([])` throws a bare `TypeError` | integrator I-3 INFO; type-design residual | not filed | Unreachable from `contrast()` / `worst()`; loud, not silent. Both seats reached the same call independently. |
| r0 LOW `scheme: 'any'` sentinel "not in the mapping" | type-design residual | no action | It was DROPPED in VETTED-r1 (Dropped table), so it correctly does not appear in the fix mapping; the lane's neither-confirm-nor-disclaim is the right reading of contract §7. |

**Integrator deferral proposals — all three refused, zero ledger rows this round:** PR-1 (fill-only guard → U2.2): refused as above. PR-2 (`borderSoft` relation pin): the integrator refuted it itself (R-1); concur — the pin would name the wrong source. PR-3 (MediaLibrarySheet pins → U7.2): refuted at source — the fixture exists → **F12** is a FIX, not a deferral.

**Author refutation on F1's before-ratios (PR mapping comment) — web lane's ruling adopted:** the same-ground pre-U0.3 figures (5.01 / 4.06 / 3.58) reproduce and are the right way to isolate U0.3's own contribution, but "the inversion was latent before U0.3" holds for exactly one of four surfaces (the badge numeral, 4.06 < 4.5); the tab label, spinner arc and lit outline still cleared their floors pre-U0.3, so U0.3 was the sole cause at three. Both framings are correct answers to different questions; neither changes the fix.

## Owner routing summary (r2 fix round)

| Owner | Finding IDs |
|---|---|
| `adff9eb9a7670742f` — U0.4 (guard) | F11 (HIGH; includes the `Set<PaletteToken>` touch-point) |
| `ae5f52b4da850cd08` — U0 implementer A | F12 (MEDIUM), F13 (LOW) |
| `aaa5c5ea7ea00825b` — U0.5 | none this round (the fill-only guard was not filed) |

## Lanes to resume for the r2 fix-delta

Not a resume-nobody round (one HIGH, one MEDIUM, and the r2 fix diff touches three files). Resume, each scoped to its own finding plus the r2 fix diff: **type-design** (F11 author — re-run probe B with the phone absent), **tests** (F12 author — re-run probe R1; also F11's file is its territory), **silent-failures** (F13 author). **typescript**: resume narrowly if the F13 predicate change or the F11 move is anything but the prescribed one-liners; otherwise its r1-delta APPROVE stands. **web**: no resume needed — the r2 diff adds test assertions and a regex; no `.tsx`, marketing or a11y surface moves. The verification seat's re-cut of the AFTER captures at the r2 head is a merge gate, not a lane (below).

## Merge gate — conditions carried beside the verdict

1. F11 and F12 fixed and re-probed KILLED (F13 with them; all three are small).
2. **Verification re-cut at the post-r2 head, not `7099e54`:** the web lane found `_captures/w0/DIFF.md:6` names the AFTER set as the PRE-fix head (`12-s4-library-tabs.png` stamped 00:52; `8f876b9` landed 01:29), so the current AFTER captures show the F1 DEFECT, and `assembly-gates.log.build`'s 107 kB is `7099e54`'s (the integrator's cold `pnpm build` at `5e2768e` independently reports 107 kB — the number is fine, the artefact is stale). Two things want eyes in that run: the Media Library tab strip (selected tab now clearly brightest) and the lit `ExportCaseCard` outline + halo, now a pale near-white (`#b8d4f0` at 0.35) where it was saturated blue — correct by the token rule and the numbers, but a real change in the Export Hub's character the owner should see before merge.

## Ledger interaction

Triggers this diff satisfies: none. Trigger-lapsed findings: none. Rows written this round: **none** (three proposals refused above). Standing notes for the ledger's reader: §91 is now cited from code (`glass-tokens.ts` F7 comment) and the sf lane repeats that a `"parity": "node .design-sync/check-rn-parity.mjs"` script is the cheap half of enforcement — belongs to whoever satisfies §91's trigger, not to this PR.

## Agent IDs

Unchanged from `VETTED-r1.md`: typescript `a4c5c572ffccfbfd2` · web `a8c0513e7045e143e` · tests `a612a9b18fb01a882` · silent-failures `a0eee46d047065bbd` · type-design `ae371985d5c932c30` · verification `ae2b8ca4003b5eb41` · aggregator `a0a927cee97a72c8d` · implementer A `ae5f52b4da850cd08` · U0.4 `adff9eb9a7670742f` · U0.5 `aaa5c5ea7ea00825b` · integrator: `dt-integrator` (ID not in its report — orchestrator's record).

## Pipeline notes

- **Round quality:** every r1 survivor was re-run as the IDENTICAL mutation by the lane that raised it and killed (tests D1/D2/D4/D5; ts 1; sf a/b; td's F6 input pinned verbatim). All three r1 PRESCRIPTION-UNVERIFIED marks (F2 membership pin, F5 structural pin, F6 clause-2 assert) were executed this round rather than read — the mark did its job.
- **The fix-introduced HIGH is a placement error, not a design error**: the U0.4 seat wrote the ungated-describe principle for F4 and did not apply it to F2's pin in the same branch. Worth one line in the guard's docblock when F11 lands ("anything that reads only local files lives outside `skipIf`").
- **Cross-seat confirmations:** F6's merged `flatten()` was probed from three seats (integrator P1–P6, tests D7–D9, td/sf by reading) — the union carries both halves. F12 was found by the tests lane and independently named by the integrator (I-1) and by F1's own author (PR-3) — three seats, one gap; the only disagreement was disposition, settled by opening the test file.
- **Scratchpad hygiene from r1 is fixed:** the web lane reports it now uses a per-lane subdirectory (`scratchpad/lane-web-r1/`); no cross-agent contamination reported this round.
- **Plan corrections owed (orchestrator, at merge) — carried from r1, one addition:** the guard's docblock now publishes the corrected anchor schedule (59 keys / 123 rows; U3.1 adds `successLight`/`warningLight` only) — the plan's U0.4/U1.1/U3.1/U8.2 stage figures and matrix A96's "~44 keys / ~88 rows" must follow it.
- **Stale trailer in the orchestrator's brief template** (integrator R-2): the `Claude-Session` URL carried a one-character typo (`…Lu3BSv4` vs the repo's `…Lu3mBSv4`) and the `Co-Authored-By` model name was not the committing seat's. The integrator corrected both in `5e2768e`; fix the template.

---

# § Closing verdict — W0 fix-delta r2 @ `281a95a` (appended here; W0's review is two files: `VETTED-r1.md` + this one)

**Verdict: APPROVE** — PR #39 is mergeable. 0 CRITICAL · 0 HIGH · 0 MEDIUM · 0 LOW open. Lanes: type-design F11 FIXED (probe B re-run phone-absent → KILLED), tests F12 FIXED (R1–R4, each revert kills singly) + F11 FIXED (R5, phone-absent), silent-failures F13 FIXED (predicate evaluated both directions) — all APPROVE, 0 new. Aggregator: warm, same seat.

## Fix diff `347d132..281a95a` — my own verification (the floor)

| F-ID | Commit | Verified at source |
|---|---|---|
| F11 | `c93c05d` | Membership `expect` now its own `it` at `rn-token-parity.test.ts:87` inside the ungated block (renamed "the guard's local invariants — nothing here reads the phone repo", with the rule stated for the next case). `anchors.length` (`:139-142`) correctly STAYS inside `skipIf` — it reads `checkParity()`. `SCHEME_INVARIANT: ReadonlySet<string> = new Set<PaletteToken>([...])` — typo → TS2769 (probed by td and by the author). Case count 11 → 12. |
| F12 | `b4de0a1` | `LINK = 'rgb(184, 212, 240)'`; four value assertions in the three EXISTING cases (`:101-105` tab colour + underline, `:116` badge numeral, `:231-233` selected-row rail) plus two negative controls (inactive tab NOT link; unselected row NOT railed) — the fixture I said existed is the one used, ExportHub idiom. My r1 PRESCRIPTION-UNVERIFIED mark is discharged by tests R1–R4. |
| F13 | `2169c27` | `looksLikeColour = /^(#|[a-z-]+\()/i` — every function notation warns; bare keywords (`transparent`, `currentColor`, `inherit`, `none`) stay silent; new `scale.test.ts` case pins one warn per function form and zero on the four keywords. Predicate-only change; `withAlpha`'s contract untouched. |

Fix-introduced regressions: none (three seats hunted; r2 touched no rendered code — two test files, one dev-only predicate). Cold gates at `281a95a` per the mapping comment and the lanes: guard exit 0 (67/67) · tsc exit 0 · suite exit 0, **269 files / 3,522 passed | 15 todo**.

## Final status, F1–F13

| F | Sev | Final | Closed by |
|---|---|---|---|
| F1 | HIGH | FIXED | `8f876b9` (+ F12 pins) |
| F2 | HIGH | FIXED | `4c2a4fa` + `c93c05d` (F11 closed the PARTIAL) |
| F3 | HIGH | FIXED | `696f3bb` |
| F4 | MEDIUM | FIXED | `4f834f9` |
| F5 | MEDIUM | FIXED | `6221250` |
| F6 | MEDIUM | FIXED | `7c245fe` + `001627e` (+ `5e2768e` reconciliation) |
| F7 | MEDIUM | FIXED | `627ac63` |
| F8 | LOW | FIXED (as scoped; U1.1 derives `GLASS.borderSoft`) | `824df2a` |
| F9 | LOW | FIXED | `9dbca61` |
| F10 | LOW | FIXED | `92eb61e` |
| F11 | HIGH | FIXED | `c93c05d` |
| F12 | MEDIUM | FIXED | `b4de0a1` |
| F13 | LOW | FIXED | `2169c27` |

13/13 FIXED · 0 deferred via the ledger from findings (five ledger rows this campaign — §89–§93 — record boundaries, not unfixed findings).

## Ledger interaction (closing)

Rows to add: none. Rows to close: none — §89 (U2/U6), §90 (U2.2), §91 (first CI workflow), §92 (U8.4), §93 (value-change commits) all have unexpired, later-package triggers; §31's partial-resolution note stands. Nothing in r2 touched a trigger.

## Merge gate — resolved

The r1-delta gate "verification re-cut at the post-r2 head" is satisfied by a re-cut at `15e5a6f` **or later**: r2 changed no rendered code (`git diff --stat 347d132..281a95a` excluding docs = two `__tests__` files + `scale.ts`'s dev-warn predicate), so captures taken at `15e5a6f` are pixel-equivalent to `281a95a`. The two surfaces named for the owner's eye stand: the Media Library tab strip (selected tab brightest) and the lit `ExportCaseCard` outline/halo now pale near-white.

## State of W0 — for the PR #39 merge

1. The token layer is in: `ui/tokens/palette.ts` (32 keys × both halves, phone names, type-enforced key set) + `ui/tokens/scale.ts` (scales, `withAlpha`, `flattenOver` with a required ground and dev-warn arms) + the CTA re-based to `PrimaryButtonGradient.dark` (`ACCENT_FROM satisfies typeof colors.primaryDark`).
2. The gates hold the line mechanically: drift guard 67/67 with comment-stripped regions, loud on a missed marker, membership-pinned against the palette on every box (phone present or not); literal scans normalise both sides; `T` aliases pinned by source; contrast contract ported (4 live rows, 15 owned todos, opaque-bottom guard).
3. Accent-as-mark regression caught and closed: `GLASS.accentFrom` is a fill shade with zero foreground consumers; the six former sites spend `colors.link` (9.60 / 7.78 / 6.86 / 9.23) and all six carry value pins.
4. Known and recorded, not open: §89 (`#2B8CC1`-as-text 3.94 at 14 sites → U2/U6), §90 (dark-only CTA pair → U2.2), §91 (guard skips without the phone repo → first CI), §92 (case-map export keeps the old palette → U8.4), §93 (unchanged hexes unbanned until their value moves). Depth inversion / button collapse / `#05080d` cut / grid strength are W1–W8 sequencing, not W0 defects — do not device-pass W0 alone.
5. Plan corrections owed at merge: guard schedule 59 keys / 123 rows supersedes ~44 / ~88 (A96, U3.1 adds two keys not four); U2.2 +`PrimaryButtonGradient.light`; U8.4 +template decision; U1.4 +`header`/`elevated` ground stacks; matrix line 550's "§89" forward reference is stale; the brief template's `Claude-Session` trailer typo.
