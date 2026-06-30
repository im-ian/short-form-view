import { describe, it, expect, vi } from 'vitest'
import { render, act, fireEvent, createEvent } from '@testing-library/react'
import { createRef } from 'react'
import { ShortFormView } from './ShortFormView'
import type { ShortFormHandle, ShortFormViewProps } from './types'

interface Slide { id: string; label: string }

function mkData(n: number): Slide[] {
  return Array.from({ length: n }, (_, i) => ({ id: `s${i}`, label: `slide-${i}` }))
}

const renderItem = (s: Slide, st: { isActive: boolean }) => (
  <div data-testid={`slide-${s.label}`} data-active={st.isActive}>{s.label}</div>
)

function renderView(extra: Partial<ShortFormViewProps<Slide>> = {}, ref?: React.Ref<ShortFormHandle>) {
  return render(
    <ShortFormView<Slide>
      ref={ref}
      data={extra.data ?? mkData(5)}
      keyExtractor={(s) => s.id}
      renderItem={renderItem}
      overscan={1}
      {...extra}
    />,
  )
}

describe('ShortFormView', () => {
  it('renders only the windowed items (active + overscan)', () => {
    const { queryByTestId } = renderView()
    expect(queryByTestId('slide-slide-0')).toBeInTheDocument()
    expect(queryByTestId('slide-slide-1')).toBeInTheDocument()
    expect(queryByTestId('slide-slide-2')).not.toBeInTheDocument()
  })

  it('marks only the active item active', () => {
    const { getByTestId } = renderView()
    expect(getByTestId('slide-slide-0').getAttribute('data-active')).toBe('true')
    expect(getByTestId('slide-slide-1').getAttribute('data-active')).toBe('false')
  })

  it('navigates via the imperative handle', () => {
    const ref = createRef<ShortFormHandle>()
    const { getByTestId } = renderView({}, ref)
    act(() => ref.current!.next())
    expect(getByTestId('slide-slide-1').getAttribute('data-active')).toBe('true')
    expect(ref.current!.getIndex()).toBe(1)
  })

  it('keeps the active index when data grows (append)', () => {
    const ref = createRef<ShortFormHandle>()
    const { rerender, getByTestId } = render(
      <ShortFormView<Slide> ref={ref} data={mkData(3)} keyExtractor={(s) => s.id} renderItem={renderItem} />,
    )
    act(() => ref.current!.scrollToIndex(2, { animated: false }))
    expect(ref.current!.getIndex()).toBe(2)
    rerender(
      <ShortFormView<Slide> ref={ref} data={mkData(6)} keyExtractor={(s) => s.id} renderItem={renderItem} />,
    )
    expect(ref.current!.getIndex()).toBe(2)
    expect(getByTestId('slide-slide-2').getAttribute('data-active')).toBe('true')
  })

  it('preserves the active item by key when data is prepended', () => {
    const ref = createRef<ShortFormHandle>()
    const onIndexChange = vi.fn()
    const base = mkData(3)
    const { rerender, getByTestId } = render(
      <ShortFormView<Slide>
        ref={ref}
        data={base}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        preserveActiveItemOnDataChange
        onIndexChange={onIndexChange}
      />,
    )

    act(() => ref.current!.scrollToIndex(1, { animated: false }))
    expect(getByTestId('slide-slide-1').getAttribute('data-active')).toBe('true')
    onIndexChange.mockClear()

    rerender(
      <ShortFormView<Slide>
        ref={ref}
        data={[{ id: 's-new', label: 'slide-new' }, ...base]}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        preserveActiveItemOnDataChange
        onIndexChange={onIndexChange}
      />,
    )

    expect(ref.current!.getIndex()).toBe(2)
    expect(getByTestId('slide-slide-1').getAttribute('data-active')).toBe('true')
    expect(onIndexChange).toHaveBeenCalledWith(2, { reason: 'data' })
  })

  it('adds slide accessibility metadata to item wrappers', () => {
    const { getByTestId } = renderView({
      getItemAriaLabel: (index, item, total) => `${item.label} (${index + 1}/${total})`,
    })
    const activeWrapper = getByTestId('slide-slide-0').parentElement
    const inactiveWrapper = getByTestId('slide-slide-1').parentElement

    expect(activeWrapper).toHaveAttribute('role', 'group')
    expect(activeWrapper).toHaveAttribute('aria-roledescription', 'slide')
    expect(activeWrapper).toHaveAttribute('aria-label', 'slide-0 (1/5)')
    expect(activeWrapper).toHaveAttribute('aria-current', 'true')
    expect(activeWrapper).toHaveAttribute('aria-hidden', 'false')
    expect(inactiveWrapper).not.toHaveAttribute('aria-current')
    expect(inactiveWrapper).toHaveAttribute('aria-hidden', 'true')
  })

  it('fires prefetch hints for nearby unseen items', () => {
    const onPrefetch = vi.fn()
    const ref = createRef<ShortFormHandle>()
    renderView({ onPrefetch }, ref)

    expect(onPrefetch).toHaveBeenCalledTimes(1)
    expect(onPrefetch).toHaveBeenCalledWith(
      expect.objectContaining({ index: 1, activeIndex: 0, distance: 1 }),
    )

    onPrefetch.mockClear()
    act(() => ref.current!.next())

    expect(onPrefetch).toHaveBeenCalledTimes(1)
    expect(onPrefetch).toHaveBeenCalledWith(
      expect.objectContaining({ index: 2, activeIndex: 1, distance: 1 }),
    )
  })

  it('fires onEndReached as it nears the end', () => {
    const onEndReached = vi.fn()
    const ref = createRef<ShortFormHandle>()
    renderView({ onEndReached, onEndReachedThreshold: 1 }, ref)
    act(() => ref.current!.scrollToIndex(3, { animated: false })) // total 5, 5-1-1=3 -> fires
    expect(onEndReached).toHaveBeenCalled()
  })

  it('respects controlled index prop', () => {
    const { getByTestId, rerender } = render(
      <ShortFormView<Slide> data={mkData(5)} index={0} keyExtractor={(s) => s.id} renderItem={renderItem} />,
    )
    rerender(
      <ShortFormView<Slide> data={mkData(5)} index={2} keyExtractor={(s) => s.id} renderItem={renderItem} />,
    )
    expect(getByTestId('slide-slide-2').getAttribute('data-active')).toBe('true')
  })

  it('disables text selection and prevents native drag on the container', () => {
    const { container: root } = renderView()
    const container = root.querySelector('[aria-roledescription="carousel"]')
    expect(container).not.toBeNull()
    expect(container).toHaveStyle({ userSelect: 'none' })
    const dragEvent = createEvent.dragStart(container as Element)
    fireEvent(container as Element, dragEvent)
    expect(dragEvent.defaultPrevented).toBe(true)
  })
})
