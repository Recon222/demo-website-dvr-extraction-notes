import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { UtilityStrip } from '@/components/ui/utility-strip'

describe('UtilityStrip (Case-File)', () => {
  it('renders the FVA identity and the recruiting status', () => {
    render(<UtilityStrip />)
    expect(screen.getByText('FVA DEVELOPMENT · FIELD TOOLS')).toBeInTheDocument()
    expect(screen.getByText('IOS BETA — TESTFLIGHT · RECRUITING')).toBeInTheDocument()
  })
})
