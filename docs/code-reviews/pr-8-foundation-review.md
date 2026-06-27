# PR #8 Review — site foundation (consolidated #1–#8)

- **PR:** #8 — `feat: site foundation (consolidated #1–#8)`
- **Branch:** `feat/feature-nav-strip` → `master`
- **Reviewed:** 2026-06-27
- **Method:** six specialised review passes (code-review, comment-accuracy, test-quality, silent-failure, type-design, simplification) plus manual verification of every reported finding.
- **Scope reviewed:** the `lib/**` logic layer, the `components/**` and `app/(default)/**` wiring, and the Vitest config/specs. Visual/styling findings were excluded by request — theming is a later branch.

## Context for this document

The site is pre-users and about to take on a major additive feature, after which
parts of the navigation and several current pages will be re-thought. This review
therefore splits findings into:

- **Handled now** — internal correctness / data-model / shared-helper / test-integrity
  fixes that the upcoming feature work will build on. These are ~~struck through~~ and
  marked ✅ with their commit.
- **Deferred** — findings that are cosmetic, presentational, or tied to nav/pages that
  are being redesigned. Recorded here so they are not lost, to be revisited with (or
  after) the redesign.
- **Withdrawn** — findings that turned out to be non-issues or are already on the roadmap.

### Validation snapshot (after the "handled now" fixes)

| Check | Result |
|---|---|
| `pnpm test` | ✅ 56 passed (11 files) |
| `tsc --noEmit` | ✅ clean |
| `next build` | ✅ green — 18/18 static pages, all 10 `/features/[slug]` prerendered |

---

## ✅ Handled now

Internal fixes landed as granular commits on this branch. Each was TDD'd where it
changed behaviour (failing test observed first), or verified via `tsc` + the suite
for type-only changes.

1. ~~**Shared `toPublicUrl` helper duplicated, with a latent double-slash bug.**
   `AppDemo` had a private `toPublicUrl`; `FeaturePage` re-implemented the leading-slash
   rule as a bare `` `/${feature.diagram.src}` ``, which double-slashes an already-absolute
   path.~~
   ✅ **Completed** — extracted `lib/to-public-url.ts` (TDD'd: relative→absolute,
   absolute & `http(s)` pass through), adopted in both components. `7e65ca2`

2. ~~**WebM `<source>` fabricated for non-`.mp4` src.**
   `mp4Url.replace(/\.mp4$/, '.webm')` no-ops on any non-`.mp4` path, silently emitting
   two identical `<source>` elements.~~
   ✅ **Completed** — the `video/webm` source now renders only for genuine `.mp4`
   inputs; `.mp4` demos are unchanged. RED test added for the `.mov` case. `5c6d42c`

3. ~~**`draft?: boolean` admitted an incoherent `draft: false` state.**
   The content guard uses `!feature.draft`, so `false` and omitted are indistinguishable.~~
   ✅ **Completed** — narrowed to `draft?: true`; `draft: false` is now a compile error. `f17d182`

4. ~~**Feature catalog only shallowly read-only.**
   `Feature.rows` was a mutable `FeatureRow[]`, so `feature.rows.push(...)` on a shared
   reference would corrupt the module-level catalog; `getFeatureSlugs()` returned a
   mutable `string[]`.~~
   ✅ **Completed** — `rows: readonly FeatureRow[]`, `getFeatureSlugs(): readonly string[]`. `86fa4ad`

5. ~~**`order` was a redundant, hand-maintained source of truth.**
   Display order was both an `order` field (sorted by `getAllFeatures()`) and array
   position (used by `getFeatureSlugs()`); they coincided only by discipline, guarded
   by a test, and every mid-list insert required a renumber.~~
   ✅ **Completed** — array declaration order is now authoritative; `order` removed from
   the type and all 10 entries; `getAllFeatures()` returns the catalog as-authored (also
   removing the per-call spread+sort). Display output unchanged. `0ab4371`

6. ~~**`getAdjacentFeatures` conflated "unknown slug" with "feature at an edge."**
   Both returned `{ prev: undefined, next: undefined }`, so a caller skipping the
   existence check got no signal a slug was bogus.~~
   ✅ **Completed** — returns `null` for unknown slugs (distinct from an edge feature's
   `undefined` neighbour); the route adapts via `adjacent?.prev/next`. RED test added. `8b145bf`

7. ~~**`useReducedMotion` listener cleanup untested; dead SSR guard.**
   The unmount path (removing the `change` listener) had no test — a mismatched handler
   reference would leak silently. The `typeof window === 'undefined'` branch inside
   `useEffect` is unreachable (effects never run during SSR).~~
   ✅ **Completed** — added an unmount test asserting the exact registered handler is the
   one removed (verified it fails when cleanup is dropped); removed the dead guard,
   keeping only the `matchMedia` capability check. `5e1605a`

---

## ⏸️ Deferred — revisit with the redesign

