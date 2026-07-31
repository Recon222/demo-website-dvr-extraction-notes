# Lane: type-design — phase review `p5` (PR #34) — INITIAL PASS

**Mode:** INITIAL — first pass over the full PR.
**Diff under review:** `git diff master..feat/parity-p5` (74 files, +8081 −887), worktree `scratchpad/worktrees/parity-p5` @ `c01618f`.
**Refs read before flagging:** `.claude/agents/type-design-analyzer.md` · PR #34 body (deliberate-choices list) · `docs/code-reviews/deferred.md` §§4, 5, 16, 27, 70–74 · `features/demo/CLAUDE.md` · the snapshot-guard header + `EXTRA_VIEWS`/`MODAL_IDS` devices in `engine/store/persistence.ts`.
**Pre-flight:** `npx tsc --noEmit` → **clean, exit 0**.
**Probes:** six compile probes — two mutation probes on `content/screens.ts` and `logic/export/selection.ts` (backed up, restored, `git status` verified after each), four in throwaway modules. All probe files removed; both mutated files restored byte-identical.

**Verdict: REVISE — 0 blocker · 1 major · 4 minor · 3 nits.**

The export lattice is, on the whole, the best-typed thing this repo has shipped: `ExportRequest` (nullable ids) → precondition guard → `ExportRun` (resolved ids) is a genuine parse-don't-validate staircase, the three outcome unions put payload only on the arms that own it, and six `assertNever` closures do real work. The one major is the seam where that discipline stops: the tab's CTA — the single place the whole engine exists to keep from re-deciding — consumes the plan's `dispatch` union with a trailing `else`, so widening that union compiles clean and silently routes the new pipeline into a subset ZIP (probe-verified). The four minors are all the same species: a type that *almost* states its invariant with the last step left to a comment or a test — the arming trio decomposed across two layers, a union member with no constructor keeping a now-false string alive, a declared stage guard rail that constrains nothing, and the prompt-visibility pair modelled flat in two places.

**Not flagged, deliberately:** everything in the PR body's DO-NOT-RE-FLAG list; the ephemeral-state verdict (§70a — verified: nothing selection- or flow-shaped is in `PersistedState`, `SNAPSHOT_VERSION` still 6, and both accept-list widenings are backward-compatible); the structural `ExportSelectableCase`/`ValidatableCase`/`ValidatableLocation` contracts (house style — `buildRetentionView`'s `ReadonlyArray<{ startDateTime: string }>` precedent, not parallel entity drift); the phone-verbatim mutable output arrays (`RetentionView.scopes` sets that precedent); empty-`Set`/empty-`locationIds` representability (a `NonEmpty<T>` is on the lane's own false-positive list and every constructor already refuses it). Detail in *Checked and clean*.

---

## Shared-worktree note

`git status` in this worktree showed `features/demo/ui/DemoExperience.tsx` modified throughout this
pass — the §70i/§74b entry guard (`if (exportFlowRef.current.showValidationModal) return`,
`:2041`) deleted. **This lane did not make that edit** and deliberately did not revert it: it is the
signature of a concurrent lane running a mutation probe, and clobbering another agent's in-flight
probe is worse than a dirty tree. It affects no finding here — the baseline `tsc --noEmit` was clean
with and without it, and every probe reported errors only in the file it targeted. **Flagging it for
the orchestrator anyway: if that deletion is still present at merge time, a documented strengthening
disappears silently.**

---

## TYPE-DESIGN-1 — **MAJOR** — the Export CTA consumes `ExportSelectionPlan.dispatch` with a trailing `else`, so a new pipeline silently becomes a subset ZIP

**Type:** `ExportSelectionPlan.dispatch: 'case' | 'location' | 'case-subset'` — `features/demo/engine/logic/export/selection.ts:211`
**Consumer:** `onExportPress` — `features/demo/ui/DemoExperience.tsx:661-671`

```ts
// selection.ts:208-220
export interface ExportSelectionPlan {
  kind: ExportArtifactKind
  /** The pipeline the CTA dispatches (phone `export.tsx:158-165`). */
  dispatch: 'case' | 'location' | 'case-subset'
  …
}

// DemoExperience.tsx:661-671
const { dispatch } = exportFooter.plan
if (dispatch === 'case') {
  requestExportFlow({ type: 'case', caseId: exportView.caseId })
} else if (dispatch === 'location') {
  requestExportFlow({ type: 'location', locationId: Array.from(exportView.locationIds)[0] ?? null })
} else {
  requestExportFlow({ type: 'case-subset', caseId: exportView.caseId, locationIds: Array.from(exportView.locationIds) })
}
```

**Invariant violated / permitted invalid state:** every other consumer of every other new union in
this PR closes with `assertNever` (`resolveExportPlan`, `requestExport`, `requestExportFlow`,
`continueExportFlow`, `selectExportScope`, `artifactOf`). This one — the single site the export
engine's stated invariant is *about* ("the CTA must NOT re-derive the branch", §73f; "the route
cannot dispatch a subset ZIP under a footer promising the canonical case artifact",
`selection.ts:205-207`) — closes with a catch-all `else` that means "case-subset".

