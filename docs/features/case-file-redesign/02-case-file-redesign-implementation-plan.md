# Case File — Marketing Site Redesign · Implementation Plan

**Prerequisite:** Read [`01-case-file-redesign-architecture.md`](./01-case-file-redesign-architecture.md)
for the token namespace, extended content model, and beta contract. Tests are in
[`03-case-file-redesign-test-spec.md`](./03-case-file-redesign-test-spec.md), **synced
slice-for-slice** with this plan.
**Method:** TDD, **one commit per slice** (large slices may split into 2). Each slice ends at a
**Gate** — its tests + full `pnpm test` + `tsc --noEmit` green — before commit. `/demo` is never touched.
**Design source of truth:** the handoff `README.md` + `.dc.html` (exact px/hex).

### Architecture Decisions (resolved)

| Decision | Choice |
|----------|--------|
| Chrome location | `app/(default)/layout.tsx` (out of root; excludes `/demo`) |
| Phone shell | New Server Component `components/marketing/phone-frame.tsx` (fixed `scale`; no demo import) |
| Media leaf | Reuse `components/app-demo.tsx` |
| Content model | Additive optional fields on `Feature`/`FeatureRow` |
| Tab active state | `'use client'` `ManifestTabStrip` (`usePathname`), minimal props |
| Fonts | `next/font/google` (Share Tech Mono, JetBrains Mono) |
| Tokens/keyframes | `@theme` in `app/css/style.css` (global) |
| AOS | Removed |
| Beta | Vercel host + Firestore `waitlist` via `firebase-admin` Server Action; Zod + honeypot; email-keyed docs; phase via `siteConfig.testflightUrl`. **This PR ships the action stubbed** (validate → log → success); the Firestore swap is a follow-up PR |

### Tooling

| Tool | Version |
|------|---------|
| Next.js | 15.1.x (App Router) |
| React | 19.2.x |
| TypeScript | 5.7+ (strict) |
| Tailwind | v4 (CSS-first `@theme`) |
| Zustand | 5.x (demo only) |
| Vitest | 4.x + RTL + jsdom |
| zod | ^3 (**new**) |
| firebase-admin | ^12 (**follow-up PR** — not installed here) |

---

## Module Layout

```
app/layout.tsx                              # EDIT — add mono fonts; drop Header/FeatureNav; real metadata
app/(default)/layout.tsx                    # EDIT — Server Component; render chrome; remove AOS
app/(default)/page.tsx                      # EDIT — compose new home sections
app/(default)/beta/page.tsx                 # EDIT — two-phase page
app/(default)/privacy/page.tsx              # EDIT — network-ledger + sticky TOC
app/(default)/features/[slug]/page.tsx      # (unchanged — already SSG)
app/(default)/features/page.tsx             # EDIT — Case-File styling (reuse manifest/grid)
app/css/style.css                           # EDIT — @theme tokens + keyframes
lib/content/types.ts                        # EDIT — extend Feature/FeatureRow
lib/content/features.ts                     # EDIT — enrich data (class/tip/kicker/chips/rec/beta line)
lib/site-config.ts                          # EDIT — testflightUrl, real metadata fields
lib/beta/
├── schema.ts                # NEW — zod betaSignupSchema
└── submit-signup.ts         # NEW — 'use server' action (stub persist → Firestore in follow-up PR)
                             # (lib/beta/firebase.ts + firebase-admin arrive in the swap PR, not here)
components/ui/
├── utility-strip.tsx        # NEW — top status strip (server)
├── header.tsx               # EDIT — Case-File header (server)
├── logo.tsx                 # EDIT — inline-SVG crosshair+gold-dot logo mark
├── manifest-tab-strip.tsx   # NEW — replaces feature-nav.tsx (client · usePathname)
├── feature-nav.tsx          # DELETE (replaced)
└── footer.tsx               # EDIT — Case-File footer (server)
components/marketing/
├── phone-frame.tsx          # NEW — device shell (server), fixed scale, brackets+label
└── corner-brackets.tsx      # NEW — static bracket framing (hoisted)
components/home/
├── hero.tsx                 # NEW — split hero + cred strip (replaces hero-home.tsx usage)
├── chain-of-work.tsx        # NEW — 4-step chain (replaces STEPS)
├── evidence-manifest.tsx    # NEW — manifest table (replaces FeatureGrid on home)
├── roadmap-tease.tsx        # NEW — sealed roadmap section
├── beta-cta.tsx             # NEW — gold beta panel (hosts BetaForm)
└── feature-grid.tsx         # (kept for /features index; restyled)
components/hero-home.tsx      # DELETE (replaced by home/hero.tsx)
components/feature-page.tsx   # EDIT — full Case-File template
components/feature/
├── tip-card.tsx             # NEW
├── feature-row.tsx          # NEW — framed phone ⇄ copy
├── prev-next.tsx            # NEW
└── beta-strip.tsx           # NEW
components/beta/
├── beta-form.tsx            # NEW — client form (useActionState)
└── beta-next-steps.tsx      # NEW — WHAT HAPPENS NEXT (server)
.env.example                 # EDIT — FIREBASE_* + NEXT_PUBLIC_TESTFLIGHT_URL
CLAUDE.md                    # EDIT — de-stale the "unmodified template" note
```

