# Lane: type-design — phase review `p3` (PR #32) — FIX-DELTA

**Mode:** FIX-DELTA — re-review of the fix commits only (`b678a8d..HEAD`, `ec20686`…`3cecfcc`, 15 commits / 35 files / +955−257). Supersedes this lane's initial pass, whose disposition is tabled below for traceability.
**Diff under review:** `git diff master...feat/parity-p3` (full PR); delta read as `b678a8d..HEAD`.
**Refs read:** `.claude/agents/type-design-analyzer.md` · `features/demo/CLAUDE.md` · `docs/code-reviews/parity/p3/p3-review.md` (vetted aggregate, R-1…R-17 + Appendix A) · `docs/code-reviews/deferred.md` §53d, §56b/c/d/f/h/j, and the new §57 (a–i) · the prior version of this lane file (TYPE-DESIGN-1…7).
**Lane's prior findings → routing:** TYPE-DESIGN-1 → **R-13** · TYPE-DESIGN-2 → **R-5** · TYPE-DESIGN-3 → **R-1** (merged, escalated to MAJOR) · the routed cross-lane observation → **R-4** · TYPE-DESIGN-4…7 → Appendix A (carried NITs).
**Pre-flight (re-run in this worktree):** `npx tsc --noEmit` → **clean, exit 0**. Working tree clean after verification (all probe files removed; `git status` empty).

**Verdict: APPROVE. 3 of 3 lane findings FIXED · routed observation FIXED · 4 NITs carried by disposition · 0 UNFIXED · 0 PARTIAL.**
**New this round: 0 BLOCKER · 0 MAJOR · 0 MINOR · 2 NIT.**

Two of the three fixes went further than this lane asked. R-1 did not merely delete the third hook — it found that both surviving copies were *wrong in complementary ways* about the same platform fact and shipped the union, so the consolidation this lane argued for on drift grounds also closed two live gesture defects. R-13 correctly diagnosed that the fix this lane proposed (narrow the field) **would not have caught anything on its own**, and hardened the setter as well; I verified that claim by compile probe in both directions rather than taking it. The two new NITs are both residuals of otherwise-clean fixes.

---

## Disposition of the initial-pass findings

| Initial | Routed | Sev | Status | One-line verdict |
|---|---|---|---|---|
| TYPE-DESIGN-1 | R-13 | MINOR | **FIXED** | Field narrowed to `IncidentCoordSource \| ''` **and** the setter made generic per key — probe-verified in both directions. Residual → NIT-N1. |
| TYPE-DESIGN-2 | R-5 | MINOR | **FIXED** | `incidentCoordinates` is now required-but-nullable on the patch; exactly the shape proposed, derivation from `DemoCase` preserved. |
| TYPE-DESIGN-3 | R-1 | MAJOR (merged) | **FIXED (stronger)** | Third hook deleted, nested-control rule generalised, and both latch bugs the duplication was hiding closed. |
| routed observation | R-4 | MINOR | **FIXED** | `updateIncidentLocation` has the `get()`-first early return its own JSDoc claimed; the test that passed either way was strengthened. |
| TYPE-DESIGN-4…7 | Appendix A | NIT ×4 | **CARRIED** (by disposition) | Verified untouched; recorded with triggers in §57h. |

---

## TYPE-DESIGN-1 → R-13 — **FIXED** (`0618c7d`)

Two halves landed, and the second is the one that matters.

**The field** (`ui/screens/caseFormData.ts:33-44`): `incidentCoordinateSource: IncidentCoordSource | ''`, replacing bare `string`, with the rationale and the §53d trigger-fired history recorded at the declaration.

**The setter** (`ui/screens/NewCaseModal.tsx:19-22`):

```ts
onChange<K extends keyof NewCaseFields>(field: K, value: NewCaseFields[K]): void
```

§57g claims the field narrowing alone would have caught nothing, because the old `onChange(field: keyof NewCaseFields, value: string)` accepts any string for any key. **I did not take that on trust — I compiled it, both directions:**

