import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { DocumentsClient } from './DocumentsClient'

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Manage student documents, missing checklists, and hand copy counts overrides.'
}

export default function DocumentsPage() {
  return (
    <PageShell
      title="Documents"
      description="Manage student missing document checklists, toggle statuses, and adjust count overrides."
    >
      <DocumentsClient />
    </PageShell>
  )
}
