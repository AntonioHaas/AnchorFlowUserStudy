import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..', '..')

const defsPath = path.join(ROOT, 'formal_6x2_reference', 'task_definitions.json')
const defs = JSON.parse(fs.readFileSync(defsPath, 'utf8'))

const outputsDir = path.join(ROOT, 'formal_6x2_reference', 'method_outputs')

function extractPathAndAnchors(svgStr) {
  const match = svgStr.match(/<path[^>]*d="([^"]+)"/i)
  if (!match) throw new Error("No path found")
  const d = match[1]
  
  // Rough anchor count for validation matching the vanilla JS logic
  const re = /[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g
  const tokens = d.match(re) || []
  let anchors = 0
  for (const t of tokens) {
    if (/^[a-z]$/i.test(t)) {
      if (['M', 'L', 'H', 'V', 'C', 'S', 'Q', 'T'].includes(t.toUpperCase())) {
        anchors++
      }
    }
  }
  return { d, original_anchor_count: anchors }
}

for (const task of defs.formal) {
  task.predictions = {}
  for (const method of ['ours', 'adavec']) {
    const p = path.join(outputsDir, `${task.id}_${method}.svg`)
    const svgStr = fs.readFileSync(p, 'utf8')
    const { d, original_anchor_count } = extractPathAndAnchors(svgStr)
    const sha256 = crypto.createHash('sha256').update(svgStr).digest('hex')
    task.predictions[method] = {
      method: method === 'ours' ? 'Ours' : 'AdaVec',
      d,
      transform: "",
      sha256,
      original_anchor_count,
      relative_path: `formal_6x2_reference/method_outputs/${task.id}_${method}.svg`
    }
  }
}

// Ensure practice predictions exist
for (const practice of defs.practice) {
  practice.predictions = {
    practice: {
      method: 'Synthetic practice',
      d: practice.before,
      sha256: 'synthetic-practice-not-recorded',
      original_anchor_count: 4,
      relative_path: 'embedded synthetic practice'
    }
  }
}

const outPath = path.join(__dirname, '..', 'src', 'lib', 'tasks.json')
fs.writeFileSync(outPath, JSON.stringify(defs, null, 2))
console.log('tasks.json generated successfully!')