**Construction site (probe-verified):** widen the union by one member and compile.

```
# probe: dispatch: 'case' | 'location' | 'case-subset' | 'case-map'
$ npx tsc --noEmit
(no output — zero errors)
```

Nothing anywhere objects. `resolveExportPlan`'s own `assertNever(kind)` does not fire, because
`kind` and `dispatch` are separate fields: a new dispatch value that reuses an existing `kind` — the
realistic shape, e.g. a whole-case **GeoJSON** button on the hub footer, which deferred §71g already
names as this tab's next job ("P5.2's Export tab — when a real selection/validation surface lands …
reuse this predicate") — never touches `EXPORT_ARTIFACT_KINDS` at all. (For contrast, widening
`EXPORT_ARTIFACT_KINDS` *does* error, but only at `ExportHub.tsx:201`'s `ARTIFACT_COLOR` index — a
colour lookup, not the dispatch.)

**Downstream consequence:** the footer renders the new pipeline's `artifactLine` and `ctaLabel`
(both come from the same plan and would be correct), and the press runs `case-subset` — a partial
ZIP, with `describeExportTerminal`'s subset wording ("a ZIP of the N selected locations"), under a
footer that promised something else. That is precisely the footer/dispatch disagreement the
one-decision plan exists to make impossible, re-introduced at the last hop.

**Fix:** a `switch` with the `FallbackMode` closure the repo already standardised on —

```ts
switch (dispatch) {
  case 'case': …; return
  case 'location': …; return
  case 'case-subset': …; return
  default: return assertNever(dispatch)
}
```

