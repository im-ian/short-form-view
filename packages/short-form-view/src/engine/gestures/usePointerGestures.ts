import { useEffect, useRef } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'
import type { ZoneEvent } from '../../types'
import { classifyPointerEnd, zoneFromX } from '../holds'

const SLOP = 8
const IGNORE_GESTURE_SELECTOR = '[data-sfv-ignore-gesture]'
const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
].join(',')

function closestWithin(target: EventTarget | null, root: HTMLElement, selector: string): Element | null {
  if (!(target instanceof Element)) return null
  const match = target.closest(selector)
  return match && root.contains(match) ? match : null
}

export function shouldIgnoreGestureTarget(
  target: EventTarget | null,
  root: HTMLElement,
  ignoreInteractiveElements: boolean,
): boolean {
  if (closestWithin(target, root, IGNORE_GESTURE_SELECTOR)) return true
  return ignoreInteractiveElements && closestWithin(target, root, INTERACTIVE_SELECTOR) != null
}

export function usePointerGestures(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'beginDrag' | 'dragBy' | 'endDrag'>
  getIndex: () => number
  zones: { left: number; right: number }
  holdDelay: number
  disabled: boolean
  swipeEnabled: boolean
  holdEnabled: boolean
  tapZonesEnabled: boolean
  ignoreInteractiveElements: boolean
  onHoldStart?: (e: ZoneEvent) => void
  onHoldEnd?: (e: ZoneEvent) => void
  onTapZone?: (e: ZoneEvent) => void
}): void {
  const {
    containerRef, engine, getIndex, zones, holdDelay, disabled,
    swipeEnabled, holdEnabled, tapZonesEnabled, ignoreInteractiveElements,
    onHoldStart, onHoldEnd, onTapZone,
  } = p

  const state = useRef({
    active: false, pointerId: -1,
    startX: 0, startY: 0, lastY: 0, lastT: 0,
    velocity: 0, moved: false, dragging: false, holdFired: false, side: 'center' as ZoneEvent['side'],
    holdTimer: null as ReturnType<typeof setTimeout> | null,
  })

  // Keep the latest callbacks/config in a ref so listeners bind once.
  const ext = useRef({
    engine, getIndex, zones, holdDelay, swipeEnabled, holdEnabled, tapZonesEnabled,
    ignoreInteractiveElements, onHoldStart, onHoldEnd, onTapZone, disabled,
  })
  ext.current = {
    engine, getIndex, zones, holdDelay, swipeEnabled, holdEnabled, tapZonesEnabled,
    ignoreInteractiveElements, onHoldStart, onHoldEnd, onTapZone, disabled,
  }

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
      if (!cfg.swipeEnabled && !cfg.holdEnabled && !cfg.tapZonesEnabled) return
      const s = state.current
      // Single-pointer pager: ignore extra fingers while one gesture is active,
      // so a second touch never resets the first pointer's hold/tap state.
      if (s.active) return
      if (shouldIgnoreGestureTarget(e.target, el, cfg.ignoreInteractiveElements)) return
      const rect = el.getBoundingClientRect()
      s.active = true; s.pointerId = e.pointerId
      s.startX = e.clientX; s.startY = e.clientY
      s.lastY = e.clientY; s.lastT = performance.now()
      s.velocity = 0; s.moved = false; s.dragging = false; s.holdFired = false
      s.side = zoneFromX(e.clientX - rect.left, rect.width, cfg.zones)
      try { el.setPointerCapture(e.pointerId) } catch { /* noop */ }
      clearHold()
      if (cfg.holdEnabled) {
        s.holdTimer = setTimeout(() => {
          // Re-read config: hold may have been disabled during the press.
          const c = ext.current
          if (!s.moved && c.holdEnabled && !c.disabled) {
            s.holdFired = true
            c.onHoldStart?.({ side: s.side, index: c.getIndex() })
          }
        }, cfg.holdDelay)
      }
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
        // Lock to vertical intent once the pointer leaves the slop radius. A
        // horizontal carousel or scrubber nested in an item must keep control
        // of its gesture instead of moving the vertical feed by a few pixels.
        if (cfg.swipeEnabled && Math.abs(dy) >= Math.abs(dx)) {
          s.dragging = true
          cfg.engine.beginDrag()
        }
      }
      if (s.dragging) {
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
      if (s.dragging) {
        // Cancellation means the browser/OS took ownership of the gesture.
        // Reset the track without interpreting the last delta as navigation.
        if (e.type === 'pointercancel') cfg.engine.endDrag(0, 0)
        else cfg.engine.endDrag(dy, s.velocity)
        return
      }
      if (s.moved) return
      if (e.type === 'pointercancel') {
        if (s.holdFired) cfg.onHoldEnd?.({ side: s.side, index: cfg.getIndex() })
        return
      }
      const kind = classifyPointerEnd(s.holdFired, false)
      if (kind === 'hold-end') cfg.onHoldEnd?.({ side: s.side, index: cfg.getIndex() })
      else if (kind === 'tap' && cfg.tapZonesEnabled) cfg.onTapZone?.({ side: s.side, index: cfg.getIndex() })
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
