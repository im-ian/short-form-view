# short-form-view — Design Spec

**Date:** 2026-06-30
**Status:** Approved (design), pending implementation plan

## 1. Goal

A React library that renders an Instagram Reels / TikTok-style vertical swipe pager. The consumer supplies any View per slot — a video, a custom HTML view (e.g. a 2×2 ad grid), a video ad with a bottom banner, anything. The library's job is to connect arbitrary views into a smooth, swipeable, full-viewport feed. It is **not** a video player; it is a view connector. Mixed feeds with no constraint on content type are a first-class use case, e.g.:

```
video · video · video · ad(2×2 HTML grid) · video · video · video · ad(video + bottom banner) · …
```

It must work in Next.js (App Router) pages with SSR, expose a configurable swipe threshold, support rich interaction callbacks (swipe, lifecycle, press-and-hold zones), and stay performant via virtualization and minimal re-renders. Dynamic list growth (appending items from an API mid-scroll) must not disrupt rendering or the current position.

## 2. Decisions (locked)

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Scroll engine | **Gesture-driven transform** (pointer/touch/wheel/keyboard) | Full control over threshold, clean directional `onSwiped`, natural press-hold integration. |
| Item API | **`data[]` + `renderItem(item, state)`** (FlatList-style) | Best for virtualization, stable keys, and dynamic append via `onEndReached`. |
| Animation deps | **Zero-dependency** (CSS transform + rAF) | ~3–5kb, no forced deps on consumers, compositor-friendly. |
| Repo shape | **Monorepo**: `packages/short-form-view` + `examples/next-demo` (pnpm workspace) | Live SSR + visual verification of the library. |
| Target | **TypeScript, React >= 18 (18 & 19), SSR-safe** | Widest compatibility. |
| Axis | Vertical only | YAGNI; horizontal deferred. |
| Package name | `short-form-view` | Unscoped, renameable. |

## 3. Core Rendering Model — "track translate, index-based positions"

- **Container** = the viewport: `overflow:hidden`, `height:100dvh` (with `100vh` fallback), `touch-action:none`, `overscroll-behavior:contain`.
- **Track** = single child of the container.
- **Each item** is absolutely positioned by its **own index**: `transform: translateY(index * 100%)`. This is static — set once, never recomputed when the list grows.
- **Track** is translated by **active index + drag offset**: `transform: translate3d(0, calc(-activeIndex * 100% + dragPx), 0)`.

Consequences:
- `item position = f(index)` — stable.
- `track position = f(activeIndex, dragPx)` — the only dynamic transform.
- Appending to `data` never reflows existing items, because their positions depend only on their index.
- Virtualization controls only **which** items mount; geometry stays correct even with unmounted gaps.

### Data flow

```
data[] (consumer-owned, can grow via API)
  → keyExtractor          → stable keys (no remount on append)
  → activeIndex           → the only React state that flips per swipe
  → useWindowedRange(activeIndex, overscan) → mounted subset [start..end]
  → renderItem(item, state) per mounted item
  → track translate3d(0, -activeIndex*100% + dragPx, 0)
```

### Performance guarantees

- **During drag: zero React re-render.** The track `transform` is written imperatively through a ref inside a `requestAnimationFrame` loop. No per-frame state.
- React state (`activeIndex`) flips only on commit (swipe/wheel/key) → a single minimal re-render that recomputes the mounted window.
- Each item wrapper is `React.memo`'d and re-runs `renderItem` only when its own `ItemState` changes (active flag / distance).
- Virtualization keeps the DOM to `active ± overscan` items.
- Passive listeners where possible; `touch-action:none` on track to prevent native scroll hijack.

## 4. Public API

