# Lane: type-design — Wave 4 (U8.1 boot gate · U8.2 grid/teal · U8.3 tab bar · U8.4 design-sync)

## Round 1 (fix delta)

Warm, scoped. Phase branch `feat/uiparity-w4` @ `277564c`, delta `de1cd33..277564c`. Authority:
`w4/VETTED-r1.md`'s Findings and Owner-routing tables (there is no PR for W4 — `gh pr list`
returns 41/42/43 only — so the vetted doc on the branch is the mapping, as the brief states).
Read the delta only, plus the lines each fix now depends on.

Probes ran in `probe-w4d-td-flip` (own worktree off `277564c`), torn down via
`tools/worktree-remove.ps1` — **"unlinked 549 junction(s) in 2 pass(es)"**, `.pnpm` 240 to 240,
exit 0; branch deleted. Restores proven byte-identical (`git status --short` and `git diff --stat`
both empty). One probe (DS1 re-run) ran on a scratch file OUTSIDE the repository using the repo's
own `tsc`; nothing was written into either tree.

Baseline at `277564c` BEFORE any mutation, BOTH programs (F82 added the second one):
`tsc --noEmit --incremental false` -> **EXIT 0** · `tsc -p tsconfig.previews.json` -> **EXIT 0**.

**My findings per the vetted doc: F83 (HIGH, promoted and merged with the typescript lane's
generic-binder case), F89 (LOW).** The coordinator also asked me to judge **F84**'s
`activeScheme` mechanism against my one-sided-key standards and to sanity-check **F82**'s
`tsconfig.previews.json` paths pins. Judged below, marked as not-mine.

---

### F83 [HIGH] — **FIXED, all three mis-encodings; one residual, disclosed and correctly ceilinged**

`c4fefc3` (+ `59ab7da`, an es5-target repair to the new scans). I re-ran my DS1 probe class against
the **regenerated** contracts, transcribed verbatim out of `config.json` into a scratch file and
checked with the repo's own tsc (`--strict --skipLibCheck`, React stubbed to two aliases):

```
A  activeStatuses = ['started', 'working']        (the component's REAL input)
     round 0: TS2322 REJECTED     ->  now: accepted                       FIXED
B  activeStatuses = 'started'     (a bare string), guarded by @ts-expect-error
     round 0: accepted            ->  now: the directive is CONSUMED      FIXED
     ^ no TS2578 "Unused '@ts-expect-error'" anywhere in the run, which is the
       built-in negative control: had B still been accepted, the directive would
       have gone unused and reported.
D  NewCaseModalProps['onChange'] = (f, v) => {}   (the dropped generic binder)
     round 0: unresolvable `K`    ->  now: resolves                       FIXED
E  SubmissionScreenProps['coordinates'] = { lat, lng, source }  (the intersection)
     round 0: dangling names      ->  now: resolves                       FIXED
C  OverlayHeaderProps = { variant: 'glass', onBack: fn }   (F74's illegal state)
     round 0: accepted            ->  now: STILL ACCEPTED                 residual, below
Whole run: ZERO diagnostics — i.e. exactly the four intended outcomes and nothing else.
```

Residual class scan over **all 37** shipped contracts, not just the ones I named: unparenthesised
union arrays **NONE**; dangling `K` / `GpsCoordinates` / `GpsSource` / `ReverseGeocodeResult` /
`OcrRecognizeOutcome` **NONE**.

**Three things go beyond the finding.** (i) A fourth mis-encoding I did not report was found and
fixed in the same pass — `Promise<T>` fell through to `getText()` and shipped its argument
unexpanded; `reverseGeocode` now emits `Promise<null | { streetAddress: string; city: string }>`.
(ii) The generic fix is **erasure to the constraint**, not deletion: `K extends keyof NewCaseFields`
becomes the key union, which is the widest type the signature genuinely accepts, and an
unconstrained parameter erases to `unknown` rather than the `any` the old path implied. (iii) The
pins are **three general scans**, not a 37-row expectation table, with the stated reason that a
table "fails on every legitimate prop change and gets updated without being read" — and the
paren scan's docblock records a MEASURED false-positive exclusion (`ExploreChecklist`,
`WizardDrawer`, whose union arrays are already bracketed by a `}` or `)`). That is the shape this
campaign has been asking scan authors for since W2.

