'use client'

export interface RailNavProps {
  canPrev: boolean
  nextLabel: string
  onPrev(): void
  onNext(): void
}

/** The guided-tour Back / Next buttons (rail footer). Back is dimmed when there's no prior. */
export function RailNav({ canPrev, nextLabel, onPrev, onNext }: RailNavProps) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      {canPrev ? (
        <button
          type="button"
          onClick={onPrev}
          style={{
            padding: '13px 22px',
            borderRadius: 10,
            border: '1px solid #2a4a6f',
            background: 'transparent',
            color: '#99badd',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back
        </button>
      ) : (
        <div
          aria-disabled
          style={{
            padding: '13px 22px',
            borderRadius: 10,
            border: '1px solid #16273c',
            color: '#46607e',
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          Back
        </div>
      )}
      <button
        type="button"
        onClick={onNext}
        style={{
          padding: '13px 26px',
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(180deg,#35A0D6,#2580AD)',
          color: '#fff',
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(37,128,173,0.4)',
        }}
      >
        {nextLabel}
      </button>
    </div>
  )
}
