# Plan review r1 — ARCHITECT lane

**Docs under review:** `docs/planning/demo-phone-ui-parity/00-ui-parity-matrix.md` (699 lines) and
`01-master-ui-parity-plan.md` (465 lines), at `docs/ui-parity-planning` @ `3365e3e`.
**Question:** does the proposed approach make sense for this codebase?
**Method:** both docs read in full; `features/demo/CLAUDE.md`, `demo-ui-inventory.md` §0/§4/§5,
`HANDOFF.md`, and v1's plan read for context; every architectural claim below spot-checked against
the worktree's source. The drift guard and `census.mjs` were executed. The phone repo was opened
read-only once, for `src/constants/Colors.ts`.

**Severity scale** (per `.claude/agents/plan-architect-reviewer.md`): BLOCKER = the definition's
CRITICAL (leaves the effort unbuildable / un-gateable mid-phase) · MAJOR = HIGH · MINOR = MEDIUM/LOW.

**What is right, and is not re-litigated below.** U0-tokens-first is the correct order and mirrors
the phone's own P0. The seam-per-recipe strategy ("mutate the recipe, never the consumer") is the
right shape for this codebase and §4.3 correctly translates the phone's `Card`-wrapper case law into
the demo's spread-a-fragment idiom. §4.2's warning that *"a value moved out of an inline object into
a class or a CSS variable silently un-pins its test"* is the single most important line in the plan
and it is present. D2 (dark-only), D4 (follow the code), D5 (inherit the ceilings), D11, D12, D13,
D14 and D17 are all architecturally sound and correctly reasoned. **U5 ∥ U6 is genuinely
independent** — I checked every file in both phases and found no overlap. `MapFiltersSheet`'s
"moves the CONTROLS, not the state" constraint is correct: map filter state is local `useState` in
`MapScreen.tsx:130-148`, not store state, so U5.3 needs no store-bridge change.

---

## BLOCKER

### [BLOCKER] ARCH-1 — U0's mechanical exit gate cannot be satisfied until U8, and the plan makes that same gate non-negotiable for every phase in between

**Doc:** `01-master-ui-parity-plan.md:190` (U0.4), `:193` (U0 exit), `:366` (§6.6 gate 1), `:455` (DoD 1);
`00-ui-parity-matrix.md:188` (A96).

**Issue:** U0.4's anchor set is specified as *"+13 anchors: `backgroundSecondary`,
`backgroundTertiary`, `borderLight`, `textTertiary`, `textInverse`, `success`, `successLight`,
`warning`, `warningLight`, `errorLight`, `primaryLight`, `primaryDark`, `gridSubtle`"* and U0's exit
is *"`node .design-sync/check-rn-parity.mjs` exits 0 with 22 anchors resolved and zero drift."* But
the web-side tokens for at least five of those anchors are created by **later phases**, not by U0:

| Anchor | Web token created by | Phase |
|---|---|---|
| `successLight` | U3.1 (`:231` — "**ADD** `successLight #0f6b42`") | **U3** |
| `warningLight` | U3.1 (`:231`) | **U3** |
| `success` / `warning` (the bare tones) | neither U0.1 nor U3.1 name them; the demo has six greens and four ambers, collapsed only in U3.2 (`:232`) | **U3** |
| `gridSubtle` | U8.2 — "`GLASS.gridOverlay` `rgba(153,186,221,0.05)` → `0.11`" (`:302`) | **U8** |

U0.1's ADD list (`:187`) is explicit and contains none of them: `raised`, `raisedHigh`, `modal`,
`borderLight`, `borderDark`, `textInverse`, `onPrimary`, `onError`, `primaryDark`, `errorLight`,
`successDark`, `infoDark`, `disabled`, `disabledText`. The matrix agrees — A14 (`successLight`),
A15 (`warningLight`), A16, A17, A18 are all phased **U3** (`00-ui-parity-matrix.md:82-86`), and
A10/A11/A12 (the grid) are phased **U8**.

The concrete failure at execution time: U0's implementer extends the guard to 22 anchors, runs it,
and gets `PARSE-FAILED` or `DRIFT` on `successLight`, `warningLight`, `success`, `warning` and
`gridSubtle` — five anchors whose web side will not exist for another three to eight phases. U0
cannot exit. And because §6.6 states *"Mechanical gate (every phase, non-negotiable): 1. …22
anchors, zero drift, zero `PARSE-FAILED`"*, U1, U2 and U3 cannot exit either. Under the plan's own
rules the effort deadlocks at the end of its first phase, on its own foundational gate.

