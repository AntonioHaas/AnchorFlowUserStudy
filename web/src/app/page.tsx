"use client"
import React, { useState } from 'react'
import tasksData from '@/lib/tasks.json'
import CanvasEditor from '@/components/CanvasEditor'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, ChevronRight, Info, Globe } from 'lucide-react'

type Language = 'de' | 'en'

const TRANSLATIONS = {
  de: {
    title: 'Formbearbeitungsstudie',
    practice: 'Übung',
    task: 'Aufgabe',
    target: 'Ziel',
    next: 'Weiter',
    finish: 'Abschließen',
    overallProgress: 'Gesamtfortschritt',
    landingTitle: 'Willkommen zur Formbearbeitungsstudie',
    landingP1: 'In dieser Studie werden Sie Vektorgrafiken (SVGs) bearbeiten. Ihnen wird jeweils ein Ziel (Target) angezeigt, und Sie sollen versuchen, die vorgegebene Form mit den zur Verfügung stehenden Werkzeugen so gut wie möglich nachzubilden.',
    landingP2: 'Sie beginnen mit einer kurzen Übungsphase, gefolgt von den eigentlichen Aufgaben.',
    landingStart: 'Studie beginnen',
    methodA: 'Methode A',
    methodB: 'Methode B',
    doneTitle: 'Studie abgeschlossen',
    doneDesc: 'Vielen Dank für Ihre Teilnahme.',
    doneMsg: 'Ihre Ergebnisse wurden erfolgreich und sicher übermittelt. Sie können dieses Fenster nun schließen.',
    mustComplete: 'Bitte bearbeiten Sie alle Varianten, bevor Sie fortfahren.',
    mobileBlockerTitle: 'Desktop-Browser Erforderlich',
    mobileBlockerDesc: 'Diese Studie erfordert präzise Maus-Eingaben für die Vektorbearbeitung. Bitte verwenden Sie einen Computer (PC oder Mac), um teilzunehmen.'
  },
  en: {
    title: 'Shape Editing Study',
    practice: 'Practice',
    task: 'Task',
    target: 'Target',
    next: 'Next',
    finish: 'Finish',
    overallProgress: 'Overall progress',
    landingTitle: 'Welcome to the Shape Editing Study',
    landingP1: 'In this study, you will edit vector graphics (SVGs). You will be shown a Target, and you should try to recreate the shape as closely as possible using the provided tools.',
    landingP2: 'You will begin with a short practice phase, followed by the main tasks.',
    landingStart: 'Start Study',
    methodA: 'Method A',
    methodB: 'Method B',
    doneTitle: 'Study Complete',
    doneDesc: 'Thank you for your participation.',
    doneMsg: 'Your results have been successfully and securely submitted. You may now close this window.',
    mustComplete: 'Please complete all variants before proceeding.',
    mobileBlockerTitle: 'Desktop Browser Required',
    mobileBlockerDesc: 'This study requires precise mouse inputs for vector editing. Please use a computer (PC or Mac) to participate.'
  }
}

