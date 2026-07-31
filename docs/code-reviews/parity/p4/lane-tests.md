# P4 review — TESTS lane

**PR:** #33 `feat/parity-p4` (`master..feat/parity-p4`) · **Lane:** test-analyzer · **Date:** 2026-07-31

**Scope reviewed:** the full test delta — 41 test files touched (+29 new), ~7,481 added lines,
1908 → 2479 tests. Every new test file was read in full alongside the production module it
claims to cover.

**Pre-flight (run in this worktree, idle):** `pnpm test --silent` → **218 files / 2479 tests,
all green**, 125s. `pnpm exec tsc --noEmit` → clean. No flaky baseline exists in this repo and
none was observed: three separate full-suite runs during this review were identically green.

**Context read before flagging:** PR #33 body (deliberate choices), `docs/code-reviews/deferred.md`
§§58–64, `features/demo/CLAUDE.md`, `vitest.setup.ts`. Nothing in the "DO NOT RE-FLAG" list is
re-flagged below.

---

## Headline

This is, with the exceptions below, an unusually strong test surface for its size. The
mutation-probe house standard is real and it holds: I verified four separate probes that the
tests *claim* in their own comments (`handOff()` deletion, the `canStop` gate, the analyser
`running()` check, the sanitize-on-keystroke rule) and every one of them failed the suite as
advertised. Both the sample-world default and the injected-`deps` live world are exercised
deliberately and are labelled as such at the top of each file, and the engine's pure layer
(`engine/logic/media/*`, `ocr-crop`, `save-status`) is pinned at boundary precision.

What the probes found is a **seam pattern**: the tests are excellent *inside* each layer
(engine, hook, screen) and at the two ends, but four things that only exist **in the bridge
arm or in the props one layer passes to another** are unexercised. Three of the five
blocker/major findings below are exactly that shape, and one of them — P4.7's entire live-OCR
bridge arm — can be gutted with the full suite and `tsc` still green.

---

## Findings

### [BLOCKER] T-1 — Saving an audio note with no location open loses it silently, and no test covers the path

**Production code:** `features/demo/ui/DemoExperience.tsx:698-707` — `saveAudioNote`
**Its photo twin:** `features/demo/ui/DemoExperience.tsx:658-672` — `saveCapturedMedia`
**Store action:** `features/demo/engine/store/create-store.ts:1067-1069` — `addMedia` early-returns
`if (!id) return` with no `currentLocationId`
**Tests covering it:** none. `features/demo/ui/__tests__/DemoExperience.audio.test.tsx:17-25`
(`seed()`) creates a location in **every** case; there is no `seed(false)` twin of
`features/demo/ui/__tests__/DemoExperience.media-capture.test.tsx:154`.

**Uncovered case:** a case is open, no location is (the wizard renders its own standing
"No location open — the wizard documents one recovery location at a time." copy). Drawer →
Record Audio (the row is **ungated** on a location by decision §59f) → record/attach → Save Audio.

**Verified, not reasoned:** I wrote a throwaway probe test, ran it, and deleted it. Result:

```
PROBE view= dvrInfo  locations= 0
      notices= ["No location open — the wizard documents one recovery location at a time."]
```

`locations = 0` — the note was never written. The only text on screen is the wizard's own
standing copy; **no save notice, no failure notice**. `saveAudioNote` calls `st.addMedia(...)`
(silent no-op) then `st.closeLaunch()`, so the visitor is returned to the wizard step exactly as
if the save had succeeded.

**Why it matters:** this is not a sample-path curiosity — in a browser with a microphone the
visitor loses a real recording, and the demo tells them it worked. The PR itself treats this
path as load-bearing on the photo side: `DemoExperience.tsx:230-238` documents
`CANNOT_SAVE_MEDIA_NOTICE` precisely because "`addMedia`'s silent early-return is the thing this
exists to make visible", and `DemoExperience.media-capture.test.tsx:154-171` pins it. The audio
half inherited the ungated row (§59f) without inheriting either the guard or the test.

**Fix:** mirror the photo twin in both places.
- Test — `DemoExperience.audio.test.tsx`: add `seed(withLocation = false)` and a case
  `'with no location open: tells the visitor, saves nothing, and closes the screen'` asserting
  `store.getState().locations` is identity-unchanged, the `Cannot Save Media — …` notice is on
  screen, and `view === 'dvrInfo'`.
