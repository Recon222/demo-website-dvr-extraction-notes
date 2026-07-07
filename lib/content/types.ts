/** Priority tier for build/sequencing (see docs/planning/02-app-feature-inventory.md). */
export type FeaturePriority = 'p0' | 'p1' | 'p2'

/**
 * Manifest class chip (Case-File design). Values are transcribed from the design
 * canvas: CORE = gold, FIELD = blue, TRUST = cyan, MARQUEE = the one flagship item
 * (06 Time Offset) — gold with a blinking dot and a tinted manifest row.
 */
export type FeatureClass = 'CORE' | 'FIELD' | 'TRUST' | 'MARQUEE'

/** The one tip card on a feature page: gold (bulb) or cyan (lock/pin) variant. */
export interface FeatureTip {
  variant: 'gold' | 'cyan'
  /** Tip copy. `**bold**` marks the emphasized phrase (accent-colored in the design). */
  body: string
}

/** One content row on a feature page: a screen-capture loop paired with pain→fix copy. */
export interface FeatureRow {
  heading: string
  body: string
  /**
   * Path (under /public) to the looping screen-capture demo for this row, e.g.
   * `demos/time-calibration/ocr.mp4`. Optional until the media is produced — the
   * page renders a graceful placeholder when absent. Rows without media render as
   * a wide callout card (e.g. Cases row 3) or trust cards (see `Feature.layout`).
   */
  media?: string
  /** Share Tech Mono blue eyebrow above the row heading, e.g. `01 — READ`. */
  kicker?: string
  /** JetBrains Mono tag chips under the copy, e.g. `['OCR', 'NTP', 'OFFSET']`. */
  chips?: readonly string[]
  /** `REC 0N — <LABEL>` chip on the bracket-framed phone. Only for rows with media. */
  recLabel?: string
  /** Icon-tile/kicker accent for trust-card rows (Security & Privacy only). */
  accent?: 'cyan' | 'gold'
}

/** The "under the hood" data-flow diagram for a feature page (produced separately). */
export interface FeatureDiagram {
  /** Path (under /public) to the diagram asset, e.g. `diagrams/time-calibration.svg`. */
  src: string
  caption: string
  /** Nacelle H2 beside the `FIG. NN-A` label, e.g. "One tidy tree per job". */
  heading?: string
}

/** A single feature, rendered as a manifest row, a nav tab, and a /features/[slug] page. */
export interface Feature {
  /** URL-safe identifier; also the route segment under /features. */
  slug: string
  /** Short button label for the manifest tab strip (kept concise so all fit). */
  navLabel: string
  /** Short label shown above the title. */
  eyebrow: string
  /**
   * Short title used in cards, prev/next, and the manifest ITEM column.
   * No trailing period — display contexts add their own punctuation.
   */
  title: string
  /**
   * Full display H1 for the feature page, WITH terminal punctuation, when it
   * differs from `title` (e.g. "Pin the site — and every camera on it.").
   * Fallback when absent: `${title}.`
   */
  headline?: string
  /** One-line "WHAT IT KILLS" statement (manifest table + grid cards). */
  painLine: string
  /**
   * Feature-page intro paragraph. `**bold**` marks the emphasized phrase
   * (rendered heading-colored/600 per the design). On draft features this is the
   * hatched-block explainer copy.
   */
  intro?: string
  /** Manifest class chip. */
  classLabel?: FeatureClass
  /** The one tip card on the page (absent on Security & Privacy — trust cards instead). */
  tip?: FeatureTip
  /** Ordered pain→fix content rows. */
  rows: readonly FeatureRow[]
  /** Rows render as side-by-side accented trust cards instead of phone rows (10 only). */
  layout?: 'trust-cards'
  /** Optional technical diagram + caption for the "under the hood" section. */
  diagram?: FeatureDiagram
  /** Nacelle line for the gold per-page beta strip. Absent on drafts (no strip). */
  betaStripLine?: string
  /** Build/priority tier. */
  priority: FeaturePriority
  /**
   * Marks unfinished/placeholder copy. A draft feature still renders and stays in the
   * nav (so it isn't forgotten), but is exempt from the "no placeholder copy" content
   * guard, shows the gold DRAFT banner, and renders its intro/row bodies as hatched
   * placeholder blocks. Drop the flag when real copy lands.
   *
   * Modelled as an opt-in `true` (not `boolean`): a feature is either a draft
   * (`draft: true`) or it isn't (field omitted). `draft: false` is not a meaningful
   * state, so the type rejects it.
   */
  draft?: true
  /** Copy for the gold DRAFT banner under the tab strip (draft features only). */
  draftNote?: string
}
