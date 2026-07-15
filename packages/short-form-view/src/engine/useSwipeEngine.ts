import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  IndexChangeMeta,
  IndexChangeReason,
  SwipeDirection,
  SwipeEvent,
  ThresholdUnit,
} from '../types'
import { useIsomorphicLayoutEffect } from '../ssr/useIsomorphicLayoutEffect'
import { applyResistance, clampIndex, decideCommit, resolveThreshold, wrapIndex } from './math'

export interface SwipeEngineParams {
  total: number
  containerRef: React.RefObject<HTMLElement | null>
  trackRef: React.RefObject<HTMLElement | null>
  initialIndex: number
  controlledIndex?: number
  loop: boolean
  disabled: boolean
  threshold: number
  thresholdUnit: ThresholdUnit
  velocityThreshold: number
  resistance: number
  transitionDuration: number
  easing: string
  reducedMotion: boolean
  onIndexChange?: (i: number, meta: IndexChangeMeta) => void
  onSwiped?: (e: SwipeEvent) => void
  onEndReached?: () => void
  onEndReachedThreshold: number
}

export interface SwipeEngineApi {
  activeIndex: number
  isSnapping: boolean
  goTo: (
    target: number,
    opts: {
      reason: IndexChangeReason
      animated?: boolean
      velocity?: number
      direction?: SwipeDirection
    },
  ) => void
  next: (reason?: IndexChangeReason) => void
  prev: (reason?: IndexChangeReason) => void
  beginDrag: () => void
  dragBy: (deltaPx: number) => void
  endDrag: (deltaPx: number, velocityPxPerMs: number) => void
}

