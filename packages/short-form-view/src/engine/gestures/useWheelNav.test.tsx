import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { useWheelNav } from './useWheelNav'

function Harness({ next, prev }: { next: () => void; prev: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useWheelNav({ containerRef: ref, engine: { next, prev }, disabled: false })
  return <div ref={ref} data-testid="c" />
}

describe('useWheelNav', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('advances once per wheel gesture despite a long momentum tail', () => {
    const next = vi.fn()
    const prev = vi.fn()
    const { getByTestId } = render(<Harness next={next} prev={prev} />)
    const c = getByTestId('c')
    // One flick: many momentum events close together (16ms apart).
    for (let i = 0; i < 10; i++) {
      fireEvent.wheel(c, { deltaY: 40 })
      vi.advanceTimersByTime(16)
    }
    expect(next).toHaveBeenCalledTimes(1)
    expect(prev).not.toHaveBeenCalled()
  })

  it('allows another step only after the gesture goes idle', () => {
    const next = vi.fn()
    const prev = vi.fn()
    const { getByTestId } = render(<Harness next={next} prev={prev} />)
    const c = getByTestId('c')
    fireEvent.wheel(c, { deltaY: 60 })
    expect(next).toHaveBeenCalledTimes(1)
    // Still within the same gesture window -> ignored.
    fireEvent.wheel(c, { deltaY: 60 })
    expect(next).toHaveBeenCalledTimes(1)
    // Idle gap -> gesture ends -> next flick steps again.
    vi.advanceTimersByTime(200)
    fireEvent.wheel(c, { deltaY: 60 })
    expect(next).toHaveBeenCalledTimes(2)
  })

  it('goes to the previous item on negative deltaY', () => {
    const next = vi.fn()
    const prev = vi.fn()
    const { getByTestId } = render(<Harness next={next} prev={prev} />)
    fireEvent.wheel(getByTestId('c'), { deltaY: -60 })
    expect(prev).toHaveBeenCalledTimes(1)
    expect(next).not.toHaveBeenCalled()
  })
})
