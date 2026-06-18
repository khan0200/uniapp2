import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { FileText, Upload } from 'lucide-react'

export const metadata: Metadata = { title: 'Documents' }

export default function DocumentsPage() {
  return (
    <PageShell
      title="Documents"
      description="Manage student documents, transcripts, visa applications, and files."
      actions={
        <button
          id="documents-upload-btn"
          className="flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-hover)] transition-all"
          style={{ boxShadow: '0 4px 14px rgba(59, 127, 245, 0.3)' }}
        >
          <Upload className="h-4 w-4" />
          Upload Document
        </button>
      }
    >
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)]"
          style={{ background: 'rgba(0, 122, 255, 0.1)' }}
        >
          <FileText className="h-8 w-8 text-[var(--info)]" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Document manager coming soon
        </h3>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          File uploads, document categorization, and student-linked records will appear here.
        </p>
      </div>
    </PageShell>
  )
}
