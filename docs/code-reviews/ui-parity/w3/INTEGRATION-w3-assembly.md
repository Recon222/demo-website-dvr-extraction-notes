# INTEGRATION — Wave 3 assembly (U5 + U6 + U7)

**Agent:** `dt-integrator` (Opus 5) · **Branch:** `feat/uiparity-w3` · **Base:** `master` @ `6764a28`
**Merge order:** plan §6.2 — U5 → U6 → U7, each `--no-ff`
**Worktree:** `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\w3-wave`

---

## 0. A pre-existing branch collision, resolved before the first merge

`feat/uiparity-w3` **already existed**, locally and on `origin`, pointing at `00a96c7` — the head of
the *W2* wave (its integration-report commit). `origin/feat/uiparity-w2` had been deleted at PR #42
merge, so this was a stray push of the W2 tip under the W3 name.

Verified safe before touching it: `git rev-list --count feat/uiparity-w3 --not master` = **0**, and
`git merge-base --is-ancestor 00a96c7 master` = exit 0. The branch carried nothing master did not
already have, so it was re-pointed with `git branch -f feat/uiparity-w3 master` and the worktree
checked out from there. **Nothing was discarded.**

Consequence for the orchestrator: because the new branch descends from master which descends from
`00a96c7`, the push is a plain fast-forward — **no force-push is needed or was used.**

---

## 1. Merges

| # | Merge | Result | Conflicts |
|---|-------|--------|-----------|
| 1 | `origin/feat/uiparity-u5` @ `de19ff0` | clean | 0 |
| 2 | `origin/feat/uiparity-u6` @ `b5456e1` | clean | 0 |
| 3 | `origin/feat/uiparity-u7` @ `6f91bca` | **4 conflicts** | 4 files / 8 hunks |

U5 and U6 are territorially disjoint (map chrome vs. settings/export/screens), which is why the
first two came out clean. Every conflict in the wave is U7-vs-{U5,U6}.

**Resolution type breakdown — 4 files:**

| Type | Count | Files |
|------|-------|-------|
| Semantic reconciliation (restructuring collision — one mechanism wins, both sides' data unioned) | 1 | `controls/__tests__/banner.test.tsx` |
| Resolve-toward-rewrite, other side's edit preserved | 1 | `screens/map/CaseMapPicker.tsx` |
| Genuine additive union (independent list members) | 2 | `__tests__/glass-tokens.test.ts`, `__tests__/palette-contrast.test.ts` |
| Naive keep-both | **0** | — |

### 1.1 `controls/__tests__/banner.test.tsx` — the flagged u6-vs-u7 restructuring collision (5 hunks)

The two branches restructured the same detection function differently:

- **U6** split the predicate in two — `importsBannerModule` (module import) and
  `rendersBanner`, `/<Banner[\s/>]/`, the **render site**.
- **U7** kept a single import-based `importsBanner`.

**U6's mechanism wins**, and this is not a style preference. U7's import regex false-positives on
`screens/settings/panes/_pane-chrome.tsx`, which imports `BannerIcon` for the severity glyph while
deliberately **not** rendering `<Banner>` — U6.2's `RECIPE_ONLY` middle state under D20. Under U7's
predicate that file reads as an adoption, and the `RECIPE_ONLY` half-two assertion
(`rendersBanner(full) === false`) cannot be expressed at all.

**`ADOPTED`** became the union of both phases' hand-backs — ten entries in `sort()` order (uppercase
before lowercase, so `TimeOffsetScreen.tsx` precedes `import/PickerStage.tsx`):

```
screens/AudioPreviewScreen.tsx        U7.2
screens/AudioRecorderScreen.tsx       U7.2
screens/CompletionScreen.tsx          U6.4b
screens/DateDisambiguationWarning.tsx U3.3 own-lane
screens/EditIncidentLocationModal.tsx U3.3 own-lane
screens/ExtractedScopeScreen.tsx      U3.3 own-lane
screens/NewCaseModal.tsx              U6.4a
screens/OcrCaptureScreen.tsx          U7.3
screens/TimeOffsetScreen.tsx          U6.4b
screens/import/PickerStage.tsx        U3.3 own-lane
```

