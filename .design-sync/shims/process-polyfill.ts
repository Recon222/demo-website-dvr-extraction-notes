// Minimal `process` global for the browser bundle. MUST be first in
// cfg.extraEntries — see the ordering note below.
//
// Two places in the synced surface touch `process`, and esbuild only defines
// `process.env.NODE_ENV` (lib/bundle.mjs, which is off-limits for forking), so
// everything else survives into the bundle as a bare global reference:
//
//   lib/site-config.ts:34   process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? null
//   components/feature-page.tsx:70   existsSync(join(process.cwd(), 'public', …))
//
// The site-config one runs at MODULE SCOPE. Without this polyfill the very first
// evaluation of the bundle throws "process is not defined" and *nothing* loads —
// not one card, not one component. It is the difference between a working sync
// and an entirely dead one.
//
// ORDERING. This module deliberately has ZERO imports. A module's imports are
// evaluated before its own body, so a polyfill living in (say) default-exports.tsx
// would run only after footer.tsx → lib/site-config.ts had already been evaluated
// and thrown. With no imports of its own, and listed first in cfg.extraEntries,
// this body runs before any product module is touched.
//
// VALUES. `env: {}` is not a fudge — it reproduces exactly what Next produces when
// NEXT_PUBLIC_TESTFLIGHT_URL is unset, and site-config already handles that via
// `?? null`. The design runtime has no TestFlight build to point at, so null is
// the honest value. cwd() is only ever fed to the node-fs shim's existsSync, which
// always returns false here (see node-fs.ts), so '/' is arbitrary but never used.
//
// `??=` throughout so a real host `process` (bundler shim, jsdom, test env) wins.

type MinimalProcess = { env?: Record<string, string | undefined>; cwd?: () => string }
const g = globalThis as { process?: MinimalProcess }

g.process ??= {}
g.process.env ??= {}
g.process.cwd ??= () => '/'

// Exported so the module is unambiguously live: cfg.extraEntries wires this in via
// `export * from`, and a re-exported binding can't be tree-shaken away along with
// the side effects above.
export const __dsProcessPolyfilled = true
