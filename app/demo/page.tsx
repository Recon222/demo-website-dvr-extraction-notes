'use client'

import dynamic from 'next/dynamic'

// Client-only island (the demo store runs in the browser). No Suspense needed —
// the demo reads no URL state (the guided tour's ?mode/?step left with it).
const DemoExperience = dynamic(() => import('@/features/demo').then((m) => m.DemoExperience), {
  ssr: false,
})

export default function DemoPage() {
  // `boot` lives here, not in the bridge: the phone holds `showSplash` in its ROOT LAYOUT
  // (`app/_layout.tsx:137`), above every provider, and this route is that layer (P8.1, D7).
  return <DemoExperience boot />
}
