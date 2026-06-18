import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { CreditCard, Download } from 'lucide-react'

export const metadata: Metadata = { title: 'Payments' }

export default function PaymentsPage() {
  return (
    <PageShell
      title="Payments"
      description="Track student payments, invoices, and outstanding balances."
      actions={
        <button
          id="payments-export-btn"
          className="flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] transition-all"
        >
          <Download className="h-4 w-4" />
          Export
        </button>
      }
    >
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] border-dashed bg-[var(--surface)] p-12 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)]"
          style={{ background: 'rgba(52, 199, 89, 0.1)' }}
        >
          <CreditCard className="h-8 w-8 text-[var(--success)]" strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-semibold text-[var(--foreground)]">
          Payments module coming soon
        </h3>
        <p className="mt-1.5 text-sm text-[var(--foreground-muted)]">
          Payment records, invoice generation, and financial summaries will appear here.
        </p>
      </div>
    </PageShell>
  )
}
