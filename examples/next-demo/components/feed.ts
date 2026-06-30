export type FeedItem =
  | { id: string; kind: 'video'; src: string; bg: string; title: string }
  | { id: string; kind: 'ad-grid'; tiles: { label: string; color: string }[] }
  | { id: string; kind: 'video-ad'; src: string; banner: string; cta: string }

const COLORS = ['#ff5d5d', '#5d9dff', '#5dffa0', '#ffd35d', '#c95dff', '#5dfff0']

function color(n: number): string {
  return COLORS[n % COLORS.length] as string
}

// Deterministic two-stop gradient so screenshots are stable without network images.
function gradient(n: number): string {
  return `linear-gradient(160deg, ${color(n)} 0%, ${color(n + 2)} 100%)`
}

export function makeFeed(start: number, count: number): FeedItem[] {
  const out: FeedItem[] = []
  for (let n = start; n < start + count; n++) {
    const slot = n % 8
    if (slot === 3) {
      out.push({
        id: `item-${n}`,
        kind: 'ad-grid',
        tiles: Array.from({ length: 4 }, (_, t) => ({
          label: `Ad ${n}.${t}`,
          color: color(n + t),
        })),
      })
    } else if (slot === 7) {
      out.push({
        id: `item-${n}`,
        kind: 'video-ad',
        src: `https://example.com/ad-${n}.mp4`,
        banner: `Sponsored - Offer #${n}`,
        cta: 'Learn more',
      })
    } else {
      out.push({
        id: `item-${n}`,
        kind: 'video',
        src: `https://example.com/clip-${n}.mp4`,
        bg: gradient(n),
        title: `Clip ${n}`,
      })
    }
  }
  return out
}
