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
    'session_id', 'task_id', 'mode', 'method', 'method_code',
    'participant_experience', 'accuracy', 'add_points_count', 'delete_points_count', 'move_points_count', 'undo_count', 'redo_count',
    'success', 'elapsed_seconds', 'completion_state', 'stop_reason',
    'attempt', 'original_anchor_count', 'final_anchor_count',
    'source_path', 'source_svg_sha256', 'input_sha256', 'submitted_at',
    'initial_path', 'edited_path', 'target_path', 'edited_svg'
  ]

  const header = columns.join(',')
  const rows = records.map(r => {
    // Generate full SVG wrapper
    const edited_svg = r.edited_path 
      ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><path d="${r.edited_path}" fill="none" stroke="black" stroke-width="2"/></svg>` 
      : ''

    return columns.map(col => {
      let val = col === 'edited_svg' ? edited_svg : r[col]
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
