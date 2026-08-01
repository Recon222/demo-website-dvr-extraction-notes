# P8 review — lane: TYPE DESIGN

**PR** #37 · `master..feat/parity-p8` @ `41f4a93` · lane run at xhigh effort
**Scope (per brief)** the `BootPhase` union and whether the null-source route is type-visible; the
two total records (`PHASE_MS`, `HUD_STATE`) and their totality tests; `SplashScreen.AuthState` as
an alias of `BootHudState`; the `BOOT_VIDEO_SRC: string | null` drop-in seam; the bridge `boot`
prop's type and default; the gate's interaction with the persisted `view` union (the `case 'splash'`
arm); anything the §84f lesson catches.

**Method.** Every "probe-verified" claim below was executed. Type probes are **new files only** —
I never edited a shared source file, so no concurrent lane's in-flight patch was at risk (two
other lanes had untracked probes in this worktree during the run; `lane-probe-sf*.test.tsx` are
theirs and were left alone). Union-growth probes are faithful replicas of the real constructs in
the same `tsconfig`. Runtime probes render the real bridge. Every probe file was deleted after the
run; `git status` is clean of this lane's artifacts.

**Baseline cold `tsc --noEmit`** (`rm -f tsconfig.tsbuildinfo` first): **clean, exit 0** — before
and after probes.

---

## Verdict

**APPROVE with comments.** No CRITICAL, no HIGH.

The machine itself is good work and the parts the PR body advertises hold up under probe: the two
total records really do fail the build on a new phase, and `nextBootPhase`'s switch does too —
including the one thing the body does *not* claim and a reviewer might wrongly "fix" (see the
refutation below). The three findings are all shape choices around the machine rather than in it:
one correlated-optional pair that recreates the trap §84f closed one round ago, one union consumer
that opted out of the exhaustiveness the same PR uses two files over, and one id-space seam the
gate design opened and left for the loader to not catch.

---

## Claims probed (all six in the brief)

| Claim | Result |
|---|---|
| **Is the null-source route type-visible, or does `nextBootPhase` branch on a nullable by convention?** | **By convention — and that is the right call.** `BootConfig.videoSrc: string \| null` (`boot.ts:105`) is tested with `cfg.videoSrc === null ? 'fading' : 'video'` (`:152`). There is no type-level link between "the source is null" and "the three video phases are unvisited", and there should not be: expressing it needs overloads or a conditional return type, and the lane's own standing rule is not to propose machinery this codebase doesn't use. The runtime branch is pinned two ways (`boot.test.ts:33-53` walks both routes; `:133-136` asserts the fork directly). **No finding.** One residue: `''` is a non-null `string`, so `nextBootPhase('authorized', { videoSrc: '', … })` returns `'video'` (probe A4, no diagnostic) — recorded, not filed: the constant is author-controlled, not untrusted input, and `<video onError={skip}>` recovers. |
| **The two total records + their totality tests** | **Records: genuinely total, probe-verified.** Adding `'preflight'` to a replica of `BootPhase` → `TS2741` at `PHASE_MS` and `TS2741` at `HUD_STATE` (probe B1/B2). A new phase cannot ship without a dwell decision and a HUD decision, exactly as `boot.ts:116` claims. **Tests: weaker than their own names.** `boot.test.ts:16`'s `ALL_PHASES` is a hand-maintained list under a `readonly BootPhase[]` *annotation*, not a `satisfies` or a derivation — a new member is silently absent and the three assertions that say "is total over the phase union" / "from ANY phase" quietly stop being total (probe B4, no diagnostic). See **L1**. |
| **`SplashScreen.AuthState` — alias or re-declaration? drift risk?** | **A true alias** (`SplashScreen.tsx:9`, `export type AuthState = BootHudState`), replacing master's local `type AuthState = 'idle' \| 'scanning' \| 'authorized'`. *Type* drift is now impossible by construction — good change. But `boot.ts:37-38`'s claim that "the machine and the component cannot drift" covers the **name only**: the component's three branches are independent `&&`s with no exhaustiveness device, so the machine can gain a HUD state (compile-forced in `boot.ts`) that the component silently ignores. See **M2**. |
| **Is the `BOOT_VIDEO_SRC` drop-in announcement genuinely compile/test-forced?** | **Test-forced: yes.** `boot.test.ts:126-131` fails the moment either constant stops being null. **Compile-forced: no — deliberately, and correctly.** The `: string \| null` annotation is load-bearing, not decorative: without it the constant's inferred type collapses to `null` and the video half of every `videoSrc === null` fork becomes statically dead at the bridge's call sites. A compile error on the flip would defeat the one-edit goal. **No finding on the seam.** One amendment to the claim on `boot.ts:87-90` — see **L2**. |
| **The bridge `boot` prop's type and default** | **Correct as written.** `boot?: boolean` defaulting to `false` (`DemoExperience.tsx:416`, `:425`). The `draft?: true` precedent (deferred/PR #8) applies where `false` is *meaningless*; here "render the app without the gate" is the meaningful state ~30 suites depend on, and the route (`app/demo/page.tsx:14`) expresses the other. Probe A3: `<DemoExperience boot={false} />` compiles — which is the point, not a hole. **No finding.** |
| **Can the persisted `view` union carry `'splash'`? Should it?** | **It can, and it still does.** `'splash' ∈ ChapterId` (`types/index.ts:79`) ⊆ `AppView` (`create-store.ts:159`); `CHAPTERS` lists it (`screens.ts:27`), so `isAppView('splash')` is true (`persistence.ts:371`), `snapshotOf` writes it verbatim (`:445`) and `loadSnapshot`'s three normalization arms (`:551-557`) have no branch for it. Probe D1–D3: round-trips through the snapshot, hand-edited or not, all green. See **M3**. |
| **Anything §84f catches (two props only meaningful together)** | **Yes — one pair, at two levels.** See **M1**. |

