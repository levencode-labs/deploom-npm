import { expect, test, vi } from 'vitest'
test('dynamic mocks stay inside a test and apply only to dynamic import', async () => {
  vi.doMock('./dependency.js', () => ({name: 'dynamic mock'}))
  expect((await import('./dependency.js')).name).toBe('dynamic mock')
  vi.doUnmock('./dependency.js')
  expect((await import('./dependency.js')).name).toBe('real')
})
