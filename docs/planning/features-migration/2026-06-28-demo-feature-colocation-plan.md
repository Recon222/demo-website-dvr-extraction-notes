# Demo Feature Colocation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the interactive demo from the split `components/demo/` (UI) + `lib/demo/` (engine) into one self-contained feature module at `features/demo/{ui,engine}` with a single public barrel, so the whole demo lives under one tree (and one `CLAUDE.md`).

**Architecture:** A behavior-preserving file move. Two trees relocate via `git mv` (history-preserving), `@/`-aliased import prefixes are rewritten with a single `sed` pass per tree, the public surface collapses to one barrel `features/demo/index.ts`, and the route entry `app/demo/page.tsx` (which must stay in `app/`) is repointed at it. No source logic, no styles, and no tests change content — only locations and import paths.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Zustand · Vitest + jsdom + Testing Library · pnpm.

## Global Constraints

- **Behavior must not change.** This is a pure refactor. The existing test suite is the contract; it stays green at every slice (see Regression-Verification Protocol).
- **`app/` is the only Next.js-reserved directory.** `app/demo/page.tsx` stays in `app/`; only its import target changes. Nothing else in Next has directory meaning — a root-level `features/` is ordinary code.
- **Path alias is unchanged:** `tsconfig.json` keeps `"@/*": ["./*"]` (maps to project root). A root-level `features/demo` therefore resolves as `@/features/demo` with **zero tsconfig changes**. Do **not** introduce a `src/` directory (it would force an alias change that breaks every other `@/` import in the marketing site).
- **Use `git mv`** for all moves so diffs render as renames and history is preserved.
- **Run every command from the repo root** (`…/demo-website-dvr-extraction-notes/`), in Git Bash. The shell is GNU (`git grep`, `sed -i`, `xargs -r` all available).
- **Import-prefix mapping (exact):**
  - `@/lib/demo` → `@/features/demo/engine`
  - `@/components/demo` → `@/features/demo/ui`
  - then the single bare consumer `app/demo/page.tsx` → `@/features/demo` (the public barrel)
- **Collision guard:** the marketing component `@/components/app-demo` (and `components/app-demo.tsx` + its test) is **not** part of the interactive demo. The substring `@/components/demo` does not occur inside `@/components/app-demo`, so the `sed` pass cannot touch it — but verify after each rewrite.
- **Timing:** land this as its own PR **after** the in-flight `feat/demo-parity-fixes` work is merged. An ~80-file rename will conflict with any concurrent demo branch.

---

## Why there is no separate TDD test spec

TDD's red→green loop specifies *new behavior*: write a failing test, then code until it passes. This migration adds **no behavior** — it relocates files and rewrites import strings. There is nothing new to assert, so authoring new "failing" tests would be theater.

The correct discipline for a behavior-preserving refactor is **invariance**: the *existing* suite is the specification, and it must stay green after every slice. So instead of a test spec, this plan carries a **Regression-Verification Protocol**: capture a baseline, then re-run the same gates after each slice and require identical results. That is the refactor-equivalent of "tests pass."

(If a slice ever *needs* a test change to stay green, that is a signal the move altered behavior — stop and investigate; do not edit the test to match.)

## Regression-Verification Protocol

**Baseline (Task 0), captured once before any change — record these exact numbers:**

| Gate | Command | Record |
|------|---------|--------|
| Unit/component tests | `pnpm test` | total **test files** + **tests** passed (e.g. "N files, M tests") |
| Production build | `pnpm build` | exits 0, `/demo` route present in output |
| Lint | `pnpm lint` | exits 0 (note any pre-existing warnings) |
| Typecheck | `pnpm exec tsc --noEmit` | exits 0 |

**Per-slice gate:** after each task, re-run `pnpm test` and `pnpm build`; the test counts must **equal the baseline** and the build must stay green. The final task additionally re-runs `pnpm lint` and `pnpm exec tsc --noEmit`.

