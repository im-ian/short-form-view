import type { SVGProps } from 'react'

// The TikTok-style create button is a brand composition, not a stock icon,
// so it stays hand-authored. All other icons come from lucide-react.
export function CreateTab(p: SVGProps<SVGSVGElement>) {
  return (
    <svg width={44} height={30} viewBox="0 0 44 30" fill="none" xmlns="http://www.w3.org/2000/svg" {...p}>
      <rect x="1" y="3" width="32" height="24" rx="8" fill="#25f4ee" />
      <rect x="11" y="3" width="32" height="24" rx="8" fill="#fe2c55" />
      <rect x="6" y="3" width="32" height="24" rx="8" fill="#fff" />
      <path d="M22 11v8M18 15h8" stroke="#161823" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}
