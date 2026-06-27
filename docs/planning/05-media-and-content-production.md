# 05 · Media & Content Production

The site leans on two visual asset types:
1. **High-res screen-capture loops** of the app in action (one per feature page + the homepage hero).
2. **User-facing data-flow diagrams** (Gemini-produced) for the "under the hood" sections.

This doc sets the format decisions, the capture→web pipeline, and the asset conventions so Kris
and Gemini can produce assets that drop straight in.

---

## "High-res GIF" → use video, not GIF (researched 2026-05)

Kris said "high res gif or whatever they're called." The right answer for crisp, large motion on
the web is **not** an animated GIF — GIFs are huge and low-color. Use an **HTML5 `<video>` that
behaves like a GIF**:

```html
<video autoplay loop muted playsinline poster="poster.webp" width="…" height="…">
  <source src="demo.webm" type="video/webm">   <!-- primary, smallest -->
  <source src="demo.mp4"  type="video/mp4">    <!-- fallback, universal -->
</video>
```

- `autoplay loop muted playsinline` reproduces GIF behaviour (silent, auto, looping) and is the
  documented best practice. Result is typically **10–20× smaller** than the equivalent GIF.
- Always set `width`/`height` (or aspect-ratio) to avoid layout shift (CLS), and a small `poster`
  (<~5 KB) so the first frame paints fast.

### Capture → encode pipeline

1. **Capture** at device resolution: iOS Screen Recording (or QuickTime "Movie Recording" from a
   connected iPhone for clean, cursor-free capture). Record a tight, deliberate 4–10s action per
   feature. Keep it short and looping-friendly (start/end on a similar frame).
2. **Trim** to the exact beat.
3. **Encode** with ffmpeg (recipes verified against web.dev guidance):

```bash
# MP4 (H.264) — universal fallback
ffmpeg -i raw.mov -movflags +faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -crf 23 demo.mp4

# WebM (VP9) — primary, smaller
ffmpeg -i raw.mov -c:v libvpx-vp9 -b:v 0 -crf 33 -an demo.webm

# Poster (first frame)
ffmpeg -i raw.mov -frames:v 1 -q:v 2 poster.png   # then convert to .webp
```

- `-movflags +faststart` lets playback begin before full download; `-pix_fmt yuv420p` maximises
  browser compatibility; tune `-crf` (lower = higher quality/bigger). Aim each loop **< ~1–2 MB**.
- Strip audio (`-an`) — these are silent loops.
- For phone-shaped (portrait) demos, keep them portrait; don't letterbox into a wide frame.

### Reduced motion & performance

- Respect `prefers-reduced-motion`: if set, show the `poster` still (and don't autoplay) — wrap the
  `<video>` in a small client component that checks the media query, or provide a static fallback.
- **Lazy-load** below-the-fold videos (`preload="none"` + load on scroll/intersection) so the
  homepage stays fast. Only the hero loop should be eager.
- One reusable `<AppDemo>` client component should encapsulate: sources, poster, lazy-load,
  reduced-motion fallback, width/height. Build once, reuse on every feature page.

### The homepage walkthrough video

- The longer narrated walkthrough (Kris recording) goes in the hero **modal** (`modal-video.tsx`
  already plays self-hosted mp4). Provide both `.webm` + `.mp4`, plus a poster.
- Consider a **short silent autoplay teaser loop** inline in the hero, with the full narrated
  version behind the play button. Best of both: motion on load, depth on click.
- If the walkthrough is long/high-bitrate, consider hosting it on a CDN/streaming host rather than
  shipping a 100 MB mp4 from the origin. (Decision in doc 07.)

---

## Data-flow diagrams (Gemini)

Per feature page, an "under the hood" diagram that explains the technical story **to a
non-engineer** (the audience is investigators, not developers). Keep them clean, labelled,
on-brand (navy / Carolina blue / gold; mono labels).

Diagram briefs (see doc 02 for context):

- **Time calibration:** the traceability chain — *DVR clock → phone OCR → NTP server → atomic
  clock → UTC → your offset (time-stamped).* The marquee diagram; consider animating the chain.
- **Import autofill:** *request (PDF/email) → on-device AI → structured fields*, with a "stays on
  device" lock motif.
- **Reports:** *wizard fields → aggregator → bullet notes + PDF* fan-in.
- **Evidence capture:** the on-disk tree *case → locations → media/{photos,videos,audio}*.
- **Secure export:** *case → encrypted ZIP (locked) → share sheet*, showing the zip's internal tree.
- **On-device/privacy:** two columns — *stays on device* vs *what leaves (time packets, map
  queries, anon crash reports)*.

Deliverable format from Gemini: **SVG preferred** (crisp at any size, small, themeable), PNG/WebP
acceptable at 2× for raster. Provide light-on-dark versions to match the site.

> Hand-off: give Gemini doc 02 + this section's briefs + the palette/fonts from doc 03. Ask for one
> diagram per feature, SVG, dark background, with a 1–2 sentence caption each.

---

## Asset conventions

```
public/
  demos/<feature-slug>/{demo.webm, demo.mp4, poster.webp}
  diagrams/<feature-slug>.svg
  walkthrough/{walkthrough.webm, walkthrough.mp4, poster.webp}
  brand/{logo.svg, wordmark.svg, og-image.png}
```

- One folder per feature keeps the `[slug]`-driven feature page trivial to wire.
- Name by **feature slug** (doc 03), so content arrays can compute paths.
- Provide an OG/social share image (`og-image.png`, 1200×630) for link unfurls — set in
  `app/layout.tsx` metadata.

## What's needed from Kris (content production)

- Screen recordings per P0/P1 feature (doc 02 priority).
- The narrated homepage walkthrough.
- The app logo/wordmark in SVG.
- Sign-off on real numbers/claims (doc 01 / doc 02 guardrails).

## Sources

- [Replace animated GIFs with video — web.dev](https://web.dev/replace-gifs-with-videos/)
- [Replace GIFs with video (codelab) — web.dev](https://web.dev/articles/codelab-replace-gifs-with-video)
- [Video performance — web.dev](https://web.dev/learn/performance/video-performance)
- [Use video formats for animated content — Chrome for Developers / Lighthouse](https://developer.chrome.com/en/docs/lighthouse/performance/efficient-animated-content/)
