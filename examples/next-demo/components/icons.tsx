import type { SVGProps } from 'react'

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 30,
  height: 30,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  ...props,
})

export function HeartIcon({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg {...base(p)} fill={filled ? '#ff2d55' : 'currentColor'}>
      <path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 1.9 5 5.3 5c2 0 3.3 1.1 4.1 2.3C10.2 6.1 11.5 5 13.5 5c3.4 0 4.9 3.6 3.3 6.8C19.5 16.4 12 21 12 21z" />
    </svg>
  )
}

export function CommentIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)} fill="currentColor">
      <path d="M12 3c5 0 9 3.4 9 7.6 0 4.2-4 7.6-9 7.6-1 0-2-.1-2.9-.4L4 20l1.1-3.4C3.8 15.2 3 13 3 10.6 3 6.4 7 3 12 3z" />
    </svg>
  )
}

export function ShareIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(p)} fill="currentColor">
      <path d="M3 13.5 21 4l-6 16-3.2-6.2L4.5 10 21 4" stroke="currentColor" strokeWidth="0" />
      <path d="M22 3 2.5 10.7l6.6 2.2L11.3 21 22 3z" />
    </svg>
  )
}

export function BookmarkIcon({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) {
  return (
    <svg {...base(p)} fill={filled ? '#ffd233' : 'currentColor'}>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.2L5 21V4a1 1 0 0 1 1-1z" />
    </svg>
  )
}

export function MusicIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ width: 16, height: 16, ...p })} fill="currentColor">
      <path d="M9 17.5a2.5 2.5 0 1 1-2.5-2.5c.4 0 .7.1 1 .2V6l9-2v8.5A2.5 2.5 0 1 1 14 11V7L9 8.1v9.4z" />
    </svg>
  )
}

export function PlusIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ width: 16, height: 16, ...p })} fill="#fff">
      <path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" />
    </svg>
  )
}

export function PlayIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ width: 64, height: 64, ...p })} fill="#fff">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

export function MuteIcon({ muted, ...p }: SVGProps<SVGSVGElement> & { muted?: boolean }) {
  return (
    <svg {...base({ width: 20, height: 20, ...p })} fill="#fff">
      {muted ? (
        <path d="M4 9v6h4l5 5V4L8 9H4zm12.5 3 2.5 2.5-1 1L15.5 13 13 15.5l-1-1 2.5-2.5L12 9.5l1-1 2.5 2.5L18 8.5l1 1L16.5 12z" />
      ) : (
        <path d="M4 9v6h4l5 5V4L8 9H4zm12 3a4 4 0 0 0-2-3.5v7A4 4 0 0 0 16 12zm-2-7v2.1a6 6 0 0 1 0 9.8V18a8 8 0 0 0 0-13z" />
      )}
    </svg>
  )
}

export function HomeIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ width: 24, height: 24, ...p })} fill="currentColor">
      <path d="M12 3 2 12h3v8h6v-5h2v5h6v-8h3z" />
    </svg>
  )
}

export function SearchIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ width: 22, height: 22, ...p })} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  )
}

export function InboxIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ width: 24, height: 24, ...p })} fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h16v11H7l-3 3z" strokeLinejoin="round" />
    </svg>
  )
}

export function StarIcon({ on, ...p }: SVGProps<SVGSVGElement> & { on?: boolean }) {
  return (
    <svg {...base({ width: 14, height: 14, ...p })} fill={on ? '#ffce3a' : 'rgba(255,255,255,.3)'}>
      <path d="m12 2 2.9 6.3 6.8.6-5.1 4.5 1.5 6.7L12 17.3 5.9 20.6l1.5-6.7L2.3 8.9l6.8-.6z" />
    </svg>
  )
}

export function CreateTab(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base({ width: 44, height: 30, ...p })} fill="none">
      <rect x="6" y="3" width="32" height="24" rx="8" fill="#fff" />
      <rect x="1" y="6" width="32" height="24" rx="8" fill="#25f4ee" />
      <rect x="11" y="6" width="32" height="24" rx="8" fill="#fe2c55" />
      <rect x="6" y="3" width="32" height="24" rx="8" fill="#fff" />
      <path d="M22 11v12M16 17h12" stroke="#161823" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
