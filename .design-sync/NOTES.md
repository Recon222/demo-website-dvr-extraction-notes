# design-sync notes — demo-website-dvr-extraction-notes (Web UI)

Project: `DVR Extraction Notes Demo — Web UI`
→ https://claude.ai/design/p/e89f59b7-5369-410f-a867-5196e61aebc4  (KC account, 2026-07-16)

## ⚠ Two upload gotchas (both cost real time on the first sync — read before re-syncing)

1. **`finalize_plan` localDir MUST be an ABSOLUTE path to THIS repo's `ds-bundle`.**
   The design tool resolves `localDir`/`localPath` against the *session* cwd, which in a
   two-repo session is the OTHER repo (the RN app). A relative `./ds-bundle` uploaded from
   the wrong bundle (ENOENT on component files; a stray sentinel from the tokens bundle).
   Always pass:
   `D:/Work Coding Projects/CCTV Recovery Notes App/demo-website-dvr-extraction-notes/demo-website-dvr-extraction-notes/ds-bundle`
2. **The design login switched accounts mid-session (Kris → KC).** The original projects
   (this one was first created as `bf8a6c3a` under Kris; the phase-1 RN-tokens project was
   `1f62bebe`) became 404 from the KC session. If a project 404s, DON'T recreate blindly —
   check `list_projects` owner name first, and confirm with the user which account to use.
   This project (`e89f59b7`) is the KC re-creation. The phase-1 tokens project still lives
   under Kris and is unreachable from KC. **On re-sync, verify the pinned projectId still
   resolves (`get_project`) before building.**

Sibling sync: the RN app at `../../extraction_case_notes_react_native_expo` ships a
**tokens-only** DS (project "DVR Extraction Notes Demo — RN Tokens"). The two are
deliberately **separate projects** — two repos pinned to one project would delete each
other's files on the close-out reconciliation pass.

## What this repo syncs

`features/demo/ui/` — the interactive demo's presentational layer (33 components).
This is the **web port of the RN app** and is real React web: no shims, no
react-native-web. Marketing components (`components/**`) are NOT synced.

## Why the config looks the way it does

- **`.design-sync/gen-entry.mjs` → `.design-sync/ds-entry.ts` is the bundle entry, NOT
  `features/demo/index.ts`.** The demo's barrel exports only `DemoExperience` by design
  ("the public surface is intentionally tiny" — features/demo/CLAUDE.md). Bundling it
  puts only DemoExperience on `window.DVRDemoUI`, so all 33 preview cards fail with
  "Element type is invalid". The generated entry re-exports exactly the components
  pinned in `cfg.componentSrcMap`. **Re-run `node .design-sync/gen-entry.mjs` after
  changing componentSrcMap.**
- **Do NOT let the converter fall back to its own synth-entry.** It does
  `export * from` every file under `cfg.srcDir`, which drags in `mapbox-gl` (MapCanvas)
  and the Zustand store (DemoExperience): bundle went 4460 KB → **530 KB** once the
  generated entry replaced it.
- **`cfg.componentSrcMap` pins all 33** because there are no `.d.ts` exports to
  discover. It also explicitly excludes (`null`): `DemoExperience` (the only
  store-coupled component — the architectural bridge), `PhoneOverlayContext` (a
  context, not a component), `MapCanvas`/`MapScreen` (need mapbox-gl + a live token +
  network; cannot render statically).
- **`cfg.cssEntry` = `features/demo/ui/demo.css`** — the demo is inline-styled, NOT
  Tailwind (44 of 50 files use `style={{`, 2 use `className`). The Case-File `@theme`
  tokens in `app/css/style.css` belong to the **marketing site** and are irrelevant to
  these components. Do not point cssEntry at the Tailwind output.

## Gotchas

- **`[data-demo-root]` scopes every rule in demo.css** (incl. `box-sizing: border-box`,
  which the lifted pixel dimensions depend on). Authored previews MUST wrap in
  `<div data-demo-root>` and supply a dark backdrop, or components render as dark pills
  on white and read as broken. Verified in contact-sheet-1: DateField/DateTimeField/
  Dropdown render real content but unwrapped.
- **No provider is needed.** Every component below `DemoExperience` is purely
  presentational (props in, callbacks out) and must never touch the store — so
  `cfg.provider` stays unset. This is why 33/33 render on the first build.
- `demo.css` pulls Share Tech Mono + JetBrains Mono via a Google Fonts `@import url()`
  → expect `[FONT_REMOTE]` (informational; the families load at runtime).
