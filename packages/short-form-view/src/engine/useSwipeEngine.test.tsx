import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { useRef } from 'react'
import { useSwipeEngine } from './useSwipeEngine'
import type { SwipeEvent } from '../types'

function setupHeight(el: HTMLElement | null, h: number) {
  if (el) Object.defineProperty(el, 'clientHeight', { configurable: true, value: h })
}

function Harness(props: {
  total: number
  onSwiped?: (e: SwipeEvent) => void
  onIndexChange?: (i: number, meta: { reason: string }) => void
  onEndReached?: () => void
  apiRef?: (api: ReturnType<typeof useSwipeEngine>) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const engine = useSwipeEngine({
    total: props.total,
    containerRef,
    trackRef,
    initialIndex: 0,
    loop: false,
    disabled: false,
    threshold: 0.2,
    thresholdUnit: 'fraction',
    velocityThreshold: 0.3,
    resistance: 0.3,
    transitionDuration: 0,
    easing: 'linear',
    reducedMotion: true,
    onIndexChange: (i, meta) => props.onIndexChange?.(i, meta),
    onSwiped: props.onSwiped,
    onEndReached: props.onEndReached,
    onEndReachedThreshold: 1,
  })
  props.apiRef?.(engine)
  return (
    <div ref={containerRef} data-testid="container">
      <div ref={trackRef} data-testid="track">{engine.activeIndex}</div>
    </div>
  )
}

describe('useSwipeEngine', () => {
  it('advances with next() and fires onIndexChange', () => {
    const onIndexChange = vi.fn()
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(
      <Harness total={5} onIndexChange={onIndexChange} apiRef={(a) => (api = a)} />,
    )
    setupHeight(getByTestId('container'), 800)
    act(() => api.next('key'))
    expect(getByTestId('track').textContent).toBe('1')
    expect(onIndexChange).toHaveBeenCalledWith(1, { reason: 'key' })
  })

  it('commits a swipe past the threshold and reports direction up', () => {
    const onSwiped = vi.fn()
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(
      <Harness total={5} onSwiped={onSwiped} apiRef={(a) => (api = a)} />,
    )
    setupHeight(getByTestId('container'), 800)
    act(() => {
      api.beginDrag()
      api.dragBy(-300)
      api.endDrag(-300, 0) // 300 > 0.2*800=160 -> commit next
    })
    expect(getByTestId('track').textContent).toBe('1')
    expect(onSwiped).toHaveBeenCalledWith(
      expect.objectContaining({ from: 0, to: 1, direction: 'up' }),
    )
  })

  it('snaps back when below threshold (no index change)', () => {
    const onIndexChange = vi.fn()
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(
      <Harness total={5} onIndexChange={onIndexChange} apiRef={(a) => (api = a)} />,
    )
    setupHeight(getByTestId('container'), 800)
    act(() => {
      api.beginDrag()
      api.dragBy(-50)
      api.endDrag(-50, 0) // 50 < 160 -> snap back
    })
    expect(getByTestId('track').textContent).toBe('0')
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  it('does not advance past the last index without loop', () => {
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(<Harness total={2} apiRef={(a) => (api = a)} />)
    setupHeight(getByTestId('container'), 800)
    act(() => api.next('key'))
    act(() => api.next('key'))
    expect(getByTestId('track').textContent).toBe('1')
  })

  it('fires onEndReached when near the end', () => {
    const onEndReached = vi.fn()
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(
      <Harness total={3} onEndReached={onEndReached} apiRef={(a) => (api = a)} />,
    )
    setupHeight(getByTestId('container'), 800)
    act(() => api.next('key')) // index 1, total-1-threshold = 3-1-1 = 1 -> fires
    expect(onEndReached).toHaveBeenCalledTimes(1)
  })
})
