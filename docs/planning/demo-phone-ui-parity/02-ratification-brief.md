# Ratification brief — Demo↔Phone UI Parity v2

**For:** the owner · **Date:** 2026-08-27 · **Status:** planning phase COMPLETE, review cycle closed APPROVE, execution PAUSED at this gate.
**Rule on:** D1–D20 below (one word each is enough — "accept" or your override). D18–D20 are execution-shaped and must be ruled in the same pass.
**Full text:** `00-ui-parity-matrix.md` § DECISIONS NEEDED (each D has options + consequences) and § OWNER RATIFICATION (the table your rulings go into); `01-master-ui-parity-plan.md` §3 mirrors them.

## What was proven

- **Recon:** phone delta `d9606460..dd5551ec` inventoried at 18,613 lines (High confidence; every value opened at source); demo styling state at 2,480 lines + a re-runnable `census.mjs` (1,144 colour literals / 278 distinct / 99 components / ~95 style-pinning assertions).
- **Matrix:** 97 Tier-A token/recipe rows (41 DRIFTED · 24 MISSING · 21 MISSING-SEAM · 7 COMPLETE · 4 other) + 72 Tier-B surface rows (56 DRIFTED · 3 MISSING · 8 COMPLETE-after-Tier-A · 3 OUT · 1 OPT) + 15 inert + 14 demo-only. Effort S53 / M35 / L5.
- **Plan:** U0 tokens+guards → U1 glass/cards → U2 controls ∥ U3 status/badges → U4 sheets/dialogs → U5 map ∥ U6 wizard/settings/export → U7 import/OCR/audio/media → U8 splash/shell/design-sync. ~4–5 weeks two-lane.
- **Review:** 3 Opus lanes + aggregator. r1 BLOCK (2B/16M/27m) → 45/46 fixed → delta REVISE (0B/4M/7m) → 11/11 fixed → delta r2 all lanes APPROVE → Fable closing verdict **APPROVE**. ~280 codebase claims verified true at source; every file:line in the docs was opened.
- **Mechanical gates:** the RN↔web drift guard (currently RED, masking 4 palette drifts) becomes a per-phase gate whose anchor set grows with the phases (~15 → ~32); the phone's `palette-contrast.test.ts` is ported dark-half as a demo test in U0.

## The decisions (recommendation in bold — "accept" takes it)

| # | Question | Recommendation |
|---|---|---|
| D1 | Phone-side verification on Windows (no sim) | **Mechanical gates every phase; your device pass at three checkpoints — after U1, U5, U8** |
| D2 | Dark-only stays? | **Yes — port dark values only** (makes DEF-UI-002/DEF-063 light-only ceilings N/A) |
| D3 | Tokenization depth | **Seams-only + value-changed sweep + guard** — build/adopt the shared recipes, sweep only literals whose value changed, leave unique unchanged literals |
| D4 | Superseded phone rulings D3(a)/D1(a) | **Follow the code** (whole map view follows theme; drop the 4px left accent bar) |
| D5 | Inherited contrast ceilings | **Inherit all four explicitly, ledger them as deferred §89; add no new `textTertiary` text**; map filter-count badge fill = `primaryDark #1F6B99` (5.80:1), not `#2B8CC1` (3.73) |
| D6 | Tab-bar height (phone never sets it; demo pins 50) | **Keep 50, documented divergence; port colours + `paddingTop: 6`** |
| D7 | Design-sync bundle regeneration | **One closing package U8.4** |
| D8 | Splash ground `#000314 → #002853` | **Port it; re-measure the disclosure in the same commit (ratio FALLS on the lighter ground; the ≥0.65 floor may need raising to hold 5.27:1)** |
| D9 | `demo.css` "lifted rules" vs new grid values | **Page backdrop stays (demo-only); `GLASS.gridOverlay` → 0.11; keyframes untouched** |
| D10 | Disabled: opacity idiom vs `disabled` token | **Keep opacity + `aria-disabled`; add the two tokens; use them only where the phone paints a fill (Button)** |
| D11 | `gradientCardDiag` 135° demo-only variant | **Keep, re-based to new stops, documented divergence** |
| D12 | 14 demo-only surfaces | **Three-way split** (follow palette / freeze / defend) — see matrix D12 for the per-surface table |
| D13 | Two mono families vs phone's one | **Keep both; codify: Share Tech Mono = scanner/terminal/HUD, JetBrains Mono = evidentiary values** |
| D14 | Five z-index schemes | **OUT-OF-SCOPE; deferral §89 with trigger "next overlay package"** |
| D15 | PR #125 floating header | **Port the geometry (92→64 header, +108→+80 first-card offset); defer the experimental scroll-materialising blur** |
| D16 | Armed-case echo row (phone deleted it) | **Delete it** |
| D17 | Camera chrome (separate palette by design) | **Freeze; port only the two phone changes** (`#007AFF`→`primaryDark`; control scrim → `overlay` 90%) |
| D18 | Integration model — every phase to `master`? | **NO — long-lived `feat/uiparity`; `master` takes ONE merge at U8 exit; phase revert = `git revert -m 1`** (else the public `/demo` is mixed-palette for ~2 months) |
| D19 | U2 ∥ U3 share seven files | **Re-cut, don't serialise** — U3.3 builds `Banner`, the six cross-lane adoptions move to U6/U7 packages that already open those files; merge U2 before U3 |
| D20 | "No behaviour change" vs six packages that need some | **Carve it: component-local UI state, prop signatures, presentational composition IN where a named package specifies it; store bridge, engine, data flow, new subscriptions OUT** |

## After you rule

1. Orchestrator writes the rulings into matrix § OWNER RATIFICATION + plan §3 (via the warm writer), commits, opens the planning-bundle PR `docs/ui-parity-planning → master` (merge commit).
2. Cuts `feat/uiparity` (per D18) and briefs **U0** per plan §6.4 under the HANDOFF §2 spawn policy (`opus-implementer`, unnamed; lanes explicit Opus; Fable aggregator).
3. Your first device checkpoint comes after U1.
