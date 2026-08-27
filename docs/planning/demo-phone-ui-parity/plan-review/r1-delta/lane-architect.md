# Plan review r1 — ARCHITECT lane, FIX-DELTA

**Re-checked against:** `00-ui-parity-matrix.md` (748L) and `01-master-ui-parity-plan.md` (529L) at
the current worktree state, diffed from `3365e3e` (+237/−124 across the two docs).
**Scope:** ARCH-1..13 (mapped to V-1, V-3, V-4, V-6, V-7, V-8, V-9, V-19..V-24, with V-17 as
collateral in my territory), plus the architectural judgement asked for on D18–D20 and V-1's
phase-growing anchor set.

**Result: 13 of 13 FIXED-VERIFIED. 1 REGRESSION and 2 new MINORs, all introduced by the fix pass.**

---

## Per-finding dispositions

| ID | V-ID | Disposition | Verified at |
|---|---|---|---|
| ARCH-1 | V-1 | **FIXED-VERIFIED** | plan `:222`, `:225`, `:412`, `:519`, `:40`, `:196` |
| ARCH-2 | V-6 (+V-17) | **FIXED-VERIFIED** | plan `:72` (D19), `:355-364` (§6.1) |
| ARCH-3 | V-7 | **FIXED-VERIFIED** | plan `:40`, `:235` |
| ARCH-4 | V-3 | **FIXED-VERIFIED** | plan `:219` (U0.1), `:222` repair (4) |
| ARCH-5 | V-4 | **FIXED-VERIFIED** | plan `:220` (U0.2) |
| ARCH-6 | V-8 | **FIXED-VERIFIED** | plan `:71` (D18), `:153-161` (§4.8), `:528` |
| ARCH-7 | V-9 | **FIXED-VERIFIED** | plan `:248` (U2.1) |
| ARCH-8 | V-19 | **FIXED-VERIFIED** | plan `:223` (U0.5) |
| ARCH-9 | V-20 | **FIXED-VERIFIED** | plan `:248` (U2.1) |
| ARCH-10 | V-22 | **FIXED-VERIFIED** | plan `:109` (§4.3), `:236` (U1.2) |
| ARCH-11 | V-21 | **FIXED-VERIFIED** | plan `:222` repair (5) |
| ARCH-12 | V-23 | **FIXED-VERIFIED** | plan `:46` (§2), `:292` (U5.2) |
| ARCH-13 | V-24 | **FIXED-VERIFIED** | plan `:309-310`, `:479-480` |

### Notes on the ones worth more than a row

**ARCH-1 / V-1 — the deadlock is genuinely gone.** The staged set is coherent and I traced every
stage against the package that creates its web token: U0.4 extends to the ~15 U0.1 creates (`:222`),
U1.1 adds the 12 tier anchors (`:235`, Files now include `.design-sync/check-rn-parity.mjs`), U3.1
adds the 4 status anchors (`:263`), U8.2 adds `gridSubtle` (`:335`) — ~32 at DoD (`:519`). U0's exit
now reads *"exits 0 at its CURRENT anchor set (~15) … not 22"* (`:225`) and §6.6 gate 1 carries the
governing rule verbatim (`:412`). The writer also absorbed the aggregator's widening from five
unreachable anchors to seven, and named `primaryLight`/`textTertiary` as resolving only once V-3's
naming lands. U0.4's Deps now read **"U0.1 (its naming ruling is a hard input)"** — the ordering
constraint I flagged in ARCH-4 is now structural, not implicit. This is a better fix than the one I
proposed.

**ARCH-4 / V-3 — fixed beyond the ask.** `ui/tokens/palette.ts` is ruled as *the* module ("**not**
'implementer's call'"), `T` becomes a typed re-export preserving its 7 `inputs/` importers, the
phone-naming vocabulary is binding with the four `T` aliases spelled out, and U0.4 gains repair (4)
repointing the web-side readers. One consequence the writer noticed and I had not: U0.1's ADD list
now excludes `errorLight` to avoid double-adding it with U3.1 — which is where the regression below
comes from.

**ARCH-5 / V-4 — fixed, with my evidence correctly overruled.** `withAlpha` returns a literal
`rgba(r, g, b, a)`; the Tests line explicitly says *"note jsdom re-spaces — assert through the
existing `hexToJsdomRgb`-style helper, do NOT assert byte-identity"*, which corrects my "round-trips
byte-identically". `flattenOver` was additionally widened to n-deep, which is right — the demo's
`DARK_GROUNDS` stack composites three deep (`recessed` over `sheet` over `background`) and the
phone's two-arg form could not express it.

**ARCH-2 / V-6 — the finding is fully fixed; the remedy is partial.** §6.1 now lists all seven
shared files plus the four rows that were missing, U0.1 is added to the `_shared.tsx` row with the
bolded "lands FIRST, ALONE" rule, and the false *"Single-owner by construction. Good."* claim is
deleted and replaced with *"NOT single-owner — three packages across three phases … the sharpest
collision in the port"* (`:364`). See ARCH-D-3 for what the re-cut does not reach.

---

## NEW findings from the fix pass

### [MAJOR — REGRESSED] ARCH-D-1 — `errorLight` moved from U0.1 to U3.1, but U2.2 needs it in phase U2

**Doc:** plan `:219` (U0.1: *"**`errorLight` is NOT added here — U3.1 owns the whole status family**"*),
`:263` (U3.1 ADD list now includes *"**`errorLight #b72136`**"*), `:249` (U2.2).

**Issue:** V-3's naming edit and V-1's staging edit together reassigned `errorLight` out of U0.1 and
into U3.1. But U2.2 — phase **U2**, deps `U0.3, U1` — specifies *"**danger:** fill+border
**`#b72136`**, label `#ffffff`"*, and the matrix phases both A52 (`DangerFill`) and A67 (Button
danger) as **U2**. Under D19 the two lanes stay parallel, so U2.2 may build before U3.1 exists;
if the owner overrides D19 toward serialising, U2 runs entirely before it. Either way the token U2.2
needs is created in a later phase and U2.2's Deps do not name U3.1.

