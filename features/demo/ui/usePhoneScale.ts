import { useEffect, useState } from 'react'

/**
 * Port of the prototype's `applyScale`: fit the 404×812 device into the available viewport
 * height (minus a margin), capped at 1:1. Returns the scale; `PhoneFrame` applies the
 * transform with `transform-origin: top center`.
 */
export function usePhoneScale(frameHeight = 812, margin = 28): number {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const compute = () => {
      const avail = window.innerHeight - margin
      setScale(Math.min(1, avail / frameHeight))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [frameHeight, margin])

  return scale
}
