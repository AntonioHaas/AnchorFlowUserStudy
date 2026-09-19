"use client"
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Trash2, Download, AlertTriangle, Users, Database, Clock, Home, Target } from 'lucide-react'
import { computeMatchScore } from '@/lib/score'
import Geometry from '@/lib/geometry'

// --- Stats Helpers ---
function computeStats(values: number[]) {
  if (!values || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const median = sorted[Math.floor(sorted.length * 0.5)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  
  const outliers = sorted.filter(v => v < lowerFence || v > upperFence);
  const nonOutliers = sorted.filter(v => v >= lowerFence && v <= upperFence);
  
  const whiskerMin = nonOutliers.length > 0 ? nonOutliers[0] : min;
  const whiskerMax = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : max;
  
  const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  
  return { min, max, q1, median, q3, whiskerMin, whiskerMax, outliers, mean, values };
}

const METHOD_COLORS: Record<string, string> = {
  adavec: '#88aed0',
  live: '#f4b17f',
  ours: '#8fd589'
};
const METHOD_LABELS: Record<string, string> = {
  adavec: 'AdaVec',
  live: 'LIVE',
  ours: 'Ours'
};
const METHOD_ORDER = ['adavec', 'live', 'ours']; // Display order (top to bottom)

// --- Native SVG BoxPlot Component ---
function BoxPlotChart({ title, data, xLabel, formatValue = (v: number) => String(Math.round(v)) }: any) {
  const stats: Record<string, any> = {};
  let globalMin = Infinity;
  let globalMax = -Infinity;
  
  for (const method of METHOD_ORDER) {
    const vals = data[method] || [];
    if (vals.length > 0) {
      const s = computeStats(vals);
      stats[method] = s;
      if (s!.min < globalMin) globalMin = s!.min;
      if (s!.max > globalMax) globalMax = s!.max;
    }
  }
  
  if (globalMin === Infinity) return <div className="text-center p-4 text-muted-foreground border rounded-lg bg-card text-sm">No data for {title}</div>;
  
  // Pad the bounds by 10% on each side
  const range = globalMax - globalMin || 1;
  const pad = range * 0.1;
  let xMin = globalMin - pad;
  let xMax = globalMax + pad;
  if (xMin < 0 && globalMin >= 0) xMin = 0; // Don't dip below 0 if data is all positive
  
  // Dimensions
  const w = 400;
  const h = 200;
  const margin = { top: 20, right: 30, bottom: 40, left: 70 };
  const plotW = w - margin.left - margin.right;
  const plotH = h - margin.top - margin.bottom;
  
  const xScale = (val: number) => margin.left + ((val - xMin) / (xMax - xMin)) * plotW;
  const rowH = plotH / METHOD_ORDER.length;
  
  // Generate X ticks
  const numTicks = 4;
  const ticks = [];
  for (let i = 0; i <= numTicks; i++) {
    ticks.push(xMin + (i / numTicks) * (xMax - xMin));
  }

  return (
    <Card className="flex flex-col h-full bg-white">
      <CardContent className="p-0 flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full max-h-[300px]" style={{ fontFamily: 'system-ui, sans-serif' }}>
          
          {/* X-axis grid lines & labels */}
          {ticks.map((tick, i) => {
            const x = xScale(tick);
            return (
              <g key={i}>
                <line x1={x} y1={margin.top} x2={x} y2={margin.top + plotH} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3,3" />
                <text x={x} y={h - margin.bottom + 15} fontSize="11" fill="#64748b" textAnchor="middle" fontWeight="500">
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}
          
          {/* Main X and Y axis lines */}
          <line x1={margin.left} y1={margin.top} x2={margin.left} y2={margin.top + plotH} stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1={margin.left} y1={margin.top + plotH} x2={w - margin.right} y2={margin.top + plotH} stroke="#cbd5e1" strokeWidth="1.5" />
          
          {/* X Label */}
          <text x={margin.left + plotW / 2} y={h - 5} fontSize="12" fill="#0f172a" textAnchor="middle" fontWeight="bold">
            {xLabel}
          </text>

          {/* Render each method row */}
          {METHOD_ORDER.map((method, idx) => {
            const s = stats[method];
            if (!s) return null;
            
            const cy = margin.top + (idx * rowH) + (rowH / 2);
            const boxH = rowH * 0.5;
            const yTop = cy - boxH / 2;
            
            return (
              <g key={method} className="group">
                {/* Y-axis Label */}
                <text x={margin.left - 10} y={cy} fontSize="12" fill="#0f172a" textAnchor="end" alignmentBaseline="middle" fontWeight="bold">
                  {METHOD_LABELS[method]}
                </text>
                
                {/* Whiskers */}
                <line x1={xScale(s.whiskerMin)} y1={cy} x2={xScale(s.q1)} y2={cy} stroke="#64748b" strokeWidth="1.5" />
                <line x1={xScale(s.q3)} y1={cy} x2={xScale(s.whiskerMax)} y2={cy} stroke="#64748b" strokeWidth="1.5" />
                <line x1={xScale(s.whiskerMin)} y1={yTop + boxH*0.2} x2={xScale(s.whiskerMin)} y2={yTop + boxH*0.8} stroke="#64748b" strokeWidth="1.5" />
                <line x1={xScale(s.whiskerMax)} y1={yTop + boxH*0.2} x2={xScale(s.whiskerMax)} y2={yTop + boxH*0.8} stroke="#64748b" strokeWidth="1.5" />
                
                {/* IQR Box */}
                <rect 
                  x={xScale(s.q1)} 
                  y={yTop} 
                  width={xScale(s.q3) - xScale(s.q1)} 
                  height={boxH} 
                  fill={METHOD_COLORS[method]} 
                  stroke="none"
                />
                
                {/* Median Line */}
                <line x1={xScale(s.median)} y1={yTop} x2={xScale(s.median)} y2={yTop + boxH} stroke="#0f172a" strokeWidth="2" />
                
                {/* Mean Label (above box) */}
                <text x={xScale(s.mean)} y={yTop - 6} fontSize="11" fill="#0f172a" textAnchor="middle" fontWeight="bold">
                  {formatValue(s.mean)}
                </text>
                
                {/* Scatter Points (Jittered) */}
                {s.values.map((v: number, vi: number) => {
                  // Pseudo-random jitter based on index so it's stable
                  const jitter = (Math.sin(vi * 999) * 0.4) * boxH;
                  const isOutlier = v < s.whiskerMin || v > s.whiskerMax;
                  return (
                    <circle 
                      key={vi} 
                      cx={xScale(v)} 
                      cy={cy + jitter} 
                      r="1.5" 
                      fill="none" 
                      stroke="#94a3b8" 
                      strokeWidth="1"
                      opacity={isOutlier ? 1 : 0.6}
                    />
                  );
                })}

                {/* Invisible hover area for tooltip */}
                <rect x={margin.left} y={yTop - 10} width={plotW} height={boxH + 20} fill="transparent">
                  <title>{`${METHOD_LABELS[method]}\nMean: ${formatValue(s.mean)}\nMedian: ${formatValue(s.median)}\nQ1: ${formatValue(s.q1)}\nQ3: ${formatValue(s.q3)}`}</title>
                </rect>
              </g>
            );
          })}
        </svg>
      </CardContent>
    </Card>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<{ sessions: any[], records: any[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard')
      if (res.status === 403) {
        setError("Forbidden. This dashboard is only available in development mode (localhost).")
        return
      }
      if (!res.ok) {
        throw new Error("Failed to fetch data")
      }
      const json = await res.json()
      setData(json)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDeleteRun = async (sessionId: string) => {
    if (!confirm(`Are you sure you want to delete session ${sessionId}? This cannot be undone.`)) return
    
    setDeletingId(sessionId)
    try {
      const res = await fetch(`/api/admin/dashboard?session_id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error("Failed to delete")
      await fetchData()
    } catch (err: any) {
      alert("Error deleting session: " + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  const handleClearDatabase = async () => {
    if (!confirm("WARNING: Are you absolutely sure you want to clear ALL study sessions and records? This CANNOT BE UNDONE.")) return
    
    setDeletingId('all')
    try {
      const res = await fetch(`/api/admin/dashboard`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error("Failed to clear database")
      await fetchData()
    } catch (err: any) {
      alert("Error clearing database: " + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center bg-muted/20">
        <Card className="w-full max-w-lg border-destructive/50">
          <CardHeader className="text-center">
            <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-xl text-destructive">Access Denied</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-4">
            <Button onClick={() => window.location.href = '/'}>
              <Home className="mr-2 h-4 w-4" /> Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data && loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading dashboard...</div>
  }

  if (!data) return null

  // Calculate some basic reports
  const totalSessions = data.sessions.length
  const totalRecords = data.records.length
  const formalRecords = data.records.filter(r => r.mode === 'clean2400_editing_pilot')
  
  const totalTime = formalRecords.reduce((acc, r) => acc + (r.elapsed_seconds || 0), 0)
  const avgTimePerOption = formalRecords.length > 0 ? (totalTime / formalRecords.length).toFixed(1) : '0.0'

  // Compute datasets for box plots
  const boxDataTime: Record<string, number[]> = { ours: [], live: [], adavec: [] };
  const boxDataOps: Record<string, number[]> = { ours: [], live: [], adavec: [] };
  const boxDataAcc: Record<string, number[]> = { ours: [], live: [], adavec: [] };
  
  formalRecords.forEach(r => {
    const mk = r.method_key;
    if (!boxDataTime[mk]) return;
    
    if (r.elapsed_seconds !== null && r.elapsed_seconds !== undefined) {
      boxDataTime[mk].push(r.elapsed_seconds);
    }
    
    const opsCount = (r.add_points_count || 0) + (r.delete_points_count || 0) + (r.move_points_count || 0) + (r.undo_count || 0) + (r.redo_count || 0);
    boxDataOps[mk].push(opsCount);
    
    // dynamically compute accuracy if missing
    let acc = r.accuracy;
    if ((acc === null || acc === undefined) && r.edited_path && r.target_path) {
      try {
        acc = computeMatchScore(Geometry.parse(r.edited_path), r.target_path).accuracy;
      } catch (e) {}
    }
    if (acc !== null && acc !== undefined) {
      boxDataAcc[mk].push(acc);
    }
  });

  return (
    <div className="min-h-screen p-4 md:p-8 bg-muted/10">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Database Dashboard</h1>
            <p className="text-muted-foreground">Local development environment only.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <Home className="mr-2 h-4 w-4" /> Home
            </Button>
            <Button onClick={() => window.location.href = '/api/admin/export'}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button variant="destructive" onClick={handleClearDatabase} disabled={deletingId === 'all' || totalSessions === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> {deletingId === 'all' ? 'Clearing...' : 'Clear Database'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalSessions}</div>
              <p className="text-xs text-muted-foreground">Unique sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalRecords}</div>
              <p className="text-xs text-muted-foreground">{formalRecords.length} formal study edits</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Time / Edit</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{avgTimePerOption}s</div>
              <p className="text-xs text-muted-foreground">Across all formal tasks</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-xl font-bold tracking-tight mt-6 mb-2">Average Time per Method</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { key: 'ours', name: 'AnchorFlow (Ours)' },
            { key: 'adavec', name: 'AdaVec' },
            { key: 'live', name: 'LIVE' }
          ].map(method => {
            const mRecords = formalRecords.filter(r => r.method_key === method.key)
            const mAvg = mRecords.length > 0 
              ? (mRecords.reduce((acc, r) => acc + (r.elapsed_seconds || 0), 0) / mRecords.length).toFixed(1) 
              : '0.0'

            // Compute accuracy dynamically if possible
            let totalAccuracy = 0
            let validCount = 0
            for (const r of mRecords) {
              if (r.accuracy !== undefined && r.accuracy !== null) {
                totalAccuracy += r.accuracy
                validCount++
              } else if (r.edited_path && r.target_path) {
                try {
                  const g = Geometry.parse(r.edited_path)
                  const score = computeMatchScore(g, r.target_path)
                  totalAccuracy += score.accuracy
                  validCount++
                } catch (e) {
                  // ignore parse errors
                }
              }
            }
            const mAcc = validCount > 0 ? (totalAccuracy / validCount).toFixed(1) : 'N/A'

            return (
              <Card key={method.key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{method.name}</CardTitle>
                  <div className="flex gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <Target className="h-4 w-4 ml-1" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end">
                    <div>
                      <div className="text-2xl font-bold">{mAvg}s</div>
                      <p className="text-xs text-muted-foreground">Based on {mRecords.length} edits</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{mAcc}{mAcc !== 'N/A' && '%'}</div>
                      <p className="text-[10px] text-muted-foreground">Accuracy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <h2 className="text-xl font-bold tracking-tight mt-10 mb-2">Performance Distributions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BoxPlotChart title="Editing Time" data={boxDataTime} xLabel="(a) Editing time (s) ↓" />
          <BoxPlotChart title="Operations" data={boxDataOps} xLabel="(b) Editing operations ↓" />
          <BoxPlotChart title="Accuracy" data={boxDataAcc} xLabel="(c) Final IoU (%) ↑" />
        </div>

        <Card className="mt-10">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>A list of all study runs in the database.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                No sessions found in the database.
              </div>
            ) : (
              <div className="space-y-4">
                {data.sessions.map((session, i) => {
                  const sRecords = data.records.filter(r => r.session_id === session.id)
                  const sFormal = sRecords.filter(r => r.mode === 'clean2400_editing_pilot')
                  return (
                    <div key={session.id} className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-medium">Session {session.id.split('-')[0]}...</span>
                            <Badge variant="outline" className="text-[10px]">
                              {new Date(session.created_at).toLocaleString()}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-x-3 flex items-center">
                            <span>{sRecords.length} total edits</span>
                            <Separator orientation="vertical" className="h-3" />
                            <span>{sFormal.length} formal edits</span>
                            {session.note && (
                              <>
                                <Separator orientation="vertical" className="h-3" />
                                <span className="text-primary truncate max-w-[200px]">"{session.note}"</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => handleDeleteRun(session.id)}
                          disabled={deletingId === session.id}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deletingId === session.id ? 'Deleting...' : 'Delete'}
                        </Button>
                      </div>
                    
                    {/* Visual SVG Thumbnails for this session's formal records */}
                    {sFormal.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mt-4 pt-4 border-t">
                        {sFormal.map((r, idx) => (
                          <div key={idx} className="flex flex-col gap-1 items-center bg-muted/30 p-2 rounded border">
                            <div className="text-[9px] font-mono text-muted-foreground w-full flex justify-between">
                               <span className="truncate mr-1" title={r.task_id}>{r.task_id}</span>
                               <span className="font-bold text-primary shrink-0">{r.method_code}</span>
                            </div>
                            <svg viewBox="0 0 800 800" className="w-full aspect-square border bg-white rounded-sm shadow-sm" style={{ pointerEvents: 'none' }}>
                               {r.target_path && <path d={r.target_path} fill="none" stroke="#ff00ff" strokeWidth="3" strokeDasharray="10,10" opacity="0.3" />}
                               {r.edited_path && <path d={r.edited_path} fill="none" stroke="black" strokeWidth="4" />}
                            </svg>
                            <div className="text-[10px] w-full flex justify-between items-center mt-1 font-mono">
                               <span>Acc:</span>
                               <span className="font-medium text-foreground">{r.accuracy !== null && r.accuracy !== undefined ? r.accuracy.toFixed(1) + '%' : 'N/A'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
