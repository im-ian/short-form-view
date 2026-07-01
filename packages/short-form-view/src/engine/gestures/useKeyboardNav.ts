import { useEffect, useRef } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'

export function useKeyboardNav(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'next' | 'prev' | 'goTo'>
  total: number
  disabled: boolean
}): void {
  const { containerRef, engine, total, disabled } = p
  // Bind once; read the latest engine/total from a ref so the keydown listener
  // never churns on unrelated re-renders (engine is a fresh object each render).
  const ref = useRef({ engine, total })
  ref.current = { engine, total }
  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      const { engine, total } = ref.current
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault(); engine.next('key'); break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault(); engine.prev('key'); break
        case 'Home':
          e.preventDefault(); engine.goTo(0, { reason: 'key' }); break
        case 'End':
          e.preventDefault(); engine.goTo(total - 1, { reason: 'key' }); break
        default:
          break
      }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [containerRef, disabled])
}
