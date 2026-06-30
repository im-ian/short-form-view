# short-form-view Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A zero-dependency React library that renders an Instagram/TikTok-style vertical swipe pager, mounting any consumer-supplied View (video, ad grid, banner) per slot, with virtualization, SSR support, configurable threshold, and rich gesture callbacks.

**Architecture:** Gesture-driven transform engine. A single track element is translated imperatively (ref + rAF) by `activeIndex + dragOffset`; each item is absolutely positioned by its own index (`translateY(index*100%)`), so list growth never reflows existing items. React state holds only `activeIndex`, driving a small mounted window and per-item `ItemState`. Transforms are written imperatively to avoid per-frame re-renders.

**Tech Stack:** TypeScript (strict), React >= 18, Pointer Events API, pnpm workspace, tsup (build), vitest + React Testing Library (unit), Next.js App Router + Playwright (example + E2E).

## Global Constraints

- Package name: `short-form-view`. Unscoped.
- `peerDependencies`: `react >= 18`, `react-dom >= 18`. **No runtime dependencies.**
- TypeScript strict mode. Emit `.d.ts`.
- SSR-safe: no top-level `window`/`document`; guard all browser access; use `useIsomorphicLayoutEffect`.
- Vertical axis only. No `children` API. No animation library. (YAGNI per spec §11.)
- Styling is fully inline; **no CSS file import is forced on consumers.**
- Default values (verbatim from spec §4): `initialIndex=0`, `threshold=0.2`, `thresholdUnit='fraction'`, `velocityThreshold=0.3`, `resistance=0.3`, `loop=false`, `transitionDuration=300`, `easing='cubic-bezier(.16,1,.3,1)'`, `overscan=1`, `onEndReachedThreshold=2`, `holdDelay=250`, `zones={left:0.33,right:0.33}`.
- Commit after every task. Conventional commit messages (`feat:`, `test:`, `chore:`, `docs:`).
- Coverage target 80%+.

## File Structure

```
pnpm-workspace.yaml
package.json                                   # root, scripts
packages/short-form-view/
  package.json  tsconfig.json  tsup.config.ts  vitest.config.ts  vitest.setup.ts
  src/
    types.ts                                   # all public + shared types
    ssr/env.ts                                 # isBrowser
    ssr/useIsomorphicLayoutEffect.ts
    ssr/usePrefersReducedMotion.ts
    engine/math.ts                             # pure: clamp/wrap/threshold/commit/resistance
    engine/holds.ts                            # pure: zoneFromX/classifyPointerEnd
    engine/useSwipeEngine.ts                   # state machine + imperative paint
    engine/gestures/usePointerGestures.ts      # drag + hold + tap (one pointer stream)
    engine/gestures/useWheelNav.ts
    engine/gestures/useKeyboardNav.ts
    virtualization/useWindowedRange.ts         # pure computeWindowIndices + hook
    item/ItemRenderer.tsx                       # memoized wrapper, computes ItemState
    item/useItemLifecycle.ts                    # enter/leave effects
    ShortFormView.tsx                           # orchestration + forwardRef handle
    index.ts                                    # public exports
examples/next-demo/
  package.json  next.config.js  tsconfig.json  playwright.config.ts
  app/layout.tsx  app/page.tsx
  components/VideoCard.tsx  AdGrid.tsx  VideoAdBanner.tsx  feed.ts
  tests/feed.spec.ts
```

> **Note on file-layout deviation from spec §9:** the spec listed `usePointerDrag` and `usePressHold` as separate hooks. They share one pointer-event stream and must coordinate (movement past slop = drag; stationary press = hold), so they are unified into `usePointerGestures` to avoid two handlers fighting over the same `pointerdown`. The pure classification logic is still split out into `engine/holds.ts` for isolated testing. `usePrefersReducedMotion` is added for the reduced-motion requirement (spec §7).

---

