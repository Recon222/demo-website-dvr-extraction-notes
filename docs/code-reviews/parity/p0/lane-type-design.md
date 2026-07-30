# Lane review — type design (parity P0, PR #29) — FIX-DELTA **ROUND 2**

- **Lane:** `type-design` (`.claude/agents/type-design-analyzer.md`)
- **Mode:** FIX-DELTA round 2 — re-review of the **round-2 fix commits only**, i.e. everything after
  the fix-delta review merge `f69aa92` (`docs(review): P0 fix-delta`).
- **Fix range:** `git diff f69aa92..feat/parity-p0` — 23 files, +438 / −56. Branches
  `parity/p0-fix2-options` (`e182186` → merge `5ce0202`), `parity/p0-fix2-boundary`
  (`480321a`, `b86cd46`, `e8621bd`, `4abad16`, `207963f`, `8a4dd55` → merge `db16e5a`),
  `parity/p0-fix2-store` (`c41c5ae`, `6566531`, `ac4cb5e`, `7ef5608`, `c4cf8b4` → merge `51a3da7`).
- **Refs read:** prior vetted review `docs/code-reviews/parity/p0/p0-review-fixdelta.md`
  (R-19 … R-30; R-1…R-18 CLOSED, not re-litigated); my own round-1 fix-delta lane file
  (TYPE-DESIGN-A…E, overwritten by this file); `.claude/agents/type-design-analyzer.md`;
  `features/demo/CLAUDE.md`; root `CLAUDE.md`; `docs/code-reviews/deferred.md` (§4, §5, §15, §16,
  §27, §29–§32, incl. the new §29 addendum); `docs/planning/demo-phone-parity/01-master-parity-plan.md`.
- **Full files read behind the hunks:** `engine/store/create-store.ts`, `engine/store/persistence.ts`,
  `engine/store/selectors.ts`, `engine/types/index.ts`, `engine/content/form-options.ts`,
  `engine/index.ts`, `features/demo/index.ts`, `ui/DemoExperience.tsx`, `ui/clear-demo-snapshot.ts`,
  `ui/screens/CompletionScreen.tsx`, `app/demo/error.tsx`, plus every changed test file.
- **Gates run for this pass:** `npx tsc --noEmit` → clean (exit 0);
  `npx vitest run features/demo/engine features/demo/ui/__tests__ app/demo` → **43 files / 436 tests
  green**.
- **Type probes re-run on this head** (scratchpad, outside the repo, against the repo's own
  zod 3.25.76 + `strict: true` + `target: es5`). Results quoted inline; every claim below about what
  `FullShape` / `FullShapeIn` / `z.ZodType<T>` do and don't catch rests on them, not on reasoning.

**Severity mapping:** BLOCKER = lane-CRITICAL, MAJOR = lane-HIGH/upper-MEDIUM,
MINOR = lane-lower-MEDIUM/LOW.

**Counts (new findings this pass):** 0 BLOCKER · 0 MAJOR · 2 MINOR.
New findings continue the round-1 letter sequence (A–E) as **F** and **G** so references stay
unambiguous across rounds.

---

# Part 1 — Fix-delta on prior findings attributed to this lane

| Prior | Lane origin | Verdict | Fix commit | Evidence |
|---|---|---|---|---|
| R-19 (MAJOR) | TYPE-DESIGN-A (+ typescript, silent-failures) | **FIXED** (1 MINOR residual → **TYPE-DESIGN-F**) | `b86cd46` | bridge + both store invariants + copy, 4 regression tests |
| R-20 (MINOR) | TYPE-DESIGN-E (+ typescript) | **FIXED** (by deletion) | `e182186` | zero references left in `features/`/`app/`/`lib/` |
| R-28 (MINOR) | TYPE-DESIGN-B (+ typescript) | **FIXED** (1 MINOR residual → **TYPE-DESIGN-G**) | `6566531` | `FullShapeIn` applied; omitted-key probe re-verified red |
| R-29 (MINOR) | TYPE-DESIGN-C | **FIXED** | `ac4cb5e` | both unions now derive from the canonical tuples |
| R-30 (MINOR) | TYPE-DESIGN-D | **FIXED** | `7ef5608` | widening direction + the as-const-tuple rule now in the header |

## R-19 → **FIXED** (all three converged items landed; one MINOR residual)

Verified item by item against the current worktree:

