import type { DemoState } from '@/lib/demo/store/create-store'
import type { DemoCase, DemoLocation, DrawerDef, WizardScreenId } from '@/lib/demo/types'
import { getProfile } from '@/lib/demo/content/profiles'
import { DRAWER_DEFS } from '@/lib/demo/content/screens'

/** Pure derived reads so components stay dumb (props in, no store logic). */

export function selectCurrentCase(s: DemoState): DemoCase | null {
  return s.cases.find((c) => c.id === s.currentCaseId) ?? null
}

export function selectCurrentLocation(s: DemoState): DemoLocation | null {
  return s.locations.find((l) => l.id === s.currentLocationId) ?? null
}

export function selectLocationsForCase(s: DemoState, caseId: string): DemoLocation[] {
  return s.locations.filter((l) => l.caseId === caseId)
}

export function selectVisibleWizardScreens(s: DemoState): WizardScreenId[] {
  return getProfile(s.profile).wizardScreens
}

export function selectDrawerItems(s: DemoState): DrawerDef[] {
  const visible = new Set(selectVisibleWizardScreens(s))
  return DRAWER_DEFS.filter((d) => visible.has(d.id))
}
