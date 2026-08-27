# Plan review r2 — REALITY-CHECK lane (post-ratification edit)

**Scope:** `git diff 1024a0b HEAD -- docs/planning/demo-phone-ui-parity/0*.md` (`ba1921d`) — matrix +185/−…, plan +303/−…, new `02-ratification-brief.md`. Only the **new codebase claims** the edit introduced, per brief.
**Sources:** demo worktree; phone repo `extraction_case_notes_react_native_expo` @ `main` **read-only**; main checkout `demo-website-dvr-extraction-notes` for `.claude/**` on `master`.

## Findings

### REAL-R2-1 [LOW] U0.1's `primaryLight` sweep is 41 sites across **19** files, not 20

**Doc claim** — plan U0.1: *"`primaryLight #4BA3D4` — **correction: it is already KEYED** at `screens/map/mapTokens.ts:58` with one reader (`MapControls.tsx:234`) … The bare-literal sweep is **41 sites across 20 files**, **4 of them lowercase**."*

**Reality check** — `grep -rin "4BA3D4" features/demo app lib`, excluding `__tests__` and `engine/logic/case-map/template.ts` per the brief:

| | |
|---|---|
| total hits | **42** |
| distinct files | **20** |
| lowercase (`4ba3d4`) | **4** ✓ |
| the keyed definition | `mapTokens.ts:58` — `primaryLight: '#4BA3D4',` ✓ |
| bare sites (42 − the definition) | **41** ✓ |
| files containing a **bare** site | **19** — `mapTokens.ts` holds exactly one `4BA3D4`, the definition itself |

So `41` and `4 lowercase` are exact; `20` is the file count of the *whole* set including the definition. Pair them consistently: **41 sites across 19 files**, or 42 across 20.

**Why it matters:** only that an implementer sweeping "20 files" finds 19 and wonders which one they missed. LOW.

**Fix:** *"The bare-literal sweep is **41 sites across 19 files**, **4 of them lowercase** (`mapTokens.ts` holds only the keyed definition)."*

---

## Verified true

### U0.1 — the `primaryLight` correction

| Claim | Confirmed |
|---|---|
| *"it is already KEYED at `screens/map/mapTokens.ts:58`"* | `:58` = `primaryLight: '#4BA3D4',`; `:57` = `/** \`Colors.dark.primaryLight\` */`. **Exact** — the r1 draft's "a bare literal 40×, no key" was wrong and this correction is right. |
| *"with one reader (`MapControls.tsx:234`)"* | `:234` = `color: activeFilterCount > 0 ? MAP_GLASS_COLORS.primaryLight : MAP_GLASS_COLORS.textSecondary`. A repo-wide grep for `primaryLight` outside `mapTokens.ts` and `__tests__` returns this one consumer; the other four hits are bare `#4BA3D4` literals with `// colors.primaryLight` comments (`ImportTerminalProgress.tsx:183`, `TerminalLine.tsx:36,43,46`), not readers of the key. **Exactly one reader.** |
| *"4 of them lowercase"* | 4. **Exact.** |
| *"U5.1 re-points the map key to an alias"* | Consistent — `mapTokens.ts` is in U5's file set (U5.1/U5.2/U5.4), and the wave-3 conflict row already serialises it. |

### U0.5 — the `glass-tokens.test.ts` mechanism analysis

Every sub-claim opened at source (`features/demo/ui/__tests__/glass-tokens.test.ts`, 124L). This cell is accurate throughout.