```ts
interface ShortFormViewProps<T> {
  data: T[]
  renderItem: (item: T, state: ItemState) => ReactNode
  keyExtractor: (item: T, index: number) => string | number

  // navigation
  initialIndex?: number              // uncontrolled, default 0
  index?: number                     // controlled mode (with onIndexChange)
  onIndexChange?: (index: number, meta: { reason: 'swipe'|'wheel'|'key'|'api' }) => void
  onSwiped?: (e: { from: number; to: number; direction: 'up'|'down'; velocity: number }) => void

  // gesture tuning
  threshold?: number                 // default 0.2
  thresholdUnit?: 'fraction'|'px'    // default 'fraction' (of viewport height)
  velocityThreshold?: number         // px/ms quick-flick override, default 0.3
  resistance?: number                // edge overscroll resistance 0..1, default 0.3
  loop?: boolean                     // wrap last↔first, default false
  disabled?: boolean

  // animation (zero-dep)
  transitionDuration?: number        // ms, default 300
  easing?: string                    // default 'cubic-bezier(.16,1,.3,1)'

  // virtualization
  overscan?: number                  // items mounted each side, default 1
  onEndReached?: () => void          // fired when near the end → loadMore (append to data)
  onEndReachedThreshold?: number     // items-from-end, default 2

  // lifecycle
  onItemEnter?: (index: number, item: T) => void   // became the active item
  onItemLeave?: (index: number, item: T) => void   // stopped being the active item

  // press-hold zones (e.g. Instagram "hold to pause")
  onHoldStart?: (e: { side: 'left'|'center'|'right'; index: number }) => void
  onHoldEnd?:   (e: { side: 'left'|'center'|'right'; index: number }) => void
  onTapZone?:   (e: { side: 'left'|'center'|'right'; index: number }) => void
  holdDelay?: number                 // ms before hold fires, default 250
  zones?: { left: number; right: number }  // fractional widths, default { left: .33, right: .33 }

  // styling / a11y
  className?: string
  style?: CSSProperties
  itemClassName?: string
  itemStyle?: CSSProperties
  ariaLabel?: string
}

interface ItemState {
  index: number
  activeIndex: number
  isActive: boolean      // the snapped/focused item — e.g. Video reads this to play/pause
  isVisible: boolean     // active OR peeking into the viewport during a drag
  isSnapping: boolean    // mid-transition animation
  distance: number       // index - activeIndex (signed)
}

interface ShortFormHandle {
  scrollToIndex: (i: number, opts?: { animated?: boolean }) => void
  next: () => void
  prev: () => void
  getIndex: () => number
}
```

Notes:
- **Controlled / uncontrolled**: `index` (controlled) + `onIndexChange`, or uncontrolled via `initialIndex`. Standard React dual mode.
- **Imperative handle** via `forwardRef` + `useImperativeHandle` for programmatic navigation.
- `isVisible` is exposed in `ItemState`; a separate visibility callback is intentionally omitted (consumers derive from state). YAGNI.

## 5. Gesture Engine — state machine

States: `idle → dragging → snapping → idle`.

Inputs are normalized from four composable sources, each its own hook:

1. **`usePointerDrag`** — pointerdown/move/up (Pointer Events API, covers mouse + touch). Tracks signed delta and velocity. On release: **commit** to the next/previous index if `|delta| > resolvedThreshold` **or** `|velocity| > velocityThreshold`; otherwise **snap back**. Applies edge resistance when there is no neighbor (first/last and not `loop`).
2. **`useWheelNav`** — accumulates wheel deltas, debounces, emits one step per gesture (trackpad / mouse wheel).
3. **`useKeyboardNav`** — ArrowUp/Down, PageUp/Down, Home/End. Requires focus; container is focusable with `tabIndex` and `aria-label`.
4. **`usePressHold`** — overlay of left/center/right zones over the active item. `pointerdown` starts a `holdDelay` timer. If the pointer moves past a small slop **before** the timer fires, it is treated as a swipe (hold cancelled, drag engine takes over). If the timer fires, `onHoldStart`. `pointerup` before the timer = `onTapZone`. `pointerup` after a hold = `onHoldEnd`.

### Press-hold and swipe coexistence (the tricky bit)

The zone overlay sits over the active item but is **movement-transparent**: a stationary press becomes a hold; any vertical movement past the slop becomes a swipe. Holds must never block vertical swiping. This is designed explicitly so left/right hold (pause / peek) and up/down swipe do not fight for the gesture.

### Threshold resolution

- `thresholdUnit:'fraction'` → `resolvedThreshold = threshold * containerHeight`.
- `thresholdUnit:'px'` → `resolvedThreshold = threshold`.
- Velocity flick (`velocityThreshold`) can commit even below the distance threshold (fast short flicks feel natural).

