export interface VideoItem {
  id: string
  kind: 'video'
  src: string
  webm?: string
  poster: string
  username: string
  avatar: string
  caption: string
  music: string
  likes: number
  comments: number
  shares: number
  saves: number
}

export interface CollectionAdItem {
  id: string
  kind: 'ad-grid'
  advertiser: string
  avatar: string
  headline: string
  cta: string
  cover: string
  products: { name: string; price: string; img: string }[]
}

export interface SponsoredVideoItem {
  id: string
  kind: 'video-ad'
  src: string
  webm?: string
  poster: string
  advertiser: string
  avatar: string
  headline: string
  rating: number
  ratingCount: string
  cta: string
}

export type FeedItem = VideoItem | CollectionAdItem | SponsoredVideoItem

// Same-origin clips served from public/videos (mp4 + webm where available),
// prefixed with the Pages basePath at build time.
const ASSET = process.env.NEXT_PUBLIC_BASE_PATH || ''
const CLIPS: { mp4: string; webm?: string }[] = [
  { mp4: 'clip1.mp4', webm: 'clip1.webm' },
  { mp4: 'clip2.mp4', webm: 'clip2.webm' },
  { mp4: 'clip3.mp4' },
  { mp4: 'clip4.mp4', webm: 'clip4.webm' },
]

function clipSources(n: number): { src: string; webm?: string } {
  const c = CLIPS[n % CLIPS.length] as { mp4: string; webm?: string }
  return {
    src: `${ASSET}/videos/${c.mp4}`,
    webm: c.webm ? `${ASSET}/videos/${c.webm}` : undefined,
  }
}

function poster(n: number): string {
  return `https://picsum.photos/seed/sfv-${n}/720/1280`
}

const USERS = [
  'aurora.films', 'midnight.skate', 'chef.haneul', 'travel.with.mina', 'lofi.beats',
  'street.hoops', 'desert.drives', 'neon.tokyo', 'ocean.daily', 'studio.kaze',
]
const CAPTIONS = [
  'golden hour hits different 🌅 #sunset #fyp',
  'POV: you finally landed the trick 🛹🔥',
  '15-minute weeknight ramen, save this one 🍜',
  'this view was unreal… add it to the list ✈️ #travel',
  'turn it up, this loop is everything 🎧',
  'last second buzzer beater 🏀 we go again',
  'took the long way home 🚗💨 #drives',
  'tokyo at night never misses 🌃 #neon',
  'morning swim > coffee, change my mind 🌊',
  'behind the scenes of the shoot 🎬',
]
const MUSIC = [
  'original sound', 'midnight city — synthwave', 'lofi rain — study beats',
  'summer haze — chillhop', 'night drive — retro', 'good vibes — indie pop',
]

// Deterministic pseudo-random in [0,1) so SSR and client agree (no hydration drift).
function rand(seed: number): number {
  const x = Math.sin(seed * 999.13 + 7.7) * 43758.5453
  return x - Math.floor(x)
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function avatar(n: number): string {
  return `https://i.pravatar.cc/120?img=${(n % 70) + 1}`
}

function videoItem(n: number): VideoItem {
  const { src, webm } = clipSources(n)
  const likes = Math.floor(2_000 + rand(n) * 1_400_000)
  return {
    id: `item-${n}`,
    kind: 'video',
    src,
    webm,
    poster: poster(n),
    username: USERS[n % USERS.length] as string,
    avatar: avatar(n * 3 + 5),
    caption: CAPTIONS[n % CAPTIONS.length] as string,
    music: MUSIC[n % MUSIC.length] as string,
    likes,
    comments: Math.floor(80 + rand(n + 1) * 9_000),
    shares: Math.floor(30 + rand(n + 2) * 4_000),
    saves: Math.floor(50 + rand(n + 3) * 20_000),
  }
}

const AD_BRANDS = [
  { name: 'Lumen Studio', headline: 'New season just dropped — up to 40% off', cta: 'Shop now' },
  { name: 'Atlas Outdoor', headline: 'Gear up for the trail. Free shipping today.', cta: 'Shop now' },
  { name: 'Brew & Co.', headline: 'Specialty roasts, delivered fresh weekly', cta: 'Get offer' },
]
const PRODUCTS = [
  'Linen Overshirt', 'Trail Runner GTX', 'Ceramic Pour-Over', 'Wool Beanie',
  'Daypack 22L', 'Cold Brew Kit', 'Merino Tee', 'Field Watch',
]

function collectionAd(n: number): CollectionAdItem {
  const brand = AD_BRANDS[(n / 8) % AD_BRANDS.length | 0] as (typeof AD_BRANDS)[number]
  return {
    id: `item-${n}`,
    kind: 'ad-grid',
    advertiser: brand.name,
    avatar: avatar(n + 41),
    headline: brand.headline,
    cta: brand.cta,
    cover: `https://picsum.photos/seed/sfv-ad-${n}/640/360`,
    products: Array.from({ length: 4 }, (_, t) => ({
      name: PRODUCTS[(n + t) % PRODUCTS.length] as string,
      price: `$${(19 + ((n + t * 7) % 80))}`,
      img: `https://picsum.photos/seed/sfv-prod-${n}-${t}/300/300`,
    })),
  }
}

const VIDEO_ADS = [
  { brand: 'Velocity EV', headline: 'Velocity EV — 0 to 100 in 3.2s', cta: 'Learn more' },
  { brand: 'PixelFit', headline: 'PixelFit — your AI workout coach', cta: 'Install' },
]

function sponsoredVideo(n: number): SponsoredVideoItem {
  const ad = VIDEO_ADS[(n / 8) % VIDEO_ADS.length | 0] as (typeof VIDEO_ADS)[number]
  const { src, webm } = clipSources(n + 1)
  return {
    id: `item-${n}`,
    kind: 'video-ad',
    src,
    webm,
    poster: poster(n),
    advertiser: ad.brand,
    avatar: avatar(n + 17),
    headline: ad.headline,
    rating: 4 + (rand(n) > 0.5 ? 0.8 : 0.4),
    ratingCount: formatCount(Math.floor(1_200 + rand(n + 9) * 60_000)),
    cta: ad.cta,
  }
}

// Every 8th slot is an ad: slot 3 = collection ad, slot 7 = sponsored video.
export function makeFeed(start: number, count: number): FeedItem[] {
  const out: FeedItem[] = []
  for (let n = start; n < start + count; n++) {
    const slot = n % 8
    if (slot === 3) out.push(collectionAd(n))
    else if (slot === 7) out.push(sponsoredVideo(n))
    else out.push(videoItem(n))
  }
  return out
}
