# Lane: web — parity phase P0 (PR #29) — FIX-DELTA

**Lane:** web (React/Next render + bundle performance, browser-API correctness, accessibility,
inline-style discipline, marketing↔demo isolation)
**Mode:** FIX-DELTA — re-review of the fix round on top of the vetted P0 review
**Refs reviewed:**
- Prior vetted review: `docs/code-reviews/parity/p0/p0-review.md` (R-1 … R-18)
- Prior lane file (this run overwrites it): WEB-1 … WEB-6 → R-2, R-8, R-5, R-9, R-6, R-10
- Fix range: `git diff 165de2b..feat/parity-p0` (32 files, +851/−187) — commits
  `e950de6`, `c78ee30`, `c0b3607`, `4b4f06c`, `5ee1672`, `02b6a6c`, `a0ec7f6`, `5c319e4`,
  `cf96bb5`, `65faab0`, `2f08830`, `cd6b539`, `c03b92b`, `a07470e`, `bb0f4a4`, `3967198`
- Full files behind every hunk plus render parents (`ui/DemoExperience.tsx`, `ui/ScreenStage.tsx`,
  `ui/screens/_shared.tsx`, `app/layout.tsx`, `app/demo/page.tsx`), `features/demo/CLAUDE.md`,
  `.claude/agents/web-reviewer.md`, `docs/code-reviews/deferred.md` §29–§32

**Gates re-run in the worktree (post-fix)**

