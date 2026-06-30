import { describe, it, expect } from 'vitest'
import { VERSION } from './index'

describe('package smoke', () => {
  it('exports a version string', () => {
    expect(VERSION).toBe('0.1.0')
  })
})
