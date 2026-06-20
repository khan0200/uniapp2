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
    <PageShell className="px-6 py-6 md:px-10 md:py-8 max-w-7xl mx-auto flex flex-col gap-6">
      <ExtractClient studentId={id} />
    </PageShell>
  )
}
