'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, Plus, FileSpreadsheet, FileText, RefreshCw, Trash2, Loader2 } from 'lucide-react'
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
  '/users': 'User Management',
  '/restricted': 'Access Restricted',
}

export function Header() {
  const pathname = usePathname()
  const { profile } = useUser()
  const { searchQuery, setSearchQuery, setIsAddStudentModalOpen, detailPageActions } = useStudentDashboard()

  // Find the best matching title
  const pageTitle =
    Object.entries(PAGE_TITLES)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) => pathname.startsWith(path))?.[1] ?? 'Dashboard'

  const renderNotificationsButton = () => (
    <button
      id="header-notifications-btn"
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]',
        'text-[var(--foreground-muted)] hover:text-[var(--foreground)]',
        'hover:bg-[var(--background)] border border-[var(--border)]',
        'transition-all duration-150 shrink-0'
      )}
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)]" />
    </button>
  )

  const renderRoleBadge = () => profile?.role && (
    <div
      className={cn(
        'hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1',
        'border text-xs font-semibold shrink-0 select-none',
        profile.role === 'Head Manager'
          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400'
          : profile.role === 'Manager'
            ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400'
            : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-400'
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          profile.role === 'Head Manager'
            ? 'bg-amber-500'
            : profile.role === 'Manager'
              ? 'bg-blue-500'
              : 'bg-purple-500'
        )}
      />
      {profile.role}
    </div>
  )

  // Conditionally render the custom Dynamic Island header for /students and /documents pages
  if (pathname === '/students' || pathname === '/documents') {
    return (
      <header
        className={cn(
          'flex flex-col md:flex-row flex-shrink-0 justify-between items-stretch md:items-center gap-3 md:gap-4 px-4 md:px-6 relative',
          'h-auto py-4 md:h-20 md:py-0',
          'border-b border-[var(--border)] bg-[var(--surface)]',
          'sticky top-0 z-20'
        )}
        style={{ boxShadow: 'var(--shadow-sm)' }}
      >
        {/* Left Side: Title */}
        <div className="flex-shrink-0 flex items-center justify-between md:block">
          <div>
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
          
          {/* Mobile Notifications and Role Badge next to Title */}
          <div className="flex md:hidden items-center gap-2">
            {renderNotificationsButton()}
            {renderRoleBadge()}
          </div>
        </div>

        {/* Center: iOS Dynamic Island Inspired Search Bar (Fixed size) */}
        <div 
          className={cn(
            "relative flex items-center rounded-full border border-[var(--border)] bg-[var(--surface-elevated)]/60 backdrop-blur-md shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:bg-[var(--surface-elevated)]/85 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all duration-300 ease-out",
            "w-full h-[48px] md:h-[54px] z-30",
            "md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2",
            "max-w-full md:max-w-[450px] lg:max-w-[600px]",
            "focus-within:border-[var(--foreground-muted)] dark:focus-within:border-[var(--foreground-subtle)] focus-within:bg-[var(--surface-elevated)] focus-within:shadow-[0_16px_36px_rgba(0,0,0,0.08)] dark:focus-within:shadow-[0_16px_36px_rgba(0,0,0,0.4)]"
          )}
        >
          <div className="relative flex items-center w-full h-full rounded-full px-5 bg-transparent">
            <Search className="h-5 w-5 text-[var(--foreground-muted)] flex-shrink-0 mr-3" />
            <input
              type="text"
              placeholder={pathname === '/students' ? "Search students by name, ID, passport or phone..." : "Search by name, ID or phone..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-[16px] md:text-sm text-[var(--foreground)] placeholder-[var(--foreground-subtle)] py-2 no-focus-outline border-none focus:border-none focus:ring-0 focus-visible:ring-0 shadow-none focus:shadow-none"
            />
          </div>
        </div>

        {/* Right Side Actions */}
        {pathname === '/students' ? (
          <div className="flex items-center gap-2 md:gap-3 justify-end md:ml-auto z-10 w-full md:w-auto mt-1 md:mt-0">
            <Link
              id="students-import-btn"
              href="/students/import"
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--surface-elevated)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] transition-all cursor-pointer select-none h-9 md:h-10 shrink-0"
            >
              <FileSpreadsheet className="h-4 w-4 text-[var(--foreground-muted)]" />
              <span>Import</span>
            </Link>
            <button
              id="students-add-btn"
              onClick={() => setIsAddStudentModalOpen(true)}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-all cursor-pointer select-none h-9 md:h-10 shrink-0"
              style={{ boxShadow: '0 4px 12px rgba(59, 127, 245, 0.2)' }}
            >
              <Plus className="h-4 w-4" />
              <span>Add Student</span>
            </button>

            {/* Desktop Notifications and Role Badge */}
            <div className="hidden md:flex items-center gap-2 md:gap-3">
              {renderNotificationsButton()}
              {renderRoleBadge()}
            </div>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 md:gap-3 justify-end md:ml-auto z-10 w-auto">
            {renderNotificationsButton()}
            {renderRoleBadge()}
          </div>
        )}
      </header>
    )
  }

  // Original layout preserved for all other pages
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
      {pathname.startsWith('/students/') && detailPageActions ? (
        <div className="flex flex-1 items-center justify-end gap-2">
          <button
            onClick={detailPageActions.onFillByDocument}
            className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer"
            title="Fill student details from a document using AI"
          >
            <FileText className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Fill By Document</span>
          </button>
          <button
            onClick={detailPageActions.onReload}
            className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)] px-3 py-1.5 bg-[var(--surface-elevated)] hover:bg-[var(--border-subtle)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer"
            title="Reload student data"
          >
            <RefreshCw className="h-3.5 w-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Reload</span>
          </button>
          <button
            disabled={detailPageActions.isDeleting}
            onClick={detailPageActions.onDelete}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13.5px] font-semibold transition-all shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50',
              detailPageActions.isDeleted
                ? 'text-emerald-600 dark:text-emerald-400 hover:bg-[var(--border-subtle)]'
                : 'text-[var(--danger)] hover:bg-[var(--border-subtle)] hover:text-red-600'
            )}
            title={detailPageActions.isDeleted ? 'Restore student profile' : 'Delete student profile'}
          >
            {detailPageActions.isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : detailPageActions.isDeleted ? (
              <RefreshCw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{detailPageActions.isDeleted ? 'Restore' : 'Delete'}</span>
          </button>
        </div>
      ) : pathname.startsWith('/students/') || pathname.startsWith('/payments') || pathname.startsWith('/settings') || pathname.startsWith('/users') ? (
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
            profile.role === 'Head Manager'
              ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400'
              : profile.role === 'Manager'
                ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400'
                : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800/40 dark:bg-purple-950/40 dark:text-purple-400'
          )}
        >
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              profile.role === 'Head Manager'
                ? 'bg-amber-500'
                : profile.role === 'Manager'
                  ? 'bg-blue-500'
                  : 'bg-purple-500'
            )}
          />
          {profile.role}
        </div>
      )}
    </header>
  )
}
