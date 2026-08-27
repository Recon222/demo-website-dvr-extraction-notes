# Plan Review r1 — QUALITY / EXECUTABILITY lane

**Reviewer:** `plan-quality-checker` role (per `.claude/agents/plan-quality-checker.md`), run on Opus per owner directive.
**Question:** *can one Opus implementer build a package from this document alone, without inventing what is missing?*
**Under review:** `docs/planning/demo-phone-ui-parity/00-ui-parity-matrix.md` (699 lines) + `01-master-ui-parity-plan.md` (465 lines) @ `3365e3e`, branch `docs/ui-parity-planning`.
**Context read:** `HANDOFF.md`; `demo-ui-inventory.md` §1.1/§1.2/§4.7/§6; `phone-ui-delta-inventory.md` (grep: §2 headings, `OverlayHeader`); `verification/README.md` §2; `features/demo/CLAUDE.md`; the v1 plan's §5 density benchmark.
**Not my lane:** architecture soundness (`plan-architect-reviewer`), verifying codebase claims at source (`plan-reality-checker`). Two findings below touch reality-lane territory and say so.

**Headline:** this plan is *dense and mostly excellent* — per-package `file:line` lists, before→after values, named test pins, effort/tier/deps, exit criteria per phase, a full progress tracker. It clears the v1 §5 density bar in most packages. The findings below are concentrated in three places: **the token vocabulary U0.1 is supposed to establish and never names**, **five packages whose central deliverable is a reference rather than a value**, and **the seam between packages when the seam is a component rather than a constant.**

---

## CRITICAL

### [CRITICAL] QUAL-1 — U7.2's central deliverable (`OverlayHeader`) has no stated recipe, and its named source resolves to a component D15 defers

**Doc:** `01-master-ui-parity-plan.md:290` (U7.2) · `00-ui-parity-matrix.md:153` (A61) · `01-master-ui-parity-plan.md:66` (D15)

**Issue:** U7.2's Recipes column, for the new shared component it exists to create, says in full: *"Header recipe from phone §2.B."* No values. A61 is the same: *"One shared full-bleed-overlay header for camera / recorder / preview. Recipe in phone §2.B."* Following that pointer, `phone-ui-delta-inventory.md:3197` describes `OverlayHeader` as:

> **Status:** NEW since baseline … **Phase/PR:** all in PR #125 — `4c0116cf feat(layout): EXPERIMENTAL floating header for Cases and Dashboard` → … → `9b2b1d71 feat(layout): make the floating header materialize on scroll` …
> **Role:** A WRAPPER that lifts a header out of flow and floats it over the scrolling list … a scroll-linked translucent band … It composes whatever header it is given (always `MainHeader`)

That is the four-tab scroll-materialising blur header — not a full-bleed camera/recorder/preview overlay header. It is also **exactly what D15 rules out**: *"**defer the scroll-materialising blur** (EXPERIMENTAL, carries the open U1 contrast item)."* Two further signals that the citation is wrong, not just thin: A61 attributes the file to **"P9 / #123"** while the inventory attributes every commit to **PR #125**; and the inventory's consumers line (`:3078`) reads *"all four tabs, always wrapped in `OverlayHeader`"* — the demo's four adopters (`AudioPreviewScreen`, `AudioRecorderScreen`, `MediaCaptureScreen`, `OcrCaptureScreen`) are none of them.

**The implementation-time question the doc cannot answer:** what are the values of the header U7.2 must build? The implementer reaches phone §2.B, finds a deferred blur wrapper for a different surface class, and must choose between (a) building the deferred component, (b) inventing a recipe from the four demo sites it is meant to replace, or (c) stopping. §4.3's own case law (*"A citation is a claim — open it … Where a plan or report line no longer matches, cite reality and record the disagreement"*) tells them to stop and raise — which is the correct behaviour and also means the package does not ship.

**Why conventions don't fill it:** no convention supplies a header recipe, and D15's deferral makes the one named source off-limits rather than merely stale.

