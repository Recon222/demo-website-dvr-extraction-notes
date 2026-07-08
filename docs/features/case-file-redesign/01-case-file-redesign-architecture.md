# Case File — Marketing Site Redesign · Architecture & Design

**Feature:** Reskin + restructure the marketing/beta site into the "Case File" visual
system (deep-navy blueprint, technical mono labels, gold CTAs), and ship the live
two-phase beta email capture. The `/demo` interactive experience is **out of scope**.
**Siblings:** `02-case-file-redesign-implementation-plan.md` (the how) ·
`03-case-file-redesign-test-spec.md` (the proof).
**Design source of truth:** `Homepage and feature redesign/design_handoff_case_file_site/`
(`README.md` + `DVR Site Directions.dc.html`). Exact hex/spacing values live there; this
document defines *structure, boundaries, and contracts*, not the palette.
**Planning background:** `docs/planning/03-site-architecture-and-ia.md`,
`docs/planning/04-beta-and-email-capture.md`, `docs/planning/07-open-questions-and-decisions.md`.
**Status:** Draft v1.1.

---

## 1. Purpose

Make the marketing site look and behave like the same instrument as the product by
adopting the app's own "Case File" visual language, and turn the beta page from a stub
into a working TestFlight recruitment funnel. Everything except `/demo` is replaced.

---

## 2. System Architecture

```
                         app/layout.tsx  (ROOT: <html>/<body>, next/font: Inter+Nacelle
                                           +Share Tech Mono+JetBrains Mono, global CSS)
                                   │  ← chrome REMOVED from here (was Header+FeatureNav)
              ┌────────────────────┴───────────────────────┐
              ▼                                             ▼
   app/(default)/layout.tsx  (marketing group)      app/demo/page.tsx  (UNTOUCHED)
   ├─ UtilityStrip     (server)                     └─ dynamic(ssr:false) → features/demo
   ├─ Header + LogoMark(server)                        (mapbox/pdfjs/motion live ONLY here)
   ├─ ManifestTabStrip (client · usePathname)  ◀── the ONLY chrome client island
   ├─ {children}
   └─ Footer          (server)

   ── Marketing pages (all Server Components, static SSG) ───────────────────────
   app/(default)/page.tsx ──────────► components/home/*  (Hero, ChainOfWork,
        │  getAllFeatures()                EvidenceManifest, RoadmapTease, BetaCta)
        │
   app/(default)/features/[slug]/page.tsx ─► components/feature-page.tsx
        │  generateStaticParams()             (breadcrumb·tip·rows·under-the-hood·
        │  getFeatureBySlug()                  prev/next·beta-strip)
        │
        └──────── lib/content/features.ts  (extended Feature[] — the content contract)

   ── Client leaves (isolated 'use client' islands) ────────────────────────────
   components/marketing/phone-frame.tsx (SERVER shell) ─► <AppDemo> (client <video>)
   components/beta/beta-form.tsx (client form) ─► Server Action ─► Firestore `waitlist`

   Hosting: Vercel. The phone-app keeps case data on-device; this SITE stores exactly
   one thing — a beta email + consent — in Firestore, written server-side (Admin SDK).
```

**Boundary rule (load-bearing):** no marketing file may import from `@/features/demo`.
That barrel pulls `mapbox-gl`, `pdfjs-dist`, `@mapbox/search-js-core`, and `motion` into
whatever bundles it — see Design Decisions and §11.

---

## 3. Design Decisions

