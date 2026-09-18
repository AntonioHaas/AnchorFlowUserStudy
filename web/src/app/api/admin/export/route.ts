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

  const [recordsReq] = await Promise.all([
    supabase.from('study_records').select('*')
  ])

  if (recordsReq.error) {
    return Response.json({ error: recordsReq.error.message }, { status: 500 })
  }

  const records = recordsReq.data || []
  
  if (records.length === 0) {
    return new Response('No data', { status: 200 })
  }

  // Generate CSV for records (omitting operations array for cleaner CSV)
  const columns = [
    'session_id', 'participant_experience', 'mode', 'task_id', 'benchmark_ordinal', 
    'sample_id', 'method', 'method_key', 'method_code', 'completion_state', 
    'attempt', 'submitted_at', 'elapsed_seconds', 'stop_reason', 'success', 
    'original_anchor_count', 'final_anchor_count'
  ]

  const header = columns.join(',')
  const rows = records.map(r => {
    // Extract participant_experience from operations array if it exists
    let exp = ''
    if (Array.isArray(r.operations)) {
      const expOp = r.operations.find((op: any) => op.type === 'participant_experience')
      if (expOp) exp = expOp.experience
    }

    return columns.map(col => {
      let val = col === 'participant_experience' ? exp : r[col]
      if (val === null || val === undefined) return ''
      // Escape quotes and wrap in quotes if there's a comma
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')
  })

  const csv = [header, ...rows].join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="anchorflow_study_export.csv"'
    }
  })
})
