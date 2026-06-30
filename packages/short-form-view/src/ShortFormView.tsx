'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { CSSProperties, ForwardedRef, ReactElement, Ref } from 'react'
import type { ShortFormHandle, ShortFormViewProps } from './types'
import { useSwipeEngine } from './engine/useSwipeEngine'
import { usePointerGestures } from './engine/gestures/usePointerGestures'
import { useWheelNav } from './engine/gestures/useWheelNav'
import { useKeyboardNav } from './engine/gestures/useKeyboardNav'
import { useWindowedRange } from './virtualization/useWindowedRange'
import { ItemRenderer } from './item/ItemRenderer'
import { usePrefersReducedMotion } from './ssr/usePrefersReducedMotion'

function ShortFormViewInner<T>(props: ShortFormViewProps<T>, ref: ForwardedRef<ShortFormHandle>) {
  const {
    data, renderItem, keyExtractor,
    initialIndex = 0,
    index: controlledIndex,
    onIndexChange, onSwiped,
    threshold = 0.2, thresholdUnit = 'fraction',
    velocityThreshold = 0.3, resistance = 0.3,
    loop = false, disabled = false,
    transitionDuration = 300, easing = 'cubic-bezier(.16,1,.3,1)',
    overscan = 1, onEndReached, onEndReachedThreshold = 2,
    onItemEnter, onItemLeave,
    onHoldStart, onHoldEnd, onTapZone,
    holdDelay = 250, zones = { left: 0.33, right: 0.33 },
    className, style, itemClassName, itemStyle, ariaLabel,
  } = props

  const total = data.length
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  const engine = useSwipeEngine({
    total, containerRef, trackRef,
    initialIndex, controlledIndex,
    loop, disabled,
    threshold, thresholdUnit, velocityThreshold, resistance,
    transitionDuration, easing, reducedMotion,
    onIndexChange, onSwiped, onEndReached, onEndReachedThreshold,
  })

  // Controlled-mode sync: follow the parent's index prop.
  useEffect(() => {
    if (controlledIndex == null) return
    if (controlledIndex !== engine.activeIndex) {
      engine.goTo(controlledIndex, { reason: 'api', animated: false })
    }
  }, [controlledIndex, engine])

  useImperativeHandle(ref, () => ({
    scrollToIndex: (i, opts) => engine.goTo(i, { reason: 'api', animated: opts?.animated ?? true }),
    next: () => engine.next('api'),
    prev: () => engine.prev('api'),
    getIndex: () => engine.activeIndex,
  }), [engine])

  usePointerGestures({
    containerRef, engine,
    getIndex: () => engine.activeIndex,
    zones, holdDelay, disabled,
    onHoldStart, onHoldEnd, onTapZone,
  })
  useWheelNav({ containerRef, engine, disabled })
  useKeyboardNav({ containerRef, engine, total, disabled })

  const windowIndices = useWindowedRange(engine.activeIndex, total, overscan, loop)

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: '100dvh',
    touchAction: 'none',
    overscrollBehavior: 'contain',
    outline: 'none',
    // Dragging a slide should never select text or start an image/link ghost
    // drag. Inherited by all items; consumers can opt back in via itemStyle.
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    ...style,
  }

  const trackStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    willChange: 'transform',
    transform: `translateY(${-engine.activeIndex * 100}%)`,
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      tabIndex={disabled ? -1 : 0}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onDragStart={(e) => e.preventDefault()}
    >
      <div ref={trackRef} style={trackStyle}>
        {windowIndices.map((i) => {
          const item = data[i] as T
          return (
            <ItemRenderer<T>
              key={keyExtractor(item, i)}
              item={item}
              index={i}
              activeIndex={engine.activeIndex}
              isSnapping={engine.isSnapping}
              total={total}
              renderItem={renderItem}
              itemClassName={itemClassName}
              itemStyle={itemStyle}
              onItemEnter={onItemEnter}
              onItemLeave={onItemLeave}
            />
          )
        })}
      </div>
    </div>
  )
}

export const ShortFormView = forwardRef(ShortFormViewInner) as <T>(
  props: ShortFormViewProps<T> & { ref?: Ref<ShortFormHandle> },
) => ReactElement

export default ShortFormView
