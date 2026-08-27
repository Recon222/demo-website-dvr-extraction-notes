# Lane: tests — W4 (U8.1–U8.4, the closing wave), `feat/uiparity-w4` @ `def2aec` vs `master`

**Mode:** code review · **Lane question:** are the wave's new pins behaviourally meaningful, do they
pin what they claim, and would they catch a realistic regression?

**Pre-flight, cold, reproduced in my own probe worktree** (`probe-w4r-tests` @ `def2aec`, install 3.1 s):
`pnpm exec vitest run --silent=true` → **310 files / 4,326 passed | 2 todo (4,328), exit 0**;
`pnpm exec tsc --noEmit --incremental false` → **exit 0, 0 errors**;
`node .design-sync/check-rn-parity.mjs` → **exit 0, "all 145 anchor rows match"** (the guard RESOLVED,
it did not skip — I read the row output, not just the exit code). No pre-flight failure.
Motion mode **motion-ON** throughout; `navigator.mediaDevices` left undefined.

**Probe provenance:** every mutation applied to the **canonical source in my own worktree** — never to
`w4-wave`, never to the phone repo (read-only; the one DRIFT probe moved the **web** side only).
Verdicts from **exit codes**. Restore proven after each probe and at the end (`git diff def2aec --stat`
empty, suite re-green at 4,326).

---

## HIGH

*None.*

---

## MEDIUM

### [MEDIUM] D-2's first trigger arm cannot fire — it is keyed on an event that, by the deferral's own parenthesis, nothing observes; and I confirmed the previews are outside BOTH gates for a reason the row does not name
File: `docs/planning/demo-phone-ui-parity/reports/u8.4-implementation-report.md` D-2 (Trigger: *"**the next time a synced component's props change** (the guard that would have caught it does not exist)"*); the surface: `.design-sync/previews/*.tsx` (37 files) vs `features/demo/ui/**`
Issue: this is the round's real coverage question and the coordinator's hunt item 6. The ten-empty-cards repair (`a316f41`) fixed the instances; **no suite pin was added for the class**, and the author says so honestly (Defect 2). That part is fine — what is not is the ledger row that carries it. The campaign's bar is "a real reason to wait **and** a concrete un-defer trigger", and W2/§100's corrected close condition is the precedent: a trigger whose firing condition is itself invisible is the failure the bar exists to prevent. D-2 states the invisibility in its own parenthesis and then uses that event as its primary trigger. Its **second** arm ("the first W5/post-campaign package that touches `.design-sync/` tooling") is observable and is the one that should carry the row.
Evidence — **1 SURVIVED, 1 KILLED control**, plus a mechanism correction:
- **E1 (control)** — renamed `Banner`'s `message` prop inside `features/demo/ui/controls/Banner.tsx`: `tsc --noEmit` → **exit 2, 20 errors**, proving prop drift IS caught inside `features/`. **Zero** of those errors are in `.design-sync/` (`grep design-sync` on the output: empty).
- **E2** — `pnpm exec tsc --noEmit --listFiles | grep -c "design-sync/previews"` → **0**. The previews are not merely untyped, they are **not in the tsc program at all**, and the reason is not the one D-2 gives: `tsconfig.json:26` includes `**/*.tsx` with only `node_modules` excluded, but TypeScript's wildcard `include` **skips dot-directories**, so `.design-sync/` is invisible to the glob. D-2's prescribed `declare module 'open-pro-next'` would therefore fix nothing on its own — the row's own "plus a tsconfig change that widens the program" clause is not an extra, it is the load-bearing half, and the ordering matters to whoever executes it.
Why it matters on the use-day: the severity rides the day the trigger should fire, and that day has no reviewer. A W5 package changes a synced component's props, `pnpm test` stays green (310/310), `tsc` stays green, `check-rn-parity` stays green, and the design agent gets an empty card — the exact 10-of-37 failure this wave spent a commit repairing, with the row that was supposed to prevent the recurrence keyed on an event nobody sees.
Fix: re-cut D-2's trigger to its observable arm only, and record E2's mechanism in the row (dot-directory exclusion, so the tsconfig widening is prerequisite, not adjunct). If the aggregator wants the class closed in-suite instead, the cheap shape exists and is in-lane: a vitest `alias` for `open-pro-next` → `@/.design-sync/ds-entry` plus one `it.each(pinned)` that renders each preview and asserts the root is non-empty — the same `pinned` list `design-sync-entry.test.ts:39` already derives, so it needs no second roster.

