# P4 review — WEB lane (platform / a11y / perf)

**PR:** #33 · `master..feat/parity-p4` · reviewed at `df87a18`
**Worktree:** `scratchpad/worktrees/parity-p4` (deps installed; `pnpm build` and targeted `vitest` runs executed here)
**Lane contract:** `.claude/agents/web-reviewer.md` — browser-platform concerns only. TS correctness, missing tests and swallowed errors are other lanes.

Context read before flagging: PR #33 body ("deliberate choices — DO NOT RE-FLAG"), `docs/code-reviews/deferred.md` §§58–64, `features/demo/CLAUDE.md`, root `CLAUDE.md`.

Severity vocabulary is the orchestrator's (**blocker / major / minor**); the lane rubric's own CRITICAL/HIGH/MEDIUM is given alongside so the mapping is auditable.

---

## Findings

### [BLOCKER · lane-CRITICAL] W-1 — Deleting a location or a case orphans every captured `blob:` URL it held

**File:** `features/demo/ui/DemoExperience.tsx:1054-1067` (`confirmDelete`)
**Correct pattern, same file:** `features/demo/ui/DemoExperience.tsx:716-723` (`deleteMediaItem`)
**Store writes involved:** `features/demo/engine/store/create-store.ts:536-546` (`deleteCase` — filters out every location of the case), `:564-572` (`deleteLocation`)

**Issue.** P4.5 correctly wired `revokeCapturedUrls` into the single-item delete path. The two OTHER store writes that drop the same `MediaItem` rows — `deleteCase` and `deleteLocation` — do not. `confirmDelete` calls the store action and repairs the bridge's local shadows, but never touches the object-URL registry:

```ts
const confirmDelete = () => {
  if (!pendingDelete) return
  const { kind, id } = pendingDelete
  if (kind === 'case') {
    store.getState().deleteCase(id)          // drops every location + its media
    ...
  } else {
    store.getState().deleteLocation(id)      // drops this location's media
    ...
  }
  setPendingDelete(null)
}
```

Once a capture is saved, the capture surface has already `release`d the URL (`useMediaCapture.handOff`, `useMediaCapture.ts:386-394`), so the hook's unmount sweep will *not* free it — by design. The store is the sole owner from that point, and after these two writes nothing in the page holds a reference to revoke.

**Concrete failure.** Chrome/Safari, live camera granted: open a location, capture three photos and a 30 s clip (a 720 p WebM take is on the order of 5–10 MB, photos 1–3 MB each), then delete the location — or delete the whole case. The rows disappear from the UI and the blobs stay pinned until the tab is closed. The demo's most natural exploratory loop is *create a case → poke at it → delete it → try again*, so this repeats without bound; five cycles pins ~50–100 MB of unreachable blob storage.

**Evidence.** `deferred.md` §58g states the carry-rule this violates in as many words: *"once the store owns a capture's URL, `deleteMedia` is the only thing that can revoke it"* — a statement that was true before this diff and is not true after it, because P4.3/P4.6 gave the store a media population that `deleteCase`/`deleteLocation` can now discard. Neither §58g, §63h nor any other filed § covers the cascade path. `revokeCapturedUrls` is already imported at `DemoExperience.tsx:73`.

**Fix.** In `confirmDelete`, before the store write, sweep the target's media through the helper that is already imported and already proven at `:716-723`:

```ts
const io = readBrowserObjectUrls()
if (io !== null) {
  const doomed = kind === 'case'
    ? locations.filter((l) => l.caseId === id)
    : locations.filter((l) => l.id === id)
  revokeCapturedUrls(io, doomed.flatMap((l) => [
    ...l.form.media.photos, ...l.form.media.videos, ...l.form.media.audios,
  ]).flatMap((m) => [m.url, m.poster]))
}
```

`revokeCapturedUrls` already no-ops on the `/demo-media/…` sample paths (`object-urls.ts:106-110`), so bundled assets are safe.

---

### [MAJOR · lane-HIGH] W-2 — The camera (and its microphone track) stays open through the entire photo/video review stage

