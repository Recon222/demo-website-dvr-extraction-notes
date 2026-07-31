# Lane: type-design — phase review `p4` (PR #33) — INITIAL PASS

**Mode:** INITIAL — first pass over the full PR.
**Diff under review:** `git diff master..feat/parity-p4` (92 files, +15738 −118), worktree `scratchpad/worktrees/parity-p4` @ `df87a18`.
**Refs read before flagging:** `.claude/agents/type-design-analyzer.md` · PR #33 body (deliberate-choices list) · `docs/code-reviews/deferred.md` §§4, 5, 16, 27, 58–64 · `features/demo/CLAUDE.md` · the snapshot-guard header + R-30 note in `engine/store/persistence.ts`.
**Pre-flight:** `npx tsc --noEmit` → **clean, exit 0**.
**Probes:** six compile probes run in a temp module + one destructive-then-reverted probe on `OcrProof` (results inline below). All probe files removed.

**Verdict: REVISE — 0 blocker · 2 major · 5 minor · 1 nit.**

Both majors are the same species and neither is a behaviour the PR chose: a type that *almost* expresses its invariant, with the last step left to a comment. The capability object collapses an operation-dependent question into an operation-blind boolean and its two consumers then disagree; the OCR proof re-declares a persisted domain entity at the one write site the snapshot guard cannot see. Everything else is minor.

**What is clean and deliberately not flagged** — the §58 snapshot-guard work, `RecorderMode`, `SaveState`, the failure taxonomy, and the id-space typing are all at or above this repo's own bar. Detail in *Checked and clean*, below.

---

## Shared-worktree note

Throughout this pass `git status` in this worktree kept showing modifications this lane did not make
— first `AudioRecordingFlow.tsx` (the §61g `if (result !== null) capture.close()` guard removed),
later `MediaCaptureScreen.tsx` + `OcrCaptureScreen.tsx`, with the first reverting itself in between.
That is the signature of a concurrent lane running mutation probes in the same worktree. They were
left untouched rather than reverted — clobbering another agent's in-flight probe is worse than a
dirty tree. It does not affect any finding here: every probe below reported errors *only* in the
files it targeted, and the baseline `tsc --noEmit` was clean. This lane's own probe files were all
removed; the only artefact it leaves is `docs/code-reviews/parity/p4/`.

---

## TYPE-DESIGN-1 — **MAJOR** — `CaptureCapability` answers a per-operation question with an operation-blind boolean, and its two consumers disagree

**Type:** `CaptureCapability` — `features/demo/ui/inputs/useMediaCapture.ts:67-76`
**Construction site:** `features/demo/ui/inputs/useMediaCapture.ts:234-238` (the single producer)

```ts
export interface CaptureCapability {
  stream: boolean       // a live preview can be opened
  record: boolean       // video/audio can be recorded (needs MediaRecorder)
  objectUrls: boolean   // captured bytes can be turned into a viewable URL
  sampleOnly: boolean   // nothing live is possible — the bundled sample is the only way forward
}
// useMediaCapture.ts:237
return { stream, record: stream && recorderIo !== null, objectUrls, sampleOnly: !stream || !objectUrls }
```

### Permitted invalid states

Three, all representable and all compile-clean (probe E: an incoherent literal assigns with no error):

1. `{ stream: false, record: true, … }` — recording without a stream. `record` is *computed* as
   `stream && recorderIo !== null`, so the implication `record ⇒ stream` is real and unexpressed.
2. `{ stream: true, objectUrls: true, sampleOnly: true }` — `sampleOnly` is a **pure function of two
   siblings** stored beside them. That is the drift surface `ScopeRetention` deliberately avoids
   ("`status` is intentionally NOT stored — derive it at the render site so the two can't drift").
3. **The one that is live today:** `{ stream: true, record: false, objectUrls: true, sampleOnly: false }`.
   `sampleOnly`'s derivation omits `record` entirely, so it is the answer for a **photo** and is
   consumed as though it were the answer for everything.

### Downstream consequence — a false sentence over a live viewfinder

