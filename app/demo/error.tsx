'use client'

// Route-segment outer net for /demo (parity review R-5, matrix row 6 "App-wide").
// The in-frame DemoErrorBoundary covers the phone-screen subtree, but the bridge's
// own render — activeScreen()/activeModal() view-model derivation (toCaseCards,
// toMapData, selectDrawerItems, …) — executes in DemoExperience's frame, ABOVE that
// boundary. A throw there previously fell through to Next's unbranded client error
// page. This segment boundary is the branded net: reset() remounts the segment, and
// the P0.4 rehydration path (loadSnapshot) re-runs on mount, so the visitor's
// session survives recovery unless the snapshot itself is what throws.
//
// Deliberately chrome-free and outside the phone frame: like /demo itself (no
// marketing header/footer — see app/layout.tsx), and the demo feature barrel is
// untouched (this imports nothing from @/features/demo).

export default function DemoError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(255,71,87,0.3)] bg-[rgba(19,34,54,0.6)] p-8 text-center">
        <div className="mb-3 font-stmono text-[11px] tracking-[2px] text-faint">INTERACTIVE DEMO</div>
        <h1 className="mb-3 font-nacelle text-2xl font-semibold text-heading">Something went wrong</h1>
        <p className="mb-4 text-[14px] leading-relaxed text-body">
          The demo hit an unexpected error. Try again to reload it — this tab&apos;s session snapshot is
          restored if it&apos;s intact.
        </p>
        {error.message && (
          <div className="mb-6 break-words rounded-[10px] border border-[rgba(255,71,87,0.3)] bg-[rgba(255,71,87,0.06)] px-3 py-2 font-jbmono text-xs text-muted">
            {error.message}
          </div>
        )}
        <button
          type="button"
          autoFocus
          onClick={reset}
          className="w-full rounded-[10px] bg-gradient-to-b from-[#35A0D6] to-[#2580AD] px-4 py-3 text-[15px] font-semibold text-white hover:brightness-110"
        >
          Try again
        </button>
        {/* Escape hatch for a STATE-driven throw (review R-24): the boundary's own
            activation flushed the throwing state to storage as the newest snapshot, so
            reset() alone rebuilds it forever. Clearing the snapshot first guarantees an
            empty boot. Dynamic barrel import keeps the demo chunk out of this segment's
            initial JS (the /demo page loads the same chunk lazily — see index.ts note);
            if the chunk somehow can't load, fall back to a plain reset — no worse than
            "Try again". */}
        <button
          type="button"
          onClick={async () => {
            try {
              const { clearDemoSnapshot } = await import('@/features/demo')
              clearDemoSnapshot()
            } catch {
              // chunk load failed — degrade to the Try-again behavior
            }
            reset()
          }}
          className="mt-3 w-full rounded-[10px] border border-input bg-transparent px-4 py-3 text-[14px] font-semibold text-muted hover:text-heading"
        >
          Start fresh (clears this tab&apos;s demo session)
        </button>
      </div>
    </main>
  )
}
