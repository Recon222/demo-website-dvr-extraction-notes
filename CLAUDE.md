# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

This repo is the Cruip **"Open PRO"** landing page template (Next.js App Router + React 19 + Tailwind CSS v4), used as the starting point for a **CCTV/DVR extraction notes** app. The committed code is still the unmodified marketing template (hero, features, testimonials, CTA, auth pages) — expect to replace template content/sections rather than extend a built-out product.

## Commands

`pnpm` is the configured package manager (see `packageManager` in `package.json`); the README recommends it. A stray `package-lock.json` may appear — prefer pnpm to keep `pnpm-lock.yaml` authoritative.

```bash
pnpm dev      # dev server with Turbopack at http://localhost:3000
pnpm build    # production build
pnpm start    # serve the production build
pnpm lint     # next lint (ESLint)
```

There is **no test runner configured** — no Jest/Vitest/Playwright setup exists yet.

## Architecture

### Routing — App Router with route groups
- `app/layout.tsx` is the **root layout**: imports global CSS, configures fonts (Google `Inter` + local `Nacelle` via `next/font`), and renders the global `<Header />` for every page.
- Route groups split layouts without affecting URLs:
  - `app/(default)/` — marketing pages. Its layout is a **client component** that initializes AOS scroll animations and renders `<Footer />`. Home page (`page.tsx`) composes section components.
  - `app/(auth)/` — sign in / sign up / reset password. Its layout adds illustrations, no footer.
- `app/api/*/route.ts` — Route Handlers (e.g. `app/api/hello/route.ts` exports `GET`). Note the README mentions `pages/api` but this project uses App Router route handlers, not the pages directory.

### Components
- `components/` — page section components (`hero-home`, `features`, `workflows`, `testimonials`, `cta`, etc.), mostly presentational.
- `components/ui/` — shared chrome: `header`, `footer`, `logo`.
- Mark components `"use client"` only when they use hooks/interactivity (e.g. `spotlight.tsx`, `modal-video.tsx`, `header.tsx`). Section components are otherwise server components.
- Modals/dialogs use `@headlessui/react`.

### Styling — Tailwind CSS v4 (CSS-first config)
- **There is no `tailwind.config.js`.** Configuration lives in CSS via the `@theme` directive in `app/css/style.css` — this is where the custom typography scale (`--text-*`), fonts, and keyframe animations (`shine`, `gradient`) are defined.
- `app/css/additional-styles/utility-patterns.css` defines reusable component classes (`.btn`, `.btn-sm`, `.form-input`, etc.) via `@apply`, imported as a `components` layer.
- `app/css/additional-styles/theme.css` holds further theme tokens.
- PostCSS uses `@tailwindcss/postcss` (`postcss.config.js`); the `@tailwindcss/forms` plugin is loaded inline in `style.css` via `@plugin`.
- v4 changed the default border color to `currentColor`; `style.css` has a `@layer base` compatibility shim restoring `--color-gray-200`. Keep this in mind when borders look off.

### Conventions & gotchas
- **Path alias:** `@/*` maps to the project root (`tsconfig.json`). Import as `@/components/...`, `@/utils/...`, `@/public/images/...`.
- Custom hooks live in `utils/` (`useMasonry`, `useMousePosition`) — DOM-measuring hooks that require client components.
- Scroll animations use AOS: add `data-aos="..."` / `data-aos-delay` attributes to elements. AOS is initialized once in the default layout and **disabled on phones**.
- SVGs and images are imported as modules from `@/public/...` and passed to `next/image` (static imports give `StaticImageData`).
- TypeScript is `strict`; `target` is `es5` with `jsx: preserve`.
- Local fonts are exposed as CSS variables (`--font-inter`, `--font-nacelle`) applied on `<body>`; use the `font-inter` / `font-nacelle` utilities.
