# Parity phase P0 — aggregated review (vetted) — FIX-DELTA ROUND 2

- **Phase:** p0-r2 (`feat/parity-p0`, PR #29)
- **Mode:** FIX-DELTA round 2 (re-review of the round-2 fix commits on top of the round-1 vetted fix-delta review)
- **Date:** p0-r2 (phase id — no timestamp)
- **Diff:** `git diff master...feat/parity-p0` — 83 files, +5868 / −227; round-2 fix set = everything after review merge `f69aa92`: 23 files, +438 / −56 (branches `parity/p0-fix2-options` → `5ce0202`, `parity/p0-fix2-boundary` → `db16e5a`, `parity/p0-fix2-store` → `51a3da7`)
- **Prior vetted review:** `docs/code-reviews/parity/p0/p0-review-fixdelta.md` (R-19 … R-30; R-1 … R-18 CLOSED and not re-litigated)
- **Lanes aggregated:** typescript, web, tests, silent-failures, type-design (all five round-2 lane files read in full; inventory at the end)
- **Binding contracts applied:** `features/demo/CLAUDE.md` (incl. its round-2 barrel amendment), `docs/planning/demo-phone-parity/01-master-parity-plan.md` §4, `docs/code-reviews/deferred.md` §15 (as re-scoped), §29 addendum
- **Aggregator spot-checks:** no BLOCKER/MAJOR was filed by any lane; 9 of the 10 vetted MINORs were independently re-verified against the worktree at file:line — the render-body selector call + in-selector warn (`selectors.ts:66-97`, `DemoExperience.tsx:642`, `:839`), the bridge comment vs the store comment (`DemoExperience.tsx:729-734` vs `create-store.ts:216-219`, `:257-260`), the existence-only repair block (`persistence.ts:404-431` — no ownership comparison anywhere in it), the unannotated top-level schema (`persistence.ts:309-319`), `clearSnapshot` and the stale `persistDemoStore` docstring (`persistence.ts:433-450`, `:464-501`), the whole of `app/demo/error.tsx` (header comment `:12-14` vs the barrel import `:58`; unbound `catch` `:60-62`; `reset()` outside the `try` `:63`), the R-25 guard test's scan scope (`error.test.tsx:49-57` reads only `error.tsx`; its one `style.css` mention is a comment), and the stale `FORM_OPTIONS` inventory rows (`demo-inventory.md:189`, `:653-656`) against the grep-proven tombstone-only survivals. The remaining MINOR (R-34's "904/904 stays green under value drift") rests on the tests lane's empirical mutation probe, whose mechanism is fully consistent with the guard code re-read here.

## Verdict

**APPROVE** — 0 BLOCKER · 0 MAJOR · 10 MINOR.

