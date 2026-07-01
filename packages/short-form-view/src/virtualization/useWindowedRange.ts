import { useMemo } from 'react'

export function computeWindowIndices(
  activeIndex: number,
  total: number,
  overscan: number,
  loop: boolean,
): number[] {
  if (total <= 0) return []
  // A negative overscan would make the loop never run and silently render an
  // empty feed; clamp it so the active item is always included.
  const span = Math.max(0, overscan)
  const set = new Set<number>()
  for (let d = -span; d <= span; d++) {
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
