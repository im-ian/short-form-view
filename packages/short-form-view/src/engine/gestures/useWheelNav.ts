import { useEffect, useRef } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'

// A new wheel gesture begins once the wheel has been silent for at least this
// long. Trackpad frames are ~16ms apart (one continuous gesture); deliberate
// mouse-wheel notches are spaced further apart (each a fresh gesture).
const WHEEL_GAP_MS = 60
// A continuous, never-idle stream (free-spin or smooth-scroll wheels) is allowed
// to advance again after this long, so it can never get stuck on a single step.
const WHEEL_MAX_LOCK_MS = 450
// Normalized delta (px) that must accumulate before a step commits.
const WHEEL_STEP = 16
// Normalization for non-pixel wheel modes (Firefox mouse wheels report lines).
const LINE_HEIGHT = 16
const PAGE_HEIGHT = 800

function normalizeDelta(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * LINE_HEIGHT
  if (e.deltaMode === 2) return e.deltaY * PAGE_HEIGHT
  return e.deltaY
}

export function useWheelNav(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'next' | 'prev'>
  disabled: boolean
}): void {
  const { containerRef, engine, disabled } = p
  // Keep the latest engine in a ref so the wheel listener binds once and never
  // churns on unrelated re-renders (engine is a fresh object each render).
  const engineRef = useRef(engine)
  engineRef.current = engine
  const accum = useRef(0)
  const locked = useRef(false)
  const lockStart = useRef(0)
  const lastTime = useRef(Number.NEGATIVE_INFINITY)
  const gestureDir = useRef(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const dy = normalizeDelta(e)
      if (dy === 0) return

      const now = e.timeStamp
      const dir = dy > 0 ? 1 : -1

      // A gesture ends — and the lock releases — in one of three ways:
      const newGesture = now - lastTime.current > WHEEL_GAP_MS
      // ...a reverse strong enough to be real intent (sub-threshold opposite
      // inertia noise must NOT break the lock, or it re-fires the tail)...
      const strongReverse =
        locked.current && dir !== gestureDir.current && Math.abs(dy) >= WHEEL_STEP
      // ...or a never-idle stream that has been locked too long.
      const lockExpired = locked.current && now - lockStart.current >= WHEEL_MAX_LOCK_MS

      if (newGesture || strongReverse || lockExpired) {
        locked.current = false
        accum.current = 0
      }
      lastTime.current = now

      if (locked.current) return

      accum.current += dy
      if (Math.abs(accum.current) >= WHEEL_STEP) {
        if (dir > 0) engineRef.current.next('wheel')
        else engineRef.current.prev('wheel')
        locked.current = true
        lockStart.current = now
        gestureDir.current = dir
        accum.current = 0
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [containerRef, disabled])
}
