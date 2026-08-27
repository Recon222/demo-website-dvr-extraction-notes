# Partner legwork — U0.4 / U0.5 brief inputs

**Produced:** 2026-08-26 · seat: PARTNER (`dt-partner`, Opus)
**Demo repo:** `demo-website-dvr-extraction-notes`, **`master` @ `337dc52`** ("chore(agents): pin every lane to opus and point personas at the shared contracts") — every demo `file:line` below is at this commit.
**Phone repo:** `extraction_case_notes_react_native_expo`, **`main` @ `dd5551ec`** — READ-ONLY; no edit, no commit, no stash, no checkout, no install.
**Method:** files read via `git show master:<path>` and direct read of the phone tree. No worktree was cut; implementer A's `worktrees/u0-foundation` was neither read nor touched.

**Evidence grades used below**
- **verified** — the file was opened at the named commit and the quoted text is byte-copied from it.
- **measured** — produced by running a command (`git grep -c` etc.); the command is given.
- **inferred** — a conclusion drawn from verified/measured facts plus the matrix rows; marked inline.

Everything in §1, §2 and §3 is **verified** unless a line says otherwise. The ownership tables at the
end of §3 and the "three reds" sizing are **inferred** from those readings plus `00-ui-parity-matrix.md`.

---

## 0. Three corrections — read these before writing either brief

### 0.1 The `BANNED`-list premise is inverted (governs U0.5, U0.1, U0.3, U1.1, U1.3, U8.2)

The working assumption was: *"a banned literal that is the OLD value stays banned; one that is the NEW
value must be un-banned."*

**All ten `BANNED` literals in `features/demo/ui/__tests__/glass-tokens.test.ts` are the CURRENT LIVE
token values.** Proof: the shape pin at `:81-93` asserts `GLASS` equals an object whose values are
byte-identical to those ten strings. The ban's meaning, from its own docblock at `:8-12`, is
*"the tokenized gradient/border literals must never reappear in UI source outside `glass-tokens.ts` —
new code reaches for GLASS/the fragments instead of pasting the raw strings back in."*

It is a **de-duplication** ban ("use the token"), not an **anti-regression** ban ("this value is gone").

Consequences:

1. **Nothing gets un-banned.** Every changed entry is **rewritten in place to the NEW value**, in the
   same commit as the token change. Leaving the old string in `BANNED` would protect a value nobody
   renders while ceasing to protect the live one.
