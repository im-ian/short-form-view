import type { ZoneSide } from '../types'

export function zoneFromX(
  xWithinElement: number,
  width: number,
  zones: { left: number; right: number },
): ZoneSide {
  if (width <= 0) return 'center'
  const leftEdge = width * zones.left
  const rightEdge = width * (1 - zones.right)
  if (xWithinElement <= leftEdge) return 'left'
  if (xWithinElement >= rightEdge) return 'right'
  return 'center'
}

export function classifyPointerEnd(
  holdFired: boolean,
  movedPastSlop: boolean,
): 'tap' | 'hold-end' | 'none' {
  if (movedPastSlop) return 'none'
  return holdFired ? 'hold-end' : 'tap'
}
