'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
  href: string
  icon: LucideIcon
  label: string
  collapsed?: boolean
  badge?: number
  target?: string
}

export function SidebarItem({
  href,
  icon: Icon,
  label,
  badge,
  target,
}: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      target={target}
      rel={target === '_blank' ? 'noopener noreferrer' : undefined}
      id={`nav-${label.toLowerCase()}`}
      className="group flex flex-col items-center justify-center w-full py-2.5 px-1 relative focus:outline-none select-none"
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Icon Wrapper (Rounded Square matching Canva) */}
      <div
        className={cn(
          'w-[52px] h-[36px] flex items-center justify-center rounded-xl transition-all duration-300 relative',
          isActive
            ? 'bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 scale-[1.05]'
            : 'text-foreground-muted group-hover:bg-surface-interactive group-hover:text-foreground dark:text-gray-400 dark:group-hover:bg-white/5 dark:group-hover:text-white'
        )}
      >
        <Icon
          className="h-4.5 w-4.5"
          strokeWidth={isActive ? 2.5 : 2}
        />
        {badge && badge > 0 && (
          <span className="absolute top-2 right-4 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[9px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          'mt-2 text-[10px] font-bold tracking-wider text-center truncate max-w-[72px] transition-all duration-300 uppercase',
          isActive
            ? 'text-blue-600 dark:text-blue-400 font-extrabold scale-[1.02]'
            : 'text-foreground-muted group-hover:text-foreground dark:text-gray-400 dark:group-hover:text-white'
        )}
      >
        {label}
      </span>
    </Link>
  )
}

