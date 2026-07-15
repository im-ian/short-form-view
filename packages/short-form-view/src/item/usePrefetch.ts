import { useEffect, useRef } from 'react'
import type { PrefetchEvent } from '../types'
import { relativeIndexDistance } from '../engine/math'

export function computePrefetchIndices(
  activeIndex: number,
  total: number,
  range: number,
  loop: boolean,
): number[] {
  if (total <= 1 || range <= 0) return []
  const out: number[] = []
  const seen = new Set<number>([activeIndex])
  const maxDistance = Math.max(0, Math.floor(range))

  const push = (index: number) => {
    let next = index
    if (loop) next = ((next % total) + total) % total
    else if (next < 0 || next > total - 1) return
    if (!seen.has(next)) {
      seen.add(next)
      out.push(next)
    }
  }

  for (let distance = 1; distance <= maxDistance; distance++) {
    push(activeIndex + distance)
    push(activeIndex - distance)
  }

  return out
}

export function usePrefetch<T>(p: {
  data: T[]
  activeIndex: number
  loop: boolean
  range: number
  keyExtractor: (item: T, index: number) => string | number
  onPrefetch?: (e: PrefetchEvent<T>) => void
}): void {
  const { data, activeIndex, loop, range, keyExtractor, onPrefetch } = p
  const prefetchedKeys = useRef(new Set<string | number>())
  const latest = useRef({ keyExtractor, onPrefetch })
  latest.current = { keyExtractor, onPrefetch }

  useEffect(() => {
    if (!latest.current.onPrefetch) return
    const total = data.length
    const activeItem = data[activeIndex]
    if (activeItem != null) {
      prefetchedKeys.current.add(latest.current.keyExtractor(activeItem, activeIndex))
    }

    for (const index of computePrefetchIndices(activeIndex, total, range, loop)) {
      const item = data[index]
      if (item == null) continue
      const key = latest.current.keyExtractor(item, index)
      if (prefetchedKeys.current.has(key)) continue
      prefetchedKeys.current.add(key)
      latest.current.onPrefetch({
        index,
        item,
        activeIndex,
        distance: relativeIndexDistance(index, activeIndex, total, loop),
      })
    }
  }, [activeIndex, data, loop, range])
}
