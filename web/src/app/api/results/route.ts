import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase'

/**
 * POST /api/results
 *
 * Accepts study records from the client and inserts them into Supabase.
 * The Supabase credentials never leave the server.
 *
 * Body shape:
 *   { session_id: string, schema: string, record: object }
 *   OR
 *   { session_id: string, schema: string, records: object[] }   (batch on finish)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { session_id, schema, record, records } = body

    if (!session_id || typeof session_id !== 'string') {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })
    }

    const supabase = getSupabaseServer()

    // Ensure session row exists (upsert is idempotent)
    const { error: sessionErr } = await supabase
      .from('study_sessions')
      .upsert({ id: session_id, schema: schema || 'anchorflow-benchmark2400-editor-v1' }, { onConflict: 'id' })

    if (sessionErr) {
      console.error('Session upsert error:', sessionErr)
      return NextResponse.json({ error: sessionErr.message }, { status: 500 })
    }

    // Insert one record or a batch
    const toInsert = records
      ? records.map((r: any) => ({ ...r, session_id }))
      : record
        ? [{ ...record, session_id }]
        : null

    if (!toInsert || toInsert.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 })
    }

    const { error: insertErr } = await supabase.from('study_records').insert(toInsert)

    if (insertErr) {
      console.error('Records insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, inserted: toInsert.length })
  } catch (err: any) {
    console.error('API /results error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
