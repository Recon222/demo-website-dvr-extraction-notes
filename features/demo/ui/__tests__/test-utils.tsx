import { vi } from 'vitest'
import type { ChapterNarration } from '@/features/demo/engine/types'
import type { ExploreStatus } from '@/features/demo/engine/store/selectors'
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

/** Two-row exploration-manifest fixture. */
export function makeExplore(): ExploreStatus[] {
  return [
    { id: 'dashboard', number: '01', label: 'Dashboard', visited: false, active: false, jumpTo: 'dashboard' },
    { id: 'cases', number: '02', label: 'Cases & Locations', visited: true, active: true, jumpTo: 'cases' },
  ]
}

/** Default StoryRail props, overridable: narration + the exploration manifest. */
export function storyRailProps(o: Partial<StoryRailProps> = {}): StoryRailProps {
  return {
    narration: makeNarration(),
    explore: makeExplore(),
    onJump: vi.fn(),
    ...o,
  }
}
