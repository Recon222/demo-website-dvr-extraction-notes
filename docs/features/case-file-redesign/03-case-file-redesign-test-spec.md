# Case File — Marketing Site Redesign · Test Specification

**Purpose:** This document defines every test that must be written **before implementation
begins**, organized by the implementation slice each test validates.
**Cross-references:** The **Implementation Plan**
([`02-case-file-redesign-implementation-plan.md`](./02-case-file-redesign-implementation-plan.md))
is the single source of truth for file paths and signatures; the **Architecture Document**
([`01-case-file-redesign-architecture.md`](./01-case-file-redesign-architecture.md)) defines the
content model and beta contract.
**TDD declaration:** Tests are organized by the slice they validate. Write them as **red-line
tests** (designed to fail) first; a slice's Gate is its tests + full `pnpm test` + `tsc` green.
**Runner:** Vitest 4 + jsdom + RTL (`vitest.config.mts`, `vitest.setup.ts`), co-located `__tests__/`.
Coverage counts `lib/**`; UI is validated behaviorally (per `features/demo/CLAUDE.md` policy).

---

## Test File Location Table

| Test File | Slice(s) |
|-----------|----------|
| `app/css/__tests__/tokens.test.ts` | 1 |
| `lib/content/__tests__/features.test.ts` (EDIT) | 2 |
| `app/(default)/__tests__/chrome-scope.test.tsx` | 3 |
| `components/ui/__tests__/manifest-tab-strip.test.tsx` | 4 |
| `components/ui/__tests__/header.test.tsx` (EDIT) | 4 |
| `components/ui/__tests__/footer.test.tsx` | 4 |
| `components/marketing/__tests__/phone-frame.test.tsx` | 5 |
| `components/home/__tests__/hero.test.tsx` | 6 |
| `components/home/__tests__/chain-of-work.test.tsx` | 7 |
| `components/home/__tests__/evidence-manifest.test.tsx` | 8 |
| `components/home/__tests__/beta-cta.test.tsx` | 9 |
| `components/__tests__/feature-page.test.tsx` (EDIT) | 10 |
| `lib/beta/__tests__/schema.test.ts` | 11 |
| `lib/beta/__tests__/submit-signup.test.ts` | 11 |
| `components/beta/__tests__/beta-form.test.tsx` | 12 |
| `app/(default)/beta/__tests__/beta-page.test.tsx` | 12 |
| `app/(default)/privacy/__tests__/privacy-page.test.tsx` | 13 |

---

## Shared Mock Infrastructure (defined once)

- **Content fixtures:** `lib/content/__tests__/test-utils.ts` — `createFeature(overrides)` and
  `createFeatures(n)` returning valid extended `Feature[]` (incl. one `classLabel:'MARQUEE'`,
  one `draft`). All section/manifest tests import these; **no inline feature literals**.
- **`usePathname`:** `vi.mock('next/navigation', () => ({ usePathname: vi.fn(() => '/') }))`;
  each tab-strip test sets the return per case.
- **`useReducedMotion`:** `vi.mock('@/lib/hooks/use-reduced-motion', () => ({ useReducedMotion: () => false }))`
  (phone-frame/hero); a reduced-motion variant flips it to `true`.
- **Persistence:** nothing to mock in this PR — `submitBetaSignup` is a validated **stub**
  (no `firebase-admin`). *(The Firestore-swap follow-up PR adds the `@/lib/beta/firebase` mock:
  `getDb()` with a spyable `collection().doc().set`, payload + rejection paths. No real network,
  no real credentials — then as now.)*
- **Server Action invocation:** call `submitBetaSignup(null, formData)` directly with a `FormData`
  built in-test; assert the returned `BetaResult` union (no HTTP).
- **CSS token test:** read `app/css/style.css` as text and assert token/keyframe substrings (no DOM).

---

