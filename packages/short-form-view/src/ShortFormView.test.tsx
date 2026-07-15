import { describe, it, expect, vi } from 'vitest'
import { render, act, fireEvent, createEvent } from '@testing-library/react'
import { createRef } from 'react'
import { ShortFormView } from './ShortFormView'
import type { ItemState, ShortFormHandle, ShortFormViewProps } from './types'

interface Slide { id: string; label: string }

function mkData(n: number): Slide[] {
  return Array.from({ length: n }, (_, i) => ({ id: `s${i}`, label: `slide-${i}` }))
}

const renderItem = (s: Slide, st: ItemState) => (
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

function getCarousel(root: HTMLElement): HTMLElement {
  const carousel = root.querySelector('[aria-roledescription="carousel"]')
  if (!(carousel instanceof HTMLElement)) throw new Error('carousel not found')
  return carousel
}

function mockCarouselRect(el: HTMLElement) {
  el.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 320, height: 640, right: 320, bottom: 640, x: 0, y: 0, toJSON() {} } as DOMRect)
  Object.defineProperty(el, 'clientHeight', { value: 640, configurable: true })
}

function wheel(el: Element, dy: number, t: number) {
  const ev = createEvent.wheel(el, { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'deltaY', { value: dy, configurable: true })
  Object.defineProperty(ev, 'deltaMode', { value: 0, configurable: true })
  Object.defineProperty(ev, 'timeStamp', { value: t, configurable: true })
  fireEvent(el, ev)
}

describe('ShortFormView', () => {
  it('renders only the windowed items (active + overscan)', () => {
    const { queryByTestId } = renderView()
    expect(queryByTestId('slide-slide-0')).toBeInTheDocument()
    expect(queryByTestId('slide-slide-1')).toBeInTheDocument()
    expect(queryByTestId('slide-slide-2')).not.toBeInTheDocument()
  })

  it('positions wrapped loop neighbors next to the active item', () => {
    const { getByTestId } = renderView({
      loop: true,
      renderItem: (slide, state) => (
        <div
          data-testid={`loop-${slide.id}`}
          data-distance={state.distance}
          data-visible={state.isVisible}
        />
      ),
    })

    const wrappedPrevious = getByTestId('loop-s4')
    expect(wrappedPrevious.parentElement).toHaveStyle({ transform: 'translateY(-100%)' })
    expect(wrappedPrevious).toHaveAttribute('data-distance', '-1')
    expect(wrappedPrevious).toHaveAttribute('data-visible', 'true')
  })

  it('positions the first item after the last item at the loop boundary', () => {
    const { getByTestId } = renderView({
      initialIndex: 4,
      loop: true,
      renderItem: (slide, state) => (
        <div data-testid={`loop-${slide.id}`} data-distance={state.distance} />
      ),
    })

    const wrappedNext = getByTestId('loop-s0')
    expect(wrappedNext.parentElement).toHaveStyle({ transform: 'translateY(500%)' })
    expect(wrappedNext).toHaveAttribute('data-distance', '1')
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

  it('fires contextual end-reached events on initial load and data growth', () => {
    const onEndReached = vi.fn()
    const { rerender } = render(
      <ShortFormView<Slide>
        data={mkData(1)}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={1}
      />,
    )

    expect(onEndReached).toHaveBeenLastCalledWith({
      activeIndex: 0,
      total: 1,
      distanceFromEnd: 0,
    })

    rerender(
      <ShortFormView<Slide>
        data={mkData(2)}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
        onEndReached={onEndReached}
        onEndReachedThreshold={1}
      />,
    )

    expect(onEndReached).toHaveBeenCalledTimes(2)
    expect(onEndReached).toHaveBeenLastCalledWith({
      activeIndex: 0,
      total: 2,
      distanceFromEnd: 1,
    })
  })

  it('accepts readonly data collections', () => {
    const data: readonly Slide[] = mkData(2)
    const { getByTestId } = render(
      <ShortFormView<Slide>
        data={data}
        keyExtractor={(s) => s.id}
        renderItem={renderItem}
      />,
    )

    expect(getByTestId('slide-slide-0')).toBeInTheDocument()
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

  it('uses the controlled index on the first render', () => {
    const firstRender = vi.fn(renderItem)

    render(
      <ShortFormView<Slide>
        data={mkData(5)}
        initialIndex={0}
        index={3}
        keyExtractor={(s) => s.id}
        renderItem={firstRender}
      />,
    )

    expect(firstRender.mock.calls[0]?.[1].activeIndex).toBe(3)
    expect(firstRender.mock.calls.some(([, state]) => state.activeIndex === 0)).toBe(false)
  })

  it('disables text selection and prevents native drag on the container', () => {
    const { container: root } = renderView()
    const container = getCarousel(root)
    expect(container).toHaveStyle({ userSelect: 'none' })
    const dragEvent = createEvent.dragStart(container)
    fireEvent(container, dragEvent)
    expect(dragEvent.defaultPrevented).toBe(true)
  })

  it('can disable swipe navigation while leaving api navigation available', () => {
    const ref = createRef<ShortFormHandle>()
    const { container: root, getByTestId } = renderView({ swipeEnabled: false }, ref)
    const carousel = getCarousel(root)
    mockCarouselRect(carousel)

    fireEvent.pointerDown(carousel, { clientX: 160, clientY: 500, pointerId: 1 })
    fireEvent.pointerMove(carousel, { clientX: 160, clientY: 120, pointerId: 1 })
    fireEvent.pointerUp(carousel, { clientX: 160, clientY: 120, pointerId: 1 })
    expect(getByTestId('slide-slide-0').getAttribute('data-active')).toBe('true')

    act(() => ref.current!.next())
    expect(getByTestId('slide-slide-1').getAttribute('data-active')).toBe('true')
  })

  it('can disable wheel navigation', () => {
    const { container: root, getByTestId } = renderView({ wheelEnabled: false })
    const carousel = getCarousel(root)
    wheel(carousel, 120, 0)
    expect(getByTestId('slide-slide-0').getAttribute('data-active')).toBe('true')
  })

  it('can disable keyboard navigation and remove the focus target', () => {
    const { container: root, getByTestId } = renderView({ keyboardEnabled: false })
    const carousel = getCarousel(root)
    fireEvent.keyDown(carousel, { key: 'ArrowDown' })
    expect(getByTestId('slide-slide-0').getAttribute('data-active')).toBe('true')
    expect(carousel.tabIndex).toBe(-1)
  })

  it('keeps touch-action none when swipe is off but hold/tap remain active', () => {
    const { container: root } = renderView({ swipeEnabled: false })
    expect(getCarousel(root).style.touchAction).toBe('none')
  })

  it('releases touch-action to the browser only when every pointer gesture is off', () => {
    const { container: root } = renderView({
      swipeEnabled: false,
      holdEnabled: false,
      tapZonesEnabled: false,
    })
    expect(getCarousel(root).style.touchAction).toBe('auto')
  })
})
