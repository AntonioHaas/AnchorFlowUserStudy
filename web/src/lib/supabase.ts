import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Server-only Supabase client singleton.
 * This file must NEVER be imported from client components ("use client").
 * It reads non-NEXT_PUBLIC env vars that are only available server-side.
 */

let _client: SupabaseClient | null = null

export function getSupabaseServer(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  // Prefer service role key for server writes; fall back to anon key
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env.local'
    )
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return _client
}
