# Fix-delta r2 — QUALITY lane — verification of the QUAL-D-* items

**Scope:** only the five findings that originated with this lane in r1-delta. Docs @ HEAD vs `011b0c8`.

| QUAL-D | Disposition | Opened at | What is there now |
|---|---|---|---|
| **QUAL-D-1** — U0.1's Matrix-rows cell was the by-phase list | **FIXED-VERIFIED** | plan `:219` | Cell reads **`A1–A9, A19, A27, A28`**. The six siblings' rows are gone; A47 no longer appears in any package. |
| **QUAL-D-2** — §4.5 vs §4.8 branch base | **FIXED-VERIFIED** | plan `:146` | *"cut from the `feat/uiparity` integration branch (§4.8 / D18) — except U0.1's, which is cut from `master` (§5 prerequisite)."* Matches §4.8 and §6.3. |
| **QUAL-D-3** — briefing template truncated at D17 | **FIXED-VERIFIED** | plan `:387` | *"Which decisions (**D1–D20**) govern it … **D20's carve-out (§2) is quoted in full in the briefs for U2.3, U4.2, U4.3, U5.2, U5.3 and U6.3.**"* The six packages D20 exists for now receive it. |
| **QUAL-D-4** — "22 anchors" in six places | **FIXED-VERIFIED** | plan `:215`, `:227`, `:56`, `:456`; matrix `:392`, `:410`, `:655` | Matrix: **zero** occurrences. Plan: **one**, at `:521` — the DoD's deliberate *"('22 anchors' was … superseded)"* note, which should stay. U0's preamble `:215` now reads *"PASS at U0's own anchor set (~15, per U0.4) … the set grows with the phases (§6.6 gate 1)"*, agreeing with its own Exit line `:227` and DoD 1. D3 restated in both docs as the staged set. Tracker → "first anchor stage". |
| **QUAL-D-5** — row 41 double-claimed; §4.x order | **FIXED-VERIFIED** | plan `:311`; `:144-182` | U6.4a: *"**Row 41 is U6.4b's in full — `DvrInfoScreen.tsx` is not in this package's file list.**"* §4 now runs 4.1 → 4.9 in order (4.6 `:153`, 4.7 `:161`, 4.8 `:172`, 4.9 `:182`). |

**Counts: 5 FIXED-VERIFIED · 0 NOT-FIXED · 0 REGRESSED · 0 new findings.**

## U0 buildable from the doc alone?

**Yes.** Re-checked the five package cells end to end:

- **U0.1** owns only its own four row-groups; the palette module's path is ruled, its 29 phone names and four `T` aliases are stated, `link`/`linkHover` are in the ADD list, `errorLight` is explicitly U3.1's, and the 13 + 15 bare sites are enumerated in A1/A7. Branch base unambiguous (`master`, per §4.5 and the §5 prerequisite).
- **U0.2** has exact signatures for `withAlpha` and `flattenOver` (n-deep), the literal-`rgba()` return form with its reason, and no A47.
- **U0.3** unchanged and was never in question.
- **U0.4** has five numbered repairs, the staged-anchor rule, and the ~15-anchor target that now matches the preamble, the Exit line, §6.6 gate 1 and DoD 1 — four places, one number.
- **U0.5** has the `TOKEN_MODULES` allow-list mechanism, the two structural pins, and the `it.todo` staging for rows 31/33 (U1.1) and 41–45 (U5.2).

**Lane verdict: APPROVE.**
