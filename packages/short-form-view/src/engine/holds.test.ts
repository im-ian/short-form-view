import { describe, it, expect } from 'vitest'
import { zoneFromX, classifyPointerEnd } from './holds'

const zones = { left: 0.33, right: 0.33 }

describe('zoneFromX', () => {
  it('classifies left third', () => {
    expect(zoneFromX(10, 300, zones)).toBe('left')
  })
  it('classifies center', () => {
    expect(zoneFromX(150, 300, zones)).toBe('center')
  })
  it('classifies right third', () => {
    expect(zoneFromX(290, 300, zones)).toBe('right')
  })
  it('treats exact left edge as left', () => {
    expect(zoneFromX(99, 300, zones)).toBe('left')
  })
})

describe('classifyPointerEnd', () => {
  it('returns none when it moved (was a swipe)', () => {
    expect(classifyPointerEnd(false, true)).toBe('none')
    expect(classifyPointerEnd(true, true)).toBe('none')
  })
  it('returns hold-end when hold fired and no move', () => {
    expect(classifyPointerEnd(true, false)).toBe('hold-end')
  })
  it('returns tap when no hold and no move', () => {
    expect(classifyPointerEnd(false, false)).toBe('tap')
  })
})
