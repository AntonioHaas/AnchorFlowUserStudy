"use client"
import React, { useEffect, useRef, useState } from 'react'
import Geometry from '@/lib/geometry'
import { computeMatchScore } from '@/lib/score'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Play, Pause, Check, X, RotateCcw, Maximize } from 'lucide-react'

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
      resetView: 'Ansicht zentrieren',
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
      resetView: 'Reset View',
    }
  }
  const t = (TRANSLATIONS as any)[lang]
  const svgRef = useRef<SVGSVGElement>(null)

  // Stable editor state in ref so that React renders/props never disrupt pointer drag
  const editorRef = useRef<any>(null)
  if (!editorRef.current || editorRef.current.taskId !== task.id || editorRef.current.methodKey !== method.key) {
    const src = task.predictions[method.key]
    const graph = Geometry.parse(src.d)
    editorRef.current = {
      taskId: task.id,
      methodKey: method.key,
      graph,
      initial: clone(graph),
      selected: new Set([0]),
      history: [] as any[],
      future: [] as any[],
      operations: [] as any[],
      adding: false,
      view: { x: -12, y: -12, w: 280, h: 280 },
      drag: null as any,
    }
  }

  // Version counter to trigger React re-renders of UI toolbar buttons when selection/history changes
  const [, setUiVersion] = useState(0)
  const refreshUI = () => setUiVersion(v => v + 1)

  const [hasStarted, setHasStarted] = useState(false)
  const prevIsActiveRef = useRef(false)
  const [submitted, setSubmitted] = useState(false)
  const [remainingTime, setRemainingTime] = useState(isPractice ? 120 : 90)
  const [feedback, setFeedback] = useState<{ accuracy: number, avgDist: number, elapsed: number, reason: string } | null>(null)

  // Synchronized prop refs for event handlers
  const isActiveRef = useRef(isActive)
  isActiveRef.current = isActive
  const submittedRef = useRef(submitted)
  submittedRef.current = submitted
  const remainingTimeRef = useRef(remainingTime)
  remainingTimeRef.current = remainingTime
  const onActivateRef = useRef(onActivate)
  onActivateRef.current = onActivate
  const onPauseRef = useRef(onPause)
  onPauseRef.current = onPause

  // Keep draw function in a ref so external actions (undo/redo) can invoke it
  const drawRef = useRef<() => void>(() => {})

  // Reset editor state when task or method changes
  useEffect(() => {
    const src = task.predictions[method.key]
    const graph = Geometry.parse(src.d)
    editorRef.current = {
      taskId: task.id,
      methodKey: method.key,
      graph,
      initial: clone(graph),
      selected: new Set([0]),
      history: [],
      future: [],
      operations: [],
      adding: false,
      view: { x: -12, y: -12, w: 280, h: 280 },
      drag: null,
    }
    setSubmitted(false)
    setRemainingTime(isPractice ? 120 : 90)
    setFeedback(null)
    setHasStarted(false)
    prevIsActiveRef.current = false
    refreshUI()
    drawRef.current?.()
  }, [task.id, method.key, isPractice])

  // Track activation transitions: automatically log start, resume, or auto_pause_switch
  useEffect(() => {
    if (prevIsActiveRef.current === isActive) return
    const wasActive = prevIsActiveRef.current
    prevIsActiveRef.current = isActive

    const timeLimit = isPractice ? 120 : 90
    const elapsed = +(timeLimit - remainingTime).toFixed(3)
    const s = editorRef.current

    if (isActive && !wasActive && !submitted) {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!hasStarted) {
        if (rect) {
          s.operations.push({
            type: 'canvas_meta',
            elapsed_seconds: elapsed,
            canvas_width: rect.width,
            canvas_height: rect.height,
          })
        }
        s.operations.push({ type: 'start', elapsed_seconds: elapsed })
        setHasStarted(true)
      } else {
        s.operations.push({ type: 'resume', elapsed_seconds: elapsed })
      }
    } else if (!isActive && wasActive && !submitted) {
      s.operations.push({ type: 'auto_pause_switch', elapsed_seconds: elapsed })
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
    onPauseRef.current?.()
    setSubmitted(true)
    const timeLimit = isPractice ? 120 : 90
    const elapsedSeconds = +(timeLimit - remainingTime).toFixed(3)
    const methodSrc = task.predictions?.[method.key]
    const s = editorRef.current

    // Only compute and provide performance feedback on the practice / training task
    let fb = null
    if (isPractice) {
      const match = computeMatchScore(s.graph, task.after)
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
      original_anchor_count: isPractice ? s.initial.nodes.length : (methodSrc?.original_anchor_count || s.initial.nodes.length),
      final_anchor_count: s.graph.nodes.length,
      initial_path: Geometry.path(s.initial),
      edited_path: Geometry.path(s.graph),
      accuracy: fb?.accuracy,
      operations: [
        ...s.operations,
        {
          type: reason === 'gave_up' ? 'participant_abandon' : 'participant_finish',
          elapsed_seconds: elapsedSeconds,
          ...(fb ? { accuracy: fb.accuracy, avg_distance: fb.avgDist } : {})
        }
      ]
    })
  }

  // SVG interaction effect — attached ONCE per task/method mount
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const s = editorRef.current
    let space = false

    function log(type: string, extra = {}) {
      const timeLimit = isPractice ? 120 : 90
      s.operations.push({ type, elapsed_seconds: +(timeLimit - remainingTimeRef.current).toFixed(3), ...extra })
    }

    function snapshot() {
      return { graph: clone(s.graph), selected: [...s.selected] }
    }

    function remember(type: string) {
      s.history.push(snapshot())
      s.future = []
      log(type)
    }

    function draw() {
      if (!svg) return
      svg.innerHTML = ''
      const scale = s.view.w / 280
      svg.setAttribute('viewBox', `${s.view.x} ${s.view.y} ${s.view.w} ${s.view.h}`)

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
      svg.appendChild(defs)

      // Editable shape background
      const pathBg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathBg.setAttribute('d', Geometry.path(s.graph))
      pathBg.setAttribute('fill', '#dce8ef')
      pathBg.setAttribute('stroke', '#4a7a9a')
      pathBg.setAttribute('stroke-width', (0.8 * scale).toString())
      pathBg.setAttribute('pointer-events', 'none')
      svg.appendChild(pathBg)

      // Target overlay (magenta dashed guide)
      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      overlay.setAttribute('d', task.target_guide || task.after)
      overlay.setAttribute('fill', 'none')
      overlay.setAttribute('stroke', '#b34763')
      overlay.setAttribute('stroke-width', (1.35 * scale).toString())
      overlay.setAttribute('stroke-dasharray', `${4 * scale} ${3 * scale}`)
      overlay.setAttribute('clip-path', `url(#${clipId})`)
      overlay.setAttribute('pointer-events', 'none')
      svg.appendChild(overlay)

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
        svg.appendChild(seg)
      })

      // Control handles
      s.graph.edges.forEach((e: any, j: number) => {
        if (!e.c1) return
        for (const [k, ni] of [['c1', e.a], ['c2', e.b]] as const) {
          if (!s.selected.has(ni)) continue
          const p = e[k], a = s.graph.nodes[ni]
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('x1', a.x)
          line.setAttribute('y1', a.y)
          line.setAttribute('x2', p.x)
          line.setAttribute('y2', p.y)
          line.setAttribute('stroke', '#9a7040')
          line.setAttribute('stroke-width', (0.6 * scale).toString())
          line.setAttribute('pointer-events', 'none')
          svg.appendChild(line)

          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
          circle.setAttribute('cx', p.x)
          circle.setAttribute('cy', p.y)
          circle.setAttribute('r', (3.5 * scale).toString())
          circle.setAttribute('fill', '#e4a355')
          circle.setAttribute('stroke', 'white')
          circle.setAttribute('stroke-width', (0.7 * scale).toString())
          circle.setAttribute('class', 'handle')
          circle.setAttribute('data-edge', j.toString())
          circle.setAttribute('data-control', k)
          circle.style.cursor = 'grab'
          svg.appendChild(circle)
        }
      })

      // Anchor nodes
      s.graph.nodes.forEach((p: any, j: number) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', p.x)
        circle.setAttribute('cy', p.y)
        const isSel = s.selected.has(j)
        circle.setAttribute('r', ((isSel ? 4.2 : 3.4) * scale).toString())
        circle.setAttribute('fill', isSel ? '#165c88' : '#3989b6')
        circle.setAttribute('stroke', 'white')
        circle.setAttribute('stroke-width', (0.8 * scale).toString())
        circle.setAttribute('class', 'node')
        circle.setAttribute('data-node', j.toString())
        circle.style.cursor = 'grab'
        svg.appendChild(circle)
      })
    }

    drawRef.current = draw
    draw()

    function getPoint(e: PointerEvent) {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg!.getScreenCTM()!.inverse())
      return { x: p.x, y: p.y }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.button !== 1) return
      svg!.focus({ preventScroll: true })

      if (submittedRef.current) return

      // Seamless auto-activation: if not currently active, activate it immediately on first click
      if (!isActiveRef.current) {
        onActivateRef.current?.()
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
        refreshUI()
        draw()
        return
      }

      if (segAttr !== undefined) return

      if (nodeAttr === undefined && edgeAttr === undefined) {
        if (!e.shiftKey) {
          s.selected.clear()
          refreshUI()
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
        refreshUI()
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

    const onPointerUp = (e: PointerEvent) => {
      if (s.drag && s.drag.pointerId === e.pointerId) {
        if (s.drag.remembered) {
          refreshUI()
        }
        try {
          if (svg!.hasPointerCapture(e.pointerId)) {
            svg!.releasePointerCapture(e.pointerId)
          }
        } catch {}
        s.drag = null
      }
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
      if (submittedRef.current) return
      if (!isActiveRef.current) onActivateRef.current?.()

      const target = e.target as SVGElement
      const j = target.dataset.segment
      if (j !== undefined) {
        e.preventDefault()
        const pt = getPoint(e as any)
        const tNear = Geometry.nearest(s.graph, +j, pt)
        remember('insert_anchor')
        s.selected = new Set([Geometry.split(s.graph, +j, tNear)])
        s.adding = false
        refreshUI()
        draw()
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) space = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') space = false
    }

    svg.addEventListener('pointerdown', onPointerDown)
    svg.addEventListener('pointermove', onPointerMove)
    svg.addEventListener('pointerup', onPointerUp)
    svg.addEventListener('pointercancel', onPointerUp)
    svg.addEventListener('lostpointercapture', onPointerUp)
    svg.addEventListener('wheel', onWheel, { passive: false })
    svg.addEventListener('dblclick', onDoubleClick)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      svg.removeEventListener('pointermove', onPointerMove)
      svg.removeEventListener('pointerup', onPointerUp)
      svg.removeEventListener('pointercancel', onPointerUp)
      svg.removeEventListener('lostpointercapture', onPointerUp)
      svg.removeEventListener('wheel', onWheel)
      svg.removeEventListener('dblclick', onDoubleClick)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [task.id, method.key])

  const handleUndo = () => {
    if (!isActiveRef.current || submitted) return
    const s = editorRef.current
    if (!s.history.length) return
    s.future.push({ graph: clone(s.graph), selected: [...s.selected] })
    const v = s.history.pop()
    s.graph = v.graph
    s.selected = new Set(v.selected)
    const timeLimit = isPractice ? 120 : 90
    s.operations.push({ type: 'undo', elapsed_seconds: +(timeLimit - remainingTime).toFixed(3) })
    refreshUI()
    drawRef.current?.()
  }

  const handleRedo = () => {
    if (!isActiveRef.current || submitted) return
    const s = editorRef.current
    if (!s.future.length) return
    s.history.push({ graph: clone(s.graph), selected: [...s.selected] })
    const v = s.future.pop()
    s.graph = v.graph
    s.selected = new Set(v.selected)
    const timeLimit = isPractice ? 120 : 90
    s.operations.push({ type: 'redo', elapsed_seconds: +(timeLimit - remainingTime).toFixed(3) })
    refreshUI()
    drawRef.current?.()
  }

  const handleRemove = () => {
    if (!isActiveRef.current || submitted) return
    const s = editorRef.current
    if (!s.selected.size || s.graph.nodes.length <= 2) return
    s.history.push({ graph: clone(s.graph), selected: [...s.selected] })
    s.future = []
    const timeLimit = isPractice ? 120 : 90
    s.operations.push({ type: 'delete_anchor', elapsed_seconds: +(timeLimit - remainingTime).toFixed(3) })
    let next = 0
    s.graph = clone(s.graph)
    for (const n of [...s.selected].sort((a: number, b: number) => b - a)) {
      next = Geometry.remove(s.graph, n)
    }
    s.selected = new Set([next])
    refreshUI()
    drawRef.current?.()
  }

  const toggleAdding = () => {
    if (submitted) return
    if (!isActiveRef.current) {
      onActivateRef.current?.()
    }
    const s = editorRef.current
    s.adding = !s.adding
    refreshUI()
    drawRef.current?.()
  }

  const handleResetView = () => {
    if (submitted) return
    const s = editorRef.current
    s.view = { x: -12, y: -12, w: 280, h: 280 }
    drawRef.current?.()
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const s = editorRef.current

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
        <Button size="sm" variant={s.adding ? "secondary" : "outline"} onClick={toggleAdding} disabled={!isActive || submitted} className="h-7 text-xs px-2">
          {t.addAnchor}
        </Button>
        <Button size="sm" variant="outline" onClick={handleRemove} disabled={!s.selected.size || s.graph.nodes.length <= 2 || !isActive || submitted} className="h-7 text-xs px-2">
          {t.deleteAnchor}
        </Button>
        <Button size="sm" variant="outline" onClick={handleUndo} disabled={!s.history.length || !isActive || submitted} className="h-7 text-xs px-2">
          <RotateCcw className="mr-1 h-3 w-3" />
          {t.undo}
        </Button>
        <Button size="sm" variant="outline" onClick={handleRedo} disabled={!s.future.length || !isActive || submitted} className="h-7 text-xs px-2">
          <RotateCcw className="mr-1 h-3 w-3 scale-x-[-1]" />
          {t.redo}
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={handleResetView} disabled={!isActive || submitted} className="h-7 text-xs px-2" title={t.resetView}>
          <Maximize className="h-3 w-3" />
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
          feedback ? (
            <div className="w-full flex flex-col items-center gap-0.5 py-1 px-2 bg-muted/40 rounded border border-border/50 text-center animate-in fade-in">
              <div className="flex items-center gap-2">
                <Badge 
                  variant={feedback.reason === 'gave_up' ? 'destructive' : feedback.accuracy >= 80 ? 'default' : 'secondary'} 
                  className="text-[11px] font-semibold h-5 px-1.5"
                >
                  {feedback.reason === 'gave_up' 
                    ? (lang === 'de' ? 'Übung abgebrochen' : 'Practice skipped') 
                    : `🎯 ${feedback.accuracy}% ${lang === 'de' ? 'Genauigkeit' : 'Match'}`}
                </Badge>
                <span className="text-[11px] font-mono text-muted-foreground">
                  ⏱️ {feedback.elapsed.toFixed(1)}s
                </span>
              </div>
              <span className="text-[10.5px] text-muted-foreground leading-tight">
                {feedback.reason === 'gave_up'
                  ? (lang === 'de' ? 'Übung übersprungen' : 'Practice skipped')
                  : feedback.accuracy >= 90
                    ? (lang === 'de' ? 'Hervorragend angepasst!' : 'Excellent match!')
                    : feedback.accuracy >= 75
                      ? (lang === 'de' ? 'Gut angepasst!' : 'Good match!')
                      : (lang === 'de' ? 'Übung abgeschlossen' : 'Practice completed')}
                {' '}({s.graph.nodes.length} {lang === 'de' ? 'Anker' : 'anchors'})
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
