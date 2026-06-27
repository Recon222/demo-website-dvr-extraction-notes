# DVR Extraction Notes — Marketing & Beta Site · Planning Index

> **Status:** High-level planning. Written 2026-05-28 (Thursday) ahead of a Monday conference.
> These are *pre-architecture* docs. Once the decisions in `07-open-questions-and-decisions.md`
> are locked, we write the real architecture docs, sliced implementation plans, and synced test
> specs using the proper planning workflow.

---

## What this site is

A marketing + beta-recruitment website for **DVR Extraction Notes** — a React Native (Expo)
iOS app for CCTV/DVR evidence recovery, built by a practitioner with 15 years and 1,500+
extractions. The site's two jobs:

1. **Explain the app** — a homepage walkthrough video, then one page per pain-point/feature,
   each pairing a high-res screen-capture loop with "here's the pain, here's the fix," and a
   user-facing data-flow diagram (Gemini-produced) for the technical story underneath.
2. **Recruit beta testers** — collect emails now (iOS/TestFlight beta), then surface the
   TestFlight public link on the same page once a build clears Beta App Review.

## The build base

Forked from the Cruip **"Open PRO"** template: Next.js 15 (App Router) + React 19 + Tailwind
CSS v4, dark "glass" aesthetic. See the repo root `CLAUDE.md` for template mechanics. We prune
the template's marketing filler and keep the strong shell (nav, glass cards, gradient type,
spotlight/AOS motion).

## Read the docs in this order

| # | Doc | Purpose |
|---|-----|---------|
| 00 | **START-HERE** (this file) | Index, key facts, working agreements |
| 01 | `01-product-and-positioning.md` | Audience, angle, candidate messaging, **forensic-restraint rule** |
| 02 | `02-app-feature-inventory.md` | Every feature → pain → fix → page → media. The content backbone. |
| 03 | `03-site-architecture-and-ia.md` | Page map, nav, routes, template prune/reuse, design alignment |
| 04 | `04-beta-and-email-capture.md` | TestFlight public-link mechanics + email capture architecture |
| 05 | `05-media-and-content-production.md` | Screen-capture → web video pipeline, diagram slots, a11y |
| 06 | `06-timeline-thu-to-mon.md` | Day-by-day critical path; conference-MVP vs after |
| 07 | `07-open-questions-and-decisions.md` | **The decisions only Kris can make — start here when back** |

## Key facts locked from the app codebase

- **App display name:** `DVR Extraction Notes` (Expo `name`). Slug: `extraction_case_notes_react_native_expo`.
- **iOS bundle id:** `com.kris.dvrextractionnotes` · **EAS owner:** `recon222` · EAS project configured.
- **Company / publisher:** **FVA Development**.
- **Platform for beta:** iOS first, via **TestFlight**. (Android package also exists but beta is iOS.)
- **On-device AI:** Apple Foundation Models (Apple Intelligence), **iOS 26+** — used for PDF/email
  request import autofill. (Older app README mentions a GPT pipeline; that is **stale** — the
  shipping path is on-device Apple Intelligence. Confirmed in `app.config.js`.)
- **Cloud:** Supabase **push-only** sync exists (local SQLite is source of truth). Live desktop
  monitoring app is **PoC / post-beta** — tease only.
- **Privacy posture:** Strong "stays on your device" story. A privacy policy already exists in the
  app repo (`docs/PRIVACY-POLICY.md`) and can be adapted for the required `/privacy` web page.
- **Design language to echo:** dark navy (`#000314` / `#0d1b2a`), Carolina-blue accent (`#99badd`),
  gold highlight (`#ffd93d`), `ShareTechMono` for technical/"scanner" UI, faux-glass via gradients.

## ⚠️ Discrepancies to confirm with Kris (see doc 07)

1. **Contact email mismatch.** Privacy policy says `fvadd.dev@gmail.com`; the account email on
   file is `kcfva.dev@gmail.com`. Which is the public contact for the site/beta?
2. **Public-facing product name.** Internally "DVR Extraction Notes." Is that the name we market,
   or is there a cleaner public brand? (The investigator-mode doc itself flags the name as
   "unambiguously analyst-flavored.")
3. **Is the app already in App Store Connect / does a TestFlight build exist yet?** This decides
   whether the beta page launches in email-only mode or can show a live Join link Monday.

## Working agreements (carry these into every session)

- **No agents for this research/planning pass** — done in the main thread per Kris's instruction.
- **Forensic restraint.** Lead with utility and clarity, not "court-admissible / chain-of-custody"
  on every surface. The app's own docs are forensic-heavy; we *temper* that for marketing. The
  time-offset/NTP defensibility story is the one place Kris has explicitly blessed as hero. For
  anything else that tempts a forensic/legal framing, **ask first.** (Full rule in doc 01.)
- **Beta is the analyst app only.** Investigator/canvassing mode and desktop live-sync are
  roadmap — tease, don't show, don't promise.