A browser with `getUserMedia` and `URL.createObjectURL` but no `MediaRecorder` (Safari ≤ 14.0,
several hardened/embedded webviews — `readBrowserRecorder()` at `capture-media.ts:71-80` returns
`null`) produces state 3. Then, in video mode:

- `MediaCaptureScreen.tsx:348` — `permission === 'granted'`, so the **live viewfinder renders**.
- `MediaCaptureScreen.tsx:253` — `capability.sampleOnly` is `false`, so the sample path is skipped.
- `MediaCaptureScreen.tsx:263-266` — `startRecording()` →
  `capture-media.ts:355` `if (!recorder) return { ok: false, failure: captureFailure('UNSUPPORTED', facility) }`.
- `MediaCaptureScreen.tsx:417-428` renders that failure verbatim:
  **"This browser doesn't expose a camera to this page — nothing was captured."** — under a
  viewfinder showing the visitor their own face.
- `MediaCaptureScreen.tsx:462-468` → `ShutterButton` receives `sampleOnly={false}` and is therefore
  named **"Start recording"** (`:516-524`) — "a control that claims a capability it does not have",
  which is the exact thing §60g says the honesty rule forbids.

The corrected copy for this state **already exists and has no reader**: `NO_RECORDER_NOTICE.camera`
(`engine/logic/media/samples.ts:89-94` — *"This browser can open a camera but cannot record video to
a file…"*), added by P4.6 with the source comment *"keyed by facility so P4.3's video mode has the
same sentence available."* A grep for `NO_RECORDER_NOTICE` returns exactly one consumer:
`AudioRecordingFlow.tsx:223`, the microphone key.

That asymmetry is the proof this is a type problem, not a screen problem. The audio flow re-derives
the right answer by hand (`AudioRecordingFlow.tsx:146-154`, `!canStream || !canRecord → 'sample'`);
the capture screen trusts the field. Two consumers, two different meanings for "sample only",
because the type never said which operation it was talking about. Nothing is red: the Vitest world
leaves `navigator.mediaDevices` undefined, so `permission === 'unavailable' → sampleOnly === true`
and this branch is unreachable in the suite by construction.

Also worth folding in: **`objectUrls` has zero consumers** outside the derivation
(`grep 'capability\.' features/demo` returns only `sampleOnly` ×3 and `record`/`stream` ×1 each). It
exists only to feed `sampleOnly` — a member kept alive by the very field that should not be stored.

### Fix

Make the capability answer the question the callers are actually asking, rather than exposing flags
they must recombine:

```ts
export interface CaptureCapability {
  stream: boolean
  record: boolean
  objectUrls: boolean
  /** How this surface can produce a capture of `kind` right now. */
  modeFor(kind: MediaKind): 'live' | 'sample'
}
```

`modeFor('photo')` = `stream && objectUrls`; `modeFor('video' | 'audio')` additionally requires
`record`. This kills the stored derivation (the `ScopeRetention` precedent), makes the
photo-vs-video difference impossible to forget at a call site, and collapses `AudioRecordingFlow`'s
hand-rolled `!canStream || !canRecord` onto the same rule. If a function member is unwelcome on a
memoised value, the equally acceptable shape is a discriminated union per facility state
(`RetentionView`'s precedent) — the requirement is only that "can I record?" stop being answerable
by a field that was computed without consulting the recorder.

Wiring `NO_RECORDER_NOTICE.camera` into the resulting sample state is the copy half, and belongs
with whichever fix lands.

---

## TYPE-DESIGN-2 — **MAJOR** — the canonical `OcrProof` is re-declared inline at the one write site the snapshot guard cannot see

**Type:** anonymous `{ rawText: string; cleanedText: string; confidence: number; imageDataUrl?: string }` — `features/demo/ui/DemoExperience.tsx:413`
**Canonical home:** `OcrProof` — `features/demo/engine/types/index.ts:92-98`
**Write site:** `features/demo/ui/DemoExperience.tsx:1444`

```ts
// DemoExperience.tsx:413
const ocrProof = useRef<{ rawText: string; cleanedText: string; confidence: number; imageDataUrl?: string } | null>(null)
// DemoExperience.tsx:1444
st.updateField('capture.ocr', { ...ocrProof.current, parsedDateTime: ocrResult.dvrTime })
```

`updateField(path: string, value: unknown)` (`create-store.ts:267`) is string-pathed and
`unknown`-valued, so **nothing type-checks this payload** (probe H: `updateField('capture.ocr', { nonsense: 1 })`
compiles). The destination slot is `CaptureState.ocr: OcrProof | null` (`create-store.ts:144`), and
from there `calculateOffset` (`create-store.ts:725, 739`) copies it into
`TimeOffsetData.ocr?: OcrProof` — a field the whole rest of the app, the PDF template and the
persistence schema then treat as a validated `OcrProof`. The 4-field ref is the only shape
discipline on the entire path.

### The invalid state, and why the snapshot guard makes it expensive

`OcrProof` gaining a required field is a **whole-tab data wipe**, silently and without a version
number to attribute it to. Probed destructively (added `probeRequiredField: string` to `OcrProof`,
ran `tsc`, reverted):

```
persistence.ts(161,7): error TS2322: … Property 'probeRequiredField' is missing … but required in type 'OcrProof'.
persistence.ts(167,3): error TS1360: … does not satisfy the expected type 'FullShape<OcrProof>'.
```

**Two errors, both in `persistence.ts`. Zero in `DemoExperience.tsx`.** So devices 1 and 2 fire
correctly and force the *schema* author to add the field — while the *writer* keeps emitting proofs
without it. The store then holds an object the type says is an `OcrProof` and isn't;
`snapshotOf` serialises it; at the next boot `persistedStateSchema.safeParse` fails and
`loadSnapshot`'s `discard()` (`persistence.ts:443-445`) drops the entire snapshot — every case,
every location, every note the visitor built — with `SNAPSHOT_VERSION` unchanged, so it is not even
version-attributable in the way the v5→v6 comment is at pains to make widenings.

This is not hypothetical drift: **this PR performed exactly that edit**, adding `imageDataUrl?` to
`OcrProof` (`types/index.ts:97`), to `ocrProofSchema` (`persistence.ts:166`) and to this ref
(`DemoExperience.tsx:413`) by hand, in lockstep. It held because one author did all three. The
type-level guarantee that the next one must is absent.

### Fix

Two lines, no runtime change:

```ts
const ocrProof = useRef<Omit<OcrProof, 'parsedDateTime'> | null>(null)
// …
const proof: OcrProof = { ...ocrProof.current, parsedDateTime: ocrResult.dvrTime }
st.updateField('capture.ocr', proof)
```

The annotation on the commit is the load-bearing half — it is what turns a future field-add into a
compile error at the writer instead of a wipe at the next visitor's boot. (This does **not** re-file
deferred §5's typed-`updateField` item; it closes the one write site that matters most cheaply,
which is compatible with §5 landing later.)

---

## TYPE-DESIGN-3 — **MINOR** — `addMedia(kind, item)` / `deleteMedia(kind, id)`: a correlated parameter pair, given its first production callers by this PR

**Type:** `create-store.ts:304-305`

```ts
addMedia(kind: MediaKind, item: MediaItem): void
deleteMedia(kind: MediaKind, id: string): void
```

`kind` and `item.kind` are independent, and the invariant `kind === item.kind` is nowhere stated.
Probe B: `store.getState().addMedia('photo', audioItem)` **compiles**.

**Un-defer trigger fired.** `git grep addMedia master -- features` outside `create-store.ts` and the
tests returns nothing; this PR is the first production caller
(`DemoExperience.tsx:668`, `:702`, `:721`). A signature nobody used is now the seam three surfaces
write through, which is precisely when its shape becomes reviewable.

**Downstream if violated:** the item lands in `l.form.media.photos` (`create-store.ts:1070-1077`);
`mediaLibraryCounts` counts it as a photo; `mediaForTab('photos')` lists it; `rowLabel`
(`MediaLibrarySheet.tsx:476-480`) announces *"Audio: front-door.m4a"* inside the Photos tab; and the
delete path — `deleteMediaItem` at `DemoExperience.tsx:721` passes `item.kind`, i.e. `'audio'` —
filters the **audios** bucket, finds nothing, and the row is **undeletable**. A media row a visitor
cannot remove is the worst end state in this sheet.

**Nearly reachable now:** `saveAudioNote` (`DemoExperience.tsx:702`) hard-codes `'audio'` beside a
`captured: CapturedMedia` whose `kind` is the full `MediaKind` union. It is correct only because
`AudioRecordingFlow` happens to call `captureSample('audio')` and `useMediaCapture` happens to map
`facility: 'microphone'` to `'audio'` — two facts three files apart.

**Fix:** drop the redundant parameter. `addMedia(item: MediaItem)` and
`deleteMedia(item: Pick<MediaItem, 'kind' | 'id'>)`, both deriving the bucket from `item.kind`
through the existing `mediaBucket` helper (`store/helpers.ts:59-61`). Every current call site already
holds the item; the parameter carries no information the payload lacks.

---

## TYPE-DESIGN-4 — **MINOR** — `isMediaAvailable` returns `boolean`, so the v6 url-present invariant is convention at every render site (and one site re-derives it)

**Type:** `isMediaAvailable(item: MediaItem): boolean` — `engine/logic/media/captured.ts:152-154`

Probe G (the only probe that errored, which is the point):

```
probe(21,11): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
```

i.e. `if (isMediaAvailable(item)) { const u: string = item.url }` does **not** compile — the guard
that exists to express the invariant does not narrow it.

**Permitted invalid state.** `MediaContent` (`MediaLibrarySheet.tsx:374-404`) and `MediaFullscreen`
(`:312-370`) both take a bare `MediaItem` and pass `item.url` — typed `string | undefined` — straight
into `<img src>` / `<video src>` / `<audio src>`. Nothing in either signature says "only call me with
an available item". Today both call sites happen to be gated (`:270` by `isMediaAvailable`, `:281` by
`canFullscreen`), so the runtime is correct — this is a defense-in-depth gap, hence MINOR — but the
invariant lives in two `if`s rather than in the types.