### Task 1: Monorepo + library package scaffold

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `.gitignore`, `.npmrc`
- Create: `packages/short-form-view/package.json`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, `vitest.setup.ts`, `src/index.ts`
- Test: `packages/short-form-view/src/__smoke__.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a workspace where `pnpm -C packages/short-form-view test` and `pnpm -C packages/short-form-view build` run.

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
  - "examples/*"
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "short-form-view-monorepo",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "build": "pnpm -C packages/short-form-view build",
    "test": "pnpm -C packages/short-form-view test",
    "test:run": "pnpm -C packages/short-form-view test:run",
    "typecheck": "pnpm -r --if-present typecheck"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 3: Create `.gitignore` and `.npmrc`**

`.gitignore`:
```
node_modules
dist
.next
coverage
test-results
playwright-report
*.tsbuildinfo
```

`.npmrc`:
```
auto-install-peers=true
```

- [ ] **Step 4: Create `packages/short-form-view/package.json`**

```json
{
  "name": "short-form-view",
  "version": "0.1.0",
  "description": "Instagram/TikTok-style vertical swipe pager for React. Mounts any view per slot.",
  "license": "MIT",
  "type": "module",
  "sideEffects": false,
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup",
    "test": "vitest",
    "test:run": "vitest run",
    "test:cov": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "react": ">=18",
    "react-dom": ">=18"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitest/coverage-v8": "^2.0.0",
    "jsdom": "^25.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tsup": "^8.0.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 5: Create `packages/short-form-view/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Create `packages/short-form-view/tsup.config.ts`**

```ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom'],
})
```

- [ ] **Step 7: Create `packages/short-form-view/vitest.config.ts` and `vitest.setup.ts`**

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/**'] },
  },
})
```

`vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest'

// jsdom lacks matchMedia; provide a no-match default.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
```

- [ ] **Step 8: Create placeholder `src/index.ts` and a smoke test**

`src/index.ts`:
```ts
export const VERSION = '0.1.0'
```

`src/__smoke__.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { VERSION } from './index'

describe('package smoke', () => {
  it('exports a version string', () => {
    expect(VERSION).toBe('0.1.0')
  })
})
```

- [ ] **Step 9: Install and verify test + build**

Run:
```bash
pnpm install
pnpm -C packages/short-form-view test:run
pnpm -C packages/short-form-view build
```
Expected: test passes (1 passed); `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` created.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo and short-form-view package"
```

---

### Task 2: Public types + SSR utilities

**Files:**
- Create: `src/types.ts`, `src/ssr/env.ts`, `src/ssr/useIsomorphicLayoutEffect.ts`, `src/ssr/usePrefersReducedMotion.ts`
- Test: `src/ssr/env.test.ts`

**Interfaces:**
- Produces (consumed by every later task):
  - Types: `ItemState`, `ShortFormViewProps<T>`, `ShortFormHandle`, `SwipeEvent`, `ZoneEvent`, `IndexChangeMeta`, `SwipeDirection`, `ZoneSide`, `IndexChangeReason`, `ThresholdUnit`.
  - `isBrowser(): boolean`
  - `useIsomorphicLayoutEffect` (alias of `useLayoutEffect` in browser, `useEffect` on server)
  - `usePrefersReducedMotion(): boolean`

- [ ] **Step 1: Create `src/types.ts`**

```ts
import type { CSSProperties, ReactNode } from 'react'

export type SwipeDirection = 'up' | 'down'
export type ZoneSide = 'left' | 'center' | 'right'
export type IndexChangeReason = 'swipe' | 'wheel' | 'key' | 'api'
export type ThresholdUnit = 'fraction' | 'px'

export interface ItemState {
  index: number
  activeIndex: number
  isActive: boolean
  isVisible: boolean
  isSnapping: boolean
  distance: number
}

export interface SwipeEvent {
  from: number
  to: number
  direction: SwipeDirection
  velocity: number
}

export interface ZoneEvent {
  side: ZoneSide
  index: number
}

export interface IndexChangeMeta {
  reason: IndexChangeReason
}

export interface ShortFormHandle {
  scrollToIndex: (index: number, opts?: { animated?: boolean }) => void
  next: () => void
  prev: () => void
  getIndex: () => number
}

export interface ShortFormViewProps<T> {
  data: T[]
  renderItem: (item: T, state: ItemState) => ReactNode
  keyExtractor: (item: T, index: number) => string | number

  initialIndex?: number
  index?: number
  onIndexChange?: (index: number, meta: IndexChangeMeta) => void
  onSwiped?: (e: SwipeEvent) => void

  threshold?: number
  thresholdUnit?: ThresholdUnit
  velocityThreshold?: number
  resistance?: number
  loop?: boolean
  disabled?: boolean

  transitionDuration?: number
  easing?: string

  overscan?: number
  onEndReached?: () => void
  onEndReachedThreshold?: number

  onItemEnter?: (index: number, item: T) => void
  onItemLeave?: (index: number, item: T) => void

  onHoldStart?: (e: ZoneEvent) => void
  onHoldEnd?: (e: ZoneEvent) => void
  onTapZone?: (e: ZoneEvent) => void
  holdDelay?: number
  zones?: { left: number; right: number }

  className?: string
  style?: CSSProperties
  itemClassName?: string
  itemStyle?: CSSProperties
  ariaLabel?: string
}
```

- [ ] **Step 2: Write the failing test for `isBrowser`**

`src/ssr/env.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { isBrowser } from './env'

describe('isBrowser', () => {
  it('returns true under jsdom (window defined)', () => {
    expect(isBrowser()).toBe(true)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm -C packages/short-form-view vitest run src/ssr/env.test.ts`
Expected: FAIL — cannot find module `./env`.

- [ ] **Step 4: Implement `src/ssr/env.ts`**

```ts
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm -C packages/short-form-view vitest run src/ssr/env.test.ts`
Expected: PASS.

- [ ] **Step 6: Implement `src/ssr/useIsomorphicLayoutEffect.ts` and `src/ssr/usePrefersReducedMotion.ts`**

`useIsomorphicLayoutEffect.ts`:
```ts
import { useEffect, useLayoutEffect } from 'react'
import { isBrowser } from './env'

export const useIsomorphicLayoutEffect = isBrowser() ? useLayoutEffect : useEffect
```

`usePrefersReducedMotion.ts`:
```ts
import { useEffect, useState } from 'react'
import { isBrowser } from './env'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (!isBrowser() || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const update = () => setReduced(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return reduced
}
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add public types and SSR utilities"
```

---

### Task 3: Pure engine math

**Files:**
- Create: `src/engine/math.ts`
- Test: `src/engine/math.test.ts`

**Interfaces:**
- Produces:
  - `clampIndex(index: number, total: number): number`
  - `wrapIndex(index: number, total: number): number`
  - `resolveThreshold(threshold: number, unit: ThresholdUnit, containerHeight: number): number`
  - `applyResistance(delta: number, resistance: number): number`
  - `decideCommit(delta: number, velocity: number, resolvedThreshold: number, velocityThreshold: number): { commit: boolean; direction: 0 | 1 | -1 }`
  - Sign convention: `delta < 0` means dragged up → advance to **next** (direction `1`); `delta > 0` → **prev** (direction `-1`).

- [ ] **Step 1: Write the failing tests**

`src/engine/math.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { clampIndex, wrapIndex, resolveThreshold, applyResistance, decideCommit } from './math'

describe('clampIndex', () => {
  it('clamps within bounds', () => {
    expect(clampIndex(-2, 5)).toBe(0)
    expect(clampIndex(9, 5)).toBe(4)
    expect(clampIndex(3, 5)).toBe(3)
  })
  it('returns 0 for empty list', () => {
    expect(clampIndex(2, 0)).toBe(0)
  })
})

describe('wrapIndex', () => {
  it('wraps around both ends', () => {
    expect(wrapIndex(5, 5)).toBe(0)
    expect(wrapIndex(-1, 5)).toBe(4)
    expect(wrapIndex(6, 5)).toBe(1)
  })
})

describe('resolveThreshold', () => {
  it('uses fraction of container height', () => {
    expect(resolveThreshold(0.2, 'fraction', 1000)).toBe(200)
  })
  it('uses px directly', () => {
    expect(resolveThreshold(80, 'px', 1000)).toBe(80)
  })
})

describe('applyResistance', () => {
  it('scales overscroll delta', () => {
    expect(applyResistance(100, 0.3)).toBe(30)
  })
})

describe('decideCommit', () => {
  it('does not commit below distance and velocity thresholds', () => {
    expect(decideCommit(-50, 0.1, 200, 0.3)).toEqual({ commit: false, direction: 0 })
  })
  it('commits next when dragged up past distance threshold', () => {
    expect(decideCommit(-220, 0.0, 200, 0.3)).toEqual({ commit: true, direction: 1 })
  })
  it('commits prev when dragged down past distance threshold', () => {
    expect(decideCommit(220, 0.0, 200, 0.3)).toEqual({ commit: true, direction: -1 })
  })
  it('commits on velocity flick even below distance threshold', () => {
    expect(decideCommit(-30, -0.5, 200, 0.3)).toEqual({ commit: true, direction: 1 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -C packages/short-form-view vitest run src/engine/math.test.ts`
Expected: FAIL — cannot find module `./math`.

- [ ] **Step 3: Implement `src/engine/math.ts`**

```ts
import type { ThresholdUnit } from '../types'

export function clampIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return Math.max(0, Math.min(index, total - 1))
}

export function wrapIndex(index: number, total: number): number {
  if (total <= 0) return 0
  return ((index % total) + total) % total
}

export function resolveThreshold(
  threshold: number,
  unit: ThresholdUnit,
  containerHeight: number,
): number {
  return unit === 'px' ? threshold : threshold * containerHeight
}

export function applyResistance(delta: number, resistance: number): number {
  return delta * resistance
}

export function decideCommit(
  delta: number,
  velocity: number,
  resolvedThreshold: number,
  velocityThreshold: number,
): { commit: boolean; direction: 0 | 1 | -1 } {
  const distancePass = Math.abs(delta) >= resolvedThreshold
  const velocityPass = Math.abs(velocity) >= velocityThreshold
  if (!distancePass && !velocityPass) return { commit: false, direction: 0 }
  const direction = delta < 0 ? 1 : -1
  return { commit: true, direction }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -C packages/short-form-view vitest run src/engine/math.test.ts`
Expected: PASS (all green).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure engine math (clamp/wrap/threshold/commit/resistance)"
```

---

### Task 4: Virtualization window

**Files:**
- Create: `src/virtualization/useWindowedRange.ts`
- Test: `src/virtualization/useWindowedRange.test.ts`

**Interfaces:**
- Produces:
  - `computeWindowIndices(activeIndex: number, total: number, overscan: number, loop: boolean): number[]` — sorted unique indices to mount.
  - `useWindowedRange(activeIndex: number, total: number, overscan: number, loop: boolean): number[]` — memoized hook wrapper.

- [ ] **Step 1: Write the failing tests**

`src/virtualization/useWindowedRange.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { computeWindowIndices } from './useWindowedRange'

describe('computeWindowIndices', () => {
  it('returns active plus overscan neighbors', () => {
    expect(computeWindowIndices(3, 10, 1, false)).toEqual([2, 3, 4])
  })
  it('clamps at the start without loop', () => {
    expect(computeWindowIndices(0, 10, 1, false)).toEqual([0, 1])
  })
  it('clamps at the end without loop', () => {
    expect(computeWindowIndices(9, 10, 1, false)).toEqual([8, 9])
  })
  it('returns empty for empty list', () => {
    expect(computeWindowIndices(0, 0, 1, false)).toEqual([])
  })
  it('respects overscan size', () => {
    expect(computeWindowIndices(5, 20, 2, false)).toEqual([3, 4, 5, 6, 7])
  })
  it('wraps neighbors when loop is enabled', () => {
    expect(computeWindowIndices(0, 5, 1, true)).toEqual([0, 1, 4])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -C packages/short-form-view vitest run src/virtualization/useWindowedRange.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/virtualization/useWindowedRange.ts`**

```ts
import { useMemo } from 'react'

export function computeWindowIndices(
  activeIndex: number,
  total: number,
  overscan: number,
  loop: boolean,
): number[] {
  if (total <= 0) return []
  const set = new Set<number>()
  for (let d = -overscan; d <= overscan; d++) {
    let i = activeIndex + d
    if (loop) {
      i = ((i % total) + total) % total
    } else if (i < 0 || i > total - 1) {
      continue
    }
    set.add(i)
  }
  return Array.from(set).sort((a, b) => a - b)
}

export function useWindowedRange(
  activeIndex: number,
  total: number,
  overscan: number,
  loop: boolean,
): number[] {
  return useMemo(
    () => computeWindowIndices(activeIndex, total, overscan, loop),
    [activeIndex, total, overscan, loop],
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -C packages/short-form-view vitest run src/virtualization/useWindowedRange.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add windowed virtualization range"
```

---

### Task 5: Pure hold/zone classification

**Files:**
- Create: `src/engine/holds.ts`
- Test: `src/engine/holds.test.ts`

**Interfaces:**
- Produces:
  - `zoneFromX(xWithinElement: number, width: number, zones: { left: number; right: number }): ZoneSide`
  - `classifyPointerEnd(holdFired: boolean, movedPastSlop: boolean): 'tap' | 'hold-end' | 'none'`

- [ ] **Step 1: Write the failing tests**

`src/engine/holds.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { zoneFromX, classifyPointerEnd } from './holds'

const zones = { left: 0.33, right: 0.33 }

describe('zoneFromX', () => {
  it('classifies left third', () => {
    expect(zoneFromX(10, 300, zones)).toBe('left')
  })
  it('classifies center', () => {
    expect(zoneFromX(150, 300, zones)).toBe('center')
  })
  it('classifies right third', () => {
    expect(zoneFromX(290, 300, zones)).toBe('right')
  })
  it('treats exact left edge as left', () => {
    expect(zoneFromX(99, 300, zones)).toBe('left')
  })
})

describe('classifyPointerEnd', () => {
  it('returns none when it moved (was a swipe)', () => {
    expect(classifyPointerEnd(false, true)).toBe('none')
    expect(classifyPointerEnd(true, true)).toBe('none')
  })
  it('returns hold-end when hold fired and no move', () => {
    expect(classifyPointerEnd(true, false)).toBe('hold-end')
  })
  it('returns tap when no hold and no move', () => {
    expect(classifyPointerEnd(false, false)).toBe('tap')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -C packages/short-form-view vitest run src/engine/holds.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `src/engine/holds.ts`**

```ts
import type { ZoneSide } from '../types'

export function zoneFromX(
  xWithinElement: number,
  width: number,
  zones: { left: number; right: number },
): ZoneSide {
  if (width <= 0) return 'center'
  const leftEdge = width * zones.left
  const rightEdge = width * (1 - zones.right)
  if (xWithinElement <= leftEdge) return 'left'
  if (xWithinElement >= rightEdge) return 'right'
  return 'center'
}

export function classifyPointerEnd(
  holdFired: boolean,
  movedPastSlop: boolean,
): 'tap' | 'hold-end' | 'none' {
  if (movedPastSlop) return 'none'
  return holdFired ? 'hold-end' : 'tap'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -C packages/short-form-view vitest run src/engine/holds.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure hold/zone classification"
```

---

### Task 6: Swipe engine (state machine + imperative paint)

**Files:**
- Create: `src/engine/useSwipeEngine.ts`
- Test: `src/engine/useSwipeEngine.test.tsx`

**Interfaces:**
- Consumes: `math.ts` (`clampIndex`, `wrapIndex`, `resolveThreshold`, `applyResistance`, `decideCommit`), `useIsomorphicLayoutEffect`, types.
- Produces:
  ```ts
  interface SwipeEngineParams {
    total: number
    containerRef: React.RefObject<HTMLElement | null>
    trackRef: React.RefObject<HTMLElement | null>
    initialIndex: number
    controlledIndex?: number
    loop: boolean
    disabled: boolean
    threshold: number
    thresholdUnit: ThresholdUnit
    velocityThreshold: number
    resistance: number
    transitionDuration: number
    easing: string
    reducedMotion: boolean
    onIndexChange?: (i: number, meta: IndexChangeMeta) => void
    onSwiped?: (e: SwipeEvent) => void
    onEndReached?: () => void
    onEndReachedThreshold: number
  }
  interface SwipeEngineApi {
    activeIndex: number
    isSnapping: boolean
    goTo: (target: number, opts: { reason: IndexChangeReason; animated?: boolean; velocity?: number; direction?: SwipeDirection }) => void
    next: (reason?: IndexChangeReason) => void
    prev: (reason?: IndexChangeReason) => void
    beginDrag: () => void
    dragBy: (deltaPx: number) => void
    endDrag: (deltaPx: number, velocityPxPerMs: number) => void
  }
  function useSwipeEngine(params: SwipeEngineParams): SwipeEngineApi
  ```
- Behavior contract (what later tasks and tests rely on):
  - `next`/`prev`/`goTo` change `activeIndex`, fire `onIndexChange`, and paint the track.
  - `endDrag` commits or snaps back using `decideCommit`; on swipe commit fires `onSwiped` and `onIndexChange({reason:'swipe'})`.
  - End-reached fires when the resolved index is within `onEndReachedThreshold` of the last index (once per approach).

- [ ] **Step 1: Write the failing integration test**

`src/engine/useSwipeEngine.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { useRef } from 'react'
import { useSwipeEngine } from './useSwipeEngine'
import type { SwipeEvent } from '../types'

function setupHeight(el: HTMLElement | null, h: number) {
  if (el) Object.defineProperty(el, 'clientHeight', { configurable: true, value: h })
}

function Harness(props: {
  total: number
  onSwiped?: (e: SwipeEvent) => void
  onIndexChange?: (i: number) => void
  onEndReached?: () => void
  apiRef?: (api: ReturnType<typeof useSwipeEngine>) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const engine = useSwipeEngine({
    total: props.total,
    containerRef,
    trackRef,
    initialIndex: 0,
    loop: false,
    disabled: false,
    threshold: 0.2,
    thresholdUnit: 'fraction',
    velocityThreshold: 0.3,
    resistance: 0.3,
    transitionDuration: 0,
    easing: 'linear',
    reducedMotion: true,
    onIndexChange: (i) => props.onIndexChange?.(i),
    onSwiped: props.onSwiped,
    onEndReached: props.onEndReached,
    onEndReachedThreshold: 1,
  })
  props.apiRef?.(engine)
  return (
    <div ref={containerRef} data-testid="container">
      <div ref={trackRef} data-testid="track">{engine.activeIndex}</div>
    </div>
  )
}

describe('useSwipeEngine', () => {
  it('advances with next() and fires onIndexChange', () => {
    const onIndexChange = vi.fn()
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(
      <Harness total={5} onIndexChange={onIndexChange} apiRef={(a) => (api = a)} />,
    )
    setupHeight(getByTestId('container'), 800)
    act(() => api.next('key'))
    expect(getByTestId('track').textContent).toBe('1')
    expect(onIndexChange).toHaveBeenCalledWith(1, { reason: 'key' })
  })

  it('commits a swipe past the threshold and reports direction up', () => {
    const onSwiped = vi.fn()
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(
      <Harness total={5} onSwiped={onSwiped} apiRef={(a) => (api = a)} />,
    )
    setupHeight(getByTestId('container'), 800)
    act(() => {
      api.beginDrag()
      api.dragBy(-300)
      api.endDrag(-300, 0) // 300 > 0.2*800=160 → commit next
    })
    expect(getByTestId('track').textContent).toBe('1')
    expect(onSwiped).toHaveBeenCalledWith(
      expect.objectContaining({ from: 0, to: 1, direction: 'up' }),
    )
  })

  it('snaps back when below threshold (no index change)', () => {
    const onIndexChange = vi.fn()
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(
      <Harness total={5} onIndexChange={onIndexChange} apiRef={(a) => (api = a)} />,
    )
    setupHeight(getByTestId('container'), 800)
    act(() => {
      api.beginDrag()
      api.dragBy(-50)
      api.endDrag(-50, 0) // 50 < 160 → snap back
    })
    expect(getByTestId('track').textContent).toBe('0')
    expect(onIndexChange).not.toHaveBeenCalled()
  })

  it('does not advance past the last index without loop', () => {
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(<Harness total={2} apiRef={(a) => (api = a)} />)
    setupHeight(getByTestId('container'), 800)
    act(() => api.next('key'))
    act(() => api.next('key'))
    expect(getByTestId('track').textContent).toBe('1')
  })

  it('fires onEndReached when near the end', () => {
    const onEndReached = vi.fn()
    let api!: ReturnType<typeof useSwipeEngine>
    const { getByTestId } = render(
      <Harness total={3} onEndReached={onEndReached} apiRef={(a) => (api = a)} />,
    )
    setupHeight(getByTestId('container'), 800)
    act(() => api.next('key')) // index 1, total-1-threshold = 3-1-1 = 1 → fires
    expect(onEndReached).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C packages/short-form-view vitest run src/engine/useSwipeEngine.test.tsx`
Expected: FAIL — cannot find module `./useSwipeEngine`.

- [ ] **Step 3: Implement `src/engine/useSwipeEngine.ts`**

```ts
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  IndexChangeMeta,
  IndexChangeReason,
  SwipeDirection,
  SwipeEvent,
  ThresholdUnit,
} from '../types'
import { useIsomorphicLayoutEffect } from '../ssr/useIsomorphicLayoutEffect'
import { applyResistance, clampIndex, decideCommit, resolveThreshold, wrapIndex } from './math'

export interface SwipeEngineParams {
  total: number
  containerRef: React.RefObject<HTMLElement | null>
  trackRef: React.RefObject<HTMLElement | null>
  initialIndex: number
  controlledIndex?: number
  loop: boolean
  disabled: boolean
  threshold: number
  thresholdUnit: ThresholdUnit
  velocityThreshold: number
  resistance: number
  transitionDuration: number
  easing: string
  reducedMotion: boolean
  onIndexChange?: (i: number, meta: IndexChangeMeta) => void
  onSwiped?: (e: SwipeEvent) => void
  onEndReached?: () => void
  onEndReachedThreshold: number
}

export interface SwipeEngineApi {
  activeIndex: number
  isSnapping: boolean
  goTo: (
    target: number,
    opts: { reason: IndexChangeReason; animated?: boolean; velocity?: number; direction?: SwipeDirection },
  ) => void
  next: (reason?: IndexChangeReason) => void
  prev: (reason?: IndexChangeReason) => void
  beginDrag: () => void
  dragBy: (deltaPx: number) => void
  endDrag: (deltaPx: number, velocityPxPerMs: number) => void
}

export function useSwipeEngine(params: SwipeEngineParams): SwipeEngineApi {
  const {
    total, containerRef, trackRef, initialIndex, loop, disabled,
    threshold, thresholdUnit, velocityThreshold, resistance,
    transitionDuration, easing, reducedMotion,
    onIndexChange, onSwiped, onEndReached, onEndReachedThreshold,
  } = params

  const [activeIndex, setActiveIndex] = useState(() => clampIndex(initialIndex, Math.max(total, 1)))
  const [isSnapping, setIsSnapping] = useState(false)

  const indexRef = useRef(activeIndex)
  const draggingRef = useRef(false)
  const skipSyncPaint = useRef(false)
  const rafId = useRef<number | null>(null)
  const pendingOffset = useRef(0)
  const snapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const endReachedFiredFor = useRef<number | null>(null)

  // Keep the latest callbacks without re-binding listeners.
  const cb = useRef({ onIndexChange, onSwiped, onEndReached })
  cb.current = { onIndexChange, onSwiped, onEndReached }

  const containerHeight = useCallback(() => containerRef.current?.clientHeight ?? 0, [containerRef])

  const paint = useCallback(
    (idx: number, offsetPx: number, animate: boolean) => {
      const track = trackRef.current
      if (!track) return
      const h = containerHeight()
      const dur = animate && !reducedMotion ? transitionDuration : 0
      track.style.transition = dur ? `transform ${dur}ms ${easing}` : 'none'
      track.style.transform = `translate3d(0, ${-idx * h + offsetPx}px, 0)`
    },
    [trackRef, containerHeight, reducedMotion, transitionDuration, easing],
  )

  const scheduleSnapEnd = useCallback(() => {
    if (snapTimer.current) clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(() => {
      setIsSnapping(false)
      const track = trackRef.current
      if (track) track.style.transition = 'none'
    }, transitionDuration + 20)
  }, [trackRef, transitionDuration])

  const maybeFireEndReached = useCallback(
    (idx: number) => {
      if (total <= 0) return
      const near = idx >= total - 1 - onEndReachedThreshold
      if (near) {
        if (endReachedFiredFor.current !== total) {
          endReachedFiredFor.current = total
          cb.current.onEndReached?.()
        }
      } else {
        endReachedFiredFor.current = null
      }
    },
    [total, onEndReachedThreshold],
  )

  const goTo = useCallback<SwipeEngineApi['goTo']>(
    (target, opts) => {
      if (total <= 0) return
      const from = indexRef.current
      const resolved = loop ? wrapIndex(target, total) : clampIndex(target, total)
      const crossSeam = loop && Math.abs(resolved - from) > 1
      const animate = (opts.animated ?? true) && !crossSeam
      indexRef.current = resolved
      skipSyncPaint.current = true
      paint(resolved, 0, animate)
      setIsSnapping(animate)
      setActiveIndex(resolved)
      if (animate) scheduleSnapEnd()
      if (resolved !== from) {
        cb.current.onIndexChange?.(resolved, { reason: opts.reason })
        if (opts.reason === 'swipe') {
          const direction: SwipeDirection = opts.direction ?? (resolved > from ? 'up' : 'down')
          cb.current.onSwiped?.({ from, to: resolved, direction, velocity: opts.velocity ?? 0 })
        }
      }
      maybeFireEndReached(resolved)
    },
    [total, loop, paint, scheduleSnapEnd, maybeFireEndReached],
  )

  const next = useCallback(
    (reason: IndexChangeReason = 'api') => goTo(indexRef.current + 1, { reason }),
    [goTo],
  )
  const prev = useCallback(
    (reason: IndexChangeReason = 'api') => goTo(indexRef.current - 1, { reason }),
    [goTo],
  )

  const beginDrag = useCallback(() => {
    if (disabled || total <= 0) return
    draggingRef.current = true
    if (snapTimer.current) clearTimeout(snapTimer.current)
    setIsSnapping(false)
  }, [disabled, total])

  const dragBy = useCallback(
    (deltaPx: number) => {
      if (!draggingRef.current) return
      let eff = deltaPx
      const atTop = indexRef.current <= 0 && deltaPx > 0
      const atBottom = indexRef.current >= total - 1 && deltaPx < 0
      if (!loop && (atTop || atBottom)) eff = applyResistance(deltaPx, resistance)
      pendingOffset.current = eff
      if (rafId.current != null) return
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null
        paint(indexRef.current, pendingOffset.current, false)
      })
    },
    [total, loop, resistance, paint],
  )

  const endDrag = useCallback(
    (deltaPx: number, velocityPxPerMs: number) => {
      if (!draggingRef.current) return
      draggingRef.current = false
      if (rafId.current != null) {
        cancelAnimationFrame(rafId.current)
        rafId.current = null
      }
      const resolved = resolveThreshold(threshold, thresholdUnit, containerHeight())
      const decision = decideCommit(deltaPx, velocityPxPerMs, resolved, velocityThreshold)
      if (decision.commit && decision.direction !== 0 && total > 1) {
        const target = indexRef.current + decision.direction
        const canMove = loop || (target >= 0 && target <= total - 1)
        if (canMove) {
          const direction: SwipeDirection = decision.direction === 1 ? 'up' : 'down'
          goTo(target, { reason: 'swipe', animated: true, velocity: velocityPxPerMs, direction })
          return
        }
      }
      setIsSnapping(true)
      paint(indexRef.current, 0, true)
      scheduleSnapEnd()
    },
    [threshold, thresholdUnit, containerHeight, velocityThreshold, total, loop, goTo, paint, scheduleSnapEnd],
  )

  // Sync paint for external/controlled/mount/resize index changes (no animation).
  useIsomorphicLayoutEffect(() => {
    if (skipSyncPaint.current) {
      skipSyncPaint.current = false
      return
    }
    indexRef.current = activeIndex
    paint(activeIndex, 0, false)
  }, [activeIndex, paint])

  // Repaint on container resize.
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => paint(indexRef.current, 0, false))
    ro.observe(el)
    return () => ro.disconnect()
  }, [containerRef, paint])

  // Clean up timers/rAF on unmount.
  useEffect(() => {
    return () => {
      if (snapTimer.current) clearTimeout(snapTimer.current)
      if (rafId.current != null) cancelAnimationFrame(rafId.current)
    }
  }, [])

  return { activeIndex, isSnapping, goTo, next, prev, beginDrag, dragBy, endDrag }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C packages/short-form-view vitest run src/engine/useSwipeEngine.test.tsx`
Expected: PASS (all 5 cases).

> If `requestAnimationFrame` is undefined under jsdom, add to `vitest.setup.ts`:
> ```ts
> if (typeof globalThis.requestAnimationFrame === 'undefined') {
>   globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0) as unknown as number
>   globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>)
> }
> ```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add swipe engine state machine with imperative paint"
```

---

### Task 7: Gesture hooks (pointer, wheel, keyboard)

**Files:**
- Create: `src/engine/gestures/usePointerGestures.ts`, `src/engine/gestures/useWheelNav.ts`, `src/engine/gestures/useKeyboardNav.ts`
- Test: `src/engine/gestures/useKeyboardNav.test.tsx`, `src/engine/gestures/usePointerGestures.test.tsx`

**Interfaces:**
- Consumes: `SwipeEngineApi`, `holds.ts` (`zoneFromX`, `classifyPointerEnd`), types.
- Produces:
  ```ts
  function usePointerGestures(p: {
    containerRef: React.RefObject<HTMLElement | null>
    engine: Pick<SwipeEngineApi, 'beginDrag' | 'dragBy' | 'endDrag'>
    getIndex: () => number
    zones: { left: number; right: number }
    holdDelay: number
    disabled: boolean
    onHoldStart?: (e: ZoneEvent) => void
    onHoldEnd?: (e: ZoneEvent) => void
    onTapZone?: (e: ZoneEvent) => void
  }): void
  function useWheelNav(p: {
    containerRef: React.RefObject<HTMLElement | null>
    engine: Pick<SwipeEngineApi, 'next' | 'prev'>
    disabled: boolean
  }): void
  function useKeyboardNav(p: {
    containerRef: React.RefObject<HTMLElement | null>
    engine: Pick<SwipeEngineApi, 'next' | 'prev' | 'goTo'>
    total: number
    disabled: boolean
  }): void
  ```
- Constants: pointer slop `8px`; wheel step `30`, wheel cooldown `500ms`.

- [ ] **Step 1: Write the failing keyboard test**

`src/engine/gestures/useKeyboardNav.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { useKeyboardNav } from './useKeyboardNav'

function Harness({ next, prev, goTo, total }: any) {
  const ref = useRef<HTMLDivElement>(null)
  useKeyboardNav({ containerRef: ref, engine: { next, prev, goTo }, total, disabled: false })
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
})
```

- [ ] **Step 2: Run keyboard test to verify it fails**

Run: `pnpm -C packages/short-form-view vitest run src/engine/gestures/useKeyboardNav.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `useKeyboardNav.ts`**

```ts
import { useEffect } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'

export function useKeyboardNav(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'next' | 'prev' | 'goTo'>
  total: number
  disabled: boolean
}): void {
  const { containerRef, engine, total, disabled } = p
  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
        case 'PageDown':
          e.preventDefault(); engine.next('key'); break
        case 'ArrowUp':
        case 'PageUp':
          e.preventDefault(); engine.prev('key'); break
        case 'Home':
          e.preventDefault(); engine.goTo(0, { reason: 'key' }); break
        case 'End':
          e.preventDefault(); engine.goTo(total - 1, { reason: 'key' }); break
        default:
          break
      }
    }
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [containerRef, engine, total, disabled])
}
```

- [ ] **Step 4: Run keyboard test to verify it passes**

Run: `pnpm -C packages/short-form-view vitest run src/engine/gestures/useKeyboardNav.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement `useWheelNav.ts`**

```ts
import { useEffect, useRef } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'

const WHEEL_STEP = 30
const WHEEL_COOLDOWN_MS = 500

export function useWheelNav(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'next' | 'prev'>
  disabled: boolean
}): void {
  const { containerRef, engine, disabled } = p
  const accum = useRef(0)
  const cooling = useRef(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || disabled) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (cooling.current) return
      accum.current += e.deltaY
      const step = () => {
        cooling.current = true
        setTimeout(() => { cooling.current = false }, WHEEL_COOLDOWN_MS)
        accum.current = 0
      }
      if (accum.current > WHEEL_STEP) { engine.next('wheel'); step() }
      else if (accum.current < -WHEEL_STEP) { engine.prev('wheel'); step() }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [containerRef, engine, disabled])
}
```

- [ ] **Step 6: Write the failing pointer test (tap vs swipe)**

`src/engine/gestures/usePointerGestures.test.tsx`:
```tsx
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
    const [delta] = endDrag.mock.calls[0]
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
```

- [ ] **Step 7: Run pointer test to verify it fails**

Run: `pnpm -C packages/short-form-view vitest run src/engine/gestures/usePointerGestures.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 8: Implement `usePointerGestures.ts`**

```ts
import { useEffect, useRef } from 'react'
import type { SwipeEngineApi } from '../useSwipeEngine'
import type { ZoneEvent } from '../../types'
import { classifyPointerEnd, zoneFromX } from '../holds'

const SLOP = 8

export function usePointerGestures(p: {
  containerRef: React.RefObject<HTMLElement | null>
  engine: Pick<SwipeEngineApi, 'beginDrag' | 'dragBy' | 'endDrag'>
  getIndex: () => number
  zones: { left: number; right: number }
  holdDelay: number
  disabled: boolean
  onHoldStart?: (e: ZoneEvent) => void
  onHoldEnd?: (e: ZoneEvent) => void
  onTapZone?: (e: ZoneEvent) => void
}): void {
  const { containerRef, engine, getIndex, zones, holdDelay, disabled, onHoldStart, onHoldEnd, onTapZone } = p

  const state = useRef({
    active: false, pointerId: -1,
    startX: 0, startY: 0, lastY: 0, lastT: 0,
    velocity: 0, moved: false, holdFired: false, side: 'center' as ZoneEvent['side'],
    holdTimer: null as ReturnType<typeof setTimeout> | null,
  })

  // Keep latest callbacks/config in a ref so listeners bind once.
  const ext = useRef({ engine, getIndex, zones, holdDelay, onHoldStart, onHoldEnd, onTapZone, disabled })
  ext.current = { engine, getIndex, zones, holdDelay, onHoldStart, onHoldEnd, onTapZone, disabled }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const clearHold = () => {
      if (state.current.holdTimer) { clearTimeout(state.current.holdTimer); state.current.holdTimer = null }
    }

    const onPointerDown = (e: PointerEvent) => {
      const cfg = ext.current
      if (cfg.disabled) return
      const rect = el.getBoundingClientRect()
      const s = state.current
      s.active = true; s.pointerId = e.pointerId
      s.startX = e.clientX; s.startY = e.clientY
      s.lastY = e.clientY; s.lastT = performance.now()
      s.velocity = 0; s.moved = false; s.holdFired = false
      s.side = zoneFromX(e.clientX - rect.left, rect.width, cfg.zones)
      try { el.setPointerCapture(e.pointerId) } catch { /* noop */ }
      clearHold()
      s.holdTimer = setTimeout(() => {
        if (!s.moved) {
          s.holdFired = true
          cfg.onHoldStart?.({ side: s.side, index: cfg.getIndex() })
        }
      }, cfg.holdDelay)
    }

    const onPointerMove = (e: PointerEvent) => {
      const s = state.current
      if (!s.active || e.pointerId !== s.pointerId) return
      const cfg = ext.current
      const dx = e.clientX - s.startX
      const dy = e.clientY - s.startY
      if (!s.moved && Math.hypot(dx, dy) > SLOP) {
        s.moved = true
        clearHold()
        if (s.holdFired) { cfg.onHoldEnd?.({ side: s.side, index: cfg.getIndex() }); s.holdFired = false }
        cfg.engine.beginDrag()
      }
      if (s.moved) {
        const now = performance.now()
        const dt = now - s.lastT
        if (dt > 0) s.velocity = (e.clientY - s.lastY) / dt
        s.lastY = e.clientY; s.lastT = now
        cfg.engine.dragBy(dy)
        e.preventDefault()
      }
    }

    const finish = (e: PointerEvent) => {
      const s = state.current
      if (!s.active || e.pointerId !== s.pointerId) return
      const cfg = ext.current
      s.active = false
      clearHold()
      try { el.releasePointerCapture(e.pointerId) } catch { /* noop */ }
      const dy = e.clientY - s.startY
      if (s.moved) {
        cfg.engine.endDrag(dy, s.velocity)
        return
      }
      const kind = classifyPointerEnd(s.holdFired, false)
      if (kind === 'hold-end') cfg.onHoldEnd?.({ side: s.side, index: cfg.getIndex() })
      else if (kind === 'tap') cfg.onTapZone?.({ side: s.side, index: cfg.getIndex() })
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', finish)
    el.addEventListener('pointercancel', finish)
    return () => {
      clearHold()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', finish)
      el.removeEventListener('pointercancel', finish)
    }
  }, [containerRef])
}
```

- [ ] **Step 9: Run pointer + wheel tests to verify they pass**

Run: `pnpm -C packages/short-form-view vitest run src/engine/gestures`
Expected: PASS (keyboard + pointer suites).

> If jsdom lacks `setPointerCapture`/`releasePointerCapture`, the `try/catch` already guards them. If `PointerEvent` is missing, add to `vitest.setup.ts`:
> ```ts
> if (typeof globalThis.PointerEvent === 'undefined') {
>   class PE extends MouseEvent { pointerId: number; constructor(t: string, p: any = {}) { super(t, p); this.pointerId = p.pointerId ?? 0 } }
>   globalThis.PointerEvent = PE as unknown as typeof PointerEvent
> }
> ```

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add pointer/wheel/keyboard gesture hooks"
```