## Slice 1 Tests — Tokens & fonts
**File:** `app/css/__tests__/tokens.test.ts` · **Setup:** read `style.css` as a string.
1. `describe('design tokens')` →
   - `it('defines the Case-File color namespace')` — asserts `--color-ink-900`, `--color-gold`, `--color-cyan`, `--color-carolina` present.
   - `it('registers the mono font vars')` — `--font-stmono`, `--font-jbmono` present.
   - `it('defines the four keyframes')` — `scanSweep`, `blinkDot`, `glowPulse`, `flicker` present.
   - `it('pauses animations under prefers-reduced-motion')` — a `prefers-reduced-motion: reduce` block exists.

## Slice 2 Tests — Content model (EDIT existing)
**File:** `lib/content/__tests__/features.test.ts` · **Setup:** import `features`, `getAllFeatures`, `getFeatureBySlug`.
1. `describe('Case-File content fields')` →
   - `it('gives every non-draft feature a classLabel in the union')` — ∈ `{CORE,FIELD,TRUST,MARQUEE}`.
   - `it('marks exactly one feature MARQUEE (time-calibration)')`.
   - `it('keeps Notes flagged draft')` — `getFeatureBySlug('notes')?.draft === true`.
   - Existing placeholder-guard + order/adjacency tests remain green (regression).

## Slice 3 Tests — Chrome scope (highest-risk)
**File:** `app/(default)/__tests__/chrome-scope.test.tsx` · **Setup:** render the `(default)` layout with a child; render a bare `/demo`-style tree (no `(default)` layout).
1. `describe('marketing chrome scope')` →
   - `it('renders header + manifest tab strip in the (default) layout')` — `getByRole('banner')`, tab-strip nav present.
   - `it('does NOT render marketing chrome for the demo route tree')` — a tree without `(default)` layout has no `banner`/tab-strip (guards the /demo regression).
   - `it('(default) layout is a server component')` — module source has no `'use client'` and no `aos` import (source read).

## Slice 4 Tests — Chrome components
**File:** `components/ui/__tests__/manifest-tab-strip.test.tsx` · **Setup:** mock `usePathname`; render with `createFeatures()` mapped to `{slug,navLabel,index}`.
1. `describe('ManifestTabStrip')` →
   - `it('renders one tab per feature in order')` — count + label order.
   - `it('marks the active route with aria-current=page')` — set `usePathname` to a feature href.
   - `it('applies MARQUEE styling only to item 06')`.
   - `it('links each tab to /features/<slug>')`.
**File:** `components/ui/__tests__/header.test.tsx` (EDIT) →
   - `it('renders the logo mark + wordmark')`; `it('renders the gold Join-the-beta CTA to /beta')`; `it('exposes a labelled main nav')` (a11y role).
**File:** `components/ui/__tests__/footer.test.tsx` →
   - `it('renders copyright + center links + on-device label')`; `it('no longer imports the template footer illustration')` (source assert).

## Slice 5 Tests — Marketing phone frame
**File:** `components/marketing/__tests__/phone-frame.test.tsx` · **Setup:** render with a child + `scale`.
1. `describe('MarketingPhoneFrame')` →
   - `it('renders the label chip')`; `it('renders children in the screen slot')`.
   - `it('applies the given scale transform')` — style contains `scale(0.62)`.
   - `it('does not import from @/features/demo')` — read the source file, assert no `features/demo` substring (bundle-isolation guard).

## Slice 6–9 Tests — Home sections
**Setup (all):** import `createFeatures()`; server components rendered via RTL (no store/mocks).
- **hero.test.tsx:** `it('renders the tagline H1')`; `it('renders both CTAs (→/beta, →/demo)')`; `it('renders the 3-cell cred strip')`.
- **chain-of-work.test.tsx:** `it('renders four steps')`; `it('anchors #how-it-works')`.
- **evidence-manifest.test.tsx:** `it('renders a row per feature')` (count === features.length); `it('flags the marquee row')`; `it('shows a DRAFT chip on Notes')`; `it('links rows to /features/<slug>')`; `it('renders no stray 0 for a derived index')`.
- **beta-cta.test.tsx:** `it('renders the gold panel with a BetaForm')`; `it('shows the microcopy line')`.

