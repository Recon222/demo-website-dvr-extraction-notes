// Authored preview — NotesScreen. Per-section auto-generated case notes: each paragraph IS the
// editor (tap to edit, commit on blur), with "Reset to auto-generated" per section, a free-text
// tail, and Copy all. Variant axis = the section states the screen branches on.
//
// The `notes: string` prop this preview was authored against in v1 is GONE — the screen now
// takes `sections` (the per-section view model), `freeText` and `copyAllText`, plus six commit
// callbacks. Section ids and labels are the registry's, verbatim
// (engine/logic/notes/section-registry.ts:24-71), in its display order.
import { NotesScreen } from 'open-pro-next'

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

const noop = () => {}
const callbacks = {
  onCommitSection: noop,
  onCommitAddendum: noop,
  onResetSection: noop,
  onScrapAll: noop,
  onRestoreAll: noop,
  onCommitFreeText: noop,
  onNext: noop,
  onBack: noop,
  onMenu: noop,
}

const ADDRESS = `Attended 1450 Dundas St E, Mississauga (Northgate Convenience) on 2026-01-14.
Arrived 08:15 hrs, departed 09:40 hrs.`

const TIME_OFFSET = `DVR system time verified against NTP. Recorder running 00:04:12 FAST of
actual time. All ranges below are stated in ACTUAL (corrected) time.`

const SCOPES = `2026-01-12 22:00:00 -> 2026-01-13 02:30:00 (Ch1, Ch3, Ch4)
2026-01-13 07:15:00 -> 2026-01-13 08:00:00 (Ch1)`

const RETENTION = 'Hikvision DS-7208HQHI-K1, 8-channel. Approximately 21 days of retention.'

const EXPORT = 'Footage exported to USB and sealed in evidence bag PR-EV-33418.'

/* Every state the section list branches on, in registry order:
   - address     manually rewritten (`manuallyEdited`) — the reset affordance appears
   - timeOffset  auto-generated and current
   - scopes      STALE: the stored text no longer matches `freshContent`
   - retention   auto-generated with a `userAddendum` appended
   - cameras     empty — the section is registered but its formatter is disconnected (PR-86)
   - export      auto-generated and current
   - timeOnScene empty */
const SECTIONS = [
  { id: 'address' as const, label: 'address & visits', content: ADDRESS, manuallyEdited: true, stale: false, freshContent: ADDRESS },
  { id: 'timeOffset' as const, label: 'time offset', content: TIME_OFFSET, manuallyEdited: false, stale: false, freshContent: TIME_OFFSET },
  {
    id: 'scopes' as const,
    label: 'recovered footage',
    content: SCOPES,
    manuallyEdited: false,
    stale: true,
    freshContent: `${SCOPES}\n2026-01-13 19:40:00 -> 2026-01-13 20:05:00 (Ch3)`,
  },
  {
    id: 'retention' as const,
    label: 'dvr retention',
    content: RETENTION,
    userAddendum: 'Owner confirmed the unit has never been power-cycled since installation.',
    manuallyEdited: false,
    stale: false,
    freshContent: RETENTION,
  },
  { id: 'cameras' as const, label: 'cameras', content: '', manuallyEdited: false, stale: false, freshContent: '' },
  { id: 'export' as const, label: 'export', content: EXPORT, manuallyEdited: false, stale: false, freshContent: EXPORT },
  { id: 'timeOnScene' as const, label: 'time on scene', content: '', manuallyEdited: false, stale: false, freshContent: '' },
]

const FREE_TEXT =
  'Continuity maintained; no gaps observed in the recorded timeline for the requested period.'

const COPY_ALL = [ADDRESS, TIME_OFFSET, SCOPES, RETENTION, EXPORT, FREE_TEXT].join('\n\n')

export function Generated() {
  return (
    <Phone>
      <NotesScreen sections={SECTIONS} freeText={FREE_TEXT} copyAllText={COPY_ALL} {...callbacks} />
    </Phone>
  )
}

export function Empty() {
  return (
    <Phone>
      <NotesScreen
        sections={SECTIONS.map((s) => ({ ...s, content: '', userAddendum: undefined, stale: false, freshContent: '' }))}
        freeText=""
        copyAllText=""
        {...callbacks}
      />
    </Phone>
  )
}
