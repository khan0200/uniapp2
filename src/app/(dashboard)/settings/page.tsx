import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { Settings } from 'lucide-react'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <PageShell
      title="Settings"
      description="Configure workspace preferences, user management, and integrations."
    >
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)]"
          style={{ background: 'rgba(142, 142, 147, 0.1)' }}
        >
          <Settings className="h-8 w-8 text-[var(--foreground-muted)]" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Settings panel coming soon
        </h3>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Team management, notifications, integrations, and workspace configuration will appear here.
        </p>
      </div>
    </PageShell>
  )
}