and, while there, type the field as `Extract<ExportType, 'case' | 'location' | 'case-subset'>`
rather than a hand-typed triple — which is the discipline `flow.ts:65` already applies to the
*pair* (`ValidatedExportType`) with the rationale spelled out in its own doc comment ("so a rename
breaks the build instead of silently orphaning a route"). `selection.ts` does not import `flow.ts`
and `flow.ts` does not import `selection.ts`, so there is no cycle.

**Sibling sites of the same species** (same fix, lower stakes — fold into the same commit):

- `OptionIcon` — `features/demo/ui/screens/ExportActionSheet.tsx:59-79`. `switch (icon)` over
  `ExportSheetIcon` with no `default`. `tsconfig.json` sets no `noImplicitReturns` (probe-confirmed:
  a 4-member union with 3 arms compiles clean), so a new icon renders **nothing**, silently.
- `ariaChecked` — `features/demo/ui/screens/export/ExportCaseCard.tsx:84-86`. Ternary chain over
  `CaseCheckboxState`; a fourth state reports `aria-checked={false}` — a tri-state control lying to
  a screen reader rather than failing to build.

---

## TYPE-DESIGN-2 — **MINOR** — the validation arm is decomposed into two state fields plus a shell `useRef`, and reassembled by hand; `ValidatedExportRun` is already the type that pairs them

**Types:** `ExportFlowState.pendingValidatedExport: ValidatedExportType | null` +
`ExportFlowState.pendingSubsetLocationIds: readonly string[] | null` —
`features/demo/engine/logic/export/flow.ts:162,164`
**Third arm, other layer:** `pendingExportCaseId: useRef<string | null>` —
`features/demo/ui/DemoExperience.tsx:764`

**Invariant violated / permitted invalid state:** the three arms are one fact — *which resolved run
Continue resumes* — and the type expresses none of the couplings:

| representable state | who forbids it today |
|---|---|
| `{ pendingValidatedExport: 'case', pendingSubsetLocationIds: ['l1'] }` | a hand-written ternary, `flow.ts:292` |
| `{ pendingValidatedExport: 'case-subset', pendingSubsetLocationIds: null }` | the LOUD backstop, `flow.ts:360-368` |
| `{ pendingValidatedExport: null, pendingSubsetLocationIds: ['l1'] }` | nothing — inert, but a stale payload survives |
| armed engine state with `pendingExportCaseId.current === null` | two assignments in a different file, `DemoExperience.tsx:2022,2073` |

`applyValidation` *receives* a `ValidatedExportRun` (`flow.ts:276`), immediately destructures it into
two fields (`:291-292`), and `continueValidatedExport` then **reassembles the same union**
(`:370-374`) — while the third component of it (`caseId`) had to be parked in a `useRef` in the
bridge because the engine refuses to hold it.

**Construction site / evidence this is not theoretical:** deferred §74l records that the first draft
of the shell re-derived the case at Continue time from the *open location*, so a prompt raised on
case A would have resumed against case B — "the scope escalation the arming rules exist to prevent".
It was caught and pinned. That near-miss exists because the arm the machine holds is *incomplete* by
type, which makes remembering the rest the caller's job.

**Downstream consequence today:** none reachable — every path is covered by transitions and one
test. This is a defence-in-depth gap, filed at the repo's own bar (`RetentionView`'s "the union
makes 'no total ⇒ no scopes' unrepresentable otherwise").

**Fix:** store the arm as the union that already pairs the three components —

```ts
/** Which resolved run Continue resumes. `null` is the neutral resting value (PR-89 HIGH). */
pendingValidatedRun: ValidatedExportRun | null
```

That deletes `pendingSubsetLocationIds`, deletes `applyValidation`'s ternary, deletes
`continueValidatedExport`'s reassembly and its `subsetLocationIds ?? []` fallback, deletes the
`missingSubsetPayload` arm *as an unrepresentable state* (keep the alert — `requestExport:228` still
raises it at the boundary, which is where an empty selection actually arrives), and deletes the
bridge's `pendingExportCaseId` ref together with both of its assignments. `continueValidatedExport`
then needs no `caseId` argument, and the PR-87 HIGH-1 rule is *strengthened*, not weakened: the ids
still travel on the run, they are simply parked in the machine that arms them rather than in a ref
beside it. §70h's `caseUnavailable` arm (`caseId === null`, already unreachable on both platforms)
moves to where the condition is real — `pdfPassFor` returning `null` for a vanished case already
raises exactly that alert at `DemoExperience.tsx:1978-1981`.

**Blast radius:** engine-internal + the bridge's three handlers + `flow.test.ts`'s arming
assertions. Sizeable enough that "defer with a trigger" is a legitimate answer — but it should be a
recorded decision, not silence.

---

## TYPE-DESIGN-3 — **MINOR** — `'case-map'` is a union member with no constructor; §74f's trigger fired at merge and was not discharged, and the type keeps a now-false string alive

**Types:** `EXPORT_TYPES` / `ExportRequest` / `ExportRun` `case-map` arms —
`features/demo/engine/logic/export/flow.ts:56,77,88`
**Kept alive by:** `describeExportTerminal`'s exhaustive `case-map` branch —
`features/demo/ui/screens/exportNotices.ts:68-73`

**The state:** after P5.4 merged into this same PR, **nothing in production constructs a `case-map`
request**. Verified by grep across `features/demo` excluding tests:

```
features/demo/ui/DemoExperience.tsx:1967   run.type === 'case-map'      (a consumer)
features/demo/ui/screens/exportNotices.ts:53,68                          (consumers)
features/demo/engine/logic/export/flow.ts:56,77,88,249,251               (the declaration + its own arm)
```

The real Export Map button (`exportCaseMap`, `DemoExperience.tsx:1260-1308`) bypasses
`requestExportFlow` entirely — it builds, saves and notices on its own path. The only constructors of
`{ type: 'case-map' }` are `flow.test.ts:83,131` and `exportNotices.test.ts:20`.

**Downstream consequence:** exhaustiveness (`assertNever(run)` in `artifactOf`) *requires* the
branch, so the dead variant keeps dead copy compiling — and that copy is now false:

> `exportNotices.ts:72` — "That one IS reproducible here and is being built; it just is not wired to
> this button yet. **Nothing was generated.**"

pinned by a test that names its own staleness: `exportNotices.test.ts:84` — *"the case-map interim
says the map was NOT generated (P5.4 replaces it)"*. P5.4 **is** this PR. §74f set the trigger
explicitly — *"Trigger: P5.4's merge replaces that arm"* — and the merge commit (`89f3310`) did not.
Secondary drift from the same gap: `EXPORT_ALERTS.noCaseSelectedForMap` (`flow.ts:117-120`,
unreachable) and `NO_CASE_SELECTED_NOTICE` (`DemoExperience.tsx:307`, live) are two hand-maintained
copies of one phone string (`useExportFlow.ts:918-924`) — the engine's alert taxonomy is supposed to
be the single home for exactly that.

**Fix — pick one, don't leave it as-is:**

1. **Route the real export through the flow** — `exportCaseMap` calls
   `requestExportFlow({ type: 'case-map', caseId: mapViewerCaseId })`, which also gets it the entry
   guard it currently lacks (today it can start while an export is running or a validation prompt is
   open), collapses the duplicated alert string, and lets `describeExportTerminal`'s `case-map` arm
   say the truth (a *success* notice, the one artifact D4 says a browser can really produce). This is
   what §74f pointed at. Note the flow shell would need a success terminal for that arm —
   `describeExportTerminal` currently only knows how to say "no file".
2. **Or delete the variant** from `EXPORT_TYPES`/`ExportRequest`/`ExportRun`, with
   `EXPORT_ALERTS.noCaseSelectedForMap`, `requestExport`'s arm, `startExportRun`'s `|| 'case-map'`
   condition, `artifactOf`'s arm and `describeExportTerminal`'s branch — and re-add it with the
   caller when one exists (the `media`/`import-log` orphan-barrel rule this module already cites for
   itself, `logic/export/index.ts:17-20`).

Either way the false sentence and its test must go in the same commit.

---

## TYPE-DESIGN-4 — **MINOR** — `DEMO_EXPORT_STAGES` constrains nothing; `'sharing'` is excluded by discipline, and `DemoExportStage` has zero uses

**Types:** `DEMO_EXPORT_STAGES` / `DemoExportStage` — `features/demo/engine/logic/export/stage.ts:40-41`
**The signature that could enforce it:** `advanceStage(state, stage: ExportStage)` — `flow.ts:400`

**Invariant permitted:** §70l's stated purpose for the subset is *"so P5.3 has something to assert
against rather than a comment"*. As shipped it is asserted against **nothing**: `DemoExportStage` (the
type) has zero references outside its own declaration and the barrel; `DEMO_EXPORT_STAGES` (the value)
appears only in `stage.test.ts:56-60`, where it is checked against *itself* (`⊂ EXPORT_STAGES`, not
`'sharing'`, not `'idle'`). No test asserts the running pipeline stays inside it, and the one place
P5.3 mentions it is a **comment** — `DemoExperience.tsx:1931`: *"`sharing` is deliberately never
entered: `DEMO_EXPORT_STAGES` excludes it"* — which is exactly the comment §70l was written to
replace.

