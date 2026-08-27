# Lane: typescript — W3 (U5 map + U6 wizard/settings + U7 import/OCR/media)

**Scope:** `git diff master...13827de` — 167 files, +16,514/−1,582, 12 packages.
**Mode:** code review. **Base contract:** `.claude/skills/fleet-orchestration/reviewer-contract.md`.
**My question:** does this TS code introduce a real bug, a type-safety hole, an error-swallowing
path, an RSC boundary violation, or a breach of the demo's architectural contract?

**Gates reproduced independently** (probe worktree `probe-w3r-typescript-f26` @ `13827de`, own
`pnpm install --prefer-offline`, torn down via `tools/worktree-remove.ps1` — 549 junctions unlinked,
main `.pnpm` store intact at 240 entries, branch deleted):

| Gate | Command | Exit | Result |
|---|---|---|---|
| Typecheck | `npx tsc --noEmit --incremental false` | **0** | clean, whole repo |
| Tests | `npx vitest run` | **0** | 305 files, 4,188 passed + 2 todo |
| RN parity | `node .design-sync/check-rn-parity.mjs` | **0** | 143 anchor rows |

---

## CRITICAL

None.

## HIGH

None.

---

## MEDIUM

### [MEDIUM] Two W3-new pins spell a `severityTone()` fill as a raw `*Light` palette token — the F26 shape the integrator declared a recurring class and fixed three siblings of, in this same wave

**File:**
- `features/demo/ui/__tests__/field-recipe-sweep.test.tsx:471` (and its foreground twin `:478`) — new file, `833bc86` (U6.4a)
- `features/demo/ui/screens/__tests__/status-owners.test.tsx:186` — new pin, `2cd4957` (U6.2)

**Issue.** Both assert a rendered `Banner` / `PaneNote` fill in *palette* terms rather than through
the seam the component actually reads. `Banner.tsx:203` resolves `const tone = severityTone(severity)`
and spends `tone.background`; `_pane-chrome.tsx:225`'s `PaneNote` does the same. Spelling the expected
value as `colors.errorLight` / `colors.warningLight` re-derives the seam's output at the assertion
site, so a re-point of `severityTone` — the single edit the seam exists to make possible, and D2's
one-site scheme flip — reds these two files with messages that blame the wrong component. Neither
test's stated claim becomes false under that edit.

**Evidence.**

*Probe 1 (mine; canonical source; dedicated probe worktree; one mutation):*
`features/demo/ui/tokens/status.ts:121` — the `background` line changed from the
`${severity}Light` palette read to the literal `'#101820'` (a legitimate seam re-tint).
Full suite, exit **1**, and the complete census of files holding an absolute value for this
seam is exactly four:

```
FAIL features/demo/ui/tokens/__tests__/status.test.ts          <- the INTENDED anchor (by design)
FAIL features/demo/ui/__tests__/palette-contrast.test.ts       <- must measure the real fill (correct)
FAIL features/demo/ui/__tests__/field-recipe-sweep.test.tsx    <- this finding
FAIL features/demo/ui/screens/__tests__/status-owners.test.tsx <- this finding
Tests  6 failed | 4188 passed | 2 todo
```

