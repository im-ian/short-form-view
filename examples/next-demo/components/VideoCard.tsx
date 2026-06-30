'use client'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { VideoItem } from './feed'
import { formatCount } from './feed'
import {
  BookmarkIcon, CommentIcon, HeartIcon, MusicIcon, MuteIcon, PlayIcon, PlusIcon, ShareIcon,
} from './icons'

const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() }

export function VideoCard({ item, active }: { item: VideoItem; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [muted, setMuted] = useState(true)
  const [liked, setLiked] = useState(false)
  const [saved, setSaved] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (active && !paused) v.play().catch(() => {})
    else v.pause()
  }, [active, paused])

  useEffect(() => {
    const v = videoRef.current
    const bar = barRef.current
    if (!v || !bar || !active) return
    let raf = 0
    const tick = () => {
      if (v.duration) bar.style.width = `${(v.currentTime / v.duration) * 100}%`
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])

  const likes = item.likes + (liked ? 1 : 0)

  return (
    <div style={shell} data-testid="video-card">
      <video
        ref={videoRef}
        poster={item.poster}
        muted={muted}
        loop
        playsInline
        preload={active ? 'auto' : 'metadata'}
        data-testid="video"
        data-active={active}
        onClick={() => setPaused((p) => !p)}
        style={media}
      >
        {item.webm && <source src={item.webm} type="video/webm" />}
        <source src={item.src} type="video/mp4" />
      </video>

      {/* paused overlay */}
      {paused && active && (
        <div style={pausedOverlay}>
          <div style={{ opacity: 0.85 }}><PlayIcon /></div>
        </div>
      )}

      <div style={topGradient} />
      <div style={bottomGradient} />

      {/* mute toggle */}
      <button aria-label={muted ? 'unmute' : 'mute'} {...stop} onClick={() => setMuted((m) => !m)} style={muteBtn}>
        <MuteIcon muted={muted} />
      </button>

      {/* right action rail */}
      <div style={rail} {...stop}>
        <div style={{ position: 'relative', marginBottom: 22 }}>
          <img src={item.avatar} alt="" width={48} height={48} style={avatarImg} />
          <span style={followBadge}><PlusIcon /></span>
        </div>

        <RailButton label={formatCount(likes)} onClick={() => setLiked((v) => !v)}>
          <HeartIcon filled={liked} />
        </RailButton>
        <RailButton label={formatCount(item.comments)}>
          <CommentIcon />
        </RailButton>
        <RailButton label={formatCount(item.saves)} onClick={() => setSaved((v) => !v)}>
          <BookmarkIcon filled={saved} />
        </RailButton>
        <RailButton label={formatCount(item.shares)}>
          <ShareIcon />
        </RailButton>

        <div style={disc} className="sfv-spin">
          <img src={item.avatar} alt="" width={34} height={34} style={{ borderRadius: '50%' }} />
        </div>
      </div>

      {/* bottom meta */}
      <div style={meta}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 7 }}>@{item.username}</div>
        <div style={{ fontSize: 14, lineHeight: 1.35, marginBottom: 9, maxWidth: 300 }}>{item.caption}</div>
        <div style={musicRow}>
          <MusicIcon />
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 220 }}>
            <span className="sfv-marquee" style={{ display: 'inline-block' }}>
              {item.music} · {item.music} ·
            </span>
          </div>
        </div>
      </div>

      {/* progress */}
      <div style={progressTrack}>
        <div ref={barRef} style={progressFill} />
      </div>
    </div>
  )
}

function RailButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={railBtn} aria-label={label}>
      <span style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.4))' }}>{children}</span>
      <span style={{ fontSize: 12.5, fontWeight: 700, marginTop: 4 }}>{label}</span>
    </button>
  )
}

const shell: CSSProperties = { position: 'relative', width: '100%', height: '100%', background: '#000', overflow: 'hidden', color: '#fff' }
const media: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const topGradient: CSSProperties = { position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(180deg, rgba(0,0,0,.45), transparent)', pointerEvents: 'none' }
const bottomGradient: CSSProperties = { position: 'absolute', bottom: 0, left: 0, right: 0, height: '46%', background: 'linear-gradient(0deg, rgba(0,0,0,.6), transparent)', pointerEvents: 'none' }
const pausedOverlay: CSSProperties = { position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }
const muteBtn: CSSProperties = { position: 'absolute', top: 64, right: 14, width: 38, height: 38, borderRadius: '50%', border: 0, background: 'rgba(0,0,0,.35)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', cursor: 'pointer' }
const rail: CSSProperties = { position: 'absolute', right: 10, bottom: 96, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }
const railBtn: CSSProperties = { background: 'none', border: 0, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', padding: 0 }
const avatarImg: CSSProperties = { borderRadius: '50%', border: '2px solid #fff', objectFit: 'cover', display: 'block' }
const followBadge: CSSProperties = { position: 'absolute', bottom: -9, left: '50%', transform: 'translateX(-50%)', width: 20, height: 20, borderRadius: '50%', background: '#fe2c55', display: 'grid', placeItems: 'center' }
const disc: CSSProperties = { width: 46, height: 46, borderRadius: '50%', background: 'radial-gradient(circle, #333 38%, #111 40%)', display: 'grid', placeItems: 'center', marginTop: 6, border: '4px solid #1a1a1a' }
const meta: CSSProperties = { position: 'absolute', left: 14, right: 78, bottom: 84 }
const musicRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600 }
const progressTrack: CSSProperties = { position: 'absolute', left: 0, right: 0, bottom: 68, height: 3, background: 'rgba(255,255,255,.2)' }
const progressFill: CSSProperties = { height: '100%', width: '0%', background: '#fff' }
