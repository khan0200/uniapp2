'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Drop-in replacement for the mount/unmount-after-exit behavior that
 * AnimatePresence provided, using plain CSS transitions instead of
 * framer-motion. While `isOpen` is true the node is rendered and enters;
 * when it flips to false the node stays mounted (with its "closed" CSS
 * classes applied) for `duration` ms so its exit transition can play,
 * then it unmounts.
 */
export function useCssTransition(isOpen: boolean, duration = 220) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [isVisible, setIsVisible] = useState(isOpen)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setShouldRender(true)
      // Defer to the next frame so the browser paints the "closed" state
      // first, guaranteeing the transition to "open" actually runs.
      const raf = requestAnimationFrame(() => setIsVisible(true))
      return () => cancelAnimationFrame(raf)
    }

    setIsVisible(false)
    timeoutRef.current = setTimeout(() => setShouldRender(false), duration)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [isOpen, duration])

  return { shouldRender, isVisible }
}
