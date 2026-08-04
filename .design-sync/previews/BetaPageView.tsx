// Preview for BetaPageView — the full two-phase /beta page (header + one panel +
// the WHAT-HAPPENS-NEXT cards). cardMode:single + tall viewport is set in
// config.marketing.json so each phase renders as one wide cell.
//
// The two cells are the two production states, driven by the single testflightUrl
// prop the route injects from siteConfig:
//   WithTestflight — a live URL → the cyan LINK ACTIVE panel + gold TestFlight
//     button, with email capture demoted to secondary.
//   NoBuildYet — null → the gold INTAKE FORM panel (pre-build state).
import { BetaPageView } from 'open-pro-next'

export function WithTestflight() {
  return <BetaPageView testflightUrl="https://testflight.apple.com/join/XXXXXXXX" />
}

export function NoBuildYet() {
  return <BetaPageView testflightUrl={null} />
}
