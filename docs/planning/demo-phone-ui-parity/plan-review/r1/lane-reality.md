# Plan review r1 — REALITY-CHECK lane

**Agent:** `plan-reality-checker` (per `.claude/agents/plan-reality-checker.md`), run on Opus per owner directive.
**Question:** *for every claim these docs make about what already exists, is it true?*
**Under review:** `docs/planning/demo-phone-ui-parity/00-ui-parity-matrix.md` (699L) and `01-master-ui-parity-plan.md` (465L), on `docs/ui-parity-planning` in the worktree `D:\Work Coding Projects\CCTV Recovery Notes App\worktrees\demo-ui-parity-planning` (HEAD `89e224f`; the two docs are unchanged since `3365e3e`).
**Sources opened:**
- DEMO — `features/demo/**`, `.design-sync/**`, `docs/code-reviews/deferred.md`, `docs/planning/demo-phone-parity/**` in the worktree.
- PHONE — `D:\Work Coding Projects\CCTV Recovery Notes App\extraction_case_notes_react_native_expo` @ `main` `dd5551ec`. **Read-only throughout** (`git show` / `git diff` / `git log` / file reads only; no edit, checkout, stash or install).

**Method.** I did not take the two inventories on trust. Every `file:line` in both docs was resolved mechanically against the real source in whichever repo the column refers to, and the doc's stated value/recipe compared against the line actually there. Where a doc row quoted a hex or `rgba()`, a second pass located every real occurrence of that literal in the cited file and reported the delta against the cited line. The drift guard was executed. `census.mjs` was executed. Every phone diffstat the matrix names was re-derived with `git diff --numstat d9606460..main`. Tier-A row counts, status counts, effort totals and per-phase counts were re-computed from the tables themselves.

**Headline.** The docs' substance is unusually well grounded: values, recipes, diffstats, census counts and consumer lists check out at a rate I rarely see in a plan of this size. Every failure below is a **pointer** failure — a line number, a file name, or a count — not a wrong value. Two of them, however, would send an implementer to the wrong place with no signal that anything is wrong, and one silently removes a row from the execution plan entirely.

---

## MAJOR (= HIGH on the definition's scale)

### REAL-1 [MAJOR] `Button.tsx` citations in A65/A66/A67 are the *inventory's* line numbers, not the source file's

**Doc claim:**
- `00-ui-parity-matrix.md:157` (A65) — "**`Button` secondary** — `Button.tsx:115-116`, `:1542`"
- `00-ui-parity-matrix.md:158` (A66) — "**`Button` outline / ghost** — `Button.tsx:117-519`, `:1543-1544`"
- `00-ui-parity-matrix.md:159` (A67) — "**`Button` danger** — `Button.tsx:120`, `:1545`"

**Reality check:** `src/components/common/Button.tsx` @ `main` is **316 lines**. `wc -l` on the file; then `sed -n` over the whole `variantStyles` and `textStyle` regions.

| Cited | What is actually at the cited line | Where the recipe really is |
|---|---|---|
| `:115-116` (secondary) | the **`primary`** variant's opening two lines | secondary container **`:142-145`**; label **`:215-217`** |
| `:117-519` (outline/ghost) | `:117` is inside **`primary`**; `:519` is **past EOF** | outline **`:146-153`**, ghost **`:154-157`**; labels **`:227-232`** |
| `:120` (danger) | `borderTopColor: … ElevatedEdges[colorScheme].top` — inside **`primary`** | danger container **`:158-161`**; label **`:233-235`** |
| `:1542`, `:1543-1544`, `:1545` | past EOF (316L) | — |

**Mechanism (confirmed, not inferred).** These are line numbers *of `phone-ui-delta-inventory.md` itself*. Opening the inventory at those lines:

```
1515| secondary: { backgroundColor: isDisabled ? colors.disabled : colors.backgroundSecondary,
1516|              borderColor:     isDisabled ? colors.disabled : colors.border }
1517| outline:   { backgroundColor: 'transparent',
1518|              borderColor:     isDisabled ? colors.disabled : colors.link }   // link, NOT primary
1519| ghost:     { backgroundColor: 'transparent', borderColor: 'transparent' }
1520| danger:    { backgroundColor: isDisabled ? colors.disabled : dangerFill, …
…
1542| secondary: color = isDisabled ? colors.disabledText : colors.text
1543| outline:   color = isDisabled ? colors.disabledText : colors.link
1544| ghost:     color = isDisabled ? colors.disabledText : colors.link
1545| danger:    color = isDisabled ? colors.disabledText : colors.onError
```

`1515-1516 → 115-116`, `1517-1519 → 117-519`, `1520 → 120` (leading `1` dropped); `1542/1543-1544/1545` carried over whole.

**The inventory itself is correct** — `phone-ui-delta-inventory.md:1499` says "Variant container styles (`Button.tsx:114-162`)" and `:1535` says "Text styles (`Button.tsx:173-243`) … Variant colors (`:193-236`)". Both verified exact. The defect was introduced by the matrix, not inherited.

**Why it matters:** three of the four rows are *in range*, so an implementer opens `Button.tsx:115-116`, finds a plausible-looking variant block, and writes the **primary** recipe into the **secondary** row. That is a silent wrong answer, not a stop-and-ask. The out-of-range ones (`519`, `1542+`) at least fail loudly. A66 is the doc's own "single highest-value contrast row".

**Fix:** replace with `Button.tsx:142-145` + `:215-217` (A65); `Button.tsx:146-157` + `:227-232` (A66); `Button.tsx:158-161` + `:233-235` (A67). A64's `Button.tsx:114-140`, `279-286` and A68's `Button.tsx:81-111` are **correct** and should be left alone — `:279-286` is byte-exact on the `LinearGradient` block.