1. **Bridge keys on the open location.** `DemoExperience.tsx:735` is now `canComplete={!!currentLocation}`
   and `:741-746` derives the case from the location:
   `const loc = st.locations.find(l => l.id === st.currentLocationId); if (loc) st.completeCase(loc.caseId)`.
   The wrong-case-green arm and the dead-tap arm are both gone: the action's own cross-case guard
   (`create-store.ts:229`) can no longer fail, because the caller now passes the owning case by
   construction.
2. **Pair invariant restored at the source.** `createCase` clears the location half
   (`create-store.ts:219`, comment `:216-218`); `addLocation` writes both halves (`:257-260`);
   `switchLocation` already did (`:268`); `reset` nulls both (`:156`). I re-grepped every write to
   `currentCaseId` / `currentLocationId` in `features/` + `app/` — those four actions and
   `loadSnapshot` are the complete set, so the commit's claim ("no store **action** leaves the pair
   pointing across cases") holds exactly as stated. `loadSnapshot` is the construction site the claim
   does not cover — **TYPE-DESIGN-F**.
3. **Disabled-hint copy is now truthful by construction.** `CompletionScreen.tsx:100`
   (`'Open a location first'`) matches the one remaining disabling condition, and the prop docstring
   was rewritten to say so (`:20-22`).
4. **Regression tests present and meaningful.** `sandbox.test.tsx` — the mandated rail-jump case
   (button **disabled**, neither case greens, nothing stamps) and a forced-incoherent-pair case
   (`store.setState`) asserting the owner greens / the sibling stays `'draft'` / the confirmation
   renders; `store.test.ts:251-269` pins both new invariant writes. All green here.

**The reshape I preferred (`completeCase(locationId)`) was deliberately not taken** — reason in the
commit body (an in-place swap keeps the same `string` parameter, so stale call sites compile with
changed meaning; the safe form is a rename), logged as a triggered follow-up in
`docs/code-reviews/deferred.md` §29 addendum with the trigger "the next time `completeCase` grows a
caller or the completion flow is reworked". I read the addendum; it records the shape faithfully.
**Not re-litigated.** One cheap guard rail the deferral implies is folded into TYPE-DESIGN-F's fix list.

## R-20 → **FIXED** (by deletion)

