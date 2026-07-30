# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This repo is the marketing + beta-recruitment site for **DVR Extraction Notes** (a CCTV/DVR evidence-recovery iOS app by FVA Development), built on Next.js App Router + React 19 + Tailwind CSS v4 (originally the Cruip "Open PRO" template — long since replaced). It has two distinct halves:

- **Marketing pages** (`app/(default)/`, `components/`, `lib/content/`) — content-driven server components rendering the feature catalog in `lib/content/features.ts`. Being restyled to the **"Case File"** design system (see `docs/features/case-file-redesign/`).
- **The interactive demo** (`app/demo/`, `features/demo/`) — a self-contained client-only product demo with its own conventions; read `features/demo/CLAUDE.md` before touching it. **Marketing code must never import from `@/features/demo`** (it would pull mapbox-gl/pdfjs/motion into marketing bundles).

## Commands

`pnpm` is the configured package manager (see `packageManager` in `package.json`); the README recommends it. A stray `package-lock.json` may appear — prefer pnpm to keep `pnpm-lock.yaml` authoritative.

```bash
pnpm dev      # dev server with Turbopack at http://localhost:3000
pnpm build    # production build
pnpm start    # serve the production build
pnpm lint     # next lint (ESLint)
```

Tests run on **Vitest + jsdom + React Testing Library** (`vitest.config.mts`, setup `vitest.setup.ts`), co-located in `__tests__/` directories:

```bash
pnpm test           # vitest run (one-shot)
pnpm test:watch     # vitest watch
pnpm test:coverage  # coverage (80% thresholds on lib/** + features/demo/engine/**)
```

## Architecture

### Routing — App Router with route groups
- `app/layout.tsx` is the **root layout**: global CSS + fonts only (Google `Inter`, `Share Tech Mono`, `JetBrains Mono` + local `Nacelle` via `next/font`). It renders **no chrome** — `/demo` sits outside the `(default)` group and must stay chrome-free (guarded by `app/(default)/__tests__/chrome-scope.test.tsx`).
- `app/(default)/` — marketing pages. Its layout is a **server component** owning all marketing chrome: `Header`, `ManifestTabStrip` (the one client island, for the active tab), `Footer`, plus the ambient background (fixed blueprint grid, scan sweep, chrome glow).
- `app/demo/` — mounts the interactive demo (`@/features/demo`) with its own chrome; see `features/demo/CLAUDE.md` before touching it.
- `app/api/*/route.ts` — Route Handlers (App Router, not `pages/api`).

### Components
- `components/` + `components/home/` — marketing section components, content-driven from `lib/content/features.ts` (the catalog is the single source of truth; array order = manifest numbering).
- `components/ui/` — shared chrome: `header`, `manifest-tab-strip`, `footer`, `logo` (inline-SVG crosshair mark).
- Mark components `"use client"` only for hooks/interactivity (e.g. `manifest-tab-strip.tsx` for `usePathname`, `app-demo.tsx` for `useReducedMotion`). Section components are otherwise server components.

### Styling — Tailwind CSS v4 (CSS-first config)
- **There is no `tailwind.config.js`.** Configuration lives in CSS via the `@theme` directive in `app/css/style.css` — the typography scale (`--text-*`), fonts, the **Case-File design tokens** (`--color-ink-*`, `--color-carolina/blue/cyan/gold`, hairlines, text scale), and keyframes (`shine`, `gradient`, `scanSweep`, `blinkDot`, `glowPulse`, `flicker`). Exact token values are design-owned — see the handoff README in `Homepage and feature redesign/design_handoff_case_file_site/`.
- `app/css/additional-styles/utility-patterns.css` defines reusable component classes (`.btn`, `.btn-sm`, `.form-input`, etc.) via `@apply`, imported as a `components` layer.
- PostCSS uses `@tailwindcss/postcss` (`postcss.config.js`); the `@tailwindcss/forms` plugin is loaded inline in `style.css` via `@plugin`.
- v4 changed the default border color to `currentColor`; `style.css` has a `@layer base` compatibility shim restoring `--color-gray-200`. Keep this in mind when borders look off.
- A `prefers-reduced-motion` block pauses the Case-File ambient animations (class-matched only — the demo gates its own inline-styled motion via `useReducedMotion`).

### Conventions & gotchas
- **Path alias:** `@/*` maps to the project root (`tsconfig.json`). Import as `@/components/...`, `@/lib/...`, `@/public/images/...`.
- Custom hooks live in `lib/hooks/` (e.g. `useReducedMotion`) — client-component hooks.
- **No marketing file may import from `@/features/demo`** — that barrel pulls `mapbox-gl`/`pdfjs-dist`/`motion` into marketing bundles. The demo reuses nothing from marketing chrome and vice versa.
- SVGs and images are imported as modules from `@/public/...` and passed to `next/image` (static imports give `StaticImageData`).
- TypeScript is `strict`; `target` is `es5` with `jsx: preserve`.
- Fonts are exposed as CSS variables (`--font-inter`, `--font-nacelle`, `--font-stmono`, `--font-jbmono`) applied on `<body>`; use the `font-inter` / `font-nacelle` / `font-stmono` / `font-jbmono` utilities.

## Review workflow

Implementation PRs are reviewed by a multi-agent pipeline: **`/demo-code-review`** (`.claude/skills/demo-code-review/SKILL.md`). It fans out five read-only lane specialists in parallel — `typescript-reviewer`, `web-reviewer`, `test-analyzer`, `silent-failure-hunter`, `type-design-analyzer` (`.claude/agents/`) — verifies each finding against the code, then issues a strict decision: any CRITICAL → BLOCK, any HIGH → REVISE, otherwise APPROVE.

```bash
/demo-code-review            # current branch's PR
/demo-code-review 31         # a specific PR
/demo-code-review 31 --fix-delta   # re-review the fixes with the SAME reviewers resumed
```

- **Two modes.** The initial run dispatches fresh agents and records their agent IDs in the review doc. `--fix-delta` reads those IDs back and resumes the original reviewers with their full context, so each one judges the fixes to *its own* findings.
- **Every revision pass gets a fix-delta re-review before merge**, and the review artifacts are committed. Reviews live in `docs/code-reviews/` as `pr-<N>-review.md` and `pr-<N>-fixes-review.md`.
- **Merges are merge commits** — `gh pr merge <N> --merge --delete-branch`. Never squash, never rebase.
- **Commits are granular**, red and green together (the failing test and the code that passes it land in the same commit), and each fix commit maps to a review finding. Post the commit→finding table as a PR comment after each fix round.
- **This is the gate for the demo↔phone parity effort** — see `docs/planning/demo-phone-parity/01-master-parity-plan.md` §6. Brief every reviewer with the phase's package scope so they don't flag surfaces that are scheduled for a later phase.

### Deferral ledger

`docs/code-reviews/deferred.md` is the living record of findings deliberately **not** fixed. Log every deferral there **before merging**, in the house format — a numbered `## N. <title>` section with **Source**, **What**, **Why deferred**, and **Trigger**.

The ledger's bar is explicit and enforced by the fix-delta reviewers: *each entry needs a real reason to wait **and** a concrete un-defer trigger.* It is not a TODO dump — a vague deferral or a missing trigger is itself a review finding. Resolved entries are struck through and marked `✅ RESOLVED — PR #<N>` rather than deleted, so the history of the decision survives.
