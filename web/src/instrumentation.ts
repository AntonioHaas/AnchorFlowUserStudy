export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SECRET_KEY

    if (!url || !key) {
      console.warn('⚠️  Supabase: SUPABASE_URL or SUPABASE_SECRET_KEY not set in .env.local')
      return
    }

    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })

      const { error } = await supabase.from('study_sessions').select('id').limit(1)
      if (error) {
        console.error('❌ Supabase Connection Check Failed:', error.message)
      } else {
        console.log('✅ Supabase Connection OK →', url)
      }
    } catch (err: any) {
      console.error('❌ Supabase Connection Error:', err.message)
    }
  }
}
