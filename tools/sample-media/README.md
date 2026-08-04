# Sample media generators

Provenance for the four binaries in `public/demo-media/`. They are the demo's **sample
fallback** assets: what the capture surfaces attach when the browser exposes no camera or
microphone to the page at all (see `features/demo/engine/logic/media/samples.ts`). They are
never presented as a real capture — every surface labels them, and `MediaItem.sample` rides
with them into the store.

Committing the generators keeps the binaries auditable: a reviewer can regenerate them and
diff, rather than taking an opaque blob on trust. Nothing here runs at build time or ships in
the bundle; these are authoring-time scripts, run once on macOS.

```bash
# From the repo root. Requires macOS (AVFoundation / CoreGraphics / afconvert) + python3.
swift tools/sample-media/make-sample-video.swift public/demo-media/sample-clip.mp4
swift tools/sample-media/make-sample-still.swift public/demo-media/sample-photo.jpg 640 480 \
  "SAMPLE PHOTO" "NO CAMERA AVAILABLE IN THIS BROWSER"
swift tools/sample-media/make-sample-still.swift public/demo-media/sample-clip-poster.jpg 640 360 \
  "SAMPLE CLIP" "NO CAMERA AVAILABLE IN THIS BROWSER"

python3 tools/sample-media/make-sample-audio.py /tmp/sample-note.wav
afconvert -f m4af -d aac -b 48000 /tmp/sample-note.wav public/demo-media/sample-note.m4a
```

| Asset | What it is | Size |
|---|---|---|
| `sample-photo.jpg` | 640×480 still, dark slate + framing brackets, reads "SAMPLE PHOTO / NO CAMERA AVAILABLE IN THIS BROWSER" | ~33 kB |
| `sample-clip.mp4` | 4 s, 640×360, 12 fps H.264 baseline. Same card plus a sweep bar and a running timecode, so it is unmistakably moving footage rather than a still | ~37 kB |
| `sample-clip-poster.jpg` | 640×360 poster for the clip | ~26 kB |
| `sample-note.m4a` | 4 s mono 22.05 kHz AAC — three short synthetic tones at 0.4 s / 1.6 s / 2.8 s. Deliberately not speech: an audio placeholder that said words could be mistaken for a real note | ~7 kB |

They live in `public/`, so they are served as static files and never enter the `/demo` JS
bundle (First Load is pinned at 107 kB).
