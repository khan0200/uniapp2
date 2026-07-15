import type { Metadata } from 'next'
import { StudentDashboardClient } from '../students/StudentDashboardClient'

export const metadata: Metadata = { title: 'Status' }

export default function StatusPage() {
  return <StudentDashboardClient hidePhone={true} />
}
