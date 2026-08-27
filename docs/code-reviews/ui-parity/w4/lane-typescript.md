# Lane: typescript — W4 (U8.1 splash/boot · U8.2 ambient · U8.3 tab bar · U8.4 design-sync)

**Scope:** `git diff master...def2aec` — 65 files, +3,366/−209. The port's final wave.
**Mode:** code review. **Base contract:** `.claude/skills/fleet-orchestration/reviewer-contract.md`.
**My question:** does this TS code introduce a real bug, a type-safety hole, an error-swallowing
path, an RSC boundary violation, or a breach of the demo's architectural contract?

**Gates reproduced in my own tree** (probe worktree `probe-w4r-ts-gates` @ `def2aec`, own
`pnpm install`, torn down via `tools/worktree-remove.ps1`):

| Gate | Exit | Result |
|---|---|---|
| `npx tsc --noEmit --incremental false` | **0** | clean |
| `npx vitest run` | **0** | **310 files, 4,326 passed + 2 todo** |

---

## CRITICAL

None.

## HIGH

None.

---

## MEDIUM

### [MEDIUM] U8.4's deferral proposal D-1 under-scopes the defect it lists: `NewCaseModal`'s dangle is a DROPPED GENERIC PARAMETER LIST, not an intersection, so D-1's one-line fix would close the ledger row with that component still broken

**File:** `.design-sync/gen-dts-props.mjs:110-156` (`printType`) · evidence in
`.design-sync/config.json` (`dtsPropsFor.NewCaseModal`) · source
`features/demo/ui/screens/NewCaseModal.tsx:24` · proposal text in
`docs/planning/demo-phone-ui-parity/reports/u8.4-implementation-report.md` §6 DEFECT 1 and §7 D-1.

**Issue.** U8.4 correctly self-declares that `printType` has no intersection branch and lists four
affected components. Its proposed fix is one line beside the union branch:

```js
if (type.isIntersection()) return type.getIntersectionTypes().map(t => printType(t, node, depth)).join(' & ')
```

That fix resolves `SubmissionScreen`, `NewLocationModal` and `OcrCaptureScreen`. It does **not**
resolve `NewCaseModal`, which is in the same table — because `NewCaseModal`'s dangle has a different
cause. Its prop is a **generic method signature**:

```ts
onChange<K extends keyof NewCaseFields>(field: K, value: NewCaseFields[K]): void   // NewCaseModal.tsx:24
```

and the generator prints the call signature while dropping the type-parameter list, emitting:

```
onChange: (field: K, value: NewCaseFields[K]) => void
```

**`K` is emitted entirely unbound** — I checked the shipped contract string for a binder and there is
none (`'<K' in v` → `False`, `'K extends' in v` → `False`). This is strictly worse than the
intersection dangles: `GpsCoordinates` is a real type that merely needs importing, whereas `K` is
unresolvable *in principle* to any consumer. A design agent reading this contract cannot write a
valid `onChange` call at all.

**Failure mode, on the use-day.** Someone applies D-1's one line, re-runs `gen-dts-props.mjs`, sees
three of the four listed components clear, and strikes the ledger row `RESOLVED`. `NewCaseModal`'s
`K` survives, and the row that named it is now closed — which is the ledger's own stated bar
("a vague deferral or a missing trigger is itself a review finding") failing in the other direction:
a deferral precise enough to look complete while covering three quarters of its own list. There is no
reviewer on that day, so the severity rides it.

**Evidence.** Read at source, and the dangles reproduced from the committed config:

| component | undefined names emitted | cause |
|---|---|---|
| `SubmissionScreen` | `GpsCoordinates`, `GpsSource`, `ReverseGeocodeResult` | intersection — D-1 covers |
| `NewLocationModal` | `GpsCoordinates`, `GpsSource`, `ReverseGeocodeResult` | intersection — D-1 covers |
| `OcrCaptureScreen` | `OcrRecognizeOutcome` | intersection — D-1 covers |
| **`NewCaseModal`** | `NewCaseFields`, **and a bare `K`** | **generic param list dropped — D-1 does NOT cover** |

(The DOM-lib names the report sets aside — `PositionOptions`, `MediaStream*`, `Blob`,
`HTMLCanvasElement` — I confirmed are the design tool's own lib types and are correctly excluded.
`DD`/`MM` in `OcrCaptureScreen` are string-literal members, not dangles.)

