import type { ThresholdUnit } from '../types'

export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(index, total - 1))
}

export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return ((index % total) + total) % total
}

export function resolveThreshold(
  threshold: number,
  unit: ThresholdUnit,
  containerHeight: number,
): number {
  return unit === 'px' ? threshold : threshold * containerHeight
}

export function applyResistance(delta: number, resistance: number): number {
  return delta * resistance
}

export function decideCommit(
  delta: number,
  velocity: number,
  resolvedThreshold: number,
  velocityThreshold: number,
): { commit: boolean; direction: 0 | 1 | -1 } {
  const distancePass = Math.abs(delta) >= resolvedThreshold
  const velocityPass = Math.abs(velocity) >= velocityThreshold
  if (!distancePass && !velocityPass) return { commit: false, direction: 0 }
  const direction = delta < 0 ? 1 : -1
  return { commit: true, direction }
}
