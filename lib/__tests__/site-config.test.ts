import { describe, it, expect } from 'vitest'
import { siteConfig } from '@/lib/site-config'

// Central site metadata used by layout/SEO and the nav. Pins the product name and
// the shape of the navigation so a regression can't drop the beta link.
describe('siteConfig', () => {
  it('uses the product name "DVR Extraction Notes"', () => {
    expect(siteConfig.name).toBe('DVR Extraction Notes')
  })

  it('has a non-empty description', () => {
    expect(siteConfig.description.length).toBeGreaterThan(0)
  })

  it('defines navigation items with labels and valid hrefs', () => {
    expect(siteConfig.nav.length).toBeGreaterThan(0)
    for (const item of siteConfig.nav) {
      expect(item.label.length).toBeGreaterThan(0)
      expect(item.href).toMatch(/^(\/|#|https?:\/\/)/)
    }
  })

  it('links to the beta page from the nav', () => {
    const hrefs = siteConfig.nav.map((n) => n.href)
    expect(hrefs).toContain('/beta')
  })
})
