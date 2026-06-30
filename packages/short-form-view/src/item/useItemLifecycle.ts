import { useEffect, useRef } from 'react'

export function useItemLifecycle<T>(
  isActive: boolean,
  index: number,
  item: T,
  onEnter?: (index: number, item: T) => void,
  onLeave?: (index: number, item: T) => void,
): void {
  const wasActive = useRef(false)
  const latest = useRef({ index, item, onEnter, onLeave })
  latest.current = { index, item, onEnter, onLeave }

  useEffect(() => {
    const { index: i, item: it, onEnter: en, onLeave: lv } = latest.current
    if (isActive && !wasActive.current) {
      wasActive.current = true
      en?.(i, it)
    } else if (!isActive && wasActive.current) {
      wasActive.current = false
      lv?.(i, it)
    }
  }, [isActive])

  useEffect(() => {
    return () => {
      if (wasActive.current) {
        const { index: i, item: it, onLeave: lv } = latest.current
        wasActive.current = false
        lv?.(i, it)
      }
    }
  }, [])
}
