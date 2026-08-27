# Lane — silent failures (W4: U8.1 boot · U8.2 ambient · U8.3 · U8.4 design-sync)

**Agent:** `silent-failure-hunter` · **Mode:** code review · **Scope:** `git diff master...def2aec`
**Base contract:** `.claude/skills/fleet-orchestration/reviewer-contract.md`
**Probe worktree:** `C:\Users\kriss\AppData\Local\Temp\claude\probe-w4r-sfh-dsync`, cut at `def2aec`,
detached, own `pnpm install`. **Torn down and verified:** `unlinked 549 junction(s) in 2 pass(es)` ·
main checkout `.pnpm` 240 → 240 · exit 0. Tree restored between every probe, `git status` empty before
teardown. Regression sweep at this head, post-restore: **125 files / 1,736 passed + 2 todo, 0 failed.**

Every KILLED/SURVIVED cites the canonical source it mutated. Six probes: 2 KILLED (as intended),
3 SURVIVED, 1 clean-tree reproduction with no mutation at all.

---

## CRITICAL

None.

---

## HIGH

### [HIGH] Preview to component prop drift is still unguarded, and 8 of the 37 demo previews are drifted RIGHT NOW at `def2aec` — including the one prop U8.4 used as its own proof

**File:** `.design-sync/NOTES.md:224-232` (the admission) · `features/demo/ui/__tests__/design-sync-entry.test.ts` (the guard that does not cover it) · `tsconfig.json:26-27` (the reason it cannot)

**Issue.** `NOTES.md` states the problem in its own words: *"Nothing runs `package-validate.mjs` on a
component prop change, and previews are not typechecked… by 2026-08-27, **10 of 37 cards had been
rendering EMPTY**… the only symptom was a blank card in an artifact nobody rebuilt."* U8.4 repaired
those ten and shipped `design-sync-entry.test.ts`, which closes three *different* holes (unreachable
component, missing `cardMode`, missing/orphan contract KEY). **The hole that produced the ten empty
cards is not one of them**, and the remedy left in its place is a sentence of prose: *"whenever a
synced component prop set changes, rebuild and re-validate."*

**Probe 1 — planted drift, the exact shape of the original defect.** In
`.design-sync/previews/NotesScreen.tsx` I renamed the required `sections` prop to `sectionsBROKEN` on
both stories — the same class as the real `NotesScreen` `sections` rewrite NOTES names:

```
npx tsc --noEmit --incremental false   -> exit 0, no output
design-sync-entry.test.ts              -> 40 passed
```

**SURVIVED.** Nothing in the repo reds.

**Probe 2 — the clean tree, no mutation.** Previews live in a dot-directory, and TypeScript include
wildcards skip dot-directories, so **zero preview files are in the tsc program**
(`npx tsc --noEmit --listFiles | grep -c design-sync/previews` returns `0`). Put the 37 demo previews
into a program with `open-pro-next` mapped to the generated `.design-sync/ds-entry.ts` — one throwaway
tsconfig, no new dependency — and the CLEAN tree at `def2aec` reports **19 errors across 8 previews**:

| Preview | Errors |
|---|---|
| `ModalShell.tsx:41,54` | **TS2741 `Property 'closeAccessibilityLabel' is missing`** x2 |
| `CasesScreen.tsx:58,66,74` | TS2322 wrong `status` shape x2, TS2739 missing required props |
| `DashboardScreen.tsx:55,63` | TS2322, TS2739 missing required props |
| `TimeOffsetScreen.tsx:51,62` | TS2322, TS2739 missing required props |
| `ImportModal.tsx:95,103,111,122` | TS2322 x4 (`onPickPdf` is not a prop) |
| `NewCaseModal.tsx:56,64` · `NewLocationModal.tsx:41,49` | TS2322 x4 |
| `PdfPreview.tsx:52,60` | TS2322 x2 (`onSave` is not a prop) |

