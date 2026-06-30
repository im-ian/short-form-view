<div align="center">

<img src="assets/hero.svg" alt="short-form-view — Instagram/TikTok-style vertical swipe pager for React" width="100%" />

<br/>

**Instagram / TikTok-style vertical swipe pager for React.**
A smooth, virtualized, SSR-safe vertical feed — render any view per slot.

### [▶ Live demo](https://im-ian.github.io/short-form-view/)

<br/>

![React](https://img.shields.io/badge/React-18_%7C_19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![dependencies](https://img.shields.io/badge/runtime_deps-0-22c55e)
![coverage](https://img.shields.io/badge/coverage-95%25-22c55e)
![tests](https://img.shields.io/badge/tests-41_unit_·_12_e2e-22c55e)
![license](https://img.shields.io/badge/license-MIT-black)

</div>

---

## Features

- **Gesture-driven** — configurable swipe threshold, velocity flick, edge resistance. Touch, mouse, wheel, and keyboard all drive one engine.
- **Virtualized** — only the active item ± overscan are mounted.
- **Append-safe** — growing `data` from an API mid-scroll never reflows or remounts existing items.
- **Zero runtime dependency** — no animation library, no CSS import.
- **SSR-safe** — works in Next.js (App Router and Pages).
- **Rich callbacks** — swipe, item enter/leave lifecycle, and left/center/right press-hold + tap zones.
- **No re-render on drag** — the track transform is written imperatively via `requestAnimationFrame`.

## Install

```bash
pnpm add short-form-view   # react >= 18 is a peer dependency
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
      threshold={0.2}                                   // commit a swipe at 20% of the viewport
      onSwiped={({ from, to, direction }) => track(from, to, direction)}
      onIndexChange={(i, { reason }) => console.log('now at', i, 'via', reason)}
      onEndReached={loadMore}                           // append more, no reflow
      renderItem={(clip, state) => (
        <video
          src={clip.src}
          muted
          loop
          autoPlay={state.isActive}                     // play only while focused
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}
    />
  )
}
```

`renderItem` returns any React node, so a slot can be a video, an image, or any custom component — the library just connects them into the swipe feed.

## What you get

| | |
|---|---|
| **Navigation** | drag · wheel/trackpad · keyboard (arrows, page, home/end) · controlled & uncontrolled `index` · imperative `ref` (`scrollToIndex` / `next` / `prev`) |
| **Tuning** | `threshold` (fraction or px) · `velocityThreshold` · `resistance` · `loop` · `transitionDuration` · `easing` · `overscan` |
| **Callbacks** | `onSwiped` · `onIndexChange` · `onItemEnter` / `onItemLeave` · `onEndReached` · `onHoldStart` / `onHoldEnd` / `onTapZone` |
| **Per-item state** | `isActive` · `isVisible` · `isSnapping` · `distance` · `index` / `activeIndex` |

**Full props, types, and the imperative handle:** see the [package README](packages/short-form-view/README.md).

## Press-and-hold vs. swipe

The active slot is overlaid with left / center / right zones. A stationary press past `holdDelay` fires `onHoldStart` (pause the video, dim the UI); a quick press-release fires `onTapZone`. Any vertical movement past a small slop becomes a swipe instead — so holding and swiping never fight.

## Repository

| Path | What |
|------|------|
| [`packages/short-form-view`](packages/short-form-view) | the library — gesture engine, virtualization, item lifecycle, SSR utils |
| [`examples/next-demo`](examples/next-demo) | Next.js App Router demo with infinite append |
| [`docs/superpowers`](docs/superpowers) | design spec + implementation plan |

```bash
pnpm install
pnpm -C examples/next-demo dev          # http://localhost:3100
pnpm test                                # unit (vitest)
pnpm -C packages/short-form-view test:cov
pnpm -C examples/next-demo test:e2e      # Playwright E2E + visual
```

## License

[MIT](LICENSE)