---

## LOW

### [LOW] `teal-purge.test.ts` canonicalises SIX-digit hex only — the 8-digit `#rrggbbaa` form walks past a guard whose docblock says "every literal found … is CANONICALISED"
File: `features/demo/ui/__tests__/teal-purge.test.ts:88` (`/#[0-9a-fA-F]{6}\b|rgba?\(…/`), claim at `:36-46` ("The four spellings … every literal found — needle side and haystack side alike — is CANONICALISED to `#rrggbb` first")
Issue: `#[0-9a-fA-F]{6}\b` cannot match inside `#4ecdc4ff` — after six hex digits comes `f`, a word char, so `\b` fails and `{6}` does not backtrack. Every sibling hex scan in this repo uses `{3,8}` deliberately (`settings-palette-sweep.test.ts:100,117`, `CompletionScreen.test.tsx:158`, `status-owners.test.tsx:346`, `sheet-chrome.test.tsx:337`), and `banner.test.tsx:97` names `#rrggbbaa` by hand as a form to watch. So this file is narrower than the house pattern **and** narrower than its own stated convention 2, "shrink the claim to the pattern".
Evidence — **1 SURVIVED, 2 KILLED controls** (scope: the file, 3 cases):
- **T1 (control)** — `const t = 'rgb(78,205,196)'` planted in `controls/TabBar.tsx` → **KILLED**, 2 failed, naming `'controls/TabBar.tsx:#4ecdc4'`. The rgb-form canonicalisation the docblock advertises is real.
- **T3** — `const t = '#4ecdc4ff'` planted in the same file → **SURVIVED**, 3 passed, exit 0.
Bounded on purpose: **zero** 8-digit hex literals exist under `features/demo/ui/` today (measured), so nothing is live — this is a claim-vs-pattern gap on a closing-wave guard, not a hole with an occupant. Filed rather than dropped because it is the class this campaign has now filed in five consecutive waves, and this file is otherwise the best-built instance of the pattern the campaign has produced.
Fix: `{6}` → `{6}(?:[0-9a-fA-F]{2})?` (drop the trailing pair before comparing), plus one line in the existing planted-control case: `expect(canonicalTeals("color: '#4ecdc4ff'")).toEqual([TEAL])`. Re-run T3 and confirm the kill with T1 still killing.

---

## Hunt list — what I ran, and what it settled

