# Lane: TYPESCRIPT — demo↔phone parity P2 (PR #31)

| | |
|---|---|
| **Lane** | `typescript-reviewer` (`.claude/agents/typescript-reviewer.md`) |
| **Mode** | **FIX-DELTA** (round 2). Initial round ran at `9f5c01a`; this pass verifies the fix round. |
| **Worktree** | `.../scratchpad/worktrees/parity-p2` |
| **Head reviewed** | `feat/parity-p2` @ `572022a` (fix commits = everything after `e770d45`) |
| **Vetted doc** | `docs/code-reviews/parity/p2/p2-review.md` — this lane's IDs map to R-1, R-5, R-10, R-11, R-12, R-13 (+ routing contributions to R-14 and R-31) |
| **Gates at head** | `pnpm exec tsc --noEmit` → **exit 0, zero diagnostics**. `pnpm vitest run` → **1477 tests / 159 files**; one intermittent failure in a file untouched by this PR (see *Test-suite observation*), all P2 suites green. |
| **Prior findings** | 6 filed · **6 FIXED** · 0 partial · 0 unfixed |
| **New this round** | **blockers: 0 · majors: 1 · minors: 0** |
| **Verdict** | **REVISE** — every original finding is properly resolved; one MAJOR gap remains inside R-1's own blast radius. |

---

## Part 1 — Fix-delta: status of this lane's findings

| Lane ID | R-# | Severity | Status | One-line evidence |
|---|---|---|---|---|
| TYPESCRIPT-1 | R-1 | MAJOR | **FIXED** | `writeGen` generation ref + post-await re-check on both arms; `locationId` threaded bridge→screen→block |
| TYPESCRIPT-2 | R-10 | MINOR | **FIXED** | `resolvedConfig` single-sourced; `PRECISE_GPS_CONFIG` composed from the shared constants |
| TYPESCRIPT-3 | R-11 | MINOR | **FIXED** | `toFinalSubmissionInput` routes through `formatAddress`; §38 retitled RESOLVED |
| TYPESCRIPT-4 | R-5 | MINOR (merged into a MAJOR) | **FIXED** | `ConfirmDialog` deleted; all six Notes confirms on `AlertDialog` |
| TYPESCRIPT-5 | R-12 | MINOR | **FIXED** | `copiedTimerRef` cleared on re-arm and on unmount |
| TYPESCRIPT-6 | R-13 | MINOR | **FIXED** | `Number.isFinite(best.timestampMs)` typed failure + terminal `.catch` on the click chain |
| *(routing note)* | R-14 | MINOR | **FIXED** | `dstAdvisory`, `notesMeta`, `notesCopyAllText` memoised; notes callbacks `useCallback`'d |
| *(routing note)* | R-31 | MINOR | **FIXED** | `COPY_RESET_MS` + tracked `resetTimer`, cleared on re-arm and unmount |

### TYPESCRIPT-1 → R-1 — **FIXED**

`features/demo/ui/inputs/LocationFields.tsx:99-145`. The guard is a generation ref bumped by a
cleanup keyed on the location identity, which React runs both on a `locationId` change **and** on
unmount:

```ts
const writeGen = useRef(0)
useEffect(() => () => { writeGen.current += 1 }, [locationId])
...
const gen = writeGen.current                       // :115, captured before the async window
const address = await reverseGeocode(fix.lat, fix.lng)
if (gen !== writeGen.current) return                // :123 success arm
...
} catch { if (gen !== writeGen.current) return       // :136 catch arm
```

The token is genuinely wired, not just declared: `DemoExperience.tsx:1062` passes
`locationId={currentLocation?.id}` → `SubmissionScreen.tsx:141` forwards it → `LocationFields`.
`gen` is read *after* the pre-await `onChange` and the `!geocodeEnabled` bail, so it brackets
exactly the window that was unsafe. The capture half is covered too, via
`key={locationId ?? '—'}` on `GpsCaptureControl` (`:182`), which remounts the control on a switch
so `useGpsCapture`'s `abortedRef` cleanup fires for an in-flight 30–120 s capture. Pinned by new
tests in `submission-gps.test.tsx` (+213 lines).

Two sub-behaviours I checked and accept:
- `finally { setReverseGeocoding(false) }` is **not** gen-guarded. Deliberate and correct: gating it
  would leave the spinner stuck on "Looking up address…" forever after an abandoned lookup with no
  follow-up capture (the button is `aria-disabled` while busy). The current shape fails safe.
