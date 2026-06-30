import { describe, it, expect } from 'vitest'
import { computePrefetchIndices } from './usePrefetch'

describe('computePrefetchIndices', () => {
  it('returns nearby non-active indices in next-then-previous order', () => {
    expect(computePrefetchIndices(2, 6, 2, false)).toEqual([3, 1, 4, 0])
  })

  it('clamps non-looping indices at the list edges', () => {
    expect(computePrefetchIndices(0, 4, 2, false)).toEqual([1, 2])
  })

  it('wraps looping indices without duplicating the active item', () => {
    expect(computePrefetchIndices(0, 4, 2, true)).toEqual([1, 3, 2])
  })
})
