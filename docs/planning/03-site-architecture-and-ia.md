# 03 · Site Architecture & Information Architecture

## Sitemap (proposed)

```
/                      Home — walkthrough video + narrative sections + feature grid + beta CTA
/features/             (index — optional; the homepage grid may be enough)
  /features/time-calibration     ⭐ the NTP receipt (marquee)
  /features/import               ⭐ AI request autofill
  /features/reports              ⭐ auto-notes + PDF
  /features/evidence-capture     media bound to location
  /features/map                  case map + one-tap contacts
  /features/camera-gps           GPS-mark cameras
  /features/secure-export        encrypted ZIP packaging
  /features/on-device            privacy & control (trust)
/beta                  Email capture now → TestFlight Join link when live
/privacy               Privacy policy (adapt app repo's PRIVACY-POLICY.md)
```

Notes:
- Each feature page is the same template (see "Per-feature page template" below), differing only
  in content + media. Build the component once, feed it data.
- `/features/<slug>` keeps URLs clean and lets the top nav + homepage cards deep-link. Implement as
  one folder per page (simple) or a single `[slug]` dynamic route fed by a content array
  (DRYer — recommended once the feature list is locked).

> **DECISION NEEDED (doc 07):** confirm slug list & whether feature pages are individual files or a
> single data-driven `[slug]` route.

## Navigation

- **Top nav (reuse template `Header`):** Logo · Features (dropdown or anchor to grid) ·
  How it works (anchors to walkthrough) · **Join the beta** (primary CTA button).
  Remove the template's "Sign In / Register" links — there are no accounts.
- **Footer (reuse template `Footer`, heavily stripped):** Logo · short blurb · Privacy · Contact
  (email) · "Join the beta" · maybe a single social link. Delete the template's ~25 dummy links
  (Product/Company/Resources/Content Library columns).

## Home page composition

Top-to-bottom, reusing template sections where possible:

1. **Hero + walkthrough video** — reuse `hero-home.tsx` + `modal-video.tsx`. Replace headline/sub
   with the chosen one-liner (doc 01); swap the demo video. *This is the centerpiece Kris asked
   for.* Consider an inline autoplay-muted teaser loop with a click-to-open full walkthrough modal.
2. **The arc / how it works** — reuse `workflows.tsx` (3 spotlight cards) as the 6-step arc
   condensed to 3–4 cards (Import → Calibrate → Capture → Hand off), each linking to its feature page.
3. **Feature grid** — reuse `features.tsx` (6-icon grid) as the entry point to all feature pages.
   Swap icons/labels/copy; make each card a link.
4. **Credibility band** — *replace* `testimonials.tsx` content. Pre-beta we have no testimonials;
   use this slot for the "15 years / 1,500+ extractions / 10→5 min" story, or pain-points-solved.
   (Keep the masonry/visual treatment if useful; cut the category-filter tab UI.)
5. **Beta CTA band** — reuse `cta.tsx`, repointed to `/beta` (or an inline email field).

## Per-feature page template (build once)

```
┌ Hero: feature name + one-line pain statement ───────────────┐
│ "DVR clocks are always wrong. Proving yours wasn't is the   │
│  question that ends people on the stand."                   │
├─ Row: [ high-res screen-capture loop ] | [ Pain → Fix copy ]┤   ← alternate side per row
├─ (optional 2nd row, reversed)                               │
├─ "Under the hood" → Gemini data-flow diagram + plain expl.  │
├─ Prev / Next feature  ·  Join the beta CTA                  │
└─────────────────────────────────────────────────────────────┘
```

A single `FeaturePage` component takes: `title`, `painLine`, `rows[] { mediaSrc, heading, body }`,
`diagram { src, caption }`, `prev/next`. Content lives in a typed array (see doc 02 for the data).

## Template reuse / prune verdicts

