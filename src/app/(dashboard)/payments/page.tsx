import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { PaymentsClient } from './PaymentsClient'

export const metadata: Metadata = { title: 'Payments' }

export default function PaymentsPage() {
  return (
    <PageShell>
      <PaymentsClient />
    </PageShell>
  )
}
