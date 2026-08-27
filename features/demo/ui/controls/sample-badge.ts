/**
 * SEAM(U7.3): the "Sample data" badge — decision **D12, the FREEZE-AND-DEFEND arm**.
 *
 * D12 splits the demo-only surfaces three ways, and this one is alone in the third group:
 * *"Freeze and defend: the 'Sample data' amber. It must stay **visually distinct from real
 * data** — that is a correctness constraint. Re-derive it only if A15's `warningLight`
 * would collide with it (it will not; they are a fill and a foreground of different families)."*
 *
 * ## Why it is a CONSTANT BLOCK and not a status token (A91's rule, applied here)
 *
 * This badge is not a severity. It is the demo's honesty machinery — the mark that says a value
 * came from a bundled sample rather than from the visitor's own data, the same family as
 * `FallbackMode` and `SAMPLE_TINT`. Routing it through `colors.warning*` would make it move
 * whenever the ported warning family moves, and the whole point of D12's third group is that it
 * MUST NOT: the day it composites into the same amber as a ported warning, a sample value and a
 * real warning become indistinguishable and the demo is quietly lying about its own provenance.
 *
 * So the three values below are frozen literals, and `ui/__tests__/palette-contrast.test.ts`
 * measures the separation rather than asserting it — see the `describe` that imports this.
 *
 * ## Why it is a MODULE — and the census, corrected (review W3/F51)
 *
 * This docblock previously said *"Two surfaces paint it… One owner, one pin."* **That was false
 * when it was written.** The trio below is spelled byte-identically at FIVE sites, and this
 * module owns two of them:
 *
 * | site | owner |
 * |---|---|
 * | `ImportResultAccordion`'s per-location badge | this module |
 * | `OcrCaptureScreen`'s confidence badge | this module |
 * | `MediaLibrarySheet.tsx`'s `sampleBadge` | ORPHAN (U7.2's import) |
 * | `MediaCaptureScreen.tsx`'s inline "Sample data" chip | ORPHAN (U7.2's import) |
 * | `AudioPreviewScreen.tsx`'s sample chip | ORPHAN (U7.2's import) |
 *
 * `MediaLibrarySheet`'s own comment — *"shared in appearance with the two capture screens'"* —
 * describes the duplication accurately and then re-types it, which is the shape that makes a
 * "re-derive it" ruling ship two different sample ambers in one session. The correct pattern is
 * one file away: `screens/import/terminal-palette.ts` migrated ALL of its copies.
 *
 * Values unchanged from the sites this replaces: zero rendered bytes moved.
 *
 * ## What actually defends the badge, stated honestly (review W3/F51)
 *
 * D12 predicts the sample amber and `warningLight` "will not collide" because "they are a fill
 * and a foreground of different families". Measured, the first half of that is not the reason:
 * at MATCHED alpha over the same card the badge's fill is only **ΔE 3.6–6.2** from `warning`,
 * `warningDark` and `warningLight`. They ARE one hue family.
 *
 * What separates them is ROLE, and it is large: this badge is a translucent 12% tint under an
 * AMBER label, while a ported `Banner severity="warning"` is the OPAQUE `warningLight` ground
 * under a near-white `warningOnLight` label. As rendered, that is ΔE 65 on the fill and a
 * different colour entirely on the text. The pins in `palette-contrast.test.ts` measure that
 * pair — plus a presence floor, because the first version of the guard was monotone in "how
 * little the badge paints" and scored a DELETED fill (77.62) higher than the shipped one (65.31).
 */
export const SAMPLE_BADGE = {
  /** The label. */
  foreground: '#ffd07a',
  /** The fill, over whatever card the badge sits on. */
  background: 'rgba(255,200,90,0.12)',
  /** The hairline. Slightly stronger than the fill so the chip has an edge on a busy card. */
  border: 'rgba(255,200,90,0.3)',
} as const
