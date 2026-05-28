# 07 · Open Questions & Decisions

The calls only Kris can make. Grouped by urgency. Rough answers are fine — they unblock the build.
**Bold = blocks Friday's build if unanswered.**

## A. Identity & facts (quick, but blocking)

1. **Public product name** — market it as "DVR Extraction Notes," or a cleaner public brand? *(The
   app's own investigator-mode doc flags the name as analyst-flavored. Your call.)*
2. **Public contact email** — privacy policy says `fvadd.dev@gmail.com`; account on file is
   `kcfva.dev@gmail.com`. Which is the public contact / where do beta emails get associated?
3. **Custom domain** — what domain do we deploy to? (Or ship on a `*.vercel.app` URL for Monday and
   point a domain later?)
4. **App Store Connect / TestFlight status** — does an app record exist, and is there a build that
   has **passed Beta App Review** yet? This decides `/beta` Phase A (email-only) vs Phase B (live
   Join link) for Monday. *(See doc 04.)*

## B. Positioning (shapes all copy — answer early)

5. **Monday's audience** — mostly practitioners (analysts/techs) or buyers/brass? *(Default:
   practitioners.)* Tone shifts accordingly. *(Doc 01.)*
6. **The one sentence** — pick/rewrite the single line a visitor repeats to a colleague. Candidates
   in doc 01. Everything builds toward it.
7. **How far to dial the "forensic" framing** beyond the sanctioned NTP page? *(Default per doc 01:
   utility-first everywhere else, ask before escalating. Confirm you're happy with that.)*
8. **Real numbers we can publish** — confirm "15 years / 1,500+ extractions / ~10 min → <5 min" and
   flag any other stat you want used (or any you do **not** want public).

## C. Scope for the Monday MVP

9. **Confirm the v1 feature-page set.** Proposed P0 (build for sure): time-calibration, import,
   reports. P1 (if time): evidence-capture, map, camera-gps, secure-export. P2: on-device/trust,
   case-management. *(Doc 02.)* Add/drop/reprioritise?
10. **Feature pages: one file per page, or a single data-driven `[slug]` route?** *(Default:
    `[slug]` fed by a content array — DRYer. Doc 03.)*
11. **Testimonials slot** — no testimonials pre-beta. Repurpose it as the credibility/"15 years"
    band, or cut it? *(Doc 03.)*

## D. Design

12. **Palette** — recolour to the app palette (navy `#000314`/`#0d1b2a`, Carolina blue `#99badd`,
    gold `#ffd93d`), or keep the template indigo? *(Default: shift toward app palette. Doc 03.)*
13. **Add `ShareTechMono`** for technical labels to echo the app's scanner UI? *(Low-risk; default
    yes for mono captions only.)*
14. **Logo/wordmark** — can you provide the app's logo in SVG?

## E. Beta backend

15. **Confirm the stack: Vercel (hosting) + Firebase Firestore (signups) via server-side Admin
    SDK.** *(Default recommendation, doc 04.)* Any reason to prefer Firebase App Hosting or a form
    SaaS instead?
16. **Confirmation email to signups in v1?** *(Default: no for Monday; capture silently + on-screen
    success. Add Resend later.)*
17. **Firebase project** — use the existing project (which one?) or a fresh project for this site?
    *(MCP/credentials needed when we wire it. MCP is currently disabled in this session.)*

## F. Media & content (you + Gemini produce; affects what's ready Monday)

18. **Walkthrough video** — do you have/are you recording it? Roughly how long? (Decides whether we
    host on the origin or a streaming/CDN host. Doc 05.)
19. **Per-feature screen recordings** — which features can you record before Monday? (We build the
    shell regardless; recordings slot into `public/demos/<slug>/`.)
20. **Gemini diagrams** — confirm Gemini will produce the per-feature data-flow diagrams (SVG, dark,
    captioned) from the briefs in docs 02 + 05.

## G. Roadmap teases

21. **What's next" beat** — OK to lightly tease investigator/canvassing mode + desktop live-sync +
    will-says as "coming," with **no** dates/specifics? Or keep the beta site strictly to the
    shipping analyst app? *(Default: one tasteful tease, no promises.)*

---

### Lowest-friction path if you just want us moving

If you only answer a few: **#1, #2, #4, #6, #9, #12** unblock essentially everything for Friday.
We'll default the rest per the notes above and you can correct as we go.