| Claim | Confirmed at |
|---|---|
| *"`:16` roots at `features/demo/ui`"* | `:16` = `const UI_ROOT = join(process.cwd(), 'features', 'demo', 'ui')` |
| *"`:19-30` walks recursively"* | `sourceFiles()` spans exactly `:19-30`, recursing at `:24` |
| *"skipping `__tests__` **directories**"* | `:24` = `if (entry.name !== '__tests__') out.push(...sourceFiles(full))` — a directory-level check |
| *"skipping source files by **BASENAME** (`entry.name !== 'glass-tokens.ts'`, `:25`)"* | `:25` verbatim. **Exact.** |
| *"today **any file named `glass-tokens.ts` at any depth is skipped**"* | Follows directly from the basename test at `:25`. The latent hole is real. |
| *"`BANNED` is exactly **10** `[name, literal]` tuples (`:33-44`)"* | Declared `:33`, ten entries `:34-43`, closed `:44`. **Exactly 10.** |
| *"matched by **`text.includes(literal)`** (`:72`) — a **substring** test"* | `:72` = `if (text.includes(literal)) {` |
| *"the `gridOverlay` entry bans only the **first** of its two repeating-gradients"* | `:38` bans the `0deg` gradient only; `GLASS.gridOverlay` (`glass-tokens.ts:36-37`) is `0deg` **plus** `90deg`. **Correct.** |
| *"`relative` and `sep` are already imported at `:3`"* | `:3` = `import { join, relative, sep } from 'node:path'` |
| *"the exact `relative(UI_ROOT, …).split(sep).join('/')` idiom is already used at `:73`"* | `:73` = `offenders.push(\`${relative(UI_ROOT, file).split(sep).join('/')} re-inlines the ${name} (${literal})\`)`. **Byte-exact idiom.** |
| *"`palette.ts` is **not** an offender 'by construction' — the current 10 literals are the OLD palette"* | All ten `BANNED` entries are pre-campaign values (`rgba(19,34,54,…)`, `#35A0D6`, `#1e3a5f`, `#2a4a6f`, …). Correct, and the ordering consequence follows. |

### U0.5 — the light-half contrast claims (new under D2)

| Claim | Confirmed at |
|---|---|
| *"the phone's own pin asserts `>= 3.79` for BOTH themes"* | `palette-contrast.test.ts:205-206` — `Colors.dark.textTertiary` / `DARK_GROUNDS` and `Colors.light.textTertiary` / `LIGHT_GROUNDS`, both `toBeGreaterThanOrEqual(3.79)`. **Exact.** |
| *"3.79 is the *dark* number — light carries ~0.08 of unasserted slack"* | The phone's own comment at `:183-185`: *"dark 3.79 (ruling M2b), light 3.87 … Only the DARK ceiling is actually pinned: the next test holds both themes to >= 3.79, so light carries ~0.08 of unasserted slack."* The plan is a faithful paraphrase, **including the 0.08**. |
| *"light `textTertiary` at 3.87 (DEF-063)"* | `Colors.ts:33` — *"Measures 3.87:1 on the worst light glass stop"*; cross-referenced at `:148`. |
| *"light `textSecondary`'s 3.97 nested floor (DEF-UI-014)"* | `palette-contrast.test.ts:13` — *"muted text ramp DEF-063 / DEF-UI-009 / 014 floor 3.97 (secondary)"*. |
| *"pin light at its own 3.87"* | Sound: the current assertion leaves the light ceiling unguarded, exactly as the source comment says. |

### D2 (amended) — the both-halves premise

The load-bearing new claim: *"the palette module carries the phone's `light` and `dark` records **under one key set**"*, and *"nothing in the port hard-codes a dark value that has a light sibling on the phone."*

| Claim | Confirmed |
|---|---|
| `Colors.light` and `Colors.dark` are key-identical | Parsed both records: **45 keys each**, **light-only = NONE**, **dark-only = NONE**. The symmetry is real — consistent with the `Colors.ts:238` note that the eight deleted tokens (`accent*`, `blueprint*`, `tech*`, `gridAccent`) *"lived only in the dark half"* and `ThemeColors` is the union. |
| `GlassColors` halves carry the same tiers | Both `light` and `dark` define exactly **`card`, `nestedCard`, `elevated`, `header`, `sheet`, `recessed`** — six each, same names, same order. |

D2 amended rests on a symmetry that actually exists in the source. Nothing to flag.

### The wave table's disjointness assertions

Package file sets extracted from §5's Files column and intersected.

