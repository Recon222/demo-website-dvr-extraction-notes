import { vi } from 'vitest'
import type { ChapterNarration } from '@/features/demo/engine/types'
import type { StoryRailProps } from '@/features/demo/ui/StoryRail'

/** Default narration fixture (the splash chapter), overridable. */
export function makeNarration(o: Partial<ChapterNarration> = {}): ChapterNarration {
  return {
    eyebrow: 'Secure entry',
    title: 'Biometric lock',
    paras: ['Every session starts behind Face ID.'],
    bullets: ['Face ID gate', 'Guards export later'],
    tip: 'Tap the scanner.',
    ...o,
  }
}

/** Default StoryRail props with vi.fn() callbacks, overridable. */
export function storyRailProps(o: Partial<StoryRailProps> = {}): StoryRailProps {
  return {
    narration: makeNarration(),
    mode: 'guided',
    dots: [
      { id: 'splash', label: 'Splash' },
      { id: 'dashboard', label: 'Dashboard' },
    ],
    activeDot: 'splash',
    stepCaption: 'Step 1 of 13',
    canPrev: false,
    nextLabel: 'Start the tour',
    onNext: vi.fn(),
    onPrev: vi.fn(),
    onJump: vi.fn(),
    onSetMode: vi.fn(),
    ...o,
  }
}
