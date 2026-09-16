"use client"
import React, { useEffect, useRef, useState } from 'react'
import Geometry from '@/lib/geometry'

function clone(x: any) {
  return JSON.parse(JSON.stringify(x))
}

export default function CanvasEditor({ 
  task, 
  method, 
  isPractice, 
  onComplete,
  onAbandon,
  onInteraction
}: any) {
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
  const [remainingTime, setRemainingTime] = useState(90)
  
  // This is a simplified port of the vanilla JS logic.
  // Due to time constraints and the complexity of the custom SVG drag logic,
  // we will use vanilla event listeners on the SVG ref.
  
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    let s = { ...state, drag: null as any }
    let space = false
    
    function draw() {
      // Manual DOM manipulation for the SVG to ensure maximum performance during drag
      // just like the original app.js
      svg!.innerHTML = ''
      const scale = s.view.w / 280
      svg!.setAttribute('viewBox', `${s.view.x} ${s.view.y} ${s.view.w} ${s.view.h}`)
      
      const clipId = `target-clip-${task.id}-${method.key}`
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
      const clip = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
      clip.setAttribute('id', clipId)
      
      const bounds = task.target_guide_bounds || {x:0, y:0, width:256, height:256}
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', bounds.x.toString())
      rect.setAttribute('y', bounds.y.toString())
      rect.setAttribute('width', bounds.width.toString())
      rect.setAttribute('height', bounds.height.toString())
      clip.appendChild(rect)
      defs.appendChild(clip)
      svg!.appendChild(defs)

      const pathBg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathBg.setAttribute('class', 'editable-path')
      pathBg.setAttribute('d', Geometry.path(s.graph))
      pathBg.setAttribute('fill', '#d9e7ee')
      pathBg.setAttribute('stroke', '#397ca3')
      pathBg.setAttribute('stroke-width', (0.8 * scale).toString())
      pathBg.setAttribute('pointer-events', 'none')
      svg!.appendChild(pathBg)

      const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      overlay.setAttribute('class', 'target-overlay')
      overlay.setAttribute('d', task.target_guide || task.after)
      overlay.setAttribute('fill', 'none')
      overlay.setAttribute('stroke', '#b34763')
      overlay.setAttribute('stroke-width', (1.35 * scale).toString())
      overlay.setAttribute('stroke-dasharray', `${4 * scale} ${3 * scale}`)
      overlay.setAttribute('clip-path', `url(#${clipId})`)
      overlay.setAttribute('pointer-events', 'none')
      svg!.appendChild(overlay)

      // Segments
      s.graph.edges.forEach((e: any, j: number) => {
        const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        const a = s.graph.nodes[e.a], b = s.graph.nodes[e.b]
        const d = `M ${a.x} ${a.y}` + (e.c1 ? ` C ${e.c1.x} ${e.c1.y} ${e.c2.x} ${e.c2.y} ${b.x} ${b.y}` : ` L ${b.x} ${b.y}`)
        seg.setAttribute('d', d)
        seg.setAttribute('fill', 'none')
        seg.setAttribute('stroke', 'transparent')
        seg.setAttribute('stroke-width', (8 * scale).toString())
        seg.setAttribute('class', 'segment')
        seg.setAttribute('data-segment', j.toString())
        svg!.appendChild(seg)
      })

      // Controls
      s.graph.edges.forEach((e: any, j: number) => {
        if (!e.c1) return
        for (const [k, ni] of [['c1', e.a], ['c2', e.b]] as const) {
          if (!s.selected.has(ni)) continue
          const p = e[k], a = s.graph.nodes[ni]
          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
          line.setAttribute('x1', a.x); line.setAttribute('y1', a.y)
          line.setAttribute('x2', p.x); line.setAttribute('y2', p.y)
          line.setAttribute('stroke', '#d49145')
          line.setAttribute('stroke-width', (0.7 * scale).toString())
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
          svg!.appendChild(circle)
        }
      })

      // Nodes
      s.graph.nodes.forEach((p: any, j: number) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.setAttribute('cx', p.x); circle.setAttribute('cy', p.y)
        circle.setAttribute('r', (s.selected.has(j) ? 3.2 : 2.4 * scale).toString())
        circle.setAttribute('fill', s.selected.has(j) ? '#165c88' : '#3989b6')
        circle.setAttribute('stroke', 'white')
        circle.setAttribute('stroke-width', (0.8 * scale).toString())
        circle.setAttribute('class', 'node')
        circle.setAttribute('data-node', j.toString())
        svg!.appendChild(circle)
      })
    }

    function point(e: any) {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg!.getScreenCTM()!.inverse())
      return { x: p.x, y: p.y }
    }

    const onPointerDown = (e: any) => {
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
        // insert(s, +segment, point(e))
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
    onComplete(method.key, {
      method: method.label,
      method_key: method.key,
      completion_state: 'completed',
      stop_reason: reason,
      elapsed_seconds: 90 - remainingTime,
      final_anchor_count: state.graph.nodes.length,
      original_anchor_count: task.predictions[method.key].original_anchor_count
    })
  }

  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm flex flex-col gap-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-lg">{method.label}</h3>
        <span className={remainingTime <= 10 ? "text-red-500 font-bold" : "text-gray-500"}>
          {submitted ? 'Fertig' : (running ? `${remainingTime}s` : 'Pausiert / Paused')}
        </span>
      </div>
      <div className="relative aspect-square w-full bg-slate-50 overflow-hidden border rounded-md">
        <svg ref={svgRef} className="w-full h-full outline-none" tabIndex={0} />
      </div>
      <div className="flex gap-2 flex-wrap">
        {!running && !submitted && (
          <button onClick={() => setRunning(true)} className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
            {remainingTime === 90 ? 'Starten / Start' : 'Fortsetzen / Resume'}
          </button>
        )}
        {running && !submitted && (
          <>
            <button onClick={() => setRunning(false)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">Pause</button>
            <button onClick={() => handleFinish('participant_finished')} className="px-3 py-1 bg-gray-100 text-gray-700 border rounded text-sm hover:bg-gray-200">Fertig / Done</button>
            <button onClick={() => handleFinish('gave_up')} className="px-3 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-sm hover:bg-red-100">Aufgeben / Give up</button>
          </>
        )}
      </div>
    </div>
  )
}