- Production (other lane's call, but the test cannot pass without it): give `saveAudioNote` the
  same `if (!st.currentLocationId) { setNotice(CANNOT_SAVE_MEDIA_NOTICE); st.closeLaunch(); return }`
  head. Note `AudioRecordingFlow.handleSave` calls `capture.handOff()` unconditionally after
  `onSave` (`AudioRecordingFlow.tsx:170-181`) — unlike `MediaCaptureScreen`, whose `onSave`
  returns a boolean (§60c). If the guard lands, `onSave` for audio should return a boolean too,
  or the refused take's `blob:` URL is released to a store that never took it.

---

### [MAJOR] T-2 — P4.7's live-OCR bridge arm (`runOcrLive`) survives being gutted; full suite + tsc stay green

**Production code:** `features/demo/ui/DemoExperience.tsx:1421-1428` — `runOcrLive`
**Tests covering it:** **none.** `OcrCaptureScreen.live.test.tsx:161-163` pins what the *screen*
hands to `onLiveRead`; `DemoExperience.ocr.test.tsx:203-220` pins that an `imageDataUrl`
injected **by hand** via `updateField('capture.ocr', …)` survives the snapshot schema. The
mapping between those two — the bridge arm — is never executed by any test.

**Probe run (mutated, observed, reverted).** Replaced the body with:

```ts
const runOcrLive = (read: OcrLiveRead) =>
  runOcrRead({
    rawText: read.rawText,
    confidence: read.confidence,
    measured: false,                    // was: true
    // imageDataUrl: read.imageDataUrl  ← deleted
    fallbackActual: SAMPLE_ACTUAL_TIME, // was: getCurrentFormattedTime(clock.now().getTime())
  })
```

→ `pnpm test --silent`: **218 files / 2479 tests, all passed.** `pnpm exec tsc --noEmit`: clean
(`imageDataUrl` is optional on the param type, so the type layer catches nothing either).

**The three regressions that slip through, each of which the PR argues for explicitly:**
1. `measured: false` on a live read → the confirm stage renders the R-16 **"Sample" badge** and
   "no live frame was scored here" over the recogniser's *own measured* score. §64g calls this
   "the inverse dishonesty"; `marquee.test.tsx:206-219` pins both renderings but nothing pins
   which one a live read produces.
2. dropped `imageDataUrl` → `OcrProof.imageDataUrl` is never written, so the Time-Offset
   report's evidence block is empty again — **the exact bug commit `df1eda8` was written to
   fix** ("the always-empty evidence block fills").
3. `fallbackActual: SAMPLE_ACTUAL_TIME` → a live camera read taken today computes its offset
   against the hard-coded sample instant `2025-03-08 12:00:00`. That is a wrong forensic number
   presented as a calculated one.

**Fix:** one bridge test in `DemoExperience.ocr.test.tsx`. `DemoExperience` renders
`<OcrCaptureScreen>` without a `deps` prop, so the live path is not reachable from the bridge
today — two workable shapes:
- (preferred, no production change) `vi.mock('@/features/demo/ui/screens/OcrCaptureScreen')` with
  a stub that renders one button calling `props.onLiveRead({ rawText: '2025-03-08 12:05:30',
  confidence: 0.91, imageDataUrl: 'data:image/jpeg;base64,STRIP' })`. The real screen's behaviour
  is already fully pinned in its own two suites, so this stub is at the layer boundary rather
  than over the subject. Assert: no `Sample` badge / no "no live frame was scored here"; commit;
  `store.getState().capture.ocr.imageDataUrl === 'data:image/jpeg;base64,STRIP'`; and
  `capture.actualDateTime` is the stubbed clock's time, **not** `SAMPLE_ACTUAL_TIME`.
- or thread an optional `ocrDeps` through `DemoExperience` the way `store` is threaded, and drive
  the real screen end to end.

---

### [MAJOR] T-3 — §61g's "a failed stop keeps the microphone" arm is unpinned; the ledger states it is pinned

**Production code:** `features/demo/ui/screens/AudioRecordingFlow.tsx:161-166` — `handleStop`,
`if (result !== null) capture.close()`
**Test that should cover it:** `features/demo/ui/screens/__tests__/AudioRecordingFlow.test.tsx:277-293`
— "shows the capability layer's failure when a take produced no bytes, and stays put"
**Ledger claim:** deferred §61g — "A FAILED stop deliberately keeps the stream: the visitor is
still on the recorder and that is exactly what they need to retry. **Both directions are pinned
in `AudioRecordingFlow.test.tsx`.**" Only the success direction is (`:185-193`).

**Probe run (mutated, observed, reverted).** Replaced the conditional with an unconditional
`await capture.stopRecording(); capture.close()` →
`pnpm test AudioRecordingFlow.test.tsx DemoExperience.audio.test.tsx`: **23/23 passed.**

**What slips through:** after a zero-byte take the mic is released, so `stream === null`,
`isOpening === false`, and `mode` (`AudioRecordingFlow.tsx:145-153`) computes `'offer'`. The
visitor is dropped onto the "Enable microphone" panel instead of back on the recorder with a
live Start button — losing the retry affordance the decision exists to preserve. The existing
test stays green because it only asserts the alert text and the absence of `Review Audio`, both
of which survive the mode change.

**Fix:** two lines added to that same test — `for (const track of stream.tracks) expect(track.stop).not.toHaveBeenCalled()`
and `expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()`
(`stream` is already destructured out of `liveDeps()`). And correct §61g's "both directions"
sentence once it is true.

---

### [MAJOR] T-4 — The OCR strip's 1280 px size bound is never exercised at the screen; §64a's persist decision rests on it

**Production code:** `features/demo/ui/screens/OcrCaptureScreen.tsx:231-239` (`runLiveCapture`),
constants `OCR_STRIP_MAX_WIDTH = 1280` at `:88` and `OCR_CAPTURE_QUALITY = 1.0` at `:92`
**Tests covering it:** the *option* is pinned at the unit level
(`ui/inputs/__tests__/capture-media.test.ts:292-304` passes `targetWidth: 1280` explicitly and
asserts the 4K downscale). Nothing pins that the **screen passes it.**

**Probe run (mutated, observed, reverted).** Deleted `targetWidth: OCR_STRIP_MAX_WIDTH` and
`quality: OCR_CAPTURE_QUALITY` from the `grabVideoFrame` call → all five test files that touch
`OcrCaptureScreen` (`OcrCaptureScreen.live`, `OcrCaptureScreen.dispose`, `marquee`,
`DemoExperience.ocr`, `engine/logic/__tests__/ocr-crop`) **70/70 passed.**

**Why the two live tests cannot catch it:** both size the video to a resolution whose *cropped
strip* is already under the bound — 1280×720 → 1152 px wide, 640×480 → 576 px wide. Neither
case downscales, so removing the cap changes nothing they assert.

**Why it matters:** §64a's decision to **persist** `OcrProof.imageDataUrl` into sessionStorage
is argued entirely on the bound being enforced at construction ("the 4K worst case downscales to
1280×136 ≈ ≤120 KB base64… against the ~5 MB sessionStorage quota"). Without it, a 4K webcam
yields a 3456×367 strip, whose base64 is roughly an order of magnitude larger. The failure is
not cosmetic: `persistDemoStore`'s write throws, `state = { kind: 'failed' }`, and the snapshot
is **deliberately cleared** (`engine/store/persistence.ts:596-607`) — the visitor's whole session
is dropped at the next refresh, reported only by the drawer's status line if they happen to open
it.

**Fix:** a third case in `OcrCaptureScreen.live.test.tsx` § "the live shutter", identical in
shape to the two that exist: `sizeVideo(3840, 2160)`, then assert
`h.canvas.drawCalls[0].slice(1)` equals `[192, 896, 3456, 367, 0, 0, 1280, 136]` — the same
numbers `capture-media.test.ts:303` already derives — plus `expect(h.canvas.width).toBe(1280)`.
That single case pins the crop, the cap and the aspect-preserving scale together.

---

### [MAJOR] T-5 — `recording.test.ts` locks in `.mp4` for a Matroska container, contradicting the module's own honesty contract

**Test:** `features/demo/engine/logic/media/__tests__/recording.test.ts:221`
```ts
['video/x-matroska;codecs=avc1', 'video', 'mp4'], // Chrome reports mp4-in-mkv this way
```
**Production code:** `features/demo/engine/logic/media/recording.ts:236-247` — `extensionForMimeType`

**The test's comment misdescribes the mechanism.** `video/x-matroska;codecs=avc1` matches none of
the branches (`mp4`/`m4a`/`mpeg-4`/`webm`/`ogg`/`jpeg`/`png`/`quicktime`/`wav`); the value comes
out of `PHONE_MEDIA_EXTENSIONS[kind]` at `:246`, the fallback the function's own docblock
reserves for "ONLY when the MIME type carries no container information **at all**". Matroska
carries container information — it *is* the container.

**Probe run (mutated, observed, reverted).** Inserted `if (type.includes('matroska')) return 'mkv'`
above the webm branch → exactly one failure across 87 files / 1115 tests:

```
FAIL recording.test.ts > extensionForMimeType > names the real container for video/x-matroska;codecs=avc1
AssertionError: expected 'mkv' to be 'mp4'
```

So this assertion is precisely what would block the honest fix, and it does so under a comment
that reads as though the value were deliberate recognition rather than a fallback.

**Why it matters here specifically:** `recording.ts:239-243` and §58c exist to stop the demo
"putting a false claim in an evidence filename", and §58c names `video/x-matroska` as the
motivating Chrome case. The sibling assertion at `:237-240` — "never stamps `.mp4` on a WebM
blob (the false-claim-in-a-filename pin)" — states the property the mkv row violates. The PR's
DO-NOT-RE-FLAG list covers `.mp4`/`.m4a`-on-**WebM** only; Matroska is not among the recorded
decisions. The path is live: `capture-media.test.ts:473-480` already exercises a recorder
reporting `video/x-matroska;codecs=avc1`, and `startStreamRecording` reads that string back into
`CapturedMedia.mimeType` → `mediaFilename`.

**Fix (test-lane part):** either
(a) if `.mkv` is correct, add the branch and change this row to `'mkv'` — the fallback assertions
    at `:242-247` already cover the genuinely-uninformative case; or
(b) if `.mp4` is a deliberate call (e.g. "Chrome's mkv-with-avc1 plays as mp4 everywhere"),
    say so in a `§58c` deferred sub-item and rewrite the comment to name the fallback path, so a
    future reader does not take the current comment as evidence of a recognition rule that isn't
    there.
Either way the comment must stop describing a branch that does not exist.

---

### [MINOR] T-6 — `deviceFailure`'s on-screen line is unpinned in both capture screens

**Production code:** `features/demo/ui/screens/MediaCaptureScreen.tsx:431` and
`features/demo/ui/screens/OcrCaptureScreen.tsx:544`
**Tests covering it:** the hook's `deviceFailure` *value* is pinned
(`ui/inputs/__tests__/useCaptureStream.test.ts:84-98`); neither screen's rendering of it is.

**Probe run (mutated, observed, reverted).** Deleted both render lines →
`pnpm test features/demo/ui/screens features/demo/ui/__tests__`: **88 files / 907 tests passed.**

§60e is explicit that this line is load-bearing copy: "`deviceFailure` is rendered as its own
line, distinct from `failure` — P4.1 kept 'the list could not be read' apart from 'there are
none' precisely so the absence of a picker could be explained rather than just happen." Losing it
silently returns to the state P4.1 built the distinction to avoid.

**Fix:** in `MediaCaptureScreen.test.tsx` § "live viewfinder", one case using
`harness({ live: true })` with `enumerateDevices` rejecting `domError('NotAllowedError')`,
asserting the enumeration message renders *and* that no `Switch camera` control appears — one
test covers both halves of the distinction.

---

### [MINOR] T-7 — `deleteMediaItem`'s poster revocation is unexercised

**Production code:** `features/demo/ui/DemoExperience.tsx:720` —
`revokeCapturedUrls(io, [item.url, item.poster])`
**Tests covering it:** `DemoExperience.media-library.test.tsx:102-114` pins `item.url` only; no
fixture in that file or in `MediaLibrarySheet.test.tsx` sets `poster`.

**Probe run (mutated, observed, reverted).** Changed the call to `[item.url]` →
`DemoExperience.media-library.test.tsx` + `object-urls.test.ts`: **22/22 passed.**

Scoped down to minor because the branch is currently unreachable: the only `poster` producer is
`engine/logic/media/samples.ts:54`, a durable `/demo-media` path that `revokeCapturedUrls`
correctly skips — no capture path mints a `blob:` poster today
(`useMediaCapture.capturePhoto`/`stopRecording` set none). It is a latent gap, not a live leak.

**Fix:** add `poster: 'blob:two'` to the deleted fixture and assert both revocations — or, when a
video-poster producer lands, do it then. Same note applies to `useMediaCapture.ts:247` and `:390`,
whose poster branches are likewise unreachable and untested.

---

### [MINOR] T-8 — A capability assertion that asserts nothing

**Test:** `features/demo/ui/inputs/__tests__/useMediaCapture.test.ts:67-72`
```ts
expect(result.current.capability).toEqual({
  stream: false, record: false, objectUrls: expect.any(Boolean), sampleOnly: true,
})
```
`expect.any(Boolean)` matches both values, so this key pins nothing. §58a already establishes the
exact fact — under Vitest the global `URL` is **Node's**, which *does* implement object URLs, so
`objectUrls` is deterministically `true` here (and `sampleOnly` is `true` either way via
`!stream`). The looseness therefore buys no robustness: a regression making
`readBrowserObjectUrls()` return `null` unconditionally passes this assertion and is caught only
incidentally at `:88-92`.

**Fix:** `objectUrls: true`, with the §58a one-liner as the comment.

---

### [MINOR] T-9 — `disposeDvrRecognizer` while the worker is still booting is uncovered

**Production code:** `features/demo/ui/inputs/ocr-recognize.ts:91-104`, whose docblock claims it
is "safe against a worker that is still booting — the teardown waits for it first."
**Tests:** `ui/inputs/__tests__/ocr-recognize.test.ts:114-127` — both dispose cases `await
recognizeDvrStrip(...)` to completion first (booted) or never boot at all (no-op). By inspection,
no case disposes with `workerPromise` unsettled.

Reported by inspection, not by probe — I could not construct a mutation that isolates this arm
without contriving the module's shape. Real path: `OcrCaptureScreen` unmounts (visitor presses
Cancel) while the first shutter's ~6.8 MB asset fetch is still in flight; the effect cleanup at
`OcrCaptureScreen.tsx:191-196` fires `disposeDvrRecognizer()` against a pending boot. A refactor
to a synchronous `workerPromise = null` would leak the worker on exactly that path with every
current test green.

**Fix:** one case in `ocr-recognize.test.ts` — a deferred `createWorker` promise, call
`recognizeDvrStrip` without awaiting, `await disposeDvrRecognizer()`, resolve the boot, then
assert `h.created[0].terminate` was called.

---

## Probes run (all reverted; tracked worktree diff is empty)

| # | Mutation | Files run | Result |
|---|---|---|---|
| 1 | `runOcrLive` gutted (`measured:false`, no `imageDataUrl`, sample fallback instant) | **full suite** + `tsc` | 2479/2479 green, tsc clean → **T-2** |
| 2 | `extensionForMimeType` gains a `matroska → 'mkv'` branch | 87 files / 1115 tests | 1 failure (`recording.test.ts:221`) → **T-5** |
| 3 | OCR strip grab drops `targetWidth` + `quality` | 5 OCR files / 70 tests | all green → **T-4** |
| 4 | `MediaCaptureScreen` `handOff()` deleted | `MediaCaptureScreen.test.tsx` | 2 failures → claimed probe **confirmed** |
| 5 | `AudioRecordingFlow.handleStop` closes unconditionally | 2 files / 23 tests | all green → **T-3** |
| 6 | `deviceFailure` lines deleted from both screens | 88 files / 907 tests | all green → **T-6** |
| 7 | `deleteMediaItem` drops `item.poster` | 2 files / 22 tests | all green → **T-7** |
| 8 | throwaway probe test: audio save with no location (deleted after) | 1 test | `locations=0`, no notice → **T-1** |

---

## What is genuinely strong (recorded so a fix round does not disturb it)

- **The engine layer is pinned at boundary precision.** `recording.test.ts` covers the identity
  no-op contract for all eight out-of-phase transitions, the backwards-clock clamp, and exact-hit
  boundaries on both the 500 ms and 1-hour gates. `ocr-crop.test.ts` pins the aspect-matched case
  *reducing to* the phone's `{0.05, 0.415, 0.90, 0.17}` and both cover-fit directions.
  `library.test.ts` pins the same-second tie-break, the string-not-`Date` date parse (with four
  malformed-date arms), and the `--:--` vs omit split between row and info panel.
- **`captured.test.ts`'s identity assertions** (`toBe`, not `toEqual`) on `withoutEphemeralMedia`
  at every level are the right pin for a function whose whole point is reference stability under
  a 250 ms debounce.
- **The persistence v6 block** (`persistence.test.ts:239-305`) asserts on the *serialized string*
  (`not.toContain('blob:')`) rather than on the mapper's return — the only assertion shape that
  actually proves bytes never leave the tab.
- **Mocks are at true IO edges throughout.** `tesseract.js` is mocked at the module boundary and
  the test asserts the vendored `/ocr` paths and the LSTM/SINGLE_BLOCK config
  (`ocr-recognize.test.ts:65-76`) — that is the right seam, and the singleton's
  boot-failure-is-not-cached arm is pinned. `MediaRecorder`/`MediaStream`/canvas/`AnalyserNode`
  are hand-built in two shared `__tests__/*-io.ts` fixtures and reused, not re-rolled per file.
  No engine function is ever mocked.
- **Determinism.** Every clock is injected (`now`, `capturedAt`, `clock.now` spies); no test file
  in the delta reads a real `Date.now()` or `Math.random()`. Fake timers are always scoped with a
  matching `afterEach(() => vi.useRealTimers())` — I found no order-dependence and no unreset
  module mock.
- **The sample-vs-live boundary is handled correctly and explicitly.** Every file that runs on the
  suite-default sample world says so in its header and explains why that is the *tested contract*;
  every live-path file injects `deps`. I found no case of a test claiming the live path while
  taking the sample one — the classic trap in this repo, and it is absent.
- **Store no-op pins use the house identity idiom** (`expect(store.getState()).toBe(before)`) in
  all four places it applies (`DemoExperience.media-library.test.tsx:147`,
  `DemoExperience.audio.test.tsx` × 2, `DemoExperience.media-capture.test.tsx:150/166`), and the
  comments correctly distinguish "whole state identity" from "`locations` identity" where
  `closeLaunch` is itself a legitimate write.
- **`explore.test.ts`'s `Record<ModalId, true>`** replacing the rotted hand-written
  `KNOWN_COVER_IDS` trio is the right fix shape: exhaustive by construction, a compile error on
  the next `ModalId`.

---

## Test Analyzer Summary

| Severity | Count |
|---|---|
| BLOCKER | 1 |
| MAJOR | 4 |
| MINOR | 4 |

- **Behaviorally meaningful coverage:** strong within each layer; **thin at the bridge/props seam**
  (T-1 – T-4 are all that shape).
- **Engine coverage gate (80% on `lib/**` + `engine/**`):** met — and no P4 logic was parked in
  `ui/` to dodge it. `engine/logic/media/*`, `ocr-crop.ts` and `save-status.ts` each landed with a
  dedicated suite; the genuinely browser-shaped code (`capture-media.ts`, `object-urls.ts`,
  `ocr-recognize.ts`, the three hooks) correctly sits in `ui/inputs/` and is still tested at
  hook/unit level rather than skipped.
- **Mock strategy:** at the IO edge throughout; no inverted mocks.
- **Factory usage:** canonical — `capture-media-io.ts` and `audio-analyser-io.ts` are shared, and
  the per-file `item()`/`buckets()`/`harness()` builders are consistent. No drift-prone inline
  `MediaItem` literals outside the local factories.
- **Setup-shim traps:** none. `getContext → null`, absent `mediaDevices` and absent `MediaRecorder`
  are all named in the files that depend on them, and §58a's correction (Node's `URL` *does*
  implement object URLs under Vitest) is carried into the tests that rely on it.
