import { useMemo } from 'react'

export function computeWindowIndices(
  activeIndex: number,
  total: number,
  overscan: number,
  loop: boolean,
): number[] {
  if (total <= 0) return []
  const set = new Set<number>()
  for (let d = -overscan; d <= overscan; d++) {
    let i = activeIndex + d
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
