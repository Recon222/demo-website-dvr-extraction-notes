# Lane: web — parity phase P0 (PR #29) — FIX-DELTA ROUND 2

**Lane:** web (React/Next render + bundle performance, browser-API correctness, accessibility,
inline-style discipline, marketing↔demo isolation)
**Mode:** FIX-DELTA round 2 — re-review of the round-2 fix commits only
**Refs reviewed:**
- Prior vetted review: `docs/code-reviews/parity/p0/p0-review-fixdelta.md` (R-19 … R-30; R-1…R-18 CLOSED)
- Prior lane file (this run overwrites it): WEB-7 → R-23, WEB-8 → R-24, WEB-9 → R-25
- Fix range: `git diff f69aa92..feat/parity-p0` — 23 files, +438/−56. Commits:
  `e182186` (R-20), `b86cd46` (R-19), `480321a` (R-24), `e8621bd` (R-21), `4abad16` (R-22),
  `207963f` (R-25), `8a4dd55` (R-26), `c41c5ae` (R-27), `6566531` (R-28), `ac4cb5e` (R-29),
  `7ef5608` (R-30), `c4cf8b4` (R-23)
- Full files behind every hunk plus render parents (`ui/DemoExperience.tsx` incl. `activeScreen()`
  and the persistence effect, `app/demo/page.tsx`, `app/layout.tsx`, `app/css/style.css`),
  `features/demo/CLAUDE.md`, `.claude/agents/web-reviewer.md`, `docs/code-reviews/deferred.md`

**Gates re-run in the worktree (round-2 head)**

| Gate | Result |
|---|---|
| `npx vitest run` (full suite) | **904/904 green**, 120 files, 62 s — single run, no timeout |
| `npx next build` | ✓ compiled, types + lint clean, 19/19 static pages |
| `/demo` First Load JS | **107 kB — unchanged** for the third measurement in a row (page chunk 1.24 kB) |
| `/demo/error` segment chunk | `.next/static/chunks/app/demo/error-*.js` = **1 748 B** — the barrel import stayed async; the demo module graph is not in the error segment's initial JS |
| Wall: `grep -rn "features/demo" components app/\(default\) lib app/layout.tsx` | unchanged — only the deliberate comment in `components/marketing/phone-frame.tsx:7` and its guard test. **Intact** |
| Tailwind inside `features/demo/ui/**` | none added (the one new UI module, `clear-demo-snapshot.ts`, is style-free) |
| `demo.css` / `motion.ts` / `package.json` / `pnpm-lock.yaml` | **unchanged in round 2** — no keyframes, no motion-token edits, no new dependency |
| New `@theme` utilities actually compile | `.bg-demo-error\/6`, `.border-demo-error\/30`, `.from-demo-accent-from`, `.to-demo-accent-to`, `.border-input` all present in `.next/static/css/4c3b72a8e8394b0c.css` |
| Dev-only warns stripped from prod | `grep -rl "non-canonical scope" .next/static/chunks/` → no match |

Findings below: **0 BLOCKER · 0 MAJOR · 2 MINOR** (both fix-introduced, both inside the round-2 blast radius).

---

## Fix-delta — prior findings attributed to this lane

### R-23 (= WEB-7) [MINOR] Inventory row contradicted the R-9 correction; lane brief still listed storage as unused — **FIXED**

Commit `c4cf8b4`. Both halves landed:

- `docs/planning/demo-phone-parity/demo-inventory.md:26` no longer claims "no persistence at all".
  The State row now reads: "No React context, no URL state, no `persist` middleware. **Persisted since
  P0.4 (D2):** the bridge rehydrates from a versioned per-tab `sessionStorage` snapshot at store
  creation and mirrors changes back debounced (250 ms) with a `pagehide` flush
  (`engine/store/persistence.ts`); injected stores (the test seam) are never persisted; a fresh tab
  still boots empty. Trade + details: deferred.md §29/§32." Every clause is true against
  `DemoExperience.tsx:162` (load), `:225-234` (subscribe + `pagehide` + `dispose`),
  `:226` (injected-store bail), `persistence.ts` (`SAVE_DEBOUNCE_MS`, `SNAPSHOT_KEY` v2). The
  contradiction with line 27 (Validation row) is gone.
