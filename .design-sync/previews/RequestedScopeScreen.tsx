// Authored preview — RequestedScopeScreen. Requested time ranges + cameras.
// Variant axis: multiple scopes (Real vs DVR time toggle, Remove shown) vs. a single scope.
import { RequestedScopeScreen } from 'open-pro-next'

/* Form customisation (Settings > Form Fields) can hide any wizard field; a screen asks this
   predicate per field id. Every preview shows the DEFAULT state — nothing hidden. */
const allFieldsVisible = () => true

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

export function Filled() {
  return (
    <Phone>
      <RequestedScopeScreen
        isFieldVisible={allFieldsVisible}
        scopes={[
          { id: 's1', startDateTime: '2026-01-14 08:00:00', endDateTime: '2026-01-14 09:30:00', isActualTime: true, cameras: '3, 4, 7' },
          { id: 's2', startDateTime: '2026-01-09 22:10:00', endDateTime: '2026-01-09 23:05:00', isActualTime: false, cameras: '1, 9' },
        ]}
        onChange={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}

export function Single() {
  return (
    <Phone>
      <RequestedScopeScreen
        isFieldVisible={allFieldsVisible}
        scopes={[
          { id: 's1', startDateTime: '2026-01-14 08:00:00', endDateTime: '2026-01-14 09:30:00', isActualTime: true, cameras: '3, 4, 7' },
        ]}
        onChange={() => {}}
        onAdd={() => {}}
        onRemove={() => {}}
        onNext={() => {}}
        onBack={() => {}}
        onMenu={() => {}}
      />
    </Phone>
  )
}
