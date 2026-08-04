# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: forensic video technicians, CCTV recovery officers, and digital-evidence
analysts** — the people who physically attend a scene, sit down in front of a DVR, and
recover the footage. They feel the pain the app removes, and every surface on this site is
written to them, practitioner-to-practitioner.

Secondary and never leading: supervisors and unit decision-makers who would authorise a
rollout. They may read the site; they are not who it is aimed at. (Owner-confirmed
2026-08-04, ratifying the standing default in `docs/planning/01-product-and-positioning.md`.)

## Product Purpose

This repository is the **marketing and beta-recruitment site** for *DVR Extraction Notes*,
a CCTV/DVR evidence-recovery documentation app by FVA Development. The site has two halves
that serve one goal — get a working analyst to understand the product in about a minute and
join the beta:

- **Marketing pages** — the feature catalog, the chain-of-work narrative, the privacy
  ledger, and the beta intake.
- **An interactive demo at `/demo`** — a client-only, hands-on drive of the real app flows
  (create a case, import a real request PDF, calibrate time, generate notes). It boots
  empty; the visitor does the work rather than watching a tour.

Success is a practitioner who arrives cold, recognises their own job in the copy, and
leaves their email — or, once a build clears Apple's beta review, installs it.

## Positioning

**Practitioner-built, credibility-first.** Not "a startup made a forensics app" — an
analyst with 15 years and 1,500+ extractions got tired of every pain point and built the
fix. Every feature is framed as *"here's a thing that used to hurt; here's how it doesn't
anymore."*

Three claims a neighbouring product could not truthfully copy:

1. **Time-offset defensibility as a generated receipt.** OCR the DVR's on-screen clock,
   fire a region-specific NTP call to an atomic-clock-backed server *at the exact moment of
   capture*, and print the full traceability chain — cropped timestamp image, offset,
   uncertainty, RTT, server, method — into the report. This answers the question that
   actually comes up on the stand.
2. **On-device by construction.** Request documents are read by Apple's on-device
   intelligence; case data lives in an encrypted local database behind a biometric lock.
3. **The user owns their infrastructure.** See Capabilities below — there is no vendor
   cloud, no vendor account, and no vendor access.

## Operating Context

- One recovery job spans many addresses; each site has its own DVR, cameras, contacts, and
  media. The case is the container.
- Work happens standing on scene, often under time pressure, frequently double-parked —
  not at a desk.
- The job begins with a request document (a PDF or an email) and ends with a written
  report plus the media that backs it, handed to a requester.
- DVR clocks are almost always wrong. That is expected. What matters is proving *your own
  device's* time was right.
- Distribution is Apple TestFlight; seats are capped by Apple at 10,000.

## Capabilities and Constraints

**Shipping product (the iOS analyst app — the beta target):** case and location tree with
self-building on-disk folders; request import with on-device AI autofill; the notes wizard;
multi-sample accuracy-filtered GPS for sites and per-camera pins; the case map with
tap-to-call/email contacts; time calibration (Vision OCR + NTP with HTTP fallback); photo,
video, and audio capture filed automatically by location; generated case-notes and
time-offset PDFs; password-protected encrypted export with an optional Face ID gate.

**Desktop app — in development right now.** The intent is to ship the phone app as **beta**
and the desktop app as **alpha**. It is not built yet and must not be described as
available. Note that `components/home/roadmap-tease.tsx` currently files "Live desk view"
as a sealed roadmap item with no dates — which remains honest, but is now understated.

**Sync — bring-your-own Supabase, and this is a positioning asset, not a caveat.** The user
creates their *own* Supabase account and supplies a throwaway key; both the iOS app and the
desktop app can then create the database inside that account. FVA has no access to the
account, no access to the data, no auth layer, and no user records. **"No vendor cloud"
therefore remains true and correct** — opting into sync means opting into infrastructure the
user owns outright.

> **Marketing for the desktop app and BYO-Supabase sync is NOT yet designed and must not be
> invented.** The owner will collaborate on that messaging directly. Until then, no surface
> should announce, imply, or hedge about them beyond what is written here.

