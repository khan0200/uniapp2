import type { Metadata } from 'next'
import { StudentDashboardClient } from '@/app/(dashboard)/students/StudentDashboardClient'

export const metadata: Metadata = { title: 'Status' }

export default function StatusPage() {
  return <StudentDashboardClient hidePhone={true} />
}