- `.claude/agents/web-reviewer.md:70` — `sessionStorage` moved out of the "Not in use yet" list and
  into the guarded-APIs table with its real guards (`sessionStorageOrNull()`, versioned envelope +
  zod shape guard, `discard()`, debounce, `pagehide` flush, injected stores excluded). The residual
  list keeps `localStorage` and now says *why* (D2 rejected it — "its appearance anywhere in the demo
  is a finding, not a phase-gap"), which is stronger than what R-23 asked for. This lane ran off the
  rewritten brief this round; it reads correctly.

### R-24 (= WEB-8) [MINOR] Outer net could not escape a state-driven throw — **FIXED**

Commit `480321a`. The escape hatch exists, is wired in the right order, and is bundle-clean:

- `app/demo/error.tsx:54-68` — a second control, "Start fresh (clears this tab's demo session)",
  `await import('@/features/demo')` → `clearDemoSnapshot()` → `reset()`. "Try again" stays primary
  and keeps `autoFocus` (`:39-46`), so the transient case still preserves the session.
- Barrel rule respected: `features/demo/index.ts:6` re-exports `clearDemoSnapshot` from
  `ui/clear-demo-snapshot.ts:13`; `app/` never deep-imports the engine and never hardcodes the key.
  `features/demo/CLAUDE.md:37-39` and the layout tree were updated to match the widened public
  surface, so the "intentionally tiny" contract is still an accurate statement rather than a stale one.
- The Safari-private-mode hazard the finding named is handled at the property access itself
  (`clear-demo-snapshot.ts:16-20` `try { window.sessionStorage } catch`), matching
  `DemoExperience`'s `sessionStorageOrNull`; `clearSnapshot(null)` is a no-op
  (`persistence.ts:441-450`) and a throwing `removeItem` is swallowed with the R-14 breadcrumb.
- Mechanism verified end-to-end against the code, not just the commit message: the boundary's
  activation unmounts the subtree → `DemoExperience.tsx:230-233` cleanup → `handle.dispose()` →
  flush (`persistence.ts:515-518`) writes the throwing state as the newest snapshot; the click then
  removes that key *before* `reset()` remounts the segment, so `loadSnapshot` at `:162` returns null
  and `createDemoStore(undefined)` boots empty. Nothing can re-write in between — the old store is
  already unsubscribed.
- Bundle claim re-measured, not taken on trust: `/demo` First Load JS is still 107 kB and the error
  segment's own chunk is 1 748 B, so the dynamic import did not drag the demo graph into the error
  boundary's initial JS. `app/demo/page.tsx:7` uses the same `import('@/features/demo')` specifier,
  so the two dynamic imports resolve to the same async chunk (already in memory whenever the demo
  rendered before throwing).
- Pinned by `app/demo/__tests__/error.test.tsx:32-41` (clear happens, and `invocationCallOrder`
  asserts clear-before-reset) and `features/demo/ui/__tests__/clear-demo-snapshot.test.ts`
  (key-scoped removal, throwing-property-access no-op).

Residual (new, filed below as **WEB-10**): the file's header comment still asserts the opposite of
what line 58 now does.

### R-25 (= WEB-9) [MINOR] Route fallback re-hardcoded glass-token colours outside the guard — **FIXED**

Commit `207963f`. The "cheapest defensible" option from the finding was taken in full, plus the
fallback comment option:

- `app/css/style.css:41-48` adds `--color-demo-accent-from: #35a0d6`, `--color-demo-accent-to:
  #2580ad`, `--color-demo-error: #ff4757` to the `@theme` block with a comment naming the mirror
  and explicitly warning that `--color-blue` is a *different* blue ("do not consolidate") — which
  was the exact trap in the original finding.
- `app/demo/error.tsx:27,35,43` now use `border-demo-error/30`, `bg-demo-error/6`,
  `from-demo-accent-from to-demo-accent-to`; no hex or `rgba(255,71,87,…)` literal survives in the file.
- The cross-reference is two-way: `features/demo/ui/glass-tokens.ts:17-20` documents the mirror
  from the side that will drift ("Restyle both together").
- Values verified byte-equal to the tokens: `ACCENT_FROM = '#35A0D6'` / `ACCENT_TO = '#2580AD'`
  (`glass-tokens.ts:23-24`), `borderError = '1px solid rgba(255,71,87,0.3)'` (`:41`) = `#ff4757` at 30 %.
- No visual drift from the syntax change: Tailwind v4 compiles the modifiers to
  `color-mix(in oklab, var(--color-demo-error) 30%, transparent)` (confirmed in the built CSS).
  Mixing with `transparent` is premultiplied, so the resolved colour is the same stop at the same
  alpha — not an approximation.
- A source-scan guard now covers the file that the demo's own guard cannot see:
  `app/demo/__tests__/error.test.tsx:49-56` fails on any re-hardcoded literal *and* on the tokens
  going unused.

Optional hardening, not a finding: nothing machine-checks that `--color-demo-*` still *equals*
`GLASS.accentFrom/accentTo/borderError` — editing `#35A0D6` in `glass-tokens.ts` and forgetting
`style.css` is still silent. A 3-line assertion in the existing glass-tokens suite
(`expect(readFileSync(style.css)).toContain(\`--color-demo-accent-from: ${GLASS.accentFrom.toLowerCase()}\`)`)
would close it if the tests lane wants it.

### Cross-lane round-2 fixes that touched web surfaces (checked, no web regression)

- **R-19 (`b86cd46`)** — bridge rewiring at `DemoExperience.tsx:735` (`canComplete={!!currentLocation}`)
  and `:741-746` (`onComplete` deriving the case from `loc.caseId`). Both run in an event handler /
  cheap render expression; no new subscription, no new bridge state, no identity churn into a
  memoized child. Side effect worth noting as a *positive*: because the gate is now "no location
  open", the `CompletionScreen.tsx:100` disabled hint ("Open a location first") is accurate for
  every disabled state, which retires the a11y-adjacent copy defect R-19 listed as its third sub-item.
- **R-21 (`e8621bd`)** — `reviewAgain: boolean` → `reviewAgainFor: string | null`
  (`DemoExperience.tsx:212, 325, 728, 745, 747`). Still bridge-local `useState` (not a store subscription),
  still one consumer, one `setState` per click. Same re-render profile as before; the null-vs-undefined
  edge (`reviewAgainFor !== currentLocation?.id` with no location open) is short-circuited by the
  `completed ?? false` operand.
- **R-27 (`c41c5ae`)** — the new dev-warn is the subject of **WEB-11** below.
- **R-26 (`8a4dd55`)**, **R-20 (`e182186`)**, **R-28/R-29/R-30** — engine/type/test surfaces with no
  browser-platform footprint; `optionValues`' deletion has zero UI consumers (grep: only the
  test-local projection comment and the barrel-tombstone assertion).

