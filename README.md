# short-form-view (monorepo)

A zero-dependency React library for Instagram / TikTok-style vertical swipe feeds that connect arbitrary views (video, ad grids, banners) into one smooth, virtualized, SSR-safe pager.

- **`packages/short-form-view`** — the library. See its [README](packages/short-form-view/README.md).
- **`examples/next-demo`** — a Next.js App Router demo with a mixed video / 2×2 ad-grid / video-ad feed and infinite append.

## Develop

```bash
pnpm install

# library
pnpm test                 # unit tests (vitest)
pnpm -C packages/short-form-view test:cov   # with coverage
pnpm build                # build the library (tsup)

# demo
pnpm -C examples/next-demo dev              # http://localhost:3100
pnpm -C examples/next-demo test:e2e         # Playwright E2E + visual tests
```

The demo depends on the built library, so run `pnpm build` before `pnpm -C examples/next-demo build`.