**Construction site (probe-verified):**

```ts
export const p4: ExportFlowState = advanceStage(IDLE_EXPORT_FLOW, 'sharing')   // compiles clean
```

**Downstream consequence:** `STAGE_MESSAGES.sharing` is a total-record entry, so the overlay would
happily print *"Opening share dialog…"* over a browser tab that has no share sheet — the fake-success
the honesty rule exists to stop, one `advanceStage` argument away, with the compiler silent.

**Fix (one word, zero blast radius):** `advanceStage(state: ExportFlowState, stage: DemoExportStage)`.
All three production call sites already pass `'validating'` / `'generating'` / `'zipping'`; all four
test call sites pass `'generating'` / `'zipping'`. `'idle'` is reached through `resetExportFlow`, never
`advanceStage`, so nothing regresses — and `'sharing'` becomes unreachable **by type**, which is what
§70l claims it already is.

---

## TYPE-DESIGN-5 — **MINOR** — the prompt-visibility pair is modelled flat in both layers; `mode: 'validation'` with no result renders an invisible modal

**Sites of one invariant** (*the prompt is up ⇔ a failing result exists*):

1. `ExportFlowState` — `flow.ts:154-156`: `validationResult: CasePdfValidationResult | null` beside
   `showValidationModal: boolean`.
