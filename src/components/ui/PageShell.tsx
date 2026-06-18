import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  title?: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/**
 * Consistent page wrapper used by all dashboard pages.
 * Provides padding, header section with optional action buttons,
 * and a description slot.
 */
export function PageShell({
  title,
  description,
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <div className={cn('flex flex-col h-full p-6 gap-6', className)}>
      {/* Page header */}
      {(title || description || actions) && (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-[var(--foreground-muted)]">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>
          )}
        </div>
      )}

      {/* Page content */}
      <div className="flex-1">{children}</div>
    </div>
  )
}