---

## New findings (fix-introduced)

## WEB-10 [MINOR] app/demo/error.tsx:12-14

**Claim.** The R-24 fix added a dynamic `import('@/features/demo')` to this file and added an export
to the demo barrel, but left the file's header comment asserting the exact opposite: that the barrel
is *untouched* and that this file *imports nothing* from `@/features/demo`. Both clauses are now
false. This is the isolation claim a future reviewer or maintainer reads first when auditing the wall
in this file — and the wall's guard test regex explicitly treats `import('…features/demo')` as an
import form, so a comment that denies one is actively misleading. It also buries the real, defensible
property (the import is *async*, so the demo graph stays out of the error segment's initial JS —
measured 1 748 B) under a claim that is simply wrong.

**Evidence.**

- `app/demo/error.tsx:12-14`:
  ```
  // Deliberately chrome-free and outside the phone frame: like /demo itself (no
  // marketing header/footer — see app/layout.tsx), and the demo feature barrel is
  // untouched (this imports nothing from @/features/demo).
  ```
- `app/demo/error.tsx:58` — `const { clearDemoSnapshot } = await import('@/features/demo')`.
- `features/demo/index.ts:6` — `export { clearDemoSnapshot } from '@/features/demo/ui/clear-demo-snapshot'`,
  i.e. the barrel *was* touched, specifically for this file (its own comment at `:1-4` says so).
- The correct claim is already documented two comments lower (`error.tsx:50-53`) and in
  `features/demo/index.ts:2-4` — only the header was left behind.
- Guard-test context: `components/marketing/__tests__/phone-frame.test.tsx:63-71` rejects
  `(from\s+|import\(\s*|require\(\s*)['"]…features/demo` — dynamic imports count as imports for the
  wall. (That test scans marketing files only, so nothing failed; the stale comment is the whole defect.)

