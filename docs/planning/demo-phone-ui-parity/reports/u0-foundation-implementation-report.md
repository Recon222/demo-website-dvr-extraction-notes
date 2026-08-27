# U0 Foundation — implementation report (U0.0, U0.1, U0.2, U0.3)

**Branch:** `uiparity/u0.foundation` off `feat/uiparity-u0` (= `master` @ `bf0020a`)
**Head:** `b9bebb3` · 4 commits, one per package
**Worktree:** `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\u0-foundation`
**Agent:** Opus 5 · **Session:** https://claude.ai/code/session_01UtQCSnhF3oHi92Lu3mBSv4

---

## 1. Refutations and spec corrections (process these first)

Each was verified at source before it was acted on. **Nine items; four changed what I built.**

### R-1 — The brief's light-half citation points at the wrong export. (CHANGED WHAT I BUILT)

> Brief §2.3: *"Light-half values: `Colors.ts:274-345`; dark: phone §1.2 + the §2.A dereference table."*

`Colors.ts:274-345` is **`GlassColors.light`** — the six glass TIERS, which are U1.1's row (A29–A40),
not the palette. The palette's light half is **`Colors.ts:9-126`** (`Colors.light`), and its dark half
is `Colors.ts:128-256`. Verified by structure dump at `main` `dd5551ec`:

```
8:export const Colors = {      9:  light: {      128:  dark: {      257:} as const
273:export const GlassColors = {   274:  light: {   345:  dark: {   440:} as const
471:export const PrimaryButtonGradient   487:export const ElevatedEdges   510:export const DangerFill
```

Every light value in `palette.ts` is cited against `Colors.ts:9-126`. The plan's own U1.1 row cites
`Colors.ts:274-344` for the light TIERS, which is correct for U1.1 — the two citations were crossed in
the brief, not in the plan.

### R-2 — Matrix A8 undercounts the `#2a4a6f` sites: there are three, not two. (CHANGED WHAT I BUILT)

A8 names `glass-tokens.ts:41` (the token) and `SyncStatusCard.tsx:48` (bare). A case-insensitive census
finds a third live site: **`features/demo/ui/screens/_shared.tsx:562`** — `AddRowButton`'s
`border: '1px dashed #2a4a6f'`. Swept it. Leaving one live copy of a retired hex is precisely the drift
the port exists to end, and it would have survived U0.5's banned-literal guard too (that guard bans
literal strings, and `1px dashed #2a4a6f` is not `1px solid #2a4a6f`).

### R-3 — U0.1 reddens `glass-tokens.test.ts` twice, not three times; the BANNED check goes INERT, not RED. (CHANGED WHAT I BUILT)

The coordinator's mid-task note said U0.1 reddens the file three times, including the `BANNED` check.
Measured: it reddens the **`GLASS` shape pin** (`:81-95`) and the **fragment pin** (`:99-116`) — and the
BANNED check **stays green**. The reason matters more than the count: `BANNED`'s ten literals are the
token's *current* values, so a sweep that removes the old hexes from consumers leaves the guard passing
over a list of values that no longer exist anywhere. It is not red, it is **dead**.

The rest of the note was right and is what I did: rewrite each affected `BANNED` entry **in place** to
the new value in the same commit (`#1e3a5f`→`#1c4e84`, `#2a4a6f`→`#2e5f97`,
`rgba(30,58,95,0.5)`→`rgba(28,78,132,0.5)`, and in U0.3 the accent gradient), never remove it. The
fragment pin's third cluster (`glassBtnSecondary.background '#132236'` → `#0e3965`, matrix A2) is indeed
absent from the plan's U0.1 Tests column.

**The same trap has a fifth instance the plan does not name — see R-4.**

### R-4 — U0.3 has a FIFTH affected test, and it is the same inert-guard trap. (CHANGED WHAT I BUILT)

`app/demo/__tests__/error.test.tsx:75` bans the accent literals from `app/demo/error.tsx` so the page
uses the `@theme` utilities. Its list held `'#35A0D6', '#35a0d6', '#2580AD', '#2580ad'`. After U0.3
those hexes exist nowhere, so the test passed while guarding nothing. Rewritten in place to
`'#1F6B99', '#1f6b99', '#17527A', '#17527a'`, and mutation-verified (probe 6).

The plan's U0.3 Tests column names four (`glass-tokens.test.ts` R-25/R-34 + its `gradientAccent` shape
pin, `ExportModal.reduced-motion.test.tsx:52-53`, `ExportHub.test.tsx:116-118`). This is the fifth.

### R-5 — U0.3's Files column is missing the one file that makes its own Tests column true. (CHANGED WHAT I BUILT)

The Tests column expects `ExportHub.test.tsx:117` — the lit-card **boxShadow** pin — to redden. It
cannot, from the Files column as written: the shadow at **`ExportCaseCard.tsx:127`** was
`'0 4px 12px rgba(53,160,214,0.35)'`, a hand-typed copy of the accent's own rgb, sitting one line under
`border: 1px solid ${GLASS.accentFrom}`. Re-basing only the token ships a deep-blue border with a
light-blue glow. Fixed by derivation, not transcription: `withAlpha(GLASS.accentFrom, 0.35)`.
Deviation recorded in the commit body.

### R-6 — The plan's U0.3 Files column is right that `app/demo/error.tsx` needs no edit.

`:45` uses `from-demo-accent-from to-demo-accent-to`; the mirrors carry the value. `:29`'s
`bg-[rgba(19,34,54,0.6)]` is the OLD **card** gradient stop — matrix A29, U1.1's row — deliberately left.
Flagging it so a reviewer does not read it as a missed U0.3 site.

### R-7 — The D2 tripwire's path is wrong in both the brief and the plan.

Cited as `settings/panes/__tests__/panes.test.tsx:87,113`. The file is
**`features/demo/ui/screens/settings/__tests__/panes.test.tsx`** (one level up, not inside `panes/`).
Both pins confirmed present and untouched, as is `AppearancePane.tsx`'s inert `disabled` toggle
(the `disabled` prop is `:43`, inside the `:40-48` block the brief cites as `:42-45`) and
`settings-values.ts:116`'s `darkMode: true` (cited as `:117`; it is `:116`).

### R-8 — The 41-site `#4BA3D4` sweep has no owner.

Matrix A28 and the plan's U0.1 row both state its size ("41 sites across 19 files, 4 of them
lowercase") but neither assigns it. U0.1's Files column lists only the `#0d1b2a` and `#1e3a5f` sites,
and my brief confirms that scope, so I did **not** sweep it. A28's Delta gives U5.1 only the
`mapTokens.ts` alias — which is 1 of the 42 occurrences. **Unassigned work; see §7.**

### R-9 — Everything else in the brief and the plan checked out at source.

