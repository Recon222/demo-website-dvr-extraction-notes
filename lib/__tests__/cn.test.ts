import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/cn'

// `cn` is the project-wide className combiner: clsx semantics (conditional
// objects/arrays, falsy filtering) plus tailwind-merge conflict resolution so the
// last Tailwind utility in a conflict group wins. Used everywhere components need
// conditional or override-able classes.
describe('cn', () => {
  it('joins multiple class names with a space', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b')
  })

  it('supports clsx object and array syntax', () => {
    expect(cn('base', { active: true, hidden: false }, ['x', 'y'])).toBe('base active x y')
  })

  it('merges conflicting Tailwind utilities so the last one wins', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('returns an empty string when called with no arguments', () => {
    expect(cn()).toBe('')
  })
})
