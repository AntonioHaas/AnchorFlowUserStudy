import Geometry from './geometry'

function sampleGraphPoints(g: any, samplesPerEdge = 6) {
  const points = []
  for (const e of g.edges) {
    const c = Geometry.controls(g, e)
    for (let i = 0; i <= samplesPerEdge; i++) {
      points.push(Geometry.at(c, i / samplesPerEdge))
    }
  }
  return points
}

export function computeMatchScore(editedGraph: any, targetD: string) {
  try {
    const targetG = Geometry.parse(targetD)
    const targetSamples = sampleGraphPoints(targetG, 6)
    let totalDist = 0
    for (const p of targetSamples) {
      let minDist = Infinity
      for (let j = 0; j < editedGraph.edges.length; j++) {
        const t = Geometry.nearest(editedGraph, j, p)
        const c = Geometry.controls(editedGraph, editedGraph.edges[j])
        const proj = Geometry.at(c, t)
        const d = Math.hypot(proj.x - p.x, proj.y - p.y)
        if (d < minDist) minDist = d
      }
      totalDist += minDist
    }
    const avgDist = totalDist / (targetSamples.length || 1)
    // Scale: 0 distance = 100%, 5px avg distance ~= 70%, 10px ~= 49%
    const accuracy = Math.max(0, Math.min(100, Math.round(100 * Math.exp(-avgDist / 14))))
    return { avgDist: +avgDist.toFixed(2), accuracy }
  } catch (err) {
    return { avgDist: 0, accuracy: 100 }
  }
}