### Refutation — do **not** ask for a `never` arm on `nextBootPhase`

`nextBootPhase` (`boot.ts:143-160`) has no `default:` and no `const exhaustive: never`, which reads
like a gap against the `FallbackMode` precedent and against this repo's own `assertNever`
(`engine/logic/assert-never.ts`, 8 live call sites). **It is not a gap.** Probe B3: adding
`'preflight'` to the union and leaving the switch alone produces

```
zz-td-probe-b.ts(35,67): error TS2366: Function lacks ending return statement and return type does
                          not include 'undefined'.
```

`strict` + the explicit `: BootPhase | null` annotation already make a missing arm a build error —
the early `if (phase === 'done') return null` narrows the union first, so the six arms are exactly
exhaustive over the remainder. Adding an `assertNever` default here would be harmless but
redundant, and adding a `default: return null` would *remove* the guarantee. Leave it.

---

## Findings

### [MEDIUM] M1 — `videoSrc` / `videoPoster` is a correlated-optional pair: the §84f trap re-created, at two levels

**Type:** `BootSequenceProps` at `features/demo/ui/screens/BootSequence.tsx:15-23` —
`videoSrc: string | null` (required, `:18`) beside `videoPoster?: string | null` (optional, `:20`).
And the same pair at module scope: `BOOT_VIDEO_SRC` / `BOOT_VIDEO_POSTER` at
`features/demo/engine/logic/boot.ts:92` and `:97`.

**Permitted invalid state:** a poster with no source. Three representable states, two meaningful
ones — precisely the shape §84f records this team closing by type one round ago
(`Toggle`'s `controls?`/`expanded?`, `SelectField`'s `label?`/`a11yLabel?`, both collapsed onto the
`RetentionView` precedent and compile-probed).

**Construction site:** probe A1 —

```tsx
<BootSequence videoSrc={null} videoPoster="/demo-media/boot-intro-poster.jpg" onComplete={() => {}} />
```

