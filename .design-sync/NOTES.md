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

`features/demo/ui/` — the interactive demo's presentational layer (**37 components**;
33 at the first sync, plus `Banner`, `CentredDialog`, `MapFiltersSheet` and
`OverlayHeader`, added by U8.4 when the UI-parity port created them).
This is the **web port of the RN app** and is real React web: no shims, no
react-native-web. Marketing components (`components/**`) are NOT synced — but note
that `previews/` is SHARED with `config.marketing.json`, so a demo build logs
`(stale preview: <Name> — component no longer exported)` for each of the 21 marketing
previews. Informational; the marketing build logs the mirror image.

**Three "config edited, generator not re-run" holes are now pinned by a test** —
`features/demo/ui/__tests__/design-sync-entry.test.ts` (U8.4). It reads this config and
asserts that every non-null `componentSrcMap` entry (a) resolves from the generated
`ds-entry.ts` via a REAL import, (b) has a `cardMode` override, and (c) has a
`dtsPropsFor` entry, with no orphans. `palette.test.ts` adds a fourth: every pinned
component has a preview, and no preview carries a retired hex. All four are driven from
this file, so a 38th component is covered without editing them.

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
- **`cfg.componentSrcMap` pins all 37** because there are no `.d.ts` exports to
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
  `cfg.provider` stays unset. This is why 37/37 render.
- **CORRECTED 2026-08-27 (U8.4).** This file used to say *"`demo.css` pulls Share Tech
  Mono + JetBrains Mono via a Google Fonts `@import url()` → expect `[FONT_REMOTE]`"*.
  **That `@import` no longer exists** and has not since v1's P1.1: both families are
  self-hosted via `next/font` in `app/layout.tsx`, which sets `--font-stmono` /
  `--font-jbmono` on `<body>` (`demo.css:7-10`), and
  `features/demo/ui/__tests__/fonts.test.ts:38-41` fails any runtime `@import url(` in
  `demo.css` or the PDF print-iframe templates. **`[FONT_REMOTE]` no longer fires** —
  the 2026-08-27 build logs `styles.css: 1 @import(s) (incl. _ds_bundle.css)` and
  validate reports `1 @import(s), all resolve`.
  **Consequence for preview authors:** the bundle ships NO webfonts, so neither family
  loads inside a preview card. Give any mono stack a real fallback
  (`"'Share Tech Mono', monospace"`); do not spell `var(--font-stmono)` in a preview —
  the variable is defined by the app's `<body>`, which the bundle does not have.
- `AddressAutocomplete` calls the Mapbox search API. Its idle state should render
  statically; if a preview hangs or errors, author only the idle state.

## RESOLVED — weak `.d.ts` prop contracts