---

### Task 8: Item renderer + lifecycle

**Files:**
- Create: `src/item/useItemLifecycle.ts`, `src/item/ItemRenderer.tsx`
- Test: `src/item/useItemLifecycle.test.tsx`

**Interfaces:**
- Consumes: `ItemState` type.
- Produces:
  - `useItemLifecycle(isActive: boolean, index: number, item: T, onEnter?, onLeave?): void`
  - `ItemRenderer<T>` (memoized) props:
    ```ts
    interface ItemRendererProps<T> {
      item: T
      index: number
      activeIndex: number
      isSnapping: boolean
      total: number
      renderItem: (item: T, state: ItemState) => ReactNode
      itemClassName?: string
      itemStyle?: CSSProperties
      onItemEnter?: (index: number, item: T) => void
      onItemLeave?: (index: number, item: T) => void
    }
    ```
  - Wrapper element: absolutely positioned, `transform: translateY(index*100%)`, full size.

- [ ] **Step 1: Write the failing lifecycle test**

`src/item/useItemLifecycle.test.tsx`:
```tsx
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -C packages/short-form-view vitest run src/item/useItemLifecycle.test.tsx`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Implement `useItemLifecycle.ts`**

```ts
import { useEffect, useRef } from 'react'

export function useItemLifecycle<T>(
  isActive: boolean,
  index: number,
  item: T,
  onEnter?: (index: number, item: T) => void,
  onLeave?: (index: number, item: T) => void,
): void {
  const wasActive = useRef(false)
  const latest = useRef({ index, item, onEnter, onLeave })
  latest.current = { index, item, onEnter, onLeave }

  useEffect(() => {
    const { index: i, item: it, onEnter: en, onLeave: lv } = latest.current
    if (isActive && !wasActive.current) {
      wasActive.current = true
      en?.(i, it)
    } else if (!isActive && wasActive.current) {
      wasActive.current = false
      lv?.(i, it)
    }
  }, [isActive])

  useEffect(() => {
    return () => {
      if (wasActive.current) {
        const { index: i, item: it, onLeave: lv } = latest.current
        wasActive.current = false
        lv?.(i, it)
      }
    }
  }, [])
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -C packages/short-form-view vitest run src/item/useItemLifecycle.test.tsx`
Expected: PASS.

