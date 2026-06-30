import { describe, it, expect } from 'vitest'
import { isBrowser } from './env'

describe('isBrowser', () => {
  it('returns true under jsdom (window defined)', () => {
    expect(isBrowser()).toBe(true)
  })
})
