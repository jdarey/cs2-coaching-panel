// Strips leftover effect classes (spotlight, tilt-hover, shimmer-*, btn-3d,
// count-glow, layer-1/2/3) and onMouseMove={handleCardMouse} + its helper
// from all app/components TSX files, leaving the clean Vantor system.
const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..', 'src')
const tokens = [
  'spotlight', 'tilt-hover', 'shimmer-line', 'shimmer-sweep', 'btn-3d',
  'count-glow', 'animate-count-glow', 'layer-1', 'layer-2', 'layer-3',
  'animate-float-3d', 'animate-enter-3d', 'page-3d', 'scene-3d', 'glare-3d',
]

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(ent.name)) out.push(p)
  }
  return out
}

function stripInQuotes(m, quote) {
  // m = full match including quotes; content = without quotes, single line.
  const content = m.slice(1, -1)
  let out = content
  let hit = false
  for (const t of tokens) {
    if (new RegExp(`\\b${t}\\b`).test(out)) {
      hit = true
      out = out.replace(new RegExp(`\\b${t}\\b`, 'g'), '')
    }
  }
  if (hit) out = out.replace(/ {2,}/g, ' ')
  return quote + out + quote
}

let changed = 0
for (const file of walk(root)) {
  let src = fs.readFileSync(file, 'utf8')
  let orig = src

  // 1) Effect class tokens inside single-line string literals only.
  src = src.replace(/"[^"\n]*"/g, (m) => stripInQuotes(m, '"'))
  src = src.replace(/'[^'\n]*'/g, (m) => stripInQuotes(m, "'"))

  // 2) Remove onMouseMove={handleCardMouse} attributes, joining the leftover
  //    attribute lines back together with a single space.
  src = src.replace(/\s*onMouseMove=\{handleCardMouse\}\s*/g, ' ')

  // 3) Remove handleCardMouse helper definitions (module-level + inline).
  //    Files may use CRLF, so match both line endings and any closing indent.
  src = src.replace(
    /(?:const handleCardMouse = \(e: React\.MouseEvent<HTMLElement>\) => \{|function handleCardMouse\(e: MouseEvent<HTMLElement>\) \{)[\s\S]*?\r?\n *\}\r?\n/g,
    ''
  )

  // 4) Drop the now-unused MouseEvent type import if it was only for the helper.
  src = src.replace(/\r?\nimport type \{ MouseEvent \} from 'react'\r?\n/g, '\n')

  // Tidy: collapse blank-line runs left by removals (outside strings).
  src = src.replace(/\n{3,}/g, '\n\n')

  if (src !== orig) {
    fs.writeFileSync(file, src)
    changed++
    console.log('swept', path.relative(root, file))
  }
}
console.log('Files changed:', changed)
