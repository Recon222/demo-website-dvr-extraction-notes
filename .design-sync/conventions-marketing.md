# Case File — how to build with this design system

This is the **DVR Extraction Notes** marketing design system ("Case File"): a
dark, technical, evidence-dossier look for a CCTV/DVR forensic-recovery iOS app.
Every component is real, compiled React from the product's own codebase. Build
with them the way the app does — the conventions below are concrete, not advice.

## Setup — no provider needed (one exception)

Most components are plain server components: import and render, no wrapper.

- **The ground is dark by construction.** `styles.css` sets `<body>` to the ink
  ground (`--color-ink-950`, near-black) with light body text. Components draw on
  that ground and set no background of their own — their headings are near-white,
  so **do not place them on a light surface**. Keep the dark body; paint a lighter
  panel only on an inner subtree if you must.
- **Pathname-aware components** (`ManifestTabStrip`) read the active route to light
  a tab gold. Wrap them in `PathnameProvider` (exported from the library) to set
  which route is active:
  ```jsx
  import { ManifestTabStrip, PathnameProvider } from '<library>'
  <PathnameProvider value="/features/time-calibration">
    <ManifestTabStrip items={items} />
  </PathnameProvider>
  ```
  Without it they render in the resting (no-active-tab) state — still valid.

## Styling idiom — Tailwind utilities with the Case File token vocabulary

Style your own layout glue with these utility classes (they are the design
language — use them, don't invent hex values):

- **Type families:** `font-nacelle` (display headings), `font-inter` (body),
  `font-stmono` (Share Tech Mono — labels, eyebrows, chips), `font-jbmono`
  (JetBrains Mono — numbers, timestamps, tags).
- **Text colors:** `text-heading` (near-white headings), `text-body` /
  `text-body-2` (paragraphs), `text-muted` / `text-faint` / `text-ghost`
  (descending de-emphasis), `text-tab-label`. Accents: `text-carolina`,
  `text-cyan`, `text-gold`, `text-blue`.
- **Backgrounds:** `bg-ink-900`, `bg-panel-800` (translucent panel), `bg-chip`.
  Accent fills: `bg-cyan`, `bg-gold`, `bg-blue`, `bg-carolina` (usually at low
  opacity, e.g. `bg-gold/10`).
- **Borders:** `border-hairline` (the default thin divider), `border-row-divider`,
  `border-tab`, `border-input`; accent borders `border-cyan` / `border-gold` /
  `border-blue` (often `/55` opacity).

Accent meaning (from the manifest system): **gold** = core/flagship, **blue** =
field, **cyan** = trust/security. Reach for the one that matches intent.

## Where the real rules live

- `styles.css` and its `@import` closure (incl. `_ds_bundle.css`) — the full
  compiled token + utility set. Read it before styling; it defines every `--color-*`
  token and utility above.
- Per component: `<Name>.d.ts` (the exact props contract) and `<Name>.prompt.md`
  (usage + examples). Read these before composing a component.

## One idiomatic snippet

```jsx
import { CornerBrackets } from '<library>'

// A framed evidence stat — library component for the frame, DS utilities for glue.
<CornerBrackets label="EXHIBIT A">
  <div className="px-6 py-4 text-center">
    <div className="font-jbmono text-4xl text-heading">04:17:22</div>
    <div className="mt-1 font-stmono text-[11px] tracking-[2px] text-muted">
      DVR OFFSET — VERIFIED
    </div>
  </div>
</CornerBrackets>
```
