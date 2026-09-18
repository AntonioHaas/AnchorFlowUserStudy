"use client"
import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Trash2, Download, AlertTriangle, Users, Database, Clock, Home, Target } from 'lucide-react'
import { computeMatchScore } from '@/lib/score'
import Geometry from '@/lib/geometry'

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

        <Card>
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
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg bg-card">
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
