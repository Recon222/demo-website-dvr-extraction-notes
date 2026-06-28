import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { PhoneFrame } from '@/features/demo/ui/PhoneFrame'

describe('PhoneFrame', () => {
  it('renders its children inside the frame', () => {
    render(
      <PhoneFrame>
        <div>SCREEN CONTENT</div>
      </PhoneFrame>,
    )
    expect(screen.getByText('SCREEN CONTENT')).toBeInTheDocument()
    expect(document.querySelector('[data-phone="frame"]')).toBeTruthy()
  })

  it('applies a scale transform sized to the viewport height', () => {
    window.innerHeight = 600 // 600 − 28 = 572 → 572/812 ≈ 0.704
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const frame = document.querySelector('[data-phone="frame"]') as HTMLElement
    expect(frame.style.transform).toContain('scale(0.70')
    expect(frame.style.transformOrigin).toBe('top center')
  })

  it('locks pointer-events on the screen subtree when not interactive (guided)', () => {
    render(
      <PhoneFrame interactive={false}>
        <div>x</div>
      </PhoneFrame>,
    )
    const screenEl = document.querySelector('[data-phone-screen]') as HTMLElement
    expect(screenEl.style.pointerEvents).toBe('none')
  })

  it('caps the scale at 1:1 on a tall viewport', () => {
    window.innerHeight = 2000
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    expect((document.querySelector('[data-phone="frame"]') as HTMLElement).style.transform).toBe('scale(1)')
  })

  it('rescales on window resize', () => {
    window.innerHeight = 2000
    render(
      <PhoneFrame>
        <div>x</div>
      </PhoneFrame>,
    )
    const frame = document.querySelector('[data-phone="frame"]') as HTMLElement
    expect(frame.style.transform).toBe('scale(1)')
    act(() => {
      window.innerHeight = 600
      window.dispatchEvent(new Event('resize'))
    })
    expect(frame.style.transform).toContain('scale(0.70')
  })
})
