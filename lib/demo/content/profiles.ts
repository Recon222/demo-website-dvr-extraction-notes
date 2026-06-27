import type { Profile, ProfileConfig } from '@/lib/demo/types'
import { WIZARD_SCREENS } from '@/lib/demo/content/screens'

/**
 * Profile = which wizard screens/fields a deployment shows. The demo is profile-driven
 * so the future "canvas" profile (a trimmed field set for investigators canvassing for
 * video) becomes a config object here, not a fork. Forensic ships first; canvas is added
 * later by registering another `ProfileConfig` and branching `getProfile`.
 */
export const FORENSIC: ProfileConfig = {
  id: 'forensic',
  wizardScreens: [...WIZARD_SCREENS],
  hiddenFields: [],
}

export function getProfile(id: Profile): ProfileConfig {
  // Canvas profile is future work; everything resolves to forensic for now.
  switch (id) {
    case 'forensic':
    default:
      return FORENSIC
  }
}
