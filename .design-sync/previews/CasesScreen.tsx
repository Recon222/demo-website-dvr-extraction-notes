// Authored preview — CasesScreen. Expandable case list w/ per-case Import / Add Location.
// Variant axis = collapsed vs expanded; plus an empty state.
import { CasesScreen } from 'open-pro-next'

/* `StatusTheme` is `{ label } & SeverityTone` (`screens/screenData.ts:18-20`), and `SeverityTone`
   is `{ background, borderColor, color, accent }` (`tokens/status.ts:98-110`). This preview
   carried the PRE-U3.1 shape (`color`/`bg`/`border`) — three renamed keys and one missing key,
   invisible until W4/F82 put the previews in a tsc program.

   Values are `severityTone()`'s own composition (`tokens/status.ts:120-124`) resolved for the
   consumed dark scheme, cited per token; `archived` is `neutralTone()` (`:138-142`), whose
   background is `withAlpha(textSecondary, NEUTRAL_TINT_ALPHA)` — `#99badd` at 0.15 (`:129`).
   Literals, because previews resolve `'open-pro-next'` and it exports only pinned components. */
const draft = {
  label: 'Active', // `caseStatusTheme`'s DRAFT->"Active" rename (screenData.ts:36)
  background: '#7d5f10', // colors.warningLight   — palette.ts:130
  borderColor: '#ffd93d', // colors.warning       — palette.ts:129
  color: '#f0f4f8', // colors.warningOnLight      — palette.ts:137
  accent: '#ffc62b', // colors.warningAccent      — palette.ts:135 (SEVERITY_ACCENT.warning)
}
const complete = {
  label: 'Complete',
  background: '#0f6b42', // colors.successLight   — palette.ts:126
  borderColor: '#10d177', // colors.success       — palette.ts:125
  color: '#f0f4f8', // colors.successOnLight      — palette.ts:138
  accent: '#0faa5e', // colors.successDark        — palette.ts:127 (SEVERITY_ACCENT.success)
}
const archived = {
  label: 'Archived',
  background: 'rgba(153, 186, 221, 0.15)', // withAlpha(colors.textSecondary, 0.15) — status.ts:139
  borderColor: '#1c4e84', // colors.border        — palette.ts:117
  color: '#f0f4f8', // colors.text                — palette.ts:104
  accent: '#99badd', // colors.textSecondary      — palette.ts:106
}

const CASES = [
  {
    id: 'case-1',
    caseNumber: 'PR-2026-0114-2287',
    displayName: 'Northgate Convenience B&E',
    status: draft,
    personnel: [
      { role: 'OIC', name: 'Det. M. Okafor', badge: '4471' },
      { role: 'VC', name: 'Cst. R. Patel', badge: '5120' },
    ],
    createdLabel: 'Jan 14, 2026',
    locations: [
      { id: 'loc-1a', locationName: 'Front entrance', address: '1450 Dundas St E, Mississauga', status: draft },
      { id: 'loc-1b', locationName: 'Rear stockroom', address: '1444 Dundas St E, Mississauga', status: draft },
    ],
    locationCountLabel: '2 locations',
  },
  {
    id: 'case-2',
    caseNumber: 'PR-2026-0108-1904',
    displayName: 'Meadowvale Plaza robbery',
    status: complete,
    personnel: [{ role: 'OIC', name: 'Det. S. Chen', badge: '3902' }],
    createdLabel: 'Jan 8, 2026',
    locations: [{ id: 'loc-2a', locationName: 'Town Centre — Level 2', address: '6677 Meadowvale Town Centre Cir, Mississauga', status: draft }],
    locationCountLabel: '1 location',
  },
  {
    id: 'case-3',
    caseNumber: 'PR-2025-1229-8815',
    displayName: 'Hurontario transit assault',
    status: archived,
    personnel: [{ role: 'OIC', name: 'Sgt. K. Boyd', badge: '2244' }],
    createdLabel: 'Dec 29, 2025',
    locations: [],
    locationCountLabel: '0 locations',
  },
]

const noop = () => {}
const callbacks = {
  onToggle: noop,
  onNewCase: noop,
  onOpenLocation: noop,
  onAddLocation: noop,
  onImport: noop,
  // Added to `CasesScreenProps` after this preview was authored; required, and missing here
  // until W4/F82 put the previews in a tsc program.
  onDeleteCase: noop,
  onDeleteLocation: noop,
  onLocationActions: noop,
  onSettings: noop,
}

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

export function Collapsed() {
  return (
    <Phone>
      <CasesScreen cases={CASES} expandedId={null} {...callbacks} />
    </Phone>
  )
}

export function Expanded() {
  return (
    <Phone>
      <CasesScreen cases={CASES} expandedId="case-1" {...callbacks} />
    </Phone>
  )
}

export function Empty() {
  return (
    <Phone>
      <CasesScreen cases={[]} expandedId={null} {...callbacks} />
    </Phone>
  )
}
