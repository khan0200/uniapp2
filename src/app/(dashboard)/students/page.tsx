import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { Users, Plus, Filter } from 'lucide-react'

export const metadata: Metadata = { title: 'Students' }

export default function StudentsPage() {
  return (
    <PageShell
      title="Students"
      description="Manage your student roster, track progress, and view profiles."
      actions={
        <div className="flex items-center gap-2">
          <button
            id="students-filter-btn"
            className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-all"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button
            id="students-add-btn"
            className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-all"
            style={{ boxShadow: '0 4px 14px rgba(59, 127, 245, 0.3)' }}
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        </div>
      }
    >
      {/* Placeholder content */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)]"
          style={{ background: 'var(--accent-subtle)' }}
        >
          <Users className="h-8 w-8 text-[var(--accent)]" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Student table coming soon
        </h3>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          The student data table, search, and filters will be built in the next phase.
        </p>
      </div>
    </PageShell>
  )
}
