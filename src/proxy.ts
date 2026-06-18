import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { type Database } from '@/types/database'

// Routes accessible only to Managers
const MANAGER_ONLY_ROUTES = ['/payments', '/settings']

// Routes that are publicly accessible (no auth required)
const PUBLIC_ROUTES = ['/login']

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // ── 1. Unauthenticated users ──────────────────────────────────────────────
  if (!user && !PUBLIC_ROUTES.includes(pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // ── 2. Authenticated users on public routes → redirect to dashboard ───────
  if (user && PUBLIC_ROUTES.includes(pathname)) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/students'
    return NextResponse.redirect(dashboardUrl)
  }

  // ── 3. Role-based access for Manager-only routes ──────────────────────────
  if (user && MANAGER_ONLY_ROUTES.some((route) => pathname.startsWith(route))) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = (profileData as { role: string } | null)?.role

    if (!userRole || userRole !== 'Manager') {
      const restrictedUrl = request.nextUrl.clone()
      restrictedUrl.pathname = '/restricted'
      return NextResponse.redirect(restrictedUrl)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT static files and Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