| Template asset | Verdict | Action |
|----------------|---------|--------|
| `app/layout.tsx` (root, fonts, global Header) | **Keep** | Update `metadata` (title/description/OG). Retheme body bg to app navy. |
| `app/(default)/layout.tsx` (AOS + Footer) | **Keep** | Keep AOS motion; keep Footer (stripped). |
| `app/(default)/page.tsx` | **Rework** | Recompose sections per "Home page composition." |
| `components/hero-home.tsx` | **Keep & rewrite** | Core walkthrough hero. New copy + video. |
| `components/modal-video.tsx` | **Keep** | Walkthrough player. Already supports self-hosted mp4. |
| `components/workflows.tsx` (spotlight cards) | **Keep & rewrite** | Becomes the "how it works" arc, cards link to features. |
| `components/features.tsx` (6-icon grid) | **Keep & rewrite** | Becomes the feature grid / nav into pages. |
| `components/testimonials.tsx` | **Repurpose or cut** | No testimonials pre-beta. Reuse slot for credibility/pain-points; cut filter tabs. |
| `components/cta.tsx` | **Keep & rewrite** | Beta CTA band → `/beta`. |
| `components/spotlight.tsx`, `utils/useMousePosition`, `utils/useMasonry` | **Keep** | Design utilities; reuse as-is. |
| `components/page-illustration.tsx` + blurred-shape SVGs | **Keep** | Background flavour; possibly recolour. |
| `components/ui/header.tsx` | **Keep & edit** | Replace Sign In/Register with Features + Join beta. |
| `components/ui/footer.tsx` | **Keep & strip** | Remove dummy link columns; minimal footer. |
| `components/ui/logo.tsx` | **Replace** | Use the app's logo/wordmark. |
| `app/(auth)/*` (signin/signup/reset) | **Delete** | No accounts. Reuse the `(auth)` layout *pattern* if handy for `/beta`, else remove. |
| `app/api/hello/route.ts` | **Replace** | Becomes the beta-signup endpoint (or use a Server Action). |
| Template demo images (`testimonial-*`, `client-logo-*`, `workflow-*`, `features.png`, `hero-image-01.jpg`) | **Remove** | Replace with app screenshots / screen-capture posters. |
| Template `video.mp4` | **Replace** | Real walkthrough video. |
| Fonts: `Inter` + local `Nacelle` | **Keep, consider +ShareTechMono** | Add `ShareTechMono` for technical labels to echo the app's scanner UI (optional). |

## Design alignment with the app

The template is dark with an **indigo** accent and gradient headings — already 80% of the way to
the app's vibe. To make the site feel like the app:

- **Recolour the accent** from template indigo toward the app palette: navy base
  `#000314` / `#0d1b2a`, **Carolina-blue accent `#99badd`**, **gold highlight `#ffd93d`**. This is
  mostly editing Tailwind v4 `@theme` tokens + the gradient stops in `app/css/style.css` and the
  `from-indigo-* / to-indigo-*` utility usages.
- **Optional:** introduce `ShareTechMono` for monospace/technical captions (offsets, timestamps,
  the traceability chain) so the site speaks the app's "instrument readout" language.
- Keep the glass cards, gradient animated headings, spotlight hover, and AOS reveals — they read as
  premium and match the app's faux-glass aesthetic. Don't over-animate; respect reduced motion
  (doc 05).

> **DECISION NEEDED (doc 07):** lock the palette (full app palette vs keep indigo) and whether to
> add ShareTechMono. Low-risk either way; affects token edits only.

## Tech notes (stay App-Router-idiomatic)

- Feature/section components stay **server components**; only interactive bits (`modal-video`,
  `spotlight`, the beta form) are `"use client"`. (Matches template + repo `CLAUDE.md`.)
- Tailwind v4 config is CSS-first in `app/css/style.css` (`@theme`) — there is **no**
  `tailwind.config.js`. Recolouring = editing tokens there.
- Keep imports via the `@/*` alias.
- Images: prefer `next/image` with static imports for posters; `<video>` for loops (doc 05).
