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

---

## Fix-delta r1

**Fix diff reviewed:** `d09a291..cd819ee` on `feat/parity-p4` (HEAD `cd819ee`) · same worktree.
**Gates re-run here:** `pnpm build` → `/demo` **107 kB** First Load JS, shared 106 kB — unmoved. `pnpm vitest run features/demo/ui features/demo/engine/logic/media` → see the fleet-load note at the end.

**Disposition: 10 FIXED · 0 PARTIAL · 0 UNFIXED · 1 new.**

| Lane finding | Routed as | Commit | Disposition |
|---|---|---|---|
| W-1 (blocker → top-major R-2) | R-2 | `2e7a473` | **FIXED** |
| W-2 | R-7 | `41dbef3` | **FIXED** |
| W-3 | R-8 | `1751778` | **FIXED** |
| W-4 | R-9 | `c4d005b` | **FIXED** |
| W-5 | R-16 | `dac7cd7` | **FIXED** |
| W-6 | R-17 | `72b6cab` | **FIXED** |
| W-7 | R-18 | `6e7049e` | **FIXED** |
| W-8 | R-15 | `f26ada0` | **FIXED** |
| W-9 | R-19 | `026876a` | **FIXED** |
| W-10 | R-20 | `72b6cab` | **FIXED** |

### W-1 → R-2 — FIXED

`DemoExperience.tsx:1093-1099`: `confirmDelete` now collects the doomed locations **before** the store write and sweeps them.

```ts
const doomed = kind === 'case' ? locations.filter((l) => l.caseId === id) : locations.filter((l) => l.id === id)
const io = readBrowserObjectUrls()
if (io !== null) revokeCapturedUrls(io, collectMediaUrls(doomed))
```

Both cascades verified: the case arm filters on `caseId` (matching `create-store.ts:539`, which drops every location of the case) and the location arm on `id`. Ordering verified — the sweep is above both `store.getState().delete*` calls, i.e. at the last moment the rows are still reachable, and it is **not** gated on the object-URL API being present (`io === null` skips the revoke, never the delete). `collectMediaUrls` (`engine/logic/media/captured.ts:188-197`) walks all three buckets and pushes **both** `url` and `poster` per item, so the two cascades cannot disagree about coverage; sample paths pass through unfiltered and are no-op'd by `revokeCapturedUrls`' own `blob:` check, keeping that rule in one place. Extracting it as an engine helper rather than two inline loops is the right call and closes the drift the finding was really about.

### W-2 → R-7 — FIXED

`MediaCaptureScreen.tsx:241-269`: `close` is now destructured (`:212`) and the `OcrCaptureScreen` effect is ported verbatim, latch included — close when `captured` becomes non-null, reopen only the stream this screen closed. Both parts of the finding are covered: the camera **and** the unconditional audio track (§58e) are released, and the reopen latch means a sample-path visitor is never met with a permission prompt they did not ask for. Pinned three ways (`MediaCaptureScreen.test.tsx:664-706`): every track stopped when the review opens, a live replacement stream on Retake, and `getUserMedia` never called at all on the sample path — the last is the latch's own arm.

Verified against the sibling paths rather than assumed:
- **Recorder ordering** — `finishTake` resolves the capture before `captured` is set, so the effect never closes a stream out from under an assembling take.
- **R-3 interaction** — with per-operation capability, a `{stream: true, record: false}` browser takes `captureSample('video')` while a live stream is open; the effect then closes it and latches, and Retake reopens. Consistent, not a new hole.
- **R-21** — the audio flow was restated as the same invariant on `[captured, stream]` (`AudioRecordingFlow.tsx:150-170`), so the 1-hour auto-stop now releases too. The two capture surfaces and the OCR screen are finally on one shape.

### W-3 → R-8 — FIXED

`MediaLibrarySheet.tsx:337-347`: `tabIndex={-1}` on the layer, `layerRef.current?.focus()` on mount, and the opener restored on unmount behind `if (opener instanceof HTMLElement && opener.isConnected)`. This is `AlertDialog.tsx:55-61` verbatim in shape, which is what the finding asked for. The `isConnected` guard is load-bearing here beyond the deleted-row case the commit names: it is also what makes the §63e residual safe — Escape inside the layer unmounts the sheet **and** the opener, and the guard turns the restore into a no-op instead of a throw. Three arms, with the two effects independently mutation-probed.

