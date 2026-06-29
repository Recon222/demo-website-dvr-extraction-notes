import { describe, it, expect, vi, afterEach } from 'vitest'
import { slideDirection } from '@/features/demo/ui/motion'
import type { ChapterId } from '@/features/demo/engine/types'

afterEach(() => vi.unstubAllEnvs())

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

  it('warns in development for a view in neither TOUR_CHAPTERS nor LAUNCHABLE (missing registration)', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    slideDirection('cases', 'unregisteredScreen' as ChapterId)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does not warn for a legitimate launchable, nor in the test env', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv('NODE_ENV', 'development')
    slideDirection('cases', 'ocr') // launchable — expected to fade, not a misconfig
    vi.unstubAllEnvs()
    slideDirection('cases', 'unregisteredScreen' as ChapterId) // unknown but NODE_ENV=test → silent
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