**Fixed 2026-07-16 by `.design-sync/gen-dts-props.mjs`** (option 1 below, owner's call).
It reads real props from source with the ts-morph checker and writes `cfg.dtsPropsFor`
for all 37 components. **Re-run it after ANY component prop change** — it rewrites
config.json in place.

**⚠ CORRECTED 2026-08-27 (U8.4) — this file used to say the script "preserves
hand-written `dtsPropsFor` entries (they win over generated ones)". That WAS the
behaviour and it made the script a no-op.** Its own output lands in config.json and is
then indistinguishable from a hand-written entry, so from the second run onward it
shadowed every freshly generated key while still printing `wrote dtsPropsFor for N/N
components`. Measured before the fix: the run computed `ModalShell` with 10 props and
`TabBar` with the four-tab union, and `git diff --numstat` reported **zero lines
changed**; **24 of 33 entries were stale**, some since v1. `gen-dts-props.mjs:217` now
merges the other way — generated wins, and a hand-written entry survives only for a key
the generator produced NOTHING for (a component it SKIPPED: no props, no matching
export, or a checker error). Probed both directions.

**Two live consequences of un-freezing it**, neither a regression (both states are
strictly more contract than the frozen 3-prop entries they replaced), but both worth
knowing:
1. **Some emitted `.d.ts` now reference names they do not define** — `GpsCoordinates`,
   `GpsSource`, `ReverseGeocodeResult`, `OcrRecognizeOutcome`, and a bare `K`.
   `printType` expands local object types but has no INTERSECTION branch, so
   `GpsCoordinates & { source: GpsSource }` falls through to `type.getText()`.
   `all .d.ts parse cleanly` still passes, so this is a contract-quality gap, not a
   build failure. The fix is a `type.isIntersection()` arm beside the union one.
2. **`isFieldVisible`'s 57-member field-id union is inlined into six screens' entries**,
   which is most of their size. Bug 1 below (expand only repo-declared types) is why it
   expands at all; it is correct, just verbose.

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

## Preview authoring (all 37 authored — 33 on 2026-07-16, 4 by U8.4 2026-08-27)

Authored via 5 parallel subagents + a 5-component solo calibration set. Reference previews
(match their shape): `.design-sync/previews/{Dropdown,SplashScreen,SubmissionScreen,WizardDrawer,TabBar}.tsx`.

Calibration learnings that hold for ALL previews here:
- **Import from `'open-pro-next'`** (redirects to the bundle global). The editor flags
  "Cannot find module 'open-pro-next'" — that's tsserver not knowing the bundle-time
  redirect; the esbuild preview build resolves it fine. Ignore that diagnostic.
- **Wrap every cell in `<div data-demo-root>` + a dark navy background** — **`#002853`**
  since U8.4 (`colors.background`, `features/demo/ui/tokens/palette.ts:99`; it was
  `#0d1b2a` before the UI-parity port re-based the palette). `demo.css` scopes every rule
  to `[data-demo-root]`; the card body is white.
- **Previews cannot import the token modules.** They resolve `'open-pro-next'` — the
  bundle global, which exports only the pinned components — so every colour in a preview
  is a LITERAL. Cite its `file:line` in a comment and keep it in step by hand;
  `palette.test.ts`'s preview sweep (U8.4) is the only thing standing behind them, and it
  walks `previews/` whole with **no exemptions**, for the retired-hex list.
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

## cardMode overrides — all 37 set

Every component's dark frame (360–378px) is wider than the default grid cell, so validate
flags `[GRID_OVERFLOW]` for all of them. Resolution: `cfg.overrides.<Name> = {cardMode:
'column'}` for 36 (one full-width story per row — right for tall screens and stacked
inputs), and `{cardMode: 'single', primaryStory: 'ManyUnseen'}` for ExitDialog. cardMode
is presentation-only — it does NOT invalidate grades. If you add a component, expect the
same GRID_OVERFLOW warn and add a column override — `design-sync-entry.test.ts` now
fails the suite if you forget.

## Known render warns

- `render check: 37/37 previews render cleanly` — clean as of 2026-08-27.
- `[GRID_OVERFLOW]` on any component whose override is missing — see cardMode section; it's
  presentation-only, not a render failure.
- **`[RENDER_THIN]` on `TimeWheel` — BENIGN AND PERMANENT** (recorded here because that is
  what validate's own message asks for). Its two stories carry different times and still
  screenshot identically, because `TimeWheel.tsx:64` — `el.scrollTop = value * ROW` — is
  the ONLY expression of `value`: every column paints all 24/60/60 rows regardless, and the
  selection IS the scroll offset, which a static capture does not apply.
  `.render-check.json`'s `texts` confirms both variants are the full 0..23/0..59 lists.
  Not reworkable without inventing a difference the component does not paint.
- `[FONT_REMOTE]` — **no longer fires.** See the corrected fonts entry under "Gotchas".

## Preview↔component prop drift is a COMPILE ERROR now (W4/F82)

**`pnpm typecheck` runs two programs**: the app's, then `tsconfig.previews.json`. The second
puts the 37 demo previews in a program whose `paths` maps `open-pro-next` →
`.design-sync/ds-entry.ts`, so each preview is typechecked against the REAL component props —
the same generated entry the bundler builds from. Change a synced component's props without
updating its preview and the gate reds.

**CORRECTED 2026-08-27 (W4/F82).** This section used to say previews "are not typechecked
(they import `'open-pro-next'`, which tsc cannot resolve)". **That reason was wrong**, and it
mattered: it made the problem look unfixable and sent U8.4's D-2 ledger proposal after a
`declare module` shim that would not have load-borne. The real cause was
`tsconfig.json:26`'s `include`: TypeScript's wildcard expansion **skips directories whose name
begins with a dot** unless the path names them explicitly, so `**/*.tsx` never reached
`.design-sync/` and the previews were in NO program at all — `tsc --listFiles` counted **zero**
of them. `open-pro-next` was never the obstacle; it just needed a `paths` entry.

Measured before the fix: planted drift in a preview survived BOTH `tsc` and the full suite,
and the clean tree already carried **19 errors across 8 previews** the moment a program saw
them — including `previews/ModalShell.tsx` passing **no** `closeAccessibilityLabel`, the a11y
prop `ModalShell` made REQUIRED, on the artifact this file calls the design agent's contract.
Earlier, by 2026-08-27, **10 of 37 cards had been rendering EMPTY** for the same reason
(`isFieldVisible`, `onCoordinates`, `mediaTools`, `saveStatus`, `NotesScreen`'s `sections`
rewrite, `OcrCaptureScreen`'s `resolution.kind`). The render check caught those because they
THREW; the 8 above painted `undefined` silently, which is why "37/37 render cleanly" and
"8 previews drifted" were both true at once.

**Two gotchas if you touch `tsconfig.previews.json`:**
1. **The `react` / `react/jsx-runtime` / `csstype` `paths` entries are load-bearing.** Every
   checkout symlinks `.design-sync/node_modules` → `.ds-sync/node_modules` (that is what makes
   ESM resolve `ts-morph`), and `.ds-sync` ships its own `@types/react`. Node resolution walks
   UP, so without those three entries a preview loads a SECOND React type tree and the program
   reports ~20 spurious `Property.BorderBlockStyle is not assignable to itself` errors.
2. **The 21 marketing previews are excluded by name.** `previews/` is shared with
   `config.marketing.json`, whose previews import through a different bundle global.

**The render check is still worth running** — it catches what types cannot (a component that
throws at runtime, an empty root, identical variants). Gate on the exit code and read
`ds-bundle/.render-check.json` for the per-component `firstErr`.

## Re-sync risks

- **`ds-entry.ts` is generated** — a component added to `componentSrcMap` without
  re-running `gen-entry.mjs` is bundled-but-unreachable (or absent), and the card fails
  at runtime, not build time.
- **The RN↔web palette. REWRITTEN 2026-08-27 (U8.4) — every value the old text quoted was
  retired by the UI-parity port**, so this paragraph was actively misleading about the one
  thing the port changed. It used to describe `T` as mirroring `bg #0d1b2a, border #1e3a5f,
  accentFrom/To #35A0D6/#2580AD` over **9** anchors; all four of those hexes are now on
  `palette.test.ts`'s RETIRED list, and there are **145** anchor rows.

  The demo's colours now live in `features/demo/ui/tokens/palette.ts`, ported name-for-name
  from the phone's `src/constants/Colors.ts`, and `input-theme.ts`'s `T` is a thin ALIAS
  record over it (`T.bg = colors.background`, and so on) rather than a second copy —
  `palette.test.ts` pins each alias structurally, not just by value, so re-typing a literal
  in place of an alias reds. `.design-sync/check-rn-parity.mjs` +
  `features/demo/ui/inputs/__tests__/rn-token-parity.test.ts` remain the mechanical guard
  against the PHONE, and now cover **145 rows**, verified 2026-08-27:

      ✓ all 145 anchor rows match between the RN app and the web demo (42 palette keys +
        24 glass-tier keys + 2 map-glass keys, each x both halves, + 4 always-dark
        map-chrome rows + the 4 CTA gradient stops (both halves too) and the touch floor)

  It skips cleanly when the sibling RN repo isn't checked out — **a skipped guard is not a
  passing one**; print `rnAvailable()` or the skip count before quoting it. Screens still
  carry inline literals rather than importing `colors` everywhere, so the sprawl is a
  manual risk as before; what is no longer true is that the token module itself is a copy.
- Playwright 1.61.1 (pins chromium-1228, cached on this machine) installed into
  `.ds-sync/`; the render check needs `NODE_PATH=.ds-sync/node_modules`.
- Don't build string regexes in `node -e '...'` here — Git Bash eats a backslash, so
  `"\\s"` reaches JS as literal `s` and the test silently passes/fails wrong.

## Build recipe

```sh
ln -sfn ../.ds-sync/node_modules .design-sync/node_modules   # fresh clone or worktree
node .design-sync/gen-dts-props.mjs                          # after any PROP change
node .design-sync/gen-entry.mjs                              # ALWAYS after config edits
NODE_PATH=.ds-sync/node_modules node .ds-sync/package-build.mjs \
  --config .design-sync/config.json --node-modules ./node_modules \
  --entry ./.design-sync/ds-entry.ts --out ./ds-bundle
NODE_PATH=.ds-sync/node_modules node .ds-sync/package-validate.mjs ./ds-bundle
```

**The first line is not optional for `gen-dts-props.mjs`, and `NODE_PATH` will not save
you.** `ts-morph` lives only in `.ds-sync/node_modules`, and `NODE_PATH` is a CommonJS
mechanism — these scripts are ESM, so `node .design-sync/gen-dts-props.mjs` dies with
`ERR_MODULE_NOT_FOUND` no matter what `NODE_PATH` says. ESM resolves by walking up from
the importing file, which is why the symlink has to sit at `.design-sync/node_modules`.
`.ds-sync/` is gitignored and exists only in the MAIN checkout, so **in a worktree, link
both**: on Windows, `New-Item -ItemType Junction` for `.design-sync/node_modules` →
`<main>/.ds-sync/node_modules` and for `.ds-sync` → `<main>/.ds-sync`. Tear a worktree
down with `tools/worktree-remove.ps1`, never `git worktree remove` — the script unlinks
reparse points first, and a recursive delete would follow those junctions into the main
checkout.

**Don't build string regexes in `node -e '...'` in Git Bash** — the shell eats a
backslash, so `"\\s"` reaches JS as a literal `s`. This bit U8.4 exactly as the older
note two sections up warns. Put the script in a file.

## Sync record — 2026-08-28 (W4, U8.4 remote half)

- Pushed the full 244-file bundle (37 components) to **`bf8a6c3a-f176-4085-a77a-71c7ac0d06ee` “DVR Extraction Notes Demo — Web UI”** — the ORIGINAL project under the Kris login. The pinned `e89f59b7` (the KC re-creation) 404s from this account; per gotcha 0 the owner was checked via `list_projects` before re-pointing, and nothing was recreated. config.json now pins the reachable id.
- **Reserved-path rename:** the Design API refuses any `CLAUDE.md` path, so `guidelines/features/demo/CLAUDE.md` uploads as `guidelines/features/demo/architecture.md` (content identical). `guidelines/index.md` references should use that name.
- Upload batches must stay small: two HTTP 500s on PNG-heavy batches (~20 files); ≤5 screenshots per write_files call succeeded.
