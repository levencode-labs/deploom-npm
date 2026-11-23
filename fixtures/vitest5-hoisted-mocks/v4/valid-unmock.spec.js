import { expect, test, vi } from 'vitest'
import { name } from './dependency.js'
vi.mock('./dependency.js', () => ({name: 'mocked'}))
vi.unmock('./dependency.js')
test('accepts top-level vi.unmock', () => expect(name).toBe('real'))
