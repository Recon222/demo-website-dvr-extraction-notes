import { describe, it, expect } from 'vitest'
import * as uiOptions from '@/features/demo/ui/screens/field-options'
import * as engineOptions from '@/features/demo/engine/content/form-options'

// field-options.ts must stay a PURE re-export of the engine module — the same object
// references, not copies. A locally-redefined list here is exactly the drift that produced
// parity gap G5 (screens vs FORM_OPTIONS disagreeing on the same enums).
describe('ui/screens/field-options is a pure re-export of engine/content/form-options', () => {
  it('re-exports every engine export by reference', () => {
    for (const key of Object.keys(engineOptions) as (keyof typeof engineOptions)[]) {
      expect(uiOptions[key], `field-options must re-export "${key}" by reference`).toBe(engineOptions[key])
    }
  })

  it('defines nothing of its own', () => {
    expect(Object.keys(uiOptions).sort()).toEqual(Object.keys(engineOptions).sort())
  })
})
