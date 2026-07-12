# PR 23 — Case-File Redesign, Milestone G (Slice 13, privacy page) — Aggregate Code Review

**PR:** [#23](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/23) — Case-File redesign, Milestone G (privacy page — the final milestone)
**Commit reviewed (pushed):** `b3c9f75` — `app/(default)/privacy/page.tsx` (full Case-File rewrite), `privacy-page.test.tsx` (new), `lib/site-config.ts` (contactEmail wired).
**Source of truth:** pushed blobs via `git show b3c9f75:<path>`.
**Reviewers:** `typescript-reviewer`, `pr-test-analyzer` + orchestrator (ledger fidelity vs canvas 3a, content-policy judgment, TOC/anchor correctness).
**Date:** 2026-07-07

---

## Verdict

**clean — milestone approved (with comments).**

The page is a clean, static, self-consistent server component: the TOC and its target sections are **structurally coupled to one `SECTIONS` array** so anchors can't drift, the network ledger is faithful to canvas 3a (verbatim copy, correct NEVER / STAYS-HOME verdicts, gold edge), the wide ledger scrolls **inside its own `overflow-x-auto` container** (no page-level horizontal scroll), and there's no injection surface. No CRITICAL/HIGH/MEDIUM code findings. Two test-tightening comments and two **non-code, pre-launch legal/content flags** for the human.

---

## Reviewer verdicts at a glance

| Lane | CRITICAL | HIGH | MEDIUM | LOW | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 0 | 0 | 0 | APPROVE |
| pr-test-analyzer | 0 | 0 | 1 | 1 | APPROVE w/ comments |
| orchestrator (fidelity/policy) | 0 | 0 | 0 | 0 | — |
| **Total (deduped)** | **0** | **0** | **1** | **1** | **clean — approved w/ comments** |

---

## Pre-flight (verified at `b3c9f75` / reviewed tip)

| Gate | Result |
|---|---|
| `tsc --noEmit` | Clean |
| `next build` | Green — `/privacy` prerendered `○ (Static)` (no client runtime cost) |
| `pnpm test` | **736/736** at the reviewed tip (higher than the 727 baseline; later commits added tests — the M-E `feature-page.test.tsx` breakage is resolved by now) |
| Process check | `git diff b3c9f75 HEAD -- app/(default)/privacy/` empty; test committed + consistent (no M-E-style drift) ✓ |

---

## Findings (deduped, ranked)

### MEDIUM

**M1 — the ledger test asserts row *labels* but never the `when`/`contains` text or the per-row association.** *(pr-test-analyzer)*
`privacy-page.test.tsx:15-23` checks the three `what` labels exist, "NEVER" appears 3×, and "Everything else"/"STAYS HOME" exist — but never references the `when`/`contains` strings, and never checks a row's cells are co-located. A **scrambled row** (e.g. "Map look-ups" shipping with the crash-report description) would render with all the same literals the test checks for, so every assertion still passes. This is the page's **central privacy claim** — a ledger stating exactly what leaves the device and why — so a right-label/wrong-description edit is exactly the regression this test should catch. Content is correct today; the coverage can't protect it. *Fix:* assert the `when`/`contains` text scoped to each row (`getByText(what).closest('div')` → query within for the matching cells).

### LOW

**L1 — the permissions list test checks only the key labels, not the `use` descriptions or key↔description pairing.** *(pr-test-analyzer)* Same pattern as M1, lower stakes (informational copy; OS permission behavior isn't affected by the text). *Fix:* optional — add a `use` assertion per key.

---

## Verified clean (positive confirmations)

- **TOC ↔ section ids — structurally can't drift.** Both the TOC (`page.tsx:147-155`) and the body sections (`:160-198`) `.map()` the same `SECTIONS` const; anchor and target both read `section.id`. The test additionally resolves each `href="#x"` via `querySelector` against the real id, so a hardcoded typo would fail. Six ids each appear once as link + once as section.
- **Ledger fidelity vs canvas 3a — verbatim.** WHAT/WHEN/CONTAINS/CASE-DATA columns; 3 cyan "NEVER" rows (Time packets / Map look-ups / Crash reports); the gold "Everything else → STAYS HOME" row with the gold left-edge bar. All copy matches the canvas (incl. the header H1 "On your device, under your control", "THE COMPLETE NETWORK LEDGER", and the "LEGAL SIGN-OFF PENDING" chip — which is itself in the canvas).
- **Responsiveness** — the `min-w-[900px]` ledger is wrapped in `overflow-x-auto`; horizontal scroll is contained to the ledger, so the page body never scrolls sideways on phones.
- **Server component / no JS** — no `'use client'`, no hooks; `/privacy` prerenders static. The sticky TOC is CSS-only (`lg:sticky`), deliberately no scroll-spy. `BoldText` is directive-free, so the whole tree stays server-rendered.
- **Injection / safety** — no `dangerouslySetInnerHTML`; `BoldText` uses `split` + JSX text nodes (no raw HTML); the `mailto:` interpolates a compile-time `as const` config string, not user input.
- **A11y** — `<nav aria-label="On this page">`, semantic `<dl>/<dt>/<dd>` for permissions, `<section id>`+`<h2>` (h1→h2 order), decorative dots `aria-hidden`, accessible mailto link.

---

## Non-code flags for the human (pre-launch — NOT milestone blockers)

1. **Legal review + data retention.** The page **faithfully implements canvas 3a**, which *deliberately distills* the policy to the ledger + 6 sections — the canvas itself has **no** children's-privacy / data-retention / changes-to-policy sections (confirmed absent from the canvas), and the visible **"LEGAL SIGN-OFF PENDING"** chip (also from the canvas) honestly signals it isn't final. This is a legitimate interim state for the redesign milestone. **Before the policy goes live publicly:** get a real legal review, and — because this site actually *collects beta email addresses* — the most important gap to close is a **data-retention statement for that email list** (how long addresses are kept; the page currently says only "Unsubscribe ends it"). A children's-privacy line is the usual second item. This is a product/legal decision for you + counsel, outside the code review's authority.
2. **Contact email (`Q2`, unresolved).** `contactEmail` is set to `kcfva.dev@gmail.com` (the account on file), chosen over the old app policy's `fvadd.dev@gmail.com` and the canvas's `contact@fva.dev`. It's honestly flagged with an inline `TODO(doc 07 Q2)`. **Confirm the canonical public contact address before launch** — this is the address users will email about their data.

---

## Recommended (optional) fix

- **M1 / L1** — tighten the ledger and permissions tests to assert the `when`/`contains` (and `use`) text scoped to each row, so a scrambled-description edit fails. Non-blocking; worthwhile because the ledger encodes a legal/trust claim.

The pre-launch legal items above are for the human, not the author, and do not gate this milestone.

---

## Pipeline notes

- Cleanest milestone of the PR on the code axis — both lanes + orchestrator found zero code defects; copy is verbatim; the only comments are test-tightening on the ledger/permissions association (the recurring "assert the value/pairing, not just presence" theme) and two legal/content decisions that are correctly documented as pending on the page itself.
