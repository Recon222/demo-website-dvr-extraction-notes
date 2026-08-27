# Lane: type-design — Wave 4 (U8.1 boot gate · U8.2 grid/teal · U8.3 tab bar · U8.4 design-sync)

**Mode:** code review (round 1) · **Tree:** `worktrees/w4-wave` @ `def2aec`, read-only ·
**Scope:** `git diff master...def2aec` — 9 non-test source files, 1 new
(`ui/screens/scanner-hud-colors.ts`), plus `.design-sync/` (generator, config, 4 new previews).

**Probes:** `probe-w4r-td-types`, own worktree off `def2aec`, `pnpm install --prefer-offline` 11 s.
Baseline BEFORE any mutation: `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental
false` -> **EXIT 0**. Restores proven byte-identical (`git diff --stat` empty). Torn down via
`tools/worktree-remove.ps1` — **"unlinked 549 junction(s) in 2 pass(es)"**, `.pnpm` 240 to 240,
exit 0; branch deleted. One probe (DS1) ran on a scratch file OUTSIDE the repository, using the
repo's own `tsc`; nothing was written into either tree.
**Provenance: every mutation was applied to the CANONICAL source file, never a mirror.**

---

## HIGH

```
[HIGH] Two of U8.4's regenerated .d.ts contracts do not preserve the types they were generated
       from — one of them inverts its own prop, the other re-publishes the accessibility hole
       W3/F74 closed one wave ago
Type: cfg.dtsPropsFor entries for `MapFiltersSheet` and `OverlayHeader`
File: .design-sync/config.json (the generated contracts) · .design-sync/gen-dts-props.mjs:119
      (touch-point a) and :144 + :198-210 (touch-point b)
Issue: U8.4 correctly un-froze a generator that had been a silent no-op ("24 of 33 entries were
  stale, some since v1"), which is the right fix and the wave's most valuable finding. But two of
  the freshly generated entries are now WRONG, and `NOTES.md:98-101` states the stakes in its own
  words: *"the `.d.ts` IS the API contract the design agent codes against."* Both defects survive
  the `all .d.ts parse cleanly` gate, because both are well-formed TypeScript that means something
  other than the source.

  (a) THE DRIVER — operator precedence in the array branch. `gen-dts-props.mjs:119` is
      `if (type.isArray()) return `${printType(elementType, …)}[]`` with no parenthesisation of
      the element. `readonly LocationMapStatus[]` therefore emits as
      `'started' | 'working' | 'complete'[]`, which TypeScript reads as
      `'started' | 'working' | ('complete'[])`. Measured across all 37 entries, this is the only
      one affected — it needs a union-typed array element, and `MapFiltersSheet` has the wave's
      only two (`activeStatuses` and `onStatusToggle`'s parameter, `MapFiltersSheet.tsx:69,76`).

  (b) The intersection-of-union collapse. `OverlayHeaderProps` is
      `OverlayHeaderBase & OverlayHeaderControl` where the control half is the discriminated pair
      `{ onBack(): void; backLabel: string } | { onBack?: undefined; backLabel?: undefined }`
      (`OverlayHeader.tsx:112-116`). `propsBody` walks `getProperties()` on the props type
      (`:198-210`), so the pair's apparent properties are read and its structure is discarded: the
      emitted contract is `backLabel?: string; onBack?: () => void; …` — two independent
      optionals, which is the EXACT shape W3/F74 was filed against and fixed.
      `NOTES.md:115-121` discloses the missing intersection branch, but only its OTHER symptom
      (`type.getText()` fall-through leaving five dangling names). This one produces a clean,
      plausible, wrong contract and is not disclosed anywhere.

MUTATION PROBE DS1 — the two contracts transcribed VERBATIM from `config.json` into a scratch
  file outside the repository, checked with the repo's own tsc (`--strict --skipLibCheck`):

    activeStatuses: ['started', 'working']      <- what the real component takes
      -> TS2322  Type '("started" | "working")[]' is not assignable to type
                 '"started" | "working" | "complete"[]'          REJECTED
    activeStatuses: 'started'                   <- a BARE STRING
      -> no error                                                ACCEPTED
    { variant: 'glass', onBack: () => {} }      <- F74's illegal nameless-icon-button state
      -> no error                                                ACCEPTED

  The array contract is wrong in BOTH directions in one run: it forbids the component's real
  input and admits a value the component would break on. The negative control is the same run's
  third line resolving against a different interface, and `tsc` produced exactly one diagnostic —
  so the check is live, not blind.
Downstream consequence: the design agent codes against these files and there is no reviewer on
  the day it does. Against (a) it will pass `activeStatuses="started"` — a bare string into
  `activeStatuses.includes(status)` (`MapFiltersSheet.tsx:320`), which on a string is a substring
  test, so every chip renders pressed — and it cannot write the correct array without fighting a
  type error. Against (b) it is told the nameless-icon-button state is legal, which is the
  screen-reader hole `OverlayHeader.tsx:97-106` documents at length and W3 spent a finding
  closing; the generated contract now contradicts the source comment sitting six lines above it.
Fix: two lines in the generator, then re-run it — the round already established that re-running
  is the gate.
  (a) `:119` -> parenthesise a union element:
      `const el = printType(type.getArrayElementType(), node, depth); return el.includes(' | ')
       ? `(${el})[]` : `${el}[]``
  (b) add the `type.isIntersection()` arm `NOTES.md:120-121` already prescribes for the other
      symptom, and make it (or `propsBody`) print a union-of-object props type as a union rather
      than flattening to apparent properties. If that is judged too large for this wave, the
      honest interim is to record `OverlayHeader` as a KNOWN-LOSSY contract in `NOTES.md` beside
      the five dangling names — the same disclosure the intersection gap already gets — so the
      round does not ship a silent one. Say which.
```

