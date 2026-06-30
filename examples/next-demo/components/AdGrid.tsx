'use client'
import type { CSSProperties } from 'react'
import type { CollectionAdItem } from './feed'

const stop = { onPointerDown: (e: React.PointerEvent) => e.stopPropagation() }

export function AdGrid({ item }: { item: CollectionAdItem }) {
  return (
    <div data-testid="ad-grid" style={shell}>
      {/* hero cover */}
      <div style={{ position: 'relative', height: '38%' }}>
        <img src={item.cover} alt="" style={cover} />
        <div style={coverShade} />
        <span style={sponsored}>Sponsored</span>
        <div style={brandRow}>
          <img src={item.avatar} alt="" width={40} height={40} style={brandAvatar} />
          <div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{item.advertiser}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.7)' }}>Promoted</div>
          </div>
        </div>
        <div style={headline}>{item.headline}</div>
      </div>

      {/* 2x2 product grid */}
      <div style={grid}>
        {item.products.map((p, i) => (
          <div key={i} style={tile} {...stop}>
            <div style={tileMedia}>
              <img src={p.img} alt="" style={tileImg} />
              <span style={priceTag}>{p.price}</span>
            </div>
            <div style={tileName}>{p.name}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button style={cta} {...stop}>{item.cta}</button>
    </div>
  )
}

const shell: CSSProperties = { width: '100%', height: '100%', paddingBottom: 60, background: '#0c0c0f', color: '#fff', display: 'flex', flexDirection: 'column' }
const cover: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const coverShade: CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.15), rgba(12,12,15,.95))' }
const sponsored: CSSProperties = { position: 'absolute', top: 60, right: 14, fontSize: 11, fontWeight: 700, letterSpacing: 0.4, padding: '4px 9px', borderRadius: 999, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }
const brandRow: CSSProperties = { position: 'absolute', top: 56, left: 16, display: 'flex', alignItems: 'center', gap: 10 }
const brandAvatar: CSSProperties = { borderRadius: '50%', border: '1.5px solid rgba(255,255,255,.85)', objectFit: 'cover' }
const headline: CSSProperties = { position: 'absolute', left: 16, right: 16, bottom: 14, fontSize: 20, fontWeight: 800, lineHeight: 1.2 }
const grid: CSSProperties = { flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 10, padding: '12px 16px' }
const tile: CSSProperties = { background: '#16161b', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: 0, border: '1px solid rgba(255,255,255,.06)' }
const tileMedia: CSSProperties = { position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }
const tileImg: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }
const priceTag: CSSProperties = { position: 'absolute', bottom: 8, left: 8, fontSize: 12.5, fontWeight: 800, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,.66)', backdropFilter: 'blur(4px)' }
const tileName: CSSProperties = { padding: '8px 10px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.88)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }
const cta: CSSProperties = { margin: '0 16px 12px', padding: '14px', borderRadius: 14, border: 0, background: 'linear-gradient(135deg,#fe2c55,#ff5d8f)', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer' }
