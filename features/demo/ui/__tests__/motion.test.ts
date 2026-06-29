import { describe, it, expect } from 'vitest'
import { slideDirection } from '@/features/demo/ui/motion'

describe('slideDirection', () => {
  it('is forward when advancing in tour order', () => {
    expect(slideDirection('cases', 'submission')).toBe('forward')
    expect(slideDirection('splash', 'dashboard')).toBe('forward')
    expect(slideDirection('submission', 'completion')).toBe('forward')
  })

  it('is back when retreating in tour order', () => {
    expect(slideDirection('submission', 'cases')).toBe('back')
    expect(slideDirection('dashboard', 'splash')).toBe('back')
  })

  it('is none for the same view (no move)', () => {
    expect(slideDirection('cases', 'cases')).toBe('none')
  })

  it('is none (fade) when either view is a launchable outside the tour order', () => {
    expect(slideDirection('cases', 'ocr')).toBe('none')
    expect(slideDirection('ocr', 'cases')).toBe('none')
    expect(slideDirection('submission', 'mediaCapture')).toBe('none')
  })
})
