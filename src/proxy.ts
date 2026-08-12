import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database } from '@/types/database'

// Routes accessible only to Managers & Head Managers
const MANAGER_ONLY_ROUTES = ['/payments', '/settings', '/users']

// Routes that are publicly accessible (no auth required)
const PUBLIC_ROUTES = ['/login']

// Mapping from production domains to expected tenant IDs
const DOMAIN_TENANT_MAP: Record<string, string> = {
  'crm.unibridge.uz': 'unibridge',
  'crm.sodiqedu.uz': 'sodiq',
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — IMPORTANT: Do not add logic between createServerClient and getUser
  let user = null
  let authError = null

  try {
    const { data, error } = await supabase.auth.getUser()
    user = data?.user || null
    authError = error
  } catch (err: any) {
    authError = err
  }

  const { pathname } = request.nextUrl

  // Clear stale cookies on auth failure (e.g. refresh_token_not_found)
  if (authError || !user) {
    const allCookies = request.cookies.getAll()
    allCookies.forEach(({ name }) => {
      if (name.startsWith('sb-') || name.includes('auth-token')) {
        supabaseResponse.cookies.delete(name)
      }
    })
  }

  // ── 1. Unauthenticated users ──────────────────────────────────────────────
  if (!user && !PUBLIC_ROUTES.includes(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    const redirectRes = NextResponse.redirect(loginUrl)
    const allCookies = request.cookies.getAll()
    allCookies.forEach(({ name }) => {
      if (name.startsWith('sb-') || name.includes('auth-token')) {
        redirectRes.cookies.delete(name)
      }
    })
    return redirectRes
  }

  // ── 2. Authenticated users checks ─────────────────────────────────────────
  if (user) {
    // 2a. Fetch user profile (tenant_id and role)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; tenant_id: string } | null

    // 2b. Restrict access based on domain/hostname mapping
    const hostname = request.headers.get('host') || request.nextUrl.hostname
    const cleanHostname = hostname.split(':')[0]
    const expectedTenant = DOMAIN_TENANT_MAP[cleanHostname]

    if (expectedTenant && profile && profile.tenant_id !== expectedTenant) {
      // Force sign-out to clear the invalid session cookies
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/login'
      loginUrl.searchParams.set('error', 'tenant_mismatch')
      return NextResponse.redirect(loginUrl)
    }

    // 2c. Redirect to dashboard if trying to access public route while logged in
    if (PUBLIC_ROUTES.includes(pathname)) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/students'
      return NextResponse.redirect(dashboardUrl)
    }

    // 2d. Role-based access for Manager-only routes
    if (MANAGER_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
      const userRole = profile?.role
      if (!userRole || (userRole !== 'Manager' && userRole !== 'Head Manager')) {
        const restrictedUrl = request.nextUrl.clone()
        restrictedUrl.pathname = '/restricted'
        return NextResponse.redirect(restrictedUrl)
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export default proxy

