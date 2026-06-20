import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { ExtractClient } from './ExtractClient'

export const metadata: Metadata = {
  title: 'AI Document Extraction',
  description: 'Upload passports, diplomas, or contact logs to automatically extract and save details to student profiles.'
}

interface ExtractPageProps {
  params: Promise<{ id: string }>
}

export default async function ExtractPage({ params }: ExtractPageProps) {
  const { id } = await params
  return (
    <PageShell className="p-3 gap-3">
      <ExtractClient studentId={id} />
    </PageShell>
  )
}