**File:** `features/demo/ui/screens/MediaCaptureScreen.tsx:202-225` (`close` is never destructured from the hook and never called), `:313-323` (the review early-return), `:231-238` (the `srcObject` effect)
**Contrast, same PR:** `features/demo/ui/screens/OcrCaptureScreen.tsx:213-224` and `features/demo/ui/screens/AudioRecordingFlow.tsx:161-166`

**Issue.** `useMediaCapture` exposes `close()` and `MediaCaptureScreen` re-exports it in its return object, but the component destructures 22 members and `close` is not among them (verified: `grep -n close MediaCaptureScreen.tsx` returns only `closeLaunch` / `"Close camera"`). When a capture lands, the component returns `<ReviewStage>` — the `<video>` unmounts, but the effect at `:231-238` is keyed on `[stream]` and does not re-run, and the `MediaStream` tracks stay live until the whole screen unmounts.

`withAudio` is unconditional (`:201`, documented in §58e/§60d), so this holds the microphone open as well.

**Concrete failure.** Chrome or Safari on a laptop: press the shutter in photo mode. The viewfinder is replaced by the review screen, but the tab's "camera in use" indicator and the hardware camera LED stay lit while the visitor reads the sample notice, types a filename, types a caption, and decides between Retake and Save — a window bounded only by how long they take. The screen renders nothing from the stream during that window, which is exactly the state `useCaptureStream.ts:152-156` names as the thing to avoid ("the camera light stays on with nothing rendering").

**Evidence.** The two sibling capture surfaces in this same PR both release, and both record the same reason:
- `OcrCaptureScreen.tsx:209-224` — *"the phone unmounts its camera while the confirmation screen is up… the camera light must not stay on behind a form"* — with a `reopenOnAimRef` so Retake re-opens only the stream the screen itself closed.
- `AudioRecordingFlow.tsx:44-51` / `:161-166` (§61g) — *"a browser shows a live recording indicator for as long as a track is open, and leaving it lit over the review screen would say the microphone is still listening when it is not."*

That argument is not audio-specific and P4.3 is the one surface that did not apply it. Nothing in §§58–60 files it.

**Fix.** Port `OcrCaptureScreen`'s effect verbatim: close when `captured` becomes non-null, re-`open()` on Retake through a `reopenOnAimRef`-style latch so a visitor who was on the sample path is not handed a permission prompt they never asked for. `stopRecording` already produces the capture before the close would fire, so no ordering hazard.

---

### [MAJOR · lane-HIGH] W-3 — `MediaFullscreen` is an `aria-modal` dialog with no focus management

**File:** `features/demo/ui/screens/MediaLibrarySheet.tsx:312-370`
**Reference pattern:** `features/demo/ui/controls/AlertDialog.tsx:56-62` (focus the container on mount, hand focus back to the opener on unmount)

**Issue.** The fullscreen layer declares `role="dialog"` + `aria-modal="true"` + an accessible name (`:318-322`) and portals into the phone overlay root, but it never moves focus into itself and never restores focus on close. The only focus handling anywhere in the file is `autoFocus` on the `<video>` (`:338`), which covers one of the two branches.

**Concrete failure, photo branch (no `autoFocus` at all).** Keyboard/NVDA user in the Media Library: Tab to "View fullscreen" (`:282`), press Enter. A black `aria-modal="true"` layer covers the phone. Focus is still on the "View fullscreen" button, which now sits *outside* the modal — and `aria-modal="true"` removes everything outside the dialog subtree from the accessibility tree, so the user's cursor is parked on a node the screen reader has just hidden. The next forward Tab walks "Close preview", then every row button, then every per-row delete button — all behind the layer, all a11y-pruned — before it finally reaches "Close fullscreen", which is last in the portal because `MediaFullscreen` mounts after `ModalShell`'s subtree. Shift+Tab is worse.

**Concrete failure, video branch.** `autoFocus` does move focus into the `<video>`, but on close that element unmounts and focus falls to `<body>`, so the next Tab restarts at the top of the document rather than at the "View fullscreen" button that opened the layer.

**Aggravating factor.** With the layer up there are two simultaneous `aria-modal="true"` dialogs in the DOM — `ModalShell`'s sheet (`_shared.tsx:70-72`, zIndex 22) and this one (zIndex 40). Screen readers do not agree on which wins.

