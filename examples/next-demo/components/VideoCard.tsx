'use client'
import { useEffect, useRef } from 'react'

export function VideoCard({ src, bg, title, active }: {
  src: string; bg: string; title: string; active: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (active) v.play().catch(() => {})
    else v.pause()
  }, [active])
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: bg }}>
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        data-testid="video"
        data-active={active}
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0 }}
      />
      <div
        style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
          color: 'rgba(255,255,255,.92)', font: '700 28px system-ui', textShadow: '0 2px 8px rgba(0,0,0,.35)',
        }}
      >
        {title}
      </div>
      <div style={{ position: 'absolute', left: 16, bottom: 24, color: '#fff', fontWeight: 700 }}>
        {active ? 'playing' : 'paused'}
      </div>
    </div>
  )
}
