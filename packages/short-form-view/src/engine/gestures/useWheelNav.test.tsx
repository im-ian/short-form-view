import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useRef } from 'react'
import { useWheelNav } from './useWheelNav'

function Harness({ next, prev }: { next: () => void; prev: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  useWheelNav({ containerRef: ref, engine: { next, prev }, disabled: false })
  return <div ref={ref} data-testid="c" />
}

// Dispatch a wheel event with a fully controlled timeStamp, deltaY and
// deltaMode so gesture timing is deterministic (the handler reads e.timeStamp).
function wheel(el: Element, dy: number, t: number, mode = 0) {
  const ev = new WheelEvent('wheel', { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'deltaY', { value: dy, configurable: true })
  Object.defineProperty(ev, 'deltaMode', { value: mode, configurable: true })
  Object.defineProperty(ev, 'timeStamp', { value: t, configurable: true })
  el.dispatchEvent(ev)
}

function setup() {
  const next = vi.fn()
  const prev = vi.fn()
  const { getByTestId } = render(<Harness next={next} prev={prev} />)
  return { el: getByTestId('c'), next, prev }
}

describe('useWheelNav', () => {
  it('one notch advances exactly once', () => {
    const { el, next } = setup()
    wheel(el, 120, 0)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('separated notches each advance', () => {
    const { el, next } = setup()
    wheel(el, 120, 0)
    wheel(el, 120, 90)
    wheel(el, 120, 180)
    expect(next).toHaveBeenCalledTimes(3)
  })

  it('does not get stuck: a fresh notch past the gap steps again', () => {
    const { el, next } = setup()
    wheel(el, 120, 0)
    wheel(el, 120, 61)
    expect(next).toHaveBeenCalledTimes(2)
  })

  it('a second event exactly at the gap boundary does not step', () => {
    const { el, next } = setup()
    wheel(el, 120, 0)
    wheel(el, 120, 60)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('collapses a trackpad inertial flick to one step', () => {
    const { el, next } = setup()
    const seq: [number, number][] = [
      [0, 42], [16, 36], [32, 28], [48, 21], [64, 15], [80, 10], [120, 6], [180, 3], [260, 1],
    ]
    for (const [t, dy] of seq) wheel(el, dy, t)
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('ignores sub-threshold reverse noise during a flick (no double-step)', () => {
    const { el, next, prev } = setup()
    wheel(el, 80, 0)
    wheel(el, -1, 16)
    wheel(el, 80, 32)
    expect(next).toHaveBeenCalledTimes(1)
    expect(prev).not.toHaveBeenCalled()
  })

  it('a deliberate strong reverse advances backward', () => {
    const { el, next, prev } = setup()
    wheel(el, 80, 0)
    wheel(el, -80, 40)
    expect(next).toHaveBeenCalledTimes(1)
    expect(prev).toHaveBeenCalledTimes(1)
  })

  it('a continuous never-idle stream keeps advancing', () => {
    const { el, next } = setup()
    for (let t = 0; t <= 1200; t += 40) wheel(el, 80, t)
    expect(next).toHaveBeenCalledTimes(3)
  })

  it('a long strong inertia tail advances at most twice', () => {
    const { el, next } = setup()
    for (let t = 0; t <= 520; t += 16) wheel(el, 50, t)
    for (let t = 540; t <= 900; t += 40) wheel(el, 8, t)
    expect(next.mock.calls.length).toBeGreaterThanOrEqual(1)
    expect(next.mock.calls.length).toBeLessThanOrEqual(2)
  })

  it('ignores pure noise below the step threshold', () => {
    const { el, next, prev } = setup()
    wheel(el, 0.2, 0)
    wheel(el, 0.4, 10)
    expect(next).not.toHaveBeenCalled()
    expect(prev).not.toHaveBeenCalled()
  })

  it('normalizes line-mode wheel (Firefox) so it still steps', () => {
    const { el, next } = setup()
    wheel(el, 3, 0, 1) // deltaMode 1 -> 3 * 16 = 48 >= 16
    expect(next).toHaveBeenCalledTimes(1)
  })

  it('negative delta goes to the previous item', () => {
    const { el, prev } = setup()
    wheel(el, -120, 0)
    expect(prev).toHaveBeenCalledTimes(1)
  })
})
