import { describe, expect, test, vi } from 'vitest'
describe('nested vi.hoisted', () => {
  vi.hoisted(() => { globalThis.hoistedRan = 1 })
  test('ran during setup', () => expect(globalThis.hoistedRan).toBe(1))
})