2. `ExportModalProps` — `features/demo/ui/screens/ExportModal.tsx:38-44`: `mode: ExportModalMode`
   beside `validationResult?: CasePdfValidationResult | null`.

**Permitted invalid state:** `{ mode: 'validation', validationResult: null }` type-checks, and the
component's own comment admits the cope (`ExportModal.tsx:339-341`): *"this guard only covers a
caller that hand-set the mode"*. The render result is a mounted `PhoneOverlayPortal` containing
`false` — **no scrim, no dialog, no error**: an export prompt that is logically open and visually
absent. Same shape one layer down: `{ showValidationModal: true, validationResult: null }` is
representable in `ExportFlowState` and merely falls through `resolveExportModalMode`'s precedence.

**Downstream consequence:** none reachable — the single caller derives `mode` and passes
`validationResult` from the same `exportFlow` object one line apart (`DemoExperience.tsx:2120-2124`),
and `resolveExportModalMode` is the one home of the precedence. Defence-in-depth gap, filed against
`RetentionView`.

**Fix (props layer first — it is cheap and the invariant is local):**

```ts
export type ExportModalProps =
  | { mode: 'hidden' }
  | { mode: 'progress'; stage?: ExportStage; progress?: ProgressInfo; currentLocationName?: string | null
      onContinueAnyway(): void; onCancel(): void }
  | { mode: 'validation'; validationResult: CasePdfValidationResult; isExporting?: boolean
      onContinueAnyway(): void; onCancel(): void }
```

which deletes the `validationResult &&` cope and makes the invisible-modal state unconstructible.
The `ExportFlowState` half is the phone's ported shape and is legitimately harder to move — if it
stays flat, say so in the ledger rather than leaving it to the comment.

---

## TYPE-DESIGN-6 — *nit* — `TAB_NARRATION` is keyed by all of `AppView` and is `Partial`; both halves are test-enforced where the exact total type exists one file away

**Type:** `TAB_NARRATION: Partial<Record<AppView, ChapterNarration>>` —
`features/demo/engine/content/narration.ts:356`