- [ ] **Step 5: Implement `ItemRenderer.tsx`**

```tsx
import { memo } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import type { ItemState } from '../types'
import { useItemLifecycle } from './useItemLifecycle'

export interface ItemRendererProps<T> {
  item: T
  index: number
  activeIndex: number
  isSnapping: boolean
  total: number
  renderItem: (item: T, state: ItemState) => ReactNode
  itemClassName?: string
  itemStyle?: CSSProperties
  onItemEnter?: (index: number, item: T) => void
  onItemLeave?: (index: number, item: T) => void
}

function ItemRendererInner<T>(props: ItemRendererProps<T>) {
  const { item, index, activeIndex, isSnapping, renderItem, itemClassName, itemStyle, onItemEnter, onItemLeave } = props

  const distance = index - activeIndex
  const isActive = distance === 0
  const isVisible = Math.abs(distance) <= 1
  const state: ItemState = { index, activeIndex, isActive, isVisible, isSnapping, distance }

  useItemLifecycle(isActive, index, item, onItemEnter, onItemLeave)

  const style: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    transform: `translateY(${index * 100}%)`,
    ...itemStyle,
  }

  return (
    <div className={itemClassName} style={style} data-sfv-index={index} aria-hidden={!isActive}>
      {renderItem(item, state)}
    </div>
  )
}

export const ItemRenderer = memo(ItemRendererInner) as typeof ItemRendererInner
```