**The KNOWN-LOSSY marker, judged honestly, as asked.** Case C above is the whole of it: the marker
is a comment, and **a comment is not a type** — the emitted interface still compiles F74's illegal
state, and any tool that typechecks against the `.d.ts` will accept it. That residual is real and I
am not going to describe it as closed.

It is nonetheless the right disposition, for a reason I verified rather than accepted:

- **The ceiling is external and genuine.** `cfg.dtsPropsFor` is an interface BODY string that the
  emitter wraps as `export interface XProps { … }`. Expressing the union needs
  `export type XProps = A | B`, i.e. a different emitter shape — and that emitter,
  `package-build.mjs`, **is not in this repository** (verified: no such file outside
  `node_modules`). Nothing in this wave's reach could have emitted the union.
- **It is a MECHANISM, not a patch.** The marker is generated (`gen-dts-props.mjs:317`, composed
  with `${arms.length}`), so it caught `NewCaseModal` too — a second union-props component I never
  named, with the same discriminated-group wording.
- **It sits in the artefact the consumer reads.** My round-0 fix line offered "record it in
  `NOTES.md` beside the five dangling names"; putting it in the contract itself is strictly better,
  because the design agent reads the `.d.ts` and not the sibling doc. The text is also the right
  text — it names the group, says "pass all of them or none", and says the `?` is "an artefact of
  flattening the union, NOT permission to pass one without the others".
- **It is pinned.** `design-sync-entry.test.ts` asserts both `KNOWN-LOSSY` and
  `DISCRIMINATED GROUP` are present, so a regeneration that silently drops the marker reds.