**And it has already produced a third copy.** `MediaThumbnail` (`MediaLibrarySheet.tsx:599`) writes
`item.url !== undefined && item.url !== ''` by hand instead of calling the predicate. That is the
same P4.1 refresh-contract rule stated in three places (`captured.ts:153`, `MediaLibrarySheet.tsx:255`,
`MediaLibrarySheet.tsx:599`), which is exactly the drift the single-predicate design was for.

**Fix:** one word.

```ts
export type AvailableMedia = MediaItem & { url: string }
export function isMediaAvailable(item: MediaItem): item is AvailableMedia { … }
```

Then `MediaContent`/`MediaFullscreen` take `AvailableMedia`, their `src` props are `string`, and
`MediaThumbnail:599` calls the predicate like everyone else. No runtime change.

---

## TYPE-DESIGN-5 — **MINOR** — `NormalizedCrop` is re-declared structurally at the module boundary, so normalized-vs-pixel is a doc comment

**Types:** `NormalizedCrop` — `engine/logic/ocr-crop.ts:30-35` · `FrameGrabOptions.crop` — `ui/inputs/capture-media.ts:209`

```ts
// ocr-crop.ts:30 — the canonical, 0–1 fraction rectangle
export interface NormalizedCrop { x: number; y: number; width: number; height: number }
// capture-media.ts:209 — the identical shape, re-declared, unit stated only in prose
crop?: { x: number; y: number; width: number; height: number }
```