Verified and confirmed, not assumed: the throw at `check-rn-parity.mjs:75` and the four drifts it hid;
A1's 13 `#0d1b2a` sites and A7's 15 `#1e3a5f` sites (every line number correct); the identical 45-leaf
key sets of `Colors.light`/`.dark`; `DangerFill.dark = Colors.dark.errorLight` (`:512`);
`PrimaryButtonGradient.dark = [Colors.dark.primaryDark, '#17527A']` (`:473`); `primaryLight` already
keyed at `mapTokens.ts:58`; that `readField` matches literals not identifier references (`:54-56`);
that no uppercase spelling of the three retired hexes exists in the tree; and the three contrast
ratios in A50 — **recomputed by hand from WCAG 2.1 relative luminance rather than accepted**:

| stop | L | vs `onPrimary` #ffffff | plan says |
|---|---|---|---|
| `#35A0D6` (retired) | 0.307656 | **2.94** | 2.94 FAIL ✓ |
| `#1F6B99` (top) | 0.131065 | **5.80** | 5.80 ✓ |
| `#17527A` (bottom) | 0.076158 | **8.32** | 8.32 ✓ |

---

## 2. U0.0 — un-red the suite

**Commit `008e52d`** — `fix(u0.0): degrade a broken drift-guard anchor to PARSE-FAILED instead of throwing`

### What and why

The plan frames the defect as the throw at `:75`. It is broader, and I built for the broader one: the
whole of `checkParity()` was **eagerly** evaluated, and `readField` throws at `:42`/`:50` and `readConst`
at `:59` as well. Any one constant moving on either side took out all nine anchors. Fixing only `:75`
would have left the same failure mode one rename away.

Every anchor read is now wrapped per side by `attempt(src, read)`, and a parse failure becomes a **value
that carries its own reason** — `PARSE-FAILED (Button PRIMARY_GRADIENT.dark not found)` — rather than an
exception. Unreadable source **files** degrade identically, because a deleted file is the same defect
class as a renamed constant (the phone's P9 moved `PRIMARY_GRADIENT` *out of* `Button.tsx`; had it
deleted the file, the old code would have died at `readFileSync`).

Two correctness details worth a reviewer's eye:

- **A parse failure counts as drift even when both sides fail identically.** Both sides read a key
  called `primary`, so two empty files would produce two identical `PARSE-FAILED (field not found:
  primary)` strings and a naive `a.rn !== a.web` would call that a PASS. `drift` is therefore
  `a.rn !== a.web || isParseFailed(a.rn)`.
- `checkParity()` now returns `{ anchors, drift, parseFailed }`. U0.4 asserts both lists empty; the
  third key is one line and §6.6 gate 1 is written in terms of it ("zero drift and zero PARSE-FAILED").

**No token value changed in this commit.** The four real drifts became visible for the first time.

### Tests

`rn-token-parity.test.ts` rewritten to pin the **known** label sets (it cannot assert empty until
U0.1/U0.3/U0.4 land) plus the independence claim itself: every anchor outside the known-broken set still
resolves to a real value.

**Observed RED:**
```
FAIL features/demo/ui/inputs/__tests__/rn-token-parity.test.ts (both cases)
Error: Button PRIMARY_GRADIENT.dark not found
 ❯ checkParity .design-sync/check-rn-parity.mjs:75:24
Test Files 1 failed (1) · Tests 2 failed (2) · EXIT=1
```

**MUTATION PROBE 1 — per-anchor independence**
```
Target:      .design-sync/check-rn-parity.mjs:120 — the `primary` anchor's web read
Claimed pin: rn-token-parity.test.ts — both cases
Mutation:    readField(t, 'primary') -> readField(t, 'primaryMUTANT')
Result:      KILLED (exit 1)
  AssertionError: expected [ 'primary', 'background', …(3) ] to deeply equal [ 'background', 'border', …(2) ]
  AssertionError: expected [ 'primary', 'gradientTop', …(1) ] to deeply equal [ 'gradientTop', 'gradientBot' ]
  And the claim itself held: background/border still reported REAL VALUES
  (RN=#002853 web=#0d1b2a), text/textMute/error/touchFloor still OK.
Restore: verified byte-identical (git status --porcelain empty; suite green)
```

**GREEN:** 266 files / **3,482 passed** (baseline was 3,480 passed / 1 failed of 3,481).

---

## 3. U0.1 — the palette module

**Commit `c282bfe`** — `feat(u0.1): port the phone's palette as a two-scheme token module and re-base the demo`
30 files, +436 −55.

### The module — `features/demo/ui/tokens/palette.ts` (`SEAM(U0.1)`)

32 tokens × both halves, every value cited `Colors.ts:<line>`.

```ts
const dark = { … } as const
export type PaletteToken = keyof typeof dark
const light = { … } as const satisfies Record<PaletteToken, string>
export const palette = { light, dark } as const
export const colors = palette.dark   // the one-site scheme switch
```

**The type claim is proven, not asserted** — both directions are compile errors:

```
PROBE 4a  delete light.linkHover:
  palette.ts(165,12): error TS1360: … does not satisfy the expected type 'Record<…, string>'.
  Property 'linkHover' is missing …                                              EXIT=2
PROBE 4b  add light.scrim with no dark sibling:
  palette.ts(166,3): error TS2353: Object literal may only specify known properties,
  and 'scrim' does not exist in type 'Record<…, string>'.                        EXIT=2
```

`export const colors = palette.dark` is the D2 one-site flip. **No consumer may reach for
`palette.dark` directly** — that is the whole contract, and it is stated in the module docblock.

### Values

| token | before | after | source |
|---|---|---|---|
| `background` | `#0d1b2a` | `#002853` | `Colors.ts:135` |
| `backgroundSecondary` | `#0f2035` (`T.raised`) | `#0e3965` | `:136` |
| `border` | `#1e3a5f` | `#1c4e84` | `:153` |
| `borderLight` | `#2a4a6f` | `#2e5f97` | `:154` |
| `card` | `#132236` (`glassBtnSecondary` fill) | `#0e3965` | `:212` |
| `GLASS.borderSoft` / `T.borderSoft` | `rgba(30,58,95,0.5)` | `rgba(28,78,132,0.5)` | derived: `#1c4e84` @ 50%, = A7's text and A30's target |

Added with no demo consumer yet, per *"port the token anyway"*: `backgroundTertiary`, `modal`,
`borderDark`, `textInverse`, `primaryDark`, `primaryLight`, `errorLight`, `errorDark`, `successDark`,
`infoDark`, `warningDark`, `onPrimary`, `onError`, `link`, `linkHover`, `disabled`, `disabledText`,
`overlay`, `overlayLight`.

**`overlay`/`overlayLight` are spelled the phone's way** — `rgba(0, 40, 83, 0.9)`, with spaces. They
have no consumer yet (A20/A21 are U4), and `withAlpha` emits the same spaced form, so the port's new
values converge on one spelling. The demo's *existing* compact literals in `glass-tokens.ts` are
untouched: re-spacing them would redden byte-exact shape pins for a format change, which is exactly
what U0.4's `norm()` whitespace fix exists to make unnecessary.

