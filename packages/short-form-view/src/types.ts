import type { CSSProperties, ReactNode } from 'react'

export type SwipeDirection = 'up' | 'down'
export type ZoneSide = 'left' | 'center' | 'right'
export type IndexChangeReason = 'swipe' | 'wheel' | 'key' | 'api'
export type ThresholdUnit = 'fraction' | 'px'

export interface ItemState {
  index: number
  activeIndex: number
  isActive: boolean
  isVisible: boolean
  isSnapping: boolean
  distance: number
}

export interface SwipeEvent {
  from: number
  to: number
  direction: SwipeDirection
  velocity: number
}

export interface ZoneEvent {
  side: ZoneSide
  index: number
}

export interface IndexChangeMeta {
  reason: IndexChangeReason
}

export interface ShortFormHandle {
  scrollToIndex: (index: number, opts?: { animated?: boolean }) => void
  next: () => void
  prev: () => void
  getIndex: () => number
}

export interface ShortFormViewProps<T> {
  data: T[]
  renderItem: (item: T, state: ItemState) => ReactNode
  keyExtractor: (item: T, index: number) => string | number

  initialIndex?: number
  index?: number
  onIndexChange?: (index: number, meta: IndexChangeMeta) => void
  onSwiped?: (e: SwipeEvent) => void

  threshold?: number
  thresholdUnit?: ThresholdUnit
  velocityThreshold?: number
  resistance?: number
  loop?: boolean
  disabled?: boolean

  transitionDuration?: number
  easing?: string

  overscan?: number
  onEndReached?: () => void
  onEndReachedThreshold?: number

  onItemEnter?: (index: number, item: T) => void
  onItemLeave?: (index: number, item: T) => void

  onHoldStart?: (e: ZoneEvent) => void
  onHoldEnd?: (e: ZoneEvent) => void
  onTapZone?: (e: ZoneEvent) => void
  holdDelay?: number
  zones?: { left: number; right: number }

  className?: string
  style?: CSSProperties
  itemClassName?: string
  itemStyle?: CSSProperties
  ariaLabel?: string
}