- `AddressAutocomplete` calls the Mapbox search API. Its idle state should render
  statically; if a preview hangs or errors, author only the idle state.

## RESOLVED — weak `.d.ts` prop contracts

**Fixed 2026-07-16 by `.design-sync/gen-dts-props.mjs`** (option 1 below, owner's call).
It reads real props from source with the ts-morph checker and writes `cfg.dtsPropsFor`
for all 33 components. Result: **zero unresolved type references**, largest `.d.ts`
1.1 KB. **Re-run it after ANY component prop change** — it rewrites config.json in
place and preserves hand-written `dtsPropsFor` entries (they win over generated ones).

Four bugs found building it — all would silently degrade the contract, so don't
"simplify" these away:
1. **Expand only repo-declared types.** Expanding anything else walks library
   internals: an array's prototype (`FlatArray`/`ConcatArray`/`Intl`) or the Promise
   inside React 19's `ReactNode` (`then<TResult1, TResult2>`). That bloated
   DvrInfoScreen past 6 KB with type params resolving to nothing (now 985 B).
2. **Check `getAliasSymbol()`, not just `getSymbol()`.** Type ALIASES
   (`ReactNode`, `CSSProperties`, `type GpsCoordinates = {…}`) have no symbol, so a
   symbol-only check reports them non-local and leaves the name dangling.
3. **Test React types BEFORE the union branch.** `ReactNode` is an aliased *union*;
   the union branch shreds it into bare `ReactElement | ReactPortal | Iterable…`
   which the emitted file never defines. It must return `React.ReactNode` whole.
4. **`isPlainData` exists for `Partial<T>`.** Its symbol lives in lib.es5, so
   `isLocalType` rejects it — and TS's printer expands the mapped type only one level,
   leaving `gps?: GpsCoordinates` bare inside `onChange`. Plain-data detection (no
   lib-declared members) expands it while still excluding Array/Promise/String.

Historical context for the original problem:

`[DTS] parsed 0 .d.ts files` → every emitted `<Name>.d.ts` is
`export interface <Name>Props { [key: string]: unknown }`. **The `.d.ts` is the API
contract the design agent codes against**, so this is the highest-value defect in the
sync: the agent cannot know `Dropdown` takes `value`/`onChange`/`options`.

Cause: this is a Next.js app — no `dist/`, no `package.json#types`, so `dts.mjs`
(which resolves `pj.types || 'index.d.ts'` then parses that tree) has nothing to read.
The `.prompt.md` JSDoc still lands, which softens but does not fix it.

Options considered (option 1 chosen):
1. **`cfg.dtsPropsFor` for all 33**, generated from source by a script that extracts each
   `export interface <Name>Props` body. Non-invasive; exact for the ~8 components with a
   named Props interface. Components with inline prop types (e.g. `TabBar({ active,
   onSelect }: { active: TabId; onSelect(tab: TabId): void })`) need the inline literal
   lifted instead — the extractor must handle both shapes.
2. **Emit a real declaration tree** (`tsc --declaration --emitDeclarationOnly`) into a
   scratch package dir with `package.json#types`, and point `--node-modules` at it so
   `PKG_DIR` resolves there. NOTE: `PKG_DIR = dirname(--node-modules)` — that's how the
   RN repo's tokens sync resolved `cssEntry` as `..\..\tokens.css`. Proper, but fiddlier.
3. Ship weak contracts. **Not recommended** — it degrades every design the agent builds.

## Preview authoring (all 33 authored 2026-07-16 — 71 cells, all graded good)

Authored via 5 parallel subagents + a 5-component solo calibration set. Reference previews
(match their shape): `.design-sync/previews/{Dropdown,SplashScreen,SubmissionScreen,WizardDrawer,TabBar}.tsx`.

Calibration learnings that hold for ALL previews here:
- **Import from `'open-pro-next'`** (redirects to the bundle global). The editor flags
  "Cannot find module 'open-pro-next'" — that's tsserver not knowing the bundle-time
  redirect; the esbuild preview build resolves it fine. Ignore that diagnostic.
- **Wrap every cell in `<div data-demo-root>` + a dark navy background** (`#0d1b2a`).
  `demo.css` scopes every rule to `[data-demo-root]`; the card body is white.
- **`process` polyfill lives in the generated `ds-entry.ts`** (first line) — components
  reading `process.env.NEXT_PUBLIC_MAPBOX_TOKEN` (AddressAutocomplete, geocode) degrade to
  a plain input, the correct network-free static render. Without it: `process is not
  defined` → blank card. This is regenerated by `gen-entry.mjs`; don't drop it.
- **Overlays render inline** (ModalShell/PickerSheet/PdfPreview/WizardDrawer) via
  `PhoneOverlayPortal`'s no-context fallback — give them a `position:relative` frame with
  an explicit height (720 typical; 900–920 for tall modal bodies) so the absolute dialog
  anchors.
- **ExitDialog is `position:fixed` (NOT the phone portal)** — its backdrop bleeds past the
  frame. Its preview uses `transform: translateZ(0)` on the frame to become the containing
  block, and it's the one component set to `cardMode: single` (a fixed overlay can't sit in
  a grid cell). Everything else is `cardMode: column`.