**Fix.** Not the code — the *proposal*. D-1 should either name the second gap explicitly (print the
type-parameter list, or degrade a generic signature to its erased form, e.g.
`onChange: (field: keyof NewCaseFields, value: NewCaseFields[keyof NewCaseFields]) => void`), or
`NewCaseModal` should be moved out of D-1's table into a second row with its own trigger. Whoever
writes the ledger row needs the distinction, because D-1's acceptance test as written ("scan the
regenerated `dtsPropsFor` for bare capitalised identifiers") will still find `K` and read as a
failed fix.

---

## LOW

None.

---

## Probes run — the three gates this wave ships are each falsifiable

Probe worktree only; every mutation restored with `git status` proven clean; canonical source in
every case. `ts-morph` lives in the gitignored `.ds-sync/node_modules` (main checkout only), so the
generator probes needed the junction `NOTES.md:269-285` documents — my first run died with exactly
the `ERR_MODULE_NOT_FOUND` that section predicts, which is the docs working, not a defect. **I
removed that junction explicitly before teardown**, because deleting through it would have reached
into the main checkout's `.ds-sync`; verified intact afterwards (`ts-morph` still present).

**Probe 1 — the `gen-dts-props.mjs:217` no-op fix is real and causal.** This is U8.4's headline
claim, so I did not take it on the report's word.

- *1a, idempotency:* re-ran the generator on unchanged source → `37/37`, `git diff --numstat` on
  `config.json` **empty**. The committed config is genuinely in sync with the source.
- *1b, propagation:* added `probeOnlyFlag?: boolean` to `BannerProps`, re-ran → config gained
  `probeOnlyFlag?: boolean` in `dtsPropsFor.Banner`. **The change propagates.**
- *1c, counterfactual (the important one):* kept the added prop, reverted **only** the spread to the
  pre-fix order (`{ ...dtsPropsFor, ...cfg.dtsPropsFor }`), re-ran → the generator again printed
  `wrote dtsPropsFor for 37/37 components`, and `Banner`'s value came back **byte-identical to
  before, with no `probeOnlyFlag`**. The 5 changed lines were pure key REORDERING, zero value
  changes. **The silent no-op is reproduced and the fix is causal**, exactly as `NOTES.md:102-112`
  and the commit body claim.

**Probe 2 — `teal-purge.test.ts`'s four-spelling canonicalisation holds at the WALK, not just in its
control.** Planted `rgba(78, 205, 196, 0.35)` — the rgb form a hex needle list misses, which is
ledger §120's whole class — in a fourth production file (`DashboardScreen.tsx`). **Both** walk cases
red and name the file: "paints no pre-recolor teal…" and "leaves EXACTLY the three D12 surfaces".
**KILLED.** The path-keyed `ALLOWED` map (W2/F32 as amended by W3/F66) is the right unit here, and
the third case is a genuine dead-exemption check — a D12 file that vanished reds as loudly as a
fourth that appears.

**Probe 3 — `design-sync-entry.test.ts` catches the bundled-but-unreachable case it was written for.**
Deleted `export { Banner }` from the generated `ds-entry.ts` while leaving `Banner` pinned in
`componentSrcMap`. **KILLED**, with the remediation in the message: *"Banner is bundled-but-unreachable
— run `node .design-sync/gen-entry.mjs` after editing componentSrcMap"*. Note this gate pins by a
**real import**, not a source-text scan, which is the correct choice and is called out in its own
docblock as such.

---

## What I verified clean (so the aggregator need not re-derive it)

**Architecture — all four beats preserved at the wave head.**