---

## LOW

```
[LOW] `boot.ts`'s comment names ONE compile-time guard for a fourth HUD state; U8.1 added a
      second in this same wave, so the sentence a future editor will re-verify is now false
Type: the `BootHudState` docblock at features/demo/engine/logic/boot.ts:44-46
Issue: the comment reads: "SplashScreen's statusBody is Record<BootHudState, ReactNode> and is
  THE ONLY THING that turns a fourth member into a compile error — verified by probe: adding one
  yields exactly one TS2741, there." That was true when written. U8.1 then added
  `SCANNER_COLORS … as const satisfies Record<BootHudState, ScannerStateColors>`
  (`scanner-hud-colors.ts:104`), a second total record over the same union — and its own docblock
  at `:80-82` states the corrected fact ("a fourth state is a compile error in BOTH places").
  The two comments now disagree and the older one is the wrong one.
MUTATION PROBE S2 — canonical source, one compiler run: add a fourth member to
  `BOOT_HUD_STATES` (`boot.ts:48`):
    scanner-hud-colors.ts(104,12)  TS1360  'failed' is missing … Record<…|"failed", ScannerStateColors>
    SplashScreen                   TS2339  x2  Property 'failed' does not exist on type …
  Three diagnostics in TWO modules, not "exactly one TS2741, there".
Downstream consequence: none to runtime — the comment UNDER-claims, so the union is better
  guarded than advertised. Filed only because it is a stated, probe-attributed claim about what
  the type system enforces, and the next editor to re-run that probe will get a different answer
  than the file promises. This repo's standing guidance calls a comment that misdescribes its
  code the dominant defect class in mature rounds; this is the benign direction of it.
Fix: replace "is the only thing" with the two records, or delete the exclusivity clause. One
  sentence. `scanner-hud-colors.ts:80-82` already has the text to point at.
```

---

## What I checked and found SOUND (hunt rows, closed with evidence)

