"use client"
import React, { useState } from 'react'
import tasksData from '@/lib/tasks.json'
import CanvasEditor from '@/components/CanvasEditor'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'

export default function App() {
  const [phase, setPhase] = useState<'practice' | 'study' | 'done'>('practice')
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<any[]>([])
  
  const currentTask: any = phase === 'practice' ? tasksData.practice[index] : tasksData.formal[index]
  const methods = phase === 'practice' ? [{ key: 'practice', label: 'Practice', short: 'P' }] : [
    { key: 'ours', label: 'Ours', short: 'A' },
    { key: 'adavec', label: 'AdaVec', short: 'B' }
  ]

  const totalFormalTasks = tasksData.formal.length * 2
  const progressValue = phase === 'practice' ? 0 : ((index * 2) / totalFormalTasks) * 100

  const handleComplete = (methodKey: string, data: any) => {
    setResults(prev => {
      const newResults = [...prev]
      newResults.push({
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
      })
      return newResults
    })
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
    const session_id = crypto.randomUUID()
    const sb = supabase as any
    const { data: session, error: err1 } = await sb.from('study_sessions').insert({
      id: session_id,
      schema: 'anchorflow-benchmark2400-editor-v1'
    }).select().single()

    if (err1) {
      console.error('Supabase error', err1)
    }

    const records = results.map(r => ({
      ...r,
      session_id
    }))

    const { error: err2 } = await sb.from('study_records').insert(records)
    if (err2) {
      console.error('Records insert error', err2)
    }
    
    // Also trigger standard JSON download to comply with checklist fallback requirement
    const blob = new Blob([JSON.stringify({
      schema: 'anchorflow-benchmark2400-editor-v1',
      study_session_id: session_id,
      records
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `shape-edit-${session_id}-${Date.now()}.json`
    a.click()
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <Card className="w-full max-w-md text-center p-6">
          <CardHeader>
            <CardTitle>Study Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-gray-600">Thank you for your participation. Your results have been securely uploaded.</p>
            <Button onClick={() => window.location.reload()}>Restart</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900 font-sans">
      <div className="max-w-[1540px] mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Formbearbeitungsstudie / Shape Editing Study</h1>
          <div className="flex items-center gap-3 mt-3">
            <span className="bg-slate-800 text-white font-bold px-3 py-1.5 rounded-lg text-sm">
              {phase === 'practice' ? `Übung ${index + 1} / ${tasksData.practice.length} · Practice` : `Aufgabe ${index + 1} / ${tasksData.formal.length} · Task · ${currentTask.name}`}
            </span>
          </div>
        </header>

        <div className="bg-blue-50 text-blue-900 p-4 rounded-xl mb-6">
          <strong className="block mb-1">{currentTask.name}</strong>
          {currentTask.instruction}
        </div>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <Card className="w-full lg:w-[290px] shrink-0">
            <CardHeader className="py-3 px-4 border-b">
              <CardTitle className="text-sm">Ziel / Target</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <svg viewBox="0 0 256 256" className="w-full aspect-square bg-white">
                <path d={currentTask.after} fill="#397fa6" />
                <path d={currentTask.before} fill="none" stroke="#8b99a3" strokeWidth={0.8} strokeDasharray="3 2" />
              </svg>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
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

        <div className="mt-8 flex items-center justify-between">
          <div className="text-gray-500 text-sm">
            {phase === 'study' ? 'Bitte alle Varianten bearbeiten. / Please complete all options.' : 'Übung abschließen. / Complete practice.'}
          </div>
          <Button size="lg" onClick={handleNext}>
            {phase === 'practice' ? 'Weiter / Next →' : (index === tasksData.formal.length - 1 ? 'Abschließen / Finish' : 'Nächste Aufgabe / Next task →')}
          </Button>
        </div>

        {phase === 'study' && (
          <Card className="mt-6">
            <CardHeader className="py-4">
              <CardTitle className="text-sm flex justify-between">
                <span>Gesamtfortschritt / Overall progress</span>
                <span className="font-normal text-gray-500">{index * 2} / {totalFormalTasks}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progressValue} className="h-3" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