---

## Milestone A — Design Foundation

**Observable result:** Tokens, mono fonts, and keyframes exist; the content model carries
Case-File fields; the site still renders (template look) and all tests are green.

### Slice 1 — Tokens + mono fonts + keyframes

**Goal:** The Case-File token namespace and technical fonts are available app-wide.

- `app/layout.tsx`: add `Share_Tech_Mono` + `JetBrains_Mono` via `next/font/google`
  (`variable: '--font-stmono' | '--font-jbmono'`, `display:'swap'`; Share Tech Mono `weight:'400'`);
  append their `.variable` to `<body>`. Fix `metadata` to `{ title: siteConfig.name, description: siteConfig.description }`.
- `app/css/style.css` `@theme`: add `--color-*` (per README), `--font-stmono/jbmono`, and
  `@keyframes scanSweep|blinkDot|glowPulse|flicker` + `--animate-*` vars. Add a `@media
  (prefers-reduced-motion: reduce)` rule pausing the four animations.
- **Do not** import `features/demo/ui/demo.css`.

**Gate:** `pnpm build` compiles CSS; the token smoke test (§Test Slice 1) asserts the vars/keyframes exist. **Commit:** `feat(site): Case-File design tokens + Share Tech/JetBrains Mono + keyframes`.

### Slice 2 — Content model extension

**Goal:** `Feature`/`FeatureRow` carry class/tip/kicker/chips/rec-label/beta-line; data enriched.

- `lib/content/types.ts`: add `FeatureClass`, `FeatureTip`, optional `classLabel`, `tip`,
  `betaStripLine` on `Feature`; optional `kicker`, `chips`, `recLabel` on `FeatureRow`.
- `lib/content/features.ts`: populate the new fields per artboards. `classLabel` values
  (transcribed from the canvas — Q-CONTENT-1 resolved): 01 `cases-locations` FIELD ·
  02 `import` CORE · 03 `notes` CORE · 04 `location` FIELD · 05 `map` FIELD ·
  06 `time-calibration` **MARQUEE** · 07 `evidence-capture` FIELD · 08 `reports` CORE ·
  09 `secure-export` FIELD · 10 `on-device` TRUST. Notes(03) stays `draft`.
- `lib/content/__tests__/features.test.ts`: extend guard — every **non-draft** feature has a
  `classLabel`; `classLabel` ∈ the union; exactly one `'MARQUEE'`.

**Gate:** feature-content tests green; `tsc`. **Commit:** `feat(content): extend Feature model with Case-File class/tip/row metadata`.

---

## Milestone B — Chrome & Layout Refactor  *(touches `/demo`'s ancestor — highest risk)*

**Observable result:** Marketing pages show the new utility strip + header + manifest tab
strip + footer; `/demo` shows **none** of it.

### Slice 3 — Relocate chrome; drop AOS; Server-Component layout

**Goal:** Chrome renders from `(default)` only; `/demo` is chrome-free; AOS gone.

- `app/layout.tsx`: **remove** `<Header/>` and `<FeatureNav/>` (keep `<html>/<body>`/fonts).
- `app/(default)/layout.tsx`: convert to a **Server Component** (drop `'use client'`, `useEffect`,
  `AOS`); render `UtilityStrip`, `Header`, `ManifestTabStrip`, `{children}`, `Footer`.
