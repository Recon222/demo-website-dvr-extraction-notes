# Marketing design-sync — repo notes

This repo runs **two** parallel design-syncs. This file is the MARKETING half
(`components/` → project "DVR Extraction Notes — Case File (Web)"). The demo half
(`features/demo/ui` → "DVR Extraction Notes Demo — Web UI") owns `config.json`,
`NOTES.md`, `conventions.md`, and `./ds-bundle`. Keep the two apart:

| Concern | Marketing (this) | Demo (other terminal) |
|---|---|---|
| config | `config.marketing.json` | `config.json` |
| notes | `NOTES-marketing.md` | `NOTES.md` |
| conventions header | `conventions-marketing.md` | `conventions.md` |
| build out dir | `./ds-bundle-marketing` | `./ds-bundle` |
| project | `a388b560-…` (was `ce1c25aa-…` pre account switch) | its own |

## Build / run

- Not a library — no `dist/`, `"private": true`. The converter runs in **synth-entry
  mode** (`[NO_DIST]` is expected, not an error): it builds an entry from the 21
  `export function PascalCase` components in `components/`.
- `srcDir: components` is **pinned deliberately** — the src-root heuristic picks the
  first of `src|lib|components`, and this repo's `lib/` would win and find nothing.
- **PKG_DIR junction**: the converter resolves `PKG_DIR = node_modules/open-pro-next`,
  which npm never self-installs. Create it before building (once per clone):
  `node -e "require('fs').symlinkSync(process.cwd(), require('path').join(process.cwd(),'node_modules','open-pro-next'), 'junction')"`
  (Windows junction — needs no admin, unlike a symlink.)
- `buildCmd` = `node .design-sync/compile-css.mjs`. It drives the repo's OWN pinned
  `@tailwindcss/postcss@4.0.3` (NOT `npx @tailwindcss/cli@4`, which floats to a newer
  version that ships different CSS; and `@4.0.3` the CLI throws `Missing field negated`).
  It compiles `app/css/style.css` and APPENDS `case-file-overrides.css`, self-checking
  token count + no-raw-directives.
- Fonts: `next/font` self-hosts Inter/ShareTechMono/JetBrainsMono at build time, so no
  woff2s exist on disk for them. `fetch-fonts.mjs` vendored the latin OFL subsets into
  `.design-sync/fonts/` (deduped: they're variable fonts, one file per family with a
  weight range). Nacelle's woff2s were already in `public/fonts/`. Re-run fetch-fonts
  only if the type stack changes.
- Playwright: cached chromium is build **1161** → install **playwright@1.51.1** (repo
  pins nothing usable). Verified via `node_modules/playwright-core/browsers.json`.

## Shims (`.design-sync/shims/`, wired via `tsconfig.sync.json` paths + extraEntries)

- `next-link` → `<a>` (9 components import next/link for navigation only).
- `next-navigation` → PathnameContext + usePathname + PathnameProvider. ManifestTabStrip
  is the only consumer (gold active-tab state).
- `node-fs` / `node-path` → FeaturePage is a server component that probes the filesystem
  for a diagram asset; `existsSync` returns **false** here (no fs, no public/ in the
  bundle), which is the honest answer — it routes to the component's own DIAGRAM PENDING
  placeholder.
- `process-polyfill` → **must be first in extraEntries**. `lib/site-config.ts` reads
  `process.env.NEXT_PUBLIC_TESTFLIGHT_URL` at MODULE scope; without the polyfill the whole
  bundle throws "process is not defined" on load and nothing renders. Zero imports so it
  runs before any product module.
- `default-exports` → re-exports Header/Footer/Logo, which ship as `export default` and
  so are dropped by the synth entry's `export *`.

## Calibration fixes (solo phase — global, caught before fan-out)

1. **Context identity / active state.** extraEntries listed the next-navigation shim by
   FILE PATH, which esbuild resolved through the junction to a DIFFERENT absolute path than
   the component's `next/navigation` import (paths-plugin, realpath'd) → TWO PathnameContext
   instances → Provider fed one, component read the other → active tab never gold. FIX:
   list **`"next/navigation"`** (bare specifier) in extraEntries so it routes through the
   same paths-plugin → one module, one context. Verified: `createContext` count 2→1.
2. **White ground.** The preview-card template hardcodes an inline `body{background:#fff}`.
   FeaturePage sets no background and its headings are near-white → invisible on white.
   FIX: `case-file-overrides.css` forces `body{background:ink-950 !important}` + dark
   `.ds-cell/.ds-single`. Correct for a dark-only DS (mirrors app/(default)/layout.tsx).
3. Font stack confirmed rendering: Nacelle (headings), Share Tech Mono (labels), Inter
   (body), JetBrains Mono (chips/stats).

## Overrides (config.marketing.json)

- Full-page components → `cardMode:single` with tall viewport (FeaturePage, BetaPageView).
- Wide short chrome → `cardMode:column` fitted viewport (ManifestTabStrip, Header, Footer,
  BetaStrip).

## Known render warns (triaged legitimate)

- `[EXPORT_COLLISION]` Header/Footer/Logo — FALSE POSITIVE. The checker compares my
  default-exports shim against the DISCOVERED component list (which includes those three via
  deriveComponentsFromSrc), not against main's actual bundle exports. `export *` genuinely
  drops the defaults, so main has no such keys; jsdom confirms all 21 resolve to real
  functions and none is undefined. Safe.
- `[TOKENS_MISSING]` `--tw-rotate-*`, `--font-*-feature-settings` — Tailwind internals set
  inline at runtime; expected absent.
- `[FONT_MISSING] "Cambria" (--font-serif)` — Tailwind's default serif stack; Case File
  never uses serif. Cosmetic.

## Wave outcome (first sync)

All 21 components authored + graded **good**. Solo calibration set (CornerBrackets,
FeaturePage, ManifestTabStrip) done by orchestrator; the other 18 by 4 parallel
subagents (home / feature / beta / chrome), each scoped to disjoint components.
Zero config-level issues reported by subagents; every cell passed first-pass except
the two grid-overflow fixes below.

- **Grid overflow → column mode.** `TipCard` and `FeatureRowView` rendered wider than
  their product grid cells (`[GRID_OVERFLOW]`). Fixed with `cardMode:column` in
  overrides. NOTE: a cardMode change **clears those components' grades** and a targeted
  `preview-rebuild` refuses with `[CONFIG_STALE]` — you must run a full `package-build`
  to re-stamp, then re-grade from the fresh column sheets. (Presentation-only viewport
  tweaks don't clear grades; cardMode does.)
- Full-width page sections use `cardMode:single` (one canonical render) or `column`;
  see the overrides block in config.marketing.json.

## ⚠ Re-sync risks

- **Shared `.cache/` with the demo sync.** `package-capture.mjs`'s cacheDir is HARDCODED to
  `.design-sync/.cache/review/` — BOTH syncs write grades there. An **unscoped** capture
  prunes every grade whose component isn't in the current bundle → would delete the other
  sync's grades. RULE: **always pass `--components`**, never run capture bare. Do a final
  scoped full-capture of all 21 marketing components right before the upload gate; that
  self-heals any pruning the demo agent caused. Grades are campaign-local anyway — the
  durable anchor is the uploaded `_ds_sync.json`.
- FeaturePage diagram always shows the PENDING placeholder here (node-fs shim). Expected.
- The junction and playwright install are per-clone, not committed.
- Vendored fonts are pinned Google revisions; re-running fetch-fonts may bump them.