`optionValues` is gone from `engine/content/form-options.ts` and from the engine barrel
(`engine/index.ts:27-40`). Grep across `features/`, `app/`, `lib/`: three hits remain, all comments or
the gone-list in `barrel.test.ts:14` — zero code references. The mutable-`string[]` half of R-17 is
moot with the function. The barrel test now pins both `FORM_OPTIONS` and `optionValues` off the public
surface, so a re-introduction is a red test rather than a review catch. The decision rationale
(P1's `normalize-enums.ts` needs no values-only projection) is recorded in the commit body — I did not
re-derive the phone-side claim (out of this repo), but the conclusion "delete it" is the option this
lane asked for first.

## R-28 → **FIXED** (with one MINOR residual)

`persistence.ts:112-114` adds `FullShapeIn<T>` with the exact Input-agnostic signature the probe
validated, and `:319` applies it to the last unguarded literal. Probe re-run on this head against the
repo's zod:

```
CASE A  full shape (enum + refine()'d string + z.record + optional)   → compiles        ✅
CASE B  a future OPTIONAL key omitted    → TS1360 "Property 'opt' is missing …"          ✅ caught
CASE C  a REQUIRED key omitted           → TS1360 "Property 'n' is missing …"            ✅ caught
CASE D  wrong-typed schema for a key     → TS2322 "'ZodString' is not assignable …"      ✅ caught
```

So the R-28 claim ("an optional `PersistedState` addition is silent in all three guard spots") is
genuinely closed — the device-2 guarantee now holds for **all 18** shape literals in the file.
*Residual:* the top-level literal is still the only one carrying device 2 **without** device 1
(`z.ZodType<…>`), which leaves one narrower hole open — **TYPE-DESIGN-G**.

## R-29 → **FIXED**

`create-store.ts:42` — `incidentCoordinates?: { …; source: (typeof COORD_SOURCES)[number] }`, and
`:59` — `gps?: { …; source: Exclude<(typeof GPS_SOURCES)[number], 'gps'> }`, exactly the two
expressions asked for, with `COORD_SOURCES`/`GPS_SOURCES` imported as values (`:3`) alongside the
existing type-only import. The documented "recovery locations are geocode-only" narrowing (`:57-58`)
is now a compiler-checked fact rather than a re-typed union. Cross-checked against the canonical
tuples (`types/index.ts:182, 184`) and both construction sites (`DemoExperience.tsx:350` `'geocoded'`/
`'manual'` literals; `:359` and `:401` `'geocoded' as const`) — `tsc` clean, no runtime delta.

## R-30 → **FIXED**

`persistence.ts:91-101` now lists the widening direction with its mechanism (`z.ZodType` output is
covariant), its runtime consequence (the R-4 wipe path), the limit of device 3 ("only for tuple-backed
unions"), and — the load-bearing sentence I asked for — "NEW closed unions MUST be declared as
`as const` tuples in `engine/types` and consumed here via `z.enum(TUPLE)`, never re-typed by hand."
I re-verified the premise the doc rests on rather than taking it on trust:

```
CASE F  domain field widened to `number | null`, schema left `z.number()`
        → compiles with NO error against both device 1 and device 2                      ✅ still silent
```

Comment-only change; nothing else in the file moved.

## Round-2 fixes owned by other lanes — checked for type-surface regressions only

- **R-21** (`e8621bd`) — `reviewAgain: boolean` → `reviewAgainFor: string | null`
  (`DemoExperience.tsx:212`), compared against the open location's id (`:728`), set from
  `currentLocationId` (`:747`), reset retained in `openLocation` (`:325`). This is the *structural*
  option my round-1 note preferred, and it matches the repo's own `currentLocationId: string | null`
  id convention (no brand, per the lane brief). The one meaningless combination is unreachable:
  `onReviewAgain` only renders when `isComplete`, which requires a `currentLocation`, so
  `reviewAgainFor` can never be set to `null`-as-a-location. No finding.
- **R-24** (`480321a`) — new engine entry point `clearSnapshot(storage: StorageLike | null): void`
  (`persistence.ts:441`) and its UI wrapper `clearDemoSnapshot()` (`ui/clear-demo-snapshot.ts:14`),
  re-exported from the public barrel (`features/demo/index.ts:6`) and consumed via dynamic import
  in `app/demo/error.tsx:58`. Injected-storage signature matches every other entry point in the file;
  the wrapper guards the *property access* the way `sessionStorageOrNull` does. `features/demo/CLAUDE.md`
  was updated so the barrel description stays truthful. No type surface widened. No finding.
- **R-22 / R-23 / R-25 / R-26 / R-27** — test assertion, docs, `@theme` token mirrors, `catch (e)`
  binding, and the `selectAdjustedScopes` dev-warn. No type declarations added or changed;
  `AdjustedScopeRow` and the selector's return type are untouched (`selectors.ts:50-58, 66`).
  No findings.

---

# Part 2 — New findings (fix-introduced / round-2 blast radius)

## TYPE-DESIGN-F [MINOR] features/demo/engine/store/persistence.ts:409

**Claim.** R-19's fix chose "restore the pair invariant **at the source**" as its enforcement
mechanism, and that is now the only thing holding the `currentCaseId` ⇄ `currentLocationId`
correlation together — the type still permits an incoherent pair, and the store's *second*
construction site, `loadSnapshot`, does not maintain the invariant. Its selection-integrity pass
(the R-15 fix) validates the two ids **independently for existence** and never checks **ownership**,
so a rehydrated state can hold a location whose `caseId` differs from `currentCaseId` (or a live
location with `currentCaseId: null` — that one is *test-pinned* as intended behaviour). Everything
that still reads the case through `currentCaseId` then reports a different case than the open
location — including the court-PDF payload.

**Evidence.**

- `persistence.ts:409-411` — the whole repair:
  ```ts
  const currentCaseId = d.currentCaseId !== null && caseIds.has(d.currentCaseId) ? d.currentCaseId : null
  const currentLocationId =
    d.currentLocationId !== null && locationIds.has(d.currentLocationId) ? d.currentLocationId : null
  ```
  Two independent `Set.has` existence checks. There is no
  `locations.find(l => l.id === currentLocationId)?.caseId === currentCaseId` comparison anywhere in
  the function (`:404-431` read in full), and `createDemoStore` spreads `...initial` verbatim over
  `initialState()` (`create-store.ts:190-191`) — no repair there either.
- **The invariant is asserted, in the fix, as a property of actions only.** `create-store.ts:216-218`:
  *"No action leaves the pair pointing across cases."* True and verified (I re-grepped every write:
  `:156, 219, 260, 268` plus `loadSnapshot`). Rehydration is not an action, and the comment's reader
  has no reason to check it.
- **The test suite pins the weaker of the two states as correct.**
  `persistence.test.ts:302-313` — *"R-15: a dangling `currentCaseId` is dropped; a non-wizard view is
  left as-is"* — asserts `snap?.currentCaseId` is `null` **while `currentLocationId` still resolves**.
  So "live location + no case" is a supported rehydrate today.
- **Downstream consequence, document-facing.** `selectors.ts:212-213` takes the location from
  `selectCurrentLocation` and the case from `selectCurrentCase`, then mixes them into the Case Notes
  PDF payload: `occNumber: caseObj?.caseNumber` (`:220`) and `requesterUnit: caseObj?.unit` (`:224`)
  beside `address`/`requester*` derived from `loc` (`:221-227`). After either incoherent rehydrate the
  generated court document carries the **wrong occurrence number** (cross-case snapshot) or **none at
  all** (dropped-case snapshot) over the right location's data. Same split at
  `DemoExperience.tsx:713` (`CompletionSummary.occNumber`), `:593` (Submission header) and `:545`
  (time-offset doc).
- **The codebase already disagrees with itself about which id owns the case.** The store's own
  `generateNotes` derives it from the location — `create-store.ts:371`:
  `const caseObj = s.cases.find(c => c.id === loc.caseId)` — which is precisely the rule R-19
  established for `onComplete` (`DemoExperience.tsx:743-744`). `selectCaseNotesData` and the bridge's
  `currentCase` (`DemoExperience.tsx:271`) still use the other rule.
- **Why MINOR and not a re-open of R-19.** The five-tap in-app repro is genuinely dead: with
  `createCase` clearing the location half and `addLocation` writing both, no reachable UI sequence
  produces a crossing pair, and cases are never deleted. The remaining construction paths are a
  hand-edited / foreign `sessionStorage` snapshot (the same threat model the R-7 own-property fix and
  the R-15 repair exist for — shape-valid but semantically broken input **is** in scope for this load
  path) and any future action that writes one half. Nothing is lost and the visitor can repair it by
  opening any location row.

**Suggested fix** (smallest first — this is a defense-in-depth ask, not a re-architecture):

1. Extend the R-15 pass at `persistence.ts:409` to realign rather than only existence-check — two
   lines, and it closes the cross-case *and* the dropped-case variants together:
   ```ts
   const openLoc = d.currentLocationId !== null ? d.locations.find((l) => l.id === d.currentLocationId) : undefined
   const currentLocationId = openLoc?.id ?? null
   // the open location OWNS the case (R-19's rule, applied to the second construction site)
   const currentCaseId = openLoc ? openLoc.caseId
     : d.currentCaseId !== null && caseIds.has(d.currentCaseId) ? d.currentCaseId : null
   ```
   Update the `persistence.test.ts:302` expectation with it (that test currently pins the pre-fix
   answer for the dropped-case variant).
2. Read side, optional but it is the same R-19 rule: derive `currentCase` from
   `currentLocation.caseId` in the bridge (`DemoExperience.tsx:271`) and in `selectCaseNotesData`
   (`selectors.ts:213`), matching `generateNotes` (`create-store.ts:371`). Then no consumer can print
   one case's number over another case's location, whatever the selection ids say.
3. One line of guard rail for the deferred reshape (accepting §29's deferral, not reopening it): say
   the precondition in `completeCase`'s docstring (`create-store.ts:103-106`) — *"`caseId` MUST be the
   case that owns the current location; the case write is unconditional, the location write is guarded.
   See deferred §29 — the `completeLocation(locationId)` rename makes this unrepresentable."* The
   ledger has the trap; the file the next caller reads does not.

**Confidence.** High on every cited line (each re-read on this head) and on the absence of an
ownership check. High that the in-app repro is closed. Medium on materiality — the remaining
construction sites are a hand-edited snapshot or future code, which is why this is MINOR and not a
re-opened R-19.

---

## TYPE-DESIGN-G [MINOR] features/demo/engine/store/persistence.ts:309

**Claim.** R-28 gave the top-level `persistedStateSchema` device 2 (`satisfies FullShapeIn<…>`) but it
remains the **only** schema in the file without device 1 (the `z.ZodType<DomainType>` annotation).
Device 2 enforces *key exhaustiveness*; it does not enforce *required-ness* — `FullShapeIn`'s per-key
target is `z.ZodType<Required<T>[K] | undefined, …>`, so a **required** persisted field declared
`.optional()` satisfies it silently. The header at `:81-83` presents device 1 as the file's general
guarantee, so a maintainer reading it would believe the top level carries both.

**Evidence.**

- `persistence.ts:309-319` — `const persistedStateSchema = z.object({ … } satisfies FullShapeIn<PersistedState>)`.
  No annotation. Every other schema has both, e.g. `:116` (`const scopeEntrySchema: z.ZodType<ScopeEntry> = z.object({…} satisfies FullShape<ScopeEntry>)`)
  and `:279` / `:286`.
- Probe on this head, repo's zod (same run as the R-28 verification above):
  ```
  CASE E  a REQUIRED key given `.optional()`, device 2 only
          → NO error — FullShapeIn accepts it (its per-key target already admits undefined)   ❌ hole
  CASE G  device 1 in the Input-agnostic form:
          `const s: z.ZodType<P, z.ZodTypeDef, unknown> = z.object({…} satisfies FullShapeIn<P>)`
          → compiles ✅ (so the annotation IS available here despite the refine()'d fields)
  CASE H  same annotation + a REQUIRED key given `.optional()`
          → TS2322 "The types of '_type.n' are incompatible … 'number | undefined' is not
             assignable to type 'number'"                                                      ✅ caught
  ```
  So the fix is one annotation, and it is probe-verified to compile against exactly the shape this
  file has (enum + `z.string().refine(guard)` + `z.record` + nullable object schemas).
- **Why MINOR:** all nine current fields are still caught *indirectly*, one hop later, because
  `loadSnapshot` consumes each of them in a position that stops compiling if it goes
  `| undefined` — `const currentChapter: ChapterId = d.currentChapter` / `const view: AppView = d.view`
  (`:397-398`), `Object.keys(d.visited)` (`:400`), `d.cases.map` / `d.locations.map` (`:407-408`),
  `caseIds.has(d.currentCaseId)` (`:409`), and the `PersistedState`-typed return literal (`:420-430`)
  for `profile` and `capture`. The hole is therefore latent, not live: it opens for a *future* field
  whose only consumer is the pass-through return literal.

**Suggested fix.** One line at `:309`:
```ts
const persistedStateSchema: z.ZodType<PersistedState, z.ZodTypeDef, unknown> = z.object({
  …
} satisfies FullShapeIn<PersistedState>)
```
and, if it lands, drop the "the one shape whose fields REFINE from a wider input" hedge from
`FullShapeIn`'s docstring (`:108-111`) — with the `unknown` Input parameter, device 1 and device 2 now
compose on every shape in the file, which is exactly what the header claims.

**Confidence.** High on the gap and on the fix (both probe-verified, three cases). Deliberately MINOR:
no `PersistedState` field is unguarded today, and the repo's §27 "test-over-type" bar says not to
demand machinery for a hole with no reachable instance — this is one annotation restoring a
consistency the header already promises.

---

## Checked and deliberately NOT filed

- **`completeCase(caseId: string)` keeps its hidden correlated precondition.** Ruled deliberate by the
  orchestrator, rationale in `b86cd46`'s body, logged with a trigger in deferred §29 addendum (read —
  it records the shape and the reason accurately). Not re-flagged; only the one-line docstring guard
  rail is carried, inside TYPE-DESIGN-F's fix list.
- **`addLocation(caseId, …)` does not validate that the case exists, while `switchLocation` does**
  (`create-store.ts:235` vs `:265-267`). Post-R-19 a bogus `caseId` now also propagates into
  `currentCaseId` (`:260`), where before it only orphaned the location. No reachable construction
  site: both callers pass an id taken from a rendered case (`DemoExperience.tsx:357`, `:450`), and the
  effect is a null `currentCase`, not a crash. Fails gate #2 (no reachable invalid state) → dropped,
  recorded here because TYPE-DESIGN-F's fix (1) would close it as a side effect.
- **`reviewAgainFor: string | null` holds one location at a time** — putting L2 into review mode
  silently returns L1 to its confirmation. The type says exactly that, the behaviour is a UI escape
  hatch, and a `Set<string>` here would be ceremony (§27 bar). No finding.
- **`clearSnapshot` is not re-exported from `engine/index.ts`** while every other persistence export
  is (`:61-71`). Checked the convention before filing: **no** file in `features/demo/ui` or `app/`
  imports `@/features/demo/engine` — the whole UI layer deep-imports aliased module paths, and
  `ui/clear-demo-snapshot.ts:3` follows that convention exactly. The engine barrel's only consumer is
  `barrel.test.ts`, so the omission has no consumer to mislead. Not a finding.
- **`z.record(z.string(), z.literal(true))` for `visited`** — the schema's key space is bare `string`
  while the domain type is `Readonly<Partial<Record<AppView | ModalId, true>>>`. Deliberate and
  correct at a boundary (untrusted input may carry unknown keys); the narrowing happens in the
  `isVisitId` loop (`:400-402`), which is the honest boundary form the lane brief endorses. Unchanged
  this round anyway.
- **Deferred-ledger triggers re-checked individually.** §4 (`CHAPTERS`/`LAUNCHABLE` non-exhaustive over
  their unions) — `content/screens.ts` untouched in round 2, trigger still not fired; my round-1 note
  that §4 now carries wipe-severity stands for its next triage. §5 (`updateField(path: string)`,
  `NavState` correlation) unchanged. §15 correctly re-scoped by `c41c5ae` (the `selectors.ts` half
  struck with a resolution note, the `roundTo5Min`/`time.ts` half left open with its own trigger) —
  read and verified against the code. §16, §27 untouched.
- **Out of lane, passed to the aggregator as observations, not findings:** (a) the R-27 dev-warn now
  fires from `selectAdjustedScopes`, which the bridge calls **in the render body**
  (`DemoExperience.tsx:642`) and again per PDF preview via `selectCaseNotesData` — in dev a
  non-canonical scope warns once per render, a louder version of the per-keystroke loop R-26 called
  out (silent-failures' call, not mine); (b) `demo-inventory.md:189` and `:653-656` still describe
  `FORM_OPTIONS` as a live second source of truth for the export/resolution option sets, which
  `a0ec7f6` deleted — the same doc-staleness class R-23 fixed one row up, but a docs/web item.

## Type Design Summary

| Severity | Count (new this pass) |
|---|---|
| BLOCKER (CRITICAL) | 0 |
| MAJOR (HIGH / upper-MEDIUM) | 0 |
| MINOR (MEDIUM / LOW) | 2 |

Prior lane findings: **5 of 5 FIXED** (R-19, R-20, R-28, R-29, R-30) — no PARTIAL, no UNFIXED.
Two fixes leave MINOR residuals (TYPE-DESIGN-F from R-19's action-layer-only enforcement;
TYPE-DESIGN-G from R-28's device-2-only closure).

Canonical homes preserved (no parallel entity declarations): **yes**
Discriminated unions well-formed: **yes**
Exhaustiveness enforced (never-checked / no-default switches): **yes** (`fallbackNotice`,
`locationStatusTheme`; `EXTRA_VIEWS` / `MODAL_IDS` as `Record<Union, true>`)
Correlated state modelled as a union: **n/a this round** — the one flat correlated pair
(`currentCaseId`/`currentLocationId`) is now maintained by every store action; the reshape is
ruled-deliberate (§29) and the remaining gap is the load path (TYPE-DESIGN-F)
Id spaces typed (no bare-string registries/keys): **yes** — `reviewAgainFor` is an entity id, not a
registry key, and matches the repo's plain-`string` id convention
readonly discipline on shared data: **yes** — the last mutable-return helper was deleted (R-20)
Boundary types honest about untrusted input: **yes** — device 2 now covers all 18 shape literals
(probe-verified); TYPE-DESIGN-G is a device-1 consistency residual, not a false guarantee

**Verdict: APPROVE with comments** — every finding this lane raised in round 1 is genuinely fixed, two
of them (R-19's store-side invariants, R-21's structural re-keying) more thoroughly than asked, and
`tsc` + the 436-test subset are green. The two MINORs are opportunistic: one closes the second
construction site of the invariant R-19's fix established, the other is a one-line annotation that
makes the guard header true without exception.