- *Probe A (post-fix signature).* A temp module declaring the shipped generic signature, with `@ts-expect-error` on `onChange('incidentCoordinateSource', 'manaul')` and on `onChange('incidentCoordinateSource', 'gps')`, plus the four legal write forms. `npx tsc --noEmit` → **exit 0**. Since TypeScript errors on an *unused* `@ts-expect-error`, a clean run with both directives present is positive proof that both typos are compile errors today.
- *Probe B (pre-fix signature, control).* The same typo under `(field: keyof NewCaseFields, value: string)`. `npx tsc --noEmit` → **`error TS2578: Unused '@ts-expect-error' directive`**, i.e. the typo **type-checked** before the fix.

So the generic is load-bearing and §57g's generalised rule ("if a form field's type is load-bearing, the setter has to be generic") is earned, not asserted. Both probe files were removed; the tree is clean.

The construction site this lane named — `NewCaseModal.tsx:239` (`'geocoded'` on address pick) and `:255`/`:264` (`'manual'` on coordinate keystroke) — is now compile-checked. The union also immediately caught a hand-rolled `blankCase` literal in `modals.test.tsx`, which is the fixture drift it exists to catch.

**Scope honesty:** §53d's *full* fold (mount `IncidentLocationFields`, delete the private `CoordinateField` + chip) was deliberately not done and is re-deferred in §57h with a sharpened trigger ("and this time the fold, not another type patch"), including the honest consequence that the private twin still carries R-16's a11y gap. That is a defensible call for a fix round and it is written down; this lane's finding was the *type* half and the type half is closed. One residual → **NIT-N1**.

---

## TYPE-DESIGN-2 → R-5 — **FIXED** (`76abf1c`)

`engine/logic/incident-location.ts:42-61` is now:

```ts
export type IncidentLocationPatch = Pick<
  DemoCase,
  'incidentBusinessName' | 'incidentStreetAddress' | 'incidentCity'
> & { incidentCoordinates: DemoCase['incidentCoordinates'] }
```

Exactly the shape proposed, including the property this lane cared most about: **the derivation from `DemoCase` survives**. Widening what an incident edit may touch is still an explicit edit to a key list, and the coordinate key's *type* is still `DemoCase['incidentCoordinates']` rather than a re-typed literal — so it tracks the entity. `incidentValuesToPatch` satisfies it unchanged (it always emitted the key), and the conditional-spread producer that would previously have type-checked while silently preserving a stale forensic coordinate is now a compile error. The doc comment records the reasoning and names §56c's `CaseEdits` precedent as its parent. No residual.

---

## TYPE-DESIGN-3 → R-1 — **FIXED, and stronger than filed** (`ec20686`)

`DashboardScreen.tsx` loses its private hook (−67 lines net across the commit) and imports `@/features/demo/ui/primitives/useLongPress`; its duplicate `LONG_PRESS_MS` is gone, so the shared beat can no longer be changed with the card left behind. Three call sites (two in `CasesScreen`, one in `DashboardScreen`) now consume one hook with one option surface.

Three things beyond what this lane asked for, all worth recording:

1. **The drift argument was cashed as two real defects.** This lane flagged the divergence table as evidence that the copies encoded different knowledge; the fix verified both halves at source and found each copy broken where the other was correct. The shared hook double-fired on **touch** (`onContextMenu` ran `clear(); cb.current()` unconditionally, and `clear()` is a no-op once the timer has already nulled itself) — and since both Cases consumers pass a *toggle*, the two fires read as open-then-close, i.e. a hold that appeared to do nothing. The dashboard copy inverted it: `firedRef` was reset *after* the `e.button !== 0` early return, so a mouse hold left the latch standing and ate the next genuine right-click. Fixed by **reset first, guard second** (`useLongPress.ts:143-148`), with both latches (`swallowNextClick`, `fired`) cleared at the top of every pointerdown whatever its button.
2. **The nested-control rule was generalised rather than lifted.** The review's proposed fix shape (lift `e.target.closest('button')` into the shared hook) is **refuted in the commit and in §57a**, correctly: the Cases handlers rode a wrapper `<div>` whose every descendant is a `<button>`, so lifting it verbatim would have killed that gesture outright. The shipped rule is `closest(NESTED_CONTROL_SELECTOR) !== e.currentTarget` (`useLongPress.ts:196-201`), which serves both layouts *because each caller now attaches the hook to the element that IS the gesture surface* — Cases moved its handlers from the wrapper strip onto the row/header button. A refutation with a demonstrated failure mode beats compliance.
3. **The lesson was generalised in the ledger.** §57b restates §56f's guard rail as a rule with a reviewer counterpart ("a `useX` defined in a screen file is a consolidation candidate by default"), and names why the assembly missed this one: it was not at a new path, it was *not a module at all*.

