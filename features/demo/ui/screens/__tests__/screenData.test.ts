import { describe, it, expect } from 'vitest'
import { toCaseCards, caseStatusTheme } from '@/features/demo/ui/screens/screenData'
import { blankLocationForm } from '@/features/demo/engine/content/seed'
import type { DemoCase, DemoLocation } from '@/features/demo/engine/types'

const aCase = (over: Partial<DemoCase> = {}): DemoCase => ({
  id: 'c1',
  caseNumber: 'PR25-0001',
  displayName: 'Case One',
  unit: 'Robbery',
  oicName: 'L. McHugh',
  oicBadge: '4471',
  vcName: '',
  vcBadge: '',
  incidentBusinessName: '',
  incidentStreetAddress: '',
  incidentCity: '',
  notes: '',
  status: 'draft',
  createdLabel: 'Mar 9, 2025',
  isSeed: false,
  locationIds: ['l1'],
  ...over,
})

const aLoc = (over: Partial<DemoLocation> = {}): DemoLocation => ({
  id: 'l1',
  caseId: 'c1',
  locationName: "Kim's Convenience",
  businessName: '',
  streetAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  requesterName: '',
  requesterBadge: '',
  requesterUnit: '',
  requesterPhone: '',
  requesterEmail: '',
  locationContact: '',
  locationPhone: '',
  isSeed: false,
  form: blankLocationForm(),
  ...over,
})

describe('toCaseCards', () => {
  it('maps personnel, status theme, and location rows', () => {
    const [card] = toCaseCards([aCase()], [aLoc()])
    expect(card.caseNumber).toBe('PR25-0001')
    expect(card.status.label).toBe('Draft')
    expect(card.personnel[0]).toMatchObject({ role: 'OIC', name: 'L. McHugh', badge: '4471' })
    expect(card.locationCountLabel).toBe('1 location')
    expect(card.locations[0]).toMatchObject({ locationName: "Kim's Convenience", address: '1450 Eglinton Ave W, Mississauga' })
  })

  it('pluralises the location count and only attaches a case\'s own locations', () => {
    const cards = toCaseCards([aCase()], [aLoc(), aLoc({ id: 'l2', caseId: 'other' })])
    expect(cards[0].locationCountLabel).toBe('1 location')
    const [card] = toCaseCards([aCase({ locationIds: ['l1', 'l2'] })], [aLoc(), aLoc({ id: 'l2' })])
    expect(card.locationCountLabel).toBe('2 locations')
  })

  it('themes a complete case green', () => {
    expect(caseStatusTheme('complete').label).toBe('Complete')
    expect(caseStatusTheme('complete').color).toBe('#10d177')
  })
})
