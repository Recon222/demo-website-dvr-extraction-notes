# Vetted Review — W4 (phases U8.1–U8.4, `feat/uiparity-w4` @ `def2aec` vs `master`) — Round 1 (final wave)

**Verdict:** REVISE
**Lanes read:** typescript 0/0/1/0 APPROVE-wc · web 0/0/2/0 APPROVE-wc · tests 0/0/1/1 APPROVE-wc (16 probes, 14/2) · silent-failures 0/1/1/0 REVISE · type-design 0/1/0/1 REVISE · **orchestrator exhibit** `w4/lightflip-clause12-evidence.md` (no labels — ruled at this desk, F84/F85)
**After dedupe:** 0 critical · **4 high · 2 medium · 2 low** — **F82–F89** (10 raw lane items + the exhibit → 8 findings; the U8.4 contract territory collapses four lanes' items into two root fixes)
**Unsettled (operator escalation):** 0 verdict-bearing · **1 owner-decision flag carried on F85** (never affects the grade)
**Aggregator:** warm (`ab0635173e8414282`). Cold gates at `def2aec` (three lanes independently): tsc 0 · 310 files / 4,326 passed | 2 todo · guard 145/145 (resolved, not skipped — row output read) · wall clean · zero new effects/listeners/timers in the whole diff. Verification v7 lands separately.

## Unsettled — for the operator

None verdict-bearing. **F85 carries an explicit owner-decision flag** (below): clause 12 is D2-amended ratified territory, so if its fix-round triage is ruled disproportionate, amending the clause's promise is the OWNER's move, not this desk's. The flag rides beside the verdict; the verdict is set by severity alone.

## The clause-12 ruling (the exhibit, adjudicated)

Plan §9 clause 12 promised the one-site scheme flip with EXACTLY THREE objectors. Observed at `def2aec` + the flip: **tsc exit 2 (six TS2367)** and **75 failing tests across 28 files**. Characterised at this desk:

1. **The compile half (F84)** — six `scheme === 'dark'` comparisons where `scheme`'s declared literal type makes the flipped comparison a TS2367 no-overlap error. Four production sites are the W2/F34 gate shape (`button-recipe.ts:181,186`, `sheet-chrome.ts:227,242` — spot-checked) plus two test files. **This desk's own F34 prescription introduced the shape**; the flip-day cost was not seen then. Mechanical fix, one shape, six sites.
2. **The suite half (F85)** — the 75 reds are dominated by **rendered-value pins whose expectations hand-spell dark values** (literals or `palette.dark.*`) instead of composing from the consumed scheme (`colors.*` / the seams), which the campaign mandated for severity tokens (F26/F55) but never as a suite-wide convention. An unquantified residue of **possibly-real light-half defects** hides among them (candidates: the 5 `palette-contrast` reds, `mapTokens`, `DemoExperience.sandbox`) — indistinguishable from convention debt without per-file triage.
3. **The plan's "exactly three objectors" prose is wrong arithmetic either way** — plan correction owed regardless of the owner's ruling.

**Ruling: FIX-IN-WAVE, scoped as F84 + F85, with the owner flag on F85's cost.** A unilateral downgrade of a ratified DoD clause is not available at this desk; the compile half is unambiguous and cheap; the suite half is the port's actual exit debt and the triage is the only honest way to find any real light defects before the DoD is graded. Verdict impact: HIGH ×2 → REVISE (not BLOCK: the demo ships and renders correctly dark; the failure is the exit contract, and the fix path is scoped and in-flight).

## Findings

### F82 [HIGH] The 37 previews are outside EVERY gate — not in the tsc program at all — and 8 are drifted RIGHT NOW (19 errors), including `ModalShell`'s preview missing the required a11y prop U8.4 cites as its own proof
Lanes: silent-failures — original label: HIGH (probe 1 planted drift SURVIVED tsc+suite; probe 2: the CLEAN tree yields 19 errors/8 previews under a widened program); tests — original label: MEDIUM (E2: `--listFiles` count 0; the dot-directory wildcard mechanism — D-2's stated reason is wrong and its `declare module` fix would not load-bear); silent-failures — original label: MEDIUM (the key-set-only guard; SUBSUMED — its own lane's argument: previews-as-typed-consumers hold the contracts to the real API); typescript — out-of-lane concurrence.
File: `.design-sync/previews/**` (37 files, zero in any program — `tsconfig.json:26`'s wildcard skips dot-directories); the sharp instance spot-checked: `previews/ModalShell.tsx` has **zero** `closeAccessibilityLabel` — the prop U4.2 made required under D20 and `gen-dts-props.mjs:222-225` cites as its own fix's evidence. The other seven: CasesScreen/Dashboard/TimeOffset (wrong `status` shape + missing required), ImportModal/NewCaseModal/NewLocationModal/PdfPreview (excess/missing).
Issue: the render check catches THROWS; a missing callback or a wrong-shaped object paints `undefined` silently — "37/37 render cleanly" and 8-drifted are both true, which is the finding. The design agent grades a modal whose close button has no accessible name, on the artifact NOTES.md calls the source of truth.
Fix: **sfh's proven one-file fix** — `tsconfig.previews.json` (extends root, includes the 37 demo previews + `ds-entry.ts`, `paths` maps `open-pro-next` → `.design-sync/ds-entry.ts`, `jsx: react-jsx`; marketing previews scoped out), added to the typecheck gate; repair the 8 drifted previews it reds (sfh's split: missing-required first, excess-prop second); correct `NOTES.md:225-227`'s wrong reason (dot-directory rule, not unresolvable `open-pro-next`). **U8.4's D-2 ledger proposal is REFUSED — superseded**: with previews in a gated program, prop drift is compile-checked on every run and no suppression row is needed.
Owner: `a01d6a84f84ea047a` (U8.4)

### F83 [HIGH] `gen-dts-props.mjs` mis-encodes contracts THREE ways — a union-array paren drop that is wrong in both directions, an intersection flatten that re-publishes the hole W3/F74 closed, and a dropped generic parameter list D-1's own fix would not touch
Lanes: type-design — original label: HIGH (DS1: the shipped contracts, transcribed verbatim, REJECT the component's real input and ACCEPT a bare string / F74's illegal state); typescript — original label: MEDIUM (the NewCaseModal `K` — a dropped generic param list, unresolvable in principle; D-1's table lists it under a cause its one-line fix does not cover).
File: `.design-sync/gen-dts-props.mjs:119` (array branch, no parens), `:144,:198-210` (no intersection arm; apparent-properties walk); shipped evidence spot-checked verbatim in `config.json`: `activeStatuses: 'started' | 'working' | 'complete'[]` · `OverlayHeader` flattened to `backLabel?: string; onBack?: () => void` · `NewCaseModal.onChange: (field: K, …)` with **no binder for `K`**.
Issue: NOTES.md's own words set the stakes ("the `.d.ts` IS the API contract the design agent codes against") and there is no reviewer on the day it codes. Against (a) the agent cannot write the correct array and CAN pass a bare string into `.includes()` (a substring test — every chip renders pressed); against (b) it is told F74's nameless-icon-button state is legal, contradicting the source comment six lines above.
Fix: three generator repairs in one commit — parenthesise union array elements (td's verified one-liner); add the `isIntersection()` arm AND make a union-of-objects props type print as a union (or record `OverlayHeader` as KNOWN-LOSSY in NOTES.md beside the five dangling names — say which); print the type-parameter list or degrade a generic signature to its erased form (ts's prescription). Re-run the generator (idempotency is the gate, per ts probe 1a). **D-1's ledger proposal is REFUSED as scoped** — its one-line fix closes three of its own four listed components; after F83 the residue (if any) gets a row with an honest cause table.
Owner: `a01d6a84f84ea047a` (U8.4)

### F84 [HIGH] Clause 12's flip does not COMPILE — six `scheme === 'dark'` literal-narrowed gates are TS2367 under the flipped literal
Lanes: aggregator (from the orchestrator exhibit; sites spot-checked at source)
File: `controls/button-recipe.ts:181,186` · `controls/sheet-chrome.ts:227,242` (the W2/F34 gate shape) · `__tests__/palette-contrast.test.ts:816` · `controls/__tests__/sheet-chrome.test.tsx:259`.
Issue: `scheme`'s exported type is the literal `'dark'`, so the gate comparisons narrow to no-overlap on flip. The shape was this desk's own F34 prescription — the flip-day compile cost was not priced then. Loud, mechanical, six sites, one shape.
Fix: widen the comparison, not the export — e.g. a `const activeScheme: ColorScheme = scheme` local (or `(scheme as ColorScheme) === 'dark'`) at the six sites, keeping `scheme`'s literal type for the `satisfies typeof` devices that depend on it. Verify by re-running the flip's tsc leg.
Owner: `a01d6a84f84ea047a` (U8.4 — cross-territory authorized for the final wave; the W2-era files' seats are not in the live roster)

### F85 [HIGH] Clause 12's objector set is 75 tests / 28 files against a promised THREE — the flip-day pin convention was never mandated suite-wide, and real light-half defects are indistinguishable from convention debt until triaged
Lanes: aggregator (from the orchestrator exhibit; characterisation above)
File: the exhibit's 28-file table; the plan's promise at §9 clause 12.
Issue: rendered-value pins across four waves hand-spell dark expectations. On the flip, a scheme-relative pin moves with the render and stays green; these red. Among the 75 may sit genuine light-half defects (the `palette-contrast` and `mapTokens` reds are the candidates) — nobody can grade the DoD until the two classes are separated.
Fix (the exit-wave work item): per-file triage of all 28; convert convention-debt pins to scheme-relative composition (`colors.*`/seams — the F26/F55 idiom generalised); file any real light defect discovered as a new F-number; re-run the flip and land the residual objector list as a NAMED MANIFEST in the plan (each entry with its reason — `panes.test.tsx:87,113`-style deliberate pins are legitimate residents). **OWNER-DECISION FLAG:** if the orchestrator's costing of the 28-file triage is ruled disproportionate for the campaign's close, the OWNER may amend clause 12's promise (e.g. "the flip compiles; suite reds are confined to the named objector manifest") — that amendment is not available at this desk, and until it is made the clause stands failed.
Owner: `a01d6a84f84ea047a` (U8.4 primary; the orchestrator may split per-file across warm W2/W3 seats — one seat per file, per the standing routing practice)

### F86 [MEDIUM] Three inline animations are ungated under `prefers-reduced-motion`, not one — and U8.2's Proposal B names a trigger that spent itself on arrival
Lanes: web — original label: MEDIUM (swept every inline `animation:` under `ui/`; U8.2's refutation of the plan's premise verified true on all three clauses)
File: `PhoneFrame.tsx:91` (`scanSweep`, the ambient frame sweep — the genuine visual-design call) · `SyncStatusCard.tsx:116` (`spin`) · `ExportActionSheet.tsx:178` (`sheetUp` — its `_shared.tsx` sibling IS gated; a hand-rolled copy that missed the treatment). All three spot-checked at source.
Issue: `features/demo/CLAUDE.md` states the convention; the two-line gate shape is used five times in this same wave's files. Proposal B's primary trigger names U8.4 (in-wave, did not take it) and its fallback names "the next package" in the campaign's last phase — an un-fireable row, the outcome the ledger's bar exists to prevent.
Fix: gate the two mechanical sites NOW (`useReducedMotion` + the ternary — the five in-repo precedents); the frame's ambient sweep goes to **§123** (written this round) as an owner question with a fireable trigger. Proposal B is refused as proposed; this is its §-hygiene.
Owner: `a932ec8bda8002861` (U8.2 — cross-territory authorized for the two sites; final wave)

### F87 [MEDIUM] The tab bar's active icon is now the dimmest of four at 3.14 (0.14 above the non-text floor), label-less, and nothing measures it — row 48's shape, one wave after F79 set the precedent
Lanes: web — original label: MEDIUM (calibrated helper; before/after table: active 4.51→3.14, inactive 2.84→5.82)
File: `controls/TabBar.tsx` (the tint ternary + the flat `colors.card` fill); no tab-bar row in `palette-contrast.test.ts`.
Issue: the inactive half is a clear win; the active half is phone-verbatim and twice a problem — the selection cue is the least prominent element in a bar with no labels, and the 0.14 margin survives no re-tint with every suite green.
Fix: export the two tints; one §C.1 row bounding both at `AA_NON_TEXT` over `colors.card`, two-sided in row 48's shape (closes the unmeasured half NOW). The inversion itself is phone-verbatim → **owner device-pass checkpoint item** (recorded for v7's checkpoint list): accept-and-record, or take `colors.link` the way `BACK_TINT` did. Not re-tinted at this desk.
Owner: `a77c8c153805fddcf` (U8.3)

### F88 [LOW] `teal-purge.test.ts` canonicalises six-digit hex only — `#4ecdc4ff` walks past a guard whose docblock says every literal is canonicalised
Lanes: tests — original label: LOW (T3 SURVIVED; T1 control KILLED; zero 8-digit literals live today; every sibling scan uses `{3,8}`)
File: `__tests__/teal-purge.test.ts:88`.
Fix: `{6}(?:[0-9a-fA-F]{2})?` + one planted-control line. Re-run T3.
Owner: `a932ec8bda8002861` (U8.2)

### F89 [LOW] `boot.ts`'s docblock claims its `Record` is "THE ONLY THING" guarding a fourth HUD state — U8.1 added a second guard this wave, so the probe-attributed sentence is now false (in the safe direction)
Lanes: type-design — original label: LOW (probe S2: three diagnostics in two modules, not "exactly one TS2741, there")
File: `engine/logic/boot.ts:44-46`; the corrected fact already exists at `scanner-hud-colors.ts:80-82`.
Fix: one sentence — name both records or drop the exclusivity clause.
Owner: `a4143797d940ef210` (U8.1)

## Dropped / demoted / merged

| Item | Lane · label | Disposition |
|---|---|---|
| Key-set-only guard (no value tripwire) | sfh · MEDIUM | SUBSUMED into F82 — the lane's own argument: typed previews hold the contracts to the real API; a stale `.d.ts` then reds something. Recorded as the reason F82's fix answers both. |
| D-2's trigger cannot fire + wrong mechanism | tests · MEDIUM | MERGED into F82 (the E2 mechanism is F82's fix prerequisite; the row is refused as superseded). |
| D-1 under-scopes (NewCaseModal generic) | ts · MEDIUM | MERGED into F83 (third generator defect; D-1 refused as scoped). |
| `TabBar.tsx:93` `borderTop` as a lit-edge sighting | (pre-empted) | REFUTED by ts at source — a literal object with no spread and no longhand siblings; recorded so no lane re-files it. |
| U8.1's 5.19-vs-5.27 disclosure · skip-pill `overlay` deviation · A11/A12 refusal · `BootHudState` no-`failed` · U8.2's §120-widening refusal (15 sites/11 files, 3 spot-checked) · U8.4's Toggle refutation | multiple | ALL VERIFIED SOUND by the owning lanes with probes — the wave's disclosed deviations survive scrutiny without exception. U8.4's Toggle plan-row refutation is a **plan correction**, not a row (nothing was pinned to defer). |

**Deferral dispositions:** D-1 REFUSED (F83) · D-2 REFUSED (F82 supersedes) · Proposal B REFUSED as proposed → split (F86 + §123) · u8.3 Deferral 1 (tab-bar `boxShadow`, no phone counterpart, owner-reserved) → **§124 written** (trigger: the U8-exit owner device pass, GATES §13) · D-7 → plan correction, no row.

## Owner routing summary

| Owner | Findings |
|---|---|
| `a01d6a84f84ea047a` U8.4 | **F82, F83, F84, F85** (F85 splittable per-file across warm seats at the orchestrator's option) |
| `a932ec8bda8002861` U8.2 | F86 (two mechanical gates), F88 |
| `a77c8c153805fddcf` U8.3 | F87 |
| `a4143797d940ef210` U8.1 | F89 |

## Lanes to resume for the fix-delta

All five, scoped: sfh (F82 — re-run both probes under the new program), td (F83 — DS1 re-transcription; F84's shape), tests (F85's triage verification + F88), web (F86, F87), ts (F83's generic case; F84). The F85 triage may add findings; budget the delta accordingly.

## Ledger interaction

**Struck ✅ RESOLVED — W4 (U8.1):** **§89** — the final residue closed: `SplashScreen` no longer spells `#2B8CC1` (twelve sites re-derived through `scanner-hud-colors.ts`, which cites §89 by number at `:54`; "primary is a MARK, never text" is now an assertion — web verified the negative pin). The row's history preserves the W2 button half, W3's F52 sites, and StoryRail's D12-frozen ceiling ruling.
**Annotated:** **§120** — quantified by U8.2's measurement (15 live rgb-form sites across 11 files; ts spot-checked three); the in-package widening refusal is correct; trigger unchanged.
**Rows written:** **§123** — the phone frame's ambient `scanSweep` is ungated under `prefers-reduced-motion`; the mechanical siblings are fixed by F86, and whether the FRAME keeps any ambient motion under reduce is a visual-design owner call; trigger: **the U8-exit owner device pass, or the first post-campaign a11y pass** — the pass rules keep-and-record or gate-it. **§124** — the tab bar's `boxShadow` has no phone counterpart (native elevation vs a web div); trigger: **the U8-exit owner device pass (GATES §13)** — reads-right → recorded divergence; reads-wrong → one-key delete plus a pin.
No other row moves. §119: W4 diff introduced no new TS6133 (ts's gates clean); the flag flips at U8.4's closing census per the row.

## Agent IDs

U8.1 `a4143797d940ef210` · U8.2 `a932ec8bda8002861` · U8.3 `a77c8c153805fddcf` · U8.4 `a01d6a84f84ea047a` · aggregator `ab0635173e8414282` (warm, five waves). Lane seats: orchestrator's dispatch record (sixth round of the print-your-ID ask).

## Pipeline notes

- **The clause-12 exhibit is the right way to hand this desk a DoD question** — evidence first, characterisation requested, ruling recorded. The ruling: fix-in-wave (F84/F85) with the owner flag on F85's cost; no unilateral movement of ratified territory.
- **Four lanes converged on U8.4's contract territory and the dedupe is two root fixes, not four findings** — the program-widening (F82) and the generator repairs (F83). sfh's proven-in-probe `tsconfig.previews.json` is the model finding of the wave: it shipped its own fix's evidence.
- **The wave's guards are the campaign's best** (tests: 14/16 killed; the teal scan is the first W-wave source guard to land site-keyed with an asserted anti-vacuity control on first landing; `design-sync-entry` pins by real import). The five-wave scan-convention arc (F32→F66→teal-purge) closed.
- **This desk's own F34 prescription created F84's shape** — priced now, recorded here, same as the predecessor's F7 self-correction in W1. Warm seats must re-question their own precedents; this is the second instance in the campaign and both were caught by the flip's evidence, not by memory.
- W4's disclosed-deviation hit rate is 100% verified-sound — the first wave where every deviation survived every probe. The discipline propagated.