**Suggested fix.** Rewrite the third clause of `error.tsx:12-14` to what is true — no *static*
import from `@/features/demo`; the barrel is reached only through the async import in the
"Start fresh" handler, which keeps the demo chunk out of this segment's initial JS (1.7 kB error
chunk, `/demo` First Load unchanged at 107 kB) — and keep the chrome-free sentence as-is.

**Confidence.** High — both lines read directly; no judgment involved.

---

## WEB-11 [MINOR] features/demo/engine/store/selectors.ts:93-95

**Claim.** R-27's dev-warn was added inside `selectAdjustedScopes`, which the bridge calls **during
render** (`DemoExperience.tsx:642`, inside `activeScreen()`, invoked from JSX at `:839`) — not inside
an action like the `generateExtractedScopes` sibling it says it mirrors. So on the Time-Offset
screen, once any scope has a non-canonical requested time, the warning is emitted on *every* render
of the bridge: every keystroke in the DVR/Actual time fields (each one writes `capture.*`, which the
bridge subscribes to at `:178`), every drawer toggle, every sync tick — and twice per render in dev,
because the App Router enables React StrictMode by default in Next 15. The cited sibling
(`create-store.ts:354`) fires once per user-invoked regeneration. A breadcrumb that repeats ~2× per
keystroke is the kind of console noise operators mute, which defeats the purpose the un-defer of
§15 was granted for. Secondary: `console.warn` is a side effect executed in the render phase, which
is what makes it StrictMode-doubled in the first place.

**Evidence.**

- `features/demo/engine/store/selectors.ts:93-95`:
  ```ts
  if (dropped > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(`[demo] selectAdjustedScopes left ${dropped} non-canonical scope(s) blank`)
  }
  ```
- Render-path call site: `features/demo/ui/DemoExperience.tsx:642`
  `correctedScopes={selectAdjustedScopes(store.getState())}` — inside `function activeScreen()`
  (`:561`), which is called in JSX at `:839` (`{activeScreen()}`). No `useMemo`, no effect.
- Re-render trigger on that same screen: `TimeOffsetScreen`'s `onChangeDvr`/`onChangeActual`
  (`:631-632`) call `updateField('capture.*')`, and the bridge subscribes to `capture`
  (`DemoExperience.tsx:178`) — so each keystroke re-renders the bridge and re-runs the selector.
- The mirrored sibling is action-scoped, not render-scoped:
  `features/demo/engine/store/create-store.ts:320` `generateExtractedScopes: () => { … }`,
  warn at `:354` — one line per "Regenerate" tap.
- Second call path also runs it again per PDF preview: `selectors.ts:218` inside
  `selectCaseNotesData`, invoked from `DemoExperience.tsx:538`.
- Reachability of `dropped > 0` is real, not theoretical: the engine's own comment
  (`create-store.ts:327-329`) names free-text imported frames as the source of non-canonical scopes,
  and the PDF-import path is the demo's headline flow.
- Blast-radius check: production is unaffected — the string is absent from the built chunks
  (`grep -rl "non-canonical scope" .next/static/chunks/` → no match), which is why this is MINOR
  and not higher.

**Suggested fix.** Keep the counting where it is, move the emission out of the render phase — the
smallest version is to warn once per distinct condition instead of per render, e.g. hoist the warn
into the two *action* boundaries that can create the condition (`applyImport` / the requested-scope
edit) or have the bridge log it in an effect keyed on the returned rows. If the warn must stay in
the selector, gate it on a module-level `lastWarnedCount` so a stable state warns once rather than
per keystroke, and say in the comment that this selector is render-path (unlike
`generateExtractedScopes`). The existing test
(`engine/store/__tests__/select-adjusted-scopes.test.ts:43-59`) already asserts the message content
and would survive either shape with a one-line adjustment.

**Confidence.** High on the mechanism (render-path call site, subscription, and StrictMode default
all verified); MINOR — dev-console quality only, stripped from production.

---

## Checked and deliberately not flagged

- **"Start fresh" downloads the whole demo chunk to call one `removeItem`.** The barrel is a single
  module that also exports `DemoExperience`, so `import('@/features/demo')` pulls the demo graph.
  Not flagged: it is an *async* chunk (measured — error segment 1 748 B, `/demo` First Load
  unchanged), it is the same chunk `app/demo/page.tsx:7` already loaded before the throw, and the
  barrel-not-deep-import shape is what R-24 explicitly asked for. The residual case (chunk 404 after
  a deploy rotation while the tab sat on the error page) is caught at `error.tsx:60-62` and degrades
  to plain `reset()`, which the comment states as the deliberate behaviour.
