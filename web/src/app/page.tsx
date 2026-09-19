"use client"
import React, { useState } from 'react'
import tasksData from '@/lib/tasks.json'
import CanvasEditor from '@/components/CanvasEditor'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { CheckCircle2, ChevronRight, Info, Globe, Send, MessageSquare } from 'lucide-react'

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
    landingP1: 'In dieser Studie werden Sie Vektorgrafiken (SVGs) bearbeiten. Ihnen wird jeweils ein Ziel (gestrichelte Linie) angezeigt, und Sie sollen versuchen, die vorgegebene Form mit den zur Verfügung stehenden Werkzeugen so gut wie möglich nachzubilden.',
    landingP2: 'Sie beginnen mit einer kurzen Übungsphase, gefolgt von den 4 Aufgaben mit jeweils 3 Varianten.',
    landingStart: 'Studie beginnen',
    doneTitle: 'Studie abgeschlossen',
    doneDesc: 'Vielen Dank für Ihre Teilnahme.',
    doneMsg: 'Ihre Ergebnisse wurden erfolgreich und sicher übermittelt.',
    mustComplete: 'Bitte bearbeiten Sie alle Varianten, bevor Sie fortfahren.',
    mobileBlockerTitle: 'Desktop-Browser Erforderlich',
    mobileBlockerDesc: 'Diese Studie erfordert präzise Maus-Eingaben für die Vektorbearbeitung. Bitte verwenden Sie einen Computer (PC oder Mac), um teilzunehmen.',
    feedbackPrompt: 'Haben Sie Anmerkungen oder Feedback zur Studie? (Optional)',
    feedbackPlaceholder: 'Ihre Rückmeldung zu Bedienung, Schwierigkeit oder Werkzeugen...',
    feedbackSubmit: 'Feedback absenden',
    feedbackThanks: '✓ Vielen Dank für Ihr Feedback!',
    totalEdits: 'Bearbeitungen',
    totalTime: 'Gesamtzeit',
    avgTimePerOption: 'Ø Zeit / Variante',
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
    landingP1: 'In this study, you will edit vector graphics (SVGs). You will be shown a target (dashed outline), and you should try to recreate the shape as closely as possible using the provided tools.',
    landingP2: 'You will begin with a short practice phase, followed by the 4 tasks with 3 options each.',
    landingStart: 'Start Study',
    doneTitle: 'Study Complete',
    doneDesc: 'Thank you for your participation.',
    doneMsg: 'Your results have been successfully and securely submitted.',
    mustComplete: 'Please complete all variants before proceeding.',
    mobileBlockerTitle: 'Desktop Browser Required',
    mobileBlockerDesc: 'This study requires precise mouse inputs for vector editing. Please use a computer (PC or Mac) to participate.',
    feedbackPrompt: 'Do you have any comments or feedback regarding the study? (Optional)',
    feedbackPlaceholder: 'Your thoughts on usability, difficulty, or editing tools...',
    feedbackSubmit: 'Submit feedback',
    feedbackThanks: '✓ Thank you for your feedback!',
    totalEdits: 'Edits',
    totalTime: 'Total time',
    avgTimePerOption: 'Avg time / option',
  }
}

const ALL_METHOD_KEYS = ['ours', 'adavec', 'live'] as const
type MethodKey = typeof ALL_METHOD_KEYS[number]
const SLOT_LETTERS = ['A', 'B', 'C'] as const