**Not already filed.** §63e files the *Escape* behaviour of overlays inside the sheet ("Escape closes the SHEET, not just the overlay"). Focus is not mentioned in §63 or anywhere in §§58–64.

**Fix.** Copy the two effects from `AlertDialog.tsx:56-62` onto the fullscreen container: `tabIndex={-1}` + `ref.current?.focus()` on mount, and restore `document.activeElement` (guarded by `isConnected`) on unmount. Drop `autoFocus` from the `<video>` so both branches take the same path.

---

### [MAJOR · lane-HIGH] W-4 — The video Stop gate is a native `disabled` with no announced reason, contradicting the idiom the same PR establishes

**File:** `features/demo/ui/screens/MediaCaptureScreen.tsx:466`

```tsx
disabled={busy || (mode === 'video' && isRecording && !canStop)}
```

**Contrast, same PR, same 500 ms `canStopAtElapsed` gate:** `features/demo/ui/screens/AudioRecorderScreen.tsx:104` (`blockedId`), `:107` (`stopBlocked`), `:266-270` (a `role="status"` line reading *"Stop unlocks after half a second of recording."*), `:271-292` (`aria-disabled` + `aria-describedby` + guarded handler on both stop affordances).

**Issue.** Two things go wrong at this one call site, and neither is filed:

1. **Focus is dropped at the moment the button is pressed.** `canStop` is false for the first 500 ms of a take, so the instant `startRecording()` lands, the shutter the visitor just activated becomes natively `disabled`. Browsers blur a focused element that becomes disabled, so a keyboard visitor who pressed Space to start recording is thrown to `<body>`; 500 ms later the control re-enables with focus nowhere near it. This is precisely the failure shape this repo documents at `OcrCaptureScreen.tsx:348-354` (*"a native `disabled` blurs the just-pressed element to `<body>`"*) and calls R-7/R-35.
2. **The refusal is silent.** The notice block at `:415-437` renders `failure`, `deviceFailure` and `audioDegraded` — there is no stop-gate reason line and no `aria-describedby`, so a screen-reader user meets a dead control with no explanation.

**Why this is not re-litigating a filed §.** §60f files the *decision to apply the gate to video* (the zero-byte `MediaRecorder` argument), which stands. §61b files the *mechanism* — and asserts the demo *"gates both, using the established `aria-disabled` + guarded-handler + `role="status"` reason idiom (§44b / R-15)"*. That statement holds for `AudioRecorderScreen` and does not hold for the video shutter, which is the same gate on the other capture surface.

**Same shape, longer windows (fold into one fix pass).** These use native `disabled` across genuinely multi-second in-flight work, where the focus drop is more visible:
- `OcrCaptureScreen.tsx:561` — `disabled={reading}` spans the tesseract worker boot: a ~109 KB worker, a 3.7 MB wasm core and a 2.8 MB language model fetched and compiled on first shutter (`ocr-recognize.ts:51-65`). Pressing Capture from the keyboard throws focus to `<body>` for the whole of that.
- `OcrCaptureScreen.tsx:502`, `:510`, `:518` and `MediaCaptureScreen.tsx:620` — `disabled={isOpening}` spans the browser's own permission prompt, which can sit open indefinitely.

**Fix.** Apply the `AudioRecorderScreen` shape to `MediaCaptureScreen`'s shutter: keep the button enabled, add `aria-disabled`, guard inside `onShutter` (which already returns early on `!canStop` at `:272`), render the reason in the existing notice block with a `role="status"` and point `aria-describedby` at it. For the in-flight cases, `aria-disabled` + guarded handler preserves the focus position across the wait.

---

### [MINOR · lane-MEDIUM] W-5 — The recording badge announces the elapsed time once a second for up to an hour

**File:** `features/demo/ui/screens/MediaCaptureScreen.tsx:376-407`

```tsx
<div role="timer" aria-live="polite" aria-label={`Recording ${formatDuration(elapsedMs)}`}>
  … <span>{formatDuration(elapsedMs)}</span>
</div>
```