| Rule | Check | Result |
|---|---|---|
| Store bridge | `useStore` in `features/demo/ui` minus `DemoExperience.tsx` | **0 hits** |
| Engine purity | React / `'use client'` under `features/demo/engine` | **0 hits** |
| Single barrel | `features/demo/index.ts` + `engine/index.ts` diff vs `master` | **0 lines** |
| Marketing wall | demo refs in `components/` + `app/(default)/` + `lib/` | **0 imports** (2 hits are a docblock reference and the guard test's own title) |

The one `engine/` change in the wave (`engine/logic/boot.ts`, +8) is **comment-only** — it removes a
stale `#000314` literal from a docblock. No engine code moved, so D8's ground change did not leak a
colour into the engine.

`.design-sync/ds-entry.ts` gained four deep `@/features/demo/ui/...` exports. Not a barrel breach:
`.design-sync/` is tooling, not `app/`/`components/`/`lib/`, the file already held 30-odd such lines
on master, and nothing under `app/` imports it.

**Type safety.** Zero `as any`, `@ts-ignore`, `@ts-expect-error`, `Date.now()`, `Math.random()`,
`console.log`, `forEach(async)`, `key={index}` or relative `../` climbing added anywhere in
non-test source. `tsc --noEmit` exit 0 cold. Zero new hooks, timers, listeners or browser-resource
holders in the whole wave — U8 is a pure token/constant port on the code side.

**F61 case law followed by the new modules.** `scanner-hud-colors.ts:104` closes
`SCANNER_COLORS` with `as const satisfies Record<BootHudState, ScannerStateColors>`, so a fourth
`BootHudState` is a compile error at the table rather than an unstyled branch — and it is bound to
the same engine union `SplashScreen`'s `statusBody` switches on. `SCANNER_SCHEME = 'dark' satisfies
ColorScheme` (`:67`). `SCANNER_SKIP_PILL` takes a bare `as const`, correctly — it is not keyed by an
exhaustive union.

**A91 forced-scheme discipline.** `scanner-hud-colors.ts` indexes `palette[SCANNER_SCHEME]` through
a named local rather than spelling `palette.dark.*`, which is both the correct form and the only one
`glass-tokens.test.ts`'s scheme-half scan permits. Same shape `terminal-palette.ts` established in
U7.1. The absent `failed` trio is right: `BootHudState` has three members, and a fourth key would be
unreachable by construction.

**`ui/__tests__/jsdom-colour.ts` is correctly not a test file.** `vitest.config.mts:32` includes
`**/*.{test,spec}.{ts,tsx}` only, so the helper does not run as an empty suite — U8.1's consume-me
item 4 is discharged. It throws rather than passing through an unparsed value, which is the right
call for a pin helper.

**U8.3's two self-predicted defects, adjudicated.** The `borderTop` shorthand at `TabBar.tsx:93` is
**not** a lit-edge violation and I am recording that so another lane's sighting does not stand
unrefuted: I read the whole style object (`:82-99`) — it is a literal inline object with **no
spread** and **no `border*` longhand siblings**, so there is nothing for the shorthand to erase. The
rule governs a fragment that gets spread; this is not one. The kept `boxShadow` is a scoped
divergence with a deferral, not a type or correctness issue, and is the owner's call.

**U8.2's §120 refusal is correct and measured.** Extending the rgb-form normalizer to
`palette.test.ts`'s RETIRED sweep would red 15 live sites across 11 files owned by four merged
packages — I spot-checked three of the cited sites and they are real. Refusing that inside a closing
S-sized package is the right call, and the four-spelling convention was still honoured where U8.2
owns the scan (probe 2).

---

## Out-of-lane observations

- **U8.4 Defect 2 (previews are not typechecked at all) is real and I confirmed the mechanism.**
  Previews import `'open-pro-next'`, which resolves only at bundle time, so the 37-preview corpus is
  untyped against the components it renders and nothing in `pnpm test` sees prop drift — the ten
  empty cards were the measured cost. The proposed fix (a generated ambient
  `declare module 'open-pro-next'` emitted alongside `ds-entry.ts`) is the right shape and would turn
  the whole class into a compile error. Worth the aggregator's attention as D-2; the *shipped app* is
  unaffected, which is why it is an observation and not a finding from me.
- **`design-sync-entry.test.ts:69` couples "pinned" to "the generator produced something".** A
  zero-prop component added to `componentSrcMap` would be SKIPPED by `gen-dts-props.mjs` (which only
  writes keys it computed), so `dtsPropsFor` would lack its key and the orphan-contract assertion
  would red with a message about a missing prop contract. That is fail-loud and therefore fine today
  — all 37 currently generate — but it is a slightly misleading message for a legitimate case. Not
  worth a change now; worth knowing before component 38.

---

## TypeScript Lane Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 0
Verdict: **APPROVE with comments**

Store-bridge integrity: preserved
Engine purity: preserved (the only `engine/` change in the wave is comment-only)
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved (zero `Date.now()` / `Math.random()` added)

Probes: 4 — generator no-op fix (propagation confirmed + **counterfactual reproduced the no-op**),
teal-purge rgb-form plant (KILLED, both walk cases), design-sync entry unreachable-export (KILLED).
All restored, worktree torn down, main checkout's gitignored `.ds-sync` verified intact afterwards.
Ledger rows proposed: none of my own — but see the MEDIUM, which is a correction to the scope of
**U8.4's D-1** before the aggregator writes it.
Out-of-lane observations: 2 (listed above).
