'use client'
import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ShortFormView } from 'short-form-view'
import { makeFeed, type FeedItem } from '../components/feed'
import { VideoCard } from '../components/VideoCard'
import { AdGrid } from '../components/AdGrid'
import { VideoAdBanner } from '../components/VideoAdBanner'
import { Home, MessageSquare, Search } from 'lucide-react'
import { CreateTab } from '../components/icons'

export default function Page() {
  const [items, setItems] = useState<FeedItem[]>(() => makeFeed(0, 8))
  const [activeIndex, setActiveIndex] = useState(0)
  const loadingRef = useRef(false)

  const loadMore = useCallback(() => {
    if (loadingRef.current) return
    loadingRef.current = true
    // Simulate an async API page append.
    setTimeout(() => {
      setItems((prev) => [...prev, ...makeFeed(prev.length, 8)])
      loadingRef.current = false
    }, 250)
  }, [])

  return (
    <div className="sfv-stage">
      <div className="sfv-phone">
        <ShortFormView<FeedItem>
          style={{ height: '100%' }}
          data={items}
          keyExtractor={(it) => it.id}
          threshold={0.18}
          ariaLabel="Short-form video feed"
          onIndexChange={(i) => setActiveIndex(i)}
          onEndReached={loadMore}
          onEndReachedThreshold={2}
          renderItem={(item, state) => {
            switch (item.kind) {
              case 'video':
                return <VideoCard item={item} active={state.isActive} />
              case 'ad-grid':
                return <AdGrid item={item} />
              case 'video-ad':
                return <VideoAdBanner item={item} active={state.isActive} />
            }
          }}
        />

        <TopTabs />
        <BottomNav />

        <span data-testid="hud" style={srOnly}>
          index:{activeIndex} count:{items.length}
        </span>
      </div>
    </div>
  )
}

function TopTabs() {
  return (
    <div style={topBar}>
      <div style={{ width: 22 }} />
      <div style={tabs}>
        <span style={{ color: 'rgba(255,255,255,.6)', fontWeight: 600 }}>Following</span>
        <span style={{ position: 'relative', fontWeight: 800 }}>
          For You
          <span style={tabUnderline} />
        </span>
      </div>
      <span style={{ color: '#fff', opacity: 0.9, display: 'grid', placeItems: 'center' }}><Search size={22} /></span>
    </div>
  )
}

function BottomNav() {
  return (
    <div style={bottomBar}>
      <NavItem active><Home size={24} /><span style={navLabel}>Home</span></NavItem>
      <NavItem><Search size={24} /><span style={navLabel}>Discover</span></NavItem>
      <span style={{ display: 'grid', placeItems: 'center' }}><CreateTab /></span>
      <NavItem><MessageSquare size={24} /><span style={navLabel}>Inbox</span></NavItem>
      <NavItem>
        <span style={profileDot} />
        <span style={navLabel}>Profile</span>
      </NavItem>
    </div>
  )
}

function NavItem({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div style={{ ...navItem, color: active ? '#fff' : 'rgba(255,255,255,.6)' }}>{children}</div>
  )
}

const srOnly: CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
}
const topBar: CSSProperties = {
  position: 'absolute', top: 0, left: 0, right: 0, height: 52, zIndex: 5,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '0 16px', color: '#fff', pointerEvents: 'none',
}
const tabs: CSSProperties = { display: 'flex', gap: 18, fontSize: 16 }
const tabUnderline: CSSProperties = {
  position: 'absolute', left: '50%', bottom: -7, transform: 'translateX(-50%)',
  width: 22, height: 3, borderRadius: 2, background: '#fff',
}
const bottomBar: CSSProperties = {
  position: 'absolute', bottom: 0, left: 0, right: 0, height: 56, zIndex: 5,
  display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', alignItems: 'center',
  background: 'linear-gradient(0deg, rgba(0,0,0,.92), rgba(0,0,0,.7))',
  borderTop: '1px solid rgba(255,255,255,.08)', pointerEvents: 'none',
}
const navItem: CSSProperties = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }
const navLabel: CSSProperties = { fontSize: 10, fontWeight: 600 }
const profileDot: CSSProperties = {
  width: 22, height: 22, borderRadius: '50%',
  background: 'linear-gradient(135deg,#fe2c55,#25f4ee)', border: '1.5px solid #fff',
}