## cardMode overrides — all 33 set (2026-07-16)

Every component's dark frame (360–378px) is wider than the default grid cell, so validate
flags `[GRID_OVERFLOW]` for all of them. Resolution: `cfg.overrides.<Name> = {cardMode:
'column'}` for 32 (one full-width story per row — right for tall screens and stacked
inputs), and `{cardMode: 'single', primaryStory: 'ManyUnseen'}` for ExitDialog. cardMode
is presentation-only — it does NOT invalidate grades. If you add a component, expect the
same GRID_OVERFLOW warn and add a column override.

## Known render warns

- `render check: 33/33 render cleanly` — clean. Earlier builds showed floor cards for
  unauthored components; all 33 are now authored.
- `[GRID_OVERFLOW]` on any component whose override is missing — see cardMode section; it's
  presentation-only, not a render failure.
- `[FONT_REMOTE]` — demo.css `@import`s Share Tech Mono + JetBrains Mono from Google Fonts;
  they load at runtime. Informational.

## Re-sync risks

- **`ds-entry.ts` is generated** — a component added to `componentSrcMap` without
  re-running `gen-entry.mjs` is bundled-but-unreachable (or absent), and the card fails
  at runtime, not build time.
- **The RN↔web palette is held together by copy-paste.** `features/demo/ui/inputs/
  input-theme.ts` (`T`) mirrors RN's `Colors.dark` exactly (bg #0d1b2a, border #1e3a5f,
  text #f0f4f8, textMute #99badd, primary #2B8CC1, error #ff4757, borderSoft
  rgba(30,58,95,0.5) = RN GlassColors.dark.card.border, rowH 44 = Layout.touchTarget.min,
  accentFrom/To #35A0D6/#2580AD = RN Button PRIMARY_GRADIENT.dark). But `T` is imported
  by only the **7 input components** — the **15 screens hardcode the same hexes inline**
  (39× #f0f4f8, 22× #2B8CC1, 19× #99badd, 13× #1e3a5f, 6× #0d1b2a, 3× #ff4757).
  **Drift guard BUILT (2026-07-16):** `.design-sync/check-rn-parity.mjs` +
  `features/demo/ui/inputs/__tests__/rn-token-parity.test.ts`. Parses the 9 shared anchors
  live from BOTH repos and asserts equality, so a hex change on either side that isn't
  mirrored fails `pnpm test`. Skips cleanly when the sibling RN repo isn't checked out.
  Run standalone: `node .design-sync/check-rn-parity.mjs`. It does NOT cover the screens'
  inline hexes vs `T` — only RN-source vs `T`; the inline-hex sprawl is still a manual risk.
- Playwright 1.61.1 (pins chromium-1228, cached on this machine) installed into
  `.ds-sync/`; the render check needs `NODE_PATH=.ds-sync/node_modules`.
- Don't build string regexes in `node -e '...'` here — Git Bash eats a backslash, so
  `"\\s"` reaches JS as literal `s` and the test silently passes/fails wrong.

## Build recipe

```sh
ln -sfn ../.ds-sync/node_modules .design-sync/node_modules   # fresh clone only
node .design-sync/gen-entry.mjs                              # ALWAYS after config edits
NODE_PATH=.ds-sync/node_modules node .ds-sync/package-build.mjs \
  --config .design-sync/config.json --node-modules ./node_modules \
  --entry ./.design-sync/ds-entry.ts --out ./ds-bundle
NODE_PATH=.ds-sync/node_modules node .ds-sync/package-validate.mjs ./ds-bundle
```
