import Geometry from './web/src/lib/geometry.js'
const g = Geometry.parse('M 64 128 C 64 84 92 64 128 64 C 164 64 192 84 192 128 C 192 172 164 192 128 192 C 92 192 64 172 64 128 Z')
const t = Geometry.nearest(g, 0, {x: 100, y: 100})
console.log('t:', t)
const n = Geometry.split(g, 0, t)
console.log('n:', n)
console.log('nodes length:', g.nodes.length)