**Fix:** either (i) locate the phone's actual full-bleed overlay header (if it exists — likely under `phone §2.B`'s camera/recorder entries, not `OverlayHeader.tsx`) and paste its recipe into U7.2's Recipes column the way U4.1 pastes the sheet recipe, correcting A61's file and PR attribution; or (ii) declare `OverlayHeader` a **demo-originated consolidation** of the four existing demo headers, state the four sites' current recipes and the merged target inline, and note that it has no phone counterpart. Either way add one line to U7.2: *"This is NOT the phone's `OverlayHeader.tsx` (PR #125's floating tab header) — that component is deferred by D15."*

---

## HIGH

### [HIGH] QUAL-2 — The token vocabulary every package's recipe text uses does not exist in the demo, and U0.1 never says what it will be called

**Doc:** `01-master-ui-parity-plan.md:187` (U0.1) · `demo-ui-inventory.md:257-283` (`T`'s real keys)

**Issue:** U0.1's scope is *"Create the demo's single palette module (extend `input-theme.ts`, or a new `ui/tokens/palette.ts` that `T` re-exports — implementer's call, but **`T`'s existing 7 importers must not break**)."* Its ADD list names new tokens by **phone** name (`textInverse`, `onPrimary`, `disabledText`, `primaryDark`). Every later package writes phone names too: U2.1 *"Placeholder `textTertiary`. **Disabled text is `textSecondary`**"*; U3.1's `*OnLight`; U6.2's *"pressed wash `link@0.06`"*; U7.2's *"the `#5a7a9a` sites take `textSecondary`, NOT `textTertiary`"*.

The demo's `T` has none of those names. Per `demo-ui-inventory.md` §1.2 the keys are `bg`, `raised`, `border`, `borderSoft`, `text`, `textDim`, `textMute`, `textFaint`, `primary`, `accentFrom`, `accentTo`, `primarySoft`, `primaryEdge`, `topHighlight`, `scrim`, `error`, `radius`, `rowH`. `textSecondary` is `textMute`; `textTertiary` is `textFaint`; `background` is `bg`; `textInverse`/`onPrimary`/`link`/`disabled*` do not exist at all.

**The implementation-time question:** does the new module export phone names (and `T` becomes an alias shim for its 7 importers), keep demo names (and every later package's recipe text must be translated at read time), or dual-export? U0.1 is the first package in the port; whatever it picks becomes the vocabulary of 35 downstream package briefs, and those briefs are already written in the *other* vocabulary.

**Why conventions don't fill it:** `features/demo/CLAUDE.md` and `demo §1` document the current names but say nothing about a migration; "implementer's call" is explicitly delegated for the file location but the naming is not addressed at all.

**Fix:** add a mapping table to U0.1's Recipes column and a binding sentence, e.g.:

> **Naming: the new module exports PHONE names.** `background` · `backgroundSecondary` · `backgroundTertiary` · `text` · `textSecondary` · `textTertiary` · `primary` · `primaryLight` · `primaryDark` · `link` · `border` · `borderLight` · `borderDark` · `error`/`errorLight` · `success`/`successDark` · `warning`/`warningDark` · `info`/`infoDark` · `onPrimary` · `onError` · `textInverse` · `disabled` · `disabledText` · `scrim` · `overlay` · `overlayLight`.
> `T` keeps its 18 existing keys and re-exports from the new module (`bg → background`, `textMute → textSecondary`, `textFaint → textTertiary`, `raised → backgroundSecondary`) so its 7 `inputs/` importers are untouched. **Every later package's recipe text is written in phone names and resolves against this module, not `T`.**

### [HIGH] QUAL-3 — `link` / `linkHover` — the port's self-declared highest-value row — are never added by any package

**Doc:** `00-ui-parity-matrix.md:95` (A27) · `01-master-ui-parity-plan.md:187` (U0.1 ADD list) · `:217, :219, :274, :275`

**Issue:** A27 is `Colors.dark.link #b8d4f0` / `linkHover #d0e4f7`, status **MISSING**, phase **U2**, and the matrix calls it *"The highest-value contrast row in the port."* A66 calls the same treatment *"the port's single highest-value contrast row."*

Nothing creates the token. U0.1's ADD list (`:187`) enumerates 14 new tokens and `link` is not among them. No U2 package cites A27 in its Matrix-rows column (U2.2 cites `A51, A52, A64–A68, A23, D10`; U2.4 cites `A23, A39, A59, A73, A74, A75`). The matrix's own §By-phase table (`:647`) lists U2's Tier-A rows as *"A23, A39, A49, A51, A52, A59, A64–A68, A72–A74, A76 (15)"* — **A27 is missing there too.** Meanwhile four packages spend the value: U2.2 *"outline/ghost: border AND label both `#b8d4f0`"*; U2.4 *"Radio selected: border, circle, dot AND label all `#b8d4f0`"*; U6.1 *"label `#4BA3D4` → **`#b8d4f0`**"*; U6.2 *"back label … → **`#b8d4f0`**"* and *"pressed wash **`link@0.06`**"*.

**The implementation-time question:** U6.2's implementer reads `link@0.06` and has no `link` to reach for; U2.2's implementer types a bare `#b8d4f0` into six outline sites — which is precisely the sprawl A97's banned-literal guard exists to stop, and U0.5 will ban *"the top ~10 palette hexes"* without knowing this one needs a home.

**Why conventions don't fill it:** the guard convention (A97) actively punishes the workaround the gap forces.

**Fix:** add `link #b8d4f0` and `linkHover #d0e4f7` to U0.1's ADD list, add **A27** to U0.1's Matrix-rows column, and correct the matrix's §By-phase U2 row (or move A27 to U0 alongside the rest of the palette, which is where its consumers need it).

### [HIGH] QUAL-4 — `withAlpha` is specified to emit `color-mix()`, which defeats both of the port's mechanical gates

**Doc:** `01-master-ui-parity-plan.md:188` (U0.2) · `:191` (U0.5) · `:97` (§4.2) · `00-ui-parity-matrix.md:138` (A53)

**Issue:** U0.2 specifies `withAlpha(hex, a) → color-mix(in srgb, <hex> <a*100>%, transparent)`. U0.5 then requires the ported contrast test to *"Port the WCAG 2.1 luminance helper, `flattenOver`, the `DARK_GROUNDS` stack"* and measure translucent stops — A53 says plainly *"`flattenOver` is what makes a translucent stop **measurable** — the contrast test (§4) needs it."* A `color-mix()` string carries no numeric channels; `flattenOver` cannot composite it without re-parsing a CSS function the helper does not implement.

Worse, §4.2 states the demo's own trap: *"**jsdom renders no CSS.** Every style assertion in demo §6 reads the **inline** `element.style`, so **a value moved out of an inline object into a class or a CSS variable silently un-pins its test** — which is worse than a red test."* jsdom's CSS parser drops declarations whose values it cannot parse; `color-mix()` is in that class. Any assertion reading a `withAlpha`-produced value would read `''` and pass vacuously.

**The implementation-time question:** U2.4 is told *"Route `Dropdown`'s four accent alphas through `withAlpha`"* and U5.4 *"The `${color}25`/`${color}50`/… idiom → `withAlpha`."* Do those call sites now emit CSS strings the tests cannot see, or numeric `rgba()`? The doc specifies the former and requires the latter.

**Why conventions don't fill it:** §4.2 warns about this failure mode in the abstract but U0.2 specifies the value form that triggers it, so a careful implementer reading both gets a contradiction, not an answer.

**Fix:** change U0.2's Recipes column to `withAlpha(hex, a) → 'rgba(r, g, b, a)'` computed in TypeScript (parse the hex, emit the numeric string), and add: *"`color-mix()` is reserved for `app/css/style.css`'s `@theme` mirrors only. Inside `features/demo/**` every alpha value is a literal `rgba()` string, so `flattenOver` can composite it and jsdom can read it."* Add a unit test to U0.2's Tests column: *"`withAlpha('#2B8CC1', 0.08) === 'rgba(43, 140, 193, 0.08)'` — and that jsdom round-trips it through `element.style.background`."*

### [HIGH] QUAL-5 — U5 is the only phase with no contrast targets, and one of its stated recipes is the exact pairing the matrix's binding rider forbids

**Doc:** `01-master-ui-parity-plan.md:260` (U5.2) · `00-ui-parity-matrix.md:87` (A19) · `:599` (C.3 rule 2) · `:173` (A81)

**Issue:** U5.2's badge spec: *"Badge `16×16 min, r9999, top 6/right 4, px 4`, fill `#2B8CC1`, **10/700 `#ffffff`**."* A19's rider is binding: *"**`onPrimary` pairs with the DEEP shade, never the flat mid-tone.** On dark, `onPrimary` on `primary` is **3.73 (fails)**; on `primaryDark` 5.80."* C.3 rule 2 restates it and gives the only carve-out: *"Carved out and fine as **non-text marks** at 3.73: checkboxes, indicators, bounding boxes, capture buttons."* A count badge renders a **numeral** — text, at 10px, i.e. the strictest 4.5:1 threshold, with no AA-large relief (matrix `:524`: *"There is no AA-large relief anywhere"*). Recomputing: `#ffffff` on `#2B8CC1` = **3.73:1**. The plan ports the failing pair verbatim and never flags it.

More broadly: U5.1–U5.4 are the only packages in §5 whose Tests columns contain **no contrast target at all**, in the phase that creates the most new text-on-new-ground surfaces in the port (search input 14px, placeholder, chip text 12/600, section labels, filter chips 14/600 on `*Light` fills) and that carries a knowingly-inherited accepted failure (DEF-062 at 1.77). §C has no map-chrome rows beyond DEF-062, and §6.5 briefs reviewers *"Do not file a finding that a ceiling was not fixed"* — so nobody is positioned to catch it.

**Why conventions don't fill it:** the inheritance rule (D5) covers four *named* ceilings; this pairing is not one of them, so an implementer has no basis to treat 3.73 as accepted.

**Fix:** add to U5.2's Tests column a contrast block, and to §C.1 the corresponding rows — e.g. *"badge label `#ffffff` on `#2B8CC1` measures 3.73 and is **below** the 4.5 text floor. Rule: either take `primaryDark #1F6B99` for the badge fill (5.80, and consistent with A19's rider), or record it in `deferred.md` §89 as a fifth inherited ceiling with the phone's own `MapControls.tsx` citation and a re-measure trigger."* Add per-surface floors for the search placeholder, the chip text and the section labels against `surfaceBg rgba(0,40,83,0.82)` over a satellite tile.

### [HIGH] QUAL-6 — §2's "no behaviour change, stop and raise" contradicts at least six packages whose specs require exactly that

**Doc:** `01-master-ui-parity-plan.md:32` (§2 Out) vs `:218, :245, :246, :261, :276`

**Issue:** §2 is unambiguous: *"**Logic.** No behaviour change. No new store subscriptions, no new engine functions, no changed flow. **If a package thinks it needs one, it is mis-scoped — stop and raise it.**"* Then:

- **U2.3** (`:218`) — *"Add `hideLabel` to `Toggle`; **delete `RowSwitch`**"* — a component API change and a deletion.
- **U4.2** (`:245`) — *"**`closeAccessibilityLabel` becomes required, not defaulted**"* — a breaking prop-type change across five sheets.
- **U4.3** (`:246`) — *"**One focus trap, not three.** … Keep each caller's differences: `AlertDialog`'s scrim does **not** dismiss … `ExportModal`'s is gated on `!isExporting`"* — consolidating focus traps and threading dismissal behaviour is behaviour, and the shell needs props to express it.
- **U5.3** (`:261`) — Files: *"`screens/map/MapScreen.tsx` (**host state, `filtersVisible`**)"*, then in the same cell: *"**Logic constraint: filter state stays exactly where it is today.** This package moves the CONTROLS, not the state."* `filtersVisible` **is** new state; the row contradicts itself in two adjacent sentences.
- **U5.2** (`:260`) — *"`MapScreen.tsx:90-103` (**delete the "Change Case" pill**)"* and rehome its function onto the close button — a changed flow.
- **U6.3** (`:276`) — *"**D16: DELETE the armed-case echo row**"* — removes rendered content.

**The implementation-time question:** each of those implementers, briefed with §4 in full (which §6.4 item 1 mandates) plus §2's scope, must decide whether to execute their package or invoke the stop-and-raise rule. Compounding it, §6.5 briefs every reviewer with *"A finding that asks for a logic change is out of scope unless the style change broke behaviour"* — so a reviewer can legitimately flag U5.3's `filtersVisible` as out of scope and force a fix round over a package doing exactly what its own row specifies.

**Why conventions don't fill it:** the more-specific-wins reading is a guess; §2's wording ("stop and raise") is written as an absolute and is the *first* thing a mis-scope check hits.

**Fix:** amend §2 to carve the line the packages actually draw:

> **In scope:** component-local UI state, prop signatures and the composition of presentational components, where a named package specifies it (U2.3's `hideLabel`, U4.2's required close label, U4.3's single focus trap, U5.3's `filtersVisible`, U5.2's and U6.3's owner-ruled deletions).
> **Out of scope:** the store bridge, engine functions, data flow, new store subscriptions, and any change to *what the demo does* rather than *what it looks like*. If a package needs one of THOSE, it is mis-scoped — stop and raise it.

and delete "host state, `filtersVisible`" / "moves the CONTROLS, not the state" as a self-contradiction, replacing it with *"`filtersVisible` is new local `MapScreen` state (permitted, see §2). The filter VALUES and their reducer stay exactly where they are."*

### [HIGH] QUAL-7 — No rollback or intermediate-state policy for a nine-phase port that merges to `master` phase by phase

**Doc:** `01-master-ui-parity-plan.md:138` (§4.5) · `:328` (§6.2) · `:453` (§9) — and the absence of any rollback section

**Issue:** §4.5: *"Branch per package: `feat/uiparity-u<N>-<slug>` off `master`. One PR per phase."* §6.2: the orchestrator merges packages into a phase branch, *"then opens the phase PR."* §9's DoD is stated *"on `master`"*. So `master` receives eight intermediate states over ~5–7 weeks.

The first of those is visibly incoherent by construction: U0.1 moves `T.bg`/13 bare sites from `#0d1b2a` to `#002853` while `GLASS.gradientCard`'s stops stay `rgba(19,34,54,…)` — U1.1 is what re-bases them. Between the U0 merge and the U1 merge, every card in the demo is a pre-campaign navy floating on a post-campaign ground. Similarly U2 ∥ U3 land control and status colours before U4's sheets and U5's map.

The plan says nothing about: whether `master` is deployable mid-port, whether the `/demo` route is shipped from `master` (DoD item 6 measures `/demo` First Load, implying it is), what to do if a phase review comes back BLOCK after merge, or how to revert one phase without unpicking the next.

**Why conventions don't fill it:** CLAUDE.md's review workflow covers PR gating, not multi-phase integration; v1's HANDOFF §4 (copied into §4.7) has no rollback rule either.

**Fix:** add a short §4.8, e.g.:

> **Integration model.** Phase PRs merge into a long-lived `feat/uiparity` integration branch, not `master`; `master` takes one merge commit at U8 exit. *(Alternative, if the owner wants continuous landing: state explicitly that `master` may render a partially-ported palette between phases, that this is accepted, and that the demo is not customer-facing during the port.)*
> **Rollback.** A phase is reverted with `git revert -m 1 <phase merge commit>`; because packages are granular and each maps to matrix rows, a single package can be reverted by its own commits. No phase may depend on an unmerged later phase — the dependency shape in §5 is also the revert-safety order.

### [HIGH] QUAL-8 — U4.1's SEAM is a style module, but three consuming packages use it as a mountable sheet **component**

**Doc:** `01-master-ui-parity-plan.md:244` (U4.1) · `:261` (U5.3) · `:290` (U7.2) · `00-ui-parity-matrix.md:174` (A82)

**Issue:** U4.1's Files column delivers *"new `ui/controls/sheet-chrome.ts` (**`SEAM(U4.1)`**)"* — a `.ts` constants module — plus edits to three existing sheets. Its Recipes column is styles: ground, radii, border widths, handle, header band, motion timings.

But U5.3 says *"**`GlassBottomSheet` (U4.1)** titled `Map Filters`, subtitle `N locations` / `N of M locations shown`, `closeLabel="Close map filters"`, no header ✕"* and lists four close routes; A82 adds *"defaults `maxHeightRatio 0.9`, `fillHeight false`, handle + accent strip on"* and *"Four close routes, all one handler: backdrop, **swipe-down**, **Android back**, Done."* U7.2 says *"**Library:** fold onto the sheet seam (U4.1) as the phone folded it onto `GlassBottomSheet`."* Those are the responsibilities of a component with state, gestures, a portal mount and a focus contract — not a constants file.

**The implementation-time questions the doc cannot answer:** (1) Does U4.1 export a `<GlassBottomSheet>` React component, and if so what are its props (`visible`, `onClose`, `title`, `subtitle`, `closeLabel`, `maxHeightRatio`, `fillHeight`, `footer`)? (2) §5's rule is *"A package that needs a seam that does not exist yet is mis-ordered — stop and raise it, do not build a private copy"* — so U5.3 must stop. (3) What is the web analog of **"Android back"**? (`Escape`, presumably, but the plan never says, and U4.3 separately specifies per-caller dismissal semantics.) (4) The same prop is called `closeAccessibilityLabel` at U4.2/A60 and `closeLabel` at U5.3/A82.

**Why conventions don't fill it:** §4.1 item 5 mandates portal placement but says nothing about a shared sheet component's API; the demo has three unshared sheet implementations today, so there is no existing shape to copy.

**Fix:** extend U4.1's scope and Files to deliver both halves and state the signature, e.g.:

> `ui/controls/sheet-chrome.ts` (the style constants, **`SEAM(U4.1)`**) **and** `ui/controls/GlassBottomSheet.tsx` (the mountable shell, **`SEAM(U4.1b)`**):
> `{ visible: boolean; onClose: () => void; title: string; subtitle?: string; closeAccessibilityLabel: string; maxHeightRatio?: number /* 0.9 */; fillHeight?: boolean /* false */; showHandle?: boolean /* true */; footer?: ReactNode; children: ReactNode }`
> Close routes on the web: backdrop click · swipe-down past `DRAG_THRESHOLD` · **`Escape`** (the Android-back analog) · the caller's own footer action. One handler. Portals through `PhoneOverlayPortal` (§4.1 item 5).

Then use `closeAccessibilityLabel` uniformly in U4.2, U5.3 and A82, and add `SEAM(U4.1b)` to U5.3's and U7.2's Deps.

---

## MEDIUM

### [MEDIUM] QUAL-9 — §6.1's contention table omits the port's widest-reaching package and three shared files

**Doc:** `01-master-ui-parity-plan.md:316-324` (§6.1) vs `:187` (U0.1 Files)

**Issue:** §6.1 exists so *"Within a phase, land the hotspot change first … across lanes, give each agent its own worktree and merge in the fixed order below."* Its `_shared.tsx` row lists *"U2.1, U2.3, U4.2, U4.3, U6.1"*. But U0.1's Files column includes *"the 13 bare `#0d1b2a` … sites listed in matrix A1"*, and A1 (`00-ui-parity-matrix.md:69`) enumerates `PhoneFrame.tsx:59`, `AddressAutocomplete.tsx:39`, `IncidentLocationFields.tsx:91`, `DvrInfoScreen.tsx:144`, `MapCanvas.tsx:92,100`, `MediaCaptureScreen.tsx:444`, `NewCaseModal.tsx:56`, `OcrCaptureScreen.tsx:494`, `SettingsModal.tsx:81`, `SubmissionScreen.tsx:147`, `_shared.tsx:125,190`. That is U0.1 editing files owned later by U2.1 (`AddressAutocomplete`, `IncidentLocationFields`, `NewCaseModal`, `SubmissionScreen`), U4.2 (`SettingsModal`), U5.1 (`MapCanvas`), U7.2 (`MediaCaptureScreen`, `OcrCaptureScreen`), U8.2 (`PhoneFrame`) and `_shared.tsx:190` — which is `fieldInput`'s background, the exact block U2.1 rewrites.

Also missing rows: `MediaLibrarySheet.tsx` (U4.4 `:336-404` + U7.2 whole-file), `MapScreen.tsx` (U5.2 `:90-103` + U5.3 host state), `screenData.ts` (U3.2 + `screenData.test.ts` pins that U3.4 and U6.3 read).

**Fix:** add U0.1 to the `_shared.tsx` row and add three rows: `MediaLibrarySheet.tsx` (U4.4 → U7.2, serialise), `MapScreen.tsx` (U5.2 → U5.3, serialise), `screenData.ts` (U3.2 single-owner; U3.4/U6.3 read-only). Add one sentence to §6.1: *"U0.1 is a cross-cutting sweep — it touches 13 files that later packages own. It lands first, alone, before any U1+ branch is cut."*

### [MEDIUM] QUAL-10 — Three Tier-B rows are double-owned and two are orphaned between the matrix and the plan

**Doc:** `00-ui-parity-matrix.md:273, 275, 284, 223, 231, 647-651` vs `01-master-ui-parity-plan.md:277` (U6.4)

**Issue:** U6.4's Matrix-rows column claims *"B.5 rows 11/12, 13, 14, 23, 29, 31, 34, 35, 41, 43, 46."* But the matrix assigns row **29** (`SubmissionScreen`) to **U2** (`:273`), row **31** (`RequestedScopeScreen`) to **U2** (`:275`), and row **43** (`ExtractedScopeScreen`) to **U3** (`:284`) — and its §By-phase table (`:647-648`) lists 29/31 under U2 and 43 under U3. Concretely: U2.1 already *"fix[es] `SubmissionScreen.tsx:147`"*, U2.4's Files already include `RequestedScopeScreen.tsx:19-29`, and U3.3's 12 Banner sites already include `ExtractedScopeScreen.tsx:23-25`. So two packages each believe they own three surfaces, with no split stated.

Orphans in the other direction: matrix row **6** (`DemoErrorBoundary`, `:223`, phase **U3**, delta *"re-base with A29/A36; the `rgba(255,71,87,0.06)` detail block → `errorLight` … if it becomes a Banner"*) is named in **no** U3 package's Files column. Matrix row **9** (`CaseActionsSheet`, `:231`, phase **U4**, consumes A54/A55/**A58**/**A60**/A64/A65) is handled only for its nested gradient by U1.3; no package adopts it onto the sheet or modal-header seams.

**Fix:** strike 29, 31, 43 from U6.4's Matrix-rows column (they close in U2.1/U2.4/U3.3) or state the split per surface. Add `chrome/DemoErrorBoundary.tsx` to U3.3's Files (it is a Banner adoption plus a card re-base) and `CaseActionsSheet.tsx` to U4.1's or U4.2's Files for its A58/A60 half.

### [MEDIUM] QUAL-11 — U0.1's Files column points at a site list that does not exist

**Doc:** `01-master-ui-parity-plan.md:187` · `00-ui-parity-matrix.md:75` (A7)

**Issue:** U0.1's Files column reads *"the 13 bare `#0d1b2a` and **15 bare `#1e3a5f` sites listed in matrix A1/A7**."* A1 does enumerate its 13. **A7 enumerates none** — its demo column says only *"plus **15 bare copies** (demo §2.3, `#1e3a5f` **17×**)"*, which also contradicts itself (15 vs 17) and is the larger of the two sweeps.

**Why it matters, but only MEDIUM:** the implementer can `grep -rn '#1e3a5f' features/demo/ui` and U0's exit criterion is mechanical (*"census re-run shows the `#0d1b2a`/`#1e3a5f`/`#2a4a6f` counts at their token-definition lines only"*), so the work is recoverable — but they cannot tell from the doc whether they are done at 15 or 17, nor which of those sites belong to another package's file (see QUAL-9).

**Fix:** enumerate A7's sites in the matrix the way A1 does, reconcile 15 vs 17 against the census, and change U0.1's Files text to point at the real list.

### [MEDIUM] QUAL-12 — A47 (typography) is cited by a package whose spec contains no typography

**Doc:** `01-master-ui-parity-plan.md:188` (U0.2 Matrix rows: `A41, A42, A47, A49, A53`) · `00-ui-parity-matrix.md:127` (A47)

**Issue:** U0.2 is *"The scales module — Introduce `spacing`, `radius`, `iconSize`, `touchTarget` as real token objects, plus `withAlpha`/`flattenOver`."* Its Recipes column covers spacing, radius, touchTarget, iconSize and `withAlpha`. **Nothing about type.** Yet it cites A47, whose content is binding and portable: *"The scale a web port inherits is `12/14/16/18/20/24/30/36` and nothing else. **DEF-UI-027 is binding and portable:** … **port off-scale sizes as literals; do NOT snap them to the nearest step (a 1–2pt move at 19 places), and do NOT invent CSS steps for them.**"*

That rule governs at least six later packages that move a font size (U2.1 15→16, U3.4's 18px message, U4.2's 22→24 title, U6.1's 17→18 title, U6.2's 11.5→12 / 15→16 / 13→14, U7.1's `TERMINAL_FONT_SIZE`, U8.1's `fontSize: 46` literal). Nowhere in §4 or §5 is the "port off-scale as a literal" rule restated, so it reaches an implementer only if their brief happens to include A47's full text — and only U0.2's brief does, where it is unused.

**Fix:** either give U0.2 a type-scale deliverable (`fontSize` token object at `12/14/16/18/20/24/30/36`) with A47's rule in the module docblock, or move A47 to §4 as a standing convention: *"**§4.8 Type.** The scale is `12/14/16/18/20/24/30/36`. Off-scale sizes in the demo (10, 11, 13, 15, 22, 46, the half-points) are **kept as commented literals** — never snapped to the nearest step, never given an invented token (DEF-UI-027)."*

### [MEDIUM] QUAL-13 — The mandatory verification gate and the Playwright harness live only on an unmerged branch

**Doc:** `01-master-ui-parity-plan.md:17, 20` (§1) · `:370` (§6.6 gate 5) · `HANDOFF.md:5` (*"Nothing merged to master yet"*)

**Issue:** §6.6 makes gate 5 non-negotiable: *"`census.mjs` before and after — the delta is the package's own evidence."* §1 gives the invocation `node docs/planning/demo-phone-ui-parity/census.mjs .` and §6.6's Playwright half says *"`verification/lib.js` + the numbered drivers are directly reusable."* Both files exist only under `docs/planning/demo-phone-ui-parity/` on branch `docs/ui-parity-planning`. §4.5 cuts every package branch *"off `master`"*, where neither exists.

**Fix:** add a prerequisite line to §5's preamble: *"**Before U0 starts, the planning bundle (matrix, plan, both inventories, `census.mjs`, `verification/`) is merged to `master`** — every package's mandatory gate 5 and its Playwright evidence depend on those paths resolving from a branch cut off `master`."*

### [MEDIUM] QUAL-14 — Six packages name their tests-to-update as "any test reading X" while §4.4 makes an un-updated red a HIGH review finding

**Doc:** `01-master-ui-parity-plan.md:115` (§4.4) · `:343` (§6.4 item 6) vs `:204, :217, :218, :244, :219, :259`

**Issue:** §4.4: *"for every assertion a package reddens, the package updates it in the SAME commit as the value change, and the commit body records the observed red line verbatim."* §6.5 briefs every reviewer: *"A pin updated in a later commit, or without the red line, is a **HIGH**."* §6.4 item 6 promises each brief contains *"**The exact list of tests it is expected to redden** (from demo §6)."*

But the plan's own Tests columns hedge in six places: U1.2 *"any test reading a card's `border`/`background`"*; U2.2 *"any test reading a glass-button colour"*; U2.3 *"any `FormFieldsPane` test asserting `RowSwitch`'s DOM"*; U4.1 *"any `PickerSheet` test reading its panel background"*; U2.4 *"`CoordinateDisplay.test.tsx:23-24` **if** the tone triple moves"*; U5.1 *"none expected"*. `demo-ui-inventory.md` §6 is a global inventory by file, not a per-package split, so item 6's promise cannot be honoured from it mechanically — and the same §4.4 flags cross-package risk (`controls.test.tsx` pins `#4BA3D4`/`#5d7a9a`, which U2.2's glass-button change may redden while **U8.3** owns those pins).

**Fix:** resolve each hedge to `file:line` from demo §6 (they are all listed there), and add one line to §4.4: *"If a package reddens an assertion **owned by another package** (per §5's Tests columns), it updates the value and **hands the pin to the owning package unchanged** — record the cross-package red in both PR bodies. `controls.test.tsx`'s TabBar pins belong to U8.3."*

### [MEDIUM] QUAL-15 — §3's "Blocks" column is wrong for two decisions and mis-references a section

**Doc:** `01-master-ui-parity-plan.md:52, 63, 65`

**Issue:** the Blocks column is what tells an agent *"stop if a decision it depends on is unruled"* (§6.4 item 8), so it must be complete.
- **D12** Blocks: *"U8.2, U7.3"* — but D12's three-way ruling governs `RowActions`' danger button (U2.2), `DemoNotification`/`CallConfirmSheet` (unassigned, see QUAL-10), `PaneStubNote` (U6.2, which cites D12 in its own text), `DemoErrorBoundary` (U3), and `PdfPreview` (U4.4/U7.2).
- **D14** Blocks: *"(nothing — it is the absence of a package)"* — but U5.2's spec depends on it: *"Outer `zIndex 1020` (**within the demo's own scheme — do not import the phone's 1000-series; see D14**)"*, and U4.2/U6.2 both carry must-not-move z pins justified by D14.
- **D1** Blocks: *"§6.5, the U1/U4/U5 exits"* — §6.5 is Review mechanics; the verification lane D1 governs is **§6.6**.

**Fix:** D12 → *"U2.2, U3.3, U4.4, U6.2, U7.3, U8.2"*. D14 → *"U5.2's zIndex choice; the must-not-move z pins in U4.2 and U6.2"*. D1 → *"§6.6, the U1/U4/U5 exits"*.

### [MEDIUM] QUAL-16 — No public API is stated for any of the ten new modules and components the port creates

**Doc:** `01-master-ui-parity-plan.md:171-173` (§5's seam example, `{ … }`) · `:188, :191, :203, :231, :232, :233, :244, :246, :261, :289, :290`

**Issue:** the port introduces `ui/tokens/palette.ts`, `scale.ts`, `glass-tiers.ts`, `status.ts`, `ui/controls/sheet-chrome.ts`, `Banner.tsx`, `CentredDialog.tsx`, `ui/chrome/OverlayHeader.tsx`, `screens/map/MapFiltersSheet.tsx`, `ui/screens/import/terminal-palette.ts`. Values are given for all of them; **signatures for none**. §5's own seam illustration is `export const GLASS_TIER = { … } as const` — the `…` is literal.

Concretely unanswered: is a tier `GLASS_TIER.card.border` or `glassTier('card').border` (U1.2's recipe writes `<card.border>`, a placeholder)? Is `STATUS_SEVERITY` keyed by status string returning a severity name, and is the badge trio a helper or four token reads? What are `Banner`'s props (`{severity, message}`? does it take a title? U3.3 says *"No `icon` prop"* but names nothing it *does* take)? `CentredDialog`'s (U4.3 requires per-caller scrim-dismissal, so at least one behavioural prop)? `flattenOver`'s signature (A53 gives `flattenOver(top, bottom)`; the contrast test needs it to accept the `DARK_GROUNDS` stack, i.e. n-deep)?

This is the checklist's "Public API contracts" category, and it matters more than usual here because §5's SEAM rule forbids a consumer from building a private copy — so a mismatch between what U1.1 exports and what U1.2 expects is a stop-and-raise, not a small refactor.

**Fix:** add a one-line `export` signature to each creating package's Recipes column, e.g. U1.1: `export const GLASS_TIER = { card: { gradient: [string, string]; border: string; highlightTop: string; innerShadow: string }, nestedCard: …, elevated: …, header: …, sheet: …, recessed: … } as const` — and the same for `STATUS_SEVERITY`/`STATUS_ACCENT`, `Banner`, `CentredDialog`, `MapFiltersSheet`, `withAlpha`/`flattenOver`.

### [MEDIUM] QUAL-17 — `errorLight #b72136` is created twice, by packages in different phases

**Doc:** `01-master-ui-parity-plan.md:187` (U0.1 ADD list) · `:231` (U3.1 ADD list)

**Issue:** U0.1's ADD list includes *"`errorLight #b72136`"*; U3.1's reads *"**ADD** `successLight #0f6b42` · `warningLight #7d5f10` · **`errorLight #b72136`** · `infoLight #2e5f97` …"*. U3.1's implementer, briefed to ADD it, finds it already present three phases earlier and must decide whether that is drift, a mistake, or expected. U3.1 also adds `infoLight #2e5f97`, the same hex U0.1 adds as `borderLight` — two names, one value, unremarked (that is fine and matches A16, but should be stated so nobody "de-duplicates" it).

**Fix:** strike `errorLight` from U0.1 (U3.1 owns the whole status family) or from U3.1, and add to U3.1: *"`infoLight` and `borderLight` are deliberately the same hex `#2e5f97` (A8/A16) — do not collapse them."*

### [MEDIUM] QUAL-18 — U5's Playwright evidence requires a Mapbox token the plan says does not exist and must not be fabricated

**Doc:** `01-master-ui-parity-plan.md:158, 332` · `:147` (§4.6) · `verification/README.md:296`

**Issue:** §4.6 makes *"`pnpm dev` and a Playwright capture of the touched surface"* part of every package's verification, and §4.5 requires *"evidence (before/after captures from the Playwright harness)"* in every PR body. §4.7 and §6.3 both state: *"No `.env.local` exists in the demo repo — map/AI degrade gracefully by design. **Never fabricate tokens.**"*

The harness disagrees (`README.md:296`): *"**Mapbox token — REQUIRED for any map-depth work.** Without `NEXT_PUBLIC_MAPBOX_TOKEN`, `MapCanvas` early-returns the `[data-map-fallback]` 'Map preview unavailable' panel. **Clustering, the proximity ring and long-press then do not exist to test at all** — a run against the tokenless fallback proves nothing."* Its token-recovery recipe is a **macOS path** (`/Users/fvadev/Developer/…/.env`); this box is Windows and the phone repo is at `D:\…\extraction_case_notes_react_native_expo`.

So U5.1/U5.2/U5.3/U5.4 — the phase with two brand-new surfaces and a device-pass checkpoint — have no runnable evidence path as written.

**Fix:** add to §6.6: *"**U5 captures need `NEXT_PUBLIC_MAPBOX_TOKEN`.** Read it (read-only, never write) from the phone repo's `.env` at `D:\Work Coding Projects\CCTV Recovery Notes App\extraction_case_notes_react_native_expo\.env` and pass it inline: `NEXT_PUBLIC_MAPBOX_TOKEN=$TOK pnpm dev --port 3001`. Never write a `.env.local`. If the token is unavailable, U5's evidence is `[data-map-fallback]` captures plus the sheet/chrome surfaces, and the PR body must say so."*

### [MEDIUM] QUAL-19 — §4.6's per-package gate is unachievable for the three packages that precede the gates

**Doc:** `01-master-ui-parity-plan.md:147` (§4.6) vs `:190, :191` (U0.4, U0.5)

**Issue:** §4.6: *"`pnpm test --silent` green → `pnpm exec tsc --noEmit …` → **`node .design-sync/check-rn-parity.mjs` green** → **the ported contrast test green** → `pnpm dev` and a Playwright capture."* Applied to U0.1: the drift guard is **RED on master and throws** (A96) until U0.4 fixes it, and the contrast test does not exist until U0.5. U0.2 and U0.3 are in the same position.

**Fix:** add a sentence to §4.6: *"Gates 3 and 4 come online with U0.4 and U0.5 respectively. U0.1–U0.3 run gates 1, 2 and 5 only; the U0 phase **exit** (§5) is where all five must be green together."*

### [MEDIUM] QUAL-20 — U8.4 has no verification for the one failure mode it names as runtime-only

**Doc:** `01-master-ui-parity-plan.md:304` (U8.4, Tests column: *"— (tooling; no product tests)"*)

**Issue:** U8.4 itself states the hazard: *"Run **`gen-dts-props.mjs`** … **then `gen-entry.mjs`** — *'ALWAYS after config edits'*; a component added without it is **bundled-but-unreachable and fails at runtime, not build time**."* It then supplies no check that would catch it, and D7 supplies the reason it matters: *"the design project ships the old palette and **nothing flags it** — which is precisely how the phone's own `tokens.css` went a full campaign stale."*

**Fix:** replace the Tests column with a concrete manual/scripted gate, e.g.: *"After `gen-entry.mjs`, assert the four new components resolve from the generated entry (`node -e "…"` importing each by its `componentSrcMap` key) and that `grep -rl '#0d1b2a' .design-sync/previews/` returns **zero** files. Record both outputs in the PR body."*

### [MEDIUM] QUAL-21 — `type-design-analyzer` is named as a review lane but is not among this environment's agent types *(cross-lane — reality lane should confirm)*

**Doc:** `01-master-ui-parity-plan.md:353` (§6.5)

**Issue:** §6.5 fans out five named lanes: *"`typescript-reviewer`, `web-reviewer`, `test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`."* The first four are present as agent types in this session; `type-design-analyzer` is not (the near-neighbour is `pr-test-analyzer`). CLAUDE.md's review-workflow section names the same five, so the discrepancy may be in CLAUDE.md rather than the plan. Flagging because the phase-boundary review is the plan's stated safety net for a port with no logic tests, and a lane that fails to dispatch would silently reduce five lanes to four.

**Fix:** confirm at source (reality lane) whether `.claude/agents/type-design-analyzer.md` exists; if not, either add it or replace the name in §6.5 (and CLAUDE.md) with the agent that actually covers type design.

---

## LOW

### [LOW] QUAL-22 — The owner-ratification table has no recommendation column

**Doc:** `00-ui-parity-matrix.md:681-699`

**Issue:** the ratification table is `# | Decision | Ruling | Notes`. Each decision's recommendation lives ~250 lines earlier in §DECISIONS. An owner ruling on 17 decisions in one pass must page back for each. The plan's §3 mirror (`01-master-ui-parity-plan.md:50-68`) *does* have a Recommendation column — so the fix is to make the ratification table match its own mirror.

**Fix:** add a **Recommendation (one line)** column to the §OWNER RATIFICATION table, copied from plan §3, so the owner can write "ratify" / "override → X" per row without leaving the table.

### [LOW] QUAL-23 — No package→driver map for the Playwright evidence 36 PR bodies are required to carry

**Doc:** `01-master-ui-parity-plan.md:142` (§4.5) · `:372-378` (§6.6)

**Issue:** §4.5 requires *"evidence (before/after captures from the Playwright harness)"* in every PR body; §6.6 says the 15 numbered drivers *"are directly reusable"* and lists three specific traps. It never says which driver covers which package, where captures land, or how "before" is produced once a branch already contains the change. `verification/README.md:344` supplies the invocation (`DEMO_BASE=… SHOT_DIR=… node <script>.js`) and §3 an inventory of 57 baseline PNGs, so an implementer can work it out — hence LOW.

**Fix:** add a two-column table to §6.6 mapping each phase to its driver(s) (`U1/U6 → 01-wizard-walk.js`, `U5 → 04-map.js` + `09-p56-map-depth.js`, `U7 → 03-import.js`/`06-p4-media.js`/`07-p4-ocr-pdf.js`, `U8 → 15-p8-boot.js`, …) and one line: *"'Before' captures are taken from the v1 baselines in `verification/` §3 where one exists; otherwise run the driver on `master` first and store both sets under `SHOT_DIR=…/uiparity/<pkg>/{before,after}`."*

---

## Plan Quality Summary

| Severity | Count |
|---|---|
| CRITICAL | 1 |
| HIGH | 7 |
| MEDIUM | 13 |
| LOW | 2 |

**Verdict: BLOCK**

**TDD spec / impl plan alignment:** N/A — there is no separate TDD spec. The plan carries its test strategy inline (§4.4's RED/GREEN discipline plus a Tests column on every one of the 36 packages), and that structure is sound and executable **except** for the six hedged Tests columns in QUAL-14 and the cross-package pin-ownership gap in the same finding. `demo-ui-inventory.md` §6 is the de-facto test spec and is concrete (`file:line` per pin, with must-move / must-NOT-move called out); the plan's §4.4 correctly identifies the three traps and the "relational pin survives" rule. This is materially stronger than most plans this lane sees.

**Note on the verdict.** BLOCK rests on QUAL-1 alone, and QUAL-1 is one package of 36. Everything in U0–U6 and U8 is buildable once the seven HIGHs are closed, and five of those seven (QUAL-2, QUAL-3, QUAL-4, QUAL-6, QUAL-8) are edits to **five cells and two paragraphs** — the token-naming table in U0.1, `link` in U0.1's ADD list, `withAlpha`'s return form in U0.2, §2's scope carve-out, and U4.1's component signature. If the orchestrator wants to start U0 before the rest is resolved, QUAL-2, QUAL-3, QUAL-4, QUAL-11, QUAL-12, QUAL-13 and QUAL-17 are the U0-blocking subset; QUAL-1 blocks only U7.2.