**Permitted (both probe-verified, both compile clean):**

```ts
export const p6a: typeof TAB_NARRATION = { map: d, export: d, submission: d }  // a CHAPTER key
export const p6b: typeof TAB_NARRATION = { map: d }                            // a tab with no copy
```

`p6a` is the shadowing the module's own comment warns about — the bridge reads `TAB_NARRATION[view]`
**before** `NARRATION[currentChapter]` (`DemoExperience.tsx:597-601`), so a chapter key silently
overrides that chapter's own rail copy. `p6b` is the totality half: a fifth tab-only destination
would fall through the `??` chain to `NARRATION[currentChapter]` and narrate *a different screen*
with no signal.

**Both are pinned by a good test** (`content.test.ts:35-50` — exact key-set equality against
`TAB_VIEWS \ CHAPTERS`, plus a launchable-exclusion loop), which is why this is a nit and not a
minor: deferred §27 records this team's accepted test-over-type precedent for static single-author
registries, and the lane's brief says not to relitigate it.

**Recorded anyway because this diff creates the registry** and its two siblings in the same package
chose the total-Record form (`TAB_LABELS: Record<TabView, string>`, `TAB_ICONS: Record<TabView, …>`)
— and the *exact* type that closes both halves is already in use one file away, in the same diff:

```ts
// persistence.ts:329 — "exhaustive by construction (device 3 / R-4c)"
const EXTRA_VIEWS: Record<Exclude<AppView, ChapterId | LaunchableId>, true> = { map: true, export: true }

// the same key space, for narration:
export const TAB_NARRATION: Record<Exclude<AppView, ChapterId | LaunchableId>, ChapterNarration> = { … }
```

One annotation makes the test redundant and closes deferred §4's stated direction for this registry.

**On the §73 claim ("a 5th tab is compile-forced") — verified, and it is true as §73j words it.**
Probe (`TAB_VIEWS` + `'reports'`) errors in exactly three places:
`screens.ts:52` (`TAB_LABELS`), `TabBar.tsx:32` (`TAB_ICONS`), `persistence.ts:329` (`EXTRA_VIEWS`).
Not forced: rail copy (this nit) and an `activeScreen()` arm (deliberate — the documented
`placeholder` fallthrough).

---

## TYPE-DESIGN-7 — *nit* — `GeoJSONFeature.properties: Record<string, unknown>` leaves `featureType` an untyped id space with three writers and one reader

**Type:** `GeoJSONFeature` — `features/demo/engine/logic/case-map/types.ts:17-21`
**Writers:** `geojson.ts:69` (`'incident'`), `:110` (`'location'`), `:183` (`'camera'`)
**Reader:** `hasPlottableFeatures` — `geojson.ts:240` (`f.properties.featureType !== 'camera'`)

The open bag is honest for the *rest* of the properties — the consumer is the exported page's own JS,
which reads dozens of ad-hoc `p.<name>` keys, and the shape is the phone's verbatim. But
`featureType` is the one property TypeScript both writes and reads, it has a closed three-value
space, and it is currently a `string` key holding `unknown`: a typo in a writer, or a rename on one
side of the pair, is invisible to the compiler and surfaces as `hasPlottableFeatures` returning the
wrong answer — which the bridge turns into the wrong success banner (`hasSites`,
`DemoExperience.tsx:1302`). Low reach (four sites, one file, unit-tested), hence a nit.

**Fix (optional, additive, keeps the bag open):**

```ts
export const FEATURE_TYPES = ['incident', 'location', 'camera'] as const
export type FeatureType = (typeof FEATURE_TYPES)[number]
export interface GeoJSONFeature {
  type: 'Feature'
  geometry: GeoJSONPoint
  properties: { featureType: FeatureType } & Record<string, unknown>
}
```

---

## TYPE-DESIGN-8 — *nit* — a dead `showTabs` local is a stale second copy of the tab-visibility rule, and it omits `'export'`