**(1) `SCANNER_COLORS` — closed, exhaustive, and the absence of `failed` is TYPED, not merely
absent.** `scanner-hud-colors.ts:88-104` ships
`} as const satisfies Record<BootHudState, ScannerStateColors>` — the F38/F45 form, so the trio
record is readonly AND total. The coordinator's question was whether the missing `failed` arm is
enforced or just unwritten; it is enforced, in both directions:

```
PROBE S1  add a `failed: { primary, glow, text }` arm to SCANNER_COLORS
            -> scanner-hud-colors.ts(100,3) TS2353  'failed' does not exist in
               type 'ScannerStateColors'                                  KILLED
PROBE S2  add 'failed' to BOOT_HUD_STATES (see the LOW above)
            -> TS1360 here + TS2339 x2 at SplashScreen                    KILLED
```

So a dead fourth trio cannot be added without the state, and the state cannot be added without the
trio. That is exactly what the module's own refutation claims ("A dead fourth key would be a trio
no code can reach and no Record can protect"), and the claim is stronger than it sounds:
`satisfies` gives excess-property checking, which a plain `as const` would not. The refutation
holds and the shape earns it.

**(2) U8.2's `gridSubtle` — one-sided-key-proof holds in BOTH directions, and I reproduced the
catch that caught the mid-build gap.** `palette.ts:167` declares
`PaletteToken = keyof typeof dark`, and `light` ends `} as const satisfies Record<PaletteToken,
string>` (`:239`). Final state: `dark.gridSubtle` at `:100`, `light.gridSubtle` at `:198` — both
halves present.

```
PROBE G1  delete light's gridSubtle   (the state the diagnostics stream showed mid-build)
            -> palette.ts(238,12) TS1360  Property 'gridSubtle' is missing … but required
               in type 'Record<…, string>'                                KILLED
               ^ this is the `satisfies Record` catch, reproduced at the exact line
PROBE G2  delete dark's gridSubtle    (the KEY-DEFINING half — the direction a `satisfies` on
                                       one arm is usually assumed not to cover)
            -> palette.ts(197,3)      TS2353  excess property on `light`
               glass-tokens.ts(169)   TS2339  x2 at the consumer            KILLED
```

G2 is the one worth recording: because `PaletteToken` derives from `dark`, dropping the dark half
makes light's key an EXCESS property, and `satisfies` performs excess-property checking on a fresh
literal — so the single-arm `satisfies` closes both directions, not one. The consumer
(`glass-tokens.ts:169`, the derived grid `backgroundImage`) reds independently, a second and
weaker net. No finding.

**(3) U8.3's token consumption — clean.** Bare-hex sweep with comments stripped, over every file
this wave touched in the boot / tab surface: `TabBar.tsx` **0**, `SplashScreen.tsx` **0**,
`BootSequence.tsx` **0**, `scanner-hud-colors.ts` **0**. The tab bar's four values go through the
palette names, matching the phone's five keys at `(tabs)/_layout.tsx:11-38`: `colors.card`
(`:92`), `colors.border` (`:93`), `colors.primary` / `colors.textSecondary` (`:119`).
`glass-tokens.ts`'s two remaining hexes are the pre-existing CTA gradient stops, drift-anchored in
`check-rn-parity.mjs`. No finding.

**(4) U8.4's `Toggle` refutation — CORRECT, and nothing shipped in its place, which is right.**
`Toggle` is in neither `componentSrcMap` nor `dtsPropsFor` (measured), so `gen-dts-props.mjs`
could never have picked up `hideLabel` — the generator walks pinned entries only (`:31`). The plan
row assumed `Toggle` was already pinned; it is not. U8.4 refuted the row rather than inventing a
half-fix, and raised deferral D-7 naming the two things a real fix needs (a `componentSrcMap`
entry AND a preview plus `cardMode` override). Not shipping a `dtsPropsFor` entry for an unpinned
component is the correct outcome: `design-sync-entry.test.ts:69` asserts the key sets match
EXACTLY in both directions, so a contract for an unshipped component would red as an orphan. That
test also drives everything from `componentSrcMap` with no exemption list, so pinning `Toggle`
later is covered with no edit to the test — the shape this campaign has been asking scan authors
for since W2. No finding.