- **Determinism (clock/entropy injected):** yes.

**Verdict: REVISE** — T-1 must be closed before merge (silent loss of a visitor's recording on an
untested path the PR already guards on the photo side); T-2 – T-5 are one test each and T-4/T-5
are single-line edits to tests that already exist.

---

## Fix-delta r1

**Diff verified:** `d09a291..cd819ee` on `feat/parity-p4` · **Date:** 2026-07-31

**Gates re-run in this worktree, after every probe was reverted:** `pnpm test --silent` →
**220 files / 2561 tests green** (103s); `pnpm exec tsc --noEmit` → clean. Tracked source diff
empty. A second full run earlier in the session was identically green — still no flaky baseline.

**Method.** For this lane, "verified" means the mutation was re-applied, the suite was run, the
failure was observed, and the file was reverted. Every disposition below is backed by a probe I
ran in this pass — 16 mutations across 12 fix commits. Nothing here is reasoned-from-the-diff.

### My findings

| # | → | Disposition | Probe re-run | Result |
|---|---|---|---|---|
| T-1 (BLOCKER) | R-1 | **FIXED** | (a) delete the `saveAudioNote` guard; (b) restore unconditional `handOff()` | (a) 1 fail; (b) 1 fail |
| T-2 (MAJOR) | R-5 | **FIXED** | the original 3-part gut, then each part alone | 2 fail; then 1 / 1 / 2 fail |
| T-3 (MAJOR) | R-12 | **FIXED** | `handleStop` closes unconditionally | 1 fail |
| T-4 (MAJOR) | R-10 | **FIXED** | drop `targetWidth` from the strip grab | 1 fail |
| T-5 (MAJOR) | R-11 | **FIXED** | remove the Matroska branch | 3 fail |
| T-6 (MINOR) | R-29 | **FIXED** | delete the `deviceFailure` line in both screens | 2 fail (one per screen) |
| T-7 (MINOR) | R-30 | **FIXED** | narrow the delete to `[item.url]` | 1 fail |
| T-8 (MINOR) | R-31/R-3 | **FIXED** | `readBrowserObjectUrls` returns `null` unconditionally | 1 fail |
| T-9 (MINOR) | R-32 | **FIXED** | dispose fire-and-forget instead of awaiting the boot | 1 fail |

