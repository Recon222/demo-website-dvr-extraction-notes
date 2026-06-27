import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SplashScreen } from '@/components/demo/screens/SplashScreen'

describe('SplashScreen', () => {
  it('renders TAP TO SCAN when idle and calls onScan on tap', () => {
    const onScan = vi.fn()
    render(<SplashScreen authState="idle" onScan={onScan} />)
    expect(screen.getByText('TAP TO SCAN')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Biometric Lock'))
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
})