---

### REAL-2 [MAJOR] B.8 row 77 names the wrong file, marking a substantially-changed surface "COMPLETE — do not re-open"

**Doc claim:** `00-ui-parity-matrix.md:345`, under the heading `## B.8 — Surfaces with NO visible change (phone §3.2) — mark COMPLETE, do not re-open`:

> `| 77 | Import Result: Success (Single) | `ImportResultBody.tsx` | 32-line diffstat, **zero** rendered values changed |`

**Reality check:** the phone inventory's §3.2 table (`phone-ui-delta-inventory.md:18124`) attributes that verdict to a **different file**:

> `| Import | ImportFlowModal — Result: Success (Single) | src/features/import/json-import/components/ImportResultDetails.tsx | +27/-5 | (formatting only) — 32-line diffstat, zero rendered values changed. |`

`git diff --numstat d9606460..main`:

| File | Diffstat | Inventory verdict (`phone-ui-delta-inventory.md`) |
|---|---|---|
| `…/ImportResultDetails.tsx` | **+27/-5** (= the 32) | `:15636` "**UNCHANGED** (formatting only)" |
| `…/ImportResultBody.tsx` | **+247/-93** | `:15385` "**CHANGED — substantially.** The hand-built glass fork was deleted and two saturated-token text colours were neutralised." |

The `ImportResultBody` diff carries real rendered changes, confirmed by reading it: `scopeTag`'s foreground moves `tone → colors.text`; `scopeIndex` and `stat` backgrounds move `rgba(255,255,255,0.06)/0.04 → withAlpha(colors.text, NEUTRAL_WASH_ALPHA)`; the hand-rolled `section`/`highlight`/`LinearGradient` fork is deleted in favour of `<Card glass>` (its in-file comment: *"that fork drifted to radius 16"*).

**Also an internal contradiction.** `00-ui-parity-matrix.md:301` (B.6 row 79) lists the same demo file as **DRIFTED · M · U7**:

> `| 79 | … | screens/ImportResultBody.tsx, ImportResultAccordion.tsx | A33, A55, A69, A71 | … `ImportResultDetails` is **UNCHANGED**. …`

So B.6 row 79 gets the `ImportResultDetails` fact right while B.8 row 77 applies it to the wrong file. The same demo component is simultaneously "DRIFTED, U7" and "COMPLETE, do not re-open".

**Why it matters:** B.8's heading is an explicit instruction to skip. An agent briefed with B.8 drops a surface B.6 assigns it.

**Fix:** in B.8 row 77, change the Demo component to the demo's `ImportResultDetails` counterpart (or `—`, if none exists — the demo has `ImportResultBody.tsx` + `ImportResultAccordion.tsx` and no `Details` sibling), and keep the "32-line diffstat" note attached to that. Leave B.6 row 79 as the owner of `ImportResultBody`.

**Note in B.8's favour:** the other **14** rows are exact. I re-derived every diffstat — `requested-scope +43/-37`, `arrival-departure +6/-10`, `cameras +16/-14`, `export-information +15/-13`, `ModeToggle +12/-20`, `CaptureButton +3/-19`, `RecordingIndicator +14/-28`, `MetadataForm +6/-5`, `EmptyMediaState +14/-25`, `MediaItemInfo +5/-10`, `UserProfileSection +8/-4`, `GeneralSettingsSection` **identical**, `DevSettingsSection +5/-11`, `LockScreen +6/-6` — all match the inventory to the line.

---

### REAL-3 [MAJOR] `SplashScreen.test.tsx` pins neither `#000314` nor alpha `0.70`

**Doc claim — stated three times:**
- `00-ui-parity-matrix.md:444` (D8) — "`SplashScreen.test.tsx` pins **both** `#000314` and the disclosure alpha `rgba(153,186,221,0.70)` (an explicit contrast pin, demo §6.2)."
- `00-ui-parity-matrix.md:179` (A87) — "`SplashScreen.test.tsx:45` pins `rgba(153,186,221,0.70)` as an explicit contrast-alpha pin, and the file also pins `#000314`"
- `01-master-ui-parity-plan.md:301` (U8.1) — "**UPDATE (same commit):** `SplashScreen.test.tsx:45` … **and its `#000314` pin**"

**Reality check:** `features/demo/ui/screens/__tests__/SplashScreen.test.tsx` is 107 lines. `grep -n "000314"` returns **one** hit, `:41`, and it is a comment:

```
41|      // rgba(153,186,221,α) over #000314: α 0.55 → 3.59:1 (fails), 0.65 → 4.65, 0.70 → 5.27.
42|      render(<SplashScreen authState="idle" onScan={vi.fn()} />)
43|      const alpha = Number(
44|        /rgba\(\s*153,\s*186,\s*221,\s*([\d.]+)\s*\)/.exec(
45|          screen.getByTestId('boot-disclosure').style.color,
46|        )?.[1],
47|      )
48|      expect(alpha).toBeGreaterThanOrEqual(0.65)
```

There is **no assertion on `#000314`** anywhere in the file. And the alpha assertion is a **floor of `0.65`** at `:48` — not a pin of `0.70`. `:45`, the line all three claims cite, is the middle of a regex extraction and asserts nothing.

**Why it matters:** U8.1 is governed by the plan's own RED/GREEN rule, and §6.5 briefs every reviewer that *"a pin updated in a later commit, or without the red line, is a HIGH."* Re-basing the boot ground to `#002853` reddens **nothing** in this file. The implementer is told to update a pin that does not exist, cannot produce the required red line, and the review lane is primed to file a HIGH for its absence.