**Evidence:** Ran the guard from the planning worktree — it resolves the sibling RN repo correctly
even from `worktrees/`, and dies exactly where demo §5.3 says:
`Error: Button PRIMARY_GRADIENT.dark not found … EXIT=1`. So the pre-state is as documented and the
U0.4 repair is right; the defect is purely in *when* the 22-anchor target is demanded. Cross-checked
`features/demo/ui/inputs/input-theme.ts` (37 lines) — it holds no success/warning/grid token of any
kind, and `features/demo/ui/glass-tokens.ts:36-37` holds `gridOverlay` at `0.05`.

**Fix:** Make the anchor set **grow with the phases** instead of landing whole in U0. Concretely:
U0.4 repairs the three defects and extends to the anchors whose web side U0.1 actually creates
(the surface ramp, the text ramp, `primaryDark`, `primaryLight`, `errorLight`, `textInverse` — ~15);
U3.1's package gains "add the `success`/`successLight`/`warning`/`warningLight` anchors"; U8.2's
gains "add the `gridSubtle` anchor". Restate U0's exit as *"the guard exits 0 at its **current**
anchor set with zero drift and zero PARSE-FAILED"*, and move "22 anchors" to §9's DoD where it
belongs. Add a one-line rule to §6.6: *"the anchor set is the set the port has tokenised so far;
adding an anchor is the closing act of the package that creates its web token."*

---

## MAJOR

### [MAJOR] ARCH-2 — U2 and U3 are not independent lanes; they share at least six files, and §6.1 asserts single-ownership of one of them