### Deliberately NOT in the module

`PrimaryButtonGradient` (U0.3), `ElevatedEdges` and `DangerFill` (U2.2) — per-scheme **recipes** that
live outside `Colors` on the phone too. Settled by reading U2.2's own row, which says
`ElevatedEdges[scheme]` and *"Do NOT hardcode the dark pair"*: that package creates them. The docblock
names all three with their `Colors.ts` lines and states `DangerFill.dark = errorLight` so U2.2 ports the
**mapping**, not the name. `errorLight` itself IS here — U2.2 needs it a full phase before U3.1 runs.

### The sweep

**30 bare sites across 24 files**, case-insensitively (verified no uppercase spelling of any of the
three exists). 13 × `#0d1b2a`, 15 × `#1e3a5f`, 2 × `#2a4a6f`. Every one of A1's and A7's enumerated
line numbers was correct at source. Each swept file gained
`import { colors } from '@/features/demo/ui/tokens/palette'`; no file had a colliding `colors`
identifier (three had the word only in comments).

### Tests

New `features/demo/ui/tokens/__tests__/palette.test.ts` (6 cases): both halves shape-pinned, runtime
key-set parity (which catches someone widening the type to make a one-sided key compile), the one-site
switch, the retired-hex sweep, and the `T`-alias table.

Updated in the same commit: `glass-tokens.test.ts` (BANNED ×3 in place, shape pin, both fragment
clusters) and `rn-token-parity.test.ts`.

**Observed REDs** — before the change:
```
FAIL features/demo/ui/tokens/__tests__/palette.test.ts > keeps the retired navy ramp out of every UI source file
  glass-tokens.ts still carries the retired border #1e3a5f — use colors.border (#1c4e84)
  … 29 further offenders …            expected [ Array(30) ] to deeply equal []
FAIL features/demo/ui/tokens/__tests__/palette.test.ts > resolves every T alias to its phone-named palette source
```
after the value change, updated in the same commit:
```
FAIL features/demo/ui/__tests__/glass-tokens.test.ts > pins the GLASS token values
  -  "border": "1px solid #1e3a5f",             +  "border": "1px solid #1c4e84",
  -  "borderBtn": "1px solid #2a4a6f",          +  "borderBtn": "1px solid #2e5f97",
  -  "borderSoft": "1px solid rgba(30,58,95,0.5)",  +  "…rgba(28,78,132,0.5)",
FAIL features/demo/ui/__tests__/glass-tokens.test.ts > pins the spreadable fragments
  -  "border": "1px solid rgba(30,58,95,0.5)",  +  "…rgba(28,78,132,0.5)"   (and #132236 → #0e3965)
FAIL features/demo/ui/inputs/__tests__/rn-token-parity.test.ts (both cases)
  expected [ 'primary', 'background', …(6) ] to deeply equal [ 'background', 'border', …(2) ]
```

**MUTATION PROBES**
```
PROBE 1  T alias mis-pointed
  Mutation: input-theme.ts  raised: colors.backgroundSecondary -> colors.backgroundTertiary
  Result:   KILLED (exit 1)
    AssertionError: T.raised must alias palette.backgroundSecondary: expected '#17416e' to be '#0e3965'

PROBE 2  a retired hex re-inlined
  Mutation: CasesScreen.tsx  background: colors.border -> '#1e3a5f'
  Result:   KILLED (exit 1)
    screens/CasesScreen.tsx still carries the retired border #1e3a5f — use colors.border (#1c4e84)

PROBE 3  the SAME hex in the other case (the standing rule §4.7 exists for this)
  Mutation: CasesScreen.tsx  background: colors.border -> '#1E3A5F'
  Result:   KILLED (exit 1) — same message; the sweep really is case-insensitive

PROBE 4a/4b  the one-key-set type constraint          KILLED both directions (see above)
Restore for every probe: git status --porcelain empty, suite green.
```

### One finding a reviewer should weigh

**The 30-site sweep changed 30 rendered values and not one behavioural test noticed.** Only the token
modules' own pins reddened. Those surfaces are un-pinned — which is why the retired-hex source scan is
in this package rather than a per-component assertion, and why U0.5's banned-literal guard matters.

**GREEN:** 267 files / **3,488 passed**.

---

## 4. U0.2 — the scales module

**Commit `ff7250b`** — `feat(u0.2): add the scale seam and the two colour helpers every later recipe needs`

`features/demo/ui/tokens/scale.ts` (`SEAM(U0.2)`), transcribed from `Layout.ts:10-74` and
`src/lib/utils/with-alpha.ts`:

```
spacing      xxs 2 · xs 4 · xsm 6 · sm 8 · base 12 · md 16 · mdlg 20 · lg 24 · xl 32 · xxl 48
radius       none 0 · sm 4 · md 8 · control 10 · lg 12 · xl 16 · sheet 22 · full 9999
touchTarget  min 44 · medium 46 · comfortable 48 · large 56
iconSize     xs 16 · sm 20 · md 24 · lg 32 · xl 40
```

Signatures exactly as specified, because U0.5 and U2.4 consume them from other packages:

```ts
export function withAlpha(color: string, alpha: number): string        // literal rgba(r, g, b, a)
export function flattenOver(top: string, ...grounds: string[]): string // n-deep, opaque rgb(…)
```

Per D3 this package **does not sweep**. It spends the ladder at exactly three sites, all inside the file
U0.1 already opened: `glassCard.borderRadius` 12 → `radius.lg`, both button fragments' 10 →
`radius.control`. Values unchanged, so no shape pin moves; what moves is that A43's depth tier now has a
name to be adopted by.

**`flattenOver` is widened from the phone's two-arg form** and the widening is pinned as an identity:
`flattenOver(a, b, c) === flattenOver(a, flattenOver(b, c))`. The last ground is treated as opaque and
its alpha ignored, which is the phone's semantics and what makes the fold well-defined.

Both of the phone's own historical bugs are pinned as tests rather than merely avoided: an `rgba()`
input must be RE-alphaed (its four private copies passed it through, silently dropping the requested
alpha) and 3-digit hex must expand rather than parse as `NaN`. The `withAlpha(token, 1)` trap — which
shipped the phone's picker drum 27 CIE76 ΔE from its own sheet — is pinned as a contrast between the two
helpers on the same wash.

The jsdom round-trip is asserted **through a live `element.style` read**, never byte-identity.

