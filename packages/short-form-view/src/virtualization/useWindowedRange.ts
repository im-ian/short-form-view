import { useMemo } from 'react'
import { clampIndex, wrapIndex } from '../engine/math'

export function computeWindowIndices(
  activeIndex: number,
  total: number,
  overscan: number,
  loop: boolean,
): number[] {
  if (total <= 0) return []
  // Range-like props arrive at runtime from JavaScript too. Normalize them so
  // fractional/NaN values cannot produce fractional data indices or an empty
  // window that omits the active item.
  const span = Number.isFinite(overscan) ? Math.max(0, Math.floor(overscan)) : 0
  const active = loop ? wrapIndex(activeIndex, total) : clampIndex(activeIndex, total)
  const set = new Set<number>()
  for (let d = -span; d <= span; d++) {
    let i = active + d
    if (loop) {
      i = ((i % total) + total) % total
    } else if (i < 0 || i > total - 1) {
      continue
    }
    set.add(i)
  }
  return Array.from(set).sort((a, b) => a - b)
}

export function useWindowedRange(
  activeIndex: number,
  total: number,
  overscan: number,
  loop: boolean,
): number[] {
  return useMemo(
    () => computeWindowIndices(activeIndex, total, overscan, loop),
    [activeIndex, total, overscan, loop],
  )
}