export function useSwipeEngine(params: SwipeEngineParams): SwipeEngineApi {
  const {
    total, containerRef, trackRef, initialIndex, controlledIndex, loop, disabled,
    threshold, thresholdUnit, velocityThreshold, resistance,
    transitionDuration, easing, reducedMotion,
    onIndexChange, onSwiped, onEndReached, onEndReachedThreshold,
  } = params

  const [activeIndex, setActiveIndex] = useState(() =>
    clampIndex(controlledIndex ?? initialIndex, Math.max(total, 1)),
  )
  const [isSnapping, setIsSnapping] = useState(false)

  const indexRef = useRef(activeIndex)
  const draggingRef = useRef(false)
  const skipSyncPaint = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingOffset = useRef(0)
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endReachedFiredFor = useRef<number | null>(null)

  // Keep the latest callbacks without re-binding anything.
  const cb = useRef({ onIndexChange, onSwiped, onEndReached })
  cb.current = { onIndexChange, onSwiped, onEndReached }

  const animationDuration = Number.isFinite(transitionDuration)
    ? Math.max(0, transitionDuration)
    : 0
  const canAnimate = !reducedMotion && animationDuration > 0
  const containerHeight = useCallback(() => containerRef.current?.clientHeight ?? 0, [containerRef])

  const paint = useCallback(
    (idx: number, offsetPx: number, animate: boolean) => {
      const track = trackRef.current
      if (!track) return
      const h = containerHeight()
      const dur = animate ? animationDuration : 0
      track.style.transition = dur ? `transform ${dur}ms ${easing}` : 'none'
      track.style.transform = `translate3d(0, ${-idx * h + offsetPx}px, 0)`
    },
    [trackRef, containerHeight, animationDuration, easing],
  )

  const cancelSnapEnd = useCallback(() => {
    if (!snapTimer.current) return
    clearTimeout(snapTimer.current)
    snapTimer.current = null
  }, [])

  const scheduleSnapEnd = useCallback(() => {
    cancelSnapEnd()
    snapTimer.current = setTimeout(() => {
      snapTimer.current = null
      setIsSnapping(false)
      const track = trackRef.current
      if (track) track.style.transition = 'none'
    }, animationDuration + 20)
  }, [trackRef, animationDuration, cancelSnapEnd])

  const maybeFireEndReached = useCallback(
    (idx: number) => {
      if (total <= 0) return
      const near = idx >= total - 1 - onEndReachedThreshold
      if (near) {
        if (endReachedFiredFor.current !== total) {
          endReachedFiredFor.current = total
          cb.current.onEndReached?.()
        }
      } else {
        endReachedFiredFor.current = null
      }
    },
    [total, onEndReachedThreshold],
  )

  const goTo = useCallback<SwipeEngineApi['goTo']>(
    (target, opts) => {
      if (total <= 0) return
      const from = indexRef.current
      const resolved = loop ? wrapIndex(target, total) : clampIndex(target, total)
      if (resolved === from) {
        maybeFireEndReached(resolved)
        return
      }
      const crossSeam = loop && Math.abs(resolved - from) > 1
      const animate = (opts.animated ?? true) && !crossSeam && canAnimate
      cancelSnapEnd()
      indexRef.current = resolved
      skipSyncPaint.current = true
      paint(resolved, 0, animate)
      setIsSnapping(animate)
      setActiveIndex(resolved)
      if (animate) scheduleSnapEnd()
      cb.current.onIndexChange?.(resolved, { reason: opts.reason })
      if (opts.reason === 'swipe') {
        const direction: SwipeDirection = opts.direction ?? (resolved > from ? 'up' : 'down')
        cb.current.onSwiped?.({ from, to: resolved, direction, velocity: opts.velocity ?? 0 })
      }
      maybeFireEndReached(resolved)
    },
    [total, loop, canAnimate, cancelSnapEnd, paint, scheduleSnapEnd, maybeFireEndReached],
  )

  const next = useCallback(
    (reason: IndexChangeReason = 'api') => goTo(indexRef.current + 1, { reason }),
    [goTo],
  )
  const prev = useCallback(
    (reason: IndexChangeReason = 'api') => goTo(indexRef.current - 1, { reason }),
    [goTo],
  )

  const beginDrag = useCallback(() => {
    if (disabled || total <= 0) return
    draggingRef.current = true
    cancelSnapEnd()
    setIsSnapping(false)
  }, [disabled, total, cancelSnapEnd])

  const dragBy = useCallback(
    (deltaPx: number) => {
      if (!draggingRef.current) return
      let eff = deltaPx
      const atTop = indexRef.current <= 0 && deltaPx > 0
      const atBottom = indexRef.current >= total - 1 && deltaPx < 0
      if (!loop && (atTop || atBottom)) eff = applyResistance(deltaPx, resistance)
      pendingOffset.current = eff
      if (rafId.current != null) return
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null
        paint(indexRef.current, pendingOffset.current, false)
      })
    },
    [total, loop, resistance, paint],
  )

  const endDrag = useCallback(
    (deltaPx: number, velocityPxPerMs: number) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      const resolved = resolveThreshold(threshold, thresholdUnit, containerHeight())
      const decision = decideCommit(deltaPx, velocityPxPerMs, resolved, velocityThreshold)
      if (decision.commit && decision.direction !== 0 && total > 1) {
        const target = indexRef.current + decision.direction
        const canMove = loop || (target >= 0 && target <= total - 1)
        if (canMove) {
          const direction: SwipeDirection = decision.direction === 1 ? 'up' : 'down'
          goTo(target, { reason: 'swipe', animated: true, velocity: velocityPxPerMs, direction })
          return
        }
      }
      cancelSnapEnd()
      setIsSnapping(canAnimate)
      paint(indexRef.current, 0, canAnimate)
      if (canAnimate) scheduleSnapEnd()
    },
    [
      threshold, thresholdUnit, containerHeight, velocityThreshold, total, loop,
      goTo, canAnimate, cancelSnapEnd, paint, scheduleSnapEnd,
    ],
  )

  // Sync paint for external/controlled/mount/resize index changes (no animation).
  useIsomorphicLayoutEffect(() => {
    if (skipSyncPaint.current) {
      skipSyncPaint.current = false
      return
    }
    indexRef.current = activeIndex
    paint(activeIndex, 0, false)
  }, [activeIndex, paint])

  // Repaint on container resize.
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => paint(indexRef.current, 0, false))
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, paint])

  // Clean up timers/rAF on unmount.
  useEffect(() => {
    return () => {
      cancelSnapEnd()
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    }
  }, [cancelSnapEnd])

  return { activeIndex, isSnapping, goTo, next, prev, beginDrag, dragBy, endDrag }
}