compiles with **zero diagnostics** under cold `tsc`. The module-level twin is reachable through the
PR's own documented procedure: `boot.ts:76-85` lists step 2 as "optionally drop its first frame
beside it" and step 3 as "change the two constants below" — doing step 2's constant without step
3's is a legal edit.

**Downstream consequence:** silent and total. `hasVideo = videoSrc !== null` is false (`:131`), so
`{hasVideo && <video …/>}` at `:152` never mounts an element at all — the poster string is not
merely unused, it has nowhere to go. Nothing warns, nothing logs, nothing fails. (The `boot.test.ts`
totality test does redden on a half-flipped *constant*, but with the message "the video landed",
which points at the wrong thing.)

**Fix — collapse to one nullable value, the `RetentionView` / §84f `SelectFieldName` precedent.**
Probe C verified both directions:

```ts
export interface BootVideo { readonly src: string; readonly poster: string | null }
export const BOOT_VIDEO: BootVideo | null = null      // one constant, not two
// props: video: BootVideo | null
```

- the three legitimate states compile (C1a–C1c);
- `{ poster: '/x.jpg' }` with no `src` is `TS2741: Property 'src' is missing` at **both** the props
  call site and the constant (C1d/C1e).

Two bonuses worth naming, because they strengthen the package's own claims rather than taxing them:
the drop-in becomes **one** constant instead of two (the §87d headline gets shorter and truer), and
`boot.test.ts:126-131` collapses to a single `expect(BOOT_VIDEO).toBeNull()`.

---

### [MEDIUM] M2 — `SplashScreen`'s HUD branches are three independent `&&`s, so a fourth `BootHudState` renders an empty live region

**Type:** `BootHudState` at `features/demo/engine/logic/boot.ts:39` (new in this PR), consumed by
`features/demo/ui/screens/SplashScreen.tsx:91`, `:92`, `:100` as three separate
`{authState === '…' && …}` blocks. No switch, no `assertNever`, no total record.

**Invariant not enforced:** the union's members and the component's rendered branches are unlinked
in the growth direction. Probe C2a: a fourth member compiles with **zero diagnostics** through the
shipped rendering shape. Probe C2b: the same content expressed as `Record<BootHudState, ReactNode>`
produces `TS2741: Property 'failed' is missing` — i.e. the fix is available and one file wide.

**Construction site.** The fourth member is not hypothetical; the PR's own ledger names it and
names its trigger. §87c: *"No `failed` state. `ScannerState` has four members; `BootHudState` has
three."* §87b's un-defer trigger: *"the demo gaining any real gate — a password-protected export, a
shareable session link."* §87a's: a re-lock ruling, which it says *"is a second `BootSequence`
mount"*. Three of the ledger's four open ends land on this union.

**Downstream consequence if it lands:** `HUD_STATE` (`boot.ts:164-172`) forces the author to make a
decision *there* — probe B2 — and then `bootHudState()` returns the new member into a component
that renders nothing for it. The `role="status" aria-live="polite"` region (`SplashScreen.tsx:90`)
is empty; its reserved `minHeight: 68` shows as blank space; `const idle = authState === 'idle'`
(`:48`) is false, so the full-bleed button is `aria-disabled` with `onClick` undefined (`:130-132`);
and `aria-describedby={statusId}` points a screen reader at an empty region. The visitor's only
exit is SKIP or Escape. That is a *worse* failure mode than the `default:` the `FallbackMode`
precedent warns about — a `default:` at least returns something.

**Note on the comment, independent of the fix.** `boot.ts:37-38` reads *"`SplashScreen`'s
`AuthState` aliases this, so the machine and the component cannot drift."* The alias makes the
**name** undriftable; the **branch set** is not covered by it. This is §84a's exact shape — "a doc
comment naming the right idiom while the code shipped half of it" — and the comment should be
narrowed even if the code is left alone.

**Fix:** a `Record<BootHudState, ReactNode>` beside the existing `status` style constant (probe
C2b), or a `switch` closing on `assertNever` from `@/features/demo/engine/logic/assert-never` — the
idiom `DemoExperience.tsx` uses at seven sites and `ExportActionSheet.tsx:83` at one.