**Issue.** `role="timer"` carries an implicit `aria-live` of `off` for exactly this reason; the explicit `polite` overrides it. `formatDuration` (`engine/logic/media/recording.ts:140-153`) renders `MM:SS`, so the region's text content changes once per second (`elapsedMs` itself ticks at `RECORDING_TICK_MS = 200`). A take that runs to the phone's 1-hour ceiling queues 3600 polite announcements, and because the badge is the only live region on the screen, every genuine status change (a grab failure, the device-list notice) queues behind them.

**Evidence.** The repo already knows this pattern and deliberately avoided it once: `features/demo/ui/screens/import/ImportTerminalProgress.tsx:573-577` sets `aria-live="off"` on the high-frequency log with the reason spelled out at `import/TerminalLine.tsx:30`. The audio recorder's identical timer (`AudioRecorderScreen.tsx:154-159`) is not a live region at all — so this PR ships the same widget two ways, one silent and one at 1 Hz.

**Fix.** Drop `aria-live="polite"` and keep `role="timer"` + the `aria-label` (screen readers will read the value on demand). If a recording-started/stopped announcement is wanted, put those two transitions through a separate `role="status"` line.

---

### [MINOR · lane-MEDIUM] W-6 — New infinite animations on the audio recorder are not reduced-motion gated

**File:** `features/demo/ui/screens/AudioRecorderScreen.tsx:170-177` (status dot: `blinkDot 1s ease-in-out infinite` while recording, `blinkDot 1.4s steps(1,end) infinite` while paused) and `:200` (waveform live dot: `blinkDot 2s ease-in-out infinite`)

**Issue.** `demo.css` is untouched by this PR (`git diff master...HEAD -- features/demo/ui/demo.css` is empty) and its own comment (`demo.css:120-122`) records that demo animations are *"gated by useReducedMotion at the call site"* — the demo's inline-styled motion is not covered by the class-matched `prefers-reduced-motion` block in `app/css/style.css`. These two are ungated, so a visitor with reduce-motion set sees two indefinitely blinking dots for the whole recording.

**Evidence of the convention, including in this same PR.** `MediaCaptureScreen.tsx:399` gates the *identical keyframe*: `animation: reduceMotion ? undefined : 'blinkDot 1s ease-in-out infinite'`. Existing sites: `DashboardScreen.tsx:96`, `import/PickerStage.tsx:115`, `import/ImportTerminalProgress.tsx:328/597/631`, `inputs/GpsCaptureControl.tsx:87`, `inputs/CameraGpsCapture.tsx:91`. The recorder half already threads a reduced-motion signal (`useAudioAnalyser.ts:48` `METER_TICK_MS_REDUCED`, plumbed via `AudioRecordingFlow.tsx:102`), so only the presentation layer missed it.

**Fix.** Give `AudioRecorderScreen` a `reduceMotion` prop off the flow's existing `deps.reducedMotion` (or call `useReducedMotion()` directly, as `MediaCaptureScreen` does) and make both `animation` values `undefined` under it. The same pass should cover the `transition` values on `Bar` (`:355`, `:358`), the level fill (`:231`) and `RecordButton`'s morph (`:408`) — see W-10.

---

### [MINOR · lane-MEDIUM] W-7 — `role="tablist"` without the tablist keyboard model or a tabpanel

**File:** `features/demo/ui/screens/MediaLibrarySheet.tsx:186-239` (the tablist), `:119` (the container that would be the panel)

**Issue.** Three `<button role="tab" aria-selected>` inside a `role="tablist"`, with:
- no `aria-controls` on any tab and no `role="tabpanel"` / `aria-labelledby` on `data-testid="media-library-content"`;
- no roving `tabIndex` — all three tabs sit in the Tab sequence, which is the opposite of the one-tab-stop model the role promises;
- no Left/Right arrow handling.

This is the repo's first `role="tablist"` (verified by grep across `features/` and `components/`).

**Concrete failure.** NVDA/VoiceOver announce "Photos tab, 1 of 3, selected"; the user presses Right Arrow, as the announced role instructs, and nothing happens. `aria-selected` names no panel, so the relationship between the selected tab and the list below it is not exposed at all.

