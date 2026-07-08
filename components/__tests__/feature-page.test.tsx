import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { FeaturePage } from '@/components/feature-page'
import { featureHeadline, getAllFeatures, getFeatureBySlug } from '@/lib/content/features'

// Render next/link as a plain anchor in tests (no router context needed).
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const all = getAllFeatures()
const indexOf = (slug: string) => all.findIndex((f) => f.slug === slug)

function renderFeature(slug: string) {
  const index = indexOf(slug)
  return render(
    <FeaturePage
      feature={all[index]}
      index={index}
      prev={index > 0 ? all[index - 1] : undefined}
      next={index < all.length - 1 ? all[index + 1] : undefined}
    />,
  )
}

describe('FeaturePage (Case-File)', () => {
  it('renders the breadcrumb with the manifest link, gold item label, and class chip', () => {
    renderFeature('time-calibration')
    expect(screen.getByRole('link', { name: 'MANIFEST' })).toHaveAttribute('href', '/#features')
    expect(screen.getByText('ITEM 06 — TIME OFFSET')).toBeInTheDocument()
    expect(screen.getByText('MARQUEE')).toBeInTheDocument()
  })

  it('renders the display headline as the H1 (featureHeadline contract)', () => {
    renderFeature('secure-export')
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: featureHeadline(getFeatureBySlug('secure-export')!),
      }),
    ).toBeInTheDocument()
  })

  it('renders the intro with its bold phrase emphasized', () => {
    const { container } = renderFeature('import')
    expect(screen.getByText('That step is gone.')).toBeInTheDocument()
    expect(container.querySelector('strong')).not.toBeNull()
  })

  it('renders one tip card of the given variant', () => {
    renderFeature('time-calibration')
    expect(screen.getByText(/The old way: an external time site/)).toBeInTheDocument()
  })

  it('renders alternating phone rows with kicker, heading, chips, and REC labels', () => {
    renderFeature('time-calibration')
    expect(screen.getByText('01 — READ')).toBeInTheDocument()
    expect(screen.getByText("Read the DVR clock — don't retype it")).toBeInTheDocument()
    expect(screen.getByText('REC 01 — OCR CAPTURE')).toBeInTheDocument()
    expect(screen.getByText('VISION OCR')).toBeInTheDocument()
    expect(screen.getByText('REC 02 — NTP SYNC')).toBeInTheDocument()
  })

  it('renders a media-less row as the wide callout card (Cases row 3)', () => {
    renderFeature('cases-locations')
    expect(screen.getByText('03 — REPEAT VISITS')).toBeInTheDocument()
    expect(screen.getByText('Duplicate a repeat visit')).toBeInTheDocument()
    // callout rows have chips but no REC chip
    expect(screen.getByText('± SCOPES')).toBeInTheDocument()
    expect(screen.queryByText(/REC 03/)).not.toBeInTheDocument()
  })

  it('renders Security & Privacy as two accented trust cards with no tip card', () => {
    renderFeature('on-device')
    expect(screen.getByText('01 — IT STAYS ON THE PHONE')).toBeInTheDocument()
    expect(screen.getByText('Encrypted, local, biometric-locked')).toBeInTheDocument()
    expect(screen.getByText('Three things touch the network')).toBeInTheDocument()
    // no phone frames on this page (trust cards replace rows)
    expect(screen.queryByText(/REC 0/)).not.toBeInTheDocument()
  })

  it('renders the under-the-hood section with FIG label and caption, omitted for map', () => {
    renderFeature('time-calibration')
    expect(screen.getByText('FIG. 06-A')).toBeInTheDocument()
    expect(screen.getByText('The traceability chain, in plain language')).toBeInTheDocument()
    expect(
      screen.getByText(/The chain printed into every Time Offset Report/),
    ).toBeInTheDocument()
  })

  it('omits under-the-hood entirely for the map (no diagram in catalog)', () => {
    renderFeature('map')
    expect(screen.queryByText('UNDER THE HOOD')).not.toBeInTheDocument()
    expect(screen.queryByText(/FIG\./)).not.toBeInTheDocument()
  })

  it('renders the draft state for Notes: banner, hatched copy, and NO beta strip', () => {
    renderFeature('notes')
    expect(screen.getByText(/Copy pending — the Notes screens hold/)).toBeInTheDocument()
    expect(screen.getAllByText('DRAFT').length).toBeGreaterThan(0)
    expect(screen.getByText(/HEADING \+ STORY LAND HERE — what the wizard asks/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Join the TestFlight beta/ })).not.toBeInTheDocument()
  })

  it('renders prev/next cards with the dashed edges at 01 and 10', () => {
    renderFeature('cases-locations')
    expect(screen.getByText('START OF MANIFEST')).toBeInTheDocument()
    expect(screen.getByText(/NEXT · 02 IMPORT REQUEST/)).toBeInTheDocument()

    renderFeature('on-device')
    expect(screen.getByText('END OF MANIFEST')).toBeInTheDocument()
    expect(screen.getByText(/PREV · 09 ENCRYPTED EXPORT/)).toBeInTheDocument()
  })

  it('marks the draft neighbour with a DRAFT chip in its prev/next card', () => {
    renderFeature('import')
    const nextCard = screen.getByRole('link', { name: /03 NOTES WIZARD/ })
    expect(within(nextCard).getByText('DRAFT')).toBeInTheDocument()
  })

  it('renders the per-page beta strip with its line and CTA', () => {
    renderFeature('time-calibration')
    expect(screen.getByText('Want the receipt on your next scene?')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Join the TestFlight beta' })).toHaveAttribute(
      'href',
      '/beta',
    )
  })

  // ── Forward-looking variant guards (M-E review M1–M3): the catalog can't reach
  //    these branches today, so local fixtures exercise them directly. ──

  it('hatches a media-less row on a draft feature (no un-hatched scaffolding can ship)', () => {
    const notes = getFeatureBySlug('notes')!
    const withCallout = {
      ...notes,
      rows: [...notes.rows, { kicker: '03 — PENDING', heading: 'Callout pending', body: 'CALLOUT SCAFFOLDING TEXT' }],
    }
    render(<FeaturePage feature={withCallout} index={indexOf('notes')} />)
    // Rendered inside a hatched block, not the callout card (no icon tile / chips row).
    const body = screen.getByText('CALLOUT SCAFFOLDING TEXT')
    expect(body.className).toContain('border-dashed')
    expect(screen.queryByText('Callout pending')).not.toBeInTheDocument()
  })

  it('never renders a tip card on a trust-cards (centered) page, even if data adds one', () => {
    const security = getFeatureBySlug('on-device')!
    const withTip = { ...security, tip: { variant: 'cyan' as const, body: 'A tip that has no home here.' } }
    render(<FeaturePage feature={withTip} index={indexOf('on-device')} />)
    expect(screen.queryByText('A tip that has no home here.')).not.toBeInTheDocument()
  })

  it('never renders a beta strip on a draft page, even if data sets a line', () => {
    const notes = getFeatureBySlug('notes')!
    const withStrip = { ...notes, betaStripLine: 'Should never appear.' }
    render(<FeaturePage feature={withStrip} index={indexOf('notes')} />)
    expect(screen.queryByText('Should never appear.')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Join the TestFlight beta/ })).not.toBeInTheDocument()
  })
})