**Invariant checks (grep-based), run where each task specifies:**
- `git grep -n '@/lib/demo' -- '*.ts' '*.tsx'` → **no output** after Task 1.
- `git grep -n '@/components/demo' -- '*.ts' '*.tsx'` → **no output** after Task 2.
- `git grep -n '@/components/app-demo' -- '*.ts' '*.tsx'` → **unchanged** (marketing refs survive) throughout.

---

## File Structure

**Before:**

```
components/demo/            # UI layer (all 'use client')
  index.ts                 # public barrel: exports DemoExperience
  DemoExperience.tsx        # the store/director bridge
  PhoneFrame.tsx  StoryRail.tsx  TouchIndicator.tsx  usePhoneScale.ts
  CLAUDE.md                 # currently UI-scoped
  screens/  controls/  chrome/  primitives/  (+ co-located __tests__/)
lib/demo/                   # pure engine (no React)
  index.ts                 # engine barrel (internal API)
  store/  director/  logic/  content/  types/  (+ co-located __tests__/)
app/demo/page.tsx           # route: dynamic import of @/components/demo
lib/  (cn.ts, site-config.ts, to-public-url.ts, content/, hooks/)   # NON-demo — stays
components/  (hero-home.tsx, app-demo.tsx, ui/, home/, …)            # NON-demo — stays
```

**After:**

```
features/demo/
  index.ts                 # SINGLE public barrel: export { DemoExperience } from '@/features/demo/ui/DemoExperience'
  CLAUDE.md                 # whole-feature doc (ui + engine)
  ui/                       # was components/demo (minus its index.ts, promoted up)
    DemoExperience.tsx  PhoneFrame.tsx  StoryRail.tsx  TouchIndicator.tsx  usePhoneScale.ts
    screens/  controls/  chrome/  primitives/  (+ __tests__/)
  engine/                   # was lib/demo
    index.ts               # engine barrel (internal API, bare @/features/demo/engine)
    store/  director/  logic/  content/  types/  (+ __tests__/)
app/demo/page.tsx           # route: dynamic import of @/features/demo
lib/                        # unchanged (non-demo)
components/                 # unchanged (non-demo, incl. app-demo.tsx)
```

**Config touched:**
- `vitest.config.mts` — coverage `include` gains the engine's new path.
- `next.config.js` — add `eslint.dirs` so `next lint` covers `features/`.

---

## Preconditions

- [ ] `feat/demo-parity-fixes` is merged to `master`; no other branch is actively editing `components/demo/` or `lib/demo/`.
- [ ] Working tree is clean (`git status` empty).

---

### Task 0: Branch + capture the baseline

**Files:** none (gate only).

- [ ] **Step 1: Branch from up-to-date master**

```bash
git switch master
git pull --ff-only
git switch -c refactor/demo-feature-colocation
```

- [ ] **Step 2: Ensure deps installed**

```bash
pnpm install
```

- [ ] **Step 3: Capture the baseline (record the outputs)**

```bash
pnpm test           # record: "<N> test files, <M> tests passed"
pnpm build          # record: exits 0
pnpm lint           # record: exits 0 (+ any pre-existing warnings)
pnpm exec tsc --noEmit   # record: exits 0
```

Expected: all four succeed. Write the test-file/test counts somewhere visible — they are the equality target for every later slice. **Do not proceed if any gate is red at baseline** (fix or report first; this plan assumes a green start).

---

### Task 1: Move the engine → `features/demo/engine`

**Files:**
- Move: `lib/demo/**` → `features/demo/engine/**` (via `git mv`)
- Rewrite imports in: every tracked `*.ts`/`*.tsx` containing `@/lib/demo`
- Modify: `vitest.config.mts` (coverage `include`)

**Interfaces:**
- Produces: the engine's public API now resolves at the bare barrel `@/features/demo/engine` (was `@/lib/demo`) and at sub-paths `@/features/demo/engine/<...>`. Consumers in Task 2 rely on these new paths.