The two are structurally identical, so the *unit* — the only thing that distinguishes them — is
carried entirely by `capture-media.ts:205-208`'s comment ("Normalized (0–1) sub-rectangle"). Probe C:
`grabVideoFrame(video, { crop: { x: 120, y: 40, width: 900, height: 160 } })` — a pixel-space
rectangle — **compiles**.

**Downstream:** `capture-media.ts:261-264` multiplies straight through
(`sx = Math.round(crop.x * sourceWidth)`), and nothing clamps to the frame. A pixel-space crop puts
the source rect entirely outside the frame; per spec `drawImage` fills that as transparent black, the
`toBlob` succeeds with a blank strip, and recognition returns `OCR_RECOGNITION_FAILED_MESSAGE`
(`ocr-recognize.ts:44`) — telling the operator the recogniser could not read a DVR clock they aimed
at perfectly well. This is the classic failure of this exact geometry, and the type is the only place
it can be prevented cheaply.

**Fix:** `import type { NormalizedCrop } from '@/features/demo/engine/logic/ocr-crop'` and declare
`crop?: NormalizedCrop`. Type-only, no cycle (`ocr-crop.ts` imports nothing), and it names the unit
where a caller will actually read it. (Not proposing a branded `Fraction` newtype — the repo has no
brands and §-precedent says not to introduce one for this.)

