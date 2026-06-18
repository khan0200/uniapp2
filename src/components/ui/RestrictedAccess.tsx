import { ShieldX, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

/**
 * Shown when an Admin user tries to access a Manager-only route.
 */
export function RestrictedAccess() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-[var(--radius-xl)]"
        style={{
          background: 'linear-gradient(135deg, rgba(255,59,48,0.15) 0%, rgba(255,59,48,0.05) 100%)',
          border: '1px solid rgba(255,59,48,0.2)',
        }}
      >
        <ShieldX
          className="h-10 w-10 text-[var(--danger)]"
          strokeWidth={1.5}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[var(--foreground)]">
          Access Restricted
        </h2>
        <p className="max-w-sm text-sm text-[var(--foreground-muted)]">
          You don&apos;t have permission to view this page. Contact your Manager
          to request elevated access.
        </p>
      </div>

      <Link
        href="/students"
        className="inline-flex items-center gap-2 rounded-[var(--radius-md)] px-4 py-2.5 text-sm font-semibold bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
        id="restricted-back-btn"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Students
      </Link>
    </div>
  )
}