The implementer's two exits are both bad: hardcode `#b72136`, which U0.5's banned-literal guard is
being built to catch, or block on a phase that has not started. Before the fix pass U0.1's ADD list
contained `errorLight #b72136` and U2.2 was satisfied — this is a regression, not a pre-existing gap.

**Evidence:** `grep -n errorLight 01-master-ui-parity-plan.md` returns exactly two hits, `:219`
(declining to add it) and `:263` (adding it). U2.2's Deps tail reads `**L** · opus-implementer-max ·
U0.3, U1`. The phone token is real and correctly named — `Colors.ts:170` `errorLight: '#b72136'`
(dark), distinct from `errorDark: '#ee2f44'` at `:171`, so U0.1's substitution of `errorDark` into
its ADD list is itself correct and should stay.

**Fix:** Return `errorLight #b72136` to U0.1's ADD list and amend U3.1's note to *"`errorLight` is
already in the palette from U0.1 (A52/`DangerFill` needs it in U2); U3.1 adds the rest of the
`*Light` family."* It is a base token by use — `DangerFill` in U2.2 and `Banner`'s error fill in
U3.3 both take it — not a status-family member. A52 stays phased U2 and nothing else moves.

### [MINOR] ARCH-D-2 — four lines still assert what the fixes superseded

**Doc:** plan `:215`, `:56`, `:454`, `:146`.

**Issue:** Three of the fixes landed as new authoritative text without editing the original line,
leaving live contradictions in the binding doc:

| Line | Still says | Contradicted by |
|---|---|---|
| `:215` | U0's phase preamble, **bolded**: *"Exit criterion is mechanical: `check-rn-parity.mjs` must FAIL before this phase and PASS **at 22 anchors** after it. That is U0's RED/GREEN."* | `:225`, ten lines below: *"exits 0 at its CURRENT anchor set (~15) … **not 22**"* |
| `:56` | D3's recommendation: *"extend the drift guard to **22 anchors**"* — inside the decision gate the owner ratifies | `:412`, `:519` |
| `:454` | Tracker row: *"U0.4 drift guard + **22 anchors**"* | the package's own title at `:222`, *"the FIRST anchor stage"* |
| `:146` | §4.5: *"Branch per package: `feat/uiparity-u<N>-<slug>` **off `master`**"* | §4.8 `:155`: *"every package branch is cut from **it** [the integration branch] (except U0.1's)"* — and `:155` cites "per §4.5" while §4.5 says the opposite |

`:215` is the sharper one: §6.4's briefing template hands an implementer the phase context plus its
package row, so U0.4's agent reads "PASS at 22 anchors" as its bolded RED/GREEN. `:225` reads as a
correction of it, so a careful agent resolves it — but it is a one-word edit against a failure mode
that re-creates the original BLOCKER.

**Fix:** `:215` → "must FAIL before this phase and PASS at its first anchor stage (~15) after it";
`:56` → "extend the drift guard (staged — see U0.4)"; `:454` → "U0.4 drift guard + first anchor
stage"; `:146` → "off the `feat/uiparity` integration branch (D18); U0.1's alone is cut from
`master`."

### [MINOR] ARCH-D-3 — D19's re-cut resolves five of the seven shared files, and §6.1 says it resolves all of them

