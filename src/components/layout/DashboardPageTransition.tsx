'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

export function DashboardPageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <div key={pathname} className="h-full animate-page-in">
      {children}
    </div>
  )
}
