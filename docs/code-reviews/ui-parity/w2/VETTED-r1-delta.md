# Vetted Review — W2 (PR #42 `feat/uiparity-w2`) — Round 1 FIX-DELTA @ `250e12f`

**Verdict:** REVISE — narrowly: **21 of 24 FIXED, 3 PARTIAL (F29 HIGH · F34 MEDIUM · F38 MEDIUM), 0 UNFIXED, 0 new findings.** The three remainders are the rider set below; all are one-to-few-line fixes with named owners.
**Fix diff:** `addd03f..250e12f` (24 fix/docs commits + 11 fix-branch merges; one merge conflict in eleven, an F36-arrives-twice import union) · authority: the fix-mapping comment on PR #42 · integrator § fix round 1 appended to `INTEGRATION-w2-assembly.md`.
**Lanes read (delta sections):** typescript 4/4 FIXED, 0 new, APPROVE · web F27/F35/F41/F43/F46 FIXED, **F29 PARTIAL, F34 PARTIAL**, 0 new, REVISE · tests 7/7 FIXED (17/17 probes KILLED), 0 new, APPROVE · silent-failures 3/3 FIXED (F32 both halves, F33 + a W1/F23 closure restored), 0 new, APPROVE · type-design F26/F33/F39/F44/F45 FIXED, **F38 PARTIAL (14/22)**, F49 disclaimed per contract §7, APPROVE-wc.
**Aggregator:** warm (`ab0635173e8414282`), same seat as r1.

Cold gates at `250e12f`, reproduced independently by ts, tests and web in their own worktrees: tsc 0 · 290 files / **3,899 passed | 4 todo** · guard 135/135 · `pnpm build` 0, `/demo` **107 kB** (every route byte-identical to r0 and to `43ccbad`).

## Unsettled — for the operator

None. **F49's attribution is settled:** the vetted doc's `Lanes: tests` line was correct — the tests lane authored it and re-verified the fix (`520b3f0`); the type-design lane's dispatch listing was a coordinator-brief error, and its refusal to confirm an ID it could not find in its own set is the contract working as designed (§7). No coverage gap resulted: the finding's author verified it.

## Prior findings — status (my verification of each fix commit, then the lanes')

