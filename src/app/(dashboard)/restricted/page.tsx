import type { Metadata } from 'next'
import { RestrictedAccess } from '@/components/ui/RestrictedAccess'

export const metadata: Metadata = { title: 'Access Restricted' }

export default function RestrictedPage() {
  return <RestrictedAccess />
}
