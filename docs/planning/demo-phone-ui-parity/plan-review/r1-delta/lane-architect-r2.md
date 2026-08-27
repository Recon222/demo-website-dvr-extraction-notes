# Fix-delta r2 — ARCHITECT lane (targeted)

Scope: only the VD items originating from my ARCH-D-* findings. Verified against the current
`01-master-ui-parity-plan.md` / `00-ui-parity-matrix.md`.

| VD | From | Disposition | Opened |
|---|---|---|---|
| **VD-1** | ARCH-D-1 (regression) | **FIXED-VERIFIED** | plan `:219`, `:263` |
| **VD-5** | ARCH-D-2 (the "22 anchors" half) | **FIXED-VERIFIED** | plan `:215`, `:56`, `:456`; matrix D1/D3/§C.4 |
| **VD-3** | ARCH-D-2 (the §4.5 half) | **FIXED-VERIFIED** | plan `:146`, `:192` |
| **VD-6** | ARCH-D-3 | **FIXED-VERIFIED** | plan `:365`, `:268` |

**VD-1.** `errorLight #b72136` is back in U0.1's ADD list (`:219`) with the dependency stated —
*"**`errorLight #b72136` IS added here** — U2.2's danger fill (A52) takes it in phase U2"* — and
U3.1 (`:263`) now defers: *"`errorLight` already exists from U0.1 (one owner only … because U2.2
consumes it a full phase before this one)"*. Single owner, no double-add, and U2.2's `U0.3, U1` deps
need no change since U0.1 precedes both. `errorDark #ee2f44` correctly stays a separate U0.1 token
and remains the anchor-set member, so U0.4's ~15 is untouched.

**VD-5.** `grep '22 anchors\|22-anchor'` → **1 hit in the plan, 0 in the matrix**. The survivor is
`:521`, the §9 DoD line that records the supersession deliberately. U0's bolded preamble now reads
*"PASS at U0's own anchor set (~15, per U0.4) after it. That is U0's RED/GREEN — the set grows with
the phases (§6.6 gate 1)"* (`:215`) — the contradiction with `:225` is gone. D3 and the tracker swept.

**VD-3.** `grep 'off \`master\`'` → **0 hits**. §4.5 (`:146`) now reads *"cut from the
`feat/uiparity` integration branch (§4.8 / D18) — except U0.1's, which is cut from `master` (§5
prerequisite)"*, and the §5 prerequisite matches. §4.5 and §4.8 agree in both directions.

**VD-6.** §6.1 (`:365`) now states *"D19's re-cut resolves **five of the seven**"* and names both
survivors with their line ranges plus the resolution rule (*"merge U2 before U3"*). U3.4 (`:268`)
gains the cross-cutting-sweep rule naming all four files A80 reaches outside its own phase, bounded
by *"touches only the empty-state block in each and opens those files for nothing else."*

**No new findings. Lane verdict: APPROVE.**