- [ ] **Step 6: Run all item tests to verify they pass**

Run: `pnpm -C packages/short-form-view vitest run src/item`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add memoized item renderer and lifecycle hook"
```

---

### Task 9: ShortFormView orchestration component

**Files:**
- Create: `src/ShortFormView.tsx`
- Test: `src/ShortFormView.test.tsx`

**Interfaces:**
- Consumes: `useSwipeEngine`, `usePointerGestures`, `useWheelNav`, `useKeyboardNav`, `useWindowedRange`, `ItemRenderer`, `usePrefersReducedMotion`, types.
- Produces: `ShortFormView` — a `forwardRef` generic component exposing `ShortFormHandle`. Default export and named export.

- [ ] **Step 1: Write the failing integration tests**

`src/ShortFormView.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { createRef } from 'react'
import { ShortFormView } from './ShortFormView'
import type { ShortFormHandle } from './types'

interface Slide { id: string; label: string }

function mkData(n: number): Slide[] {
  return Array.from({ length: n }, (_, i) => ({ id: `s${i}`, label: `slide-${i}` }))
}

function renderView(extra: Partial<React.ComponentProps<typeof ShortFormView<Slide>>> = {}, ref?: any) {
  return render(
    <ShortFormView<Slide>
      ref={ref}
      data={extra.data ?? mkData(5)}
      keyExtractor={(s) => s.id}
      renderItem={(s, st) => <div data-testid={`slide-${s.label}`} data-active={st.isActive}>{s.label}</div>}
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
      <ShortFormView<Slide>
        ref={ref}
        data={mkData(3)}
        keyExtractor={(s) => s.id}
        renderItem={(s, st) => <div data-testid={`slide-${s.label}`} data-active={st.isActive}>{s.label}</div>}
      />,
    )
    act(() => ref.current!.scrollToIndex(2, { animated: false }))
    expect(ref.current!.getIndex()).toBe(2)
    rerender(
      <ShortFormView<Slide>
        ref={ref}
        data={mkData(6)}
        keyExtractor={(s) => s.id}
        renderItem={(s, st) => <div data-testid={`slide-${s.label}`} data-active={st.isActive}>{s.label}</div>}
      />,
    )
    expect(ref.current!.getIndex()).toBe(2)
    expect(getByTestId('slide-slide-2').getAttribute('data-active')).toBe('true')
  })

  it('fires onEndReached as it nears the end', () => {
    const onEndReached = vi.fn()
    const ref = createRef<ShortFormHandle>()
    renderView({ onEndReached, onEndReachedThreshold: 1 }, ref)
    act(() => ref.current!.scrollToIndex(3, { animated: false })) // total 5, 5-1-1=3 → fires
    expect(onEndReached).toHaveBeenCalled()
  })

  it('respects controlled index prop', () => {
    const { getByTestId, rerender } = render(
      <ShortFormView<Slide>
        data={mkData(5)}
        index={0}
        keyExtractor={(s) => s.id}
        renderItem={(s, st) => <div data-testid={`slide-${s.label}`} data-active={st.isActive}>{s.label}</div>}
      />,
    )
    rerender(
      <ShortFormView<Slide>
        data={mkData(5)}
        index={2}
        keyExtractor={(s) => s.id}
        renderItem={(s, st) => <div data-testid={`slide-${s.label}`} data-active={st.isActive}>{s.label}</div>}
      />,
    )
    expect(getByTestId('slide-slide-2').getAttribute('data-active')).toBe('true')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -C packages/short-form-view vitest run src/ShortFormView.test.tsx`
Expected: FAIL — cannot find module `./ShortFormView`.

- [ ] **Step 3: Implement `src/ShortFormView.tsx`**

```tsx
'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { CSSProperties, ForwardedRef, ReactElement, Ref } from 'react'
import type { ShortFormHandle, ShortFormViewProps } from './types'
import { useSwipeEngine } from './engine/useSwipeEngine'
import { usePointerGestures } from './engine/gestures/usePointerGestures'
import { useWheelNav } from './engine/gestures/useWheelNav'
import { useKeyboardNav } from './engine/gestures/useKeyboardNav'
import { useWindowedRange } from './virtualization/useWindowedRange'
import { ItemRenderer } from './item/ItemRenderer'
import { usePrefersReducedMotion } from './ssr/usePrefersReducedMotion'

function ShortFormViewInner<T>(props: ShortFormViewProps<T>, ref: ForwardedRef<ShortFormHandle>) {
  const {
    data, renderItem, keyExtractor,
    initialIndex = 0,
    index: controlledIndex,
    onIndexChange, onSwiped,
    threshold = 0.2, thresholdUnit = 'fraction',
    velocityThreshold = 0.3, resistance = 0.3,
    loop = false, disabled = false,
    transitionDuration = 300, easing = 'cubic-bezier(.16,1,.3,1)',
    overscan = 1, onEndReached, onEndReachedThreshold = 2,
    onItemEnter, onItemLeave,
    onHoldStart, onHoldEnd, onTapZone,
    holdDelay = 250, zones = { left: 0.33, right: 0.33 },
    className, style, itemClassName, itemStyle, ariaLabel,
  } = props

  const total = data.length
  const containerRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  const engine = useSwipeEngine({
    total, containerRef, trackRef,
    initialIndex, controlledIndex,
    loop, disabled,
    threshold, thresholdUnit, velocityThreshold, resistance,
    transitionDuration, easing, reducedMotion,
    onIndexChange, onSwiped, onEndReached, onEndReachedThreshold,
  })

  // Controlled-mode sync: follow the parent's index prop.
  useEffect(() => {
    if (controlledIndex == null) return
    if (controlledIndex !== engine.activeIndex) {
      engine.goTo(controlledIndex, { reason: 'api', animated: false })
    }
  }, [controlledIndex, engine])

  useImperativeHandle(ref, () => ({
    scrollToIndex: (i, opts) => engine.goTo(i, { reason: 'api', animated: opts?.animated ?? true }),
    next: () => engine.next('api'),
    prev: () => engine.prev('api'),
    getIndex: () => engine.activeIndex,
  }), [engine])

  usePointerGestures({
    containerRef, engine,
    getIndex: () => engine.activeIndex,
    zones, holdDelay, disabled,
    onHoldStart, onHoldEnd, onTapZone,
  })
  useWheelNav({ containerRef, engine, disabled })
  useKeyboardNav({ containerRef, engine, total, disabled })

  const windowIndices = useWindowedRange(engine.activeIndex, total, overscan, loop)

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: '100dvh',
    touchAction: 'none',
    overscrollBehavior: 'contain',
    outline: 'none',
    ...style,
  }

  const trackStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    willChange: 'transform',
    transform: `translateY(${-engine.activeIndex * 100}%)`,
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={containerStyle}
      tabIndex={disabled ? -1 : 0}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div ref={trackRef} style={trackStyle}>
        {windowIndices.map((i) => {
          const item = data[i] as T
          return (
            <ItemRenderer<T>
              key={keyExtractor(item, i)}
              item={item}
              index={i}
              activeIndex={engine.activeIndex}
              isSnapping={engine.isSnapping}
              total={total}
              renderItem={renderItem}
              itemClassName={itemClassName}
              itemStyle={itemStyle}
              onItemEnter={onItemEnter}
              onItemLeave={onItemLeave}
            />
          )
        })}
      </div>
    </div>
  )
}

