import { createBrowserClient } from '@supabase/ssr'
import { type Database } from '@/types/database'

/**
 * Creates a Supabase client for use in Client Components.
 * Uses the public anon key — RLS policies enforce data access.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

  return createBrowserClient<Database>(supabaseUrl, supabaseKey)
}