**(5) F61 census over W4 — ZERO new module-level style tables.** Ran my standard scan for added
`(export )?const X: (CSSProperties|Record<|Partial<Record<)` lines over the diff's non-test
source: **no hits**. Every new module-level constant in the wave (`SCANNER_COLORS`,
`SCANNER_SKIP_PILL`, `SCANNER_SCHEME`, `SCANNER_GROUND`, `SCANNER_DISCLOSURE_TEXT`, `SCAN_LINE`)
is `as const`, a `satisfies` literal, or a plain string. The four new preview files carry none
either. The class stays closed.

**Other checks.** No `any`, `@ts-ignore` or `@ts-nocheck` added anywhere in the diff; the single
added `as unknown as` is `design-sync-entry.test.ts:56`, narrowing a dynamic `import()` to
`Record<string, unknown>` so the test can prove each export RESOLVES — the deliberate shape its
docblock defends against the string-presence trap. No canonical entity re-declared: the wave adds
one exported interface (`ScannerStateColors`) and it is a local paint contract, not a domain
entity. `SCANNER_SCHEME` repeats the `TERMINAL_SCHEME` forced-scheme pattern faithfully, including
the `palette[SCANNER_SCHEME]` indexed read that keeps the clause-12 scan green; as in W3 I found
no mix-up and propose no brand.

---

## Type Design Summary
CRITICAL: 0 · HIGH: 1 · MEDIUM: 0 · LOW: 1
Verdict: **REVISE**

| Check | Result |
|---|---|
| Canonical homes preserved (no parallel entity declarations) | **yes** — one new exported interface, a local paint contract |
| Discriminated unions well-formed | **yes in source** — `OverlayHeaderProps` still carries W3/F74's pair; **no in the generated contract**, which flattens it (the HIGH) |
| Exhaustiveness enforced | **yes** — `SCANNER_COLORS` total over `BootHudState`; S1/S2 KILLED both directions |
| Correlated state modelled as a union | **n/a** — no new correlated pair in this wave |
| Id spaces typed (no bare-string registries/keys) | **yes** — `HUD_STATE` is `Record<BootPhase, BootHudState>`, `SCANNER_COLORS` is keyed by the union |
| readonly discipline on shared data | **yes** — zero new module-level annotated tables (F61 census clean) |
| Two-scheme records one-sided-key-proof (U0.1) | **yes, both directions** — G1 TS1360 at the `satisfies`, G2 TS2353 plus consumer TS2339 |
| Generated type contracts match their source | **no** — two of 37 (the HIGH) |
| Boundary types honest about untrusted input | **n/a** — no boundary type added or changed |
| Mutation probes this round | **5 run — 4 KILLED (G1, G2, S1, S2), 1 finding-producing (DS1: two of three cases ACCEPTED what the source forbids, one REJECTED what it requires)**, with an in-run negative control on DS1. Restores proven byte-identical; worktree torn down with the script's proof line |

Out-of-lane observations:
- `PhoneFrame.tsx` (12) and `DashboardScreen.tsx` (15) still spell bare hexes with comments stripped, several of them palette values written by hand (`#f0f4f8` is `colors.text`, `#7a9fc4` is `textTertiary`, `#99badd` is `textSecondary`). Pre-existing and outside U8.2's two rows, which touched only the scan line and the last teal — repo drift rather than this diff's, and the web lane's call whether the final wave should sweep them.
- `NOTES.md:115-121`'s disclosure of the missing intersection branch lists five dangling names but not the two contracts in my HIGH; whoever fixes the generator should re-read that list against the regenerated output rather than trusting it.
