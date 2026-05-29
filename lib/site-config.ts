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
  tagline: 'CCTV recovery documentation, done right the first time.', // TODO(doc 07 Q6)
  description:
    'DVR Extraction Notes is a CCTV/DVR evidence recovery documentation app for iOS, built by a practitioner with 15 years and 1,500+ extractions to remove the busywork — from request to court-ready report.',
  url: 'https://example.com', // TODO(doc 07 Q3): real domain
  contactEmail: 'kcfva.dev@gmail.com', // placeholder per Kris; confirm vs fvadd.dev@gmail.com before launch (doc 07 Q2)
  nav: [
    { label: 'Features', href: '/#features' },
    { label: 'How it works', href: '/#how-it-works' },
    { label: 'Join the beta', href: '/beta' },
  ],
} as const
