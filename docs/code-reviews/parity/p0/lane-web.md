# Lane: web — parity phase P0 (PR #29)

**Lane:** web (React/Next render + bundle performance, browser-API correctness, accessibility,
inline-style discipline, marketing↔demo isolation)
**Mode:** INITIAL — full review of the diff
**Refs reviewed:** `git diff master...feat/parity-p0` (21 commits, 57 files, +2482/−169), full files
behind every hunk plus their render parents (`ui/DemoExperience.tsx`, `ui/PhoneFrame.tsx`,
`ui/ScreenStage.tsx`), `features/demo/CLAUDE.md`, root `CLAUDE.md`,
`.claude/agents/web-reviewer.md`, `docs/code-reviews/deferred.md` §29–§31.

**Gates run in the worktree**

| Gate | Result |
|---|---|
| `npx vitest run` (full suite, run 1) | 864/865 — `DemoExperience.persistence.test.tsx` timed out at 5813 ms (see WEB-5) |
| `npx vitest run` (full suite, run 2) | 865/865 green |
| `npx vitest run features/demo/ui/__tests__/DemoExperience.persistence.test.tsx` | 3/3 green, 1.52 s |
| `npx next build` | ✓ compiled, types + lint clean, 19/19 static pages |

**Bundle / boundary status** — the wall is intact: `grep -rn "features/demo" components app/\(default\) lib app/layout.tsx`
returns only the two deliberate references in `components/marketing/phone-frame.tsx` (a comment) and
its guard test. `/demo` First Load JS is unchanged at **107 kB** (the demo is still lazily mounted via
`next/dynamic({ ssr: false })`); `mapbox-gl` and `pdfjs-dist` are still `await import`ed. No
`package.json` change, no new `'use client'` on a marketing file, no chrome hoisted into the root
layout, no new keyframes, no `demo.css` change, no `ui/motion.ts` change.

**Style-convention check** — I diffed every one of the ~25 `glass-tokens` substitutions against the
literal it replaced (`GLASS.border` = `1px solid #1e3a5f`, `glassBtnPrimary` = radius 10 / no border /
`linear-gradient(180deg,#35A0D6,#2580AD)` / `#fff`, `glassBtnSecondary` = radius 10 / `1px solid
#2a4a6f` / `#132236` / `#99badd`, `glassCard` = radius 12 / `1px solid rgba(30,58,95,0.5)` /
`linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))`, `GLASS.gridOverlay`, …). **All are
byte-identical** — this is dedupe, not a restyle, and the lifted device math (404 = 378 + 13×2) is
untouched. Spread ordering is safe everywhere: the spread always precedes the call-site's own
`fontSize`/`cursor`/`boxShadow` overrides and never re-sets a property the call site also sets, so no
"two strings fighting over the same property" hazard. `glass-tokens.ts` correctly omits `'use client'`,
matching its sibling non-component modules (`ui/motion.ts`, `ui/inputs/input-theme.ts`,
`ui/screens/screenData.ts`).