One new export came with the fix (`LONG_PRESS_SURFACE_STYLE`) → **NIT-N2**.

---

## Routed cross-lane observation → R-4 — **FIXED** (`76abf1c`)

`create-store.ts:506-513` now opens with `if (!get().cases.some((c) => c.id === caseId)) return`, making `updateIncidentLocation` the no-op its JSDoc always claimed and closing the §56b defect class (fresh `cases` array + fresh state object → every selector re-runs → a snapshot write for a write that changed nothing). The commit also records *why* the existing test did not catch it — a value-level assertion ("a ghost name is absent") true with or without the guard, the same shape §56b describes on `setCaseStatus` — and strengthens it to the house whole-state pin, mutation-verified. The one thing deliberately **not** done (no-change deep comparison for a *known* id) is correctly argued as a would-be new divergence, since `updateCase` has the identical property and no sibling does it.

---

## Carried NITs — verified untouched, dispositions intact

All four are recorded in the aggregate's Appendix A and re-stated with triggers in §57h. I re-checked each site in the delta:

| NIT | Site | State |
|---|---|---|
| TYPE-DESIGN-4 — three refusals collapse to one `null` | `create-store.ts:249`, `:265` | Unchanged. §57h adds a live consequence worth knowing: `NEW_ADDRESS_FAILED_NOTICE`'s copy had to name a single cause *because* the store collapses three, so a discriminated result would split it back into three sentences. That strengthens the finding without changing its severity. |
| TYPE-DESIGN-5 — `IncidentSheetItem.id` is a case id | `map/mapData.ts:50` | Unchanged. `toMapData` was edited by R-7 (plotting gate) but the id field was not touched. |
| TYPE-DESIGN-6 — `CaseNotesCamera.gps` widens `CameraGpsFix` | `logic/pdf/case-notes.ts:28` | Unchanged — file not in the delta. |
| TYPE-DESIGN-7 — `activeModal()`'s `default` over 7 `ModalId`s | `DemoExperience.tsx:1741` | Unchanged. |

---

# New findings (fix-round)

## TYPE-DESIGN-N1 [NIT] `features/demo/ui/screens/NewCaseModal.tsx:184` (and `ui/DemoExperience.tsx:1636`) — two setters in the same chain still erase the per-key typing R-13 just installed

R-13 hardened the **prop**. Two links of the same chain kept the old shape:

- `NewCaseModal.tsx:184` — the component's own error-clearing wrapper, `const change = (field: keyof NewCaseFields, value: string) => { …; onChange(field, value) }`;
- `DemoExperience.tsx:1636` — the bridge's handler, `const onChange = (f: keyof NewCaseFields, v: string) => setCaseForm((s) => ({ ...s, [f]: v }))`.

Both compile against the generic prop, because instantiating `K` at its constraint gives `NewCaseFields[keyof NewCaseFields]` = `string`.

**Probe-verified**, same technique as above: a temp module reproducing `change` verbatim over the shipped generic signature, with `@ts-expect-error` on `change('incidentCoordinateSource', 'manaul')` → `error TS2578: Unused '@ts-expect-error' directive`, i.e. **the wrapper accepts the typo**. Probe removed; tree clean.

Nothing is wrong today: all three provenance write sites (`:239`, `:255`, `:264`) call `onChange` directly, and `change` is used for exactly two fields (`caseNumber`, `unit`), both plain `string`. But `change` exists precisely to clear a field's error as the visitor types, which is one product decision away from being what the provenance field needs — and it is *in the same file the fix hardened*, standing as a counter-example to the rule §57g generalises from that fix ("a keyed setter typed on the union of keys but a single value type erases every field's type"). The bridge handler is the same shape one layer up, where the value physically lands in state via an unchecked computed-key spread.