**What is true, and is the more useful statement:** the demo's `#000314` ground is live at **`BootSequence.tsx:272`** — D8 names that correctly (`00-ui-parity-matrix.md:445`), and U8.1's file list correctly includes `BootSequence.tsx:28-43,258-278`. The phone side is also correct: `grep -rn "000314"` over the phone's `src/` and `app/` returns only two **markdown** hits (`DOCUMENTATION-PLAN.md:934`, `biometrics/README.md:200`), and `app.config.js:33` is `backgroundColor: '#002853'`. The plan's own §8 F7 flags exactly this doc-mining hazard.

**Fix:** replace the pin claim with what the test actually does — *"`SplashScreen.test.tsx:43-48` asserts a **floor**, `alpha >= 0.65`, on the disclosure's `rgba(153,186,221,α)`; `#000314` appears only in the `:41` comment and in `SplashScreen.tsx:129`'s prose, never as an assertion."* Then state the real consequence: `#002853` is **lighter** than `#000314`, so the disclosure ratio **falls**, and D8's "adjust only if it drops below the 5.27:1 v1 recorded" is the branch that will actually fire — the `≥0.65` floor is what protects it, and it may itself need raising.

---

### REAL-4 [MAJOR] A37 / U1.4 — both hand-rolled header-gradient citations point at the wrong line

**Doc claim:** `00-ui-parity-matrix.md:112` (A37) and `01-master-ui-parity-plan.md:206` (U1.4), identically:

> "`WizardHeader` (`_shared.tsx:418`) `linear-gradient(180deg,#1b2e48,#15273b)`; `TabBar.tsx:62` `linear-gradient(180deg,#1e3450,#16283c)`"

**Reality check:**

| Cited | Actually at the cited line | The gradient is really at |
|---|---|---|
| `_shared.tsx:418` | `}` — the closing brace of **`WizardNext`** | **`_shared.tsx:397`**, inside `WizardHeader` (declared `:394`): `background: 'linear-gradient(180deg,#1b2e48,#15273b)'` |
| `TabBar.tsx:62` | `* whether the bar shows at all from the same registry (\`isTabView\`).` — a JSDoc line | **`TabBar.tsx:75`**: `background: 'linear-gradient(180deg,#1e3450,#16283c)'` (borderTop `:76`, padding `:77`, boxShadow `:80`) |

Verified by `grep -n` for each literal in each file; the values themselves are byte-exact.

**Why it matters:** U1.4's whole scope is "five hand-rolled header gradients → one". Two of the five point at a brace and a comment. `_shared.tsx` is 566 lines and §6.1 calls it the file "U2 and U6 both want" — the wrong anchor there costs real time and invites an edit to the wrong export (`WizardNext` sits at `:411-418`, immediately above `SectionCard`).

**Fix:** `_shared.tsx:397` and `TabBar.tsx:75` in both docs. The other three in the set are fine — `CaseMapPicker.tsx:30-34` is exact (`background: 'linear-gradient(180deg,#13243a,#0e1d30)'` at `:33`), `WizardDrawer.tsx:333-341` is in range, `SettingsNavBar.tsx:22-32` resolves.

---

### REAL-5 [MAJOR] A27 is orphaned — no phase owns it, and `link`/`linkHover` are never tokenized

**Doc claim:** `00-ui-parity-matrix.md:95` gives A27 (`Colors.dark.link` `#b8d4f0`, `linkHover` `#d0e4f7`, phone `Colors.ts:208-209`) Status **MISSING**, Effort **M**, Phase **U2**, and calls it *"The highest-value contrast row in the port."*

**Reality check:**
- `grep -n "A27" 01-master-ui-parity-plan.md` → **zero hits.** No §5 package lists A27 among its matrix rows.
- The matrix's own by-phase table (`:647`) lists U2 as "A23, A39, A49, A51, A52, A59, A64–A68, A72–A74, A76 (15)". Re-computing U2 from the row cells gives **16** rows — the missing one is **A27**.
- `01-master-ui-parity-plan.md:187` (U0.1) is the package that adds the missing dark tokens. Its ADD list is `raised, raisedHigh, modal, borderLight, borderDark, textInverse, onPrimary, onError, primaryDark, errorLight, successDark, infoDark, disabled, disabledText` — **no `link`, no `linkHover`**. Its matrix rows are "A1–A9, A19, A28", which excludes A27.

Verified against the phone: `src/constants/Colors.ts:208-209` are `link: '#b8d4f0'` / `linkHover: '#d0e4f7'`, exactly as the row says.

