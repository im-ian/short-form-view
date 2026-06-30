import { useEffect, useLayoutEffect } from 'react'
import { isBrowser } from './env'

export const useIsomorphicLayoutEffect = isBrowser() ? useLayoutEffect : useEffect