**Fix (one line each).** Give both the same signature the prop now has: `<K extends keyof NewCaseFields>(field: K, value: NewCaseFields[K])`. `change`'s body already narrows `field` before use, and the bridge's `{ ...s, [f]: v }` is unaffected. NIT because no current call site reaches it — but it is the cheapest possible way to stop R-13 from being re-openable by a one-line edit that type-checks.

---

## TYPE-DESIGN-N2 [NIT] `features/demo/ui/primitives/useLongPress.ts:99` — the new shared style token is the only exported `CSSProperties` const in the UI that is not `as const satisfies CSSProperties`

```ts
export const LONG_PRESS_SURFACE_STYLE: CSSProperties = { userSelect: 'none' }
```

The decision to export this as a style token rather than fold it into the returned handler object is **right and well-argued** (callers spread the handlers alongside their own `style` prop, so a `style` key inside would win or lose by attribute order — stated at the declaration and in §57a). The nit is only its shape: every other exported style token in this feature is `as const satisfies CSSProperties` (`glass-tokens.ts:47`, `:54`, `:62`; `GLASS` itself is `as const`), which makes them deeply readonly. A `grep` for `^export const [A-Z_]*: CSSProperties` across `features/demo/ui/` returns this one line and nothing else — it is the sole divergence.

It is now module-level shared data spread into three call sites, which is precedent 7's exact subject ("new module-level registries must be `readonly`"; the PR #8 shared-catalog fix). `LONG_PRESS_SURFACE_STYLE.userSelect = 'auto'` currently compiles and would silently change the gesture surface everywhere. **Fix:** `= { userSelect: 'none' } as const satisfies CSSProperties`.

---

## New type surfaces the fix round introduced — assessed, no findings

Recorded so the next round does not re-derive them.