- `geocodeEnabled` / `lookupNotice` survive a location switch (LocationFields itself is not
  re-keyed). Pre-existing, cosmetic, unchanged by the fix.

### TYPESCRIPT-2 → R-10 — **FIXED**

`GpsCaptureControl.tsx:117-121` resolves the config once (`config ?? buildGpsConfig()`) and hands
the *same object* to the hook and the readout, so the second default is gone by construction:
`Sample n of ${resolvedConfig.maxAttempts}` (`:185`). The sibling folded into the same finding is
fixed too — `PRECISE_GPS_CONFIG` (`gps.ts:150-155`) is now
`{ targetAccuracyM: ACCURACY_MODE_TARGET_M.precise, maxAttempts: GPS_CONFIG_STATIC.maxAttempts, timeoutMs: 120_000, retryDelayMs: GPS_CONFIG_STATIC.retryDelayMs }`,
with `gps.test.ts` still pinning the resulting literals so a shared-constant change that should
*not* reach this config fails loudly.

### TYPESCRIPT-3 → R-11 — **FIXED**

`final-submission.ts:91-94` now calls `formatAddress(location.businessName, location.streetAddress,
location.city)`, and the docblock records why it matters beyond tidiness (gating on a different
string from the one the PDF header and Cases row display). `deferred.md:885` is retitled
"**38. Four hand-rolled address joins — RESOLVED (`formatAddress` is the single producer)**". The
documented exception is preserved: no `locationName` fallback on the gate.

### TYPESCRIPT-4 → R-5 — **FIXED**

`ConfirmDialog` is deleted from `NotesScreen.tsx` (−70 lines) and all six confirmations route
through `AlertDialog`, inheriting the full a11y contract (labelledby + describedby + focus in/out)
and the demo's blocking-dialog semantics. The scrim contradiction my finding named is gone —
there is now one primitive with one answer. The secondary listener-thrash item is fixed too:
`closeDialog` and `requestReset` are `useCallback`'d (`:301, :304-308`), so `AlertDialog`'s
Escape effect no longer tears down per render.

The consolidation risk I checked for — three-action dialogs cramming into a 378 px row — was
handled in the same round: `AlertDialog.tsx:104-107` switches to `flexDirection: 'column'` at
`actions.length > 2`, matching the iOS multi-option shape. The three-arm restore-all and the new
three-arm OCR recalculate both land on it.

### TYPESCRIPT-5 → R-12 — **FIXED**

`NotesScreen.tsx:277-295`: `copiedTimerRef` cleared on re-arm (so rapid copies keep the *latest*
confirmation for its full window — the exact interleaving my finding described) and in an unmount
effect.

### TYPESCRIPT-6 → R-13 — **FIXED**

Both halves. `gps.ts:219-226` returns a typed `INVALID_COORDINATES` failure for a non-finite
`timestampMs` instead of letting `new Date(NaN).toISOString()` throw; `GpsCaptureControl.tsx:123-135`
terminates the chain with `.catch((e: unknown) => console.warn('[demo/gps] capture chain threw
unexpectedly:', e))` — the repo's established breadcrumb convention. The dead-button shape (idle,
no fix, no message) is now unreachable from this path.

### Routing contributions — **FIXED**

