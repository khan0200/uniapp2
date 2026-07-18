import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DashboardPageTransition } from '@/components/layout/DashboardPageTransition'
import { StudentDashboardProvider } from '@/contexts/StudentDashboardContext'

export const metadata: Metadata = {
  title: {
    default: 'Dashboard',
    template: '%s | UniApp',
  },
}

export default async function KDBLayout({
  children,
}: {
  children: ReactNode
}) {
  // Server-side auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <StudentDashboardProvider>
      <div className="flex h-screen overflow-hidden bg-transparent">
        {/* Persistent Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header */}
          <Header />

          {/* Page content with transition */}
          <main
            className="flex-1 overflow-y-auto"
            id="main-content"
            role="main"
          >
            <DashboardPageTransition>
              {children}
            </DashboardPageTransition>
          </main>
        </div>
      </div>
    </StudentDashboardProvider>
  )
}