export const ShortFormView = forwardRef(ShortFormViewInner) as <T>(
  props: ShortFormViewProps<T> & { ref?: Ref<ShortFormHandle> },
) => ReactElement

export default ShortFormView
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm -C packages/short-form-view vitest run src/ShortFormView.test.tsx`
Expected: PASS (all 6 cases).

> The initial declarative `trackStyle` transform (`%`) is overwritten by the engine's imperative `paint()` on mount (px). Both resolve to the same pixel offset, so there is no visual jump. The `%` form is what the server renders, keeping SSR correct without measurement.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add ShortFormView orchestration component"
```

---

### Task 10: Public exports + full build verification

**Files:**
- Modify: `src/index.ts`
- Test: full suite + build + typecheck

**Interfaces:**
- Produces public API surface: `ShortFormView` (named + default), and all public types.

- [ ] **Step 1: Replace `src/index.ts`**

```ts
export { ShortFormView, default } from './ShortFormView'
export type {
  ShortFormViewProps,
  ShortFormHandle,
  ItemState,
  SwipeEvent,
  ZoneEvent,
  IndexChangeMeta,
  SwipeDirection,
  ZoneSide,
  IndexChangeReason,
  ThresholdUnit,
} from './types'
```

- [ ] **Step 2: Delete the placeholder smoke test**

