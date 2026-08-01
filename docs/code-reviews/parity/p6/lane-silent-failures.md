# P6 review — SILENT-FAILURES lane

**PR:** #35 `master..feat/parity-p6` — map feature depth (supercluster clustering, filters, Turf
proximity, camera markers)
**Lane:** silent-failure-hunter (`.claude/agents/silent-failure-hunter.md`)
**Scope read:** every non-test file in the diff (`MapCanvas.tsx`, `MapControls.tsx`, `MapScreen.tsx`,
`LocationDetailCard.tsx`, `mapCluster.ts`, `mapProximity.ts`, `mapFilters.ts`, `mapData.ts`,
`mapTokens.ts`, `markerElements.ts`), plus the unchanged collaborators they now feed
(`buildMarkers.ts`, `MapBottomSheet.tsx`, `LocationList.tsx`, `SheetHandle.tsx`,
`engine/logic/coordinates.ts`) and the repo's established lazy-load precedents
(`ui/inputs/ocr-recognize.ts`, `ui/import/pdf-extract.ts`, `app/demo/error.tsx`).
**Cross-checks at source:** phone repo (read-only) for `MapControls.tsx` count gating and
`LocationList.tsx` empty state; installed `mapbox-gl@3.25.0` bundle for the post-load `error`
taxonomy.
**Context honoured:** PR #35 body's "deliberate choices — DO NOT RE-FLAG", `deferred.md` §72
(a–e), `features/demo/CLAUDE.md`.
**Reproductions:** four throwaway vitest files were written into
`features/demo/ui/screens/map/__tests__/`, run, and **deleted** — nothing was committed. Their
console output is quoted verbatim below.

Severities use the orchestrator's `blocker / major / minor` vocabulary, with the lane rubric's
label in parentheses.

| Severity | Count |
|---|---|
| blocker (CRITICAL) | 0 |
| major (HIGH) | 3 |
| minor (MEDIUM) | 2 |
| minor (LOW) | 2 |

**Verdict: REVISE** (three majors, no blockers).

---

## S-1 — [major (HIGH)] A failed `mapbox-gl` / `mapCluster` chunk produces a blank map with no error, no Retry and no breadcrumb

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:225-266` (the un-caught async IIFE),
with `:383-386` (the cover failsafe) and `:456` (the error overlay's gate) completing the swallow.

```ts
    void (async () => {
      const [mod, clusterMod] = await Promise.all([
        import('mapbox-gl'),
        import('@/features/demo/ui/screens/map/mapCluster'),
      ])
      …
    })()          // ← no .catch(); nothing sets `failed`, nothing logs
