'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import logo from '@/logo.png'
import {
  Users,
  CreditCard,
  BookOpen,
  FileText,
  Settings,
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
    <aside
      className="relative flex flex-col h-full w-[76px] bg-[#111315] border-r border-white/5 overflow-hidden flex-shrink-0"
      aria-label="Main navigation"
    >
      {/* ── Header / Logo ─────────────────────────────────── */}
      <div className="flex items-center justify-center h-16 flex-shrink-0 border-b border-white/5">
        <Image
          src={logo}
          alt="UniApp logo"
          width={32}
          height={32}
          className="rounded-lg object-contain"
        />
      </div>

      {/* ── Nav Items ──────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-1 space-y-1">
        {loading ? (
          // Skeleton loaders
          Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="skeleton h-10 w-10 mx-auto rounded-xl opacity-20"
            />
          ))
        ) : (
          visibleItems.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
            />
          ))
        )}
      </nav>

      {/* ── Footer ─────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-white/5 p-2 flex flex-col items-center gap-4 pb-4">
        {/* Theme toggle (Always collapsed/centered) */}
        <div className="flex justify-center w-full">
          <ThemeToggle collapsed={true} />
        </div>

        {/* User profile avatar */}
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Avatar */}
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white select-none hover:ring-2 hover:ring-white/20 transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #3b7ff5, #6366f1)' }}
            title={`${profile?.full_name || 'User'} (${profile?.role || ''})`}
          >
            {profile?.full_name
              ? profile.full_name.slice(0, 2).toUpperCase()
              : profile?.email?.slice(0, 2).toUpperCase() ?? '??'}
          </div>

          {/* Sign out button */}
          <button
            id="signout-btn"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-gray-400 hover:text-red-400 hover:bg-white/5 transition-all cursor-pointer"
            title="Sign out"
            aria-label="Sign out"
          >
            {signingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  )
}
