'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarItemProps {
  href: string
  icon: LucideIcon
  label: string
  collapsed: boolean
  badge?: number
}

export function SidebarItem({
  href,
  icon: Icon,
  label,
  collapsed,
  badge,
}: SidebarItemProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      id={`nav-${label.toLowerCase()}`}
      className={cn(
        'group relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5',
        'text-sm font-medium transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
        collapsed ? 'justify-center px-2' : '',
        isActive
          ? 'bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]'
          : 'text-[var(--sidebar-foreground-muted)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {/* Active indicator bar */}
      {isActive && (
        <motion.div
          layoutId="active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-0.5 rounded-full bg-[var(--accent)]"
          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
        />
      )}

      {/* Icon */}
      <span className="relative flex-shrink-0">
        <Icon
          className={cn(
            'h-[18px] w-[18px] transition-colors',
            isActive
              ? 'text-[var(--accent)]'
              : 'text-[var(--sidebar-foreground-muted)] group-hover:text-[var(--sidebar-foreground)]'
          )}
          strokeWidth={isActive ? 2.5 : 2}
        />
        {/* Badge on icon (collapsed only) */}
        {collapsed && badge && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>

      {/* Label (hidden when collapsed) */}
      {!collapsed && (
        <span className="flex-1 truncate">{label}</span>
      )}

      {/* Badge (expanded only) */}
      {!collapsed && badge && badge > 0 && (
        <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[10px] font-bold text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}

      {/* Tooltip for collapsed state */}
      {collapsed && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute left-full ml-3 z-50',
            'rounded-[var(--radius-sm)] px-2.5 py-1.5',
            'glass text-[var(--foreground)] text-xs font-medium whitespace-nowrap',
            'opacity-0 translate-x-1 scale-95',
            'group-hover:opacity-100 group-hover:translate-x-0 group-hover:scale-100',
            'transition-all duration-150'
          )}
        >
          {label}
        </div>
      )}
    </Link>
  )
}
