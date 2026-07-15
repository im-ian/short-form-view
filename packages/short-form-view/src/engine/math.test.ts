import { describe, it, expect } from 'vitest'
import { clampIndex, wrapIndex, resolveThreshold, applyResistance, decideCommit } from './math'

describe('clampIndex', () => {
  it('clamps within bounds', () => {
    expect(clampIndex(-2, 5)).toBe(0)
    expect(clampIndex(9, 5)).toBe(4)
    expect(clampIndex(3, 5)).toBe(3)
  })
  it('returns 0 for empty list', () => {
    expect(clampIndex(2, 0)).toBe(0)
  })
  it('normalizes fractional and non-finite indices', () => {
    expect(clampIndex(2.9, 5)).toBe(2)
    expect(clampIndex(Number.NaN, 5)).toBe(0)
    expect(clampIndex(Number.POSITIVE_INFINITY, 5)).toBe(0)
  })
})

describe('wrapIndex', () => {
  it('wraps around both ends', () => {
    expect(wrapIndex(5, 5)).toBe(0)
    expect(wrapIndex(-1, 5)).toBe(4)
    expect(wrapIndex(6, 5)).toBe(1)
  })
  it('normalizes fractional and non-finite indices', () => {
    expect(wrapIndex(5.9, 5)).toBe(0)
    expect(wrapIndex(Number.NaN, 5)).toBe(0)
  })
})

describe('resolveThreshold', () => {
  it('uses fraction of container height', () => {
    expect(resolveThreshold(0.2, 'fraction', 1000)).toBe(200)
  })
  it('uses px directly', () => {
    expect(resolveThreshold(80, 'px', 1000)).toBe(80)
  })
})

describe('applyResistance', () => {
  it('scales overscroll delta', () => {
    expect(applyResistance(100, 0.3)).toBe(30)
  })
})

describe('decideCommit', () => {
  it('does not commit below distance and velocity thresholds', () => {
    expect(decideCommit(-50, 0.1, 200, 0.3)).toEqual({ commit: false, direction: 0 })
  })
  it('commits next when dragged up past distance threshold', () => {
    expect(decideCommit(-220, 0.0, 200, 0.3)).toEqual({ commit: true, direction: 1 })
  })
  it('commits prev when dragged down past distance threshold', () => {
    expect(decideCommit(220, 0.0, 200, 0.3)).toEqual({ commit: true, direction: -1 })
  })
  it('commits on velocity flick even below distance threshold', () => {
    expect(decideCommit(-30, -0.5, 200, 0.3)).toEqual({ commit: true, direction: 1 })
  })
})