`controls/__tests__/banner.test.tsx` **passed** under the same mutation — its pins read
`severityTone(severity)` on both sides and move with the seam, which is the shape W2's
`VETTED-r1-delta.md:18` recorded as correct ("the pin is now RELATIVE — component and oracle move
together"). Restored; `git diff` empty; 4 files / 80 tests green again.

*The two already-fixed siblings are absent from that failing set*, which is the direct confirmation
that these two are the misses. `INTEGRATION-w3-assembly.md` §2 hazard #3 fixed
`AudioPreviewScreen.test.tsx:271,289` on the criterion "no seam-consuming sibling anywhere in the
file" — `field-recipe-sweep.test.tsx` contains **zero** occurrences of `severityTone`. It fixed
`time-offset-advisories.test.tsx:103` on the criterion "the primary pin at `:84` already reads
`severityTone('warning')`; the opacity witness beside it spelled the same fill as
`colors.warningLight`" — `status-owners.test.tsx` is byte-for-byte that shape: the primary pin at
`:164` reads `severityTone(tone)` and **accepted** my mutation, while the witness at `:186` red.
§5.3 of that report states the rule in the general: *"Any new pin that spells a Banner fill as a
`*Light` palette token is the same defect."*

**Second-order, same finding.** `field-recipe-sweep.test.tsx:469-470`'s comment overclaims:
*"The demo's retired recipe was rgba(255,71,87,0.08), so this is the assertion that fails if
anyone re-rolls it locally."* It fails only for a **translucent** re-roll — and the very next line,
`expect(...).not.toContain('rgba')`, already covers that on its own. An *opaque* local re-roll
spelled `colors.errorLight` (which A71's own opacity rule pushes an author toward) passes `:471`
untouched.

**Fix.** Import `severityTone` in `field-recipe-sweep.test.tsx` and assert
`probeColor(severityTone('error').background)` / `severityTone('error').color`; at
`status-owners.test.tsx:186` use `rgb(severityTone('warning').background)`, matching `:164`'s own
idiom ten lines above. Correct the `:469-470` comment to credit the `not.toContain('rgba')` line as
the anti-wash guard. Leave `status.test.ts` and `palette-contrast.test.ts` alone — those two are
where the seam's absolute values belong.

---

## LOW

### [LOW] The PaneNote-vs-Banner glyph-agreement pin uses optional chaining on both sides of a `toBe`, so it passes when BOTH glyphs are absent — on the file the integration report named residual risk #1

**File:** `features/demo/ui/screens/settings/__tests__/pane-chrome.test.tsx:151`

```tsx
expect(noteHost.querySelector('svg')?.innerHTML).toBe(bannerHost.querySelector('svg')?.innerHTML)
```

**Issue.** Optional chaining on both operands makes `undefined === undefined` a pass. This is the
pin written to close `INTEGRATION-w3-assembly.md` §5.1 (*"Nothing pins that PaneNote's rendered
severity glyph and Banner's agree… they share BannerIcon by construction"*), and that shared
dependency is exactly the correlated-failure direction the `?.` pair admits.

**Evidence (probes; canonical source; dedicated probe worktree).**
- *Mutation A* — `Banner.tsx:126` `BannerIcon` returns `null` (glyph gone from **both** consumers):
  `pane-chrome.test.tsx -t "draws the SAME severity glyph"` → **1 passed. SURVIVED.**
- *Negative control, all four clauses satisfied* — same mutation, full suite: **9 failed** across
  `banner.test.tsx`, `field-recipe-sweep.test.tsx`, `DateDisambiguationWarning.test.tsx`. The
  mutation is shipped code, non-equivalent, covered by the suite, and on an arm that executed.
  `pane-chrome.test.tsx` — the one file whose job this is — is **not** in that list.
- *Mutation B (isolating)* — `_pane-chrome.tsx:225` renders `<BannerIcon>` under `{false && ...}`
  so that only `PaneNote` loses its glyph: full suite → **1 failed, `pane-chrome.test.tsx`. KILLED.**

**So the drift direction genuinely holds and the repo is not exposed** — three other files catch a
`BannerIcon` break. This is a weak assertion, not a coverage hole, which is why it is LOW rather than
the HIGH a bare SURVIVED would carry. It earns its row because the fix is one character and the
correct pattern sits ten lines above it in the same file (`:141-142` uses
`firstElementChild!.lastElementChild!`).

**Fix.** Replace both `?.` with `!` (or assert one side `toBeTruthy()` first), so an absent glyph on
either surface reds.

---

## What I verified clean (so the aggregator need not re-derive it)

**Architecture — all four of my beats preserved.**

| Rule | Check | Result |
|---|---|---|
| Store bridge | `grep -rn "useStore" features/demo/ui` minus `DemoExperience.tsx` | **0 hits** |
| Engine purity | `from 'react'` / `'use client'` under `features/demo/engine` | **0 hits** |
| Single barrel | diff of `features/demo/index.ts` + `engine/index.ts` | **empty** — public surface unwidened |
| Marketing/demo wall | W3 touches **no** `app/`, `components/` or `lib/` source at all (only `.design-sync/*.mjs` + `docs/`) | trivially preserved |

**Type safety.** Zero `as any`, zero `@ts-ignore` / `@ts-expect-error`, zero non-null-assertion
introductions and zero unrelated-type `as` casts in added non-test lines. `tsc --noEmit` exit 0 cold.
No `tsconfig.json` change.

**W2 case law followed by W3's new code.** F45 (`satisfies` closers): `mapTokens.ts:96` closes with
`as const satisfies Record<ColorScheme, ...>`, `terminal-palette.ts:64` with `satisfies ColorScheme`,
`:121` with `satisfies Record<ImportLogLevel, string>`. F39 (the `aria-disabled` PAIR): the wave makes
exactly two `disabled` to `aria-disabled` conversions (`CompletionScreen.tsx:203`, `:213`), **both**
carrying the guarded handler the idiom requires, and the Complete CTA carries the `aria-describedby`
half at `:214`. Because `canExport = !!currentLocation && !exportBusy`, the double-submit the removed
`disabled` attribute used to suppress for free is correctly refused by the guard.

**Determinism seam.** Zero `Date.now()` / `Math.random()` added anywhere in the diff. The `importGen`
generation-token pattern in `DemoExperience.tsx` is untouched — that file's 44 changed lines are
**entirely** A93 em-dash copy edits, including around the post-geocode re-check at `:1740`.

**Async / hooks.** No new timers, listeners, `AbortController`s, object URLs or map instances anywhere
in the diff. One new `useEffect` (`MapFiltersSheet.tsx:265-267`) — deliberate, not derived-state
misuse: an `aria-live` region only announces changes *after* mount, and the reset-on-close half is
`ExportModal.tsx:124-139`'s established idiom. `SettingsCategoryList.tsx:149-161`'s new `pressed`
state releases on `pointerup`, `pointerleave` **and** `pointercancel` — no stuck-wash leak. No
`forEach(async)`, no `key={index}`, no unhandled floating promise added.

**U5.2's own predicted defect 1 did not land.** `MapScreen.tsx:277` reads
`filters.statuses.length + (proximityActive ? 1 : 0)`, **not** the adjacent `countActiveFilters`, and
`MapScreen.test.tsx:376-397` ships the three-status fixture asserting `'4'` that separates the two
expressions. That was the report's "single highest-value un-todo"; it is closed.

**The new parity-gate rows are falsifiable, not decorative.** `check-rn-parity.mjs` gained 115 lines
and 8 map-chrome anchors. Probe: `mapTokens.ts` dark `border` alpha `0.45` to `0.55` → gate exit **1**,
`DRIFT mapGlass.border.dark`. **KILLED.** Restored, 143/143.

**Styling conventions.** Zero Tailwind `className` added under `features/demo/ui/**`. Both new
components (`MapFiltersSheet.tsx`, `OverlayHeader.tsx`) open `'use client'`; the four new pure data
modules (`camera-chrome.ts`, `terminal-palette.ts`, `field-input.ts`, `sample-badge.ts`) omit it,
which is the verified-correct inherited-boundary pattern. Zero relative `../` climbing added.

**Security.** No `dangerouslySetInnerHTML` / `srcdoc` / `innerHTML` writes added; no
`engine/logic/pdf/**` or `app/api/**` change in the diff. `PdfPreview.tsx`, `DemoErrorBoundary.tsx`
and `ExitDialog.tsx` changes are copy-only (verified line by line).

**Dead exports.** Every new exported symbol has a consumer except `OverlayHeaderProps` — exporting a
component's props interface alongside it is conventional here and not worth a row.

---

## Out-of-lane observations

- **type-design:** `OverlayHeader.tsx:87-94` — `backLabel?: string` is optional while its own docblock
  says *"REQUIRED whenever `onBack` is given"*; `aria-label={backLabel}` with `undefined` yields a
  button with no accessible name. All four current callers pass it, so it is latent. Same shape as
  U6.4a's self-declared Defect 1, `_shared.tsx:386` `FieldError`'s `role?: 'alert'`. A discriminated
  pair would make both unrepresentable — `type-design-analyzer`'s call, not mine.
- **web/a11y:** `CompletionScreen.tsx:203-205` — the blocked Export Zip's reason lives only in `title`,
  while the docblock 15 lines above argues a `title` *"is a pointer affordance the accessibility tree
  does not surface here"*. `NO_CASE_BANNER_ID` is already on screen carrying that reason whenever
  `!canExport` is caused by `!currentLocation`. Separately, when `exportBusy` is the cause, that
  `title` reads "Open a location first" while a location *is* open (pre-existing string, now reachable
  by keyboard because the control stays focusable).

---

## TypeScript Lane Summary
CRITICAL: 0 · HIGH: 0 · MEDIUM: 1 · LOW: 1
Verdict: **APPROVE with comments**

Store-bridge integrity: preserved
Engine purity: preserved
Barrel + marketing/demo isolation: preserved
Determinism seam: preserved

Probes run: 4 (1 SURVIVED, 2 KILLED, 1 invalid-and-discarded). All restored with `git diff` proven
empty; all in a dedicated worktree, since torn down. Provenance: canonical source in every case, no
mirrored copies. The one invalid probe introduced an undefined identifier rather than a behaviour
change and was discarded, not reported.
Ledger rows proposed: none.
Out-of-lane observations: 2 (listed above).
