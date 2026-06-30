'use client'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { SponsoredVideoItem } from './feed'
import { StarIcon } from './icons'

const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() }

export function VideoAdBanner({ item, active }: { item: SponsoredVideoItem; active: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (active) v.play().catch(() => {})
    else v.pause()
  }, [active])

  const full = Math.floor(item.rating)

  return (
    <div data-testid="video-ad" style={shell}>
      <video
        ref={ref}
        poster={item.poster}
        muted={muted}
        loop
        playsInline
        preload={active ? 'auto' : 'metadata'}
        onClick={() => setMuted((m) => !m)}
        style={media}
      >
        {item.webm && <source src={item.webm} type="video/webm" />}
        <source src={item.src} type="video/mp4" />
      </video>
      <div style={topGrad} />
      <span style={sponsored}>Sponsored</span>
      <div style={bottomGrad} />

      {/* install card */}
      <div style={card} {...stop}>
        <img src={item.avatar} alt="" width={46} height={46} style={brandAvatar} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.headline}
          </div>
          <div style={ratingRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <StarIcon key={i} on={i < full} />
            ))}
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,.7)', marginLeft: 4 }}>
              {item.rating.toFixed(1)} · {item.ratingCount}
            </span>
          </div>
        </div>
        <button style={cta}>{item.cta}</button>
      </div>
    </div>
  )
}

const shell: CSSProperties = { position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden', color: '#fff' }
const media: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const topGrad: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, height: 110, background: 'linear-gradient(180deg, rgba(0,0,0,.5), transparent)', pointerEvents: 'none' }
const bottomGrad: CSSProperties = { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(0deg, rgba(0,0,0,.75), transparent)', pointerEvents: 'none' }
const sponsored: CSSProperties = { position: 'absolute', top: 58, left: 16, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, padding: '4px 9px', borderRadius: 999, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(4px)' }
const card: CSSProperties = { position: 'absolute', left: 14, right: 14, bottom: 84, display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 16, background: 'rgba(22,22,27,.82)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,.08)' }
const brandAvatar: CSSProperties = { borderRadius: 12, objectFit: 'cover', flexShrink: 0 }
const ratingRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 2, marginTop: 4 }
const cta: CSSProperties = { flexShrink: 0, padding: '11px 18px', borderRadius: 12, border: 0, background: '#fff', color: '#111', fontSize: 14, fontWeight: 800, cursor: 'pointer' }