## 6. Virtualization & dynamic growth

- `useWindowedRange(activeIndex, total, overscan)` returns `[start, end]`, clamped to `[0, total-1]` (or wrapped if `loop`).
- Only items in range are mounted. Their index-based absolute positions keep the geometry correct.
- **Dynamic growth**: when `data` grows (consumer appends API results), `total` grows, the window recomputes, and new items mount as the user approaches. `activeIndex` is preserved; existing items do not reflow.
- **`onEndReached`** fires when `activeIndex >= total - 1 - onEndReachedThreshold`, debounced so a single approach fires once until more data arrives.

## 7. SSR / Next.js

- `'use client'` directive on the component file.
- All `window` / `document` access guarded (`ssr/env.ts` `isBrowser`).
- `ssr/useIsomorphicLayoutEffect.ts` — `useLayoutEffect` in browser, `useEffect` on server, to avoid hydration warnings.
- Positions are **percentages of the container**, so the first paint needs **no measurement** → SSR markup is correct and hydration-safe.
- `100dvh` with `100vh` fallback for mobile address-bar correctness.
- `prefers-reduced-motion`: respected — transitions become instant (or near-instant) when the user requests reduced motion.

## 8. Styling

- **Fully inline styles** for the structural transforms (`touch-action`, `overscroll-behavior`, item/track transforms). **No CSS file import is forced on consumers** — important for Next.js ergonomics.
- `className` / `style` / `itemClassName` / `itemStyle` props let consumers layer their own styles.

## 9. File layout

```
packages/short-form-view/
  src/
    ShortFormView.tsx            # orchestration + forwardRef imperative handle
    engine/
      useSwipeEngine.ts          # state machine, index transitions, commit logic
      gestures/
        usePointerDrag.ts
        useWheelNav.ts
        useKeyboardNav.ts
        usePressHold.ts
      math.ts                    # threshold / velocity / resistance helpers
    virtualization/
      useWindowedRange.ts
    item/
      ItemRenderer.tsx           # memoized wrapper, computes ItemState
      useItemLifecycle.ts        # enter/leave effects
    ssr/
      useIsomorphicLayoutEffect.ts
      env.ts                     # isBrowser guards
    types.ts
    index.ts
  package.json                   # tsup build, exports map, types, peerDeps react>=18
  tsconfig.json
  tsup.config.ts
examples/next-demo/
  app/page.tsx                   # mixed feed: video×3, 2×2 ad grid, video×3, video-ad + bottom banner, …
  components/VideoCard.tsx  AdGrid.tsx  VideoAdBanner.tsx
  tests/                         # Playwright visual + interaction tests
pnpm-workspace.yaml
```

## 10. Testing

**Unit (vitest + React Testing Library, jsdom pointer simulation):**
- Engine: threshold crossing, velocity flick override, edge resistance, loop wrap, commit vs snap-back.
- `useWindowedRange`: clamping, overscan, loop, growth.
- Press-hold discrimination: hold vs tap vs swipe (slop boundary).
- Dynamic append preserves `activeIndex` and does not remount existing keys.
- Controlled vs uncontrolled index behavior.

**E2E (Playwright in `examples/next-demo`):**
- Real swipe up/down navigates; `onSwiped` direction correct.
- Active item's video plays; inactive pauses (via `isActive`).
- Ad grid item and video-ad-with-banner item render in the mixed feed.
- Infinite append through `onEndReached`.
- Keyboard navigation.
- Visual screenshots at 320 / 768 / 1024 / 1440.
- `prefers-reduced-motion` behavior.

**Coverage target:** 80%+.

## 11. Out of scope (YAGNI)

- Horizontal / multi-axis paging.
- `children` (JSX slot) API — `data` + `renderItem` only.
- Framer Motion or any animation dependency.
- Separate mount/visibility lifecycle callbacks (derive from `ItemState.isVisible`).

## 12. Open defaults (applied unless changed)

- `threshold` default `0.2` fraction + velocity flick override.
- Lifecycle = active-index only (`onItemEnter`/`onItemLeave`); `isVisible` exposed in state.
- Package name `short-form-view` (unscoped).