**Severity note.** The rubric's HIGH clause reads *"a new union's consumers use `default:` instead
of a `never` check, so future variants degrade silently,"* and `BootHudState` is a new union. I
demoted to MEDIUM under the pre-report gate: the invalid state needs a future union edit rather than
a reachable input, and the three-`&&` structure is prototype-lifted markup this PR *promoted* to
load-bearing rather than authored. If the orchestrator applies the `FallbackMode` bar literally,
this is the one finding in the lane that moves to HIGH.

---

### [MEDIUM] M3 — `AppView` still admits `'splash'`, which P8.1 turned into a non-view, and the loader has no arm that catches it

**Types:** `ChapterId` at `features/demo/engine/types/index.ts:79`; `AppView = ChapterId |
LaunchableId | TabView` at `features/demo/engine/store/create-store.ts:159`; the arm at
`features/demo/ui/DemoExperience.tsx:2457-2467`.

**The invariant P8.1 created and did not express.** Before this PR, `'splash'` was a chapter *and* a
(never-navigated-to) screen. After it, the two diverge for the first time in this union's life:

- it must **remain** a `ChapterId` — the rail narrates it while the gate is up
  (`DemoExperience.tsx:645`), and `NARRATION.splash` is the chapter entry that makes that work;
- it is **no longer a destination** — nothing calls `setView('splash')` anywhere in the repo, and
  `git log -S"setView('splash')"` across all refs returns only a docs commit, so no build has ever
  written it; `EXPLORE_ITEMS` excludes it by explicit ruling (`explore.ts:15-18`); and
  `prevVisibleChapter` can only return it from `'dashboard'`/`'cases'`, neither of which wires
  `onPrev` (that handler reaches only the ten wizard screens, `DemoExperience.tsx:2511-2719`).

So the arm at `:2457` exists solely because `activeScreen()`'s switch must be total over `AppView`,
and its own comment concedes this: *"Not reached by navigation any more."*

**Construction site — the one path that is still open.** `snapshotOf` writes `s.view` verbatim
(`persistence.ts:445`), `persistedStateSchema` accepts it (`:417`, via `isAppView`, which reads
`CHAPTERS` and `CHAPTERS` lists `'splash'`), and `loadSnapshot`'s three normalization arms
(`:551-557` — launch-only → chapter, wizard-without-location → cases) have **no branch for it**.
Probe D (3/3 green): `setView('splash')` is a legal store write, it survives the snapshot round
trip, and a hand-edited snapshot naming it is accepted — the same threat model `persistence.ts:388`
already writes code against (R-7's `"toString": true` note), and the one `assert-never.ts`'s own doc
comment calls out by name: *"a value slips through a boundary the compiler didn't see (a rehydrated
snapshot, a hand-written test fixture)."*

**Downstream consequence.** Probe E (2/2 green), rendering the real bridge:

