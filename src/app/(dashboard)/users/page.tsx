import type { Metadata } from 'next'
import { PageShell } from '@/components/ui/PageShell'
import { UsersClient } from './UsersClient'

export const metadata: Metadata = { title: 'User Management' }

export default function UsersPage() {
  return (
    <PageShell
      title="User Management"
      description="Manage CRM user accounts, passwords, and assign system access roles."
    >
      <UsersClient />
    </PageShell>
  )
}