**Observed REDs:**
```
FAIL features/demo/ui/tokens/__tests__/scale.test.ts
Error: Failed to resolve import "@/features/demo/ui/tokens/scale" … Does the file exist?
Test Files 1 failed (1) · Tests no tests · EXIT=1
```
and a second one the **suite was green over** — caught only by the cold typecheck:
```
features/demo/ui/tokens/scale.ts(94,13): error TS2802: Type 'string' can only be iterated through
when using the '--downlevelIteration' flag or with a '--target' of 'es2015' or higher.   EXIT=2
```
The phone's `[...digits]` spread does not compile under this repo's `es5` target. `digits.split('')`
does. Vitest transpiles the spread happily, which is why only `tsc` saw it — noted inline in the source
so the next porter does not reintroduce it. **This is the concrete case for gate 4 running cold and
separately; the 3,502-test suite was passing over a file that would not compile.**

**MUTATION PROBES**
```
PROBE 1  withAlpha regresses to the phone's private-copy bug
  Mutation: parseColor  `if (rgb) return […]` -> `if (rgb) return null`
  Result:   KILLED (exit 1) — 5 cases
    expected 'rgba(0, 40, 83, 0.9)' to be 'rgba(0, 40, 83, 0.32)'
    expected 'rgba(255, 255, 255, 0.5)' to be 'rgb(128, 128, 128)'   (x2)
    expected 'rgba(23, 65, 110, 0.7)' to be 'rgb(20, 62, 106)'
    expected 'rgba(0, 24, 50, 0.6)' to be 'rgba(0, 24, 50, 1)'

PROBE 2  flattenOver drops every intermediate ground (the n-deep claim)
  Mutation: delete the fold loop, keep only the bottom ground
  Result:   KILLED (exit 1)
    expected 'rgb(16, 58, 102)' to be 'rgb(20, 62, 106)'
    — note the 4-point miss: a ratio-only pin would not have seen this.

PROBE 3  the depth tier mis-assigned
  Mutation: glassCard.borderRadius radius.lg -> radius.xl
  Result:   KILLED (exit 1), in BOTH files
    expected { borderRadius: 16, …(2) } to deeply equal { borderRadius: 12, …(2) }
    expected 16 to be 12
Restore for every probe: verified byte-identical, suite green.
```

**GREEN:** 268 files / **3,502 passed**.

---

## 5. U0.3 — the primary gradient

**Commit `b9bebb3`** — `feat(u0.3): re-base the primary accent gradient and its three @theme mirrors`

```
ACCENT_FROM               #35A0D6 -> #1F6B99      Colors.ts:473 -> :132
ACCENT_TO                 #2580AD -> #17527A      Colors.ts:473
GLASS.gradientAccent      linear-gradient(180deg,#1F6B99,#17527A)
--color-demo-accent-from  #35a0d6 -> #1f6b99      app/css/style.css:46
--color-demo-accent-to    #2580ad -> #17527a      app/css/style.css:47
```

**One commit, deliberately.** The `@theme` mirrors are pinned against `GLASS` from two directions
(`glass-tokens.test.ts` R-25/R-34 and `error.test.tsx` R-34), so splitting the module from the
stylesheet reddens the suite twice for one change. Both mirror tests stayed green through the change,
which is the evidence that it landed atomically.

The stops stay **literal module consts**. Aliasing them to a palette record would PARSE-FAIL the drift
guard's anchors 7/8, which read them with `readConst`. Recorded in the source docblock alongside the
binding "do not lighten either dark stop, do not re-tokenise the light pair" and the three measured
ratios.

Deviation (`ExportCaseCard.tsx:127`) and the fifth affected test (`error.test.tsx:75`) are R-5 and R-4
above.

**Observed REDs:**
```
FAIL features/demo/ui/__tests__/glass-tokens.test.ts > pins the GLASS token values
  expected { accentFrom: '#1F6B99', …(11) } to deeply equal { accentFrom: '#35A0D6', …(11) }
FAIL features/demo/ui/__tests__/glass-tokens.test.ts > pins the spreadable fragments
  expected { borderRadius: 10, …(3) } to deeply equal { borderRadius: 10, …(3) }
FAIL features/demo/ui/screens/__tests__/ExportHub.test.tsx > lights the open card and dims every other one
  expected '1px solid rgb(31, 107, 153)' to contain 'rgb(53, 160, 214)'
FAIL features/demo/ui/screens/__tests__/ExportModal.reduced-motion.test.tsx > keeps the ring itself
Test Files 3 failed | 265 passed (268) · Tests 4 failed | 3,498 passed (3,502) · EXIT=1
```

**MUTATION PROBES**
```
PROBE 4  the @theme mirror drifts from GLASS
  Mutation: style.css  --color-demo-accent-from: #1f6b99 -> #1f6b9a
  Result:   KILLED (exit 1), in BOTH guard files
    glass-tokens.test.ts R-25/R-34: expected '#1f6b9a' to be '#1f6b99'
    error.test.tsx R-34:            expected '#1f6b9a' to be '#1f6b99'

PROBE 5  the glow reverts to a transcribed literal
  Mutation: ExportCaseCard.tsx  withAlpha(GLASS.accentFrom, 0.35) -> 'rgba(53,160,214,0.35)'
  Result:   KILLED (exit 1)
    expected '0 4px 12px rgba(53,160,214,0.35)' to contain 'rgba(31, 107, 153, 0.35)'

PROBE 6  the error page re-hardcodes the accent (proves the rewritten ban is LIVE, not inert)
  Mutation: error.tsx  from-demo-accent-from -> from-[#1F6B99]
  Result:   KILLED (exit 1)
    hardcoded glass literal "#1F6B99" — use the --color-demo-* @theme tokens: expected true to be false
Restore for every probe: git status --porcelain empty, suite green.
```

**GREEN:** 268 files / **3,502 passed**.

---

## 6. Gates — exit codes, from this worktree, at head `b9bebb3`

| Gate | Command | Exit | Result |
|---|---|---|---|
| Suite | `pnpm test --silent` | **0** | 268 files / **3,502 passed** (baseline: 3,480 / 1 failed of 3,481) |
| Typecheck | `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | **0** | cold cache |
| Build | `pnpm build` | **0** | — |
| First Load JS | build route table | — | `/demo` **107 kB — UNCHANGED** |
| Census | `node docs/planning/demo-phone-ui-parity/census.mjs .` | 0 | see below |
| Drift guard | `node .design-sync/check-rn-parity.mjs` | **1** | **expected — comes online at U0.4** |

### The census answer (gate 5 says a rising count is a question, not a block)

`COLOR 278 → 311 distinct · 1,144 → 1,166 occurrences`. It rose, and the reason is that the token module
now exists:

- **33 of the 34 new distinct values occur ONLY inside `tokens/palette.ts`.** The 34th is the derived
  `rgba(28,78,132,0.5)`, in `glass-tokens.ts` and `input-theme.ts`.
- The light half alone contributes ~28 values the demo has never rendered — that is D2-amended's cost,
  paid once, in one file.
- **Consumer-side literals fell by 30**, and four values are gone from the tree entirely:
  `#0d1b2a`, `#0f2035`, `#1e3a5f`, `#2a4a6f`.