**9 FIXED · 0 PARTIAL · 0 UNFIXED.**

Detail on the two that needed more than one probe:

- **T-1 → R-1.** The fix is the full §60c shape, not just a guard: `saveAudioNote` returns
  `boolean`, `AudioRecordingFlowProps.onSave` returns `boolean`, and `handleSave` gates
  `capture.handOff()` on the answer. Both halves redden independently — deleting the bridge guard
  fails *"with no location open: tells the visitor, saves nothing, and closes the recorder (R-1)"*;
  making `handOff()` unconditional fails *"does NOT hand off a REFUSED save"* with
  `expected [] to include 'blob:mint/1'`. The refusal arm is the one I did **not** ask for and is
  the more valuable of the two: it pins that a refused take's bytes stay owned by the hook so the
  unmount sweep can free them, closing a leak the guard alone would have opened. Both notices are
  phone-verbatim and the success line — which had no pin at all before — now has one.
- **T-2 → R-5.** I re-ran the exact original gut (2 tests fail), then isolated each dimension to
  confirm the new suite is not passing on one axis and coasting on the others: `measured: false`
  alone → 1 fail; dropped `imageDataUrl` alone → 1 fail; `fallbackActual: SAMPLE_ACTUAL_TIME`
  alone → 2 fail. All three of P4.7's headline claims are independently pinned.

