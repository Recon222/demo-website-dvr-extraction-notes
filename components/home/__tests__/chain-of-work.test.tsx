import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChainOfWork } from '@/components/home/chain-of-work'

describe('ChainOfWork (Case-File)', () => {
  it('anchors the #how-it-works section with its heading', () => {
    const { container } = render(<ChainOfWork />)
    expect(container.querySelector('#how-it-works')).not.toBeNull()
    expect(
      screen.getByRole('heading', { level: 2, name: 'From request to court-ready report' }),
    ).toBeInTheDocument()
  })

  it('renders the four steps in order', () => {
    render(<ChainOfWork />)
    const titles = [
      'Import the request',
      'Calibrate the clock',
      'Capture by location',
      'Hand off',
    ]
    titles.forEach((title, index) => {
      expect(screen.getByText(`STEP ${String(index + 1).padStart(2, '0')}`)).toBeInTheDocument()
      expect(screen.getByText(title)).toBeInTheDocument()
    })
  })

  it('renders each step’s mono tag chips', () => {
    render(<ChainOfWork />)
    for (const chip of ['APPLE AI', 'OFFSET', 'GPS', 'AES-256']) {
      expect(screen.getByText(chip)).toBeInTheDocument()
    }
  })
})
