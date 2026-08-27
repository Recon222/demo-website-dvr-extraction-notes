# Lane — silent failures (W3: U5 map · U6 wizard/settings · U7 import/OCR/media)

**Agent:** `silent-failure-hunter` · **Mode:** code review (round 1)
**Scope:** `git diff master...13827de` in `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\w3-wave`
(81 changed source files, 12 packages) · **Base contract:** `.claude/skills/fleet-orchestration/reviewer-contract.md`
**Probe worktree:** `C:\Users\kriss\AppData\Local\Temp\claude\probe-w3r-sfh-guards` (cut at `13827de`, detached,
own `pnpm install`). **Torn down and verified:** `unlinked 549 junction(s) in 2 pass(es)` · main checkout
`.pnpm` 240 → 240 · exit 0. Every probe restored before the next; tree diff empty and the four guard files
green again after the last restore (43 passed | 2 todo).

Every KILLED/SURVIVED below was mutated in the **canonical source** in that probe worktree (no mirrored
copies involved), one mutation per probe, motion mode irrelevant (all source/style scans plus one jsdom
render probe under the suite's default `vitest.setup.ts`).

---

## CRITICAL

None.

---

## HIGH

### [HIGH] D12's freeze-and-DEFEND guard cannot fail for the reason D12 names — the badge FILL test is one-sided and passes on *no fill at all*

**File:** `features/demo/ui/__tests__/palette-contrast.test.ts:980-991` (the test) · `features/demo/ui/controls/sample-badge.ts:30-36` (the constant it guards)

**Code:**
```ts
const CARD = [GLASS_TIER.dark.nestedCard.gradient[0], palette.dark.background]
const badgeFill   = flatten([SAMPLE_BADGE.background, ...CARD])   // rgba(255,200,90,0.12) COMPOSITED
const warningFill = flatten([palette.dark.warningLight, ...CARD]) // #7d5f10 — OPAQUE, so this is just #7d5f10
expect(round(deltaE(badgeFill, warningFill))).toBeGreaterThan(10)
```

**Issue.** D12's third arm makes the "Sample data" amber a *correctness* constraint — it is the demo's
provenance mark, the same family as `FallbackMode` and `isSample`. The plan's U7.3 row requires "a test
must prove it stays visually distinct from the ported warning family", and the test's own docblock says
the claim "is measured here, not asserted". It is not measured. The badge fill is composited at **12%
alpha over a dark navy nested card**; the comparison target is the **opaque** `#7d5f10`. The alpha
dominates the deltaE entirely and the hue is irrelevant, so the test's value is a near-constant ~65-78
against a threshold of 10 no matter what colour the badge is.

**Adversarial input / sequence.** A later package "tokenises" the badge — `withAlpha(colors.warningLight, 0.12)`,
which is precisely the idiom this same wave introduces two files over (`ImportResultBody.tsx:79`,
`background: withAlpha(tone, 0.16)`). The badge stops being amber; the guard stays green.

**Probe (canonical source, `features/demo/ui/controls/sample-badge.ts`):**

| # | Mutation | Verdict |
|---|---|---|
| A | `background: 'rgba(125,95,16,0.92)'` (warningLight, near-opaque) | **KILLED** — but by the *legibility* case (`:1005`, 4.43 < 4.5), not by the separation case |
| B | `background: 'rgba(125,95,16,0.12)'` — **`palette.dark.warningLight` at the badge's own alpha** | **SURVIVED** (4 passed) |
| C | `background: 'rgba(0,0,0,0)'` — **the fill deleted entirely** | **SURVIVED** (4 passed) |

Measured deltaE against `warningFill`, printed from the test's own helpers in the probe tree:

```
SHIPPED   rgba(255,200,90,0.12) -> composited 45,75,100  dE = 65.31
warningLt rgba(125,95,16,0.12)  -> composited 29,62,92   dE = 68.94   (PASSES — "more distinct" than shipped)
warning   rgba(255,217,61,0.12) -> composited 45,77,97   dE = 62.64   (PASSES)
NO FILL   rgba(0,0,0,0)         -> composited 16,58,102  dE = 77.62   (PASSES — the HIGHEST score of all)
red       rgba(255,0,0,0.12)    -> composited 45,51,90   dE = 72.56   (PASSES)
```

Nothing else in the suite pins the value: a grep for `255,200,90` / `ffd07a` over every `*.test.ts(x)`
returns only text assertions on the words "Sample data". So B and C survive the **whole** suite.

**Evidence.** The correct shape is 300 lines above in the same file — row 33's `recessed` case
(`:651-670`) composites **both** sides against the same ground (`flatten([stop, ...under])` vs
`flatten(under)`) and bounds two-sided. The D12 case composites one side and compares it to a raw opaque
token, which is the inversion of the failure its own docblock claims to close ("an uncomposited comparison
of two rgba() strings would pass over a fill that vanishes into its parent") — here a fill that vanishes
into its parent scores **higher** than the shipped one.

The other three D12 cases are sound and do bite: the foreground separation (`:993`) compares two opaque
values, legibility (`:1003`) killed probe A, and the non-identity structural pin (`:1008`) catches a
literal re-point at `palette.dark[token]` (but not a `withAlpha(...)` of one).

**Fix.** Composite both sides, and compare the badge against what it actually has to stay distinct from —
the ported warning *chip* as it renders, i.e. `flatten([severityTone('warning').background, ...CARD])`
(and the same for error/info while you are there, which is the completeness half: a badge that drifts
onto the info blue is the same provenance lie). Keep the >10 bound, and add the tautology control the
file already uses elsewhere: assert that a fully transparent fill **fails** the bound, so a badge that
disappears cannot pass.

---

## MEDIUM

### [MEDIUM] The A93 em-dash guard fails OPEN on one unbalanced paren inside a console string — everything after it in that file is silently exempt

**File:** `features/demo/ui/__tests__/copy-rules.test.ts:139-159`

**Code:**
```ts
for (let i = m.index + m[0].length - 1; i < chars.length; i++) {
  if (chars[i] === '(') depth++
  else if (chars[i] === ')') { depth--; if (depth === 0) break }
  if (chars[i] !== '\n') chars[i] = ' '
}
```

**Issue.** The paren matcher is string-blind. A `(` inside a console argument's string literal pushes
`depth` to 2, so the call's own `)` only returns it to 1 and the blanker keeps running — erasing every
character until the next unmatched `)` in the file. Every user-facing string inside that window is
silently removed from the scan. The docblock argues paren-matching is *safer* than a line heuristic; in
this direction it is strictly less safe, because a line heuristic over-scans (loud) and this under-scans
(silent).

**Adversarial input / sequence.** An author adds
`console.warn('[demo/map] proximity load failed (see the network tab:', err)` — a shape this repo writes
constantly (26 console calls live under `ui/`) — and any rendered string between it and the next stray
`)` stops being covered.

**Probe (canonical source, `features/demo/ui/screens/map/MapScreen.tsx`):**

- **Control** — planted a real violation inside the `loadProximity` catch:
  `const PROBE_MSG = 'Proximity unavailable — try again later.'`
  → **KILLED**: `FAIL … carries none anywhere under 'ui/'`, with `+ "file": "screens/map/MapScreen.tsx"`.
- **Mutation** — same planted violation, plus one character changed in the console string above it
  (`failed to load — proximity stays off:` becomes `failed to load (proximity stays off:`)
  → **SURVIVED**: `Tests 4 passed (4)`.

The control satisfies all four clauses (the planted string exists in shipped-shaped source, is
non-equivalent, is covered by the case that ran, and executes on the arm that ran).

**Note:** no such string exists today (a grep for a paren inside a console string literal under `ui/`
returns zero), so this is latent, not live — that is why it is MEDIUM and not HIGH.

**Fix.** Skip string and template literals while scanning for the parens (track quote state and
backslash escapes), or blank from the match to the end of the line the call arguments end on using a
scan that treats a quoted run as opaque. Either way, add a case to the existing
"blanks console calls whole" test that plants a `(` inside a console string and proves a rendered string
after it still reds.

---

### [MEDIUM] The FROZEN em-dash exemption is applied per LINE, so a NEW violation sharing a line with a frozen phone-verbatim string is silently excused

**File:** `features/demo/ui/__tests__/copy-rules.test.ts:187`

**Code:**
```ts
if (frozen.some(([text]) => line.includes(text))) continue
```

**Issue.** `FROZEN_PHONE_VERBATIM` is keyed by file **and by the exact string** — the docblock's whole
argument for that keying is that "the list cannot rot into a blanket exemption for a file". The check
then throws the string key away and skips **every** em dash on any line that contains it. This is the
same class W2 ruled on twice in one wave (F32 — file-keyed exemption for a role-scoped ruling; F33 —
whole-line drop for an arm-scoped ruling), now third wave running, on a scan shipped after both rulings.

**Adversarial input / sequence.** Any new demo-originated string authored on the same source line as one
of the five frozen strings.

**Probe (canonical source, `features/demo/ui/screens/import/PickerStage.tsx:31`):** appended a second,
demo-originated key to the frozen string's line —
`pasteTextDescription: 'Paste a request email or notes — AI fills the form', pasteHint: 'Fast — usually under a second',`
→ **SURVIVED**: `Tests 4 passed (4)`. The same planted string on its own line reds; that is the control
from the finding above, which killed on a different file through the identical mechanism.

Blast radius: 5 lines across 5 files (`PickerStage.tsx`, `PasteStage.tsx`, `NotesScreen.tsx` x2,
`FormFieldsPane.tsx`, `CloudSyncPane.tsx`).

**Fix.** One line: match at the occurrence index, not the line content —
`frozen.some(([text]) => { const s = line.indexOf(text); return s !== -1 && at >= s && at < s + text.length })`.

---

### [MEDIUM] On the token-less mount the NEW filters sheet tells the visitor to long-press a map that is not rendered, and the host announces a "current view" that is a hardcoded constant

**File:** `features/demo/ui/screens/map/MapFiltersSheet.tsx:388` · `features/demo/ui/screens/map/MapScreen.tsx:41,381-388`

**Code:**
```tsx
// MapFiltersSheet.tsx:388 — rendered unconditionally
<div style={hintText}>Long-press the map to place or move the proximity ring.</div>
```
```ts
// MapScreen.tsx:381-388
const plotted = filtered.items[0]?.coord
const anchor  = plotted ?? mapRef.current?.getCenter() ?? DEFAULT_MAP_CENTER   // [-79.65, 43.61], frozen
if (!plotted) setNotice(PROXIMITY_CENTRED_ON_VIEW)   // 'Proximity centred on the current view. Long-press the map to move it.'
```

**Issue.** Without `NEXT_PUBLIC_MAPBOX_TOKEN`, `MapCanvas` returns `[data-map-fallback]` before the
`[data-map-canvas]` surface (`MapCanvas.tsx:618-627`), so `mapRef.current` is null and there is no
pointer surface to long-press. U5.2 deleted the on-map proximity toggle and U5.3's sheet Toggle is the
route back — the sheet's own comment (`MapScreen.tsx:496-499`) says so, "including on a token-less mount
where there is no canvas to long-press". Three distinct anchor provenances (a row the visitor can see /
the live map centre / a frozen globe constant) collapse into two notices, and the weakest one — no map at
all — inherits copy that names **both** a view and a gesture that do not exist. The demo's honesty rule is
that a degraded surface announces itself; the Mapbox fallback panel does (it names the missing env var by
hand), and then the sheet mounted over it contradicts it.

The *data* is honest — the counts are real arithmetic on real items and the list really is filtered — so
this is a cause-collapse, not substituted data. Hence MEDIUM.

**Probe (render, jsdom, canonical sources, no env stub — the token-less path):** `MapScreen` mounted with
a case whose one location has no GPS. Asserted in one pass, all present simultaneously:
`[data-map-fallback]` present · `[data-map-canvas]` absent · "Map preview unavailable" rendered ·
"Long-press the map to place or move the proximity ring." rendered in the open sheet ·
"Proximity centred on the current view. Long-press the map to move it." fired after clicking
`filter-proximity`. **1 passed** — the contradiction reproduces on the shipped code with no mutation at
all. The existing suite covers the *reachability* of this path (`MapScreen.test.tsx:708`,
"is reachable with NO Mapbox token") but asserts nothing about what the copy claims.

**Fix.** Two cheap options, either alone closes it: (a) give `MapFiltersSheet` the fact it is missing —
a `canPlaceRing` (or `mapInteractive`) boolean from the host, and swap the hint for one that says the
ring is centred on the case locations when it is false; (b) in `handleProximityToggle`, split the
`!plotted` arm on whether `mapRef.current?.getCenter()` returned a value, and give the
`DEFAULT_MAP_CENTER` arm its own sentence that promises neither a view nor a gesture.

---

## LOW

### [LOW] settings-palette-sweep ALLOWED is keyed by HEX for a reason written per FILE

**File:** `features/demo/ui/screens/settings/__tests__/settings-palette-sweep.test.ts:32-43`

**Issue.** The single row reads "FormFieldsPane footnote tone", but the key is the bare literal
`'#5d7a9a'`, so the exemption excuses that hex anywhere in the ~20-file settings subtree. Same shape as
W2/F32 (exemption broader than the reason beside it), but the blast radius is genuinely small: the row
governs only the *inventory* case, and the sweep real ban (`:79-94`, "spells no hex the palette already
owns") carries **no exemption mechanism at all**.

**Probe:** planted `const PROBE_HEX = '#5d7a9a'` in `settings/SettingsNavBar.tsx` → **SURVIVED**
(3 passed). Negative control, same file, `'#f0f4f8'` (a live palette hex) → **KILLED** (2 failed, both
the ban case and the inventory case). The guard teeth are intact where it matters.

**Fix.** Key the row as `path:hex`, matching W2/F32 role-keyed remedy. Not urgent.

---

## Verified clean — checked and NOT flagged

Recorded so the aggregator can tell "not looked at" from "looked at and sound".

**Honesty machinery (unchanged where it counts).**
- `run-import.ts` `emitFallback` keeps all four arms and the `const exhaustive: never = mode` default
  (`:141-157`); `DemoExperience.tsx:1708-1722` `fallbackNotice` keeps its `never` arm and four distinct
  visitor strings. Only the em dashes moved.
- The `NO_FIELDS_FOUND` rejection (deferred §3 closure) is byte-intact — `ok:false`, the `partialData`
  OCC# carry-through, and the `fallbackMode === 'none'` precondition (`run-import.ts:205-218`).
- `importGen` cancellation: both post-await re-checks survive verbatim (`DemoExperience.tsx:1741` after
  the geocode round trip, `:1786` before the store write). No new async store write anywhere in the diff.
- `SAMPLE_BADGE` extraction moved zero rendered bytes; both sites (`ImportResultAccordion.tsx:43`,
  `OcrCaptureScreen.tsx:411`) consume the module. The `isSample` and `confidence.measured` gating is
  untouched.
- OCR failure arm still renders `result.rawText` beside the Banner (`OcrCaptureScreen.tsx:534-536`); the
  "No camera available here" line and the assumed-date blocker survive the Banner adoption at
  `severity="error"` (Banner is `role="alert"`, so the announcement got louder, not quieter).
- `LocationList` three-reason `SheetEmptyReason` discrimination and the filters-only Clear button survive
  the `EmptyState` adoption (`LocationList.tsx:156-172`).

**Operator breadcrumbs.** Zero `console.*` lines removed anywhere in the source diff; the count under
`features/demo/ui` excluding tests is **29 at master and 29 at 13827de**. The `MapCanvas`
before/after-load split (console.error terminal, console.warn transient), the `loadProximity` catch warn,
the `extract-client` 503-vs-everything-else split and the `geocode.ts` L2 warn are all untouched.

**Guards that fail LOUD and CLOSED (one probe per family).**
- Mono policy (`fonts.test.ts:170-181`): planted a Share Tech Mono stack in `screens/NotesScreen.tsx`
  → **KILLED** (the scan result gained `screens/NotesScreen.tsx` and the toEqual reddened). That toEqual
  is simultaneously the dead-exemption test, so a SCANNER_ONLY file losing the face also reds.
- Settings palette sweep: a real palette hex → **KILLED** (control pair under the LOW above).
- Banner adoption ledger (`banner.test.tsx:344-376`): `existsSync` per row means a rename reds rather
  than empties the list, and `rendersBanner` is compared against a fixed ten-entry toEqual, so a broken
  predicate cannot pass silently. Read, not probed — the integration report 25/25 re-run covers it.
- `field-recipe-sweep.test.tsx:128-139` carries the anti-vacuity control (a file count floor of 30 plus a
  `statSync` isFile check per SWEPT_FILES row) and an empty ALLOWED with a live dead-exemption case.
- Every walker in the wave (copy-rules, banner, settings-palette-sweep, field-recipe-sweep) uses
  `readdirSync`, which **throws** on a missing root rather than returning an empty list — no
  ENOENT-to-empty silent pass in any of them.

**Filter state (U5.3).**
- The badge derivation is well pinned: regressing it from a per-status count to `activeFilterCount`
  → **KILLED**, 2 failures in `MapScreen.test.tsx` (the badge case and the Clear-All case).
- No stale count is reachable: the badge is derived per render from the filter values and
  `proximityActive`, never cached; the case-switch effect resets `filtersVisible` alongside the filter
  values (`MapScreen.tsx:210-227`); and the `MapFiltersSheet` announcement effect keys on visible plus
  subtitle and clears to empty on close, so it cannot re-announce a stale count on the next open.
- `handleClearAllFilters` (filters plus proximity) and `handleClearFilters` (filters only, offered from
  the empty state) are correctly kept distinct — clearing proximity from the empty-state button would
  undo something the visitor did not ask about.
- The cleared-vs-empty distinction survives: the `emptyReason` precondition requiring a non-zero
  pre-filter total and a non-zero active-filter count (MR-3) is untouched, so a case with nothing
  plottable still gets the no-data sentence rather than a Clear button that can restore nothing.

**Scheme seam (F33 masking).** `maskOwnHalfArms` is unchanged at `glass-tokens.test.ts:195-200` and still
line-anchored to a leading light/dark key — the mask did **not** widen at the merge. Scanned all 81
changed source files for member-access half reads: **every hit is inside a comment** (`mapTokens.ts` x8
citing phone Colors values, `NotesScreen.tsx` x1). No new value-position half read.

**Other traced and dismissed.**
- `SyncStatusCard` drops the ok-tinted card ground for a uniform `glassCardNested`, which looked like it
  would make unsynced indistinguishable from synced — it does not: `:82` returns null when there is
  neither a sync nor a sync in flight, so the Synchronized arm is only reachable with a real sync.
- `CompletionScreen:111-128` newly gates the validation-errors Banner behind the no-location banner. The
  hidden case is "no location AND stale gate errors", where the superseding banner is the more honest
  one; the phone makes the same exclusion for the stated a11y reason.
- `TERMINAL_PALETTE.accent` is declared `satisfies Record<ImportLogLevel, string>`, so `TerminalLine`
  cannot resolve an undefined colour for a new level.
- The `NewCaseModal` `CoordinateField` fix renders: `aria-invalid`, `aria-describedby` pointing at the
  error id, and a `FieldError` with `role="alert"` are all wired (`:79-84,92-96`), matching its
  `IncidentLocationFields` twin. The consolidation swallowed no per-field rendering — `FieldError` keeps
  `role` optional precisely so the two blocked-reason lines already inside a status region are not
  nested assertive regions.
- `pdf-extract.ts`, `ocr-recognize.ts` and `ImportModal.tsx` changes are copy and font only; the
  `PdfExtractionError` narrowing and the deliberate teardown swallow are untouched.

**Ledger.** No TRIGGER-LAPSED claim. §15 (`selectors.ts` / `time.ts`) — neither file is in the diff.
§18 (`onFilesPicked` / `runPasteImport` top-level catch) — `DemoExperience.tsx` is in the diff but only
for copy constants and the `fallbackNotice` strings; no awaited call became capable of throwing, so the
trigger has **not** fired. §28 unaffected.

**No deferral rows proposed.**

---

## Silent-Failure Summary
CRITICAL: 0 · HIGH: 1 · MEDIUM: 3 · LOW: 1
Verdict: **REVISE**

Fallback honesty (every substitution announced): **yes for the data; no for the map-degradation copy** (MEDIUM-3)
Failure-cause distinctions preserved: **yes** — FallbackMode, the extract-client 503 split, terminal levels and the empty-reason discrimination all intact
Partial results flagged (not silently short): **n/a** — no new partial-result path in this wave
Async cancellation / stale-write safety: **yes** — importGen re-checks intact, no new post-await store write, badge and announcement derived not cached
Operator breadcrumbs intact: **yes** — 29 to 29, zero removals
Guards fail loud and closed: **3 of 5 families probed KILLED; 2 SURVIVED** (copy-rules, MEDIUM-1 and MEDIUM-2) **plus the D12 defence vacuous** (HIGH)

Out-of-lane observations:
- `MapFiltersSheet.tsx:205-215` duplicates the `ExportModal.tsx` sr-only constant, disclosed in its own comment as a proposed deferral — a type-design / web lane call, not mine.
- The TimeOffsetScreen DST advisory moved from a polite status region to Banner assertive alert; louder, not quieter, so not a silent failure — noted for the web lane in case the politeness was deliberate.
