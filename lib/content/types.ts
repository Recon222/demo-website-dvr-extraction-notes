/** Priority tier for build/sequencing (see docs/planning/02-app-feature-inventory.md). */
export type FeaturePriority = 'p0' | 'p1' | 'p2'

/** One content row on a feature page: a screen-capture loop paired with pain→fix copy. */
export interface FeatureRow {
  heading: string
  body: string
  /**
   * Path (under /public) to the looping screen-capture demo for this row, e.g.
   * `demos/time-calibration/ocr.mp4`. Optional until the media is produced — the
   * page renders a graceful placeholder when absent.
   */
  media?: string
}

/** The "under the hood" data-flow diagram for a feature page (produced separately). */
export interface FeatureDiagram {
  /** Path (under /public) to the diagram asset, e.g. `diagrams/time-calibration.svg`. */
  src: string
  caption: string
}

/** A single feature, rendered both as a homepage grid card and a /features/[slug] page. */
export interface Feature {
  /** URL-safe identifier; also the route segment under /features. */
  slug: string
  /** Short button label for the second-row feature nav strip (kept concise so all fit). */
  navLabel: string
  /** Short label shown above the title. */
  eyebrow: string
  /** Page/card title. */
  title: string
  /** One-line statement of the pain this feature removes. */
  painLine: string
  /** Ordered pain→fix content rows. */
  rows: FeatureRow[]
  /** Optional technical diagram + caption for the "under the hood" section. */
  diagram?: FeatureDiagram
  /** Build/priority tier. */
  priority: FeaturePriority
  /** Display order within the nav, grid, and prev/next sequence. */
  order: number
  /**
   * Marks unfinished/placeholder copy. A draft feature still renders and stays in the
   * nav (so it isn't forgotten), but is exempt from the "no placeholder copy" content
   * guard and shows a visible "Draft" badge on its page. Drop the flag when real copy lands.
   *
   * Modelled as an opt-in `true` (not `boolean`): a feature is either a draft
   * (`draft: true`) or it isn't (field omitted). `draft: false` is not a meaningful
   * state, so the type rejects it.
   */
  draft?: true
}