- Every other category is byte-identical (`BORDERRADIUS 31/222`, `FONTSIZE 27/504`, `PADDING 146/388`, …).
  `FILES SCANNED 136 → 137`.

Direction is right: literals moved out of components and into a named module. The number will fall as
later packages adopt the tokens instead of adding to them.

### Drift-guard state handed to U0.4 — read this before touching the guard

```
PARSE-FAILED  primary      RN=#2b8cc1  web=PARSE-FAILED (field not found: primary)
PARSE-FAILED  background   RN=#002853  web=PARSE-FAILED (field not found: bg)
PARSE-FAILED  border       RN=#1c4e84  web=PARSE-FAILED (field not found: border)
PARSE-FAILED  text         RN=#f0f4f8  web=PARSE-FAILED (field not found: text)
PARSE-FAILED  textMute     RN=#99badd  web=PARSE-FAILED (field not found: textMute)
PARSE-FAILED  error        RN=#ff4757  web=PARSE-FAILED (field not found: error)
PARSE-FAILED  gradientTop  RN=PARSE-FAILED (Button PRIMARY_GRADIENT.dark not found)  web=#1f6b99
PARSE-FAILED  gradientBot  RN=PARSE-FAILED (…)                                       web=#17527a
OK            touchFloor   RN=44  web=44
```

**Eight of nine anchors are unreadable, and every one of their VALUES is already correct.** Six are
web-side, because `T`'s keys are identifier references now; two are RN-side, the P9 rename. This is the
trajectory the plan schedules — U0.4 item (4) repoints the web readers at `tokens/palette.ts` and (1)/(2)
repoint the RN gradient — and `rn-token-parity.test.ts` records it explicitly rather than widening
silently. **`touchFloor` is the one anchor still resolving, and it does so only because I deliberately
left `T.rowH: 44` a literal.** See §8 (2).

### Playwright captures — NOT RUN, and why

