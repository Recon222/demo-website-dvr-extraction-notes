# P5 — lane: silent failures

**PR:** #34 `master..feat/parity-p5` — Export surfaces (engine port, 4th tab, modals, real case-map download)
**Lane:** silent-failure-hunter (initial pass)
**Read first:** PR #34 body (DO-NOT-RE-FLAG list) · `docs/code-reviews/deferred.md` §§70–74 · `features/demo/CLAUDE.md`
**Verdict:** REVISE (1 HIGH, 3 MEDIUM, 4 LOW)

Everything below is traced at source against HEAD (`c01618f`). Nothing in the PR body's
"deliberate choices" list is re-flagged; where a finding touches one of those decisions it says
so and argues from that decision's own stated trigger.

> **Worktree note for the orchestrator:** mid-pass, the worktree's
> `features/demo/ui/DemoExperience.tsx` briefly carried an uncommitted mutation of `onExportPress`
> (`locationId: null`, and the subset arm dispatching `'case'`) that this lane did not make —
> almost certainly another lane's in-flight mutation probe; it was reverted before this pass
> ended. It is called out only so the fan-out knows the tree is shared and transiently dirty.
> Everything in this review was read from `git show HEAD:…`, never from a dirty file.

---

## Findings

### [HIGH] The Case Map download reports unqualified success while silently omitting every un-plotted location

**File:** `features/demo/engine/logic/case-map/geojson.ts:104-106`, `:219-222`, `:239-241` ·
`features/demo/ui/DemoExperience.tsx:295-298`, `:1299-1306`

**Code:**
```ts
// geojson.ts:104-106 — dropped, uncounted, unflagged
export function locationToFeature(location: DemoLocation): GeoJSONFeature | null {
  if (!hasCapturedCoordinates(location.gps)) return null
// geojson.ts:219-222
  for (const location of locations) { const f = locationToFeature(location); if (f) features.push(f) }
// geojson.ts:239-241 — "is ANY non-camera feature present", incident included
  return collection.features.some((f) => f.properties.featureType !== 'camera')
// DemoExperience.tsx:295-298 — the only two caveats the banner can carry
  'Success — Case Map exported successfully.' +
  (hasSites ? '' : ' No location has coordinates yet, so it opens with an empty map.') +
  (hasToken ? '' : ' Without a Mapbox token its basemap stays blank.')
```

**Adversarial input / sequence:** a case with three recovery locations where only some were
geocoded. This is not exotic — it is the demo's *normal* mixed state: `AddressAutocomplete`
degrades to a plain text input without `NEXT_PUBLIC_MAPBOX_TOKEN` (a supported state, §71f), and
`forwardGeocode` is non-blocking by contract, returning `null` on no-match while the location is
still created. Any location that reached the store by typing rather than picking has no
`gps`, so `locationToFeature` returns `null` for it.

**Observable wrong behavior:** verified with a probe test against HEAD — a case with 1 plotted
and 2 un-plotted locations exports, and the banner reads exactly
`Success — Case Map exported successfully.` with no qualification. The downloaded HTML's
`#case-geojson` carries one `location` feature. The visitor is handed a file that is missing
two-thirds of their case, is told nothing, and there is no `console.warn` either. The map is the
one artifact of this PR the visitor actually keeps and can forward.