### Disclosed test-shape deviations — judged

- **R-12's two added assertions** — `track.stop` not called, and the live `Start recording`
  button still present. Exactly the shape §61g needs and precisely what I specified. Verified:
  they are what reddens under the unconditional-close mutation. **Accept.** Note the fix round
  also refactored release out of `handleStop` into an effect (R-21) so the 1-hour auto-stop takes
  the same path; my mutation re-inserted a close into the handler and the pin still fired, so it
  guards the regression *shape* rather than one call site. Better than what was asked for.
- **§61g's ledger wording** — corrected **in place**, as a labelled correction carrying the
  reusable lesson ("'both directions are pinned' is a claim about tests, and the only way to earn
  it is to run the mutation"), rather than a silent edit. **Accept** — this is the right handling
  of a false claim in a living doc, and the lesson is the part that transfers.
- **R-5's module-boundary stub of `OcrCaptureScreen`** — the preferred shape I named, and it is
  at the layer boundary rather than over the subject: the real screen's behaviour stays fully
  pinned in `marquee.test.tsx` and `OcrCaptureScreen.live.test.tsx`, and the stub is only a hand
  that presses `onLiveRead`/`onConfirm` plus a window onto bridge-computed props. **Accept.** The
  file also adds an arm I did not ask for — an already-calibrated `actualDateTime` is not
  overwritten by a live read — which is the right instinct for a value that becomes a forensic
  offset.
- **R-11 went past fork (a)** — it took the honest branch *and* mapped audio Matroska to `.mka`,
  *and* folded Matroska into the false-claim pin's name and body. **Accept**, strictly stronger:
  removing the branch now reddens three arms rather than one, and the test that used to be the
  only thing blocking the honest answer is now the thing enforcing it.

### Fix-introduced rot — hunted, none found

I went after the shape that hides in a fix round: **deleted and weakened assertions**. Every `-`
line across the 23 touched test files was reviewed, and the five that removed real coverage were
each traced to its replacement and probed.

- **`recording.test.ts` lost the whole `canStopRecording` describe (5 assertions)** — R-28 deleted
  the export as unconsumed. Not rot: the four boundary arms (499/500, idle, stopped, paused-holds)
  survive against a local `canStopAt` helper that composes `canStopAtElapsed(state, recordedMs(…))`
  — i.e. they now pin the gate *the way the only production consumer applies it*. Confirmed no
  remaining `canStopRecording`/`facilityForKind` consumers exist.
- **`MediaCaptureScreen.test.tsx` lost `expect(shutter('Stop recording')).toBeDisabled()`** —
  R-9's `disabled` → `aria-disabled` change. This is the classic trap (`aria-disabled` does not
  block clicks; only the handler guard does), so I read the replacement in full: the behavioral
  refusal `expect(h.recorder.stopCalls).toBe(0)` after the click is **retained**, with
  focusability and an accessible-description assertion added around it. Strengthened, not
  weakened.
