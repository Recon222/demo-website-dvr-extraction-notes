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
 * ## Why it is a MODULE and not two copies
 *
 * Two surfaces paint it: `ImportResultAccordion`'s per-location badge and `OcrCaptureScreen`'s
 * confidence badge. They held byte-identical literals, so a "re-derive it" ruling would have had
 * to find both, and the defence test would have had to re-type the values it guards — the
 * second-copy trap U7.1's probe P5 demonstrated. One owner, one pin.
 *
 * Values unchanged from the two sites this replaces: zero rendered bytes moved.
 */
export const SAMPLE_BADGE = {
  /** The label. */
  foreground: '#ffd07a',
  /** The fill, over whatever card the badge sits on. */
  background: 'rgba(255,200,90,0.12)',
  /** The hairline. Slightly stronger than the fill so the chip has an edge on a busy card. */
  border: 'rgba(255,200,90,0.3)',
} as const