| Gate | Result |
|---|---|
| `npx vitest run` (full suite) | **890/890 green**, 119 files, 73.7 s — no timeout, single run |
| `npx next build` | ✓ compiled, types + lint clean, 19/19 static pages |
| `/demo` First Load JS | **107 kB — unchanged** (page chunk 1.24 kB; `app/demo/error.tsx` is the only addition) |
| Wall: `grep -rn "features/demo" components app/\(default\) lib app/layout.tsx app/demo` | only the deliberate comment in `components/marketing/phone-frame.tsx:7`, its guard test, the `next/dynamic` mount in `app/demo/page.tsx:7`, and a comment in `app/demo/error.tsx:14` — **intact** |
| Tailwind in `features/demo/ui/**` | none (only the two pre-existing `demo-accordion` hooks and `TypewriterText`'s pass-through) — **correct half** |
| `demo.css` / `motion.ts` / `package.json` / `pnpm-lock.yaml` | **unchanged in the fix round** — no new keyframes, no motion-token edits, no new dependency |

Findings below: **0 BLOCKER · 0 MAJOR · 3 MINOR** (all new, fix-introduced or fix-adjacent).

---

## Fix-delta — prior lane findings

### WEB-1 (= R-2) [MAJOR] `CamerasScreen` custom-mode flags keyed by array index — **FIXED**

Commit `c78ee30` (`fix(demo-ui): key Cameras custom-mode flags by camera id, seeded from values`).

- `features/demo/ui/screens/CamerasScreen.tsx:29-34` — both maps are now
  `Record<string, boolean>` seeded lazily from the stored values
  (`Object.fromEntries(cameras.map((c) => [c.id, isCustomResolution(c.resolution)]))`), i.e. the
  optional seeding the review left as an explicitly-authorized divergence was taken, and the
  divergence + the phone back-port are documented in the comment at `:20-28`.
- Reads are id-keyed at `:70`, `:73`, `:76`, `:79` (`customResolutions[c.id]` / `customFps[c.id]`);
  rows still `key={c.id}` at `:62`. The index survives only as the `onChange`/`onRemove` argument,
  which is what the bridge's `listEditHandlers` (`DemoExperience.tsx:120-126`) expects — so the
  index re-keying can no longer desynchronize the flags.
- The secondary defect is fixed too: `:38`, `:41`, `:48`, `:51` use functional updaters
  (`setX((prev) => …)`) instead of spreading the render-closure snapshot.
- Deliberate clear-on-select (the phone-verified Cameras-vs-DVR asymmetry) is preserved at
  `:39` / `:49` — the fix changed keying only, no option semantics.
- Pinned by three new tests (`ui/screens/__tests__/option-parity.test.tsx:152-201`): the
  data-destroying direction, the false-transfer direction, and the seed-on-mount case.
- Re-verified the seeding can't misfire: the lazy initializer runs once per mount, the only
  location switch in the UI is `openLocation` (`DemoExperience.tsx:322-326`) which sets
  `view: 'submission'` and therefore unmounts the screen (`ScreenStage` keys on `view`), and
  camera ids come from the monotonic `uiSeq`/store counters so a stale map key can never be reused.

### WEB-2 (= R-8) [MINOR] Error fallback never takes focus — **FIXED**

Commit `c0b3607`. `features/demo/ui/chrome/DemoErrorBoundary.tsx:121-130` now carries `autoFocus`
on the `Return to Cases` button, matching the in-repo idiom (`controls/ExitDialog.tsx:70`), with
the rationale in a comment at `:123-124`. Pinned by
`ui/chrome/__tests__/DemoErrorBoundary.test.tsx:51-59` (`toHaveFocus()` on the fallback mount).
`role="alert"` at `:110` is unchanged, so announcement and keyboard position are now both covered.

### WEB-3 (= R-5) [MINOR] Boundary coverage overstated; no outer net — **FIXED**

Commit `02b6a6c`. Both halves of the finding are addressed:

- `app/demo/error.tsx` (new, 48 lines) is the route-segment outer net — `'use client'`, `reset()`
  wired to a `Try again` button at `:37-44`, chrome-free like `/demo` itself, importing nothing
  from `@/features/demo` (wall untouched, confirmed by grep and by the unchanged 107 kB First Load).
  It genuinely wraps the bridge: `app/demo/page.tsx` is the segment's page and has no intervening
  layout, so a throw in `DemoExperience`'s own render frame lands here.
- The overstated comment is narrowed at `features/demo/ui/DemoExperience.tsx:820-826` — it now says
  the in-frame boundary covers *component* renders and names the bridge derivation
  (`activeScreen()`/`activeModal()`, `toCaseCards`, `toMapData`, `selectDrawerItems`) as
  **not** covered, pointing at `app/demo/error.tsx`.
- Pinned by `app/demo/__tests__/error.test.tsx` (branded copy + error detail; `reset` invoked;
  focus lands on the recovery control).

Residual (new, filed below as **WEB-8**): the outer net's only recovery re-runs the same
rehydration that produced the throw.

### WEB-4 (= R-9) [MINOR] First client-shipped zod, unrecorded — **FIXED** (with a doc residual)

Commit `3967198`. `docs/code-reviews/deferred.md` §32 records the trade in the form the review
asked for: what (first client zod, ~13 kB gz, eager because `loadSnapshot` runs synchronously at
store creation), the measured impact (`/demo` First Load JS unchanged at 107 kB — I re-measured it
this run and it still is), why accepted (the schema doubles as the R-4 compile-time drift guard),
the replacement if it ever has to go (a hand-rolled predicate, **not** a lazy import), and a
revisit trigger. `docs/planning/demo-phone-parity/demo-inventory.md:27` (Validation row) was
corrected in the same commit.

Residual (new, filed below as **WEB-7**): the row directly above it still claims the demo has
"no persistence at all".

### WEB-5 (= R-6) [MINOR] Heavy suites at the default 5 s timeout — **FIXED**

Commit `bb0f4a4`. Describe-level `{ timeout: 20000 }` now guards every heavy full-experience
suite — `DemoExperience.persistence.test.tsx:14`, `DemoExperience.test.tsx:11`,
`DemoExperience.map.test.tsx:28,64`, `DemoExperience.sandbox.test.tsx:59,618`,
`DemoExperience.coordinates.test.tsx:27` — plus `vi.setConfig({ testTimeout: 20_000 })` at
`ui/screens/__tests__/option-parity.test.tsx:21` for the dropdown-driving suite the typescript
lane saw flake. The boundary suite keeps its per-`it` overrides
(`DemoExperience.boundary.test.tsx:32,50,61`). Vitest 4.1.7 accepts the `describe(name, options, fn)`
form — verified by the suite collecting and running: **890/890 green in one run**, no timeout,
where the pre-fix gate needed two runs.

### WEB-6 (= R-10) [MINOR] `aria-label` hid the Dropdown's current selection — **FIXED**

Commit `5ee1672`. `features/demo/ui/inputs/Dropdown.tsx` replaces the name-clobbering
`aria-label` with `aria-labelledby={label ? \`${labelId} ${valueId}\` : valueId}` (`:75`), ids
minted with `useId()` (`:37-39`) and hung on the existing label `<div>` (`:68`) and value
`<span>` (`:91`). The accessible name is now "Resolution Other (Custom)" — the load-bearing
custom-mode signal is exposed. Pinned by three new cases in
`ui/inputs/__tests__/Dropdown.test.tsx:99-119` (selection in the name, placeholder fallback,
label-less fallback); the ~15 affected `getByRole` queries across `Dropdown.test.tsx` and
`option-parity.test.tsx` were migrated to `/^Label/` regexes.

Re-checked for a fix-introduced regression and found none: every production `Dropdown` call site
goes through `SelectField` (`ui/screens/_shared.tsx:213-215`) with a non-empty label, so the
label-less branch is test-only; `SelectField` renders no competing label of its own; the
`placeholder="Select…"` default keeps the value span non-empty; `useId()` values are valid IDREFs
and the demo is `ssr: false`, so there is no hydration surface. `role="menuitemradio"` +
`aria-checked` (`:117`) and the sheet's `aria-label` (`:113`) are unchanged.

---

## New findings (fix-introduced / fix-adjacent)

## WEB-7 [MINOR] docs/planning/demo-phone-parity/demo-inventory.md:26

**Claim.** The R-9 documentation fix corrected the *Validation* row of the tech-stack table but
left the *State (demo)* row immediately above it asserting the demo has **"no persistence at all
(no localStorage/sessionStorage/`persist` middleware — verified by grep)"**. That is the exact
claim P0.4 falsifies, in the exact table the fix commit edited, one line away from the new
sentence that says the opposite. This is the inventory future parity phases are briefed from.

**Evidence.**

- `docs/planning/demo-phone-parity/demo-inventory.md:26`
  ```
  | State (demo) | **Zustand vanilla store** … No React context, no URL state, **no persistence
  at all** (no localStorage/sessionStorage/`persist` middleware — verified by grep). |
  ```
- Line 27, edited by the same commit `3967198`, now reads "…and, since P0.4, the **demo's snapshot
  shape guard** (`engine/store/persistence.ts` — first client-shipped zod…)". The two rows
  contradict each other.
- The persistence really is wired: `features/demo/ui/DemoExperience.tsx:223-232`
  (`persistDemoStore` + `pagehide` + `dispose`), `:162` (`loadSnapshot` at store creation),
  `features/demo/engine/store/persistence.ts:62-63` (`SNAPSHOT_KEY = 'dvr-demo-state-v2'`).
- Same-class residual in the reviewer brief this lane runs from:
  `.claude/agents/web-reviewer.md:71` still lists `sessionStorage`/`localStorage` under
  **"Not in use yet — do not review against them … P0.4 persistence per decision D2"**. R-9's
  fix list explicitly included "update the lane-brief context note"; that part did not land.

**Suggested fix.** Rewrite `demo-inventory.md:26` to state what shipped — one store per
`DemoExperience` mount, hydrated from a versioned `sessionStorage` snapshot (per-tab, D2),
debounced 250 ms, flushed on `pagehide`, injected stores deliberately not persisted — and
cross-reference §32. Separately, strike `sessionStorage`/`localStorage` from the
`web-reviewer.md:71` "not in use yet" list and move it into the guarded-APIs table (the guard is
`sessionStorageOrNull()` at `DemoExperience.tsx:107-114` plus `loadSnapshot`'s `discard()` path),
so the next phase's reviewer doesn't treat storage findings as out of scope.

**Confidence.** High — both lines read directly; no judgment involved.

---

## WEB-8 [MINOR] app/demo/error.tsx:40

**Claim.** The new outer net's only recovery control is `reset()`, and `reset()` remounts the
segment, which re-runs `loadSnapshot(sessionStorage)` on the **same** snapshot. P0.4 is what makes
the triggering state survive the reset, so for any *deterministic* throw in the bridge's render
frame — precisely the class this boundary exists for — "Try again" reproduces the error and the
visitor is stuck on the error page for the life of the tab, with no in-page way to clear the
session. The file's own comment acknowledges the hole ("unless the snapshot itself is what
throws") but ships no escape hatch.

**Evidence.**

- `app/demo/error.tsx:37-44` — the single control:
  ```tsx
  <button type="button" autoFocus onClick={reset} …>Try again</button>
  ```
  No secondary action, no storage clear.
- Recovery path: `reset()` re-renders the segment → `app/demo/page.tsx` remounts `DemoExperience`
  → `DemoExperience.tsx:154-166` sees a fresh `storeRef` and calls
  `loadSnapshot(sessionStorageOrNull())` at `:162` → identical state is rebuilt → the same
  derivation runs again in the same frame the throw came from.
- The snapshot is not cleared on a render throw. `persistence.ts` only calls
  `discard()`/`removeItem` on a *parse/version* failure (`loadSnapshot`, `:352-373`) and on a
  failed write (`:447-462`, the R-14 fix). A snapshot that parses fine but makes a downstream
  derivation throw is re-loaded verbatim, forever.
- `sessionStorage` is per-tab and survives reload and same-tab navigation away and back, so
  reload/back-navigation are not workarounds — only closing the tab is.
- Reachability today is low (no throwing bridge derivation is known; R-15's fix removed the
  dangling-selection class), which is why this is MINOR and not higher. It stops being low the
  moment a P1–P4 derivation over restored data can throw — which is the scenario the outer net
  was added for.

**Suggested fix.** Add a secondary "Start fresh (clears this tab's demo session)" button that
removes the snapshot key and then calls `reset()`. Because `SNAPSHOT_KEY` is exported from
`engine/store/persistence.ts` and the demo's public barrel deliberately exports only
`DemoExperience`, don't deep-import it — either lift the key to a tiny shared constant module both
sides can import, or re-export it from `features/demo/index.ts` alongside `DemoExperience`. Guard
the `sessionStorage` access in a `try` (Safari private mode throws on the property access itself —
the same reason `DemoExperience.tsx:108-114` wraps it). Keep `Try again` as the primary so the
common transient case still preserves the session.

**Confidence.** High on the mechanism (verified end-to-end: `reset` → remount → `loadSnapshot`);
MINOR because no reachable throwing derivation exists in this build.

---

## WEB-9 [MINOR] app/demo/error.tsx:25,33,41

**Claim.** The new route-level fallback re-hardcodes four colour literals that the P0.5 token
extraction — landed in this same PR, with a source-scanning guard test — exists to keep from being
pasted around. The guard's scan root is `features/demo/ui/**`, so `app/demo/error.tsx` sits exactly
one directory outside it and is unguarded. A future edit to `GLASS.accentFrom`/`accentTo` or
`GLASS.borderError` will silently leave the `/demo` error page on the old palette, visibly
diverging from the in-frame fallback it is the outer twin of.

**Evidence.**

- `app/demo/error.tsx:41` — `from-[#35A0D6] to-[#2580AD]`, which is
  `features/demo/ui/glass-tokens.ts:19-20` (`ACCENT_FROM`/`ACCENT_TO`, the source of
  `GLASS.gradientAccent` and therefore of `glassBtnPrimary`).
- `app/demo/error.tsx:25` and `:33` — `border-[rgba(255,71,87,0.3)]`, which is
  `glass-tokens.ts:39` (`GLASS.borderError`); `:33` also carries `bg-[rgba(255,71,87,0.06)]`,
  the literal used for the in-frame fallback's detail box (`DemoErrorBoundary.tsx:46`).
- The guard that would have caught these: `features/demo/ui/__tests__/glass-tokens.test.ts:16`
  (`const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')`) with `'error border',
  '1px solid rgba(255,71,87,0.3)'` and `'accent gradient',
  'linear-gradient(180deg,#35A0D6,#2580AD)'` in its `BANNED` list (`:41-43`). The new file is
  outside the scan root *and* expresses the same colours in Tailwind arbitrary-value syntax, so
  widening the scan alone would not catch them either.
- No marketing Case-File token covers these: `app/css/style.css:34-38` has `--color-blue: #2b8cc1`
  (a different blue) and no error-red. So this is not the "use the existing token" rule — it is a
  genuinely untokenized cross-half duplication.

**Suggested fix.** Cheapest defensible option: add the three values to the `@theme` block in
`app/css/style.css` (e.g. `--color-demo-accent-from: #35a0d6; --color-demo-accent-to: #2580ad;
--color-demo-error: #ff4757`), have `app/demo/error.tsx` use them, and note in
`glass-tokens.ts` that the two accent stops are mirrored there. If that is judged over-engineering
for one file, at minimum add a `keep in sync with features/demo/ui/glass-tokens.ts
ACCENT_FROM/ACCENT_TO + GLASS.borderError` comment at `error.tsx:25`, so the drift is at least
discoverable from the file that will drift.

**Confidence.** High on the facts (literals and guard scope read directly); MINOR — a maintenance
/ style-discipline hazard, not a user-visible defect today.

---

## Checked and deliberately not flagged

- **`reviewAgain` added to the bridge (`DemoExperience.tsx:210`) with a single consumer.** The
  lane brief flags bridge state with one consumer, but this is local `useState` (not a
  `useStore` subscription), toggled once per click, alongside eleven existing bridge-local UI
  states (`expandedCaseId`, `mapPickerOpen`, `imp`, `pdf`, `syncing`, …). It also *has* to live
  above the screen: `openLocation` (`:322-326`) resets it, and that is the only location-switch
  path in the UI. No re-render cost worth a finding.
- **`Complete & Save` disabled + `title="Open a location first"`
  (`CompletionScreen.tsx:96-104`).** The `title` is hover-only and disabled buttons leave the tab
  order, so the *reason* isn't exposed to keyboard/AT — but `TimeOffsetScreen.tsx:52` is the
  established in-repo idiom (`disabled` + `cursor: not-allowed` + `opacity: 0.45`, no explanation
  at all), and this new control matches it and adds more. Flagging it would re-file a repo-wide
  pattern the fix improved. `canComplete === false` is reachable in one click (rail manifest →
  Completion row, `engine/content/explore.ts:42` → `DemoExperience.tsx:875`), which is why I
  checked it rather than assuming it dead.
- **Focus stranded on `<body>` when "Review / Export again" / "Complete & Save" swap the
  Completion branch.** Real, but it is the demo's general navigation model (every wizard
  Next/Back and every screen swap does the same); no screen transition in the feature manages
  focus. Filing it here would be a repo-wide a11y proposal, not a fix-round regression.
- **`autoFocus` inside `role="alert"` (`DemoErrorBoundary.tsx:110,125`)** — some screen readers
  truncate an assertive live region when focus moves into it on the same tick. Speculative,
  SR-dependent, and the alternative is the R-8 defect that was just fixed; `ExitDialog.tsx:70`
  sets the precedent.
- **`app/demo/error.tsx` using Tailwind inside the demo half.** The demo's inline-`CSSProperties`
  rule is about the prototype-lifted phone UI ("do not restyle the lifted rules"); this file is
  route chrome outside the frame, is nothing lifted, and using Tailwind is what lets it stay free
  of `@/features/demo` imports. Tokens resolve correctly — `text-heading`/`text-body`/`text-muted`/
  `text-faint` and `font-nacelle`/`font-stmono`/`font-jbmono` are all declared in `app/css/style.css`
  `@theme` (`:12-38`), and the root `<body>` is `bg-gray-950`, so the card reads correctly on the
  chrome-free route. Colour duplication is the only real residual — WEB-9.
- **Storage-write hardening (R-14, `persistence.ts:447-462`).** Checked from the browser-API
  angle specifically: the `removeItem` added inside the `catch` is itself `try`-wrapped, so a
  blocked-storage browser cannot turn a failed debounced write or a `pagehide` flush into an
  uncaught error in a timer/listener callback. Correct.
- **`SNAPSHOT_KEY` v1 → v2 bump.** The orphaned `dvr-demo-state-v1` entry is per-tab
  `sessionStorage` on a branch that has never shipped; it dies with the tab. Not a leak.
- **Bundle.** `app/demo/error.tsx` is the only new module; `/demo` First Load JS is unchanged at
  107 kB, `mapbox-gl` and `pdfjs-dist` are still `await import`ed, no `package.json` change, no
  new `'use client'` on a marketing file, no chrome hoisted into `app/layout.tsx`.
- **Pre-existing tracked items** (`deferred.md` §19–§23, §29–§32) and the orchestrator's
  deliberate-choices list — including the `Case Complete` → `Location Complete` copy change, the
  class-based boundary, `sessionStorage` over `localStorage` per D2, the CamerasScreen seeding
  divergence, and the deleted `FORM_OPTIONS` registry — not re-flagged.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 3 |

**Prior lane findings:** WEB-1 FIXED · WEB-2 FIXED · WEB-3 FIXED · WEB-4 FIXED · WEB-5 FIXED ·
WEB-6 FIXED. Six of six, none partial, each with a test pinning it.

- **Marketing↔demo isolation:** preserved (grep + guard test + unchanged route table).
- **Bundle impact:** none — `/demo` First Load JS 107 kB, identical to the pre-fix measurement.
- **Browser-resource cleanup:** complete — the fix round adds no listener, timer, observer,
  object URL, map or PDF instance; the one storage change (R-14) cannot throw out of a callback.
- **Accessibility:** both prior gaps closed (focus on the error fallback, selection in the picker's
  accessible name), and the new route fallback lands focus on its recovery control. No regressions.
- **Style-convention adherence:** correct half; no lifted rule or device math touched; one
  cross-half colour duplication outside the P0.5 guard (WEB-9).

**Verdict:** APPROVE with comments — nothing here gates the merge; WEB-7 is a one-line doc
correction, WEB-8 and WEB-9 are opportunistic.
