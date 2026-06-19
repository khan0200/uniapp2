'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, Plus, FileSpreadsheet } from 'lucide-react'
import Link from 'next/link'
import { useUser } from '@/contexts/UserContext'
import { cn } from '@/lib/utils'
import { useStudentDashboard } from '@/contexts/StudentDashboardContext'

// Human-readable titles for routes
const PAGE_TITLES: Record<string, string> = {
  '/students': 'Students',
  '/payments': 'Payments',
  '/admissions': 'Admissions',
  '/documents': 'Documents',
  '/settings': 'Settings',
  '/restricted': 'Access Restricted',
}

export function Header() {
  const pathname = usePathname()
  const { profile } = useUser()
  const { searchQuery, setSearchQuery, setIsAddStudentModalOpen } = useStudentDashboard()

  // Find the best matching title
  const pageTitle =
    Object.entries(PAGE_TITLES)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) => pathname.startsWith(path))?.[1] ?? 'Dashboard'

  return (
    <header
      className={cn(
        'flex h-16 flex-shrink-0 items-center gap-4 px-6',
        'border-b border-[var(--border)] bg-[var(--surface)]',
        'sticky top-0 z-20'
      )}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Page title */}
      <div className="flex-1">
        <h1 className="text-lg font-bold text-[var(--foreground)]">{pageTitle}</h1>
        <p className="text-xs text-[var(--foreground-muted)]">
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Unified Search and Action Button */}
      {pathname === '/students' ? (
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
            <input
              type="text"
              placeholder="Search by name, ID or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-[var(--border)] bg-[var(--background)] rounded-[var(--radius-md)] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all w-60 md:w-72"
            />
          </div>
          <Link
            id="students-import-btn"
            href="/students/import"
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface-elevated)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-all cursor-pointer select-none"
          >
            <FileSpreadsheet className="h-4 w-4 text-[var(--foreground-muted)]" />
            <span className="hidden sm:inline">Import</span>
          </Link>
          <button
            id="students-add-btn"
            onClick={() => setIsAddStudentModalOpen(true)}
            className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-all cursor-pointer select-none"
            style={{ boxShadow: '0 4px 12px rgba(59, 127, 245, 0.2)' }}
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>
      ) : pathname === '/documents' ? (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search by name, ID or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-[var(--border)] bg-[var(--background)] rounded-[var(--radius-md)] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all w-60 md:w-72"
          />
        </div>
      ) : pathname.startsWith('/students/') ? (
        null
      ) : (
        <button
          id="header-search-btn"
          className={cn(
            'hidden sm:flex items-center gap-2 rounded-[var(--radius-md)] px-3 py-2',
            'border border-[var(--border)] bg-[var(--background)]',
            'text-sm text-[var(--foreground-muted)]',
            'hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]',
            'transition-all duration-150'
          )}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:block">Search…</span>
          <kbd className="hidden md:flex items-center gap-0.5 rounded bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--foreground-subtle)]">
            ⌘K
          </kbd>
        </button>
      )}

      {/* Notifications */}
      <button
        id="header-notifications-btn"
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]',
          'text-[var(--foreground-muted)] hover:text-[var(--foreground)]',
          'hover:bg-[var(--background)] border border-[var(--border)]',
          'transition-all duration-150'
        )}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {/* Notification dot */}
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)]" />
      </button>

      {/* Role badge */}
      {profile?.role && (
        <div
          className={cn(
            'hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1',
            'border text-xs font-semibold',
            profile.role === 'Manager'
              ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400'
              : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-400'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              profile.role === 'Manager' ? 'bg-blue-500' : 'bg-purple-500'
            )}
          />
          {profile.role}
        </div>
      )}
    </header>
  )
}