Run:
```bash
git rm packages/short-form-view/src/__smoke__.test.ts
```
(The `VERSION` export is gone; the smoke test would now fail to import.)

- [ ] **Step 3: Run the full unit suite with coverage**

Run: `pnpm -C packages/short-form-view test:cov`
Expected: all suites PASS; coverage for `src/**` >= 80% lines.

- [ ] **Step 4: Typecheck and build**

Run:
```bash
pnpm -C packages/short-form-view typecheck
pnpm -C packages/short-form-view build
```
Expected: no type errors; `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` emitted, with `ShortFormView` and types present in the `.d.ts`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: finalize public exports and verify build"
```

---

### Task 11: Next.js demo with mixed feed

**Files:**
- Create: `examples/next-demo/package.json`, `next.config.js`, `tsconfig.json`, `app/layout.tsx`, `app/page.tsx`
- Create: `examples/next-demo/components/feed.ts`, `VideoCard.tsx`, `AdGrid.tsx`, `VideoAdBanner.tsx`

**Interfaces:**
- Consumes: `short-form-view` (workspace dependency).
- Produces: a runnable Next.js App Router page demonstrating a mixed feed (video, 2×2 ad grid, video-ad + banner) with infinite append, used by Playwright in Task 12.

- [ ] **Step 1: Create `examples/next-demo/package.json`**

```json
{
  "name": "next-demo",
  "private": true,
  "version": "0.0.0",
  "scripts": {
    "dev": "next dev -p 3100",
    "build": "next build",
    "start": "next start -p 3100",
    "test:e2e": "playwright test",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "short-form-view": "workspace:*"
  },
  "devDependencies": {
    "@playwright/test": "^1.47.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `next.config.js`, `tsconfig.json`, `app/layout.tsx`**

`next.config.js`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = { transpilePackages: ['short-form-view'], reactStrictMode: true }
module.exports = nextConfig
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "plugins": [{ "name": "next" }]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

`app/layout.tsx`:
```tsx
export const metadata = { title: 'short-form-view demo' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#000' }}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 3: Create `components/feed.ts` (data model + generator)**

```ts
export type FeedItem =
  | { id: string; kind: 'video'; src: string; poster: string; title: string }
  | { id: string; kind: 'ad-grid'; tiles: { label: string; color: string }[] }
  | { id: string; kind: 'video-ad'; src: string; banner: string; cta: string }

const COLORS = ['#ff5d5d', '#5d9dff', '#5dffa0', '#ffd35d', '#c95dff', '#5dfff0']

export function makeFeed(start: number, count: number): FeedItem[] {
  const out: FeedItem[] = []
  for (let n = start; n < start + count; n++) {
    const slot = n % 8
    if (slot === 3) {
      out.push({
        id: `item-${n}`,
        kind: 'ad-grid',
        tiles: Array.from({ length: 4 }, (_, t) => ({
          label: `Ad ${n}.${t}`,
          color: COLORS[(n + t) % COLORS.length] as string,
        })),
      })
    } else if (slot === 7) {
      out.push({
        id: `item-${n}`,
        kind: 'video-ad',
        src: `https://example.com/ad-${n}.mp4`,
        banner: `Sponsored • Offer #${n}`,
        cta: 'Learn more',
      })
    } else {
      out.push({
        id: `item-${n}`,
        kind: 'video',
        src: `https://example.com/clip-${n}.mp4`,
        poster: `https://picsum.photos/seed/${n}/720/1280`,
        title: `Clip ${n}`,
      })
    }
  }
  return out
}
```

- [ ] **Step 4: Create the three view components**

`components/VideoCard.tsx`:
```tsx
'use client'
import { useEffect, useRef } from 'react'

export function VideoCard({ src, poster, title, active }: {
  src: string; poster: string; title: string; active: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (active) v.play().catch(() => {})
    else v.pause()
  }, [active])
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111' }}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        data-testid="video"
        data-active={active}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div style={{ position: 'absolute', left: 16, bottom: 24, color: '#fff', fontWeight: 700 }}>
        {title}
      </div>
    </div>
  )
}
```

`components/AdGrid.tsx`:
```tsx
export function AdGrid({ tiles }: { tiles: { label: string; color: string }[] }) {
  return (
    <div
      data-testid="ad-grid"
      style={{
        width: '100%', height: '100%', display: 'grid',
        gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr',
        gap: 8, padding: 8, boxSizing: 'border-box', background: '#000',
      }}
    >
      {tiles.map((t, i) => (
        <div key={i} style={{
          background: t.color, borderRadius: 16, display: 'grid', placeItems: 'center',
          color: '#000', fontWeight: 800,
        }}>
          {t.label}
        </div>
      ))}
    </div>
  )
}
```

`components/VideoAdBanner.tsx`:
```tsx
export function VideoAdBanner({ src, banner, cta, active }: {
  src: string; banner: string; cta: string; active: boolean
}) {
  return (
    <div data-testid="video-ad" style={{ position: 'relative', width: '100%', height: '100%', background: '#1a1a1a' }}>
      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#888' }}>
        {active ? 'video ad playing' : 'video ad paused'}
      </div>
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'rgba(0,0,0,.6)', color: '#fff',
      }}>
        <span>{banner}</span>
        <button style={{ padding: '8px 14px', borderRadius: 999, border: 0, fontWeight: 700 }}>{cta}</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create `app/page.tsx` (the demo)**