**In-repo alternative, shipped in this same PR.** `MediaCaptureScreen.tsx:440-456` renders the identical segmented-control shape as `role="group"` + `aria-pressed` — fully operable, and honest about what the widget is.

**Fix.** Either complete the APG contract (roving tabindex + Left/Right/Home/End, `aria-controls` on each tab, `role="tabpanel"` + `aria-labelledby` + `tabIndex={0}` on the list container), or drop to `role="group"` + `aria-pressed` to match the sibling. The second is smaller and matches the repo.

---

### [MINOR · lane-MEDIUM] W-8 — The persisted OCR strip is JPEG-encoded at quality 1.0, ~2–3× the size §64a states

**File:** `features/demo/ui/screens/OcrCaptureScreen.tsx:92` (`OCR_CAPTURE_QUALITY = 1.0`) → `:232-239` (passed as `quality`) → `features/demo/ui/inputs/capture-media.ts:284` (blob) **and** `:295` (`canvas.toDataURL(mimeType, options.quality)`).

**Issue.** One `quality` value drives two consumers with different needs. The blob is what tesseract reads, so maximum quality is justified there. The data URL is what gets persisted as `OcrProof.imageDataUrl` and rendered into the Time-Offset report — it does not need q=1.0, and q=1.0 is the setting that preserves webcam sensor noise verbatim.

