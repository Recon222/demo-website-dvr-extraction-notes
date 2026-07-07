/**
 * Central site metadata: product name, SEO defaults, and primary navigation.
 *
 * Open decisions (see docs/planning/07-open-questions-and-decisions.md):
 *  - `tagline` is a first-draft placeholder pending the chosen one-liner (Q6).
 *  - `url` is a placeholder pending the real domain (Q3).
 *  - `contactEmail` must be confirmed (Q2): the privacy policy uses
 *    fvadd.dev@gmail.com while the account on file is kcfva.dev@gmail.com.
 */
export const siteConfig = {
  name: 'DVR Extraction Notes',
  // The chosen one-liner (doc 07 Q6 — resolved by the Case-File design's hero H1).
  tagline: 'The whole extraction, documented before you leave the scene.',
  description:
    'DVR Extraction Notes is a CCTV/DVR evidence recovery documentation app for iOS, built by a practitioner with 15 years and 1,500+ extractions to remove the busywork — from request to court-ready report.',
  url: 'https://example.com', // TODO(doc 07 Q3): real domain
  // TODO(doc 07 Q2): confirm the canonical public address — the app policy lists
  // fvadd.dev@gmail.com; the design canvas shows a contact@fva.dev placeholder.
  contactEmail: 'kcfva.dev@gmail.com',
  /** The four header links (Case-File design). The beta link is `cta`, not nav. */
  nav: [
    { label: 'The job', href: '/#how-it-works' },
    { label: 'Features', href: '/#features' },
    { label: 'Live demo', href: '/demo' },
    { label: 'Privacy', href: '/privacy' },
  ],
  /** The gold recruiting CTA — rendered as a button, kept out of the link list. */
  cta: { label: 'Join the beta', href: '/beta' },
  /**
   * Beta phase switch (architecture doc §3): null → Phase A email intake;
   * a TestFlight public join URL → Phase B (the big gold TestFlight button).
   * Flipping A→B is setting one env var, not a rebuild of the page.
   */
  testflightUrl: process.env.NEXT_PUBLIC_TESTFLIGHT_URL ?? null,
} as const