`ModalShell` is the sharp one. `closeAccessibilityLabel` is the prop U4.2 made **required** under D20
because *"five sheets announcing Close is the DEF-UI-006 regression"*, and it is the prop **U8.4 own
fix comment cites as its evidence** (`gen-dts-props.mjs:222-225`: *"the run computed `ModalShell` with
10 props (including the required `closeAccessibilityLabel`)"*). The generated contract now says
required; the preview beside it still does not pass it. The design agent grades a modal whose close
button has no accessible name at all — on the artifact that is supposed to be the source of truth.

**Why the render check does not see this.** `NOTES.md:206` reports *"37/37 previews render cleanly"*,
and that is not a contradiction — it is the finding. The render check catches THROWS. A missing
callback that is only invoked on interaction does not throw; a `status` object carrying
`{label,color,bg,border}` where `StatusTheme` wants `{background,borderColor,accent}` does not throw,
it paints `undefined` colours. So the one guard NOTES calls *"the ONLY guard on preview to component
prop drift"* is structurally blind to the majority of that drift, and the suite cannot see it because
the files are not in a program.

**Fix.** A `tsconfig.previews.json` — `extends` the root config, `include` the 37 demo previews plus
`ds-entry.ts`, `paths` mapping `open-pro-next` to `.design-sync/ds-entry.ts`, `jsx: react-jsx` — added
to the typecheck gate. I ran exactly that in the probe tree: it works, needs no dependency, and turns
all 19 of the above into build errors. Note the marketing previews resolve through
`config.marketing.json` and must be scoped out (or given their own entry), or they raise TS2305.
`NOTES.md:225-227` should also be corrected: previews are unchecked because of the dot-directory
wildcard rule, not because `open-pro-next` is unresolvable — the stated reason makes the fix look
harder than it is, and that is probably why it was never attempted.

---

## MEDIUM

### [MEDIUM] The gen-dts-props no-op fix shipped without a tripwire for its own failure class — the new guard checks contract KEYS, never contract VALUES

**File:** `.design-sync/gen-dts-props.mjs:215-231` (the fix) · `features/demo/ui/__tests__/design-sync-entry.test.ts:78-84` (the guard)

**Issue.** The fix is correct and its comment is exemplary — it names the defect
(*"every later run was a COMPLETE NO-OP that still printed wrote dtsPropsFor for 33/33"*), the
measurement, and the commit. But flipping the spread order fixes the *generator*; nothing detects the
*state* it produced. The new guard contract case is:

```ts
expect(Object.keys(cfg.dtsPropsFor).sort()).toEqual([...pinned].sort())
```

Key sets only. What went stale for months was a VALUE — `ModalShell` at 3 props instead of 10,
`TabBar` on a 3-tab union instead of 4 — and `config.json` is hand-edited, so value drift is the
expected mode, not an exotic one.

**Probe (canonical `.design-sync/config.json`).** Replaced `dtsPropsFor.ModalShell` with
`"{ title: string }"` — a harsher version of the exact stale state the fix repaired:

```
design-sync-entry.test.ts -> 40 passed
tsc --noEmit              -> exit 0
```

**SURVIVED.** A `.d.ts` that misdescribes the component the design agent codes against is green.

**Control (same file family, to show the guard is not useless).** Deleting `export { Banner }` from
`ds-entry.ts` gives **KILLED**, naming the component and the command to run
(*"Banner is bundled-but-unreachable — run node .design-sync/gen-entry.mjs"*). The other three cases
of the guard do bite; this is the fourth hole, not a broken guard.

**Fix.** The obvious gate — re-run the generator and assert an empty diff — is **not** cheap and I am
not prescribing it: `gen-dts-props.mjs` imports `ts-morph`, which is not a repo dependency
(`ERR_MODULE_NOT_FOUND` when run from a clean install), so it cannot run in the suite or in CI. The
HIGH above is the better answer to both findings at once: with the previews typechecked, the previews
— the real consumers — are held to the true component API, and a stale `.d.ts` can no longer
misdescribe a component without something reddening. If a value-level pin is wanted independently,
the cheapest honest one is a spot-check that each contract mentions every prop name the component
declares as required.

---

## Verified clean — checked and NOT flagged

**(1) The boot "simulated scan" disclosure — intact, and now defended by measurement.**
`SplashScreen.tsx:150-170` renders `data-testid="boot-disclosure"` **outside** the state switch, so it
paints on all three HUD states; its colour is `SCANNER_DISCLOSURE_TEXT`, independent of state, so the
AUTHORIZED-green beat cannot alter it. The alpha moved 0.70 to 0.80 because D8 lighter ground
(`#002853`) pushed 0.70 to **4.31, under AA**, and the module records the whole scale rather than
asserting a value (`scanner-hud-colors.ts:120-133`). Two-sided pins now exist in
`palette-contrast.test.ts`: `>= AA_TEXT`, and `<` the HUD strings it captions, both composed from
`SCANNER_GROUND` imported from the module the gate paints from.
**Probe:** reverting the alpha to 0.70 gives **KILLED**, `expected 4.31 to be greater than or equal
to 4.5` — the measured number matches the docblock exactly. This is the honesty rule load-bearing
line and it is in better shape than it has ever been.

**(2) `BootHudState` has no `failed` arm — correct, and no path can render a failure it would hide.**
The refutation holds. `HUD_STATE: Record<BootPhase, BootHudState>` and
`SURFACE: Record<BootPhase, 'hud'|'video'>` (`boot.ts:181,229`) are both TOTAL, so every one of the
seven phases maps to a styled HUD state and a chosen surface — a fourth phase is a compile error, not
an unstyled branch. `SCANNER_COLORS` is `satisfies Record<BootHudState, ScannerStateColors>`, so the
palette and `statusBody` cannot disagree. The only failures the gate can experience are those of the
intro video, and all four arms are handled and logged: `handleVideoError` (`BootSequence.tsx:185-193`,
`console.warn` with the media-error code and message), a rejected `play()` (`:208-211`), a null
element (`:201-203`), and the stall watchdog (`:229-240`, ceiling derived from the element own
duration with `Number.isFinite` guarding it). None of those is a substituted result — the video is
decoration, its absence is not a claim — so there is nothing for a `failed` HUD arm to say. The
module states this reasoning in prose and records the unported phone `failed` trio for the day an arm
lands (`scanner-hud-colors.ts:35-42`).

**(5) `_ds_needs_recompile` / `_ds_sync.json` — NOT APPLICABLE to this diff.** `_ds_needs_recompile`
does not exist anywhere in the repo. `_ds_sync.json` appears once, as prose in
`.design-sync/NOTES-marketing.md:114`, and is not in the W4 diff. The only hashing in `.design-sync`
is `fetch-fonts.mjs:76`, a content hash for font filenames, untouched by this wave. No fail-open to
report because there is no mechanism here to fail open. Reported as a non-finding rather than
stretched into one.

**(6) No new swallows, no removed breadcrumbs.** Zero `console.*` lines removed anywhere in the source
diff. Zero new `catch` / `void` / `.then(` in the ENTIRE W4 diff — the only regex hits are those two
words inside prose comments. The four `BootSequence` breadcrumbs are byte-intact.

**Other, traced and dismissed.**
- `SCANNER_SKIP_PILL.fill` deviates from plan §5 `scrim` to `overlay`, with the deviation disclosed
  and measured in the module (`scrim` 1.02 · shipped 2.07 · `overlay` 4.80 over a white frame). The
  pill floats over an arbitrary intro video, so this is the right call and it is the U4.4 precedent.
- `SCANNER_GROUND = forced.background` where `forced = palette[SCANNER_SCHEME]` with
  `SCANNER_SCHEME = 'dark'` as a SEPARATE constant from the app-level `scheme` — the same shape
  `terminal-palette.ts` established, and the indexed form keeps the scheme-half scan in
  `glass-tokens.test.ts` satisfied. No new value-position half read anywhere in the diff.
- The ladder correction in `check-rn-parity.mjs` (`+4 rows` to `+2 rows`, 143 to 145) is arithmetic,
  and the comment says so and names it as the third recurrence of the F49/F68 class. The gate itself
  is unchanged and the block is explicitly marked DO-NOT-TREAT-AS-A-GATE.
- The disclosure colour test runs only on `authState="idle"` (`SplashScreen.test.tsx:160`). The
  element is rendered outside the state switch so state cannot reach it, and a sibling case at `:167`
  exercises `authorized`; an `it.each(BOOT_HUD_STATES)` would be belt-and-braces, not a gap.

**No deferral rows proposed.** Both findings want a fix, not a deferral — and the fix for the HIGH is
one config file that I have already run.

---

## Silent-Failure Summary
CRITICAL: 0 · HIGH: 1 · MEDIUM: 1 · LOW: 0
Verdict: **REVISE**

Fallback honesty (every substitution announced): **yes** — the simulated-scan disclosure survives on every state path and is now the best-defended string in the wave
Failure-cause distinctions preserved: **yes** — four video-failure arms, four distinct breadcrumbs; the absent `failed` HUD arm is correct by construction
Partial results flagged (not silently short): **n/a** — no partial-result path in this wave
Async cancellation / stale-write safety: **n/a** — no new async store write; the boot watchdog and the `play()` catch are unchanged
Operator breadcrumbs intact: **yes** — zero removals
Guards fail loud and closed: **no, in the design-sync half** — 3 of 4 design-sync holes covered (control KILLED), the 4th SURVIVED, and preview prop drift is unguarded with 8 live instances

Out-of-lane observations:
- The 19 preview type errors include pure excess props (`onSave` on `PdfPreview`, `onPickPdf` on `ImportModal`) that are harmless at runtime; the aggregator may want to split those from the missing-required-prop set when scoping the fix.
- `NOTES.md:225-227` states the wrong reason for previews being unchecked — a doc correction that rides with the HIGH.
