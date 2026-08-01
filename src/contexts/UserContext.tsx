'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { type Profile } from '@/types/database'

interface UserContextValue {
  profile: Profile | null
  loading: boolean
  /** Tenant's uploaded logo URL, or null to fall back to the bundled logo. */
  tenantLogoUrl: string | null
  /** Called after a successful upload so the sidebar updates immediately. */
  setTenantLogoUrl: (url: string | null) => void
}

const UserContext = createContext<UserContextValue>({
  profile: null,
  loading: true,
  tenantLogoUrl: null,
  setTenantLogoUrl: () => {},
})

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [tenantLogoUrl, setTenantLogoUrl] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // getSession() reads the locally cached session (no network round trip).
        // We don't need getUser()'s server-side revalidation here — route access
        // is already authoritatively checked server-side in the dashboard layout,
        // and this profile query is protected by RLS regardless.
        const { data: { session }, error: authError } = await supabase.auth.getSession()
        const user = session?.user
        if (authError || !user) {
          setProfile(null)
          setTenantLogoUrl(null)
          setLoading(false)
          return
        }

        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (profileError) {
          console.error('Error fetching profile:', profileError)
          setProfile(null)
        } else {
          setProfile(data)

          // Branding is per tenant. A missing row or an empty logo_url just
          // means this tenant hasn't uploaded one — fall back to the bundled
          // logo rather than treating it as an error.
          const tenantId = (data as Profile | null)?.tenant_id
          if (tenantId) {
            const { data: branding } = await supabase
              .from('tenant_settings')
              .select('logo_url')
              .eq('tenant_id', tenantId)
              .maybeSingle()
            setTenantLogoUrl((branding as { logo_url: string | null } | null)?.logo_url || null)
          } else {
            setTenantLogoUrl(null)
          }
        }
      } catch (err) {
        console.error('Failed to load user session/profile:', err)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchProfile()
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={{ profile, loading, tenantLogoUrl, setTenantLogoUrl }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
