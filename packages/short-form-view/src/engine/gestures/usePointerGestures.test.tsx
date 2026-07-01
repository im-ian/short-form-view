import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { usePointerGestures } from './usePointerGestures'

function Harness(props: any) {
  const ref = useRef<HTMLDivElement>(null)
  usePointerGestures({
    containerRef: ref,
    engine: { beginDrag: props.beginDrag, dragBy: props.dragBy, endDrag: props.endDrag },
    getIndex: () => 0,
    zones: { left: 0.33, right: 0.33 },
    holdDelay: 250,
    disabled: false,
    swipeEnabled: props.swipeEnabled ?? true,
    holdEnabled: props.holdEnabled ?? true,
    tapZonesEnabled: props.tapZonesEnabled ?? true,
    ignoreInteractiveElements: props.ignoreInteractiveElements ?? true,
    onHoldStart: props.onHoldStart,
    onHoldEnd: props.onHoldEnd,
    onTapZone: props.onTapZone,
  })
  return (
    <div ref={ref} data-testid="c" style={{ width: 300, height: 600 }}>
      <button data-testid="button">Action</button>
      <div data-testid="ignore" data-sfv-ignore-gesture />
    </div>
  )
}

function mockRect(el: HTMLElement) {
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 600, right: 300, bottom: 600, x: 0, y: 0, toJSON() {} } as DOMRect)
}