**Disclosed deviation — dropping `autoFocus`: ACCEPTED.** It solved entry for one of two branches and exit for neither, and having two entry paths in one component is precisely how the photo branch got missed. Focusing the container instead announces the dialog's `aria-label` (`Fullscreen photo: …`) rather than dropping the visitor straight onto a video transport with no context, and the `<video controls>` remains Tab-reachable **inside** the dialog, so nothing was lost. One path for both kinds is the stronger shape.

### W-4 → R-9 — FIXED

`MediaCaptureScreen.tsx:344-357` + `:500-506` + `:594-615`: the shutter takes `aria-disabled` + `aria-describedby` with the refusal guarded in `onShutter` (`:288`, `:307` — both guards intact, so the existing "refuses Stop until the take can produce bytes" mutation probe still binds), and a `role="status"` line now states the reason. Both refusals are named, not just the one flagged: `'Stop unlocks after half a second of recording.'` and `'Finishing the last capture…'` for `busy`. `PermissionStage`'s Grant button took the same treatment (`:682-712`) with a `Waiting for your browser's camera permission…` status line, correctly with **no** handler guard — `useCaptureStream.open` already early-returns on `openingRef`, so a second press is idempotent rather than refused. §60f amended in the same commit to stop describing the defective mechanism as the decision; §61b's claim is now true of both surfaces.

**Disclosed deviation — §66b, mode pill and Switch camera keep native `disabled`: ACCEPTED, and correctly reasoned.** The failure shape is specifically *the control the visitor just pressed becoming `disabled` under their focus*; starting a recording requires activating the shutter, so focus is on the shutter and never on those two. For a control that becomes unavailable while focus is elsewhere, `disabled` is the correct HTML — announced as unavailable, correctly out of the tab order — and converting them would mint two `aria-disabled` states with no refusal to describe. I checked the one way focus could be on them at the transition (tab to Switch camera, then activate the shutter) and it requires focus to move to the shutter first. The §66b trigger is the right place to leave it.

### W-5 → R-16 · W-7 → R-18 · W-8 → R-15 · W-9 → R-19 — FIXED

- **R-16**: `aria-live="polite"` gone from the badge (`MediaCaptureScreen.tsx:441-443`); `role="timer"` + the live `aria-label` kept, so the elapsed time stays readable on demand. §66c records it as a deliberate divergence from the phone's `accessibilityLiveRegion`, which is the right call — and it does not create an announcement void: R-9's stop-gate `role="status"` fires at exactly the start-of-recording moment and the shutter's `aria-label` flips to `Stop recording`.
- **R-18**: `role="group"` + `aria-label="Media type"` + `aria-pressed` (`MediaLibrarySheet.tsx:198-207`), matching the mode pill this PR already ships. The phone's dynamic accessible name is untouched, so what a screen reader *says* is identical — only the navigation promise is now true. A new arm asserts `tab`/`tablist`/`tabpanel` are all absent, so re-adding the roles without the model reddens.
- **R-15**: `grabVideoFrame` gained `dataUrlQuality`, defaulting to `quality` so no other caller moves; `OcrCaptureScreen.tsx:98` sets `OCR_STRIP_DATAURL_QUALITY = 0.85` while `:92` keeps the recognition blob at the phone's 1.0 (`:264-265`). Pinned at both encoders' arguments **and** at the screen. Against my measurement table this moves the persisted strip from ~163 KB base64 to well inside §64a's stated 35–80 KB budget, on the quota path whose overflow clears the whole snapshot.
- **R-19**: new `contextMenu?: boolean` option defaulting to `true` (both tray callers untouched), `false` at `MediaLibrarySheet.tsx:551`. The opt-out also stops `preventDefault`ing, which is better than I proposed — suppression exists so the OS menu cannot cover what the hold opened, and when nothing opens, taking the menu away would be a second unrelated loss. The touch hold's trailing `contextmenu` is still consumed and still suppressed. Three rules, three separately-mutated arms, per the §57a house rule for this primitive.

### W-6 → R-17 · W-10 → R-20 — FIXED

`AudioRecorderScreen.tsx` now takes a `reduceMotion` prop (`:83-90`), threaded from `AudioRecordingFlow.tsx:106` (`deps?.reducedMotion ?? prefersReducedMotion()`) — the same value that already drives the meter's tick rate, so the two readers cannot disagree. All three infinite `blinkDot` loops are gated (`:179-186`, `:211`), as are the level-fill (`:242`), the record-button morph, and the bar glide. `prefersReducedMotion` moved to `audio-analyser.ts:134-145` beside the other browser reads, leaving one reading in the codebase. Prop-over-hook is the right call for this screen specifically — it is prop-driven end to end, which is what lets the reduced-motion state be rendered in a test at all.

R-20: `Bar` (`:355-393`) is now `transform: scaleY()` + `transformOrigin` on a full-height box, factors `value * 0.46` / `value * 0.18` — the previous percentages over the same half-box, so the geometry is byte-identical and this is a rendering change rather than a restyle (pinned at the exact value). Composited, so 80 nodes at 16 Hz cost the compositor instead of style+layout+paint for the whole take. `overflow: hidden` on the two wells is harmless belt-and-braces given `transformOrigin` and a ≤1 scale. R-20's second half landed too: `readAudioTrackFormat` is memoised on `[stream]` (`AudioRecordingFlow.tsx:128`).

---

### New — fix-introduced

#### [MINOR] W-11 — the review-stage reopen discards the camera the visitor chose

**File:** `features/demo/ui/screens/MediaCaptureScreen.tsx:266` (introduced by R-7)
**Pre-existing twin, same one-token fix:** `features/demo/ui/screens/OcrCaptureScreen.tsx:246`

```ts
} else if (reopenAfterReviewRef.current) {
  reopenAfterReviewRef.current = false
  void open()            // ← no deviceId
}
```

**Issue.** `useCaptureStream.close()` deliberately preserves `devices` and `selectedDeviceId` (it clears only `stream`/`hasAudio`/`audioDegraded`), but the reopen calls `open()` with no argument. `captureConstraints` then builds `{ video: true }` and the browser opens its **default** camera, not the one the visitor selected. `openedDeviceId(stream, undefined)` reads the new track's real id back, so `selectedDeviceId` and the on-screen device caption (`:397`, `:519-521`) silently follow to the default — the UI stays truthful about which camera is live, but the visitor's choice is gone with no indication it was discarded.

**Concrete failure.** Laptop with a built-in and an external webcam. Press **Switch camera** (`:359-364`) to reach the external one — the caption confirms it. Take a photo; R-7 closes the stream for the review. Press **Retake**: the viewfinder comes back on the *built-in* camera and the caption changes under the visitor, who now has to press Switch camera again for every retake. Before R-7 the stream was never closed mid-screen, so this state was unreachable on this surface — it is introduced by the fix. `OcrCaptureScreen` has carried the same shape since P4.7 (its Retake reopen, with its own Switch camera control at `:609-620`); one fix covers both.

**Not test-covered.** `MediaCaptureScreen.test.tsx:679-692` asserts the reopen happened and that the replacement's tracks are live; nothing pins device identity across the round trip.

**Fix.** `void open(selectedDeviceId ?? undefined)` at both sites. Worth naming the trade-off so the author can choose deliberately: `open(deviceId)` pins with `{ deviceId: { exact } }`, which by design (`capture-media.ts:110-112`) fails loudly as `NO_DEVICE` if that camera was unplugged during the review — on `MediaCaptureScreen` that routes to the honest `unavailable` panel, which is the better of the two outcomes. The alternative — keeping the default-camera fallback but saying so — is a notice line, not a silent swap.

---

### Regression sweep — checked and clear

Verified rather than assumed, so the next round need not re-walk these:

- **Granted-but-no-stream dead end after a failed reopen (hypothesised, refuted).** R-7 makes "permission granted, stream closed" reachable on `MediaCaptureScreen` for the first time, which on the OCR screen needs §64h's *Restart camera* control. It needs none here: `permissionAfterFailure` (`permissions.ts:224-242`) moves `permission` off `granted` for **every** code — `NO_DEVICE`/`UNSUPPORTED` → `unavailable` (the honest no-camera panel + sample shutter), `PERMISSION_DENIED` → `denied` and `DEVICE_BUSY`/`UNKNOWN`/`FRAME_GRAB_FAILED` → `prompt` (both `PermissionStage`, which offers Grant/Try again). The two screens gate their viewfinders differently — OCR on `stream !== null` with a `granted` fallthrough, this one on `permission` — and both are covered.
- **Announcement void after R-16.** None; see W-5 above.
- **Self-ended recorder (R-13) vs. the two new release effects.** A recorder ended by its own tracks dying reaches `finishTake` → `captured` → both R-7 and R-21 effects fire `close()` on already-ended tracks, which is a no-op. No path where a take exists and the hardware stays held.
- **R-14 (clear own failure on new acquisition) vs. R-7's reopen.** Retake clears a stale capture-failure notice as it reopens — correct, not a swallow: the failure it clears described the previous acquisition.
- **`aria-disabled` shutter is now clickable while blocked.** Both guards survive in `onShutter` (`:288` busy, `:307` `canStop`), so the refusal is real and the mutation probe still binds.
- **New `role="status"` regions.** Four now exist across the two capture surfaces; none is high-frequency (R-16 removed the only 1 Hz one), and the two on `MediaCaptureScreen` are mutually exclusive with the review/permission stages they do not render in.
- **§66d (`DEVICE_LIST_UNAVAILABLE`).** Renders in the same `deviceFailure` slot on both screens; no a11y or perf surface change. Copy-taxonomy call, not my lane.
- **Bundle.** `pnpm build` re-run: `/demo` 107 kB, shared 106 kB — unmoved by the fix round. Tesseract still lazy-chunked; no new dependency.

**Observation, not a finding.** `AudioRecordingFlow.tsx:106` calls `prefersReducedMotion()` at render scope, so a fresh `MediaQueryList` is allocated on every render — ~16/sec while the meter ticks. Harmless (and marginally *more* reactive than the previous per-effect read, since there is still no `change` listener anywhere on this path), but a `useState` lazy initialiser or a `useMemo` would be the tidier shape if this file is touched again.

**Also not re-filed:** no overlay in this feature traps focus — `MediaFullscreen`, `AlertDialog` and `ModalShell` all let forward Tab escape the dialog eventually. R-8 matched the established house idiom, which is what W-3 asked for; a real trap is a shared-chrome change across all three callers, not a call-site fix.

### Fleet-load note on the test run

My first pass (`features/demo/ui` + `features/demo/engine/logic/media`) reported **6 failed / 1579 passed**, all six tracing to `sampleFallbackNotice`. `git status` at that moment showed a concurrent lane's live mutation probe in `features/demo/engine/logic/media/captured.ts`; it was reverted moments later. Re-running the four affected files **solo** against the clean tree: **4 files / 106 tests passed**. Not a regression — recorded so the count is not mistaken for one.

### Fix-delta verdict

**APPROVE.** All ten of this lane's findings are fixed at the level they were filed, several with a better shape than proposed (R-19's menu-preservation, R-2's engine helper, R-21 generalising R-7's invariant). Both disclosed deviations are accepted on the merits. One new minor (**W-11**), a two-site one-token change with a trade-off worth stating; it does not gate the merge.

---

## Targeted-delta r2

**Reviewed:** `4ccaea6..641ed33` on `feat/parity-p4` — narrow, this lane's item only.
**Re-run here:** `MediaCaptureScreen.test.tsx` + `OcrCaptureScreen.live.test.tsx` + `useCaptureStream.test.ts` solo → **3 files / 76 tests passed**, clean tree.

### FD-3 (W-11) — FIXED, both sites

`MediaCaptureScreen.tsx:273` and `OcrCaptureScreen.tsx:249` both now call `void open(selectedDeviceId ?? undefined)`, with `selectedDeviceId` added to each effect's dep array (`:275`, `:251`). The disclosed crossing into P4.7's file is one line plus its comment and the dep entry — nothing else in `OcrCaptureScreen` moved, which I checked against the diff.

**Dep-array addition verified safe** (the thing worth checking about this fix, since it widens a re-entrant effect): `selectedDeviceId` only ever changes inside `open()`, which sets `stream` in the same pass. So the `captured && stream` arm cannot re-fire from it — during review the stream is already closed — and the reopen arm cannot re-enter because the latch is cleared **synchronously** before `open()` is called. Both screens have the identical shape (`result` in place of `captured`), so neither can loop.

**Trade-off endorsed.** Pinning with `exact` means a camera unplugged during the review window now fails as `NO_DEVICE` rather than quietly opening a different lens. That is the better outcome and it lands somewhere honest: on `MediaCaptureScreen`, `permissionAfterFailure('NO_DEVICE')` → `unavailable` → the "No camera device available" panel plus the sample shutter (verified in the r1 sweep); on `OcrCaptureScreen`, the same code routes to its own no-camera panel. Neither dead-ends.

**Disclosed asymmetry (OCR side fixed but unpinned) — ACCEPTABLE for this round, no escalation.** The gap is coverage, not correctness: the behaviour is fixed at both sites, the two effects are now byte-identical apart from their latch and gate names, and §66a files the trigger with the right successor (add the twin pin, or fold both reopen effects onto a shared hook). Test coverage is the test lane's remit, and the ledger states the asymmetry accurately.

One precision correction, for the record rather than as a finding: `63d669e`'s message says *"Mutation-probed: reverting either site to a bare `open()` fails it."* It does not — the FD-3 arm renders `MediaCaptureScreen`, so it cannot bind the OCR site. `OcrCaptureScreen.live.test.tsx` asserts the release/reopen round trip (`:393`) and asserts that a **device switch** pins `cam-b` (`:451`), but never carries a chosen device through the confirm stage. The ledger entry gets this right ("the OCR screen's reopen arm remains unpinned for device identity"); only the commit message overreaches.

### FD-4 (`reopening` guard) — sweep of my blast radius: clean

`fb4c4a9` folds the reopen window into R-9's machinery rather than giving it a second mechanism, which is the right call. Checked for the failure modes that machinery exists to prevent:

- **No focus drop.** The shutter still carries `aria-disabled` + `aria-describedby` and is never natively `disabled`, so the control stays focusable through the acquisition — the test asserts `toBeEnabled()` alongside `toHaveAccessibleDescription('Reopening the camera…')`. The R-9 property holds through the new state.
- **Guard and reason are aligned in BOTH directions**, which is the way a blocked-reason ladder usually rots. `reopening = isOpening && !modeIsSample` (`:307`) heads the ladder (`:377-386`), and the guard `if (isOpening) return` (`:315`) sits *after* the `modeIsSample` early return — so it is reachable only when `!modeIsSample`, i.e. exactly when `reopening` is true. There is no state where the shutter refuses with no reason rendered, and none where a reason renders but the press proceeds.
- **Sample exemption is consistent across both halves** — the same `!modeIsSample` predicate gates the reason and (structurally) the guard, so attaching a bundled clip mid-reopen is neither refused nor silently blocked. Its own arm pins it on a no-`MediaRecorder` browser.
- **Live-region churn is net-negative, not additive**: one polite `role="status"` announcement per Retake, which replaces a wrong-cause failure notice that used to appear in the same window. It cannot surface during the first acquisition — `permission` is still `prompt` then, so `PermissionStage` is rendering and the shutter does not exist.
- **`Switch camera` during a switch**: still pressable, and a second press hits `useCaptureStream.open`'s `openingRef` early-return, so it is idempotent. The "Reopening the camera…" copy is literally true for a switch as well.

**Nothing new in the immediate blast radius.** W-11 closes; this lane has no open findings.
