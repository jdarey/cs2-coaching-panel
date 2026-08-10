// Generates the .light theme override block for globals.css.
// The app is hardcoded dark; this block flips surfaces/text when html.light is set.
const dark = '13, 17, 23' // rgb triplet for dark text on light bg

const out = []
out.push('/* ============================================================')
out.push('   LIGHT THEME — html.light overrides (settings → Wygląd)')
out.push('   ============================================================ */')
out.push('.light body { background-color: #f4f5f7 !important; color: rgb(' + dark + ') !important; }')

// Surface classes
const surfaces = ['.glass', '.glass-card', '.glass-liquid', '.glass-tinted', '.glass-strong']
out.push(surfaces.map(s => '.light ' + s).join(', ') + ' {')
out.push('  background: #ffffff !important;')
out.push('  border-color: rgba(' + dark + ', 0.1) !important;')
out.push('  box-shadow: 0 20px 40px -16px rgba(' + dark + ', 0.12) !important;')
out.push('}')

// Hardcoded dark backgrounds -> light
const bgMap = {
  'bg-[#060606]': '#f4f5f7',
  'bg-[#0a0a0a]': '#ffffff',
  'bg-[#181818]': '#ffffff',
  'bg-[#0b0c16]': '#eef0f3',
  'bg-[#06070d]': '#eef0f3',
  'bg-[#0a0a12]': '#eef0f3',
}
for (const [cls, hex] of Object.entries(bgMap)) {
  out.push('.light .' + cls.replace(/[[\]#]/g, '\\$&') + ' { background-color: ' + hex + ' !important; }')
}

// text-white + all opacity variants -> dark
const textWhite = ['', '5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60', '65', '70', '75', '80', '85', '90']
for (const v of textWhite) {
  const cls = v === '' ? '.light .text-white' : '.light .text-white\\/' + v
  const alpha = v === '' ? '1' : v.length === 1 ? '0.0' + v : '0.' + v
  out.push(cls + ' { color: rgba(' + dark + ', ' + alpha + ') !important; }')
}

// bg-white/[xx] -> dark tints (subtle fills / hover states)
for (const a of ['0.025', '0.02', '0.03', '0.04', '0.05', '0.06', '0.07', '0.08', '0.10', '0.12']) {
  out.push('.light .bg-white\\/\\[' + a + '\\] { background-color: rgba(' + dark + ', ' + a + ') !important; }')
}

// border-white/[xx] -> dark borders
for (const a of ['0.04', '0.05', '0.06', '0.07', '0.08', '0.10', '0.12', '0.15', '0.1']) {
  out.push('.light .border-white\\/\\[' + a + '\\] { border-color: rgba(' + dark + ', ' + Math.round(parseFloat(a) * 0.8 * 100) / 100 + ') !important; }')
}

// ring-white -> dark rings
for (const a of ['5', '10', '15', '20', '25', '30', '0.05', '0.06', '0.08', '0.10', '0.12']) {
  const pct = a.startsWith('0.') ? Math.round(parseFloat(a) * 100) : a
  out.push('.light .ring-white\\/' + a + ' { --tw-ring-color: rgba(' + dark + ', 0.' + (pct.length === 1 ? pct + '0' : pct) + ') !important; }')
}

// Mint accents too light on white -> darker teal (text + borders + bg)
out.push('.light .text-\\[#8cffef\\] { color: #0d9488 !important; }')
out.push('.light .text-\\[#2de5ca\\] { color: #14b8a6 !important; }')
out.push('.light .border-\\[#2de5ca\\]\\/40 { border-color: rgba(20, 184, 166, 0.4) !important; }')
out.push('.light .bg-\\[#2de5ca\\] { background-color: #14b8a6 !important; }')
out.push('.light .from-\\[#2de5ca\\] { --tw-gradient-from: #14b8a6 !important; }')
out.push('.light .to-\\[#2de5ca\\] { --tw-gradient-to: #14b8a6 !important; }')
out.push('.light .from-\\[#8cffef\\] { --tw-gradient-from: #0d9488 !important; }')
out.push('.light .to-\\[#8cffef\\] { --tw-gradient-to: #0d9488 !important; }')

// Text gradient classes (white fades) -> dark fades
for (const cls of ['text-gradient-violet', 'text-gradient-vantor', 'text-gradient-premium']) {
  out.push('.light .' + cls + ' {')
  out.push('  background: linear-gradient(0deg, rgba(' + dark + ', 0.55) 0%, rgb(' + dark + ') 55%) !important;')
  out.push('  -webkit-background-clip: text !important; background-clip: text !important;')
  out.push('  -webkit-text-fill-color: transparent !important; color: transparent !important;')
  out.push('}')
}
out.push('.light .text-gradient-mesh {')
out.push('  background: linear-gradient(180deg, rgb(' + dark + ') 0%, rgba(' + dark + ', 0.8) 100%) !important;')
out.push('  -webkit-background-clip: text !important; background-clip: text !important;')
out.push('  -webkit-text-fill-color: transparent !important; color: transparent !important;')
out.push('}')

// Inputs + labels
out.push('.light .input-premium { background: #ffffff !important; border-color: rgba(' + dark + ', 0.14) !important; color: rgb(' + dark + ') !important; }')
out.push('.light .input-premium::placeholder { color: rgba(' + dark + ', 0.35) !important; }')
out.push('.light .label-premium { color: rgba(' + dark + ', 0.6) !important; }')

// Secondary / ghost buttons
out.push('.light .btn-secondary-glass { background: #ffffff !important; border-color: rgba(' + dark + ', 0.14) !important; color: rgba(' + dark + ', 0.9) !important; }')
out.push('.light .btn-ghost-premium { color: rgba(' + dark + ', 0.75) !important; border-color: rgba(' + dark + ', 0.12) !important; }')

// Scrollbar
out.push('.light ::-webkit-scrollbar-thumb { background: rgba(' + dark + ', 0.25); border-color: #f4f5f7; }')

// Re-assert WHITE text inside teal/solid accent surfaces (buttons, icon tiles, solid teal bgs)
const accentParents = [
  '.btn-darey', '.btn-primary-gradient', '.icon-tile',
  '[class*="bg-[#2fb6a2]"]', '[class*="bg-[#147a6b]"]',
  '[class*="from-[#2de5ca]"]', '[class*="from-[#2fb6a2]"]', '[class*="from-[#34d399]"]',
]
out.push('.light ' + accentParents.join(', .light ') + ' { color: #ffffff !important; }')
for (const v of ['40', '50', '60', '70', '80', '90']) {
  out.push('.light ' + accentParents.map(p => p + ' .text-white\\/' + v).join(', .light ') + ' { color: rgba(255, 255, 255, 0.' + v + ') !important; }')
}
out.push('.light ' + accentParents.map(p => p + ' .text-white').join(', .light ') + ' { color: #ffffff !important; }')

console.log(out.join('\n'))
