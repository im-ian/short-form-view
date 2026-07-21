'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { CSSProperties, ForwardedRef, ReactElement, Ref } from 'react'
import type { ShortFormHandle, ShortFormViewProps } from './types'
import { useSwipeEngine } from './engine/useSwipeEngine'
import { usePointerGestures } from './engine/gestures/usePointerGestures'
import { useWheelNav } from './engine/gestures/useWheelNav'
import { useKeyboardNav } from './engine/gestures/useKeyboardNav'
import { useWindowedRange } from './virtualization/useWindowedRange'
import { ItemRenderer } from './item/ItemRenderer'
import { usePrefetch } from './item/usePrefetch'
import { usePrefersReducedMotion } from './ssr/usePrefersReducedMotion'
import { useIsomorphicLayoutEffect } from './ssr/useIsomorphicLayoutEffect'
import { clampIndex, wrapIndex } from './engine/math'

function ShortFormViewInner<T>(props: ShortFormViewProps<T>, ref: ForwardedRef<ShortFormHandle>) {
  const {
    data, renderItem, keyExtractor,
    initialIndex = 0,
    index: controlledIndex,
    onIndexChange, onSwiped, preserveActiveItemOnDataChange = false,
    threshold = 0.2, thresholdUnit = 'fraction',
    velocityThreshold = 0.3, resistance = 0.3,
    loop = false, disabled = false,
    swipeEnabled = true, wheelEnabled = true, keyboardEnabled = true,
    ignoreInteractiveElements = true, holdEnabled = true, tapZonesEnabled = true,
    transitionDuration = 300, easing = 'cubic-bezier(.16,1,.3,1)',
    overscan = 1, prefetchRange = 1, onPrefetch, onEndReached, onEndReachedThreshold = 2,
    onItemEnter, onItemLeave,
    onHoldStart, onHoldEnd, onTapZone,
    holdDelay = 250, zones = { left: 0.33, right: 0.33 },
    className, style, itemClassName, itemStyle, ariaLabel, getItemAriaLabel,
  } = props

  const total = data.length
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const activeKeyRef = useRef<string | number | null>(null)
  const committedIndexRef = useRef(0)
  const previousDataRef = useRef(data)
  const reducedMotion = usePrefersReducedMotion()

  const engine = useSwipeEngine({
    total, containerRef, trackRef,
    initialIndex, controlledIndex,
    loop, disabled,
    threshold, thresholdUnit, velocityThreshold, resistance,
    transitionDuration, easing, reducedMotion,
    onIndexChange, onSwiped, onEndReached, onEndReachedThreshold,
  })

  // Resolve data and controlled-index changes for this render, before item
  // lifecycle and prefetch effects can observe an outdated active index. The
  // engine is synchronized in the layout effect below, before browser paint.
  const dataChanged = previousDataRef.current !== data
  const clampedActiveIndex = clampIndex(engine.activeIndex, Math.max(total, 1))
  let renderedActiveIndex = clampedActiveIndex
  let syncReason: 'api' | 'data' = 'data'

  if (total > 0) {
    const controlledChanged = controlledIndex != null && controlledIndex !== engine.activeIndex

    if (controlledChanged) {
      renderedActiveIndex = loop
        ? wrapIndex(controlledIndex, total)
        : clampIndex(controlledIndex, total)
      syncReason = 'api'
    } else if (dataChanged && preserveActiveItemOnDataChange) {
      // If navigation and a data update were batched together, preserve the
      // item at the newly requested index from the previous collection. For a
      // data-only update, preserve the item that was active at the last commit.
      let keyToPreserve = activeKeyRef.current
      if (engine.activeIndex !== committedIndexRef.current) {
        const navigatedItem = previousDataRef.current[engine.activeIndex]
        if (navigatedItem != null) {
          keyToPreserve = keyExtractor(navigatedItem, engine.activeIndex)
        }
      }

      if (keyToPreserve != null) {
        const preservedIndex = data.findIndex((item, i) => keyExtractor(item, i) === keyToPreserve)
        if (preservedIndex >= 0) renderedActiveIndex = preservedIndex
      }
    }
  }

  useIsomorphicLayoutEffect(() => {
    previousDataRef.current = data

    if (total <= 0) {
      activeKeyRef.current = null
      committedIndexRef.current = 0
      return
    }

    activeKeyRef.current = keyExtractor(
      data[renderedActiveIndex] as T,
      renderedActiveIndex,
    )
    committedIndexRef.current = renderedActiveIndex

    if (renderedActiveIndex !== engine.activeIndex) {
      engine.goTo(renderedActiveIndex, { reason: syncReason, animated: false })
    }
  }, [
    data,
    engine.activeIndex,
    engine.goTo,
    keyExtractor,
    renderedActiveIndex,
    syncReason,
    total,
  ])

  useImperativeHandle(ref, () => ({
    scrollToIndex: (i, opts) => engine.goTo(i, { reason: 'api', animated: opts?.animated ?? true }),
    next: () => engine.next('api'),
    prev: () => engine.prev('api'),
    getIndex: () => engine.activeIndex,
  }), [engine])

  usePointerGestures({
    containerRef, engine,
    getIndex: () => renderedActiveIndex,
    zones, holdDelay, disabled,
    swipeEnabled, holdEnabled, tapZonesEnabled, ignoreInteractiveElements,
    onHoldStart, onHoldEnd, onTapZone,
  })
  useWheelNav({ containerRef, engine, disabled: disabled || !wheelEnabled })
  useKeyboardNav({ containerRef, engine, total, disabled: disabled || !keyboardEnabled })
  usePrefetch({
    data,
    activeIndex: renderedActiveIndex,
    loop,
    range: prefetchRange,
    keyExtractor,
    onPrefetch,
  })

  const windowIndices = useWindowedRange(renderedActiveIndex, total, overscan, loop)

  // Let the browser claim native touch scrolling only when we handle no pointer
  // gesture at all; with swipe off but hold/tap on, 'none' keeps them reliable.
  const pointerInert = disabled || (!swipeEnabled && !holdEnabled && !tapZonesEnabled)

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: '100dvh',
    touchAction: pointerInert ? 'auto' : 'none',
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
    transform: `translateY(${-renderedActiveIndex * 100}%)`,
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      tabIndex={disabled || !keyboardEnabled ? -1 : 0}
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
              activeIndex={renderedActiveIndex}
              isSnapping={engine.isSnapping}
              total={total}
              loop={loop}
              renderItem={renderItem}
              itemClassName={itemClassName}
              itemStyle={itemStyle}
              getItemAriaLabel={getItemAriaLabel}
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
