'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5',
        'text-sidebar-foreground/60 hover:text-sidebar-foreground',
        'hover:bg-sidebar-accent transition-all duration-200',
        collapsed && 'justify-center px-2'
      )}
    >
      {/* Track */}
      <div
        className={cn(
          'relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-300',
          isDark ? 'bg-accent' : 'bg-muted-foreground/30'
        )}
      >
        {/* Thumb */}
        <div
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full shadow-sm transition-all duration-300 ease-out',
            'flex items-center justify-center',
            isDark ? 'bg-white left-[22px]' : 'bg-white left-0.5'
          )}
        >
          <div className="relative h-3 w-3">
            <Moon
              className={cn(
                'absolute inset-0 h-3 w-3 text-slate-700 transition-all duration-150 ease-out',
                isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-50'
              )}
            />
            <Sun
              className={cn(
                'absolute inset-0 h-3 w-3 text-amber-500 transition-all duration-150 ease-out',
                isDark ? 'opacity-0 -rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
              )}
            />
          </div>
        </div>
      </div>

      {!collapsed && (
        <span className="text-sm font-medium">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      )}
    </button>
  )
}
