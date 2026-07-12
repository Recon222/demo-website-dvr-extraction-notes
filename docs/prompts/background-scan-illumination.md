# Task Brief — Background Scan Illumination (Case-File marketing site)

**Branch:** `feat/layout-touchups` (already checked out). Build on the **current working tree** — the blueprint grid's resting brightness was just nudged to `rgba(153,186,221,0.035)` and is uncommitted; keep that as the baseline.
**Repo:** DVR Extraction Notes marketing site — Next.js App Router + React 19 + Tailwind CSS v4, "Case-File" design system. Orient via `CLAUDE.md`. Package manager is **pnpm**.

> This brief is deliberately **what we want and why — not how.** You're a stronger frontend engineer than whoever wrote it; the technique is yours. Everything below is a real requirement or context, not an implementation hint. Prototype the approach you think reads most natural.

---

## What we want

Add ambient depth to the marketing background: **a scan line that sweeps slowly and vertically down the page's blueprint grid, and — as it passes — the grid lines it's currently over illuminate slightly, then settle back to rest as it moves on.** Think of a wave of light travelling across an etched glass surface: the grid catches the light where the scan is, glows gently, and returns to its resting state behind it.

**The motif has a story — honor it.** We just removed the scan line from the *phone mockups* (the phone's internal scan came out in commit `469557b` — "recordings carry the real thing"). The intent now is that the scanning light moves **from the device out into the environment**: the whole Case-File surface feels quietly scanned/alive, not just the phone. Make it feel like a continuation of that idea, not a bolt-on.

## Definition of "natural" (the north star for taste)

- The illumination **travels with the scan** — a localized band that brightens the grid beneath it and softly falls off at its edges. **Not** a full-grid flash; **not** a hard, bright bar.
- It **eases** — brightest at the scan, gentle falloff, and the grid returns to its resting brightness once the light has passed.
- It is **atmosphere, not a light show.** The grid at rest is very subtle (~3.5% alpha); the lit state is a gentle lift in the same restrained register as the rest of the Case-File ambience (the slow blinking dots, the soft radial glows). If it reads as "the background is quietly breathing," it's right. If it grabs the eye or looks like a screensaver, it's too much — dial it down.

## Context you'll want (so you don't have to hunt)

- **The grid** is the full-page blueprint background: the `before:` pseudo-element on the `(default)` route-group layout — `app/(default)/layout.tsx`. It's `rgba(153,186,221,…)` hairlines and currently sits **behind** all page content.
- **Stacking here is load-bearing and already correct — preserve it.** That background layer sits behind content on purpose: the wrapper uses `isolate` and the decorative layer uses a negative z-index. A previous iteration shipped a decorative layer that painted *over* the hero content (a positioned element over static siblings, per CSS paint order) and it had to be fixed. **Do not reintroduce that.** Your scan + illumination must live on the same behind-content background plane and must never wash over, dim, tint, or intercept clicks on any text or UI.
- **The animation infra already exists.** `app/css/style.css` (Tailwind v4 `@theme` block) defines the Case-File keyframes, including a `scanSweep` keyframe that is **currently orphaned** (it left the phone in `469557b`). Reuse / relocate the motif however you see fit. The design tokens (ink / carolina / blue / cyan / gold) live in that same `@theme` block.
- **Reduced motion is required.** `style.css` has a `@media (prefers-reduced-motion: reduce)` block that pauses the class-based ambient animations. Your scan must be disabled/paused under reduced motion, consistent with that pattern — a reduced-motion user sees the **static** grid: no sweep, no illumination.
- **Server-component, CSS-first.** `(default)/layout.tsx` is a server component and the design is intentionally static / CSS-driven (AOS was removed; there is no scroll-spy; no client JS is used for ambience). **Strongly prefer a pure-CSS solution with no new client component or JS.** If you genuinely believe JS is required, say why rather than adding it silently.
- **Don't confuse it with the phone's inner grid.** `components/marketing/phone-frame.tsx` has a *separate*, unrelated grid (higher alpha) *inside* the phone screen. Leave that alone.

## Requirements (must all hold)

- Sweeps over the marketing background grid, **behind all content**, with zero effect on readability or interaction.
- The grid **illuminates locally under the scan and eases back** — natural, subtle, ambient (per the north star above).
- Respects `prefers-reduced-motion` → no motion, static grid.
- Smooth and cheap: no jank, no full-page repaint storms; fine on a long, scrolling page and on mid-range hardware.
- Applies across the whole `(default)` marketing group (home, features, beta, privacy). Whether the sweep is viewport-anchored or page-scoped is **your call** — optimize for "ambient presence as the user moves through the page."
- Keep the existing resting grid brightness (`0.035`) as-is unless you have a strong reason; this task is about the *moving illumination*, not re-tuning the base grid.

## Out of scope / please don't

- Don't touch the phone's internal screen grid or the phone frame.
- Don't add a client-side animation library or any heavy dependency.
- Don't make it fast, loud, or attention-grabbing.
- Don't break the behind-content stacking invariant.

## Acceptance criteria

- On the home page (and the other marketing pages), a subtle band of light travels down the grid; the grid lines glow under it and settle after — **visible but calm, unmistakably part of the design.**
- Text and UI are fully unaffected (readability + clickability).
- Reduced motion: static grid, no sweep.
- Smooth on scroll; no perceptible perf regression.
- Green tree: `pnpm exec tsc --noEmit`, `pnpm test`, and `pnpm build` all pass.
- Leave the work **uncommitted (or as a single clean commit) on `feat/layout-touchups`** for the human to eyeball and tune. **Expect a round of "brighter / slower / softer / wider" dialing** — so make the key knobs (sweep speed, illumination intensity, band width/softness) easy to find and adjust, and note where they are.

## Run / verify

- Dev server: `pnpm dev` (Turbopack, http://localhost:3000).
- Gates: `pnpm exec tsc --noEmit` · `pnpm test` · `pnpm build`.

## Finally

Prototype the illumination approach you think reads most natural, tune it to the restrained Case-File register, and surface the tuning knobs so we can dial it in together. If two approaches come out close, ship the one that looks best and leave a one-line note on the trade-off.