2. **U0.5's "ban the old palette hexes" is a SECOND, SEPARATE list.** Give the two lists distinct
   names — `BANNED` (= "import the token instead") and e.g. `RETIRED` (= "this value left the
   palette") — or a reviewer reading a red cannot tell which invariant fired.
3. **Only nine of the ten change.** `error border` is untouched by any matrix row.

### 0.2 The drift guard has FOUR throw sites, not one (governs U0.4)

The plan names only `check-rn-parity.mjs:75` as "the actual defect". It is the one currently firing,
but three more will produce exactly the same all-nine-anchor blackout:

| Line | Throw | Why it kills all nine |
|---|---|---|
| `:75` | `Button PRIMARY_GRADIENT.dark not found` | sits **before** the `anchors` array literal at `:77` |
| `:42` | `region marker not found: ${after}` (inside `readField`) | thrown **during** construction of the array |
| `:50` | `field not found: ${key}` (inside `readField`) | same |
| `:59` | `const not found: ${name}` (inside `readConst`) | same |

The anchors array resolves its values **eagerly**, so any single unresolvable anchor still takes the
other eight down. The fix must make each anchor lazily resolved inside a `try/catch` that yields
`{ label, rn: 'PARSE-FAILED', web: … }` — patching `:75` alone leaves three live landmines.

### 0.3 A seventh anchor is at risk, and the plan does not mention it (U0.2 ↔ U0.4 interlock)

Anchor 9, `touchFloor` (`:86`), also reads `input-theme.ts`: `readField(theme, 'rowH')` against
`:36 rowH: 44`. It **survives** a colour-only U0.1 re-export, but **breaks the moment U0.2 routes
`rowH` through `scale.ts`'s `touchTarget.min`** — which U0.2's stated scope makes likely. U0.4 lands
after U0.2, so its "repoint every WEB-side reader" clause must cover `touchFloor → scale.ts` as well
as the six colours → `palette.ts`.

---

## 1. Phone `src/constants/__tests__/palette-contrast.test.ts` (464 lines) — structure

### 1.1 Helpers, with line ranges

| Helper | Lines | What it is |
|---|---|---|
| `AA_TEXT = 4.5` / `AA_NON_TEXT = 3.0` | `:33-34` | the only two thresholds; no AA-large relief anywhere in the file |
| `type Rgba = [number, number, number, number]` | `:38` | |
| `parse(color)` | `:40-54` | accepts `#rrggbb` and `rgb()/rgba()` only; **throws** otherwise. No 3-digit hex, no named colours, no `color-mix()`, no gradient strings |
| `over(top, bottom)` | `:57-65` | source-over composite of `top` onto an already-opaque `bottom` |
| `luminance([r,g,b])` | `:67-77` | WCAG 2.1 relative luminance |
| `contrast(fg, grounds: string[])` | `:79-85` | **n-deep**: composites `grounds` back-to-front, composites `fg` over the result, returns the ratio |
| `round(n)` | `:87` | `Number(n.toFixed(2))` — every assertion compares the rounded value |
| `deltaE(a, b)` | `:101-119` | CIE76 ΔE, with an inner `toLab` at `:102` and an inner `lin` at `:103` |
| `flatten(grounds: string[]): Rgba` | `:121-128` | the composite-only half of `contrast`; this is what feeds `deltaE` |
| `stops(tier, under = [])` | `:130-135` | expands one glass tier into its **two** stop-grounds |
| `worst(fg, grounds[][])` | `:161-165` | `Math.min` across every ground |
| `offenders(pairs, threshold)` | `:167-171` | map → round → filter-below-threshold; asserted `.toEqual([])` so a failure names every offender and its measured ratio |

**There is no `flattenOver` in this file.** The compositor is entirely local (`over` / `flatten` /
`contrast`). The phone's `src/lib/utils/with-alpha.ts:75` `flattenOver(top: string, bottom: string):
string` is a **two-argument production util that this test never imports**. So U0.2's n-deep
`flattenOver(top, ...grounds)` is a *new demo-side production helper*, and the ported contrast test
should carry its own `flatten`/`contrast` exactly as the phone does. Building `contrast` on top of
`flattenOver` would also work — but it is not what the phone does, so **the brief must pick one
explicitly** or the implementer will guess.

### 1.2 The grounds builders — verbatim

```ts
const DARK_BG  = [Colors.dark.background]          // :137
const LIGHT_BG = [Colors.light.background]         // :138

const DARK_GROUNDS: string[][] = [                 // :140-151
  DARK_BG,
  ...stops(GlassColors.dark.card, DARK_BG),
  ...stops(GlassColors.dark.nestedCard, [GlassColors.dark.card.gradient[1], ...DARK_BG]),
  ...stops(GlassColors.dark.sheet, DARK_BG),
  ...stops(GlassColors.dark.recessed, [GlassColors.dark.sheet.gradient[0], ...DARK_BG]),
]

const LIGHT_GROUNDS: string[][] = [                // :152-159  (the plan's cite is correct)
  LIGHT_BG,
  ...stops(GlassColors.light.card),
  ...stops(GlassColors.light.nestedCard, [GlassColors.light.card.gradient[1]]),
  ...stops(GlassColors.light.sheet),
  ...stops(GlassColors.light.recessed, [GlassColors.light.sheet.gradient[0]]),
]
```

`DARK_GROUNDS` is **9 ground-stacks**: 1 bare background + 2 `card` + 2 `nestedCard` + 2 `sheet` +
2 `recessed`.

Three asymmetries the demo port must copy exactly:
- `nestedCard` sits on `card`'s **lower** stop (`gradient[1]`).
- `recessed` sits on `sheet`'s **upper** stop (`gradient[0]`).
- `LIGHT_GROUNDS` omits the background under its tiers, because light's tiers are opaque.

**`header` and `elevated` are absent from BOTH stacks.** Nothing in the phone's contract measures text
on those two tiers. If the demo wants them — and U1.4 puts wizard titles on the `header` tier — that
is an **ADDITION to the contract, not a port**. Decide before U0.5 is briefed and label it as an
extension in the PR body.

### 1.3 Assertion rows per scheme

| `it` block | Lines | Rows | Bound |
|---|---|---|---|
| helper sanity check | `:174-180` | 3 | exact equality (§1.4) |
| muted text ramp, both themes | `:181-200` | **2 dark + 2 light** (`text`, `textSecondary`) | `>= AA_TEXT` via `offenders` |
| `textTertiary` documented ceilings | `:201-208` | 1 dark + 1 light | `toBeGreaterThanOrEqual(3.79)` — **both themes held to the DARK number**; the in-file comment records that light therefore carries ~0.08 of unasserted slack, which is DEF-063's open owner question |
| `link`, the accent-as-text token | `:209-224` | 1 dark + 1 light | `>= AA_TEXT` |
| primary CTA label, both stops | `:225-244` | **2 dark + 2 light** | `>= AA_TEXT`, measured on the **flat stop**, not on a ground stack |
| `onPrimary`/`onError` on deep fills | `:245-276` | **2 dark + 2 light**, plus 2 identity pins (`DangerFill.light === Colors.light.errorDark`, `DangerFill.dark === Colors.dark.errorLight`) | `>= AA_TEXT` |
| four status accents | `:277-304` | **4 per scheme = 8** (`warningAccent`, `infoDark`, `successDark`, `error`) over a per-scheme `barGrounds(scheme)` | `>= AA_NON_TEXT` |
| nested tier separable from its card | `:305-342` | 2 per scheme (border vs each fill stop) + 1 light-only fill row | **contrast**, `.filter(ratio < 1.25)`, plus `toBeGreaterThanOrEqual(1.05)` on the light fill |
| recessed well | `:343-376` | 2 per scheme (each stop vs its sheet) | **ΔE, two-sided** |
| four distinguishable hues | `:377-388` | 1 per scheme | `new Set([warningAccent, infoDark, successDark, error]).size === 4` |
| scrim opacity | `:389-408` | 2 | `alphaOf(Colors.dark.scrim) === 0.32`, `alphaOf(Colors.light.scrim) === 0.5` |
| fullscreen media close glyph | `:409-429` | 2 (over a white frame, over a black frame) | `>= AA_TEXT` — **the text floor applied to a glyph**, deliberate: the chip is the modal's only exit |
| PDF preview spinner / label / value pin | `:430-464` | 2 + 2 + 1 | spinner `>= AA_NON_TEXT`; label `>= AA_TEXT`; `expect(PDF_LOADING_SCRIM).toBe('rgba(0, 40, 83, 0.9)')` |

### 1.4 Which rows are ΔE-bounded

**Exactly one block: `:343-376`, the `recessed` well.** Two-sided, per stop, per scheme:

```ts
.filter(({ dE }) => dE < 3 || dE > 12)
```

The `nestedCard` bound at `:332` (`.filter(({ ratio }) => ratio < 1.25)`) is a **contrast** bound, not
ΔE. Plan §9 clause 2 describes both as "the four ΔE-bounded rows the contrast ratio is blind to" —
that phrasing is loose and should be tightened in the U0.5 brief, because the two need different
helpers.

### 1.5 The three sanity numbers — CONFIRMED

```ts
expect(round(contrast('#000000', ['#ffffff']))).toBe(21)        // :175
expect(round(contrast('#767676', ['#ffffff']))).toBe(4.54)      // :176
// "The figure the plan's Phase 9 correction block is built on."
expect(round(contrast('#002853', ['#2580AD']))).toBe(3.34)      // :178
```

One nit: `round` returns a JS `number`, so `21.00 === 21`. The plan says the port "must reproduce
**21.00**"; the demo pin should be written `toBe(21)` to match the phone byte-for-byte.

### 1.6 RN-specific things a Vitest port must replace

1. **Imports.** `:23` is `import { Colors, DangerFill, GlassColors, PrimaryButtonGradient } from '../Colors'`,
   plus **two deep feature imports** at `:30-31`:
   `import { PDF_LOADING_SCRIM, PDF_VIEWER_CHROME } from '@/features/documentation/constants'` and
   `import { MEDIA_CLOSE_CHIP } from '@/features/media/media-library/components/MediaPreviewFullscreen'`.
   The `:24-29` comment states the deep imports are deliberate — *"the pin has to move WITH the value
   it guards; a duplicated literal here would stay green through exactly the edit it is supposed to
   catch (the `DangerFill` lesson)."* Copy that rule into the demo port.
   **Consequence: contrast rows 36–40 CANNOT land at U0.5** — they need the two named constants U4.4
   creates. Land them `it.todo` alongside the U1-gated rows 31/33. The plan currently todo-gates only
   31/33 and 41–45.
2. **Access pattern.** Everything is `Colors[scheme].token` and `GlassColors[scheme].tier.part`, driven
   by `for (const scheme of ['light','dark'] as const)` loops. Dark-only (D2) collapses every loop to
   the dark arm and turns `GlassColors.dark.card` into `GLASS_TIER.card` — **the demo tier object has
   no scheme level**. This is why U1.1's exported shape is load-bearing: `stops(tier)` requires
   `tier.gradient` to be a readonly two-tuple of strings, which U1.1's declared shape provides.
3. **`parse` rejects `color-mix()`**, 3-digit hex, named colours and gradient strings. This
   independently corroborates D3/A53's rule that every alpha inside `features/demo/**` is a literal
   `rgba()`. It also means the demo must pass **stops**, never a `linear-gradient(...)` string —
   `stops()` is precisely what performs that split.
4. **No RN/Expo API is used anywhere in the file** — no `StyleSheet`, no `Platform`, no `Dimensions`,
   no `react-native` import at all. It is plain TypeScript plus `describe`/`it`/`expect`. The
   Jest→Vitest move is an import-line change only.

---

## 2. Demo `.design-sync/check-rn-parity.mjs` @ `master` (109 lines)

### 2.1 Shape

- **Anchor table: `:77-87`** — a flat array literal of **9** `{ label, rn, web }` objects whose values
  are **resolved eagerly at construction time**. Drift is computed at `:89`:
  `const drift = anchors.filter((a) => a.rn !== a.web)`.
- **`norm` — `:35`** — `const norm = (v) => v.trim().toLowerCase()`. Nothing else. This confirms U0.4's
  defect (5): it cannot reconcile the phone's `rgba(14, 57, 101, 0.85)` with the demo's
  `rgba(19,34,54,0.85)` spelling.
- **`readField(text, key, { after, before })` — `:38-52`.** Slices `text` from `indexOf(after)` to the
  first `indexOf(before)` **within that slice**, then matches:
  ```js
  new RegExp(`\\b${key}\\s*:\\s*(?:'([^']*)'|"([^"]*)"|([0-9.]+))`)
  ```
  So it matches **quoted string literals or bare numbers only**. `bg: palette.background` matches
  nothing. The docblock that states this is at `:54-56` (attached to `readConst`):
  *"input-theme's `T` only re-exports them as `accentFrom: GLASS.accentFrom`, which readField cannot
  see through — it matches literals, not identifier references."*
- **`readConst(text, name)` — `:57-61`** — matches `\bNAME\s*=\s*'…'`. Used for the two gradient stops.
- **Region markers actually in use:** `darkOpts = { after: 'dark: {', before: '} as const' }` (`:72`)
  for every RN colour read; `{ after: 'touchTarget: {', before: '}' }` (`:86`) for the touch floor.
  Both are string-index slices, not parsers — a reordered `Colors.ts` degrades them silently.
- **Skip guard:** `rnAvailable()` at `:31` = `existsSync(join(RN, 'src','constants','Colors.ts'))`,
  with `RN` resolved at `:28`. Standalone invocation exits 0 with `skip:` when the phone repo is
  absent (`:96-99`).

### 2.2 The four throw sites

See §0.2 above — `:75`, `:42`, `:50`, `:59`. All four blank all nine anchors.

### 2.3 The six web-side anchors that break when `T` becomes a re-export of `palette.*`

All six read `theme` (= `features/demo/ui/inputs/input-theme.ts`) through `readField`, i.e. **string
literal only**. `T` line numbers verified on `master`:

| # | Anchor label | Guard line | Reads | `T` today |
|---|---|---|---|---|
| 1 | `primary` | `:78` | `readField(theme, 'primary')` | `input-theme.ts:24` — `primary: '#2B8CC1',` |
| 2 | `background` | `:79` | `readField(theme, 'bg')` | `input-theme.ts:14` — `bg: '#0d1b2a',` |
| 3 | `border` | `:80` | `readField(theme, 'border')` | `input-theme.ts:16` — `border: '#1e3a5f',` |
| 4 | `text` | `:81` | `readField(theme, 'text')` | `input-theme.ts:19` — `text: '#f0f4f8',` |
| 5 | `textMute` | `:82` | `readField(theme, 'textMute')` | `input-theme.ts:21` — `textMute: '#99badd',` |
| 6 | `error` | `:83` | `readField(theme, 'error')` | `input-theme.ts:33` — `error: '#ff4757',` |

Plus the seventh at-risk anchor in §0.3: `touchFloor` (`:86`) → `input-theme.ts:36` — `rowH: 44,`.

**Anchors 7 and 8** (`gradientTop` / `gradientBot`, `:84-85`) read `glass-tokens.ts` via
`readConst(glass, 'ACCENT_FROM')` / `readConst(glass, 'ACCENT_TO')`. They survive U0.3 **only if the
stops stay module consts in `glass-tokens.ts`**. Add one line to the U0.3 brief:
*"`ACCENT_FROM`/`ACCENT_TO` stay module consts in `glass-tokens.ts` — the drift guard reads them by
name at `check-rn-parity.mjs:84-85`. If you move them into `palette.ts`, repoint those two anchors in
the same commit."*

---

## 3. `features/demo/ui/__tests__/glass-tokens.test.ts` @ `master` (124 lines)

### 3.1 How it walks files

`UI_ROOT` is `join(process.cwd(), 'features', 'demo', 'ui')` (`:16`). `sourceFiles(dir)` (`:19-30`) is
a recursive `readdirSync(dir, { withFileTypes: true })` walk. It skips:

- **directories** whose `entry.name` is `__tests__` (`:24`);
- **files** by **basename**: `entry.name !== 'glass-tokens.ts'` (`:25`).

So a new `features/demo/ui/tokens/palette.ts` **is** scanned. Matching is
`text.includes(literal)` at `:72` — a plain substring test over the file's source text.

**Nuance for the U0.5 brief:** a new token module is an offender only **after** U0.5 bans the new
literals, not "by construction" on day one. The plan's phrasing overstates the timing.

### 3.2 The ten `BANNED` tuples — verbatim, `:33-44`

```ts
/** The exact literals the tokens replaced (closing parens kept so 0.5 ≠ 0.55 etc.). */
const BANNED: ReadonlyArray<[name: string, literal: string]> = [
  ['card gradient', 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))'],
  ['diagonal card gradient', 'linear-gradient(135deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))'],
  ['panel gradient', 'linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))'],
  ['accent gradient', 'linear-gradient(180deg,#35A0D6,#2580AD)'],
  ['grid overlay', 'repeating-linear-gradient(0deg,rgba(153,186,221,0.05) 0 1px,transparent 1px 40px)'],
  ['hard border', '1px solid #1e3a5f'],
  ['soft border', '1px solid rgba(30,58,95,0.5)'],
  ['button border', '1px solid #2a4a6f'],
  ['accent border', '1px solid rgba(43,140,193,0.3)'],
  ['error border', '1px solid rgba(255,71,87,0.3)'],
]
```

Note: the **grid overlay** entry bans only the **0deg** half of `GLASS.gridOverlay`; the 90deg half is
unbanned. Keep that asymmetry when U8.2 rewrites the value, or the entry stops matching.

### 3.3 Who rewrites which entry (inferred — from §3.2 plus the matrix rows named)

Per §0.1, each row below is an **in-place rewrite to the new value**, landed in the same commit as the
token change, with the observed red line recorded in the commit body.

| # | Entry | Value today | Rewrite to | Owner | Matrix row |
|---|---|---|---|---|---|
| 6 | `hard border` | `1px solid #1e3a5f` | `1px solid #1c4e84` | **U0.1** | A7 |
| 8 | `button border` | `1px solid #2a4a6f` | `1px solid #2e5f97` | **U0.1** | A8 |
| 4 | `accent gradient` | `linear-gradient(180deg,#35A0D6,#2580AD)` | `linear-gradient(180deg,#1F6B99,#17527A)` | **U0.3** | A50 |
| 1 | `card gradient` | `linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))` | `linear-gradient(180deg,rgba(14,57,101,0.85),rgba(23,65,110,0.92))` | **U1.1** | A29 |
| 2 | `diagonal card gradient` | the 135deg form of the same pair | the 135deg form of the new pair | **U1.1** | A29 / D11 |
| 3 | `panel gradient` | `linear-gradient(180deg,rgba(26,45,68,0.88),rgba(19,34,54,0.95))` | `linear-gradient(180deg,rgba(23,65,110,0.88),rgba(14,57,101,0.95))` | **U1.1** | A36 |
| 7 | `soft border` | `1px solid rgba(30,58,95,0.5)` | `1px solid rgba(28,78,132,0.5)` | **U1.1** | A30 |
| 9 | `accent border` | `1px solid rgba(43,140,193,0.3)` | `1px solid rgba(43,140,193,0.25)` | **U1.3** | A36 |
| 5 | `grid overlay` | the `rgba(153,186,221,0.05)` 0deg half | the `rgba(153,186,221,0.11)` 0deg half | **U8.2** | A10 / D9 |
| 10 | `error border` | `1px solid rgba(255,71,87,0.3)` | **unchanged** | — | none (`#ff4757` is in A28's unchanged set) |

### 3.4 U0.1 reddens this file THREE times, not two (inferred)

1. the `BANNED` check at `:67-79`, if any consumer still holds an old string;
2. the `GLASS` shape pin at `:81-93`;
3. **the fragment pin at `:99-119`** — which hardcodes `'1px solid rgba(30,58,95,0.5)'`,
   `'1px solid #2a4a6f'` and `background: '#132236'`. That last one is A2/A65's `backgroundSecondary`
   → `#0e3965`, **a U0.1 value the plan's U0.1 Tests column does not list**.

There is also a fourth pin in the file, `:121-124` — *"keeps input-theme's accent stops aliased to
GLASS"* — asserting `T.accentFrom === GLASS.accentFrom`, `T.accentTo === GLASS.accentTo`, and
`GLASS.gradientAccent === \`linear-gradient(180deg,${GLASS.accentFrom},${GLASS.accentTo})\``. It is
**relational, not value-based**, so it should survive U0.1 and U0.3 untouched. **If it reddens,
something structural changed** — treat it like the `UserProfilePane` z-index pins, not like a pin to
update.

### 3.5 The smallest correct `TOKEN_MODULES` allow-list change

`:25` today is a **basename** check:

```ts
} else if (/\.tsx?$/.test(entry.name) && entry.name !== 'glass-tokens.ts') {
```

Minimal replacement, reusing `relative` and `sep` already imported at `:3`:

```ts
/** Files allowed to hold the raw literals: the token modules themselves.
 *  Adding a path here is a reviewable act — say why that file is a token module. */
const TOKEN_MODULES: ReadonlySet<string> = new Set([
  'glass-tokens.ts',   // P0.5 extraction — the original owner
  'tokens/palette.ts', // U0.1 — the phone-named dark palette
])

// …inside sourceFiles():
} else if (
  /\.tsx?$/.test(entry.name) &&
  !TOKEN_MODULES.has(relative(UI_ROOT, full).split(sep).join('/'))
) {
```

Each later creating package appends its own path (`tokens/scale.ts`, `tokens/glass-tiers.ts`,
`tokens/status.ts`, `controls/sheet-chrome.ts`, `screens/import/terminal-palette.ts`).

**Free bonus:** this closes a latent hole. The basename check currently skips **any** file named
`glass-tokens.ts` at any depth under `ui/` — a path allow-list does not.

**Do not** replace the skip with a loose predicate (a regex over `tokens/`, a "contains the word
token" test). That removes the anti-re-drift teeth A97 exists for, and U0.5's own row forbids it.

---

## 4. Residual open items for the orchestrator

1. **`header` and `elevated` are not in the phone's `DARK_GROUNDS`.** Adding them to the demo's port is
   an extension, not a port. Decide before U0.5 is briefed — U1.4 puts wizard titles on the `header`
   tier, so text will land there.
2. **Contrast rows 36–40 need U4.4's constants** (`MEDIA_CLOSE_CHIP`, `PDF_LOADING_SCRIM`,
   `PDF_VIEWER_CHROME`). U0.5 must land them `it.todo`. The plan currently todo-gates only rows 31/33
   (U1.1) and 41–45 (U5.2).
3. **`touchFloor` is a seventh at-risk drift anchor** — the U0.2 ↔ U0.4 interlock in §0.3.
4. **Four throw sites in the drift guard**, not one (§0.2).
5. **Pick the compositor shape for the ported contrast test** — the phone's local `flatten`/`contrast`,
   or U0.2's `flattenOver`. The brief must say which; the phone does the former.
6. **`ACCENT_FROM`/`ACCENT_TO` must stay module consts in `glass-tokens.ts`** through U0.3, or anchors
   7/8 need repointing in the same commit (§2.3).
7. **The `:121-124` alias pin is relational** — if it reddens during U0.1/U0.3, that is a defect signal,
   not a pin to update (§3.4).
