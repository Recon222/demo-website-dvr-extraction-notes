'use client'

import dynamic from 'next/dynamic'

// Client-only island (the demo store runs in the browser). No Suspense needed —
// the demo reads no URL state (the guided tour's ?mode/?step left with it).
const DemoExperience = dynamic(() => import('@/features/demo').then((m) => m.DemoExperience), {
  ssr: false,
})

export default function DemoPage() {
  return <DemoExperience />
}