```tsx
'use client'
import { useCallback, useRef, useState } from 'react'
import { ShortFormView } from 'short-form-view'
import { makeFeed, type FeedItem } from '../components/feed'
import { VideoCard } from '../components/VideoCard'
import { AdGrid } from '../components/AdGrid'
import { VideoAdBanner } from '../components/VideoAdBanner'

export default function Page() {
  const [items, setItems] = useState<FeedItem[]>(() => makeFeed(0, 8))
  const loadingRef = useRef(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const loadMore = useCallback(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    // Simulate an async API append.
    setTimeout(() => {
      setItems((prev) => [...prev, ...makeFeed(prev.length, 8)])
      loadingRef.current = false
    }, 150)
  }, [])

  return (
    <main>
      <div
        data-testid="hud"
        style={{ position: 'fixed', top: 8, left: 8, zIndex: 10, color: '#fff', font: '12px monospace' }}
      >
        index:{activeIndex} count:{items.length}
      </div>
      <ShortFormView<FeedItem>
        data={items}
        keyExtractor={(it) => it.id}
        threshold={0.2}
        onIndexChange={(i) => setActiveIndex(i)}
        onEndReached={loadMore}
        onEndReachedThreshold={2}
        renderItem={(item, state) => {
          switch (item.kind) {
            case 'video':
              return <VideoCard src={item.src} poster={item.poster} title={item.title} active={state.isActive} />
            case 'ad-grid':
              return <AdGrid tiles={item.tiles} />
            case 'video-ad':
              return <VideoAdBanner src={item.src} banner={item.banner} cta={item.cta} active={state.isActive} />
          }
        }}
      />
    </main>
  )
}
```

- [ ] **Step 6: Install and verify the demo builds**

Run:
```bash
pnpm install
pnpm -C packages/short-form-view build
pnpm -C examples/next-demo build
```
Expected: library builds; Next.js build succeeds (SSR compiles the page without `window` errors).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Next.js demo with mixed video/ad feed and infinite append"
```

---

### Task 12: Playwright E2E + visual tests

**Files:**
- Create: `examples/next-demo/playwright.config.ts`, `examples/next-demo/tests/feed.spec.ts`

**Interfaces:**
- Consumes: the running demo from Task 11.
- Produces: E2E coverage for swipe navigation, active video play/pause, ad rendering, infinite append, keyboard nav, and viewport screenshots.

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  use: { baseURL: 'http://localhost:3100', trace: 'on-first-retry' },
  webServer: {
    command: 'pnpm build && pnpm start',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    { name: 'mobile', use: { ...devices['iPhone 13'] } },
    { name: 'desktop', use: { viewport: { width: 1024, height: 768 } } },
  ],
})
```

- [ ] **Step 2: Write `tests/feed.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

async function swipeUp(page: import('@playwright/test').Page) {
  const box = await page.locator('[role="group"]').boundingBox()
  if (!box) throw new Error('container not found')
  const cx = box.x + box.width / 2
  const startY = box.y + box.height * 0.8
  const endY = box.y + box.height * 0.2
  await page.mouse.move(cx, startY)
  await page.mouse.down()
  await page.mouse.move(cx, endY, { steps: 12 })
  await page.mouse.up()
  await page.waitForTimeout(400)
}

test('loads the first slide and HUD', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('hud')).toContainText('index:0')
  await expect(page.getByTestId('video').first()).toBeVisible()
})

test('swiping up advances the index', async ({ page }) => {
  await page.goto('/')
  await swipeUp(page)
  await expect(page.getByTestId('hud')).toContainText('index:1')
})

test('keyboard ArrowDown advances the index', async ({ page }) => {
  await page.goto('/')
  await page.locator('[role="group"]').focus()
  await page.keyboard.press('ArrowDown')
  await page.waitForTimeout(400)
  await expect(page.getByTestId('hud')).toContainText('index:1')
})

test('renders the 2x2 ad grid at slot 3', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 3; i++) await swipeUp(page)
  await expect(page.getByTestId('ad-grid')).toBeVisible()
})

test('infinite append grows the feed near the end', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('hud')).toContainText('count:8')
  for (let i = 0; i < 6; i++) await swipeUp(page)
  await expect(page.getByTestId('hud')).toContainText('count:16')
})

test('visual screenshots at key viewports', async ({ page }) => {
  for (const [w, h] of [[320, 640], [768, 1024], [1024, 768], [1440, 900]] as const) {
    await page.setViewportSize({ width: w, height: h })
    await page.goto('/')
    await expect(page).toHaveScreenshot(`feed-${w}x${h}.png`, { maxDiffPixelRatio: 0.02 })
  }
})
```

- [ ] **Step 3: Install browsers and run E2E**

Run:
```bash
pnpm -C examples/next-demo exec playwright install --with-deps chromium
pnpm -C examples/next-demo test:e2e
```
Expected: functional tests PASS. The screenshot test creates baselines on first run (review them), then passes on subsequent runs.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test: add Playwright E2E and visual tests for the demo"
```

---

### Task 13: README + final verification

**Files:**
- Create: `packages/short-form-view/README.md`, root `README.md`

**Interfaces:**
- Produces: usage docs covering the mixed-feed use case, all props, callbacks, and the imperative handle.

- [ ] **Step 1: Write `packages/short-form-view/README.md`**

Include: install, a minimal mixed-feed example (copy the shape from `app/page.tsx`), a full props table (every prop in `ShortFormViewProps` with its default from Global Constraints), the `ItemState` fields, the `ShortFormHandle` methods, the press-hold/zone callbacks, and an SSR/Next.js note (`'use client'` is built in; no CSS import needed).

- [ ] **Step 2: Write root `README.md`**

One paragraph describing the monorepo, how to run the demo (`pnpm -C examples/next-demo dev`), and how to run tests (`pnpm test`, `pnpm -C examples/next-demo test:e2e`).

- [ ] **Step 3: Final full verification**

Run:
```bash
pnpm -C packages/short-form-view test:cov
pnpm -C packages/short-form-view typecheck
pnpm -C packages/short-form-view build
pnpm -C examples/next-demo build
```
Expected: unit suite green with >= 80% coverage; no type errors; both builds succeed.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: add library and monorepo READMEs"
```

---

## Self-Review

**Spec coverage check (spec §-by-§):**
- §1 mixed-feed view connector → `renderItem` switch in Task 11; Task 9 mounts arbitrary nodes. ✓
- §2 locked decisions → Task 1 (deps/repo/target), Task 6 (transform engine), Task 9 (`data`+`renderItem`). ✓
- §3 track-translate model → Task 6 `paint`, Task 8 item `translateY(index*100%)`, Task 9 track. ✓
- §3 perf (no per-frame re-render) → Task 6 rAF imperative paint; Task 8 `memo`. ✓
- §4 full API → Task 2 types; Task 9 wires every prop. ✓ (every prop consumed)
- §5 gesture engine + 4 inputs → Tasks 6 (engine) + 7 (pointer/wheel/keyboard). ✓
- §5 press-hold/swipe coexistence → Task 7 `usePointerGestures` slop logic; Task 5 pure classify. ✓
- §6 virtualization + dynamic growth + onEndReached → Task 4 window; Task 6 `maybeFireEndReached`; Task 9 append test. ✓
- §7 SSR/Next.js/reduced-motion → Task 2 ssr utils; Task 9 `'use client'` + `%` first paint; Task 11 Next build. ✓
- §8 inline styling, no CSS import → Task 9 inline styles only. ✓
- §10 testing (unit + E2E + viewports + reduced-motion) → Tasks 3–9 unit, Task 12 E2E + screenshots. ✓
- §11 YAGNI exclusions → not implemented. ✓

**Placeholder scan:** No `TBD`/`TODO`/"handle edge cases"/"similar to Task N" — all code is concrete. ✓

**Type consistency check:**
- `SwipeEngineApi` shape identical in Task 6 interface block and implementation. ✓
- `decideCommit` direction `1=next/-1=prev` used consistently in Task 3 and Task 6 `endDrag`. ✓
- `goTo(target, { reason, animated?, velocity?, direction? })` signature matches across Task 6, Task 7 (keyboard `goTo(0,{reason:'key'})`), and Task 9 handle. ✓
- `ItemRendererProps` in Task 8 matches the JSX in Task 9. ✓
- `computeWindowIndices(activeIndex, total, overscan, loop)` arg order identical in Task 4 and Task 9 `useWindowedRange`. ✓
- `usePointerGestures` param object matches Task 7 definition and Task 9 call site. ✓

No gaps found.

## Execution note

Reduced-motion default in unit tests uses `reducedMotion: true` / `transitionDuration: 0` so transitions resolve synchronously, keeping tests deterministic without fake timers where possible. The real component reads `prefers-reduced-motion` via `usePrefersReducedMotion`.
