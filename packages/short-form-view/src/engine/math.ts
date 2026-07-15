import type { ThresholdUnit } from '../types'

function finiteInteger(value: number): number {
  return Number.isFinite(value) ? Math.trunc(value) : 0
}

export function clampIndex(index: number, total: number): number {
  const size = Math.max(0, finiteInteger(total))
  if (size <= 0) return 0
  return Math.max(0, Math.min(finiteInteger(index), size - 1))
}

export function wrapIndex(index: number, total: number): number {
  const size = Math.max(0, finiteInteger(total))
  if (size <= 0) return 0
  const normalized = finiteInteger(index)
  return ((normalized % size) + size) % size
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
