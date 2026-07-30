# Parity P0 — Lane: tests (FIX-DELTA, round 2)

**Lane:** tests (`.claude/agents/test-analyzer.md`)
**Mode:** FIX-DELTA round 2 — re-review of the **round-2 fix commits only** on `feat/parity-p0` (PR #29)
**Fix commits under review:** everything after the review merge `f69aa92`:
`parity/p0-fix2-options` (`e182186`),
`parity/p0-fix2-boundary` (`b86cd46`, `480321a`, `e8621bd`, `4abad16`, `207963f`, `8a4dd55`),
`parity/p0-fix2-store` (`c41c5ae`, `6566531`, `ac4cb5e`, `7ef5608`, `c4cf8b4`).
**Refs read:** `docs/code-reviews/parity/p0/p0-review-fixdelta.md` (full, R-19…R-30), my prior
`docs/code-reviews/parity/p0/lane-tests.md` (round-1 fix-delta content, now overwritten),
`.claude/agents/test-analyzer.md`, `features/demo/CLAUDE.md`, `vitest.config.mts`,
`vitest.setup.ts`, every test file touched in round 2 in full plus the production modules they
pair with (`ui/DemoExperience.tsx`, `engine/store/create-store.ts`, `engine/store/selectors.ts`,
`engine/store/persistence.ts`, `engine/content/form-options.ts`, `engine/index.ts`,
`features/demo/index.ts`, `features/demo/ui/clear-demo-snapshot.ts`, `app/demo/error.tsx`,
`app/css/style.css`, `features/demo/ui/glass-tokens.ts`, `ui/screens/CompletionScreen.tsx`).
**Scope note:** R-1…R-18 are CLOSED (verified FIXED in round 1) and are not re-litigated here.
Deliberate choices standing from both prior rounds (deferred §29–§32, the class-based boundary,
sessionStorage per D2, the phone-verified asymmetries, the "Location Complete" copy) are not
re-flagged.

## Gates run in this lane

| Gate | Result |
|---|---|
| `npx vitest run --silent` (worktree) | **120 files / 904 tests, all green**, 46.7 s (was 119 / 890) |
| `npx vitest run --coverage --silent` (probe copy of HEAD) | **904/904 green**, zero timeouts, thresholds met: **97.14 S / 88.84 B / 98.85 F / 98.42 L** |
| Engine gate on the round-2 modules | `engine/store/persistence.ts` 100 S / 96.29 B (uncovered: the two `NODE_ENV !== 'production'` false arms, `:446`, `:493`); `engine/store/selectors.ts` 96.47 S / 96.42 B (up from 96.25 / 96.15); `engine/store/create-store.ts` 98.51 S / 90.84 B (unchanged) |
| `npx tsc --noEmit` (probe copy) | clean |

**Verification method.** Every "probe-verified red" verdict below was checked by rsync-copying the
worktree to an out-of-repo scratch dir (`scratchpad/probe-p0-r2`, `node_modules` symlinked),
reverting the round-2 production fix *there*, and re-running the affected suites. **Nothing in the
repo under review was modified** (this file excepted). The probe dir has been deleted.

---

# Fix-delta — prior findings (R-19 … R-30)

Lane-owned findings first (R-21, R-22, and TESTS-7 which was folded into R-19 as its regression-test
requirement), then the test-surface verdict on every other round-2 finding.

| Prior | Sev | Lane | Verdict | Evidence |
|---|---|---|---|---|
| R-19 | MAJOR | ts / sf / type-design (+ TESTS-7 fold) | **FIXED** | `b86cd46` — all three converged items; **both halves probe-verified red** (below) |
| R-20 | MINOR | ts / type-design | **FIXED** | `e182186` — declaration + barrel line deleted; `barrel.test.ts:12` gone-list now pins `FORM_OPTIONS` **and** `optionValues` off the public surface; test-local `valuesOf` at `form-options.test.ts:16` |
| R-21 | MINOR | **tests** | **FIXED** | `e8621bd` — structural `reviewAgainFor: string \| null`; two new tests, **both probe-verified red** (below) |
| R-22 | MINOR | **tests** | **FIXED** | `4abad16` — strict `getByText` while collapsed + `toHaveLength(2)` expanded; **probe-verified to now catch the G3/G4 row regression** (below) |
| R-23 | MINOR | web | **FIXED** (docs) | `c4cf8b4` — no test surface |
| R-24 | MINOR | web / sf | **FIXED, with a test gap** | `480321a` — "Start fresh" + `clearDemoSnapshot` barrel export + `clearSnapshot(storage)`; happy path and ordering pinned, the documented chunk-failure degradation is not → **TESTS-10** |
| R-25 | MINOR | web | **FIXED in code, PARTIAL in guard** | `207963f` — literals moved to `@theme`; the new guard pins error.tsx's *syntax* only, the mirror's *values* remain untested → **TESTS-9** |
| R-26 | MINOR | sf | **FIXED** | `8a4dd55` — `catch (e)` + cause; `persistence.test.ts:431-434` now asserts `expect.objectContaining({ message: 'QuotaExceededError' })` alongside the message — the assertion was strengthened, not just moved |
| R-27 | MINOR | sf | **FIXED** | `c41c5ae` — option (a) taken; `selectors.ts:93-95` dev-warns with a drop count, both arms tested (`select-adjusted-scopes.test.ts:43`, `:61`); §15 re-scoped in `deferred.md` |
| R-28 | MINOR | type-design | **FIXED** | `6566531` — `FullShapeIn` at `persistence.ts:99-105` applied to `persistedStateSchema` (`:309`). Compile-time device; this repo has no negative-compile test convention, so no runtime pin is expected |
| R-29 | MINOR | type-design | **FIXED** | `ac4cb5e` — no test surface |
| R-30 | MINOR | type-design | **FIXED** | `7ef5608` — docs only |

## R-19 → **FIXED** (both halves probe-verified red; TESTS-7's gap closed)

`b86cd46` landed all three converged items and the mandated regression test:

- **Bridge** (`DemoExperience.tsx:735`, `:741-746`): `canComplete={!!currentLocation}`; `onComplete`
  looks up the open location and calls `completeCase(loc.caseId)`.
- **Pair invariant at the source** (`create-store.ts:215`, `:256-259`): `createCase` clears
  `currentLocationId`; `addLocation` sets `currentCaseId` alongside it.
- **Disabled-hint copy** (`CompletionScreen.tsx:99`): with the gate now location-only,
  `title="Open a location first"` is the one disabling condition — truthful by construction.
- The `completeCase(locationId)` reshape was deliberately **not** taken; the rationale (an in-place
  `string → string` swap silently changes meaning at every call site; the safe form is a rename) is
  in the commit body and logged as a triggered follow-up in `deferred.md` §29's addendum. Per the
  orchestrator brief this is a deliberate choice — not re-flagged.

Probes (each reverting exactly one half, everything else at HEAD):

| Probe | Result |
|---|---|
| Bridge reverted to `!!currentLocation && !!currentCase` + `completeCase(currentCaseId)` (store invariants kept) | `× R-19: onComplete derives the case from the OPEN LOCATION even if the pair is incoherent` — `AssertionError: expected 'draft' to be 'complete'` (1 failed / 39 passed) |
| Store invariants reverted (bridge kept) | `× createCase clears currentLocationId` · `× addLocation sets BOTH halves` · `× R-19 (mandated regression) …` (3 failed / 75 passed) |
| **TESTS-7's original probe** — `canComplete` hardcoded `true` (`npx vitest run features/demo app`) | `× R-19 (mandated regression) …` — **1 failed / 782 passed**. In round 1 this same edit left the whole suite green (769/769); the `expect(btn).toBeDisabled()` at `sandbox.test.tsx:206` is what closes it |

So the two tests are complementary rather than redundant: `:192` pins the store half plus the
disabled gate, `:213` pins the bridge derivation (it forces the incoherent pair with `setState`,
which the store actions can no longer produce — correctly labelled "defense in depth" in the test).
`store.test.ts:251-269` pins both invariant writes at the engine level, inside the 80 % gate.

## R-21 → **FIXED** (both directions probe-verified red)

`e8621bd` replaced the un-keyed boolean with `reviewAgainFor: string | null`
(`DemoExperience.tsx:212`), compared against the open location at `:728`
(`reviewAgainFor !== currentLocation?.id`) and set from `currentLocationId` at `:747`. The
`openLocation` reset (`:325`) is kept so re-opening a completed location still lands on its
confirmation.

| Probe | Result |
|---|---|
| Reverted to the pre-R-21 un-keyed `reviewAgain` boolean | `× R-21: Review / Export again is scoped to ITS location — a direct switch cannot suppress a sibling confirmation` (`sandbox.test.tsx:149`) |
| `setReviewAgainFor(null)` deleted from `openLocation` (round-1's exact probe, which then left 705/705 green) | `× R-21: re-opening a completed location through the Cases row restores its confirmation (reset pinned)` (`sandbox.test.tsx:175`) |

This is the stronger of the two options the finding offered (structural state, not just a test), and
both the structure and the surviving reset are now pinned. The first test deliberately drives
`switchLocation` directly — a path no current UI control takes — which is the right way to pin a
structural invariant against future map/deep-link entry points.

## R-22 → **FIXED** (verified to catch the regression it was filed about)

`4abad16` restored `expect(screen.getByText('Complete')).toBeInTheDocument()` while the card is
collapsed (`sandbox.test.tsx:99`) and added the expanded assertion
`expect(screen.getAllByText('Complete')).toHaveLength(2)` (`:104`).

Probe — I reverted the R-1 short-circuit at `selectors.ts:204` (`if (loc.form.completed) return
'complete'`), i.e. reproduced the exact G3/G4 row regression the loose assertion would have
survived:

```
× completion: Complete & Save marks the case complete in the STORE (G4) and the arc pays off green
  AssertionError: expected [ <span …(1)></span> ] to have a length of 2 but got 1
```

The collapsed strict assertion at `:99` still passed under that probe — it is `:104` that does the
work, which is exactly the "pin both halves" form the finding asked for.

---

# New findings (fix-introduced, round 2)

Two MINORs, both inside the round-2 fix commits' blast radius, both probe-verified. No BLOCKER, no
MAJOR.

## TESTS-9 [MINOR] app/demo/__tests__/error.test.tsx:49

**Claim.** R-25's fix moved the four glass colour literals out of `app/demo/error.tsx` and into
`@theme` vars in `app/css/style.css`, and added a source-scan guard for the *consumer syntax*. But
nothing tests the **mirror itself**: no test asserts that `--color-demo-accent-from/-to` /
`--color-demo-error` exist, and no test asserts that their values equal
`GLASS.accentFrom`/`accentTo`/`borderError`. The silent drift R-25 was filed about did not go away —
it moved one file over, from `error.tsx` ↔ `glass-tokens.ts` to `style.css` ↔ `glass-tokens.ts`.

**Evidence.**

- The new guard (`app/demo/__tests__/error.test.tsx:49-57`) reads only `app/demo/error.tsx` and
  checks (a) six banned hex/rgba substrings are absent, (b) the three substrings
  `demo-accent-from` / `demo-accent-to` / `demo-error` are present. It never opens `style.css` and
  never compares a value to anything.
- The demo-side guard cannot see `app/` either: `glass-tokens.test.ts:16`
  `const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')`.
- `app/css/__tests__/tokens.test.ts:18-28` pins the marketing token namespace; `--color-demo-*` is
  not in that list, and the accent-value assertions (`:32-35`) cover only carolina/blue/cyan/gold.
- **Probe (full suite, HEAD otherwise unmodified):** I changed `app/css/style.css:46` to
  `--color-demo-accent-from: #00ff00` (drifted away from `glass-tokens.ts:23`
  `ACCENT_FROM = '#35A0D6'`) **and** renamed `:48` to `--color-demo-err` (orphaning
  `border-demo-error/30` at `error.tsx:27`, `:35` and `bg-demo-error/6` at `:35`):
  `Test Files 120 passed (120) · Tests 904 passed (904)`. Neither the value drift nor the orphaned
  utility fails anything — and an unknown Tailwind utility is simply not generated, so the error
  page silently loses its red border/tint with no build error either.
- Secondary weakness in the same test: the "token is in use" check is a whole-file `includes()`, so
  a comment mentioning `demo-error` satisfies it even if the class is gone — plausible here, since
  the fix's own house style is to leave cross-reference comments (`error.tsx:25-26`,
  `glass-tokens.ts:17-20`, `style.css:41-45`).

**Why it matters.** The concrete regression R-25 described — "a future `GLASS` accent/error edit
silently strands the `/demo` error page on the old palette, visibly diverging from the in-frame
fallback it twins" — is still reachable: `glass-tokens.test.ts:66-81` forces a restyler to update the
GLASS value pin, but nothing points them at `style.css`, and nothing fails if they miss it.

**Suggested fix.** Extend the R-25 test (or `app/css/__tests__/tokens.test.ts`) by ~5 lines — same
source-scan idiom, now on the file that will actually drift:

```ts
import { GLASS } from '@/features/demo/ui/glass-tokens'
const css = readFileSync(join(process.cwd(), 'app', 'css', 'style.css'), 'utf8')
const hex = (name: string) => css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, 'i'))?.[1]?.toLowerCase()
expect(hex('demo-accent-from')).toBe(GLASS.accentFrom.toLowerCase())   // #35a0d6
expect(hex('demo-accent-to')).toBe(GLASS.accentTo.toLowerCase())       // #2580ad
expect(GLASS.borderError).toContain('255,71,87')                       // === #ff4757
expect(hex('demo-error')).toBe('#ff4757')
```

Optionally tighten the presence check to the className strings (`from-demo-accent-from`,
`border-demo-error/`) so a comment mention can't satisfy it.

**Confidence.** High — the drift probe is empirical (904/904 green with both mutations applied), and
every cited line was read.

## TESTS-10 [MINOR] app/demo/error.tsx:56

**Claim.** The R-24 escape hatch's documented failure behaviour — "if the chunk somehow can't load,
fall back to a plain reset" (`error.tsx:52-53`, restated in the commit body) — has no test. The
`catch` at `:60-62` swallows the failure and `reset()` at `:63` sits *outside* the `try`; move it
inside (a one-line refactor a future reader would call a tidy-up) and "Start fresh" becomes a dead
button in exactly the scenario the dynamic import exists for, with the whole suite still green.

**Evidence.**

- `app/demo/error.tsx:56-64` — `try { await import('@/features/demo'); clearDemoSnapshot() } catch {}`
  followed by `reset()`.
- The only tests are the happy paths: `error.test.tsx:32-41` (clear called once, **before** reset)
  and `:21-30` ("Try again" does not clear). Neither exercises a throwing/failing import.
- **Probe:** moved `reset()` inside the `try` (so a chunk-load failure leaves the button dead) →
  `npx vitest run app/demo` → `Test Files 1 passed (1) · Tests 4 passed (4)`. Nothing catches it.
  (Only `error.test.tsx` imports this module — grep-verified.)
- Realistic trigger: a lazily-imported chunk 404s after a redeploy while an old tab is open — the
  same staleness class that produces the throw the boundary caught in the first place. The visitor
  then taps the one control that could rescue them and nothing happens; the `catch` guarantees no
  console signal either.
- Not covered by the type gate: I probe-verified that `tsc --noEmit` *does* catch removal of the
  barrel export (`TS2339` on the dynamic-import destructure at `error.tsx:58`), but it cannot see the
  ordering of `reset()`.

**Suggested fix.** One case beside the existing two, reusing the barrel mock already in the file:

```ts
it('degrades to a plain reset when the demo chunk cannot load (R-24)', async () => {
  const reset = vi.fn()
  vi.mocked(clearDemoSnapshot).mockImplementationOnce(() => { throw new Error('chunk load failed') })
  render(<DemoError error={new Error('boom')} reset={reset} />)
  fireEvent.click(screen.getByRole('button', { name: /Start fresh/ }))
  await waitFor(() => expect(reset).toHaveBeenCalledTimes(1))
})
```

(A throwing `clearDemoSnapshot` exercises the same `catch` arm as a rejected `import()` and needs no
module-loader trickery. `beforeEach`/`mockReset` hygiene: the file has no reset today, so prefer
`mockImplementationOnce`.)

**Confidence.** High — probe-verified green under the regression; the contract is stated in the
file's own comment.

---

## Checked and cleared (round-2 regression sweep)

Recorded so the next pass doesn't re-litigate them.

- **No assertion was silently weakened in round 2.** `git diff f69aa92 HEAD -- '*__tests__*' | grep
  '^-'` shows only upgrades: the loose `getAllByText('Complete').length > 0` (replaced by R-22's
  strict + `toHaveLength(2)`), the message-only quota assertion (replaced by R-26's message+cause),
  the `optionValues` imports (deleted with the helper), and renamed test titles.
- **R-27's negative test can't rot silently.** `select-adjusted-scopes.test.ts:61` ("does not warn
  when every scope is canonical") has no premise assertion, so on its own it would pass vacuously if
  `selectAdjustedScopes` early-returned `[]`. Not filed: the two sibling tests in the same file
  (`:6` asserts `rows` length 1 with exact values, `:43` asserts `rows[1].adjStart` computes) use the
  same `storeWithLocation()` + `calculateOffset()` setup and would fail loudly first. Cheap
  hardening if the file is touched: assert `rows[0].adjStart` is non-empty in the negative case too.
- **The `clearDemoSnapshot` barrel export is unpinned by tests but covered by the type gate.**
  `error.test.tsx:10` mocks the whole barrel and `clear-demo-snapshot.test.ts:2` deep-imports, so no
  test would fail if `features/demo/index.ts:6` were deleted — but I probe-verified `tsc --noEmit`
  reports `TS2339` at `error.tsx:58` (dynamic-import destructure) and `TS2305` in the test. Adequate;
  no finding. (Relevant because R-20's own rationale was "delete exports whose only consumer is a
  test" — this one's production consumer is a dynamic `import()` that a naive grep for
  `import { clearDemoSnapshot }` misses.)
- **`clearSnapshot` engine coverage is real, not incidental** — null-storage arm
  (`clear-demo-snapshot.test.ts:36`), throwing-`removeItem` + breadcrumb arm (`:41`), and the success
  arm through the real jsdom `sessionStorage` (`:12`, asserting the unrelated key survives). The only
  uncovered line in the module is the `NODE_ENV === 'production'` false arm (`persistence.ts:446`),
  consistent with the file's pre-existing shape.
- **No hardcoded snapshot key in the new tests** — `clear-demo-snapshot.test.ts:3` imports
  `SNAPSHOT_KEY` from the engine.
- **Descriptor hygiene on the new throwing-storage test.** `clear-demo-snapshot.test.ts:24-34` swaps
  `window.sessionStorage` for a throwing accessor and restores in `finally`. It lacks the
  `Reflect.deleteProperty` fallback its round-1 sibling has, but the describe-level
  `afterEach(() => window.sessionStorage.clear())` would throw if the restore ever failed — the suite
  being green proves the descriptor is own-property in jsdom. No leak, no finding.
- **No act() warnings** from the new async path — ran `app/demo/__tests__/error.test.tsx` and
  `features/demo/ui/__tests__/clear-demo-snapshot.test.ts` without `--silent`: clean output, 8/8.
- **The R-19 mandated regression's post-click assertions are belt-and-braces**
  (`sandbox.test.tsx:207-210` clicks an already-`disabled` button). They cannot fail independently of
  `expect(btn).toBeDisabled()` at `:206`, which is the load-bearing assertion — harmless, not a
  finding.
- **Setup-shim traps** — nothing in round 2 claims a live camera/canvas/reduced-motion path;
  `navigator.mediaDevices` stays undefined, `getContext` stays `null`, `matchMedia` is untouched.
- **Determinism** — no `Date.now()` / `Math.random()` introduced; no new fake-timer usage beyond the
  existing `persistence.test.ts` block; ids still come from the store's monotonic counter.
- **Factory usage** — `store.test.ts:251-269` uses `freshStore()` / `newCaseInput()` /
  `newLocationInput()`; the inline `createCase({ caseNumber, displayName, unit })` literals in the new
  sandbox tests match the established UI-suite idiom (`sandbox.test.tsx:45`) and name only required
  fields.
- **No new order-dependence** — `vi.mock('@/features/demo', …)` is file-scoped; the console spies in
  `select-adjusted-scopes.test.ts` are restored at the end of each test (house style, same as
  `persistence.test.ts`); `clear-demo-snapshot.test.ts` clears storage in both hooks.
- **Coverage-boundary discipline** — round 2 added no logic to `ui/**` that belongs in `engine/**`:
  `clearSnapshot` (the storage write) landed in `engine/store/persistence.ts` (gated), while
  `ui/clear-demo-snapshot.ts` holds only the `window.sessionStorage` property-access guard, which is
  browser-boundary code and mirrors `sessionStorageOrNull` in the bridge.
- **R-28's `FullShapeIn`** is a compile-time device with no runtime surface; this repo has no
  negative-compile test convention (the established practice is a probe recorded in the review), so
  the absence of a runtime test is correct, not a gap.
- **Deliberate choices from the phase brief** not re-flagged: the deferred `completeCase(locationId)`
  reshape (§29 addendum), the `sessionStorage`-over-`localStorage` decision (D2), the class-based
  `DemoErrorBoundary`, the "Location Complete" copy, the phone-verified asymmetries, and deferred
  §29–§32.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 2 |

Prior findings with a test surface: **R-19 FIXED** (incl. TESTS-7's folded gap — its round-1 probe is
now red), **R-21 FIXED**, **R-22 FIXED**, **R-20/R-26/R-27 FIXED with genuine pins**, **R-24 FIXED**
(one untested degradation arm → TESTS-10), **R-25 FIXED in code / PARTIAL in guard** (→ TESTS-9).
No prior finding is UNFIXED.

- **Behaviorally meaningful coverage:** strong. Every round-2 behavioural fix is pinned by a test
  that I verified fails against the pre-fix code — including the two that round 1 flagged as
  unpinned-by-probe (`canComplete`, the `reviewAgain` reset).
- **Engine coverage gate (80 % on `lib/**` + `engine/**`):** met — 97.14 S / 88.84 B / 98.85 F /
  98.42 L, zero timeouts under `--coverage`.
- **Mock strategy:** at the IO edge. The one new module mock (`@/features/demo` in `error.test.tsx`)
  is a deliberate module-graph cut for a dynamic import, and the deep-import test covers the real
  implementation.
- **Factory usage:** canonical.
- **Setup-shim traps:** none.
- **Determinism (clock/entropy injected):** yes.
- **New order-dependence:** none.

**Lane verdict: APPROVE** — the two MINORs are opportunistic hardening of guards the fixes
themselves introduced; neither gates merge.