- [ ] **Step 1: Move the tree** (create the parent first — `git mv` won't make intermediate dirs)

```bash
mkdir -p features/demo
git mv lib/demo features/demo/engine
```

- [ ] **Step 2: Rewrite the engine import prefix across all tracked TS/TSX**

```bash
git grep -l '@/lib/demo' -- '*.ts' '*.tsx' | xargs -r sed -i 's#@/lib/demo#@/features/demo/engine#g'
```

(`git grep` only sees tracked files, so `node_modules`/`.next` are skipped automatically. `xargs -r` is a no-op if there are zero matches. `#` is the `sed` delimiter so the `/` in paths needs no escaping.)

- [ ] **Step 3: Verify no engine stragglers remain**

```bash
git grep -n '@/lib/demo' -- '*.ts' '*.tsx'
```

Expected: **no output**.

- [ ] **Step 4: Update Vitest coverage to include the engine's new location**

In `vitest.config.mts`, the `coverage.include` array currently reads:

```ts
      include: ['lib/**/*.{ts,tsx}'],
```

Change it to (keep `lib/**` — it still holds non-demo code like `cn.ts`/`site-config.ts` that is part of the 80% gate; add the engine's new path):

```ts
      include: ['lib/**/*.{ts,tsx}', 'features/demo/engine/**/*.{ts,tsx}'],
```

- [ ] **Step 5: Verify the slice is green** (UI still at `components/demo`, now importing the new engine paths; route still imports `@/components/demo` and still resolves)

```bash
pnpm test     # test counts must equal the Task 0 baseline
pnpm build    # exits 0
```

Expected: identical test counts to baseline; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(demo): relocate engine to features/demo/engine"
```

---

### Task 2: Move the UI → `features/demo/ui` + collapse to one public barrel

**Files:**
- Move: `components/demo/**` → `features/demo/ui/**` (via `git mv`)
- Promote: `features/demo/ui/index.ts` → `features/demo/index.ts` (the single public barrel)
- Rewrite imports in: every tracked `*.ts`/`*.tsx` containing `@/components/demo`
- Modify: `app/demo/page.tsx` (repoint the route at the public barrel)

**Interfaces:**
- Consumes: engine paths from Task 1 (`@/features/demo/engine*`).
- Produces: `features/demo/index.ts` exports `{ DemoExperience }`; UI sub-modules resolve at `@/features/demo/ui/<...>`. The route consumes the bare public barrel `@/features/demo`.

- [ ] **Step 1: Move the UI tree** (`features/demo/` exists from Task 1)

```bash
git mv components/demo features/demo/ui
```

- [ ] **Step 2: Promote the barrel to the feature root**

```bash
git mv features/demo/ui/index.ts features/demo/index.ts
```

- [ ] **Step 3: Rewrite the UI import prefix across all tracked TS/TSX**

```bash
git grep -l '@/components/demo' -- '*.ts' '*.tsx' | xargs -r sed -i 's#@/components/demo#@/features/demo/ui#g'
```

After this, `features/demo/index.ts` reads `export { DemoExperience } from '@/features/demo/ui/DemoExperience'` (the rewrite fixed its body), and `app/demo/page.tsx`'s dynamic import became `import('@/features/demo/ui')` — which has no barrel and must be repointed in Step 4.

- [ ] **Step 4: Repoint the route at the single public barrel**

In `app/demo/page.tsx`, change the dynamic import target from `@/features/demo/ui` to `@/features/demo`:

```ts
const DemoExperience = dynamic(() => import('@/features/demo').then((m) => m.DemoExperience), {
  ssr: false,
})
```

- [ ] **Step 5: Verify the rewrite + collision guard**

```bash
git grep -n '@/components/demo' -- '*.ts' '*.tsx'        # expected: no output
git grep -n '@/components/app-demo' -- '*.ts' '*.tsx'    # expected: marketing refs STILL present (untouched)
```

- [ ] **Step 6: Verify the slice is green**

```bash
pnpm test     # counts must equal the Task 0 baseline
pnpm build    # exits 0
```

Expected: identical test counts; build succeeds. (Optional manual smoke: `pnpm dev`, open `http://localhost:3000/demo`, confirm the guided tour renders and `?mode=sandbox` is interactive.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(demo): relocate UI to features/demo/ui; collapse to one public barrel"
```

---

### Task 3: Wire `features/` into ESLint

**Files:**
- Modify: `next.config.js`

**Interfaces:**
- Consumes: the `features/` tree from Tasks 1–2.

**Why:** `next lint` only lints a fixed default directory set (`app`, `components`, `lib`, `pages`, `src`) — a root-level `features/` is **silently skipped** unless declared. Without this, `pnpm lint` would go green by *not looking* at the moved code. (`utils/` is intentionally omitted — it does not exist in this repo; `pages/`/`src/` are omitted for the same reason.)

- [ ] **Step 1: Declare the lint directories**

Replace the contents of `next.config.js` with:

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['app', 'components', 'lib', 'features'],
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: Confirm lint now covers `features/` and is green**

```bash
pnpm lint
```

Expected: exits 0, and the run includes `features/` files (no "directory not found" error; any warnings should match the baseline set, not new ones from unlinted code suddenly appearing).

- [ ] **Step 3: Commit**

```bash
git add next.config.js
git commit -m "chore(lint): include features/ in next lint dirs"
```

---

### Task 4: Consolidate the feature doc into `features/demo/CLAUDE.md`

**Files:**
- Move: `features/demo/ui/CLAUDE.md` → `features/demo/CLAUDE.md`
- Modify: the moved `CLAUDE.md` (rescope from "UI layer" to "whole feature"; fix paths)
- Modify: `docs/features/interactive-demo/02-interactive-demo-implementation-plan.md` (one stale `@/components/demo` prose reference)

**Why:** the existing demo `CLAUDE.md` (written while the code was split) currently sits at `components/demo/` and describes only the UI layer, treating `lib/demo` as a sibling engine. After Task 2 it landed at `features/demo/ui/CLAUDE.md`. Move it up to the feature root and rescope it so one file documents both `ui/` and `engine/` — the whole point of the migration.

- [ ] **Step 1: Move the doc to the feature root**

```bash
git mv features/demo/ui/CLAUDE.md features/demo/CLAUDE.md
```

- [ ] **Step 2: Rescope and fix the paths inside `features/demo/CLAUDE.md`**

Apply these exact textual updates (the file is the one created during planning):

1. Replace the scope blockquote at the top:

   *From:*
   ```
   > Scope: this file covers `components/demo/` — the **UI layer** of the interactive product demo.
   > The state/choreography **engine** it depends on lives in the sibling `lib/demo/` tree.
   ```
   *To:*
   ```
   > Scope: this file covers `features/demo/` — the **entire** interactive product demo:
   > the UI layer in `ui/` and the state/choreography **engine** in `engine/`.
   ```

2. Global path substitutions throughout the file (prose + code references):
   - `components/demo/` → `features/demo/ui/`
   - `lib/demo/` → `features/demo/engine/`
   - `@/components/demo` → `@/features/demo/ui`
   - `@/lib/demo` → `@/features/demo/engine`
   - the public-barrel mention `index.ts` re-exports **only** `DemoExperience` → note it now lives at `features/demo/index.ts`.

3. In the "Layout of this folder" section, reframe the two top-level groups as `ui/` (was `components/demo`) and `engine/` (was `lib/demo`) sub-trees under `features/demo/`.

4. In "Adding or changing a screen", update the engine file paths (`lib/demo/types/index.ts` → `features/demo/engine/types/index.ts`, `lib/demo/content/screens.ts` → `features/demo/engine/content/screens.ts`, `lib/demo/content/narration.ts` → `features/demo/engine/content/narration.ts`, `lib/demo/director/beats.ts` → `features/demo/engine/director/beats.ts`) and the UI path (`screens/`, `DemoExperience.tsx` now under `features/demo/ui/`).

5. In the "Commands" / coverage note, update "coverage thresholds … apply only to `lib/**`" → "apply to the engine (`features/demo/engine/**`) and the rest of `lib/**`".

- [ ] **Step 3: Fix the stale reference in the implementation-plan doc**

In `docs/features/interactive-demo/02-interactive-demo-implementation-plan.md`, update the single `@/components/demo` reference to `@/features/demo` (public barrel) so the historical plan doc doesn't point at a path that no longer exists. (This is prose only — no code impact.)

- [ ] **Step 4: Sanity-check no doc now points at a moved code path**

```bash
git grep -n '@/components/demo\|@/lib/demo' -- '*.md'
```

Expected: no output (or only clearly-historical mentions you intend to keep — there should be none after Steps 2–3).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "docs(demo): consolidate CLAUDE.md at features/demo; fix migrated paths"
```

---

### Task 5: Final full verification + cleanup

**Files:** none (gate + tidy).

- [ ] **Step 1: Confirm the old trees are gone and the new one is whole**

```bash
git grep -n '@/components/demo\|@/lib/demo' -- '*.ts' '*.tsx'   # expected: no output
ls features/demo                                                # expected: index.ts  CLAUDE.md  ui/  engine/
test ! -e components/demo && test ! -e lib/demo && echo "old trees removed"
```

Expected: no stragglers; `features/demo` contains `index.ts`, `CLAUDE.md`, `ui/`, `engine/`; old dirs are gone.

- [ ] **Step 2: Run the full gate set and compare to baseline**

```bash
pnpm test              # test counts == Task 0 baseline
pnpm exec tsc --noEmit # exits 0
pnpm lint              # exits 0, covers features/
pnpm build             # exits 0, /demo route present
```

Expected: every gate matches the Task 0 baseline. If test counts differ, a file or test was lost in a move — investigate before proceeding (do not "fix" by editing tests).

- [ ] **Step 3: Manual smoke of the route**

```bash
pnpm dev
```

Open `http://localhost:3000/demo`:
- `?mode=guided` (default): guided tour auto-plays, phone is pointer-locked, StoryRail narration advances.
- `?mode=sandbox`: phone is interactive; create a case / location works.
- `?step=time-offset`: jumps to the Time Offset chapter.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin refactor/demo-feature-colocation
```

Open a PR titled **"refactor(demo): colocate demo into features/demo"**. In the description, note: pure move (no behavior change), baseline vs. final test counts are equal, and the reviewer should expect a rename-heavy diff (`git mv` preserves history — use the PR's "hide whitespace"/rename view).

---

## Rollback

Each task is its own commit, so `git revert <sha>` (or `git reset --hard` before pushing) backs out cleanly. Because every move is `git mv`, reverting restores the original paths and import strings exactly. If a slice's gate is red and the cause isn't obvious within a few minutes, revert that slice's commit and re-attempt rather than patching forward.

## Self-Review (performed against the migration spec)

- **Coverage of intent:** trees moved (T1, T2); single public barrel (T2); route repointed (T2); `src/` avoided, alias untouched (Global Constraints); lint covers `features/` (T3); one whole-feature `CLAUDE.md` (T4); green at every slice (Protocol + per-task gates).
- **Type/path consistency:** prefix map is applied identically in T1/T2; the only non-prefix edit is the single bare consumer `app/demo/page.tsx` → `@/features/demo`, confirmed the sole bare `@/components/demo` import. The engine's bare barrel consumer (`engine/__tests__/barrel.test.ts`) is handled by the prefix rewrite (`@/lib/demo` → `@/features/demo/engine` resolves to `engine/index.ts`).
- **Coverage-config correctness:** `lib/**` is *kept* (non-demo code still gated) and `features/demo/engine/**` *added* — engine coverage is preserved, not dropped; UI stays out of coverage as before (only `engine/**`, not `features/demo/**`, is added).
- **Collision:** `@/components/app-demo` cannot match `@/components/demo` (substring differs); verified explicitly in T2/T5.
