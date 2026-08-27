// Authored preview — ArrivalDepartureScreen. On-site visit arrival/departure pairs.
// Variant axis: recorded visits (filled) vs. the optional empty state.
import { ArrivalDepartureScreen } from 'open-pro-next'

/* Form customisation (Settings > Form Fields) can hide any wizard field; a screen asks this
   predicate per field id. Every preview shows the DEFAULT state — nothing hidden. */
const allFieldsVisible = () => true

function Phone({ children }: { children: React.ReactNode }) {
  return <div data-demo-root style={{ background: '#002853', width: 378, fontFamily: 'system-ui', overflow: 'hidden' }}>{children}</div>
}

export function Filled() {
  return (
    <Phone>
      <ArrivalDepartureScreen
        isFieldVisible={allFieldsVisible}
        visits={[
          { id: 'v1', arrival: '2026-01-14 08:15:00', departure: '2026-01-14 09:40:00' },
          { id: 'v2', arrival: '2026-01-16 13:05:00', departure: '2026-01-16 14:20:00' },
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

export function Empty() {
  return (
    <Phone>
      <ArrivalDepartureScreen
        isFieldVisible={allFieldsVisible}
        visits={[]}
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