The second half of the same gap: `hasPlottableFeatures` counts the **incident** feature, so the
"No location has coordinates yet…" caveat is suppressed the moment a case has incident
coordinates — even when *zero* locations plotted. That is not a hypothetical: the shipped test
`features/demo/ui/__tests__/DemoExperience.case-map-export.test.tsx:124-133` ("does not cry empty
over an incident-only case") **pins** the silence, and its own fixture has a real recovery
location, `Front Counter`, that is absent from the exported file with no notice. The predicate
and the copy disagree — the copy says "no location has coordinates", the predicate asks "is
anything at all plottable".

**Why this is the repo's own bar, not a new demand:** `generateExtractedScopes` is the model
citizen the lane brief names — skip per entry, **count** it (`dropped`), **flag** it in state
(`extractedScopesPartial`) so the document can annotate rather than silently omit, and dev-warn.
And P5.4's own author already committed to this standard in the notice's doc comment
(`DemoExperience.tsx:292-293`): *"the person who clicked is the person who walks away with the
file, so anything true about it that they cannot see from the banner has to be on the banner."*
Two truths made it onto the banner; the third — the one about missing evidence — did not.

**Not CRITICAL because:** the omission is of the visitor's own data, the map itself is honest
about what it contains, and the phone drops the same rows. It is HIGH because a forensic-style
artifact leaves with content silently short and the success line asserts completion.

**Fix:** have `buildCaseMapGeoJson` return (or a sibling predicate compute) the dropped counts —
`locationsDropped` / `camerasDropped` — and add the third clause to `caseMapExportedNotice`:
`N of M locations have no coordinates yet and are not on the map.` Re-gate the existing "opens
with an empty map" clause on *location* features rather than `hasPlottableFeatures` (keep
`hasPlottableFeatures` for its actual §71g purpose). Dev-warn alongside, per the
`generateExtractedScopes` shape.

---

### [MEDIUM] `saveTextFile` returns `ok: true` for a click the browser silently ignored, and the notice states the download as fact

**File:** `features/demo/ui/inputs/download-file.ts:48-61`, `:91-109` ·
`features/demo/ui/DemoExperience.tsx:295-296`

**Code:**
```ts
// download-file.ts:56-60 — the only route to `failed` is a THROW
try { anchor.click() } finally { anchor.remove() }
// :100-105
url = registry.create(io.toBlob(input.content, input.mimeType))
io.clickDownloadAnchor(url, input.filename)
return { ok: true, filename: input.filename }
```

**Adversarial input / sequence:** any browser condition that drops a programmatic download
without raising — Chrome's per-origin *Automatic downloads* content setting set to Block (or its
multiple-download heuristic, which F3 below makes easy to trip), a download-blocking extension,
or transient activation lost while the ~92 kB case-map chunk is fetched over a slow link. None
of those throw; `anchor.click()` returns normally.

**Observable wrong behavior:** no file lands, nothing is logged, and the banner says
`Success — Case Map exported successfully.` The module's own doc claims the two outcomes are
distinguishable — *"`unavailable` = this environment cannot save files at all. `failed` = it can,
and the attempt did not work"* — but `failed` is reachable only through an exception, so the
largest class of real-world "it did not work" lands in the `ok: true` arm. `readBrowserDownloadIo`
returns non-null in every one of those browsers, so `unavailable` does not cover it either.

This is exactly the evaluation deferred §70d's trigger asked P5.4 to make: *"P5.4's real case-map
download may want the phone's 'Export Complete (Not Shared)' shape **if a browser download can
genuinely fail silently**; evaluate then, against a real failure."* It can, and the shipped copy
is the unconditional phone success string, whose truth on the phone rests on a filesystem write
that returned.

**Fix:** the browser gives no signal, so detection is not the fix — the copy is. Stop asserting
the file landed: `Case Map exported — check your browser's downloads.` (or adopt the phone's
success-with-caveat shape §70d names). Keep `ok: true`; change what it lets the demo claim.

---

### [MEDIUM] `Export Map` has no re-entry guard — the phone's handler opens with one

**File:** `features/demo/ui/DemoExperience.tsx:1260-1308` ·
`features/demo/ui/screens/map/LocationList.tsx` (`ExportMapFooter`, no `disabled`)

**Code:**
```ts
const exportCaseMap = () => {
  const target = store.getState().cases.find((c) => c.id === mapViewerCaseId) ?? null
  if (!target) { setNotice(NO_CASE_SELECTED_NOTICE); return }
  void (async () => { … caseMap = await import(…) … saveTextFile(…) … })()
}
```
Phone, first line of `handleExportCaseMap` (`src/hooks/useExportFlow.ts:915`):
`if (isExporting || pendingExportType) return`.

