import Geometry from './web/src/lib/geometry.js'
const g = Geometry.parse('M 64 128 C 64 84 92 64 128 64 C 164 64 192 84 192 128 C 192 172 164 192 128 192 C 92 192 64 172 64 128 Z')

function globalNearest(g, p) {
  let bestJ = -1;
  let bestT = 0;
  let minDist = Infinity;
  for (let j = 0; j < g.edges.length; j++) {
    const t = Geometry.nearest(g, j, p);
    const c = Geometry.controls(g, g.edges[j]);
    const pt = Geometry.at(c, t);
    const d = Math.hypot(pt.x - p.x, pt.y - p.y);
    if (d < minDist) {
      minDist = d;
      bestJ = j;
      bestT = t;
    }
  }
  return { j: bestJ, t: bestT };
}

const {j, t} = globalNearest(g, {x: 0, y: 0})
console.log(j, t)
