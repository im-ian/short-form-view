import { useEffect, useState } from 'react'
import { isBrowser } from './env'

const QUERY = '(prefers-reduced-motion: reduce)'

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (!isBrowser() || !window.matchMedia) return
    const mql = window.matchMedia(QUERY)
    const update = () => setReduced(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return reduced
}
