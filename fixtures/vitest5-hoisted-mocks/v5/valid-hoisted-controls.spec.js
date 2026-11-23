import { expect, test, vi } from 'vitest'
import { name } from './dependency.js'
vi.mock('./dependency.js', () => ({name: 'static mock'}))
const h = vi.hoisted(() => 'top level')
test('accepts top-level hoisted APIs', () => {
  expect(name).toBe('static mock')
  expect(h).toBe('top level')
})