- Remove `aos` import/CSS; remove `data-aos*` from `hero-home` (deleted next milestone anyway);
  uninstall `aos` + `@types/aos` from `package.json`.

**Integration placement:** the chrome moves from root into the group layout verbatim first
(still old components), so this slice is a pure *relocation* — the visual redesign of each chrome
piece happens in Slice 4. Keeps the risky `/demo`-affecting change isolated and reviewable.

**Gate:** the chrome-scope test asserts `/demo` route tree renders without `Header`/tab-strip;
marketing route renders with them; `tsc`; `pnpm build`. **Commit:** `refactor(site): move marketing chrome into (default) layout; remove AOS (fixes chrome on /demo)`.

### Slice 4 — Utility strip + header + manifest tab strip + footer

**Goal:** The four chrome pieces match the Case-File design.

- `components/ui/utility-strip.tsx` (server): left FVA label, right blinking cyan dot + recruiting label.
- `components/ui/logo.tsx`: inline-SVG crosshair square + gold dot (module-level static SVG).
- `components/ui/header.tsx` (server): logo mark + wordmark + nav (`siteConfig.nav`) + gold CTA.
- `components/ui/manifest-tab-strip.tsx` (`'use client'`): one tab per feature from
  `getAllFeatures()`, **mapped to `{slug, navLabel, index}` before render**; `usePathname`
  active state (gold). Replaces `feature-nav.tsx` (**delete** it + its test, port assertions).
- `components/ui/footer.tsx` (server): mini logo + copyright + center links + STM right label;
  delete the template footer illustration import.

```typescript
// components/ui/manifest-tab-strip.tsx
interface TabItem { slug: string; navLabel: string; index: number }  // minimal serialized shape
export function ManifestTabStrip({ items }: { items: readonly TabItem[] }): JSX.Element
```

**Gate:** header/tab-strip/footer tests green (active-tab, CTA target, a11y roles); `tsc`. **Commit:** `feat(site): Case-File utility strip, header, manifest tab strip, footer`.

---

## Milestone C — Marketing Phone Frame

**Observable result:** A bracketed iPhone shell renders an `<AppDemo>` loop at a given scale,
server-rendered, with the scan-sweep line.

### Slice 5 — `MarketingPhoneFrame` + corner brackets

**Goal:** Reusable phone shell for hero (`scale=0.78`) and rows (`scale=0.62`).

- `components/marketing/corner-brackets.tsx` (server): four hoisted 20×20 cyan-border divs + label chip.
- `components/marketing/phone-frame.tsx` (server): reuse the demo's pixel math (404 frame /
  378×786 screen / status bar / island / home indicator / scan-sweep) **copied as local
  constants**, fixed `transform: scale(scale)`; children fill the screen (`inset:0`, under
  status bar z20 / island z30). **No import from `@/features/demo`.**

```typescript
export interface MarketingPhoneFrameProps { scale: number; label: string; children: React.ReactNode }
export function MarketingPhoneFrame(props: MarketingPhoneFrameProps): JSX.Element
```

**Gate:** phone-frame test (renders label chip + child; source contains no `features/demo` import); `tsc`. **Commit:** `feat(marketing): server-rendered phone frame + corner brackets (AppDemo inside)`.

---

## Milestone D — Home Page

**Observable result:** `/` shows hero + chain-of-work + evidence manifest + roadmap tease + beta CTA.

### Slice 6 — Hero
**Goal:** Split hero: eyebrow chip, H1, sub, CTA row, 3-cell cred strip, phone (`scale=0.78`).
- `components/home/hero.tsx` (server) using `MarketingPhoneFrame` + `AppDemo`. **Delete** `components/hero-home.tsx` and its usage.
**Gate:** hero test (renders H1 from `siteConfig.tagline`; both CTAs → `/beta` & `/demo`; cred strip cells). **Commit:** `feat(home): Case-File split hero + cred strip`.

### Slice 7 — Chain of work
**Goal:** 4-column `#how-it-works` with halo dots + step tags (replaces the 3-card STEPS block).
- `components/home/chain-of-work.tsx` (server).
**Gate:** section test (4 steps, correct anchor id). **Commit:** `feat(home): chain-of-work section`.

