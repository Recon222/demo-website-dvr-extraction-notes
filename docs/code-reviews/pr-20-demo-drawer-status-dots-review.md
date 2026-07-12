# PR 20 — Aggregate Code Review

**PR:** [#20](https://github.com/Recon222/demo-website-dvr-extraction-notes/pull/20) — `feat(demo): wizard drawer completion dots + field-parity audit`
**Branch:** `feat/demo-drawer-status-dots` → `master` · **10 files, +1165 / −3**
**Reviewers (fresh fan-out):** typescript-reviewer · type-design-analyzer · silent-failure-hunter · pr-test-analyzer · code-simplifier · react-reviewer
**Date:** 2026-06-29

## Verdict
**APPROVE (with comments).**

The completion-dots feature (implementing deferred #22 from PR #19) is small, correct, and well-built. The decisive check — **are the per-screen "counted field" lists actually right?** — was answered by two lanes independently: typescript and silent-failure each cross-referenced every screen's fields against its component and **both found all mappings correct**, with the excluded fields (`serialModelNumber`, `mediaPlayerIncluded`, toggles, derived/read-only) correctly absent. The reactivity, store-bridge, and type plumbing are clean. The comments are all MEDIUM/LOW: a color-only accessibility gap on the dots (React rated it HIGH; calibrated to MEDIUM below — see the note), a cluster of test-coverage gaps over verified-correct code, and one documented product judgment (`serialModelNumber` exclusion) worth your explicit sign-off.

**Scope note:** This review covers **only the dots code** (`selectors.ts`, `DemoExperience.tsx`, `WizardDrawer.tsx` + tests). The bundled **field-parity audit** (`docs/planning/field-parity/*`, ~939 lines) is a *planning artifact for future work* — its accuracy/completeness was not code-reviewed and is not part of this verdict.

## Pre-flight gates

| Gate | Result |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `pnpm test` | ✅ **75 files / 542 passed** |
| Dependencies | None added |

## Reviewer lanes

Diff-driven triage for a selector-logic + small-UI PR: typescript (selector correctness) · type-design (the status types) · silent-failure (does the dot lie?) · tests · simplifier · react (dot reactivity + render). No security lane (no surface).

## Reviewer verdicts at a glance

| Lane | C | H | M | L | Verdict |
|---|---|---|---|---|---|
| typescript-reviewer | 0 | 0 | 0 | 1 | APPROVE |
| type-design-analyzer | 0 | 0 | 0 | 3 | APPROVE |
| silent-failure-hunter | 0 | 0 | 1 | 1 | PASS (w/ note) |
| pr-test-analyzer | 0 | 0 | 1* | — | APPROVE (gaps) |
| code-simplifier | 0 | 0 | 0 | 2 | APPROVE |
| react-reviewer | 0 | 1* | 0 | 0 | BLOCK (its lane) |

<sub>*pr-test rated its gaps "Critical/Important" in coverage terms — aggregated to MEDIUM (the code is verified-correct; the gap is regression-protection). *react rated the a11y finding HIGH — aggregated to MEDIUM (rationale inline). Neither moves the gate.</sub>

**Aggregate decision: APPROVE (with comments)** — 0 CRITICAL · 0 HIGH (after the a11y calibration below).

## Findings (deduped, ranked by severity)

### CRITICAL / HIGH
None confirmed. (React's a11y finding is calibrated to MEDIUM below; if your team holds a strict WCAG bar, treat M1 as a REVISE-blocker.)

### MEDIUM

**M1 — Completion dots convey status by color alone; not exposed to assistive tech.** _(react — lane-rated HIGH; orchestrator-calibrated MEDIUM)_ — `WizardDrawer.tsx:133-134`. Complete (green) vs partial (amber) differ **only by color** (same shape/size/position → WCAG 1.4.1, a colorblind sighted user can't distinguish them), and the dot `<div>`s carry no text/aria, so a screen-reader user hears only the item label — none of the status a sighted user gets. **Calibration:** I land this at MEDIUM, not HIGH, because the dots are an *additive* enhancement over drawer items that were already fully label-accessible (this PR doesn't regress a11y), and `/demo` is a non-production showcase (the React lane itself noted the practical impact is limited). It's a real gap with a trivial fix, surfaced transparently so you can decide — a strict-a11y stance would make it a REVISE.
→ **Fix (≈2 lines/item):** `aria-label={it.status ? \`${it.label}, ${it.status}\` : it.label}` on the item button + `aria-hidden="true"` on each dot; and for 1.4.1, distinguish complete/partial by more than hue (e.g. a check vs half/ring glyph, or a tiny shape difference).

**M2 — Test coverage: 5 of 10 screens lack a `partial`/`complete` assertion, and the `dvrInfo`/`exportInfo` exclusion tests are false-coverage.** _(pr-test)_ — `__tests__/drawer-status.test.ts`. The `dvrInfo`/`exportInfo` tests pin only that an *excluded* field keeps the screen `'empty'` — but `checkFields([])` and `checkFields([excludedOnly])` both return `'empty'`, so those tests would **still pass even if the entire counted-field list were broken**. Also untested: the `extractedScope` `'complete'` branch (a unique code path), and the `arrivalDeparture`/`cameras` array `partial`/`complete` states. **Context:** typescript + silent-failure verified the field lists *are* currently correct, so this is regression-protection debt, not a live bug — but it's a real trap (the strongest tests, `submission` and `requestedScope`, show the right pattern; the rest should follow). → Add the per-screen `complete`/`partial` assertions (the analyzer supplied them).

**M3 — `serialModelNumber` exclusion is a documented false-green you should sign off.** _(silent-failure — "not a silent failure per se")_ — `selectors.ts:126`. `DvrInfoScreen` renders a visible "Serial / Model Number" field, but it's excluded from the count, so `dvrInfo` goes green with it blank. This is a **deliberate, author-documented judgment** (plan doc + selector JSDoc), and the author explicitly asked the reviewer to eyeball whether the counted set is right. Not a defect — flagged so you confirm the intent. (If serial should gate green, it's a one-line add to the `checkFields` array.) The author's other DVR judgment — *including* `dvrUsername`/`dvrPassword` in the count — biases the *conservative* way (a credential-free DVR stays amber, never a false green); LOW, also flagged in the plan as tunable.

### LOW

- **L1 — `extractedScope` diverges from `checkArray` (no all-empty→empty arm) with no in-code signal.** _(type-design + simplifier, convergent)_ — `selectors.ts:125`. Intentional and correct (a present-but-blank *generated* scope reads `'partial'`, not `'empty'`; verified by silent-failure: only `generateExtractedScopes` populates it, and a blank `cameras` legitimately → amber), and it's tested. But the inline nested ternary doesn't signal the deliberate divergence — extract a named `checkExtractedScope` helper or add a one-line comment.
- **L2 — `DrawerStatus`'s `'empty'` and `DrawerItem.status = undefined` have no type-level link.** _(type-design)_ — add `export type VisibleDotStatus = Exclude<DrawerStatus, 'empty'>` and type `DrawerItem.status?: VisibleDotStatus` so the `'empty'`→`undefined` bridge is a compile-checked fact.
- **L3 — Null-branch hardcodes all 10 `WizardScreenId` keys.** _(type-design + simplifier, convergent)_ — both lanes agree the explicit literal is **the safer choice** (TS enforces totality at the call site; an `Object.fromEntries` derivation needs an `as` cast that loses that check). No action recommended; noted only.
- **L4 — The two dot `<div>`s share 4 of 6 style props.** _(simplifier, safe)_ — a `DOT_COLORS` map + single `{it.status && <div data-dot={it.status} style={{…, ...DOT_COLORS[it.status]}} />}` dedupes them verbatim (and pairs naturally with the M1 a11y fix). Judgment call — the explicit pair is also legible.
- **L5 — Pre-existing: the item-label `<span>` lacks `minWidth:0`/`flex:1 1 auto`** so `textOverflow:ellipsis` may not fire against the new dot in a narrow drawer with a long label. _(typescript)_ Not introduced by this PR (current labels are short enough that it doesn't manifest); noted for completeness.

## Architecture invariants checked & confirmed

- **Every per-screen field mapping is correct** — verified independently by **two lanes** (typescript + silent-failure) against the actual screen components. Counted fields match what each screen edits; the excluded set (`serialModelNumber`, `mediaPlayerIncluded`, `recordingSchedule`, `totalDvrRetention`, `gps`, and all toggles via `isFilled`'s string-only guard) is correctly absent. No wrong-but-valid field that would silently stick a dot.
- **Dots are reactive, no staleness** — `selectDrawerStatus(currentLocation)` is recomputed each render from reactive `useStore` reads (`locations`/`currentLocationId`); a field edit → new location ref → recompute. The non-reactive `selectDrawerItems(store.getState())` is correctly only the visible-screens set, not the dot data.
- **Store-bridge intact** — `selectDrawerStatus` is called only in `DemoExperience`; `WizardDrawer` stays presentational.
- **No PR #19 interference** — the dots render inside the item button (in the scrollable list), not as `AnimatePresence` children, so the keyed exit animation is untouched. Keys use `it.id`.
- **Type plumbing sound** — `Record<WizardScreenId, DrawerStatus>` totality guarantees every screen has a status; the `'empty'`→`undefined` bridge is type-narrowed (`'empty'` cannot reach `DrawerItem.status`).
- **`completion: 'empty'` always** is correct (no store-editable fields on that screen; the `isComplete` flag is local React state).

## Recommended next steps

Two small, high-value follow-ups: **(M1)** the dot a11y — `aria-label` with status + `aria-hidden` on the dots + a non-color complete/partial distinction (decide whether your a11y bar makes this a pre-merge blocker); **(M2)** the per-screen `complete`/`partial` test assertions to close the false-coverage gap (the code is correct today; this protects it). **(M3)** is a one-line decision: confirm `serialModelNumber` shouldn't gate the green dot. The L-items (extractedScope helper/comment, `Exclude` alias, dot-`<div>` dedup) are tidy-when-convenient.

## Agent IDs
<!-- Used by a fix-delta re-review to resume these reviewers via SendMessage. -->
- typescript-reviewer: `ac74e68bf2f57d0e9`
- type-design-analyzer: `a300dda77366b6c63`
- silent-failure-hunter: `a6d9da9ada2e52b6e`
- pr-test-analyzer: `a067b27b0c970e69f`
- code-simplifier: `abd127486941a969c`
- react-reviewer: `a2d35d64653ef3825`
- security-reviewer: not dispatched (no surface)

## Reviewer pipeline notes

- **The decisive question got dual-lane verification:** "are the counted-field lists correct?" — typescript and silent-failure each independently cross-referenced all 10 screens against their components and agreed they're correct. That convergence is what lets the pr-test false-coverage finding land as regression-protection (MEDIUM) rather than a lying-dot bug, and what makes the `serialModelNumber` item a *documented judgment* rather than an oversight.
- **A genuine false-coverage trap, well-articulated:** the `dvrInfo`/`exportInfo` exclusion tests pass even if the whole counted list breaks — exactly the kind of "test that pins the wrong side" the test lane exists to catch.
- **Transparent severity calibration:** React rated the color-only dots HIGH on a11y-correctness grounds (and said so honestly while noting the demo context); I aggregated MEDIUM because the dots are additive over already-accessible labels on a non-production surface. Surfaced rather than silently downgraded — and flagged that a strict-a11y team should treat it as a blocker. Consistent with the PR #17 aria-controls calibration.
- **Convergence on the small stuff too:** the `extractedScope` divergence (type-design + simplifier → name/comment it) and the null-record verbosity (type-design + simplifier → keep it, TS-enforced) both got two-lane agreement.
