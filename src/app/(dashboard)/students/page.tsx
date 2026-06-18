import type { Metadata } from 'next'
import { StudentDashboardClient } from './StudentDashboardClient'

export const metadata: Metadata = { title: 'Students' }

export default function StudentsPage() {
  return <StudentDashboardClient />
}
