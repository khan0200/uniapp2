import type { Metadata } from 'next'
import { StudentDetailClient } from './StudentDetailClient'

export const metadata: Metadata = { title: 'Student Details' }

interface StudentDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { id } = await params
  return <StudentDetailClient studentId={id} />
}
