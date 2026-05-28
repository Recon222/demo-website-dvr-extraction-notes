# 06 · Timeline — Thursday → Monday

**Today:** Thursday 2026-05-28. **Target:** live (enough) for the conference **Monday 2026-06-01**.
~3.5 working days. The long pole is **content** (Kris's screen recordings + the walkthrough, and
Gemini's diagrams), not the code — so the strategy is **build the shell with placeholders now, drop
real media in as it lands.**

## Conference MVP (the "must be true Monday" line)

- Home: hero + **walkthrough video**, the how-it-works arc, feature grid, beta CTA.
- The **3 P0 feature pages**: time-calibration, import, reports (each: loop + pain/fix + diagram).
- `/beta` in **Phase A** (email capture, working, storing to Firestore) — or Phase B if a
  TestFlight build is already approved.
- `/privacy` (adapted from app repo).
- Retheme to the app palette; deployed to Vercel on a shareable URL (custom domain if ready).
- Mobile-responsive, fast, no broken links.

Everything else (P1 pages, trust page, confirmation email, polish) is upside.

## Day plan (adjust freely)

**Thu (today) — DONE / in progress**
- ✅ Research + these planning docs.
- ▶️ Kris: answer doc 07 decisions (even rough). Start the first screen recordings.
- ▶️ Claude: once decisions land, scaffold — retheme tokens, strip template, build `Header`/`Footer`,
  the `FeaturePage` + `AppDemo` components, content data array (placeholder media).

**Fri — build the shell**
- Home page recomposed (real copy, placeholder hero video).
- `FeaturePage` rendering all P0 pages from the content array (placeholder loops + diagram slots).
- `/beta` Phase A: form + Server Action + Firestore write + success state + `/privacy` page.
- Deploy to Vercel early (get the pipeline working day 1, not Sunday night).
- Kris: continue recordings; brief Gemini on diagrams (hand off doc 02 + doc 05 briefs).

**Sat — content integration + P1**
- Drop in real screen-capture loops + walkthrough as they arrive (encode per doc 05).
- Add P1 feature pages if content exists.
- "claude design" pass on visual polish / spacing / motion.

**Sun — polish + dry run**
- Full content in; encode/optimise all media; Lighthouse pass (perf/CLS/a11y); reduced-motion check.
- Cross-device check (the phone you'll demo from + a laptop).
- If a TestFlight build is approved → flip `/beta` to Phase B with the live Join link.
- Write the OG image + metadata; test link unfurl.

**Mon AM — final**
- Last content swaps, copy proofread, smoke-test every route + the email form end-to-end.
- Confirm the QR code (if using one) points to the right URL and resolves on cellular.

## Parallelisation (who does what)

- **Claude (me):** site shell, components, copy scaffolding from doc 02, beta backend, deploy.
- **Kris:** decisions (doc 07), screen recordings, the narrated walkthrough, logo/wordmark, claim
  sign-off, App Store Connect / TestFlight setup.
- **Gemini ("claude design" + diagrams):** the per-feature data-flow diagrams and visual polish.

Because the content array drives the feature pages, Kris's recordings and Gemini's diagrams can
arrive in any order and just slot into their `public/demos/<slug>/` and `public/diagrams/<slug>`
paths — no code changes needed per asset.

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| **TestFlight link not approved by Monday** | Launch `/beta` email-first (Phase A). Designed to flip to Phase B in minutes. Don't block on Apple. |
| **Recordings/diagrams late** | Shell ships with tasteful placeholders (poster stills, "demo coming" frames). Site is presentable even if a loop or two is missing. |
| **Scope creep into P1/P2 + roadmap features** | Hold the line at 3 P0 pages for Monday. Investigator mode / desktop sync are *tease only*. |
| **Walkthrough video too heavy** | Encode per doc 05; if huge, host on a streaming/CDN host, not the origin. |
| **Last-minute deploy problems** | Deploy to Vercel **Friday**, not Sunday. Iterate on a working pipeline. |
| **Forensic overclaim slips into copy** | Doc 01 rule; Kris signs off claims; NTP page is the only sanctioned forensic-heavy page. |

## Definition of done (Monday)

A fast, responsive, on-brand site at a shareable URL: walkthrough plays, the three marquee feature
pages tell the pain→fix→under-the-hood story, the beta form captures emails into Firestore (or the
TestFlight link is live), privacy page present, nothing visibly broken on the demo phone.