**Site constraints:** Next.js App Router + React 19 + Tailwind v4 (CSS-first config, no
`tailwind.config.js`). Marketing code must never import from `@/features/demo`. The demo is
client-only and degrades safely without its two optional keys (`/api/extract` model proxy,
`NEXT_PUBLIC_MAPBOX_TOKEN`).

**⛔ The forensic-restraint rule — binding.** Lead with utility everywhere. The courtroom
register is sanctioned *only* on the time-calibration surface, where it is the value. Never
invent forensic capability (tamper-evidence, hash chains, integrity guarantees) for
dramatic effect. Escalating into legal or admissibility claims anywhere else requires
asking the owner first. Restraint reads as confidence; overclaiming is both a credibility
risk with a savvy audience and a liability risk.

**Explicitly undecided — do not invent an answer:**

- Public contact email. The app's privacy policy lists `fvadd.dev@gmail.com`; the account on
  file is `kcfva.dev@gmail.com`; the design canvas shows a `contact@fva.dev` placeholder.
- Custom domain. `siteConfig.url` is still `https://example.com`.
- TestFlight status. `siteConfig.testflightUrl` is env-gated; the site is in Phase A (email
  intake) until a build passes Beta App Review.
- **Deployment. The site is not deployed anywhere yet** — no production URL exists.

## Brand Commitments

- **Name:** DVR Extraction Notes. Maker: FVA Development.
- **Tone:** confident, plain-spoken, practitioner-to-practitioner. Short sentences. Real
  numbers. No SaaS hype. Dry competence with the occasional human aside is on-brand.
- **The refrain:** *"You verify. The app types."* — and its sibling, *"You verify. You
  leave."* The product removes the typing, never the judgment.
- **Incumbent visual system:** the "Case File" design system — dark navy field, Carolina
  blue, cyan and gold accents, Share Tech Mono / JetBrains Mono technical labels, Nacelle
  headings. Tokens live in `app/css/style.css` under `@theme`; the design handoff is in
  `Homepage and feature redesign/design_handoff_case_file_site/`. Values are design-owned.
- The roadmap is presented sealed: **no dates, no promises.**

## Evidence on Hand

**Confirmed and publishable verbatim:**

- **15 years** in video evidence.
- **1,500+ extractions** logged.

**NOT confirmed — needs owner review before it is repeated anywhere:**

- **"~10 min → under 5" per-scene paperwork.** This currently ships in the hero credential
  strip (`components/home/hero.tsx`, the gold cell) and appears in
  `docs/planning/01-product-and-positioning.md`. The owner has held it back pending
  revisiting (2026-08-04). Treat every existing instance as live copy awaiting a decision,
  not as established fact.

**Real assets that exist:**

- The interactive demo at `/demo` — a genuine hands-on drive, including live browser-side
  PDF extraction of a request the visitor supplies.
- The Case-File design canvas, from which all shipping marketing copy is transcribed.

**Absences future work must not fabricate:** there are no testimonials, no named customers,
no case studies, no press, no pricing, no licensing terms, and no deployment or uptime
claims. Nothing pre-beta exists to quote.

**Content that is knowingly incomplete:** the Notes feature page copy is DRAFT (it holds the
deepest domain knowledge in the app and ships last, written with the owner); the Reports
copy is PROVISIONAL. Per-feature screen recordings and data-flow diagrams point at intended
`/public` paths; pages render placeholders until those assets land.

## Product Principles

1. **Practitioner-to-practitioner.** The credibility comes from the maker having done the
   job, not from vendor polish. Write like a colleague, not a booth.
2. **Utility leads; the forensic register is earned, not applied.** Faster, cleaner, fewer
   mistakes beats "court-admissible" everywhere except the one surface where defensibility
   *is* the product.
3. **Describe only what the app does.** Unverified numbers, invented capability, and
   softened privacy language are all the same failure.
4. **The user owns their data and their infrastructure.** On-device by default; sync only
   into an account the user controls and the maker cannot reach.
5. **Mirror the real job.** The site's structure follows the actual workflow — request,
   scene, calibrate, capture, hand off — because that is what makes the product legible in
   sixty seconds.
