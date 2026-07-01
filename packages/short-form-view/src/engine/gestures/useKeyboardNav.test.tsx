import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { useKeyboardNav } from './useKeyboardNav'

function Harness({ next, prev, goTo, total, disabled = false }: any) {
  const ref = useRef<HTMLDivElement>(null)
  useKeyboardNav({ containerRef: ref, engine: { next, prev, goTo }, total, disabled })
  return <div ref={ref} tabIndex={0} data-testid="c" />
}

describe('useKeyboardNav', () => {
  it('ArrowDown calls next, ArrowUp calls prev', () => {
    const next = vi.fn(), prev = vi.fn(), goTo = vi.fn()
    const { getByTestId } = render(<Harness next={next} prev={prev} goTo={goTo} total={5} />)
    fireEvent.keyDown(getByTestId('c'), { key: 'ArrowDown' })
    fireEvent.keyDown(getByTestId('c'), { key: 'ArrowUp' })
    expect(next).toHaveBeenCalledWith('key')
    expect(prev).toHaveBeenCalledWith('key')
  })
  it('Home goes to 0, End goes to last', () => {
    const next = vi.fn(), prev = vi.fn(), goTo = vi.fn()
    const { getByTestId } = render(<Harness next={next} prev={prev} goTo={goTo} total={5} />)
    fireEvent.keyDown(getByTestId('c'), { key: 'Home' })
    fireEvent.keyDown(getByTestId('c'), { key: 'End' })
    expect(goTo).toHaveBeenCalledWith(0, { reason: 'key' })
    expect(goTo).toHaveBeenCalledWith(4, { reason: 'key' })
  })
  it('does not bind keyboard navigation when disabled', () => {
    const next = vi.fn(), prev = vi.fn(), goTo = vi.fn()
    const { getByTestId } = render(<Harness next={next} prev={prev} goTo={goTo} total={5} disabled />)
    fireEvent.keyDown(getByTestId('c'), { key: 'ArrowDown' })
    fireEvent.keyDown(getByTestId('c'), { key: 'End' })
    expect(next).not.toHaveBeenCalled()
    expect(prev).not.toHaveBeenCalled()
    expect(goTo).not.toHaveBeenCalled()
  })
})