```

**Adversarial input:** either lazy chunk fails to fetch. The realistic causes are the ones the repo
has already met once — `app/demo/error.tsx:60-70` names it explicitly ("the likely cause is a
post-redeploy **ChunkLoadError**") — plus a flaky mobile connection, an ad-blocker/corp proxy
rewriting `/_next/static/chunks/*`, or a CDN 404 on a stale hashed chunk. It also covers a
**synchronous throw from the `Map` constructor**: mapbox-gl 3.25 throws
`An API access token is required…` for a malformed `NEXT_PUBLIC_MAPBOX_TOKEN`, and that throw lands
inside the same un-caught IIFE.

**Traced failure path:**
1. The promise rejects. Nothing catches it → an unhandled rejection (browser: `Uncaught (in
   promise) ChunkLoadError`). React error boundaries do not see promise rejections, so
   `app/demo/error.tsx` never fires.
2. `map` is never constructed → `'load'` never fires → `ready` stays `false`,
   `readyRef.current` stays `false`.
3. `setFailed(true)` lives **only** inside `map.on('error')` (`:253-262`), which was never
   registered. So `failed` stays `false` → the error overlay and its **Retry** button
   (`:456-474`) — the one recovery affordance — are never rendered.
4. The loading cover's hard failsafe (`:383-386`) fires at 4 000 ms and sets `revealed`, then
   `:388-392` unmounts it 600 ms later. **The failsafe, whose job is to stop a slow map hanging
   behind a cover, here uncovers a permanently-empty container.**
5. What is left on screen is `MapScreen`'s `#0a1422` backdrop (`MapScreen.tsx:272`) with the
   Change Case pill, the full `MapControls` overlay and the bottom sheet floating on it.

**Observable wrong behaviour — proven.** Repro (`vi.mock('mapbox-gl', () => { throw new
Error('ChunkLoadError…') })`, then `MapCanvas` with one marker) **passed** every assertion:

```
map-error-overlay      → null
map-retry-button       → null
"Map preview unavailable" (the token placeholder) → null
map-loading-cover      → unmounted after the 4.7 s failsafe
console.warn calls: 0     console.error calls: 0
(vitest additionally reported: “Unhandled Rejection … ChunkLoadError”)
```

The visitor sees a dark rectangle with map controls on it — visually indistinguishable from "the
satellite tiles here are just very dark / my locations aren't plotted". The operator gets nothing.

This is below the bar the same file already sets **four lines away**: an *absent* token degrades to
`data-map-fallback`, which names the missing variable ("Add a Mapbox token
(NEXT_PUBLIC_MAPBOX_TOKEN) to see the live map"). A *failed chunk* — the more likely production
failure of the two — gets no placeholder, no copy, no log. `ocr-recognize.ts` and
`app/demo/error.tsx` both handle their lazy-import rejection; this one does not.

**Fix:** wrap the IIFE body in `try/catch` (or append `.catch(…)`), and in the catch:
`console.warn('[demo/map] the map engine chunk failed to load …', e)` + `setFailed(true)`, so the
existing overlay + Retry render. Retry already remounts the effect via `attempt`, and webpack
retries a failed chunk on the next `import()`, so Retry is a genuine recovery. Consider distinct
copy for "the map engine couldn't load" vs. the existing tile/style failure so the two causes stay
distinguishable.

---

## S-2 — [major (HIGH)] A failed proximity chunk leaves the control reading "Proximity ON" forever while nothing is filtered — silently, and unrecoverably

**File:** `features/demo/ui/screens/map/MapScreen.tsx:121-129` (`loadProximity`), fired from
`:239` and `:251`; the resulting dead state is gated at `:158-161`.

```ts
  const loadProximity = useCallback((): Promise<ProximityModule> => {
    if (!proximityLoadRef.current) {
      proximityLoadRef.current = import('…/mapProximity').then((mod) => {
        setProximityModule(mod)          // ← only runs on success
        return mod
      })                                  // ← no .catch()
    }
    return proximityLoadRef.current       // ← a rejected promise is memoised forever
  }, [])
…
    void loadProximity()                  // ← :239 and :251, fire-and-forget
```

**Adversarial input:** the Turf chunk fails to fetch (same causes as S-1 — this chunk is fetched
*later* than the map's, on first activation, so it is strictly more exposed to a redeploy landing
mid-session).

**Traced failure path:** `handleProximityToggle` (`:234-245`) sets `proximityCenter` and
`setProximityActive(true)` **unconditionally**, independent of whether the module ever arrives.
`proximityResult` (`:158-161`) returns `null` because `proximityModule` is `null`, so
`display = filtered` (`:163`) and `filteredCount = locationCount` (`:170`). Every downstream
surface therefore reports an *unfiltered* map while every control reports an *active* filter.

**Observable wrong behaviour — proven.** Repro (three far-apart locations, `mapProximity` mocked to
throw at import, one click on the toggle):

```
TOGGLE TEXT: "Proximity ON"   aria-pressed: true
RADIUS PRESETS RENDERED: true          (1/3/5 km all render, all are no-ops)
COUNT BADGE: "3 locations"             (never "N of 3" — nothing was narrowed)
ring: no addSource call — no ring is drawn
console.warn: 0   console.error: 0
AFTER off→on RE-TOGGLE — COUNT BADGE: "3 locations", WARNS: 0, ERRORS: 0
```

Two distinct harms:

- **The control lies.** `aria-pressed="true"`, the label says ON, the radius pills appear and
  respond to clicks. A visitor pressing 1 km and seeing all their locations survive concludes
  every location is within 1 km of the anchor. That is a false statement about their data, made
  with no notice — precisely what `FallbackMode`'s notice switch exists to prevent for imports.
- **It is permanent, and that is a known-forbidden pattern here.** The rejected promise stays in
  `proximityLoadRef.current`, so off→on never retries — confirmed above. `ocr-recognize.ts:76-80`
  documents the exact opposite rule for its own memoised loader: *"A boot that failed must not
  poison every later attempt with the same rejection"*, and implements
  `workerPromise.catch(() => { workerPromise = null })`.

**Fix (three small parts, all with in-repo precedent):**
1. `.catch()` on the import: `console.warn('[demo/map] the proximity module failed to load …', e)`
   (the `error.tsx` R-31 / `geocode.ts` ungated-warn convention) **and**
   `proximityLoadRef.current = null` so a second press retries (`ocr-recognize.ts` precedent).
2. Do not assert ON before the module is usable — either `await` the load before
   `setProximityActive(true)`, or keep the optimistic flip but render the failure honestly.
3. Surface it: on failure, flip `proximityActive` back off and raise the existing
   `DemoNotification` (`setNotice(...)`, already wired at `MapScreen.tsx:326`) with one honest
   sentence, in the shape of `OCR_RECOGNITION_FAILED_MESSAGE`.

---

## S-3 — [major (HIGH)] A filter that matches nothing tells the visitor they have no located locations — and hides the badge that would contradict it

**Files:** `features/demo/ui/screens/map/MapScreen.tsx:307` (`items={display.items}` — the diff
newly feeds the *filtered* projection into a sheet written for the unfiltered one),
`features/demo/ui/screens/map/MapControls.tsx:175-179` (the count badge's `locationCount > 0`
gate), surfacing through `features/demo/ui/screens/map/LocationList.tsx:19-21`:

```tsx
  if (items.length === 0) {
    return <div style={empty}>No located locations yet — add an address to a location to plot it here.</div>
  }
```

**Adversarial input:** any of — (a) a search term matching no location, (b) a status pill for a
status no location holds, (c) proximity active with nothing inside the radius. (a) and (b) require
the case to have no incident coordinates (the incident is exempt from status/text filters,
`mapFilters.ts:60`), which is the common case since incident coordinates are optional. (c) needs
nothing: the incident is deliberately **not** exempt from the radius (`mapProximity.ts:41-45`), so
proximity can empty the sheet on any case.

**Observable wrong behaviour — proven.** Repro (three geocoded locations, no incident coordinates):

```
BEFORE — rows: 3 | badge: "3 locations"
AFTER (search "zzzz") — rows: 0
AFTER — count badge present?: false      ← the “0 of 3” signal is gated off at 0
AFTER — sheet: "0 Locations" + "No located locations yet — add an address to a location to plot it here."
AFTER — clear pill: "Clear (1)"
STATUS-FILTER (Complete) — identical
```

The visitor has three geocoded locations. The app tells them they have **none**, and instructs
them to take an action ("add an address to a location") that will not bring the rows back. The only
surviving trace of the true cause is the `Clear (1)` pill three rows above, on a different surface.

Two aggravating details, both introduced by this diff:

- **The count badge, the one control that could say "0 of 3", is suppressed exactly when it is
  needed.** `locationCount` is the POST-status/text count, so a filter that empties the map drives
  it to 0 and trips the `locationCount > 0` gate. (Verified phone-verbatim —
  `MapControls.tsx:109` `const showCountBadge = locationCount > 0` — so the gate itself is a
  faithful port; the demo-only consequence is that the phone has **no empty-state copy at all**
  (its `LocationList` is a `BottomSheetFlatList` with no `ListEmptyComponent`), so the phone shows
  a blank list, not a false sentence.)
- **In the proximity case the two surfaces openly contradict each other:** `locationCount` stays 3,
  so the badge renders `0 of 3 locations` while the sheet immediately below it says there are no
  located locations. One of the two is false and the UI does not say which.

**Fix:** make the sheet's empty state depend on *why* it is empty. `MapScreen` already knows —
`applyMapFilters`/`countActiveFilters` and `proximityActive` are both in scope at the call site.
Pass a discriminated reason down (`'none' | 'filters' | 'proximity'`) and give each its own
sentence, e.g. "No locations match these filters." / "No locations within {radius} km of the ring."
with a Clear-filters affordance, keeping the existing copy for the genuine no-data case. Same shape
as the `FallbackMode` notice switch, and a `never`-guarded switch keeps a fourth reason from
silently falling back to the data-absent sentence. Separately, allow the count badge to render
`0 of M` when `M > 0` (a deliberate, recorded divergence from the phone's `> 0` gate, justified by
the demo having empty-state copy the phone lacks).

---

## S-4 — [minor (MEDIUM)] "Only a failure before first load is fatal" also swallows auth revocation, 401/429 and WebGL context loss — all logged as "transient"

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:248-262`

```ts
        if (readyRef.current) {
          console.warn('[demo/map] mapbox reported a transient error after load:', cause)
          return
        }
```

The stated rationale — "after that, mapbox emits 'error' for ordinary transient tile fetches;
covering a working map with a full-screen error over one dropped tile would be the opposite of
honest" — is right about tiles and **incomplete about the event**. `mapbox-gl@3.25.0` (installed,
inspected at source) routes several *terminal* conditions through the same `'error'` event after
load:

- `Map._authenticate()` issues an async session call and, on `401` (or an expired token), calls
  `_revokeAuth()`, which **clears the GL colour/depth/stencil buffers** and then fires
  `new ErrorEvent(new Error('A valid Mapbox access token is required to use Mapbox GL JS…'))`.
  That round-trip resolves *after* `'load'` in practice, so it always lands in the ignored arm.
- Tile/glyph/sprite `AJAXError`s carry `.status` — a `429` (a public demo token hitting its
  free-tier ceiling) or a `403` (URL-restricted token on a new deploy origin) is permanent and
  arrives identically to one dropped tile.
- WebGL context loss surfaces the same way.

**Observable wrong behaviour — proven.** Repro emitting the verbatim `_revokeAuth` error and a
401 `AJAXError` after load:

```
ERROR OVERLAY?: false      RETRY BUTTON?: false
WARN LINES: [
  '[demo/map] mapbox reported a transient error after load:',
  '[demo/map] mapbox reported a transient error after load:'
]
```

The visitor is left with a blank basemap carrying the demo's DOM markers (they are
`mapboxgl.Marker` elements, so they survive the buffer clear) — pins floating over a void, no
message, and **Retry withheld** because it is gated on `failed`. The operator's only breadcrumb
asserts the word "transient" about a permanent auth revocation.

This is the lane's fallback-cause-collapse pattern: two causes with opposite remedies (wait vs.
fix the token) reduce to one outcome *and* one log line. The reference split is
`extract-client.ts`'s 503-vs-everything-else.

**Fix (small, no new UI):** branch inside the post-load arm rather than returning unconditionally.
Escalate when the cause is terminal — `(cause as { status?: number })?.status` in `{401, 403, 429}`,
or the message matches mapbox's access-token sentence — by `console.error`-ing with the status and
calling `setFailed(true)` so the existing overlay + Retry appear. Keep the current warn-and-ignore
for everything else, and drop the word "transient" from that line (say "ignored after load"),
since the handler cannot actually establish transience.

---

## S-5 — [minor (MEDIUM)] A stray long-press does not "re-centre the ring" as §72e says — it *activates* proximity and removes locations from the map and the sheet

**Files:** `features/demo/ui/screens/map/MapScreen.tsx:249-256` (`handleLongPress`),
`features/demo/ui/screens/map/MapCanvas.tsx:406-421` (`onPointerDown` / the 500 ms timer).

```ts
  const handleLongPress = useCallback((lng: number, lat: number) => {
      void loadProximity()
      setProximityCenter([lng, lat])
      setProximityActive(true)        // ← activation, not a re-centre
    }, [loadProximity])
```

§72e discloses two wrong-fire edges and characterises the consequence as benign — *"the ring simply
re-centres under the pinch"*, *"a long hold on a pin both selects it and moves the ring."* That
description holds only when proximity is **already on**. When it is off (the default), a wrong-fire
**turns proximity on** at the default 1 km radius, centred on a point the visitor never chose: pins
disappear from the map, rows disappear from the sheet, and — if no incident is plotted — the sheet
falls into the S-3 copy claiming the visitor has no located locations. The visitor performed no
press; they pinched, or rested a finger on a pin.

The `MapControls` toggle does flip to "Proximity ON" and a ring is drawn, so this is not invisible
to someone who knows the feature — hence MEDIUM rather than major. But the recorded risk assessment
in §72e understates the blast radius, and the phone has no equivalent exposure: a native long-press
recognizer fails on multi-touch, so the phone's `onLongPress` cannot fire from a pinch at all. The
demo's hand-rolled container timer can.

**Fix:** two lines, no new machinery.
1. `MapCanvas.onPointerDown`: `if (!event.isPrimary) { cancelLongPress(); return }` — kills the
   multi-touch wrong-fire outright (the standard Pointer Events guard for exactly this).
2. Optionally `if (event.target !== containerRef.current) return` (or check for a
   `[data-marker-id]` ancestor) so a hold that starts on a marker does not double-fire selection
   plus activation — the second disclosed edge.
3. Update §72e's consequence wording either way, so the next reviewer isn't told the effect is a
   re-centre.

---

## S-6 — [minor (LOW)] The proximity anchor silently falls back to the camera centre / a hard-coded coordinate, with nothing telling the visitor where the ring came from

**File:** `features/demo/ui/screens/map/MapScreen.tsx:240-243`, with `FALLBACK_CENTER` at `:31-33`.

```ts
      const anchor = filtered.items[0]?.coord ?? mapRef.current?.getCenter() ?? FALLBACK_CENTER
```

§72b's decision to drop the phone's GPS step is sound and I am not re-litigating it. The residual
is that the chain **can never report "no anchor"** — it always silently picks something, and the
first element it reads is the **post-filter** set.

**Sequence:** the visitor types a search term matching nothing (`filtered.items` is now empty) →
presses Proximity → the anchor becomes whatever the camera happens to be centred on → they clear
the search → their locations come back, now narrowed against a point they never chose. The badge
reads "N of M" and the ring is drawn, so it is discoverable — hence LOW — but nothing distinguishes
"you set this anchor" from "we picked one for you". With no token at all (the `data-map-fallback`
path) `getCenter()` returns `null` and the ring lands on the hard-coded `[-79.65, 43.61]`; the
comment's claim that this "matches MapCanvas's own default camera centre rather than inventing a
coordinate" is true of the code and not of the visitor's experience, since no map is on screen to
have a centre.

**Fix:** cheapest honest close — when the anchor came from `getCenter()`/`FALLBACK_CENTER` rather
than a plotted item, raise the existing `DemoNotification` once ("Proximity centred on the current
view — long-press the map to move it."). Alternatively anchor from the **unfiltered** `mapData`
rather than `filtered` so a text filter can't push the chain onto a synthetic centre.

---

## S-7 — [minor (LOW)] Cameras without a fix are dropped from the map projection with no count and no flag

**File:** `features/demo/ui/screens/map/mapData.ts:118-134` (`toCameraMarkers`), consumed by
`LocationDetailCard.tsx:159-173`.

```ts
  for (const cam of loc.form.cameras) {
    if (!hasCapturedCoordinates(cam.gps)) continue      // ← dropped, uncounted
```

**Consistency check (the question this lane was pointed at) — clean.** The gated array is the
single source for all three consumers: the plotted markers (`MapScreen.tsx:177-180` →
`MapCanvas` `cameras`), the toggle's `N` and its aria-label (`LocationDetailCard.tsx:165,170`), and
the toggle's very existence (`item.cameras.length > 0`). Markers, count and toggle can never
disagree, and `hasCapturedCoordinates` correctly rejects non-finite, out-of-range and (0,0) fixes
so nothing plots at Null Island. `createCameraEl` re-guards `accuracyM` with `Number.isFinite`
(`markerElements.ts:121`).

**The residual:** a location with five cameras of which two have a fix renders `Show cameras (2)`
and plots two, with nothing anywhere saying three were omitted — while the wizard's cameras screen
lists all five. This is the repo's own partial-result pattern, and the standard it set is explicit:
`generateExtractedScopes` **counts** the dropped entries, **flags** them in state
(`extractedScopesPartial`) and **warns in dev**. This path does none of the three. Phone-parity
(the phone gates on `cameraCount` from the same GeoJSON projection), and the blast radius is small
because no demo surface states a contradicting total on the map screen — hence LOW.

**Fix:** return the dropped count alongside the markers (or count it at the call site) and use it
in the toggle's label/aria — e.g. `Show cameras (2 of 5)` — or, at minimum, a dev-only
`console.warn` naming the location and the omitted count, matching `generateExtractedScopes`.

---

## Checked and cleared (no finding)

- **`expandCluster`'s `onError` → `console.warn`** (`MapCanvas.tsx:322`, `mapCluster.ts:158-175`).
  A failed lookup leaves the cluster tap a no-op with no visitor signal, but I could not construct
  a reachable trigger: the index rebuild (`MapCanvas.tsx:332-338`) and the re-plot
  (`:342-345`) run in the same commit, so a stale `clusterId` can never be attached to a live DOM
  element, and `moveend` always reads the current index. The `try/catch` + `Number.isFinite` guard
  is a correct fail-safe port, not a swallow. Fails the lane's "name the adversarial input" gate.
- **`normalizeBbox` → `WORLD_BBOX`** on non-finite bounds, and `viewportBbox`/`currentZoom`'s
  `catch` fallbacks (`MapCanvas.tsx:152-172`). All degrade in the safe direction ("cluster
  everything" rather than "plot nothing"), are commented, and are unreachable on a real map.
- **`renderMarkers`'s `index ? … : markers`** (`MapCanvas.tsx:290-293`). Plots unclustered before
  the index exists; the only window is a pan during the loading cover, and the `ready` effect
  re-plots immediately. Self-healing, cosmetic.
- **Cameras bypassing the proximity radius** (`mapProximity.ts:35-45`). Deliberate, documented in
  the module header, phone-verbatim, and structural rather than a branch.
- **Stale-write safety across a case switch** (`MapScreen.tsx:139-153`). The reset effect clears
  proximity/filters/selection, and a late `setProximityModule` can only re-derive from current
  state — the memo re-reads `proximityActive`/`proximityCenter`, so nothing stale is written.
- **Ring teardown** (`MapCanvas.tsx:349-376`, `:479-485`). `removeRingLayers` tolerates any subset
  already gone; `map.remove()` covers unmount and Retry; the `attempt` bump rebuilds source and
  layers on the fresh map.
- **The absent-token placeholder** (`MapCanvas.tsx:432-441`) — the repo's model honest degradation,
  names the missing variable. Untouched by this diff.
- **`selectItem`'s `if (!item) return`** and the other store-style guard arms — established
  defensive style on internally-triggered paths.

## Lane summary

```
Fallback honesty (every substitution announced): no  — S-2 (control asserts ON with no module),
                                                       S-3 (filter-empty presented as data-empty),
                                                       S-6 (undisclosed synthetic anchor)
Failure-cause distinctions preserved:            collapsed — S-4 (auth/401/429/context-loss → "transient")
Partial results flagged (not silently short):    no  — S-7 (cameras dropped, uncounted, unflagged)
Async cancellation / stale-write safety:         yes — case-switch reset and the memo re-read are sound
Operator breadcrumbs intact:                     gap found — S-1 and S-2 log nothing at all
                                                 (no prior breadcrumb was removed)
```

**Verdict: REVISE.** S-1 and S-2 are the same defect in two places — a lazy `import()` whose
rejection has no catch, no state change and no log — and both have a directly applicable in-repo
precedent (`ocr-recognize.ts`'s un-poisoning catch, `app/demo/error.tsx`'s R-31 ChunkLoadError
warn). S-3 is a copy/wiring seam this diff opened: the sheet's empty sentence was true when only
data could empty it, and P6 gave the visitor three ways to empty it with a filter.

---

# Fix-delta r1

**Diff verified:** `b0381b7..fcfe774` (20 commits on `parity/p6-fix-map`).
**Method:** re-ran each original repro against the merged fix head as a throwaway vitest file, then
deleted it — nothing committed. `mapbox-gl@3.25.0` and `supercluster@8.0.1` were re-read at source
to judge the two classification claims the fixes rest on. Targeted suites only; the orchestrator's
merged-head gate is authoritative for the full run.

| Original | Fix | Disposition |
|---|---|---|
| S-1 major — map-boot chunk failure blank forever | R-3 `f7d5af3` | **FIXED** |
| S-2 major — poisoned proximity chunk | R-2 `819f0d0` | **FIXED** |
| S-3 major — filter-empty presented as data-empty | R-6 `e6b3d1b` | **FIXED** (one LOW residual, D-1) |
| S-4 minor — post-load terminal causes swallowed | R-11 `a01f870` | **FIXED for the proven half**; context-loss arm is dead code (D-2) |
| S-5 minor — stray long-press activates proximity | R-5 `720a988` | **FIXED** |
| S-6 minor — undisclosed synthetic proximity anchor | R-18 `3281e44` | **FIXED** |
| S-7 minor — cameras dropped uncounted | R-19 `cab59d4` | **FIXED** |

New this round: **0 blocker · 0 major · 0 minor(MEDIUM) · 2 minor(LOW)**.

---

## Verification detail

### S-1 → FIXED (`MapCanvas.tsx:299-359`)

The whole path to a live `Map` is now inside `try`, and the catch warns then `setFailure('engine')`.
A second, genuinely different sentence was added (`MAP_ENGINE_ERROR`, `:147`) rather than reusing
the style/tile copy — the `'engine' | 'style'` discriminant keeps the two causes distinguishable at
the overlay, which is more than I asked for. Re-ran the ChunkLoadError repro:

```
OVERLAY COPY: "The map engine couldn't load." + Retry     RETRY?: true     role: alert
WARNS: ['[demo/map] the map engine failed to load — showing the retry overlay:']
```

Previously all three were absent. The malformed-token constructor throw lands in the same catch
(the constructor is inside the try), so that variant is closed too. `if (mounted) setFailure(...)`
keeps the unmount case clean; the warn fires either way, which is the right side to err on.

### S-2 → FIXED (`MapScreen.tsx:133-160`)

All three parts landed, and the un-poisoning is real rather than nominal. Re-ran with an
import-counting mock:

```
TOGGLE: "Proximity"   aria-pressed: false        (reverted)
NOTICE: "Proximity analysis couldn't load. Check your connection and try again."
RADIUS PRESETS?: false                            (the dead controls are gone)
WARNS: ['[demo/map] the proximity module failed to load — proximity stays off:']
IMPORT ATTEMPTS — after 1st press: 1 · after 2nd press: 2   ← ref genuinely un-poisoned
```

Ordering is safe: the optimistic `setProximityActive(true)` runs synchronously in the click
handler, the catch's revert runs in a later microtask, so the revert always wins. The chained
`.catch` returns `null` rather than re-throwing, so the memoised promise resolves and no unhandled
rejection remains. `handleLongPress` gets the same revert for free.

*Noted, not filed:* the catch has no unmount/case-switch guard, so a rejection landing after a case
switch raises the notice on a case the visitor already left. React 18 makes the setState a silent
no-op rather than a warning, the notice self-dismisses, and the statement remains true — cosmetic.

### S-3 → FIXED (`LocationList.tsx:16-60`, `MapControls.tsx:130-152,195-204`, `MapScreen.tsx:205-217`)

`SheetEmptyReason` is a three-member discriminated union with distinct copy, a `data-empty-reason`
hook, and a **Clear filters** affordance in the sheet itself. The count badge's gate moved from
`locationCount > 0` to `totalCount > 0` (pre-filter), so the pill survives a zero-match filter and
reads `No locations match` — and it gained `role="status"`, so the change is announced. Re-ran the
original repro (three geocoded locations, no incident coordinates):

```
REASON: filters   COPY: "No locations match your filters." + [Clear filters]
BADGE: "No locations match"   role: status
```

Previously: `"0 Locations"` + `"No located locations yet — add an address…"` with the badge gone.

**The no-incident fixture reasoning is correct.** The incident is exempt from status/text filters
(`mapFilters.ts:60`), so with a plotted incident `filtered.items` is never empty from those two
predicates — the sheet keeps the incident row and never reaches an empty state at all. The
`'filters'` branch is therefore reachable only on a case without plottable incident coordinates,
which is the fixture used. The complementary case (filters remove every location, incident
survives) is also handled honestly: the sheet shows the incident row while the badge reads
`No locations match`, because `locationCount` counts locations only.

The `emptyReason` ladder's inner-to-outer ordering is right — status/text is checked before
proximity, so when both would empty the sheet the stage that actually did it is named.

### S-4 → FIXED for the proven half; one dead arm (D-2)

`isTerminalMapError` (`MapCanvas.tsx:169-176`) escalates on status 401/403/429 and on an
access-token message; everything else keeps the warn-and-ignore, whose log line correctly dropped
the word "transient". Verified in isolation:

```
baseline overlay: false
after 'Failed to fetch tile'  → overlay: false · warn '[demo/map] mapbox error ignored after load:'
after revokeAuth message      → overlay: true  · console.error '[demo/map] mapbox reported a terminal error after load:'
classification: 401 T · 403 T · 429 T · 404 F · revokeAuth-message T · 'Failed to fetch' F · null F · string F
```

Escalation uses `console.error` and non-terminal keeps `console.warn`, which is the right severity
split. See D-2 for the residual.

### S-5 → FIXED (`MapCanvas.tsx:555-580`)

Both disclosed edges are closed, and the fix went past what I proposed: `if (!event.isPrimary)
return` kills the multi-touch wrong-fire, and `target?.closest?.('[data-marker-id], .mapboxgl-ctrl')`
kills the marker-hold *and* mapbox's own controls. `cancelLongPress()` runs before both returns, so
a secondary contact also disarms the primary's pending timer. The comment now states the real
consequence (activation at the 1 km default, dropping every other location), so §72e's understated
wording is corrected at the code.

### S-6 → FIXED (`MapScreen.tsx:36-42,289-299`)

`PROXIMITY_CENTRED_ON_VIEW` fires only on the derived-anchor arms — an anchor taken from a visible
sheet row stays silent, which is the correct split. `FALLBACK_CENTER` was folded into the shared
`DEFAULT_MAP_CENTER`, so the map's default centre and the anchor fallback can no longer drift
apart. Verified on a case with nothing plottable:

```
ANCHOR NOTICE: "Proximity centred on the current view — long-press the map to move it."
```

Honest: a map is on screen and that *is* its view. Fires once per centre-less activation (the
guard is `if (!proximityCenter)`), so it does not nag.

### S-7 → FIXED (`mapData.ts:80-88,238`, `LocationDetailCard.tsx:65-73,169-190`)

`cameraTotal` now rides on `LocationSheetItem`, the toggle reads `Show cameras (2 of 5)` via
`cameraCountLabel`, and the aria-label appends `(3 without a GPS fix)`. The partial result is
counted and stated — the `generateExtractedScopes` standard I cited. Markers, visible count and
toggle still all read the one gated array, so nothing can disagree.

---

## New findings

### D-1 — [minor (LOW)] A search term on a case with nothing plottable blames the filters

**File:** `features/demo/ui/screens/map/MapScreen.tsx:210-217`

```ts
      : activeFilterCount > 0 && filtered.items.length === 0
        ? 'filters'
```

**Sequence:** open a case whose locations are all typed-without-a-pick (nothing plottable — the
honest `'no-data'` state, correctly shown on arrival), then type anything into the search box.

**Observable — proven:**

```
EMPTY-CASE baseline reason: no-data
EMPTY-CASE + search → REASON: filters  COPY: "No locations match your filters." + [Clear filters]
EMPTY-CASE badge present?: false   (totalCount === 0, correctly)
```

The sheet now blames a filter for an emptiness the data caused, and offers a Clear-filters button
that returns the visitor to the true answer — so the misattribution is self-correcting and no data
is misrepresented, hence LOW rather than a repeat of S-3. But it is the same class of statement:
the copy names a cause that isn't the cause.

**Fix:** one clause — the derivation already computes `totalCount`; require it.
`: totalCount > 0 && activeFilterCount > 0 && filtered.items.length === 0 ? 'filters'`.

### D-2 — [minor (LOW)] `isTerminalMapError`'s context-loss arm is unreachable, and the comment asserts it is covered

**File:** `features/demo/ui/screens/map/MapCanvas.tsx:156-176` (the regex at `:175`, the claim at
`:162-163`)

```ts
  return /access token|context lost|contextlost/i.test(message)
```

with the doc comment stating "`AJAXError` 401/403/429 **and WebGL context loss** do the same
[land in the ignored arm]".

**Verified at source (`mapbox-gl@3.25.0`):** context loss does not reach this handler at all.
`Map._contextLost` fires its own event, not an error event —

```js
_contextLost(event) { event.preventDefault(); … this.fire(new Event("webglcontextlost", {originalEvent: event})); }
```

and `MapCanvas` subscribes to exactly `load` / `error` / `moveend` (confirmed by enumerating the
mock's registrations). So the `context lost` alternation can only ever match if some *other*
mapbox error happens to contain that phrase — it is dead with respect to the stated cause.

**Consequence:** a lost WebGL context (GPU driver reset, a backgrounded tab reclaimed on a
low-memory device, a `WEBGL_lose_context` extension call) blanks the map with **no overlay, no
Retry and no breadcrumb** — the exact shape of the original S-4 finding, for the one cause the fix
claims to have covered. mapbox auto-restores via `webglcontextrestored` when the browser restores
the context, but restoration is not guaranteed. Filed LOW rather than MEDIUM because it is rarer
than the token/rate-limit causes the fix genuinely closed, and because the fix left the map in no
worse a state than before.

**Fix:** subscribe to the real event next to the existing three —
`map.on('webglcontextlost', …)` → `console.error` + `setFailure('style')`, and
`map.on('webglcontextrestored', …)` → clear it. Then drop the `context lost` alternation from
`isTerminalMapError` and the corresponding clause from the comment, so the classifier's stated
scope matches what it can actually see. (Minor, same fix: a *post-load* terminal error currently
renders `MAP_LOAD_ERROR` — "Failed to load the map." — for a map that did load and then died.
A third discriminant, or a small copy tweak, would close that.)

---

## Fix-introduced swallows — hunted, none found

- **The new `try/catch` in `MapCanvas`** — scope is exactly "everything up to a live `Map`". No
  post-`load` code is inside it, so it cannot mask a render/plot error; `if (mounted)` guards the
  setState; the warn is deliberately un-guarded.
- **The new `.catch` in `loadProximity`** — nulls the ref *after* the outer assignment (evaluation
  order verified), returns `null` instead of re-throwing so nothing is left unhandled, and every
  consumer already treats the module as nullable (`proximityResult` gates on `proximityModule`).
- **§79a `getScaledPoint` port (`toContainerPoint`, `:224-232`)** — checked against mapbox's own
  implementation at source: `const scaling = el.offsetWidth === rect.width ? 1 : el.offsetWidth /
  rect.width`, applied to both axes. Same formula. The port's extra `rect.width > 0 &&
  container.offsetWidth > 0` guard is *stricter* than mapbox's, which would yield `Infinity`/`NaN`
  on a zero-width rect and push a `NaN` coordinate into `unproject`. Zero-scale and detached-node
  cases both fall back to scaling `1`, which is the identity — the correct answer when there is no
  transform — and neither state can produce a pointer event on a live container anyway. No
  finding; a genuine hardening.
- **`normalizeBbox` losing its clamp (R-25)** — the refutation is right, verified in the installed
  `supercluster@8.0.1`: `getClusters` normalises longitude with `((lng+180)%360+360)%360-180`,
  clamps latitude to ±90, short-circuits `>= 360`, and **splits the query across hemispheres**
  when `minLng > maxLng`. The removed clamp was discarding the wrapped slice. Removing it plots
  *more*, not less.
- **`narrowProjection` replacing three hand-rolled derivations** — behaviour-identical for
  `applyMapFilters`: the incident passes both predicates unconditionally (`mapFilters.ts:60`,
  `:68`), so deriving `incident` from the surviving rows equals carrying it through, and now pins
  cannot drift from rows.
- **`'cluster' in props` replacing the cast + `?? 0`** — supercluster always sets `point_count` on
  cluster features and never sets `cluster` on leaf props, so the removed fallback was
  unreachable; the discriminant is sound.
- **`EMPTY_MAP_FILTERS` / `WORLD_BBOX` freezing** — ESM is strict mode, so an accidental mutation
  now throws rather than silently no-opping. Right direction.
- **`aria-hidden` on location/incident pins** — a11y-lane territory; no silent-failure
  consequence (the pins carry no tabindex, and `onPointerDown`'s `closest('[data-marker-id]')`
  guard is unaffected).

## Fix-delta summary

```
Fallback honesty (every substitution announced): yes — S-2/S-3/S-6 all now announce
Failure-cause distinctions preserved:            yes for the reachable causes — one dead arm (D-2)
Partial results flagged (not silently short):    yes — cameraTotal + "2 of 5"
Async cancellation / stale-write safety:         yes
Operator breadcrumbs intact:                     yes — both missing breadcrumbs added, severity split correct
```

**Fix-delta verdict: APPROVE.** All three majors and both mediums are genuinely closed, verified
by re-running the original reproductions rather than by reading the fix commits. The two new items
are LOW: a self-correcting empty-state misattribution (D-1, one clause) and a classifier arm that
cannot fire for the cause it names (D-2, one `map.on`). Neither blocks merge.