**New evidence (measurement, this worktree).** A synthetic 1152×122 strip (the demo's real capture size per §64f) with camera-grade Gaussian noise, encoded through `sips` at three quality levels:

| quality | JPEG | ≈ base64 |
|---|---|---|
| 100 | 122 342 B | ~163 KB |
| 90 | 73 687 B | ~98 KB |
| 80 | 62 940 B | ~84 KB |

§64a states *"a 720p frame yields a 1152×122 strip ≈ 25–60 KB JPEG ≈ 35–80 KB base64"* — which matches the q≈80–90 rows, not the q=100 the code actually ships. A colour frame off a glare-y DVR monitor (chroma planes, moiré) will exceed the q=100 figure again. The `targetWidth: 1280` pixel bound is enforced; the *byte* bound the § reasons about is not what the code produces.

**Why it matters beyond bytes.** The data URL lives inside `snapshotOf` (`persistence.ts:381-395`), so once a live read is committed it is re-`JSON.stringify`d and synchronously `storage.setItem`-ed on **every** debounced store change for the rest of the session (`persistence.ts:592-598`, `SAVE_DEBOUNCE_MS = 250`) — i.e. every ~250 ms while the visitor types in any wizard field, on the main thread. And WebKit charges sessionStorage in UTF-16 units, so a 163 K-character data URL costs ~326 KB against a ~5 MB budget; with the `capture.ocr` staging copy plus one proof per location, the headroom §64a reasons about is roughly a third of what it assumes. A quota overflow lands in the `catch` at `persistence.ts:599-604`, which **clears the snapshot** — the visitor's session persistence dies for the tab, surfaced only by a dev-mode `console.warn` and the drawer's status line when they next open it.

**Fix.** Decouple the two encodings: keep `quality: 1.0` for the recognition blob and re-encode the stored data URL at ~0.85 (`grabVideoFrame` would take a separate `dataUrlQuality`), or simply lower `OCR_CAPTURE_QUALITY` to ~0.9 — the node lab described in §64f is already set up to confirm recognition is unaffected.

---

### [MINOR · lane-MEDIUM] W-9 — Right-click on a media row opens the destructive delete confirmation

**File:** `features/demo/ui/screens/MediaLibrarySheet.tsx:509` (`useLongPress(onRequestDelete)`), primitive at `features/demo/ui/primitives/useLongPress.ts:190-202`

**Issue.** `useLongPress`'s `onContextMenu` `preventDefault()`s the browser menu and, when no hold has already fired, invokes the callback directly — that is the primitive's documented "context-menu path". At the two existing call sites (Dashboard card, Cases row) the callback opens a non-destructive actions tray. Here it is the delete confirmation, so a plain mouse right-click anywhere on a row pops *"Delete Media? …"* and suppresses the native menu.

**Concrete failure.** Chrome, mouse user: right-click a photo row (a normal reflex over a thumbnail — "copy image address", "open in new tab") and get a destructive confirmation dialog instead of the browser menu. Nothing is destroyed (Cancel is one click, and `AlertDialog` manages focus correctly), but this is the only one of the three call sites where the right-click affordance lands on a destructive path, and it is undiscoverable in the other direction.

**Fix.** Give `useLongPress` an opt-out for the context-menu invocation (`{ contextMenu: false }`) and use it for destructive callbacks, or hand the hook a non-destructive callback here (select the row) and leave delete on the visible button plus the hold.

---

### [MINOR · lane-MEDIUM] W-10 — The 40-bar waveform animates `height` on 80 nodes at ~16 Hz for the whole take

**File:** `features/demo/ui/screens/AudioRecorderScreen.tsx:207-212` (the bar row) and `:344-362` (`Bar`), driven by `features/demo/ui/inputs/useAudioAnalyser.ts:43` (`METER_TICK_MS = 60`) with `SPECTRUM_BAR_COUNT = 40` (`engine/logic/media/audio-levels.ts:24`)

**Issue.** Each bar renders two divs, each with `transition: height 90ms linear` on a **percentage** height. `useAudioAnalyser` publishes a fresh meter object every 60 ms, so 80 percentage heights are rewritten ~16×/sec and the 90 ms transitions re-start before they complete — meaning the browser runs style, **layout** and paint over the panel on essentially every frame, for the whole recording (up to the 1-hour ceiling), concurrently with a live `MediaRecorder` and an `AudioContext`. `height` is a layout property; the lane's own guidance is to animate `transform`/`opacity` instead.

Second, smaller item on the same path: `readAudioTrackFormat(stream)` is called at render scope (`AudioRecordingFlow.tsx:206`), so `track.getSettings()` runs ~16×/sec for a value that changes once per stream.

**Fix.** Give each bar a fixed height and animate `transform: scaleY(value)` with `transformOrigin: 'bottom'` / `'top'` (composited, no layout), or drop the CSS transition entirely and let the 60 ms tick carry the motion. Memoize `readAudioTrackFormat` on `[stream]`.

---

## Verified — not findings (recorded so the fix-delta does not re-check)

- **Bundle claim confirmed.** `pnpm build` in this worktree: `/demo` **107 kB First Load JS** (page 1.24 kB, shared 106 kB), unmoved from the stated baseline. Tesseract lands in lazy chunks only — `.next/static/chunks/812.*.js` (412 KB) plus a 16 KB sibling, reachable exclusively from the dynamic `import('tesseract.js')` at `ocr-recognize.ts:52`. The ~6.8 MB of `public/ocr/` assets are static files, fetched by the worker at first recognition, and are not in any chunk.
- **The wall holds.** No file under `components/`, `app/(default)/` or `lib/` imports `@/features/demo`. The only non-`app/demo` importer is the pre-existing server route `app/api/extract/route.ts` (engine-only, `logic/import`). No marketing chrome hoisted into `app/layout.tsx`.
- **Timer/listener teardown is complete.** Every new `setInterval` has a matching `clearInterval` (`useAudioAnalyser.ts:116/118`, `useMediaCapture.ts:220/230`, `AudioRecordingFlow.tsx:129/131`). No new `addEventListener` without removal.
- **No browser global at module scope** in any of the seven new `ui/inputs` modules — every one goes through a call-time `read*()` probe (`readBrowserMediaDevices`, `readBrowserRecorder`, `readBrowserObjectUrls`, `readBrowserAnalyser`, `readAudioContextCtor`). SSR-safe; `next/dynamic({ ssr: false })` is unchanged.
- **`AudioContext` lifecycle is correct.** Closed on stream change and on unmount (`useAudioAnalyser.ts:117-124` → `audio-analyser.ts:106-116`), and the analyser graph is deliberately not connected to `ctx.destination` (no feedback loop).
- **Tesseract worker lifecycle is correct.** Module singleton disposed on OCR screen unmount (`OcrCaptureScreen.tsx:191-196`), a failed boot is not cached (`ocr-recognize.ts:73-79`), and dispose awaits a boot in flight before terminating.
- **`MediaRecorder` teardown is sound.** `startStreamRecording` settles a pending `stop()` from `onerror` (`capture-media.ts:416-421`) and from `abort()` when the recorder was already inactive (`:467-476`), so no promise can hang the UI on "saving".
- **Object-URL ownership within a capture surface is correct.** `handOff()` runs only when the bridge reports the store took the item (`MediaCaptureScreen.tsx:293-302`), the unmount sweep aborts the recorder *before* `revokeAll()` (`useMediaCapture.ts:204-214`), and `replaceCaptured` revokes the displaced take (`:243-251`). The gap is only at the store-side cascade — W-1.
- **`srcObject` binding is correct on both viewfinders** (`MediaCaptureScreen.tsx:231-238`, `OcrCaptureScreen.tsx:200-207`): assigned in an effect, nulled in cleanup, and ref-attach ordering guarantees the element exists when the stream arrives.
- **OCR crop geometry is self-consistent.** `ocrCropRegion`'s cover math (`engine/logic/ocr-crop.ts:47-62`) matches the rendered container (`aspectRatio: 16/9` at `OcrCaptureScreen.tsx:458` with `objectFit: 'cover'` on the video at `:474`), so the strip is taken from the pixels actually on screen.
- **No CLS.** Every new `<img>` has an explicit box — `aspectRatio: '4 / 3'` (`MediaCaptureScreen.tsx:723`, `MediaLibrarySheet.tsx:382`), a fixed 56×34 span (`MediaLibrarySheet.tsx:598-618`), or 100%/100% (`:327-331`). The `next/image` bypasses are documented `blob:`-URL cases.
- **Styling half is correct throughout.** Inline `CSSProperties` everywhere under `features/demo/ui/**`, no Tailwind class leaked in, `demo.css` untouched, no new keyframes, no restyled lifted rules, no device-frame math changed.
- **Tree is green under load.** `pnpm vitest run` on `MediaCaptureScreen.test.tsx`, `MediaLibrarySheet.test.tsx`, `useMediaCapture.test.ts` — 3 files / 98 tests passing, run solo in this worktree.

Deliberately **not** re-flagged (filed, no new evidence): §58b browser-corrected remedy copy · §58c container-derived extensions · §58d no Permissions API · §58e/§60d single grant control · §59c collapsed sub-rows unmount · §59e/§63g anchor-vs-narration divergence · §60f the *decision* to gate video Stop (only the mechanism is W-4) · §60j `blinkDot` reuse over a new keyframe · §61a no auto-reset on the audio preview · §61b the gate binding both audio controls · §63b/§63c badge and meta-line substitutions · §63d native `<video>`/`<audio>` controls · §63e Escape closing the sheet from inside an overlay · §63f "1 items" · §64a persisting `imageDataUrl` at all (only its encoding quality is W-8) · §64b single-file wasm core · §64c/§64d crop geometry · §64h granted-but-closed viewfinder.

---

## Web Reviewer Summary

| Severity | Count |
|---|---|
| BLOCKER (CRITICAL) | 1 |
| MAJOR (HIGH) | 3 |
| MINOR (MEDIUM) | 6 |
| LOW | 0 |

Marketing↔demo isolation: **preserved**
Bundle impact: **none** — `/demo` First Load JS 107 kB, verified by `pnpm build` in this worktree; tesseract is lazy-chunked
Browser-resource cleanup: **gap found** — object URLs orphaned by the case/location delete cascade (W-1); camera held through the review stage (W-2)
Accessibility: **gaps found** — unmanaged `aria-modal` overlay (W-3), silent native-`disabled` refusal (W-4), 1 Hz live-region timer (W-5), ungated infinite motion (W-6), incomplete tablist (W-7)
Style-convention adherence: **correct half** throughout; lifted rules and device math untouched

**Verdict: BLOCK** (W-1). W-2/W-3/W-4 are single-site fixes with in-repo reference patterns; the six minors are independent.

Notes: this is an unusually clean platform diff for its size — the capability layer's injection seams, `read*()` probes and unmount sweeps are the right shape throughout, and every finding above is a *call site* that diverged from a pattern the same PR establishes elsewhere, not a design problem.