**Doc:** plan `:363` (*"**D19's re-cut resolves this** by handing U3.3's six cross-lane adoptions to
the phases that already own those files"*), `:364`, `:266` (U3.4).

**Issue:** The re-cut moves **U3.3's** `Banner` adoptions. Two of the seven collisions are not U3.3's:

1. `_pane-chrome.tsx` — **U2.4** (`radioOption`, `:163`) ∥ **U3.2** (`NOTE_TONE`, `:68`). `:364` is
   honest about this ("removes one of the three"), but `:363` sweeps the same file into "resolved".
2. `export/ExportCaseCard.tsx` — **U2.4** (`:68-82`, the checkbox) ∥ **U3.4**, which still scopes
   *"the ~10 inline empty states (matrix A80)"*, and A80's enumeration includes `ExportCaseCard:211`.
   Nothing moved it.

And U3.4 is a second cross-cutting sweep of the same shape as U0.1 — which the writer *did* catch and
gate with a bolded "lands FIRST, ALONE" rule at `:219`/`:355`. A80's list also reaches
`MediaLibrarySheet:494-505` (U4.4 → U7.2, marked **serialise** at `:359`), `MapScreen:105-117`
(U5.2 → U5.3, marked **serialise** at `:360`) and `LocationList:159-172`. U3.4 gets no equivalent
rule, so a phase-U3 package reaches into three later phases' serialised files unannounced.

The edits themselves are small (replace an italic faint line with the canonical empty state), so
these are textual conflicts, not semantic ones like the `TimeOffsetScreen` case. The defect is the
overclaim masking them.

**Fix:** Amend `:363` to *"D19's re-cut resolves five of the seven. Two survive: `_pane-chrome.tsx`
(U2.4 ∥ U3.2 — see the row below) and `export/ExportCaseCard.tsx` (U2.4 `:68-82` ∥ U3.4's A80
sweep). Both are textual, in non-overlapping regions; merge in package-id order."* And give U3.4 a
sentence matching U0.1's: *"**U3.4's empty-state pass is a cross-cutting sweep** — A80's ten sites
include files owned by U2.4, U4.4/U7.2 and U5.2/U5.3. It touches only the empty-state block in each;
it does not open those files for anything else."*

---

## Architectural judgement on the new decisions

**D18 (integration model + rollback) — sound, and the right shape.** It closes ARCH-6 properly rather
than papering over it: `feat/uiparity` takes the phase PRs, `master` takes one merge at U8 exit, the
§6.6 gates run on the integration head, and `git revert -m 1` per phase with *"no phase may depend on
an unmerged later phase, so §5's dependency shape is also the revert-safety order"* — which is the
part I did not ask for and is the part that makes rollback actually work. The U0.1 carve-out (its
branch cut from `master`, everything else from the integration head) is correct, because U0.1 is the
prerequisite sweep. The override path is written down as a decision rather than left as silence.
Only defect: §4.5 `:146` was not updated to match (ARCH-D-2).

**D19 (re-cut, don't serialise) — the right call, partially executed.** Re-cutting is better than
serialising here for a reason the doc states correctly: the six adoptions move to packages that
*already open those files*, so it costs no new file-opens while serialising costs 4–5 days of
critical path. The residue is ARCH-D-3, and it does not change the ruling — it changes what §6.1
should claim. Note the ruling leaves `_pane-chrome.tsx` genuinely three-owned across three phases;
that is acceptable given the three regions are disjoint and now documented, but it is the one file
where the orchestrator should merge U2 before U3 explicitly rather than by package-id accident.

**D20 (behaviour-change carve-out) — sound, and it fixes a real contradiction I missed.** §2's
absolute "no logic changes" was refuted by six of the plan's own packages (`hideLabel`, the required
close label, three focus traps → one, `filtersVisible`). The carve-out draws the line exactly where
this codebase draws it: component-local UI state, prop signatures and presentational composition are
in; the store bridge, engine functions, data flow and new store subscriptions are out. That is
`features/demo/CLAUDE.md`'s one architectural rule left intact, and it matches the established
pattern — `MapScreen.tsx:130-148` already holds ten local `useState` hooks including the filter
state, so U5.3's `filtersVisible` is the same idiom, not a new one. Naming the six packages
explicitly is what stops it becoming a general licence.

**The phase-growing anchor set — the deadlock is gone.** I traced each stage's anchors against the
package that creates its web token and found no unreachable anchor remaining, given ARCH-D-1 is
fixed. The rule as stated (*"adding an anchor is the closing act of the package that creates its web
token"*) is self-maintaining: it cannot re-create the deadlock, because an anchor can only be added
by the package that has just made it satisfiable. That is a better invariant than the count I asked
for.

---

## Delta Summary

| Disposition | Count |
|---|---|
| FIXED-VERIFIED | 13 |
| NOT-FIXED | 0 |
| REGRESSED | 1 (ARCH-D-1) |
| New MINOR | 2 (ARCH-D-2, ARCH-D-3) |

**Lane verdict: REVISE** — the BLOCKER is genuinely closed and twelve of thirteen fixes landed at or
above the recommended bar, but ARCH-D-1 is a one-line regression that leaves U2.2 depending on a
token created in a later phase. All three new findings are small, mechanical edits with no design
question attached; none needs another owner ruling.
