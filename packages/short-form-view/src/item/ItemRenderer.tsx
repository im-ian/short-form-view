import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { ItemState } from '../types'
import { useItemLifecycle } from './useItemLifecycle'

export interface ItemRendererProps<T> {
  item: T
  index: number
  activeIndex: number
  isSnapping: boolean
  total: number
  renderItem: (item: T, state: ItemState) => ReactNode
  itemClassName?: string
  itemStyle?: CSSProperties
  onItemEnter?: (index: number, item: T) => void
  onItemLeave?: (index: number, item: T) => void
}

function ItemRendererInner<T>(props: ItemRendererProps<T>) {
  const { item, index, activeIndex, isSnapping, renderItem, itemClassName, itemStyle, onItemEnter, onItemLeave } = props

  const distance = index - activeIndex
  const isActive = distance === 0
  const isVisible = Math.abs(distance) <= 1
  const state: ItemState = { index, activeIndex, isActive, isVisible, isSnapping, distance }

  useItemLifecycle(isActive, index, item, onItemEnter, onItemLeave)

  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transform: `translateY(${index * 100}%)`,
    ...itemStyle,
  }

  return (
    <div className={itemClassName} style={style} data-sfv-index={index} aria-hidden={!isActive}>
      {renderItem(item, state)}
    </div>
  )
}

export const ItemRenderer = memo(ItemRendererInner) as typeof ItemRendererInner
