import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { BookOpen, Plus } from 'lucide-react'

export const metadata: Metadata = { title: 'Admissions' }

export default function AdmissionsPage() {
  return (
    <PageShell
      title="Admissions"
      description="Track application statuses, university offers, and enrollment pipelines."
      actions={
        <button
          id="admissions-add-btn"
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-all"
          style={{ boxShadow: '0 4px 14px rgba(59, 127, 245, 0.3)' }}
        >
          <Plus className="h-4 w-4" />
          New Application
        </button>
      }
    >
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)]"
          style={{ background: 'rgba(255, 159, 10, 0.1)' }}
        >
          <BookOpen className="h-8 w-8 text-[var(--warning)]" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Admissions pipeline coming soon
        </h3>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Application tracking, status updates, and university pipeline will appear here.
        </p>
      </div>
    </PageShell>
  )
}
