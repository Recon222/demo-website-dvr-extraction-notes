# Fix-delta r3 — REALITY-CHECK lane

**Scope:** `git diff 4f797d0 HEAD -- docs/planning/demo-phone-ui-parity/0*.md`. New values only. Phone `extraction_case_notes_react_native_expo` @ `dd5551ec`, **read-only**.

## Finding

### REAL-R3-1 [MEDIUM] U1.1's tier-anchor arithmetic is internally inconsistent

**Claim** (plan U1.1): *"add the six tiers to the drift guard: **12 tier KEYS** (both gradient stops + `border` + `highlightTop` per tier), each pinned in BOTH halves — **24 anchor rows**."*

The parenthetical defines **4 keys per tier** (stop 1, stop 2, `border`, `highlightTop`). Six tiers × 4 = **24 keys**, and ×2 halves = **48 rows**. The stated 12/24 is exactly half.

Two self-consistent repairs — the owner picks which guard scope was intended:

| | Keys/tier | Keys | Rows |
|---|---|---|---|
| As the parenthetical reads | 4 | 24 | **48** |
| If only `gradient` + `border` are anchored (drop "both gradient stops" and "highlightTop" from the parenthetical) | 2 | 12 | **24** |

**Why it matters:** the `+12` propagates to the running anchor total in **three** places (*"U0.4 ~15 → U1.1 +12 → U3.1 +4 → U8.2 +1"*), and §9's definition of done measures the completed anchor set at U8.2. If the intent is 4 keys/tier, the final count is understated by 12 and U1.1's closing act is half-specified.

**Fix:** reconcile the number with the parenthetical, then re-derive the running total in all three places.

---

## Verified true

### The six light glass tiers — every value byte-exact against `Colors.ts:274-344`

All 24 light values (6 tiers × 4) are transcribed across the matrix's A.2 rows (A29–A39); U1.1 carries the *type shape* and resolves values through those rows. Every one matches source:

| Tier | Key | Doc | Source |
|---|---|---|---|
| `card` | gradient | `['rgba(248,250,252,1)','rgba(241,245,249,1)']` | `:277` ✓ |
| | border | `rgba(148,163,184,0.45)` | `:279` ✓ |
| | highlightTop | `rgba(148,163,184,0.45)` | `:281` ✓ |
| | innerShadow | `rgba(30,58,138,0.04)` | `:283` ✓ |
| `nestedCard` | gradient | `['rgba(233,238,245,1)','rgba(223,231,239,1)']` | `:302` ✓ |
| | border | `rgba(100,116,139,0.45)` (was `rgba(148,163,184,0.35)`) | `:306`; the old value matches the `:303` comment ✓ |
| | highlightTop | `rgba(148,163,184,0.35)` unchanged | `:310` ✓ |
| | innerShadow | `rgba(30,58,138,0.03)` | `:311` ✓ |
| `elevated` | gradient | `['rgba(255,255,255,1)','rgba(248,250,252,1)']` | `:315` ✓ |
| | border + highlightTop | `rgba(100,116,139,0.35)` | `:316-317` ✓ |
| | innerShadow | `rgba(30,58,138,0.05)` | `:318` ✓ |
| `header` | gradient | `['rgba(255,255,255,0.98)','rgba(248,250,252,0.95)']` | `:321` ✓ |
| | border + highlightTop | `rgba(148,163,184,0.4)` | `:322-323` ✓ |
| | innerShadow | `rgba(30,58,138,0.03)` | `:324` ✓ |
| `sheet` | gradient | `['rgba(255,255,255,1)','rgba(241,245,249,1)']` | `:329` ✓ |
| | border + highlightTop | `rgba(100,116,139,0.4)` | `:330-331` ✓ |
| | innerShadow | `rgba(30,58,138,0.06)` | `:332` ✓ |
| `recessed` | gradient | `['rgba(203,213,225,0.45)','rgba(226,232,240,0.35)']` | `:339` ✓ |
| | border | `rgba(100,116,139,0.25)` | `:340` ✓ |
| | highlightTop | `rgba(100,116,139,0.3)` | `:341` ✓ |
| | innerShadow | `rgba(30,58,138,0.08)` | `:342` ✓ |

Zero mismatches, including the alpha-only distinctions the source draws (`0.03` / `0.04` / `0.05` / `0.06` / `0.08` across four tiers, and `0.25` vs `0.3` vs `0.35` vs `0.4` vs `0.45` on the slate borders). A29's *"light unchanged"* and A36's *"light `elevated` is unchanged throughout"* are also correct — those tiers' light halves are untouched relative to baseline.

### `ElevatedEdges` — `Colors.ts:487-490`

| Doc | Source |
|---|---|
| `light { top: rgba(255,255,255,0.35), bottom: rgba(0,0,0,0.1) }` | `:488` ✓ **byte-exact** |
| `dark { top: rgba(255,255,255,0.14), bottom: rgba(0,0,0,0.3) }` | `:489` ✓ **byte-exact** |

The rider *"Do NOT hardcode the dark pair (D2-amended)"* is consistent with the record's shape at `:487-490`.

### REAL-R2-1 (my r2 LOW)

**FIXED-VERIFIED.** Plan U0.1 now reads *"**41 sites across 19 files**, **4 of them lowercase** (the 20th file, `mapTokens.ts`, holds only the keyed definition)"* — exactly the recommended wording, and it matches the recount (42 hits / 20 files, minus the `mapTokens.ts:58` definition).

---

## Summary

| Severity | Count |
|---|---|
| CRITICAL / HIGH | 0 |
| MEDIUM | **1** |
| LOW | 0 |

Values checked: **24 light tier values + 4 `ElevatedEdges` values = 28**, all byte-exact. Plus one arithmetic claim (failed) and one prior fix (verified).

The light-half transcription is clean — 28/28 with no drift, which is the part that would have been expensive to get wrong. The single finding is a count that contradicts its own parenthetical.

**Verdict: APPROVE with comment** (one MEDIUM, an arithmetic reconciliation).
