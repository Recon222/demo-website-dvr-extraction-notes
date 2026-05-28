# 01 · Product & Positioning

## Who this is for (Monday's room)

Primary: **forensic video technicians / CCTV recovery officers / digital-evidence analysts** —
the people who physically go to a scene, sit in front of a DVR, and recover footage. They feel
the pain the app removes. Secondary: supervisors / decision-makers who'd authorise a rollout.

> **DECISION NEEDED (doc 07):** Is Monday's audience mostly *practitioners* (tone = "I built the
> tool I always wanted") or *buyers/brass* (tone = "standardise your unit's output, cut time per
> job")? The copy leans differently. Default assumption until told otherwise: **practitioners.**

## The angle (the spine of the whole site)

**Practitioner-built, credibility-first.** Not "a startup made a forensics app" — "an analyst
with 15 years and 1,500+ extractions got tired of every pain point and built the fix." Every
feature page is framed as *"here's a thing that used to hurt; here's how it doesn't anymore."*
That framing is honest, it's differentiating, and it disarms the "another vendor app" reflex.

The concrete proof point Kris gave: **a ~10-minute job, done in under 5.** Use real numbers like
this wherever they're true — they travel by word of mouth better than adjectives.

## Candidate messaging (to shred, not adopt verbatim)

**One-liners / hero candidates:**
- "15 years. 1,500+ extractions. Every pain point — solved."
- "CCTV recovery documentation, done right the first time — in half the time."
- "The DVR recovery tool an analyst built for analysts."
- "From scene to court-ready report, without the busywork."

**Supporting sentence candidates:**
- "Capture the scene, calibrate the DVR clock against an atomic time source, and walk away with
  the notes and the report already written."
- "Auto-fill the request, auto-calculate the scope, auto-write the notes. You verify; the app types."

> **DECISION NEEDED (doc 07):** Kris to pick / rewrite the single sentence a visitor repeats to a
> colleague. Everything else is built to support that sentence.

## The narrative arc (mirror the real job, not a feature list)

The homepage walkthrough and the feature pages both follow the actual workflow. This is the
"story" that makes the product legible in 60 seconds:

1. **The request lands** → import a PDF/email request; Apple on-device AI pre-fills the case.
2. **Arrive on scene** → GPS the address, walk the site, mark each camera's position.
3. **Calibrate time** → OCR the DVR's on-screen clock; fire a region-specific atomic-clock (NTP)
   sync at the exact moment of capture; reconcile the offset. *(Hero — see below.)*
4. **Capture evidence** → photos / video / audio, each bound to the right location on disk.
5. **Hand off** → auto-written notes, a generated PDF, and an optional password-protected ZIP of
   the whole case (docs + media), at location or case level.
6. **See the whole case on a map** → tap a pin to call or email the investigator or the site contact.

## The hero feature: time-offset / NTP defensibility

This is the one place Kris has explicitly blessed a forensic framing, because it's the question
that actually comes up in court: *"How do you know the phone you used to calculate the offset had
the right time?"* The old answer was dvrtimecalc.uk + manual reference-clock checks. The app's
answer is a **receipt**, generated automatically:

- A region-specific **NTP** call to an atomic-clock-backed server (NRC Canada, NIST, PTB, METAS,
  Cloudflare) fired **at the exact moment** the timestamp image is captured (or on "use current
  time" for the manual path), with an HTTP time-API fallback when UDP is blocked.
- A **traceability chain** printed in the report:
  *"NRC Canada stratum-2 → cesium atomic clocks → UTC(NRC) → UTC → SI second."*
- The cropped on-screen-timestamp image, the full sync metadata (offset, uncertainty, RTT,
  server, method), and a plain-English "what NTP is" explainer — all in one Time Offset Report PDF.

This has a villain (clock drift / "prove it") and a hero (one tap, atomic-traceable, time-stamped).
It is the single best candidate for an **interactive web explainer** and the centerpiece of the
walkthrough. Treat it as the marquee, but don't let it pull the *rest* of the site into legalese.

## ⛔ The forensic-restraint rule (read before writing any copy)

The app's internal docs are saturated with "court-admissible," "chain-of-custody," "forensic
integrity." That's correct *for the app's engineering docs*. It is **not** the default register for
this marketing site. Guidance:

- **Lead with utility.** "Faster, cleaner, fewer mistakes" beats "court-admissible" on most pages.
- **The NTP/time-offset story is the sanctioned exception** — there, the courtroom framing *is*
  the value, so use it.
- **Do not invent forensic features** (tamper-evidence, hash chains, evidence-integrity claims)
  for dramatic effect. Describe only what the app does.
- **When tempted to escalate into legal/forensic/admissibility claims anywhere else, ask Kris
  first.** Kris will flag what genuinely matters for chain of custody. Don't assume.

Why this matters: overclaiming legal weight is both a credibility risk with a savvy audience and a
liability risk. Restraint reads as confidence.

## Tone

Confident, plain-spoken, practitioner-to-practitioner. Short sentences. Real numbers. No
breathless SaaS hype ("revolutionary AI-powered synergy"). Dry competence with the occasional
human aside is on-brand for this audience.

## Out of scope for the beta site (tease only)

- **Investigator / video-canvassing mode** (post-beta; one app, persona-gated — see app repo
  `docs/investigator-mode-exploration.md`).
- **Desktop live-sync monitoring app** (PoC).
- **Will-say statement generation** (in dev).
- Android beta (iOS/TestFlight first).

A single tasteful "What's next" beat near the end of the site can hint at these to signal momentum
— without committing to dates or specifics.
