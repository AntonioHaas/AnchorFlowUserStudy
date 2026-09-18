import { withSupabase } from '@supabase/server'

export const dynamic = 'force-dynamic'

const isAdmin = () => {
  return process.env.NODE_ENV === 'development'
}

export const GET = withSupabase({ auth: 'none' }, async (req, ctx) => {
  if (!isAdmin()) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = ctx.supabaseAdmin

  const [sessionsReq, recordsReq] = await Promise.all([
    supabase.from('study_sessions').select('*').order('created_at', { ascending: false }),
    supabase.from('study_records').select('*')
  ])

  if (sessionsReq.error) {
    return Response.json({ error: sessionsReq.error.message }, { status: 500 })
  }
  if (recordsReq.error) {
    return Response.json({ error: recordsReq.error.message }, { status: 500 })
  }

  return Response.json({
    sessions: sessionsReq.data,
    records: recordsReq.data
  })
})

export const DELETE = withSupabase({ auth: 'none' }, async (req, ctx) => {
  if (!isAdmin()) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session_id')
  
  const supabase = ctx.supabaseAdmin

  if (sessionId) {
    // Delete specific session
    await supabase.from('study_records').delete().eq('session_id', sessionId)
    const { error } = await supabase.from('study_sessions').delete().eq('id', sessionId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, deleted: sessionId })
  } else {
    // Delete all (workaround for delete without eq in supabase: neq a dummy uuid)
    await supabase.from('study_records').delete().neq('session_id', '00000000-0000-0000-0000-000000000000')
    const { error } = await supabase.from('study_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ ok: true, deleted: 'all' })
  }
})