## Slice 10 Tests — Feature page (EDIT existing)
**File:** `components/__tests__/feature-page.test.tsx` · **Setup:** `createFeature()` variants.
1. `describe('FeaturePage (Case-File)')` →
   - `it('renders breadcrumb, class chip, H1, and intro')`.
   - `it('renders one tip card of the given variant')`.
   - `it('renders alternating framed-phone rows with rec labels')`.
   - `it('renders the under-the-hood figure when diagram present')`; `it('omits it for map')`.
   - `it('renders the DRAFT banner + hatched placeholders when draft')` (Notes).
   - `it('renders two trust cards for Security(10)')`; `it('renders the wide callout for Cases row 3')`.
   - `it('renders prev/next, with dashed edges at 01 and 10')`.
   - `it('renders the per-page beta strip → /beta')`.

## Slice 11 Tests — Beta schema + action
**File:** `lib/beta/__tests__/schema.test.ts` →
   - `it('accepts a valid email + consent:true + empty honeypot')`; `it('rejects a bad email')`; `it('rejects consent:false')`; `it('rejects a filled honeypot')`; `it('lowercases + trims the email')`.
**File:** `lib/beta/__tests__/submit-signup.test.ts` · **Setup:** build `FormData` in-test; no mocks (stub persist).
   - `it('returns {ok:true} for a valid email + consent + empty honeypot')`.
   - `it('returns {ok:false,error:"invalid"} on a bad email')`; `it('…when consent is unchecked')`; `it('…when the honeypot is filled')`.
   - `it('normalises the email (lowercase/trim) before persisting')` — assert via the stub's recorded value.
   - `it('treats a re-submit of the same email as success (no enumeration)')`.
   - *Deferred to the Firestore-swap PR:* `waitlist` doc-keyed `.set()` payload assert + `{ok:false,error:"server"}` rejection path (does not throw).

## Slice 12 Tests — Beta form + page
**File:** `components/beta/__tests__/beta-form.test.tsx` · **Setup:** RTL + `userEvent`; stub the action returning `{ok:true}`/`{ok:false}`.
   - `it('submits email + consent')`; `it('shows success on {ok:true}')`; `it('shows an error message on {ok:false}')`; `it('blocks submit until consent is checked')`; `it('keeps the honeypot visually hidden')`.
**File:** `app/(default)/beta/__tests__/beta-page.test.tsx` · **Setup:** override `siteConfig.testflightUrl`.
   - `it('renders Phase A intake when testflightUrl is null')`; `it('renders the Phase B TestFlight button when set')`; `it('renders WHAT HAPPENS NEXT (3 cards)')`.

## Slice 13 Tests — Privacy
**File:** `app/(default)/privacy/__tests__/privacy-page.test.tsx` →
   - `it('renders the network-ledger table with a NEVER cell per row')`; `it('renders the gold stays-home row')`; `it('renders a sticky TOC whose links match section ids')`; `it('renders the adapted-policy pending chip')`; `it('uses the configured contact email')`.

---

## Coverage Targets

| Layer | Target | Rationale |
|-------|--------|-----------|
| `lib/beta/*` (schema, action) | 90%+ | Validation + the only write path; highest ROI |
| `lib/content/*` | 90%+ | Content invariants back all pages (counted in coverage) |
| Chrome + section components | Behavioral | Roles, links, active state, variants — not styling |
| Beta form/page | Behavioral | Submit, success/error, phase swap |

## Quality Checklist
- [ ] Every slice has ≥1 test file (table above).
- [ ] Content/section tests use `createFeature()` factories, never inline literals.
- [ ] The action has success **and** invalid **and** Firestore-failure paths.
- [ ] Beta form tests assert user-visible behavior + consent gate, not internals.
- [ ] `firebase-admin` is mocked; no test hits the network or needs real credentials.
- [ ] The `/demo` chrome-scope regression test (Slice 3) is present.
- [ ] The phone-frame "no demo import" bundle-isolation test (Slice 5) is present.
- [ ] Tests are independent and isolated.