| Assertion | Result |
|---|---|
| *"U1's **14 files** vs U3.1's one (`ui/tokens/palette.ts`) → ∅"* | U1's set is **exactly 14** files; `palette.ts` is **not** among them. **∅ confirmed.** |
| *"**U2 ∩ U3 = ∅** — that is D19's re-cut paying off, and it is checkable"* | By the Files column: **∅**. U2 = 22 files, U3 = 6 (`Banner`, `CasesScreen`, `DashboardScreen`, `LocationRow`, `palette.ts`, `status.ts`); no member in common. |
| *"**U5 ∩ U6 = U5 ∩ U7 = U6 ∩ U7 = ∅**"* | All three intersections **empty**. U5 = 9 files, U6 = 13, U7 = 14, pairwise disjoint. **Confirmed.** |

**Nuance, checked and not raised as a finding.** A strict *touched-file* intersection of U2 and U3 is non-empty — U3.4's A80 empty-state sweep reaches `ExportCaseCard.tsx:211`, which U2.4 also opens. The plan states this itself, three times: U3.4's own cell says *"A80's ten sites include files owned by U2.4 (`ExportCaseCard.tsx:211`), U4.4/U7.2 (`MediaLibrarySheet.tsx:494-505`) and U5.2/U5.3 (`LocationList.tsx:159-172`, `MapScreen.tsx:105-117`) — **it touches only the empty-state block in each and opens those files for nothing else**"*; the wave-2 conflict table lists `ExportCaseCard.tsx → U2.4 and U3.4's A80 sweep` with a fixed merge order. Verified at source that the two ranges are genuinely disjoint blocks of a 220-line file: `:68-82` is U2.4's tri-state checkbox, `:211` is the italic empty state. The "∅" is an ownership claim, correctly qualified where it matters.

### `.claude/**` paths cited in the two docs

Checked with `git cat-file -e master:<path>` in the main checkout.

| Path | On `master` |
|---|---|
| `.claude/skills/fleet-orchestration/SKILL.md` | ✓ |
| `.claude/skills/fleet-orchestration/hazard-playbook.md` | ✓ |
| `.claude/skills/fleet-orchestration/reviewer-contract.md` | ✓ |
| `.claude/skills/mutation-testing/SKILL.md` | ✓ |
| `.claude/agents/type-design-analyzer.md` | ✓ |
| `.claude/agents/opus-implementer*.md` | ✓ all three — `opus-implementer.md`, `-high.md`, `-max.md` |
| `.claude/agents/plan-*.md` | ✓ all three — `plan-architect-reviewer.md`, `plan-quality-checker.md`, `plan-reality-checker.md` |
| `.claude/agents/*-reviewer.md` | ✓ `plan-architect-reviewer.md`, `typescript-reviewer.md`, `web-reviewer.md` |

Also confirmed present, since the docs now depend on them by name: the five §6.5 lane reviewers (`typescript-reviewer`, `web-reviewer`, `test-analyzer`, `silent-failure-hunter`, `type-design-analyzer`) and **`dt-review-aggregator.md`** — newly named in the matrix as *"the sole writer"* of `deferred.md`. All exist.

`fleet-orchestration/SKILL.md:119` carries the fan-out rule the plan cites (S-sized work belongs *"in a warm agent's existing worktree"*), so §6.3's application of it is grounded.

**Out of scope, checked anyway:** `.claude/agents/ui-consistency-implementer.md` is **not** on the demo's `master` — but it is cited only at `phone-ui-delta-inventory.md:18300`, is a **phone-repo** path, and does exist there with `#000314` / ruling D5(a) at `:43` as claimed. Not a finding: it is outside this round's `0*.md` scope and the citation is correct for the repo it names.

---

## Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | **1** |

New claims checked: **~45** across the five groups. Verified true: **44**. Flagged: **1**.

The ratification edit's new codebase claims hold up. Two are worth calling out as improvements on the round-1 text rather than merely correct: U0.1's `primaryLight` entry **self-corrects** an error the earlier draft carried (it was described as an unkeyed bare literal; it is keyed, with one reader — both verified), and U0.5's banned-literal analysis is accurate down to the substring-match semantics and the half-banned `gridOverlay` gradient. D2's amendment rests on a real 45-key symmetry in the phone's `Colors.ts` and a matching six-tier symmetry in `GlassColors`, so shipping both halves is grounded rather than aspirational.

**Verdict: APPROVE** (one LOW, a file count off by one).
