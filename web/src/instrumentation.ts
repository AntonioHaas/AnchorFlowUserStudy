export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { getSupabaseServer } = await import('@/lib/supabase')
      const supabase = getSupabaseServer()

      const { error } = await supabase.from('study_sessions').select('id').limit(1)
      if (error) {
        console.error('❌ Supabase Connection Check Failed:', error.message)
      } else {
        console.log('✅ Supabase Connection OK →', process.env.NEXT_PUBLIC_SUPABASE_URL)
      }
    } catch (err: any) {
      console.error('❌ Supabase Connection Error:', err.message)
    }
  }
}
