// Authored preview — Calendar. Pure presentational month grid; variant axis = selection.
// July 2026, today = the 16th (Carolina-blue ring), one day filled when selected.
import { Calendar } from 'open-pro-next'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ background: '#0d1b2a', width: 360, padding: 20, fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

const TODAY = { y: 2026, mo: 7, d: 16 }

export function Selected() {
  return (
    <Frame>
      <Calendar
        viewYear={2026}
        viewMonth={7}
        selected={{ y: 2026, mo: 7, d: 14 }}
        today={TODAY}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onSelectDay={() => {}}
      />
    </Frame>
  )
}

export function NoSelection() {
  return (
    <Frame>
      <Calendar
        viewYear={2026}
        viewMonth={7}
        selected={null}
        today={TODAY}
        onPrevMonth={() => {}}
        onNextMonth={() => {}}
        onSelectDay={() => {}}
      />
    </Frame>
  )
}
