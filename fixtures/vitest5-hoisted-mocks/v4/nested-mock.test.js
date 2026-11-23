import { describe, expect, test, vi } from 'vitest'
import { name } from './dependency.js'
describe('nested vi.mock', () => {
  vi.mock('./dependency.js', () => ({name: 'mocked'}))
  test('is already hoisted in the v4 baseline', () => expect(name).toBe('mocked'))
})
