"use client"
import React, { useEffect, useRef, useState } from 'react'
import Geometry from '@/lib/geometry'
import { computeMatchScore } from '@/lib/score'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Pause, Check, X, RotateCcw } from 'lucide-react'

function clone(x: any) {
  return JSON.parse(JSON.stringify(x))
}

export default function CanvasEditor({
  task,
  method,
  isPractice = false,
  isActive = false,
  onActivate,
  onPause,
  onComplete,
  lang = 'de'
}: any) {
  const TRANSLATIONS = {
    de: {
      start: 'Starten',
      resume: 'Fortsetzen',
      pause: 'Pause',
      done: 'Fertig',
      giveUp: 'Aufgeben',
      completed: 'Abgeschlossen',
      paused: 'Pausiert',
      addAnchor: '＋ Ankerpunkt',
      deleteAnchor: 'Anker löschen',
      undo: 'Rückgängig',
      redo: 'Wiederholen',
    },
    en: {
      start: 'Start',
      resume: 'Resume',
      pause: 'Pause',
      done: 'Done',
      giveUp: 'Give Up',
      completed: 'Completed',
      paused: 'Paused',
      addAnchor: '＋ Anchor',
      deleteAnchor: 'Delete anchor',
      undo: 'Undo',
      redo: 'Redo',
    }
  }
  const t = (TRANSLATIONS as any)[lang]
  const svgRef = useRef<SVGSVGElement>(null)

  const [state, setState] = useState(() => {
    const src = task.predictions[method.key]
    const graph = Geometry.parse(src.d)
    return {
      graph,
      initial: clone(graph),
      selected: new Set([0]),
      history: [] as any[],
      future: [] as any[],
      operations: [] as any[],
      adding: false,
      view: { x: -12, y: -12, w: 280, h: 280 },
    }
  })

  const [hasStarted, setHasStarted] = useState(false)
  const prevIsActiveRef = useRef(false)
  const [submitted, setSubmitted] = useState(false)
  const [remainingTime, setRemainingTime] = useState(isPractice ? 120 : 90)
  const [feedback, setFeedback] = useState<{ accuracy: number, avgDist: number, elapsed: number, reason: string } | null>(null)

  // Track activation transitions: automatically log start, resume, or auto_pause_switch
  useEffect(() => {
    if (prevIsActiveRef.current === isActive) return
    const wasActive = prevIsActiveRef.current
    prevIsActiveRef.current = isActive

    const timeLimit = isPractice ? 120 : 90
    const elapsed = +(timeLimit - remainingTime).toFixed(3)

    if (isActive && !wasActive && !submitted) {
      const rect = svgRef.current?.getBoundingClientRect()
      setState((prev: any) => {
        const ops = [...prev.operations]
        if (!hasStarted) {
          if (rect) {
            ops.push({
              type: 'canvas_meta',
              elapsed_seconds: elapsed,
              canvas_width: rect.width,
              canvas_height: rect.height,
            })
          }
          ops.push({ type: 'start', elapsed_seconds: elapsed })
        } else {
          ops.push({ type: 'resume', elapsed_seconds: elapsed })
        }
        return { ...prev, operations: ops }
      })
      if (!hasStarted) setHasStarted(true)
    } else if (!isActive && wasActive && !submitted) {
      setState((prev: any) => ({
        ...prev,
        operations: [...prev.operations, { type: 'auto_pause_switch', elapsed_seconds: elapsed }]
      }))
    }
  }, [isActive, submitted, remainingTime, hasStarted, isPractice])

  // Single active countdown timer
  useEffect(() => {
    let timer: any = null
    if (isActive && !submitted && remainingTime > 0) {
      timer = setInterval(() => {
        setRemainingTime(r => {
          if (r <= 1) {
            return 0
          }
          return r - 1
        })
      }, 1000)
    } else if (remainingTime === 0 && isActive && !submitted) {
      handleFinish('timeout')
    }
    return () => clearInterval(timer)
  }, [isActive, submitted, remainingTime])

  const handleFinish = (reason: string) => {
    onPause?.()
    setSubmitted(true)
    const timeLimit = isPractice ? 120 : 90
    const elapsedSeconds = +(timeLimit - remainingTime).toFixed(3)
    const methodSrc = task.predictions?.[method.key]

    // Only compute and provide performance feedback after the tutorial (in study phase)
    let fb = null
    if (!isPractice) {
      const match = computeMatchScore(state.graph, task.after)
      fb = {
        accuracy: match.accuracy,
        avgDist: match.avgDist,
        elapsed: elapsedSeconds,
        reason
      }
      setFeedback(fb)
    }

    onComplete(method.key, {
      method: methodSrc?.method || method.key,
      method_key: method.key,
      method_code: method.short,
      completion_state: reason === 'timeout' ? 'timeout' : reason === 'gave_up' ? 'abandoned' : 'completed',
      elapsed_seconds: elapsedSeconds,
      stop_reason: reason,
      original_anchor_count: isPractice ? state.initial.nodes.length : (methodSrc?.original_anchor_count || state.initial.nodes.length),
      final_anchor_count: state.graph.nodes.length,
      initial_path: Geometry.path(state.initial),
      edited_path: Geometry.path(state.graph),
      accuracy: fb?.accuracy,
      operations: [
        ...state.operations,
        {
          type: reason === 'gave_up' ? 'participant_abandon' : 'participant_finish',
          elapsed_seconds: elapsedSeconds,
          ...(fb ? { accuracy: fb.accuracy, avg_distance: fb.avgDist } : {})
        }
      ]
    })
  }

  // SVG interaction effect
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let s = { ...state, drag: null as any }
    let space = false

    function log(type: string, extra = {}) {
      const timeLimit = isPractice ? 120 : 90
      s.operations.push({ type, elapsed_seconds: +(timeLimit - remainingTime).toFixed(3), ...extra })
    }

    function snapshot() {
      return { graph: clone(s.graph), selected: [...s.selected] }
    }

    function remember(type: string) {
      s.history = [...s.history, snapshot()]
      s.future = []
      log(type)
    }

    function draw() {
      svg!.innerHTML = ''
      const scale = s.view.w / 280
      svg!.setAttribute('viewBox', `${s.view.x} ${s.view.y} ${s.view.w} ${s.view.h}`)

      const clipId = `target-clip-${task.id}-${method.key}`
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
      clip.setAttribute('id', clipId)

      const bounds = task.target_guide_bounds || { x: 0, y: 0, width: 256, height: 256 }
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', bounds.x.toString())
      rect.setAttribute('y', bounds.y.toString())
      rect.setAttribute('width', bounds.width.toString())
      rect.setAttribute('height', bounds.height.toString())
      clip.appendChild(rect)
      defs.appendChild(clip)
      svg!.appendChild(defs)

      // Editable shape background
      const pathBg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathBg.setAttribute('d', Geometry.path(s.graph))
      pathBg.setAttribute('fill', '#dce8ef')
      pathBg.setAttribute('stroke', '#4a7a9a')
      pathBg.setAttribute('stroke-width', (0.8 * scale).toString())
      pathBg.setAttribute('pointer-events', 'none')
      svg!.appendChild(pathBg)

      // Target overlay (magenta dashed guide)
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      overlay.setAttribute('d', task.target_guide || task.after)
      overlay.setAttribute('fill', 'none')
      overlay.setAttribute('stroke', '#b34763')
      overlay.setAttribute('stroke-width', (1.35 * scale).toString())
      overlay.setAttribute('stroke-dasharray', `${4 * scale} ${3 * scale}`)
      overlay.setAttribute('clip-path', `url(#${clipId})`)
      overlay.setAttribute('pointer-events', 'none')
      svg!.appendChild(overlay)

      // Segment hit targets
      s.graph.edges.forEach((e: any, j: number) => {
        const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        const a = s.graph.nodes[e.a], b = s.graph.nodes[e.b]
        const d = `M ${a.x} ${a.y}` + (e.c1 ? ` C ${e.c1.x} ${e.c1.y} ${e.c2.x} ${e.c2.y} ${b.x} ${b.y}` : ` L ${b.x} ${b.y}`)
        seg.setAttribute('d', d)
        seg.setAttribute('fill', 'none')
        seg.setAttribute('stroke', 'transparent')
        seg.setAttribute('stroke-width', (8 * scale).toString())
        seg.setAttribute('data-segment', j.toString())
        svg!.appendChild(seg)
      })

      // Control handles
      s.graph.edges.forEach((e: any, j: number) => {
        if (!e.c1) return
        for (const [k, ni] of [['c1', e.a], ['c2', e.b]] as const) {
          if (!s.selected.has(ni)) continue
          const p = e[k], a = s.graph.nodes[ni]
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('x1', a.x); line.setAttribute('y1', a.y)
          line.setAttribute('x2', p.x); line.setAttribute('y2', p.y)
          line.setAttribute('stroke', '#9a7040')
          line.setAttribute('stroke-width', (0.6 * scale).toString())
          svg!.appendChild(line)

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y)
          circle.setAttribute('r', (2.7 * scale).toString())
          circle.setAttribute('fill', '#e4a355')
          circle.setAttribute('stroke', 'white')
          circle.setAttribute('stroke-width', (0.7 * scale).toString())
          circle.setAttribute('class', 'handle')
          circle.setAttribute('data-edge', j.toString())
          circle.setAttribute('data-control', k)
          circle.style.cursor = 'crosshair'
          svg!.appendChild(circle)
        }
      })

      // Anchor nodes
      s.graph.nodes.forEach((p: any, j: number) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y)
        const isSel = s.selected.has(j)
        circle.setAttribute('r', ((isSel ? 3.8 : 3.0) * scale).toString())
        circle.setAttribute('fill', isSel ? '#165c88' : '#3989b6')
        circle.setAttribute('stroke', 'white')
        circle.setAttribute('stroke-width', (0.8 * scale).toString())
        circle.setAttribute('class', 'node')
        circle.setAttribute('data-node', j.toString())
        circle.style.cursor = 'grab'
        svg!.appendChild(circle)
      })
    }

    draw()

    function getPoint(e: PointerEvent) {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg!.getScreenCTM()!.inverse())
      return { x: p.x, y: p.y }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return
      svg!.focus({ preventScroll: true })

      // Auto-activate this editor if not active
      if (!isActive) {
        if (!submitted) onActivate?.()
        return
      }

      if (space || e.button === 1) {
        e.preventDefault()
        s.drag = { pan: true, startX: e.clientX, startY: e.clientY, view: { ...s.view }, pointerId: e.pointerId }
        svg!.setPointerCapture(e.pointerId)
        return
      }

      const target = e.target as SVGElement
      const nodeAttr = target.dataset.node
      const edgeAttr = target.dataset.edge
      const segAttr = target.dataset.segment

      if (s.adding) {
        e.preventDefault()
        const pt = getPoint(e)
        let edgeIdx = segAttr !== undefined ? +segAttr : 0
        let bestDist = Infinity
        for (let j = 0; j < s.graph.edges.length; j++) {
          const tNear = Geometry.nearest(s.graph, j, pt)
          const c = Geometry.controls(s.graph, s.graph.edges[j])
          const proj = Geometry.at(c, tNear)
          const d = Math.hypot(proj.x - pt.x, proj.y - pt.y)
          if (d < bestDist) {
            bestDist = d
            edgeIdx = j
          }
        }
        const tNear = Geometry.nearest(s.graph, edgeIdx, pt)
        remember('insert_anchor')
        const newAnchorIdx = Geometry.split(s.graph, edgeIdx, tNear)
        const oldPt = s.graph.nodes[newAnchorIdx]
        const dx = pt.x - oldPt.x, dy = pt.y - oldPt.y
        s.graph.nodes[newAnchorIdx].x = pt.x
        s.graph.nodes[newAnchorIdx].y = pt.y
        for (const ed of s.graph.edges) {
          if (ed.c1 && ed.a === newAnchorIdx) { ed.c1.x += dx; ed.c1.y += dy }
          if (ed.c2 && ed.b === newAnchorIdx) { ed.c2.x += dx; ed.c2.y += dy }
        }
        s.selected = new Set([newAnchorIdx])
        s.adding = false
        setState((prev: any) => ({ ...prev, graph: s.graph, selected: s.selected, adding: false, operations: s.operations }))
        draw()
        return
      }

      if (segAttr !== undefined) return

      if (nodeAttr === undefined && edgeAttr === undefined) {
        if (!e.shiftKey) {
          s.selected.clear()
          setState((prev: any) => ({ ...prev, selected: new Set() }))
          draw()
        }
        return
      }

      if (nodeAttr !== undefined) {
        const j = +nodeAttr
        if (e.shiftKey) {
          if (s.selected.has(j)) s.selected.delete(j)
          else s.selected.add(j)
        } else {
          s.selected = new Set([j])
        }
        setState((prev: any) => ({ ...prev, selected: new Set(s.selected) }))
      }

      e.preventDefault()
      s.drag = {
        node: nodeAttr === undefined ? null : +nodeAttr,
        edge: edgeAttr === undefined ? null : +edgeAttr,
        control: target.dataset.control,
        base: clone(s.graph),
        selection: [...s.selected],
        start: getPoint(e),
        pointerId: e.pointerId,
        remembered: false
      }
      svg!.setPointerCapture(e.pointerId)
      draw()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!s.drag || s.drag.pointerId !== e.pointerId) return

      if (s.drag.pan) {
        const scale = s.drag.view.w / svg!.getBoundingClientRect().width
        s.view = {
          ...s.drag.view,
          x: s.drag.view.x - (e.clientX - s.drag.startX) * scale,
          y: s.drag.view.y - (e.clientY - s.drag.startY) * scale
        }
        draw()
        return
      }

      const p = getPoint(e)
      const dx = p.x - s.drag.start.x, dy = p.y - s.drag.start.y

      if (!s.drag.remembered) {
        if (Math.hypot(dx, dy) < 0.15) return
        remember(s.drag.node === null ? 'move_control' : 'move_anchor')
        s.drag.remembered = true
      }

      s.graph = clone(s.drag.base)
      if (s.drag.node !== null) {
        const set = new Set(s.drag.selection)
        for (const n of set as any) {
          s.graph.nodes[n].x += dx
          s.graph.nodes[n].y += dy
        }
        for (const ed of s.graph.edges) {
          if (ed.c1 && set.has(ed.a)) { ed.c1.x += dx; ed.c1.y += dy }
          if (ed.c2 && set.has(ed.b)) { ed.c2.x += dx; ed.c2.y += dy }
        }
      } else {
        const old = s.drag.base.edges[s.drag.edge][s.drag.control]
        Geometry.moveControl(s.graph, s.drag.edge, s.drag.control, { x: old.x + dx, y: old.y + dy })
      }
      draw()
    }

    const onPointerUp = () => {
      if (s.drag && s.drag.remembered) {
        setState((prev: any) => ({ ...prev, graph: s.graph, operations: s.operations }))
      }
      s.drag = null
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (s.drag) return
      const p = getPoint(e as any)

      if (Math.abs(e.deltaX) > 0.1 && Math.abs(e.deltaY) < 10) {
        const scale = s.view.w / svg!.getBoundingClientRect().width
        s.view = {
          ...s.view,
          x: s.view.x + e.deltaX * scale,
          y: s.view.y + e.deltaY * scale
        }
        draw()
        return
      }

      const factor = e.deltaY > 0 ? 1.08 : 1 / 1.08
      const w = Math.max(35, Math.min(900, s.view.w * factor))
      const ratio = w / s.view.w
      s.view = {
        x: p.x - (p.x - s.view.x) * ratio,
        y: p.y - (p.y - s.view.y) * ratio,
        w,
        h: w
      }
      draw()
    }

    const onDoubleClick = (e: MouseEvent) => {
      if (!isActive || submitted) return
      const target = e.target as SVGElement
      const j = target.dataset.segment
      if (j !== undefined) {
        e.preventDefault()
        const pt = getPoint(e as any)
        const tNear = Geometry.nearest(s.graph, +j, pt)
        remember('insert_anchor')
        s.selected = new Set([Geometry.split(s.graph, +j, tNear)])
        s.adding = false
        setState((prev: any) => ({ ...prev, graph: s.graph, selected: s.selected, operations: s.operations }))
        draw()
      }
    }

    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', onPointerUp)
    svg.addEventListener('pointercancel', onPointerUp)
    svg.addEventListener('lostpointercapture', onPointerUp)
    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('dblclick', onDoubleClick)

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
      svg.removeEventListener('pointercancel', onPointerUp)
      svg.removeEventListener('lostpointercapture', onPointerUp)
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('dblclick', onDoubleClick)
    }
  }, [task, method, isActive, submitted, state])

  const handleUndo = () => {
    if (!isActive || submitted) return
    setState((prev: any) => {
      if (!prev.history.length) return prev
      const s = { ...prev, future: [...prev.future], history: [...prev.history], operations: [...prev.operations] }
      s.future.push({ graph: clone(prev.graph), selected: [...prev.selected] })
      const v = s.history.pop()
      s.graph = v.graph
      s.selected = new Set(v.selected)
      const timeLimit = isPractice ? 120 : 90
      s.operations.push({ type: 'undo', elapsed_seconds: +(timeLimit - remainingTime).toFixed(3) })
      return s
    })
  }

  const handleRedo = () => {
    if (!isActive || submitted) return
    setState((prev: any) => {
      if (!prev.future.length) return prev
      const s = { ...prev, future: [...prev.future], history: [...prev.history], operations: [...prev.operations] }
      s.history.push({ graph: clone(prev.graph), selected: [...prev.selected] })
      const v = s.future.pop()
      s.graph = v.graph
      s.selected = new Set(v.selected)
      const timeLimit = isPractice ? 120 : 90
      s.operations.push({ type: 'redo', elapsed_seconds: +(timeLimit - remainingTime).toFixed(3) })
      return s
    })
  }

  const handleRemove = () => {
    if (!isActive || submitted) return
    setState((prev: any) => {
      if (!prev.selected.size || prev.graph.nodes.length <= 2) return prev
      const s = { ...prev, future: [], history: [...prev.history], operations: [...prev.operations] }
      s.history.push({ graph: clone(prev.graph), selected: [...prev.selected] })
      const timeLimit = isPractice ? 120 : 90
      s.operations.push({ type: 'delete_anchor', elapsed_seconds: +(timeLimit - remainingTime).toFixed(3) })
      let next = 0
      s.graph = clone(prev.graph)
      for (const n of [...prev.selected].sort((a: number, b: number) => b - a)) {
        next = Geometry.remove(s.graph, n)
      }
      s.selected = new Set([next])
      return s
    })
  }

  const toggleAdding = () => {
    if (!isActive || submitted) return
    setState((prev: any) => ({ ...prev, adding: !prev.adding }))
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <Card className={`flex flex-col h-full min-w-0 transition-all duration-200 ${
      isActive && !submitted ? 'ring-2 ring-primary shadow-md border-primary/40' : ''
    }`}>
      <CardHeader className="py-2.5 px-3 flex flex-row items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{method.label}</CardTitle>
          {isActive && !submitted && (
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" title="Aktiv / Active" />
          )}
        </div>
        <Badge
          variant={submitted ? 'secondary' : !isActive ? 'outline' : remainingTime <= 10 ? 'destructive' : 'default'}
          className="font-mono text-xs"
        >
          {submitted
            ? t.completed
            : isActive
              ? formatTime(remainingTime)
              : hasStarted
                ? t.paused
                : t.start}
        </Badge>
      </CardHeader>
      <Separator />
      <CardContent className="p-0 flex-1 bg-muted/10 flex items-center justify-center min-h-0 overflow-hidden">
        <div className="relative aspect-square h-full max-h-[500px] w-full max-w-[500px] overflow-hidden m-2 border rounded-md shadow-sm bg-background">
          <svg
            ref={svgRef}
            className="w-full h-full outline-none cursor-crosshair"
            tabIndex={0}
            role="application"
            aria-label={lang === 'de' ? `Bearbeitungsfläche für ${method.label}` : `Editing canvas for ${method.label}`}
          />
        </div>
      </CardContent>

      <Separator />
      
      {/* Editor toolbar */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 bg-muted/10 border-b shrink-0">
        <Button size="sm" variant={state.adding ? "secondary" : "outline"} onClick={toggleAdding} disabled={!isActive || submitted} className="h-7 text-xs px-2">
          {t.addAnchor}
        </Button>
        <Button size="sm" variant="outline" onClick={handleRemove} disabled={!state.selected.size || state.graph.nodes.length <= 2 || !isActive || submitted} className="h-7 text-xs px-2">
          {t.deleteAnchor}
        </Button>
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={!state.history.length || !isActive || submitted} className="h-7 text-xs px-2">
          <RotateCcw className="mr-1 h-3 w-3" />
          {t.undo}
        </Button>
        <Button size="sm" variant="outline" onClick={handleRedo} disabled={!state.future.length || !isActive || submitted} className="h-7 text-xs px-2">
          <RotateCcw className="mr-1 h-3 w-3 scale-x-[-1]" />
          {t.redo}
        </Button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1.5 p-2 bg-muted/30 shrink-0">
        {!isActive && !submitted && (
          <Button size="sm" onClick={() => onActivate?.()} className="w-full h-8 text-xs">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {!hasStarted ? t.start : t.resume}
          </Button>
        )}
        
        {isActive && !submitted && (
          <>
            <Button size="sm" variant="outline" onClick={() => onPause?.()} className="h-8 text-xs px-2">
              <Pause className="mr-1 h-3 w-3" />
              {t.pause}
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="destructive" onClick={() => handleFinish('gave_up')} className="h-8 text-xs px-2">
              <X className="mr-1 h-3 w-3" />
              {t.giveUp}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleFinish('participant_finished')} className="h-8 text-xs px-2">
              <Check className="mr-1 h-3 w-3" />
              {t.done}
            </Button>
          </>
        )}

        {submitted && (
          isPractice ? (
            <div className="w-full flex items-center justify-center py-1">
              <Badge variant="secondary" className="text-xs">
                <Check className="mr-1 h-3 w-3" />
                {t.completed}
              </Badge>
            </div>
          ) : feedback ? (
            <div className="w-full flex flex-col items-center gap-0.5 py-1 px-2 bg-muted/40 rounded border border-border/50 text-center animate-in fade-in">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={feedback.reason === 'gave_up' ? 'destructive' : feedback.accuracy >= 80 ? 'default' : 'secondary'} 
                  className="text-[11px] font-semibold h-5 px-1.5"
                >
                  {feedback.reason === 'gave_up' 
                    ? (lang === 'de' ? 'Aufgegeben' : 'Given up') 
                    : `🎯 ${feedback.accuracy}% ${lang === 'de' ? 'Genauigkeit' : 'Match'}`}
                </Badge>
                <span className="text-[11px] font-mono text-muted-foreground">
                  ⏱️ {feedback.elapsed.toFixed(1)}s
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                {feedback.reason === 'gave_up'
                  ? (lang === 'de' ? 'Variante übersprungen' : 'Option skipped')
                  : feedback.accuracy >= 90
                    ? (lang === 'de' ? 'Hervorragend angepasst!' : 'Excellent match!')
                    : feedback.accuracy >= 75
                      ? (lang === 'de' ? 'Gut angepasst!' : 'Good match!')
                      : (lang === 'de' ? 'Abgeschlossen' : 'Completed')}
                {' '}({state.graph.nodes.length} {lang === 'de' ? 'Anker' : 'anchors'})
              </span>
            </div>
          ) : (
            <div className="w-full flex items-center justify-center py-1">
              <Badge variant="secondary" className="text-xs">
                <Check className="mr-1 h-3 w-3" />
                {t.completed}
              </Badge>
            </div>
          )
        )}
      </div>
    </Card>
  )
}
