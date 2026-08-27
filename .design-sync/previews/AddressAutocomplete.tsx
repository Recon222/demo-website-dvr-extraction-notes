// Authored preview — AddressAutocomplete. With no Mapbox token it degrades to a plain
// styled text input (the correct static render); we author the filled + placeholder states.
import { AddressAutocomplete } from 'open-pro-next'

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-demo-root
      style={{ background: '#002853', width: 360, padding: 20, fontFamily: 'system-ui' }}
    >
      {children}
    </div>
  )
}

export function Filled() {
  return (
    <Frame>
      <AddressAutocomplete
        label="Location Address"
        value="1450 Dundas St E, Mississauga"
        placeholder="Start typing an address…"
        onChange={() => {}}
        onPick={() => {}}
      />
    </Frame>
  )
}

export function Empty() {
  return (
    <Frame>
      <AddressAutocomplete
        label="Location Address"
        value=""
        placeholder="Start typing an address…"
        onChange={() => {}}
        onPick={() => {}}
      />
    </Frame>
  )
}
