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
              return <VideoCard src={item.src} bg={item.bg} title={item.title} active={state.isActive} />
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