These are real findings, but they are presentational or tied to navigation/pages that
are being re-thought, so fixing them now risks churn against the redesign. Kept here so
they are not forgotten.

### Important (do before public launch, but after the nav/page rethink settles)

- **Root layout ships create-next-app metadata.** `app/layout.tsx` still exports
  `title: "Create Next App"` / `description: "Generated by create next app"`. There is no
  `app/not-found.tsx`, so every 404 and any page without its own `metadata` inherits these.
  Fix with `siteConfig` values and a `title.template`. *(Deferred: metadata/SEO pass belongs
  with the content/redesign work.)*
- **Footer `<nav>` has no accessible name.** `components/ui/footer.tsx` renders a bare
  `<nav>`; on a feature page there are 3–4 nav landmarks and the footer is the only unlabeled
  one (WCAG 2.4.1). Commit `de8c7fd` labelled the others — the footer was missed.
  Fix: `aria-label="Footer"`. *(Deferred: footer is in the redesign's blast radius.)*
- **"Graceful media placeholder" doesn't engage when asset paths are pre-populated.**
  `AppDemo` shows the "Demo coming soon" placeholder only when `src` is *undefined*, and
  the catalog sets `media`/`diagram.src` paths now (before assets exist) — so feature pages
  render blank `<video>`/broken diagram `<img>` rather than the placeholder. Either leave
  paths unset until assets land, or add an `onError` fallback. *(Deferred: "looks broken"
  category; media production + styling phase owns this.)*
- **`notes` draft renders the literal "placeholder" in the grid.** `eyebrow`/`painLine`
  are `'placeholder'` and `FeatureGrid` renders them verbatim on the homepage and
  `/features`; the `Draft` badge only covers the detail page. Filter drafts from the grid
  or supply interim copy. *(Deferred: Kris's copy is pending; grid treatment of drafts will
  be reconsidered in the redesign.)*
- **`Header` `aria-label="Main"` is untested.** Unlike `FeatureNav`'s guarded name, removing
  the header's nav label fails no test. *(Deferred: the header nav is being redesigned — add
  the test against the new markup rather than the soon-to-change one.)*

### Advisory

- **CTA detected by hardcoded `item.href === '/beta'`** (`header.tsx`) — couples primary-button
  styling to a URL. Add a `cta?: true` field on the `siteConfig.nav` item shape. *(Deferred:
  header redesign.)*
- **`HEADING` bakes in `pb-4`, then `page.tsx` appends `pb-6` via string interpolation** —
  both land in the class list; which wins depends on CSS source order. Use `cn(HEADING, 'pb-6')`.
  *(Deferred: cosmetic; homepage is being re-thought.)*
- **`prefers-reduced-motion` flash** — `useReducedMotion` SSRs `false`, so the autoplay
  `<video>` is briefly in the initial HTML before the post-mount swap. Acceptable tradeoff
  (avoids hydration mismatch); a future `dynamic(AppDemo, { ssr: false })` removes it. Moot
  while media assets are absent.
- **Slug uniqueness is still test-enforced, not type-enforced.** The `order` landmine is gone,
  but duplicate `slug`s remain caught only by a spec (`getFeatureBySlug`/`generateStaticParams`/
  React keys would all break on a dup). A slug-keyed `Record` catalog would make it a compile
  error — worth considering **if/when the catalog is restructured** in the redesign, not as a
  pre-emptive change now.
- **Smaller test gaps:** diagram `<img>` alt text, `FeatureGrid` eyebrow rendering, and
  `FeatureNav` active-state on the `/features` index / trailing-slash are unasserted. Low risk;
  fold into the redesign's test pass.

### Comment hygiene (low value, catalog copy is being reworked)

- `lib/content/features.ts` docblock: *"`title`/`eyebrow` are being rewritten separately"* reads
  as in-progress for settled copy — drop or convert to a tracked TODO.
- `reports` entry's `// PROVISIONAL …` note has no flag or guard behind it and will rot. Add a
  `draft: true` (if it should be treated as draft) or a tracked TODO when the constraint is real.

---

## ✅/N/A Withdrawn

- **PR body claims slice 3 `lib/beta/*` shipped, but it's absent.** Confirmed with the author:
  the beta signup logic (validation + service + `WaitlistStore` port + memory adapter) was
  **intentionally deferred and remains the next planned slice** — it was listed in the PR's
  review map in error. No work was lost. Action: correct the PR body's slice table; no code
  change. *(Withdrawn from the actionable review — already on the roadmap.)*

---

## Notes

- The deferred backlog in `docs/code-reviews/deferred.md` (e.g. the "FeatureNav mounted
  site-wide" decision) remains valid and is unaffected by this pass.
- Strengths confirmed during review: the `lib/**` logic is well-tested with behavioural
  (not smoke) assertions; the "keep placeholder copy out of shipped features" guard is a
  genuine regression net; `generateStaticParams`/`generateMetadata`/`notFound()` are correct
  for Next.js 15; the template prune left no dangling imports.
