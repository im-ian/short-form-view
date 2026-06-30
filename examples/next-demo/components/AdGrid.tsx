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
        <div
          key={i}
          style={{
            background: t.color, borderRadius: 16, display: 'grid', placeItems: 'center',
            color: '#000', fontWeight: 800,
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  )
}