### Slice 8 — Evidence manifest table
**Goal:** `#features` renders the 10-row manifest table (replaces `FeatureGrid` on home).
- `components/home/evidence-manifest.tsx` (server): grid rows from `getAllFeatures()`; index /
  title / painLine / class chip; marquee + draft variants; each row links to `/features/{slug}`.
**Gate:** manifest test (row per feature, marquee row flagged, draft chip on Notes, links resolve). **Commit:** `feat(home): evidence manifest table`.

### Slice 9 — Roadmap tease + Beta CTA + page assembly
**Goal:** `/` composed end-to-end in Case-File order.
- `components/home/roadmap-tease.tsx` (server), `components/home/beta-cta.tsx` (server shell that
  renders the client `BetaForm` from Milestone F — until then, a static input placeholder).
- `app/(default)/page.tsx`: compose Hero → ChainOfWork → EvidenceManifest → RoadmapTease → BetaCta.
**Gate:** home page test (section order, single H1). **Commit:** `feat(home): roadmap tease + beta CTA + assembled home page`.

---

## Milestone E — Feature Pages

**Observable result:** `/features/[slug]` renders the full Case-File template incl. special states.

### Slice 10 — Feature page template + special cases
**Goal:** Breadcrumb, tip card, alternating framed-phone rows, under-the-hood, prev/next, beta strip.
- `components/feature/tip-card.tsx`, `feature-row.tsx`, `prev-next.tsx`, `beta-strip.tsx` (server).
- `components/feature-page.tsx`: rewrite to compose them from the extended `Feature`.
  Special cases: `draft` → gold DRAFT banner + hatched placeholders (Notes 03); `map` → no
  under-the-hood; Cases(01) row-3 → wide callout (no media); Security(10) → two trust cards.
- Rows use `MarketingPhoneFrame scale={0.62}` + `AppDemo`.
**Gate:** feature-page tests (each variant from fixture features; prev/next edges; draft banner). **Commit:** `feat(features): Case-File feature-page template + draft/map/trust variants`.

---

## Milestone F — Beta Capture  *(action stubbed — the Firestore write is a follow-up PR)*

**Observable result:** Submitting the beta form validates and returns success/error states end-to-end
(stub persist); the page swaps Phase A/B. The Firestore `waitlist` write lands in a follow-up PR.

### Slice 11 — Schema + Server Action (stubbed, frontend-only)
**Goal:** The final action contract with a stub persist — no backend dependency in this PR.
- `lib/beta/schema.ts` (zod `betaSignupSchema`).
- `lib/beta/submit-signup.ts` (`'use server'`): parse → honeypot/consent check → normalise email →
  **stub persist** (server-side `console.info('[beta] signup', email)` behind a
  `// TODO(follow-up PR): Firestore waitlist .set() — see 01-architecture §7 Phasing` marker) →
  typed `BetaResult`; invalid input → `{ ok:false, error:'invalid' }`.
- `lib/site-config.ts`: add `testflightUrl: process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? null`.
- `.env.example`: add `NEXT_PUBLIC_TESTFLIGHT_URL`; document `FIREBASE_*` as reserved for the follow-up.
- **NOT in this PR:** `lib/beta/firebase.ts`, the `firebase-admin` dep, credentials — they arrive in
  the Firestore-swap PR (needs project + service account, Q-BETA-3). The `BetaResult` contract and
  the form are final now, so the swap touches exactly one file.

```typescript
export async function submitBetaSignup(prev: BetaResult | null, form: FormData): Promise<BetaResult>
```

**Gate:** schema + action tests green (stub contract — no mocks needed); `tsc`. **Commit:** `feat(beta): zod schema + stubbed submitBetaSignup server action (Firestore swap = follow-up PR)`.

### Slice 12 — Beta form + two-phase page
**Goal:** Working intake (Phase A) and TestFlight (Phase B) UI.
- `components/beta/beta-form.tsx` (`'use client'`, `useActionState(submitBetaSignup, null)`) —
  email + consent + visually-hidden honeypot; inline success/error from `BetaResult`.
- `components/beta/beta-next-steps.tsx` (server) — WHAT HAPPENS NEXT (3 cards).
- `app/(default)/beta/page.tsx`: swap on `siteConfig.testflightUrl` (null → Phase A intake+form;
  set → Phase B TestFlight button + secondary form). Wire `BetaForm` into home `beta-cta.tsx` too.