---

## TYPE-DESIGN-6 — **MINOR** — `MEDIA_LIBRARY_TABS` pairs `kind` and `bucket` with no type link — deferred §4's trigger has fired

**Type:** `MediaLibraryTab` — `engine/logic/media/library.ts:23-33`; registry at `:41-63`

```ts
export interface MediaLibraryTab {
  id: string
  label: string
  kind: MediaKind
  bucket: keyof MediaBuckets   // ← unrelated to `kind`
  empty: { message: string; hint: string }
}
```

Probe F: `{ id: 'audio', label: 'Audio', kind: 'audio', bucket: 'videos', empty: {…} } as const satisfies MediaLibraryTab`
**compiles.** The `as const satisfies readonly MediaLibraryTab[]` on the registry checks membership,
not coherence.

**Downstream if violated:** the Audio tab reads `media.videos` (`mediaForTab`, `:105-108`), so
`rowLabel` announces clips as *"Audio: sample-clip.webm, 00:04"*, the count badge counts videos as
audio, and `deleteMediaItem` routes by `item.kind` into the audios bucket — the same undeletable-row
end state as TYPE-DESIGN-3, reached from the other side.

**Trigger, stated explicitly as the lane contract requires.** deferred §4 tracks
*"**`LocationForm.media` ↔ `MediaKind`** — link via a mapped type so a new media kind can't be
silently omitted."* Until this PR nothing consumed that pairing; P4.5 is the first code to build a
registry *keyed on it*, which fires the trigger. Note the current coverage asymmetry: a fourth
`MediaKind` would compile-break `SAMPLE_MEDIA`, `PHONE_MEDIA_EXTENSIONS` and `MetadataForm`'s
`PLACEHOLDER` (all `Record<MediaKind, …>` — good, and all three added by this PR), but would leave
the library silently three-tabbed and `LocationForm.media` silently three-bucketed.

**Fix (cheapest first):** drop `bucket` from the tab and derive it — one `Readonly<Record<MediaKind, keyof MediaBuckets>>`
in `library.ts` that `mediaForTab` indexes by `tab.kind` (and which `store/helpers.mediaBucket` should
then consume too, since it is the second copy of the same mapping). That removes the correlated pair
rather than policing it. If the pair is wanted for readability, the typed form is
`interface MediaLibraryTab<K extends MediaKind = MediaKind> { kind: K; bucket: BucketFor<K>; … }`
with `type BucketFor<K> = K extends 'photo' ? 'photos' : K extends 'video' ? 'videos' : 'audios'`,
and the registry annotated `satisfies readonly [MediaLibraryTab<'photo'>, MediaLibraryTab<'video'>, MediaLibraryTab<'audio'>]`.

---

## TYPE-DESIGN-7 — **MINOR** — the new `RecordingPhase` consumers use `default:` where three sibling files in the same package use `assertNever`

