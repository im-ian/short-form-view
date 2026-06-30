# short-form-view

Instagram / TikTok-style **vertical swipe pager** for React. `renderItem` returns any React node, so each slot can be a video, an image, or any custom component — the library connects them into a smooth, swipeable, full-viewport feed.

- **Gesture-driven** — configurable swipe threshold, velocity flick, edge resistance.
- **Virtualized** — only the active item ± overscan are mounted.
- **Append-safe** — growing `data` from an API mid-scroll never reflows or remounts existing items.
- **Zero-dependency** — no animation library, no CSS import. Just React.
- **SSR-safe** — works in Next.js (App Router and Pages).
- **Rich callbacks** — swipe, item enter/leave lifecycle, and left/center/right press-hold + tap zones.

## Install

```bash
pnpm add short-form-view
# react >= 18 is a peer dependency
```

## Quick start

```tsx
'use client'
import { useCallback, useState } from 'react'
import { ShortFormView } from 'short-form-view'

type Clip = { id: string; src: string }

export default function Feed() {
  const [clips, setClips] = useState<Clip[]>(initialClips)

  const loadMore = useCallback(() => {
    fetchMore().then((more) => setClips((prev) => [...prev, ...more]))
  }, [])

  return (
    <ShortFormView<Clip>
      data={clips}
      keyExtractor={(c) => c.id}
      threshold={0.2}
      onIndexChange={(i, meta) => console.log('now at', i, 'via', meta.reason)}
      onEndReached={loadMore}
      renderItem={(clip, state) => (
        <video src={clip.src} muted loop autoPlay={state.isActive} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    />
  )
}
```

Each slot receives an `ItemState`. A video reads `state.isActive` to play only while it is the focused slot. `renderItem` returns any React node, so a slot can render any custom component too.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | — | The feed. Append to it freely; existing items are not remounted. |
| `renderItem` | `(item: T, state: ItemState) => ReactNode` | — | Renders a slot. |
| `keyExtractor` | `(item: T, index: number) => string \| number` | — | Stable key per item. |
| `initialIndex` | `number` | `0` | Starting index (uncontrolled). |
| `index` | `number` | — | Controlled active index (use with `onIndexChange`). |
| `onIndexChange` | `(index, { reason }) => void` | — | Fires on any index change. `reason`: `swipe \| wheel \| key \| api`. |
| `onSwiped` | `({ from, to, direction, velocity }) => void` | — | Fires on a user swipe. `direction`: `up \| down`. |
| `threshold` | `number` | `0.2` | Distance to commit a swipe. |
| `thresholdUnit` | `fraction \| px` | `fraction` | `fraction` = portion of viewport height; `px` = absolute. |
| `velocityThreshold` | `number` | `0.3` | px/ms flick speed that commits even below `threshold`. |
| `resistance` | `number` | `0.3` | Overscroll drag damping at the first/last edge. |
| `loop` | `boolean` | `false` | Wrap from last to first. |
| `disabled` | `boolean` | `false` | Disable all gestures. |
| `transitionDuration` | `number` | `300` | Snap animation duration (ms). |
| `easing` | `string` | `cubic-bezier(.16,1,.3,1)` | Snap easing. |
| `overscan` | `number` | `1` | Items mounted on each side of the active one. |
| `onEndReached` | `() => void` | — | Fires when near the end — fetch and append more. |
| `onEndReachedThreshold` | `number` | `2` | How many items from the end triggers `onEndReached`. |
| `onItemEnter` | `(index, item) => void` | — | An item became the active slot. |
| `onItemLeave` | `(index, item) => void` | — | An item stopped being the active slot. |
| `onHoldStart` | `({ side, index }) => void` | — | Press-and-hold began. `side`: `left \| center \| right`. |
| `onHoldEnd` | `({ side, index }) => void` | — | Press-and-hold released. |
| `onTapZone` | `({ side, index }) => void` | — | A tap (no hold, no swipe) in a zone. |
| `holdDelay` | `number` | `250` | ms a stationary press must last to count as a hold. |
| `zones` | `{ left: number; right: number }` | `{ left: .33, right: .33 }` | Fractional widths of the left/right hold zones. |
| `className` / `style` | — | — | Applied to the container. |
| `itemClassName` / `itemStyle` | — | — | Applied to each item wrapper. |
| `ariaLabel` | `string` | — | Accessible label for the carousel container. |

### `ItemState` (passed to `renderItem`)

| Field | Type | Meaning |
|-------|------|---------|
| `index` | `number` | This item's index. |
| `activeIndex` | `number` | The currently focused index. |
| `isActive` | `boolean` | This item is the focused slot (use for video play/pause). |
| `isVisible` | `boolean` | Active or peeking during a drag. |
| `isSnapping` | `boolean` | A snap animation is in progress. |
| `distance` | `number` | `index - activeIndex` (signed). |

### Imperative handle (`ref`)

```tsx
const ref = useRef<ShortFormHandle>(null)
// ref.current.scrollToIndex(5, { animated: false })
// ref.current.next()
// ref.current.prev()
// ref.current.getIndex()
```

## Press-and-hold zones

The active slot is overlaid with left / center / right zones. A stationary press past `holdDelay` fires `onHoldStart` (e.g. pause the video, dim the UI); releasing fires `onHoldEnd`. A quick press-release fires `onTapZone`. Crucially, **any vertical movement past a small slop becomes a swipe instead of a hold**, so holding and swiping never fight.

## Navigation inputs

Touch / mouse drag, mouse wheel / trackpad, and keyboard (`ArrowUp`/`ArrowDown`, `PageUp`/`PageDown`, `Home`, `End`) all drive the same engine. The container is focusable for keyboard use.

## SSR / Next.js

The component carries its own `'use client'` directive and guards all browser access. Item positions are percentages of the container, so the server renders correct markup with no measurement and hydration is clean. No CSS import is required — all structural styles are inline. `prefers-reduced-motion` is respected (transitions become instant).

## Performance

- The track transform is written imperatively (ref + `requestAnimationFrame`) during a drag, so there are **no React re-renders per frame**.
- The only state that flips on a swipe is `activeIndex`, which triggers one minimal re-render to recompute the mounted window.
- Item wrappers are memoized; `renderItem` re-runs only when that item's `ItemState` changes.
- Only `active ± overscan` items are in the DOM at any time.