| F | r1 sev | Commit(s) | Status | Evidence (floor + lanes) |
|---|---|---|---|---|
| F26 | HIGH | `7cf2caa` | **FIXED** | `Banner.tsx:155` reads `severityTone(severity)`; `BannerSeverity` DELETED (tombstone comment only); `banner.test.tsx` imports `SEVERITIES`. ts probe r1-B (the F26 scenario: seam re-tinted + trio resurrected) KILLED, 5 failed; r1-A correctly reports the pin is now RELATIVE (component and oracle move together — the seam's own values stay pinned in `status.test.ts`/`status-owners`, 4 failed, all four control clauses). ts re-read the restructured file in full. |
| F27 | HIGH | `4b03874` + `f2303ed` | **FIXED** | `UNCHECKED_MARK_EDGE = colors.textTertiary`, one constant, four consumers; ratio bounded AT the constant against both ground sets; divergence-from-phone recorded at the site (C.3 rule 4 + D5 `primaryDark` precedent) with a §8 phone-side follow-up named. Web re-sampled real pixels at the fix head: **1.33 → 5.31** (border-vs-fill), 4.35 vs card. The author self-caught a constant-composed tautology (probe W-F27b SURVIVED a revert) and shipped `f2303ed` naming the failing value — the exact class web's r0 probe 4 flagged. |
| F28 | HIGH | `f5e3644` | **FIXED** | `missing(el, fragment)` helper + one case over all five spread points + a composition case; `sheet-chrome.test.tsx` now renders `PickerSheet` first in the A46 case (the false title cured by making it true). Tests re-ran all five r0 survivors: **five KILLS**, each restored and proven. |
| F29 | HIGH | `dff6ce2` + `af0feac` | **PARTIAL — the rider's HIGH** | `minWidth: 0` on the label is live and released the LABEL floor (labels render natural-width, one line) — necessary, not sufficient. Web measured at the fix head in real Chromium: pane clientW 342 vs scrollW **363**; `fc-profile-canvas` right edge **433.8 vs pane 413** — the third chip is still clipped ~21px (was ~42). The binding floor is the **`<button>` flex item's own `min-width: auto`** (60px fixed chrome per option × 3 + labels + gaps ≈ 357 > 342). Both docblocks now assert a fix that half-works — the second consecutive wrong claim at those sites. The mapping's "capture-gated evidence" was asserted before any capture existed (pipeline notes). |
| F30 | MEDIUM | `6b5e8f3` | **FIXED** | Scrim read as `dialog.previousElementSibling`, asserted `MODAL_SCRIM_Z + overSheet` AND the ordering both ways (`> SETTINGS_SHEET_Z`, `< dialog.zIndex`). Tests re-ran the r0 survivor: KILLED (`expected '21' to be '25'`). |
| F31 | MEDIUM | `94b7182` | **FIXED** | Three phases rendered, dot `background` + label `color` composed from `colors.*`, distinctness guard; `status-owners.test.tsx:11-21`'s false claim corrected, not softened. Tests: collapse AND partial-collapse probes both KILLED; the fourth assertion ruled keep (tests' own re-check — a partial collapse needs it). |
| F32 | MEDIUM | `c113c74` | **FIXED — both halves** | `EXEMPT` keyed `` `${Role}:${string}` `` (template-literal type — tsc checks the prefix); one `reported(role, text)` predicate serves scan and backstop, dead = "excuses nothing". sfh re-planted its r0 radio: KILLED naming the file; the adoption case (its r0 HIGH-2, structurally invisible before): KILLED naming the role-scoped key. §100's corrected close condition is now also mechanically true. |
| F33 | MEDIUM | `a064b06` | **FIXED — better than prescribed** | Two forms, two inputs: destructure alternative runs on RAW source, member-access on `maskOwnHalfArms(src)` (masks the key + own-half reads, leaves the rest standing). Both r0 survivors KILLED (both lanes re-ran); the mirror arm (td E1b) and sfh's probe (c) KILLED; zero false red on the clean tree; the disclosed wrapped-arm ceiling probed by sfh and confirmed to fail CLOSED (loud false red, not silence). **Side effect verified: W1/F23's multi-line destructure closure — which the r0 filter had silently re-opened — is restored** (sfh blast-radius probe KILLED). |
| F34 | MEDIUM | `18a7033` | **PARTIAL — 3 of 4 touch-points** | `SHEET_SHADOWS` both halves read via `[scheme]` (light folded correctly from `Layout.ts:176-182`); dot glow + title shadow gated `scheme === 'dark' ? … : undefined`; dark bytes unchanged. **`DIALOG_SHADOW` (`CentredDialog.tsx:60`) is still a lone dark literal** — a dispatch gap, honestly disclosed by U4.3's report ("my dispatch named F41/F43/F47 only"): the r1 Owner line's cross-seat touch-point never reached the seat's brief. Light value ready at `Layout.ts:157-163`. Web accepted the two disclosed non-kills on the `isDark` gates (the §99 class, correctly not re-filed). |
| F35 | MEDIUM | `b9c14f6` | **FIXED** | The exact prescribed shape; web probed both motion arms at the fix head — the table's last cell now reads `""`; positive motion-ON pin shipped beside the negative one (stronger than asked, with the cited precedent). |
| F36 | MEDIUM | `4391f77` | **FIXED** | All five bindings gone, comments kept; the integrator's RED is the honest one (`tsc --noUnusedLocals` naming exactly the five). Root cause proposed as a ledger row → **§119 written, re-cut** (below): ts re-ran the flag at head — **11 TS6133 remain**, none in the five cited files, so the flag cannot flip yet. |
| F37 | MEDIUM | `5c2c2f9` | **FIXED — my prescription's tripwire half REFUTED by measurement, correctly** | The pin is a border-VALUE pin on an error toggle rerender (`field-input-recipe.test.tsx:132-158`); tests re-applied the W1 defect: KILLED at the border value — **and React logged nothing** (`conflictingStyleWarnings` stayed empty), so the tripwire structurally cannot see this defect shape and `vitest.setup.ts`'s "sole guard / transitive coverage" claim is corrected to name the real pin. Tests also probed module identity on the imported warnings array (KILLED — same instance). Mechanism matches U6.1's planned shape for a clean W3 merge. |
| F38 | MEDIUM | `4c9b828` + `44abc84` | **PARTIAL — 14 of 22** | DONE: `sheet-chrome.ts` (13) + `SIZES`. NOT DONE (td's enumeration, re-probed at head — `dialogSurface.padding = 999` still COMPILES): `CentredDialog.tsx:76,:114` · `_shared.tsx:97,:108,:137,:174 (+:55,:200)` · `Banner.tsx:125,:145` · `EmptyState.tsx:56,:65,:77`. U4.3, U4.2 and U3.3 shipped their other findings in those exact files without the one-token rider — the same cross-seat touch-point drop as F34. |
| F39 | MEDIUM | `18654fd` | **FIXED — stronger shape** | `disabled?: { reasonId: string }` — one member, both facts (FD-4); `'aria-disabled': disabled ? true : undefined` avoids the object-through-attribute hazard (ts checked the exact line); compile-level RED; all call sites migrated (tsc 0 is the proof). |
| F40 | MEDIUM | `580217c` | **FIXED** | `lab()` throws on non-finite channels inside the helper; finiteness + length asserted before the band filter. Tests re-ran the r0 survivor: KILLED. |
| F41 | MEDIUM | `236d83d` | **FIXED** | Web read the rendered element: `gap: 16px` on the live dialog action row; three files, two phone citations in the body. |
| F42 | MEDIUM (TRIGGER-LAPSED §95) | `dd680f6` | **FIXED — §95 discharged** | Floor check: the guard's exclusion block now names all three shadow tiers with the full reasoning (why a composing reader would be "equal by transcription", what covers each tier, and WHAT WOULD REOPEN IT — a phone-side `Layout.shadow.*` change or a fourth tier). §95's "records the gap once for all three" option, taken properly. **§95 struck ✅ RESOLVED in the ledger this round.** |
| F43 | MEDIUM | `5c07ed5` | **FIXED** | Web read the rendered scrim: `rgba(0, 40, 83, 0.9)` = `colors.overlay`; `CentredDialog.tsx:117` reads the token; pinned as a DIFFERENCE from `colors.scrim`; ExportModal's progress scrim moved with it; the `modalScrim` docblock sentence landed per the ruling. |
| F44 | LOW | `1dc6b49` | **FIXED — stronger** | Record keyed off the union's own template-literal expansion; widening now reds at the DECLARATION. |
| F45 | LOW | `44abc84` | **FIXED** | `satisfies Record<ColorScheme,…>` ×3; td re-probed: a dropped half is now TS1360 at the constant (was a test-file TS2339 only). |
| F46 | LOW | `36a8438` | **FIXED** | Role + tabIndex + Enter/Space arrive together, gated on `closeLabel`; web's drop-the-role alternative REFUTED on A82 evidence (the map-filters sheet has no other close control) and withdrawn; the `switchKeyDown` inlining is a verified cycle-avoidance. |
| F47 | LOW | `0ed7b19` | **FIXED** | Four dead keys gone, `flex: 1` kept, plus an anti-resurrection pin; tests sampled it and its anti-tautology control. |
| F48 | LOW | `194d0cd` | **FIXED** | "SIX entries over SEVEN files" with the pairing explained; the title carries no number. |
| F49 | LOW | `520b3f0` | **FIXED** | The comment now says 41 / 65 / 135 MEASURED — three figures corrected, not one; tests verified by importing the module. Attribution settled (Unsettled section). |

Fix-introduced regressions: **none found by five lanes** (web's lit-edge sweep: same 16-hit set as r0; ts's regression sweeps clean; sfh: zero console deletions, zero new catch/void/then; tests sampled cross-lane fixes; the one fix-merge conflict read and probed by the integrator, 9/9 at the merged head).

## The rider set (the three PARTIALs — no new F-numbers; same defects, refined root cause)

| F | Remainder | Fix | Owner |
|---|---|---|---|
| **F29** (HIGH) | The `<button>` flex item's `min-width: auto` still floors the 3-up row at ≈357px vs 342 available; third chip clipped ~21px | `minWidth: 0` on the option button (web's cheapest remedy; the wrap-per-phone alternative — `RadioGroup.tsx:184-187` — is the fix owner's call if minWidth alone still crowds). **Correct both docblocks to describe what is true this time**, and re-measure rendered — the pin for this defect is the capture, not jsdom. | `ae2d7a1139ac951d1` (U2.4 seat) |
| **F34** (MEDIUM) | `DIALOG_SHADOW` still a lone dark literal | `Record<ColorScheme, string>` read via `[scheme]`, light = `0 8px 28px rgba(30, 58, 138, 0.15)` (`Layout.ts:157-163`), same one-line shape as `SHEET_SHADOWS` | `aacd7de1d0b63642a` (U4.3 seat) |
| **F38** (MEDIUM) | 8 module-level fragments still mutable across four files | `} as const satisfies CSSProperties` per site — routed by file, one seat per file: `CentredDialog.tsx` → U4.3 `aacd7de1d0b63642a` (same commit as its F34 rider) · `_shared.tsx` (6 sites) → U4.2 `a285e52f0befce2f2` · `Banner.tsx` + `EmptyState.tsx` (5 sites) → U3.3 `ae5212edcaf8ada66` | as listed |

**Lanes to resume for the rider delta:** web (F29 — rendered re-measure; F34's light value) and type-design (F38 — re-run the five-assignment probe; F34's Record shape). Tests/sfh/typescript have nothing to re-check — their findings are all closed. Verification: the re-cut (in flight) should include the four settings shots (F29 evidence) and the two dialog shots (F43's landed change); F29's rider needs one more targeted shot after it lands.

## Ledger interaction

Rows struck this round: **§95 → ✅ RESOLVED — PR #42 fix round (F42, `dd680f6`)**. Rows written: **§119** — enable `noUnusedLocals` (F36's root cause; integrator proposal accepted with a RE-CUT trigger: the proposal's own "flip at the fix-merge if clean" fired and the answer is *not clean* — 11 TS6133 remain in other seats' files, measured by the ts lane at `250e12f`; new trigger: each W3+ package clears the TS6133s in files it opens; the flag flips at the first wave boundary where `tsc --noUnusedLocals` exits 0, hard stop U8.4). No other row moves; §99–§118 stand with unexpired triggers.

## Agent IDs

Unchanged from `w2/VETTED-r1.md`. Lane seats: still not printed in any lane file — orchestrator's dispatch record remains the source (fourth round of this ask). U4.1/U4.4 seat `a182220a9c6c7b4a9` closed its seven findings and is **retiring per plan** (successor note in its report §14); its rider load is zero — nothing blocks the retirement.

## Pipeline notes

- **The round's process defect, same class as W1's F19→F23:** both PARTIALs that were pure not-dones (F34's fourth touch-point, F38's 8 sites) are cross-seat touch-points named in the vetted doc's Owner lines that never reached the receiving seats' dispatch briefs. U4.3's report disclosed it honestly. The vetted doc's Owner line is not a dispatch artifact — the orchestrator's fix briefs must carry every `(+touch-point …)` clause, or the aggregator should list touch-points as separate table rows per seat. I will do the latter from W3 on: **one owner-routing row per seat per file, no parenthetical riders.**
- **The mapping comment asserted "capture-gated evidence" for F29 before any capture existed** (`_captures/w2/` had no `after-fixed/` at lane-read time) — the same asserted-not-probed class as r0's P20. The web lane's response is the model: it cut its own Chromium harness run and measured, which is why F29's residual was caught this round instead of at the device pass.
- **F26's residual, stated so nobody re-files it:** resurrecting Banner's private trio *without* moving the seam is behaviourally inert and invisible to any value pin — a coupling defect's inert form. The relative pin catches the only harmful version (ts probe r1-B). A source-text coupling pin was correctly NOT added (string-presence trap).
- **Lane quality:** three fixes shipped strictly stronger than their prescriptions with the lanes' endorsement (F33's two-input split — both prescribing lanes accepted the refutation of their own sketches; F44's declaration-level closure; F39's one-member type). The tests lane self-reported a contract §6 deviation (a transient `lane-tests.new.md` staging file in the review directory, deleted within the minute, rebuilt outside the repo) — recoverable, disclosed, no content lost; noted so the orchestrator knows the shared-directory hazard remains live.
- **Nobody but this seat wrote the ledger this round** — the integrator's "ledgered" phrasing meant *proposed*; verified by `git log` on `deferred.md` (zero commits in the fix range). The one-writer protocol held.

---

# Round 2 — RIDER ROUND + CLOSING @ `e511482`

**Verdict: APPROVE with comments** — F26–F49 **ALL FIXED**; one new LOW (**F50**, a comment-only one-liner, fix-now rider assigned; no re-review round owed).
**Rider diff:** `250e12f..e511482` — F29' `bb7182c` · F34'+F38' (CentredDialog) `530aaf6` · F38' (_shared ×6) `f139eb9` · F38' (Banner+EmptyState ×5) `9c31793`, four branch merges. Cold gates at `e511482`: tsc 0 · 290 files / 3,902 passed | 4 todo · guard 135/135 · `/demo` 107 kB.
**Lanes read (r2):** web APPROVE (F29' + F34' both closed on rendered/source evidence) · type-design APPROVE (F38' census closed; 1 new LOW). Verification: targeted Form-Fields re-cut, `w2/DIFF.md` §ff8–§f13.

## Rider verification (my floor, then the lanes')

| Item | Commit | Status | Evidence |
|---|---|---|---|
| **F29'** (HIGH remainder) | `bb7182c` | **FIXED** | `minWidth: 0` on the `<button>` (the flex item that carried the floor); docblock rewritten to name BOTH nested floors honestly, incl. the two prior half-true claims (spot-checked at `choice-controls.tsx:95-140`). Web, real Chromium: pane scrollW **363 → 342** (= clientW, zero overflow), rightmost painted pixel flush at 413.0, all three declarations live on the rendered nodes. Verification: FIXED on all five Form-Fields shots, both edges at `62..745`. The row now wraps to two lines — phone-parity behaviour (§f10), added to the owner checkpoint list as row 11 (mid-word break `Foren`/`sic` is the one aesthetic the owner should eyeball; the lever is copy or padding, never the wrap). |
| **F34'** (MEDIUM remainder) | `530aaf6` | **FIXED — 4/4 touch-points** | `DIALOG_SHADOWS` both halves, light `0 8px 28px rgba(30, 58, 138, 0.15)` exact per phone `Layout.ts:158-163` (spot-checked at `CentredDialog.tsx:71-77`); consumed via `[scheme]`; web pinned the 40-vs-28 radius split and the no-sign-flip invariant (dialog casts DOWN, sheet casts UP). |
| **F38'** (MEDIUM remainder) | `530aaf6` + `f139eb9` + `9c31793` | **FIXED — census closed** | All remaining module-level fragments `as const satisfies CSSProperties` (13 closer hits across the four files, spot-checked); td's census: 26 fragments total, 9/9 assignment probes now TS2540, zero widening fallout (tsc 0). |

Fix-introduced regressions: none (both lanes swept their blast radii; gates cold-green; every route's bundle unchanged).

## New finding (append-only)

### F50 [LOW] `ModalShell.test.tsx:120`'s comment claims the readonly fragments make a re-added border shorthand "a compile-time change" — type-design's PROBE F disproves it (tsc exit 0 on the mutation)
Lanes: type-design — original label: LOW (r2)
File: `features/demo/ui/screens/__tests__/ModalShell.test.tsx:120`
Issue: `as const satisfies CSSProperties` freezes the OBJECT (assignment is TS2540) — it does not and cannot make adding a `border:` key to a fragment declaration or a consumer literal a compile error. The runtime half of the sentence is true (the pin reds); the compile half is the false-coverage-claim class this campaign polices, in miniature.
Fix: one line — delete "compile-time change as well as", or restate as "a runtime-pinned change (the object itself is readonly; declaration edits are caught by this pin, not by tsc)".
**Ruling: fix-now, not a ledger row** — a comment edit cannot regress anything; it lands as a pre-merge one-liner with no delta round (cold gates at the merge are sufficient re-verification).
Owner: `a285e52f0befce2f2` (U4.2 seat — `ModalShell` territory)

## Final status, F26–F50

**F26–F49: ALL FIXED** (F26/F27/F28/F29 HIGH — closed with rendered or probe evidence; F30–F43 MEDIUM — closed incl. both re-cut remainders; F44–F49 LOW — closed). **F50 LOW — fix-now rider in flight (comment-only).** No UNFIXED, no PARTIAL, no unsettled items.

## Ledger interaction (closing)

No rows written this round; none needed. §99–§118 stand with unexpired triggers; §119 stands (11 TS6133 at `250e12f`; W3+ packages clear as they open files; hard stop U8.4). **Harness `\b` repair (`06-p4-media.js`): no ledger row** — it is verification-driver housekeeping, not a deliberate code non-fix; per the coordinator it is committed on master, which the wave PR merge inherits untouched (the wave branch never opens that path). DIFF.md §f13's "still uncommitted" note predates that commit — orchestrator: confirm at merge, one `git log` on the driver file.

## State of W2 — for the PR #42 merge

1. Twelve packages, nine shared primitives, ~40 hand-rolled recipes absorbed; the wave's four HIGHs (seam bypass, a contrast regression, an unpinned shell, a clipped control) all closed with measured evidence, two of them on real pixels.
2. The gates grew with it: role-scoped adoption scans with a live dead-exemption backstop, the clause-12 scan repaired past F23's closure, five sheet fragments pinned on the rendered element, the recorder paint pinned where it renders, both dialog shadows and the sheet shadows in both scheme halves.
3. Ledger across the wave: §90/§94/§95 resolved · §89/§96/§98 annotated or amended · §99–§119 written (21 rows, every trigger greppable) · six proposals refused, two moot — all recorded in the two vetted docs.
4. Owner checkpoint 2 is `w2/DIFF.md` §7, now eleven rows (row 11 added at closing: the mid-word wrap).
5. Merge order: land F50's one-liner, cold gates, then `gh pr merge 42 --merge --delete-branch`; W3's branch merges master and re-gates before its phases open (standing rule). W3's BEFORE captures must be re-cut under `.env.local` (§4 standing rule — the environment switch happens at W3's BEFORE set, not after).

## Pipeline notes (closing)

- Routing discipline held this round: every rider commit landed with the seat that owns the file, one seat per file, as restructured after r1's cross-seat touch-point drops. The per-seat-per-file routing table format is now this seat's standing practice for W3.
- The verification seat's rendered-evidence loop (Chromium measurements when captures lag, targeted re-cuts after riders) has now caught-or-confirmed the wave's only rendering regression at every stage; its §f10 wrap analysis pre-answered the one owner question the fix raises. Keep the pattern for W3's map work, where jsdom is blindest.
- Aggregator context: ~2 rounds consumed on W2 (r1 + delta + closing). Warm for W3.