- **That degrade is silent** (the button promises a session wipe and may only reset). Real, but it is
  the silent-failure lane's call, it is documented at the catch, and no in-page surface survives
  `reset()` to announce it.
- **`bg-demo-error/6` — non-standard opacity step.** Verified it compiles: Tailwind v4 emits
  `.bg-demo-error\/6{background-color:color-mix(in oklab,var(--color-demo-error)6%,transparent)}`
  in the built CSS. Arbitrary integer modifiers are v4 behaviour, not v3's fixed scale.
- **Contrast of the new secondary button.** `text-muted` (`#7a9fc4`) on the composited card surface
  (`rgba(19,34,54,0.6)` over `bg-gray-950`) computes to ≈ 6.5:1 — WCAG AA passes for 14 px semibold.
  `border-input` (`#2a4a6f`) is ≈ 2.1:1, but the control is identified by its text label, and it is
  the repo's established input-border token, so 1.4.11 isn't engaged by this change.
- **Focus handling on the error page.** `autoFocus` stays on the primary "Try again"; the new
  secondary is a real `<button type="button">` with a text label, next in DOM order, default
  focus-visible ring intact (no `outline-none` anywhere in the file). No focus trap, no icon-only
  control.
- **`createCase` now clearing `currentLocationId` (R-19).** Widens the reachability of the
  pre-existing "no location open → `updateField` no-ops" state (`create-store.ts:276-277`), which a
  fresh boot already produces. It is the honest state and the Completion CTA now says so; the
  dead-input class is pre-existing and belongs to the silent-failure lane, not to this fix.
- **`selectAdjustedScopes` returning a fresh array per call.** Would be a re-render hazard through
  `useStore`, but it is called with `store.getState()` in the render body, never as a subscription
  selector — no `useSyncExternalStore` equality surface. Pre-existing shape, unchanged by round 2.
- **Three new `@theme` variables on every marketing page.** ~120 bytes in the shared stylesheet; the
  values are namespaced (`--color-demo-*`) and the comment forbids consolidating them with
  `--color-blue`. Not a bundle concern.
- **Pre-existing tracked items** (`deferred.md` §15, §19–§23, §29–§32 incl. the new §29 addendum for
  the deferred `completeCase(locationId)` reshape) and the orchestrator's deliberate-choices list
  (class-based boundary, `sessionStorage` per D2, phone-verified asymmetries, "Location Complete"
  copy, the non-adopted action-signature reshape) — not re-flagged.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 2 |

**Prior lane findings:** R-23 (WEB-7) **FIXED** · R-24 (WEB-8) **FIXED** · R-25 (WEB-9) **FIXED**.
Three of three, none partial; each carries a pinning test (`error.test.tsx` ×2 new cases,
`clear-demo-snapshot.test.ts`) or a verified doc rewrite.

- **Marketing↔demo isolation:** preserved — grep clean, guard test unchanged and passing, route
  table unchanged. The barrel widened by one function for `app/demo/error.tsx` (a demo-route file,
  not marketing), documented in `features/demo/CLAUDE.md`.
- **Bundle impact:** none — `/demo` First Load JS 107 kB for the third consecutive measurement;
  `/demo/error` segment chunk 1 748 B; `mapbox-gl` / `pdfjs-dist` still `await import`ed; no
  dependency change.
- **Browser-resource cleanup:** complete — round 2 adds no listener, timer, observer, object URL,
  map or PDF instance; the one new storage entry point (`clearSnapshot`) is `try`-wrapped at both
  the property access and the call.
- **Accessibility:** no regressions — the new recovery control is a labelled real button in DOM
  order after the auto-focused primary; contrast passes AA; the R-19 rewiring incidentally made the
  Completion CTA's disabled hint truthful.
- **Style-convention adherence:** correct half — no Tailwind added inside `features/demo/ui/**`, no
  lifted rule or device math touched, and the cross-half colour duplication WEB-9 flagged is now
  expressed as `@theme` mirrors with two-way cross-references.

**Verdict:** APPROVE with comments — nothing here gates the merge. WEB-10 is a three-line comment
correction; WEB-11 is dev-console hygiene inside the R-27 fix.
