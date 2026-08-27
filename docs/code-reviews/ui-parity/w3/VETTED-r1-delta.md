# Vetted Review — W3 (`feat/uiparity-w3`) — Round 1 FIX-DELTA @ `3dc8676` (head `eb98295`)

**Verdict:** APPROVE with comments — **F51–F75 ALL FIXED (25/25, 0 PARTIAL, 0 UNFIXED)**; five NEW small items (2 MEDIUM, 3 LOW, F76–F80) ruled a **one-rider-per-seat set** before merge, with a two-lane targeted delta.
**Fix diff:** `7d0bf57..3dc8676` (9 seat branches, one commit per finding; fix-merge with 2 unioned `palette-contrast` appends; mapping on PR #43).
**Lanes read (delta sections):** ts 2/2 FIXED APPROVE · web 6/6 FIXED APPROVE-wc (+1M/2L new) · tests 7/7 FIXED APPROVE (11 verbatim probe re-runs, all now killing) · sfh 5/5 FIXED APPROVE-wc (+1M new) · type-design 5/5 + 3 judged-on-request FIXED APPROVE-wc (+1L new).
**Aggregator:** warm (`ab0635173e8414282`). Cold gates at head (three lanes independently): tsc 0 · 307 files / 4,235 passed | 2 todo · guard 143/143.

## Prior findings — status (floor: every fix commit opened against its finding; lanes' re-probes beside)

All 25 FIXED. The load-bearing evidence, by class:
- **F51 (HIGH)** — both halves. Seam: probes B and C now KILL (an RGB-identity-under-alpha case and a two-sided presence floor with the written-out tautology control); sfh re-measured every numeric claim in the rewrite and all reproduce. Consumer: 5/5 sites import `SAMPLE_BADGE`, zero byte-copies (td's census grep), census corrected as a table that admits it "was false when it was written", plus a new ownership ratchet with a live-read control and an honestly-narrowed claim. **The fix also corrects D12's stated rationale with measurement** (at matched alpha the families are ΔE 3.56–6.16 apart — one hue family; the real separation is role-based: translucent tint/amber label vs opaque ground/near-white label). Recorded as a **matrix correction owed** on D12's rationale sentence — the constraint stands, its "different families cannot collide" justification does not. sfh withdrew its own error/info extension after measuring (20.0/48.6/77.2 — no near miss). Bounded residual recorded, not filed: a one-channel-moved hand-typed hex survives the exact-RGB identity check; the realistic vector (`withAlpha(colors.warningX, …)`) reds.
- **F52 (HIGH)** — all three sites re-measured at head: 2.88→**7.02**, 3.09→**7.54**, 3.94→**9.60**, each bounded two-sided AT an exported constant with the negative (`primary < AA` on the same grounds) beside it — W2/F27's shape discharged properly. The picker's selection BORDER correctly keeps `primary` per D4 (non-text, 1.4.11 governs, reasoning now in the docblock) — the one unmeasured claim it leaves is F79.
- **F53 (HIGH)** — five render pins; MONO1/2/3 re-run verbatim, all KILL naming the right files; the `BootSequence` pin's `video={VIDEO}` RED disclosure is the discipline done right. **F53's per-site residual** (a second recipe inside an already-pinned file) is ruled a **declined change-detector** — the boundary tests named it at; recorded here, no row, same refusal class as u3.1-4 D-3.
- **F54** 4-of-4 forms now KILL (brace-balanced walker + widened tokens + the four-spelling planted control). **F55** the seam re-point now reds only the two intended oracles. **F56/F57** both r1 escapes KILLED, F56's fix also closes the escaped-quote second door. **F58** — the seat REFUTED my recorded option (b) at source and web+sfh verified the refutation (during every mount's first frames `getCenter()` is null even with a token; option (b) would lie to visitors with working maps); `canPlaceRing` drives hint AND notice; three provenances now produce three sentences. **F62** — disclosed deviation accepted: `proximityFiltering` derived, not a union ("a union would re-encode a derivation"), switch stays on the request by design; the unobservable window made observable via a never-settling chunk mock with an anti-vacuity control. **F64** — `useOpenerFocusReturn` extracted, all three §103 sites adopted; sfh audited every swallow path clean. **F65** — authorized; the engine returns `{ level, message }` matching the phone's own shape, `#ff7a45` collapsed onto `warningDark` with a stated reason; td's P6 kills a fifth band at the declaration. **F59** 4/4 (the seat found a fourth site itself) · **F60/F61 (71 closers, 35/35 census by mutation)/F63 (seam-consuming at all three arms, spot-checked)/F66/F67/F68 (independently re-derived arithmetic, 65→67 corrected unasked)/F69/F70/F71/F72/F73/F74 (the F39-exact discriminated pair)/F75** — all verified by their owning lanes with probes or at source; nothing confirmed from memory.

Fix-introduced regressions: **one** (F77, filed below); everything else hunted clean by five lanes (sfh's F62 blast-radius trace, tests' four fresh probes, td's P5/P5b disclosure checks, web's route-table byte-compare).

## New findings (append-only)

### F76 [MEDIUM] The FallbackMode notice — the provenance machinery's more important half — spells the D12 amber inline at two sites with zero pins; F51 built exactly the mechanism it needs and stopped at the badge
Lanes: silent-failures (fix-round blast radius, not a re-open — the F51 census was correctly chip-scoped)
File: `screens/ImportModal.tsx:278,294` (`#ffd07a` on `rgba(255,200,90,0.1)`/`0.28` — an alpha matching no other site; zero test hits on either value).
Issue: `result.notice` IS the provenance claim D12 names first; `banner.test.tsx` excludes the file on the D12-defence argument, and nothing built the defence. A re-derive or nudge makes "we substituted sample data" indistinguishable from an ordinary warning, every guard green.
Fix (rider): a `SAMPLE_NOTICE` block beside `SAMPLE_BADGE`, the two sites import it, and the D12 describe gains the same three cases the badge now has. The three non-provenance amber surfaces stay out (sfh's own scoping).
Owner: `aed41144d930dc6f7` (U7.3 — `sample-badge.ts` + the D12 describe; the two `ImportModal` import lines declared as a cross-file one-liner in the same commit)

### F77 [MEDIUM] F73's hoisted live region embeds `${filteredCount} of ${locationCount}` and now announces on every search keystroke that changes the count
Lanes: web (fix-introduced, in F73's blast radius)
File: `MapControls.tsx:233-252` + `MapScreen.tsx:246-247`.
Issue: the region shares its component with the search input; with proximity running, typing mutates a polite region per keystroke — chatter on the one field a screen-reader user needs quiet. The sibling sheet's region is structurally protected (scrim covers the search field) and says so; that argument does not transfer.
Fix (rider): announce activation + radius only (`Proximity filter on, ${proximityRadius} km`) — the counts live in the visible chip and the sheet's subtitle; move the pin.
Owner: `af52d302ebd6d0f94` (U5.2)

### F78 [LOW] The F65 fix lands the round's ONE new mutable module-level table — the F20/F38/F61 class, two commits after the round closed it 35 times
Lanes: type-design (fix-introduced; probe P4 SURVIVED against P2/P6 controls in the same run)
File: `OcrCaptureScreen.tsx:132` (`CONFIDENCE_COLOR: Record<ConfidenceLevel, string>`).
Fix (rider): `} as const satisfies Record<ConfidenceLevel, string>` — one token, same commit as F76.
Owner: `aed41144d930dc6f7` (U7.3)

### F79 [LOW] F52's own 1.4.11 claim is the one value the fix left unmeasured — the selection border sits 0.09 above the floor with no ratio row
Lanes: web
File: `CaseMapPicker.tsx:91-104,196-203`; measured 3.09 dark / 8.29 light.
Fix (rider): export `MAP_PICKER_SELECTED_BORDER`, one `>= AA_NON_TEXT` row beside 46/47.
Owner: `af7b6cf9a5a92efa1` (U5.4)

### F80 [LOW] `useOpenerFocusReturn`'s staleness guard is weaker than its docblock — `isConnected` proves existence, not that the gesture raised THIS overlay
Lanes: web
File: `primitives/useOpenerFocusReturn.ts:42,96-98`.
Fix (rider): null `activationOrigin` after the mount-effect capture (one line), or soften the comment to what `isConnected` proves. The seat picks; both are one line.
Owner: `aee070c22b4ac8667` (U7.2 — the hook's extractor)

**Rider verdict:** five items, four seats, every fix ≤ a few lines; **no full re-review round** — targeted delta: **sfh** (F76's three new cases probed), **web** (F77's announced content + F79's row), td/ts/tests stand down. Plus one housekeeping line in the integrator's rider: delete `banner.test.tsx`'s two TS6133 bindings (§119's unhonoured arm — below).

## Ledger interaction

**§119 annotated:** count 11 → **4 TS6133 (+2 TS6196)** at `eb98295` (tests lane, cold). The "each W3 package clears files it opens" arm **fired unhonoured once**: `banner.test.tsx` was opened twice this wave (the ADOPTED union; F69) and still carries two — assigned to the integrator's rider commit this round. The other two files are untouched-by-W3, no obligation. Flip-day caveat recorded: `noUnusedLocals` does not honour the `_`-prefix convention for locals (`_f20` will need `void` or a rename when the flag flips; hard stop U8.4 unchanged).
**§121 annotated:** the F65 rider cleaned `ocr.ts`'s sibling strings; a fuller census at this desk found **83 em-dash string literals under `engine/`**, dominated by `engine/content/narration.ts` — the rail's demo-originated marketing-voice copy. Whether §4.3's campaign copy rule governs demo-originated narration (vs phone-verbatim copy) is an **owner question routed to U8's exit copy pass**; the row's trigger is unchanged and now carries the honest census.
**No strikes this round** (§103/§112's findings F64/F65 are FIXED — their parent rows' annotations already say they close with the findings; the orchestrator's merge commits both). §120 unchanged. **Matrix correction owed (orchestrator):** D12's rationale sentence, per F51's measured refutation above.

## Agent IDs / lanes for the rider delta

Unchanged from `w3/VETTED-r1.md`. Rider delta: sfh + web only. Verification v6's F52/F60 re-cut lands separately; web's computed-style re-measure stands as rendered evidence meanwhile (W2 precedent), and v6 should add one shot of the F58 token-less hint state.

## Pipeline notes

- **Three refutations of this desk's own r1 prescriptions were accepted on the merits** (F58's option (b) would lie during every mount's first frames; F62's union would re-encode a derivation; F51's error/info extension has no near-miss to guard). All three came with measurements. The pipeline's refutation channel is healthy — prescriptions are claims, and this round treated them that way in both directions.
- **The fix-quality pattern continues:** F51's "shrink the CLAIM to the pattern, not widen the pattern until it lies" and F54's four-spelling planted control are the two sentences the W4 scan briefs should quote. Fourth consecutive wave: every scan finding closed with the claim-narrowing or control-widening shape rather than a wider regex.
- **F77 is the round's one fix-introduced regression** — an a11y fix trading never-announces for over-announces; caught because the web lane re-read the fix's rendered behaviour rather than its diff. The lesson for live-region fixes: the content decision is part of the fix, not an implementation detail.
- **tests' r0 endorsement of `pane-chrome.test.tsx` was self-corrected** ("one assertion too generous — recorded rather than defended") — the honest form; noted because lane self-corrections are the counter-signal to manufactured findings and worth naming when they happen.
- No lane found foreign content in its file; the tests lane's W2 staging deviation did not recur.
