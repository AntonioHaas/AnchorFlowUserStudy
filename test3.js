import Geometry from './web/src/lib/geometry.js'
const g = Geometry.parse('M 64 128 C 64 84 92 64 128 64 C 164 64 192 84 192 128 C 192 172 164 192 128 192 C 92 192 64 172 64 128 Z')

const p = {x: 250, y: 250} // Click far away
let minDist = Infinity
let targetJ = -1
let targetT = 0
for (let j = 0; j < g.edges.length; j++) {
  const t = Geometry.nearest(g, j, p)
  const c = Geometry.controls(g, g.edges[j])
  const pt = Geometry.at(c, t)
  const d = Math.hypot(pt.x - p.x, pt.y - p.y)
  if (d < minDist) {
    minDist = d; targetJ = j; targetT = t
  }
}

const next = Geometry.split(g, targetJ, targetT)
g.nodes[next].x = p.x
g.nodes[next].y = p.y

console.log(Geometry.path(g))
