# 04 · Beta Recruitment & Email Capture

Two jobs on one `/beta` page, in two phases:

- **Phase A (now → until a build clears Beta App Review):** collect interested emails.
- **Phase B (once live):** show the **TestFlight public Join link** as the primary CTA, keep email
  capture as a secondary "notify me about updates."

Design the page so flipping A→B is a content/flag change, not a rebuild.

---

## TestFlight public links — how they actually work (researched 2026-05)

- A **public link** lets anyone with the URL join your beta (no per-email invite). Format:
  `https://testflight.apple.com/join/XXXXXXXX`. Testers need the **TestFlight app** + a compatible
  iOS device.
- To get one: in **App Store Connect → your app → TestFlight**, create an **External Testing**
  group, add a build to it. Adding a build to an external group triggers **Beta App Review**.
- **A public link can only be enabled once you have at least one build approved by Beta App
  Review**, and you must fill in **beta app description + beta app review information** first.
- Capacity: up to **10,000 external testers** per app; you can **set a join limit (1–10,000)** on
  the public link and set **device/OS criteria** so only eligible testers can join.

**Implication for Monday:** the Join link does **not** exist until a build passes Beta App Review,
which is not instantaneous. So:

- If a build is already approved → we can show the live link Monday (Phase B).
- If not → the page launches **email-first** (Phase A) and we paste the link in the moment it's
  approved. This is exactly the two-phase design above. **Confirm current App Store Connect status
  in doc 07.**

Practical setup checklist (Kris-side, App Store Connect): bundle `com.kris.dvrextractionnotes`
exists as an app record → upload a build via EAS Submit → fill beta review info (demo notes, a
test account is N/A here, contact) → add build to an External group → wait for Beta App Review →
enable public link → set a sensible join limit.

> Note: builds expire after 90 days; betas need periodic new builds. Not a launch blocker, just a
> maintenance note.

---

## Email capture — recommended architecture

Kris has a **Firebase** account already (+ Firebase MCP available), and noted "Vercel is easiest"
for hosting. Those compose cleanly: **host the Next.js site on Vercel, store signups in Firebase
Firestore.** Recommendation:

**Server-side write via a Next.js Server Action / Route Handler using the Firebase Admin SDK.**

- Client posts `{ email, consent, honeypot }` to a Server Action.
- Server validates (email format, honeypot empty), normalises the email (lowercase/trim), and
  writes to a `waitlist` Firestore collection (doc id = normalised email → free dedupe), with
  `{ email, createdAt, source, userAgent, consent }`.
- Service-account credentials live in Vercel **env vars** (never client-exposed). No public write
  rules on Firestore — all writes go through the server.

Why this over client-side Firebase SDK: keeps Firestore locked down (no client write access),
centralises validation + spam defence, and avoids shipping Firebase web SDK weight to every
visitor for a single form.

**Spam / abuse defences (cheap, do all):** honeypot field, basic per-IP rate limit, server-side
email validation, optional disposable-domain block. Skip CAPTCHA for v1 unless abused.

**Confirmation email:** nice-to-have, not required for Monday. If wanted, add **Resend** (simple
API) or Firebase Extensions "Trigger Email" later. For the conference, silent capture + an
on-screen "you're on the list" success state is fine.

**Consent / compliance:** include a short consent line ("I agree to be contacted about the DVR
Extraction Notes beta") and link `/privacy`. Store the consent boolean + timestamp. Given the
law-enforcement audience, keep it minimal and professional; don't add marketing fluff.

### Alternatives (documented, not recommended for v1)

| Option | When it'd make sense | Trade-off |
|--------|---------------------|-----------|
| Firebase client SDK + locked security rules (create-only) | If we host on **Firebase App Hosting** and want zero server code | Bundles web SDK; rules must be exactly right; harder validation |
| Vercel Postgres / KV | If we want everything in the Vercel ecosystem | New datastore to set up; Kris already has Firebase |
| Form SaaS (Tally / Formspree / ConvertKit) | If we want zero backend and built-in dashboards/exports | Another vendor; less control; email export friction |

> **DECISION NEEDED (doc 07):** confirm **Vercel + Firebase Admin (Firestore)** as the stack, and
> whether a confirmation email is in scope for v1.

---

## `/beta` page content (both phases)

- Headline: "Be first to run it in the field." Sub: one line on what the beta is (iOS, TestFlight).
- **Phase A:** email field + consent + submit → success state ("You're on the list — we'll send
  your TestFlight invite when the build's ready").
- **Phase B:** big "Join the TestFlight beta" button (the public link) + "Requires iOS [version]
  and the TestFlight app" + secondary "get update emails" field.
- Honest expectations: iOS only for now; what testers should expect; how to give feedback.
- Quiet eligibility note if we set device/OS criteria (e.g., needs iOS 26+ for the AI import).

---

## Hosting

**Vercel** for the Next.js site (first-party App Router support, trivial deploys, the
`deploy-to-vercel` skill is available). Firestore as the data layer. Point a custom domain when
chosen. Firebase App Hosting is a viable alternative if Kris prefers a single Google bill, but
Vercel is the lower-friction path and matches the "Vercel is easiest" note.

> **DECISION NEEDED (doc 07):** custom domain name for the site?

---

## Sources

- [TestFlight — Apple Developer](https://developer.apple.com/testflight/)
- [Invite external testers — App Store Connect Help](https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers/)
- [How to Create a TestFlight Public Link (guide)](https://departures.to/about/guides/how-to-create-a-testflight-public-link)
- [Integrate Firebase with a Next.js app — Firebase Codelabs](https://firebase.google.com/codelabs/firebase-nextjs)
- [Next.js — Firebase Hosting frameworks](https://firebase.google.com/docs/hosting/frameworks/nextjs)
- [leerob/nextjs-vercel-firebase (App Router + Firebase reference)](https://github.com/leerob/nextjs-vercel-firebase)