**`HANDED_BACK` collapses to ONE row** — `_pane-chrome.tsx` (U6.2, deferred under D20). This is the
part a keep-both merge gets fatally wrong: each branch's `HANDED_BACK` still listed the files the
*other* branch had adopted, so a verbatim union would have placed **six files in `ADOPTED` and
`HANDED_BACK` simultaneously** and red both tests.

Re-run pinning **both** sides' behaviour: `banner.test.tsx` **25/25 pass**. That is the empirical
confirmation that all ten `ADOPTED` entries really do render `<Banner`, and that `_pane-chrome.tsx`
really does import-without-rendering.

### 1.2 `screens/map/CaseMapPicker.tsx` — hazard #2 reaching a source line

U5.2's rewrite (hardcoded `'#9fb6d0'` → `colors.textSecondary`) collided with U7.3's A93 em-dash
sweep on the *same line*. Resolved toward the rewrite **and** kept the sweep, because the surviving
surface still renders the string:

```tsx
<div style={{ ...rowTitle, color: colors.textSecondary }}>All Cases</div>
<div style={rowMeta}>Coming soon. View all your cases on one map</div>
```

Taking either side whole would have silently dropped the other phase's work.

### 1.3 / 1.4 The two additive unions

- **`glass-tokens.test.ts`** — `TOKEN_MODULES` gained U5.1's `screens/map/mapTokens.ts` and U7.1's
  `screens/import/terminal-palette.ts`. Independent list members, so a union is correct. **Stale
  prose fixed:** U7's comment claimed its entry was *"the only entry that is not under `tokens/`"* —
  false the moment the union landed. Rewritten to state the real distinction (the map's halves are
  theme-resolved; the console's deliberately are not, per A91/D6(a)).
- **`palette-contrast.test.ts`** — import block, union of U5's three map symbols and U7's two
  console/badge symbols.

---

## 2. Hazard findings

### Hazard #1 — banner.test.tsx u6-vs-u7 — **CONFIRMED, resolved as briefed**

Found exactly as banked. U6's `rendersBanner` kept, both phases' row edits reconciled, every
remaining `HANDED_BACK` row names a real un-adopted file, the `ADOPTED` list matches reality
(verified by running the test, not by inspection). See §1.1.

### Hazard #2 — A93 em-dash sweep vs U5/U6 rewrites — **1 SOURCE CONFLICT + 1 CLEAN-MERGE DEFECT**

The source conflict was `CaseMapPicker.tsx` (§1.2). The clean-merge defect is **the significant
finding of this assembly**:

> `features/demo/ui/screens/map/MapScreen.tsx:41` — U7.3's sweep rewrote
> `PROXIMITY_CENTRED_ON_VIEW` from
> `'Proximity centred on the current view — long-press the map to move it.'`
> to `'Proximity centred on the current view. Long-press the map to move it.'`
> — while **U5.3 owns `screens/map/__tests__/MapScreen.test.tsx`**, which pins that copy as an exact
> `findByText` literal at `:685`.

Two different files, so **all three merges reported clean and nothing flagged it**. The failure
exists only in the combined tree. Note that grepping the merged *sources* for surviving em dashes
would not have found this either — the defect is in a **test pin**, and the source is correct.
Caught only by running the full suite at the merged head.

Resolved toward the sweep (the source is right; `__tests__/copy-rules.test.ts` is the standing guard
against re-introduction). Kept as a **literal**, not an import of the constant: a pin that imports
the string it pins passes through any rewrite of that string, including a rewrite back to an em
dash. The file's other two references (`:669`, `:705`) are regex partials that stop before the
punctuation, which is why one of three broke.

**On the briefed `rg` check:** a raw `rg '—' features/demo/ui` is not the right instrument and does
not return only the six exemptions — em dashes are pervasive in *comments and docblocks*, including
throughout the guard's own docblock. U7.3 shipped
**`features/demo/ui/__tests__/copy-rules.test.ts`**, which is the correct oracle: it strips comments,
paren-matches and blanks every `console.*()` call, walks the whole `ui/` tree, and additionally
enforces a **dead-exemption check** (a `FROZEN_PHONE_VERBATIM` string that is edited or deleted reds,
so a rewrite or deletion by U5/U6 of a frozen surface cannot rot into a blanket exemption). Two of
the five frozen files — `FormFieldsPane.tsx` and `CloudSyncPane.tsx` — are in U6's territory and
survived. **That guard passes at the merged head**, which is the real discharge of hazard #2.

### Hazard #3 — F26-shape latent Banner pins — **3 HITS JUDGED, 2 FIXED**

| File | Verdict |
|------|---------|
| `screens/__tests__/AudioPreviewScreen.test.tsx` `:271`, `:289` | **REAL — fixed.** Both U7.2 Banner pins asserted `colors.infoLight` / `colors.errorLight` directly, with no seam-consuming sibling anywhere in the file. The F26 carry fixed `AudioRecorderScreen.test.tsx` and **left its own package-mate behind** — the sibling-caller miss. Now `severityTone('info'\|'error').background`. |
| `screens/__tests__/time-offset-advisories.test.tsx` `:103` | **WEAKER INSTANCE — fixed.** The primary pin at `:84` already reads `severityTone('warning')`; the opacity witness beside it spelled the same fill as `colors.warningLight`, so a re-point of the seam would red the witness while the pin it is paired with accepted the change. Now both read the seam. |
| `screens/__tests__/CompletionScreen.test.tsx` `:103` | **NOT AN INSTANCE — left alone.** It consumes `severityTone('error')` at `:98`; the `colors.error` use is a *negative* assertion (the fill is not the saturated red), which is a claim about the palette value and belongs in palette terms. |

A dead `palette` import left behind by the first fix was removed in a follow-up commit
(`tsconfig.json` sets no `noUnusedLocals`, so nothing would have caught it).

### Hazard #4 — stale-count prose — **1 FOUND, fixed in the hazard-#1 commit**

U7's comment in `banner.test.tsx`: *"`ADOPTED` grows every time a hand-back lands (U7.2 took it from
four to six)"* — wrong the moment the lists unioned. Rewritten to carry the F48 rule without the
count. U7's `HANDED_BACK` row for `_pane-chrome.tsx` also carried *"3 tones, 8 sites"*; U6's
countless wording was kept instead.

