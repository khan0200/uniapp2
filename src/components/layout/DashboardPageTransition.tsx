'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode, useState, useEffect } from 'react'

export function DashboardPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [isAnimating, setIsAnimating] = useState(true)

  useEffect(() => {
    setIsAnimating(true)
    const timer = setTimeout(() => {
      setIsAnimating(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <div key={pathname} className={isAnimating ? "h-full animate-page-in" : "h-full"}>
      {children}
    </div>
  )
}