| Decision | Choice | Rationale (and rejected alternative) |
|----------|--------|--------------------------------------|
| Where chrome lives | **Relocate Header/tab-strip/Footer out of `app/layout.tsx` into `app/(default)/layout.tsx`** | The design says `/demo` keeps its own chrome, but root layout currently renders `Header`+`FeatureNav` on *every* route including `/demo`. Moving chrome into the `(default)` group excludes `/demo` structurally. *Rejected:* per-page conditionals on `pathname` — fragile, and impossible in a server root layout. |
| Marketing phone shell | **New `components/marketing/phone-frame.tsx`, a Server Component reusing the demo's pixel constants at a fixed `scale` prop** | The demo's `PhoneFrame` is `'use client'`, driven by `usePhoneScale` (viewport-fit) + `PhoneOverlayContext`; the design needs a *fixed* `scale(0.78/0.62)`. Importing it also risks dragging demo-only heavy deps across the bundle boundary (`bundle-barrel-imports`, CRITICAL). *Rejected:* export `PhoneFrame` from the demo barrel — breaks the demo's "only `DemoExperience` is public" invariant and couples the two. |
| Media inside the phone | **Reuse existing `components/app-demo.tsx`** (looping muted `<video>` + `useReducedMotion` + poster fallback) as the client leaf | Already handles reduced-motion, missing-asset placeholder, and WebM/MP4. The phone frame stays a Server Component; only the video is client. *Rejected:* new video component — duplication. |
| Content model | **Extend `Feature`/`FeatureRow` additively (optional fields)** for class label, tip card, per-row kicker/chips/rec-label, beta-strip line | The catalog already IS the design's "manifest"; pages stay static SSG (`generateStaticParams`). Optional fields keep existing tests + the draft exemption intact. *Rejected:* a parallel design-content file — two sources of truth for one list. |
| Tab-strip active state | **Small `'use client'` `ManifestTabStrip` using `usePathname`**, fed only `{slug, navLabel}` | Only the active-route highlight needs the client; passing minimal props respects `server-serialization` (HIGH). *Rejected:* whole-catalog objects to the client — needless serialization. |
| Technical fonts | **`next/font/google` for Share Tech Mono + JetBrains Mono**, exposed as CSS vars in root layout | Matches existing Inter/Nacelle wiring; self-hosted, zero layout shift, hoisted once (`server-hoist-static-io`). *Rejected:* the demo's CSS `@import` of Google Fonts — render-blocking, not deduped. |
| Design tokens | **Add a `--color-*`/keyframe namespace to `@theme` in `app/css/style.css`**; consume via Tailwind arbitrary values | CSS-first config is the repo convention (no `tailwind.config.js`). Keyframes (`scanSweep`,`blinkDot`,`glowPulse`,`flicker`) go global here, not scoped like `demo.css`. *Rejected:* import `demo.css` — it's scoped to `[data-demo-root]` and marked "do not restyle". |
| Scroll animation | **Remove AOS** | The design "reads fine static"; AOS is the only reason `(default)/layout.tsx` is a client component and it's a deferred third-party script (`bundle-defer-third-party`). Dropping it removes a client boundary and a dependency. *Rejected:* keep AOS — carries cost for animation the design doesn't need. |
| Beta backend | **Next.js Server Action → Firestore `waitlist` (`firebase-admin`), Zod-validated, honeypot-gated, email-keyed docs** | Confirmed stack (doc 04 / doc 07 #15): Vercel host + Firestore via Admin SDK. Server Actions are the App-Router-native form path; email-as-doc-id gives free dedupe + no enumeration. *Rejected:* client-side Firebase SDK — ships credentials + open write rules + web-SDK weight to every visitor; a hand-rolled `/api` route — more surface for the same job. |
| Beta phase switch | **`siteConfig.testflightUrl: string \| null`** — `null` = Phase A intake, set = Phase B TestFlight | One flag, one page that swaps; flipping A→B is a content/flag change, not a rebuild (doc 04). *Rejected:* two routes — duplicate chrome + copy. |
| Marketing module home | **`components/*` (not `features/*`)** | The repo puts marketing in `components/`, `components/home/`, `lib/content/`; only `/demo` uses the `features/` slice shape. Beta capture (the one piece with logic) gets `lib/beta/` + a co-located action. *Rejected:* force a `features/marketing/` slice — fights the established layout. |

---

## 4. Data Flow

**Marketing pages (static, build-time):**
```
1. Build: generateStaticParams() enumerates feature slugs → one static page each.
2. Server render: page reads getAllFeatures()/getFeatureBySlug() from features.ts.
3. Sections render server-side; the phone frame renders server markup with an
   <AppDemo> client leaf (video) and the ManifestTabStrip client leaf (active tab).
4. No client fetching, no store, no revalidation — the catalog is the source of truth.
```

**Beta capture (the only dynamic flow):**
```
1. Visitor submits BetaForm (email + consent) → React form action calls the Server Action.
2. Server Action: Zod-parse → reject if honeypot filled or consent≠true; normalise email.
3. Firestore .set() on waitlist/{normalisedEmail} (email, createdAt, source, userAgent,
   consent) via firebase-admin (server-only credentials from Vercel env). Re-submit = same
   doc overwritten → idempotent, no duplicate rows, no enumeration signal.
4. Returns { ok: true } | { ok: false, error } → form shows inline success/error.
   Fire-and-forget log; never throw the raw error to the client.
```

---

## 5. Design Token Namespace (the visual "data contract")

Added to `@theme` in `app/css/style.css`. **Exact values: design handoff `README.md`
§Design Tokens (authoritative).** This document fixes the *namespace* and where each is consumed.

| Group | Token names (create in `@theme`) | Consumed by |
|-------|----------------------------------|-------------|
| Surfaces | `--color-ink-950`, `--color-ink-900`, `--color-panel-800`, `--color-chip` | page bg, tables, chips |
| Borders | `--color-hairline`, `--color-row-divider`, `--color-tab`, `--color-input` | dividers, tabs, inputs |
| Text | `--color-heading`, `--color-body`, `--color-body-2`, `--color-muted`, `--color-faint`, `--color-ghost` | copy scale |
| Accents | `--color-carolina`, `--color-blue`, `--color-cyan`, `--color-gold` | links, eyebrows, dots, CTAs |
| Fonts | `--font-stmono`, `--font-jbmono` (from `next/font`) | eyebrows/labels, numbers/stats |
| Keyframes | `scanSweep`, `blinkDot`, `glowPulse`, `flicker` (+ `--animate-*` vars) | phone sweep, status dots, halos, big numbers |

All motion gated by `prefers-reduced-motion` (existing `useReducedMotion`) / CSS `@media`.

---

## 6. Content Model Extension

Extend `lib/content/types.ts` — every new field **optional** so shipped/draft invariants hold.

```typescript
export type FeatureClass = 'CORE' | 'FIELD' | 'TRUST' | 'MARQUEE' // 'MARQUEE' = item 06 only

export interface FeatureTip {
  variant: 'gold' | 'cyan'
  body: string
}

export interface FeatureRow {
  heading: string
  body: string
  media?: string
  /** STM eyebrow shown above the row heading, e.g. "01 — READ". */
  kicker?: string
  /** Mono tag chips under the copy, e.g. ['OCR','NTP','OFFSET']. */
  chips?: readonly string[]
  /** "REC 0N — <LABEL>" chip on the framed phone. */
  recLabel?: string
}

export interface Feature {
  // ...existing fields unchanged...
  /** Class chip in the manifest + feature header. Values transcribed from the design canvas. */
  classLabel?: FeatureClass
  /** The one tip card per feature page. */
  tip?: FeatureTip
  /** Nacelle line for the per-page beta strip. */
  betaStripLine?: string
}
```

- Manifest table columns `NO. / ITEM / WHAT IT KILLS / CLASS` map to
  `index+1` (derived) / `title` / `painLine` / `classLabel`. No new "kills" field — reuse `painLine`.
- `FIG. NN-A` label is derived from index; caption reuses `diagram.caption`.
- Marquee styling keys off `classLabel === 'MARQUEE'`; draft chip keys off existing `draft`.

---

## 7. Beta Capture Contract

```typescript
// lib/beta/schema.ts
export const betaSignupSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  consent: z.literal(true),          // consent checkbox must be checked
  website: z.literal('').optional(), // honeypot — must be empty
})
export type BetaSignupInput = z.infer<typeof betaSignupSchema>

// lib/beta/submit-signup.ts  ('use server')
export type BetaResult = { ok: true } | { ok: false; error: 'invalid' | 'rate_limited' | 'server' }
export async function submitBetaSignup(_prev: BetaResult | null, form: FormData): Promise<BetaResult>
```

**Firestore document** — `waitlist/{normalisedEmail}` (email-keyed for free dedupe), via `.set()`:
`{ email: string, createdAt: Timestamp, source: 'beta' | 'home', consent: true, userAgent?: string }`.

**Env (Vercel, server-only):** `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`.
**Public:** `NEXT_PUBLIC_TESTFLIGHT_URL` (optional) → `siteConfig.testflightUrl`.

**Phasing:** the redesign PR ships `submitBetaSignup` with the full contract above but a **stub
persist** (validate → log → success). The Firestore `waitlist` write is a small follow-up PR once
the Firebase project + service account are handed over (Q-BETA-3). No `firebase-admin` dependency
until then — the `BetaResult` contract and the form are final now, so the swap touches one file.

**Spam defences (per doc 04 — cheap, layered):**
- v1, no new infra: honeypot `website` field + Zod email validation + `consent` literal + optional disposable-domain block.
- Recommended fast-follow: basic per-IP rate limit — needs a KV store (Vercel KV / Upstash); deferred until a store is provisioned (see §13 Q-BETA-2). CAPTCHA skipped for v1 unless abused.

**Out of v1:** confirmation email (Resend / Firebase "Trigger Email" later) — silent capture + on-screen success is enough for launch (doc 04, doc 07 #16).

---

## 8. Error Handling Strategy

- **Form validation:** Zod at the server boundary; the form maps `error` codes to inline messages, never throws.
- **Duplicate email:** `.set()` on the email-keyed doc overwrites in place → treated as success (idempotent); no enumeration.
- **Firestore/network failure:** caught → `{ ok:false, error:'server' }`; logged server-side; user sees a retry message. No data loss risk (single keyed write).
- **Missing media assets:** `AppDemo` already renders a labelled placeholder — pages ship "empty-but-correct" until videos/diagrams land.
- **Unknown feature slug:** existing `notFound()` path unchanged.

---

## 9. Security / Threat Model

1. **Bot spam →** honeypot `website` field + Zod `consent` literal + server email validation; per-IP throttle as a fast-follow (§7).
2. **Credential exposure →** Firebase Admin runs server-only in the Action; no client SDK, no keys in the bundle; Firestore has **no public write rules** (all writes server-side).
3. **PII scope →** the site stores only an email + consent + timestamp; privacy copy already discloses this. No case data, ever.
4. **Email enumeration →** email-keyed `.set()` returns generic success whether new or existing; no "already registered" signal.
5. **Acceptable risk (this phase):** no CAPTCHA / no rate-limit backend at launch; honeypot + consent + validation is sufficient for a low-volume conference beta. Add throttling if abuse appears (Q-BETA-2).

---

## 10. Migration / Rollout Plan

- **Non-negotiable prerequisite:** the chrome relocation (Decision §3) lands first; it's the only change that touches `/demo`'s render tree (by *removing* chrome from its ancestor). Verify `/demo` renders with **no** marketing chrome after.
- **Additive content model:** optional fields → existing feature pages keep rendering through every slice; no big-bang cutover.
- **Section-by-section swap:** home sections replace their template predecessors one slice at a time behind the same routes.
- **AOS removal:** delete `aos` usage + dep; convert `(default)/layout.tsx` to a Server Component.
- **Stale metadata fix:** root layout `metadata` ("Create Next App") → real `siteConfig` metadata.
- **Rollback:** each slice is one commit with a green Gate; revert is per-slice.
- **Stale docs:** update root `CLAUDE.md` (still says "unmodified marketing template").

---

## 11. Performance Model (Vercel rules applied)

| Rule | Application here |
|------|------------------|
| `bundle-barrel-imports` (CRITICAL) | No marketing import from `@/features/demo`; keeps mapbox/pdfjs/motion out of marketing bundles. If any dialog lib is added, use `optimizePackageImports`. |
| `server-serialization` (HIGH) | `ManifestTabStrip` / `BetaForm` receive minimal primitive props, not `Feature` objects. |
| `server-hoist-static-io` | Fonts via `next/font` in root layout (hoisted); inline-SVG logo mark is static. |
| `bundle-dynamic-imports` | Applied only to `/demo` (already `dynamic ssr:false`); **not** to `AppDemo` (tiny, LCP-adjacent — keep server markup + client `<video>` leaf). |
| `rendering-hoist-jsx` | Blueprint grid, corner brackets, status-bar/logo SVGs hoisted to module scope (mirror demo `PhoneFrame`'s module-level `grid` const). |
| `rendering-conditional-render` | Keep the repo's `? … : null` convention; matters in the manifest table (numeric index). |
| `rendering-content-visibility` | `content-visibility:auto` on off-screen feature rows + manifest rows. |
| `async-*` | Only surface = the beta Action; validate at boundary, single Firestore write. |

---

## 12. Out of Scope

- The `/demo` interactive experience (`features/demo/`, `app/demo/`) — untouched. Retiring the scripted walkthrough is a **separate future task**.
- Real media assets (phone recordings, "under the hood" diagrams) — produced separately; placeholders until then.
- Mobile-optimized layouts — desktop-first per owner; a simple stacked fallback only.
- Confirmation email, per-IP rate limiting, custom domain, final copy/legal sign-off (see Open Questions).

---

## 13. Open Questions

| ID | Question | Status / Resolve in |
|----|----------|---------------------|
| Q-BETA-1 | Beta stack | **RESOLVED** — Vercel host + Firestore via Admin SDK, `waitlist` collection, email-keyed docs (doc 04 / doc 07 #15). |
| Q-BETA-2 | Per-IP rate limiting at launch? Needs a KV store | Deferred fast-follow unless abuse (doc 04) |
| Q-BETA-3 | Which Firebase project — existing or fresh? + service-account creds | Owner (doc 07 #17); Firebase MCP disabled this session — wire env when handed over |
| Q-BETA-4 | Confirmation email in v1? | Default **no** (doc 07 #16) |
| Q-CONTENT-1 | Per-feature `classLabel` values | **RESOLVED** — transcribed from the canvas: 01 FIELD · 02 CORE · 03 CORE · 04 FIELD · 05 FIELD · 06 **MARQUEE** · 07 FIELD · 08 CORE · 09 FIELD · 10 TRUST |
| Q-COPY-1 | Sign-off on claimed stats (15 yrs / 1,500+ / 10→<5), Notes(03) draft, Reports(08) provisional | Pre-launch (owner) |
| Q-CONTACT | Canonical public contact email (`siteConfig.contactEmail` empty; privacy hardcodes another) | Slice 13 |
| Q-DOMAIN | Real `siteConfig.url` / custom domain | Pre-launch (doc 04, doc 07) |

---

## 14. Dependencies

| Package | Purpose | New? |
|---------|---------|------|
| `zod` | Server-boundary validation of the beta form | **New** |
| `firebase-admin` | Server-side Firestore write for beta signups | **Follow-up PR** — not installed by the redesign PR (action stubbed until the swap) |
| `next/font/google` | Share Tech Mono + JetBrains Mono | Built-in |

`motion`, `mapbox-gl`, `pdfjs-dist` remain **demo-only** — not added to marketing.

---

## 15. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-07-07 | Initial architecture |
| 1.1 | 2026-07-07 | Beta stack confirmed (Vercel + Firestore `waitlist`, email-keyed dedupe, spam defences, confirmation email out of v1) per docs/planning/04 + 07 |
| 1.2 | 2026-07-07 | Q-CONTENT-1 resolved (class labels transcribed from canvas); beta re-phased stub-first — `firebase-admin` deferred to the Firestore-swap follow-up PR |
