import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { mdToHtml } from './format'

// Renderer markdown opisów rutyn/zadań — wspólny dla coacha i ucznia.
// Kluczowe regresje: Enter/puste linie nie mogą znikać, nagłówki/listy/checklisty
// muszą się renderować, a surowy HTML musi być escapowany (XSS).

describe('mdToHtml', () => {
  it('renders every non-empty line as its own paragraph (Enter = new line)', () => {
    const html = mdToHtml('pierwsza linia\ntrzecia po pustej')
    assert.match(html, /<p[^>]*>pierwsza linia<\/p>/)
    assert.match(html, /<p[^>]*>trzecia po pustej<\/p>/)
  })

  it('blank lines just separate paragraphs (no collapse)', () => {
    const html = mdToHtml('a\n\n\nb')
    const pCount = (html.match(/<p /g) || []).length
    assert.equal(pCount, 2)
  })

  it('renders headings # ## ###', () => {
    const html = mdToHtml('# Duży\n## Średni\n### Mały')
    assert.match(html, /<h3[^>]*>Duży<\/h3>/)
    assert.match(html, /<h4[^>]*>Średni<\/h4>/)
    assert.match(html, /<h5[^>]*>Mały<\/h5>/)
  })

  it('renders ordered lists', () => {
    const html = mdToHtml('1. pierwszy\n2. drugi')
    assert.match(html, /<ol[^>]*>/)
    assert.match(html, /<li>pierwszy<\/li>/)
    assert.match(html, /<li>drugi<\/li>/)
  })

  it('renders checklists with checked/unchecked states', () => {
    const html = mdToHtml('- [ ] do zrobienia\n- [x] zrobione')
    assert.match(html, /do zrobienia/)
    assert.match(html, /✓/)
    assert.match(html, /zrobione/)
  })

  it('renders blockquotes', () => {
    const html = mdToHtml('> cytat trenera')
    assert.match(html, /<blockquote[^>]*>cytat trenera<\/blockquote>/)
  })

  it('renders horizontal rule', () => {
    assert.match(mdToHtml('---'), /<hr /)
  })

  it('escapes raw HTML (XSS-safe)', () => {
    const html = mdToHtml('<script>alert(1)</script>')
    assert.ok(!html.includes('<script>'))
    assert.match(html, /&lt;script&gt;/)
  })

  it('keeps inline formatting: bold, italic, code, links', () => {
    const html = mdToHtml('**b** *i* `c` [x](https://y.pl)')
    assert.match(html, /<strong[^>]*>b<\/strong>/)
    assert.match(html, /<em[^>]*>i<\/em>/)
    assert.match(html, /<code[^>]*>c<\/code>/)
    assert.match(html, /<a href="https:\/\/y\.pl"/)
  })

  it('mixed structure: heading then list then paragraph', () => {
    const html = mdToHtml('# Cel\n- a\n- b\n\nZwykły tekst')
    assert.match(html, /<h3[^>]*>Cel<\/h3>/)
    assert.match(html, /<ul[^>]*>/)
    assert.match(html, /<li>a<\/li>/)
    assert.match(html, /<p[^>]*>Zwykły tekst<\/p>/)
    // lista musi być zamknięta przed akapitem
    assert.ok(html.indexOf('</ul>') < html.indexOf('Zwykły tekst'))
  })
})
