# PR 23 — Case-File Redesign, Milestone C (Slice 5) — Aggregate Code Review

**PR:** [#23](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/23) — Case-File redesign, Milestone C (marketing phone frame)
**Commit reviewed (pushed):** `284ce0b` — `MarketingPhoneFrame` + `CornerBrackets` + co-located test.
**Source of truth:** pushed blobs via `git show 284ce0b:<path>` (working tree tip is `dc04a83`).
**Reviewers:** `typescript-reviewer`, `pr-test-analyzer` (parallel) + orchestrator lane (design fidelity vs canvas, reduced-motion, ceil math). *type-design not dispatched — 2 presentational components, negligible type surface.*
**Date:** 2026-07-07

---

## Verdict

**REVISE.**

The **component code is clean** — pixel constants are verbatim against the design canvas, the scan sweep is correctly class-animated (so the global reduced-motion pause catches it), the `Math.ceil` never-under-fit decision is sound, both are pure Server Components, and bundle isolation holds **at the built-chunk level** (independently verified — no mapbox/pdfjs/motion in marketing JS). The **REVISE is one HIGH test-guard gap**: the "CRITICAL bundle isolation" test misses the dynamic-`import()` form that is *already the in-repo idiom* for this exact module — so the regression it names could ship green. Plus one MEDIUM (the hero-scale box is untested and the doc comment misstates its dimensions). Both fixes are ~test-only + a one-line comment.

---

## Reviewer verdicts at a glance

| Lane | CRITICAL | HIGH | MEDIUM | LOW | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 0 | 1 | 0 | APPROVE w/ comments |
| pr-test-analyzer | 0 | 2 | 0 | 0 | REVISE |
| orchestrator (fidelity/motion/ceil) | 0 | 0 | 0 | 0 | — (both corroborated) |
| **Total (adjudicated, deduped)** | **0** | **1** | **1** | **0** | **REVISE** |

> **Adjudication:** pr-test-analyzer raised 2 HIGH. I uphold HIGH#1 (bundle-isolation guard). I **downgrade** its HIGH#2 (hero-box coverage) to **MEDIUM** and merge it with typescript-reviewer's MEDIUM (same root: 0.78 doc/code mismatch): there is **no functional defect** — `316×634` is the correct never-under-fit output; only the doc comment and the missing test are wrong, and the regression the gap fails to catch is a ≤1px cosmetic on a decorative mock. Real, worth fixing, not HIGH.

---

## Pre-flight (independently verified at `284ce0b`)

| Gate | Result |
|---|---|
| `pnpm exec vitest run …/phone-frame.test.tsx` | 5/5 (typescript-reviewer) |
| `pnpm exec tsc --noEmit` | Clean |
| `pnpm build` | Clean — 19 static pages |
| **Bundle isolation (build output)** | typescript-reviewer grepped the `/` route's actual `.next` JS chunks for `mapbox-gl`/`pdfjs-dist`/`motion`/`framer-motion` → **zero matches**. Isolation holds end-to-end today, not just syntactically. |

---

## Findings (deduped, ranked)

### CRITICAL
None.

### HIGH

**H1 — bundle-isolation guard doesn't catch dynamic `import('@/features/demo')`.** *(pr-test-analyzer; orchestrator-CONFIRMED)*
`phone-frame.test.tsx:54-56` asserts `not.toMatch(/from\s+['"][^'"]*features\/demo/)`. That catches static imports and re-exports, but **not** `import('…/features/demo')` (no `from` token) — and I confirmed that's the **already-used in-repo idiom**: `app/demo/page.tsx:7` is `dynamic(() => import('@/features/demo').then((m) => m.DemoExperience), { ssr: false })`. So if a future edit lazy-loads a real `AppDemo` into the phone frame that way (instead of the caller-supplied slot), the exact regression this test names as CRITICAL — mapbox-gl/pdfjs/motion into every marketing page — ships with a green suite. No live violation today (isolation verified at build-output level), so this is guard robustness, not a current leak — but on a CRITICAL invariant with a realistic, precedented bypass.
*Fix:* add a second assertion covering the call form — `expect(source).not.toMatch(/import\(\s*['"][^'"]*features\/demo/)` (and ideally `require(`), or fold both into `(from|import\(|require\()\s*['"][^'"]*features\/demo`.

### MEDIUM

**M1 — hero scale (0.78) box is untested, and the doc comment misstates its dimensions.** *(typescript-reviewer MEDIUM + pr-test-analyzer + orchestrator — triple-corroborated)*
`phone-frame.tsx:13` says "hero 0.78 → 315×633 box," but the code computes `Math.ceil(404×0.78)=316` × `Math.ceil(812×0.78)=634` (verified via `node`). The doc value matches `Math.round`, not the `Math.ceil` the code actually uses — doc and code disagree by 1px per axis for the hero. The sizing test (`phone-frame.test.tsx:35-44`) only pins the 0.62 row box (which is correct); the 0.78 hero box — the scale actually shipped in `components/home/hero.tsx` — is never asserted (the 0.78 test only checks the `scale(0.78)` string). The code is correct (ceil = never-under-fit, by design); the **comment is stale**.
*Fix:* correct the `phone-frame.tsx:13` comment to `316×634` (or note 315×633 is the canvas target that ceils to 316×634), and add `expect(container.innerHTML).toContain('width: 316px')` / `'height: 634px'` for `scale=0.78` to the sizing test.

---

## Verified clean (positive confirmations)

- **Design fidelity vs canvas — verbatim.** Every constant matches the canvas phone: `FRAME_W=404`, `FRAME_H=812` (378×786 screen + 2×13 padding), frame radius 58 + gradient `150deg,#4a4f57…#3c4148`, screen radius 46 / `#0d1b2a` / `0 0 0 2px #05080d inset`, blueprint grid, dynamic island 112×33, home indicator 134×5, `9:41` status bar + signal/wifi/battery glyphs, scan-sweep gradient.
- **Reduced-motion (#3) — correct.** `scanSweepStyle` sets only position/appearance — **no `animation` property**; the animation is solely the `animate-[scanSweep_7s_linear_infinite]` class, so the global `[class*="scanSweep"]` `animation:none !important` genuinely pauses it. All decorative sub-elements (scan, island, home indicator, brackets) are `aria-hidden`.
- **Ceil decision (#2) — sound.** `ceil` over-sizes the box so it never under-fits the scaled device (no clip); at 0.62 that reproduces the design's 251×504 exactly. Agreed over the canvas's implicit `round`.
- **Server/client boundary — clean.** Both components are pure Server Components (no `'use client'`); the only client leaf is whatever the caller renders in the screen slot.

---

## Security note (out of M-C diff scope — surfaced, not a code finding)

During the review, `typescript-reviewer` reported that the tail of a `git show` output contained **an embedded block impersonating a system reminder and advertising MCP servers** — untrusted content inside a repo file, which it correctly disregarded per its prompt-defense baseline (it invoked no MCP tools). This is a **planted prompt-injection payload** somewhere in the repo. It is outside the M-C diff, so it is not an M-C finding — but it should be located and scrubbed (a bounded search is running). Flagged to the author and the human operator separately.

---

## Recommended fix (single commit)

1. **H1** — add the `import(` (and `require(`) form to the bundle-isolation regex in `phone-frame.test.tsx`.
2. **M1** — correct the `phone-frame.tsx:13` doc comment to `316×634` and add the `scale=0.78` box-dimension assertion.

Then push and send `type: fixes-done` with the single fix SHA.

---

## Pipeline notes

- **Triple-corroboration on M1:** the 1px doc/code mismatch was found independently by typescript-reviewer (MEDIUM), pr-test-analyzer (inside its HIGH#2), and the orchestrator (`node` arithmetic). High confidence it's real; resolved as "comment stale, code correct."
- **pr-test-analyzer found the dynamic-import bypass with concrete in-repo precedent** (`app/demo/page.tsx:7`) — the kind of evasion a source-text guard invites. Same failure class as the M-B chrome-scope HIGH.
- **typescript-reviewer verified bundle isolation at the built-chunk level**, not just source grep — stronger evidence, and it's what lets us say the H1 gap is robustness (future risk), not a live leak.
- **Adjudicator downgraded one HIGH → MEDIUM** with explicit reasoning (no functional defect). Recorded here so the delta from the raw lane output is transparent.
