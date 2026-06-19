import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { DocumentsClient } from './DocumentsClient'

export const metadata: Metadata = {
  title: 'Required Documents Checklist',
  description: 'Manage and review required documents for university applications and D-2 Visa processing.'
}

export default function DocumentsPage() {
  return (
    <PageShell
      title="Hujjatlar (Required Documents)"
      description="Universitetga topshirish va D-2 Viza olish uchun zarur bo'lgan hujjatlar ro'yxati."
    >
      <DocumentsClient />
    </PageShell>
  )
}