- **`library.test.ts` lost the duplicated bucket-literal assertion** — R-26/R-33 replaced it with
  a shared-map identity pin (`mediaBucket(kind) === MEDIA_BUCKET[kind]`, plus exhaustive keys).
  Probed: narrowing the sweep to photos-only reddens it. Strengthened.
- **`capture-media.test.ts` / `useCaptureStream.test.ts` lost their `UNSUPPORTED` and
  `PERMISSION_DENIED` device-list assertions** — the §66d retaxonomy. Replaced by an `it.each`
  over four rejection names plus a negative-copy arm ("never says the capture failed — the stream
  this runs after is live"). Strengthened.
- **`samples.test.ts` lost `facilityForKind`** — R-28, unconsumed export. Correct deletion.

Spot-checks of the highest-stakes new pins, all by running the mutation they claim to guard:

- **R-2's revocation arms** — removing the cascade sweep reddens exactly the two cascade arms
  (case and location), and narrowing `collectMediaUrls` to the photos bucket reddens three
  (including the engine arm). The suite also carries the negatives that matter: the untouched
  case's capture is asserted *not* revoked, sample paths are asserted never revoked, and deletion
  still works with no object-URL API.
- **R-4's generation-token arms** — two independent mutations, both caught: reverting `stale()`
  to the pre-fix alive-only check, and dropping the supersession bump when a result arrives.
  Each reddens the same two arms (success and failure). Event-driven, no timers, no timing luck.
- **R-13's browser-initiated-stop arms** — four arms, three of them negative (ours, abandoned,
  later-stop), all driven by explicit `emitStop()`/`abort()` rather than by waiting. Deterministic.