- **E1**, `boot` + restored `view: 'splash'`: the visitor completes the gate, `booting` flips
  false, the screen tree mounts — and a **second, identical boot sequence** is the screen, back at
  `TAP TO SCAN`. Only after tapping through it a second time does `view` become `'cases'` — i.e.
  the restored position is discarded, which is precisely the failure §87e says the gate design
  exists to prevent (*"a `view: 'splash'` boot would have thrown away the restored position on
  every refresh and undone half of what P0.4 exists to do"*). The design avoided it on the way in
  and left it open on the way back.
- **E2**, no route gate: the arm alone mounts a full `BootSequence` **as a screen** — with its
  window-level Escape listener (`BootSequence.tsx:109-115`) live for as long as that view is
  active, so Escape anywhere navigates to Cases.

**Fix — the boundary, one line, no `SNAPSHOT_VERSION` bump.** Extend the normalization block that
already exists at `persistence.ts:551-557` with the same treatment launchables get:

```ts
if (restoredView === 'splash') restoredView = restoredChapter
if (restoredChapter === 'splash') restoredChapter = 'cases'
```

It narrows what the loader *accepts*, exactly like the launchable arm, so no version bump is
implied (same reasoning as the `visited` key-set widening at `:383-386`). The type alternative —
`type RenderableView = Exclude<AppView, 'splash'>` on `activeScreen`'s parameter — closes it at the
declaration instead, but costs a narrowing at the bridge and is the heavier move; the boundary fix
is the one this file already reaches for.

**Not a re-file.** Nothing in `deferred.md` tracks this: §5's `NavState` item is the
`view`/`launchReturnView` pair, not the chapter/view id-space split. This diff *created* the
divergence, so it is in scope.

---

### [LOW] L1 — completeness sweep: `BootPhase`'s two non-record consumers are not growth-safe

Every site that names the `BootPhase` member set, and how each behaves when the union gains a
member (all probe-verified in probe B against a replica with `'preflight'` inserted before
`'scanning'`):

| Site | Form | Growth-safe? |
|---|---|---|
| `boot.ts:117` `PHASE_MS` | `Record<BootPhase, number \| null>` | **Yes** — `TS2741` |
| `boot.ts:164` `HUD_STATE` | `Record<BootPhase, BootHudState>` | **Yes** — `TS2741` |
| `boot.ts:143` `nextBootPhase` | exhaustive switch + explicit return type | **Yes** — `TS2366` (see refutation above) |
| `BootSequence.tsx:148` opacity | allow-list (`=== 'fading' \|\| === 'done'`) | **Yes** — new members default to visible, the safe side |
| `BootSequence.tsx:135` `showVideo` | **deny-list** (`!== 'idle' && !== 'scanning' && !== 'authorized'`) | **No** — a new pre-scan phase evaluates `true`, so the video takes the surface and the HUD is dropped one or more phases early |
| `boot.test.ts:16` `ALL_PHASES` | `readonly BootPhase[]` annotation | **No** — a new member is silently absent; the three assertions named *"is total over the phase union"* and *"from ANY phase"* stop being either |

Nothing ships broken today: the three compile-forced sites all live in `boot.ts`, so anyone adding
a phase is already in the right file and will be told twice. The residue is one default pointing
the wrong way and one test whose name over-claims what it enforces.

**Fix.** Flip `showVideo` to the allow-list form (`phase === 'video' || phase === 'holding' ||
phase === 'fading' || phase === 'done'`), and derive the test's list from a total record the way
`persistence.ts:365-370` derives `APP_VIEWS` from `EXTRA_VIEWS` — e.g. export
`BOOT_PHASES = Object.keys(PHASE_MS) as readonly BootPhase[]` from `boot.ts` (probe B7 compiles)
and have the test import it instead of re-listing the union.

---

### [LOW] L2 — amendment: the drop-in is two constants **plus three test edits**, not two constants

`boot.ts:87-90` claims *"That is the whole change… nothing needs restructuring, and no test that
names a real asset exists to go stale."* The second half is true (no test names a real path). The
sentence it supports is not.

`DemoExperience.boot.test.tsx:10`'s `runSequence()` is `[SCAN_MS, AUTHORIZED_MS, FADE_MS]` — the
**null-source** phase path, hard-coded. With a source configured, the sequence parks in `video`
awaiting an `ended` event jsdom never fires, so the gate never lifts and all three tests that call
it (`:47`, `:56`, `:73`) go red. Probe F confirms it without touching the constant (module mock of
`BOOT_VIDEO_SRC`, then the shipped helper verbatim): after the drop-in, `queryByTestId('demo-boot')`
is **not** null where the shipped assertion requires it to be.

The type angle, and why it is only LOW: `BootSequence` takes its source as a **prop** — correct, and
what makes its own suite drop-in-proof. `DemoExperience` reads the module constant directly
(`:32`, `:2966`, `:2461`), so `boot?: boolean` is a seam for *whether* the gate runs but not for
*what it runs with*, and the bridge's tests are coupled to the constant's runtime value. I am not
asking for an injection prop for a single call site — that is the speculative-abstraction trap.
The cheap fixes are either (a) amend the comment to say "two constants and the three bridge tests
that assume no video", or (b) have those three tests drive the video path explicitly. Either way
the claim on `boot.ts:87-90` should stop being unqualified.

---

## Considered and cleared (no finding)

- **`AuthState = BootHudState`** — an alias, not a re-declaration; the canonical union lives in
  `engine/logic/boot.ts` alongside `engine/logic/retention.ts`'s and `import.ts`'s logic-layer
  types, which is the right home. Only one external consumer (`SplashScreen.test.tsx:3`). Two names
  for one union is a grep cost, not a correctness one. (The branch-set gap is M2, not the alias.)
- **`boot?: boolean` / `false`** — see the claims table. Correct against the `draft?: true`
  precedent, which is about meaningless `false`, not default `false`.
- **`BOOT_VIDEO_SRC: string | null = null`** — the annotation is right and load-bearing. Without it
  the inferred type is `null` and the video arm of every fork goes statically dead.
- **`BootConfig.videoSrc` admits `''`** — author-controlled constant, not a boundary type; the
  `onError={skip}` path recovers. Recorded, not filed.
- **`reduceMotion?: boolean`** (`SplashScreen.tsx:18`, resolved once by the owner at
  `BootSequence.tsx:81`) — both states meaningful; `?: boolean` with a `false` default is correct,
  and the resolve-once-at-the-owner shape matches the cited `AudioRecorderScreen` precedent.
- **`booting` as bridge state rather than store state** — §87e's own trade, same as §80c/§84b for
  `DemoSettings`. It is not in `DemoState`, so no snapshot/type surface is affected. Design call,
  not a type finding.
- **`(booting ? NARRATION.splash : undefined) ?? …`** (`DemoExperience.tsx:645`) — types cleanly as
  `ChapterNarration | undefined` at the head of the existing `??` chain; no widening, no new
  optionality.
- **`onComplete(): void` firing once via `completedRef`** — a lifecycle guard, not a type shape.
- **No parallel entity declarations.** Nothing in the diff re-declares a canonical shape outside its
  home; the new types are logic-layer types in the logic layer. `import type` is used correctly at
  `SplashScreen.tsx:5`, `BootSequence.tsx:5` and `:12` — `isolatedModules` clean.
- **Barrel discipline** — `ui/` importing `engine/logic/boot` directly is the established pattern
  (12 sibling deep imports of `engine/logic/*` in `DemoExperience.tsx` alone); the public barrel
  (`features/demo/index.ts`) is untouched and still two exports.

---

## Type Design Summary

| Severity | Count |
|---|---|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 3 |
| LOW | 2 |

Canonical homes preserved (no parallel entity declarations): **yes**
Discriminated unions well-formed: **yes** (`BootPhase`, `BootHudState` — flat closed unions, no
payload to misplace)
Exhaustiveness enforced (never-checked switches): **partial** — three compile-forced sites in
`boot.ts` (probe-verified), one union consumer opted out (**M2**), two hand-written partitions not
growth-safe (**L1**)
Correlated state modelled as a union: **flat shape found** — `videoSrc`/`videoPoster` (**M1**)
Id spaces typed (no bare-string registries/keys): **yes** — probes A5/A6/A7 confirm `BootPhase`,
`BootHudState` and `SplashScreenProps` all reject non-members; the gap is the *opposite* direction,
an id space that admits one member too many (**M3**)
`readonly` discipline on shared data: **n/a** — the diff adds no module-level array or catalog
(scalars and two `Record`s only)
Boundary types honest about untrusted input: **n/a for new types**; the one boundary the diff
interacts with is `loadSnapshot`, where **M3** is the gap

**Verdict: APPROVE with comments.** Nothing here blocks the merge. M1 and M2 are each a handful of
lines and both have a probe-verified fix; M3 is one line at the boundary and closes the last way
the pre-P8 meaning of `'splash'` can still reach the screen.
