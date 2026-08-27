# Fix-delta r3 — QUALITY lane

**Scope:** this lane's four r2 findings, the anchor arithmetic, U0 briefability, and the D1 wave-boundary wording. Docs @ HEAD vs `4f797d0`.

| Finding | Disposition | Opened at |
|---|---|---|
| **QUAL-R2-1** — Scope cells said "dark half" | **FIXED-VERIFIED** | plan `:244`, `:248` |
| **QUAL-R2-2** — anchor arithmetic ambiguous | **FIXED-VERIFIED** | plan `:247`, `:252`, `:262`, `:290`, `:362`, `:516`, `:627` |
| **QUAL-R2-3** — brief's `feat/uiparity` step | **FIXED-VERIFIED** | `02-ratification-brief.md:43` |
| **QUAL-R2-4** — `errorLight` rationale stale | **FIXED-VERIFIED** | plan `:244` |

**4 FIXED-VERIFIED · 0 NOT-FIXED · 0 REGRESSED · 0 new findings. Verdict: APPROVE.**

## Detail

**R2-1.** U0.1 Scope → *"add every missing token **in both scheme halves (D2-amended)**"*; U0.5 Scope → *"Port `palette-contrast.test.ts` (**both schemes, per D2-amended**)"*. Both now agree with their own Recipes cells.

**R2-2 — one number set, keys throughout.** U0.4 `:247` carries the definition: *"**The count is KEYS, each pinned in both halves → ~30 anchor rows. Every stage figure in this plan (~15 → +12 → +4 → +1, ~32 at the end) is a KEY count.**"* It holds at every downstream site:

| Site | Text |
|---|---|
| U0 exit `:252` | *"~15 **keys**"* |
| U1.1 `:262` | *"12 tier **KEYS** (both gradient stops + `border` + `highlightTop` per tier), each pinned in BOTH halves"* |
| U3.1 `:290` | four status anchors, matching the `+4` |
| U8.2 `:362` | *"+`gridSubtle`… **This is the last anchor: the set is complete here**"* |
| §6.6 gate 1 `:516` | *"U0.4 ~15 → U1.1 +12 tiers → U3.1 +4 status → U8.2 +`gridSubtle`"* |
| §9 DoD 1 `:627` | *"~32 at the end — **KEY counts; each key is pinned in both scheme halves, so ~32 keys are ~64 anchor rows**"* |

D3 `:59` repeats the stage figures without the KEY label, which is fine — U0.4 and DoD 1 define them and no site contradicts.

**R2-3.** `:43` → *"Cuts the **`feat/uiparity-u0`** phase branch off `master` (**D18 as overridden** — plan §4.8)"*. `:36`'s row still states the pre-ruling recommendation, correctly, as history under the header's RATIFIED stamp.

**R2-4.** Rationale replaced with the wave-independent one: *"it is the one `*Light` the danger fill (A52) needs from the palette module itself, and U0.5's banned-literal guard forbids hardcoding it."*

**D1 wave-boundary wording — identical in all four places.** Plan §3 `:57`, plan §6.6 `:547`, matrix D1 `:392`, matrix ratification row `:736`: *"three WAVE boundaries — after wave 1, after wave 2, and at U8 exit."* Matrix `:392` additionally maps each boundary to the defect class it catches (wave 1 → the ΔE 0.61 "cards on cards read flat" class; wave 2 → the `recessed` ΔE 16.65 class plus the map chrome).

**U0.0–U0.5 briefable from the doc alone: yes.** U0.0 is well-cut — a genuine precondition (the guard throws before building the anchor list, so `pnpm test` is red on `master` and no U0 package can pass gate 1 as ordered), scoped to the throw only with *"No token values change here"* and the anchor work explicitly left in U0.4. Its Tests cell handles the one thing that could go wrong: the drift set *cannot* be empty until U0.1/U0.3 land, so it asserts the **known** drift set and tightens to empty in U0.4 — which also gives U0.4 the RED it needs. Deps `none — this is the first commit of the port`. U0.1–U0.5 unchanged from the state this lane approved, plus the two Scope corrections.