**Deferral proposed** (house format; the aggregator decides and is the ledger's sole writer):
**Source** W4/F83, this lane's fix-delta. **What** `OverlayHeader` and `NewCaseModal` ship
prop contracts that flatten a discriminated union to optional properties; the loss is marked in
the contract and pinned, but the emitted interface still type-checks the illegal state (probe C).
**Why deferred** the emitter that would have to switch from `export interface XProps { body }` to
`export type XProps = A | B` lives outside this repository, so no in-repo change can close it.
**Trigger** the design-sync emitter gaining a type-alias emission path, or any third component
acquiring a union props type (at which point the flatten is a pattern rather than two exceptions).

---

### F89 [LOW] — **FIXED, better than prescribed**

`d9439c7`. My fix line offered "replace 'is the only thing' with the two records, or delete the
exclusivity clause". They did more than either: re-probed at the W4 head, listed the five
diagnostics with their modules, and then **refused to restate a count at all** —

> *"What the union still guarantees is the property, not the count: a fourth member cannot be
> added silently. **Do not re-state a diagnostic count here** — the next total record over this
> union moves it again, and a stale count reads as a verified fact."*

That is the F49 / F68 lesson generalised at the root rather than applied once, and it is the third
time this campaign has paid for a hand-maintained figure in a comment.

**PROBE S2r — canonical source, one compiler run, no test-file filter this time** (my round-0 S2
filtered `__tests__`, which is why I reported three diagnostics in two modules and they report
five in three; theirs is the fuller count and mine was the narrower view of the same mutation):

```
add 'failed' to BOOT_HUD_STATES (boot.ts:48)
  scanner-hud-colors.ts:104          TS1360
  SplashScreen.tsx:62                TS7053
  SplashScreen.tsx:76                TS2741
  __tests__/SplashScreen.test.tsx:90   TS7053
  __tests__/SplashScreen.test.tsx:104  TS7053
  -> 5 diagnostics, 3 modules, and TS2741 is no longer the first one reported   KILLED
```

Exactly the corrected docblock's claim, in kind, count and ordering.

**One note, not a finding.** The two `SplashScreen.tsx` line cites in the new docblock read `:61`
and `:72`; measured at this head they are `:62` and `:76` — the file moved under a later commit in
the same round. Trivial, unpinned, and the correction's own thesis ("do not re-state a figure that
moves") argues those two line numbers should not have been spelled either. Worth a sentence to
whoever writes the closing note; not worth a finding, and I am not filing one.

---

## Not my findings — judged at the coordinator's request

### F84 [HIGH] (aggregator) — **FIXED, and the shape is right by my standards**

`3ff31ba`. `export const activeScheme: ColorScheme = scheme` (`palette.ts`), with the six
`=== 'dark'` gates re-pointed at it.

Three things I checked, because the risk in adding a second exported name for one value is that the
wrong one gets used:

1. **It does not widen anything downstream.** `scheme` keeps its literal `'dark'` type, so
   `palette[scheme]` is still exactly `typeof dark`, `colors.*` keeps its literal types, and every
   `as const satisfies` consumer in the repo is untouched. The commit's own reasoning for widening
   the comparison rather than the export quotes the `satisfies` docblock's promise — *"no
   consumer's inferred type moved by a character"* — and it is correct: annotating the export
   would have made `colors` the union and moved all of them.
2. **`activeScheme` is used at COMPARISON sites only.** Measured: six `=== 'dark'` reads
   (`button-recipe.ts:181,186`, `sheet-chrome.ts:227,242`, and two test sites) and **zero** index
   sites — `grep "\[activeScheme\]"` over `features/` returns nothing. An index read is the one
   misuse that would silently widen a call site's inferred type, and none exists.
3. **A typed `const`, not a cast.** `(scheme as ColorScheme) === 'dark'` would silence the same
   TS2367 while lying if `scheme` ever stopped being a `ColorScheme`; the binding fails to compile
   instead. Same argument that makes `light` a `satisfies` rather than an annotation, applied
   consistently.

**My one-sided-key standard is unaffected**: `PaletteToken = keyof typeof dark` and
`light … as const satisfies Record<PaletteToken, string>` are structurally untouched by this fix,
so round-0's G1/G2 result (both directions closed) still holds.

**PROBE FLIP — the finding's actual subject, canonical source, one run per program:** flip the
one-site switch to `export const scheme = 'light' satisfies ColorScheme`.

```
tsc --noEmit --incremental false        -> EXIT 0      the flip COMPILES
tsc -p tsconfig.previews.json           -> EXIT 0      and so does the preview program
```

Clause 12's "flipping the demo to light is a one-site change" is a compiling claim again, on both
programs. It is also a second, independent confirmation of point 1: a widened `colors` would have
produced errors under the flip, and there are none.

### F82 [HIGH] (silent-failures) — paths pins **sane**, sanity-check only

`4b7d4dc`. The three `paths` entries do what their comment says and the reason is measured rather
than guessed: `.design-sync/node_modules` is a symlink to `.ds-sync/node_modules`, which carries
its own `@types/react`, so node resolution walks up from a preview and finds that copy while
`ds-entry.ts`'s transitive imports find the repo's — two nominal type trees that do not unify, and
`csstype` is named because it is the transitive dependency the mismatch surfaces on. Three entries
(`react`, `react/jsx-runtime`, `csstype`) is the right count for `jsx: react-jsx`.

`open-pro-next` -> `./.design-sync/ds-entry.ts` is the load-bearing line and it is honest: it maps
to the same generated entry the bundler builds from, so a preview is typechecked against the REAL
component props. Scoping it to a second config rather than widening the root's `include` is
correct — that mapping is a lie everywhere else in the repo, since app code must never import the
design bundle.

Arithmetic checks out: **58** preview `.tsx` files = **37** in-program (exactly `componentSrcMap`'s
37 non-null entries) + **21** marketing previews excluded. Wired into the gate
(`package.json`: `"typecheck": "tsc --noEmit && tsc -p tsconfig.previews.json"`), and both
programs are EXIT 0 at this head. No finding.

---

## Regression sweep over the fix commits' blast radius

- **`gen-dts-props.mjs` gained four printer branches and a type-parameter eraser**, and its output
  is 37 contracts. The blast radius is exactly those contracts, and I checked all of them rather
  than the four I named: two residual class scans clean, and the four transcribed cases resolve
  under `--strict`. `59ab7da` repaired the one thing the new code broke on its own account (an
  iterator spread that fails this repo's `target: es5`) — caught by the gate, not by a reviewer.
- **`activeScheme` is additive.** Nothing was removed from `palette.ts`; `scheme` and `colors` are
  byte-identical. The six re-pointed sites are all comparisons; the four production ones
  (`button-recipe`, `sheet-chrome`) still gate the same dark-only shadows.
- **F82 put 37 previews into a program for the first time**, which is a new gate over previously
  unchecked files. It is green at head, and the root program is unchanged (`tsc --noEmit` EXIT 0),
  so nothing that used to compile stopped.
- **F89 is comment-only** — `git show d9439c7` touches one docblock; no code path moved.
- **My round-0 census result is unchanged**: no fix commit introduced a module-level
  `const X: CSSProperties | Record<…>` table (re-scanned the fix diff; zero hits), so the
  F20/F38/F61 class stays closed through this round too.

**No fix-introduced regressions in my lane.**

---

## Type Design Summary (Round 1 fix delta)
CRITICAL: 0 · HIGH: 0 · MEDIUM: 0 · LOW: 0
Prior-round findings: **F83, F89 — 2 of 2 FIXED.** 0 PARTIAL, 0 UNFIXED.
Judged at request (not mine): **F84 FIXED** (flip compiles, both programs) · **F82 paths pins sane**.
One deferral PROPOSED (F83's union-props residual — external emitter ceiling; see above).
Verdict: **APPROVE**

| Check | Result |
|---|---|
| DS1 re-run on the regenerated contracts | **4 of 5 cases flipped to correct**; whole run zero diagnostics, with the `@ts-expect-error` on the bare-string case acting as the built-in negative control |
| Residual mis-encodings across all 37 contracts | **none** — zero unparenthesised union arrays, zero unresolvable type names |
| The KNOWN-LOSSY marker, judged honestly | **a mitigation, not a closure** — case C still compiles. Correct disposition all the same: the emitter is outside this repo, the marker is generated (so it caught a second component), it lives in the artefact the agent reads, and it is pinned. Residual proposed as a ledger row with a trigger |
| F84's `activeScheme` vs my one-sided-key standards | **compatible** — literal `scheme` preserved, `PaletteToken`/`light satisfies` untouched, comparison-only usage (zero index sites), typed const not a cast |
| Does clause 12's flip compile | **yes** — PROBE FLIP: EXIT 0 on both the root and the previews program |
| F82 paths pins | **sane** — three React pins with a measured cause, one honest `open-pro-next` mapping, 37 + 21 = 58 arithmetic checks out, wired into `pnpm typecheck` |
| Fixes address the finding, not the symptom | **yes** — F83 fixed a fourth mis-encoding I never reported and pinned with general scans rather than an expectation table; F89 removed the class of claim rather than correcting one instance |
| Fix-introduced regressions in blast radius | **none** |
| Mutation probes this round | **3 run — 2 KILLED (S2r: 5 diagnostics / 3 modules, matching the corrected docblock in kind, count and ordering; DS1 re-run: 4 of 5 cases now correct with an in-run negative control), 1 CLEAN (PROBE FLIP: EXIT 0 on both programs, which is the intended result and doubles as the no-widening control for F84)**. Restores proven byte-identical; worktree torn down with the script's proof line |

Out-of-lane observations:
- `tsconfig.previews.json`'s 21-name `exclude` is a hand-typed roster with no pin. The safe direction is covered — `include` is a glob, so a new DEMO preview enters the program automatically — and the silent direction needs someone to wrongly add a demo preview to a 21-line literal, which is a reviewable act. By my own §27 precedent (static, single-author literal) I would not spend type machinery on it; flagging only because the tests lane may want a one-line pin that the exclude set and `componentSrcMap` partition the directory.
- F84 ships two exported names for one value. Nothing prevents a future `palette[activeScheme]`, which would widen that call site's inferred types silently; zero such uses today and the docblock says why. Not filed — no reachable invalid state — but it is the kind of thing that is cheap to catch in a later census.
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
