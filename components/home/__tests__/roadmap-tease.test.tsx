import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RoadmapTease } from '@/components/home/roadmap-tease'

describe('RoadmapTease (Case-File)', () => {
  it('renders the sealed heading with the no-promises meta', () => {
    render(<RoadmapTease />)
    expect(screen.getByText('SEALED — OPENS AFTER THE BETA')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Where this is headed' }),
    ).toBeInTheDocument()
    expect(screen.getByText('NO DATES · NO PROMISES')).toBeInTheDocument()
  })

  it('renders the three sealed cards, each tagged NOT IN BETA', () => {
    render(<RoadmapTease />)
    for (const title of ['Investigator mode', 'Live desk view', 'Will-say statements']) {
      expect(screen.getByText(title)).toBeInTheDocument()
    }
    expect(screen.getAllByText('ROADMAP · NOT IN BETA')).toHaveLength(3)
  })

  it('uses muted styling — no gold accents in the roadmap', () => {
    const { container } = render(<RoadmapTease />)
    // Cover every form gold takes in this codebase: the token utilities, the raw
    // hex, and the rgba(255,217,61,…) form (which beta-cta legitimately uses).
    expect(container.innerHTML).not.toMatch(/gold|#ffd93d|255,\s*217,\s*61/i)
  })
})
