// Authored preview — CasesScreen. Expandable case list w/ per-case Import / Add Location.
// Variant axis = collapsed vs expanded; plus an empty state.
import { CasesScreen } from 'open-pro-next'

const draft = { label: 'Draft', color: '#ffd93d', bg: 'rgba(255,217,61,0.12)', border: 'rgba(255,217,61,0.3)' }
const complete = { label: 'Complete', color: '#10d177', bg: 'rgba(16,209,119,0.12)', border: 'rgba(16,209,119,0.3)' }
const archived = { label: 'Archived', color: '#7a9fc4', bg: 'rgba(122,159,196,0.12)', border: 'rgba(122,159,196,0.3)' }

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
const callbacks = { onToggle: noop, onNewCase: noop, onOpenLocation: noop, onAddLocation: noop, onImport: noop }

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#0d1b2a', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
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