describe('usePointerGestures', () => {
  it('treats a vertical move past slop as a drag and commits on up', () => {
    const beginDrag = vi.fn(), dragBy = vi.fn(), endDrag = vi.fn()
    const { getByTestId } = render(
      <Harness beginDrag={beginDrag} dragBy={dragBy} endDrag={endDrag} />,
    )
    const c = getByTestId('c'); mockRect(c)
    fireEvent.pointerDown(c, { clientX: 150, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(c, { clientX: 150, clientY: 380, pointerId: 1 })
    fireEvent.pointerMove(c, { clientX: 150, clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(c, { clientX: 150, clientY: 300, pointerId: 1 })
    expect(beginDrag).toHaveBeenCalledTimes(1)
    expect(dragBy).toHaveBeenCalled()
    expect(endDrag).toHaveBeenCalledTimes(1)
    const delta = endDrag.mock.calls[0]?.[0]
    expect(delta).toBe(-100) // 300 - 400
  })

  it('treats a stationary press+release as a tap with the correct zone', () => {
    const onTapZone = vi.fn()
    const { getByTestId } = render(
      <Harness beginDrag={vi.fn()} dragBy={vi.fn()} endDrag={vi.fn()} onTapZone={onTapZone} />,
    )
    const c = getByTestId('c'); mockRect(c)
    fireEvent.pointerDown(c, { clientX: 20, clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(c, { clientX: 20, clientY: 300, pointerId: 1 })
    expect(onTapZone).toHaveBeenCalledWith({ side: 'left', index: 0 })
  })

  it('does not start a drag from native interactive elements by default', () => {
    const beginDrag = vi.fn(), dragBy = vi.fn(), endDrag = vi.fn()
    const { getByTestId } = render(
      <Harness beginDrag={beginDrag} dragBy={dragBy} endDrag={endDrag} />,
    )
    const c = getByTestId('c'); mockRect(c)
    const button = getByTestId('button')
    fireEvent.pointerDown(button, { clientX: 150, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(button, { clientX: 150, clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(button, { clientX: 150, clientY: 300, pointerId: 1 })
    expect(beginDrag).not.toHaveBeenCalled()
    expect(dragBy).not.toHaveBeenCalled()
    expect(endDrag).not.toHaveBeenCalled()
  })

  it('allows native interactive elements to start drags when configured', () => {
    const beginDrag = vi.fn(), dragBy = vi.fn(), endDrag = vi.fn()
    const { getByTestId } = render(
      <Harness
        beginDrag={beginDrag}
        dragBy={dragBy}
        endDrag={endDrag}
        ignoreInteractiveElements={false}
      />,
    )
    const c = getByTestId('c'); mockRect(c)
    const button = getByTestId('button')
    fireEvent.pointerDown(button, { clientX: 150, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(button, { clientX: 150, clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(button, { clientX: 150, clientY: 300, pointerId: 1 })
    expect(beginDrag).toHaveBeenCalledTimes(1)
    expect(endDrag).toHaveBeenCalledTimes(1)
  })

  it('always ignores elements marked with data-sfv-ignore-gesture', () => {
    const beginDrag = vi.fn(), dragBy = vi.fn(), endDrag = vi.fn()
    const { getByTestId } = render(
      <Harness
        beginDrag={beginDrag}
        dragBy={dragBy}
        endDrag={endDrag}
        ignoreInteractiveElements={false}
      />,
    )
    const c = getByTestId('c'); mockRect(c)
    const ignore = getByTestId('ignore')
    fireEvent.pointerDown(ignore, { clientX: 150, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(ignore, { clientX: 150, clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(ignore, { clientX: 150, clientY: 300, pointerId: 1 })
    expect(beginDrag).not.toHaveBeenCalled()
    expect(dragBy).not.toHaveBeenCalled()
    expect(endDrag).not.toHaveBeenCalled()
  })

  it('can disable swipe drags while keeping tap zones active', () => {
    const beginDrag = vi.fn(), dragBy = vi.fn(), endDrag = vi.fn(), onTapZone = vi.fn()
    const { getByTestId } = render(
      <Harness
        beginDrag={beginDrag}
        dragBy={dragBy}
        endDrag={endDrag}
        onTapZone={onTapZone}
        swipeEnabled={false}
      />,
    )
    const c = getByTestId('c'); mockRect(c)

    fireEvent.pointerDown(c, { clientX: 150, clientY: 400, pointerId: 1 })
    fireEvent.pointerMove(c, { clientX: 150, clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(c, { clientX: 150, clientY: 300, pointerId: 1 })

    expect(beginDrag).not.toHaveBeenCalled()
    expect(dragBy).not.toHaveBeenCalled()
    expect(endDrag).not.toHaveBeenCalled()

    fireEvent.pointerDown(c, { clientX: 280, clientY: 300, pointerId: 2 })
    fireEvent.pointerUp(c, { clientX: 280, clientY: 300, pointerId: 2 })

    expect(onTapZone).toHaveBeenCalledWith({ side: 'right', index: 0 })
  })

  it('can disable hold and tap callbacks independently', () => {
    vi.useFakeTimers()
    try {
      const onHoldStart = vi.fn(), onTapZone = vi.fn()
      const { getByTestId } = render(
        <Harness
          beginDrag={vi.fn()}
          dragBy={vi.fn()}
          endDrag={vi.fn()}
          onHoldStart={onHoldStart}
          onTapZone={onTapZone}
          holdEnabled={false}
          tapZonesEnabled={false}
        />,
      )
      const c = getByTestId('c'); mockRect(c)

      fireEvent.pointerDown(c, { clientX: 150, clientY: 300, pointerId: 1 })
      vi.advanceTimersByTime(300)
      fireEvent.pointerUp(c, { clientX: 150, clientY: 300, pointerId: 1 })

      expect(onHoldStart).not.toHaveBeenCalled()
      expect(onTapZone).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not fire a hold that was disabled mid-press', () => {
    vi.useFakeTimers()
    try {
      const onHoldStart = vi.fn()
      const { getByTestId, rerender } = render(
        <Harness beginDrag={vi.fn()} dragBy={vi.fn()} endDrag={vi.fn()} onHoldStart={onHoldStart} holdEnabled />,
      )
      const c = getByTestId('c'); mockRect(c)

      fireEvent.pointerDown(c, { clientX: 150, clientY: 300, pointerId: 1 })
      rerender(
        <Harness beginDrag={vi.fn()} dragBy={vi.fn()} endDrag={vi.fn()} onHoldStart={onHoldStart} holdEnabled={false} />,
      )
      vi.advanceTimersByTime(300)

      expect(onHoldStart).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('ignores a second pointer while the first is still active', () => {
    vi.useFakeTimers()
    try {
      const onHoldStart = vi.fn(), onHoldEnd = vi.fn()
      const { getByTestId } = render(
        <Harness beginDrag={vi.fn()} dragBy={vi.fn()} endDrag={vi.fn()} onHoldStart={onHoldStart} onHoldEnd={onHoldEnd} />,
      )
      const c = getByTestId('c'); mockRect(c)

      fireEvent.pointerDown(c, { clientX: 150, clientY: 300, pointerId: 1 })
      vi.advanceTimersByTime(300)
      expect(onHoldStart).toHaveBeenCalledTimes(1)

      // A second finger must not reset the first pointer's hold state.
      fireEvent.pointerDown(c, { clientX: 150, clientY: 300, pointerId: 2 })
      fireEvent.pointerUp(c, { clientX: 150, clientY: 300, pointerId: 1 })

      expect(onHoldEnd).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
