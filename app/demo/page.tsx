'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Client-only island (the demo store/director run in the browser). useSearchParams needs Suspense.
const DemoExperience = dynamic(() => import('@/features/demo').then((m) => m.DemoExperience), {
  ssr: false,
})

export default function DemoPage() {
  return (
    <Suspense fallback={null}>
      <DemoExperience />
    </Suspense>
  )
}
