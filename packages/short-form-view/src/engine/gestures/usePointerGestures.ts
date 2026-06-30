import { useEffect, useRef } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'
import type { ZoneEvent } from '../../types'
import { classifyPointerEnd, zoneFromX } from '../holds'

const SLOP = 8

export function usePointerGestures(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'beginDrag' | 'dragBy' | 'endDrag'>
  getIndex: () => number
  zones: { left: number; right: number }
  holdDelay: number
  disabled: boolean
  onHoldStart?: (e: ZoneEvent) => void
  onHoldEnd?: (e: ZoneEvent) => void
  onTapZone?: (e: ZoneEvent) => void
}): void {
  const { containerRef, engine, getIndex, zones, holdDelay, disabled, onHoldStart, onHoldEnd, onTapZone } = p

  const state = useRef({
    active: false, pointerId: -1,
    startX: 0, startY: 0, lastY: 0, lastT: 0,
    velocity: 0, moved: false, holdFired: false, side: 'center' as ZoneEvent['side'],
    holdTimer: null as ReturnType<typeof setTimeout> | null,
  })

  // Keep the latest callbacks/config in a ref so listeners bind once.
  const ext = useRef({ engine, getIndex, zones, holdDelay, onHoldStart, onHoldEnd, onTapZone, disabled })
  ext.current = { engine, getIndex, zones, holdDelay, onHoldStart, onHoldEnd, onTapZone, disabled }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const clearHold = () => {
      if (state.current.holdTimer) {
        clearTimeout(state.current.holdTimer)
        state.current.holdTimer = null
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      const cfg = ext.current
      if (cfg.disabled) return
      const rect = el.getBoundingClientRect()
      const s = state.current
      s.active = true; s.pointerId = e.pointerId
      s.startX = e.clientX; s.startY = e.clientY
      s.lastY = e.clientY; s.lastT = performance.now()
      s.velocity = 0; s.moved = false; s.holdFired = false
      s.side = zoneFromX(e.clientX - rect.left, rect.width, cfg.zones)
      try { el.setPointerCapture(e.pointerId) } catch { /* noop */ }
      clearHold()
      s.holdTimer = setTimeout(() => {
        if (!s.moved) {
          s.holdFired = true
          cfg.onHoldStart?.({ side: s.side, index: cfg.getIndex() })
        }
      }, cfg.holdDelay)
    }

    const onPointerMove = (e: PointerEvent) => {
      const s = state.current
      if (!s.active || e.pointerId !== s.pointerId) return
      const cfg = ext.current
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      if (!s.moved && Math.hypot(dx, dy) > SLOP) {
        s.moved = true
        clearHold()
        if (s.holdFired) { cfg.onHoldEnd?.({ side: s.side, index: cfg.getIndex() }); s.holdFired = false }
        cfg.engine.beginDrag()
      }
      if (s.moved) {
        const now = performance.now()
        const dt = now - s.lastT
        if (dt > 0) s.velocity = (e.clientY - s.lastY) / dt
        s.lastY = e.clientY; s.lastT = now
        cfg.engine.dragBy(dy)
        e.preventDefault()
      }
    }

    const finish = (e: PointerEvent) => {
      const s = state.current
      if (!s.active || e.pointerId !== s.pointerId) return
      const cfg = ext.current
      s.active = false
      clearHold()
      try { el.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      const dy = e.clientY - s.startY
      if (s.moved) {
        cfg.engine.endDrag(dy, s.velocity)
        return
      }
      const kind = classifyPointerEnd(s.holdFired, false)
      if (kind === 'hold-end') cfg.onHoldEnd?.({ side: s.side, index: cfg.getIndex() })
      else if (kind === 'tap') cfg.onTapZone?.({ side: s.side, index: cfg.getIndex() })
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', finish)
    el.addEventListener('pointercancel', finish)
    return () => {
      clearHold()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', finish)
      el.removeEventListener('pointercancel', finish)
    }
  }, [containerRef])
}