All 12 prior findings (R-19 … R-30) are **FIXED** — no PARTIAL, no UNFIXED — with several fixed beyond the mandate (R-19 took all three converged remedies rather than the ~5-line bridge minimum; R-20 resolved by outright deletion; R-21 took the stronger structural option; R-23's lane-brief rewrite went further than asked). The tests lane probe-verified the behavioural fixes red against the pre-fix code, including the two gaps round 1 flagged as unpinned (`canComplete` hardcoded-true and the `reviewAgain` reset). Gates are green on the round-2 head (`51a3da7`): `tsc --noEmit` clean, `next build` clean, vitest **904/904** across 120 files (coverage 97.14 S / 88.84 B / 98.85 F / 98.42 L, zero timeouts), `/demo` First Load JS unchanged at **107 kB** for the third consecutive measurement, `/demo/error` segment chunk 1 748 B, and the store-bridge / engine-purity / barrel / marketing-isolation / determinism sweeps all preserved.

The 10 MINORs are residuals of the fixes themselves — two stale comments, two doc-staleness items, one dev-console placement, one guard gap, one untested-and-silent failure arm, one uncovered construction path for the new invariant, one in-session widening of a pre-existing dead state, and one missing type annotation. None gates the merge; none requires re-architecture. Nothing was demoted or dropped as unverifiable.

| Severity | Count |
|---|---|
| BLOCKER | 0 |
| MAJOR | 0 |
| MINOR | 10 |

## Prior findings — final status

Verdicts are unanimous across all five lanes; the tests lane additionally probe-verified R-19 (both halves), R-21 (both directions), and R-22 (the exact G3/G4 regression) red against reverted code.

| Prior | Sev (initial) | Status | Fix commit | Evidence / residual |
|---|---|---|---|---|
| R-19 | MAJOR | **FIXED** | `b86cd46` | All three converged remedies landed: bridge derives the case from the open location (`DemoExperience.tsx:735`, `:741-746`); pair invariant restored at the source (`createCase` clears `currentLocationId` `create-store.ts:219`; `addLocation` writes both halves `:259-260`); disabled-hint copy truthful by construction. Mandated regression + defense-in-depth forced-pair test both present; TESTS-7's round-1 probe (hardcode `canComplete`) is now red. The `completeCase(locationId)` reshape was deliberately not taken (rationale in the commit body, logged in deferred §29 addendum) — accepted, not re-flagged. Residuals → **R-32** (load path uncovered), **R-35** (in-session dead-form entry), **R-36** (stale invariant comment) |
| R-20 | MINOR | **FIXED** | `e182186` | `optionValues` deleted outright with its barrel line; `barrel.test.ts:14` pins both `FORM_OPTIONS` and `optionValues` off the public surface; R-17's mutable-return half moot by deletion; tombstone at `import.ts:199-202` points at the module, not the deleted helper. Same-class doc residual → **R-40** |
| R-21 | MINOR | **FIXED** | `e8621bd` | Structural `reviewAgainFor: string \| null` (the stronger option), null-safe gate re-derived, `openLocation` reset retained; both directions probe-verified red |
| R-22 | MINOR | **FIXED** | `4abad16` | Strict collapsed `getByText('Complete')` + expanded `toHaveLength(2)`; probe-verified to catch the exact G3/G4 row regression the loose form survived |
| R-23 | MINOR | **FIXED** | `c4cf8b4` | `demo-inventory.md:26` rewritten to what shipped (every clause lane-verified against the code); `web-reviewer.md:70` moves `sessionStorage` into the guarded-APIs table with the D2 rejection stated — stronger than asked. Same-doc residual → **R-40** |
| R-24 | MINOR | **FIXED** | `480321a` | "Start fresh" secondary control, clear-before-reset ordering pinned by `invocationCallOrder`, barrel rule respected (`features/demo/index.ts:6`, documented in `features/demo/CLAUDE.md`), Safari-private-mode property access guarded, escape mechanism verified end-to-end (dispose-flushes-then-clear-then-remount), bundle unmoved. Residuals → **R-31** (failure arm silent + untested), **R-37** (stale header comment) |
| R-25 | MINOR | **FIXED** | `207963f` | Three `@theme` mirrors in `app/css/style.css:46-48` with two-way cross-references; utilities confirmed compiled in the built CSS; values byte-equal to the tokens; `color-mix` equivalence verified; a source-scan guard added beyond the mandate. Residual (the guard pins syntax, not values) → **R-34** |
| R-26 | MINOR | **FIXED** | `8a4dd55` | `catch (e)` + cause passed to the warn (`persistence.ts:486`, `:494`); test asserts the cause object, so a revert to a bare string fails the suite |
| R-27 | MINOR | **FIXED** | `c41c5ae` | Option (a): count + dev-warn in `selectAdjustedScopes` mirroring `generateExtractedScopes`, both arms tested; deferred §15 struck the `selectors.ts` half and re-scoped the remaining trigger to `time.ts`. Residual (the warn's render-scope placement) → **R-33** |
| R-28 | MINOR | **FIXED** | `6566531` | `FullShapeIn<T>` added and applied to the last unguarded literal; type-design re-ran the omitted-key probes on this head (optional and required omissions both caught) — device 2 now covers all 18 shape literals. Residual (device 1 still absent on the top level) → **R-39** |
| R-29 | MINOR | **FIXED** | `ac4cb5e` | Both coordinate-`source` unions derive from the canonical tuples; the documented geocode-only narrowing is now `Exclude<…, 'gps'>` — compiler-checked; no import cycle (`engine/types/index.ts` imports nothing) |
| R-30 | MINOR | **FIXED** | `7ef5608` | Header names the widening direction, its mechanism, the runtime consequence (R-4 wipe path), and the load-bearing "new closed unions MUST be `as const` tuples consumed via `z.enum(TUPLE)`" rule; the premise re-verified by probe (widening still compiles silently — hence the doc) |

## New findings table

IDs continue from the prior vetted docs (R-1 … R-30) so references stay unambiguous. All are MINOR; ordered by how much they are worth taking before merge, not by severity.

| ID | Sev | Where | Claim | Lenses |
|---|---|---|---|---|
| R-31 | MINOR | `app/demo/error.tsx:56-64` | The R-24 escape hatch's failure arm is doubly invisible: the unbound `catch {}` swallows a chunk-load failure with no breadcrumb while the button's label promises a session wipe that didn't happen — and the degrade-to-`reset()` contract is untested (moving `reset()` inside the `try` leaves 904/904 green) | silent-failures, tests |
| R-32 | MINOR | `features/demo/engine/store/persistence.ts:409` | R-19's new selection-pair invariant is enforced in all three store actions but not at the one construction path that ingests state the engine didn't produce: `loadSnapshot` validates the two ids independently by existence, so an incoherent snapshot pair survives rehydration — and `selectCaseNotesData`/the Completion header still read the case via `currentCaseId`, printing one case's OCC number over another case's location | typescript, silent-failures, type-design |
| R-33 | MINOR | `features/demo/engine/store/selectors.ts:93-95` | R-27's dev-warn was placed inside `selectAdjustedScopes`, which the bridge calls in the render body — so it fires per render (≈2× per keystroke on the Time-Offset screen under StrictMode) with a fixed line and an unbound `catch`, not once per drop event like the `generateExtractedScopes` sibling it cites | typescript, web |
| R-34 | MINOR | `app/demo/__tests__/error.test.tsx:49` + `app/css/style.css:46-48` | R-25's guard pins `error.tsx`'s *syntax* only; nothing asserts the `@theme` mirror's *values* still equal `GLASS.*` or that the tokens exist — probe: drifting `--color-demo-accent-from` to `#00ff00` AND renaming `--color-demo-error` leaves 904/904 green (the orphaned utility is silently not generated) | tests (web independently noted it as un-filed hardening) |
| R-35 | MINOR | `features/demo/engine/store/create-store.ts:219` | `createCase`'s new `currentLocationId: null` makes the pre-existing "dead form" state (10 of 11 wizard screens fully interactive but silently discarding every keystroke) enterable from *inside* a working session in 3 taps — the exact state `loadSnapshot` repairs at boot, unannounced everywhere but Completion | silent-failures |
| R-36 | MINOR | `features/demo/ui/DemoExperience.tsx:730` | The R-19 fix's own rationale comment asserts, in the present tense, an invariant the same commit invalidated ("only switchLocation writes both") — directly contradicting `create-store.ts:216-218` ("No action leaves the pair pointing across cases") added three lines from the writes that falsify it | typescript |
| R-37 | MINOR | `app/demo/error.tsx:12-14` | The header comment still claims "the demo feature barrel is untouched (this imports nothing from @/features/demo)" — both clauses falsified by the same round's R-24 fix (`:58` imports the barrel; `features/demo/index.ts:6` was widened specifically for this file) | web |
| R-38 | MINOR | `features/demo/engine/store/persistence.ts:466-467` | `persistDemoStore`'s docstring still says write failures "are swallowed" — falsified twenty lines below by the R-14/R-26 fix code (dev-warn with cause + stale-snapshot clear), inviting a future "noise" deletion of the breadcrumb | silent-failures |
| R-39 | MINOR | `features/demo/engine/store/persistence.ts:309` | `persistedStateSchema` remains the only schema in the file without device 1 (`z.ZodType` annotation); `FullShapeIn` enforces key exhaustiveness but not required-ness, so a required future field declared `.optional()` passes silently — probe-verified, and the Input-agnostic annotation form compiles on this exact shape | type-design |
| R-40 | MINOR | `docs/planning/demo-phone-parity/demo-inventory.md:189, 653-656` | The inventory still describes `FORM_OPTIONS` (in `engine/logic/import.ts`) as a live second source of truth for the export/resolution option sets — the registry was deleted by R-11/R-20; only tombstone comments survive. Same doc-staleness class R-23 fixed one section over | type-design (passed as an observation; elevated and verified by the aggregator) |

---

## R-31 [MINOR] The escape hatch's failure arm is silent to the operator and invisible to the suite

**Where:** `app/demo/error.tsx:56-64` — `try { const { clearDemoSnapshot } = await import('@/features/demo'); clearDemoSnapshot() } catch { /* chunk load failed */ } reset()`.

**Lenses:** silent-failures (SF-1) + tests (TESTS-10) — merged: two lanes filed the two faces of the same defect (the failure arm of the one recovery control R-24 added is unobservable), and one combined fix closes both.

**Claim.** (a) *No breadcrumb, no visitor signal:* if the dynamic barrel import fails, the handler falls through to a plain `reset()` — the button behaves exactly like "Try again" while its label asserts "clears this tab's demo session". The visitor concludes clearing didn't help; in fact it never happened. The adversarial input is the most common cause of this boundary firing at all: a Next.js `ChunkLoadError` after a redeploy — and the barrel export ships in the same chunk as `DemoExperience`, so the recovery control depends on loading precisely the chunk that just failed. Chunk unavailable → catch → `reset()` → same throw → error page again: a silent loop, in production and dev alike. This is the same unbound-`catch` class R-26 fixed one file over *in the same round*, in its stronger form (there a warn existed and lacked the cause; here there is no log at all). (b) *Untested degrade contract:* the file's own comment promises "fall back to a plain reset", but only the happy paths are pinned (`error.test.tsx:32-41` order; `:21-30` Try-again-does-not-clear). The tests lane's probe moved `reset()` inside the `try` — a refactor a future reader would call a tidy-up, which makes "Start fresh" a dead button in exactly the chunk-failure scenario — and the whole suite stayed green (4/4 in the file, nothing else imports it).

**Evidence.** All lines aggregator-re-read: the unbound `catch` at `:60-62` (comment only, no binding, no warn), `reset()` at `:63` outside the `try`. Convention diverged from: `ui/import/geocode.ts:43` (ungated `console.warn(…, e)` added by review for this exact "fails identically forever with no signal" reason); `persistence.ts:447` and `:494` (both storage paths got breadcrumbs this same round; this path got none). Probe facts per the tests lane (empirical, method stated in its file).

**Suggested fix.** One line plus one test, both drafted by the lanes: `} catch (e) { console.warn('[demo] "Start fresh" could not load the session-clear module — the snapshot was NOT cleared; falling back to a plain reset', e) }`, and a third case beside the existing two that makes `clearDemoSnapshot` throw once and asserts `reset` is still called (exercises the same catch arm as a rejected `import()` with no module-loader trickery). Optional honesty upgrade (silent-failures'): a local state flag in the catch rendering "Couldn't clear the session — close this tab to start fresh".

**Suggested owner:** P0.1 (error boundary) authoring agent — owner of the R-24 fix (`480321a`).

---

## R-32 [MINOR] The new selection-pair invariant is not enforced at its second construction site — `loadSnapshot`

**Where:** `features/demo/engine/store/persistence.ts:409-411` (the R-15 repair block); consumers `features/demo/engine/store/selectors.ts:220, 224` (`selectCaseNotesData` — OCC number + unit from `currentCase`, everything else from the location), `features/demo/ui/DemoExperience.tsx:713` (Completion summary header).

**Lenses:** typescript (TYPESCRIPT-3) + silent-failures (SF-2) + type-design (TYPE-DESIGN-F) — three independent filings of the same gap, merged; type-design's writeup is the fullest and is the base here. All three converge on the same two-line fix.

**Claim.** `b86cd46` establishes "no store **action** leaves the pair pointing across cases" and enforces it in all four writers (`initialState`, `createCase`, `addLocation`, `switchLocation` — the complete set, grep-verified by three lanes). But rehydration is a construction path that is not an action, and it is the one place the demo ingests state it did not produce. The repair block validates `currentCaseId` and `currentLocationId` independently, by existence only (`caseIds.has(…)` / `locationIds.has(…)` — aggregator re-read `:404-431` in full; no `loc.caseId === currentCaseId` comparison exists). A snapshot pairing case B with a location of case A passes both checks unchanged. The completion CTA is now immune (it derives the case from the location), but the readers that still trust `currentCaseId` are not: `selectCaseNotesData` would print case B's occurrence number and unit over case A's location data in the case-notes PDF payload, and the Completion header does the same — a quiet contradiction on the one screen the court-style document is generated from. The codebase already disagrees with itself about which id owns the case: `generateNotes` derives it from the location (`create-store.ts:371`), which is exactly the R-19 rule; `selectCaseNotesData` and the bridge's `currentCase` still use the other rule. Additionally, `persistence.test.ts:302-313` pins "live location + dropped case" as a supported rehydrate, so the dropped-case variant of the same misattribution (no OCC number at all) is *test-blessed* today.

**Reachability, stated honestly (why MINOR, not a re-open of R-19).** The live store can no longer produce the pair — every UI path was re-walked by two lanes. It takes a hand-edited devtools snapshot, a snapshot written by the round-1 head under the (correctly) unbumped `dvr-demo-state-v2` key, or a future action that writes one half. But the repo already treats this boundary as adversarial — the R-7 own-property fix and the whole R-15 repair pass exist precisely for shape-valid, semantically broken input — and this is cheap insurance on an invariant this round just paid to establish.

**Suggested fix** (smallest first): two lines in the repair block — resolve the open location and let it own the case (`const openLoc = …find(l => l.id === currentLocationId); const currentCaseId = openLoc ? openLoc.caseId : <existing existence check>`) — mirroring the bridge's R-19 rule so both construction paths obey one law; update the `persistence.test.ts:302` expectation (it currently pins the pre-fix answer for the dropped-case variant) and add one cross-case pin. Optional read-side follow-up: derive `currentCase` from `currentLocation.caseId` in the bridge and `selectCaseNotesData`, matching `generateNotes`. Also fold in type-design's one-line guard rail: state the correlated precondition in `completeCase`'s docstring with a pointer to deferred §29. Acceptable alternative if the team declines the loader change: an explicit "rehydration is exempt; the bridge defends" note at `create-store.ts:216-218` — but the two-line realignment is strictly better and closes R-36's contradiction along the way.

**Suggested owner:** P0.4 (persistence) authoring agent, coordinating with P0.2 on the optional read-side half.

---

## R-33 [MINOR] R-27's dev-warn is emitted from render scope — per-keystroke repetition instead of per drop event

**Where:** `features/demo/engine/store/selectors.ts:93-95` (the warn), `:78` (the still-unbound `catch`); call sites `features/demo/ui/DemoExperience.tsx:642` (render body of `activeScreen()`, invoked in JSX at `:839`, no memo) and `:538` via `selectCaseNotesData` (`selectors.ts:218`) per PDF preview.

**Lenses:** typescript (TYPESCRIPT-1) + web (WEB-11) — merged; the two writeups agree at every line. **Conflict settled:** silent-failures considered the same fact and deliberately did not file it ("log volume is not a silent failure — it is precisely the treatment the review mandated"). That is a lane-scope judgment, not a factual dispute: the mechanism is real (aggregator re-verified the render-body call site and the in-selector warn), the mandate asked for the `generateExtractedScopes` *treatment* (count → warn), and the sibling emits from an **action** — one invocation, one line — while this one emits per render. The two lanes that filed it win on the substance; the defect is operator-ergonomics regression inside the R-27 fix, not a re-litigation of it.

**Claim.** Once any scope holds a non-canonical requested time, the Time-Offset screen warns on every render of the bridge: each keystroke in the DVR/actual fields writes `capture.*`, a subscribed slice (`DemoExperience.tsx:178`), so typing a 19-character timestamp produces ~19 identical fixed lines — doubled in dev by React StrictMode (App Router default in Next 15), since `console.warn` in the render phase is exactly what StrictMode double-invokes. The repeats are indistinguishable from 19 separate drops: the message carries a count but no scope ids, and the `catch` binds no error — the same diagnosability gap R-26 closed one commit earlier in this round. Reachability is real (free-text imported frames are the engine's own named source of non-canonical scopes, and PDF import is the headline flow). Production is unaffected — the string is confirmed absent from the built chunks — which is why this is MINOR.

**Suggested fix.** Any of the lanes' three shapes: (a) emit from the action boundaries that can create the condition (`calculateOffset` / `applyImport`), leaving the selector silent — the closest match to the cited sibling; (b) keep it in the selector but make repeats self-identifying and rate-limited (bind the error, name the dropped scope ids, gate on a module-level last-warned key); or (c) if per-render repetition is accepted, say so in the comment at `:79-80` so the next reader doesn't file it as a loop bug. The existing tests survive any of the three with a one-line adjustment.

**Suggested owner:** P0.2 authoring agent — owner of the R-27 fix (`c41c5ae`).

---

## R-34 [MINOR] The `@theme` mirror's values are unguarded — R-25's silent drift moved one file over, it didn't die

**Where:** `app/demo/__tests__/error.test.tsx:49-57` (the guard), `app/css/style.css:46-48` (the mirror it never opens), `features/demo/ui/glass-tokens.ts:23-24` (the values that will drift).

**Lens:** tests (TESTS-9), probe-verified empirically; web independently identified the identical gap and recorded it as un-filed optional hardening — no conflict, one lane simply carried it over the line. Aggregator re-read the guard: it reads only `error.tsx`, checks banned substrings and whole-file `includes()` presence — never opens `style.css`, never compares a value.

**Claim.** The concrete regression R-25 described — a future `GLASS` accent/error edit silently strands the `/demo` error page on the old palette, visibly diverging from the in-frame fallback it twins — is still reachable. The tests lane's probe applied *both* mutations at once (`--color-demo-accent-from` drifted to `#00ff00`; `--color-demo-error` renamed, orphaning `border-demo-error/30` and `bg-demo-error/6`): **904/904 green**, and Tailwind generates nothing for an unknown utility, so there is no build error either — the error page just loses its red border/tint. Secondary: the presence check is a whole-file `includes()`, satisfiable by a comment mentioning `demo-error` even with the class deleted — plausible, since the fix's own house style leaves cross-reference comments in all three files.

**Suggested fix.** ~5 lines in the existing suite (either file), same source-scan idiom, aimed at the file that drifts: regex the three `--color-demo-*` hex values out of `style.css` and assert equality with `GLASS.accentFrom`/`accentTo` and `#ff4757` (= `GLASS.borderError`'s rgb). Optionally tighten the presence check to the utility-class strings (`from-demo-accent-from`, `border-demo-error/`). The tests lane's draft snippet is ready to paste.

**Suggested owner:** P0.1 authoring agent (guard-test owner), coordinating with P0.5 (glass tokens) — same pairing as R-25.

---

## R-35 [MINOR] `createCase` now creates in-session the dead-form state that `loadSnapshot` exists to repair at boot

**Where:** `features/demo/engine/store/create-store.ts:219` (the clear), `:277-279` + `:298`, `:323`, `:400`, `:441`, `:454` (the silent early-returns); `features/demo/ui/DemoExperience.tsx` `activeScreen()` (no `currentLocation === null` arm on any wizard case); entry path `ExploreChecklist.tsx:71` → `explore.ts:42` (every wizard screen has an unconditional rail row).

**Lens:** silent-failures (SF-3). **Scope settled:** typescript and web both saw the same fact and explicitly deferred it to this lane as pre-existing; silent-failures filed it with the honest framing — the dead-form *state* predates round 2 (a fresh boot reaches it identically), but the round-2 fix adds a **new in-session entry path** from inside a working session, which puts the widening squarely inside the fix-delta blast radius. Kept on that basis; the pre-existing class itself is not being re-opened.

**Claim.** After New Case (3 taps from a working wizard: Rail → Cases → New Case → Rail → any wizard step), 10 of the 11 wizard screens render a fully interactive form whose every keystroke is silently discarded (`updateField` returns early with no location), and "Calculate Offset" no-ops the same way — console silent. Only Completion announces the precondition (disabled button + truthful hint, courtesy of R-19). The trade `b86cd46` made is deliberate and correct (the alternative was the previous location bleeding into the new case); the residual is that the resulting state is unannounced on the other ten screens, while the codebase's own boot-time judgment (`persistence.ts:404-406` — route to `'cases'` "instead of a dead form") encodes exactly the repair that is missing in-session.

**Suggested fix.** Cheapest match to the existing decision: in `activeScreen()`, when `view` is a wizard screen and `currentLocation === null`, render the existing `placeholder(view)` shape with "No location open — open one from Cases" (or have the rail's wizard rows jump to `'cases'` in that state). Reuses the judgment `loadSnapshot` already encodes; no new machinery.

**Suggested owner:** P0.2 (truthful statuses) authoring agent — owner of the R-19 fix that added the entry path.

---

## R-36 [MINOR] Two load-bearing invariant comments introduced by one commit contradict each other

**Where:** `features/demo/ui/DemoExperience.tsx:730` ("currentCaseId can lag the location (**only switchLocation writes both**)") vs `features/demo/engine/store/create-store.ts:216-218` ("createCase clears it; addLocation and switchLocation set both halves. **No action leaves the pair pointing across cases.**").

**Lens:** typescript (TYPESCRIPT-2). Aggregator re-read both blocks — the contradiction is verbatim, both added by `b86cd46`.

**Claim.** The bridge comment states, in the present tense, the *pre-fix* world its own commit abolished. A maintainer trusting `:730` concludes the store still emits incoherent pairs; one trusting `create-store.ts:218` concludes the bridge's defensive derivation is dead weight and "simplifies" it back to `currentCaseId` — re-introducing R-19 exactly. The defensive derivation is in fact still load-bearing for the one construction path that is not an action (rehydration — R-32), which neither comment mentions.

**Suggested fix.** One line: reword `:730` to past tense and name the current state — before `b86cd46` only `switchLocation` wrote both halves; all writers are coherent now; the derivation remains as defense-in-depth for rehydration (cross-ref R-32). Keep the defensive code either way. If R-32's loader realignment lands, both comments become true under one rule and this reword is the natural companion edit.

**Suggested owner:** P0.2 authoring agent — owner of `b86cd46`; coordinate with R-32's owner if both land.

---

## R-37 [MINOR] `error.tsx`'s header comment asserts the exact isolation claim its own round falsified

**Where:** `app/demo/error.tsx:12-14` — "…the demo feature barrel is untouched (this imports nothing from @/features/demo)".

**Lens:** web (WEB-10). Aggregator re-read the file: the header at `:12-14` vs the barrel import at `:58` (`await import('@/features/demo')`), and `features/demo/index.ts:6` widened specifically for this file.

**Claim.** Both clauses are now false, and this is the isolation claim a future auditor of the marketing↔demo wall reads first — the wall's own guard regex treats `import(` as an import form, so a comment denying one is actively misleading. It also buries the real, defensible property (the import is *async*; the demo graph stays out of the error segment's initial JS — measured 1 748 B), which is already correctly stated two comments lower (`:50-53`).

**Suggested fix.** Rewrite the third clause to what is true: no *static* import from `@/features/demo`; the barrel is reached only through the async import in the "Start fresh" handler, keeping the demo chunk out of this segment's initial JS. Keep the chrome-free sentence as-is.

**Suggested owner:** P0.1 authoring agent — same file and commit as R-31/R-37's parent fix.

---

## R-38 [MINOR] `persistDemoStore`'s docstring still promises the silence that R-14/R-26 removed

**Where:** `features/demo/engine/store/persistence.ts:466-467` ("Write failures (quota, security) are swallowed — persistence must never surface in the demo") vs `:486-501` (dev-warn **with the cause** + stale-snapshot clear).

**Lens:** silent-failures (SF-4). Aggregator re-read both — the contract sentence and the code that falsifies it are twenty lines apart; both fix rounds updated the inline comment inside `save()` and left the docstring untouched.

**Claim.** A maintainer reading the contract concludes there is no diagnostic to look for — and would see nothing wrong in deleting the warn as noise, the exact breadcrumb-removal pattern this lane exists to catch, enabled by the module's own documentation.

**Suggested fix.** One sentence: write failures never surface *to the visitor*, but they are not silent — a dev-gated `console.warn` carries the cause and the stale snapshot is cleared so a refresh boots honestly empty (R-14/R-26).

**Suggested owner:** P0.4 authoring agent.

---

## R-39 [MINOR] `persistedStateSchema` still lacks device 1 — `FullShapeIn` does not enforce required-ness

**Where:** `features/demo/engine/store/persistence.ts:309-319` — `z.object({ … } satisfies FullShapeIn<PersistedState>)`, no `z.ZodType` annotation; every other schema in the file carries both devices.

**Lens:** type-design (TYPE-DESIGN-G), probe-verified on this head against the repo's zod: a required key declared `.optional()` passes device 2 silently (its per-key target already admits `undefined`), while the Input-agnostic device-1 form — `z.ZodType<PersistedState, z.ZodTypeDef, unknown>` — both compiles on this exact shape (enum + refined strings + `z.record` + nullable) *and* catches the same mutation (TS2322). Aggregator re-read `:309-319` and confirmed the annotation's absence.

**Claim.** The guard header at `:81-83` presents device 1 as the file's general guarantee; the top-level literal is the one exception. The hole is latent, not live — all nine current fields are caught indirectly one hop later in `loadSnapshot`'s typed consumption — it opens for a future field whose only consumer is the pass-through return literal. One annotation restores the consistency the header already promises.

**Suggested fix.** One line at `:309` (the probe-validated annotation above), and drop the now-obsolete "the one shape whose fields refine from a wider input" hedge from `FullShapeIn`'s docstring — with the `unknown` Input parameter, devices 1 and 2 compose on every shape in the file.

**Suggested owner:** P0.4 authoring agent — same device family as R-28/R-30.

---

## R-40 [MINOR] The parity inventory still briefs future phases on a registry that was deleted two reviews ago

**Where:** `docs/planning/demo-phone-parity/demo-inventory.md:189` (Export-information row: "the option lists here are hardcoded in the screen and differ from `FORM_OPTIONS` in `engine/logic/import.ts`") and `:653-656` (drift item 6: names `FORM_OPTIONS`' current values and its `resolution`/`fps` overlap with `field-options.ts` as live facts).

**Lens:** type-design passed this to the aggregator explicitly as an observation ("a docs/web item, out of my lane"); no other lane covered those lines. **Elevated by the aggregator after independent verification:** `FORM_OPTIONS` was deleted by `a0ec7f6` (R-11) with `optionValues` following in `e182186` (R-20); grep over `features/demo` shows only the tombstone comment (`import.ts:199`) and the barrel gone-list pins — there is no registry to differ from.

**Claim.** This is the same doc-staleness class R-23 was filed and fixed for, in the same document, one section over: the inventory is the brief future parity phases are planned from, and it currently instructs a P1 author to reconcile `ExportInfoScreen` against a second source of truth that no longer exists (the tombstone explicitly redirects to `ui/screens/field-options.ts` as the single source). Cheap to fix, misleading to leave.

**Suggested fix.** Rewrite `:189`'s drift note and `:653-656`'s item 6 to the post-R-11/R-20 world: `field-options.ts` is the single source for the screen's option sets; the former `FORM_OPTIONS` registry was deleted (R-11/R-17/R-20 — see the `import.ts:199` tombstone); the remaining P1 question is normalizing *imported free-text* values against `field-options.ts`, not reconciling two registries.

**Suggested owner:** P0.3 (option-set consolidation) authoring agent — owner of the R-11/R-20 deletions whose doc shadow this is.

---

## Dropped / demoted appendix

Nothing was dropped as unverifiable — every lane finding survived spot-checking, and no severity was overridden (all lanes filed everything MINOR; the aggregator checked each merged finding for promotion and found none warranted — every item is either dev-only, doc-only, comment-only, adversarial-input-only, or a widening of a pre-existing state). Aggregation decisions:

1. **SILENT-FAILURES-1 + TESTS-10 merged into R-31.** Two faces of one defect — the escape hatch's failure arm is invisible to the operator (no breadcrumb) and to the suite (no degrade-contract test) — same eight lines, same owner, one combined fix. Both writeups retained in substance.
2. **TYPESCRIPT-3 + SILENT-FAILURES-2 + TYPE-DESIGN-F merged into R-32.** Three independent filings of the loader-coherence gap at the identical line (`persistence.ts:409`), converging on the same two-line fix. Type-design's version is the base (it adds the test-blessed dropped-case variant, the `generateNotes` internal precedent, and the §29 docstring guard rail); silent-failures contributed the PDF-misattribution framing; typescript contributed the "acceptable alternative resolution" note. All three independently and honestly scoped reachability to adversarial/stale storage — no severity conflict.
3. **TYPESCRIPT-1 + WEB-11 merged into R-33; conflict with silent-failures settled in favor of filing.** Silent-failures examined the same mechanism and deliberately declined to file ("log volume is not a silent failure; it is the treatment the review mandated"). That is correct *within its lane's definition* but does not answer the filed claim: the mandate asked for the `generateExtractedScopes` treatment, and the shipped placement diverges from the cited sibling in exactly the dimension (event-scoped vs render-scoped emission) that makes the breadcrumb useful. Mechanism aggregator-verified at the call site. Filed once, MINOR, with the SF position recorded here as the reason this cannot rise above MINOR.
4. **TESTS-9 kept as R-34 despite web's un-filed-hardening classification.** No contradiction to settle: web called the identical gap real but optional; tests filed it with an empirical two-mutation probe (suite green under value drift + token orphaning). The probe converts "optional hardening" into "the guard does not guard the thing R-25 was about" — kept.
5. **SILENT-FAILURES-3 kept as R-35; the pre-existing-vs-introduced disagreement was already resolved between the lanes.** Typescript and web explicitly deferred the topic to silent-failures as pre-existing; silent-failures filed only the *widening* (the new in-session entry path created by `b86cd46`), which is inside the fix-delta blast radius by any reading. The pre-existing dead-form class itself is not re-opened.
6. **Type-design's observation (b) elevated to R-40** after independent verification (grep + file read). Recorded as an elevation, not a lane finding — the lane deliberately delegated the call to the aggregator.
7. **Lane notes not elevated to findings** (checked-and-cleared by their lanes; aggregator concurs): the `reset()`-outside-`try` unhandled-rejection shape on React's own segment-reset setter (typescript — not a realistic input; the *testable* half of that code path is R-31); `clear-demo-snapshot.ts`'s five-line duplication of `sessionStorageOrNull` (deliberate decoupling, commented); `Exclude<…, 'gps'>` silently widening if `'gps'` ever leaves the tuple (theoretical, documented); `FullShapeIn` mis-application risk (docstring-scoped); the barrel widening itself (documented, single consumer, the aggregate's own R-24 remedy); "Start fresh" pulling the whole demo chunk (async, measured, same chunk the page already loaded); `addLocation` not validating the case id (no reachable construction site; R-32's fix closes it as a side effect); `reviewAgainFor` holding one location at a time (the type says exactly what it does); the R-27 negative test's theoretical vacuity (guarded by loud siblings); the engine barrel not re-exporting `clearSnapshot` (no consumer to mislead); `visited`'s bare-string key space at the boundary (deliberate, honest form); deferred §4/§5/§15-remainder/§16/§18/§27/§28 triggers re-checked individually by their owning lanes — none fired in round 2.
8. **Deliberate choices honoured, not re-flagged** (per the orchestrator brief and both prior rounds): the non-adopted `completeCase(locationId)` reshape (deferred §29 addendum — its one-line docstring guard rail is carried *inside* R-32's fix list, accepting the deferral), the class-based in-frame boundary, sessionStorage-over-localStorage (D2), the phone-verified asymmetries, the "Location Complete" copy, and deferred §29–§32.

## Raw lane-file inventory

| Lane file | Self-reported counts (new) | Prior-finding verdicts | Lane verdict |
|---|---|---|---|
| `docs/code-reviews/parity/p0/lane-typescript.md` | 0 B / 0 M / 3 m (TYPESCRIPT-1..3) | R-19, R-20 FIXED (lane-owned); R-21…R-30 spot-checked FIXED | APPROVE w/ comments |
| `docs/code-reviews/parity/p0/lane-web.md` | 0 B / 0 M / 2 m (WEB-10, WEB-11) | R-23, R-24, R-25 FIXED (lane-owned); cross-lane no regressions | APPROVE w/ comments |
| `docs/code-reviews/parity/p0/lane-tests.md` | 0 B / 0 M / 2 m (TESTS-9, TESTS-10) | R-19, R-21, R-22 FIXED probe-verified; R-24 FIXED w/ test gap; R-25 FIXED-code/PARTIAL-guard; rest FIXED | APPROVE |
| `docs/code-reviews/parity/p0/lane-silent-failures.md` | 0 B / 0 M / 4 m (SF-1..4) | R-19, R-24, R-26, R-27 FIXED (lane-owned); R-20 FIXED by deletion | APPROVE w/ comments |
| `docs/code-reviews/parity/p0/lane-type-design.md` | 0 B / 0 M / 2 m (TYPE-DESIGN-F, G) | R-19, R-20, R-28, R-29, R-30 FIXED (lane-owned) | APPROVE w/ comments |

Raw totals 0 B / 0 M / 13 m across lanes → after dedupe: 9 (one three-way merge → R-32; two two-way merges → R-31, R-33) → **plus one aggregator-verified elevation (R-40) = 0 BLOCKER / 0 MAJOR / 10 MINOR**. The tests lane's R-25 "PARTIAL in guard" nuance and R-24 "test gap" nuance are carried as R-34 and R-31 respectively rather than as PARTIAL statuses — in both cases the mandated fix landed in full and the residual is new hardening of a guard the fix itself introduced.
