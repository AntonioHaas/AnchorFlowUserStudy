"use client"
import React, { useState } from 'react'
import tasksData from '@/lib/tasks.json'
import CanvasEditor from '@/components/CanvasEditor'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, ChevronRight } from 'lucide-react'

export default function StudyPage() {
  const [phase, setPhase] = useState<'practice' | 'study' | 'done'>('practice')
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [sessionId] = useState(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : '')

  const currentTask: any = phase === 'practice' ? tasksData.practice[index] : tasksData.formal[index]
  const methods = phase === 'practice'
    ? [{ key: 'practice', label: 'Übung / Practice', short: 'P' }]
    : [
        { key: 'ours', label: 'Methode A', short: 'A' },
        { key: 'adavec', label: 'Methode B', short: 'B' },
      ]

  const totalFormalTasks = tasksData.formal.length * 2
  const completedMethods = phase === 'study' ? index * 2 : 0
  const progressValue = phase === 'practice' ? 0 : (completedMethods / totalFormalTasks) * 100

  const handleComplete = async (methodKey: string, data: any) => {
    const record = {
      mode: phase === 'practice' ? 'practice_pilot' : 'clean2400_editing_pilot',
      task_id: currentTask.id,
      benchmark_ordinal: 0,
      sample_id: currentTask.sample_id,
      method: data.method,
      method_key: data.method_key,
      method_code: data.method_key === 'ours' ? 'A' : 'B',
      completion_state: data.completion_state,
      source_svg_sha256: currentTask.predictions[methodKey]?.sha256 || '',
      input_sha256: currentTask.sha256 || '',
      source_path: currentTask.predictions[methodKey]?.relative_path || '',
      attempt: 1,
      submitted_at: new Date().toISOString(),
      elapsed_seconds: data.elapsed_seconds,
      stop_reason: data.stop_reason,
      success: data.completion_state === 'completed',
      original_anchor_count: data.original_anchor_count,
      final_anchor_count: data.final_anchor_count,
    }

    setResults(prev => [...prev, record])

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          schema: 'anchorflow-benchmark2400-editor-v1',
          record,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        console.error('Save error:', err)
      }
    } catch (err) {
      console.error('Network error saving result:', err)
    }
  }

  const handleNext = () => {
    if (phase === 'practice') {
      if (index < tasksData.practice.length - 1) {
        setIndex(index + 1)
      } else {
        setPhase('study')
        setIndex(0)
      }
    } else {
      if (index < tasksData.formal.length - 1) {
        setIndex(index + 1)
      } else {
        setPhase('done')
        submitResults()
      }
    }
  }

  const submitResults = async () => {
    const blob = new Blob([JSON.stringify({
      schema: 'anchorflow-benchmark2400-editor-v1',
      study_session_id: sessionId,
      records: results
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shape-edit-${sessionId}-${Date.now()}.json`
    a.click()
  }

  // ── Completion screen ──
  if (phase === 'done') {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="h-6 w-6 text-foreground" />
            </div>
            <CardTitle className="text-lg">Studie abgeschlossen</CardTitle>
            <CardDescription>Study complete — thank you for your participation.</CardDescription>
          </CardHeader>
          <Separator />
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Ihre Ergebnisse wurden gespeichert. Eine lokale Kopie wurde als JSON heruntergeladen.
              <br />
              <span className="text-xs">Your results have been saved. A local JSON copy was downloaded.</span>
            </p>
            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
              Neustart / Restart
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Phase label ──
  const phaseLabel = phase === 'practice'
    ? `Übung ${index + 1} von ${tasksData.practice.length}`
    : `Aufgabe ${index + 1} von ${tasksData.formal.length}`
  const phaseLabelEn = phase === 'practice'
    ? `Practice ${index + 1} of ${tasksData.practice.length}`
    : `Task ${index + 1} of ${tasksData.formal.length}`

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="max-w-[1560px] mx-auto space-y-5">

        {/* ── Header ── */}
        <header className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Formbearbeitungsstudie
            </h1>
            <p className="text-sm text-muted-foreground">Shape Editing Study</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={phase === 'practice' ? 'secondary' : 'default'}>
              {phaseLabel}
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {phaseLabelEn}
            </span>
          </div>
        </header>

        <Separator />

        {/* ── Task instruction ── */}
        <div className="space-y-1">
          <p className="text-sm font-medium">{currentTask.name}</p>
          <p className="text-sm text-muted-foreground">{currentTask.instruction}</p>
        </div>

        {/* ── Main workspace ── */}
        <div className="flex flex-col lg:flex-row gap-5 items-start">

          {/* Target preview */}
          <Card className="w-full lg:w-[280px] shrink-0">
            <CardHeader className="py-2.5 px-4">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ziel / Target
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <svg viewBox="0 0 256 256" className="w-full aspect-square bg-background">
                <path d={currentTask.after} fill="#4a90b8" />
                <path
                  d={currentTask.before}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={0.6}
                  strokeDasharray="3 2"
                  className="text-muted-foreground/40"
                />
              </svg>
            </CardContent>
          </Card>

          {/* Editor canvases */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-w-0">
            {methods.map(m => (
              <CanvasEditor
                key={m.key + index + phase}
                method={m}
                task={currentTask}
                isPractice={phase === 'practice'}
                onComplete={handleComplete}
              />
            ))}
          </div>
        </div>

        {/* ── Footer: navigation + progress ── */}
        <Separator />

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground max-w-md">
            {phase === 'study'
              ? 'Bitte bearbeiten Sie beide Varianten, bevor Sie fortfahren. / Please edit both variants before proceeding.'
              : 'Übung abschließen, um mit der Studie zu beginnen. / Complete practice to begin the study.'}
          </p>
          <Button onClick={handleNext} className="shrink-0">
            {phase === 'practice'
              ? 'Weiter / Next'
              : index === tasksData.formal.length - 1
                ? 'Abschließen / Finish'
                : 'Nächste Aufgabe / Next'}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar (study phase only) */}
        {phase === 'study' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Gesamtfortschritt / Overall progress</span>
              <span className="font-mono">{completedMethods} / {totalFormalTasks}</span>
            </div>
            <Progress value={progressValue} className="h-1.5" />
          </div>
        )}
      </div>
    </div>
  )
}
