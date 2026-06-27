import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TouchIndicator } from '@/components/demo/TouchIndicator'

describe('TouchIndicator', () => {
  it('renders a pulse for each active pulse prop', () => {
    render(
      <TouchIndicator
        pulses={[
          { id: 'a', x: 10, y: 20 },
          { id: 'b', x: 30, y: 40 },
        ]}
      />,
    )
    expect(document.querySelectorAll('[data-pulse]')).toHaveLength(2)
  })

  it('renders nothing when there are no pulses', () => {
    const { container } = render(<TouchIndicator pulses={[]} />)
    expect(container.firstChild).toBeNull()
  })
})
