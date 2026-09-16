import { withSupabase } from '@supabase/server'

/**
 * POST /api/results
 *
 * Accepts study records from the client and inserts them into Supabase.
 * Uses @supabase/server with auth: 'none' (anonymous study participants).
 * The secret key stays server-side; ctx.supabaseAdmin bypasses RLS.
 */
const handler = withSupabase({ auth: 'none' }, async (req, ctx) => {
  // Basic anti-bot & CORS protection: enforce Origin / Referer
  // (In production, you should add your Netlify domain to this check)
  const origin = req.headers.get('origin')
  const referer = req.headers.get('referer')
  
  const isLocal = (url: string | null) => url?.includes('localhost:') || url?.includes('127.0.0.1:')
  const isNetlify = (url: string | null) => url?.includes('.netlify.app')

  if (process.env.NODE_ENV === 'production') {
    if (!isLocal(origin) && !isNetlify(origin) && !isLocal(referer) && !isNetlify(referer)) {
      console.warn(`Blocked suspicious request. Origin: ${origin}, Referer: ${referer}`)
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await req.json()
  const { session_id, schema, record, records } = body

  if (!session_id || typeof session_id !== 'string') {
    return Response.json({ error: 'Missing session_id' }, { status: 400 })
  }

  const supabase = ctx.supabaseAdmin

  // Ensure session row exists (upsert is idempotent)
  const { error: sessionErr } = await supabase
    .from('study_sessions')
    .upsert(
      { id: session_id, schema: schema || 'anchorflow-benchmark2400-editor-v1' },
      { onConflict: 'id' }
    )

  if (sessionErr) {
    console.error('Session upsert error:', sessionErr)
    return Response.json({ error: sessionErr.message }, { status: 500 })
  }

  // Insert one record or a batch
  const toInsert = records
    ? records.map((r: any) => ({ ...r, session_id }))
    : record
      ? [{ ...record, session_id }]
      : null

  if (!toInsert || toInsert.length === 0) {
    return Response.json({ ok: true, inserted: 0 })
  }

  const { error: insertErr } = await supabase.from('study_records').insert(toInsert)

  if (insertErr) {
    console.error('Records insert error:', insertErr)
    return Response.json({ error: insertErr.message }, { status: 500 })
  }

  return Response.json({ ok: true, inserted: toInsert.length })
})

export async function POST(request: Request) {
  return handler(request)
}