**Site:** `features/demo/ui/DemoExperience.tsx:2126`

```ts
const showTabs = view === 'dashboard' || view === 'cases' || view === 'map'   // ← no references
const tabView = isTabView(view) ? view : null                                 // ← the live rule
```

`showTabs` has zero readers (grep: one hit, its own declaration) and `tsconfig.json` sets no
`noUnusedLocals`, so it compiles. It is the *exact* "widening `||` chain" the `TAB_VIEWS` registry
comment says the bridge no longer uses (`screens.ts:36-38`) — left behind by the P5.2 conversion,
already wrong (missing `'export'`), and one careless re-use away from hiding the tab bar on the new
tab. Delete it.

---

## Checked and clean — verified, deliberately not flagged

- **The request → run staircase.** `ExportRequest` (ids `| null`) → precondition guard →
  `ExportRun` (ids resolved) is a real parse-don't-validate lattice, and the "ids travel on the
  request, come back on the run, never re-read from state" rule (PR-87 HIGH-1) is *structural* here
  rather than documentary. `ValidatedExportType = Extract<ExportType, 'case' | 'case-subset'>` and
  `ValidatedExportRun = Extract<ExportRun, { type: ValidatedExportType }>` both distribute correctly
  (naked `T`, no `Awaited`/`ReturnType` collapse); a rename in `EXPORT_TYPES` does break the build,
  via the consumers rather than the alias, which is what the doc comment claims.
- **The three outcome unions.** `RequestOutcome` / `ValidationOutcome` / `ContinueOutcome` are tagged
  on `kind` with payload only on the arms that own it (`ImportRunResult` house pattern), and every
  consumer closes with `assertNever` — `requestExport` (`flow.ts:254`), `requestExportFlow`
  (`:2058`), `continueExportFlow` (`:2086`), `selectExportScope` (`:2113`), `resolveExportPlan`
  (`selection.ts:267`), `artifactOf` (`exportNotices.ts:56`). Six real closures; only the sites in
  TYPE-DESIGN-1 are missing theirs.
- **`SaveFileOutcome`** (`ui/inputs/download-file.ts:68-70`) — `{ ok: true; filename } | { ok: false;
  reason: 'unavailable' | 'failed' }` distinguishes "this environment cannot" from "it can and
  didn't", which is the §8 distinct-absence precedent applied correctly. `DownloadIo | null` read at
  call time, not module scope.
- **`ARTIFACT_COLOR`** (`ExportHub.tsx:98-102`) — untyped `as const` but *index*-forced: widening
  `EXPORT_ARTIFACT_KINDS` errors there (probe-verified TS7053). Registry↔type linkage holds without
  an annotation.
- **`STAGE_MESSAGES`** as `Readonly<Record<ExportStage, string>>`, `TAB_LABELS`/`TAB_ICONS` as total
  records, `EXPORT_ALERTS` deep-`Object.freeze`d, `IDLE_EXPORT_FLOW` frozen, `EXPLORE_ITEMS`
  `readonly` — the module-level `readonly` discipline is intact.
- **`isChapterId` flipped to a positive registry check** (`create-store.ts:396`). This is a real
  type-design fix, not just a bug fix: a negative membership test standing in for a registry lookup
  is precisely the shape that rots, and it now matches `persistence.ts:336`'s guard. §73i.
- **The persisted-shape claim ("no change, `SNAPSHOT_VERSION` stays 6") — verified.** Both edits are
  compile-forced accept-list widenings (`EXTRA_VIEWS` gains `export`, `MODAL_IDS` gains
  `exportScope`), both are backward-compatible on read (an old snapshot cannot contain the new
  values), `modal` is not in `snapshotOf`, and nothing selection- or flow-shaped reaches the store —
  pinned by `barrel.test.ts:64-71`. No bump warranted.
