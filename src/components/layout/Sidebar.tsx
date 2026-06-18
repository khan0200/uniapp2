'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import logo from '@/logo.png'
import {
  Users,
  CreditCard,
  BookOpen,
  FileText,
  Settings,
  ChevronLeft,
  LogOut,
  Loader2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/contexts/UserContext'
import { SidebarItem } from './SidebarItem'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  icon: typeof Users
  label: string
  roles?: ('Manager' | 'Admin')[]
}

const NAV_ITEMS: NavItem[] = [
  { href: '/students', icon: Users, label: 'Students' },
  { href: '/admissions', icon: BookOpen, label: 'Admissions' },
  { href: '/documents', icon: FileText, label: 'Documents' },
  { href: '/payments', icon: CreditCard, label: 'Payments', roles: ['Manager'] },
  { href: '/settings', icon: Settings, label: 'Settings', roles: ['Manager'] },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const { profile, loading } = useUser()
  const router = useRouter()
  const supabase = createClient()

  // Filter nav items by role
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles) return true
    if (!profile) return false
    return item.roles.includes(profile.role)
  })

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      className={cn(
        'relative flex flex-col h-full',
        'bg-[var(--sidebar)] border-r border-[var(--sidebar-border)]',
        'overflow-hidden flex-shrink-0'
      )}
      aria-label="Main navigation"
    >
      {/* ── Header ─────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center h-16 px-4 border-b border-[var(--sidebar-border)]',
          'flex-shrink-0',
          collapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!collapsed ? (
            <motion.div
              key="logo-full"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5"
            >
              <Image
                src={logo}
                alt="UniApp logo"
                width={32}
                height={32}
                className="rounded-[var(--radius-sm)] object-contain"
              />
              <div>
                <span className="block text-sm font-bold text-[var(--sidebar-foreground)]">
                  UniApp
                </span>
                <span className="block text-[10px] text-[var(--sidebar-foreground-muted)]">
                  Consulting Platform
                </span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="logo-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
            >
              <Image
                src={logo}
                alt="UniApp logo"
                width={32}
                height={32}
                className="rounded-[var(--radius-sm)] object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapse toggle */}
        {!collapsed && (
          <button
            id="sidebar-collapse-btn"
            onClick={() => setCollapsed(true)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)]',
              'text-[var(--sidebar-foreground-muted)] hover:text-[var(--sidebar-foreground)]',
              'hover:bg-[var(--sidebar-accent)] transition-all duration-150'
            )}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Nav Items ──────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-0.5">
        {!collapsed && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--sidebar-foreground-muted)]">
            Menu
          </p>
        )}

        {loading ? (
          // Skeleton loaders
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'skeleton h-10 rounded-[var(--radius-md)]',
                collapsed ? 'w-10 mx-auto' : 'w-full'
              )}
            />
          ))
        ) : (
          visibleItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
            />
          ))
        )}
      </nav>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-[var(--sidebar-border)] p-2 space-y-1">
        {/* Theme toggle */}
        <ThemeToggle collapsed={collapsed} />

        {/* Expand button (collapsed only) */}
        {collapsed && (
          <button
            id="sidebar-expand-btn"
            onClick={() => setCollapsed(false)}
            className={cn(
              'w-full flex items-center justify-center rounded-[var(--radius-md)] py-2.5',
              'text-[var(--sidebar-foreground-muted)] hover:text-[var(--sidebar-foreground)]',
              'hover:bg-[var(--sidebar-accent)] transition-all duration-150'
            )}
            aria-label="Expand sidebar"
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </button>
        )}

        {/* User profile area */}
        <div
          className={cn(
            'flex items-center gap-2.5 rounded-[var(--radius-md)] p-2.5',
            'border border-[var(--border)] bg-[var(--background)]',
            collapsed ? 'justify-center' : ''
          )}
        >
          {/* Avatar */}
          <div
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #3b7ff5, #6366f1)' }}
          >
            {profile?.full_name
              ? profile.full_name.slice(0, 2).toUpperCase()
              : profile?.email?.slice(0, 2).toUpperCase() ?? '??'}
          </div>

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--sidebar-foreground)]">
                {profile?.full_name ?? 'Loading…'}
              </p>
              <p className="truncate text-[10px] text-[var(--sidebar-foreground-muted)]">
                {profile?.role ?? ''}
              </p>
            </div>
          )}

          {!collapsed && (
            <button
              id="signout-btn"
              onClick={handleSignOut}
              disabled={signingOut}
              className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
                'text-[var(--sidebar-foreground-muted)] hover:text-[var(--danger)]',
                'hover:bg-red-50 dark:hover:bg-red-950/30',
                'transition-all duration-150'
              )}
              aria-label="Sign out"
            >
              {signingOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