| # | Item | Probes | Result |
|---|---|---|---|
| **1** | U8.1's replacement for the vacuous `α >= 0.65` floor — does the old hole stay closed, is the new pin two-sided? | **A1**: `SCANNER_DISCLOSURE_TEXT` alpha `0.8 → 0.65`, i.e. the exact value the deleted assertion ACCEPTED → **KILLED** (`palette-contrast.test.ts`, 1 failed). **A2**: the opposite direction, disclosure → full-strength `forced.text` (AA still passes, subordination broken) → **KILLED** (1 failed). | **Closed and two-sided.** The v1 assertion is deleted, not merely raised (`SplashScreen.test.tsx` diff shows the three `-` lines), and the replacement measures the composited ratio over `SCANNER_GROUND` rather than an alpha number, so D8-class ground moves are now visible. U8.1's own P1b — deliberately keeping a SURVIVED probe on the assertion it replaced, rather than quietly deleting it — is the right way to retire a vacuous pin and I confirm the successor kills in both directions. |
| **2** | U8.2's teal scan — allow-list keyed per F32/F66? anti-vacuity control kept? does canonicalisation really collapse the spellings? | **T1**: `rgb(78,205,196)` in a non-exempt file → **KILLED**, naming the file. **T2**: the exempt hex `#4ECDC4` planted in a SECOND non-exempt file (`DashboardScreen.tsx`) → **KILLED** — the site-keyed `ALLOWED` (`` `${path}:${hex}` ``) does what W2/F32 and W3/F66 prescribed, and this is the first W-wave guard that got it right on the first landing. **T6**: a D12 surface stops painting the teal → **KILLED** (dead-exemption half). **T3**: 8-digit form → SURVIVED (LOW above). | **Correct on all three counts asked.** The anti-vacuity control is kept, is asserted, and — the part that matters — runs the SAME `canonicalTeals` extraction the tree walk does, so a spelling the walk stops seeing the control stops seeing too. It also carries a negative control (`#4ecdc5`, `rgba(78,205,197,…)` must pass) and `files.length > 50`. |
| **3** | U8.2's LAST guard anchor (`gridSubtle`) — break it both ways | **G1** (DRIFT, web-side value `0.11 → 0.22`) → **exit 1**, `DRIFT  gridSubtle.dark  RN=rgba(153,186,221,0.11)  web=rgba(153,186,221,0.22)` + the "1 anchor row(s) drifted" summary. **G2** (RENAME, both halves of the web key) → **exit 1**, two `PARSE-FAILED … (field not found: gridSubtle)` rows. | **Live in both failure modes.** The anchor resolves (145 rows, not a skip) and each mode prints the row that broke. The phone side was not touched. |
| **4** | U8.3's cross-package red resolution — reds quoted, same commit? | Read `da3ec60`: body quotes both failures verbatim with file:line and the before/after exit codes; `git show --stat` confirms `TabBar.tsx` and `controls.test.tsx` land **in the same commit**. **T4** (revert the active tint to `#4BA3D4`) reproduces the quoted message **byte for byte**: `expected '#4BA3D4' to be '#2B8CC1' // Object.is equality`. **T5** (revert the flat `card` fill) → **KILLED**. | **Both W2-parked pins genuinely reddened here and were fixed red-and-green together.** The commit body is the best RED/GREEN record in the campaign — it names why U2.2 could not have done it and why this package is both first and last to touch them. |
| **5** | U8.4's permanent gates | **G3** (a component in `componentSrcMap` but dropped from the generated entry) → **KILLED**. **G4** (one `cardMode` override removed) → **KILLED**. **G5** (an orphan `dtsPropsFor` entry) → **KILLED** — the both-directions `toEqual` is real. **G6** (`#0d1b2a` planted in a preview) → **KILLED**. **B1** (`rgba(4, 8, 14, 0.55)` planted in a non-exempt file) → **KILLED**. **B2** (an exemption stops spelling its value) → **KILLED**. | **Six for six.** The entry gate is a REAL `await import()` of the generated module, not a source scan — the file's docblock names the string-presence trap and avoids it. Every gate is driven from `componentSrcMap` with no exemption list, so a component added later is covered with no edit; `pinned.length > 30` is the anti-vacuity control. The four-spelling halves are asserted as their own cases (`$name: the needle matches every spelling`), which is the shape I would have prescribed. |
| **6** | The ten-empty-cards repair — is there now a pin, or is it the `declare module` deferral? | **E1/E2** above. | **It is the deferral, and the deferral's primary trigger cannot fire** → the MEDIUM. The repair itself is sound and proven not-caused-here (`git diff 780399e` = 11 lines, all backdrop hexes). |
| **7** | Tautology sweep over all new pins | Read every new/changed test file in full. | **No tautology found.** `__tests__/jsdom-colour.ts` transforms the EXPECTED side only and **throws** rather than passing an unparsed value through, so it cannot launder a comparison; `PhoneFrame.test.tsx`'s grid pin compares the rendered element to `GLASS.gridOverlay` and fails closed on a missing element (`?? ''` vs a non-empty recipe); the contrast rows pin ratio AND identity-at-the-constant; the scanner-state sweep asserts `STATES` equals the three-arm union before iterating it. The one alias-shaped line (`toContain(strip(colors.gridSubtle))`) is redundant rather than vacuous — it sits beside a full-recipe equality, and `gridSubtle` is now a guard anchor and a banned bare literal. |

### Deleted pins — all four accounted for

The wave removes exactly four assertions, and each has a stronger successor I probed:

