import { describe, it, expect } from 'vitest'
import { toPublicUrl } from '@/lib/to-public-url'

// Shared helper used by every component that points at an asset under /public.
// It normalises author-friendly relative paths to root-absolute URLs while
// leaving already-absolute and remote URLs untouched.
describe('toPublicUrl', () => {
  it('prefixes a /public-relative path with a leading slash', () => {
    expect(toPublicUrl('demos/time-calibration/ocr.mp4')).toBe('/demos/time-calibration/ocr.mp4')
  })

  it('leaves an already-absolute path unchanged (no double slash)', () => {
    expect(toPublicUrl('/diagrams/import.svg')).toBe('/diagrams/import.svg')
  })

  it('leaves an https URL unchanged', () => {
    expect(toPublicUrl('https://cdn.example.com/x.mp4')).toBe('https://cdn.example.com/x.mp4')
  })

  it('leaves an http URL unchanged', () => {
    expect(toPublicUrl('http://cdn.example.com/x.mp4')).toBe('http://cdn.example.com/x.mp4')
  })
})
