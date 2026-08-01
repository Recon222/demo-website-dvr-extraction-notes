import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SplashScreen, type AuthState } from '@/features/demo/ui/screens/SplashScreen'

const scanner = () => screen.getByRole('button', { name: 'Run the simulated biometric scan' })

describe('SplashScreen', () => {
  it('renders TAP TO SCAN when idle and calls onScan on tap', () => {
    const onScan = vi.fn()
    render(<SplashScreen authState="idle" onScan={onScan} />)
    expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()
    fireEvent.click(scanner())
    expect(onScan).toHaveBeenCalledOnce()
  })

  it('shows the scanning state', () => {
    render(<SplashScreen authState="scanning" onScan={vi.fn()} />)
    expect(screen.getByText('SCANNING')).toBeInTheDocument()
    expect(screen.queryByText('TAP TO SCAN')).toBeNull()
  })

  it('shows the authorized state', () => {
    render(<SplashScreen authState="authorized" onScan={vi.fn()} />)
    expect(screen.getByText('AUTHORIZED')).toBeInTheDocument()
    expect(screen.getByText('ACCESS GRANTED')).toBeInTheDocument()
  })

  describe('honesty (the demo cannot do biometrics)', () => {
    it.each<AuthState>(['idle', 'scanning', 'authorized'])('discloses the simulation in %s', (authState) => {
      render(<SplashScreen authState={authState} onScan={vi.fn()} />)
      expect(
        screen.getByText(/Simulated scan — a browser tab has no biometric sensor\./),
      ).toBeInTheDocument()
    })

    it('is readable: the disclosure clears WCAG AA over the boot background (R-6)', () => {
      // The honesty string must not be the least readable text on a screen full of decoration.
      // rgba(153,186,221,α) over #000314: α 0.55 → 3.59:1 (fails), 0.65 → 4.65, 0.70 → 5.27.
      render(<SplashScreen authState="idle" onScan={vi.fn()} />)
      const alpha = Number(
        /rgba\(\s*153,\s*186,\s*221,\s*([\d.]+)\s*\)/.exec(
          screen.getByTestId('boot-disclosure').style.color,
        )?.[1],
      )
      expect(alpha).toBeGreaterThanOrEqual(0.65)
    })

    it('never claims Face ID happened here — only that the phone uses it', () => {
      render(<SplashScreen authState="authorized" onScan={vi.fn()} />)
      const faceId = screen.getByText(/Face ID/)
      expect(faceId.textContent).toContain('On the phone this is Face ID')
    })
  })

  describe('accessibility (the boot gate must not lock anyone out)', () => {
    it('the tap target is a real button, so keyboard and AT can pass the gate', () => {
      const onScan = vi.fn()
      render(<SplashScreen authState="idle" onScan={onScan} />)
      const btn = scanner()
      expect(btn.tagName).toBe('BUTTON')
      // Native button semantics: Enter/Space fire click, which RTL models as a click.
      fireEvent.click(btn)
      expect(onScan).toHaveBeenCalledOnce()
    })

    it('stays mounted and aria-disabled once the scan starts (focus is not dropped mid-sequence)', () => {
      const onScan = vi.fn()
      render(<SplashScreen authState="scanning" onScan={onScan} />)
      const btn = scanner()
      expect(btn).toHaveAttribute('aria-disabled', 'true')
      expect(btn).not.toBeDisabled() // `disabled` would blur it — aria-disabled does not
      fireEvent.click(btn)
      expect(onScan).not.toHaveBeenCalled()
    })

    it('describes the button with the live status region rather than new copy', () => {
      render(<SplashScreen authState="scanning" onScan={vi.fn()} />)
      const described = scanner().getAttribute('aria-describedby')
      expect(described).toBeTruthy()
      const region = document.getElementById(described as string)
      expect(region).not.toBeNull()
      expect(region).toHaveAttribute('aria-live', 'polite')
      expect(region?.textContent).toContain('SCANNING')
    })
  })

  describe('reduced motion', () => {
    it('keeps every element but drops the flicker, the sweep line and the blinking dots', () => {
      const { container } = render(<SplashScreen authState="scanning" onScan={vi.fn()} reduceMotion />)
      expect(screen.getByText('SCANNING')).toBeInTheDocument()
      expect(container.innerHTML).not.toContain('flicker')
      expect(container.innerHTML).not.toContain('hudScan')
      expect(container.innerHTML).not.toContain('blinkDot')
    })

    it('runs them by default', () => {
      const { container } = render(<SplashScreen authState="scanning" onScan={vi.fn()} />)
      expect(container.innerHTML).toContain('flicker')
      expect(container.innerHTML).toContain('hudScan')
      expect(container.innerHTML).toContain('blinkDot')
    })
  })
})