- **R-14** (`computeDstAdvisory` render-scope cost, folded in from my routing note):
  `DemoExperience.tsx:105-117` memoises it on exactly its inputs. The docblock states the honest
  consequence — "today" is frozen until an input changes — which is right at demo timescales. The
  notes half is fixed too (`notesMeta` / `notesCopyAllText` memoised on `currentLocation`, six
  store callbacks `useCallback`'d on the stable `store` ref), so `SectionBlock`'s `memo` now
  actually holds while typing free text.
- **R-31** (`CoordinateDisplay.copied` never resetting — recovered by the aggregator from my
  cross-lane routing note): `COPY_RESET_MS = 1600` with a tracked `resetTimer` cleared on re-arm
  and unmount, matching the R-12 idiom.

---

## Part 2 — Regression hunt (new findings)

### TYPESCRIPT-D1 [MAJOR] features/demo/ui/inputs/LocationFields.tsx:162-171 — R-1's guard covers one of the component's two post-await store writes

**Claim.** The fix installs `writeGen` and correctly gates the reverse-geocode write. The **address-pick**
write in the same component — nine lines further down, through the same `onChange` prop and the
same `updateField` chain — is still unguarded, and it writes *more* than the geocode path: street,
city, **and the coordinate triple with its provenance stamp**. A suggestion chosen on location A
whose Mapbox `retrieve` lands after a switch writes A's address *and A's coordinates* onto
location B.

**Evidence.** The producer is unguarded (unchanged by the fix round):

```ts
// features/demo/ui/inputs/AddressAutocomplete.tsx:155-167
const choose = (s: Suggestion) => {
  ...
  session
    .retrieve(s.raw)
    .then((res) => onPick(pickFromFeature((res.features ?? [])[0])))   // ← no generation check
    .catch(() => { /* retrieve failed → keep whatever the user typed */ })
}
```

and the consumer writes straight through:

```tsx
// features/demo/ui/inputs/LocationFields.tsx:162-171
onPick={(p) => {
  onChange({
    streetAddress: p.streetAddress,
    city: p.city,
    ...(p.coordinates
      ? { lat: p.coordinates.lat, lng: p.coordinates.lng, accuracyM: p.accuracyM, coordinateSource: 'geocoded' as const }
      : {}),
  })
  setLookupNotice('none')
}}
```

`onChange` here is the identical chain R-1 was filed against — `SubmissionScreen.handleLocationChange`
(`:113-121`, which forwards the coordinate half to `onCoordinates`) → `DemoExperience.tsx:1064`
`onChange={(f, v) => store.getState().updateField(f, v)}` and `:1066` `onCoordinates={...
updateField('gps', ...)}` → `updateField`'s call-time `get().currentLocationId`. Nothing on the
path re-checks anything: `AddressAutocomplete` carries a `seq` token but it guards only the
**suggest** response (`:118, :131`), never `retrieve`; and unlike `GpsCaptureControl` it is **not**
re-keyed on `locationId`, so it survives a location switch fully mounted with its promise in flight.

The component's own new header now states the rule this site breaks:

> *"the post-await write is abandoned if the generation moved"* — `LocationFields.tsx:29-37`

**Why this is not simply "pre-existing".** It was outside R-1's stated locus (`:80`) so it is not
an unfixed finding, but it is inside the fix's blast radius: the round introduced the token, the
prop, and the doc rule, and applied them to one of the two paths that need them. Merging as-is
ships a component that documents a guarantee it only half provides — and the next reader (P3.4 New
Location, P3.7 per-camera GPS, both named consumers) will reasonably assume the header is true.

**Suggested fix.** Cheapest correct shape: wrap the `onPick` body in `LocationFields` with the same
bail the geocode path uses — capture `const gen = writeGen.current` when the pick is issued and
`return` if it moved before the write. (The alternative — a `runId`/`token` prop re-checked inside
`AddressAutocomplete.choose`'s `.then`, mirroring its existing `seq` idiom — is more general but
touches a second component.) Prefer the local wrap: it keeps the guard co-located with the write
and needs no new prop. Add the sibling test to `submission-gps.test.tsx` alongside the R-1 one.

**Confidence.** High on the mechanism (traced end-to-end at head; no guard anywhere on the path,
no `key` on `AddressAutocomplete`, `updateField` verified call-time). Medium on frequency — a
Mapbox `retrieve` is typically 200–800 ms, so the visitor must switch locations inside that window,
a narrower race than R-1's 30–120 s capture-plus-lookup. Rated MAJOR on consequence parity with
R-1 (identical silent cross-location contamination, plus coordinates and a `'geocoded'` provenance
stamp that is then wrong about which location was geocoded) and on the two-line cost of closing it.

---

## Part 3 — Fix-round blast radius: checked and cleared

Everything below was examined for fix-introduced regressions and found sound. Recorded so a
round-3 pass does not re-litigate it.

**R-1's write-guard token.** Cleanup-on-dep-change semantics are the right hook (fires on both
`locationId` change and unmount); `gen` is captured at the correct point; StrictMode's
mount→cleanup→mount double-invoke is harmless because `gen` is read at handler time, not render
time; `locationId` is optional and `undefined` is its own generation, so switching *to or from*
"no location" invalidates too. The `key={locationId ?? '—'}` remount resets `useGpsCapture`'s
`fix`/`failure`/`progress` on a switch (desirable) while `geocodeEnabled` stays in `LocationFields`
and survives (matches §41.37d's intent).

**`isLive()` persistence wiring (R-2).** `NOOP_HANDLE.isLive: () => false`; `live` starts `false`,
set `true` only after a successful `setItem`, reset to `false` in the catch that clears the
snapshot — so it tracks reality rather than latching, exactly as documented. `persistenceRef`
(`DemoExperience.tsx:319, 326, 331`) is assigned on wire and nulled on teardown, and
`saveProgress` reads `persistenceRef.current?.isLive() ?? false` at **alert time**, so a
mid-session write failure demotes the very next alert. Checked the false-negative window — `live`
is `false` until the first debounced write lands — and it is both unreachable in practice (reaching
Completion requires many store writes, each arming the 250 ms debounce) and semantically honest if
reached ("nothing stored yet"). `saveProgress` does not `flush()` before asking; harmless, since
the promise is about future refresh survival and any pending write lands within 250 ms.

**`calcOffset(regenerate)` signature change (R-4).** `(regenerate = true)` assigned to
`TimeOffsetScreen`'s `onCalculate(): void` is a legal narrowing, and both call sites invoke it with
no arguments (`TimeOffsetScreen.tsx:61` and the AlertDialog Continue arm at `:159`), so the default
applies. Safe even under a leaked event object (truthy → `regenerate` true → the old behaviour).
`confirmOcr(regenerate)` threads the phone's three-arm answer correctly:
`OcrCaptureScreen.tsx:193-194` maps Keep My Edits → `onConfirm(false)` and Regenerate Scopes →
`onConfirm(true)`, and `:83` keeps `onConfirm(true)` for the no-extracted-scopes path. The
`regenerate: false` arm leaves `form.extractedScopes` *and* `extractedScopesPartial` untouched —
consistent, since the flag describes the list that was deliberately kept.

**R-18's `accuracyM?` widening (`GpsSample`, `GpsFix`, `CaptureProgress`).** Traced all consumers:
`GpsCaptureControl.tsx:185-187` drops the "· best ±Nm" clause when undefined rather than passing
`undefined` into `formatAccuracy(accuracyM: number)`; `CoordinateDisplay` already gated its chip on
`accuracyM !== undefined`; `LocationFields` → `SubmissionScreen` → `updateField('gps', …)` →
`GpsCoordinates.accuracyM?` → zod `.optional()` all line up, and `JSON.stringify` simply drops the
key. `selectBestSample`'s new three-branch ordering is correct on all four cases I enumerated
(`[und,50]`, `[50,und]`, `[und,und]`, `[und,50,20]`) and still keeps the earlier sample on a
measured tie (strict `<`), preserving the pinned phone behaviour. `meetsTargetAccuracy` returning
`false` for an unmeasured sample means a non-conformant provider now runs the full 10-attempt loop
instead of exiting early — intended, documented, and the honest reading.

**R-7's `disabled` → `aria-disabled`.** Activation is refused in the handler
(`GpsCaptureControl.tsx:130` `if (busy || disabled) return`) before the promise chain, so the
control cannot be double-fired; `type="button"` means there is no form-submit path to reopen.

**R-25's exhaustive `gpsSourceLabel`.** `case undefined` plus a `const exhaustive: never = source`
default — a fourth `GPS_SOURCES` member is now a compile error rather than a silently missing
provenance chip. Correct shape.

**R-23's `DvrDateResolution` discriminated union.** Replaces the two independent nullables whose
both-set state was representable; `isDvrDraftCommittable(draft, resolution, dateConfirmed)` narrows
on `resolution.kind !== 'assumed-date'`, and the sole producer (`readDvrTimestamp`) returns exactly
one variant per path. `tsc` confirms every consumer migrated.

**R-14's memoisation.** `dstAdvisory`'s deps are exactly its inputs; `clock.now` / `clock.isDst` are
module-level seam singletons (stable by construction), and `clock.isDst` is a *new* second half of
the seam added by R-9 so the advisory wiring can be pinned without depending on the runner's zone.
One behavioural note, accepted: the advisory now computes whenever its inputs change *regardless of
the active screen* (it moved from inside `case 'timeOffset'` to the component body), so editing
requested scopes with the DST toggle on runs scenario A's ~23 `isInDST` probes off-screen. That is
microseconds and strictly better than the pre-fix per-render cost; noted, not filed (and perf is
`web-reviewer`'s lane).

**Architecture rules re-swept at head.** Store bridge intact (`useStore` still zero hits outside
`DemoExperience.tsx`); engine purity intact (no React / `'use client'` / module-scope `window` or
`document` under `features/demo/engine/**` — `gps.ts`'s new `import type { GpsSource }` is
type-only); marketing↔demo isolation intact; no new `as any` / `: any` / `<any>` in the fix diff;
the only new cast is `flexDirection: 'column' as const` in `AlertDialog`. `NotesScreen` now imports
`ScrapAllMode` / `RestoreAllMode` from the engine barrel (R-22) — the first real consumer of two
exports my initial round had noted as barrel-only, which retires that observation.

---

## Test-suite observation (routed to `test-analyzer`, **not** filed as a finding)

`features/demo/ui/controls/__tests__/ExploreChecklist.test.tsx > renders one numbered row per item,
in registry order` failed in one of two full-suite runs at this head and passed in the other, and
passes in isolation (8/8). The file is untouched by both the P2 diff and the fix round (last
modified on `feat/parity-p1`, commit `95aad3f`). The assertion is **fully synchronous**
(`render` → `getAllByRole('button')` → `toHaveLength(3)`), so the `asyncUtilTimeout: 5000` remedy
does not cover it, and `vitest.config.mts` sets no `isolate: false` / pool override, so cross-file
DOM pollution should not be possible either — leaving worker-level contention (a test-timeout
under load) as the likeliest reading, consistent with the profile in
`docs/code-reviews/parity/p2/gate-import-flake.md`.

I am **not** attributing this to the fixes: I have no pre-fix baseline for the enlarged suite (156
files at `9f5c01a` vs 159 now), 1 failure in 3 runs, and the file sits outside every fix's blast
radius. Recording it so the signal is not lost between lanes.

---

## Commands run this round

`git log --oneline e770d45..HEAD` · `git diff e770d45..HEAD --stat` and per-file diffs for
`gps.ts`, `capture-gps.ts`, `GpsCaptureControl.tsx`, `LocationFields.tsx`, `SubmissionScreen.tsx`,
`NewLocationModal.tsx`, `CoordinateDisplay.tsx`, `AlertDialog.tsx`, `NotesScreen.tsx`,
`OcrCaptureScreen.tsx`, `DemoExperience.tsx`, `ocr.ts`, `final-submission.ts`, `create-store.ts`,
`persistence.ts`, `selectors.ts`, `clock.ts` · full reads of `LocationFields.tsx`,
`AddressAutocomplete.tsx:150-172`, `AlertDialog.tsx:100-135`, `clock.ts`, `vitest.config.mts` ·
`pnpm exec tsc --noEmit` (exit 0) · `pnpm vitest run` ×2 full + `ExploreChecklist.test.tsx`
isolated · grep sweeps for `calcOffset`/`onCalculate`, `isLive`/`persistenceRef`, `maxAttempts`,
`useStore`, engine-purity, `as any`, and `features/demo` imports from marketing.

---

## Appendix — round-1 findings as originally filed (historical)

Retained in condensed form; full prose is in the git history of this file at `9f5c01a`.

| ID | Sev | Where | Claim |
|---|---|---|---|
| TYPESCRIPT-1 | MAJOR | `LocationFields.tsx:80` | Reverse-geocode result written to the store after an unguarded `await`; a location switch mid-lookup lands A's address on B |
| TYPESCRIPT-2 | MINOR | `GpsCaptureControl.tsx:165`, `gps.ts:142-147` | Hand-typed `10`/`500` as second defaults for numbers `GPS_CONFIG_STATIC` owns |
| TYPESCRIPT-3 | MINOR | `final-submission.ts:85-90`, `deferred.md` §38 | §38's strike-trigger fired on-branch; `toFinalSubmissionInput` stayed hand-rolled and §38 was not amended |
| TYPESCRIPT-4 | MINOR | `NotesScreen.tsx:96-156` vs `AlertDialog.tsx:25-40` | Two blocking-dialog primitives in one PR with opposite scrim semantics, undocumented |
| TYPESCRIPT-5 | MINOR | `NotesScreen.tsx:343-351` | `copyAll` reset timer untracked — overlapping clicks wipe the later confirmation; outlives unmount |
| TYPESCRIPT-6 | MINOR | `GpsCaptureControl.tsx:122-126` | New async click handler with no terminal `.catch`; `onCapture`'s promise dropped |

Round-1 also routed two observations to other lanes, both of which the aggregator picked up and the
fix round resolved: the `computeDstAdvisory` render-scope cost (→ R-14) and `CoordinateDisplay`'s
never-resetting `copied` state (→ R-31).