Plan §4.6's fifth gate is `pnpm dev` + a capture. A dev server is a long-lived background process, and
my brief's non-negotiables are *"foreground commands only… never end your turn waiting on a background
watcher."* The two rules conflict for a single implementer. I did not run it and am not claiming it.
**Proposal: the harness run belongs to phase assembly**, where one dev server serves every package's
before/after. `01-wizard-walk.js` is the U0 driver; `SHOT_DIR` MUST be set (`lib.js:8-10` defaults into
v1's committed baselines). U0.1's re-base is visible on essentially every wizard card, so the capture is
worth having.

---

## 7. Deferral PROPOSALS (I do not write `deferred.md`; `dt-review-aggregator` does)

**P-1 — the 41-site `#4BA3D4` (`primaryLight`) sweep has no owning package**
- **Source:** matrix A28 and plan §5 U0.1 both size it ("41 sites across 19 files, 4 lowercase") and
  neither assigns it; U0.1's Files column lists only the `#0d1b2a`/`#1e3a5f` sites. R-8 above.
- **What:** `primaryLight` is now defined in `tokens/palette.ts` **and** still at `mapTokens.ts:58`, and
  41 further sites carry the bare hex — 4 of them lowercase (`map/CallConfirmSheet.tsx:31`,
  `map/CaseMapPicker.tsx:28`, `map/LocationDetailCard.tsx:33`, `map/LocationList.tsx:69`).
- **Why deferred:** the value did not change (`#4BA3D4` in both), so nothing is visually wrong today,
  and 37 of the 41 sits in files U2/U5/U6/U8 open anyway. Sweeping now would collide with four phases.
- **Trigger:** **U0.5, when it adds `#4BA3D4` to the banned-literal list** — the ban cannot land until
  the sites are swept, so U0.5 either sweeps them or explicitly excludes the hex and says why. Failing
  that, U5.1, whose row already re-points `MAP_GLASS_COLORS.primaryLight` to an alias.

**P-2 — `mapTokens.ts:58` holds a second definition of `primaryLight`**
- **Source:** plan U0.1 — *"U0.1 moves the DEFINITION here and U5.1 re-points the map key to an alias."*
- **What:** both `tokens/palette.ts` and `screens/map/mapTokens.ts:58` now define `#4BA3D4`.
- **Why deferred:** the plan assigns the re-point to U5.1, and `mapTokens.ts` is U5's serialised hotspot
  (U5.1 → U5.2 → U5.4). Editing it from U0 would create the cross-phase conflict §6.2 exists to avoid.
- **Trigger:** **U5.1.** And earlier if U0.5's `TOKEN_MODULES` allow-list has to gain `mapTokens.ts`
  purely to let this duplicate through — that would be the allow-list papering over a duplicate, which
  the plan explicitly forbids ("adding a path is a reviewable act").

**P-3 — `DeleteConfirmationModal.tsx:152` still carries `#132236`, the retired raised navy**
- **Source:** census; matrix A2 names only `T.raised` and `glass-tokens.ts:65` as its demo locations.
- **What:** `glassBtnSecondary`'s fill moved `#132236` → `#0e3965`; this one bare copy did not, so the
  two now disagree.
- **Why deferred:** the file is a U2.2 / U4.3 / U4.4 three-way hotspot (§6.2) and U2.2's row rewrites
  the button variants that surround this line. A U0 edit there is a merge conflict waiting.
- **Trigger:** **U2.2** (it rewrites `DeleteConfirmationModal.tsx:202`, fifty lines away), or U4.3.
  Concretely: whichever of the two opens the file first.

**P-4 — the case-map HTML export keeps the retired navy**
- **Source:** `features/demo/engine/logic/case-map/template.ts:15` holds `#0d1b2a`, `#1e3a5f` and
  `#132236`.
- **What:** the exported HTML map will not follow the re-base.
- **Why deferred:** plan §2 excludes it by name — v1's §6.4, *"the case-map HTML export's own design
  system"*. This is a scope boundary, not an oversight; my retired-hex guard is rooted at
  `features/demo/ui` and does not see it.
- **Trigger:** an owner ruling that the exported artefact must match the app, **or** any package that
  opens `template.ts` for another reason. Flagged here so a reviewer does not read it as a missed site.

---

## 8. Successor notes — non-obvious invariants of `palette.ts`, `T` and the guard

1. **`export const colors = palette.dark` is the ONLY consumption site of a scheme.** Import `colors`,
   never `palette.dark`. A single `palette.dark.x` anywhere else silently breaks D2's one-site flip, and
   nothing will fail — the value is identical today. `palette` itself is exported for the guard and the
   contrast test, which legitimately need both halves.

2. **`T.rowH: 44` and `T.radius: 12` are still LITERALS, on purpose.** `rowH` is drift-guard anchor 9,
   read by `readField`, which matches literals not identifier references. It is currently the **only
   anchor still resolving.** Routing it through `touchTarget.min` before U0.4 teaches `readField` to
   follow a re-export would take the guard to nine-of-nine blind. `radius` is untouched for symmetry.

3. **The `light` half is the constrained one; `dark` defines the key set.** Adding a token means adding
   it to `dark` first (that widens `PaletteToken`), then to `light`. Adding to `light` alone is an
   excess-property error, which reads confusingly if you do not know which half is the source.

4. **Every banned-literal list in this repo holds CURRENT values, not retired ones.** Three of them now:
   `glass-tokens.test.ts`'s `BANNED` (10 entries), `error.test.tsx:75`'s accent list, and
   `palette.test.ts`'s `RETIRED` — and `RETIRED` is the exception that holds *retired* hexes by design.
   When you change a token value, **rewrite the matching entry in place**; never delete it. A list of
   values that no longer exist is green and dead, which is worse than red. Twice in this phase a value
   change left a guard passing over nothing (R-3, R-4).

5. **The retired-hex guard is rooted at `features/demo/ui` and skips `__tests__` DIRECTORIES only.** It
   deliberately allow-lists nothing — `tokens/palette.ts` is subject to it too, which is why the
   docblock says "the old navy ramp" instead of naming the hexes. If you add a retired hex to that list,
   check the token module's own comments first. This is a different mechanism from U0.5's
   `TOKEN_MODULES` allow-list; do not merge them.

6. **`flattenOver`'s last ground is treated as OPAQUE and its alpha discarded.** Passing a translucent
   bottom silently gives a wrong answer rather than an error. U0.5's `DARK_GROUNDS`/`LIGHT_GROUNDS`
   stacks must therefore end at `background`, never at a glass stop.

7. **`withAlpha` emits SPACED `rgba(r, g, b, a)`; the demo's legacy literals are COMPACT.** Both are
   valid CSS and jsdom stores each as written inside `boxShadow` (measured: the `ExportHub` shadow pin
   had to move from `rgba(53,160,214,0.35)` to `rgba(31, 107, 153, 0.35)`). Do **not** re-space the old
   literals to match — that reddens byte-exact shape pins for a format change, and U0.4's `norm()`
   whitespace fix is the sanctioned answer on the guard side.

8. **`glass-tokens.ts` now imports from `tokens/palette.ts` and `tokens/scale.ts`.** Import order is
   `palette → scale → glass-tokens → input-theme`; there is no cycle and `palette.ts` imports nothing.
   Keep it that way — `input-theme.ts` imports both `GLASS` and `colors`.

9. **U0.5's `TOKEN_MODULES` allow-list needs three paths, not one.** The plan names
   `tokens/palette.ts`; `tokens/scale.ts` now exists too (it holds no colour literals today, but
   `withAlpha`'s doc examples could change that), and U1.1 adds `tokens/glass-tiers.ts`.

---

## 9. My own two most likely defects

**(a) The 30-site sweep changed rendered colour at 30 places and no behavioural test noticed.** Only
token-module pins reddened. Every one of those substitutions was verified by reading three lines of
context at each site, and the retired-hex guard proves the *old* value is gone — but nothing proves the
*new* value is the RIGHT one at each site. Six were ternary branches (`on ? '#2B8CC1' : colors.border`)
and three were embedded gradient stops rewritten as template literals; a transposition there would be
invisible to the suite and visible on screen. **This is precisely what the owner's wave-1 device pass
and the Playwright capture (§6, not run) exist to catch, and it is the single highest-value thing for a
reviewer to eyeball.** Start with `MapCanvas.tsx:92`, `MediaCaptureScreen.tsx:444` and
`OcrCaptureScreen.tsx:494` — the three gradient rewrites.

**(b) `MediaCaptureScreen.tsx:444` and `OcrCaptureScreen.tsx:494` may be a D17 boundary violation.**
Both are camera surfaces, and D17 rules *"the camera chrome is a separate palette by design — freeze
it."* Matrix A1 nevertheless enumerates both lines among its 13, and my brief and the plan's Files
column both say "the 13 bare `#0d1b2a` sites (matrix A1)". I ported them, reading D17 as freezing the
camera's own black/blue family (`#05080d`, `#007AFF`, the four black scrims) rather than the app
background bleeding through a radial gradient. **If the reviewer or the owner reads D17 the other way,
these two revert to `#0d1b2a` and matrix A1's site list drops from 13 to 11.** I would rather be told
than guess quietly.

---

# Fix round 1 — W0 VETTED-r1 (REVISE)

**Branch:** `uiparity/u0-fix-foundation` off `origin/feat/uiparity-u0` (`10553c8`)
**Head:** `92eb61e` · 6 commits, one per finding
**Owner seat:** `ae5f52b4da850cd08` (U0 implementer A) — F1, F6, F7, F8, F9, F10

## Commit → finding

| Commit | F-ID | Sev | What landed |
|---|---|---|---|
| `8f876b9` | **F1** | HIGH | Six accent-as-mark sites re-pointed `GLASS.accentFrom` → `colors.link`; the `ExportCaseCard` glow hoisted to a module const and kept derived; two pins moved |
| `7c245fe` | **F6** | MED | `flattenOver` requires a ground (compile error, not a wrong answer) · dev-warns on both pass-through arms · rgb regex anchored · `#rgba`/`#rrggbbaa` parse |
| `627ac63` | **F7** | MED | `ACCENT_FROM = '#1F6B99' satisfies typeof colors.primaryDark` |
| `824df2a` | **F8** | LOW | `T.borderSoft` + `T.radius` deleted (0 readers); the false "CSS has no alpha-on-hex" comment replaced with the real schedule + hazard |
| `9dbca61` | **F9** | LOW | `rowH: touchTarget.min`; my U0.4 deferral proposal withdrawn |
| `92eb61e` | **F10** | LOW | Marketing shell docblock scoped to GEOMETRY; colour declared marketing's own |

## Gates (exit codes, cold, from this worktree at `92eb61e`)

| Gate | Exit | Result |
|---|---|---|
| `pnpm test --silent` | **0** | 269 files / **3,518 passed \| 15 todo** (was 3,517 \| 15 at the phase head) |
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | **0** | — |
| `node .design-sync/check-rn-parity.mjs` | **0** | all 33 anchor rows match |
| `pnpm build` | **0** | `/demo` First Load JS **107 kB — unchanged** |

## Mutation probes — 8 applied, 8 KILLED

Own worktree (`worktrees/probe-u0fix`), cut at `92eb61e`, restored byte-identically
(`git status --porcelain` empty), torn down with the script: *unlinked 549 junction(s) in 2 pass(es)
· `.pnpm` 240 → 240 · exit 0*.

```
A  F7  palette.ts primaryDark #1F6B99 -> #1F6B9A
      KILLED (exit 2)  glass-tokens.ts(42,31): error TS1360:
      Type '"#1F6B99"' does not satisfy the expected type '"#1F6B9A"'.
      — the identity the lane probed as SURVIVING now holds.

B  F9  input-theme.ts  rowH: touchTarget.min -> 44
      KILLED (exit 1)  T.rowH must alias touchTarget.min, not re-type 44:
      expected 'import { GLASS } from …' to match /\browH:\s*touchTarget\.min\b/

C  F6(1)  add flattenOver('#002853') — a zero-ground call
      KILLED (exit 2)  scale.test.ts(136,16): error TS2555:
      Expected at least 2 arguments, but got 1.
      (Run first WITH @ts-expect-error: exit 0 — the directive was consumed, which is the
       same proof inverted. Re-run without suppression so the error is visible.)

D  F6(4)  un-anchor the rgb regex (drop the trailing $)
      KILLED (exit 1)  expected 'rgba(1, 2, 3, 0.5)' to be 'rgb(1, 2, 3) and then some'

E  F6(3)  delete the withAlpha dev-warn
      KILLED (exit 1)  expected "warn" to be called 1 times, but got 0 times

F  F6(3)  make the withAlpha dev-warn UNCONDITIONAL (the noise regression, the other side)
      KILLED (exit 1)  expected "warn" to not be called at all, but actually been called 1 times

G  F6(4)  drop {4}/{8} from the hex alternation
      KILLED (exit 1)  expected '#2B8CC125' to be 'rgba(43, 140, 193, 0.5)'
                       expected '#ffffff80' to be 'rgb(128, 128, 128)'

H  F1   ExportModal spinner arc colors.link -> GLASS.accentFrom
      KILLED (exit 1)  ExportModal.reduced-motion > keeps the ring itself
```

## Refutations — evidence, not disagreement with the findings

**All six findings are accepted and fixed.** Three corrections to the supporting material; none
changes a verdict, an owner, or a fix.

### FR-1 — F1's three "before" ratios are measured against the PRE-U0.1 ground, so they overstate the fall

F1 reads *"active tab label on `colors.background` **5.92 → 2.54**; badge numeral **4.83 → 2.06**;
spinner arc vs its own track **4.21 → 1.81**"*. Recomputed independently (WCAG 2.1 relative
luminance, my own implementation), the **after** figures and every other token in the finding
reproduce exactly — `#7a9fc4` 5.31, `link` 9.60, `primaryLight` 5.24, and 2.54 / 2.05 / 1.81. The
three **before** figures do not, and they miss by a consistent amount:

| surface | F1 says | same-ground at HEAD | reproduced against `#0d1b2a` |
|---|---|---|---|
| tab label | 5.92 | **5.01** | 5.923 ✓ |
| badge numeral | 4.83 | **4.06** | 4.832 ✓ |
| spinner arc vs track | 4.21 | **3.58** | 4.221 ✓ |

Each "before" was measured on the OLD `#0d1b2a` background (and, for the badge and the arc, on that
old ground composited under the wash), while each "after" used the new `#002853`. U0.1 moved that
ground one commit before U0.3 moved the token, so the honest same-ground comparison is 5.01 → 2.54,
4.06 → 2.05, 3.58 → 1.81.

**This strengthens the finding rather than weakening it.** The corrected numbers show the inversion
was *already latent*: at 5.01 the active tab label was below the inactive tabs' 5.31 before U0.3 ran
at all. U0.3 turned a marginal inversion into a two-and-a-half-fold one. Every "after" figure still
fails its floor by the margin F1 states.

### FR-2 — `primaryLight` is not a usable alternative, on F1's own arithmetic

F1 offers `colors.primaryLight` (#4BA3D4) "if the design wants a saturated mark". Refused: it
measures **5.24** on `colors.background`, **below** the inactive tabs' **5.31**. It would leave the
selected tab the least legible thing in the control, which is the visible half of the finding. All
six sites take `colors.link` — also the token `palette.ts:91-94` names for this job (the phone's
DEF-UI-018 split), and one accent across one control family rather than two.

### FR-3 — F10's docblock did not claim the colours were copied

F10 says the shell *"claims to COPY the demo shell's constants"*. The docblock's words were
**"Pixel constants are COPIED … 404 frame · 378×786 screen"** — it enumerated geometry and said
nothing about colour. What made it misleading is placement, not wording: `background: "#0d1b2a"`
sits inside the same hoisted `screenStyle` object as the copied `378×786`, under a comment reading
*"these are the prototype-verbatim pixel values"*. The ambiguity is real and is what the fix closes.

I took the **second** of F10's two remedies (state the boundary) rather than the first (re-point the
literal), because the same VETTED doc rules exactly that one row later for
`app/css/style.css:27 --color-input` — *"marketing is not a parity target — leave it"* — and plan §2
scopes this port to `features/demo/`. Marketing also cannot import the token (the demo barrel drags
mapbox-gl/pdfjs-dist/motion; guarded CRITICAL at `phone-frame.test.tsx:56-70`), so a "sync" could
only ever be a second hand-typed copy — the same defect with a fresher value.

## Touched outside my territory, and why

**`features/demo/ui/__tests__/palette-contrast.test.ts` (U0.5 seat's file) — 4 lines, unavoidable.**
F6 clause (1) makes `flattenOver`'s second parameter required, and `flatten()` called
`flattenOver(top, ...grounds)`, which stops type-checking the moment a ground is required:

```
features/demo/ui/__tests__/palette-contrast.test.ts(101,33): error TS2556: A spread argument
must either have a tuple type or be passed to a rest parameter.
```

So the call site had to move with the signature. What is there is the destructure plus a
one-entry-stack arm — `worst('#ffffff', [['#000000'], ['#ffffff']])` passes single-element stacks and
a one-entry stack is already flat, so it returns `parse(top)` rather than pretending to composite.

**F6 clause (2) is NOT here.** I had originally landed it; the coordinator re-routed it to the U0.5
seat mid-round and the commit was amended to drop it before any push. It lands on
`uiparity/u0-fix-contrast`. A comment at that exact spot in `flatten()` names the clause and the
branch, so the two edits meet inside one function rather than in two places.

**Nothing else.** `glass-tokens.test.ts` and `palette.test.ts` (F3/F5) were left untouched — see the
two proposals below, both of which would otherwise have landed in them.

## Proposals for the concurrent seats and the ledger

**PR-1 → the F3 seat (`glass-tokens.test.ts`).** F1 leaves `GLASS.accentFrom` with **zero** foreground
consumers, which is what makes U0.3's measurement true again — but nothing keeps it that way. A
source pin ("`GLASS.accentFrom` / `ACCENT_FROM` appears only in `gradientAccent` and `T`") belongs in
that file, which F3 already opens this round. F1's own fix note declines to prescribe one; I am
flagging it rather than taking it, to keep one writer per file.
*Trigger if deferred:* the next package that spends `GLASS.accentFrom` outside a fill — U2.2 rewrites
every button variant and is the first candidate.

**PR-2 → the F3 seat.** F8's optional relation pin
(`GLASS.borderSoft === '1px solid ' + withAlpha(colors.border, 0.5)`) cannot be written as stated:
`withAlpha` emits the SPACED `rgba(28, 78, 132, 0.5)` and `GLASS.borderSoft` is the compact form,
pinned byte-exactly. It needs exactly the whitespace normalisation F3 is adding, in the file F3 owns.

**PR-3 → coverage gap, no owner yet.** Probe H had to use `ExportModal` because **none of
`MediaLibrarySheet.tsx:225, 226, 245, 576` has a style pin** — four of F1's six sites, including both
that carry TEXT. A re-point back to a fill shade there is invisible to the suite today.
*Trigger:* U7.2, which rewrites the whole file and will be the first package able to pin the tabs
behaviourally without inventing a fixture for them.

## Process note worth carrying forward

The F9 regex shipped **literal BACKSPACE bytes** into the test file on two consecutive scripted
edits: `\b` collapsed through the shell/Python layering into `\x08`, so the pin could never match and
its red read like an ordinary failing assertion. The playbook's *"every scripted edit asserts its own
pattern matched"* did not catch it, because the assertion covered the **search** string, not the
**replacement**. Third attempt asserted both (no `\x08` survives; the replacement is present) and
built the pattern from `chr(92)` instead of escaped backslashes. **Rule to add: when a scripted edit
writes a REGEX or any escape-bearing literal, assert the replacement landed byte-correct, not just
that the search hit.**

---

# Fix round 2 — W0 VETTED-r1-delta (REVISE)

**Branch:** `uiparity/u0-fix2-foundation` off `origin/feat/uiparity-u0` (`347d132`)
**Head:** `2169c27` · 2 commits, one per finding
**Owner seat:** `ae5f52b4da850cd08` (U0 implementer A) — F12, F13

## Commit → finding

| Commit | F-ID | Sev | What landed |
|---|---|---|---|
| `b4de0a1` | **F12** | MED | Four value assertions on `colors.link` added to three EXISTING `MediaLibrarySheet.test.tsx` cases; my PR-3 deferral withdrawn |
| `2169c27` | **F13** | LOW | `looksLikeColour` widened to any function notation, so `color-mix()` / `hsl()` / `linear-gradient()` trip the `withAlpha` dev-warn |

## Gates (exit codes, cold, from this worktree at `2169c27`)

| Gate | Exit | Result |
|---|---|---|
| `pnpm test --silent` | **0** | **3,521 passed \| 15 todo** (3,536) — up 3 from the phase head's 3,518 |
| `rm -f tsconfig.tsbuildinfo && pnpm exec tsc --noEmit --incremental false` | **0** | — |
| `node .design-sync/check-rn-parity.mjs` | **0** | unchanged by this round |

## Mutation probes — 6 applied, 6 KILLED

Own worktree (`worktrees/probe-u0fix2`) cut at `2169c27`, restored byte-identically after every
probe (`git status --porcelain` empty), torn down with the script: *unlinked 549 junction(s) in 2
pass(es) · `.pnpm` 240 → 240 · exit 0*.

**F12 — the aggregator's PRESCRIPTION-UNVERIFIED mark is discharged.** All four sites, each reverted
to `GLASS.accentFrom` (the exact pre-F1 code), one at a time:

```
R1  MediaLibrarySheet.tsx:227  active tab LABEL   <- the tests lane's own R1, which SURVIVED
    KILLED (exit 1)  expected 'rgb(31, 107, 153)' to be 'rgb(184, 212, 240)'
R2  MediaLibrarySheet.tsx:226  active tab UNDERLINE
    KILLED (exit 1)  expected '2px solid rgb(31, 107, 153)' to contain 'rgb(184, 212, 240)'
R3  MediaLibrarySheet.tsx:246  badge NUMERAL
    KILLED (exit 1)  expected 'rgb(31, 107, 153)' to be 'rgb(184, 212, 240)'
R4  MediaLibrarySheet.tsx:577  selected-row RAIL
    KILLED (exit 1)  expected '2px solid rgb(31, 107, 153)' to contain 'rgb(184, 212, 240)'
```

Each probe fails exactly one case and leaves the other 43 green — the pins are site-specific, not a
blanket that would redden on any change to the file.

**F13 — probed in both directions**, because a warn predicate can fail by being too narrow *or* too
loud and only the first is the finding:

```
R5  narrow the predicate back to /^(#|rgba?\()/
    KILLED (exit 1)  color-mix(in srgb, red 50%, blue) must dev-warn:
                     expected "warn" to be called 1 times, but got 0 times
R6  warn unconditionally (drop the predicate entirely — the noise regression)
    KILLED (exit 1)  expected "warn" to not be called at all, but actually been called 4 times
```

R6 is the one that keeps the fix honest: the four documented-safe keywords are now asserted **by
name** (`transparent`, `currentColor`, `inherit`, `none`), not by one example, so widening the
predicate into a blanket cannot pass.

## Refutations

**None.** Both findings are accepted as written, and both of the delta round's refutations of *my*
positions are conceded:

- **PR-3 (defer the MediaLibrarySheet pins to U7.2) — WITHDRAWN.** My reason was "pinning them today
  means inventing a fixture". The aggregator checked the file and it is false: `tab(name)` at `:45`,
  an active-tab case at `:87-91`, a badge-numeral case at `:101` and a selected-row case at
  `:218-222` were all already there. Every one of the four sites was reachable from a case that
  exists. This is the second deferral I proposed that did not survive contact with its own file
  (F9 was the first); the pattern is that I reached for the ledger before re-reading the fixture.
- **PR-1 (fill-only source guard for `GLASS.accentFrom`) — dropped, and correctly.** With F12 landed
  every one of F1's six sites carries a value pin, so a re-point back is caught behaviourally at all
  six. A source scan would only have guarded against *new* code, which is reviewed code, and the
  repo's guard philosophy is literal-level (BANNED/RETIRED), not usage-level.

## Two notes on the fixes, for the resumed lanes

**F12 uses one named constant, not four inline literals.** `const LINK = 'rgb(184, 212, 240)'` sits
beside the `tab()` accessor with a comment carrying the AA arithmetic (2.54 as a fill shade vs 5.31
for the *inactive* tabs vs 9.60 for `link`). The `ExportHub.test.tsx:115` idiom inlines its literal;
here there are four call sites, so a future re-base moves one line instead of four, and the reason
the value matters is written once where it is read.

**Two assertions are not in the prescription**, one line each: the inactive tab's colour must NOT be
`link` (`:91` case) and the non-current row's `borderLeft` must NOT contain it (`:218` case). They
catch the opposite mutation — painting *every* tab `link` — which erases the selected state exactly
as thoroughly as painting none of them, and which R1–R4 by construction cannot see.

**F13 took the function-notation shape over the keyword allow-list.** The finding offered either.
Same single line, but `/^(#|[a-z-]+\()/i` needs no maintenance the first time a caller passes
`oklch()` or `light-dark()`, whereas an allow-list of safe words silently re-opens the hole for every
CSS colour function added to the platform after it was written.
