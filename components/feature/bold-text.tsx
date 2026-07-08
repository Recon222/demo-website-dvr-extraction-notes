import type { ReactNode } from 'react'

/**
 * The single renderer for the content model's `**bold**` markers (`Feature.intro`,
 * `FeatureTip.body`). One parser instead of per-call-site regex (M-A review, M2).
 * Default emphasis matches the design's intro treatment (heading color, 600);
 * tips pass their variant color instead.
 */
export function BoldText({
  text,
  boldClassName = 'font-semibold text-heading',
}: {
  text: string
  boldClassName?: string
}): ReactNode {
  const parts = text.split(/\*\*([^*]+)\*\*/g)
  if (parts.length === 1) {
    return text
  }
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          // eslint-disable-next-line react/no-array-index-key -- static split, order is identity
          <strong key={index} className={boldClassName}>
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
}
