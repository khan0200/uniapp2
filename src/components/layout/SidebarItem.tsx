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
          'w-[56px] h-[38px] flex items-center justify-center rounded-xl transition-all duration-200',
          isActive
            ? 'bg-white/15 text-white'
            : 'text-gray-400 group-hover:bg-white/5 group-hover:text-white'
        )}
      >
        <Icon
          className="h-5 w-5"
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
          'mt-1.5 text-[10px] font-semibold tracking-wide text-center truncate max-w-[72px] transition-all duration-200',
          isActive
            ? 'text-white'
            : 'text-gray-400 group-hover:text-white'
        )}
      >
        {label}
      </span>
    </Link>
  )
}

