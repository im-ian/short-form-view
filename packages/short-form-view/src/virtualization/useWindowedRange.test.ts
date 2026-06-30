import { describe, it, expect } from 'vitest'
import { computeWindowIndices } from './useWindowedRange'

describe('computeWindowIndices', () => {
  it('returns active plus overscan neighbors', () => {
    expect(computeWindowIndices(3, 10, 1, false)).toEqual([2, 3, 4])
  })
  it('clamps at the start without loop', () => {
    expect(computeWindowIndices(0, 10, 1, false)).toEqual([0, 1])
  })
  it('clamps at the end without loop', () => {
    expect(computeWindowIndices(9, 10, 1, false)).toEqual([8, 9])
  })
  it('returns empty for empty list', () => {
    expect(computeWindowIndices(0, 0, 1, false)).toEqual([])
  })
  it('respects overscan size', () => {
    expect(computeWindowIndices(5, 20, 2, false)).toEqual([3, 4, 5, 6, 7])
  })
  it('wraps neighbors when loop is enabled', () => {
    expect(computeWindowIndices(0, 5, 1, true)).toEqual([0, 1, 4])
  })
})