**Gate:** form tests (submits, success on `{ok:true}`, error on `{ok:false}`, consent gate, hidden honeypot); page phase-swap test. **Commit:** `feat(beta): two-phase beta page + working email capture form`.

---

## Milestone G — Privacy

**Observable result:** Privacy page shows the network-ledger table + sticky TOC in Case-File style.

### Slice 13 — Privacy rewrite
**Goal:** Case-File privacy with ledger table and section TOC.
- `app/(default)/privacy/page.tsx`: header + `ADAPTED…PENDING` chip; network-ledger table
  (What/When/Contains/Case data? → NEVER rows + gold "stays home" row); sticky left TOC + sections
  01–06. Resolve `contactEmail` [Q-CONTACT] via `siteConfig`.
**Gate:** privacy test (ledger rows render, every "NEVER" cell present, TOC links match section ids). **Commit:** `feat(privacy): Case-File network-ledger + sticky TOC`.

---

## Integration Discipline

- **Chrome (Slice 3)** is the only change to `/demo`'s ancestor — flagged, isolated, its own commit.
- **`BetaForm`** is imported by both `beta/page.tsx` and `home/beta-cta.tsx` (single form component).
- **`AppDemo`** is the only client leaf inside `MarketingPhoneFrame`.
- **Env vars:** `NEXT_PUBLIC_TESTFLIGHT_URL` documented in `.env.example` (Slice 11); `FIREBASE_*`
  creds are only needed for the follow-up Firestore-swap PR (Q-BETA-3) — nothing external blocks this PR.

---

## Appendix A — File Manifest (new files)

| File | Slice | Purpose |
|------|-------|---------|
| `app/css` tokens (in `style.css`) | 1 | Token namespace + keyframes |
| `lib/beta/schema.ts` | 11 | Zod validation |
| `lib/beta/submit-signup.ts` | 11 | Server Action (stub persist; Firestore in follow-up PR) |
| `lib/beta/firebase.ts` | *follow-up PR* | Admin/Firestore singleton (**not in this PR**) |
| `components/ui/utility-strip.tsx` | 4 | Top status strip |
| `components/ui/manifest-tab-strip.tsx` | 4 | Feature tab strip (client) |
| `components/marketing/phone-frame.tsx` | 5 | Device shell (server) |
| `components/marketing/corner-brackets.tsx` | 5 | Bracket framing |
| `components/home/hero.tsx` | 6 | Split hero |
| `components/home/chain-of-work.tsx` | 7 | Chain section |
| `components/home/evidence-manifest.tsx` | 8 | Manifest table |
| `components/home/roadmap-tease.tsx` | 9 | Roadmap section |
| `components/home/beta-cta.tsx` | 9 | Beta panel |
| `components/feature/{tip-card,feature-row,prev-next,beta-strip}.tsx` | 10 | Feature page parts |
| `components/beta/{beta-form,beta-next-steps}.tsx` | 12 | Beta UI |

## Appendix B — Modified / Deleted Existing Files (high-risk tracker)

| File | Slice | Change |
|------|-------|--------|
| `app/layout.tsx` | 1,3 | Add mono fonts + real metadata; **remove** Header/FeatureNav |
| `app/(default)/layout.tsx` | 3 | → Server Component; render chrome; **remove AOS** |
| `app/(default)/page.tsx` | 9 | Compose new sections |
| `app/(default)/beta/page.tsx` | 12 | Two-phase page |
| `app/(default)/privacy/page.tsx` | 13 | Ledger + TOC rewrite |
| `app/(default)/features/page.tsx` | 8/10 | Restyle index |
| `lib/content/types.ts` | 2 | Extend types |
| `lib/content/features.ts` | 2 | Enrich data |
| `lib/site-config.ts` | 11 | `testflightUrl` + metadata |
| `components/feature-page.tsx` | 10 | Full rewrite |
| `components/ui/{header,logo,footer}.tsx` | 4 | Case-File rewrite |
| `components/hero-home.tsx` | 6 | **DELETE** |
| `components/ui/feature-nav.tsx` | 4 | **DELETE** (→ manifest-tab-strip) |
| `package.json` | 3,11 | −aos/@types/aos; +zod (`firebase-admin` in the follow-up swap PR) |
| `.env.example` | 11 | FIREBASE_* + TESTFLIGHT_URL |
| `CLAUDE.md` | 1 | De-stale template note |
