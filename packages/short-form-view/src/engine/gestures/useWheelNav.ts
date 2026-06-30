import { useEffect, useRef } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'

// Minimum accumulated delta (px) before a wheel gesture commits a step.
const WHEEL_STEP = 20
// A wheel gesture is considered finished once no wheel event arrives for this
// long. Trackpad/inertial scrolling fires a long tail of events; locking until
// idle guarantees one flick == one step instead of double-advancing when an
// old fixed cooldown expired mid-momentum.
const WHEEL_IDLE_MS = 140

export function useWheelNav(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'next' | 'prev'>
  disabled: boolean
}): void {
  const { containerRef, engine, disabled } = p
  const accum = useRef(0)
  const locked = useRef(false)
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return

    const endGesture = () => {
      locked.current = false
      accum.current = 0
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()

      // Every event refreshes the idle timer; the gesture only ends (and the
      // next step becomes possible) once the wheel has been silent for a beat.
      if (idleTimer.current) clearTimeout(idleTimer.current)
      idleTimer.current = setTimeout(endGesture, WHEEL_IDLE_MS)

      if (locked.current) return

      accum.current += e.deltaY
      if (accum.current > WHEEL_STEP) {
        engine.next('wheel')
        locked.current = true
        accum.current = 0
      } else if (accum.current < -WHEEL_STEP) {
        engine.prev('wheel')
        locked.current = true
        accum.current = 0
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current)
      el.removeEventListener('wheel', onWheel)
    }
  }, [containerRef, engine, disabled])
}