function shuffleArray<T>(array: readonly T[]): T[] {
  const arr = [...array]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export default function StudyPage() {
  const [phase, setPhase] = useState<'landing' | 'practice' | 'study' | 'done'>('landing')
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<any[]>([])
  const [sessionId] = useState(() => typeof crypto !== 'undefined' ? crypto.randomUUID() : '')
  const [lang, setLang] = useState<Language>('de')
  const [isMobile, setIsMobile] = useState(false)
  const [svgExperience, setSvgExperience] = useState<string>('')

  // Single active editor tracking: only one method key can be active at a time
  const [activeMethodKey, setActiveMethodKey] = useState<string | null>(null)

  // User feedback on done screen
  const [userComment, setUserComment] = useState('')
  const [commentSubmitted, setCommentSubmitted] = useState(false)
  const [commentSending, setCommentSending] = useState(false)

  // Randomized presentation order per task, generated once per session
  const [taskMethodOrders] = useState<Record<number, MethodKey[]>>(() => {
    const orders: Record<number, MethodKey[]> = {}
    tasksData.formal.forEach((_, taskIdx) => {
      orders[taskIdx] = shuffleArray(ALL_METHOD_KEYS)
    })
    return orders
  })

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

  const currentTask: any = phase === 'practice' 
    ? tasksData.practice[index] 
    : (phase === 'study' ? tasksData.formal[index] : null)
  
  // In study phase, map randomized method keys to presentation slots A, B, C
  const methods = phase === 'practice'
    ? [{ key: 'practice', label: t.practice, short: 'P' }]
    : (taskMethodOrders[index] || ALL_METHOD_KEYS).map((key, slotIdx) => {
        const letter = SLOT_LETTERS[slotIdx]
        return {
          key,
          short: letter,
          label: `${lang === 'de' ? 'Variante' : 'Option'} ${letter}`,
        }
      })

  const totalFormalTasks = tasksData.formal.length * ALL_METHOD_KEYS.length
  const completedFormalMethods = results.filter(r => r.mode === 'clean2400_editing_pilot').length
  const progressValue = phase === 'practice' ? 0 : (completedFormalMethods / totalFormalTasks) * 100

  // Calculate if current task has completed all presented options
  const currentStepResults = results.filter(r => 
    r.task_id === currentTask?.id && 
    r.mode === (phase === 'practice' ? 'practice_pilot' : 'clean2400_editing_pilot')
  )
  const isStepComplete = currentStepResults.length >= methods.length

  // Stats for the current task
  const taskAvgTime = currentStepResults.length > 0
    ? (currentStepResults.reduce((acc, r) => acc + (r.elapsed_seconds || 0), 0) / currentStepResults.length).toFixed(1)
    : '0'

  // Overall study stats for completion screen
  const formalResults = results.filter(r => r.mode === 'clean2400_editing_pilot')
  const totalStudyTime = formalResults.reduce((acc, r) => acc + (r.elapsed_seconds || 0), 0)
  const avgTimePerOption = formalResults.length > 0
    ? (totalStudyTime / formalResults.length).toFixed(1)
    : '0'

  const handleComplete = async (methodKey: string, data: any) => {
    // Release active editor
    if (activeMethodKey === methodKey) {
      setActiveMethodKey(null)
    }

    const methodSrc = currentTask?.predictions?.[methodKey]
    const actualMethodName = methodSrc?.method || (
      methodKey === 'ours' ? 'Ours' :
      methodKey === 'adavec' ? 'AdaVec' :
      methodKey === 'live' ? 'LIVE' : (data.method || methodKey)
    )

    const displayedSlot = methods.find(m => m.key === methodKey)?.short || data.method_code || 'A'

    const record = {
      mode: phase === 'practice' ? 'practice_pilot' : 'clean2400_editing_pilot',
      task_id: currentTask.id,
      benchmark_ordinal: currentTask.benchmark_ordinal || 0,
      sample_id: currentTask.sample_id || null,
      participant_experience: svgExperience,
      method: actualMethodName, // Always TRUE native method name: 'Ours', 'AdaVec', 'LIVE'
      method_key: methodKey,    // Always TRUE native method key: 'ours', 'adavec', 'live'
      method_code: displayedSlot, // 'A', 'B', or 'C' (slot presented to user for this task)
      completion_state: data.completion_state,
      source_svg_sha256: methodSrc?.sha256 || '',
      input_sha256: currentTask?.input_sha256 || '',
      source_path: methodSrc?.relative_path || '',
      attempt: results.filter(r => r.task_id === currentTask.id && r.method_key === methodKey).length + 1,
      submitted_at: new Date().toISOString(),
      elapsed_seconds: data.elapsed_seconds,
      stop_reason: data.stop_reason,
      success: data.completion_state === 'completed',
      original_anchor_count: data.original_anchor_count,
      final_anchor_count: data.final_anchor_count,
      initial_path: data.initial_path || methodSrc?.d || '',
      edited_path: data.edited_path || '',
      target_path: currentTask?.after || '',
      accuracy: data.accuracy,
      add_points_count: data.add_points_count,
      delete_points_count: data.delete_points_count,
      move_points_count: data.move_points_count,
      undo_count: data.undo_count,
      redo_count: data.redo_count,
      operations: data.operations || [],
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
    setActiveMethodKey(null)

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

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userComment.trim()) return
    setCommentSending(true)
    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          note: userComment.trim()
        }),
      })
      if (res.ok) {
        setCommentSubmitted(true)
      }
    } catch (err) {
      console.error('Error submitting feedback:', err)
    } finally {
      setCommentSending(false)
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
        
        {phase !== 'landing' && phase !== 'done' && currentTask && (
          <>
            <Separator orientation="vertical" className="hidden sm:block h-8" />
            <div className="flex flex-col" aria-live="polite">
              <span className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                <Info className="h-4 w-4 text-primary" aria-hidden="true" />
                {lang === 'de' ? (currentTask.name || currentTask.title) : (currentTask.name_en || currentTask.title || currentTask.name)}
              </span>
              <span className="text-sm text-foreground/90">
                {lang === 'de' ? (currentTask.instruction_de || currentTask.instruction) : (currentTask.instruction_en || currentTask.instruction)}
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
        <div className="max-w-[1700px] mx-auto flex flex-col gap-3 h-[calc(100vh-2rem)]">
          <TopNav />
          <div className="flex items-center justify-center min-h-[85vh]">
            <Card className="w-full max-w-2xl mx-4 overflow-hidden">
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-2xl sm:text-3xl font-bold break-words hyphens-auto">{t.landingTitle}</CardTitle>
                <CardDescription className="text-base sm:text-lg mt-2">
                  {lang === 'de' ? 'Vektorbearbeitung & Formoptimierung' : 'Vector Shape Editing'}
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
                    <div className="flex flex-col items-center gap-4 pt-4">
                      <div className="flex items-center gap-3">
                        <label htmlFor="svg-experience" className="text-base font-medium text-foreground">
                          {lang === 'de' ? 'SVG-Erfahrung:' : 'SVG experience:'}
                        </label>
                        <select
                          id="svg-experience"
                          value={svgExperience}
                          onChange={(e) => setSvgExperience(e.target.value)}
                          className="p-2 border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm min-w-[150px]"
                        >
                          <option value="">{lang === 'de' ? 'Bitte wählen' : 'Please select'}</option>
                          <option value="none">{lang === 'de' ? 'Keine' : 'None'}</option>
                          <option value="some">{lang === 'de' ? 'Etwas' : 'Some'}</option>
                          <option value="pro">{lang === 'de' ? 'Profi' : 'Pro'}</option>
                        </select>
                      </div>
                      <Button suppressHydrationWarning size="lg" disabled={svgExperience === '' ? true : undefined} onClick={() => { setActiveMethodKey(null); setPhase('practice'); }} className="px-12 text-lg h-14">
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

  // ── Completion screen with Study Stats & Qualitative Feedback ──
  if (phase === 'done') {
    return (
      <div className="min-h-screen p-2 md:p-4 bg-muted/20">
        <div className="max-w-[1700px] mx-auto flex flex-col gap-3 h-[calc(100vh-2rem)]">
          <TopNav />
          <div className="flex-1 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-md">
              <CardHeader className="text-center pb-3">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl">{t.doneTitle}</CardTitle>
                <CardDescription>{t.doneDesc}</CardDescription>
              </CardHeader>
              
              {/* Post-study Performance Feedback */}
              <CardContent className="space-y-5 pt-1">
                <p className="text-xs text-center text-muted-foreground">
                  {t.doneMsg}
                </p>

                <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 rounded-lg border text-center font-mono">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground uppercase">{t.totalEdits}</span>
                    <span className="text-sm font-semibold mt-0.5">{formalResults.length} / {totalFormalTasks}</span>
                  </div>
                  <div className="flex flex-col border-x">
                    <span className="text-[11px] text-muted-foreground uppercase">{t.totalTime}</span>
                    <span className="text-sm font-semibold mt-0.5">{Math.round(totalStudyTime)}s</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-muted-foreground uppercase">{t.avgTimePerOption}</span>
                    <span className="text-sm font-semibold mt-0.5">{avgTimePerOption}s</span>
                  </div>
                </div>

                <Separator />

                {/* Qualitative Feedback Option */}
                {!commentSubmitted ? (
                  <form onSubmit={handleCommentSubmit} className="space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{t.feedbackPrompt}</span>
                    </div>
                    <textarea
                      value={userComment}
                      onChange={e => setUserComment(e.target.value)}
                      placeholder={t.feedbackPlaceholder}
                      rows={3}
                      className="w-full text-xs p-2.5 rounded-md border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex justify-end">
                      <Button size="sm" type="submit" disabled={!userComment.trim() || commentSending} className="h-8 text-xs">
                        <Send className="mr-1.5 h-3 w-3" />
                        {commentSending ? '...' : t.feedbackSubmit}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center text-xs text-primary font-medium">
                    {t.feedbackThanks}
                  </div>
                )}
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
      <div className="max-w-[1700px] mx-auto flex flex-col gap-3 h-[calc(100vh-5rem)]">
        <TopNav />

        {/* Editor canvases - 3 columns in study phase, 1 centered in practice */}
        <div className="flex-1 min-h-0">
          {phase === 'practice' ? (
            <div className="flex justify-center h-full max-w-xl mx-auto">
              <CanvasEditor
                key="practice"
                method={methods[0]}
                task={currentTask}
                isPractice={true}
                isActive={activeMethodKey === methods[0].key}
                onActivate={() => setActiveMethodKey(methods[0].key)}
                onPause={() => setActiveMethodKey(null)}
                onComplete={handleComplete}
                lang={lang}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 h-full min-w-0">
              {methods.map(m => (
                <CanvasEditor
                  key={m.key + index + phase}
                  method={m}
                  task={currentTask}
                  isPractice={false}
                  isActive={activeMethodKey === m.key}
                  onActivate={() => setActiveMethodKey(m.key)}
                  onPause={() => setActiveMethodKey(null)}
                  onComplete={handleComplete}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </div>

        {/* Practice task completion banner */}
        {phase === 'practice' && isStepComplete && (
          <div className="bg-card border border-primary/30 rounded-lg p-2.5 px-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <span className="text-sm font-semibold">
                  {lang === 'de' ? 'Übungsaufgabe abgeschlossen!' : 'Practice task completed!'}
                </span>
                <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                  {lang === 'de'
                    ? 'Sie haben die Steuerung erfolgreich ausprobiert. Klicken Sie auf "Weiter", um die Studie zu starten.'
                    : 'You have tested the editing controls. Click "Next" to start the study.'}
                </span>
              </div>
            </div>
            <Button size="sm" onClick={handleNext} className="h-8 text-xs font-semibold px-4 shrink-0">
              {t.next}
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Study task completion banner (no score evaluation during formal study) */}
        {phase === 'study' && isStepComplete && (
          <div className="bg-card border border-primary/30 rounded-lg p-2.5 px-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <span className="text-sm font-semibold">
                  {lang === 'de'
                    ? `Aufgabe ${index + 1} abgeschlossen!`
                    : `Task ${index + 1} complete!`}
                </span>
                <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
                  {lang === 'de'
                    ? 'Alle 3 Varianten wurden bearbeitet. Klicken Sie auf "Weiter".'
                    : 'All 3 options have been completed. Click "Next" to proceed.'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="font-mono text-xs">
                ⏱️ {lang === 'de' ? 'Ø Zeit' : 'Avg time'}: {taskAvgTime}s
              </Badge>
              <Button size="sm" onClick={handleNext} className="h-8 text-xs font-semibold px-4">
                {index === tasksData.formal.length - 1 ? t.finish : t.next}
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ── Footer: navigation + progress ── */}
        <div className="bg-card border rounded-lg px-4 py-2 shrink-0 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4 flex-1 max-w-2xl">
            {phase === 'study' ? (
              <>
                <div className="flex items-center gap-3">
                  <Progress value={progressValue} className="h-2 w-28 sm:w-36" />
                  <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                    {t.overallProgress}: {completedFormalMethods} / {totalFormalTasks}
                  </span>
                </div>
                {/* Per-slot progress pills */}
                <div className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                  {SLOT_LETTERS.map(code => {
                    const count = results.filter(r => r.mode === 'clean2400_editing_pilot' && r.method_code === code).length
                    return (
                      <span key={code} className="px-2 py-0.5 rounded bg-muted/70 text-[11px]">
                        {lang === 'de' ? 'Var.' : 'Opt.'} {code}: {count}/{tasksData.formal.length}
                      </span>
                    )
                  })}
                </div>
              </>
            ) : (
              <span className="text-xs text-muted-foreground font-medium">
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
          </div>
        </div>
        
        {/* ── Citation ── */}
        <div className="text-center text-xs text-muted-foreground mt-1 mb-6">
          Einige Formen stammen aus <a href="https://github.com/amcghm/ColorSVG-100K" className="underline hover:text-foreground" target="_blank" rel="noreferrer">ColorSVG-100K</a> (CC BY-NC-SA 4.0) und STIX-Schriften. 
          Some shapes come from ColorSVG-100K and STIX fonts. <a href="/attribution.json" className="underline hover:text-foreground" target="_blank" rel="noreferrer">Lizenzen / Licenses</a>.
        </div>
      </div>
    </div>
  )
}
