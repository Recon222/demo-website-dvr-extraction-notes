# P2 Debrief — the Fable/Opus A/B, and the P3 decision

**Written:** 2026-07-31, post-PR-#31 merge, per the owner's delegation ("you determine how Opus did… I trust you'll make the right calls").
**Decision up front: P3 runs ALL-OPUS implementation (xhigh), Fable retained for review aggregation and as the reserve for designated precision cores. Reassess at P4.**

## The experiment

P2 ran six packages under a controlled split: **Fable** on P2.1 (the seven-section notes generator — the phase's subtlest package, on the court-document critical path); **Opus at xhigh** on P2.2 (OCR confirm), P2.3 (submission GPS — the phase's broadest package), P2.4 (gate), P2.5 (advisories), and the import-territory rider. Same briefs, same conventions, same three-round review gauntlet (5 Opus lanes → Fable aggregation → warm fix-delta).

## Findings density (initial review, severity-weighted)

| Package | Model | Size | Majors | Minors | Notes |
|---|---|---|---|---|---|
| P2.1 notes | **Fable** | L (subtlest) | 3 | ~6 | R-3/R-5/R-8 — court-PDF honesty, dialog dup, unpinned flow |
| P2.3 submission | Opus | L (broadest) | 3 | ~8 | R-1/R-6/R-7 — async guard, two a11y |
| P2.2 OCR | Opus | M | 1 | 4 | R-4 — silent regeneration (phone prompts) |
| P2.4 gate | Opus | M | 1 | 1 | R-2 — persistence honesty |
| P2.5 advisories | Opus | S | 1 | 2 | R-9 — vacuous TZ pin |

**Read:** density tracks package size and subtlety, not model. Fable's 3 majors on the subtlest package ≈ Opus's 3 on the broadest. No severity class was model-exclusive; both models' majors were honesty/a11y/coverage classes, not correctness-of-core-logic classes (the ported math and formatters from BOTH models survived review untouched).

## Where each model distinguished itself

**Opus (all at xhigh, reading tier definitions as contracts):**
- Five packages, five evidence-backed refutations of their own briefs — including the §M13 "2σ filter" takedown (phone-repo doc-drift that would have diverged coordinates) and P2.5's five refuted toast-guards.
- The fix rounds produced two mutation-verified refutations of REVIEW-suggested fixes (P2.3's R-32 token-shape counter-example; P2.2's Escape≠Cancel reasoning) — both upheld by the discovering reviewers, one with "my suggested shape was wrong."
- The emergent-bug investigation (gate agent): measured empirically, refuted my interaction hypothesis, delivered the missing half of a prior fix.

**Fable (P2.1 + the aggregator):**
- The notes port matched the phone byte-for-byte at the template level with a nine-invariant successor brief; its fix round deleted its own weaker dialog rather than defending it.
- The aggregator earned its permanence: it promoted a lane minor to major after independently verifying phone behavior, empirically refuted a lane's always-red claim by measuring the disputed suite solo, and settled a lanes conflict via independent probe. This role is where cross-checking judgment concentrates — it stays Fable.

**Fix-introduced residuals** (the honest ledger): Opus owned R-32 (incomplete guard coverage) and the R-24 inverted guard promise; Fable owned the R-36 unguarded memo. Proportional to fix volume; no model signal.

## Incidents (all resolved, none model-attributable)

Two hourly-limit fleet kills (clean transcript resumption both times); four stream-watchdog stalls (resumed); one lost transcript (P1.6 v1 — succeeded via brief); the §37 ledger pile-up (cured by reserved section numbers); one reviewer self-disclosed writing a figure before verifying it (corrected pre-delivery — integrity culture holding).

## The P3 decision, reasoned

1. **Quality parity is now demonstrated across two phases of evidence**, through the strictest review process we can build. The review net catches both models' residuals identically.
2. **P3's packages** (cases CRUD, dashboard actions, modal completion, location GPS consumption, duplicate-location, incident editing, per-camera GPS) are moderate-subtlety ports with excellent specs — squarely in the proven Opus envelope. The store-territory successor brief covers the one deep region (CRUD store actions).
3. **Quota economics** favor Opus at equal quality; the owner's stated constraint is making the weekly limit stretch across the remaining phases.
4. **Fable stays where judgment concentrates**: review aggregation (proven twice), the orchestrator, and reserved for P4's OCR-recognition core and any future package touching the R-19/persistence invariant lattice — reassessed at the P4 boundary with this same evidence standard.

## Night totals (for the record)

P0+P1+P2 merged: three phase PRs, 100 review findings raised and resolved across eight review rounds (R-1..R-51 in P1's numbering, R-1..R-39 in P2's, plus P0's 30), zero unfixed, three empirically refuted. Tests: 780 → 1482. Bundle: 107 kB First Load, unmoved. Phone-repo ledger: seven genuine phone bugs found by building its replica — the re-porting-as-bug-finding meta-lesson, now demonstrated at scale.