| Deleted | Where | Successor | Probe |
|---|---|---|---|
| `expect(alpha).toBeGreaterThanOrEqual(0.65)` | `SplashScreen.test.tsx` | the composited AA + subordination pair in `palette-contrast.test.ts` | A1 / A2 both **KILLED** |
| `expect(stroke('Export')).toBe('#4BA3D4')` | `controls.test.tsx` | `colors.primary`, read off the token | T4 **KILLED**, message verbatim |
| `expect(stroke('Map')).toBe('#5d7a9a')` | `controls.test.tsx` | `colors.textSecondary` | covered by the same case |
| the enclosing `it(…R-6)` block | `SplashScreen.test.tsx` | the `describe('scanner HUD (A87 / U8.1)')` suite, 8 cases | A1 / A2 |

**Nothing was weakened.** `features/demo/engine/logic/boot.ts` is the diff's only engine file and its
change is **comment-only** (a retired literal removed from prose), so the 80% gate is untouched.

---

## Probe ledger

**16 runs · 16 valid probes · 14 KILLED · 2 SURVIVED (both filed above: T3 the 8-digit teal form,
E2 the preview typecheck gap) · 0 equivalent/invalid.**

Worktree `worktrees/probe-w4r-tests` @ `def2aec`, branch `probe-w4r-tests`. One mutation per probe;
every verdict from the runner's exit code; every restore proven (`git status --porcelain` empty after
each) and at the end (`git diff def2aec --stat` empty, suite re-green at **310 files / 4,326 passed /
2 todo / exit 0**). The phone repo was never written to. Teardown via `tools/worktree-remove.ps1`:

```
node_modules/.pnpm entries BEFORE: 240
unlinked 549 junction(s) in 2 pass(es)
node_modules/.pnpm entries AFTER : 240
OK -- worktree removed, main checkout's .pnpm store intact (240 entries).
```

exit 0 · branch `probe-w4r-tests` deleted · `git worktree list` carries no `probe-*` row.

---

## Tests Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 1
Verdict: **APPROVE with comments**

Behaviourally meaningful coverage: **strong — the strongest of the four waves.** Fourteen of sixteen
probes killed, including every gate the brief named. Three things are worth recording as the
campaign's closing state rather than as findings: (a) U8.1 retired a vacuous pin by **keeping its
SURVIVED probe as the evidence** instead of deleting it quietly, which is the honest way to do it and
the first time this campaign has; (b) `teal-purge.test.ts` is the first new source-scan guard in five
waves to arrive site-keyed, with an asserted anti-vacuity control that runs the walk's own extraction
and a negative control one channel away — the F32 → F66 → here progression finally landed; (c)
`design-sync-entry.test.ts` pins reachability with a **real `await import()`** and drives every case
from `componentSrcMap`, so it has no roster to rot.

Engine coverage gate (80% on `lib/**` + `features/demo/engine/**`): **not applicable** — the only
engine file in the diff is a comment change to `boot.ts`. `screens/scanner-hud-colors.ts` is a
`ui/**` token record with no branching; it is nonetheless pinned harder than most engine code
(totality over `BootHudState`, per-state contrast rows, and the `SCANNER_SCHEME`-vs-app-`scheme`
distinction that `terminal-palette.test.ts` established).

Mock strategy: **at the IO edge.** No new mocks. The design-sync gates read `config.json` and import
the generated entry for real, which is the point.

Factory usage: **canonical.** No new fixtures; the new suites derive their rosters from
`componentSrcMap`, `Object.keys(SCANNER_COLORS)` and the `ALLOWED` maps rather than hand-typing them.

Setup-shim traps: **none.** Every new pin reads an inline style or a source file; nothing claims a
canvas, camera or reduced-motion path it does not install. `check-rn-parity` RESOLVED rather than
skipped — verified from the row output, per the `skipIf` hazard.

Determinism (clock / entropy injected): **yes** — no `Date.now()`/`Math.random()` in any new test.

Out-of-lane observations:
- U8.2's report measures the rgb-form needles for the RETIRED navy ramp at **fifteen live sites across eleven files** and correctly declines to widen `palette.test.ts`'s sweep inside a closing package. That is ledger §120's other half and it is now quantified; the aggregator has what it needs to size the row.
- U8.4's D-1 (`gen-dts-props.mjs` cannot print intersection types) leaves six undefined references in four emitted `.d.ts`. Contract-shape question, not a test question — type-design's call.