- **Reference-stability of the selection** — `pruneSelection`/`toggleCaseSelection` returning
  `current` unchanged is a *convention*, documented at `selection.ts:137-140` and pinned by
  `selection.test.ts` (`toBe` identity assertions). TypeScript cannot express reference identity;
  documented-plus-tested is the correct answer and the lane does not recommend machinery the repo
  does not use.
- **`ReadonlySet<string>` all the way down** — `ExportSelection.locationIds`,
  `ExportCaseCardProps.selectedIds`, and a shared module-level `EMPTY_IDS: ReadonlySet<string>`
  (`ExportHub.tsx:95`). No consumer can mutate the selection; the `Array.from` (not spread) note at
  `selection.ts:150-151` is correct for `target: es5` without `downlevelIteration`.
- **`ExportSelectableCase` / `ValidatableCase` / `ValidatableLocation`** are minimal structural
  contracts, not re-declarations of `DemoCase`/`DemoLocation`; `DemoCase`/`DemoLocation` satisfy
  them at the call sites, so a field rename fails there. House style
  (`buildRetentionView(ReadonlyArray<{ startDateTime: string }>)`), not parallel-type drift.
- **`armedFullCase: boolean`, not `?: true`** — correct. `false` is a *meaningful* state here
  (per-location intent, which changes the dispatch at N=1), so the `Feature.draft?: true` precedent
  does not apply.
- **`CasePdfValidationResult` stores `allValid`/`validCount`/`invalidCount` alongside the two
  arrays** — derived-vs-stored judged as *stored*: it is a captured verdict handed across a modal
  round-trip and asserted against verbatim phone counts, the `TimeOffsetData` side of that line, not
  the `ScopeRetention` side.
- **Empty `locationIds` on `ExportSelection`/`ExportRun`** is representable, and every constructor
  refuses it (`toggleLocationSelection:97`, `pruneSelection:153`, `requestExport:228`,
  `continueValidatedExport:360`). A `NonEmpty<T>` is on the lane's false-positive list; not filed.
- **`isolatedModules`** — every type-only export in `logic/export/index.ts` and every type import in
  the new UI files uses `export type` / `import type`. Clean.
- **Props honesty** — no new component takes a store, a setter or a `Record<string, unknown>` bag;
  `ExportHubProps`, `ExportCaseCardProps`, `ExportModalProps`, `ExportActionSheetProps` are all
  data-in/callbacks-out, and their callbacks are typed to the domain unions
  (`ExportSheetOptionId`, `CaseCheckboxState`), never bare `string`.

---

## Type Design Summary

| Severity | Count |
|---|---|
| CRITICAL / blocker | 0 |
| HIGH / major | 1 |
| MEDIUM / minor | 4 |
| LOW / nit | 3 |

Canonical homes preserved (no parallel entity declarations): **yes**
Discriminated unions well-formed: **yes** (payload on the owning arm throughout)
Exhaustiveness enforced (never-checked switches): **partial** — six closed, three open (TYPE-DESIGN-1)
Correlated state modelled as a union: **flat shapes found** — TYPE-DESIGN-2, TYPE-DESIGN-5
Id spaces typed (no bare-string registries/keys): **yes**, one nit (`featureType`, TYPE-DESIGN-7)
`readonly` discipline on shared data: **yes**
Boundary types honest about untrusted input: **n/a** — this phase adds no untrusted-input boundary
(the only new IO seam, `DownloadIo`, is capability-detected and returns a tagged outcome)

**Verdict: REVISE** (one major).

Fix order, if the orchestrator wants one: TYPE-DESIGN-1 (3-line switch + `Extract`), TYPE-DESIGN-4
(one word), TYPE-DESIGN-8 (delete a line), TYPE-DESIGN-3 (decide, then delete or wire — the stale
sentence must not ship), TYPE-DESIGN-5 (props union), TYPE-DESIGN-2 (largest; a recorded deferral is
an acceptable answer), TYPE-DESIGN-6/7 (nits, optional).