**Why it matters:** U2.2 and U2.4 both prescribe the literal `#b8d4f0` (six outline/ghost sites, plus the radio's border/circle/dot/label), so the *value* does get ported — as a **bare hex at ~10 sites**, with no token behind it. That is precisely the sprawl A97's banned-literal guard exists to prevent, and U0.5's "ban the top ~10 palette hexes from `ui/**` outside the token modules" would then be banning a literal that has no token to point at. `linkHover` is not mentioned anywhere in the plan at all. Note also that `#b8d4f0` is already load-bearing in the demo as the glass `highlightTop` base (`rgba(184,212,240,…)`, A31/A35) — two roles, one hex, and no name.

**Fix:** add `link: '#b8d4f0'` and `linkHover: '#d0e4f7'` to U0.1's ADD list and A27 to its matrix rows (they are palette tokens; they belong in the token layer, not in a control package), and add A27 to the matrix's U2 by-phase list. Then U2.2/U2.4 reference the token rather than the literal.

---

## MINOR (= MEDIUM/LOW on the definition's scale)

### REAL-6 [MINOR] Tier-A totals do not reconcile with the rows

Re-computed from the row cells themselves (`00-ui-parity-matrix.md`, 97 rows parsed; no duplicate IDs, no gaps in A1–A97 — both confirmed).

| Table | Doc says | Rows actually say |
|---|---|---|
| `:196` DRIFTED count | **44** | **43** (the doc's own list at `:196` has 43 entries; A47/A62/A96 counted in per the `:203` footnote) |
| `:198` MISSING count | **22** | **24** (the doc's own list at `:198` has 24 entries) |
| `:195-201` column sum | 5+44+21+22+1+2+1 = **96** | must be **97** |
| `:205` effort | S **48** · M **41** · L **8** · XL 0 | S **53** · M **35** · L **5** · `—` **4** (A13, A24, A25, A26) |
| `:623` by-tier note | "5 COMPLETE, 44 DRIFTED, 21 MISSING-SEAM, 22 MISSING…" | same two errors, repeated |
| `:645` U0 | (17) | **18** (list is complete: A1–A9 is 9, plus 9 more) |
| `:646` U1 | (14) | **15** |
| `:647` U2 | (15) | **16** — see REAL-5 |

The effort totals are the load-bearing half: §5's phase durations and the "~7 weeks sequential" estimate at `:656` derive from them, and S/M/L are off in three directions at once (12 fewer M, 5 more S, 3 fewer L).

**Correct.** Tier B reconciles exactly — B.1–B.7 = **72**, B.8 = **15**, B.9 = **14**, grand total 97+72+15+14+17 = **215**, all as claimed.

### REAL-7 [MINOR] The demo-side line drift the accuracy note warns about, quantified

`00-ui-parity-matrix.md:668` says demo §3's ranges "were **not** independently re-opened … treat those ranges as high-confidence anchors, not byte-exact pins". That caveat is honest and correct. Having now re-opened them: **the values are right in every case I checked; the line numbers drift by 1–6** (plus REAL-4's 13 and 21, filed separately). For the record, so the fix pass has a list:

| Row | Cited | Value is really at | Δ |
|---|---|---|---|
| A8 | `SyncStatusCard.tsx:49` (`#2a4a6f`) | `:48` (`:49` is the `#0a1320` fill) | −1 |
| A14 | `CompletionScreen.tsx:66` | `:67` | +1 |
| A14 | `ImportModal.tsx:258` | `:259` | +1 |
| A20 | `mapTokens.ts:135` (`overlayMedium`) | `:136` (`:135` is its doc comment) | +1 |
| A22 | `DeleteConfirmationModal.tsx:95` (0.66 scrim) | `:96` | +1 |
| A22 | `ExportModal.tsx:80` (0.66 scrim) | `:83` | +3 |
| A36 | `CompletionScreen.tsx:96` (`0.9/0.96`) | `:94` | −2 |
| A45 | `AlertDialog.tsx:156` (`0 24px 60px rgba(0,0,0,0.55)`) | `:150` | −6 |
| A45 | `DeleteConfirmationModal.tsx:121` | `:115` | −6 |
| A45 | `ExportModal.tsx:268` | `:263` | −5 |
| A53 | `with-alpha.ts:70` ("stale `recessed` value") | `:61-62` — `GlassColors.dark.recessed.gradient[0]` is `rgba(6, 12, 22, 0.65)`. The claim that it is stale is **correct** (A39's real value is `rgba(0,24,50,0.6)`); only the line is off | −8 |
| A87 | `SplashScreen.test.tsx:45` | see REAL-3 | — |

Worth noting the plan is *better* than the matrix here in at least one place: U1.3 cites `CompletionScreen.tsx:94-106`, which is right, where A36 cites `:96`, which is not.

### REAL-8 [MINOR] A93's two "concrete actions" — one is a phone change that already landed, against a demo string that does not exist

**Doc claim:** `00-ui-parity-matrix.md:185` (A93) — "Two concrete actions: port `ConfirmationScreen.tsx:264` `Captured image unavailable — retry capture.` → **`Captured image unavailable. Retry capture.`**; and **do NOT replicate** the phone's own new violation at `VisionCameraScreen.tsx:679`."

**Reality check:**
- Phone `src/features/ocr-time-capture/components/ConfirmationScreen.tsx:266` **already reads** `Captured image unavailable. Retry capture.` — the em dash is gone at `main`. The inventory records this correctly as a *completed phone change* (`phone-ui-delta-inventory.md:16160`, `:17903`, both phrased "X → **Y**"); the matrix re-read it as a demo action item.
- `grep -rn "Captured image unavailable" features/demo/` → **zero hits.** The demo has no such string to fix.
- The second action is **exact and correct**: `VisionCameraScreen.tsx:679` is `No location permission — captures will have no GPS. Tap to grant.` — em dash present, at that exact line.

The row also asserts "The demo's copy is phone-verbatim by construction, so it inherits both the rule and any violations." That is not so for demo-only copy, and the demo's *real* user-facing em dashes are all in demo-only surfaces the row does not name — e.g. `DemoErrorBoundary` (`This screen hit an unexpected error — your session data is still here.`) and `PdfPreview` (`Your browser blocked the print dialog for this preview — no PDF was saved.`).

**Fix:** drop action 1; state instead that the phone's current string is `Captured image unavailable. Retry capture.` and is what any future port carries. Replace the "inherits any violations" premise with the two real demo-only sites, and note they fall under D12's freeze/follow split.

### REAL-9 [MINOR] U0.3's `ExportModal.reduced-motion.test.tsx:45` is not a colour pin

`01-master-ui-parity-plan.md:189` lists, under U0.3's tests-to-update, "`ExportModal.reduced-motion.test.tsx:45,52` (`#35A0D6` spinner)". Reality: `:45` is `expect(spinner!.style.animation).toBe('')` — a reduced-motion assertion carrying no colour, which will **not** redden when the accent gradient re-bases. The `#35A0D6` pin is at **`:53`**, inside the `toHaveStyle({` block opened at `:52`. Cite `:52-53`. (`ExportHub.test.tsx:116-118,117`, cited in the same cell, is **exact** — `:116` border `rgb(53, 160, 214)`, `:117` boxShadow `rgba(53,160,214,0.35)`.)

### REAL-10 [MINOR] Plan §1 mis-states the matrix's own Tier-B counts

`01-master-ui-parity-plan.md:14` describes the matrix as "97 Tier-A token/recipe rows + **57 changed Tier-B surface rows** + 15 inert + **2 new** + 14 demo-only". The matrix has **72** rows in B.1–B.7 (verified by parsing), and its own §TOTALS breakdown is 56 DRIFTED + 8 COMPLETE-after-Tier-A + 3 MISSING + 1 MISSING-SEAM + 3 OUT + 1 OPTIONAL = 72. Neither 57 nor 2 appears anywhere in the matrix; the plan's sum is 185 against the matrix's 215. Since §1 calls the matrix "the authoritative gap list", the summary should match it.

### REAL-11 [MINOR] §6.1's `_shared.tsx` figures understate it

`01-master-ui-parity-plan.md:320` — "566 lines, ~12 exports, consumers across 25 screens." Line count is **exact** (566). Exports: **18** `export` statements (15 value, 3 type). Consumers: **32** non-test source files under `features/demo/ui` import from it. Since this row exists to size a coordination risk on the file §6.1 flags as contested between U2 and U6, understating the consumer set by ~28% is worth correcting. The sibling rows are exact: `input-theme.ts` "only 7 importers, all in `inputs/`" — verified, exactly `Calendar`, `DateField`, `DateTimeField`, `Dropdown`, `PickerSheet`, `TimeField`, `TimeWheel`; `DemoExperience.tsx` "six `style={{` blocks" — verified, exactly 6.

### REAL-12 [MINOR] A70's Status cell contradicts the totals table

`00-ui-parity-matrix.md:162` gives A70's Status as **MISSING**; the totals table at `:197` lists A70 under **MISSING-SEAM**, and the `:203` footnote explains why ("`MAP_PIN_COLORS` exists and is the seam to split"). The footnote's reasoning is sound and matches the row's own prose — the Status **cell** is what is out of step. Set the cell to MISSING-SEAM.

### REAL-13 [MINOR] U7.1's "memo boundary at `TerminalLine.tsx:17-18`"

`01-master-ui-parity-plan.md:289` — "**The memo boundary at `TerminalLine.tsx:17-18` is load-bearing**". Lines 17-18 are prose inside the file's docblock ("*…so this component stays memoizable: on append, existing rows keep identical props and never re-render*"). The boundary itself is `export const TerminalLine = memo(function TerminalLine(…)` at **`:134`**. The *rationale* is at `:17-18`, so the citation is defensible, but an implementer told a boundary is at `:17-18` will look for code. Cite `:134` (rationale `:15-18`).

### REAL-14 [MINOR] The ledger has 86 sections, numbered to 88

`00-ui-parity-matrix.md:21` and `01-master-ui-parity-plan.md:19` both call `docs/code-reviews/deferred.md` "the demo's **88-section** deferral ledger". It carries **86** sections: `## 1`–`## 45` then `## 48`–`## 88` (46 and 47 are absent). **"Next free section is §89" is correct** and is the operative claim, so this is cosmetic.

---

## Verified true

Everything below was opened in the named repo and confirmed. Recorded because the confirmed set is the more useful half of this review: it tells the fix pass what *not* to touch.

### Phone token layer — `src/constants/Colors.ts` @ `main` `dd5551ec`

| Row | Claim | Confirmed at |
|---|---|---|
| A1 | `background` `#002853` | `Colors.ts:135` |
| A2 | `backgroundSecondary` `#0e3965` | `:136` |
| A3 | `backgroundTertiary` `#17416e` | `:137` |
| A4 | `card` `#0e3965` | `:212` |
| A5 | `modal` `#17416e` | `:213` |
| A6 | `textInverse` `#002853` | `:150` |
| A7 | `border` `#1c4e84` | `:153` |
| A8 | `borderLight` `#2e5f97` | `:154` |
| A9 | `borderDark` `#063d72` | `:155` |
| A10 | `gridSubtle rgba(153,186,221,0.11)` | `:158` |
| A11 | `grid rgba(153,186,221,0.14)` | `:159` |
| A12 | `gridLight rgba(153,186,221,0.20)` | `:160` |
| A14 | `successLight #0f6b42` (+ the "was `#1a8754` (only 4.10:1)" comment) | `:166` |
| A15 | `warningLight #7d5f10` (+ "was `#b38f2f` (only 2.76:1)") | `:174` |
| A16 | `infoLight #2e5f97` | `:183` |
| A17 | `warningAccent #ffc62b` | `:180` |
| A18 | all four `*OnLight` = `#f0f4f8` | `:191-194` |
| A19 | `onPrimary`/`onError` = `#ffffff`, with the D7a deep-shade rider in the adjacent comment | `:201-202` |
| A20 | `overlay rgba(0,40,83,0.9)` | `:216` |
| A21 | `overlayLight rgba(0,40,83,0.7)` | `:217` |
| A22 | `scrim rgba(0,40,83,0.32)` — **including** the source comment's "do NOT resync the two" | `:231` |
| A23 | `disabled #2e5f97` | `:234` |
| A27 | `link #b8d4f0`, `linkHover #d0e4f7` | `:208-209` |
| A28 | all 17 "unchanged" values present as listed | `:130-234` |

### Phone glass tiers — all six, all four parts

| Row | Claim | Confirmed at |
|---|---|---|
| A29–A32 | `card` gradient / border / highlightTop / innerShadow | `Colors.ts:347, 348, 349, 350` |
| A33–A35 | `nestedCard` gradient (**stops swapped**) / border `rgba(43,140,193,0.45)` / highlightTop `0.2` | `:380, 381, 382` |
| A36 | `elevated`, all four | `:386-389` |
| A37 | `header`, all four | `:391-395` |
| A38 | `sheet`, all four (**new tier**) — including the source comment naming the three deleted navies `#0f2035` / `#04305c` / `#0b1624` | `:401-404` |
| A39 | `recessed`, all four (**new tier**), incl. the deliberately-dark `highlightTop rgba(0,12,26,0.55)` | `:434-437` |

### Phone new files — existence, size, added-since-baseline

Each confirmed present, and confirmed **added** in `d9606460..main` via `git log --diff-filter=A`:

| Claim | Confirmed |
|---|---|
| A71 `Banner.tsx` NEW FILE | `src/components/common/Banner.tsx`, 99L, `f48df1dd` |
| A60 `ModalHeader.tsx` NEW | `src/components/layout/ModalHeader.tsx`, 97L, `f9b0b2a1` |
| A61 `OverlayHeader.tsx` NEW | `src/components/layout/OverlayHeader.tsx`, 210L, `4c0116cf` |
| A70 `status-severity.ts` NEW FILE, `:27-72` | `…/map-view/utils/status-severity.ts`, **72L** |
| A85 `terminal-palette.ts` NEW FILE, **118 lines** | `…/pdf-import/constants/terminal-palette.ts`, **118L** exact, `826ac10b` |
| A82 `MapFiltersSheet.tsx` NEW FILE, **291 lines**, PR #127 | `…/map-view/components/MapFiltersSheet.tsx`, **291L** exact, `41b27af3` |
| A53 `withAlpha`/`flattenOver` at `src/lib/utils/with-alpha.ts` | exact path, 83L, `8abe15e9` |

### Phone diffstats — every named one re-derived

`git diff --numstat d9606460..main`, all **exact**: `BatchResultDetails +177/-48` · `CameraScreen +81/-48` · `ConfirmationScreen +116/-85` · `ImportPickerModal +221/-219` · `RecorderScreen +74/-56` · `UserProfileModal +37/-53` · `VisionCameraScreen +244/-106`. Plus all 14 correct B.8 rows (REAL-2).

### Phone contrast contract — `src/constants/__tests__/palette-contrast.test.ts` (464L)

| Claim | Confirmed |
|---|---|
| A33 "`textTertiary` … the floor `palette-contrast.test.ts:205` pins under M2(b)" | `:205` = `expect(worst(Colors.dark.textTertiary, DARK_GROUNDS)).toBeGreaterThanOrEqual(3.79)` — **exact** |
| A22 "Alpha pinned by `palette-contrast.test.ts:396`" | `:396` = `expect(alphaOf(Colors.dark.scrim)).toBe(0.32)` — **exact** |
| A34 "Pinned ≥1.25 (`:325-333`)" | expect-block spanning exactly `:325-333` |
| A39 "two-sided CIE76 ΔE 3–12 (`:355-374`)" | expect-block spanning exactly `:355-374` |
| U0.5 "the three helper sanity checks must reproduce **21.00**, **4.54**, **3.34** exactly" | `:175-178` = `21`, `4.54`, `3.34` — **exact** |
| phone §1.4's `PrimaryButtonGradient` pin at `:234-237` | `:234` = `['dark upper', Colors.dark.onPrimary, PrimaryButtonGradient.dark[0]]` |

### Demo token modules — byte-checked

| Claim | Confirmed |
|---|---|
| A1 `T.bg '#0d1b2a'` | `input-theme.ts:14` |
| A2 `T.raised '#0f2035'` | `:15` |
| A7 `T.border '#1e3a5f'` | `:16` |
| A22 `T.scrim 'rgba(4,8,14,0.55)'` | `:31` |
| A49 `T.rowH = 44` | `:36` |
| U0.1 "`T`'s existing 7 importers must not break" | exactly 7, all in `inputs/` |
| A29 `GLASS.gradientCard` | `glass-tokens.ts:31` |
| A29/D11 `gradientCardDiag` (135°) | `:32` |
| A36 `GLASS.gradientPanel` | `:33` |
| A50 `gradientAccent` + `ACCENT_FROM #35A0D6` / `ACCENT_TO #2580AD` | `:34` + `:23-24` |
| A10 `GLASS.gridOverlay` at `0.05`, 40px | `:36-37` |
| A7 `GLASS.border '1px solid #1e3a5f'` | `:39` |
| A30 `GLASS.borderSoft 'rgba(30,58,95,0.5)'` | `:40` |
| A8 `GLASS.borderBtn '#2a4a6f'` | `:41` |
| A36 `GLASS.borderAccent 'rgba(43,140,193,0.3)'` — "a near-miss of the phone's 0.25" | `:42` |
| A54 `glassCard` triple | `:47-51` |
| A64 `glassBtnPrimary` | `:54-59` |
| A65 `glassBtnSecondary` background `#132236` | `:62-67`, `:65` |
| A10 `demo.css` grid at `rgba(153,186,221,0.035)`, 46px pitch | `demo.css:37-38` |

**A65's cleanest claim holds:** the demo's `glassBtnSecondary.background` is `#132236`, which `Colors.ts` history confirms was the phone's **old** `backgroundSecondary`. The "one-line proof that the demo is a palette generation behind" is real.

### Demo — the drift guard, executed

`node .design-sync/check-rn-parity.mjs` → **exit 1**, `Error: Button PRIMARY_GRADIENT.dark not found`, thrown at `check-rn-parity.mjs:75`. Every part of A96 / U0.4 confirmed:

| Claim | Confirmed |
|---|---|
| "RED on master … throws before building the anchor list" | reproduced; `drift` is never computed |
| U0.4 cites `:74-75` for the throw | `:74` `const gradDark = button.match(…)`, `:75` `if (!gradDark) throw new Error('Button PRIMARY_GRADIENT.dark not found')` — **exact** |
| U0.4 cites `:28` for the RN root | `:28` `const RN = resolve(WEB, '..', '..', 'extraction_case_notes_react_native_expo')` — **exact** |
| U0.4 cites `:54-56` for the const reader | the `readConst` docblock, `readConst` at `:57` |
| "read `PrimaryButtonGradient` from `src/constants/Colors.ts:471`" | `Colors.ts:471` is the definition |
| U0.4 cites `rn-token-parity.test.ts:10-15` | `:10` `it.skipIf(!rnAvailable())`, `:12` `expect(anchors.length).toBeGreaterThanOrEqual(9)`, `:14` `expect(drift, …).toEqual([])` — **exact**; file is 17L |
| "`it.skipIf(!rnAvailable())` means CI without the sibling repo reports green regardless" | true as written |
| current anchor floor is 9, target 22 | `:12` asserts `>= 9` |

### Demo — `census.mjs`, executed

`node docs/planning/demo-phone-ui-parity/census.mjs .` reproduces the matrix's numbers:

| Claim | Census output |
|---|---|
| "the 1,144-occurrence literal census" | `COLOR — 278 distinct values, **1144** occurrences` |
| A1 "`#0d1b2a` 14×" + the 13-site bare list | `14x #0d1b2a`, and **all 14 sites match the matrix's list exactly**, in order |
| A7 "`#1e3a5f` 17×" → 15 bare | `17x #1e3a5f` (minus `glass-tokens.ts:39` + `input-theme.ts:16` = 15) |
| A27 "`#2B8CC1` … 58×" and "`#4BA3D4` 40×" | `58x #2B8CC1`, `40x #4BA3D4` |
| A89 "`#4ecdc4` ×6 (`ExitDialog:56`, `ExploreChecklist:81`, `DashboardScreen:157`, `StoryRail:42,48,94`)" | **exactly those six** |
| A89 "`TerminalLine:44` VERB accent" | `TerminalLine.tsx:44` `VERB: '#4ECDC4'` |

### Demo — test pins named in "tests to update"

Every one of these was opened; each pins what the doc says it pins:

| Cited | Actual assertion |
|---|---|
| `TerminalLine.test.tsx:47` | level tag accent — `expect(tag.style.color, …).toBe(hexToJsdomRgb(colour))` |
| `TerminalLine.test.tsx:54,56` | `TERM_ROW.body` / `TERM_ROW.error` |
| `TerminalLine.test.tsx:63-66` | gutter/tag geometry — `width 44px`, `fontSize 10px`, `width 38px`, `fontWeight 600` ("should NOT move" — correct, none is a colour) |
| `TerminalLine.test.tsx:90-92` | `marginLeft 52px`, `TERM_ROW.blockBg`, `TERM_ROW.blockBorder` |
| `ImportTerminalProgress.test.tsx:443,444,…` | `:443` border `rgba(16, 209, 119, 0.32)`, `:444` a colour assertion |
| `ExportHub.test.tsx:116-118,117` | `rgb(53, 160, 214)` border + `rgba(53,160,214,0.35)` shadow |
| `ExportHub.test.tsx:220,223` | `#10d177` / `#99badd` artifact labels |
| `CoordinateDisplay.test.tsx:23-24` | tone triple — `rgb(255, 71, 87)` |
| `AudioRecorderScreen.test.tsx:169,172` | `#ff4757` / `#2B8CC1` level fill |
| `MediaLibrarySheet.test.tsx:588` | `minHeight: '16px'` |
| `PickerStage.test.tsx:40` | `minHeight '180px'` |
| `PasteStage.test.tsx:34-37` | `240px` / `320px` / `overflowY auto` / `resize none` |
| `UserProfilePane.test.tsx:306,315,316` | three z-index pins — A95/D14's "three tests pin the modal-over-modal ordering" is **exact** |

Also `U7.1`'s `TerminalLine.tsx:39-60` for the palette is **correct** — `LEVEL_ACCENT` at `:39`, `TERM_ROW` at `:53`.

### Demo — other spot checks

| Claim | Confirmed |
|---|---|
| A51 "`MediaLibrarySheet.tsx:708-721` … **already byte-identical to the phone's dark pair**" | `:717-718` are `borderTopColor: 'rgba(255,255,255,0.14)'` / `borderBottomColor: 'rgba(0,0,0,0.3)'` — **exact match** to phone `ElevatedEdges.dark` |
| A52/A67 "Two unshared danger buttons, both `background:'#ff4757'`" | `DeleteConfirmationModal.tsx:202` and `RowActions.tsx:106-108`, both `background: ERROR`, with `const ERROR = '#ff4757'` at `:65` / `:40` — **both lines exact** |
| A63 "`TAB_BAR_HEIGHT = 50` (`:10`, exported)" | `TabBar.tsx:10` — **exact** |
| A70 "`MAP_PIN_COLORS` (`mapTokens.ts:26-31`) started `#FF9500` · working `#00BFFF` · complete `#34C759` · incident `#e53935`" | `:26-31` — **exact, all four** |
| A72 "`fieldInput` (`_shared.tsx:186-195`, module-local, NOT exported) = `borderRadius:8 · border: GLASS.border · background:'#0d1b2a' · color:'#f0f4f8' · fontSize:15 · padding:'11px 12px'`" | `:186-195` — **byte-exact, and `const` not `export`** |
| A76 / U2.3 "`Toggle` (`_shared.tsx:479-557`)" | `Toggle` declared `:479` |
| A46 "`ExportActionSheet.tsx:171` `0 -10px 40px rgba(0,0,0,0.5)`" | `:171` — **exact** |
| A22 "`AlertDialog.tsx:131` … `ExitDialog.tsx:47`" (the 0.66 / 0.72 scrims) | both **exact** |
| A33 "`ImportResultBody.tsx:6-13` (`0.6→0.7`)" | `:9` `linear-gradient(180deg,rgba(26,45,68,0.6),rgba(19,34,54,0.7))` — in range, correct |
| A33 "`CaseActionsSheet.tsx:175-189`", "`DvrInfoScreen.tsx:192-200`", "`ExportModal.tsx:291-303`", "`ImportModal.tsx:181-185`" | all four in range, all four carrying the quoted `rgba(13,27,42,0.6)` / `rgba(26,45,68,0.45)` |
| A39/A59 "`TimeWheel.tsx:103-115` (`background: T.raised`, `border 1px solid rgba(0,0,0,0.4)`)" | `:111-112` — **exact within the cited range** |
| A43 "`CasesScreen.tsx:142`" (radius 16 card) | `:142` `borderRadius: 16, … background: GLASS.gradientCardDiag` — **exact** |
| §6.1 "`ui/DemoExperience.tsx` … Six `style={{` blocks" | exactly 6 |
| §6.1 "`input-theme.ts` … Only 7 importers, all in `inputs/`" | exactly 7, all in `inputs/` |

### Cross-document / prior-effort claims

| Claim | Confirmed |
|---|---|
| "deferral **§31** names 'any actual demo restyle' as its un-defer trigger" | `deferred.md` §31 **Trigger:** "any actual demo restyle (the tokens' whole purpose)…" — **verbatim** |
| §31 names `SyncStatusCard`'s `#2a4a6f` and `CaseMapPicker.tsx:131` as the "can't slot into `borderColor`/a ternary" call sites (A7/A8) | both present in §31's body |
| A95 "deferral §20 (a live inversion between `PickerSheet` 31/32 and `WizardDrawer` 41/42)" | §20 = "z-index inversion if a PickerSheet and the WizardDrawer are open together" |
| A62 "**Deferral §23** (complete/partial dots distinguished by colour only)" | §23 = "Drawer completion dots distinguish complete/partial by colour only (visual)" |
| B.8 "(and row 3 is deliberately unbuilt, deferral §87a)" | §87a = "NOT BUILT (by instruction) — the Lock Screen, matrix row 3" |
| "Next free section is **§89**" | last section is `## 88` |
| §2 "v1 rows 33 (the clock-injected pickers), 41 (`RetentionView`)" are DEMO-BETTER | v1 matrix `:124` row 33 **DEMO-BETTER**; `:142` row 41 **DEMO-BETTER** |
| B.9 "`motion.ts` doubles as the port template back to RN — v1 back-port **B5**" | v1 matrix `:307` — B5 = "`motion.ts` as the Reanimated port template" |
| §5 "it lands as a grep-able `SEAM(Ux.y)` comment … exactly as v1 did" | 8 live `SEAM(Px.y)` markers in `features/demo/**` |
| §6.6 "`verification/lib.js` + the numbered drivers are directly reusable" | `verification/` carries `lib.js` + `01-`…`15-` drivers, `flows.js`, `probe.js`, `README.md` |
| §6.6 "`open()` defaults to `reducedMotion: 'reduce'`" | `lib.js:53` `reducedMotion: motion, // 'reduce' makes cross-slides AND the boot gate instant` |
| §6.6 "the camera/mic shims in `lib.js` must not be removed … any `getUserMedia` request that includes audio **never settles**" | `lib.js:21`, `:64-73` — the shim and that exact rationale |
| §6.6 "What does NOT run here: `look.sh`, `tap.sh`, `ftap.sh`, `lpress.sh`, `swipe.sh`, `mrun.sh`, `ocr.swift`, `mky4m.swift`" | all eight present in `verification/`; none is a Playwright driver |
| §8 F7 "zero live `#000314` anywhere in `src/`, `app/` or `app.config.js` at `main`" | confirmed — only two markdown hits; `app.config.js:33` is `'#002853'` |
| A93 "the phone's own new violation at `VisionCameraScreen.tsx:679`" | **exact line, em dash present** |
| Tier B counts: 72 / 15 / 14, grand total 215 | all re-computed and correct |
| Tier A: 97 rows, no duplicate IDs, no gaps A1–A97 | confirmed by parse |

---

## Reality Check Summary

| Severity | Count |
|---|---|
| BLOCKER / CRITICAL | 0 |
| MAJOR / HIGH | 5 |
| MINOR / MEDIUM–LOW | 9 |

Claims extracted and checked: **~310**
Claims verified true: **~280** (tabulated above)
Claims flagged: **14** findings covering ~30 claims
Claims unverifiable (noted, not flagged): the phone-side ratios marked COMPUTED in §C, which by the matrix's own provenance rule were never observed on hardware; and the ~12 "Phone `+N/-M`" diffstats that name no phone file, which cannot be re-derived from the doc alone.

**No CRITICAL.** The plan's central premise — that the demo sits a full palette generation behind the phone, that the gap is a token/recipe port rather than a logic port, and that the drift guard is red and masking real drift — is true and was verified directly at source, including by executing the guard.

**Verdict: REVISE**
