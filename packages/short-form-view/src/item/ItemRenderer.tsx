import { memo, useMemo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { ItemState } from '../types'
import { relativeIndexDistance } from '../engine/math'
import { useItemLifecycle } from './useItemLifecycle'

export interface ItemRendererProps<T> {
  item: T
  index: number
  activeIndex: number
  isSnapping: boolean
  total: number
  loop: boolean
  renderItem: (item: T, state: ItemState) => ReactNode
  itemClassName?: string
  itemStyle?: CSSProperties
  getItemAriaLabel?: (index: number, item: T, total: number) => string
  onItemEnter?: (index: number, item: T) => void
  onItemLeave?: (index: number, item: T) => void
}

function ItemRendererInner<T>(props: ItemRendererProps<T>) {
  const {
    item, index, activeIndex, isSnapping, total, loop, renderItem, itemClassName, itemStyle,
    getItemAriaLabel, onItemEnter, onItemLeave,
  } = props

  const distance = relativeIndexDistance(index, activeIndex, total, loop)
  const position = activeIndex + distance
  const isActive = distance === 0
  const isVisible = Math.abs(distance) <= 1
  const state = useMemo<ItemState>(
    () => ({ index, activeIndex, isActive, isVisible, isSnapping, distance }),
    [index, activeIndex, isActive, isVisible, isSnapping, distance],
  )
  const content = useMemo(() => renderItem(item, state), [item, renderItem, state])
  const ariaLabel = getItemAriaLabel?.(index, item, total) ?? `Slide ${index + 1} of ${total}`

  useItemLifecycle(isActive, index, item, onItemEnter, onItemLeave)

  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transform: `translateY(${position * 100}%)`,
    ...itemStyle,
  }

  return (
    <div
      className={itemClassName}
      style={style}
      data-sfv-index={index}
      role="group"
      aria-roledescription="slide"
      aria-label={ariaLabel}
      aria-current={isActive ? 'true' : undefined}
      aria-hidden={!isActive}
    >
      {content}
    </div>
  )
}

export const ItemRenderer = memo(ItemRendererInner) as typeof ItemRendererInner