**Doc:** `01-master-ui-parity-plan.md:164,166` ("`(U2 ∥ U3)`… U2 and U3 are independent lanes
(controls vs status/notices)"), `:324` (§6.1: "`_pane-chrome.tsx` | U6.2 only | **Single-owner by
construction. Good.**").

**Issue:** The plan's own package rows and matrix rows put both lanes in the same files:

| File | U2 package | U3 package |
|---|---|---|
| `settings/panes/_pane-chrome.tsx` | U2.4 — `_pane-chrome.tsx:163-232` (`:219`) | U3.2 — `_pane-chrome.tsx:68-72` (`:232`); U3.3 adopts `PaneNote` at `:81-117` (matrix A71) |
| `TimeOffsetScreen.tsx` | U2.3 — `:111-124` (`:218`) | U3.3 — `:129-136` (matrix A71) |
| `NewCaseModal.tsx` | U2.1 — delete `:52-61` (`:216`) | U3.3 — `:201-208` (matrix A71) |
| `AudioRecorderScreen.tsx` | U2.2 — `:508-518` (matrix A66) | U3.3 — `:252-264` (matrix A71) |
| `CompletionScreen.tsx` | U2.2 — `:123-126` (matrix A66) | U3.3 — `:87-92` (matrix A71) |
| `OcrCaptureScreen.tsx` | U2.2 — `:112-133` (matrix A66) | U3.3 — `:389-423,476-479` (matrix A71) |
| `export/ExportCaseCard.tsx` | U2.4 — `:68-82` (`:219`) | U3.4 — `:211` (matrix A80) |

§6.1's hotspot table lists **none** of these seven files, and positively asserts that
`_pane-chrome.tsx` has one owner. It does not: three packages across three phases edit it (U2.4,
U3.2/U3.3, U6.2). §6.2's conflict rule only covers *within a phase* ("package-id order") and
*across phases* ("the dependency shape in §5 is the merge order") — and U2 ∥ U3 has no order in the
dependency shape, so the plan has no rule at all for the case it actually creates. Two Opus agents
in separate worktrees (§6.3) will edit `_pane-chrome.tsx` (326 lines) and `TimeOffsetScreen.tsx`
concurrently, and the second merge hits conflicts nobody scheduled — worse, *semantic* ones: U2.4
rewrites `radioOption` while U3.3 replaces `PaneNote`'s `NOTE_TONE` in the same file, and U2.3
deletes `TimeOffsetScreen`'s hand-rolled switch while U3.3 rewrites its dashed-amber advisory into a
`Banner` six lines below.

**Evidence:** Verified all seven files exist at the cited paths, and read the two `_pane-chrome.tsx`
regions: `NOTE_TONE` is at `:67-72` (U3's target) and `radioOption` begins at `:163` (U2.4's target)
in the same 326-line file. Also verified there is only ONE `LocationRow.tsx` in the tree
(`ui/screens/map/LocationRow.tsx`), so U3.4's "`LocationRow.tsx:13-25`" and U5.4's
"`map/LocationRow.tsx`" are the same file — sequential phases, but likewise absent from §6.1.

**Fix:** Either (a) drop the U2 ∥ U3 parallelism and run them sequentially — the phases are 4-5 days
and ~1 week, so the saving is small against the conflict cost; or (b) keep the parallelism and
re-cut the boundary so each lane owns whole files: move U3.3's `Banner` **adoptions** in
`TimeOffsetScreen`, `NewCaseModal`, `AudioRecorderScreen`, `CompletionScreen`, `OcrCaptureScreen`
and `_pane-chrome` out of U3.3 into the phases that already own those files (U6.4, U6.2, U7.2,
U7.3), leaving U3.3 to build `Banner` plus the adoptions in files no other lane touches. Either way,
correct §6.1: add all seven files to the hotspot table and delete the "single-owner by construction"
claim for `_pane-chrome.tsx`.

---

### [MAJOR] ARCH-3 — the verification design does not cover the six-tier glass system at all, while §2 defines Tier-A parity as what the drift guard proves

**Doc:** `01-master-ui-parity-plan.md:40` ("**Tier A parity** = the demo's token module or shared
recipe holds the same **value** the phone holds at `main`, and the 22-anchor drift guard proves it
mechanically"), `:190` (the anchor list), `:203` (U1.1), `00-ui-parity-matrix.md:613`.

**Issue:** All 22 anchors — the nine existing and the thirteen added — are **flat scalar palette
tokens**. Not one reads a glass tier. But A29–A40 (the six-tier system: 24 gradient/border/
highlight/innerShadow values) is the largest Tier-A block in the port and the phase the plan itself
calls *"where the demo visibly stops looking a generation old"* (`:199`). After U1 lands, nothing
mechanical compares the demo's `glass-tiers.ts` against the phone's `Colors.dark.card/nestedCard/
elevated/header/sheet/recessed`. The only guard on those values is `glass-tokens.test.ts`'s shape
pin — which pins the demo's value **to itself**, so it detects an accidental local edit and is
structurally incapable of detecting phone-side drift. The contrast test measures legibility inside
the demo, not agreement with the phone. So the port's central parity claim rests, for its largest
block, on an implementer having transcribed 24 values correctly once, with no standing check.

**Evidence:** Read `.design-sync/check-rn-parity.mjs` in full — `readField`/`readConst` and the nine
anchors at `:77-87` are all scalar reads. Read `glass-tokens.test.ts:80` — "pins the GLASS token
values". Opened the phone's `src/constants/Colors.ts:345-406` (read-only): the six dark tiers are
plain, greppable object literals in the `dark:` region — `card`, `nestedCard`, `elevated`, `header`,
`sheet`, `recessed`, each `{ gradient: [top, bottom], border, highlightTop, innerShadow }` — and
their values match the plan's U1.1 transcription exactly. `readField` with
`{ after: 'card: {', before: '}' }` reaches every one of them; this is ~12 lines of guard code, not a
new mechanism.

**Fix:** Add the six tiers to the anchor set as U1.1's closing act (24 values, or the 12 that matter:
both gradient stops + border + highlightTop per tier), taking the anchor count to ~40. Note in the
package that the two sides spell rgba differently and the comparison must normalise whitespace (see
ARCH-12). Until that lands, soften `:40` to say what is true: the guard proves the *palette* tier
mechanically; the glass tiers are proven by transcription plus the review pipeline.

---

### [MAJOR] ARCH-4 — U0.1 leaves the port's foundational module location to the implementer, while four later packages hard-depend on one of the two answers — and either answer breaks the guard's web-side readers

**Doc:** `01-master-ui-parity-plan.md:187` (U0.1: *"extend `input-theme.ts`, or a new
`ui/tokens/palette.ts` that `T` re-exports — **implementer's call**, but `T`'s existing 7 importers
must not break"*), `:231` (U3.1 Files: "`ui/tokens/palette.ts` (from U0.1)"), `:188` (U0.2 creates
`ui/tokens/scale.ts`), `:203` (U1.1 creates `ui/tokens/glass-tiers.ts`), `:232` (U3.2 creates
`ui/tokens/status.ts`).

**Issue, part 1 — the choice is not actually open.** U3.1's Files column names `ui/tokens/palette.ts`
as an existing artefact "from U0.1", and U0.2/U1.1/U3.2 all build a `ui/tokens/` directory around it.
If the U0.1 implementer takes the first branch and extends `input-theme.ts`, U3.1's brief points at a
file that does not exist and the port has a `ui/tokens/` layer with a hole where its palette should
be. A plan cannot both defer a structural decision and encode one of its outcomes four packages
later.

**Issue, part 2 — the branch the plan assumes breaks the guard.** If `T` becomes a re-export
(`bg: palette.bg`), every web-side anchor read breaks. The guard's readers are literal matchers:
`readField(theme, 'bg')` matches `bg: '#hex'` and nothing else, and the file says so in its own
docblock at `:54-56` — *"input-theme's `T` only re-exports them as `accentFrom: GLASS.accentFrom`,
which `readField` cannot see through — it matches literals, not identifier references."* That is
precisely why `readConst` exists for the two accent stops. U0.4's repair list (`:190`) fixes exactly
one identifier-resolution problem and it is on the **RN** side (*"`Colors.dark.primaryDark` → look
`primaryDark` up in the `dark:` region"*). Nothing in U0.4 repoints or teaches the **web** readers.
The concrete outcome: after U0.1, six of the nine existing anchors report `PARSE-FAILED` — and
U0.4's own repair (3) is what makes that visible rather than a throw, so U0 exits red on the very
mechanism it just built.

**Evidence:** `features/demo/ui/inputs/input-theme.ts` is 37 lines of bare literals; grep confirms
exactly **7 importers**, all under `ui/inputs/` — the plan's count is right. Read
`check-rn-parity.mjs:38-61` (`readField`, `readConst`) and `:77-87` (the anchors): `theme` is read
for `primary`, `bg`, `border`, `text`, `textMute`, `error`, `rowH`; `glass` is read for
`ACCENT_FROM`/`ACCENT_TO`.

**Fix:** Rule it in the plan, not in the package: U0.1 creates **`features/demo/ui/tokens/palette.ts`**
as the single palette module and `T` becomes a typed re-export of it (preserving the 7 importers).
Then add a fourth mandatory repair to U0.4: *"repoint every web-side reader at
`ui/tokens/palette.ts`, and teach `readField` to follow a one-level re-export (`bg: palette.bg` →
look `bg` up in the imported module) — the same helper the RN side needs, applied to both sides."*

---

### [MAJOR] ARCH-5 — `withAlpha` returning `color-mix()` makes every value routed through it invisible to the port's own contrast gate and to the demo's style pins

**Doc:** `01-master-ui-parity-plan.md:188` (U0.2: *"`withAlpha(hex, a) → color-mix(in srgb, <hex>
<a*100>%, transparent)`"*), and its consumers: `:219` (U2.4, "Route `Dropdown`'s four accent alphas
through `withAlpha`"), `:232` (U3.2, "`withAlpha(textSecondary,0.15)`"), `:262` (U5.4, "The
`${color}25`/`${color}50`/`${color}14`/`${color}88` hex-alpha idiom → `withAlpha`").

**Issue:** The same package pairs `withAlpha` with `flattenOver` (`:188`) and U0.5 ports
`flattenOver` specifically *"so translucent stops are measurable"* (`00-ui-parity-matrix.md:607`).
`flattenOver` is a numeric helper — it needs channels. A `color-mix(in srgb, … %, transparent)`
string cannot be parsed by a WCAG relative-luminance helper, so every value the port deliberately
routes through `withAlpha` becomes **unmeasurable by the contrast test the same phase is building**.
That is a self-inflicted hole in gate 2 of §6.6, in exactly the surfaces (`Dropdown`'s accent
alphas, the archived-status neutral, the map card washes) the port is re-basing. Second consequence:
jsdom preserves the function but rewrites its argument, so a pin reads back
`color-mix(in srgb, rgb(43, 140, 193) 8%, transparent)` — every existing assertion on those values
reddens for a *format* change rather than a value change, which muddies the RED/GREEN discipline
§4.4 depends on. Third: it is a gratuitous divergence from the phone's own `with-alpha.ts`, whose
`rgba()` behaviour the plan is porting tests for (`:188` even cites "the `rgba()` input case the
phone's own util once got wrong by dropping the alpha channel").

**Evidence:** Executed against the repo's own jsdom:
`el.style.background = 'color-mix(in srgb, #2B8CC1 8%, transparent)'` reads back as
`"color-mix(in srgb, rgb(43, 140, 193) 8%, transparent)"`, while
`el.style.borderColor = 'rgba(43,140,193,0.08)'` round-trips byte-identically. The demo's existing
alphas are all `rgba()` — e.g. `input-theme.ts:27-30`, `glass-tokens.ts:40-43`.

**Fix:** Make `withAlpha(hex, a)` return `rgba(r,g,b,a)`, as the phone's util does. `color-mix()`
buys nothing here — the demo has no CSS custom properties to mix and every input is a known hex —
and it costs the port its own measurability. Keep the `rgba()`-input unit test the plan already
specifies.

---

### [MAJOR] ARCH-6 — no partial-ship story: every phase merges to `master`, leaving the demo visibly half-re-based for the length of the port, and it is not raised as a decision

**Doc:** `01-master-ui-parity-plan.md:140-141` (§4.5, "Branch per package … off `master`. One PR per
phase"), `:328` (§6.2, "then opens the phase PR"), `:453` (§9, "complete when **all** of the
following hold on `master`"); §3's decision gate D1–D17 contains nothing on this.

**Issue:** The plan sequences by *dependency*, not by *visual coherence*, and merges each phase to
`master`. Tracing what `master` looks like between phases: U0.1 re-bases the flat ground to
`#002853` and sweeps the 13 bare `#0d1b2a` sites — but `GLASS.gradientCard`'s
`rgba(19,34,54)/rgba(26,45,68)` stops do not move until **U1.1**, the three sheet grounds not until
**U4.1**, `mapTokens`' `rgba(13,27,42,…)` not until **U5.1**, `SplashScreen`'s `#000314` and the
teal scan sweep not until **U8.1/U8.2**, and the tab bar's `#1e3450` not until **U8.3**. So for the
plan's own estimate of ~7 weeks sequential / ~4-5 weeks with lanes
(`00-ui-parity-matrix.md:656`), `master` carries a demo whose flat surfaces are badge-blue and whose
gradients, sheets, map, splash and tab bar are old navy. That is the *"cards on cards read flat"*
defect class D1 exists to catch, induced deliberately and left standing for weeks — and this repo's
`/demo` is the public product demo on a beta-recruitment marketing site.

Nothing in the plan rules on this. It is not in D1–D17, §6 does not mention an integration branch or
a flag, and §9's DoD only describes the end state. A partial ship is the default outcome of the
current git strategy, chosen by omission rather than by decision.

**Evidence:** `features/demo/ui/glass-tokens.ts:31-33,36-37` — the card/diag/panel gradients and
`gridOverlay` are exactly where the plan says they are, and none of them is in U0.1's file list
(`01-master-ui-parity-plan.md:187`, which names `input-theme.ts:14-36` and
`glass-tokens.ts:23-44` — the accent stops and border shorthands, not the gradient stops, which U1.1
claims at `:203`). `census.mjs` run at HEAD confirms the spread: 100× `#f0f4f8`, 58× `#2B8CC1`,
47× `#99badd` across 136 files, with the gradient stops still on the pre-campaign ramp.

**Fix:** Add it to §3 as a decision — it is exactly the shape of D1–D17. Recommend a long-lived
integration branch `feat/uiparity` that every phase PR merges into (merge commits, per §4.5), with
one merge to `master` at DoD; the mechanical gates run on the integration head. If the owner prefers
phase-by-phase master merges for review hygiene, say so explicitly and add a line to §9 accepting a
visibly mixed-palette `/demo` for the duration.

---

### [MAJOR] ARCH-7 — U2.1 contradicts D10 on `SubmissionScreen`'s read-only field, and the rationale it gives is false for this codebase

**Doc:** `01-master-ui-parity-plan.md:216` (U2.1: *"`SubmissionScreen`'s read-only field takes the
real disabled path, **not `opacity:0.6` on the wrapper** — that faded the label too"*) vs `:61`
(D10: *"**Keep opacity + `aria-disabled`; add the two tokens; use them only where the phone paints a
fill (Button).** Never fade a label that carries data."*).

**Issue:** Two binding statements in the same document give opposite instructions for the same site.
D10 confines the `disabled`/`disabledText` tokens to `Button`; U2.1 routes `SubmissionScreen`'s
read-only field down "the real disabled path". And U2.1's justification is imported from the phone's
bug, not observed in the demo: the demo does **not** put `opacity: 0.6` on a wrapper containing the
label. `SubmissionScreen.tsx:146` is the label `div`; `:147` is a sibling value `div` carrying the
opacity. The label is not faded. The bug the plan tells the implementer to fix does not exist here,
and the "fix" swaps a working idiom for a token path that the plan's own D10 measures as *worse*
(`disabledText` 2.54/3.57 vs the 0.6 opacity's 4.60/5.22) — on a field that carries the occurrence
number, i.e. exactly the "label that carries data" D10 forbids fading.

**Evidence:** Read `features/demo/ui/screens/SubmissionScreen.tsx:145-148`. Line 146 is
`<div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>{COPY.caseNumber}</div>`;
line 147 is the separate value div `{ …, opacity: 0.6 }`. Two siblings, not a wrapper.

**Fix:** Delete the `SubmissionScreen` clause from U2.1 and let D10 govern: keep `opacity: 0.6` +
`aria-disabled` on the value div, apply the disabled tokens only in U2.2's `Button`. If the intent
was the *geometry* half (the field adopting `fieldInput`'s new `padding: 16` / `minHeight: 44`), say
that and drop the disabled-path language and its rationale.

---

## MINOR

### [MINOR] ARCH-8 — `glass-tokens.test.ts`'s banned-literal exclusion is filename-only, so every token module the port creates is an offender by construction

**Doc:** `01-master-ui-parity-plan.md:191` (U0.5, "ban the top ~10 palette hexes from `ui/**`
**outside the token modules**"), `:203` (U1.1's Tests column, which does not mention the guard's
scan root), `:187`/`:188`/`:232`/`:244`/`:289` (the other new modules under `ui/`).

**Issue:** The guard excludes exactly one file, **by name**: `entry.name !== 'glass-tokens.ts'`. The
port creates `ui/tokens/palette.ts`, `ui/tokens/scale.ts`, `ui/tokens/glass-tiers.ts`,
`ui/tokens/status.ts`, `ui/controls/sheet-chrome.ts` and `ui/screens/import/terminal-palette.ts` —
all under `ui/`, all holding exactly the literals the BANNED list will name. Each will redden the
guard the moment it is created. That is loud rather than silent, so it is not a blocker; the risk is
the *repair*: an implementer under time pressure widens the exclusion with a loose predicate and
quietly removes the anti-re-drift teeth the whole port depends on (A97's entire premise).

**Evidence:** `features/demo/ui/__tests__/glass-tokens.test.ts:19-30` (`sourceFiles`, the
filename-only skip) and `:33-44` (the ten BANNED literals, several of which — `1px solid #1e3a5f`,
`linear-gradient(180deg,rgba(19,34,54,0.85),…)` — are the exact strings U0.1/U1.1 replace).

**Fix:** Specify the mechanism once, in U0.5: replace the filename skip with an explicit
`TOKEN_MODULES` path allow-list, and make adding a path to it a reviewable act ("a new entry needs a
line saying why that file is a token module"). Then every later package just appends its module.

### [MINOR] ARCH-9 — `fieldInput` as an exported `CSSProperties` const cannot carry the four-state border precedence U2.1 specifies, and its home contradicts the `ui/tokens/` layer the same port builds

**Doc:** `01-master-ui-parity-plan.md:216` (U2.1: export it from `_shared.tsx`; *"Border precedence
**disabled → error → focused(`primary`) → `border`**"*; *"a pin that the four former copies import
the shared const"*).

**Issue:** A static style fragment cannot express a precedence chain. Each of the four adopting sites
must re-derive it as `{ ...fieldInput, borderColor: … }`, which is the duplication the package exists
to remove — four independent chances to order the four states differently. Two call sites already do
this today. Separately: the port is building `ui/tokens/` in U0-U3, and `fieldInput` — demo §4.7's
**#1** leverage recipe — is the one recipe left in a screen file.

**Evidence:** `_shared.tsx:262` — `const boxStyle = error ? { ...fieldInput, borderColor: '#ff4757' } : fieldInput`
(one branch of the chain, in `Field`). `NewCaseModal.tsx:52-61`'s copy is consumed by
`CoordinateField`, which owns its own `const [error, setError] = useState(…)` at `:65` — a second,
independent error branch. `AddressAutocomplete.tsx:35-44` and
`ui/inputs/IncidentLocationFields.tsx:87-96` are the other two byte-copies (note the matrix's
`IncidentLocationFields.tsx` is under `ui/inputs/`, not `ui/screens/`).

**Fix:** Export a **function** — `fieldInputStyle({ disabled, error, focused })` — from
`ui/tokens/` (or `input-theme.ts`), with the precedence implemented once. Keep U2.1's pin, but pin
that the four sites call the function, not that they spread a const.

### [MINOR] ARCH-10 — the web-specific shorthand-after-longhand hazard is not stated, and U1.2's single pin will not catch it

**Doc:** `01-master-ui-parity-plan.md:104` (§4.3: *"the equivalent is spreading a fragment and then
overriding one key: **check what the override lands on**"*), `:204` (U1.2 adds `borderTopColor` to
`glassCard` and one pin), `:217` (U2.2 adds `borderTopColor`/`borderBottomColor` to Button).

**Issue:** §4.3 names the class but not the web mechanism, and the mechanism is unforgiving: in an
inline style object the browser applies keys in order, so `{ ...glassCard, border: '1px solid X' }`
**silently wipes** the `borderTopColor` the fragment just set. That is the highlight edge — the
single most visible thing U1.2 adds — vanishing with no error, which is the same failure the phone
shipped at 0.06 alpha. U1.2's mitigation is one pin ("a card's `borderTopColor` differs from its
`borderColor`"), which covers one component out of nine consumers.

**Evidence:** No `glassCard` consumer overrides `border` today (I checked all nine), so the risk
arrives with the port, not before it. But the pattern is already live one file over in a file U2.2
edits: `RowActions.tsx:108` — `{ ...glassBtnSecondary, border: GLASS.borderBtn }` — and
`AlertDialog.tsx:182` — `{ ...glassBtnSecondary, border: GLASS.borderError, color: '#ff6b7a' }`.
Both are spread-then-shorthand.

**Fix:** One sentence in §4.3: *"In an inline style object a shorthand (`border`, `background`,
`padding`) placed after a longhand of the same family erases it. When overriding a fragment that
carries `borderTopColor`, override `borderColor`, never `border`."* And make U1.2's pin a loop over
every `glassCard` consumer rather than one component.

### [MINOR] ARCH-11 — the two sides spell `rgba()` differently, so any new string-valued anchor reports permanent false DRIFT

**Doc:** `01-master-ui-parity-plan.md:190` (U0.4), and any fix for ARCH-3.

**Issue:** `norm()` only trims and lowercases. The phone writes `rgba(14, 57, 101, 0.85)` with
spaces; the demo's convention is `rgba(14,57,101,0.85)` without. Every string-valued anchor added to
the guard (the tier gradients, borders, `gridSubtle`, `scrim`) compares unequal forever, and an
implementer's likely "fix" is to re-space the demo's literals — which reddens
`glass-tokens.test.ts`'s byte-exact shape pins across the board.

**Evidence:** `check-rn-parity.mjs:35` — `const norm = (v) => v.trim().toLowerCase()`. Phone
`Colors.ts:346` — `gradient: ['rgba(14, 57, 101, 0.85)', 'rgba(23, 65, 110, 0.92)']`. Demo
`glass-tokens.ts:31` — `'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))'`.

**Fix:** One line in U0.4: extend `norm` to strip whitespace inside function-notation values
(`v.trim().toLowerCase().replace(/\s+/g, '')`), and say so in the package, so nobody "fixes" it by
re-spacing the demo.

### [MINOR] ARCH-12 — U5.2 deletes a documented, deliberate 378px adaptation without recording the supersession

**Doc:** `01-master-ui-parity-plan.md:260` (U5.2: "`MapControls.tsx` (286 lines, **full rewrite**)"),
`:44` (§2's "never regress these" list of deliberate divergences).

**Issue:** `MapControls`' three-row stack is not drift — it is a recorded adaptation with a stated
reason. §2's "Direction of parity" enumerates the divergences that must never be regressed toward
the phone (v1 rows 33, 41, `MetadataForm`, `motion.ts`, D6/D11/D13) and this one is absent, so an
implementer handed "full rewrite to one row" will delete it silently. The premise probably *is*
superseded — #127 removes the pills that caused the collision, and U5.2 folds the "Change Case" pill
into the row as the close control — but that is a judgement the plan should make out loud, because
the new single row still has to fit a 378px slot with a 44px close circle, a flex search pill, a
divider, a filters button and a conditional proximity chip.

**Evidence:** `features/demo/ui/screens/map/MapControls.tsx:48-52` — *"On the phone the pill and row
1 sit at the same height because a 390-430 pt screen has room beside three status pills; **the
demo's screen slot is 378 px wide, where they collide.** Stacking below is the smallest honest
adaptation."* Container is `top: 92` at `:57-62`.

**Fix:** Add one line to U5.2: *"the three-row stack is a recorded 378px adaptation
(`MapControls.tsx:48-52`); #127 removes its premise by deleting the pills it avoided. Record the
supersession in the PR body and verify the single row fits 378px with the proximity chip visible."*

### [MINOR] ARCH-13 — U6.4 is sized M for what reads as four sub-ports across eleven screens

**Doc:** `01-master-ui-parity-plan.md:277` (U6.4, **M** · `opus-implementer`).

**Issue:** U6.4 covers eleven named screens and twelve Tier-B rows, and its Scope column names four
non-mechanical sub-ports: `TimeOffsetScreen`'s DEF-UI-012 monotone heading hierarchy,
`SyncStatusCard`'s severity-on-icon recipe, `CompletionScreen`'s four separate changes (drop
`techGlow`, two Banners, two glass sections, `disabled`→`aria-disabled`), and `DvrInfoScreen`'s local
`STATUS` map dying into U3.2. Its Tests column adds exactly **one** pin. By comparison U6.2 is sized
**L** for one 326-line file plus its panes. The sizing looks inverted, and an under-sized package in
the widest phase is where a review pipeline finds the most late defects.

**Evidence:** All eleven files exist; `census.mjs` at HEAD shows `TimeOffsetScreen.tsx` alone
carrying nine `#7a9fc4`, seven `#4BA3D4`, six `#f0f4f8` and three `#2B8CC1` occurrences — it is not
an adoption-only surface.

**Fix:** Split U6.4 into U6.4a (the eight adoption-only screens, S/M) and U6.4b (`TimeOffsetScreen`,
`SyncStatusCard`, `CompletionScreen`, `DvrInfoScreen` — the four with named recipe changes, M, and
worth `opus-implementer-max` given three of them carry contrast rulings). Give U6.4b more than one
new pin.

---

## Architect Summary

| Severity | Count |
|---|---|
| BLOCKER (CRITICAL) | 1 |
| MAJOR (HIGH) | 6 |
| MINOR (MEDIUM/LOW) | 6 |

| ID | Severity | Target | Claim |
|---|---|---|---|
| ARCH-1 | BLOCKER | plan §5 U0.4/U0 exit, §6.6, §9 | The 22-anchor gate is unsatisfiable until U8 yet is non-negotiable every phase — the plan deadlocks after U0 |
| ARCH-2 | MAJOR | plan §5 U2/U3, §6.1 | U2 ∥ U3 share seven files; §6.1 lists none and calls `_pane-chrome.tsx` single-owner |
| ARCH-3 | MAJOR | plan §2, §5 U0.4/U1.1 | Zero anchors cover the six-tier glass system, the port's largest Tier-A block |
| ARCH-4 | MAJOR | plan §5 U0.1/U0.4/U3.1 | Palette-module location left to the implementer but hard-coded by U3.1; either branch breaks the guard's web readers |
| ARCH-5 | MAJOR | plan §5 U0.2 | `withAlpha` → `color-mix()` makes routed values unmeasurable by the port's own contrast gate |
| ARCH-6 | MAJOR | plan §4.5, §6.2, §9 | No partial-ship story: `master` carries a half-re-based demo for ~7 weeks, undecided |
| ARCH-7 | MAJOR | plan §5 U2.1 vs §3 D10 | U2.1 contradicts D10 on `SubmissionScreen`, on a rationale that is false for this codebase |
| ARCH-8 | MINOR | plan §5 U0.5/U1.1 | Banned-literal exclusion is filename-only; every new token module is an offender |
| ARCH-9 | MINOR | plan §5 U2.1 | `fieldInput` as a const cannot carry the specified border precedence; wrong layer |
| ARCH-10 | MINOR | plan §4.3, §5 U1.2 | Shorthand-after-longhand hazard unstated; one pin for nine consumers |
| ARCH-11 | MINOR | plan §5 U0.4 | `norm()` does not strip inner whitespace — new string anchors drift forever |
| ARCH-12 | MINOR | plan §5 U5.2, §2 | A documented 378px adaptation is deleted without recording the supersession |
| ARCH-13 | MINOR | plan §5 U6.4 | M-sized for four sub-ports across eleven screens, with one new test |

**Verdict: BLOCK**

Notes: the approach is right for this codebase — U0-first, seams-then-values, and the demo's frozen
list are all correctly reasoned; the block is a sequencing defect in the gate (ARCH-1), fixable by
letting the anchor set grow with the phases rather than landing whole in U0.