**Type:** `RecordingPhase` — `engine/logic/media/recording.ts:38-39`
**Consumers:** `engine/logic/media/audio-levels.ts:120-129` and `:133-142`

```ts
switch (phase) {
  case 'recording': return 'REC'
  case 'paused':    return 'PAUSED'
  default:          return 'READY'      // absorbs 'idle' AND 'stopped' — and anything added later
}
```

`FallbackMode` is this repo's stated standard — a `default: const exhaustive: never = mode` arm,
commented *"a new variant is a compile error, not a silently-missing warning."* Three files **in this
same diff** hold to it: `permissions.ts:112` and `:223`, `save-status.ts:72`, all ending in
`assertNever`. These two do not.

**Drift permitted:** adding a phase to `RECORDING_PHASES` — e.g. a `'starting'` for the window
`useMediaCapture` currently papers over with the screen-local `busy` flag
(`MediaCaptureScreen.tsx:181`) — compiles everywhere and silently renders **`READY` in muted slate
over a live recorder**. The `stopped → READY` choice is deliberate and documented; the problem is
that `default:` makes the *documented* case and the *unforeseen* case indistinguishable.

**Same class, folded in per the completeness sweep:** `AudioRecorderScreen.tsx:109 / 257 / 264`
consumes `RecorderMode` as an `if` + ternary chain whose final `else` absorbs both `'connecting'` and
`'offer'`, so a sixth mode also degrades silently. Lower stakes (JSX, and an exhaustive `switch`
returning elements is not this codebase's idiom), so it is recorded rather than demanded — but if the
union grows, that is the second site.

**Fix:** two lines in `audio-levels.ts` —
`case 'idle': case 'stopped': return 'READY'` then `default: return assertNever(phase)`. It also makes
the union's own doc comment (*"`stopped` reads READY because the recorder screen is never shown in
that phase"*) load-bearing at compile time instead of aspirational.

---

## TYPE-DESIGN-N1 — **NIT** — `mediaLibraryTab()` widens the literal registry entry back to `MediaLibraryTab`

`library.ts:72-78` returns `MediaLibraryTab`, so `tab.id` comes back as `string` and `tab.kind` as
`MediaKind` at every call site, discarding what the `as const` on `MEDIA_LIBRARY_TABS` established.
No reachable invalid state — `EmptyMediaState` (`MediaLibrarySheet.tsx:459-460`) reads only `.empty`
and `mediaForTab` reads only `.bucket` — so this is listed for completeness, not as a defect.
`: (typeof MEDIA_LIBRARY_TABS)[number]` keeps the literals; worth doing in the same edit as
TYPE-DESIGN-6, not on its own.

---

## Checked and clean — verified, deliberately not flagged

**The §58 snapshot-guard interplay is sound, and the widening was handled correctly.** This was the
lane's highest-priority check, so the verification is spelled out:

- `MediaItem.url?: string` (`types/index.ts:255-265`) is a **field widening** — the one drift
  direction `persistence.ts`'s own R-30 note says the three compile-time devices do not catch. The
  PR handled it by the book: `SNAPSHOT_VERSION` **and** the `SNAPSHOT_KEY` suffix moved together
  (`:80-81`), with the reason and the discard consequence written into the version log (`:75-79`).
- **Device 2 survives intact.** `mediaItemSchema` still carries `satisfies FullShape<MediaItem>`
  (`:225-236`) and `url: z.string().optional()` still names the key, so a *forgotten* optional would
  still be a compile error. Confirmed by the TYPE-DESIGN-2 probe, which produced device-1 and
  device-2 errors on `ocrProofSchema` from a single field addition.
- **Device 3 is not eroded.** P4 persists no new closed union — `MediaItem` gained nothing, and
  `OcrProof.imageDataUrl` is a plain `string`. No hand-typed `z.enum` was introduced anywhere in the
  diff; every enum in `persistence.ts` still comes from the domain's own `as const` tuple.
- **The runtime net was maintained, not merely preserved.** The maximal round-trip fixture switched
  its media URLs to bundled sample paths (`persistence.test.ts:195-203`) so `url`/`poster` remain
  part of its "no optional silently dropped" pin, and a dedicated four-arm suite
  (`persistence.test.ts:239-305`) pins the strip/keep/live-store-untouched contract independently.
  That is the correct response to a widening: the compile-time devices cannot see it, so the runtime
  fixture must.
- `withoutEphemeralMedia` (`captured.ts:184-208`) is identity-preserving at every level, which keeps
  the write side from churning references the store's reconciliation relies on.
- `OcrProof.imageDataUrl` persisting without a bump (§64a) is correct and I did not re-derive it: the
  field was already optional in both the domain type and the schema before this PR, so P4.7 is the
  first *writer*, not a shape change.

**Also verified clean:**

- **`RecorderMode`** (`AudioRecorderScreen.tsx:42-52`) is exactly the boolean-sprawl fix this lane
  looks for — five named arms with the rationale at the declaration ("one value rather than four
  booleans that could contradict each other"), resolved in one place
  (`AudioRecordingFlow.tsx:146-154`) and consumed as data. It is the counter-example that makes
  TYPE-DESIGN-1 stand out.
- **`SaveState`** (`save-status.ts:28-32`) is a textbook discriminated union: payload (`at: number`)
  lives only on the arm that has it, and `describeSaveStatus` closes with `assertNever`. The
  `PersistenceHandle.isLive()`/`saveState()` pair is documented as derived-from-one-source so "the
  two can never disagree" (`persistence.ts:545`), and `SAVE_STATUS_COLOR: Record<SaveStateKind, string>`
  (`WizardDrawer.tsx:58-63`) makes a new arm a compile error at the styling site too.
- **The failure taxonomy** — `CAPTURE_ERROR_CODES` / `CAPTURE_PERMISSION_STATES` / `CAPTURE_FACILITIES`
  (`permissions.ts:26, 41, 56-72`) are all `as const` tuples with derived unions, both switches end in
  `assertNever`, and `CAPTURE_PERMISSION_COPY` / `SAMPLE_MEDIA` / `SAMPLE_MEDIA_NOTICE` /
  `NO_RECORDER_NOTICE` / `PHONE_MEDIA_EXTENSIONS` / `MetadataForm`'s `PLACEHOLDER` are all
  `Readonly<Record<Union, …>>` + `Object.freeze`. The `readonly`-registry discipline from the PR #8
  shared-catalog fix is fully observed across the new package.
- **Result unions** follow the house shape at every new boundary: `CaptureStreamOutcome`,
  `FrameGrabOutcome`, `RecordingOutcome`, `StartRecordingOutcome` (`capture-media.ts:97-108, 231, 315-317, 332-334`),
  `OcrRecognizeOutcome` (`ocr-recognize.ts:33`), and `OcrResult` (`OcrCaptureScreen.tsx:16-28`). Payload
  belongs only to the arm that has it; no `{ data?: T; error?: E }` anywhere in the diff.
- **`PermissionStage`'s prop is `Extract<CapturePermission, 'prompt' | 'denied'>`**
  (`MediaCaptureScreen.tsx:572`) — the narrowed-prop discipline, correctly applied.
- **Id spaces stayed typed.** The explore rider's three new entries carry
  `covers: readonly (AppView | ModalId)[]` (`explore.ts:56-62`) and `isLaunchableId`
  (`content/screens.ts:35-37`) is a real type predicate over the launchable union, which is what makes
  `MODAL_NARRATION[view]` type-check at `DemoExperience.tsx:484`. No new bare-`string` registry key
  where a finite union exists. `MEDIA_LIBRARY_TABS`' local `key: string` rows in `WizardDrawer.tsx:151-156`
  are a three-element single-author literal — deferred §27's accepted precedent, deliberately not flagged.
- **`MetadataFormValue`'s BASE-name invariant** (`MetadataForm.tsx:44-50`) is convention-only, and
  that is the right call here: the type cannot express "no extension", and the invariant is instead
  enforced structurally — `mediaFilename`/`buildMediaItem` are the only extension authors (§58c), both
  callers pass the value straight through (`MediaCaptureScreen.tsx:296`, `AudioRecordingFlow.tsx:179`),
  and `sanitizeFilename` is applied on every keystroke *and* again at the storage boundary. A brand
  here would be the newtype this lane is told not to invent. **Not a finding.**
- **`AudioMeter`'s documented invariant** ("`available: false` is never accompanied by non-zero data",
  `useAudioAnalyser.ts:24-39`) *is* correlated state left flat rather than unioned — but every un-live
  path returns the single frozen `RESTING_METER` by identity (`:52-56, 89, 95, 104, 123`), there is one
  producer module, and a union would have to invent a shape for "flat bars that still fill the panel's
  geometry". Enforced by construction; **not a finding**.
- **`ocrCropRegion` returning `NormalizedCrop | null`** for degenerate input (`ocr-crop.ts:46-51`) is
  the right absence semantics — the caller reports an honest grab failure rather than cropping a
  guess (`OcrCaptureScreen.tsx:242-247`). The unit ambiguity in TYPE-DESIGN-5 is about the *consumer's*
  re-declaration, not this signature.
- **Derived-vs-stored calls I checked and accepted:** `OcrResult.confidence: { label, color, measured }`
  stores presentation because the raw score is not carried on the result and the screen cannot
  re-derive it — that is a view-model, not a drift surface. `CapturedMedia.durationSec` is a captured
  record (recorded, paused time excluded), not a render convenience. `TimeOffsetData`'s stored derived
  fields are the documented document-facing exception and were not re-litigated.
- **Already-tracked gaps touched but not re-filed:** deferred §5's `updateField(path: string)` is the
  reason TYPE-DESIGN-2 is exploitable, and is named there as context — the fix proposed closes the one
  write site without pre-empting §5. deferred §16 and §27 are untouched by this diff.
- **`isolatedModules`:** every type-only export in the new `engine/logic/media/index.ts` barrel uses
  `type` specifiers (`:27-30, 38-39, 63-64, 80, 98-101, 113`). Correct.
- **No parallel entity declarations in the new tests** — the media suites import from the module they
  exercise, and `persistence.test.ts` builds media through `addMedia` rather than hand-rolling
  `DemoLocation` literals.

---

## Type Design Summary

| Severity | Count |
|---|---|
| BLOCKER (CRITICAL) | 0 |
| MAJOR (HIGH) | 2 |
| MINOR (MEDIUM) | 5 |
| NIT (LOW) | 1 |

Canonical homes preserved (no parallel entity declarations): **no** — `OcrProof` re-declared at `DemoExperience.tsx:413` (TYPE-DESIGN-2); `NormalizedCrop` re-declared at `capture-media.ts:209` (TYPE-DESIGN-5)
Discriminated unions well-formed: **yes** — every new result/outcome union carries payload only on the arm that has it
Exhaustiveness enforced (never-checked switches): **partial** — `permissions.ts` ×2 and `save-status.ts` do; `audio-levels.ts` ×2 use `default:` (TYPE-DESIGN-7)
Correlated state modelled as a union: **flat shape found** — `CaptureCapability` (TYPE-DESIGN-1); `addMedia(kind, item)` (TYPE-DESIGN-3); `MediaLibraryTab.kind`/`.bucket` (TYPE-DESIGN-6)
Id spaces typed (no bare-string registries/keys): **yes**
readonly discipline on shared data: **yes** — every new module-level catalog is `Readonly<Record<…>>` + `Object.freeze`
Boundary types honest about untrusted input: **yes** — `OcrRecognition` reads `data.text`/`data.confidence` through `typeof` narrowing off an `unknown`-shaped worker reply; `errorName` narrows structurally; `MediaDeviceInfoLike` is declared structurally and every field is defended in `toCaptureDevices`
Snapshot-guard discipline maintained across the v6 widening: **yes** (see *Checked and clean*)

**Verdict: REVISE** (2 MAJOR, no CRITICAL).
