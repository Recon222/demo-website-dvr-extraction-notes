// Stands in for `node:fs` in the browser bundle (wired via tsconfig.sync.json).
//
// One consumer: FeaturePage, which is a SERVER component and probes the real
// filesystem while rendering —
//
//   const assetExists = existsSync(join(process.cwd(), 'public', diagram.src))
//
// — to choose between an <img> and its own "DIAGRAM PENDING" placeholder.
//
// The design runtime has no filesystem, and the bundle format has no slot for
// public/ images (only fonts/, tokens/, _vendor/, _preview/), so those diagrams
// are genuinely unavailable there. Returning `false` therefore isn't a
// convenient lie — it's the truth for this environment, and it routes the
// component down a fallback branch its own authors designed and shipped. The
// alternative (`true`) would emit <img> tags pointing at nothing and render
// every feature card with a broken-image icon.
//
// Consequence to know when reading a FeaturePage card: the diagram figure always
// shows the pending placeholder. Everything else on the page is the real render.

// The `process.cwd()` in that same expression is handled separately, by
// shims/process-polyfill.ts — it has to run before any product module is
// evaluated, which a module in FeaturePage's own import graph cannot do.

export function existsSync(_path: string): boolean {
  return false
}
