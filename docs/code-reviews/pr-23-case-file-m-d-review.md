# PR 23 — Case-File Redesign, Milestone D (Slices 6–9, the home page) — Aggregate Code Review

**PR:** [#23](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/23) — Case-File redesign, Milestone D (Case-File home page)
**Commits reviewed (pushed):** `109e6bc` (Hero) · `95e36a5` (ChainOfWork) · `f7db62b` (EvidenceManifest) · `d2cb5ba` (RoadmapTease + BetaCta + page assembly + `(default)` bg layer). **`dc04a83` (M-B fix) excluded.**
**Source of truth:** pushed blobs via `git show d2cb5ba:<path>` (working tree is far ahead — Slices 10–11 already landed, suite at 714 tests — so by-SHA review was essential).
**Reviewers:** `typescript-reviewer`, `pr-test-analyzer` (parallel) + orchestrator lane (copy fidelity vs canvas artboards 1a/3b, manifest semantics, anchors, deletions, bundle isolation, reduced-motion).
**Date:** 2026-07-07

---

## Verdict

**REVISE.**

The section **component logic is sound** — copy is verbatim against the canvas (18/18 strings), server/client boundaries are correct, the manifest table semantics are pinned well, and the static beta intake has no a11y trap. Two HIGHs block: (1) a **real, every-render visual defect** — the hero background glow paints *in front* of the hero content because it lost its `-z-10`; and (2) a **false-coverage test** that claims to verify the gold cred stat but asserts nothing gold-related. Both fixes are one line. The four MEDIUM/LOW items are the same stacking root-cause (prod) and the recurring "test names a design invariant it doesn't actually check" pattern (tests).

---

## Reviewer verdicts at a glance

| Lane | CRITICAL | HIGH | MEDIUM | LOW | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 1 | 2 | 0 | REVISE |
| pr-test-analyzer | 0 | 2 | 2 | 0 | REVISE |
| orchestrator (fidelity/semantics/isolation) | 0 | 0 | 0 | 0 | — (missed the glow HIGH; TS lane caught it) |
| **Total (adjudicated, deduped)** | **0** | **2** | **4** | **1** | **REVISE** |

> **Adjudication:** pr-test-analyzer raised 2 HIGH; I keep the hero gold-cell one (clean false-coverage) and **downgrade the roadmap no-gold one to MEDIUM** (incomplete coverage of a cosmetic invariant that's clean today, not a false-coverage lie). typescript-reviewer's `before:`-grid MEDIUM I **downgrade to LOW** (imperceptible + `pointer-events-none` today; same one-line fix as the HIGH glow).

---

## Pre-flight (independently verified)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | Clean (typescript-reviewer) |
| `pnpm exec vitest run` | 714/714 (106 files) — repo already past the 697 baseline (Slices 10–11); nothing regressed |
| `pnpm build` | Clean |
| Deletions | `hero-home.tsx` / `page-illustration.tsx` — no remaining production imports |

---

## Findings (deduped, ranked)

### CRITICAL
None.

### HIGH

**H1 — the hero background glow paints in front of the hero content (guaranteed visual defect).** *(typescript-reviewer; orchestrator-CONFIRMED)*
`app/(default)/page.tsx:27-30`: the `aria-hidden` "hero top glow" `<div>` is `absolute` with **no z-index**; its siblings (`<Hero>`, `<ChainOfWork>`, …) render as **static** `<section>`s. Per CSS painting order, a positioned `z-index:auto` element paints *after* (on top of) non-positioned in-flow siblings regardless of DOM order — so the `rgba(43,140,193,0.16)` (16% alpha, **not** the near-invisible 2.2% grid) blue radial composites **over** the hero H1, CTAs, and phone frame on every render — the opposite of the "background glow" the adjacent comment intends. The template code this PR deletes handled the identical pattern with `-z-10` (`page-illustration.tsx`, removed in `109e6bc`); the new glow dropped it.
*Fix:* add `-z-10` to the glow div (matching the deleted convention).
*(Orchestrator note: my initial z-index pass cleared the `(default)` `before:` grid correctly but did not separately analyze this `page.tsx` glow — the TS lane caught it. Cross-lane review working as intended.)*

**H2 — the hero cred-strip test claims to pin the gold stat but asserts nothing gold-related.** *(pr-test-analyzer; orchestrator-CONFIRMED)*
`hero.test.tsx:41-47` ("renders the three-cell cred strip with **the gold paperwork stat**") asserts only `getByText` on the four visible strings — it never checks `text-gold` on the `10 min → <5` cell, and never distinguishes it from the other two. I confirmed: delete `cell.gold` (all cells `text-heading`), or invert it, and the test still passes. Textbook false-coverage — the name implies a gold-treatment guarantee the assertions don't make.
*Fix:* `expect(screen.getByText('10 min → <5')).toHaveClass('text-gold')` + a negative check on `'15 yrs'`.

### MEDIUM

**M1 — the same hero glow is half-clipped by the new `overflow-hidden` on `<main>`.** *(typescript-reviewer)* `app/(default)/layout.tsx:28` added `overflow-hidden`; the glow at `-top-[260px]` sits flush at `main`'s top edge, so ~the top half of the 520px box is clipped and never renders (a truncated half-glow, not the intended full radial). *Fix:* scope `overflow-hidden` to a container that starts above the glow, reduce the offset, or move the glow outside `<main>`. (Interacts with H1 — fixing `-z-10` alone still leaves it clipped.)

**M2 — the roadmap "no gold" guard misses the `rgba(255,217,61,…)` form.** *(pr-test-analyzer; orchestrator-CONFIRMED)* `roadmap-tease.test.tsx:23-26` uses `not.toMatch(/gold|#ffd93d/i)` — catches class-substring `gold` and hex, but not the decimal rgba that `beta-cta.tsx:10` already uses one file over. Roadmap is gold-free in all forms today (verified), so no live violation; the guard just can't catch a copy-pasted rgba glow. *Fix:* widen to `/gold|#ffd93d|255,\s?217,\s?61/i`, or assert a positive allow-list (cyan/blue/faint).

**M3 — the manifest marquee test checks a proxy attribute, not the gold classes it names.** *(pr-test-analyzer; orchestrator-CONFIRMED)* `evidence-manifest.test.tsx:46-50` ("gold edge treatment") asserts only `data-marquee="true"`, not `bg-gold/[0.04]` / `shadow-[inset_3px_0_0_#ffd93d]` / `text-gold`. Tight proxy (same `isMarquee` bool), but a narrow edit to the gold shadow/ternary slips through. *Fix:* also assert the marquee row's number carries `text-gold`. *(The rest of this suite is strong: row count, per-slug href, order, zero-padded numbers, class-chip counts 3/5/1/1, DRAFT-on-Notes-only.)*

**M4 — the beta-cta test never asserts the absence of a real form/input.** *(pr-test-analyzer; orchestrator-CONFIRMED)* `beta-cta.test.tsx` positively checks the placeholder text but never asserts `queryByRole('textbox')`/`form` is null. Partially self-defending (RTL `getByText` won't match an input), but a premature Slice-12 `<input>` added *alongside* the divs would leave both assertions green. *Fix:* add `expect(screen.queryByRole('textbox')).toBeNull()` to make the static-intake contract explicit.

### LOW

**L1 — the `(default)` `before:` blueprint grid stacks above the static chrome.** *(typescript-reviewer rated MEDIUM → orchestrator LOW)* Same static-vs-positioned root cause as H1, on `app/(default)/layout.tsx:24`. **Benign today** — 2.2% alpha + `pointer-events-none`, so no user-visible or interaction effect — but the intent ("background texture") doesn't match the actual stacking, and a future opacity bump would expose it. *Fix:* `before:-z-10` (bundle with the H1 fix).

---

## Verified clean (positive confirmations)

- **Copy fidelity vs canvas (artboards 1a + 3b) — 18/18 verbatim.** Hero H1/tagline (`The whole extraction, documented before you leave the scene.`), eyebrow (`BUILT ON THE BENCH …`), sub, cred cells incl. the gold `10 min → <5`; all four ChainOfWork step titles + `From request to court-ready report`; manifest header (`Every feature kills a pain point`, `EVIDENCE MANIFEST`); roadmap (`Where this is headed`, `SEALED — OPENS AFTER THE BETA`, all three card titles); beta panel (`EXHIBIT A — YOUR NEXT SCENE`, `Be first to run it in the field`).
- **EvidenceManifest semantics.** One `<Link href="/features/<slug>">` per feature, numbering from array index, `key={feature.slug}` (stable), marquee row → gold edge/tint + `data-marquee`, Notes → DRAFT chip + italic muted pain line, `CHIP: Record<FeatureClass, …>` exhaustive over the 4-member union (tsc-enforced).
- **Anchor contract.** `#how-it-works` → `chain-of-work.tsx:37`, `#features` → `evidence-manifest.tsx:47`; the header nav + footer links resolve to them.
- **Bundle isolation.** The M-D diff adds no `@/features/demo` import; the hero's phone-slot uses `@/components/app-demo` (marketing-side), not the demo barrel.
- **Server/client boundaries.** All five sections are Server Components; the only client leaves (`AppDemo`, `ManifestTabStrip`) are pre-existing and minimal.
- **Static beta intake — no a11y trap.** Plain `<div>`s, no `<input>`/`<label>`/`<form>`/interactive ARIA; consistent with the `ponytail:` Slice-12 placeholder marker.
- **Reduced-motion.** ChainOfWork glowPulse halos + hero/manifest blinkDot are class-animated → the global `[class*="…"]` pause block catches them.
- **Deletions & tagline.** `hero-home.tsx` / `page-illustration.tsx` safely removed; `siteConfig.tagline` is the single source for both the hero `<h1>` and page `<title>` (resolves doc-07 Q6).

---

## Recommended fix (single commit)

1. **H1 / M1 / L1 (prod, `page.tsx` + `layout.tsx`)** — `-z-10` on the hero glow and `before:-z-10` on the grid; resolve the `<main overflow-hidden>` clip so the full glow shows (scope the clip or move the glow).
2. **H2 / M2 / M3 / M4 (tests)** — assert the actual gold **class** on the cred cell (H2) and the marquee row (M3); widen the roadmap deny-list to the rgba form or use an allow-list (M2); add the no-real-form negative assertion to beta-cta (M4).

Then push and send `type: fixes-done` with the single fix SHA.

---

## Pipeline notes

- **The fan-out earned its keep here.** The orchestrator's copy/semantics/isolation pass was clean and thorough, but it under-analyzed the `page.tsx` hero glow (cleared the `before:` grid, skipped the glow div) — the typescript-reviewer caught it as a HIGH. Independent lanes covering the same surface from different angles is exactly what surfaced a real, every-render visual defect.
- **Recurring author pattern worth addressing at the source:** across M-B (chrome import-vs-render), M-C (static-vs-dynamic import), and M-D (gold class-vs-rgba; gold-stat *name* vs gold *class*), the tests reliably pin **copy/presence** but not the **design/structural invariant they're named for**. The copy/order/routing coverage is genuinely strong; the color/stacking/interactivity guards are the consistent soft spot. Tightening the reflex — "assert the class/style/structure, not just the text" — would prevent this class of finding across the remaining slices.