**Not re-flagged** (per the orchestrator's deliberate-choices list and `deferred.md` §19–§23, §29–§31):
map viewer-case / modal / drawer excluded from the snapshot, the 250 ms `pagehide` loss window,
`DemoErrorBoundary` being a class, the Export-Info no-free-text parity, the DVR-keeps vs
Cameras-clears asymmetry, dropped demo-only option values, `sessionStorage` over `localStorage`,
`Select…` placeholder copy, the near-miss style literals left untokenized.

Findings below: **0 BLOCKER · 1 MAJOR · 5 MINOR**.

---

## WEB-1 [MAJOR] features/demo/ui/screens/CamerasScreen.tsx:24-25,61,64,67,70

**Claim.** The per-camera custom-Resolution/FPS flags are stored in maps keyed by **array index**
while the camera rows themselves are keyed by **id**, and `onRemove` re-indexes the survivors. Removing
a camera therefore hands the wrong custom-mode flag to a different camera, which visibly flips a
correctly-configured row into "Other (Custom)" mode (or silently drops a custom row out of it).

**Evidence.**

- `features/demo/ui/screens/CamerasScreen.tsx:24-25`
  ```tsx
  const [customResolutions, setCustomResolutions] = useState<Record<number, boolean>>({})
  const [customFps, setCustomFps] = useState<Record<number, boolean>>({})
  ```
  read back at `:61` / `:64` / `:67` / `:70` as `customResolutions[i]` / `customFps[i]`, where `i` is
  the `cameras.map((c, i) => …)` index.
- The removal handler re-indexes: `features/demo/ui/DemoExperience.tsx:124`
  ```ts
  remove: (i: number) => write(list.filter((_, idx) => idx !== i)),
  ```
  wired to `onRemove={cam.remove}` (`DemoExperience.tsx:671`). Nothing re-keys the two maps.
- The screen does **not** remount on a data change: `ScreenStage.tsx:57` keys the animated wrapper on
  `view`, not on the camera list, so the stale index→flag mapping survives every edit within the
  Cameras screen.
- Not covered by the new tests: `features/demo/ui/screens/__tests__/option-parity.test.tsx` passes
  `onRemove={vi.fn()}` in every `CamerasScreen` case (lines 50, 114, 130, 143) — removal is never
  exercised.

**Failure scenario (reachable in ~6 taps from the Cameras screen).**
1. Add Camera 1 → Resolution → "Other (Custom)" → type `1440x900`. State: `customResolutions = {0: true}`.
2. Add Camera 2 → Resolution → "1920x1080 (1080p)". State: `customResolutions = {0: true, 1: false}`.
3. Tap **Remove** on Camera 1. The store list becomes `[camera2]`; camera 2 is now index 0.
4. Camera 2 renders `<SelectField value={CUSTOM_VALUE} …>` (`:61`), so its picker pill reads **"Other
   (Custom)"** instead of "1920x1080 (1080p)", and a spurious **"Custom Resolution"** free-text field
   appears below it pre-filled with `1920x1080`.

The inverse is equally reachable: with `{0: false, 1: true}`, removing camera 1 drops the *surviving*
custom camera out of custom mode — its free-text input disappears and its non-standard value becomes
uneditable (re-selecting "Other (Custom)" clears it, by the deliberate Cameras-clears rule).

**Suggested fix.** Key the flags by the stable row id rather than the index — a pure bug fix that
changes no option semantics and preserves the phone-verified clear-on-switch behavior:

```tsx
const [customResolutions, setCustomResolutions] = useState<Record<string, boolean>>({})
// …
setCustomResolutions((prev) => ({ ...prev, [cameraId]: true }))
// read: customResolutions[c.id]
```
The functional-updater form is worth adopting at the same time (`:29`, `:32`, `:39`, `:42` currently
spread the render-closure snapshot, so two selects changed in one tick clobber each other).

Optionally — and this *is* a divergence from the phone, so call it out if taken — seed the maps from
`isCustomResolution(c.resolution)` / `isCustomFps(c.recordingFps)` the way `DvrInfoScreen.tsx:41-42`
does, so a camera holding an imported or persisted free-text value reopens with its editable custom
field. Without seeding, a P0.4 refresh (or any navigation away and back) leaves such a value visible
in the pill but not editable.

If replication fidelity must win over correctness here, this needs a `deferred.md` entry with a
trigger rather than silence — the code comment at `:20-23` documents the index-keying as intentional
mirroring but does not acknowledge the desync it carries over.

**Confidence.** High — mechanism verified against all three files; symptom follows directly from
`filter` re-indexing plus `key={view}` remount scoping.

---

## WEB-2 [MINOR] features/demo/ui/chrome/DemoErrorBoundary.tsx:107-125

**Claim.** The new in-frame error fallback never takes focus. When it renders, the entire screen
subtree it replaced is unmounted, so whatever the visitor was focused on is destroyed and the browser
resets focus to `<body>` — a keyboard or screen-reader user loses their position and has to Tab back
in from the top of the document to reach the only recovery control.

**Evidence.**
- `DemoErrorBoundary.tsx:107` renders `<div role="alert" style={wrap}>` and `:118-124` the
  `Return to Cases` `<button type="button">`. There is no `autoFocus`, no `ref` + `.focus()`, and no
  `componentDidCatch`/`componentDidUpdate` focus move — `grep -rn "autoFocus\|\.focus()" features/demo/ui`
  returns exactly one hit repo-wide, `controls/ExitDialog.tsx:70`.
- `ExitDialog.tsx:70` is the in-repo idiom for exactly this situation: a newly-shown overlay puts
  `autoFocus` on its primary action.
- The lane contract requires focus management on new overlays and forbids leaving focus on an
  unmounted node (`.claude/agents/web-reviewer.md`, HIGH — Accessibility).

**Failure scenario.** A keyboard user is tabbing through the DVR Information form when a screen throws
(the integration test `DemoExperience.boundary.test.tsx` proves the path is real). `role="alert"`
announces "Something went wrong…" via the live region, but the next Tab starts from the document
start, walking the whole page before reaching "Return to Cases". Not a trap — the button is reachable —
but the visitor is silently relocated.

**Suggested fix.** Add `autoFocus` to the `Return to Cases` button (or hold a `ref` and focus it in
`componentDidCatch`). `role="alert"` already covers announcement; this covers keyboard position.

**Confidence.** High on the mechanism; MINOR because it only manifests on an error path and the
control remains reachable.

---

## WEB-3 [MINOR] features/demo/ui/DemoExperience.tsx:814-858

**Claim.** The boundary is rendered *inside* `DemoExperience`'s own output, so it cannot catch throws
originating in `DemoExperience`'s render — and a meaningful amount of derivation runs there. Those
throws still take out the whole `/demo` route, which is the exact outcome the boundary exists to
prevent, and there is no outer net.

**Evidence.**
- `DemoExperience.tsx:814` opens `<DemoErrorBoundary …>`; everything above it in the same return
  statement (and every expression evaluated to build the children) executes in `DemoExperience`'s
  render frame. React error boundaries cannot catch errors thrown by the component that renders them.
- Derivation that runs there, above the boundary:
  - `:816` `{activeScreen()}` — a plain function call, so its body runs during this render, including
    the `CompletionSummary` build at `:705-716` and the per-case `formList(...)` wiring.
  - `:824` `cases={caseCards.map((c) => ({ … cases.find(…) … }))}`
  - `:843` `items={selectDrawerItems(store.getState()).map((d) => { … })}`
- No outer boundary exists: `find app -name "error.tsx" -o -name "global-error.tsx"` returns nothing,
  and `app/demo/page.tsx` is a bare `dynamic(..., { ssr: false })` mount. A throw here falls through to
  Next's built-in client error page, losing frame, rail and route.
- The boundary's own docstring (`DemoErrorBoundary.tsx:69-73`) claims coverage "so a throwing
  screen/modal/overlay renders a glass fallback INSIDE the phone frame instead of white-screening the
  frame and rail" — accurate for child-component throws, but the bridge's derivation is neither.

**Suggested fix.** Add `app/demo/error.tsx` (a `'use client'` segment error boundary with a `reset()`
button) as the outer net for the bridge's own render, keeping the in-frame boundary as the good-looking
path for the common case. Alternatively push the derivations at `:816`/`:824`/`:843` down into the
children so they execute below the boundary.

**Confidence.** High that the gap exists (React semantics + verified absence of `error.tsx`);
MINOR because the in-frame boundary covers the majority of realistic throw sites and P0.1's stated
rows (6/40/70) are satisfied.

---

## WEB-4 [MINOR] features/demo/engine/store/persistence.ts:1

**Claim.** `zod` now ships to the browser for the first time in this repo. It is a defensible
trade (the `z.ZodType<DomainType>` annotations are what make snapshot-schema drift a compile error),
but it is an unrecorded bundle decision on the demo's already-heavy chunk group.

**Evidence.**
- `persistence.ts:1` — `import { z } from 'zod'`, a static import, pulled in eagerly by
  `DemoExperience.tsx:42` because `loadSnapshot` runs synchronously during the first render
  (`DemoExperience.tsx:162`), so it cannot be moved behind an `await import`.
- Before this PR zod was in no shipped bundle: `grep -rn "from 'zod'" app features lib components`
  returns `persistence.ts:1` and `lib/beta/schema.ts:1`, and the latter is imported only by its own
  test (`lib/beta/__tests__/schema.test.ts:2`) — no route or API handler uses it.
- Measured after `npx next build`: zod's runtime lands in the demo's chunk group
  (`.next/static/chunks/426.*.js` — matches `ZodError`, `ZodString`, `invalid_union_discriminator`).
  `/demo` First Load JS is **unchanged at 107 kB** because the demo is lazily mounted; the cost is paid
  on demo mount. zod 3 is ~13 kB gzip and is not meaningfully tree-shakeable.

**Suggested fix.** No code change requested. Record the trade in the PR body / `deferred.md` (first
client-side zod; ~13 kB gz on demo mount; accepted because the schema doubles as the compile-time
drift guard) so a future "why is zod in the demo bundle" question has an answer. If it ever needs to
go, the replacement is a hand-rolled predicate in the same file, not a lazy import.

**Confidence.** High on the facts (grep + build output); the severity is informational.

---

## WEB-5 [MINOR] features/demo/ui/__tests__/DemoExperience.persistence.test.tsx:20

**Claim.** The new persistence integration test uses the default 5 s timeout while the sibling suite
added in the same PR explicitly raises its timeout to 20 s for exactly this reason. It fails the merge
gate under parallel load.

**Evidence.** Reproduced, not inferred:
- Full-suite run 1: `× a remount after pagehide restores the visitor's case (the refresh survives)
  5813ms` → `Error: Test timed out in 5000ms`, 864/865.
- Same file in isolation: 3/3 green, `tests 1.52s`.
- Full-suite run 2 (lower contention): 865/865 green — i.e. flaky, not broken.
- The sibling `features/demo/ui/__tests__/DemoExperience.boundary.test.tsx:31,60,71` sets
  `{ timeout: 20000 }` on each `it`, with the comment "the first full-experience render is heavy under
  jsdom and this suite runs alongside sibling parity agents' suites (CPU contention, not a loop)".
  The persistence test renders `<DemoExperience />` **twice** in one `it` and carries no such guard.

**Suggested fix.** Add `{ timeout: 20000 }` to the remount test (and, for consistency, the other two in
that file), reusing the boundary suite's comment.

**Confidence.** High — directly observed. Flagging across lanes: the *ownership* of test tuning is
`test-analyzer`'s, but I hit it running the gate so it is reported here rather than dropped.

---

## WEB-6 [MINOR] features/demo/ui/inputs/Dropdown.tsx:69

**Claim.** The picker's `aria-label` overrides its text content, so the current selection is never
exposed to assistive tech. P0.3 widens this pre-existing gap, because the pill is now the *only* place
the display label ("1920x1080 (1080p)") and the custom-mode signal ("Other (Custom)") appear.

**Evidence.**
- `Dropdown.tsx:69` — `aria-label={label || placeholder}` on the trigger `<button>`. An `aria-label`
  wins over the element's contents in the accessible-name computation, so the value span at `:85-87`
  (`{selectedLabel || placeholder}`) is not announced. A screen reader reads "Resolution, menu pop-up
  button, collapsed" whether the field is empty, set to 1080p, or in custom mode.
- The change under review makes the pill semantically richer: `:38` introduces
  `selectedLabel = opts.find((o) => o.value === value)?.label ?? value`, and `DvrInfoScreen.tsx:80` /
  `CamerasScreen.tsx:61,64` pass `CUSTOM_VALUE` specifically so the pill reads "Other (Custom)" —
  a state a non-sighted user now cannot perceive at all.
- WCAG 2.1 SC 4.1.2 (Name, Role, Value): the value of a user-interface component must be
  programmatically determinable.

**Suggested fix.** Expose label + value together, e.g. `aria-labelledby` pointing at the existing label
`<div>` (`:61-63`, needs an id) plus the value `<span>`; or drop the `aria-label` and give the label
`<div>` a visually-hidden association. Note that `getByRole('button', { name: 'Resolution' })` queries
in `inputs/__tests__/Dropdown.test.tsx` and `screens/__tests__/option-parity.test.tsx` would need
updating, so this is a deliberate small change rather than a drive-by.

**Confidence.** High on the mechanism; MINOR and explicitly opportunistic — the `aria-label` predates
this diff, which is why it is not scored higher.

---

## Summary

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 1 |
| MINOR | 5 |

- **Marketing↔demo isolation:** preserved (grep + guard test + build route table).
- **Bundle impact:** `/demo` First Load JS unchanged (107 kB); zod newly present in the demo's lazy
  chunk group (~13 kB gz on demo mount) — WEB-4.
- **Browser-resource cleanup:** complete. The one new listener (`pagehide`,
  `DemoExperience.tsx:223`) is removed in the effect cleanup (`:225`), and `handle.dispose()` (`:226`)
  unsubscribes from the store (`persistence.ts:390,396-398`) after flushing the pending debounce timer
  (`:384-389`). No new object URLs, no new intervals, no new map/PDF instances.
  `window.sessionStorage` is read only inside `sessionStorageOrNull()` (`DemoExperience.tsx:108-115`),
  never at module scope, and is `try`-wrapped for Safari private-mode/blocked-storage — SSR-safe under
  `ssr: false`.
- **Accessibility:** two contained gaps (WEB-2 focus on the error fallback, WEB-6 picker value not
  in the accessible name). No regression to the existing tested idioms — `role="menuitemradio"` +
  `aria-checked` still track by value (`Dropdown.tsx:109,111`), `role="alert"` is correct for the new
  fallback, decorative SVGs carry `aria-hidden`.
- **Style-convention adherence:** correct half; all substitutions byte-identical; lifted rules and
  device math untouched.

**Verdict:** REVISE — fix WEB-1 (or log it in `deferred.md` with a trigger); the rest are notes.
