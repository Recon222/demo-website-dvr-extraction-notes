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

/** Default StoryRail props, overridable. (The rail is single-mode: narration only —
 *  the tour controls were removed with the guided tour.) */
export function storyRailProps(o: Partial<StoryRailProps> = {}): StoryRailProps {
  return {
    narration: makeNarration(),
    ...o,
  }
}
