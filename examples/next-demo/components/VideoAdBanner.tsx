export function VideoAdBanner({ src, banner, cta, active }: {
  src: string; banner: string; cta: string; active: boolean
}) {
  void src
  return (
    <div data-testid="video-ad" style={{ position: 'relative', width: '100%', height: '100%', background: '#1a1a1a' }}>
      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#888' }}>
        {active ? 'video ad playing' : 'video ad paused'}
      </div>
      <div
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, padding: '12px 16px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,.6)', color: '#fff',
        }}
      >
        <span>{banner}</span>
        <button style={{ padding: '8px 14px', borderRadius: 999, border: 0, fontWeight: 700 }}>{cta}</button>
      </div>
    </div>
  )
}
