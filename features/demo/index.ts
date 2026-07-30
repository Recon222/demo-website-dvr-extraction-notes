// Public surface of the demo UI — the bridge, plus the one session control the /demo
// route error net needs (every screen stays internal). app/demo/error.tsx loads
// clearDemoSnapshot via dynamic import so the error segment's initial JS stays free
// of the demo chunk (review R-24).
export { DemoExperience } from '@/features/demo/ui/DemoExperience'
export { clearDemoSnapshot } from '@/features/demo/ui/clear-demo-snapshot'