A wider sweep of `features/demo/ui` for `(two|three|…|N) (adoption|entries|sites|files|modules|
hand-backs)` returned ~30 hits, **all pre-existing and all local to their own subject** — none
falsified by this wave. `empty-state.test.tsx:146`'s census ("20 sites in 17 files, minus the five
converted") is backed by a live assertion and passes.

---

## 3. Seams

`grep -rn SEAM` over `features/ lib/ components/ app/` returns markers for every phase P5–U8. In
this repo `SEAM(...)` is a **single-owner declaration**, not a TODO — e.g. `SEAM(U3.3)` in
`banner.test.tsx` is an executable tripwire, not a note.

- **Wired: 1 of 1.** The only seam this wave had to reconcile is `SEAM(U3.3)`'s adoption map. It is
  wired — all six outstanding hand-backs adopted, both lists reconciled, test green.
- **Correctly unwired: `SEAM(U8.2)`** (`palette-contrast.test.ts:858`) — a `todo` awaiting U8.2's
  `::placeholder` rule. It is one of the suite's 2 todos. Not W3's to wire.
- No seam in the merged tree has its backing capability newly available and left unwired. A sweep
  for forward-looking phrasing (`when … lands` / `until` / `pending` / `TODO` near `SEAM`) returned
  only `SEAM(P7.2)`, a v1 *behavioural pin*, not a pending wire.

