import { describe, expect, test, vi } from 'vitest'
import { name } from './dependency.js'
vi.mock('./dependency.js', () => ({name: 'mocked'}))
describe('nested vi.unmock', () => {
  vi.unmock('./dependency.js')
  test('undoes the hoisted mock', () => expect(name).toBe('real'))
})
