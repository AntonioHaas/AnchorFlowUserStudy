// tasks.json is the source of truth for the active Next.js study.
// This replaces the legacy 6x2 generator, which would overwrite current stimuli.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import Geometry from '../src/lib/geometry.js'

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const data = JSON.parse(fs.readFileSync(path.join(webRoot, 'src/lib/tasks.json'), 'utf8'))
const methods = ['ours', 'adavec', 'live']
assert.deepEqual(data.formal.map(t => t.id), ['B1092', 'B0973', 'B1285', 'B0003'])
assert.equal(data.practice.length, 1)
let checked = 0
for (const task of data.formal) {
  Geometry.parse(task.before)
  Geometry.parse(task.after)
  assert.deepEqual(Object.keys(task.predictions), methods, `${task.id}: method set`)
  for (const method of methods) {
    const src = task.predictions[method]
    const graph = Geometry.parse(src.d)
    assert.equal(graph.nodes.length, src.original_anchor_count, `${task.id}/${method}: native count`)
    assert.equal(crypto.createHash('sha256').update(src.original_svg).digest('hex'), src.sha256)
    assert.equal((src.original_svg.match(/<path\b/g) || []).length, 1)
    const nativeD = src.original_svg.match(/<path\b[^>]*\sd="([^"]+)"/)[1]
    assert.deepEqual(Geometry.parse(nativeD), graph, `${task.id}/${method}: unchanged geometry`)
    checked++
  }
}
const fourth = data.formal[3]
const before = Geometry.parse(fourth.before), after = Geometry.parse(fourth.after)
assert.deepEqual(before.nodes, after.nodes, 'Fourth target keeps reference anchors fixed')
assert.deepEqual(fourth.target_guide_edge_indices, [1])
for (const [i, edge] of before.edges.entries()) {
  if (i !== 1) assert.deepEqual(edge, after.edges[i], 'Only the local inner curve changes')
}
const assetRoot = path.join(webRoot, 'study_assets/B0003')
const receipt = JSON.parse(fs.readFileSync(path.join(assetRoot, 'provenance.json'), 'utf8'))
for (const [filename, expected] of Object.entries(receipt.files)) {
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(assetRoot, filename))).digest('hex'), expected)
}
assert.equal(fourth.input_sha256, receipt.input_sha256)
for (const method of methods) {
  assert.equal(fs.readFileSync(path.join(assetRoot, `${method}.svg`), 'utf8'), fourth.predictions[method].original_svg)
}
console.log(`Validated ${data.formal.length} tasks x ${methods.length} methods = ${checked} native paths; source hashes and local target passed. No data rewritten.`)