- **The generic setter's signature** (`NewCaseModal.tsx:19-22`) — sound, probe-verified in both directions (above). Inference is unambiguous: `K` is fixed from the `field` argument and the indexed-access `NewCaseFields[K]` is checked against it, so no reverse-inference widening occurs. The bridge's non-generic implementation remains assignable (constraint instantiation yields `string`), which is why it type-checks — that is NIT-N1, not a soundness problem with the signature. **No committed compile-time pin exists for it**, unlike `CaseEdits`' `@ts-expect-error` probe (`crud-actions.test.ts:80-96`); the two probes in this review were ad-hoc. Folding one `@ts-expect-error` line into an existing suite would make the guarantee self-defending — noted, not filed, since the closest suite (`NewCaseModal.gate.test.tsx`) is behavioural.
- **Entity factories** `demoCase` / `demoLocation` (`engine/store/__tests__/test-utils.ts:33-87`) — correct on every axis this lane cares about: they live in the canonical test-utils beside the existing input factories, take `Partial<DemoCase>` / `Partial<DemoLocation>` overrides, return the full entity, build a fresh object per call (no shared mutable default), and default `form` to `blankLocationForm()` exactly as `addLocation` does. This closes the parallel-fixture surface CLAUDE.md's "Adding a Field to the Case Entity" rule warns about (its phone counterpart is `createMockCase`/BUG-007), and a future **required** field is a compile error in one file. The residual — a future **optional** field still slips past `tsc` — is inherent to the pattern, stated at the factory, and tracked in §57h with the right trigger ("the next `DemoCase` field add — update the factory first"). No finding.
- **`NAME_TAKEN_ERROR` re-export** (`DuplicateLocationModal.tsx:30-32`) — now `NEW_LOCATION_BLOCK_MESSAGES.duplicateName`, so the chooser and the create card cannot drift on copy. The export's type widens from the string literal it used to infer to `string` (the record's value type); nothing consumes the literal type — the suite compares values — so this is free. The larger part of R-3 is a type-design improvement in its own right: the chooser's private re-derivation of the two name rules is gone in favour of `newLocationBlock({ …, requireAddress: false })`, which brings the module's evaluation *order* with it (blank reports "required", never "duplicate"). One rule, one owner — §56's `location-name.ts` reasoning applied to the sibling that had a copy. No finding.
- **`ActionButton`'s `blocked` / `describedBy`** (`DuplicateLocationModal.tsx:65-101`) — the native `disabled` attribute is gone, bringing the third submit gate onto §56d's reconciled semantic (`aria-disabled` + caller-side enforcement). Prop names are local to a private component and read fine beside `ModalActions`' `submitBlocked` / `submitDescribedBy`. No finding.
- **`MapScreen.onEditIncident` made required** (`map/MapScreen.tsx:26-38`) — a props-honesty improvement of exactly the kind this lane grades: the CTA renders unconditionally, so an optional handler meant a mount could ship a button that swallows every press. Requiring the prop is the correct half of §49a's precedent for a surface with no honest half-state, and `tsc` found the four unwired test renders — the change paying for itself. Its two optional neighbours are correctly left alone (they gate their own affordances). No finding.
- **`editingCase` derived once** (`DemoExperience.tsx:801-813`) — R-11 collapses two independent discriminators (`cases.find(caseEditId)` in the render arm, bare `caseEditId !== null` in `submitCase`) into one binding both halves read. This is the correlated-state precedent applied to bridge state: the sheet can no longer present one mode and commit the other. Alongside `closeIncidentModal` (R-12, §56j's hardening applied to the sibling it missed), both are improvements to invariant expression at the bridge. No finding.
- **`IncidentLocationPatch` as an intersection rather than a pure `Pick`** — checked that the derivation is still machine-checked end to end; the added member's type is `DemoCase['incidentCoordinates']`, not a re-typed literal. No finding.
- **`toMapData`'s plotting gate** (`map/mapData.ts:79-97`, R-7) — `hasCapturedCoordinates` now gates both the incident pin and the located-locations filter, so the four consumers of one stored record (case sheet, PDF camera row, notes formatter, map) finally agree. Narrowing is correct: the predicate's structural param type filters `undefined` out of the incident union while keeping `source`, so `ic.lng` still resolves; the surviving `l.gps!` assertions are guarded by the same predicate. §49g's fired trigger is discharged rather than re-deferred. No finding.

---

## Type Design Summary

| Severity | Count (new this round) |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 0 |
| NIT | 2 |

| Check | Result |
|---|---|
| Prior lane findings resolved | **3/3 FIXED**, plus the routed observation FIXED — zero partial, zero unfixed |
| Canonical homes preserved | **improved** — the third `useLongPress` is gone (one primitive, one home); `demoCase`/`demoLocation` give `DemoCase` a canonical test factory it lacked. The one remaining parallel form model (`NewCaseFields` vs `IncidentLocationValues`) is type-hardened and explicitly re-deferred with a sharpened trigger (§57h) |
| Discriminated unions well-formed | yes — unchanged, plus `editingCase` collapses a two-discriminator divergence at the bridge |
| Exhaustiveness enforced | yes for new unions; the one pre-existing `default:` is a carried NIT with a trigger |
| Correlated state modelled as a union | yes |
| Id spaces typed | **regression closed** — `incidentCoordinateSource` is the union, and the setter that writes it discriminates per key (probe-verified) |
| `readonly` discipline on shared data | one new gap → NIT-N2 (`LONG_PRESS_SURFACE_STYLE`), the sole exported style token not `as const satisfies CSSProperties` |
| Boundary types honest about untrusted input | yes — unchanged; no persisted shape moved this round |
| Props-type honesty | **improved** — `MapScreen.onEditIncident` required; the chooser's gate on the house `aria-disabled` semantic |
| Fix-introduced regressions | **none.** `tsc --noEmit` clean; every changed type surface read; the two new NITs are residuals, not regressions |

**Verdict: APPROVE.** Nothing in this round blocks merge from this lane. Both new items are one-line changes that can land opportunistically or be folded into §57h — NIT-N1 is the one I would take, because it keeps R-13's guarantee from being re-openable by an edit that type-checks, in the same file the fix hardened.