**Adversarial input / sequence:** press Export Map; the first observable effect is behind a
network fetch for the lazy chunk, so nothing happens for a beat; press again. Verified against
HEAD: three presses produce **three** builds, three object URLs, three anchor clicks and three
`Success` notices. The button is never disabled, and `exportCaseMap` is the one export entry
point in the file that does not route through `requestExportFlow` — so §74b's strengthened guard
(`DemoExperience.tsx:2041`) does not cover it.

**Observable wrong behavior:** in a real browser the second and third downloads trip Chrome's
"site wants to download multiple files" prompt; blocked or dismissed, they vanish with no error —
and per the finding above each still reports `Success`. Two of the three files the visitor was
told they have do not exist. Compounding: `setNotice` is called with an identical string, so
React bails on the state write and the second/third outcomes are never separately announced.

**Fix:** an in-flight ref set before the `void (async …)` and cleared in a `finally`; early-return
on it, and thread it down as `disabled` on the footer button (the phone's own shape).

---

### [MEDIUM] The Case Map's three outcomes go to the 2.6 s auto-dismissing banner; the phone uses a blocking alert and D4's rule is the blocking dialog

**File:** `features/demo/ui/DemoExperience.tsx:1269`, `:1281`, `:1299-1306` ·
`features/demo/ui/screens/map/DemoNotification.tsx:47` (`durationMs = 2600`)

**Code:** all three arms — `NO_CASE_SELECTED_NOTICE`, `CASE_MAP_MODULE_FAILED_NOTICE`,
`CASE_MAP_EXPORT_FAILED_NOTICE` / success — call `setNotice(...)`, which renders
`<DemoNotification>` and self-dismisses after 2600 ms. The phone's counterparts are
`Alert.alert('Success' | 'Export Error', …, [{ text: 'OK' }])` (`useExportFlow.ts:296-305`) —
blocking, acknowledged.

**Adversarial input / sequence:** offline, or a deploy rotated the chunk hash under an open tab.
The visitor presses Export Map, the chunk request hangs for however long the network takes to
fail, and the *entire* notification of "nothing was saved" is a 2.6 s banner that appears at an
unpredictable moment after the press — precisely the moment a visitor is most likely to have
looked away, because nothing had happened yet.

**Observable wrong behavior:** the failure is genuinely surfaced (the ladder is real and pinned —
`DemoExperience.case-map-chunk.test.tsx` verifies notice + `console.warn` + zero anchor clicks),
but it can time out unread, after which the visitor's only remaining evidence is a button they
pressed and a Downloads folder they will go looking in. Every ZIP pipeline in this PR correctly
uses the blocking `AlertDialog` for exactly this reason (§74a: *"the one honest sentence in the
flow must not be able to time out unread"*). The single pipeline that produces — or fails to
produce — a **real file** is the one on the timing-out channel. That inversion is the finding.

**Fix:** route at least the two `Export Error` arms through `raiseExportAlert` / `setAlert`, the
same channel `describeExportTerminal` already uses. (Success is arguably fine on the banner; the
failures are not.)

---

### [LOW] The deferred object-URL revoke is `setTimeout(fn, 0)` — the same race the module exists to avoid, with a smaller window

**File:** `features/demo/ui/inputs/download-file.ts:62-64`, `:106-108`

**Code:**
```ts
defer: (fn) => { setTimeout(fn, 0) },
…
} finally { if (url !== null) io.defer(() => registry.revokeAll()) }
```

The interface's own doc: *"Revoking an object URL in the same tick as the click cancels the
download outright in some browsers, and a download that silently never lands is the exact failure
this feature exists to avoid."* A next-macrotask revoke is the same race with a shorter fuse —
the browser must have taken ownership of the blob within one task. The ecosystem's settled answer
(FileSaver.js) is tens of seconds, not zero. If it does fire early the download silently never
lands and `saveTextFile` has already returned `ok: true` (see the MEDIUM above), so nothing
anywhere records it.

**Fix:** widen the delay (e.g. `setTimeout(fn, 40_000)`) or sweep on `pagehide`. The registry
already makes the sweep safe either way.

---

### [LOW] `startExportRun`'s `case-map` arm still renders P5.3's interim "not wired to this button yet. Nothing was generated."

**File:** `features/demo/ui/screens/exportNotices.ts:67-73` ·
`features/demo/ui/DemoExperience.tsx:1967-1975` (`// SEAM(P5.4): real case-map download lands here`)

**Code:**
```ts
// exportNotices.ts:71-72
`That one IS reproducible here and is being built; it just is not wired to this button yet. Nothing was generated.`
```

P5.4 merged into this same PR and the PR body states *"the case-map dispatch arm in the flow
awaits P5.4's builder (same PR — wired)"*. It is not wired: `startExportRun` still routes
`case-map` to `exportTerminalAlert`, the `SEAM(P5.4)` marker is untouched, and
`exportNotices.test.ts:84` still pins the interim string. No caller dispatches
`{ type: 'case-map' }` through `requestExportFlow` today (the map's Export Map is a separate
handler, §71h/§74f), so the arm is unreachable dead copy — **not** a live lie. It becomes one the
instant P6 or the Export tab routes Export Map through the flow: a visitor would be told nothing
was generated by a builder that now works, on the one export D4 says the browser can do for real.

**Fix:** either dispatch the real builder from that arm and re-point the notice, or close the seam
in the other direction — delete the "is being built / not wired yet" sentence, state in §74f that
the map-sheet footer is the artifact's only entry point, and make the arm say the map was not
generated *by this path*.

---

### [LOW] `runExportValidation`'s catch has no operator breadcrumb, and a non-`Error` throw renders as the visitor-facing body

**File:** `features/demo/ui/DemoExperience.tsx:2012-2019`

**Code:**
```ts
} catch (e) {
  const failed = failValidation(exportFlowRef.current, e instanceof Error ? e.message : String(e))
  setExportFlow(failed.state); raiseExportAlert(failed.alert); return
}
```

Answering the brief's question directly: `CaseValidationError` is effectively the only *intended*
throwable — the empty-subset case is pre-blocked in `requestExport` (`flow.ts:228-230`) and the
foreign-id case is pruned every render (§73d) — but the catch is untyped, so any `TypeError` from
a future refactor lands in the same "Validation Error" dialog wearing its raw `.message`, and a
non-`Error` throw renders `String(e)` (`[object Object]`) as the dialog body. Either way the
operator gets **nothing**: the phone logs first (`useExportFlow.ts:697-701`,
`logError(..., { context: 'useExportFlow-validation' })`), and this repo's convention is a
console breadcrumb (`extract-client.ts`, `geocode.ts`, and this PR's own
`download-file.ts:104` / `DemoExperience.tsx:1280`). This is the one export catch without one.

**Fix:** `console.warn('[demo/export] validation threw — no export was started:', e)` in the catch.

---

### [LOW] `pdfPassFor` falls through to `return []` instead of `assertNever`

**File:** `features/demo/ui/DemoExperience.tsx:1899-1918`

Every other branch point in this flow ends in `assertNever` (`requestExport`,
`describeExportTerminal`, `selectExportScope`, `resolveExportPlan`). `pdfPassFor` ends in a bare
`return []`. A future `ExportType` member would break the build in the two exhaustive switches but
would silently reach `runZipPipeline` with a zero-PDF pass here — a run that plays a plausible
`validating → zipping` pipeline and prints a terminal notice for an artifact no pass was written
for. The two types that legitimately never reach this function are already early-returned by
`startExportRun:1967`, so nothing prevents the guard.

**Fix:** `return assertNever(run)` on the residual arm, with `run` narrowed to the three ZIP types.

---

## Verified clean (no finding — recorded so the next pass does not re-derive it)

- **The exported artifact's injection points are fully covered.** Both
  `<script type="application/json">` bodies go through `encodeJsonForScriptTag`
  (`case-map/build.ts:63-65`), whose `.replace(/</g, …)` rewrites every `<` to its six-character
  JSON unicode escape. Since HTML script-data can only be
  terminated by `</script` (and only `<!--` enters the escaped state), escaping every `<` closes
  the tokenizer route completely — the phone's blank-map trap (`case-map.app.js`'s bare
  `catch (e) {}` → `if (!gj) gj = { type: 'FeatureCollection', features: [] }`, template lines
  817-820) is genuinely unreachable from visitor-typed data. `__CASE_TITLE__` goes through
  `escapeHtml` (`pdf/shared.ts:5-7`, covers `& < > "`) into `<title>`. The **only** raw
  substitution left is `__MAPBOX_TOKEN__` into a JS string literal
  (`var TOKEN = '__MAPBOX_TOKEN__'`): a token containing `'` would break the whole app script and
  produce a blank map under a `Success` banner. Operator-controlled env var, phone-identical —
  worth one `JSON.stringify`-shaped escape whenever that file is next touched, not a finding.
- **The sample-data `<script src="assets/case-map.data.js">` really is gone** from the generated
  template (the only surviving `<script src>` is the Mapbox CDN). Worth noting that §71c.1
  undersells its own fix: the strip is not just a 404, it is what stops the exported map's
  `if (!gj && window.SAMPLE_CASE)` fallback (template line 819) from ever rendering a **fictional
  case** as the visitor's — the single worst outcome this codebase's honesty rule names.
- **`exportTimer` lifecycle.** Cleared on unmount (`DemoExperience.tsx:767-769`), cleared
  defensively before every new pipeline (`:1938`), nulled at completion (`:1952`). No path leaves
  two pipelines ticking into one state, and no `setState` survives unmount.
- **No stale-write path in the ZIP pipeline.** The ref/state pair (`:745-750`) means every tick
  and every CTA press reads the live machine value; the entry guard plus §74b's
  `showValidationModal` term (`:2041`) makes a second dispatch inert on every path that goes
  through `requestExportFlow`. The one export entry point that bypasses it is `exportCaseMap` —
  filed as the MEDIUM above.
- **The `pdfPass === null` arm is honest.** A run whose case or location has vanished resets the
  flow and raises `caseUnavailable` rather than running a zero-location pipeline
  (`:1977-1982`), and the same backstop guards the validator's own entity read (`:1999-2004`).
  Pinned by `DemoExperience.export.test.tsx:399`.
- **The ZIP pipelines' terminal is the blocking dialog**, per §74a, and `describeExportTerminal`
  is exhaustive over `ExportRun` — no fallback-cause collapse, no auto-dismiss.
- **Selection pruning** (`selection.ts:141-160`) cannot leave a tickable row pointing at a deleted
  location, and `armedFullCase` correctly demotes rather than silently promoting a partial
  selection to the canonical artifact.

## Not re-flagged (PR body / deferred §§70–74)

Ephemeral selection + flow state (§70a); the blocking-terminal placement and its
forward-looking artifact strings (§70k/§74a); PasswordModal and the `sharing` stage (§70c/§70l);
`pdfPassFor` re-deriving rather than reading `validationResult` (§74d); no media in the case map
(§71a); no loading/error/pagination on the hub (§73a); Clear ungated during a run (§73g);
`EXPORT_STEP_MS` as the one fabricated quantity (§74k); a running pipeline following the visitor
across screens and the `view !== 'completion'` alert sweep clearing a standing terminal (§74j).

---

## Silent Failure Hunter Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 3 |
| LOW | 4 |

Fallback honesty (every substitution announced): **yes** — no fictional or substituted data reaches the visitor anywhere in this diff; the sample-case fallback in the exported map is structurally unreachable.
Failure-cause distinctions preserved: **yes** for the chunk-load vs save-refused vs no-case split (three distinct strings, two with breadcrumbs); **collapsed** for "browser silently dropped the download" vs "download landed", which both read `ok: true` → `Success`.
Partial results flagged (not silently short): **no** — the Case Map drops un-plotted locations uncounted and unflagged (HIGH).
Async cancellation / stale-write safety: **yes** for the ZIP flow; **gap found** at `exportCaseMap`, which has no re-entry guard at all (MEDIUM).
Operator breadcrumbs intact: **yes** — none removed; two gaps where the convention would add one (`runExportValidation`'s catch; the partial-omission drop).

**Verdict: REVISE**