- **§66d's unreachability claim** (`permissionAfterFailure` is never reached for
  `DEVICE_LIST_UNAVAILABLE`) — I probed it directly by routing the device-list failure through
  `permissionAfterFailure` in `useCaptureStream`; R-29's screen test catches it. The arm's absence
  from the hand-written `it.each` at `permissions.test.ts:104` is therefore **correct**, not a
  gap: adding it would pin a value nothing consumes under a test name ("so the retry affordance
  stays live") that does not describe it.
- **R-3's new `capability.test.ts`** — exhaustive over `MEDIA_KINDS` in four arms plus a runtime
  `assertNever` arm for a fourth kind, and the R-3 defect itself gets its own single arm
  (photo `live` / video `sample` / audio `sample` on a recorder-less browser).

### New finding

### [LOW] T-10 — R-33's pin is compile-time only, inside a runtime test file

**Test:** `features/demo/engine/logic/media/__tests__/library.test.ts` — *"mediaLibraryTab returns
the registry ENTRY, keeping its literals (R-33)"*, whose own comment says "THE assertion is the
annotations" (`const id: MediaLibraryTabId = photos.id`).

Vitest transpiles through esbuild, which strips type annotations without checking them, so under
`pnpm test` alone that test asserts only `expect([id, label]).toEqual(['photos', 'Photos'])` — the
widening it exists to catch is caught by `tsc --noEmit`, not by the runner it lives in. This is
fine as things stand (tsc is a declared gate on this PR and was clean), and the repo already uses
compile-time devices deliberately (`store/persistence.ts`'s `MODAL_IDS`). Recorded only so nobody
later reads a green `pnpm test` as evidence that the R-33 return type held.

**Fix (optional):** none required. If it is worth making explicit, the house move is the one
`persistence.ts` uses — a `satisfies`/`Record` device at module scope with a comment naming tsc as
its enforcer — rather than annotations inside an `it`.

### Fix-delta Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 0 |
| LOW (new) | 1 |

Original findings: **9 FIXED / 0 PARTIAL / 0 UNFIXED.** Deviations judged: 4, all accepted (three
strictly stronger than requested). Fix-introduced rot: none — the five coverage-removing deletions
each trace to an equal-or-stronger replacement, verified by probe.

**Verdict: APPROVE.**
