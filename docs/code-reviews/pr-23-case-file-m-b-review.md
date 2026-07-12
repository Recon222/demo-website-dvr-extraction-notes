# PR 23 — Case-File Redesign, Milestone B (Slices 3+4) — Aggregate Code Review

**PR:** [#23](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/23) — Case-File redesign, Milestone B (chrome relocation + Case-File chrome)
**Commits reviewed (pushed):** `e56053b` (Slice 3 — chrome moved root→`(default)`, AOS removed, `(default)` now a Server Component) + `cf50a54` (Slice 4 — Case-File chrome: utility-strip, logo, header, manifest-tab-strip replacing feature-nav, footer). **`d85c571` (M-A fix) is excluded from this scope.**
**Source of truth:** working tree dirty/ahead (later-slice WIP) — all review done against pushed blobs via `git show cf50a54:<path>` / `git show e56053b`, never the working tree.
**Reviewers:** `typescript-reviewer`, `type-design-analyzer`, `pr-test-analyzer` (parallel fan-out) + orchestrator lane (chrome-scope regression, AOS completeness, a11y, design fidelity vs canvas).
**Date:** 2026-07-07

---

## Verdict

**REVISE.**

The **production code is clean** — both code lanes and all orchestrator checks passed with zero findings, chrome copy/colors are verbatim against the design canvas, the server/client boundary is minimal and serializable, and the chrome-scope regression this milestone exists to prevent is correctly prevented. The single **HIGH is a test-guard weakness**: the `chrome-scope` test's positive assertions can pass on a dead import without the chrome actually rendering — i.e., the guard for *this milestone's core invariant* could let the very regression it targets slip past CI. That plus one MEDIUM (untested new wordmark) is worth closing before locking M-B. Expect a single small **test-only** fix commit.

---

## Reviewer verdicts at a glance

| Lane | CRITICAL | HIGH | MEDIUM | LOW | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 0 | 0 | 0 | APPROVE |
| type-design-analyzer | 0 | 0 | 0 | 0 | APPROVE |
| pr-test-analyzer | 0 | 1 | 1 | 1 | REVISE |
| orchestrator (chrome/a11y/AOS/design) | 0 | 0 | 0 | 0 | — (H1 corroborated) |
| **Total (deduped)** | **0** | **1** | **1** | **1** | **REVISE** |

---

## Pre-flight (independently re-verified at `cf50a54`, not the dirty tree)

| Gate | Result |
|---|---|
| `pnpm exec tsc --noEmit` | Clean at `cf50a54` (typescript-reviewer, isolated worktree). The live tree fails tsc on an **untracked** later-slice WIP (`components/home/__tests__/hero.test.tsx`) — not in `e56053b`/`cf50a54`, correctly excluded. |
| `pnpm exec vitest run` | 670/670 (97 files) — re-run at the SHA by both code lanes |
| `pnpm build` | Clean — 19 routes, 10 `/features/[slug]` SSG |
| `next lint` | No ESLint config exists in the repo at this SHA — pre-existing gap, not introduced here |

---

## Findings (deduped, ranked)

### CRITICAL
None.

### HIGH

**H1 — `chrome-scope` test's "renders the chrome" assertions pass on a dead import, not an actual render.** *(pr-test-analyzer; orchestrator-CONFIRMED)*
`app/(default)/__tests__/chrome-scope.test.tsx:22-26` asserts `expect(defaultLayout).toMatch(/Header/)`, `/FeatureNav|ManifestTabStrip/`, `/Footer/` against the **raw source text** of `app/(default)/layout.tsx`. But that file's lines 1-4 are `import Header …`, `import Footer …`, `import { ManifestTabStrip } …` — so the regexes match the **import lines**, independent of the JSX. I confirmed this directly against the source. If a future refactor removes `<Header />` (or `<Footer />` / `<ManifestTabStrip … />`) from the returned JSX but leaves the import, the test stays green while chrome **silently stops rendering on every marketing page** — and nothing else catches it (no `noUnusedLocals` in `tsconfig.json`, no committed ESLint at this SHA to flag the dead import). This is a false-coverage trap on the guard for *this milestone's* central invariant. pr-test-analyzer verified a render-based test can't fully replace this without e2e infra the repo lacks — so **tighten in place, don't replace**.
*Fix:* anchor the positive assertions to a JSX opening tag — `/<Header\b/`, `/<(FeatureNav|ManifestTabStrip)\b/`, `/<Footer\b/`. Recommend anchoring the **negative** assertions the same way (`expect(rootLayout).not.toMatch(/<Header\b/)`), so a capitalized identifier in a root-layout comment can't false-fail and the check is genuinely about rendering, not text.

### MEDIUM

**M1 — header wordmark has zero assertion coverage.** *(pr-test-analyzer)*
`components/ui/header.tsx:12-16` renders `{siteConfig.name}` + the `CCTV RECOVERY · DOCUMENTED` subtitle — new, user-visible brand content added in this slice (the prior header rendered only `<Logo />`). None of the 5 tests in `header.test.tsx` query it, while its siblings (footer trust label, header nav/CTA) each got matching assertions in this same PR.
*Fix:* `expect(screen.getByText(siteConfig.name)).toBeInTheDocument()` in `header.test.tsx` (mirrors footer's trust-label test).

### LOW

**L1 — `utility-strip.tsx` ships with no test file.** *(pr-test-analyzer)* New component, static markup, no branches — low risk, but it's the one chrome component without the dedicated render test its siblings all got in this PR. Optional one-line `getByText` test for pattern parity; non-blocking.

---

## Verified clean (positive confirmations)

- **Chrome-scope regression (focus #1) — PREVENTED.** Root `app/layout.tsx` renders `<body>{children}` only, with an explicit "no chrome here" comment; `(default)/layout.tsx` owns `UtilityStrip`/`Header`/`ManifestTabStrip`/`<main>`/`Footer`. typescript-reviewer additionally confirmed `app/demo/page.tsx` imports no chrome — `/demo` is chrome-free. (Note the *guard* weakness in H1; the actual code is correct today.)
- **Server/client boundary (focus #3) — clean.** The server `(default)` layout projects `getAllFeatures().map(({slug,navLabel})=>({slug,navLabel}))` — two primitive strings — into the one `'use client'` island (`manifest-tab-strip`). `aria-current` uses exact `pathname === /features/${slug}`: exactly one active tab, no false-active on sub-routes, no trailing-slash risk (`next.config` default). type-design-analyzer independently returned APPROVE(0) on the boundary + `siteConfig` types (`as const`, single construction site, no invalid states).
- **AOS removal (focus #2) — complete.** `aos`/`@types/aos` gone from `package.json`/lockfile; `aos.css` + `theme.css` import removed; `theme.css` deleted. No `[data-aos]` opacity rule survives in `app/css`, so the residual inert `data-aos` attributes in `hero-home.tsx` (out of scope; dies in Slice 6) won't hide content.
- **A11y (focus #4).** Tab accessible name is `01{' '}Cases & Locations` — the deliberate `{' '}` yields a real space (pr-test-analyzer mutation-tested this: removing it breaks `getByRole('link',{name})`). Distinct landmarks: `<nav aria-label="Main">` (header), `<nav aria-label="Features">` (tab strip), `<nav aria-label="Footer">` (footer), plus `<main>` and `<footer>`. Logo is a `<Link href="/" aria-label={siteConfig.name}>` with aria-hidden inner spans; CTA is a `<Link>`.
- **Design fidelity vs canvas (focus #5).** All 8 chrome strings verbatim (`FVA DEVELOPMENT · FIELD TOOLS`, `CCTV RECOVERY · DOCUMENTED`, `IOS BETA — TESTFLIGHT · RECRUITING`, `ON-DEVICE · NTP-CALIBRATED · ENCRYPTED`, `Join the beta`, `The job`/`Live demo`/`Privacy`); all 4 CTA gold-gradient hexes (`#ffe06a`/`#f5c62e`/`#ffe786`/`#ffd93d`) match; crosshair logo, gold tab active state (border/bg/glow), and three-zone footer all present.
- **siteConfig contract (focus #6).** `nav` (4 links) + `cta` are `as const`; only `header` consumes them (footer hardcodes `FOOTER_LINKS` per design) — verified no orphaned consumer. Nav anchors resolve: `app/(default)/page.tsx` has `<section id="how-it-works">` and `<section id="features">`.

---

## Recommended fix (single commit)

1. **H1** — tighten `chrome-scope.test.tsx` positive (and ideally negative) assertions to JSX-tag regexes (`/<Header\b/`, `/<(FeatureNav|ManifestTabStrip)\b/`, `/<Footer\b/`).
2. **M1** — add the wordmark assertion to `header.test.tsx`.
3. **L1** *(optional)* — minimal `utility-strip.test.tsx` for parity.

Then push and send `type: fixes-done` naming the single fix SHA; the fix-delta will scope to `git show <sha>`.

---

## Pipeline notes

- **Cross-lane corroboration on H1:** the orchestrator independently flagged the `chrome-scope` guard as brittle (a LOW on capitalization coupling); pr-test-analyzer found the sharper import-vs-render failure mode and escalated to HIGH. Merged into one HIGH crediting both. The convergence is a strong signal the guard is genuinely under-strength.
- **Both code lanes re-verified pre-flight in isolated worktrees at `cf50a54`** rather than trusting the dirty tree (which carries later-slice WIP that fails tsc on an untracked test). Correct discipline.
- **REVISE is entirely test-guard tightening** — no production-code or design-fidelity defect was found in M-B.
