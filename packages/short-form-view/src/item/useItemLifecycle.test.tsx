import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useItemLifecycle } from './useItemLifecycle'

function Probe({ isActive, onEnter, onLeave }: any) {
  useItemLifecycle(isActive, 2, { id: 'x' }, onEnter, onLeave)
  return null
}

describe('useItemLifecycle', () => {
  it('fires enter when it becomes active, leave when it stops', () => {
    const onEnter = vi.fn(), onLeave = vi.fn()
    const { rerender } = render(<Probe isActive={false} onEnter={onEnter} onLeave={onLeave} />)
    expect(onEnter).not.toHaveBeenCalled()
    rerender(<Probe isActive={true} onEnter={onEnter} onLeave={onLeave} />)
    expect(onEnter).toHaveBeenCalledWith(2, { id: 'x' })
    rerender(<Probe isActive={false} onEnter={onEnter} onLeave={onLeave} />)
    expect(onLeave).toHaveBeenCalledWith(2, { id: 'x' })
  })

  it('fires leave on unmount while active', () => {
    const onLeave = vi.fn()
    const { unmount } = render(<Probe isActive={true} onEnter={vi.fn()} onLeave={onLeave} />)
    unmount()
    expect(onLeave).toHaveBeenCalledWith(2, { id: 'x' })
  })
})
