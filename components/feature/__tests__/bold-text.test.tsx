import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoldText } from '@/components/feature/bold-text'

// The shared renderer for the content model's `**bold**` markers (intro / tip.body)
// — the single parser the M-A review (M2) required instead of per-call-site regex.
describe('BoldText', () => {
  it('renders the marked phrase as <strong> and the rest as plain text', () => {
    render(
      <p>
        <BoldText text="That step is **gone.** Import the document." />
      </p>,
    )
    const strong = screen.getByText('gone.')
    expect(strong.tagName).toBe('STRONG')
    expect(screen.getByText(/That step is/)).toBeInTheDocument()
    expect(screen.getByText(/Import the document\./)).toBeInTheDocument()
  })

  it('renders text without markers unchanged (no strong element)', () => {
    const { container } = render(<BoldText text="No emphasis here." />)
    expect(container.querySelector('strong')).toBeNull()
    expect(screen.getByText('No emphasis here.')).toBeInTheDocument()
  })

  it('supports multiple marked segments', () => {
    const { container } = render(<BoldText text="**a** then **b**" />)
    expect(container.querySelectorAll('strong')).toHaveLength(2)
  })

  it('applies a custom bold class (tips color their emphasis by variant)', () => {
    render(<BoldText text="never **stored** by us" boldClassName="text-cyan" />)
    expect(screen.getByText('stored')).toHaveClass('text-cyan')
  })

  it('renders a malformed (unclosed) marker literally rather than eating copy', () => {
    const { container } = render(<BoldText text="an **unclosed marker stays visible" />)
    expect(container.querySelector('strong')).toBeNull()
    expect(container.textContent).toBe('an **unclosed marker stays visible')
  })
})
