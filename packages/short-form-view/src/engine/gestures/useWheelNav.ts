import { useEffect, useRef } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'

const WHEEL_STEP = 30
const WHEEL_COOLDOWN_MS = 500

export function useWheelNav(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'next' | 'prev'>
  disabled: boolean
}): void {
  const { containerRef, engine, disabled } = p
  const accum = useRef(0)
  const cooling = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (cooling.current) return
      accum.current += e.deltaY
      const step = () => {
        cooling.current = true
        setTimeout(() => { cooling.current = false }, WHEEL_COOLDOWN_MS)
        accum.current = 0
      }
      if (accum.current > WHEEL_STEP) { engine.next('wheel'); step() }
      else if (accum.current < -WHEEL_STEP) { engine.prev('wheel'); step() }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [containerRef, engine, disabled])
}
