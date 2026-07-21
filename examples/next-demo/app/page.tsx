'use client'
import { useCallback, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { ShortFormView } from 'short-form-view'
import type { IndexChangeReason, ItemState, ShortFormHandle } from 'short-form-view'
import { makeFeed, type FeedItem } from '../components/feed'
import { VideoCard } from '../components/VideoCard'
import { AdGrid } from '../components/AdGrid'
import { VideoAdBanner } from '../components/VideoAdBanner'
import {
  ChevronDown,
  ChevronUp,
  Home,
  ListPlus,
  MessageSquare,
  Plus,
  RotateCcw,
  Search,
  Settings2,
} from 'lucide-react'
import { CreateTab } from '../components/icons'

export default function Page() {
  const [items, setItems] = useState<FeedItem[]>(() => makeFeed(0, 8))
  const [activeIndex, setActiveIndex] = useState(0)
  const [lastReason, setLastReason] = useState<IndexChangeReason>('api')
  const [threshold, setThreshold] = useState(0.18)
  const [transitionDuration, setTransitionDuration] = useState(300)
  const [overscan, setOverscan] = useState(1)
  const [prefetchRange, setPrefetchRange] = useState(1)
  const [loop, setLoop] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [swipeEnabled, setSwipeEnabled] = useState(true)
  const [wheelEnabled, setWheelEnabled] = useState(true)
  const [keyboardEnabled, setKeyboardEnabled] = useState(true)
  const [ignoreInteractiveElements, setIgnoreInteractiveElements] = useState(true)
  const [holdEnabled, setHoldEnabled] = useState(true)
  const [tapZonesEnabled, setTapZonesEnabled] = useState(true)
  const [preserveActiveItem, setPreserveActiveItem] = useState(true)
  const [stopEndFetch, setStopEndFetch] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [endReachedCount, setEndReachedCount] = useState(0)
  const [prefetchLog, setPrefetchLog] = useState<string[]>([])
  const [eventLog, setEventLog] = useState<string[]>(['ready'])
  const feedRef = useRef<ShortFormHandle>(null)
  const loadingRef = useRef(false)
  const prependSeedRef = useRef(10_000)

  const activeItem = items[activeIndex]

  const pushEvent = useCallback((message: string) => {
    setEventLog((prev) => [message, ...prev].slice(0, 5))
  }, [])

  const loadMore = useCallback(() => {
    if (loadingRef.current) return
    if (stopEndFetch) {
      pushEvent('end fetch stopped')
      return
    }
    loadingRef.current = true
    setLoadingMore(true)
    setEndReachedCount((count) => count + 1)
    pushEvent('onEndReached fired')
    // Simulate an async API page append.
    setTimeout(() => {
      setItems((prev) => [...prev, ...makeFeed(prev.length, 8)])
      loadingRef.current = false
      setLoadingMore(false)
    }, 250)
  }, [pushEvent, stopEndFetch])

  const handleIndexChange = useCallback((index: number, meta: { reason: IndexChangeReason }) => {
    setActiveIndex(index)
    setLastReason(meta.reason)
    pushEvent(`index ${index} via ${meta.reason}`)
  }, [pushEvent])

  const appendPage = useCallback(() => {
    setItems((prev) => [...prev, ...makeFeed(prev.length, 8)])
    pushEvent('appended 8 items')
  }, [pushEvent])

  const prependRefresh = useCallback(() => {
    const start = prependSeedRef.current
    prependSeedRef.current += 2
    setItems((prev) => [...makeFeed(start, 2), ...prev])
    pushEvent('prepended 2 items')
  }, [pushEvent])

  const resetFeed = useCallback(() => {
    loadingRef.current = false
    prependSeedRef.current = 10_000
    setItems(makeFeed(0, 8))
    setActiveIndex(0)
    setLastReason('api')
    setStopEndFetch(false)
    setEndReachedCount(0)
    setPrefetchLog([])
    setEventLog(['reset feed'])
  }, [])

  const handlePrefetch = useCallback(({ index, item, distance }: { index: number; item: FeedItem; distance: number }) => {
    const signed = distance > 0 ? `+${distance}` : String(distance)
    setPrefetchLog((prev) => [`#${index} ${labelForKind(item.kind)} (${signed})`, ...prev].slice(0, 5))
  }, [])

  return (
    <div className="sfv-stage">
      <div className="sfv-phone-shell" aria-label="Interactive phone preview">
        <div className="sfv-phone">
          <ShortFormView<FeedItem>
            ref={feedRef}
            style={{ height: '100%' }}
            data={items}
            index={activeIndex}
            keyExtractor={feedKeyExtractor}
            threshold={threshold}
            transitionDuration={transitionDuration}
            overscan={overscan}
            loop={loop}
            disabled={disabled}
            swipeEnabled={swipeEnabled}
            wheelEnabled={wheelEnabled}
            keyboardEnabled={keyboardEnabled}
            ignoreInteractiveElements={ignoreInteractiveElements}
            holdEnabled={holdEnabled}
            tapZonesEnabled={tapZonesEnabled}
            preserveActiveItemOnDataChange={preserveActiveItem}
            prefetchRange={prefetchRange}
            ariaLabel="Short-form video feed"
            getItemAriaLabel={getFeedItemAriaLabel}
            onIndexChange={handleIndexChange}
            onSwiped={({ to, direction }) => pushEvent(`swiped ${direction} to ${to}`)}
            onPrefetch={handlePrefetch}
            onEndReached={loadMore}
            onEndReachedThreshold={2}
            renderItem={renderFeedItem}
          />

          <TopTabs />
          <BottomNav />

          <span data-testid="hud" style={srOnly}>
            index:{activeIndex} count:{items.length}
          </span>
        </div>
      </div>

      <ControlPanel
        activeIndex={activeIndex}
        total={items.length}
        activeKind={activeItem ? labelForKind(activeItem.kind) : 'None'}
        lastReason={lastReason}
        endReachedCount={endReachedCount}
        loadingMore={loadingMore}
        threshold={threshold}
        setThreshold={setThreshold}
        transitionDuration={transitionDuration}
        setTransitionDuration={setTransitionDuration}
        overscan={overscan}
        setOverscan={setOverscan}
        prefetchRange={prefetchRange}
        setPrefetchRange={setPrefetchRange}
        loop={loop}
        setLoop={setLoop}
        disabled={disabled}
        setDisabled={setDisabled}
        swipeEnabled={swipeEnabled}
        setSwipeEnabled={setSwipeEnabled}
        wheelEnabled={wheelEnabled}
        setWheelEnabled={setWheelEnabled}
        keyboardEnabled={keyboardEnabled}
        setKeyboardEnabled={setKeyboardEnabled}
        ignoreInteractiveElements={ignoreInteractiveElements}
        setIgnoreInteractiveElements={setIgnoreInteractiveElements}
        holdEnabled={holdEnabled}
        setHoldEnabled={setHoldEnabled}
        tapZonesEnabled={tapZonesEnabled}
        setTapZonesEnabled={setTapZonesEnabled}
        preserveActiveItem={preserveActiveItem}
        setPreserveActiveItem={setPreserveActiveItem}
        stopEndFetch={stopEndFetch}
        setStopEndFetch={setStopEndFetch}
        prefetchLog={prefetchLog}
        eventLog={eventLog}
        onPrev={() => feedRef.current?.prev()}
        onNext={() => feedRef.current?.next()}
        onAppend={appendPage}
        onPrepend={prependRefresh}
        onReset={resetFeed}
      />
    </div>
  )
}

function feedKeyExtractor(item: FeedItem): string {
  return item.id
}

function getFeedItemAriaLabel(index: number, item: FeedItem, total: number): string {
  return `${labelForKind(item.kind)} ${index + 1} of ${total}`
}

function renderFeedItem(item: FeedItem, state: ItemState) {
  switch (item.kind) {
    case 'video':
      return <VideoCard item={item} active={state.isActive} />
    case 'ad-grid':
      return <AdGrid item={item} />
    case 'video-ad':
      return <VideoAdBanner item={item} active={state.isActive} />
  }
}

function labelForKind(kind: FeedItem['kind']): string {
  switch (kind) {
    case 'video':
      return 'Video'
    case 'ad-grid':
      return 'Product grid'
    case 'video-ad':
      return 'Video ad'
  }
}

interface ControlPanelProps {
  activeIndex: number
  total: number
  activeKind: string
  lastReason: IndexChangeReason
  endReachedCount: number
  loadingMore: boolean
  threshold: number
  setThreshold: (value: number) => void
  transitionDuration: number
  setTransitionDuration: (value: number) => void
  overscan: number
  setOverscan: (value: number) => void
  prefetchRange: number
  setPrefetchRange: (value: number) => void
  loop: boolean
  setLoop: (value: boolean) => void
  disabled: boolean
  setDisabled: (value: boolean) => void
  swipeEnabled: boolean
  setSwipeEnabled: (value: boolean) => void
  wheelEnabled: boolean
  setWheelEnabled: (value: boolean) => void
  keyboardEnabled: boolean
  setKeyboardEnabled: (value: boolean) => void
  ignoreInteractiveElements: boolean
  setIgnoreInteractiveElements: (value: boolean) => void
  holdEnabled: boolean
  setHoldEnabled: (value: boolean) => void
  tapZonesEnabled: boolean
  setTapZonesEnabled: (value: boolean) => void
  preserveActiveItem: boolean
  setPreserveActiveItem: (value: boolean) => void
  stopEndFetch: boolean
  setStopEndFetch: (value: boolean) => void
  prefetchLog: string[]
  eventLog: string[]
  onPrev: () => void
  onNext: () => void
  onAppend: () => void
  onPrepend: () => void
  onReset: () => void
}

function ControlPanel(props: ControlPanelProps) {
  return (
    <aside className="sfv-control-panel" data-testid="control-panel" aria-label="Demo controls">
      <header className="sfv-panel-header">
        <span className="sfv-panel-icon" aria-hidden="true"><Settings2 size={20} /></span>
        <div>
          <p className="sfv-eyebrow">Live controls</p>
          <h1>short-form-view lab</h1>
        </div>
      </header>

      <section className="sfv-control-section" aria-label="Feed status">
        <div className="sfv-metrics">
          <Metric label="Index" value={`${props.activeIndex} / ${Math.max(props.total - 1, 0)}`} />
          <Metric label="Items" value={String(props.total)} />
          <Metric label="Active" value={props.activeKind} />
          <Metric label="Reason" value={props.lastReason} />
        </div>
      </section>

      <section className="sfv-control-section" aria-label="Navigation controls">
        <div className="sfv-button-grid">
          <ActionButton label="Previous item" icon={<ChevronUp size={17} />} onClick={props.onPrev} />
          <ActionButton label="Next item" icon={<ChevronDown size={17} />} onClick={props.onNext} primary />
          <ActionButton label="Reset feed" icon={<RotateCcw size={17} />} onClick={props.onReset} wide />
        </div>
      </section>

      <section className="sfv-control-section" aria-label="Data controls">
        <div className="sfv-button-grid">
          <ActionButton label="Append page" icon={<Plus size={17} />} onClick={props.onAppend} />
          <ActionButton label="Prepend refresh" icon={<ListPlus size={17} />} onClick={props.onPrepend} />
        </div>
        <p className="sfv-inline-note">
          {props.stopEndFetch
            ? 'Automatic end fetch is stopped'
            : props.loadingMore
              ? 'Loading the next page...'
              : `onEndReached fired ${props.endReachedCount} times`}
        </p>
      </section>

      <section className="sfv-control-section" aria-label="Gesture tuning">
        <SliderControl
          label="Swipe threshold"
          value={props.threshold}
          min={0.08}
          max={0.5}
          step={0.01}
          display={`${Math.round(props.threshold * 100)}%`}
          onChange={props.setThreshold}
        />
        <SliderControl
          label="Transition"
          value={props.transitionDuration}
          min={0}
          max={700}
          step={25}
          display={`${props.transitionDuration}ms`}
          onChange={props.setTransitionDuration}
        />
        <SliderControl
          label="Overscan"
          value={props.overscan}
          min={0}
          max={3}
          step={1}
          display={String(props.overscan)}
          onChange={props.setOverscan}
        />
        <SliderControl
          label="Prefetch range"
          value={props.prefetchRange}
          min={0}
          max={4}
          step={1}
          display={String(props.prefetchRange)}
          onChange={props.setPrefetchRange}
        />
      </section>

      <section className="sfv-control-section" aria-label="Behavior toggles">
        <div className="sfv-toggle-grid">
          <ToggleControl label="Loop feed" checked={props.loop} onChange={props.setLoop} />
          <ToggleControl label="Disable all input" checked={props.disabled} onChange={props.setDisabled} />
          <ToggleControl label="Touch swipe" checked={props.swipeEnabled} onChange={props.setSwipeEnabled} />
          <ToggleControl label="Wheel input" checked={props.wheelEnabled} onChange={props.setWheelEnabled} />
          <ToggleControl label="Keyboard nav" checked={props.keyboardEnabled} onChange={props.setKeyboardEnabled} />
          <ToggleControl
            label="Ignore interactive children"
            checked={props.ignoreInteractiveElements}
            onChange={props.setIgnoreInteractiveElements}
          />
          <ToggleControl label="Hold zones" checked={props.holdEnabled} onChange={props.setHoldEnabled} />
          <ToggleControl label="Tap zones" checked={props.tapZonesEnabled} onChange={props.setTapZonesEnabled} />
          <ToggleControl
            label="Preserve active item"
            checked={props.preserveActiveItem}
            onChange={props.setPreserveActiveItem}
          />
          <ToggleControl label="Stop end fetch" checked={props.stopEndFetch} onChange={props.setStopEndFetch} />
        </div>
      </section>

      <section className="sfv-control-section sfv-control-section-last" aria-label="Callback output">
        <LogBlock title="Prefetch" items={props.prefetchLog} empty="No prefetch hints yet" />
        <LogBlock title="Events" items={props.eventLog} empty="No events yet" />
      </section>
    </aside>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="sfv-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ActionButton({ label, icon, onClick, primary, wide }: {
  label: string
  icon: ReactNode
  onClick: () => void
  primary?: boolean
  wide?: boolean
}) {
  const className = [
    'sfv-action',
    primary ? 'sfv-action-primary' : '',
    wide ? 'sfv-action-wide' : '',
  ].filter(Boolean).join(' ')

  return (
    <button className={className} type="button" onClick={onClick}>
      {icon}
      <span>{label}</span>
    </button>
  )
}

function SliderControl({ label, value, min, max, step, display, onChange }: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (value: number) => void
}) {
  return (
    <label className="sfv-slider-row">
      <span>
        <span>{label}</span>
        <strong>{display}</strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
    </label>
  )
}

function ToggleControl({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="sfv-toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  )
}

function LogBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div className="sfv-log-block">
      <div className="sfv-log-title">{title}</div>
      <div className="sfv-log-list">
        {(items.length ? items : [empty]).map((item, index) => (
          <span key={`${item}-${index}`}>{item}</span>
        ))}
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