**No ledger rows proposed.** Nothing in this assembly was deliberately left unfixed. (U7.3's own
D-1/D-2 deferral proposals travel with its report and are the aggregator's to adjudicate; the
integrator neither adds to nor duplicates them.)

---

## 4. Gates — COLD, at the assembled head

Caches deleted before the run (`node_modules/.vite` removed; no `.next`, no `tsbuildinfo` present).

| Gate | Command | Exit | Result |
|------|---------|------|--------|
| Typecheck | `npx tsc --noEmit --incremental false` | **0** | clean |
| Tests | `pnpm test --silent` | **0** | **305 files, 4,194 passed + 2 todo (4,196 total)** |
| RN parity | `node .design-sync/check-rn-parity.mjs` | **0** | **143 anchor rows match** |
| Build | `pnpm build` | **0** | 20/20 static pages; **`/demo` First Load JS = 107 kB** |

Test count comfortably exceeds the ≥4,026 expectation (U5's and U7's suites add). The parity check
returns **143**, not the 135 stall case — U5.1's grown anchor set is present and resolving (41
palette keys + 24 glass-tier keys + 2 map-glass keys × both halves, + 4 always-dark map-chrome rows
+ 4 CTA gradient stops × both halves + the touch floor).

The first cold suite run was **red** (1 file / 1 test) — that is the hazard-#2 clean-merge defect in
§2. The table above is the run after the fix.

---

## 5. Residual risk — where reviewers should aim

1. **A join nobody tests: `_pane-chrome.tsx` is the one surface two live phases both shaped.** U2.4
   holds `:164-233` and U3.2 holds `:69-73`, and U6.2 then built `PaneNote` there against
   `Banner`'s recipe + `BannerIcon` while deliberately not adopting the component. It is
   simultaneously the sole surviving `HANDED_BACK` row, the sole `RECIPE_ONLY` row, and the file
   that broke U7's predicate. The adoption map pins the *structural* facts (imports yes, renders
   no). Nothing pins that `PaneNote`'s rendered severity glyph and `Banner`'s agree **visually**
   across all three tones — they share `BannerIcon` by construction, which is exactly the kind of
   agreement F26 says must be asserted through the seam rather than assumed.

2. **The A93 sweep is ~82 independent editorial judgements and only their ABSENCE is tested.**
   U7.3's own report raises this; the wave assembly does not improve it. `copy-rules.test.ts` proves
   no em dash survives — nothing proves a replacement reads well or preserves meaning. The
   `MapScreen` defect found here is evidence the sweep's *reach* was under-modelled at the phase
   level: a rewrite whose only remaining witness was another phase's test literal.

3. **The F26 shape is a recurring class, not a fixed bug.** Three phases produced three fresh
   instances of it (one already carried, two found here). Any new pin that spells a Banner fill as a
   `*Light` palette token is the same defect, and the suite cannot distinguish it from a correct pin
   while the two values agree.

4. **`CaseMapPicker.tsx`'s "All Cases" row is still an `aria-disabled` placeholder** whose copy now
   reads "Coming soon." — unchanged in substance by this merge, noted only because both phases
   edited that exact line and neither owns the feature.

---

## 6. Commits on `feat/uiparity-w3`

| SHA | Subject |
|-----|---------|
| `c8f2c26` | Merge `feat/uiparity-u5` @ `de19ff0` — step 1 of 3 (clean) |
| `ec19e57` | Merge `feat/uiparity-u6` @ `b5456e1` — step 2 of 3 (clean) |
| `4b2907d` | Merge `feat/uiparity-u7` @ `6f91bca` — step 3 of 3 (4 conflicts, rationale in the commit body) |
| `a9c57d9` | `test(w3)`: route two Banner fill pins through `severityTone` (F26) |
| `dae5667` | `test(w3)`: drop the now-dead `palette` import |
| `7f8b45c` | `test(w3)`: re-pin MapScreen's proximity notice to U7.3's swept copy (A93) |

Every conflict resolution's reasoning is written into the merge commit body, per the hazard
playbook's recovery rule.
