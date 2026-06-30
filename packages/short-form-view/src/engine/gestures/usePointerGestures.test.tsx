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
    onHoldStart: props.onHoldStart,
    onHoldEnd: props.onHoldEnd,
    onTapZone: props.onTapZone,
  })
  return <div ref={ref} data-testid="c" style={{ width: 300, height: 600 }} />
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
})