export default function StudyPage() {
  const [phase, setPhase] = useState<'landing' | 'practice' | 'study' | 'done'>('landing')
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [sessionId] = useState(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : '')
  const [lang, setLang] = useState<Language>('de')
  const [isMobile, setIsMobile] = useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      const ua = navigator.userAgent
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) || window.innerWidth < 768) {
        setIsMobile(true)
      } else {
        setIsMobile(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const t = TRANSLATIONS[lang]

  const currentTask: any = phase === 'practice' ? tasksData.practice[index] : (phase === 'study' ? tasksData.formal[index] : null)
  
  const methods = phase === 'practice'
    ? [{ key: 'practice', label: t.practice, short: 'P' }]
    : [
        { key: 'ours', label: t.methodA, short: 'A' },
        { key: 'adavec', label: t.methodB, short: 'B' },
      ]

  const totalFormalTasks = tasksData.formal.length * 2
  const completedMethods = phase === 'study' ? index * 2 : 0
  const progressValue = phase === 'practice' ? 0 : (completedMethods / totalFormalTasks) * 100

  // Calculate if current step is fully completed
  const currentStepResults = results.filter(r => 
    r.task_id === currentTask?.id && 
    r.mode === (phase === 'practice' ? 'practice_pilot' : 'clean2400_editing_pilot')
  )
  const isStepComplete = currentStepResults.length >= methods.length

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
      source_svg_sha256: currentTask?.predictions[methodKey]?.sha256 || '',
      input_sha256: currentTask?.sha256 || '',
      source_path: currentTask?.predictions[methodKey]?.relative_path || '',
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
        console.error('Save error:', await res.json())
      }
    } catch (err) {
      console.error('Network error saving result:', err)
    }
  }

  const handleNext = () => {
    if (!isStepComplete) return

    if (phase === 'practice') {
      if (index < tasksData.practice.length - 1) {
        setIndex(index + 1)
      } else {
        setPhase('study')
        setIndex(0)
      }
    } else if (phase === 'study') {
      if (index < tasksData.formal.length - 1) {
        setIndex(index + 1)
      } else {
        setPhase('done')
      }
    }
  }

  // Update HTML lang attribute for WCAG compliance
  React.useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  // ── Header Component ──
  const TopNav = () => (
    <header className="flex items-center justify-between bg-card border rounded-lg px-4 py-3 shrink-0 shadow-sm" role="banner">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
        <h1 className="text-base font-semibold tracking-tight">{t.title}</h1>
        
        {phase !== 'landing' && phase !== 'done' && (
          <>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div className="flex flex-col" aria-live="polite">
              <span className="text-sm font-medium flex items-center gap-1.5">
                <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                {lang === 'de' ? currentTask.name : (currentTask.name_en || currentTask.name)}
              </span>
              <span className="text-xs text-muted-foreground">
                {lang === 'de' ? currentTask.instruction : (currentTask.instruction_en || currentTask.instruction)}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
          className="h-8"
          aria-label={lang === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
        >
          <Globe className="mr-2 h-4 w-4" aria-hidden="true" />
          {lang.toUpperCase()}
        </Button>
        {phase !== 'landing' && phase !== 'done' && (
          <Badge variant={phase === 'practice' ? 'secondary' : 'default'} className="px-2 py-0.5" aria-label={`Fortschritt: ${phase === 'practice' ? t.practice : t.task}`}>
            {phase === 'practice' 
              ? `${t.practice} ${index + 1} / ${tasksData.practice.length}`
              : `${t.task} ${index + 1} / ${tasksData.formal.length}`
            }
          </Badge>
        )}
      </div>
    </header>
  )

  // ── Landing Page ──
  if (phase === 'landing') {
    return (
      <div className="min-h-screen p-2 md:p-4 bg-muted/20">
        <div className="max-w-[1560px] mx-auto flex flex-col gap-3 h-[calc(100vh-2rem)]">
          <TopNav />
          <div className="flex items-center justify-center min-h-[85vh]">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-3xl font-bold">{t.landingTitle}</CardTitle>
                <CardDescription className="text-lg mt-2">
                  {lang === 'de' ? 'Vector Shape Editing' : 'Vector Shape Editing'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {isMobile ? (
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-destructive/10 rounded-lg border border-destructive/20 text-destructive mb-8">
                    <Info className="w-12 h-12 mb-4 opacity-80" />
                    <h3 className="text-xl font-bold mb-2">{t.mobileBlockerTitle}</h3>
                    <p className="max-w-md">{t.mobileBlockerDesc}</p>
                  </div>
                ) : (
                  <div className="space-y-6 text-lg text-muted-foreground">
                    <p>{t.landingP1}</p>
                    <p>{t.landingP2}</p>
                    <div className="flex justify-center pt-4">
                      <Button size="lg" onClick={() => setPhase('practice')} className="px-12 text-lg h-14">
                        {t.landingStart}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ── Completion screen ──
  if (phase === 'done') {
    return (
      <div className="min-h-screen p-2 md:p-4 bg-muted/20">
        <div className="max-w-[1560px] mx-auto flex flex-col gap-3 h-[calc(100vh-2rem)]">
          <TopNav />
          <div className="flex-1 flex items-center justify-center">
            <Card className="w-full max-w-md shadow-md">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <CheckCircle2 className="h-6 w-6 text-foreground" />
                </div>
                <CardTitle className="text-lg">{t.doneTitle}</CardTitle>
                <CardDescription>{t.doneDesc}</CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4 text-center">
                <p className="text-sm text-muted-foreground mb-6">
                  {t.doneMsg}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // ── Main Workspace ──
  return (
    <div className="min-h-screen p-2 md:p-4 pb-12">
      <div className="max-w-[1560px] mx-auto flex flex-col gap-3 h-[calc(100vh-5rem)]">
        <TopNav />

        <div className="flex flex-col lg:flex-row gap-3 items-start flex-1 min-h-0">
          {/* Target preview */}
          <Card className="w-full lg:w-[260px] shrink-0 h-full flex flex-col">
            <CardHeader className="py-2 px-3 shrink-0">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.target}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="p-0 flex-1 flex items-center justify-center bg-muted/10 min-h-0 overflow-hidden">
              <div className="relative aspect-square h-full max-h-[500px] w-full max-w-[500px] overflow-hidden m-2 border rounded-md shadow-sm bg-background">
                <svg 
                  viewBox="0 0 256 256" 
                  className="w-full h-full"
                  role="img"
                  aria-label={lang === 'de' ? "Vorschau der Zielform" : "Target shape preview"}
                >
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
              </div>
            </CardContent>
          </Card>

          {/* Editor canvases */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 h-full min-w-0">
            {methods.map(m => (
              <CanvasEditor
                key={m.key + index + phase}
                method={m}
                task={currentTask}
                isPractice={phase === 'practice'}
                onComplete={handleComplete}
                lang={lang}
              />
            ))}
          </div>
        </div>

        {/* ── Footer: navigation + progress ── */}
        <div className="bg-card border rounded-lg px-4 py-2 shrink-0 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex-1 max-w-md">
            {phase === 'study' ? (
              <div className="flex items-center gap-3">
                <Progress value={progressValue} className="h-2 w-32" />
                <span className="text-xs font-mono text-muted-foreground">
                  {t.overallProgress}: {completedMethods} / {totalFormalTasks}
                </span>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t.practice}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {!isStepComplete && (
              <span className="text-xs text-destructive font-medium">
                {t.mustComplete}
              </span>
            )}
            <Button onClick={handleNext} size="sm" className="shrink-0" disabled={!isStepComplete}>
              {phase === 'practice'
                ? t.next
                : index === tasksData.formal.length - 1
                  ? t.finish
                  : t.next}
              <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
        
        {/* ── Citation ── */}
        <div className="text-center text-xs text-muted-foreground mt-1 mb-8">
          Einige Formen stammen aus <a href="https://github.com/amcghm/ColorSVG-100K" className="underline hover:text-foreground" target="_blank" rel="noreferrer">ColorSVG-100K</a> (CC BY-NC-SA 4.0) und STIX-Schriften. 
          Some shapes come from ColorSVG-100K and STIX fonts. <a href="/attribution.json" className="underline hover:text-foreground" target="_blank" rel="noreferrer">Lizenzen / Licenses</a>.
        </div>
      </div>
    </div>
  )
}
