"use client"
import React, { useEffect, useRef, useState } from 'react'
import Geometry from '@/lib/geometry'
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
  isPractice,
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
    },
    en: {
      start: 'Start',
      resume: 'Resume',
      pause: 'Pause',
      done: 'Done',
      giveUp: 'Give Up',
      completed: 'Completed',
      paused: 'Paused',
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

  const [running, setRunning] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [remainingTime, setRemainingTime] = useState(isPractice ? 120 : 90)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let s = { ...state, drag: null as any }
    let space = false

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

      // Editable shape
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
          circle.setAttribute('r', (2.5 * scale).toString())
          circle.setAttribute('fill', '#b8904a')
          circle.setAttribute('stroke', 'white')
          circle.setAttribute('stroke-width', (0.6 * scale).toString())
          circle.setAttribute('data-edge', j.toString())
          circle.setAttribute('data-control', k)
          svg!.appendChild(circle)
        }
      })

      // Anchor nodes
      s.graph.nodes.forEach((p: any, j: number) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y)
        circle.setAttribute('r', (s.selected.has(j) ? 3.0 : 2.2 * scale).toString())
        circle.setAttribute('fill', s.selected.has(j) ? '#1a5c82' : '#4a8ab0')
        circle.setAttribute('stroke', 'white')
        circle.setAttribute('stroke-width', (0.7 * scale).toString())
        circle.setAttribute('data-node', j.toString())
        svg!.appendChild(circle)
      })
    }

    function point(e: any) {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg!.getScreenCTM()!.inverse())
      return { x: p.x, y: p.y }
    }

    const onPointerDown = (e: any) => {
      if (!running || submitted) return
      if (e.button !== 0 && e.button !== 1) return
      svg!.focus({ preventScroll: true })
      if (space || e.button === 1) {
        e.preventDefault()
        s.drag = { pan: true, startX: e.clientX, startY: e.clientY, view: { ...s.view }, pointerId: e.pointerId }
        svg!.setPointerCapture(e.pointerId)
        return
      }
      const n = e.target.dataset.node, edge = e.target.dataset.edge, segment = e.target.dataset.segment
      if (s.adding && segment !== undefined) {
        e.preventDefault()
        return
      }
      if (segment !== undefined) return
      if (n === undefined && edge === undefined) {
        if (!e.shiftKey) { s.selected.clear(); draw() }
        return
      }
      if (n !== undefined) {
        const j = +n
        if (e.shiftKey) {
          if (s.selected.has(j)) s.selected.delete(j); else s.selected.add(j)
          draw(); return
        }
        if (!s.selected.has(j)) s.selected = new Set([j])
      }
      e.preventDefault()
      s.drag = { node: n === undefined ? null : +n, edge: edge === undefined ? null : +edge, control: e.target.dataset.control, base: clone(s.graph), selection: [...s.selected], start: point(e), pointerId: e.pointerId, remembered: false }
      svg!.setPointerCapture(e.pointerId)
      draw()
    }

    const onPointerMove = (e: any) => {
      if (!s.drag || s.drag.pointerId !== e.pointerId) return
      if (s.drag.pan) {
        const scale = s.drag.view.w / svg!.getBoundingClientRect().width
        s.view = { ...s.drag.view, x: s.drag.view.x - (e.clientX - s.drag.startX) * scale, y: s.drag.view.y - (e.clientY - s.drag.startY) * scale }
        draw()
        return
      }
      const p = point(e), dx = p.x - s.drag.start.x, dy = p.y - s.drag.start.y
      if (!s.drag.remembered) {
        if (Math.hypot(dx, dy) < 0.15) return
        s.drag.remembered = true
      }
      s.graph = clone(s.drag.base)
      if (s.drag.node !== null) {
        const set = new Set(s.drag.selection)
        for (const n of set as any) {
          s.graph.nodes[n].x += dx; s.graph.nodes[n].y += dy
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

    const onPointerUp = () => { s.drag = null; setState({ ...s }) }
    const onWheel = (e: any) => {
      e.preventDefault()
      if (!running || submitted) return
      if (s.drag) return
      const p = point(e), factor = e.deltaY > 0 ? 1.12 : 1 / 1.12
      const w = Math.max(35, Math.min(900, s.view.w * factor)), ratio = w / s.view.w
      s.view = { x: p.x - (p.x - s.view.x) * ratio, y: p.y - (p.y - s.view.y) * ratio, w, h: w }
      draw()
    }

    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', onPointerUp)
    svg.addEventListener('pointercancel', onPointerUp)
    svg.addEventListener('lostpointercapture', onPointerUp)
    svg.addEventListener('wheel', onWheel, { passive: false })

    draw()

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
      svg.removeEventListener('pointercancel', onPointerUp)
      svg.removeEventListener('lostpointercapture', onPointerUp)
      svg.removeEventListener('wheel', onWheel)
    }
  }, [task, method, running, submitted])

  useEffect(() => {
    let timer: any
    if (running && !submitted && remainingTime > 0) {
      timer = setInterval(() => setRemainingTime(r => r - 1), 1000)
    } else if (remainingTime === 0 && running && !submitted) {
      handleFinish('timeout')
    }
    return () => clearInterval(timer)
  }, [running, submitted, remainingTime])

  const handleFinish = (reason: string) => {
    setRunning(false)
    setSubmitted(true)
    const timeLimit = isPractice ? 120 : 90
    onComplete(method.key, {
      method: method.label,
      method_key: method.key,
      completion_state: reason === 'time_up' ? 'timeout' : reason === 'gave_up' ? 'abandoned' : 'completed',
      elapsed_seconds: timeLimit - remainingTime,
      stop_reason: reason,
      original_anchor_count: isPractice ? state.initial.nodes.length : (task.predictions[method.key]?.original_anchor_count || state.initial.nodes.length),
      final_anchor_count: state.graph.nodes.length
    })
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">{method.label}</CardTitle>
        <Badge
          variant={submitted ? 'secondary' : remainingTime <= 10 ? 'destructive' : 'outline'}
          className="font-mono text-xs"
        >
          {submitted
            ? t.completed
            : running
              ? formatTime(remainingTime)
              : t.paused}
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
      
      {/* Action buttons (always below canvas now) */}
      <div className="flex items-center gap-2 p-2.5 bg-muted/30">
        {!running && !submitted && (
          <Button size="sm" onClick={() => setRunning(true)} className="w-full">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {remainingTime === (isPractice ? 120 : 90) ? t.start : t.resume}
          </Button>
        )}
        
        {running && !submitted && (
          <>
            <Button size="sm" variant="outline" onClick={() => setRunning(false)}>
              <Pause className="mr-1.5 h-3.5 w-3.5" />
              {t.pause}
            </Button>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => handleFinish('participant_finished')}>
              <Check className="mr-1.5 h-3.5 w-3.5" />
              {t.done}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleFinish('gave_up')} className="text-muted-foreground">
              <X className="mr-1.5 h-3.5 w-3.5" />
              {t.giveUp}
            </Button>
          </>
        )}

        {submitted && (
          <div className="w-full flex items-center justify-center">
            <Badge variant="secondary" className="text-xs">
              <Check className="mr-1 h-3 w-3" />
              {t.completed}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}
