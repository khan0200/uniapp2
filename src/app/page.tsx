import { redirect } from 'next/navigation'

/**
 * Root page: redirect to /students (the default dashboard view).
 * Middleware handles authentication — unauthenticated users are
 * redirected to /login before they ever reach this component.
 */
export default function RootPage() {
  redirect('/students')
}
